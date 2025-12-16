import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useIsMobile } from "./ui/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Car,
  Wrench,
  X,
  Edit,
  Trash2,
  Plus,
  MoreVertical,
  User,
  MessageSquare,
  Upload,
  FileText,
  MapPinIcon,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { vehiclesAPI, serviceHistoryAPI, customersAPI } from "../api/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface CustomerProfileProps {
  customer: any;
  onClose?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigate?: (page: string) => void;
}

const getOilChangeDetails = (service: any) => {
  const details = service?.details || {};
  return {
    oilFilter: details.oilFilter || service.filter || "",
    oilGrade: details.oilGrade || service.oilGrade || "",
    oilMake: details.oilMake || service.oilMake || "",
    customNote: details.customNote || service.customField || "",
  };
};

const hasOilChangeDetails = (service: any) => {
  const { oilFilter, oilGrade, oilMake, customNote } = getOilChangeDetails(service);
  return Boolean(
    (oilFilter && oilFilter.trim()) ||
    (oilGrade && oilGrade.trim()) ||
    (oilMake && oilMake.trim()) ||
    (customNote && customNote.trim())
  );
};

export function CustomerProfile({
  customer,
  onClose,
  onEdit,
  onDelete,
  onNavigate,
}: CustomerProfileProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
  const [showEditVehicleDialog, setShowEditVehicleDialog] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<any>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<any>(null);
  const [showDeleteVehicleDialog, setShowDeleteVehicleDialog] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [newVehicleForm, setNewVehicleForm] = useState({
    make: "",
    model: "",
    year: "",
    plateNo: "",
    mileage: "",
    oilType: "",
  });
  const [editVehicleForm, setEditVehicleForm] = useState({
    make: "",
    model: "",
    year: "",
    plateNo: "",
    mileage: "",
    oilType: "",
  });

  const customerId = customer._id || customer.id;

  useEffect(() => {
    if (customerId) {
      fetchVehicles();
      fetchServiceHistory();
    }
  }, [customerId]);

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await vehiclesAPI.getAll(undefined, customerId);
      if (response.success) {
        setVehicles(response.data);
      }
    } catch (err) {
      console.error("Failed to load vehicles:", err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchServiceHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await serviceHistoryAPI.getAll(undefined, customerId);
      if (response.success) {
        setServiceHistory(response.data);
      }
    } catch (err) {
      console.error("Failed to load service history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const initials = customer.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || 'N/A';

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      setSavingNote(true);
      const currentNotes = customer.notes || "";
      const updatedNotes = currentNotes 
        ? `${currentNotes}\n\n[${new Date().toLocaleString()}] ${newNote.trim()}`
        : `[${new Date().toLocaleString()}] ${newNote.trim()}`;
      
      const response = await customersAPI.update(customerId, {
        notes: updatedNotes,
      });

      if (response.success) {
        toast.success("Note added successfully");
        setNewNote("");
        // Update customer object locally
        customer.notes = updatedNotes;
      } else {
        toast.error(response.message || "Failed to add note");
      }
    } catch (err: any) {
      console.error("Failed to add note:", err);
      toast.error(err.message || "Failed to add note. Please try again.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleScheduleService = () => {
    // Navigate to create job card with customer pre-selected
    if (onNavigate) {
      onNavigate(`create-job-card?customerId=${customerId}`);
    } else {
      navigate(`/create-job-card?customerId=${customerId}`);
    }
  };

  const handleViewInvoices = () => {
    // Navigate to invoices with customer filter
    if (onNavigate) {
      onNavigate(`invoices?customer=${customerId}`);
    } else {
      navigate(`/invoices?customer=${customerId}`);
    }
  };

  const handleSendMessage = () => {
    // Get customer phone number
    const phone = customer.phone;
    
    if (!phone) {
      toast.error("Customer doesn't have a phone number");
      return;
    }

    // Format phone number for WhatsApp (remove any non-digit characters except +)
    let formattedPhone = phone.replace(/[^\d+]/g, '');
    
    // If phone doesn't start with +, assume it's a local number and add country code
    // You may need to adjust this based on your country code
    if (!formattedPhone.startsWith('+')) {
      // Default to Pakistan country code (+92) if no country code is present
      // Remove leading 0 if present (common in local Pakistani numbers)
      formattedPhone = formattedPhone.replace(/^0/, '');
      formattedPhone = '+92' + formattedPhone;
    }

    // Create a default message
    const defaultMessage = `Hello ${customer.name}, this is from Momentum Auto Works. How can we assist you today?`;
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(defaultMessage);
    
    // Open WhatsApp Web with the phone number and message
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleNewService = () => {
    if (onNavigate) {
      onNavigate(`create-job-card?customerId=${customerId}`);
    } else {
      navigate(`/create-job-card?customerId=${customerId}`);
    }
  };

  const openAddVehicleDialog = () => {
    setNewVehicleForm({
      make: "",
      model: "",
      year: "",
      plateNo: "",
      mileage: "",
      oilType: "",
    });
    setShowAddVehicleDialog(true);
  };

  const openEditVehicleDialog = (vehicle: any) => {
    setVehicleToEdit(vehicle);
    setEditVehicleForm({
      make: vehicle.make || "",
      model: vehicle.model || "",
      year: vehicle.year?.toString() || "",
      plateNo: vehicle.plateNo || "",
      mileage: vehicle.mileage?.toString() || "",
      oilType: vehicle.oilType || "",
    });
    setShowEditVehicleDialog(true);
  };

  const handleSaveVehicle = async () => {
    if (!newVehicleForm.make.trim() || !newVehicleForm.model.trim() || !newVehicleForm.year.trim() || !newVehicleForm.plateNo.trim()) {
      toast.error("Please fill in all required fields (Make, Model, Year, Plate Number)");
      return;
    }

    try {
      setSavingVehicle(true);
      const response = await vehiclesAPI.create({
        customer: customerId,
        make: newVehicleForm.make.trim(),
        model: newVehicleForm.model.trim(),
        year: parseInt(newVehicleForm.year.trim()),
        plateNo: newVehicleForm.plateNo.trim(),
        mileage: newVehicleForm.mileage ? parseInt(newVehicleForm.mileage) : 0,
        oilType: newVehicleForm.oilType || undefined,
        status: 'Active',
      });

      if (response.success) {
        toast.success("Vehicle added successfully");
        setShowAddVehicleDialog(false);
        setNewVehicleForm({
          make: "",
          model: "",
          year: "",
          plateNo: "",
          mileage: "",
          oilType: "",
        });
        fetchVehicles();
      } else {
        toast.error(response.message || "Failed to add vehicle");
      }
    } catch (err: any) {
      console.error("Failed to add vehicle:", err);
      toast.error(err.message || "Failed to add vehicle. Please try again.");
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleUpdateVehicle = async () => {
    if (!vehicleToEdit) return;
    if (!editVehicleForm.make.trim() || !editVehicleForm.model.trim() || !editVehicleForm.year.trim() || !editVehicleForm.plateNo.trim()) {
      toast.error("Please fill in all required fields (Make, Model, Year, Plate Number)");
      return;
    }

    try {
      setSavingVehicle(true);
      const response = await vehiclesAPI.update(vehicleToEdit._id || vehicleToEdit.id, {
        make: editVehicleForm.make.trim(),
        model: editVehicleForm.model.trim(),
        year: parseInt(editVehicleForm.year.trim()),
        plateNo: editVehicleForm.plateNo.trim(),
        mileage: editVehicleForm.mileage ? parseInt(editVehicleForm.mileage) : 0,
        oilType: editVehicleForm.oilType || undefined,
      });

      if (response.success) {
        toast.success("Vehicle updated successfully");
        setShowEditVehicleDialog(false);
        setVehicleToEdit(null);
        fetchVehicles();
      } else {
        toast.error(response.message || "Failed to update vehicle");
      }
    } catch (err: any) {
      console.error("Failed to update vehicle:", err);
      toast.error(err.message || "Failed to update vehicle. Please try again.");
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;

    try {
      setSavingVehicle(true);
      const response = await vehiclesAPI.delete(vehicleToDelete._id || vehicleToDelete.id);
      
      if (response.success) {
        toast.success("Vehicle removed successfully");
        setShowDeleteVehicleDialog(false);
        setVehicleToDelete(null);
        fetchVehicles();
      } else {
        toast.error(response.message || "Failed to remove vehicle");
      }
    } catch (err: any) {
      console.error("Failed to delete vehicle:", err);
      toast.error(err.message || "Failed to remove vehicle. Please try again.");
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleScheduleServiceForVehicle = (vehicle: any) => {
    const vehicleId = vehicle._id || vehicle.id;
    if (onNavigate) {
      onNavigate(`create-job-card?customerId=${customerId}&vehicleId=${vehicleId}`);
    } else {
      navigate(`/create-job-card?customerId=${customerId}&vehicleId=${vehicleId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  // Format dates
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Header Bar */}
      <div className="bg-white border-b px-4 md:px-6 py-3 md:py-4 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={onClose}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="mb-0.5 text-lg md:text-xl truncate">Customer Profile</h1>
            <p className="text-xs md:text-sm text-slate-600 truncate">{customer.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size={isMobile ? "icon" : "default"}
            className="bg-[#c53032] text-white border-[#c53032] hover:bg-[#a6212a] hover:text-white"
            title="New Service"
            onClick={handleNewService}
          >
            <Plus className="h-4 w-4 md:mr-2" />
            {!isMobile && <span>New Service</span>}
          </Button>
          {onEdit && (
            <Button variant="outline" size={isMobile ? "icon" : "default"} onClick={onEdit} title="Edit">
              <Edit className="h-4 w-4 md:mr-2" />
              {!isMobile && <span>Edit</span>}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="icon"
              className="text-red-600 hover:text-red-700"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r flex flex-col flex-shrink-0 overflow-y-auto md:overflow-hidden">
          {/* Customer Info Header */}
          <div className="p-4 md:p-6 text-center border-b flex-shrink-0">
            <Avatar className="h-16 w-16 md:h-20 md:w-20 mx-auto mb-2 md:mb-3">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-lg md:text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h2 className="mb-2 text-base md:text-lg truncate px-2">{customer.name || 'N/A'}</h2>
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
              {customer.isActive !== false ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-xs uppercase text-slate-500 mb-3 font-medium">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm flex-1">
                      <div className="text-slate-500 text-xs mb-0.5">Phone</div>
                      <div>{customer.phone}</div>
                    </div>
                  </div>
                  {customer.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm flex-1">
                        <div className="text-slate-500 text-xs mb-0.5">Email</div>
                        <div className="break-all">{customer.email}</div>
                      </div>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm flex-1">
                        <div className="text-slate-500 text-xs mb-0.5">Address</div>
                        <div className="text-slate-700">
                          {customer.address}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Quick Stats */}
              <div>
                <h3 className="text-xs uppercase text-slate-500 mb-3 font-medium">
                  Statistics
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Total Spent</span>
                    </div>
                    <span className="font-medium">
                      -
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Car className="h-4 w-4" />
                      <span className="text-sm">Vehicles</span>
                    </div>
                    <span className="font-medium">{vehicles.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Wrench className="h-4 w-4" />
                      <span className="text-sm">Services</span>
                    </div>
                    <span className="font-medium">{serviceHistory.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Member Since</span>
                    </div>
                    <span className="text-sm text-slate-600">
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Quick Actions */}
              <div>
                <h3 className="text-xs uppercase text-slate-500 mb-3 font-medium">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-sm"
                    onClick={handleScheduleService}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Schedule Service
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-sm"
                    onClick={handleViewInvoices}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Invoices
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-sm"
                    onClick={handleSendMessage}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Tab Navigation */}
            <div className="bg-white border-b flex-shrink-0 overflow-x-auto">
              <TabsList className="bg-transparent border-b-0 h-auto p-0 min-w-max w-full md:w-auto">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="vehicles"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap"
                >
                  Vehicles
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Service History</span>
                  <span className="sm:hidden">History</span>
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap"
                >
                  Notes
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 overflow-hidden">
              {/* Overview Tab */}
              <TabsContent
                value="overview"
                className="mt-0 h-full overflow-y-auto data-[state=inactive]:hidden"
              >
                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Vehicle Summary */}
                    <Card className="p-4 md:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-sm md:text-base">Vehicles ({vehicles.length})</h3>
                        <Button size="sm" variant="outline" className="text-xs md:text-sm" onClick={openAddVehicleDialog}>
                          <Plus className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                          <span className="hidden md:inline">Add</span>
                        </Button>
                      </div>
                      {loadingVehicles ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-[#c53032]" />
                        </div>
                      ) : vehicles.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">No vehicles registered</div>
                      ) : (
                        <div className="space-y-3">
                          {vehicles.map((vehicle) => (
                            <div
                              key={vehicle._id || vehicle.id}
                              className="border rounded-lg p-3 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Car className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium mb-1">
                                    {vehicle.make} {vehicle.model}
                                  </h4>
                                  <div className="text-xs text-slate-600 space-y-0.5">
                                    <div>{vehicle.year} • {vehicle.plateNo}</div>
                                    <div>{vehicle.mileage?.toLocaleString() || 0} km • {vehicle.oilType || 'N/A'}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* Attachments */}
                    <Card className="p-4 md:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-sm md:text-base">Notes</h3>
                      </div>
                      <div className="space-y-2">
                        {customer.notes ? (
                          <p className="text-xs md:text-sm text-slate-600">{customer.notes}</p>
                        ) : (
                          <p className="text-xs md:text-sm text-slate-500">No notes available</p>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <Card className="p-4 md:p-6">
                    <h3 className="font-medium mb-4 text-sm md:text-base">Recent Service Activity</h3>
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-[#c53032]" />
                      </div>
                    ) : serviceHistory.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">No service history</div>
                    ) : (
                      <div className="space-y-4">
                        {serviceHistory.slice(0, 4).map((service) => {
                          const jobId = service.job?._id || service.job || service._id;
                          const jobIdStr = jobId?.toString() || '';
                          const jobNumber = jobIdStr.slice(-6).padStart(6, '0');
                          const isFromJob = service.isFromJob || service.jobDetails;
                          const vehicleInfo = service.vehicle || service.jobDetails?.vehicle;
                          
                          return (
                            <div
                              key={service._id || service.id}
                              className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                            >
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                <Wrench className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium text-sm">
                                        {service.jobDetails?.title || service.description || 'N/A'}
                                      </h4>
                                      {/* Show Oil Change details from job services in overview */}
                                      {service.jobDetails?.services && service.jobDetails.services.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {service.jobDetails.services
                                            .filter((s: any) => s.name === "Oil Change" && hasOilChangeDetails(s))
                                            .map((oilService: any, idx: number) => {
                                              const details = getOilChangeDetails(oilService);
                                              return (
                                                <div key={idx} className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                                                  <p className="font-medium text-slate-700 mb-1">Oil Change Details:</p>
                                                  {details.oilFilter && <p>Filter: {details.oilFilter}</p>}
                                                  {details.oilGrade && <p>Oil Grade: {details.oilGrade}</p>}
                                                  {details.oilMake && <p>Oil Make: {details.oilMake}</p>}
                                                  {details.customNote && <p className="text-slate-500">{details.customNote}</p>}
                                                </div>
                                              );
                                            })}
                                        </div>
                                      )}
                                      {isFromJob && (
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                          JOB-{jobNumber}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-600">
                                      {vehicleInfo 
                                        ? `${vehicleInfo.make || ''} ${vehicleInfo.model || ''} ${vehicleInfo.year || ''} ${vehicleInfo.plateNo ? `(${vehicleInfo.plateNo})` : ''}`.trim()
                                        : service.vehicle 
                                        ? `${service.vehicle.make} ${service.vehicle.model} ${service.vehicle.year}` 
                                        : 'N/A'}
                                    </p>
                                    {service.jobDetails?.description && (
                                      <p className="text-xs text-slate-500 mt-0.5">{service.jobDetails.description}</p>
                                    )}
                                    {/* Show Oil Change details from job services in overview */}
                                    {service.jobDetails?.services && service.jobDetails.services.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {service.jobDetails.services
                                          .filter((s: any) => s.name === "Oil Change" && hasOilChangeDetails(s))
                                          .map((oilService: any, idx: number) => {
                                            const details = getOilChangeDetails(oilService);
                                            return (
                                              <div key={idx} className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                                                <p className="font-medium text-slate-700 mb-1">Oil Change Details:</p>
                                                {details.oilFilter && <p>Filter: {details.oilFilter}</p>}
                                                {details.oilGrade && <p>Oil Grade: {details.oilGrade}</p>}
                                                {details.oilMake && <p>Oil Make: {details.oilMake}</p>}
                                                {details.customNote && <p className="text-slate-500">{details.customNote}</p>}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
                                  </div>
                                  <span className="font-medium">
                                    <span className="text-xs font-normal mr-0.5">₨</span>
                                    <span className="font-medium">{(service.cost || service.jobDetails?.amount || 0).toLocaleString()}</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span>{formatDate(service.serviceDate || service.createdAt)}</span>
                                  {service.technician && (
                                    <>
                                      <span>•</span>
                                      <span>Tech: {service.technician}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>
              </TabsContent>

              {/* Vehicles Tab */}
              <TabsContent
                value="vehicles"
                className="mt-0 h-full overflow-y-auto data-[state=inactive]:hidden"
              >
                <div className="p-4 md:p-6">
                  <Card className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 md:mb-6">
                      <div>
                        <h3 className="font-medium mb-1 text-base md:text-lg">Customer Vehicles</h3>
                        <p className="text-xs md:text-sm text-slate-600">
                          Manage all vehicles registered to this customer
                        </p>
                      </div>
                      <Button className="bg-[#c53032] hover:bg-[#a6212a] w-full md:w-auto" onClick={openAddVehicleDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Vehicle
                      </Button>
                    </div>
                    {loadingVehicles ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-[#c53032]" />
                      </div>
                    ) : vehicles.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">No vehicles registered</div>
                    ) : (
                      <div className="grid gap-4">
                        {vehicles.map((vehicle) => (
                          <div
                            key={vehicle._id || vehicle.id}
                            className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Car className="h-8 w-8 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <h4 className="mb-1">
                                      {vehicle.make} {vehicle.model}
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                      {vehicle.year} • {vehicle.status || 'Active'}
                                    </p>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditVehicleDialog(vehicle)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Vehicle
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleScheduleServiceForVehicle(vehicle)}>
                                        <Wrench className="h-4 w-4 mr-2" />
                                        Schedule Service
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={() => {
                                          setVehicleToDelete(vehicle);
                                          setShowDeleteVehicleDialog(true);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Remove Vehicle
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 text-sm">
                                  <div>
                                    <span className="text-slate-500 text-xs">License Plate</span>
                                    <p className="font-medium mt-1 text-sm">{vehicle.plateNo || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-xs">Mileage</span>
                                    <p className="font-medium mt-1 text-sm">{vehicle.mileage?.toLocaleString() || 0} km</p>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-xs">Oil Type</span>
                                    <p className="font-medium mt-1 text-sm">{vehicle.oilType || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </TabsContent>

              {/* Service History Tab */}
              <TabsContent
                value="history"
                className="mt-0 h-full overflow-y-auto data-[state=inactive]:hidden"
              >
                <div className="p-4 md:p-6">
                  <Card className="p-4 md:p-6">
                    <div className="mb-4 md:mb-6">
                      <h3 className="font-medium mb-1 text-base md:text-lg">Service History</h3>
                      <p className="text-xs md:text-sm text-slate-600">
                        Complete history of all services and jobs
                      </p>
                    </div>
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-[#c53032]" />
                      </div>
                    ) : serviceHistory.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">No service history available</div>
                    ) : (
                      <div className="overflow-x-auto -mx-4 md:mx-0">
                        <div className="min-w-[800px] md:min-w-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs md:text-sm">Date</TableHead>
                                <TableHead className="text-xs md:text-sm">Job Card #</TableHead>
                                <TableHead className="text-xs md:text-sm">Service/Work Performed</TableHead>
                                <TableHead className="text-xs md:text-sm hidden md:table-cell">Vehicle</TableHead>
                                <TableHead className="text-xs md:text-sm hidden lg:table-cell">Technician</TableHead>
                                <TableHead className="text-xs md:text-sm hidden lg:table-cell">Mileage</TableHead>
                                <TableHead className="text-xs md:text-sm">Total Amount</TableHead>
                                <TableHead className="text-xs md:text-sm">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                          <TableBody>
                            {serviceHistory.map((service) => {
                              const jobId = service.job?._id || service.job || service._id;
                              const jobIdStr = jobId?.toString() || '';
                              const jobNumber = jobIdStr.slice(-6).padStart(6, '0');
                              const isFromJob = service.isFromJob || service.jobDetails;
                              const jobStatus = service.jobDetails?.status || service.job?.status || 'COMPLETED';
                              const vehicleInfo = service.vehicle || service.jobDetails?.vehicle;
                              
                              return (
                                <TableRow key={service._id || service.id}>
                                  <TableCell className="text-xs md:text-sm">
                                    {formatDate(service.serviceDate || service.createdAt)}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {isFromJob ? (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                        JOB-{jobNumber}
                                      </Badge>
                                    ) : service.job ? (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                        JOB-{jobNumber}
                                      </Badge>
                                    ) : (
                                      "N/A"
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs md:text-sm max-w-xs">
                                    <div>
                                      <p className="font-medium">{service.jobDetails?.title || service.description || 'N/A'}</p>
                                      {service.jobDetails?.description && (
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{service.jobDetails.description}</p>
                                      )}
                                    {/* Show Oil Change details from job services */}
                                    {service.jobDetails?.services && service.jobDetails.services.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {service.jobDetails.services
                                          .filter((s: any) => s.name === "Oil Change" && hasOilChangeDetails(s))
                                          .map((oilService: any, idx: number) => {
                                            const details = getOilChangeDetails(oilService);
                                            return (
                                              <div key={idx} className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                                                <p className="font-medium text-slate-700 mb-1">Oil Change Details:</p>
                                                {details.oilFilter && <p>Filter: {details.oilFilter}</p>}
                                                {details.oilGrade && <p>Oil Grade: {details.oilGrade}</p>}
                                                {details.oilMake && <p>Oil Make: {details.oilMake}</p>}
                                                {details.customNote && <p className="text-slate-500">{details.customNote}</p>}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs md:text-sm text-slate-600 hidden md:table-cell">
                                    {vehicleInfo 
                                      ? `${vehicleInfo.make || ''} ${vehicleInfo.model || ''} ${vehicleInfo.year || ''} ${vehicleInfo.plateNo ? `(${vehicleInfo.plateNo})` : ''}`.trim()
                                      : service.vehicle 
                                      ? `${service.vehicle.make} ${service.vehicle.model} ${service.vehicle.year || ''}`.trim()
                                      : 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-xs md:text-sm text-slate-600 hidden lg:table-cell">
                                    {service.technician || 'N/A'}
                                  </TableCell>
                                  <TableCell className="text-xs md:text-sm text-slate-600 hidden lg:table-cell">
                                    {service.mileage?.toLocaleString() || 'N/A'} {service.mileage ? 'km' : ''}
                                  </TableCell>
                                  <TableCell className="font-medium text-xs md:text-sm">
                                    <span className="text-xs font-normal mr-0.5">₨</span>
                                    <span className="font-medium">{(service.cost || service.jobDetails?.amount || 0).toLocaleString()}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={
                                      jobStatus === 'DELIVERED' 
                                        ? "bg-green-100 text-green-700 border-green-200 text-xs"
                                        : jobStatus === 'COMPLETED'
                                        ? "bg-blue-100 text-blue-700 border-blue-200 text-xs"
                                        : "bg-gray-100 text-gray-700 border-gray-200 text-xs"
                                    }>
                                      {jobStatus === 'DELIVERED' ? 'Delivered' : jobStatus === 'COMPLETED' ? 'Completed' : 'Completed'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </TabsContent>

              {/* Notes & Interactions Tab */}
              <TabsContent
                value="notes"
                className="mt-0 h-full overflow-y-auto data-[state=inactive]:hidden"
              >
                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                  {/* Add New Note */}
                  <Card className="p-4 md:p-6">
                    <h3 className="font-medium mb-4">Add New Note</h3>
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Add a note, interaction log, or comment about this customer..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleAddNote}
                          className="bg-[#c53032] hover:bg-[#a6212a]"
                          disabled={savingNote}
                        >
                          {savingNote ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Add Note
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Notes */}
                  <Card className="p-6">
                    <h3 className="font-medium mb-4">Customer Notes</h3>
                    {customer.notes ? (
                      <div className="space-y-4">
                        <div className="border-l-2 border-blue-200 pl-4 py-2">
                          <p className="text-sm text-slate-700">{customer.notes}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-sm">No notes available</div>
                    )}
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Add Vehicle Dialog */}
      <Dialog open={showAddVehicleDialog} onOpenChange={setShowAddVehicleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
            <DialogDescription>
              Add a new vehicle for {customer.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make *</Label>
              <Input
                id="make"
                value={newVehicleForm.make}
                onChange={(e) => setNewVehicleForm({ ...newVehicleForm, make: e.target.value })}
                placeholder="e.g., Honda"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={newVehicleForm.model}
                onChange={(e) => setNewVehicleForm({ ...newVehicleForm, model: e.target.value })}
                placeholder="e.g., City"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  value={newVehicleForm.year}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, year: e.target.value })}
                  placeholder="e.g., 2020"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plateNo">Plate Number *</Label>
                <Input
                  id="plateNo"
                  value={newVehicleForm.plateNo}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, plateNo: e.target.value })}
                  placeholder="e.g., ABC-123"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mileage">Mileage (km)</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={newVehicleForm.mileage}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, mileage: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oilType">Oil Type</Label>
                <Input
                  id="oilType"
                  value={newVehicleForm.oilType}
                  onChange={(e) => setNewVehicleForm({ ...newVehicleForm, oilType: e.target.value })}
                  placeholder="e.g., 5W-30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVehicleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveVehicle} 
              className="bg-[#c53032] hover:bg-[#a6212a]"
              disabled={savingVehicle}
            >
              {savingVehicle ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Vehicle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Dialog */}
      <Dialog open={showEditVehicleDialog} onOpenChange={setShowEditVehicleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update vehicle information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-make">Make *</Label>
              <Input
                id="edit-make"
                value={editVehicleForm.make}
                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, make: e.target.value })}
                placeholder="e.g., Honda"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">Model *</Label>
              <Input
                id="edit-model"
                value={editVehicleForm.model}
                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, model: e.target.value })}
                placeholder="e.g., City"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-year">Year *</Label>
                <Input
                  id="edit-year"
                  type="number"
                  value={editVehicleForm.year}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, year: e.target.value })}
                  placeholder="e.g., 2020"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plateNo">Plate Number *</Label>
                <Input
                  id="edit-plateNo"
                  value={editVehicleForm.plateNo}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, plateNo: e.target.value })}
                  placeholder="e.g., ABC-123"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-mileage">Mileage (km)</Label>
                <Input
                  id="edit-mileage"
                  type="number"
                  value={editVehicleForm.mileage}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, mileage: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-oilType">Oil Type</Label>
                <Input
                  id="edit-oilType"
                  value={editVehicleForm.oilType}
                  onChange={(e) => setEditVehicleForm({ ...editVehicleForm, oilType: e.target.value })}
                  placeholder="e.g., 5W-30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditVehicleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateVehicle} 
              className="bg-[#c53032] hover:bg-[#a6212a]"
              disabled={savingVehicle}
            >
              {savingVehicle ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Vehicle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Vehicle Confirmation Dialog */}
      <Dialog open={showDeleteVehicleDialog} onOpenChange={setShowDeleteVehicleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Vehicle</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this vehicle? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {vehicleToDelete && (
            <div className="py-4">
              <p className="text-sm text-slate-600">
                <strong>{vehicleToDelete.make} {vehicleToDelete.model}</strong> ({vehicleToDelete.year}) - {vehicleToDelete.plateNo}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteVehicleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteVehicle} 
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={savingVehicle}
            >
              {savingVehicle ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Vehicle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
