import { useEffect, useState } from "react";
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
import { customersAPI, vehiclesAPI } from "../api/client";
import { AddCustomer } from "./AddCustomer";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  taxRate?: number;
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

export function AddInvoice({ onClose, onSubmit, userRole = "Admin" }: AddInvoiceProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [invoiceStatus, setInvoiceStatus] = useState<"Draft" | "Final" | "Paid">("Draft");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [invoiceNumber] = useState(() => `INV-${Date.now().toString().slice(-6)}`);
  
  // Step 1: Customer & Vehicle
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
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
  }, []);

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
  const filteredProducts = mockProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
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

  const createInvoiceItem = (product?: typeof mockProducts[0]): InvoiceItem => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: product?.name || "",
      quantity: 1,
      price: product?.price || 0,
  });

  const addItem = (product?: typeof mockProducts[0]) => {
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

  const handleGenerateInvoice = async (): Promise<boolean> => {
    if (!selectedCustomer) {
      alert("Please select a customer before generating an invoice.");
      return false;
    }

    if (!selectedVehicle) {
      alert("Please select a vehicle before generating an invoice.");
      return false;
    }

    if (items.length === 0) {
      alert("Please add at least one product or service.");
      return false;
    }

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

      // Invoice details on left below INVOICE
      doc.setFont("courier", "normal"); // Use courier as monospace alternative
      doc.setFontSize(10);
      doc.text(`INVOICE NUMBER: #${invoiceNumber.replace('INV-', '').padStart(4, '0')}`, margin, currentY + 30);
      const issueDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(`DATE: ${issueDate.toUpperCase()}`, margin, currentY + 36);
      doc.text(`DUE DATE: ${issueDate.toUpperCase()}`, margin, currentY + 42);

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
      doc.text("HOUSE 123, STREET 45, SOAN GARDEN", pageWidth - margin, addressStartY, { align: "right" });
      doc.text("ISLAMABAD", pageWidth - margin, addressStartY + 6, { align: "right" });
      doc.text("+92 300 1234567", pageWidth - margin, addressStartY + 12, { align: "right" });

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
      const termsText = notes || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent placerat vel sapien a ornare.";
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
      doc.text("OR +92 300 0000000.", footerRightX, currentY + 12, { align: "right" });

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

      doc.save(`${invoiceNumber}.pdf`);
    setInvoiceStatus("Final");
      success = true;
    } catch (error) {
      console.error("Failed to generate invoice PDF", error);
      alert("Unable to generate invoice PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }

    return success;
  };

  const handleEmailInvoice = () => {
    // Email invoice logic here
    console.log("Emailing invoice to:", selectedCustomer?.email);
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
      price: item.price || 0
    }));

    // Map status: "Draft" -> "Pending", "Final" -> "Pending", "Paid" -> "Paid"
    let mappedStatus = 'Pending';
    if (invoiceStatus === 'Paid') {
      mappedStatus = 'Paid';
    } else if (paymentMethod && invoiceStatus === 'Final') {
      // If payment method is selected and status is Final, mark as Paid
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
    const generated = await handleGenerateInvoice();
    if (!generated) {
      return;
    }
    onSubmit?.(buildInvoicePayload());
    onClose?.();
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

    const productsToAdd = mockProducts.filter((product) =>
      selectedCatalogProducts.includes(product.id)
    );

    if (!productsToAdd.length) {
      return;
    }

    setItems((prev) => [
      ...prev,
      ...productsToAdd.map((product) => createInvoiceItem(product)),
    ]);

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
          {onClose && (
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors mr-1"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
          )}
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
              invoiceStatus === "Final" ? "bg-green-500 hover:bg-green-600 text-white border-0" :
              "bg-[#a6212a] hover:bg-[#8f1c23] text-white border-0"
            }
          >
            {invoiceStatus}
          </Badge>
          {currentStep < 4 ? (
            <Button
              size="sm"
              className="hidden sm:inline-flex bg-white text-[#c53032] hover:bg-white/90 shadow-md"
              onClick={handleNext}
            >
              Next Step
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="hidden sm:inline-flex bg-white text-[#c53032] hover:bg-white/90 shadow-md"
              onClick={() => { void handleCompleteInvoice(); }}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                "Generating..."
              ) : (
                <>
                  Complete
                  <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
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
                                    <span className="text-xs text-gray-400 mt-0.5">ID: {(customer._id || customer.id).slice(-6)}</span>
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
                    onClick={() => handleGenerateInvoice().then(success => {
                      if (success) {
                        onSubmit?.({
                          customer: selectedCustomer,
                          vehicle: selectedVehicle,
                          items,
                          subtotal,
                          discount: discountAmount,
                          tax,
                          total,
                          paymentMethod,
                          technician: selectedTechnician,
                          supervisor: selectedSupervisor,
                          status: invoiceStatus,
                          notes,
                        });
                        onClose?.();
                      }
                    })}
                    disabled={isGeneratingPdf}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isGeneratingPdf ? "Generating..." : "Generate Invoice PDF"}
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
                <Select value={invoiceStatus} onValueChange={(v: "Draft" | "Final" | "Paid") => setInvoiceStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Draft</Badge>
                    </SelectItem>
                    <SelectItem value="Final">
                      <Badge className="bg-green-100 text-green-700 border-green-200">Final</Badge>
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
            
      <div className="hidden md:flex fixed bottom-6 right-6 z-30 flex-col gap-3">
        <Button
          className="shadow-lg bg-[#c53032] hover:bg-[#a6212a] text-white"
          onClick={currentStep < 4 ? handleNext : () => { void handleCompleteInvoice(); }}
          disabled={currentStep === 4 && isGeneratingPdf}
        >
          {currentStep < 4 ? (
            <>
              Next Step
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              {isGeneratingPdf ? "Generating..." : "Complete Invoice"}
              {!isGeneratingPdf && <Check className="h-4 w-4 ml-2" />}
            </>
          )}
        </Button>
        {currentStep > 1 && (
          <Button
            variant="outline"
            className="shadow-lg border-[#c53032] text-[#c53032] hover:bg-[#fde7e7]"
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Step
          </Button>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-8 py-5 border-t border-slate-200 shrink-0 bg-white">
        <div className="flex gap-3 justify-between max-w-7xl">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} className="border-slate-300">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="border-slate-300">
              Cancel
            </Button>
            {currentStep < 4 ? (
              <Button 
                className="bg-[#c53032] hover:bg-[#a6212a] shadow-sm"
                onClick={handleNext}
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                className="bg-[#c53032] hover:bg-[#a6212a] shadow-sm"
                onClick={() => { void handleCompleteInvoice(); }}
                disabled={isGeneratingPdf}
              >
                <Check className="h-4 w-4 mr-2" />
                {isGeneratingPdf ? "Generating..." : "Complete Invoice"}
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
              {filteredProducts.map((product) => {
                const isSelected = selectedCatalogProducts.includes(product.id);
                return (
                  <button
                  key={product.id}
                    type="button"
                    onClick={() => handleCatalogProductToggle(product.id)}
                    className={`w-full p-4 border rounded-xl transition-all flex items-center justify-between gap-4 text-left ${
                      isSelected
                        ? "border-[#c53032] bg-[#fde7e7] shadow-sm"
                        : "border-slate-200 hover:border-[#f1999b] hover:bg-[#fff5f5]"
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-sm text-slate-500">{product.category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-medium text-[#c53032]">{formatCurrency(product.price)}</p>
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-[#c53032] text-white"
                            : "bg-[#fde7e7] text-[#c53032]"
                        }`}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredProducts.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">
                  No products match your search.
                </p>
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
    </div>
  );
}
