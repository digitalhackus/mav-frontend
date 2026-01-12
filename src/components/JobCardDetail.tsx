import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Checkbox } from "./ui/checkbox";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { customersAPI, vehiclesAPI, invoicesAPI, jobsAPI, commentsAPI, catalogAPI, inventoryAPI, settingsAPI } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { connectSocket, onCommentAdded } from "../lib/socket";
import { formatCustomerId, formatVehicleId, formatJobId, formatInvoiceId } from "../utils/idFormatter";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
import { AddCustomer } from "./AddCustomer";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { MultiSelect } from "./ui/multi-select";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  User,
  Car,
  Wrench,
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  Image as ImageIcon,
  Check,
  X,
  Send,
  Edit2,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  FileText,
  Download,
  Trash2,
  Users,
  Receipt,
  Shield,
  Settings,
  CircleDot,
  Upload,
  Plus,
  ChevronsUpDown,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface JobCardDetailProps {
  jobCard?: any;
  onClose?: () => void;
  onSave?: (data: any) => void;
  onDelete?: (jobId: string) => void;
  userRole?: "Admin" | "Supervisor" | "Technician";
}

// Removed mock data - now using real data from API

const mockTechnicians = [
  { id: "TECH-001", name: "Mike Thompson", initials: "MT", role: "Technician" },
  { id: "TECH-002", name: "Chris Rodriguez", initials: "CR", role: "Technician" },
  { id: "TECH-003", name: "David Lee", initials: "DL", role: "Technician" },
  { id: "TECH-004", name: "Alex Khan", initials: "AK", role: "Technician" },
];

const mockSupervisors = [
  { id: "SUP-001", name: "Robert Anderson", initials: "RA", role: "Supervisor" },
  { id: "SUP-002", name: "Jennifer Martinez", initials: "JM", role: "Supervisor" },
];

const mockServices = [
  { id: "1", name: "Oil Change", estimatedCost: 3500, estimatedTime: "30 min" },
  { id: "2", name: "Brake Inspection", estimatedCost: 2500, estimatedTime: "45 min" },
  { id: "3", name: "Tire Rotation", estimatedCost: 2000, estimatedTime: "30 min" },
  { id: "4", name: "Scanning", estimatedCost: 5000, estimatedTime: "2 hours" },
  { id: "5", name: "AC Service", estimatedCost: 4500, estimatedTime: "1.5 hours" },
  { id: "6", name: "Transmission Service", estimatedCost: 8000, estimatedTime: "3 hours" },
];

type OilDetailKey = "oilFilter" | "oilGrade" | "oilMake" | "customNote";

const OIL_DETAIL_KEYS: OilDetailKey[] = ["oilFilter", "oilGrade", "oilMake", "customNote"];

const legacyDetailKeyMap: Record<OilDetailKey, string[]> = {
  oilFilter: ["oilFilter", "filter"],
  oilGrade: ["oilGrade"],
  oilMake: ["oilMake"],
  customNote: ["customNote", "customField"],
};

const parseEstimatedTimeToMinutes = (time?: string) => {
  if (!time) return 0;
  const normalized = time.toString().toLowerCase();
  let minutes = 0;

  const hoursMatch = normalized.match(/([\d.]+)\s*(h|hour|hours)/);
  if (hoursMatch) {
    minutes += parseFloat(hoursMatch[1]) * 60;
  }

  const minutesMatch = normalized.match(/([\d.]+)\s*(m|min|minutes?)/);
  if (minutesMatch) {
    minutes += parseFloat(minutesMatch[1]);
  }

  if (!minutes) {
    const numeric = parseFloat(normalized);
    if (!Number.isNaN(numeric)) {
      minutes = numeric;
    }
  }

  return Number.isFinite(minutes) ? minutes : 0;
};

// Helper function to format minutes to display string (e.g., "30 min", "1 hour 30 min")
const formatDurationFromMinutes = (minutes: number): string => {
  if (!minutes || minutes === 0) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${mins} min${mins > 1 ? 's' : ''}`;
  }
};

// Helper function to check if a string is a valid MongoDB ObjectId
const isValidObjectId = (id: any): boolean => {
  if (!id || typeof id !== 'string') return false;
  // MongoDB ObjectId is 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(id);
};

const normalizeServiceDetails = (service: any) => {
  if (!service) return service;

  const {
    filter,
    oilGrade,
    oilMake,
    customField,
    ...rest
  } = service;

  const normalizedDetails: Record<string, string> = { ...(service.details || {}) };

  const legacyValues: Record<OilDetailKey, any> = {
    oilFilter: filter,
    oilGrade,
    oilMake,
    customNote: customField,
  };

  OIL_DETAIL_KEYS.forEach((key) => {
    const existing = normalizedDetails[key];
    if (existing && existing.toString().trim()) {
      normalizedDetails[key] = existing.toString().trim();
      return;
    }

    const legacyValue = legacyValues[key] ?? legacyDetailKeyMap[key]
      .map((alias) => (alias === key ? undefined : normalizedDetails[alias] ?? rest[alias]))
      .find((val) => val && val.toString().trim());

    if (legacyValue && legacyValue.toString().trim()) {
      normalizedDetails[key] = legacyValue.toString().trim();
    } else {
      delete normalizedDetails[key];
    }
  });

  const normalizedPrice = Number(rest.price ?? rest.estimatedCost ?? 0);
  const normalizedDurationMinutes =
    rest.durationMinutes ?? parseEstimatedTimeToMinutes(rest.estimatedTime);

  // Validate serviceId - only set if it's a valid ObjectId, otherwise set to null
  let serviceId: string | null = null;
  const candidateServiceId = rest.serviceId || rest.catalogId;
  if (candidateServiceId) {
    const serviceIdStr = String(candidateServiceId);
    serviceId = isValidObjectId(serviceIdStr) ? serviceIdStr : null;
  }

  return {
    ...rest,
    estimatedCost: Number(rest.estimatedCost ?? normalizedPrice),
    price: normalizedPrice,
    durationMinutes: normalizedDurationMinutes,
    details: normalizedDetails,
    serviceId: serviceId,
    catalogId: rest.catalogId || null, // Keep catalogId as string for reference
    completed: rest.completed ?? false,
  };
};

const normalizeServices = (services: any[] = []) => services.map(normalizeServiceDetails);

const getOilDetailValue = (service: any, key: OilDetailKey) => {
  if (!service) return "";
  if (service.details && service.details[key]) {
    return service.details[key];
  }

  for (const alias of legacyDetailKeyMap[key]) {
    const value = service.details?.[alias] ?? service[alias];
    if (value && value.toString().trim()) {
      return value.toString().trim();
    }
  }
  return "";
};

const hasOilChangeDetails = (service: any) =>
  OIL_DETAIL_KEYS.some((key) => getOilDetailValue(service, key));

const buildOilDetailsPayload = (details: Record<OilDetailKey, string>) => {
  const payload: Record<string, string> = {};
  OIL_DETAIL_KEYS.forEach((key) => {
    const value = details[key]?.trim();
    if (value) {
      payload[key] = value;
    }
  });
  return payload;
};

const emptyOilDetails: Record<OilDetailKey, string> = {
  oilFilter: "",
  oilGrade: "",
  oilMake: "",
  customNote: "",
};

const extractOilDetails = (service: any) => {
  const details = {
    oilFilter: getOilDetailValue(service, "oilFilter"),
    oilGrade: getOilDetailValue(service, "oilGrade"),
    oilMake: getOilDetailValue(service, "oilMake"),
    customNote: getOilDetailValue(service, "customNote"),
  };
  const hasDetails = Object.values(details).some(
    (value) => value && value.toString().trim() !== ""
  );
  return { details, hasDetails };
};

const getServiceCostValue = (service: any) =>
  Number(service?.price ?? service?.estimatedCost ?? 0);

const formatCurrency = (value: number | undefined) => {
  const amount = Number.isFinite(value) ? Number(value) : 0;
  return `Rs ${amount.toLocaleString()}`;
};

const defaultComments = [
  {
    id: "1",
    author: "Mike Thompson",
    authorInitials: "MT",
    role: "Technician",
    text: "Vehicle received. Starting diagnostics on engine.",
    timestamp: "10:30 AM",
    date: "Nov 5, 2025",
    attachments: []
  },
  {
    id: "2",
    author: "Robert Anderson",
    authorInitials: "RA",
    role: "Supervisor",
    text: "Please also check the brake pads during inspection.",
    timestamp: "11:15 AM",
    date: "Nov 5, 2025",
    attachments: []
  },
  {
    id: "3",
    author: "Mike Thompson",
    authorInitials: "MT",
    role: "Technician",
    text: "Diagnostics complete. Found issue with oxygen sensor. Uploading photos.",
    timestamp: "2:45 PM",
    date: "Nov 5, 2025",
    attachments: [
      { id: "a1", name: "engine-sensor.jpg", type: "image" }
    ]
  }
];

export function JobCardDetail({ jobCard, onClose, onSave, onDelete, userRole = "Admin" }: JobCardDetailProps) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isNewJobCard = !jobCard;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(isNewJobCard); // New jobs start in edit mode, existing jobs start in view mode
  
  // Get initial values from URL params if present
  const urlCustomerId = searchParams.get('customerId') || '';
  const urlVehicleId = searchParams.get('vehicleId') || '';
  
  // localStorage key for draft job card
  const DRAFT_STORAGE_KEY = 'jobCardDraft';
  
  // Helper function to load draft from localStorage
  const loadDraft = () => {
    if (isNewJobCard) {
      try {
        const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (draft) {
          return JSON.parse(draft);
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
    return null;
  };
  
  // Helper function to save draft to localStorage
  const saveDraft = (draftData: any) => {
    if (isNewJobCard) {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }
  };
  
  // Helper function to clear draft from localStorage
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };
  
  // Load draft data on mount
  const draftData = loadDraft();
  
  // Form state
  const [jobId, setJobId] = useState(jobCard?._id || jobCard?.id || "");
  const [status, setStatus] = useState<string>(jobCard?.status || "PENDING");
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    urlCustomerId || draftData?.selectedCustomerId || jobCard?.customer?._id || jobCard?.customer?.id || jobCard?.customer || ""
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState(urlVehicleId || draftData?.selectedVehicleId || "");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(draftData?.selectedTechnicianId || jobCard?.technician || "");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(draftData?.selectedSupervisorId || jobCard?.supervisor || "");
  const [selectedServices, setSelectedServices] = useState<any[]>(() => {
    if (draftData?.selectedServices) {
      return normalizeServices(draftData.selectedServices);
    }
    return normalizeServices(jobCard?.services || []);
  });
  const [customService, setCustomService] = useState({ 
    name: "", 
    cost: "", 
    time: "",
    subServices: [] as Array<{ id: string; name: string; details: string; cost?: string }>,
    serviceDetails: [] as Array<{ 
      id: string; 
      key: string; 
      label: string; 
      type: 'text' | 'select' | 'multiselect'; 
      options: string[] 
    }>
  });
  const [showCustomService, setShowCustomService] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [vehicleSearchOpen, setVehicleSearchOpen] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", phone: "", email: "" });
  const [newCustomerErrors, setNewCustomerErrors] = useState<Record<string, string>>({});
  const [newVehicleForm, setNewVehicleForm] = useState({
    customerId: jobCard?.customerId || "",
    make: "",
    model: "",
    year: "",
    plate: "",
  });
  const [newVehicleErrors, setNewVehicleErrors] = useState<Record<string, string>>({});
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceCost, setEditingServiceCost] = useState<string>("");
  const [editingServiceTime, setEditingServiceTime] = useState<string>("");
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [notes, setNotes] = useState<string>(draftData?.notes || jobCard?.notes || "");
  
  // Oil Change details dialog state (legacy - kept for backward compatibility)
  const [showOilChangeDialog, setShowOilChangeDialog] = useState(false);
  const [pendingOilChangeService, setPendingOilChangeService] = useState<any>(null);
  const [oilChangeDetails, setOilChangeDetails] = useState<Record<OilDetailKey, string>>({ ...emptyOilDetails });
  const [oilChangeDialogMode, setOilChangeDialogMode] = useState<"add" | "edit">("add");
  const [editingOilServiceId, setEditingOilServiceId] = useState<string | null>(null);
  
  // Generic service details dialog state (for sub-options, comments, parts)
  const [showServiceDetailsDialog, setShowServiceDetailsDialog] = useState(false);
  const [pendingServiceDetails, setPendingServiceDetails] = useState<any>(null);
  const [serviceDetailsMode, setServiceDetailsMode] = useState<"add" | "edit">("add");
  const [editingServiceDetailsId, setEditingServiceDetailsId] = useState<string | null>(null);
  const [serviceSubOptionValues, setServiceSubOptionValues] = useState<Record<string, string | string[]>>({});
  const [serviceComments, setServiceComments] = useState<string>("");
  const [servicePartsUsed, setServicePartsUsed] = useState<string[]>([]);
  const [catalogItemForService, setCatalogItemForService] = useState<any>(null);
  
  // Overall service comment
  const [overallServiceComment, setOverallServiceComment] = useState<string>(draftData?.overallServiceComment || jobCard?.overallServiceComment || "");
  const [showServiceCommentDialog, setShowServiceCommentDialog] = useState(false);
  
  // Comments/Activity Feed
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  
  // File uploads for job photos
  const [uploadedFiles, setUploadedFiles] = useState<any[]>(jobCard?.files || []);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [businessProfile, setBusinessProfile] = useState({
    name: "MOMENTUM AUTOWORKS",
    address: "",
    phone: "+92 300 1234567",
    email: "info@momentumauto.pk",
  });
  const [catalogServices, setCatalogServices] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<Record<string, any>>({}); // Map of inventoryItemId -> inventory item
  
  // Collapsible sections
  const [sectionsOpen, setSectionsOpen] = useState({
    customer: true,
    vehicle: true,
    staff: true,
    services: true,
    photos: true,
  });

  // Fetch customers on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch catalog services and inventory items on mount
  useEffect(() => {
    fetchCatalogServices();
    fetchInventoryItems();
  }, []);

  // Fetch business profile from settings
  useEffect(() => {
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
    fetchBusinessProfile();
  }, []);

  const fetchInventoryItems = async () => {
    try {
      const response = await inventoryAPI.getAll();
      if (response.success) {
        // Create a map of inventory items by ID for quick lookup
        const inventoryMap: Record<string, any> = {};
        response.data.forEach((item: any) => {
          inventoryMap[item._id] = item;
        });
        setInventoryItems(inventoryMap);
      }
    } catch (error) {
      console.error("Failed to fetch inventory items:", error);
    }
  };

  const fetchCatalogServices = async () => {
    try {
      const response = await catalogAPI.getAll();
      if (response.success) {
        // Map catalog data to the format expected by the component
        // IMPORTANT: This includes ALL services shown together:
        // 1. Past/default services (original services)
        // 2. Previously added custom services (by the current user)
        // 3. New custom services (just added)
        // All services are preserved and displayed together in alphabetical order
        const services = response.data
          .filter((item: any) => item.type === 'service' && item.isActive) // Only show active services
          .map((item: any) => ({
            _id: item._id || item.id,
            id: item._id || item.id,
            name: item.name,
            estimatedCost: item.basePrice || item.cost || 0,
            cost: item.basePrice || item.cost || 0,
            price: item.basePrice || item.cost || 0,
            estimatedTime: item.estimatedTime || '',
            durationMinutes: item.defaultDurationMinutes || 0,
            subOptions: item.subOptions || [],
            allowComments: item.allowComments || false,
            allowedParts: item.allowedParts || [],
            visibility: item.visibility || 'local', // 'default' or 'local'
            account: item.account || null, // User ID who owns this service
            inventoryItemId: item.inventoryItemId || null, // Link to inventory item
            consumeQuantityPerUse: item.consumeQuantityPerUse || 1, // Quantity to deduct per use
          }));
        setCatalogServices(services);
      }
    } catch (error) {
      console.error("Failed to fetch catalog services:", error);
      // Fallback to mockServices if catalog fetch fails
      setCatalogServices(mockServices);
    }
  };

  // Show notification when draft is restored
  useEffect(() => {
    if (isNewJobCard && draftData && (draftData.selectedCustomerId || draftData.selectedServices?.length > 0)) {
      toast.info("Draft restored from previous session", {
        description: "Your previous work has been restored. You can continue where you left off.",
        duration: 3000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Save draft to localStorage whenever form state changes (only for new job cards)
  useEffect(() => {
    if (isNewJobCard) {
      const draft = {
        selectedCustomerId,
        selectedVehicleId,
        selectedTechnicianId,
        selectedSupervisorId,
        selectedServices,
        notes,
        overallServiceComment,
        status,
      };
      saveDraft(draft);
    }
  }, [selectedCustomerId, selectedVehicleId, selectedTechnicianId, selectedSupervisorId, selectedServices, notes, overallServiceComment, status, isNewJobCard]);

  // Fetch vehicles when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      fetchVehicles(selectedCustomerId).then((fetchedVehicles) => {
        // If editing existing job, find the vehicle after vehicles are loaded
        if (jobCard?.vehicle && fetchedVehicles.length > 0) {
          const vehicle = jobCard.vehicle;
          const foundVehicle = fetchedVehicles.find((v: any) => 
            v.make === vehicle.make && 
            v.model === vehicle.model && 
            v.plateNo === vehicle.plateNo
          );
          if (foundVehicle) {
            setSelectedVehicleId(foundVehicle._id || foundVehicle.id);
          }
        } else if (isNewJobCard && draftData?.selectedVehicleId && fetchedVehicles.length > 0) {
          // Restore vehicle from draft if available (only for new job cards)
          const foundVehicle = fetchedVehicles.find((v: any) => 
            (v._id || v.id) === draftData.selectedVehicleId
          );
          if (foundVehicle && !selectedVehicleId) {
            setSelectedVehicleId(draftData.selectedVehicleId);
          }
        }
      });
    } else {
      setVehicles([]);
      setSelectedVehicleId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  // Initialize from jobCard if editing - reload when jobCard changes
  useEffect(() => {
    if (jobCard) {
      if (jobCard.customer) {
        const customerId = jobCard.customer._id || jobCard.customer.id || jobCard.customer;
        setSelectedCustomerId(customerId);
      }
      // Load services from backend - ensure they're properly formatted
      // CRITICAL: Always load services from jobCard, even if empty array
      if (jobCard.services && Array.isArray(jobCard.services) && jobCard.services.length > 0) {
        setSelectedServices(normalizeServices(jobCard.services));
      } else if (jobCard.services && Array.isArray(jobCard.services) && jobCard.services.length === 0) {
        // Explicitly handle empty array
        setSelectedServices([]);
      }
      // Set status
      if (jobCard.status) {
        setStatus(jobCard.status);
      }
      // Set technician
      if (jobCard.technician) {
        setSelectedTechnicianId(jobCard.technician);
      }
      // Set notes
      if (jobCard.notes) {
        setNotes(jobCard.notes);
      }
      // Fetch comments for this job
      if (jobCard._id || jobCard.id) {
        fetchComments(jobCard._id || jobCard.id);
      }
    } else {
      // Reset state when jobCard is cleared
      setSelectedServices([]);
      setStatus("PENDING");
      setNotes("");
    }
  }, [jobCard?._id, jobCard?.id]); // Reload when job ID changes (when switching between jobs)

  // Fetch comments from API
  const fetchComments = async (jobId: string) => {
    try {
      const response = await commentsAPI.getByJob(jobId);
      if (response.success && response.data) {
        // Format comments for display
        const formattedComments = response.data.map((comment: any) => ({
          id: comment._id || comment.id,
          author: comment.author,
          authorInitials: comment.authorInitials,
          role: comment.role,
          text: comment.text,
          timestamp: new Date(comment.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          date: new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          attachments: comment.attachments || []
        }));
        setComments(formattedComments);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    }
  };

  // Listen for real-time comment updates
  useEffect(() => {
    if (!isNewJobCard && (jobCard?._id || jobCard?.id)) {
      const jobId = jobCard._id || jobCard.id;
      const socket = connectSocket();
      const unsubscribe = onCommentAdded((newComment: any) => {
        // Only add comment if it belongs to this job
        if (newComment.job && (newComment.job._id === jobId || newComment.job === jobId)) {
          const commentId = newComment._id || newComment.id;
          // Check if comment already exists to prevent duplicates
          setComments(prev => {
            const exists = prev.some(c => (c.id === commentId) || (c._id === commentId));
            if (exists) return prev;
            
            const formattedComment = {
              id: commentId,
              author: newComment.author,
              authorInitials: newComment.authorInitials,
              role: newComment.role,
              text: newComment.text,
              timestamp: new Date(newComment.createdAt || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              date: new Date(newComment.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              attachments: newComment.attachments || []
            };
            return [...prev, formattedComment];
          });
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [jobCard, isNewJobCard]);

  const fetchCustomers = async (search?: string) => {
    try {
      setLoadingCustomers(true);
      const response = await customersAPI.getAll(search || undefined);
      if (response.success) {
        setCustomers(response.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch customers:", err);
      if (err.isAuthError && err.status === 401) {
        toast.error(err.message || "Session expired, please log in again");
        // Optionally redirect to login
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else if (!err.isAuthError) {
        // Only show non-auth errors to avoid spam
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
        return response.data;
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
      return [];
    } finally {
      setLoadingVehicles(false);
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

  // Fetch vehicles when vehicle search opens
  useEffect(() => {
    if (vehicleSearchOpen && selectedCustomerId && !vehicleSearchQuery) {
      fetchVehicles(selectedCustomerId);
    }
  }, [vehicleSearchOpen, selectedCustomerId]);

  // Debounce vehicle search query
  useEffect(() => {
    if (!vehicleSearchOpen) return;
    
    // Filter vehicles locally based on search query
    // Vehicles are already loaded for the selected customer
  }, [vehicleSearchQuery, vehicleSearchOpen]);

  const selectedCustomer = customers.find(c => (c._id || c.id) === selectedCustomerId);
  const customerVehicles = vehicles;
  const selectedVehicle = vehicles.find(v => (v._id || v.id) === selectedVehicleId);
  // Use customers directly since API handles search
  const filteredCustomers = customers;
  const filteredVehicles = customerVehicles.filter((vehicle) => {
    if (!vehicleSearchQuery.trim()) {
      return true;
    }
    const query = vehicleSearchQuery.toLowerCase();
    return (
      `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(query) ||
      vehicle.plateNo?.toLowerCase().includes(query) ||
      vehicle.year?.toString().includes(query)
    );
  });
  const selectedTechnician = mockTechnicians.find(t => t.id === selectedTechnicianId);
  const selectedSupervisor = mockSupervisors.find(s => s.id === selectedSupervisorId);

  const totalCost = selectedServices.reduce(
    (sum, service) => sum + getServiceCostValue(service),
    0
  );
  const completedTasks = selectedServices.filter(s => s.completed).length;
  const progress = selectedServices.length > 0 ? (completedTasks / selectedServices.length) * 100 : 0;

  // Calculate estimated time for display
  const estimatedTimeHours = selectedServices.length > 0
    ? selectedServices.reduce((sum, service) => {
        const minutes = service.durationMinutes ?? parseEstimatedTimeToMinutes(service.estimatedTime);
        return sum + minutes / 60;
      }, 0)
    : 0;

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

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSelectCustomer = (customerId: string) => {
    if (customerId === "add-customer") {
      setShowAddCustomerDialog(true);
      setCustomerSearchOpen(false);
      setCustomerSearchQuery("");
      return;
    }
    // Close dropdown immediately and clear search
    setCustomerSearchOpen(false);
    setCustomerSearchQuery("");
    // Set selected customer
    setSelectedCustomerId(customerId);
    setSelectedVehicleId("");
    setVehicleSearch("");
    setVehicleSearchQuery("");
    setVehicleSearchOpen(false);
    fetchVehicles(customerId);
  };

  const handleSelectVehicle = (vehicleId: string) => {
    if (vehicleId === "add-vehicle") {
      // Open Add Vehicle dialog with the currently selected customer pre-filled
      openAddVehicle(selectedCustomerId);
      setVehicleSearchOpen(false);
      setVehicleSearchQuery("");
      return;
    }
    // Close dropdown immediately and clear search
    setVehicleSearchOpen(false);
    setVehicleSearchQuery("");
    // Set selected vehicle
    setSelectedVehicleId(vehicleId);
  };

  const openAddCustomer = () => {
    setNewCustomerForm({ name: "", phone: "", email: "" });
    setNewCustomerErrors({});
    setShowAddCustomerDialog(true);
  };

  const openAddVehicle = (customerId?: string) => {
    setNewVehicleForm({
      customerId: customerId || selectedCustomerId || "",
      make: "",
      model: "",
      year: "",
      plate: "",
    });
    setNewVehicleErrors({});
    setShowAddVehicleDialog(true);
  };

  const handleCustomerDialogOpenChange = (open: boolean) => {
    setShowAddCustomerDialog(open);
    if (!open) {
      setNewCustomerErrors({});
      setNewCustomerForm({ name: "", phone: "", email: "" });
    }
  };

  const handleVehicleDialogOpenChange = (open: boolean) => {
    setShowAddVehicleDialog(open);
    if (!open) {
      setNewVehicleErrors({});
      setNewVehicleForm(prev => ({
        ...prev,
        make: "",
        model: "",
        year: "",
        plate: "",
        customerId: selectedCustomerId || prev.customerId || "",
      }));
    }
  };

  // Format phone number to Pakistani format
  const formatPakistaniPhone = (value: string): string => {
    // Auto-format phone number to Pakistani format: +92 3XX XXXXXXX
    let cleaned = value.replace(/\D/g, ''); // Remove all non-digits
    
    // If user types 0 at the start, convert to +92
    if (cleaned.startsWith('0') && cleaned.length > 1) {
      cleaned = '92' + cleaned.substring(1);
    }
    
    // If it doesn't start with 92, add it
    if (cleaned.length > 0 && !cleaned.startsWith('92')) {
      cleaned = '92' + cleaned;
    }
    
    // Limit to 12 digits (92 + 10 digits)
    if (cleaned.length > 12) {
      cleaned = cleaned.substring(0, 12);
    }
    
    let formatted = '';
    
    if (cleaned.length > 0) {
      formatted = '+92';
      
      if (cleaned.length > 2) {
        // Add space after +92
        formatted += ' ';
        // Add first 3 digits (mobile code)
        formatted += cleaned.substring(2, 5);
        
        if (cleaned.length > 5) {
          // Add space and remaining 7 digits
          formatted += ' ' + cleaned.substring(5, 12);
        }
      }
    }
    
    return formatted;
  };

  // Validate Pakistani phone number
  const validatePakistaniPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\s/g, '');
    // Check if it starts with +92 or 0, then has 10 digits
    if (cleaned.startsWith('+92')) {
      return /^\+92\s?3\d{2}\s?\d{7}$/.test(cleaned);
    } else if (cleaned.startsWith('0')) {
      return /^03\d{2}\s?\d{7}$/.test(cleaned);
    } else if (cleaned.startsWith('92')) {
      return /^923\d{2}\s?\d{7}$/.test(cleaned);
    }
    return false;
  };

  const updateNewCustomerForm = (field: keyof typeof newCustomerForm, value: string) => {
    // Auto-format phone number if it's the phone field
    const processedValue = field === 'phone' ? formatPakistaniPhone(value) : value;
    
    setNewCustomerForm(prev => ({ ...prev, [field]: processedValue }));
    if (newCustomerErrors[field]) {
      setNewCustomerErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateNewVehicleForm = (field: keyof typeof newVehicleForm, value: string) => {
    setNewVehicleForm(prev => ({ ...prev, [field]: value }));
    if (newVehicleErrors[field]) {
      setNewVehicleErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSaveNewCustomer = async (openVehicleAfterSave = false) => {
    const errors: Record<string, string> = {};

    if (!newCustomerForm.name.trim()) {
      errors.name = "Customer name is required";
    }
    if (!newCustomerForm.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!validatePakistaniPhone(newCustomerForm.phone.trim())) {
      errors.phone = "Invalid phone format. Use: +92 3XX XXXXXXX";
    }
    if (newCustomerForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerForm.email.trim())) {
      errors.email = "Invalid email format";
    }

    if (Object.keys(errors).length > 0) {
      setNewCustomerErrors(errors);
      return;
    }

    try {
      const response = await customersAPI.create({
      name: newCustomerForm.name.trim(),
      phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim() || undefined,
      });

      if (response.success && response.data) {
        const createdCustomer = response.data;
        const customerId = createdCustomer._id || createdCustomer.id;
        
        // Refresh customers list
        await fetchCustomers();
        
        handleSelectCustomer(customerId);
        setCustomerSearchQuery("");
        setCustomerSearchOpen(false);
        setShowAddCustomerDialog(false);
        setNewCustomerForm({ name: "", phone: "", email: "" });
        setNewCustomerErrors({});
        toast.success("Customer created successfully");

    if (openVehicleAfterSave) {
          openAddVehicle(customerId);
        }
      }
    } catch (err: any) {
      console.error("Failed to create customer:", err);
      if (err.isAuthError && err.status === 401) {
        toast.error(err.message || "Session expired, please log in again");
        // Optionally redirect to login
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else {
        toast.error(err.message || "Failed to create customer. Please try again.");
      }
    }
  };

  const handleSaveNewVehicle = async () => {
    const errors: Record<string, string> = {};

    if (!newVehicleForm.customerId.trim()) {
      errors.customerId = "Customer is required";
    }
    if (!newVehicleForm.make.trim()) {
      errors.make = "Make is required";
    }
    if (!newVehicleForm.model.trim()) {
      errors.model = "Model is required";
    }
    if (!newVehicleForm.plate.trim()) {
      errors.plate = "Plate number is required";
    }
    if (!newVehicleForm.year.trim()) {
      errors.year = "Year is required";
    }

    if (Object.keys(errors).length > 0) {
      setNewVehicleErrors(errors);
      return;
    }

    try {
      const response = await vehiclesAPI.create({
        customer: newVehicleForm.customerId.trim(),
      make: newVehicleForm.make.trim(),
      model: newVehicleForm.model.trim(),
        year: parseInt(newVehicleForm.year.trim()),
        plateNo: newVehicleForm.plate.trim(),
        mileage: 0,
        status: 'Active'
      });

      if (response.success && response.data) {
        const createdVehicle = response.data;
        const vehicleId = createdVehicle._id || createdVehicle.id;
        
        // Refresh vehicles list
        await fetchVehicles(newVehicleForm.customerId.trim());
        
        handleSelectCustomer(newVehicleForm.customerId.trim());
        setSelectedVehicleId(vehicleId);
        setVehicleSearch("");
        setVehicleSearchQuery("");
        setVehicleSearchOpen(false);
        setShowAddVehicleDialog(false);
    setNewVehicleForm(prev => ({
      ...prev,
      make: "",
      model: "",
      year: "",
      plate: "",
          customerId: newVehicleForm.customerId.trim(),
    }));
    setNewVehicleErrors({});
      }
    } catch (err: any) {
      console.error("Failed to create vehicle:", err);
      alert(err.message || "Failed to create vehicle");
    }
  };

  const openOilChangeDetailsDialog = (mode: "add" | "edit", service: any, serviceId?: string) => {
    setOilChangeDialogMode(mode);
    setPendingOilChangeService(service);
    setEditingOilServiceId(mode === "edit" ? serviceId || service.id : null);
    setOilChangeDetails(
      mode === "edit"
        ? {
            oilFilter: getOilDetailValue(service, "oilFilter"),
            oilGrade: getOilDetailValue(service, "oilGrade"),
            oilMake: getOilDetailValue(service, "oilMake"),
            customNote: getOilDetailValue(service, "customNote"),
          }
        : { ...emptyOilDetails }
    );
    setShowOilChangeDialog(true);
  };

  const handleAddInventoryItem = (inventoryItem: any) => {
    const alreadySelected = selectedServices.some(
      (selected) =>
        selected.inventoryItemId === inventoryItem._id ||
        (selected.name === inventoryItem.name && selected.isInventoryItem)
    );

    if (alreadySelected) {
      return;
    }

    // Create a service-like object from inventory item
    const newService = normalizeServiceDetails({
      id: `inventory-${Date.now()}`,
      name: inventoryItem.name,
      estimatedCost: inventoryItem.salePrice || 0,
      price: inventoryItem.salePrice || 0,
      estimatedTime: '',
      durationMinutes: 0,
      details: {},
      completed: false,
      isInventoryItem: true,
      inventoryItemId: inventoryItem._id,
      inventoryItem: inventoryItem, // Store full inventory item for reference
      sku: inventoryItem.sku,
      category: inventoryItem.category,
      unit: inventoryItem.unit,
    });
    
    setSelectedServices(normalizeServices([...selectedServices, newService]));
  };

  const handleAddService = (service: any) => {
    const alreadySelected = selectedServices.some(
      (selected) =>
        selected.catalogId === service.id ||
        selected.catalogId === service._id ||
        selected.id === service.id ||
        selected.name === service.name
    );

    if (alreadySelected) {
      return;
    }

    // Find the full catalog item to check for sub-options
    const catalogItem = catalogServices.find(
      (item: any) => (item._id || item.id) === (service._id || service.id)
    ) || service;

    // Check if service has sub-options, allows comments, or has allowed parts
    const hasSubOptions = catalogItem?.subOptions && catalogItem.subOptions.length > 0;
    const allowsComments = catalogItem?.allowComments;
    const hasAllowedParts = catalogItem?.allowedParts && catalogItem.allowedParts.length > 0;

    // If it's Oil Change (legacy support), use the old dialog
    if (service.name === "Oil Change" && !hasSubOptions && !allowsComments && !hasAllowedParts) {
      openOilChangeDetailsDialog("add", service);
      return;
    }

    // If service has sub-options, comments, or parts, show generic dialog
    if (hasSubOptions || allowsComments || hasAllowedParts) {
      openServiceDetailsDialog("add", service, catalogItem);
      return;
    }

    // For simple services without sub-options, add directly
    // Use basePrice from catalog if available, otherwise use cost
    const servicePrice = catalogItem?.basePrice ?? service.basePrice ?? service.cost ?? service.price ?? 0;
    // Use defaultDurationMinutes from catalog if available, otherwise parse estimatedTime
    const serviceDurationMinutes = catalogItem?.defaultDurationMinutes ?? service.defaultDurationMinutes ?? service.durationMinutes ?? parseEstimatedTimeToMinutes(service.estimatedTime);
    // Use estimatedTime from catalog for display
    const serviceEstimatedTime = (catalogItem?.estimatedTime ?? service.estimatedTime) || (serviceDurationMinutes ? formatDurationFromMinutes(serviceDurationMinutes) : "");
    
    const newService = normalizeServiceDetails({
      ...service,
      id: `service-${Date.now()}`,
      serviceId: service._id || service.id,
      catalogId: service._id || service.id,
      estimatedCost: servicePrice,
      price: servicePrice,
      estimatedTime: serviceEstimatedTime,
      durationMinutes: serviceDurationMinutes,
      details: {},
      completed: false,
    });
    setSelectedServices(normalizeServices([...selectedServices, newService]));
  };

  const handleConfirmOilChange = async () => {
    const detailsPayload = buildOilDetailsPayload(oilChangeDetails);

    if (oilChangeDialogMode === "edit" && editingOilServiceId) {
      const previousServices = selectedServices;
      const updatedServices = normalizeServices(
        selectedServices.map((service) =>
          service.id === editingOilServiceId
            ? { ...service, details: detailsPayload }
            : service
        )
      );
      setSelectedServices(updatedServices);

      if (!isNewJobCard && jobId) {
        try {
          await jobsAPI.update(jobId, { services: updatedServices });
          toast.success("Oil change details updated");
        } catch (error: any) {
          console.error("Failed to update oil change details:", error);
          setSelectedServices(previousServices);
          toast.error(error.message || "Failed to update oil change details");
          return;
        }
      }

      setShowOilChangeDialog(false);
      setPendingOilChangeService(null);
      setEditingOilServiceId(null);
      setOilChangeDetails({ ...emptyOilDetails });
      setOilChangeDialogMode("add");
      return;
    }

    if (!pendingOilChangeService) return;

    // Get catalog item to use basePrice and defaultDurationMinutes
    const catalogItemForOil = catalogServices.find(
      (item: any) => (item._id || item.id) === (pendingOilChangeService._id || pendingOilChangeService.id)
    ) || pendingOilChangeService;
    
    const oilServicePrice = catalogItemForOil?.basePrice ?? pendingOilChangeService.basePrice ?? pendingOilChangeService.cost ?? pendingOilChangeService.price ?? 0;
    const oilServiceDurationMinutes = catalogItemForOil?.defaultDurationMinutes ?? pendingOilChangeService.defaultDurationMinutes ?? pendingOilChangeService.durationMinutes ?? parseEstimatedTimeToMinutes(pendingOilChangeService.estimatedTime);
    const oilServiceEstimatedTime = (catalogItemForOil?.estimatedTime ?? pendingOilChangeService.estimatedTime) || (oilServiceDurationMinutes ? formatDurationFromMinutes(oilServiceDurationMinutes) : "");
    
    const newService = normalizeServiceDetails({
      ...pendingOilChangeService,
      id: `service-${Date.now()}`,
      serviceId: pendingOilChangeService._id || pendingOilChangeService.id,
      catalogId: pendingOilChangeService.id,
      estimatedCost: oilServicePrice,
      price: oilServicePrice,
      estimatedTime: oilServiceEstimatedTime,
      durationMinutes: oilServiceDurationMinutes,
      details: detailsPayload,
      completed: false,
    });
    setSelectedServices(normalizeServices([...selectedServices, newService]));
    setShowOilChangeDialog(false);
    setPendingOilChangeService(null);
    setEditingOilServiceId(null);
    setOilChangeDetails({ ...emptyOilDetails });
    setOilChangeDialogMode("add");
  };

  const handleOilChangeDialogOpenChange = (open: boolean) => {
    setShowOilChangeDialog(open);
    if (!open) {
      setPendingOilChangeService(null);
      setEditingOilServiceId(null);
      setOilChangeDetails({ ...emptyOilDetails });
      setOilChangeDialogMode("add");
    }
  };

  // Generic service details dialog handlers
  const openServiceDetailsDialog = (mode: "add" | "edit", service: any, catalogItem: any, serviceId?: string) => {
    setServiceDetailsMode(mode);
    setPendingServiceDetails(service);
    setEditingServiceDetailsId(mode === "edit" ? serviceId || service.id : null);
    setCatalogItemForService(catalogItem);
    
    if (mode === "edit") {
      setServiceSubOptionValues(service.subOptionValues || {});
      setServiceComments(service.comments || "");
      setServicePartsUsed(service.partsUsed || []);
    } else {
      setServiceSubOptionValues({});
      setServiceComments("");
      setServicePartsUsed([]);
    }
    
    setShowServiceDetailsDialog(true);
  };

  const handleConfirmServiceDetails = async () => {
    if (!pendingServiceDetails || !catalogItemForService) return;

    const serviceData: any = {
      subOptionValues: serviceSubOptionValues,
      comments: serviceComments,
      partsUsed: servicePartsUsed,
    };

    if (serviceDetailsMode === "edit" && editingServiceDetailsId) {
      const previousServices = selectedServices;
      const updatedServices = normalizeServices(
        selectedServices.map((service) =>
          service.id === editingServiceDetailsId
            ? { ...service, ...serviceData }
            : service
        )
      );
      setSelectedServices(updatedServices);

      if (!isNewJobCard && jobId) {
        try {
          await jobsAPI.update(jobId, { services: updatedServices });
          toast.success("Service details updated");
        } catch (error: any) {
          console.error("Failed to update service details:", error);
          setSelectedServices(previousServices);
          toast.error(error.message || "Failed to update service details");
          return;
        }
      }

      setShowServiceDetailsDialog(false);
      setPendingServiceDetails(null);
      setEditingServiceDetailsId(null);
      setServiceSubOptionValues({});
      setServiceComments("");
      setServicePartsUsed([]);
      setCatalogItemForService(null);
      setServiceDetailsMode("add");
      return;
    }

    // Add new service
    // Use catalog values for price and duration
    const servicePrice = catalogItemForService?.basePrice ?? pendingServiceDetails.basePrice ?? pendingServiceDetails.cost ?? pendingServiceDetails.price ?? 0;
    const serviceDurationMinutes = catalogItemForService?.defaultDurationMinutes ?? pendingServiceDetails.defaultDurationMinutes ?? pendingServiceDetails.durationMinutes ?? parseEstimatedTimeToMinutes(pendingServiceDetails.estimatedTime);
    const serviceEstimatedTime = (catalogItemForService?.estimatedTime ?? pendingServiceDetails.estimatedTime) || (serviceDurationMinutes ? formatDurationFromMinutes(serviceDurationMinutes) : "");
    
    const newService = normalizeServiceDetails({
      ...pendingServiceDetails,
      id: `service-${Date.now()}`,
      serviceId: pendingServiceDetails._id || pendingServiceDetails.id,
      catalogId: pendingServiceDetails.id,
      estimatedCost: servicePrice,
      price: servicePrice,
      estimatedTime: serviceEstimatedTime,
      durationMinutes: serviceDurationMinutes,
      details: {},
      completed: false,
      ...serviceData,
    });
    setSelectedServices(normalizeServices([...selectedServices, newService]));
    setShowServiceDetailsDialog(false);
    setPendingServiceDetails(null);
    setEditingServiceDetailsId(null);
    setServiceSubOptionValues({});
    setServiceComments("");
    setServicePartsUsed([]);
    setCatalogItemForService(null);
    setServiceDetailsMode("add");
  };

  const handleSaveServiceComment = async () => {
    if (!isNewJobCard && jobId) {
      try {
        await jobsAPI.update(jobId, { overallServiceComment: overallServiceComment });
        toast.success("Service comment saved");
      } catch (error: any) {
        console.error("Failed to save service comment:", error);
        toast.error(error.message || "Failed to save service comment");
        return;
      }
    }
    setShowServiceCommentDialog(false);
  };

  const handleAddCustomService = async () => {
    if (!customService.name || !customService.cost) {
      toast.error("Service name and cost are required");
      return;
    }
    
    const parsedCost = parseFloat(customService.cost);
    const durationMinutes = parseEstimatedTimeToMinutes(customService.time);
    
    try {
      // Prepare description with sub-services information
      let description = '';
      if (customService.subServices && customService.subServices.length > 0) {
        // Store sub-services as JSON in description for retrieval
        const subServicesData = customService.subServices
          .filter(sub => sub.name.trim() !== '') // Only include sub-services with names
          .map(sub => ({
            name: sub.name,
            details: sub.details,
            cost: sub.cost ? parseFloat(sub.cost) : undefined
          }));
        
        if (subServicesData.length > 0) {
          description = JSON.stringify({ subServices: subServicesData });
        }
      }
      
      // Prepare subOptions from serviceDetails (service details like oil type, filter type, etc.)
      const subOptions = (customService.serviceDetails || [])
        .filter(detail => detail.label.trim() !== '') // Only include details with labels
        .map(detail => ({
          key: detail.key,
          label: detail.label,
          type: detail.type,
          options: detail.options || []
        }));

      // Save custom service to catalog database
      const serviceData = {
        name: customService.name,
        type: 'service',
        description: description,
        cost: parsedCost,
        basePrice: parsedCost,
        defaultDurationMinutes: durationMinutes,
        estimatedTime: customService.time || '',
        visibility: 'local',
        subOptions: subOptions, // Service details/options saved here
        allowComments: false,
        allowedParts: []
      };

      const response = await catalogAPI.create(serviceData);
      
      if (response.success) {
        const catalogItem = response.data;
    const newService = normalizeServiceDetails({
          id: `service-${Date.now()}`,
          _id: catalogItem._id || catalogItem.id,
      name: customService.name,
      estimatedCost: parsedCost,
      price: parsedCost,
      estimatedTime: customService.time || "N/A",
          durationMinutes: durationMinutes,
          serviceId: catalogItem._id || catalogItem.id,
          catalogId: catalogItem._id || catalogItem.id,
      completed: false,
      details: {},
    });
    setSelectedServices(normalizeServices([...selectedServices, newService]));
        
        // Refresh catalog services list
        await fetchCatalogServices();
        
    setCustomService({ name: "", cost: "", time: "", subServices: [], serviceDetails: [] });
    setShowCustomService(false);
        toast.success("Custom service added to catalog");
      } else {
        throw new Error("Failed to save service to catalog");
      }
    } catch (error: any) {
      console.error("Failed to save custom service:", error);
      toast.error(error.message || "Failed to save custom service. Please try again.");
    }
  };

  const handleDeleteCustomService = async (service: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent service selection when clicking delete
    
    const serviceId = service._id || service.id;
    const serviceName = service.name;
    
    if (!confirm(`Are you sure you want to delete "${serviceName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await catalogAPI.delete(serviceId);
      if (response.success) {
        toast.success(`Custom service "${serviceName}" deleted successfully`);
        // Refresh catalog services list
        await fetchCatalogServices();
        // Close the service search dropdown
        setServiceSearchOpen(false);
        setServiceSearchQuery("");
      } else {
        throw new Error("Failed to delete service");
      }
    } catch (error: any) {
      console.error("Failed to delete custom service:", error);
      toast.error(error.message || "Failed to delete custom service. Please try again.");
    }
  };

  const toggleServiceComplete = async (serviceId: string) => {
    // Technicians can mark subtasks, Supervisors and Admins can do everything
    if (userRole === "Technician" || userRole === "Supervisor" || userRole === "Admin") {
      const previousServices = selectedServices;
      const updatedServices = normalizeServices(
        selectedServices.map(s => 
          s.id === serviceId ? { ...s, completed: !s.completed } : s
        )
      );
      setSelectedServices(updatedServices);
      
      // Auto-save to backend if not a new job card
      if (!isNewJobCard && jobId) {
        try {
          await jobsAPI.update(jobId, {
            services: updatedServices,
          });
          toast.success("Service status updated");
        } catch (error: any) {
          console.error("Failed to update service status:", error);
          // Revert on error
          setSelectedServices(previousServices);
          toast.error(error.message || "Failed to update service status");
        }
      }
    }
  };

  const handleRemoveService = (serviceId: string) => {
    if (userRole === "Admin" || userRole === "Supervisor") {
      setSelectedServices(normalizeServices(selectedServices.filter(s => s.id !== serviceId)));
      if (editingServiceId === serviceId) {
        cancelEditingServiceCost();
      }
    }
  };

  const startEditingServiceCost = (serviceId: string, currentCost: number) => {
    setEditingServiceId(serviceId);
    setEditingServiceCost((currentCost || 0).toString());
  };

  const cancelEditingServiceCost = () => {
    setEditingServiceId(null);
    setEditingServiceCost("");
    setEditingServiceTime("");
  };

  const saveEditingServiceCost = () => {
    if (!editingServiceId) return;

    const parsed = parseFloat(editingServiceCost);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Enter a valid price.");
      return;
    }

    setSelectedServices(normalizeServices(selectedServices.map(service =>
      service.id === editingServiceId
        ? { ...service, estimatedCost: parsed, price: parsed }
        : service
    )));
    setEditingServiceId(null);
    setEditingServiceCost("");
    setEditingServiceTime("");
  };

  const startEditingServiceTime = (serviceId: string, currentTime: string) => {
    setEditingServiceId(serviceId);
    setEditingServiceTime(currentTime || "");
  };

  const cancelEditingServiceTime = () => {
    setEditingServiceId(null);
    setEditingServiceTime("");
    setEditingServiceCost("");
  };

  const saveEditingServiceTime = () => {
    if (!editingServiceId) return;

    if (!editingServiceTime.trim()) {
      toast.error("Enter a valid time.");
      return;
    }

    const durationMinutes = parseEstimatedTimeToMinutes(editingServiceTime);
    setSelectedServices(normalizeServices(selectedServices.map(service =>
      service.id === editingServiceId
        ? { 
            ...service, 
            estimatedTime: editingServiceTime,
            durationMinutes: durationMinutes
          }
        : service
    )));
    setEditingServiceId(null);
    setEditingServiceTime("");
    setEditingServiceCost("");
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    if (!jobCard?._id && !jobCard?.id) {
      alert("Cannot add comment to a new job. Please save the job first.");
      return;
    }

    const jobId = jobCard._id || jobCard.id;
    const currentUser = userRole === "Admin" ? "Admin User" : 
                       userRole === "Supervisor" ? selectedSupervisor?.name || "Supervisor User" : 
                       selectedTechnician?.name || "Technician User";
    
    const initials = userRole === "Admin" ? "AU" : 
                    userRole === "Supervisor" ? selectedSupervisor?.initials || "SU" : 
                    selectedTechnician?.initials || "TU";

    try {
      // Format attachments (for now, just store file names - file upload would need separate implementation)
      const attachments = commentAttachments.map((file) => ({
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        url: '' // File upload URL would be set here if file upload is implemented
      }));

      const commentData = {
        job: jobId,
        author: currentUser,
        authorInitials: initials,
        role: userRole,
        text: newComment.trim(),
        attachments: attachments
      };

      const response = await commentsAPI.create(commentData);

      if (response.success) {
        // Comment will be added via Socket.IO real-time update
        // But we can also add it optimistically to show immediately
        const commentId = response.data._id || response.data.id;
        setComments(prev => {
          // Check if comment already exists (from Socket.IO)
          const exists = prev.some(c => (c.id === commentId) || (c._id === commentId));
          if (exists) return prev;
          
          const newCommentObj = {
            id: commentId,
            author: response.data.author,
            authorInitials: response.data.authorInitials,
            role: response.data.role,
            text: response.data.text,
            timestamp: new Date(response.data.createdAt || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            date: new Date(response.data.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            attachments: response.data.attachments || []
          };
          return [...prev, newCommentObj];
        });
        setNewComment("");
        setCommentAttachments([]);
      } else {
        alert("Failed to add comment. Please try again.");
      }
    } catch (error: any) {
      console.error("Error adding comment:", error);
      alert(error.message || "Failed to add comment. Please try again.");
    }
  };

  const handleCommentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setCommentAttachments([...commentAttachments, ...Array.from(files)]);
    }
  };

  const handleJobPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedBy: userRole,
      uploadedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }));

    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const handleMarkComplete = async () => {
    if (userRole !== "Supervisor" && userRole !== "Admin") {
      return;
    }

    if (!selectedCustomer || !selectedCustomerId) {
      alert("Please select a customer before marking the job as complete.");
      return;
    }

    if (!selectedVehicle) {
      alert("Please select a vehicle before marking the job as complete.");
      return;
    }

    if (selectedServices.length === 0) {
      alert("Please add at least one service before marking the job as complete.");
      return;
    }

    if (!jobCard?._id && !jobCard?.id) {
      alert("Cannot mark a new job as complete. Please save the job first.");
      return;
    }

    try {
      const jobId = jobCard._id || jobCard.id;

      // 1. Update job status to COMPLETED - IMPORTANT: Persist all services data
      const jobUpdateData = {
        status: "COMPLETED",
        customer: selectedCustomerId,
        vehicle: {
          make: selectedVehicle.make,
          model: selectedVehicle.model,
          year: selectedVehicle.year,
          plateNo: selectedVehicle.plateNo
        },
        title: jobCard?.title || selectedServices[0]?.name || "Service Job",
        description: selectedServices.map(s => s.name).join(", ") || jobCard?.description || "",
        technician: selectedTechnicianId || undefined,
        amount: totalCost,
        services: selectedServices, // CRITICAL: Persist all services with their completion status
        notes: jobCard?.notes || undefined,
      };

      await jobsAPI.update(jobId, jobUpdateData);

      // 2. Create invoice automatically
      const invoiceItems = selectedServices.map(service => {
        // For inventory items, we need to create a catalog item reference or handle differently
        // For now, we'll create the invoice item with the inventory item info
        const item: any = {
        description: service.name || "Service",
        quantity: 1,
        price: Number(service.estimatedCost) || 0
        };
        
        // If it's an inventory item, we need to link it properly
        // For inventory items added directly, we'll need to create a temporary catalog link
        // or handle stock deduction differently in the backend
        if (service.isInventoryItem && service.inventoryItemId) {
          // Note: The backend will need to handle inventory items differently
          // For now, we'll include the inventory item ID in the description or as metadata
          item.inventoryItemId = service.inventoryItemId;
        } else if (service.serviceId || service.catalogId) {
          // For regular services, include the catalog item ID
          item.catalogItemId = service.serviceId || service.catalogId;
        }
        
        return item;
      });

      const invoiceData = {
        customer: selectedCustomerId,
        job: jobId,
        vehicle: {
          make: selectedVehicle.make || '',
          model: selectedVehicle.model || '',
          year: selectedVehicle.year || null,
          plateNo: selectedVehicle.plateNo || ''
        },
        items: invoiceItems,
        subtotal: totalCost,
        discount: 0,
        tax: 0,
        amount: totalCost,
        status: 'Paid', // Mark as paid when job is completed
        paymentMethod: 'Cash', // Default payment method
        technician: selectedTechnician ? (mockTechnicians.find(t => t.id === selectedTechnicianId)?.name || '') : undefined,
        supervisor: selectedSupervisor ? (mockSupervisors.find(s => s.id === selectedSupervisorId)?.name || '') : undefined,
        date: new Date().toISOString()
      };

      const invoiceResponse = await invoicesAPI.create(invoiceData);

      if (invoiceResponse.success) {
        setStatus("COMPLETED");
        // Update local services state to reflect completion
        setSelectedServices(selectedServices);
        alert(`Job marked as complete! Invoice ${invoiceResponse.data?.invoiceNumber || 'created'} has been generated and marked as paid.`);
        // Refresh the job data - include all persisted data
        if (onSave) {
          onSave({ 
            ...jobUpdateData, 
            _id: jobId,
            services: selectedServices, // Ensure services are included
            updatedAt: new Date().toISOString()
          });
        }
      } else {
        // Job was updated but invoice creation failed
        setStatus("COMPLETED");
        // Update local services state to reflect completion
        setSelectedServices(selectedServices);
        alert("Job marked as complete, but invoice creation failed. Please create invoice manually.");
        // Still save the job update
        if (onSave) {
          onSave({ 
            ...jobUpdateData, 
            _id: jobId,
            services: selectedServices,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (error: any) {
      console.error("Error marking job as complete:", error);
      alert(error.message || "Failed to mark job as complete. Please try again.");
    }
  };

  const handleGenerateInvoice = () => {
    if (userRole !== "Supervisor" && userRole !== "Admin") {
      return;
    }

    if (!selectedCustomer) {
      toast.error("Select a customer before generating an invoice.");
      return;
    }

    if (!selectedVehicle) {
      toast.error("Select a vehicle before generating an invoice.");
      return;
    }

    if (selectedServices.length === 0) {
      toast.error("Add at least one service to generate an invoice.");
      return;
    }

    // Open preview modal instead of directly downloading
    setShowInvoicePreview(true);
  };

  const handleCloseJob = () => {
    if (userRole === "Supervisor" || userRole === "Admin") {
      alert("Job closed successfully!");
      onClose?.();
    }
  };

  const handleSave = () => {
    if (!selectedCustomerId) {
      alert("Please select a customer");
      return;
    }

    if (!selectedVehicleId) {
      alert("Please select a vehicle");
      return;
    }

    if (!selectedVehicle) {
      alert("Please select a valid vehicle");
      return;
    }

    const servicesPayload = normalizeServices(selectedServices);
    setSelectedServices(servicesPayload);

    // Calculate total amount from services
    const totalAmount = servicesPayload.reduce(
      (sum, service) => sum + getServiceCostValue(service),
      0
    );

    // Parse estimated time from services
    let estimatedTimeHours: number | undefined;
    if (servicesPayload.length > 0) {
      const totalTimeMinutes = servicesPayload.reduce((sum, service) => {
        if (service.durationMinutes) {
          return sum + Number(service.durationMinutes);
        }
        return sum + parseEstimatedTimeToMinutes(service.estimatedTime);
      }, 0);
      const totalTime = totalTimeMinutes / 60;
      estimatedTimeHours = totalTime > 0 ? totalTime : undefined;
    }

    // Get title from first service or description
    const title = servicesPayload.length > 0 
      ? servicesPayload[0].name 
      : jobCard?.title || "Service Job";

    // Get description from services
    const description = servicesPayload.map(s => s.name).join(", ") || jobCard?.description || "";

    const jobCardData = {
      customer: selectedCustomerId,
      vehicle: {
        make: selectedVehicle.make,
        model: selectedVehicle.model,
        year: selectedVehicle.year,
        plateNo: selectedVehicle.plateNo
      },
      title: title,
      description: description,
      status: isNewJobCard ? "PENDING" : status, // New jobs always start as PENDING
      technician: selectedTechnicianId || undefined,
      estimatedTimeHours: estimatedTimeHours,
      amount: totalAmount,
      services: servicesPayload, // Persist services in all saves
      notes: notes || jobCard?.notes || undefined,
      overallServiceComment: overallServiceComment || undefined,
    };

    // Clear draft after successful save
    if (isNewJobCard) {
      clearDraft();
    }
    
    onSave?.(jobCardData);
    if (isEditMode && !isNewJobCard) {
      setIsEditMode(false); // Exit edit mode after saving
    } else if (isNewJobCard) {
      onClose?.(); // Close only for new job cards
    }
  };

  const canEdit = userRole === "Admin" || userRole === "Supervisor";
  const isCompleted = status === "COMPLETED";
  const isReadOnly = isCompleted; // Completed jobs are read-only
  const canEditWhenNotCompleted = canEdit && !isCompleted;
  // In view mode, fields are read-only unless in edit mode
  const isFieldEditable = isNewJobCard || (isEditMode && canEditWhenNotCompleted);
  const canComplete = (userRole === "Supervisor" || userRole === "Admin") && !isNewJobCard && !isCompleted;
  const canStartWork = (userRole === "Technician" || userRole === "Supervisor" || userRole === "Admin") && !isNewJobCard && status === "PENDING";
  
  // Handle starting work (transition to IN_PROGRESS)
  const handleStartWork = async () => {
    if (!jobCard?._id && !jobCard?.id) {
      alert("Cannot start work on a new job. Please save the job first.");
      return;
    }

    try {
      const jobId = jobCard._id || jobCard.id;
      const jobUpdateData = {
        status: "IN_PROGRESS",
        services: selectedServices, // Preserve services
      };

      await jobsAPI.update(jobId, jobUpdateData);
      setStatus("IN_PROGRESS");
      
      if (onSave) {
        onSave({ ...jobUpdateData, _id: jobId, status: "IN_PROGRESS" });
      }
    } catch (error: any) {
      console.error("Error starting work:", error);
      alert(error.message || "Failed to start work. Please try again.");
    }
  };
  const canAddComments = !isNewJobCard; // After creation
  const canDelete = (userRole === "Admin" || userRole === "Supervisor") && !isNewJobCard;

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobId) return;
    
    try {
      const response = await jobsAPI.delete(jobId);
      if (response.success) {
        setIsDeleteDialogOpen(false);
        if (onDelete) {
          onDelete(jobId);
        } else if (onClose) {
          onClose();
        }
      } else {
        alert(response.message || "Failed to delete job");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete job");
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
  };

  const canMarkSubtasks = !isNewJobCard && (userRole === "Technician" || userRole === "Supervisor" || userRole === "Admin");
  // When job is IN_PROGRESS, all authorized users can mark services complete without edit mode
  // Technicians can always mark services complete (even in view mode), Supervisors/Admins can mark when IN_PROGRESS or in edit mode
  const isInProgress = status === "IN_PROGRESS";
  const canMarkServicesComplete = canMarkSubtasks && (userRole === "Technician" || isInProgress || isFieldEditable);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-[#c53032]/10 text-[#a6212a] border-[#c53032]/30";
      case "Supervisor":
        return "bg-[#fde7e7] text-[#a6212a] border-[#f1999b]";
      case "Technician":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <>
      <div className="h-full overflow-hidden flex flex-col bg-slate-50">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b shrink-0 bg-[#c53032] text-white shadow-sm">
        <div className="flex items-center gap-3">
          {onClose && (
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#c53032] to-[#a6212a] flex items-center justify-center shadow-sm">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {isNewJobCard ? "Create Job Card" : `JOB-${jobId.toString().padStart(3, '0')}`}
            </h2>
            <p className="text-sm text-red-100">
              {isNewJobCard ? "Create a new service job card" : `Created ${jobCard?.createdAt ? new Date(jobCard.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "today"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            className={
              status === "PENDING" ? "bg-yellow-500/20 text-yellow-100 border-yellow-400/40" :
              status === "IN_PROGRESS" ? "bg-[#fde7e7] text-[#a6212a] border-[#f1999b]" :
              status === "COMPLETED" ? "bg-green-500/20 text-green-100 border-green-500/40" :
              "bg-blue-500/20 text-blue-100 border-blue-500/40"
            }
          >
            <CircleDot className="h-3 w-3 mr-1.5" />
            {status.replace(/_/g, ' ')}
          </Badge>
          {progress > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-white/25 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium">{Math.round(progress)}%</span>
            </div>
          )}
          {!isNewJobCard && !isEditMode && canEditWhenNotCompleted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Job Card
            </Button>
          )}
          {isEditMode && !isNewJobCard && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Reset to original jobCard data when canceling edit
                if (jobCard) {
                  // Reset services
                  if (jobCard.services && Array.isArray(jobCard.services)) {
                    setSelectedServices(normalizeServices(jobCard.services));
                  } else {
                    setSelectedServices([]);
                  }
                  // Reset other fields
                  if (jobCard.status) setStatus(jobCard.status);
                  if (jobCard.technician) setSelectedTechnicianId(jobCard.technician);
                  if (jobCard.supervisor) setSelectedSupervisorId(jobCard.supervisor);
                  if (jobCard.notes !== undefined) setNotes(jobCard.notes || "");
                  // Reset customer/vehicle if needed
                  if (jobCard.customer) {
                    const customerId = jobCard.customer._id || jobCard.customer.id || jobCard.customer;
                    setSelectedCustomerId(customerId);
                  }
                }
                setIsEditMode(false);
              }}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Split Panel */}
      <div className="flex-1 overflow-hidden flex">
        {/* LEFT SIDE - Job Summary */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-4 max-w-4xl">
            {/* Job Title Section */}
            <div>
              <Label className="text-xs text-slate-500 uppercase tracking-wider mb-2">Job Summary</Label>
              <Input
                value={selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} - ${selectedVehicle.plateNo}` : "Select vehicle to begin"}
                readOnly
                className="text-lg h-12 bg-white border-slate-200"
                placeholder="Job title will appear here"
              />
            </div>

            {/* Customer Section */}
            <Collapsible open={sectionsOpen.customer} onOpenChange={() => toggleSection("customer")}>
              <Card className="border-slate-200 shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#fde7e7] flex items-center justify-center">
                        <User className="h-5 w-5 text-[#c53032]" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm mb-0.5">Customer</h3>
                        {selectedCustomer && (
                          <p className="text-xs text-slate-500">{selectedCustomer.name}</p>
                        )}
                      </div>
                    </div>
                    {sectionsOpen.customer ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-4 space-y-4">
                    <div>
                      <Label className="text-xs text-slate-500 mb-2 block">Select Customer</Label>
                      {isFieldEditable ? (
                        <>
                          {!selectedCustomerId ? (
                            <Popover open={customerSearchOpen} onOpenChange={(open: boolean) => {
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
                              <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e: React.FocusEvent<HTMLInputElement>) => e.preventDefault()}>
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
                                        onSelect={() => handleSelectCustomer("add-customer")}
                                        className="cursor-pointer"
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        <span className="font-medium">Add Customer</span>
                                      </CommandItem>
                                      {customers.map((customer) => {
                                        const customerId = customer._id || customer.id;
                                        const isSelected = customerId === selectedCustomerId;
                                        return (
                                          <CommandItem
                                            key={customerId}
                                            value={`${customer.name} ${customer.phone} ${customer.email || ''} ${customerId}`}
                                            onSelect={() => handleSelectCustomer(customerId)}
                                            className="cursor-pointer"
                                          >
                                            <div className="flex flex-col flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium">{customer.name}</span>
                                                {isSelected && <Check className="h-4 w-4 text-[#c53032]" />}
                                              </div>
                                              <span className="text-xs text-gray-500">{customer.phone}</span>
                                              {customer.email && (
                                                <span className="text-xs text-gray-400">{customer.email}</span>
                                              )}
                                              <span className="text-xs text-gray-400 mt-0.5">ID: {formatCustomerId(customer)}</span>
                                            </div>
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-900">{selectedCustomer?.name}</p>
                                  <p className="text-xs text-slate-500 mt-1">{selectedCustomer?.phone}</p>
                                  {selectedCustomer?.email && (
                                    <p className="text-xs text-slate-500">{selectedCustomer.email}</p>
                                  )}
                                  {selectedVehicle && (
                                    <p className="text-xs text-slate-600 mt-2">
                                      <Car className="h-3 w-3 inline mr-1" />
                                      {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.plateNo})
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {selectedCustomer ? formatCustomerId(selectedCustomer) : ''}
                                  </Badge>
                                  {isFieldEditable && (
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
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                          {selectedCustomer ? (
                            <div>
                              <p className="text-sm font-medium text-slate-900">{selectedCustomer.name}</p>
                              <p className="text-xs text-slate-500 mt-1">{selectedCustomer.phone}</p>
                              {selectedCustomer.email && (
                                <p className="text-xs text-slate-500">{selectedCustomer.email}</p>
                              )}
                              {selectedVehicle && (
                                <p className="text-xs text-slate-600 mt-2">
                                  <Car className="h-3 w-3 inline mr-1" />
                                  {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.plateNo})
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">No customer selected</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Vehicle Section */}
            <Collapsible open={sectionsOpen.vehicle} onOpenChange={() => toggleSection("vehicle")}>
              <Card className="border-slate-200 shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Car className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm mb-0.5">Vehicle</h3>
                        {selectedVehicle && (
                          <p className="text-xs text-slate-500">
                            {selectedVehicle.make} {selectedVehicle.model} • {selectedVehicle.plateNo}
                          </p>
                        )}
                      </div>
                    </div>
                    {sectionsOpen.vehicle ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-4 space-y-4">
                    <div>
                      <Label className="text-xs text-slate-500 mb-2 block">Select Vehicle</Label>
                      {isFieldEditable ? (
                        <>
                          {!selectedVehicleId ? (
                            <Popover open={vehicleSearchOpen} onOpenChange={(open: boolean) => {
                              setVehicleSearchOpen(open);
                              if (!open) {
                                setVehicleSearchQuery("");
                              }
                            }}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={vehicleSearchOpen}
                                  className="w-full justify-between"
                                  disabled={!selectedCustomerId || loadingVehicles}
                                  onClick={() => {
                                    if (selectedCustomerId) {
                                      setVehicleSearchOpen(true);
                                    }
                                  }}
                                >
                                  {loadingVehicles ? (
                                    <span className="text-muted-foreground">Loading vehicles...</span>
                                  ) : !selectedCustomerId ? (
                                    <span className="text-muted-foreground">Select a customer first</span>
                                  ) : (
                                    <span className="text-muted-foreground">Search vehicle...</span>
                                  )}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e: React.FocusEvent<HTMLInputElement>) => e.preventDefault()}>
                                <Command shouldFilter={false}>
                                  <CommandInput 
                                    placeholder="Search make, model, plate or year..." 
                                    value={vehicleSearchQuery}
                                    onValueChange={setVehicleSearchQuery}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      {loadingVehicles ? (
                                        <div className="flex items-center justify-center gap-2 py-4">
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                          <span>Loading...</span>
                                        </div>
                                      ) : (
                                        <div className="py-4 text-center text-sm text-gray-500">
                                          No vehicles found
                                        </div>
                                      )}
                                    </CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="add-vehicle"
                                        onSelect={() => handleSelectVehicle("add-vehicle")}
                                        className="cursor-pointer"
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        <span className="font-medium">Add Vehicle</span>
                                      </CommandItem>
                                      {filteredVehicles.map((vehicle) => {
                                        const vehicleId = vehicle._id || vehicle.id;
                                        const isSelected = vehicleId === selectedVehicleId;
                                        return (
                                          <CommandItem
                                            key={vehicleId}
                                            value={`${vehicle.make} ${vehicle.model} ${vehicle.plateNo} ${vehicle.year || ''}`}
                                            onSelect={() => handleSelectVehicle(vehicleId)}
                                            className="cursor-pointer"
                                          >
                                            <div className="flex flex-col flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="font-medium">{vehicle.make} {vehicle.model}</span>
                                                {vehicle.year && <span className="text-xs text-gray-400">• {vehicle.year}</span>}
                                                {isSelected && <Check className="h-4 w-4 text-[#c53032]" />}
                                              </div>
                                              <span className="text-xs text-gray-500">{vehicle.plateNo}</span>
                                              <span className="text-xs text-gray-400 mt-0.5">ID: {formatVehicleId(vehicle)}</span>
                                            </div>
                                          </CommandItem>
                                        );
                                      })}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-900">
                                    {selectedVehicle?.make} {selectedVehicle?.model}
                                    {selectedVehicle?.year && ` • ${selectedVehicle.year}`}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">{selectedVehicle?.plateNo}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {selectedVehicle ? formatVehicleId(selectedVehicle) : ''}
                                  </Badge>
                                  {isFieldEditable && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        setSelectedVehicleId("");
                                        setVehicleSearchQuery("");
                                        setVehicleSearchOpen(false);
                                      }}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        selectedVehicle ? (
                          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-slate-500">Make & Model</p>
                                <p className="text-sm font-medium text-slate-900">
                                  {selectedVehicle.make} {selectedVehicle.model}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Year</p>
                                <p className="text-sm font-medium text-slate-900">{selectedVehicle.year}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-slate-500">License Plate</p>
                                <p className="text-sm font-medium text-slate-900">{selectedVehicle.plateNo}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">No vehicle selected</p>
                        )
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Service Items - Subtask Checklist */}
            <Collapsible open={sectionsOpen.services} onOpenChange={() => toggleSection("services")}>
              <Card className="border-slate-200 shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Wrench className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm mb-0.5">Service Items</h3>
                        <p className="text-xs text-slate-500">
                          {isNewJobCard
                            ? `${selectedServices.length} selected • ${formatCurrency(totalCost)}`
                            : `${completedTasks}/${selectedServices.length} completed • ${formatCurrency(totalCost)}`}
                        </p>
                      </div>
                    </div>
                    {sectionsOpen.services ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-4 space-y-3">
                    {/* Service Catalog - Only in edit mode */}
                    {isFieldEditable && (
                      <>
                        <div>
                          <Label className="text-xs text-slate-500 mb-2">Add Service</Label>
                          <Popover open={serviceSearchOpen} onOpenChange={(open: boolean) => {
                            setServiceSearchOpen(open);
                            if (!open) {
                              setServiceSearchQuery("");
                            }
                          }}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={serviceSearchOpen}
                                className="w-full justify-between"
                              >
                                <span className="text-muted-foreground">Search services...</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e: React.FocusEvent<HTMLInputElement>) => e.preventDefault()}>
                              <Command shouldFilter={false}>
                                <CommandInput 
                                  placeholder="Search services..." 
                                  value={serviceSearchQuery}
                                  onValueChange={setServiceSearchQuery}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    <div className="py-4 text-center text-sm text-gray-500">
                                      No services found
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup heading="Services">
                                    <CommandItem
                                      value="add-custom-service"
                                      onSelect={() => {
                                        setShowCustomService(true);
                                        setServiceSearchOpen(false);
                                        setServiceSearchQuery("");
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      <span className="font-medium">Add Custom Service</span>
                                    </CommandItem>
                                    {(catalogServices.length > 0 ? catalogServices : mockServices)
                                      .filter((service: any) => {
                                        if (!serviceSearchQuery) return true;
                                        const query = serviceSearchQuery.toLowerCase();
                                        const name = (service.name || "").toLowerCase();
                                        return name.includes(query);
                                      })
                                      .filter((service: any) => {
                                        // Filter out already selected services
                                        return !selectedServices.some(
                                (selected) =>
                                  selected.catalogId === (service._id || service.id) ||
                                  selected.id === (service._id || service.id) ||
                                  selected.name === service.name
                              );
                                      })
                                      .map((service: any) => {
                                        const serviceId = service._id || service.id;
                                        // Check if this is a custom service owned by the current user
                                        // Custom services have visibility: 'local'
                                        // Since backend only returns local items for current user, all 'local' services can be deleted
                                        const isCustomService = service.visibility === 'local';
                                        const canDelete = isCustomService; // All local services belong to current user
                              return (
                                          <CommandItem
                                            key={serviceId}
                                            value={`${service.name} ${service.estimatedTime || ''} ${formatCurrency(getServiceCostValue(service))}`}
                                            onSelect={() => {
                                              handleAddService(service);
                                              setServiceSearchOpen(false);
                                              setServiceSearchQuery("");
                                            }}
                                            className="cursor-pointer"
                                          >
                                            <div className="flex items-center justify-between w-full group">
                                              <div className="flex flex-col flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">{service.name}</span>
                                                  {isCustomService && (
                                                    <Badge variant="outline" className="text-xs h-5 px-1.5">
                                                      Custom
                                                    </Badge>
                                                  )}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                          {formatCurrency(getServiceCostValue(service))} • {service.estimatedTime || `${service.durationMinutes || 0} min`}
                                                </span>
                                                {/* Show inventory info if service is linked to inventory */}
                                                {service.inventoryItemId && inventoryItems[service.inventoryItemId] && (() => {
                                                  const invItem = inventoryItems[service.inventoryItemId];
                                                  const stock = invItem.currentStock || 0;
                                                  const minStock = invItem.minStock || 0;
                                                  const isLowStock = stock <= minStock;
                                                  const isOutOfStock = stock < 0;
                                                  const quantityToDeduct = service.consumeQuantityPerUse || 1;
                                                  
                                                  return (
                                                    <div className="mt-1 flex items-center gap-2">
                                                      <Package className="h-3 w-3 text-slate-400" />
                                                      <span className={`text-xs ${
                                                        isOutOfStock ? 'text-red-600 font-semibold' :
                                                        isLowStock ? 'text-orange-600' :
                                                        'text-slate-500'
                                                      }`}>
                                                        Stock: {stock} {invItem.unit || 'piece'}
                                                        {quantityToDeduct !== 1 && ` (uses ${quantityToDeduct})`}
                                                      </span>
                                                      {isLowStock && (
                                                        <Badge variant={isOutOfStock ? "destructive" : "outline"} className="text-xs h-4 px-1.5">
                                                          {isOutOfStock ? 'Out' : 'Low'}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                              {canDelete && (
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                  onClick={(e) => handleDeleteCustomService(service, e)}
                                                  title="Delete custom service"
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                              )}
                                    </div>
                                          </CommandItem>
                              );
                            })}
                                  </CommandGroup>
                                  {/* Inventory Items Section */}
                                  {Object.keys(inventoryItems).length > 0 && (
                                    <CommandGroup heading="Inventory Items">
                                      {Object.values(inventoryItems)
                                        .filter((item: any) => item.isActive)
                                        .filter((item: any) => {
                                          if (!serviceSearchQuery) return true;
                                          const query = serviceSearchQuery.toLowerCase();
                                          const name = (item.name || "").toLowerCase();
                                          const sku = (item.sku || "").toLowerCase();
                                          const category = (item.category || "").toLowerCase();
                                          return name.includes(query) || sku.includes(query) || category.includes(query);
                                        })
                                        .filter((item: any) => {
                                          // Filter out already selected inventory items
                                          return !selectedServices.some(
                                            (selected) =>
                                              selected.inventoryItemId === item._id ||
                                              (selected.name === item.name && selected.isInventoryItem)
                                          );
                                        })
                                        .map((item: any) => {
                                          const stock = item.currentStock || 0;
                                          const minStock = item.minStock || 0;
                                          const isLowStock = stock <= minStock;
                                          const isOutOfStock = stock < 0;
                                          
                                          return (
                                            <CommandItem
                                              key={item._id}
                                              value={`${item.name} ${item.sku || ''} ${item.category || ''}`}
                                              onSelect={() => {
                                                handleAddInventoryItem(item);
                                                setServiceSearchOpen(false);
                                                setServiceSearchQuery("");
                                              }}
                                              className="cursor-pointer"
                                            >
                                              <div className="flex items-center justify-between w-full group">
                                                <div className="flex flex-col flex-1 min-w-0">
                                                  <div className="flex items-center gap-2">
                                                    <Package className="h-3.5 w-3.5 text-blue-500" />
                                                    <span className="font-medium">{item.name}</span>
                                                    <Badge variant="outline" className="text-xs h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                                                      Inventory
                                                    </Badge>
                                                    {item.sku && (
                                                      <Badge variant="outline" className="text-xs h-5 px-1.5">
                                                        {item.sku}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-500">
                                                      {item.category && `${item.category} • `}
                                                      {formatCurrency(item.salePrice || 0)} • Stock: {stock} {item.unit || 'piece'}
                                                    </span>
                                                    {isLowStock && (
                                                      <Badge variant={isOutOfStock ? "destructive" : "outline"} className="text-xs h-4 px-1.5">
                                                        {isOutOfStock ? 'Out' : 'Low'}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </CommandItem>
                                          );
                                        })}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Custom Service Dialog */}
                        {showCustomService && (
                          <div className="p-3 border border-slate-200 rounded-lg space-y-2 mt-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">Add Custom Service</Label>
                          <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  setShowCustomService(false);
                                  setCustomService({ name: "", cost: "", time: "", subServices: [], serviceDetails: [] });
                                }}
                              >
                                <X className="h-4 w-4" />
                          </Button>
                            </div>
                            <Input
                              placeholder="Service name"
                              value={customService.name}
                              onChange={(e) => setCustomService({ ...customService, name: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                placeholder="Cost (Rs)"
                                value={customService.cost}
                                onChange={(e) => setCustomService({ ...customService, cost: e.target.value })}
                              />
                              <Input
                                placeholder="Time (e.g., 30 min)"
                                value={customService.time}
                                onChange={(e) => setCustomService({ ...customService, time: e.target.value })}
                              />
                            </div>
                            
                            {/* Service Details/Options Section */}
                            <div className="space-y-2 pt-2 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-slate-600">Service Details (e.g., Oil Type, Filter Type)</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    const newDetail = {
                                      id: `detail-${Date.now()}`,
                                      key: `detail_${Date.now()}`,
                                      label: "",
                                      type: 'text' as 'text' | 'select' | 'multiselect',
                                      options: [] as string[]
                                    };
                                    setCustomService({
                                      ...customService,
                                      serviceDetails: [...(customService.serviceDetails || []), newDetail]
                                    });
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Detail
                                </Button>
                              </div>
                              
                              {customService.serviceDetails && customService.serviceDetails.length > 0 && (
                                <div className="space-y-2">
                                  {customService.serviceDetails.map((detail, index) => (
                                    <div key={detail.id} className="p-2 bg-slate-50 rounded-md space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs text-slate-500">Detail {index + 1}</Label>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5"
                                          onClick={() => {
                                            setCustomService({
                                              ...customService,
                                              serviceDetails: customService.serviceDetails.filter(d => d.id !== detail.id)
                                            });
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <Input
                                        placeholder="Detail name (e.g., Oil Type, Filter Type)"
                                        value={detail.label}
                                        onChange={(e) => {
                                          const updated = customService.serviceDetails.map(d =>
                                            d.id === detail.id 
                                              ? { ...d, label: e.target.value, key: `detail_${e.target.value.toLowerCase().replace(/\s+/g, '_')}` } 
                                              : d
                                          );
                                          setCustomService({ ...customService, serviceDetails: updated });
                                        }}
                                        className="h-8 text-xs"
                                      />
                                      <Select
                                        value={detail.type}
                                        onValueChange={(value: 'text' | 'select' | 'multiselect') => {
                                          const updated = customService.serviceDetails.map(d =>
                                            d.id === detail.id 
                                              ? { ...d, type: value, options: value === 'text' ? [] : d.options } 
                                              : d
                                          );
                                          setCustomService({ ...customService, serviceDetails: updated });
                                        }}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="text">Text Input</SelectItem>
                                          <SelectItem value="select">Dropdown (Select One)</SelectItem>
                                          <SelectItem value="multiselect">Multi-Select</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      {(detail.type === 'select' || detail.type === 'multiselect') && (
                                        <Textarea
                                          placeholder="Options (one per line)&#10;e.g., 5W-30&#10;10W-40&#10;20W-50"
                                          value={detail.options.join('\n')}
                                          onChange={(e) => {
                                            const updated = customService.serviceDetails.map(d =>
                                              d.id === detail.id 
                                                ? { ...d, options: e.target.value.split('\n').filter(o => o.trim() !== '') } 
                                                : d
                                            );
                                            setCustomService({ ...customService, serviceDetails: updated });
                                          }}
                                          className="h-20 text-xs resize-none"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Sub-Services Section */}
                            <div className="space-y-2 pt-2 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-slate-600">Sub-Services (Optional)</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    const newSubService = {
                                      id: `sub-${Date.now()}`,
                                      name: "",
                                      details: "",
                                      cost: ""
                                    };
                                    setCustomService({
                                      ...customService,
                                      subServices: [...(customService.subServices || []), newSubService]
                                    });
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Sub-Service
                                </Button>
                              </div>
                              
                              {customService.subServices && customService.subServices.length > 0 && (
                                <div className="space-y-2">
                                  {customService.subServices.map((subService, index) => (
                                    <div key={subService.id} className="p-2 bg-slate-50 rounded-md space-y-2">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs text-slate-500">Sub-Service {index + 1}</Label>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5"
                                          onClick={() => {
                                            setCustomService({
                                              ...customService,
                                              subServices: customService.subServices.filter(s => s.id !== subService.id)
                                            });
                                          }}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <Input
                                        placeholder="Sub-service name"
                                        value={subService.name}
                                        onChange={(e) => {
                                          const updated = customService.subServices.map(s =>
                                            s.id === subService.id ? { ...s, name: e.target.value } : s
                                          );
                                          setCustomService({ ...customService, subServices: updated });
                                        }}
                                        className="h-8 text-xs"
                                      />
                                      <Textarea
                                        placeholder="Details/Description"
                                        value={subService.details}
                                        onChange={(e) => {
                                          const updated = customService.subServices.map(s =>
                                            s.id === subService.id ? { ...s, details: e.target.value } : s
                                          );
                                          setCustomService({ ...customService, subServices: updated });
                                        }}
                                        className="h-16 text-xs resize-none"
                                      />
                                      <Input
                                        type="number"
                                        placeholder="Cost (Rs) - Optional"
                                        value={subService.cost || ""}
                                        onChange={(e) => {
                                          const updated = customService.subServices.map(s =>
                                            s.id === subService.id ? { ...s, cost: e.target.value } : s
                                          );
                                          setCustomService({ ...customService, subServices: updated });
                                        }}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" onClick={handleAddCustomService} className="flex-1">
                                Add to Catalog
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                setShowCustomService(false);
                                setCustomService({ name: "", cost: "", time: "", subServices: [], serviceDetails: [] });
                              }} className="flex-1">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Selected services / Checklist */}
                    {selectedServices.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-slate-500 font-medium">
                            {isCompleted 
                              ? "Services Performed" 
                              : isNewJobCard 
                              ? "Selected Services" 
                              : "Service Checklist"}
                          </Label>
                          {!isCompleted && !isNewJobCard && (
                            <span className="text-xs text-slate-500">
                              {selectedServices.filter(s => s.completed).length}/{selectedServices.length} completed
                            </span>
                          )}
                          {isCompleted && (
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                {selectedServices.filter(s => s.completed).length} Performed
                              </span>
                              {selectedServices.filter(s => !s.completed).length > 0 && (
                                <span className="flex items-center gap-1">
                                  <X className="h-3.5 w-3.5 text-slate-400" />
                                  {selectedServices.filter(s => !s.completed).length} Skipped
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isCompleted ? (
                          // Read-only view for completed jobs
                          <div className="space-y-3">
                            {/* Services Performed */}
                            {selectedServices.filter(s => s.completed).length > 0 && (
                              <div>
                                <Label className="text-xs text-green-600 font-medium mb-2 block">
                                  ✓ Performed Services
                                </Label>
                                {selectedServices.filter(s => s.completed).map((service) => (
                                  <div
                                    key={service.id}
                                    className="p-3 border border-green-200 bg-green-50 rounded-lg mb-2"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                                          {service.isInventoryItem && (
                                            <Package className="h-4 w-4 text-blue-500" />
                                          )}
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                          <p className="text-sm font-medium text-slate-900">
                                            {service.name}
                                          </p>
                                              {service.isInventoryItem && (
                                                <Badge variant="outline" className="text-xs h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                                                  Inventory
                                                </Badge>
                                              )}
                                              {service.sku && (
                                                <Badge variant="outline" className="text-xs h-5 px-1.5">
                                                  {service.sku}
                                                </Badge>
                                              )}
                                            </div>
                                            {/* Show inventory info for inventory items */}
                                            {service.isInventoryItem && service.inventoryItem && (() => {
                                              const invItem = service.inventoryItem;
                                              const stock = invItem.currentStock || 0;
                                              const minStock = invItem.minStock || 0;
                                              const isLowStock = stock <= minStock;
                                              const isOutOfStock = stock < 0;
                                              
                                              return (
                                                <div className="mt-1 flex items-center gap-2">
                                                  <span className={`text-xs ${
                                                    isOutOfStock ? 'text-red-600 font-semibold' :
                                                    isLowStock ? 'text-orange-600' :
                                                    'text-slate-500'
                                                  }`}>
                                                    {invItem.category && `${invItem.category} • `}
                                                    Stock: {stock} {invItem.unit || 'piece'}
                                                  </span>
                                                  {isLowStock && (
                                                    <Badge variant={isOutOfStock ? "destructive" : "outline"} className="text-xs h-4 px-1.5">
                                                      {isOutOfStock ? 'Out' : 'Low'}
                                                    </Badge>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                            {/* Show inventory info if service is linked to inventory */}
                                            {!service.isInventoryItem && (() => {
                                              const catalogItem = catalogServices.find(
                                                (item: any) => (item._id || item.id) === (service.serviceId || service.catalogId)
                                              );
                                              if (catalogItem?.inventoryItemId && inventoryItems[catalogItem.inventoryItemId]) {
                                                const invItem = inventoryItems[catalogItem.inventoryItemId];
                                                const stock = invItem.currentStock || 0;
                                                const minStock = invItem.minStock || 0;
                                                const isLowStock = stock <= minStock;
                                                const isOutOfStock = stock < 0;
                                                const quantityToDeduct = catalogItem.consumeQuantityPerUse || 1;
                                                
                                                return (
                                                  <div className="mt-1 flex items-center gap-2">
                                                    <Package className="h-3 w-3 text-slate-400" />
                                                    <span className={`text-xs ${
                                                      isOutOfStock ? 'text-red-600 font-semibold' :
                                                      isLowStock ? 'text-orange-600' :
                                                      'text-slate-500'
                                                    }`}>
                                                      Stock: {stock} {invItem.unit || 'piece'}
                                                      {quantityToDeduct !== 1 && ` (uses ${quantityToDeduct})`}
                                                    </span>
                                                    {isLowStock && (
                                                      <Badge variant={isOutOfStock ? "destructive" : "outline"} className="text-xs h-4 px-1.5">
                                                        {isOutOfStock ? 'Out' : 'Low'}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 ml-6">
                                          <span>{formatCurrency(getServiceCostValue(service))}</span>
                                          {service.estimatedTime && (
                                            <>
                                              <span className="text-slate-400">•</span>
                                              <span>{service.estimatedTime}</span>
                                            </>
                                          )}
                                        </div>
                                        {/* Show service-specific details if available */}
                                        {(() => {
                                          const { details: oilDetails, hasDetails } = extractOilDetails(service);
                                          const hasSubOptions = service.subOptionValues && Object.keys(service.subOptionValues).length > 0;
                                          const hasComments = service.comments && service.comments.trim() !== '';
                                          const hasParts = service.partsUsed && service.partsUsed.length > 0;
                                          
                                          if (!hasDetails && !hasSubOptions && !hasComments && !hasParts) return null;
                                          
                                          return (
                                            <div className="mt-2 ml-6 p-2 bg-white rounded border border-green-100">
                                              <p className="text-xs text-slate-500 mb-1">Service Details:</p>
                                              {/* Oil Change details (legacy) */}
                                              {oilDetails.oilFilter && (
                                                <p className="text-xs text-slate-600">Filter: {oilDetails.oilFilter}</p>
                                              )}
                                              {oilDetails.oilGrade && (
                                                <p className="text-xs text-slate-600">Oil Grade: {oilDetails.oilGrade}</p>
                                              )}
                                              {oilDetails.oilMake && (
                                                <p className="text-xs text-slate-600">Oil Make: {oilDetails.oilMake}</p>
                                              )}
                                              {oilDetails.customNote && (
                                                <p className="text-xs text-slate-600">{oilDetails.customNote}</p>
                                              )}
                                              {/* Sub-options */}
                                              {hasSubOptions && Object.entries(service.subOptionValues || {}).map(([key, value]: [string, any]) => (
                                                <p key={key} className="text-xs text-slate-600">
                                                  {key}: {Array.isArray(value) ? value.join(', ') : String(value || '')}
                                                </p>
                                              ))}
                                              {/* Comments */}
                                              {hasComments && (
                                                <p className="text-xs text-slate-600 mt-1">
                                                  <span className="font-medium">Comments:</span> {service.comments}
                                                </p>
                                              )}
                                              {/* Parts Used */}
                                              {hasParts && (
                                                <p className="text-xs text-slate-600 mt-1">
                                                  <span className="font-medium">Parts Used:</span> {service.partsUsed.join(', ')}
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Services Skipped */}
                            {selectedServices.filter(s => !s.completed).length > 0 && (
                              <div>
                                <Label className="text-xs text-slate-500 font-medium mb-2 block">
                                  ⊘ Skipped Services
                                </Label>
                                {selectedServices.filter(s => !s.completed).map((service) => (
                                  <div
                                    key={service.id}
                                    className="p-3 border border-slate-200 bg-slate-50 rounded-lg mb-2 opacity-75"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <X className="h-4 w-4 text-slate-400" />
                                          <p className="text-sm font-medium text-slate-500 line-through">
                                            {service.name}
                                          </p>
                                        </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 ml-6">
                                    <span>{formatCurrency(getServiceCostValue(service))}</span>
                                          {service.estimatedTime && (
                                            <>
                                              <span className="text-slate-300">•</span>
                                              <span>{service.estimatedTime}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          // View/Edit mode for pending/in-progress jobs
                          selectedServices.map((service) => {
                            // Check if service should be clickable
                            const catalogItem = catalogServices.find(
                              (item: any) => (item._id || item.id) === (service.serviceId || service.catalogId)
                            );
                            const hasSubOptions = catalogItem?.subOptions && catalogItem.subOptions.length > 0;
                            const allowsComments = catalogItem?.allowComments;
                            const hasAllowedParts = catalogItem?.allowedParts && catalogItem.allowedParts.length > 0;
                            const isClickable = isFieldEditable && userRole !== "Technician" && (hasSubOptions || allowsComments || hasAllowedParts || service.name === "Oil Change");
                            
                            return (
                            <div
                              key={service.id}
                              className={`group p-3 border rounded-lg transition-all ${
                                !isNewJobCard && service.completed
                                  ? "border-green-200 bg-green-50"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              } ${isClickable ? "cursor-pointer hover:shadow-sm" : ""}`}
                              onClick={isClickable ? () => {
                                if (service.name === "Oil Change" && !catalogItem?.subOptions && !catalogItem?.allowComments && !catalogItem?.allowedParts) {
                                  openOilChangeDetailsDialog("edit", service, service.id);
                                } else {
                                  openServiceDetailsDialog("edit", service, catalogItem || service, service.id);
                                }
                              } : undefined}
                            >
                              <div className="flex items-start gap-3">
                                {!isNewJobCard && (
                                  <Checkbox
                                    checked={service.completed}
                                    onCheckedChange={() => toggleServiceComplete(service.id)}
                                    disabled={!canMarkServicesComplete}
                                    className="mt-0.5"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {!isNewJobCard && service.completed && (
                                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                    )}
                                    {service.isInventoryItem && (
                                      <Package className="h-4 w-4 text-blue-500 shrink-0" />
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                    <p className={`text-sm font-medium ${!isNewJobCard && service.completed ? "text-slate-500 line-through" : "text-slate-900"}`}>
                                      {service.name}
                                    </p>
                                        {service.isInventoryItem && (
                                          <Badge variant="outline" className="text-xs h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200">
                                            Inventory
                                          </Badge>
                                        )}
                                        {service.sku && (
                                          <Badge variant="outline" className="text-xs h-5 px-1.5">
                                            {service.sku}
                                          </Badge>
                                        )}
                                      </div>
                                      {/* Show inventory info for inventory items or services linked to inventory */}
                                      {service.isInventoryItem && service.inventoryItem && (() => {
                                        const invItem = service.inventoryItem;
                                        const stock = invItem.currentStock || 0;
                                        const minStock = invItem.minStock || 0;
                                        const isLowStock = stock <= minStock;
                                        const isOutOfStock = stock < 0;
                                        
                                        return (
                                          <div className="mt-1 flex items-center gap-2">
                                            <span className={`text-xs ${
                                              isOutOfStock ? 'text-red-600 font-semibold' :
                                              isLowStock ? 'text-orange-600' :
                                              'text-slate-500'
                                            }`}>
                                              {invItem.category && `${invItem.category} • `}
                                              Stock: {stock} {invItem.unit || 'piece'}
                                            </span>
                                            {isLowStock && (
                                              <Badge variant={isOutOfStock ? "destructive" : "outline"} className="text-xs h-4 px-1.5">
                                                {isOutOfStock ? 'Out' : 'Low'}
                                              </Badge>
                                            )}
                                          </div>
                                        );
                                      })()}
                                      {/* Show inventory info if service is linked to inventory */}
                                      {!service.isInventoryItem && (() => {
                                        const catalogItem = catalogServices.find(
                                          (item: any) => (item._id || item.id) === (service.serviceId || service.catalogId)
                                        );
                                        if (catalogItem?.inventoryItemId && inventoryItems[catalogItem.inventoryItemId]) {
                                          const invItem = inventoryItems[catalogItem.inventoryItemId];
                                          const stock = invItem.currentStock || 0;
                                          const minStock = invItem.minStock || 0;
                                          const isLowStock = stock <= minStock;
                                          const isOutOfStock = stock < 0;
                                          const quantityToDeduct = catalogItem.consumeQuantityPerUse || 1;
                                          
                                          return (
                                            <div className="mt-1 flex items-center gap-2">
                                              <Package className="h-3 w-3 text-slate-400" />
                                              <span className={`text-xs ${
                                                isOutOfStock ? 'text-red-600 font-semibold' :
                                                isLowStock ? 'text-orange-600' :
                                                'text-slate-500'
                                              }`}>
                                                Stock: {stock} {invItem.unit || 'piece'}
                                                {quantityToDeduct !== 1 && ` (uses ${quantityToDeduct})`}
                                              </span>
                                              {isLowStock && (
                                                <Badge variant={isOutOfStock ? "destructive" : "outline"} className="text-xs h-4 px-1.5">
                                                  {isOutOfStock ? 'Out' : 'Low'}
                                                </Badge>
                                              )}
                                            </div>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                    {/* Make service clickable if it has sub-options, allows comments, or has parts - show edit button or make entire service clickable */}
                                    {(() => {
                                      const catalogItem = catalogServices.find(
                                        (item: any) => (item._id || item.id) === (service.serviceId || service.catalogId)
                                      );
                                      const hasSubOptions = catalogItem?.subOptions && catalogItem.subOptions.length > 0;
                                      const allowsComments = catalogItem?.allowComments;
                                      const hasAllowedParts = catalogItem?.allowedParts && catalogItem.allowedParts.length > 0;
                                      const hasExistingData = service.subOptionValues || service.comments || service.partsUsed || hasOilChangeDetails(service);
                                      
                                      // Show edit button if service has configurable options or existing data
                                      if ((hasSubOptions || allowsComments || hasAllowedParts || hasExistingData) && isFieldEditable && userRole !== "Technician") {
                                        return (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-slate-500 hover:text-slate-700"
                                        onClick={() => {
                                          if (service.name === "Oil Change" && !catalogItem?.subOptions && !catalogItem?.allowComments && !catalogItem?.allowedParts) {
                                            openOilChangeDetailsDialog("edit", service, service.id);
                                          } else {
                                            openServiceDetailsDialog("edit", service, catalogItem || service, service.id);
                                          }
                                        }}
                                            title="Click to configure service details"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  {/* Edit Price */}
                                  {editingServiceId === service.id && editingServiceCost !== "" ? (
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      <Input
                                        value={editingServiceCost}
                                        onChange={(e) => setEditingServiceCost(e.target.value)}
                                        placeholder="Enter price"
                                        className="h-8 w-32"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                      />
                                      <Button size="sm" onClick={saveEditingServiceCost}>
                                        Save
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={cancelEditingServiceCost}>
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : editingServiceId === service.id && editingServiceTime !== "" ? (
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                      <Input
                                        value={editingServiceTime}
                                        onChange={(e) => setEditingServiceTime(e.target.value)}
                                        placeholder="Enter time (e.g., 30 min)"
                                        className="h-8 w-32"
                                      />
                                      <Button size="sm" onClick={saveEditingServiceTime}>
                                        Save
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={cancelEditingServiceTime}>
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                                      <span>{formatCurrency(getServiceCostValue(service))}</span>
                                      {service.estimatedTime && (
                                        <>
                                          <span className="text-slate-400">•</span>
                                          <span>{service.estimatedTime}</span>
                                        </>
                                      )}
                                      {isFieldEditable && userRole !== "Technician" && (
                                        <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-slate-500 hover:text-slate-700"
                                          onClick={() => startEditingServiceCost(service.id, getServiceCostValue(service))}
                                            title="Edit price"
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-slate-500 hover:text-slate-700"
                                            onClick={() => startEditingServiceTime(service.id, service.estimatedTime || "")}
                                            title="Edit time"
                                          >
                                            <Clock className="h-3.5 w-3.5" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                  {/* Show service details (sub-options, comments, parts) - values are job-specific, not permanent */}
                                  {(() => {
                                    const { details: oilDetails, hasDetails } = extractOilDetails(service);
                                    const hasSubOptions = service.subOptionValues && Object.keys(service.subOptionValues).length > 0;
                                    const hasComments = service.comments && service.comments.trim() !== '';
                                    const hasParts = service.partsUsed && service.partsUsed.length > 0;
                                    
                                    // Check if service has required details from catalog (even if not filled yet)
                                    const catalogItem = catalogServices.find(
                                      (item: any) => (item._id || item.id) === (service.serviceId || service.catalogId)
                                    );
                                    const hasRequiredDetails = catalogItem?.subOptions && catalogItem.subOptions.length > 0;
                                    
                                    if (!hasDetails && !hasSubOptions && !hasComments && !hasParts) {
                                      // Show placeholder if service requires details but none filled yet
                                      if (hasRequiredDetails) {
                                        return (
                                          <div className="mt-2 ml-6 p-2 bg-amber-50 rounded border border-amber-200">
                                            <p className="text-xs text-amber-600 font-medium">
                                              ⚠ Service details required - Click edit button to fill in
                                            </p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }
                                    
                                    return (
                                      <div className="mt-2 ml-6 p-2 bg-slate-50 rounded border border-slate-200">
                                        <p className="text-xs text-slate-500 mb-1 font-medium">Service Details:</p>
                                        {/* Oil Change details (legacy) */}
                                        {oilDetails.oilFilter && (
                                          <p className="text-xs text-slate-600">Filter: {oilDetails.oilFilter}</p>
                                        )}
                                        {oilDetails.oilGrade && (
                                          <p className="text-xs text-slate-600">Oil Grade: {oilDetails.oilGrade}</p>
                                        )}
                                        {oilDetails.oilMake && (
                                          <p className="text-xs text-slate-600">Oil Make: {oilDetails.oilMake}</p>
                                        )}
                                        {oilDetails.customNote && (
                                          <p className="text-xs text-slate-600">{oilDetails.customNote}</p>
                                        )}
                                        {/* Sub-options - Service details (e.g., Oil Type, Filter Type) - values are specific to this job */}
                                        {hasSubOptions && Object.entries(service.subOptionValues || {}).map(([key, value]: [string, any]) => {
                                          // Find the label from catalog if available
                                          const subOption = catalogItem?.subOptions?.find((opt: any) => opt.key === key);
                                          const label = subOption?.label || key;
                                          const displayValue = Array.isArray(value) ? value.join(', ') : String(value || '');
                                          return (
                                            <p key={key} className="text-xs text-slate-600">
                                              <span className="font-medium">{label}:</span> {displayValue}
                                            </p>
                                          );
                                        })}
                                        {/* Comments */}
                                        {hasComments && (
                                          <p className="text-xs text-slate-600 mt-1">
                                            <span className="font-medium">Comments:</span> {service.comments}
                                          </p>
                                        )}
                                        {/* Parts Used */}
                                        {hasParts && (
                                          <p className="text-xs text-slate-600 mt-1">
                                            <span className="font-medium">Parts Used:</span> {service.partsUsed.join(', ')}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                                {isFieldEditable && userRole !== "Technician" && (
                                  <button
                                    onClick={() => handleRemoveService(service.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                          })
                        )}
                      </div>
                    )}

                    {/* Total */}
                    {selectedServices.length > 0 && (
                      <div className="p-3 border border-[#f1999b] rounded-lg bg-[#fde7e7]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-700">Estimated Total</span>
                          <span className="text-lg font-medium text-[#c53032]">{formatCurrency(totalCost)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Assigned Staff Section */}
            <Collapsible open={sectionsOpen.staff} onOpenChange={() => toggleSection("staff")}>
              <Card className="border-slate-200 shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm mb-0.5">Assigned Staff</h3>
                        {(selectedTechnician || selectedSupervisor) && (
                          <p className="text-xs text-slate-500">
                            {selectedTechnician?.name}
                            {selectedTechnician && selectedSupervisor && " • "}
                            {selectedSupervisor?.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {sectionsOpen.staff ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-4 space-y-3">
                    <div>
                      <Label className="text-xs text-slate-500 mb-2">Assigned Technician</Label>
                      {isFieldEditable ? (
                        <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
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
                      ) : (
                        <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                          {selectedTechnician ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-green-600 text-white text-xs">
                                  {selectedTechnician.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs font-medium text-slate-900">{selectedTechnician.name}</p>
                                <p className="text-xs text-slate-500">Technician</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">No technician assigned</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-2">Supervisor</Label>
                      {isFieldEditable ? (
                        <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
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
                      ) : (
                        <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                          {selectedSupervisor ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-[#c53032] text-white text-xs">
                                  {selectedSupervisor.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs font-medium text-slate-900">{selectedSupervisor.name}</p>
                                <p className="text-xs text-slate-500">Supervisor</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">No supervisor assigned</p>
                          )}
                        </div>
                      )}
                    </div>
                    {(selectedTechnician || selectedSupervisor) && !isFieldEditable && (
                      <div className="flex gap-2">
                        {selectedTechnician && (
                          <div className="flex-1 p-3 border border-slate-200 rounded-lg bg-slate-50">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-green-600 text-white text-xs">
                                  {selectedTechnician.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs font-medium text-slate-900">{selectedTechnician.name}</p>
                                <p className="text-xs text-slate-500">Technician</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedSupervisor && (
                          <div className="flex-1 p-3 border border-slate-200 rounded-lg bg-slate-50">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-[#c53032] text-white text-xs">
                                  {selectedSupervisor.initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs font-medium text-slate-900">{selectedSupervisor.name}</p>
                                <p className="text-xs text-slate-500">Supervisor</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Job Photos Section - only relevant after job creation */}
            {/* Only show if there are photos uploaded OR if user can edit (to allow uploading) */}
            {!isNewJobCard && (uploadedFiles.length > 0 || isFieldEditable) && (
              <Collapsible open={sectionsOpen.photos} onOpenChange={() => toggleSection("photos")}>
                <Card className="border-slate-200 shadow-sm">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-pink-600" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm mb-0.5">Before/After Photos</h3>
                          <p className="text-xs text-slate-500">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded</p>
                        </div>
                      </div>
                      {sectionsOpen.photos ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Separator />
                    <div className="p-4 space-y-3">
                      {isFieldEditable && (
                        <div>
                          <label htmlFor="job-photo-upload" className="block">
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-[#c53032] hover:bg-[#fde7e7] transition-all cursor-pointer">
                              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm text-slate-600">Click to upload photos</p>
                              <p className="text-xs text-slate-400 mt-1">Before/After, damage, repair progress</p>
                            </div>
                            <input
                              id="job-photo-upload"
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={handleJobPhotoUpload}
                              disabled={!isFieldEditable}
                            />
                          </label>
                        </div>
                      )}
                      {!isFieldEditable && uploadedFiles.length === 0 && (
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                          <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">No photos uploaded</p>
                        </div>
                      )}

                      {uploadedFiles.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {uploadedFiles.map((file) => (
                            <div key={file.id} className="relative aspect-video border border-slate-200 rounded-lg overflow-hidden bg-slate-50 group">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-slate-400" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                <p className="text-xs text-white truncate">{file.name}</p>
                                <p className="text-xs text-white/70">{file.uploadedBy} • {file.uploadedAt}</p>
                              </div>
                              <button className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-all">
                                <Download className="h-3 w-3 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {isNewJobCard ? (
                // New Job Card: Only Save and Cancel buttons
                <>
                  <Button 
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 border-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    className="flex-1 bg-[#c53032] hover:bg-[#a6212a] text-white"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                // Existing Job Card: Show work flow buttons
                <>
                  {canStartWork && (
                    <Button 
                      onClick={handleStartWork}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Start Work
                    </Button>
                  )}
                  {canComplete && (
                    <Button 
                      onClick={handleMarkComplete}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                  {canEditWhenNotCompleted && (
                    <Button 
                      onClick={handleGenerateInvoice}
                      variant="outline"
                      className="flex-1 border-[#f1999b] text-[#c53032] hover:bg-[#fde7e7] disabled:opacity-60"
                      disabled={isGeneratingInvoice}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      {isGeneratingInvoice ? "Generating..." : "Generate Invoice"}
                    </Button>
                  )}
                  {canEditWhenNotCompleted && (
                    <Button 
                      onClick={handleCloseJob}
                      variant="outline"
                      className="border-slate-300"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Close Job
                    </Button>
                  )}
                  {isEditMode && !isNewJobCard && (
                    <Button 
                      onClick={() => {
                        handleSave();
                        setIsEditMode(false);
                      }}
                      className="flex-1 bg-[#c53032] hover:bg-[#a6212a] text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Job Summary (New Job) or Activity Timeline (Existing Job) */}
        {isNewJobCard ? (
          <div className="w-96 border-l border-slate-200 bg-white flex flex-col shadow-lg">
            {/* Job Summary Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                <h3 className="font-medium text-slate-900">Job Summary</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">Review job details before saving</p>
            </div>

            {/* Job Summary Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Customer Info */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-slate-500" />
                      <h4 className="text-sm font-medium text-slate-900">Customer</h4>
                    </div>
                    {selectedCustomer ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">{selectedCustomer.name}</p>
                        <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                        {selectedCustomer.email && (
                          <p className="text-xs text-slate-500">{selectedCustomer.email}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No customer selected</p>
                    )}
                  </CardContent>
                </Card>

                {/* Vehicle Info */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Car className="h-4 w-4 text-slate-500" />
                      <h4 className="text-sm font-medium text-slate-900">Vehicle</h4>
                    </div>
                    {selectedVehicle ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                          {selectedVehicle.make} {selectedVehicle.model}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <div>
                            <span className="text-slate-400">Year:</span> {selectedVehicle.year}
                          </div>
                          <div>
                            <span className="text-slate-400">Plate:</span> {selectedVehicle.plateNo}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No vehicle selected</p>
                    )}
                  </CardContent>
                </Card>

                {/* Services Summary */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench className="h-4 w-4 text-slate-500" />
                      <h4 className="text-sm font-medium text-slate-900">Services</h4>
                    </div>
                    {selectedServices.length > 0 ? (
                      <div className="space-y-2">
                        {selectedServices.map((service) => (
                          <div key={service.id} className="flex items-start justify-between p-2 bg-slate-50 rounded text-xs">
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{service.name}</p>
                              {service.estimatedTime && (
                                <p className="text-slate-500 mt-0.5">{service.estimatedTime}</p>
                              )}
                            </div>
                            <p className="font-medium text-[#c53032] ml-2">
                              {formatCurrency(getServiceCostValue(service))}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No services added</p>
                    )}
                  </CardContent>
                </Card>

                {/* Staff Info */}
                {(selectedTechnician || selectedSupervisor) && (
                  <Card className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-slate-500" />
                        <h4 className="text-sm font-medium text-slate-900">Assigned Staff</h4>
                      </div>
                      <div className="space-y-2">
                        {selectedTechnician && (
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-green-600 text-white text-xs">
                                {selectedTechnician.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium text-slate-900">{selectedTechnician.name}</p>
                              <p className="text-xs text-slate-500">Technician</p>
                            </div>
                          </div>
                        )}
                        {selectedSupervisor && (
                          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-[#c53032] text-white text-xs">
                                {selectedSupervisor.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium text-slate-900">{selectedSupervisor.name}</p>
                              <p className="text-xs text-slate-500">Supervisor</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Total Cost */}
                {selectedServices.length > 0 && (
                  <Card className="border-[#f1999b] bg-[#fde7e7]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">Estimated Total</span>
                        <span className="text-lg font-bold text-[#c53032]">{formatCurrency(totalCost)}</span>
                      </div>
                      {estimatedTimeHours > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
                          <Clock className="h-3 w-3" />
                          <span>Estimated Time: {estimatedTimeHours.toFixed(1)}h</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Status */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CircleDot className="h-4 w-4 text-slate-500" />
                      <h4 className="text-sm font-medium text-slate-900">Status</h4>
                    </div>
                    <Badge 
                      className={
                        status === "PENDING" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                        status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700 border-blue-300" :
                        "bg-green-100 text-green-700 border-green-300"
                      }
                    >
                      {status.replace(/_/g, ' ')}
                    </Badge>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="w-96 border-l border-slate-200 bg-white flex flex-col shadow-lg">
            {/* Timeline Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-600" />
                <h3 className="font-medium text-slate-900">
                  {isCompleted ? "Job Completion Details" : "Activity Timeline"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isCompleted 
                  ? `Completed ${jobCard?.updatedAt ? new Date(jobCard.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}`
                  : `${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Comments/Activity Feed */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Completion Summary for Completed Jobs */}
                {isCompleted && (
                  <>
                    {/* Status Timeline */}
                    <Card className="border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="h-4 w-4 text-slate-500" />
                          <h4 className="text-sm font-medium text-slate-900">Status Timeline</h4>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              <div className="w-px h-6 bg-slate-200 mt-1"></div>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-slate-900">PENDING</p>
                              <p className="text-xs text-slate-500">
                                {jobCard?.createdAt 
                                  ? new Date(jobCard.createdAt).toLocaleString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Date not available'}
                              </p>
                            </div>
                          </div>
                          {((status as string) === "IN_PROGRESS" || (status as string) === "COMPLETED") && (
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                {isCompleted && (
                                  <div className="w-px h-6 bg-slate-200 mt-1"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-slate-900">IN PROGRESS</p>
                                <p className="text-xs text-slate-500">
                                  {isCompleted 
                                    ? 'Work in progress'
                                    : 'In progress'}
                                </p>
                              </div>
                            </div>
                          )}
                          {status === "COMPLETED" && (
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-green-700">COMPLETED</p>
                                <p className="text-xs text-slate-500">
                                  {jobCard?.updatedAt 
                                    ? new Date(jobCard.updatedAt).toLocaleString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : 'Date not available'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Services Summary */}
                    {selectedServices.length > 0 && (
                      <Card className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Wrench className="h-4 w-4 text-slate-500" />
                            <h4 className="text-sm font-medium text-slate-900">Services Summary</h4>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">Total Services:</span>
                              <span className="font-medium text-slate-900">{selectedServices.length}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-green-600">Performed:</span>
                              <span className="font-medium text-green-700">
                                {selectedServices.filter(s => s.completed).length}
                              </span>
                            </div>
                            {selectedServices.filter(s => !s.completed).length > 0 && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Skipped:</span>
                                <span className="font-medium text-slate-500">
                                  {selectedServices.filter(s => !s.completed).length}
                                </span>
                              </div>
                            )}
                            <Separator className="my-2" />
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-900">Total Cost:</span>
                              <span className="text-sm font-bold text-[#c53032]">{formatCurrency(totalCost)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Notes Section */}
                    {(jobCard?.notes || notes) && (
                      <Card className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <h4 className="text-sm font-medium text-slate-900">Job Notes</h4>
                          </div>
                          <p className="text-xs text-slate-600 whitespace-pre-wrap">
                            {jobCard?.notes || 'No notes available'}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Technician Info */}
                    {selectedTechnician && (
                      <Card className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <User className="h-4 w-4 text-slate-500" />
                            <h4 className="text-sm font-medium text-slate-900">Assigned Technician</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-green-600 text-white text-xs">
                                {selectedTechnician?.initials || 'T'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {selectedTechnician?.name || jobCard?.technician || 'Not assigned'}
                              </p>
                              <p className="text-xs text-slate-500">Technician</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Used Parts Section - if available in notes or service details */}
                    {isCompleted && selectedServices.some(hasOilChangeDetails) && (
                      <Card className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="h-4 w-4 text-slate-500" />
                            <h4 className="text-sm font-medium text-slate-900">Parts & Materials Used</h4>
                          </div>
                          <div className="space-y-2">
                            {selectedServices
                              .filter(s => s.completed && hasOilChangeDetails(s))
                              .map((service) => (
                                <div key={service.id} className="p-2 bg-slate-50 rounded text-xs">
                                  <p className="font-medium text-slate-900 mb-1">{service.name}</p>
                                  {(() => {
                                    const { details: oilDetails, hasDetails } = extractOilDetails(service);
                                    if (!hasDetails) return null;
                                    return (
                                      <div className="space-y-0.5 text-slate-600">
                                        {oilDetails.oilFilter && <p>Filter: {oilDetails.oilFilter}</p>}
                                        {oilDetails.oilGrade && <p>Oil Grade: {oilDetails.oilGrade}</p>}
                                        {oilDetails.oilMake && <p>Oil Make: {oilDetails.oilMake}</p>}
                                        {oilDetails.customNote && <p>{oilDetails.customNote}</p>}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ))}
                            {selectedServices.filter(s => s.completed && hasOilChangeDetails(s)).length === 0 && (
                              <p className="text-xs text-slate-400 italic">No parts information recorded</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Separator />
                  </>
                )}
                <AnimatePresence>
                  {comments.map((comment, index) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative"
                    >
                      {/* Timeline Connector */}
                      {index < comments.length - 1 && (
                        <div className="absolute left-4 top-12 bottom-0 w-px bg-slate-200" />
                      )}
                      
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <Avatar className="w-8 h-8 shrink-0 ring-2 ring-white">
                          <AvatarFallback className={
                            comment.role === "Admin" ? "bg-purple-600 text-white" :
                            comment.role === "Supervisor" ? "bg-[#c53032] text-white" :
                            "bg-green-600 text-white"
                          }>
                            {comment.authorInitials}
                          </AvatarFallback>
                        </Avatar>

                        {/* Comment Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-slate-900">{comment.author}</p>
                            <Badge className={`text-xs ${getRoleBadgeColor(comment.role)}`}>
                              {comment.role}
                            </Badge>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-1">
                            <p className="text-sm text-slate-700 leading-relaxed">{comment.text}</p>
                          </div>
                          
                          {/* Attachments */}
                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {comment.attachments.map((attachment: any) => (
                                <div key={attachment.id} className="flex items-center gap-2 p-2 bg-[#fde7e7] border border-[#f1999b] rounded text-xs">
                                  {attachment.type === 'image' ? (
                                    <ImageIcon className="h-4 w-4 text-[#c53032]" />
                                  ) : (
                                    <Paperclip className="h-4 w-4 text-[#c53032]" />
                                  )}
                                  <span className="text-[#a6212a] flex-1 truncate">{attachment.name}</span>
                                  <Download className="h-3 w-3 text-[#c53032] cursor-pointer" />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Timestamp */}
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <p className="text-xs text-slate-500">{comment.date} at {comment.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Comment Input */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              {/* Attachment Preview */}
              {commentAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {commentAttachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-[#fde7e7] rounded text-xs">
                      <Paperclip className="h-3 w-3 text-[#c53032]" />
                      <span className="text-[#a6212a] max-w-[150px] truncate">{file.name}</span>
                      <button
                        type="button"
                        className="hover:text-[#89191d]"
                        onClick={() => setCommentAttachments(commentAttachments.filter((_, i) => i !== idx))}>
                        <X className="h-3 w-3 text-[#c53032]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="flex gap-2">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className={
                    userRole === "Admin" ? "bg-purple-600 text-white" :
                    userRole === "Supervisor" ? "bg-[#c53032] text-white" :
                    "bg-green-600 text-white"
                  }>
                    {userRole === "Admin" ? "AU" : userRole === "Supervisor" ? selectedSupervisor?.initials || "SU" : selectedTechnician?.initials || "TU"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] resize-none bg-white border-slate-200"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleAddComment();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <label htmlFor="comment-file-upload">
                      <input
                        id="comment-file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleCommentFileUpload}
                      />
                      <Button variant="ghost" size="sm" className="text-slate-600" type="button" asChild>
                        <span>
                          <Paperclip className="h-4 w-4" />
                        </span>
                      </Button>
                    </label>
                    <Button 
                      size="sm" 
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="bg-[#c53032] hover:bg-[#a6212a]"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Press Ctrl+Enter to send</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      <Dialog open={showAddCustomerDialog} onOpenChange={handleCustomerDialogOpenChange}>
        <DialogContent className="max-w-[95vw] p-0 bg-transparent border-0 shadow-none [&>button]:hidden" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Add New Customer</DialogTitle>
          <AddCustomer 
            onClose={() => {
              setShowAddCustomerDialog(false);
              setCustomerSearchQuery("");
              setCustomerSearchOpen(false);
            }}
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
                  const customerId = response.data._id || response.data.id;
                  handleSelectCustomer(customerId);
                  setShowAddCustomerDialog(false);
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
                  const customerId = response.data._id || response.data.id;
                  handleSelectCustomer(customerId);
                  setShowAddCustomerDialog(false);
                  await fetchCustomers();
                  // Open vehicle dialog
                  openAddVehicle(customerId);
                }
              } catch (err) {
                console.error("Failed to create customer:", err);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showAddVehicleDialog} onOpenChange={handleVehicleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
            <DialogDescription>
              Link a vehicle to any customer and continue building the job card.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Assign to Customer *</Label>
              {selectedCustomerId && newVehicleForm.customerId === selectedCustomerId ? (
                // If customer is already selected in job card, show it as read-only
                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md">
                  <User className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">
                    {customers.find(c => (c._id || c.id) === selectedCustomerId)?.name || 'Selected Customer'}
                  </span>
                  <span className="text-xs text-slate-500 ml-auto">(Auto-linked)</span>
                </div>
              ) : (
                // Allow customer selection if no customer is selected in job card
                <Select
                  value={newVehicleForm.customerId}
                  onValueChange={(value: string) => updateNewVehicleForm("customerId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => {
                      const customerId = customer._id || customer.id;
                      return (
                        <SelectItem key={customerId} value={customerId}>
                        {customer.name}
                      </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {newVehicleErrors.customerId && (
                <p className="text-xs text-red-600">{newVehicleErrors.customerId}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Make *</Label>
                <Input
                  value={newVehicleForm.make}
                  onChange={(e) => updateNewVehicleForm("make", e.target.value)}
                  placeholder="Toyota"
                />
                {newVehicleErrors.make && (
                  <p className="text-xs text-red-600">{newVehicleErrors.make}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Model *</Label>
                <Input
                  value={newVehicleForm.model}
                  onChange={(e) => updateNewVehicleForm("model", e.target.value)}
                  placeholder="Corolla"
                />
                {newVehicleErrors.model && (
                  <p className="text-xs text-red-600">{newVehicleErrors.model}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Year</Label>
                <Input
                  value={newVehicleForm.year}
                  onChange={(e) => updateNewVehicleForm("year", e.target.value)}
                  placeholder="2024"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">License Plate *</Label>
                <Input
                  value={newVehicleForm.plate}
                  onChange={(e) => updateNewVehicleForm("plate", e.target.value)}
                  placeholder="ABC-1234"
                />
                {newVehicleErrors.plate && (
                  <p className="text-xs text-red-600">{newVehicleErrors.plate}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleVehicleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveNewVehicle}
              className="bg-[#c53032] hover:bg-[#a6212a]"
            >
              Save Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Oil Change Details Dialog */}
      <Dialog open={showOilChangeDialog} onOpenChange={handleOilChangeDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {oilChangeDialogMode === "add" ? "Oil Change Service Details" : "Edit Oil Change Details"}
            </DialogTitle>
            <DialogDescription>
              {oilChangeDialogMode === "add"
                ? "Please provide the details for this oil change service"
                : "Update the recorded details for this oil change"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filter" className="text-xs text-slate-500">
                Filter
              </Label>
              <Input
                id="filter"
                placeholder="e.g., Standard, Premium, OEM"
                value={oilChangeDetails.oilFilter || ''}
                onChange={(e) => setOilChangeDetails({ ...oilChangeDetails, oilFilter: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oilGrade" className="text-xs text-slate-500">
                Oil Grade
              </Label>
              <Input
                id="oilGrade"
                placeholder="e.g., 5W-30, 10W-40, 0W-20"
                value={oilChangeDetails.oilGrade}
                onChange={(e) => setOilChangeDetails({ ...oilChangeDetails, oilGrade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oilMake" className="text-xs text-slate-500">
                Oil Make/Brand
              </Label>
              <Input
                id="oilMake"
                placeholder="e.g., Mobil 1, Castrol, Shell"
                value={oilChangeDetails.oilMake}
                onChange={(e) => setOilChangeDetails({ ...oilChangeDetails, oilMake: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customNote" className="text-xs text-slate-500">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="customNote"
                placeholder="Any additional information about this service..."
                value={oilChangeDetails.customNote}
                onChange={(e) => setOilChangeDetails({ ...oilChangeDetails, customNote: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOilChangeDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmOilChange}
              className="bg-[#c53032] hover:bg-[#a6212a]"
            >
              {oilChangeDialogMode === "add" ? "Add Service" : "Save Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generic Service Details Dialog (for sub-options, comments, parts) */}
      <Dialog open={showServiceDetailsDialog} onOpenChange={(open: boolean) => {
        setShowServiceDetailsDialog(open);
        if (!open) {
          setPendingServiceDetails(null);
          setEditingServiceDetailsId(null);
          setServiceSubOptionValues({});
          setServiceComments("");
          setServicePartsUsed([]);
          setCatalogItemForService(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {serviceDetailsMode === "add" ? `${pendingServiceDetails?.name || 'Service'} Details` : `Edit ${pendingServiceDetails?.name || 'Service'} Details`}
            </DialogTitle>
            <DialogDescription>
              {serviceDetailsMode === "add"
                ? "Please provide the details for this service"
                : "Update the recorded details for this service"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Sub-options */}
            {catalogItemForService?.subOptions && catalogItemForService.subOptions.length > 0 && (
              <div className="space-y-4">
                <Label className="text-sm font-semibold">Service Options</Label>
                {catalogItemForService.subOptions.map((subOption: any) => (
                  <div key={subOption.key} className="space-y-2">
                    <Label htmlFor={`subOption-${subOption.key}`} className="text-xs text-slate-500">
                      {subOption.label}
                    </Label>
                    {subOption.type === 'text' && (
                      <Input
                        id={`subOption-${subOption.key}`}
                        placeholder={`Enter ${subOption.label.toLowerCase()}`}
                        value={(serviceSubOptionValues[subOption.key] as string) || ''}
                        onChange={(e) => setServiceSubOptionValues({ ...serviceSubOptionValues, [subOption.key]: e.target.value })}
                      />
                    )}
                    {subOption.type === 'select' && (
                      <Select
                        value={(serviceSubOptionValues[subOption.key] as string) || ''}
                        onValueChange={(value: string) => setServiceSubOptionValues({ ...serviceSubOptionValues, [subOption.key]: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${subOption.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {subOption.options?.map((option: string) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {subOption.type === 'multiselect' && (
                      <MultiSelect
                        options={(subOption.options || []).map((opt: string) => ({ value: opt, label: opt }))}
                        value={(serviceSubOptionValues[subOption.key] as string[]) || []}
                        onChange={(value) => setServiceSubOptionValues({ ...serviceSubOptionValues, [subOption.key]: value })}
                        placeholder={`Select ${subOption.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Comments */}
            {catalogItemForService?.allowComments && (
              <div className="space-y-2">
                <Label htmlFor="serviceComments" className="text-xs text-slate-500">
                  Comments
                </Label>
                <Textarea
                  id="serviceComments"
                  placeholder="Add any comments about this service..."
                  value={serviceComments}
                  onChange={(e) => setServiceComments(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Parts Used */}
            {catalogItemForService?.allowedParts && catalogItemForService.allowedParts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Parts Used</Label>
                <MultiSelect
                  options={catalogItemForService.allowedParts.map((part: string) => ({ value: part, label: part }))}
                  value={servicePartsUsed}
                  onChange={setServicePartsUsed}
                  placeholder="Select parts used..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceDetailsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmServiceDetails}
              className="bg-[#c53032] hover:bg-[#a6212a]"
            >
              {serviceDetailsMode === "add" ? "Add Service" : "Save Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Comment Dialog (Done button) */}
      <Dialog open={showServiceCommentDialog} onOpenChange={setShowServiceCommentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Service Notes</DialogTitle>
            <DialogDescription>
              Add an overall comment about the selected services
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="overallServiceComment">Overall Comment</Label>
              <Textarea
                id="overallServiceComment"
                placeholder="Enter overall comment about the selected services..."
                value={overallServiceComment}
                onChange={(e) => setOverallServiceComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceCommentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveServiceComment}
              className="bg-[#c53032] hover:bg-[#a6212a]"
            >
              Save Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete job{" "}
              <span className="font-semibold">
                JOB-{jobId.toString().padStart(3, '0')}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Preview Modal */}
      {showInvoicePreview && selectedCustomer && selectedVehicle && (
        <InvoicePreviewModal
          open={showInvoicePreview}
          onOpenChange={setShowInvoicePreview}
          invoiceData={{
            invoiceNumber: (() => {
              const plateNo = selectedVehicle?.plateNo || selectedVehicle?.plate || '';
              const customerName = selectedCustomer?.name || '';
              if (plateNo && customerName) {
                const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
                if (initials) {
                  return `${plateNo}-${initials}`;
                }
              }
              return jobId ? `INV-${jobId.toString().padStart(3, "0")}` : formatInvoiceId({ _id: Date.now().toString() });
            })(),
            issueDate: new Date().toISOString(),
            jobId: jobId || undefined,
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
            services: selectedServices.map((service) => ({
              name: service.name,
              estimatedCost: getServiceCostValue(service),
              quantity: 1,
            })),
            technician: selectedTechnician ? { name: selectedTechnician.name } : undefined,
            totalCost: totalCost,
          }}
          businessProfile={businessProfile}
        />
      )}
    </>
  );
}

