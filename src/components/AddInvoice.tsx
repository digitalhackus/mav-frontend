import { useEffect, useState, useRef, useCallback } from "react";
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
  ChevronsUpDown,
  MessageSquare
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
  maxStock?: number; // Track available stock for inventory items
  isInventoryItem?: boolean; // Flag to identify inventory items
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

// Payment methods base structure (tax rates will be loaded from settings)
const basePaymentMethods = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card/POS", icon: CreditCard },
  { id: "online", label: "Online Transfer", icon: Smartphone },
];

// Default terms and conditions
const DEFAULT_TERMS = "Payment is due immediately upon receipt. No credit is extended under any circumstances.\nQuoted rates are valid for 5 days only and may change thereafter.";

export function AddInvoice({ onClose, onSubmit, userRole = "Admin" }: AddInvoiceProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [invoiceStatus, setInvoiceStatus] = useState<"Unpaid" | "Paid">("Unpaid");
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
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const isProcessingRef = useRef(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const draftVehicleIdRef = useRef<string | null>(null);
  const isRestoringDraftRef = useRef(false);
  const prevVehicleIdRef = useRef<string | null>(null);
  const prevCustomerIdRef = useRef<string | null>(null);
  const restorationCompleteRef = useRef(false);
  const invoiceCompletedRef = useRef(false); // Track if invoice was completed (don't save as draft)
  const vehicleValidatedRef = useRef(false); // Track if vehicle has been validated for current customer
  
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
  const [newVehicleForm, setNewVehicleForm] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear().toString(),
    plateNo: "",
  });
  const [savingVehicle, setSavingVehicle] = useState(false);
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
  const [terms, setTerms] = useState("");
  const [paymentMethods, setPaymentMethods] = useState(basePaymentMethods.map(method => ({ ...method, taxRate: 0 })));
  
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

  // Initialize on mount - always start fresh from Step 1
  // Draft invoices are saved to database and visible in "All Invoices" list
  useEffect(() => {
    // Clear any leftover localStorage draft
    localStorage.removeItem(DRAFT_KEY);
    
    fetchCustomers();
    fetchCatalogItems();
    fetchInventoryItems();
    fetchBusinessProfile();
    
    // Check for editing invoice ID from sessionStorage (when editing existing invoice)
    const editingInvoiceId = sessionStorage.getItem('editingInvoiceId');
    if (editingInvoiceId) {
      setEditingInvoiceId(editingInvoiceId);
      loadInvoiceForEditing(editingInvoiceId);
      // Clear draft ID when editing - we're editing a specific invoice
      sessionStorage.removeItem('draftInvoiceId');
    } else {
      // Starting fresh - clear any old draft ID to prevent accidental updates
      sessionStorage.removeItem('draftInvoiceId');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore vehicle ID after vehicles are loaded (when restoring from draft or editing)
  useEffect(() => {
    // First check if we have editing vehicle data to match
    if (isRestoringDraftRef.current && !loadingVehicles && vehicles.length > 0 && (window as any).__editingVehicleData) {
      const editingVehicleData = (window as any).__editingVehicleData;
      console.log('Attempting to match vehicle:', editingVehicleData, 'Available vehicles:', vehicles);
      // Try to find vehicle by matching make, model, and plateNo
      // Use more lenient matching - require make and model, plateNo is optional (if both are empty, match anyway)
      const vehicleToRestore = vehicles.find(v => {
        const makeMatch = (v.make || '').trim().toLowerCase() === (editingVehicleData.make || '').trim().toLowerCase();
        const modelMatch = (v.model || '').trim().toLowerCase() === (editingVehicleData.model || '').trim().toLowerCase();
        const vPlateNo = (v.plateNo || '').trim().toLowerCase();
        const editingPlateNo = (editingVehicleData.plateNo || '').trim().toLowerCase();
        // PlateNo must match if both are provided, but if both are empty, that's also a match
        const plateMatch = (vPlateNo === '' && editingPlateNo === '') || vPlateNo === editingPlateNo;
        return makeMatch && modelMatch && plateMatch;
      });
      
      if (vehicleToRestore) {
        console.log('Vehicle matched:', vehicleToRestore);
        // Vehicle found - restore it using the actual vehicle's ID
        const vehicleId = vehicleToRestore._id || vehicleToRestore.id;
        const vehicleIdString = String(vehicleId);
        setSelectedVehicleId(vehicleIdString);
        draftVehicleIdRef.current = vehicleIdString; // Set this for consistency
        // Update prevVehicleIdRef so items won't be cleared during restoration
        prevVehicleIdRef.current = vehicleIdString;
        
        // Restore items if we're editing
        if ((window as any).__editingInvoiceItems) {
          setItems((window as any).__editingInvoiceItems);
          delete (window as any).__editingInvoiceItems;
        }
        
        // Clean up editing vehicle data
        delete (window as any).__editingVehicleData;
      } else {
        // Vehicle not found by exact matching - try partial match (make + model only)
        console.log('Exact match failed, trying partial match...');
        const partialMatch = vehicles.find(v => {
          const makeMatch = (v.make || '').trim().toLowerCase() === (editingVehicleData.make || '').trim().toLowerCase();
          const modelMatch = (v.model || '').trim().toLowerCase() === (editingVehicleData.model || '').trim().toLowerCase();
          return makeMatch && modelMatch;
        });
        
        if (partialMatch) {
          console.log('Partial match found:', partialMatch);
          const vehicleId = partialMatch._id || partialMatch.id;
          const vehicleIdString = String(vehicleId);
          setSelectedVehicleId(vehicleIdString);
          draftVehicleIdRef.current = vehicleIdString;
          prevVehicleIdRef.current = vehicleIdString;
          
          // Restore items if we're editing
          if ((window as any).__editingInvoiceItems) {
            setItems((window as any).__editingInvoiceItems);
            delete (window as any).__editingInvoiceItems;
          }
          
          delete (window as any).__editingVehicleData;
        } else {
          console.log('No vehicle match found (exact or partial)');
          // Vehicle not found by matching - still restore items
          if ((window as any).__editingInvoiceItems) {
            setItems((window as any).__editingInvoiceItems);
            delete (window as any).__editingInvoiceItems;
          }
          delete (window as any).__editingVehicleData;
        }
      }
      
      // Mark restoration as complete
      restorationCompleteRef.current = true;
      draftVehicleIdRef.current = null;
      isRestoringDraftRef.current = false;
      setTimeout(() => {
        restorationCompleteRef.current = false;
      }, 1000);
      return; // Early return to skip validation check during restoration
    }
    
    // Handle draft restoration with vehicle ID
    if (isRestoringDraftRef.current && draftVehicleIdRef.current && !loadingVehicles) {
      if (vehicles.length > 0) {
        // Check if the vehicle exists in the loaded vehicles (handle both string and object ID comparison)
        const vehicleToRestore = vehicles.find(v => {
          const vehicleId = v._id || v.id;
          const draftVehicleId = draftVehicleIdRef.current;
          // Compare as strings to handle MongoDB ObjectId vs string comparisons
          return String(vehicleId) === String(draftVehicleId);
        });
        if (vehicleToRestore) {
          // Vehicle exists - restore it using the actual vehicle's ID
          const vehicleId = vehicleToRestore._id || vehicleToRestore.id;
          const vehicleIdString = String(vehicleId);
          setSelectedVehicleId(vehicleIdString);
          // Update prevVehicleIdRef so items won't be cleared during restoration
          prevVehicleIdRef.current = vehicleIdString;
        }
        // Mark restoration as complete AFTER setting vehicle (if found)
        restorationCompleteRef.current = true;
        // Clear the refs after attempting restoration
        draftVehicleIdRef.current = null;
        isRestoringDraftRef.current = false;
        // Reset the restoration complete flag after a delay to allow state to update and prevent validation check from interfering
        setTimeout(() => {
          restorationCompleteRef.current = false;
        }, 1000);
      } else {
        // Vehicles have finished loading but none were found - clear the refs
        draftVehicleIdRef.current = null;
        isRestoringDraftRef.current = false;
        restorationCompleteRef.current = true;
        setTimeout(() => {
          restorationCompleteRef.current = false;
        }, 1000);
      }
      return; // Early return to skip validation check during restoration
    }
    // Only validate vehicle ID if we're not restoring and restoration is complete
    // Add extra check: don't validate if draftVehicleIdRef still has a value (restoration in progress)
    // Also: only validate ONCE per customer - don't re-validate on tab switches or re-fetches
    if (!loadingVehicles && selectedVehicleId && vehicles.length > 0 && selectedCustomerId && 
        !isRestoringDraftRef.current && !restorationCompleteRef.current && !draftVehicleIdRef.current &&
        !vehicleValidatedRef.current) {
      const vehicleExists = vehicles.some(v => {
        const vehicleId = v._id || v.id;
        return String(vehicleId) === String(selectedVehicleId);
      });
      if (!vehicleExists) {
        // Vehicle ID doesn't match any loaded vehicle - clear it
        // But only if this isn't a restoration scenario
        setSelectedVehicleId("");
      }
      // Mark as validated so we don't re-run this on tab switches
      vehicleValidatedRef.current = true;
    }
  }, [vehicles, loadingVehicles, selectedVehicleId, selectedCustomerId]);

  // Reset items when customer changes (but not during draft restoration)
  useEffect(() => {
    // Only reset items if we're not restoring from draft and customer actually changed
    if (!isRestoringDraftRef.current && !restorationCompleteRef.current) {
      if (prevCustomerIdRef.current !== null && prevCustomerIdRef.current !== selectedCustomerId) {
        // Customer changed - reset items
        setItems([]);
      }
      // Update the previous customer ID ref
      if (selectedCustomerId) {
        prevCustomerIdRef.current = selectedCustomerId;
      } else {
        // Customer was cleared - also clear items and reset ref
        if (prevCustomerIdRef.current !== null) {
          setItems([]);
        }
        prevCustomerIdRef.current = null;
      }
    }
  }, [selectedCustomerId]);

  // Reset items when vehicle changes (but not during draft restoration)
  useEffect(() => {
    // Only reset items if we're not restoring from draft and vehicle actually changed
    if (!isRestoringDraftRef.current && !restorationCompleteRef.current) {
      if (prevVehicleIdRef.current !== null && prevVehicleIdRef.current !== selectedVehicleId) {
        // Vehicle changed - reset items
        setItems([]);
      }
      // Update the previous vehicle ID ref
      if (selectedVehicleId) {
        prevVehicleIdRef.current = selectedVehicleId;
      } else {
        // Vehicle was cleared - also clear items and reset ref
        if (prevVehicleIdRef.current !== null) {
          setItems([]);
        }
        prevVehicleIdRef.current = null;
      }
    }
    // Note: During restoration, prevVehicleIdRef is updated in the restoration useEffect
  }, [selectedVehicleId]);

  // Refs to store latest values for cleanup (avoids stale closure issues)
  const latestDataRef = useRef({
    selectedCustomerId,
    selectedVehicleId,
    items,
    discount,
    notes,
    vehicles,
    editingInvoiceId
  });
  
  // Keep refs updated
  useEffect(() => {
    latestDataRef.current = {
      selectedCustomerId,
      selectedVehicleId,
      items,
      discount,
      notes,
      vehicles,
      editingInvoiceId
    };
  }, [selectedCustomerId, selectedVehicleId, items, discount, notes, vehicles, editingInvoiceId]);

  // Auto-save draft to database when user navigates away without completing
  useEffect(() => {
    return () => {
      const { selectedCustomerId, selectedVehicleId, items, discount, notes, vehicles, editingInvoiceId } = latestDataRef.current;
      
      // Don't save draft if invoice was already completed
      if (invoiceCompletedRef.current) {
        sessionStorage.removeItem('draftInvoiceId');
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      
      // Don't save if editing an existing invoice
      if (editingInvoiceId) {
        return;
      }
      
      // Save draft to database if we have customer, vehicle, and items
      if (selectedCustomerId && selectedVehicleId && items && items.length > 0) {
        const existingDraftId = sessionStorage.getItem('draftInvoiceId');
        
        const vehicleData = vehicles.find((v: any) => (v._id || v.id) === selectedVehicleId);
        const formattedVehicle = vehicleData ? {
          make: vehicleData.make || '',
          model: vehicleData.model || '',
          year: vehicleData.year || null,
          plateNo: vehicleData.plateNo || ''
        } : null;
        
        const formattedItems = items.map((item: any) => ({
          description: item.description || '',
          quantity: item.quantity || 1,
          price: item.price || 0,
          catalogItemId: item.catalogItemId || undefined,
          inventoryItemId: item.inventoryItemId || undefined,
        }));
        
        const subtotalCalc = formattedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        
        const invoicePayload = {
          customer: selectedCustomerId,
          vehicle: formattedVehicle,
          items: formattedItems,
          subtotal: subtotalCalc,
          tax: 0,
          discount: discount || 0,
          amount: subtotalCalc - (discount || 0),
          status: 'Pending',
          paymentMethod: undefined, // No payment method = Draft
          notes: notes || '',
        };
        
        // Fire and forget - async save
        if (existingDraftId) {
          invoicesAPI.update(existingDraftId, invoicePayload).catch(console.error);
        } else {
          invoicesAPI.create(invoicePayload).then(response => {
            if (response.success && response.data) {
              sessionStorage.setItem('draftInvoiceId', response.data._id || response.data.id);
            }
          }).catch(console.error);
        }
      }
      
      localStorage.removeItem(DRAFT_KEY);
    };
  }, []); // Empty deps - cleanup only runs on unmount, reads from refs

  // Load invoice data for editing
  const loadInvoiceForEditing = async (invoiceId: string) => {
    try {
      setIsLoadingInvoice(true);
      const response = await invoicesAPI.getById(invoiceId);
      
      if (response.success && response.data) {
        const invoice = response.data;
        
        // Set restoration flags to prevent items from being cleared
        isRestoringDraftRef.current = true;
        
        // Set customer
        const customerId = invoice.customer?._id || invoice.customer?.id || invoice.customer;
        if (customerId) {
          setSelectedCustomerId(customerId);
          prevCustomerIdRef.current = customerId;
          
          // Set vehicle if exists - store vehicle data to match after vehicles are loaded
          // Note: Invoice vehicles are stored as embedded objects (not references)
          // So we need to match by make, model, and plateNo
          if (invoice.vehicle) {
            // Store vehicle matching data - will be matched after vehicles load
            // Store as object with make, model, plateNo for matching
            (window as any).__editingVehicleData = {
              make: invoice.vehicle.make || '',
              model: invoice.vehicle.model || '',
              plateNo: invoice.vehicle.plateNo || '',
              year: invoice.vehicle.year
            };
          }
        }
        
        // Set invoice items - store them to restore after vehicle is loaded
        if (invoice.items && invoice.items.length > 0) {
          const formattedItems: InvoiceItem[] = invoice.items.map((item: any, index: number) => ({
            id: item._id || item.id || `item-${index}`,
            description: item.description || item.name || '',
            quantity: item.quantity || 1,
            price: item.price || item.unitPrice || 0,
            catalogItemId: item.catalogItemId,
            inventoryItemId: item.inventoryItemId,
          }));
          // Store items in a ref to restore after vehicle restoration completes
          // This prevents items from being cleared during vehicle restoration
          (window as any).__editingInvoiceItems = formattedItems;
          setItems(formattedItems);
        }
        
        // Set pricing details
        if (invoice.discount !== undefined) {
          setDiscount(invoice.discount);
        }
        // Determine discount type (percent or fixed) - default to fixed for now
        setDiscountType("fixed");
        
        // Set payment method
        if (invoice.paymentMethod) {
          const paymentMethodLower = invoice.paymentMethod.toLowerCase();
          if (paymentMethodLower.includes('cash')) {
            setPaymentMethod('cash');
          } else if (paymentMethodLower.includes('card') || paymentMethodLower.includes('pos')) {
            setPaymentMethod('card');
          } else if (paymentMethodLower.includes('online') || paymentMethodLower.includes('transfer')) {
            setPaymentMethod('online');
          }
        }
        
        // Set notes
        if (invoice.notes) {
          setNotes(invoice.notes);
        }
        
        // Set terms
        if (invoice.terms) {
          setTerms(invoice.terms);
        }
        
        // Set status
        const backendStatus = invoice.status || 'Pending';
        if (backendStatus === 'Paid') {
          setInvoiceStatus('Paid');
        } else {
          // All non-Paid invoices are treated as Unpaid
          setInvoiceStatus('Unpaid');
        }
        
        // Set technician and supervisor
        if (invoice.technician) {
          setSelectedTechnician(invoice.technician);
        }
        if (invoice.supervisor) {
          setSelectedSupervisor(invoice.supervisor);
        }
        
        // Auto-advance to Products & Services step (step 2) since customer and vehicle are selected
        setCurrentStep(2);
      }
    } catch (error: any) {
      console.error('Error loading invoice for editing:', error);
      toast.error(error.message || 'Failed to load invoice for editing');
      sessionStorage.removeItem('editingInvoiceId');
      setEditingInvoiceId(null);
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const fetchBusinessProfile = async () => {
    try {
      const response = await settingsAPI.get();
      if (response.success && response.data) {
        // Update business profile
        if (response.data.workshop) {
          const workshop = response.data.workshop;
          setBusinessProfile({
            name: (workshop.businessName || "MOMENTUM AUTOWORKS").toUpperCase(),
            address: workshop.address || "",
            phone: workshop.phone || "+92 300 1234567",
            email: workshop.email || "info@momentumauto.pk",
          });
        }
        
        // Update payment methods with tax rates from settings
        if (response.data.tax) {
          const taxSettings = response.data.tax;
          const updatedPaymentMethods = basePaymentMethods.map(method => {
            let taxRate = 0;
            if (method.id === "cash") {
              taxRate = (taxSettings.cash || 0) / 100; // Convert percentage to decimal
            } else if (method.id === "card") {
              taxRate = (taxSettings.card || 0) / 100;
            } else if (method.id === "online") {
              taxRate = (taxSettings.online || 0) / 100;
            }
            return { ...method, taxRate };
          });
          setPaymentMethods(updatedPaymentMethods);
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
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
        const sortedItems = Object.values(itemCounts)
          .filter((entry: any) => 
            entry.item.type === 'service' || 
            entry.item.isInventoryItem || 
            entry.item.type === 'product'
          )
          .sort((a: any, b: any) => b.count - a.count)
          .map((entry: any) => entry.item);
        
        // Deduplicate by item id and name to prevent duplicate cards
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        const mostUsed = sortedItems.filter((item: any) => {
          const itemId = item.id || item.catalogItem?._id || item.inventoryItem?._id;
          const itemName = item.name?.toLowerCase();
          
          // Skip if we've already seen this ID or name
          if (itemId && seenIds.has(itemId)) return false;
          if (itemName && seenNames.has(itemName)) return false;
          
          // Mark as seen
          if (itemId) seenIds.add(itemId);
          if (itemName) seenNames.add(itemName);
          
          return true;
        }).slice(0, 8);

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
      // Don't clear vehicle ID when customer changes - let it persist if it belongs to the customer
      // It will be validated/cleared by the restoration logic if needed
      // Only clear vehicle if we're not restoring from draft (manual customer change)
      if (!isRestoringDraftRef.current) {
        // This is a manual customer change, not restoration - vehicle will be validated/cleared later if invalid
      }
    } else {
      // Only clear vehicle if we're not restoring (customer was manually cleared)
      if (!isRestoringDraftRef.current && !restorationCompleteRef.current) {
        setVehicles([]);
        setSelectedVehicleId("");
      }
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
    // Clear restoration flags since this is a manual selection
    isRestoringDraftRef.current = false;
    restorationCompleteRef.current = false;
    draftVehicleIdRef.current = null;
    vehicleValidatedRef.current = false; // Reset so we validate for new customer
    // Reset items immediately when customer changes
    setItems([]);
    // Set selected customer
    setSelectedCustomerId(customerId);
    setSelectedVehicleId(""); // Reset vehicle when customer changes
  };

  const handleSaveNewVehicle = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer first");
      return;
    }
    
    if (!newVehicleForm.make.trim() || !newVehicleForm.model.trim() || !newVehicleForm.plateNo.trim()) {
      toast.error("Please fill in Make, Model, and License Plate");
      return;
    }

    try {
      setSavingVehicle(true);
      const response = await vehiclesAPI.create({
        customer: selectedCustomerId,
        make: newVehicleForm.make.trim(),
        model: newVehicleForm.model.trim(),
        year: parseInt(newVehicleForm.year) || new Date().getFullYear(),
        plateNo: newVehicleForm.plateNo.trim(),
        status: 'Active'
      });

      if (response.success && response.data) {
        // Refresh vehicles list
        await fetchVehicles(selectedCustomerId);
        // Auto-select the newly added vehicle
        const newVehicleId = response.data._id || response.data.id;
        setSelectedVehicleId(newVehicleId);
        // Reset form and close dialog
        setNewVehicleForm({
          make: "",
          model: "",
          year: new Date().getFullYear().toString(),
          plateNo: "",
        });
        setShowAddVehicle(false);
        toast.success("Vehicle added successfully");
      }
    } catch (err: any) {
      console.error("Failed to add vehicle:", err);
      toast.error(err.message || "Failed to add vehicle. Please try again.");
    } finally {
      setSavingVehicle(false);
    }
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
  const subtotal = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const discountAmount = discountType === "percent" 
    ? (subtotal * discount / 100)
    : discount;
  const afterDiscount = subtotal - discountAmount;
  const taxRate = selectedPaymentMethod?.taxRate || 0;
  const tax = afterDiscount * taxRate;
  const total = afterDiscount + tax;

  // Draft auto-save key
  const DRAFT_KEY = 'invoice_draft';

  const createInvoiceItem = (product?: any): InvoiceItem => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: product?.name || "",
    quantity: 1,
    price: product?.price || 0,
    // Store references for inventory deduction
    catalogItemId: product?.isCatalogItem ? product.id : undefined,
    inventoryItemId: product?.isInventoryItem ? product.inventoryItem?._id : (product?.inventoryItemId || undefined),
    // Track stock for inventory items to limit quantity
    maxStock: product?.isInventoryItem ? (product?.currentStock || 0) : undefined,
    isInventoryItem: product?.isInventoryItem || false,
  });

  const addItem = (product?: any) => {
    if (!product) {
      // Add custom item (no product provided)
      const newItem = createInvoiceItem();
      setItems((prev) => [...prev, newItem]);
      return;
    }

    // Check if inventory item is out of stock
    if (product.isInventoryItem && product.currentStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    // Check if product has a valid price (greater than 0)
    if (!product.price || product.price <= 0) {
      toast.error(`${product.name} has no price set. Please set a price in the catalog first.`);
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
    // Go back one step if not on first step
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      // If on step 1, close/exit the invoice creation or editing
      sessionStorage.removeItem('editingInvoiceId');
      if (onClose) {
        onClose();
      } else {
        navigate("/invoices");
      }
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

    if (!selectedVehicleId || !selectedVehicle) {
      alert("Please select a vehicle before generating an invoice.");
      return;
    }

    if (items.length === 0) {
      alert("Please add at least one product or service.");
      return;
    }

    setShowInvoicePreview(true);
  };

  const generatePDFAsBlob = async (): Promise<Blob | null> => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = margin;

      // Set background color (white)
      doc.setFillColor(255, 255, 255);
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
        timeZone: "Asia/Karachi",
      });
      const timeStr = issueDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Karachi",
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
      let summaryStartY = tableFinalY + 10;
      const labelWidth = 40;
      
      // Discount (if any)
      if (discountAmount > 0) {
        doc.setFont("courier", "bold");
        doc.setFontSize(10);
        const discountLabel = discountType === "percent" ? `DISCOUNT (${discount}%)` : "DISCOUNT";
        doc.text(discountLabel, summaryX - labelWidth, summaryStartY, { align: "right" });
        doc.text(`-Rs${Math.round(discountAmount).toLocaleString('en-US')}`, summaryX, summaryStartY, { align: "right" });
        summaryStartY += 8;
      }
      
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

      // Notes section (if any)
      if (notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("NOTES", footerLeftX, currentY);
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.text(
          notes,
          footerLeftX,
          currentY + 6,
          { maxWidth: (pageWidth - margin * 2) / 2 }
        );
        currentY += 20;
      }

      // Terms & Conditions on left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TERM & CONDITION", footerLeftX, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const termsText = terms || DEFAULT_TERMS;
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

      // Generate blob instead of saving
      const pdfBlob = doc.output('blob');
      return pdfBlob;
    } catch (error) {
      console.error("Failed to generate PDF blob:", error);
      return null;
    }
  };

  const handleGenerateInvoicePDF = async (): Promise<boolean> => {
    setIsGeneratingPdf(true);
    let success = false;

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = margin;

      // Set background color (white)
      doc.setFillColor(255, 255, 255);
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
        timeZone: "Asia/Karachi",
      });
      const timeStr = issueDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Karachi",
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
      let summaryStartY = tableFinalY + 10;
      const labelWidth = 40;
      
      // Discount (if any)
      if (discountAmount > 0) {
        doc.setFont("courier", "bold");
        doc.setFontSize(10);
        const discountLabel = discountType === "percent" ? `DISCOUNT (${discount}%)` : "DISCOUNT";
        doc.text(discountLabel, summaryX - labelWidth, summaryStartY, { align: "right" });
        doc.text(`-Rs${Math.round(discountAmount).toLocaleString('en-US')}`, summaryX, summaryStartY, { align: "right" });
        summaryStartY += 8;
      }
      
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

      // Notes section (if any)
      if (notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("NOTES", footerLeftX, currentY);
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.text(
          notes,
          footerLeftX,
          currentY + 6,
          { maxWidth: (pageWidth - margin * 2) / 2 }
        );
        currentY += 20;
      }

      // Terms & Conditions on left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TERM & CONDITION", footerLeftX, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const termsText = terms || DEFAULT_TERMS;
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

  const handleEmailInvoice = async () => {
    if (!selectedCustomer?.email) {
      toast.error("Customer email is not available");
      return;
    }

    // Need an invoice ID to send email (must be editing an existing invoice)
    if (!editingInvoiceId) {
      toast.error("Please save the invoice first before sending via email");
      return;
    }

    const invoiceId = editingInvoiceId;

    try {
      setIsGeneratingPdf(true);
      toast.loading("Generating and sending invoice...", { id: "email-invoice" });

      // Generate PDF first
      const pdfBlob = await generatePDFAsBlob();
      
      if (!pdfBlob) {
        toast.error("Failed to generate invoice PDF", { id: "email-invoice" });
        setIsGeneratingPdf(false);
        return;
      }

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove data URL prefix (data:application/pdf;base64,)
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(pdfBlob);
      const pdfBase64 = await base64Promise;

      // Send email via API
      const response = await invoicesAPI.sendEmail(invoiceId!, pdfBase64);

      if (response.success) {
        toast.success(response.message || "Invoice sent successfully!", { id: "email-invoice" });
      } else {
        toast.error(response.message || "Failed to send invoice", { id: "email-invoice" });
      }
    } catch (error: any) {
      console.error("Error sending invoice email:", error);
      toast.error(error.message || "Failed to send invoice email", { id: "email-invoice" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleWhatsAppInvoice = async () => {
    if (!selectedCustomer?.phone) {
      toast.error("Customer phone number is not available");
      return;
    }

    try {
      setIsGeneratingPdf(true);
      
      // Generate PDF first
      const pdfBlob = await generatePDFAsBlob();
      
      if (!pdfBlob) {
        toast.error("Failed to generate invoice PDF");
        setIsGeneratingPdf(false);
        return;
      }

      // Create a temporary download link
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Build vehicle info - show make and model if available
      let vehicleInfo = 'N/A';
      if (selectedVehicle) {
        const vehicleParts = [];
        if (selectedVehicle.make) vehicleParts.push(selectedVehicle.make);
        if (selectedVehicle.model) vehicleParts.push(selectedVehicle.model);
        if (selectedVehicle.year) vehicleParts.push(selectedVehicle.year);
        if (vehicleParts.length > 0) {
          vehicleInfo = vehicleParts.join(' ');
        }
      }

      const plateNo = selectedVehicle?.plateNo || selectedVehicle?.plate || '';
      const customerName = selectedCustomer?.name || '';
      const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
      const invoiceId = (plateNo && initials) ? `${plateNo}-${initials}` : invoiceNumber;
      
      // Format total amount with tax info
      const totalAmountText = tax > 0 
        ? `Rs ${total.toLocaleString()} (with tax)`
        : `Rs ${total.toLocaleString()}`;
      
      // Create a simple message
      const message = `*Invoice ${invoiceId} - MAWS*\n\n` +
        `Dear ${selectedCustomer.name},\n\n` +
        `Your invoice details:\n` +
        `- Invoice ID: ${invoiceId}\n` +
        `- Date: ${new Date().toLocaleDateString()}\n` +
        `- Vehicle: ${vehicleInfo}\n` +
        `- Total Amount: ${totalAmountText}\n\n` +
        `Thank you for choosing MAWS!`;

      // Remove all non-digit characters from phone number
      const phone = selectedCustomer.phone.replace(/\D/g, '');
      
      if (!phone) {
        toast.error("Invalid phone number format");
        return;
      }

      // Download PDF first
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Open WhatsApp Web with pre-filled message
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      // Clean up the blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 100);
      
      toast.success("Invoice PDF downloaded! WhatsApp opened. You can attach the PDF from your downloads.");
    } catch (error: any) {
      console.error("Failed to send invoice via WhatsApp:", error);
      toast.error(error.message || "Failed to generate invoice PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  // Reset form to initial state
  const resetForm = () => {
    setSelectedCustomerId('');
    setSelectedVehicleId('');
    setItems([]);
    setDiscount(0);
    setDiscountType('percent');
    setPaymentMethod('cash');
    setNotes('');
    vehicleValidatedRef.current = false;
    setTerms('');
    setInvoiceStatus('Unpaid');
    setSelectedTechnician('');
    setSelectedSupervisor('');
    setCurrentStep(1);
    // Clear refs
    prevCustomerIdRef.current = null;
    prevVehicleIdRef.current = null;
    draftVehicleIdRef.current = null;
    isRestoringDraftRef.current = false;
    restorationCompleteRef.current = false;
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

    // Determine status: Map frontend status to backend status
    // Status mapping:
    // - Paid: Invoice completed and payment received → status = "Paid", paymentMethod = selected method
    // - Unpaid: Invoice completed but no payment yet → status = "Pending", paymentMethod = "Other" (marks as completed)
    // - Draft: User left without completing → status = "Pending", paymentMethod = undefined/null
    let mappedStatus = 'Pending';
    let mappedPaymentMethod: string | undefined = undefined;
    
    if (invoiceStatus === 'Paid') {
      mappedStatus = 'Paid';
      // Set payment method when marking as Paid
      mappedPaymentMethod = paymentMethod === 'cash' ? 'Cash' : 
                            paymentMethod === 'card' ? 'Card/POS' : 
                            paymentMethod === 'online' ? 'Online Transfer' : 
                            'Cash'; // Default to Cash if no method selected
    } else if (invoiceStatus === 'Unpaid') {
      mappedStatus = 'Pending'; // Unpaid maps to Pending in backend
      // Use "Other" to mark as completed but unpaid (distinguishes from Draft where paymentMethod = undefined)
      mappedPaymentMethod = 'Other';
    }
    // If no status selected, paymentMethod stays undefined (Draft)

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
      paymentMethod: mappedPaymentMethod,
      technician: technicianName || undefined,
      supervisor: supervisorName || undefined,
      notes: notes || undefined,
      terms: terms || undefined,
      date: new Date().toISOString()
    };
  };

  const handleCompleteInvoice = async () => {
    // Prevent duplicate submissions
    if (isProcessingRef.current || isGeneratingPdf || isCreatingInvoice) {
      return;
    }

    if (!selectedCustomer || !selectedVehicleId || !selectedVehicle || items.length === 0) {
      toast.error("Please complete all required fields before creating the invoice.");
      return;
    }

    try {
      // Set processing flag to prevent duplicate calls
      isProcessingRef.current = true;
      setIsGeneratingPdf(true);
      setIsCreatingInvoice(true);

      // Only generate and download PDF if status is "Paid"
      let pdfGenerated = true; // Default to true if we don't need to generate PDF
      if (invoiceStatus === 'Paid') {
        pdfGenerated = await handleGenerateInvoicePDF();
        
        if (!pdfGenerated) {
          isProcessingRef.current = false;
          setIsGeneratingPdf(false);
          setIsCreatingInvoice(false);
          return;
        }
      }

      // Then, create or update the invoice in the database
      const invoicePayload = buildInvoicePayload();
      
      // Check for existing draft ID in sessionStorage
      const existingDraftId = sessionStorage.getItem('draftInvoiceId');
      
      let response;
      if (editingInvoiceId) {
        // Update existing invoice (editing mode)
        response = await invoicesAPI.update(editingInvoiceId, invoicePayload);
      } else if (existingDraftId) {
        // Update existing draft (convert draft to completed invoice)
        response = await invoicesAPI.update(existingDraftId, invoicePayload);
      } else {
        // Create new invoice
        response = await invoicesAPI.create(invoicePayload);
      }
      
      if (response.success) {
        // Mark invoice as completed
        invoiceCompletedRef.current = true;
        
        const successMessage = editingInvoiceId 
          ? (invoiceStatus === 'Paid' ? "Invoice updated and downloaded successfully!" : "Invoice updated successfully!")
          : (invoiceStatus === 'Paid' ? "Invoice created and downloaded successfully!" : "Invoice created successfully!");
        toast.success(successMessage);
        
        // Clear editing invoice ID
        if (editingInvoiceId) {
          sessionStorage.removeItem('editingInvoiceId');
          setEditingInvoiceId(null);
        }
        // Clear draft invoice ID
        sessionStorage.removeItem('draftInvoiceId');
        localStorage.removeItem(DRAFT_KEY);
        
        // Call onSubmit callback if provided
        if (onSubmit) {
          onSubmit(response.data);
        }
        
        // Navigate to invoices page
        if (onClose) {
          onClose();
        } else {
          navigate("/invoices");
        }
      } else {
        toast.error(response.message || (editingInvoiceId ? "Failed to update invoice" : "Failed to create invoice"));
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
    if (!selectedCustomer || !selectedVehicleId || !selectedVehicle || items.length === 0) {
      toast.error("Please complete all required fields before creating the invoice.");
      return;
    }

    try {
      setIsCreatingInvoice(true);
      const invoicePayload = buildInvoicePayload();
      
      // Check for existing draft ID in sessionStorage
      const existingDraftId = sessionStorage.getItem('draftInvoiceId');
      
      let response;
      if (editingInvoiceId) {
        // Update existing invoice (editing mode)
        response = await invoicesAPI.update(editingInvoiceId, invoicePayload);
      } else if (existingDraftId) {
        // Update existing draft (convert draft to completed invoice)
        response = await invoicesAPI.update(existingDraftId, invoicePayload);
      } else {
        // Create new invoice
        response = await invoicesAPI.create(invoicePayload);
      }
      
      if (response.success) {
        // Mark invoice as completed to prevent saving as draft on unmount
        invoiceCompletedRef.current = true;
        
        toast.success(editingInvoiceId ? "Invoice updated successfully!" : "Invoice created successfully!");
        
        // Clear editing invoice ID after successful update
        if (editingInvoiceId) {
          sessionStorage.removeItem('editingInvoiceId');
          setEditingInvoiceId(null);
        }
        // Clear draft invoice ID
        sessionStorage.removeItem('draftInvoiceId');
        localStorage.removeItem(DRAFT_KEY);
        
        // Close the preview modal
        setShowInvoicePreview(false);
        
        // Call onSubmit callback if provided
        if (onSubmit) {
          onSubmit(response.data);
        }
        
        // Navigate to invoices page
        if (onClose) {
          onClose();
        } else {
          navigate("/invoices");
        }
      } else {
        toast.error(response.message || (editingInvoiceId ? "Failed to update invoice" : "Failed to create invoice"));
      }
    } catch (error: any) {
      console.error("Failed to create/update invoice:", error);
      toast.error(error.message || (editingInvoiceId ? "Failed to update invoice. Please try again." : "Failed to create invoice. Please try again."));
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

  // Show loading state while loading invoice for editing
  if (isLoadingInvoice) {
    return (
      <div className="flex items-center justify-center py-8 h-full">
        <Loader2 className="h-6 w-6 animate-spin text-[#c53032]" />
        <span className="ml-2 text-gray-600">Loading invoice...</span>
      </div>
    );
  }

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
            <h2 className="text-white mb-0.5">{editingInvoiceId ? "Edit Invoice" : "Create New Invoice"}</h2>
            <p className="text-sm text-red-100">Step-by-step invoice generation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            className={
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
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            // When editing, all steps are clickable. When creating new, only completed/current steps are clickable
            const isClickable = editingInvoiceId ? true : (isCompleted || isCurrent);
            
            const handleStepClick = () => {
              if (!isClickable) return;
              
              // When editing, allow navigation to any step
              if (editingInvoiceId) {
                setCurrentStep(step.number);
                return;
              }
              
              // When creating new, only allow navigation to completed steps or current step
              if (isCompleted || isCurrent) {
                setCurrentStep(step.number);
              }
            };
            
            return (
              <div key={step.number} className="flex items-center flex-1">
                <button
                  onClick={handleStepClick}
                  disabled={!isClickable}
                  className={`flex items-center gap-3 transition-all ${
                    isClickable 
                      ? "cursor-pointer hover:opacity-80" 
                      : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isCurrent 
                      ? "bg-[#c53032] text-white shadow-sm"
                      : isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className={`text-xs mb-0.5 ${isCurrent ? "text-[#c53032]" : "text-slate-400"}`}>
                      Step {step.number}
                    </p>
                    <p className={`text-sm ${isCurrent ? "text-slate-900" : "text-slate-500"}`}>
                      {step.title}
                    </p>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-6 transition-colors ${isCompleted ? "bg-green-500" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
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
                            // Clear all form data for a fresh start
                            setSelectedCustomerId("");
                            setSelectedVehicleId("");
                            setVehicles([]);
                            setItems([]);
                            setCustomerSearchQuery("");
                            setCustomerSearchOpen(false);
                            // Reset other form fields
                            setDiscount(0);
                            setDiscountType("percent");
                            setNotes("");
                            // Clear draft from localStorage and sessionStorage
                            localStorage.removeItem('invoice_draft');
                            sessionStorage.removeItem('draftInvoiceId');
                            // Clear editing state if in edit mode
                            setEditingInvoiceId(null);
                            sessionStorage.removeItem('editingInvoiceId');
                            // Reset validation flag
                            vehicleValidatedRef.current = false;
                            // Mark as completed so no draft is saved on unmount
                            invoiceCompletedRef.current = true;
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
                      onValueChange={(vehicleId) => {
                        // Clear restoration flags since this is a manual selection
                        isRestoringDraftRef.current = false;
                        restorationCompleteRef.current = false;
                        draftVehicleIdRef.current = null;
                        // Reset items immediately when vehicle changes
                        setItems([]);
                        setSelectedVehicleId(vehicleId);
                        // Items will also be reset by the useEffect that watches selectedVehicleId
                      }}
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
                        const isOutOfStock = item.isInventoryItem && item.currentStock <= 0;
                        
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
                              max={item.isInventoryItem && item.maxStock ? item.maxStock : undefined}
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                let newQty = val === '' ? 0 : parseInt(val) || 0;
                                // Limit to available stock for inventory items
                                if (item.isInventoryItem && item.maxStock && newQty > item.maxStock) {
                                  newQty = item.maxStock;
                                  toast.error(`Maximum available stock is ${item.maxStock}`);
                                }
                                updateItem(item.id, 'quantity', newQty);
                              }}
                              onBlur={(e) => {
                                // Ensure minimum of 1 when leaving the field
                                if (!e.target.value || parseInt(e.target.value) < 1) {
                                  updateItem(item.id, 'quantity', 1);
                                }
                              }}
                              className="text-center"
                              placeholder="1"
                            />
                            {item.isInventoryItem && item.maxStock && (
                              <p className="text-xs text-slate-500 mt-1 text-center">
                                Max: {item.maxStock}
                              </p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500 mb-2">Price (₨)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price || ''}
                              onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                              className="text-right"
                              placeholder="0"
                              disabled={!canEditPricing}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs text-gray-500 mb-2">Total</Label>
                            <div className="h-10 flex items-center justify-end font-medium">
                              <span className="text-xs font-normal mr-0.5">₨</span>
                              <span className="font-medium">{(item.price * (item.quantity || 1)).toLocaleString()}</span>
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
                            {discountAmount > 0 && (
                              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                                <span className="text-sm font-medium text-green-600">
                                  Discount {discountType === "percent" ? `(${discount}%)` : "(Fixed)"}:
                                </span>
                                <span className="text-sm font-semibold text-green-600">
                                  -<span className="text-xs font-normal mr-0.5">₨</span>
                                  {discountAmount.toLocaleString()}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-end py-1.5">
                              <span className="text-base font-semibold text-slate-800">Exclusive of tax</span>
                            </div>
                            {tax > 0 && (
                              <>
                                <div className="flex justify-between items-center py-2 border-t border-slate-200">
                                  <span className="text-sm font-medium text-slate-700">Tax ({Math.round(taxRate * 100)}%):</span>
                                  <span className="text-sm font-semibold text-slate-900">
                                    <span className="text-xs font-normal mr-0.5">₨</span>
                                    {tax.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-end py-1.5">
                                  <span className="text-base font-semibold text-slate-800">Inclusive of tax</span>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between items-center py-2 border-t border-slate-300">
                              <span className="text-base font-semibold text-slate-900">Total:</span>
                              <span className="text-lg font-bold text-[#c53032]">
                                <span className="text-sm font-normal mr-0.5">₨</span>
                                {total.toLocaleString()}
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
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      disabled={!canEditPricing}
                      className="no-spinner"
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
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-sm mb-2">Terms & Conditions (Optional)</Label>
                <Textarea
                  placeholder="Leave blank to use default terms..."
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Default: {DEFAULT_TERMS.substring(0, 60)}...
                </p>
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
                    type="button"
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-70"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleShowInvoicePreview();
                    }}
                    disabled={isCreatingInvoice}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Preview Invoice
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEmailInvoice();
                      }}
                      disabled={!selectedCustomer?.email || isCreatingInvoice}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email Invoice
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isGeneratingPdf && !isCreatingInvoice) {
                          handleWhatsAppInvoice();
                        }
                      }}
                      disabled={!selectedCustomer?.phone || isGeneratingPdf || isCreatingInvoice}
                    >
                      {(isGeneratingPdf && !isCreatingInvoice) ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          WhatsApp Invoice
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm mb-2">Invoice Status</Label>
                <Select value={invoiceStatus} onValueChange={(v: "Unpaid" | "Paid") => setInvoiceStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                type="button"
                className="bg-[#c53032] hover:bg-[#a6212a] text-white shadow-md px-8 py-6 text-base font-semibold min-w-[200px]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleCompleteInvoice();
                }}
                disabled={isGeneratingPdf || isCreatingInvoice}
              >
                {(isGeneratingPdf || isCreatingInvoice) ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {isCreatingInvoice ? 'Creating...' : 'Generating...'}
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
                  const isOutOfStock = product.isInventoryItem && product.currentStock <= 0;
                  
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
      <Dialog open={showAddVehicle} onOpenChange={(open) => {
        if (!open) {
          setNewVehicleForm({
            make: "",
            model: "",
            year: new Date().getFullYear().toString(),
            plateNo: "",
          });
        }
        setShowAddVehicle(open);
      }}>
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
                <Label className="text-sm mb-2">Make *</Label>
                <Input 
                  placeholder="Toyota" 
                  value={newVehicleForm.make}
                  onChange={(e) => setNewVehicleForm(prev => ({ ...prev, make: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm mb-2">Model *</Label>
                <Input 
                  placeholder="Corolla" 
                  value={newVehicleForm.model}
                  onChange={(e) => setNewVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm mb-2">Year</Label>
                <Input 
                  placeholder="2024" 
                  value={newVehicleForm.year}
                  onChange={(e) => setNewVehicleForm(prev => ({ ...prev, year: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm mb-2">License Plate *</Label>
                <Input 
                  placeholder="ABC-1234" 
                  value={newVehicleForm.plateNo}
                  onChange={(e) => setNewVehicleForm(prev => ({ ...prev, plateNo: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 border-slate-300" 
                onClick={() => setShowAddVehicle(false)}
                disabled={savingVehicle}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-[#c53032] hover:bg-[#a6212a] shadow-sm" 
                onClick={handleSaveNewVehicle}
                disabled={savingVehicle}
              >
                {savingVehicle ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Vehicle"
                )}
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
            issueDate: new Date().toISOString(),
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
            discountType: discountType,
            discountPercent: discountType === "percent" ? discount : undefined,
            notes: notes,
            terms: terms,
          }}
          businessProfile={businessProfile}
        />
      )}
    </div>
  );
}
