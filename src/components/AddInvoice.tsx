import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { 
  X, 
  Plus, 
  Trash2,
  User,
  Car,
  FileText,
  Search,
  Calendar,
  ShoppingCart,
  DollarSign,
  Users,
  Mail,
  Download,
  Check,
  ChevronRight,
  ChevronLeft,
  Edit,
  Percent,
  CreditCard,
  Banknote,
  Smartphone,
  Package,
  Loader2,
  ChevronsUpDown
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { customersAPI, vehiclesAPI, catalogAPI, inventoryAPI, invoicesAPI, settingsAPI } from "../api/client";
import { formatCustomerId, formatInvoiceId } from "../utils/idFormatter";
import { AddCustomer } from "./AddCustomer";
import { InvoicePreviewModal } from "./InvoicePreviewModal";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  taxRate?: number;
  catalogItemId?: string;
  inventoryItemId?: string;
}

interface AddInvoiceProps {
  onClose?: () => void;
  onSubmit?: (data: any) => void;
  userRole?: "Admin" | "Supervisor" | "Technician"; // For permission checks
}

// Mock data for products and staff (these can be replaced with API calls later)

const mockProducts = [
  { id: "PRD-001", name: "Engine Oil - Castrol 5W-30", price: 1200, category: "Oil" },
  { id: "PRD-002", name: "Oil Filter", price: 450, category: "Filters" },
  { id: "PRD-003", name: "Air Filter", price: 380, category: "Filters" },
  { id: "PRD-004", name: "Brake Pads - Front", price: 2800, category: "Brakes" },
  { id: "PRD-005", name: "Brake Fluid DOT 4", price: 650, category: "Fluids" },
  { id: "PRD-006", name: "Spark Plugs (Set of 4)", price: 1600, category: "Engine" },
  { id: "PRD-007", name: "Battery - 12V 70Ah", price: 8500, category: "Electrical" },
  { id: "PRD-008", name: "Tire Rotation Service", price: 800, category: "Service" },
  { id: "PRD-009", name: "Wheel Alignment", price: 1500, category: "Service" },
  { id: "PRD-010", name: "General Inspection", price: 500, category: "Service" },
];

const mockTechnicians = [
  { id: "TECH-001", name: "Ahmad Ali" },
  { id: "TECH-002", name: "Usman Shah" },
  { id: "TECH-003", name: "Farhan Ahmed" },
];

const mockSupervisors = [
  { id: "SUP-001", name: "Hassan Khan" },
  { id: "SUP-002", name: "Imran Ahmed" },
];

// Payment methods with different tax rates
const paymentMethods = [
  { id: "cash", label: "Cash", icon: Banknote, taxRate: 0 },
  { id: "card", label: "Card/POS", icon: CreditCard, taxRate: 0.18 }, // 18% GST
  { id: "online", label: "Online Transfer", icon: Smartphone, taxRate: 0.15 }, // 15% GST
];

// Default terms and conditions
const DEFAULT_TERMS = "Payment is due immediately upon receipt. No credit is extended under any circumstances.\nQuoted rates are valid for 5 days only and may change thereafter.";

export function AddInvoice({ onClose, onSubmit, userRole = "Admin" }: AddInvoiceProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [invoiceStatus, setInvoiceStatus] = useState<"Draft" | "Unpaid" | "Paid">("Draft");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [businessProfile, setBusinessProfile] = useState({
    name: "MOMENTUM AUTOWORKS",
    address: "",
    phone: "+92 300 1234567",
    email: "info@momentumauto.pk",
  });
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [invoiceNumber] = useState(() => formatInvoiceId({ _id: Date.now().toString() }));
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const isProcessingRef = useRef(false);
  
  // Get initial values from URL params if present
  const urlCustomerId = searchParams.get('customerId') || '';
  const urlVehicleId = searchParams.get('vehicleId') || '';
  
  // Step 1: Customer & Vehicle
  const [selectedCustomerId, setSelectedCustomerId] = useState(urlCustomerId);
  const [selectedVehicleId, setSelectedVehicleId] = useState(urlVehicleId);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  
  // Step 2: Products/Services
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductCatalog, setShowProductCatalog] = useState(false);
  const [selectedCatalogProducts, setSelectedCatalogProducts] = useState<string[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [mostUsedServices, setMostUsedServices] = useState<any[]>([]);
  const [loadingMostUsed, setLoadingMostUsed] = useState(false);
  
  // Step 3: Pricing & Details
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  
  // Step 4: Staff Info
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  
  const fetchCustomers = async (search?: string) => {
    try {
      setLoadingCustomers(true);
      const response = await customersAPI.getAll(search || undefined);
      if (response.success) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      if ((err as any).isAuthError && (err as any).status === 401) {
        toast.error((err as any).message || "Session expired, please log in again");
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else if (!(err as any).isAuthError) {
        toast.error("Failed to load customers. Please try again.");
      }
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchVehicles = async (customerId: string) => {
    try {
      setLoadingVehicles(true);
      const response = await vehiclesAPI.getAll(undefined, customerId);
      if (response.success) {
        setVehicles(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchCatalogItems();
    fetchInventoryItems();
    fetchBusinessProfile();
  }, []);

  const fetchBusinessProfile = async () => {
    try {
      const response = await settingsAPI.get();
      if (response.success && response.data?.workshop) {
        const workshop = response.data.workshop;
        setBusinessProfile({
          name: (workshop.businessName || "MOMENTUM AUTOWORKS").toUpperCase(),
          address: workshop.address || "",
          phone: workshop.phone || "+92 300 1234567",
          email: workshop.email || "info@momentumauto.pk",
        });
      }
    } catch (error) {
      console.error("Failed to fetch business profile:", error);
    }
  };

  // Fetch most used services after catalog items and inventory items are loaded
  useEffect(() => {
    if (catalogItems.length > 0 && inventoryItems.length > 0) {
      fetchMostUsedServices();
    }
  }, [catalogItems, inventoryItems]);

  const fetchMostUsedServices = async () => {
    try {
      setLoadingMostUsed(true);
      // Fetch recent invoices to determine most used services and inventory items
      const response = await invoicesAPI.getAll();
      if (response.success && response.data) {
        // Count service and inventory item usage from invoice items
        const itemCounts: Record<string, { count: number; item: any }> = {};
        
        response.data.forEach((invoice: any) => {
          if (invoice.items && Array.isArray(invoice.items)) {
            invoice.items.forEach((item: any) => {
              // Match by catalogItemId, inventoryItemId, or description
              const key = item.catalogItemId || item.inventoryItemId || item.description || '';
              if (key) {
                if (!itemCounts[key]) {
                  // First, try to find in catalog items
                  const catalogItem = catalogItems.find((c: any) => 
                    (c._id || c.id) === item.catalogItemId || c.name === item.description
                  );
                  
                  // Then, try to find in inventory items
                  const inventoryItem = inventoryItems.find((inv: any) => 
                    (inv._id || inv.id) === item.inventoryItemId || inv.name === item.description
                  );
                  
                  if (catalogItem) {
                    // It's a catalog item (service or product)
                    itemCounts[key] = {
                      count: 0,
                      item: {
                        id: catalogItem._id || catalogItem.id,
                        name: catalogItem.name,
                        price: catalogItem.type === 'service' ? (catalogItem.basePrice || catalogItem.cost || 0) : (catalogItem.cost || 0),
                        category: catalogItem.type === 'service' ? 'Service' : (catalogItem.category || 'Product'),
                        type: catalogItem.type,
                        isCatalogItem: true,
                        catalogItem: catalogItem,
                        inventoryItemId: catalogItem.inventoryItemId || null,
                        consumeQuantityPerUse: catalogItem.consumeQuantityPerUse || 1,
                      }
                    };
                  } else if (inventoryItem) {
                    // It's an inventory item
                    itemCounts[key] = {
                      count: 0,
                      item: {
                        id: `inv-${inventoryItem._id || inventoryItem.id}`,
                        name: inventoryItem.name,
                        price: inventoryItem.salePrice || 0,
                        category: inventoryItem.category || 'Inventory',
                        type: 'inventory',
                        isInventoryItem: true,
                        inventoryItem: inventoryItem,
                        sku: inventoryItem.sku,
                        unit: inventoryItem.unit,
                        currentStock: inventoryItem.currentStock,
                        minStock: inventoryItem.minStock,
                      }
                    };
                  } else {
                    // Fallback: create a basic entry from invoice item data
                    itemCounts[key] = {
                      count: 0,
                      item: {
                        id: key,
                        name: item.description || 'Unknown',
                        price: item.price || 0,
                        category: 'Product',
                        type: 'product',
                        isCatalogItem: false,
                      }
                    };
                  }
                }
                if (itemCounts[key]) {
                  itemCounts[key].count += item.quantity || 1;
                }
              }
            });
          }
        });

        // Sort by count and get top items (services and inventory items, max 8)
        const mostUsed = Object.values(itemCounts)
          .filter((entry: any) => 
            entry.item.type === 'service' || 
            entry.item.isInventoryItem || 
            entry.item.type === 'product'
          )
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 8)
          .map((entry: any) => entry.item);

        setMostUsedServices(mostUsed);
      }
    } catch (err) {
      console.error("Failed to fetch most used services:", err);
    } finally {
      setLoadingMostUsed(false);
    }
  };

  const fetchCatalogItems = async () => {
    try {
      setLoadingCatalog(true);
      const response = await catalogAPI.getAll();
      if (response.success) {
        setCatalogItems(response.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch catalog items:", err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const response = await inventoryAPI.getAll();
      if (response.success) {
        setInventoryItems(response.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch inventory items:", err);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchVehicles(selectedCustomerId);
    } else {
      setVehicles([]);
      setSelectedVehicleId("");
    }
  }, [selectedCustomerId]);

  const handleCustomerSelect = (customerId: string) => {
    if (customerId === "add-customer") {
      setIsAddCustomerDialogOpen(true);
      setCustomerSearchOpen(false);
      setCustomerSearchQuery("");
      return;
    }
    // Close dropdown immediately and clear search
    setCustomerSearchOpen(false);
    setCustomerSearchQuery("");
    // Set selected customer
    setSelectedCustomerId(customerId);
    setSelectedVehicleId(""); // Reset vehicle when customer changes
  };

  // Load customers when popover opens
  useEffect(() => {
    if (customerSearchOpen && !customerSearchQuery) {
      fetchCustomers();
    }
  }, [customerSearchOpen]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearchOpen && customerSearchQuery) {
        fetchCustomers(customerSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchQuery, customerSearchOpen]);

  const selectedCustomer = customers.find(c => (c._id || c.id) === selectedCustomerId);
  const selectedVehicle = vehicles.find(v => (v._id || v.id) === selectedVehicleId);
  
  // Combine catalog items and inventory items into a unified product list
  const allProducts = [
    // Catalog items (both services and products)
    ...catalogItems
      .filter((item: any) => item.isActive)
      .map((item: any) => ({
        id: item._id || item.id,
        name: item.name,
        price: item.type === 'service' ? (item.basePrice || item.cost || 0) : (item.cost || 0),
        category: item.type === 'service' ? 'Service' : (item.category || 'Product'),
        type: item.type,
        isCatalogItem: true,
        catalogItem: item,
        inventoryItemId: item.inventoryItemId || null,
        consumeQuantityPerUse: item.consumeQuantityPerUse || 1,
      })),
    // Inventory items
    ...inventoryItems
      .filter((item: any) => item.isActive)
      .map((item: any) => ({
        id: `inv-${item._id}`,
        name: item.name,
        price: item.salePrice || 0,
        category: item.category || 'Inventory',
        type: 'inventory',
        isInventoryItem: true,
        inventoryItem: item,
        sku: item.sku,
        unit: item.unit,
        currentStock: item.currentStock,
        minStock: item.minStock,
      })),
  ];

  const filteredProducts = allProducts.filter((p: any) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase()))
  );
  
  const selectedPaymentMethod = paymentMethods.find(pm => pm.id === paymentMethod);
  const canEditPricing = userRole === "Admin" || userRole === "Supervisor";
  const formatCurrency = (value: number) => `Rs ${Number(value || 0).toLocaleString()}`;

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = discountType === "percent" 
    ? (subtotal * discount / 100)
    : discount;
  const afterDiscount = subtotal - discountAmount;
  const taxRate = selectedPaymentMethod?.taxRate || 0;
  const tax = afterDiscount * taxRate;
  const total = afterDiscount + tax;

  const createInvoiceItem = (product?: any): InvoiceItem => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: product?.name || "",
    quantity: 1,
    price: product?.price || 0,
    // Store references for inventory deduction
    catalogItemId: product?.isCatalogItem ? product.id : undefined,
    inventoryItemId: product?.isInventoryItem ? product.inventoryItem?._id : (product?.inventoryItemId || undefined),
  });

  const addItem = (product?: any) => {
    if (!product) {
      // Add custom item (no product provided)
      const newItem = createInvoiceItem();
      setItems((prev) => [...prev, newItem]);
      return;
    }

    // Check if product is already added
    const isAlreadyAdded = items.some((item) => {
      // Check by catalogItemId for catalog items
      if (product.isCatalogItem && (item as any).catalogItemId) {
        return (item as any).catalogItemId === product.id;
      }
      // Check by inventoryItemId for inventory items
      if (product.isInventoryItem && (item as any).inventoryItemId) {
        const invId = product.inventoryItem?._id || product.inventoryItemId;
        return (item as any).inventoryItemId === invId;
      }
      // Fallback: check by name/description
      return item.description === product.name;
    });

    if (isAlreadyAdded) {
      toast.error(`${product.name} is already added to the invoice.`);
      return;
    }

    const newItem = createInvoiceItem(product);
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleNext = () => {
    if (currentStep === 1 && (!selectedCustomerId || !selectedVehicleId)) {
      alert("Please select customer and vehicle");
      return;
    }
    if (currentStep === 2 && items.length === 0) {
      alert("Please add at least one item");
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else if (onClose) {
      // If on step 1, close the dialog
      onClose();
    }
  };

  const loadLogoAsDataUrl = async () => {
    try {
      const response = await fetch("/1.png");
      if (!response.ok) {
        throw new Error("Logo not found");
      }
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn("Unable to load company logo for invoice", error);
      return null;
    }
  };

  const handleShowInvoicePreview = () => {
    if (!selectedCustomer) {
      alert("Please select a customer before generating an invoice.");
      return;
    }

    if (!selectedVehicle) {
      alert("Please select a vehicle before generating an invoice.");
      return;
    }

    if (items.length === 0) {
      alert("Please add at least one product or service.");
      return;
    }

    setShowInvoicePreview(true);
  };

  const handleGenerateInvoicePDF = async (): Promise<boolean> => {
    setIsGeneratingPdf(true);
    let success = false;

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = margin;

      // Set background color (beige)
      doc.setFillColor(245, 245, 220);
      doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

      // INVOICE title - Large red letters on left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(48);
      doc.setTextColor(197, 48, 50); // Red color
      doc.text("INVOICE", margin, currentY + 20);
      doc.setTextColor(0, 0, 0);

      // Invoice details on left below INVOICE - date, time, and invoice ID
      doc.setFont("courier", "normal"); // Use courier as monospace alternative
      doc.setFontSize(10);
      const issueDate = new Date();
      const dateStr = issueDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = issueDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      
      // Generate invoice ID from plate number and customer name initials
      const plateNo = selectedVehicle?.plateNo || selectedVehicle?.plate || '';
      const customerName = selectedCustomer?.name || '';
      const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
      const invoiceId = (plateNo && initials) ? `${plateNo}-${initials}` : invoiceNumber;
      
      doc.text(`DATE: ${dateStr.toUpperCase()}`, margin, currentY + 30);
      doc.text(`TIME: ${timeStr.toUpperCase()}`, margin, currentY + 36);
      if (invoiceId) {
        doc.text(`INVOICE ID: ${invoiceId.toUpperCase()}`, margin, currentY + 42);
      }

      // Logo and company address on right - Use original resolution
      let logoHeight = 30; // Default height for placeholder
      const logoDataUrl = await loadLogoAsDataUrl();
      if (logoDataUrl) {
        // Load image to get original dimensions
        const img = new Image();
        img.src = logoDataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        
        // Calculate size maintaining aspect ratio (max 30mm height)
        const maxHeight = 30;
        const aspectRatio = img.width / img.height;
        logoHeight = maxHeight;
        const logoWidth = logoHeight * aspectRatio;
        
        // Position logo top right
        const logoX = pageWidth - margin - logoWidth;
        doc.addImage(logoDataUrl, "PNG", logoX, currentY, logoWidth, logoHeight);
      } else {
        // MW logo placeholder
        const logoSize = 30;
        logoHeight = logoSize;
        doc.setFillColor(100, 100, 100);
        doc.rect(pageWidth - margin - logoSize, currentY, logoSize, logoSize, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("MW", pageWidth - margin - logoSize / 2, currentY + logoSize / 2 + 5, { align: "center" });
        doc.setTextColor(0, 0, 0);
      }

      // Company address on right - positioned below logo with spacing
      const addressStartY = currentY + logoHeight + 5; // 5mm spacing below logo
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      if (businessProfile.address) {
        // Split address into lines if it contains newlines or is long
        const addressLines = businessProfile.address.split('\n').filter(line => line.trim());
        addressLines.forEach((line, index) => {
          doc.text(line.toUpperCase(), pageWidth - margin, addressStartY + (index * 6), { align: "right" });
        });
        doc.text(businessProfile.phone, pageWidth - margin, addressStartY + (addressLines.length * 6), { align: "right" });
      } else {
        doc.text(businessProfile.phone, pageWidth - margin, addressStartY, { align: "right" });
      }

      currentY += 50;

      // Bill To and Payment Method - Two columns
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Bill To:", margin, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text((selectedCustomer.name || "N/A").toUpperCase(), margin, currentY + 6);
      if (selectedCustomer.phone) {
        doc.text(selectedCustomer.phone, margin, currentY + 12);
      }
      if (selectedCustomer.email) {
        doc.text(selectedCustomer.email, margin, currentY + 18);
      }

      const paymentColumnX = pageWidth / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Payment Method", paymentColumnX, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text((selectedPaymentMethod?.label || "CASH").toUpperCase(), paymentColumnX, currentY + 6);
      if (selectedTechnician) {
        const technicianName = mockTechnicians.find(t => t.id === selectedTechnician)?.name;
        if (technicianName) {
          doc.text(technicianName.toUpperCase(), paymentColumnX, currentY + 12);
        }
      }
      if (selectedCustomer.phone) {
        doc.text(selectedCustomer.phone, paymentColumnX, currentY + 18);
      }

      currentY += 30;

      // Table - Gray header, monospace font
      autoTable(doc, {
        startY: currentY,
        head: [["DESCRIPTION", "QTY", "PRICE", "SUBTOTAL"]],
        body: items.map((item) => [
          (item.description || "Item").toUpperCase(),
          item.quantity.toString().padStart(2, '0'),
          `Rs${item.price.toLocaleString('en-US')}`,
          `Rs${(item.price * item.quantity).toLocaleString('en-US')}`,
        ]),
        styles: { 
          fontSize: 10, 
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.5,
          font: "courier"
        },
        headStyles: { 
          fillColor: [200, 200, 200], // Gray header
          textColor: [0, 0, 0],
          halign: "left",
          fontStyle: "bold",
          fontSize: 10,
          font: "courier"
        },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold" },
          1: { halign: "center" },
          2: { halign: "right" },
          3: { halign: "right", fontStyle: "bold" },
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        theme: "plain",
      });

      // Totals section - Right aligned, monospace with proper formatting
      const tableFinalY = (doc as any).lastAutoTable?.finalY ?? currentY + 20;
      const summaryX = pageWidth - margin;
      const summaryStartY = tableFinalY + 10;
      const labelWidth = 40;
      
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.text("TAX", summaryX - labelWidth, summaryStartY, { align: "right" });
      doc.text(`Rs${Math.round(tax).toLocaleString('en-US')}`, summaryX, summaryStartY, { align: "right" });
      
      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.text("GRAND TOTAL", summaryX - labelWidth, summaryStartY + 8, { align: "right" });
      doc.text(`Rs${Math.round(total).toLocaleString('en-US')}`, summaryX, summaryStartY + 8, { align: "right" });

      // Footer - Terms and Contact
      currentY = summaryStartY + 25;
      const footerLeftX = margin;
      const footerRightX = pageWidth - margin;

      // Terms & Conditions on left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TERM & CONDITION", footerLeftX, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const termsText = notes || DEFAULT_TERMS;
      doc.text(
        termsText,
        footerLeftX,
        currentY + 6,
        { maxWidth: (pageWidth - margin * 2) / 2 }
      );

      // Contact info on right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("FOR ANY QUESTIONS, PLEASE CONTACT", footerRightX, currentY, { align: "right" });
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text("INFO@MOMENTUMAUTOWORKS.COM", footerRightX, currentY + 6, { align: "right" });
      doc.text("OR +92 300 1234567.", footerRightX, currentY + 12, { align: "right" });

      // Signature
      if (selectedTechnician) {
        const technicianName = mockTechnicians.find(t => t.id === selectedTechnician)?.name;
        if (technicianName) {
          doc.setDrawColor(0, 0, 0);
          doc.line(footerRightX - 50, currentY + 25, footerRightX, currentY + 25);
          doc.setFont("courier", "bold");
          doc.setFontSize(10);
          doc.text(technicianName.toUpperCase(), footerRightX, currentY + 30, { align: "right" });
          doc.setFont("courier", "normal");
          doc.setFontSize(8);
          doc.text("GENERAL MANAGER", footerRightX, currentY + 35, { align: "right" });
        }
      }

      // Reuse invoiceId already declared above for PDF filename
      doc.save(`Invoice-${invoiceId}.pdf`);
      success = true;
    } catch (error) {
      console.error("Failed to generate invoice PDF", error);
      toast.error("Unable to generate invoice PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }

    return success;
  };

  const handleEmailInvoice = () => {
    if (!selectedCustomer?.email) {
      toast.error("Customer email is not available");
      return;
    }

    const vehicleInfo = selectedVehicle 
      ? `${selectedVehicle.year || ''} ${selectedVehicle.make || ''} ${selectedVehicle.model || ''}`.trim()
      : 'N/A';

    const plateNo = selectedVehicle?.plateNo || selectedVehicle?.plate || '';
    const customerName = selectedCustomer?.name || '';
    const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
    const invoiceId = (plateNo && initials) ? `${plateNo}-${initials}` : invoiceNumber;
    const subject = encodeURIComponent(`Invoice ${invoiceId} - Momentum AutoWorks`);
    const body = encodeURIComponent(
      `Dear ${selectedCustomer.name},\n\n` +
      `Please find attached invoice ${invoiceId} for your vehicle.\n\n` +
      `Invoice Details:\n` +
      `- Invoice ID: ${invoiceId}\n` +
      `- Date: ${new Date().toLocaleDateString()}\n` +
      `- Vehicle: ${vehicleInfo}\n` +
      `- Total Amount: Rs ${total.toLocaleString()}\n\n` +
      `Thank you for choosing Momentum AutoWorks!\n\n` +
      `Best regards,\nMomentum AutoWorks Team`
    );
    const mailtoUrl = `mailto:${selectedCustomer.email}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  const buildInvoicePayload = () => {
    // Get customer ID
    const customerId = selectedCustomer?._id || selectedCustomer?.id || selectedCustomerId;
    
    // Format vehicle as embedded object
    const vehicleData = selectedVehicle ? {
      make: selectedVehicle.make || '',
      model: selectedVehicle.model || '',
      year: selectedVehicle.year || null,
      plateNo: selectedVehicle.plateNo || ''
    } : null;

    // Format items to match backend schema
    const formattedItems = items.map(item => ({
      description: item.description || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      // Include references for inventory deduction
      catalogItemId: (item as any).catalogItemId || undefined,
      inventoryItemId: (item as any).inventoryItemId || undefined,
    }));

    // Determine status: If payment method is selected (cash, card, or online), mark as Paid
    // Otherwise, mark as Pending
    let mappedStatus = 'Pending';
    if (invoiceStatus === 'Paid') {
      mappedStatus = 'Paid';
    } else if (invoiceStatus === 'Draft') {
      mappedStatus = 'Pending'; // Draft maps to Pending in backend
    } else if (invoiceStatus === 'Unpaid') {
      mappedStatus = 'Pending'; // Unpaid maps to Pending in backend
    } else if (paymentMethod && (paymentMethod === 'cash' || paymentMethod === 'card' || paymentMethod === 'online')) {
      // If payment method is selected, payment has been received, mark as Paid
      mappedStatus = 'Paid';
    }

    // Get technician and supervisor names as strings (they're stored as IDs)
    const technicianObj = mockTechnicians.find(t => t.id === selectedTechnician);
    const supervisorObj = mockSupervisors.find(s => s.id === selectedSupervisor);
    const technicianName = technicianObj?.name || '';
    const supervisorName = supervisorObj?.name || '';

    return {
      customer: customerId,
      vehicle: vehicleData,
      items: formattedItems,
      subtotal,
      discount: discountAmount,
      tax,
      amount: total, // Backend expects 'amount' not 'total'
      status: mappedStatus,
      paymentMethod: paymentMethod === 'cash' ? 'Cash' : 
                     paymentMethod === 'card' ? 'Card/POS' : 
                     paymentMethod === 'online' ? 'Online Transfer' : 
                     paymentMethod || undefined,
      technician: technicianName || undefined,
      supervisor: supervisorName || undefined,
      notes: notes || undefined,
      date: new Date().toISOString()
    };
  };

  const handleCompleteInvoice = async () => {
    // Prevent duplicate submissions
    if (isProcessingRef.current || isGeneratingPdf || isCreatingInvoice) {
      return;
    }

    if (!selectedCustomer || !selectedVehicle || items.length === 0) {
      toast.error("Please complete all required fields before creating the invoice.");
      return;
    }

    try {
      // Set processing flag to prevent duplicate calls
      isProcessingRef.current = true;
      setIsGeneratingPdf(true);
      setIsCreatingInvoice(true);

      // First, generate and download the PDF
      const pdfGenerated = await handleGenerateInvoicePDF();
      
      if (!pdfGenerated) {
        isProcessingRef.current = false;
        setIsGeneratingPdf(false);
        setIsCreatingInvoice(false);
        return;
      }

      // Then, create the invoice in the database
      const invoicePayload = buildInvoicePayload();
      
      const response = await invoicesAPI.create(invoicePayload);
      
      if (response.success) {
        toast.success("Invoice created and downloaded successfully!");
        
        // Call onSubmit callback if provided
        if (onSubmit) {
          onSubmit(response.data);
        }
        
        // Navigate to invoices page
        navigate("/invoices");
      } else {
        toast.error(response.message || "Failed to create invoice");
        isProcessingRef.current = false;
        setIsGeneratingPdf(false);
        setIsCreatingInvoice(false);
      }
    } catch (error: any) {
      console.error("Failed to complete invoice:", error);
      toast.error(error.message || "Failed to complete invoice. Please try again.");
      isProcessingRef.current = false;
      setIsGeneratingPdf(false);
      setIsCreatingInvoice(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer || !selectedVehicle || items.length === 0) {
      toast.error("Please complete all required fields before creating the invoice.");
      return;
    }

    try {
      setIsCreatingInvoice(true);
      const invoicePayload = buildInvoicePayload();
      
      const response = await invoicesAPI.create(invoicePayload);
      
      if (response.success) {
        toast.success("Invoice created successfully!");
        
        // Close the preview modal
        setShowInvoicePreview(false);
        
        // Call onSubmit callback if provided
        if (onSubmit) {
          onSubmit(response.data);
        }
        
        // Navigate to invoices page
        navigate("/invoices");
      } else {
        toast.error(response.message || "Failed to create invoice");
      }
    } catch (error: any) {
      console.error("Failed to create invoice:", error);
      toast.error(error.message || "Failed to create invoice. Please try again.");
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleCatalogProductToggle = (productId: string) => {
    setSelectedCatalogProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleAddSelectedCatalogItems = () => {
    if (!selectedCatalogProducts.length) {
      return;
    }

    const productsToAdd = allProducts.filter((product: any) =>
      selectedCatalogProducts.includes(product.id)
    );

    if (!productsToAdd.length) {
      return;
    }

    // Filter out products that are already added
    const newProductsToAdd: any[] = [];
    const alreadyAddedProducts: string[] = [];

    productsToAdd.forEach((product: any) => {
      const isAlreadyAdded = items.some((item) => {
        // Check by catalogItemId for catalog items
        if (product.isCatalogItem && (item as any).catalogItemId) {
          return (item as any).catalogItemId === product.id;
        }
        // Check by inventoryItemId for inventory items
        if (product.isInventoryItem && (item as any).inventoryItemId) {
          const invId = product.inventoryItem?._id || product.inventoryItemId;
          return (item as any).inventoryItemId === invId;
        }
        // Fallback: check by name/description
        return item.description === product.name;
      });

      if (isAlreadyAdded) {
        alreadyAddedProducts.push(product.name);
      } else {
        newProductsToAdd.push(product);
      }
    });

    // Show message for already added products
    if (alreadyAddedProducts.length > 0) {
      if (alreadyAddedProducts.length === 1) {
        toast.error(`${alreadyAddedProducts[0]} is already added to the invoice.`);
      } else {
        toast.error(`${alreadyAddedProducts.length} products are already added to the invoice.`);
      }
    }

    // Add only new products
    if (newProductsToAdd.length > 0) {
      setItems((prev) => [
        ...prev,
        ...newProductsToAdd.map((product: any) => createInvoiceItem(product)),
      ]);
      toast.success(`${newProductsToAdd.length} item(s) added successfully.`);
    }

    setSelectedCatalogProducts([]);
    setShowProductCatalog(false);
  };

  const steps = [
    { number: 1, title: "Customer & Vehicle", icon: User },
    { number: 2, title: "Products & Services", icon: ShoppingCart },
    { number: 3, title: "Pricing & Payment", icon: DollarSign },
    { number: 4, title: "Staff & Review", icon: Users },
  ];

  useEffect(() => {
    if (!showProductCatalog) {
      setSelectedCatalogProducts([]);
    }
  }, [showProductCatalog]);

  const selectedCatalogCount = selectedCatalogProducts.length;

  return (
    <div className="h-full overflow-hidden flex flex-col bg-slate-50">
      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between border-b shrink-0 bg-[#c53032] text-white">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors mr-1"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white mb-0.5">Create New Invoice</h2>
            <p className="text-sm text-red-100">Step-by-step invoice generation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            className={
              invoiceStatus === "Draft" ? "bg-yellow-500 hover:bg-yellow-600 text-white border-0" :
              invoiceStatus === "Unpaid" ? "bg-orange-500 hover:bg-orange-600 text-white border-0" :
              "bg-[#a6212a] hover:bg-[#8f1c23] text-white border-0"
            }
          >
            {invoiceStatus}
          </Badge>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-8 py-5 border-b shrink-0 bg-white">
        <div className="flex items-center justify-between max-w-4xl">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  currentStep === step.number 
                    ? "bg-[#c53032] text-white shadow-sm"
                    : currentStep > step.number
                    ? "bg-green-500 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}>
                  {currentStep > step.number ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className={`text-xs mb-0.5 ${currentStep === step.number ? "text-[#c53032]" : "text-slate-400"}`}>
                    Step {step.number}
                  </p>
                  <p className={`text-sm ${currentStep === step.number ? "text-slate-900" : "text-slate-500"}`}>
                    {step.title}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-px mx-6 transition-colors ${currentStep > step.number ? "bg-green-500" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex bg-slate-50">
        {/* Left Panel - Form */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          {/* Step 1: Customer & Vehicle */}
          {currentStep === 1 && (
            <div className="space-y-8 max-w-3xl">
              <div>
                <div className="mb-4">
                  <h3 className="mb-1">Select Customer</h3>
                  <p className="text-sm text-slate-500">Choose an existing customer or add a new one</p>
                </div>
                
                <div className="space-y-3">
                  {!selectedCustomerId && (
                    <Popover open={customerSearchOpen} onOpenChange={(open) => {
                      setCustomerSearchOpen(open);
                      if (!open) {
                        setCustomerSearchQuery("");
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerSearchOpen}
                          className="w-full justify-between"
                          disabled={loadingCustomers}
                          onClick={() => setCustomerSearchOpen(true)}
                        >
                          {loadingCustomers ? (
                            <span className="text-muted-foreground">Loading customers...</span>
                          ) : (
                            <span className="text-muted-foreground">Search customer...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Search name, phone, email or ID..." 
                            value={customerSearchQuery}
                            onValueChange={setCustomerSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {loadingCustomers ? (
                                <div className="flex items-center justify-center gap-2 py-4">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Loading...</span>
                                </div>
                              ) : (
                                <div className="py-4 text-center text-sm text-gray-500">
                                  No customers found
                                </div>
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="add-customer"
                                onSelect={() => handleCustomerSelect("add-customer")}
                                className="cursor-pointer"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                <span className="font-medium">Add Customer</span>
                              </CommandItem>
                              {customers.map((customer) => (
                                <CommandItem
                                  key={customer._id || customer.id}
                                  value={`${customer.name} ${customer.phone} ${customer.email || ''} ${customer._id || customer.id}`}
                                  onSelect={() => handleCustomerSelect(customer._id || customer.id)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col flex-1">
                                    <span className="font-medium">{customer.name}</span>
                                    <span className="text-xs text-gray-500">{customer.phone}</span>
                                    {customer.email && (
                                      <span className="text-xs text-gray-400">{customer.email}</span>
                                    )}
                                    <span className="text-xs text-gray-400 mt-0.5">ID: {formatCustomerId(customer)}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  {selectedCustomer && (
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{selectedCustomer.name}</p>
                          <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                          {selectedCustomer.email && (
                            <p className="text-xs text-gray-500 mt-1">{selectedCustomer.email}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setSelectedCustomerId("");
                            setSelectedVehicleId("");
                            setVehicles([]);
                            setCustomerSearchQuery("");
                            setCustomerSearchOpen(false);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
                    <DialogContent className="max-w-[95vw] p-0 bg-transparent border-0 shadow-none [&>button]:hidden" aria-describedby={undefined}>
                      <DialogTitle className="sr-only">Add New Customer</DialogTitle>
                      <AddCustomer 
                        onClose={() => setIsAddCustomerDialogOpen(false)}
                        onSubmit={async (data) => {
                          try {
                            const response = await customersAPI.create({
                              name: data.fullName,
                              phone: data.phone,
                              email: data.email || undefined,
                              address: `${data.street}, ${data.area}, ${data.city}, ${data.state}`.trim()
                            });
                            if (response.success && response.data) {
                              // Auto-select the newly created customer
                              setSelectedCustomerId(response.data._id || response.data.id);
                              setIsAddCustomerDialogOpen(false);
                              await fetchCustomers();
                              toast.success("Customer created successfully");
                            }
                          } catch (err: any) {
                            console.error("Failed to create customer:", err);
                            if (err.isAuthError && err.status === 401) {
                              toast.error(err.message || "Session expired, please log in again");
                              if (window.location.pathname !== '/login') {
                                setTimeout(() => {
                                  window.location.href = '/login';
                                }, 2000);
                              }
                            } else {
                              toast.error(err.message || "Failed to create customer. Please try again.");
                            }
                          }
                        }}
                        onSaveAndAddVehicle={async (data) => {
                          try {
                            const response = await customersAPI.create({
                              name: data.fullName,
                              phone: data.phone,
                              email: data.email || undefined,
                              address: `${data.street}, ${data.area}, ${data.city}, ${data.state}`.trim()
                            });
                            if (response.success && response.data) {
                              // Auto-select the newly created customer
                              setSelectedCustomerId(response.data._id || response.data.id);
                              setIsAddCustomerDialogOpen(false);
                              await fetchCustomers();
                              toast.success("Customer created successfully");
                              // Show vehicle dialog since customer must have a vehicle
                              setShowAddVehicle(true);
                            }
                          } catch (err: any) {
                            console.error("Failed to create customer:", err);
                            if (err.isAuthError && err.status === 401) {
                              toast.error(err.message || "Session expired, please log in again");
                              if (window.location.pathname !== '/login') {
                                setTimeout(() => {
                                  window.location.href = '/login';
                                }, 2000);
                              }
                            } else {
                              toast.error(err.message || "Failed to create customer. Please try again.");
                            }
                          }
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Separator />

              {/* Vehicle Selection */}
              {selectedCustomerId && (
                <div>
                  <div className="mb-4">
                    <h3 className="mb-1">Select Vehicle</h3>
                    <p className="text-sm text-slate-500">Choose a vehicle registered to this customer</p>
                  </div>
                  
                  <div className="space-y-3">
                    <Select 
                      value={selectedVehicleId} 
                      onValueChange={setSelectedVehicleId}
                      disabled={!selectedCustomerId || loadingVehicles}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !selectedCustomerId 
                            ? "Select customer first..." 
                            : loadingVehicles 
                            ? "Loading vehicles..." 
                            : "Choose vehicle..."
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingVehicles ? (
                          <div className="p-2 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading vehicles...
                          </div>
                        ) : vehicles.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500 text-center">No vehicles found for this customer</div>
                        ) : (
                          vehicles.map((vehicle) => {
                            const vehicleId = vehicle._id || vehicle.id;
                            return (
                              <SelectItem key={vehicleId} value={vehicleId}>
                                {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.plateNo}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    {selectedVehicle && (
                      <div className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-[#fde7e7] flex items-center justify-center">
                            <Car className="h-4 w-4 text-[#c53032]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{selectedVehicle.make} {selectedVehicle.model}</p>
                            <p className="text-xs text-gray-500">{selectedVehicle.plateNo} • {selectedVehicle.year}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full border-dashed"
                      onClick={() => setShowAddVehicle(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Vehicle
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Products & Services */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="mb-1">Products & Services</h3>
                  <p className="text-sm text-slate-500">Add items from catalog or create custom entries</p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => setShowProductCatalog(true)}
                  className="bg-[#c53032] hover:bg-[#a6212a]"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Browse Catalog
                </Button>
              </div>

              {/* Most Used Services & Inventory Items */}
              {mostUsedServices.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-700">Most Used Items</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowProductCatalog(true)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      View All
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {loadingMostUsed ? (
                      <div className="col-span-full flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-[#c53032]" />
                      </div>
                    ) : (
                      mostUsedServices.map((item: any) => {
                        const isLowStock = item.isInventoryItem && item.currentStock <= item.minStock;
                        const isOutOfStock = item.isInventoryItem && item.currentStock < 0;
                        
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => addItem(item)}
                            disabled={isOutOfStock}
                            className={`p-3 border rounded-lg transition-all text-left group ${
                              isOutOfStock
                                ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed'
                                : 'border-slate-200 hover:border-[#c53032] hover:bg-[#fff5f5]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className={`font-medium text-sm group-hover:text-[#c53032] line-clamp-2 flex-1 ${
                                isOutOfStock ? 'text-slate-500' : 'text-slate-900'
                              }`}>
                                {item.name}
                              </p>
                              {item.isInventoryItem && (
                                <Badge 
                                  variant={isOutOfStock ? "destructive" : isLowStock ? "outline" : "outline"}
                                  className={`text-xs h-4 px-1.5 ${
                                    isOutOfStock 
                                      ? 'bg-red-100 text-red-700 border-red-200'
                                      : isLowStock
                                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  {isOutOfStock ? 'Out' : isLowStock ? 'Low' : 'Inv'}
                                </Badge>
                              )}
                              {item.type === 'service' && (
                                <Badge variant="outline" className="text-xs h-4 px-1.5">
                                  Service
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mb-1">{item.category}</p>
                            {item.isInventoryItem && (
                              <p className={`text-xs mb-1 ${
                                isOutOfStock ? 'text-red-600 font-semibold' :
                                isLowStock ? 'text-orange-600' :
                                'text-slate-500'
                              }`}>
                                Stock: {item.currentStock} {item.unit || 'piece'}
                              </p>
                            )}
                            <p className="text-sm font-semibold text-[#c53032]">
                              {formatCurrency(item.price)}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed rounded-xl border-slate-200 bg-slate-50">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No items added yet</p>
                    <Button 
                      variant="outline"
                      onClick={() => setShowProductCatalog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                ) : (
                  <>
                    {items.map((item, index) => (
                      <Card key={item.id} className="p-4 border-slate-200 shadow-sm">
                        <div className="grid grid-cols-12 gap-4 items-start">
                          <div className="col-span-5">
                            <Label className="text-xs text-gray-500 mb-2">Description</Label>
                            <Input
                              placeholder="Service or product description..."
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500 mb-2">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="text-center"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500 mb-2">Price (₨)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                              className="text-right"
                              disabled={!canEditPricing}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500 mb-2">Total</Label>
                            <div className="h-10 flex items-center justify-end font-medium">
                              <span className="text-xs font-normal mr-0.5">₨</span>
                              <span className="font-medium">{(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="col-span-1 flex items-end justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    {/* Total Summary */}
                    {items.length > 0 && (
                      <Card className="p-4 border-slate-200 shadow-sm bg-slate-50">
                        <div className="flex justify-end">
                          <div className="w-full max-w-md">
                            <div className="flex justify-between items-center py-2 border-b border-slate-200">
                              <span className="text-sm font-medium text-slate-700">Subtotal:</span>
                              <span className="text-sm font-semibold text-slate-900">
                                <span className="text-xs font-normal mr-0.5">₨</span>
                                {subtotal.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-base font-semibold text-slate-900">Total:</span>
                              <span className="text-lg font-bold text-[#c53032]">
                                <span className="text-sm font-normal mr-0.5">₨</span>
                                {subtotal.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                    <Button 
                      variant="outline" 
                        className="flex-1 min-w-[180px] border-dashed"
                        onClick={() => setShowProductCatalog(true)}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Add Service from Catalog
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 min-w-[180px] border-dashed"
                      onClick={() => addItem()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Item
                    </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Pricing & Payment */}
          {currentStep === 3 && (
            <div className="space-y-8 max-w-3xl">
              <div>
                <div className="mb-4">
                  <h3 className="mb-1">Payment Method</h3>
                  <p className="text-sm text-slate-500">
                    Select payment method (tax rates vary by method)
                  </p>
                </div>
                
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <div key={method.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <Label
                            htmlFor={method.id}
                            className="flex-1 flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <Icon className="h-5 w-5 text-slate-600" />
                            <div className="flex-1">
                              <p className="font-medium">{method.label}</p>
                              <p className="text-xs text-gray-500">
                                Tax Rate: {method.taxRate === 0 ? "0%" : `${method.taxRate * 100}%`}
                              </p>
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div>
                <div className="mb-4">
                  <h3 className="mb-1">Discount</h3>
                  <p className="text-sm text-slate-500">Apply discount to subtotal</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label className="text-sm mb-2">Discount Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      disabled={!canEditPricing}
                    />
                  </div>
                  <div>
                    <Label className="text-sm mb-2">Type</Label>
                    <Select value={discountType} onValueChange={(v: "percent" | "fixed") => setDiscountType(v)}>
                      <SelectTrigger disabled={!canEditPricing}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Percent
                          </div>
                        </SelectItem>
                        <SelectItem value="fixed">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Fixed (₨)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {!canEditPricing && (
                  <p className="text-xs text-orange-600 mt-2">
                    Only Admin and Supervisor can edit pricing and discounts
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <Label className="text-sm mb-2">Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any notes or special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 4: Staff & Review */}
          {currentStep === 4 && (
            <div className="space-y-8 max-w-3xl">
              <div>
                <div className="mb-4">
                  <h3 className="mb-1">Staff Information</h3>
                  <p className="text-sm text-slate-500">Assign technician and supervisor to this invoice</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm mb-2">Technician</Label>
                    <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select technician..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockTechnicians.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-2">Supervisor</Label>
                    <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supervisor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockSupervisors.map((sup) => (
                          <SelectItem key={sup.id} value={sup.id}>
                            {sup.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <div className="mb-4">
                  <h3 className="mb-1">Invoice Actions</h3>
                  <p className="text-sm text-slate-500">Generate and send invoice to customer</p>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-70"
                    onClick={handleShowInvoicePreview}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Preview Invoice
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={handleEmailInvoice}
                    disabled={!selectedCustomer?.email}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Invoice to Customer
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm mb-2">Invoice Status</Label>
                <Select value={invoiceStatus} onValueChange={(v: "Draft" | "Unpaid" | "Paid") => setInvoiceStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Draft</Badge>
                    </SelectItem>
                    <SelectItem value="Unpaid">
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">Unpaid</Badge>
                    </SelectItem>
                    <SelectItem value="Paid">
                      <Badge className="bg-[#fde7e7] text-[#a6212a] border-[#f1999b]">Paid</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Right panel intentionally removed for streamlined invoice creation */}
            </div>

      {/* Footer Navigation - Single prominent action button */}
      <div className="px-8 py-5 border-t border-slate-200 shrink-0 bg-white shadow-lg">
        <div className="flex gap-3 justify-between items-center max-w-7xl mx-auto">
          <div>
            <Button variant="outline" onClick={onClose} className="border-slate-300">
              Cancel
            </Button>
          </div>
          <div className="flex-1 flex justify-end">
            {currentStep < 4 ? (
              <Button 
                className="bg-[#c53032] hover:bg-[#a6212a] text-white shadow-md px-8 py-6 text-base font-semibold min-w-[160px]"
                onClick={handleNext}
              >
                Next Step
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <Button 
                className="bg-[#c53032] hover:bg-[#a6212a] text-white shadow-md px-8 py-6 text-base font-semibold min-w-[200px]"
                onClick={() => { void handleCompleteInvoice(); }}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Complete Invoice
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Product Catalog Modal */}
      <Dialog open={showProductCatalog} onOpenChange={setShowProductCatalog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Product & Service Catalog</DialogTitle>
            <DialogDescription>
              Select items from the catalog to add to your invoice
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products and services..."
                className="pl-10"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {loadingCatalog ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#c53032]" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  No products match your search.
                </p>
              ) : (
                filteredProducts.map((product: any) => {
                  const isSelected = selectedCatalogProducts.includes(product.id);
                  const isLowStock = product.isInventoryItem && product.currentStock <= product.minStock;
                  const isOutOfStock = product.isInventoryItem && product.currentStock < 0;
                  
                  // Check if product is already added to invoice
                  const isAlreadyAdded = items.some((item) => {
                    // Check by catalogItemId for catalog items
                    if (product.isCatalogItem && (item as any).catalogItemId) {
                      return (item as any).catalogItemId === product.id;
                    }
                    // Check by inventoryItemId for inventory items
                    if (product.isInventoryItem && (item as any).inventoryItemId) {
                      const invId = product.inventoryItem?._id || product.inventoryItemId;
                      return (item as any).inventoryItemId === invId;
                    }
                    // Fallback: check by name/description
                    return item.description === product.name;
                  });
                  
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        if (!isAlreadyAdded) {
                          handleCatalogProductToggle(product.id);
                        }
                      }}
                      disabled={isAlreadyAdded || isOutOfStock}
                      className={`w-full p-4 border rounded-xl transition-all flex items-center justify-between gap-4 text-left ${
                        isAlreadyAdded
                          ? "border-slate-300 bg-slate-100 opacity-75 cursor-not-allowed"
                          : isSelected
                          ? "border-[#c53032] bg-[#fde7e7] shadow-sm"
                          : isOutOfStock
                          ? "border-red-200 bg-red-50 opacity-60 cursor-not-allowed"
                          : "border-slate-200 hover:border-[#f1999b] hover:bg-[#fff5f5]"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium ${isAlreadyAdded ? 'text-slate-500' : 'text-slate-900'}`}>{product.name}</p>
                          {isAlreadyAdded && (
                            <Badge variant="outline" className="text-xs h-5 px-1.5 bg-orange-50 text-orange-700 border-orange-200">
                              Already Added
                            </Badge>
                          )}
                          {product.isInventoryItem && (
                            <Badge variant="outline" className="text-xs h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                              Inventory
                            </Badge>
                          )}
                          {product.type === 'service' && (
                            <Badge variant="outline" className="text-xs h-5 px-1.5">
                              Service
                            </Badge>
                          )}
                          {product.sku && (
                            <Badge variant="outline" className="text-xs h-5 px-1.5">
                              {product.sku}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{product.category}</p>
                        {/* Show inventory stock info */}
                        {product.isInventoryItem && (
                          <p className={`text-xs mt-1 ${
                            isOutOfStock ? 'text-red-600 font-semibold' :
                            isLowStock ? 'text-orange-600' :
                            'text-slate-500'
                          }`}>
                            Stock: {product.currentStock} {product.unit || 'piece'}
                            {isLowStock && (
                              <Badge variant={isOutOfStock ? "destructive" : "outline"} className="ml-2 text-xs h-4 px-1.5">
                                {isOutOfStock ? 'Out' : 'Low'}
                              </Badge>
                            )}
                          </p>
                        )}
                        {/* Show inventory link for catalog items */}
                        {product.isCatalogItem && product.inventoryItemId && (() => {
                          const invItem = inventoryItems.find((inv: any) => inv._id === product.inventoryItemId);
                          if (invItem) {
                            const stock = invItem.currentStock || 0;
                            const minStock = invItem.minStock || 0;
                            const isLow = stock <= minStock;
                            const isOut = stock < 0;
                            return (
                              <p className={`text-xs mt-1 ${
                                isOut ? 'text-red-600 font-semibold' :
                                isLow ? 'text-orange-600' :
                                'text-slate-500'
                              }`}>
                                Linked Inventory: {stock} {invItem.unit || 'piece'} (uses {product.consumeQuantityPerUse || 1})
                                {isLow && (
                                  <Badge variant={isOut ? "destructive" : "outline"} className="ml-2 text-xs h-4 px-1.5">
                                    {isOut ? 'Out' : 'Low'}
                                  </Badge>
                                )}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-medium text-[#c53032]">{formatCurrency(product.price)}</p>
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isAlreadyAdded
                              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                              : isSelected
                              ? "bg-[#c53032] text-white"
                              : "bg-[#fde7e7] text-[#c53032]"
                          }`}
                        >
                          {isAlreadyAdded ? (
                            <X className="h-4 w-4" />
                          ) : isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <Separator className="mt-4" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
            <p className="text-sm text-slate-500">
              {selectedCatalogCount
                ? `${selectedCatalogCount} item${selectedCatalogCount > 1 ? "s" : ""} selected`
                : "No items selected"}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedCatalogProducts([])}
                disabled={!selectedCatalogCount}
              >
                Clear Selection
              </Button>
              <Button
                className="bg-[#c53032] hover:bg-[#a6212a]"
                onClick={handleAddSelectedCatalogItems}
                disabled={!selectedCatalogCount}
              >
                Add Selected{selectedCatalogCount ? ` (${selectedCatalogCount})` : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Add Vehicle Modal */}
      <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Register a new vehicle for {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-2">Make</Label>
                <Input placeholder="Toyota" />
              </div>
              <div>
                <Label className="text-sm mb-2">Model</Label>
                <Input placeholder="Corolla" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-2">Year</Label>
                <Input placeholder="2021" />
              </div>
              <div>
                <Label className="text-sm mb-2">License Plate</Label>
                <Input placeholder="ISB-1234" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-slate-300" onClick={() => setShowAddVehicle(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-[#c53032] hover:bg-[#a6212a] shadow-sm" onClick={() => setShowAddVehicle(false)}>
                Add Vehicle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Modal */}
      {showInvoicePreview && selectedCustomer && selectedVehicle && (
        <InvoicePreviewModal
          open={showInvoicePreview}
          onOpenChange={setShowInvoicePreview}
          invoiceData={{
            invoiceNumber: invoiceNumber,
            issueDate: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            customer: {
              name: selectedCustomer.name,
              phone: selectedCustomer.phone,
              email: selectedCustomer.email,
            },
            vehicle: {
              year: selectedVehicle.year,
              make: selectedVehicle.make,
              model: selectedVehicle.model,
              plateNo: selectedVehicle.plateNo || selectedVehicle.plate,
            },
            services: items.map((item) => ({
              name: item.description || "Item",
              estimatedCost: item.price,
              quantity: item.quantity,
            })),
            technician: selectedTechnician ? { name: mockTechnicians.find(t => t.id === selectedTechnician)?.name || "" } : undefined,
            totalCost: total,
            subtotal: subtotal,
            tax: tax,
            discount: discountAmount,
            notes: notes,
          }}
          onShare={(method) => {
            if (method === 'whatsapp') {
              const message = `Invoice ${invoiceNumber} - ${formatCurrency(total)}`;
              const phone = selectedCustomer.phone?.replace(/\D/g, '') || '';
              if (phone) {
                const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
              }
            } else if (method === 'email') {
              handleEmailInvoice();
            }
          }}
          onCreateInvoice={handleCreateInvoice}
          isCreating={isCreatingInvoice}
        />
      )}
    </div>
  );
}
