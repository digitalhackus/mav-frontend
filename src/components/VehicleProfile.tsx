import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { vehiclesAPI, serviceHistoryAPI, notificationsAPI } from "../api/client";
import { formatJobId, formatInvoiceId } from "../utils/idFormatter";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  Car,
  Upload,
  User,
  Calendar,
  FileText,
  Wrench,
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  MoreVertical,
  DollarSign,
  Bell,
  Gauge,
  Palette,
  Fuel,
  Hash,
  Droplet,
  Clock,
  Route,
  CheckCircle2,
  ExternalLink,
  Send,
  ShoppingCart,
  Image as ImageIcon,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useIsMobile } from "./ui/use-mobile";

interface VehicleProfileProps {
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: string;
    plate: string;
    ownerId: string;
    ownerName: string;
  };
  onClose?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewOwner?: (ownerId: string) => void;
  onCreateJobCard?: () => void;
  onCreateInvoice?: () => void;
}

export function VehicleProfile({
  vehicle,
  onClose,
  onEdit,
  onDelete,
  onViewOwner,
  onCreateJobCard,
  onCreateInvoice,
}: VehicleProfileProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(false);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVehicleData();
    fetchServiceHistory();
  }, [vehicle.id]);

  const fetchVehicleData = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await vehiclesAPI.getById(vehicle.id);
      if (response.success) {
        setVehicleData(response.data);
      }
    } catch (err: any) {
      console.error("Error fetching vehicle:", err);
      setError(err.message || "Failed to load vehicle data");
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceHistory = async () => {
    try {
      const response = await serviceHistoryAPI.getAll(vehicle.id, undefined);
      if (response.success) {
        setServiceHistory(response.data || []);
      }
    } catch (err: any) {
      console.error("Error fetching service history:", err);
      setServiceHistory([]);
    }
  };

  // Calculate stats from real data (including jobs)
  const stats = {
    totalServices: serviceHistory.length,
    totalSpent: serviceHistory.reduce((sum, service) => sum + (service.cost || service.jobDetails?.amount || 0), 0),
    averageServiceCost: serviceHistory.length > 0 
      ? Math.round(serviceHistory.reduce((sum, service) => sum + (service.cost || service.jobDetails?.amount || 0), 0) / serviceHistory.length)
      : 0,
    daysSinceLastService: vehicleData?.lastService 
      ? Math.floor((new Date().getTime() - new Date(vehicleData.lastService).getTime()) / (1000 * 60 * 60 * 24))
      : null,
  };

  const handleSendReminder = async () => {
    if (!vehicle.ownerId || !vehicle.id) {
      toast.error("Cannot send reminder: Missing owner or vehicle information");
      return;
    }

    try {
      toast.loading("Sending service reminder...", { id: "reminder" });
      
      const result = await notificationsAPI.sendEmail(vehicle.ownerId, vehicle.id);
      
      if (result.success) {
        toast.success("Service reminder sent successfully via email!", { id: "reminder" });
      } else {
        toast.error(result.message || "Failed to send reminder. Please check customer email.", { id: "reminder" });
      }
    } catch (error: any) {
      console.error("Error sending reminder:", error);
      toast.error(error.message || "Failed to send service reminder", { id: "reminder" });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c53032] mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading vehicle data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchVehicleData} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!vehicleData) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-gray-600">Vehicle not found</p>
          {onClose && (
            <Button onClick={onClose} variant="outline" className="mt-4">
              Go Back
            </Button>
          )}
        </div>
      </div>
    );
  }

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
            <h1 className="mb-0.5 text-lg md:text-xl truncate">Vehicle Profile</h1>
            <p className="text-xs md:text-sm text-slate-600 truncate">
              {vehicle.make} {vehicle.model} • {vehicle.plate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 flex-wrap">
          <Button
            variant="outline"
            size={isMobile ? "icon" : "default"}
            className="bg-green-600 text-white border-green-600 hover:bg-green-700 hover:text-white"
            onClick={onCreateJobCard}
            title="Create Job Card"
          >
            <Wrench className="h-4 w-4 md:mr-2" />
            {!isMobile && <span>Create Job Card</span>}
          </Button>
          <Button
            variant="outline"
            size={isMobile ? "icon" : "default"}
            className="bg-[#c53032] text-white border-[#c53032] hover:bg-[#a6212a] hover:text-white"
            onClick={onCreateInvoice}
            title="Create Invoice"
          >
            <FileText className="h-4 w-4 md:mr-2" />
            {!isMobile && <span>Create Invoice</span>}
          </Button>
          <Button variant="outline" size={isMobile ? "icon" : "default"} onClick={handleSendReminder} title="Send Reminder">
            <Send className="h-4 w-4 md:mr-2" />
            {!isMobile && <span>Send Reminder</span>}
          </Button>
          {onEdit && (
            <Button variant="outline" size="icon" onClick={onEdit} title="Edit">
              <Edit className="h-4 w-4" />
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
          {/* Vehicle Photo */}
          <div className="p-4 md:p-6 border-b flex-shrink-0">
            <div className="aspect-video rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-2 md:mb-3 overflow-hidden relative group">
              <Car className="h-12 w-12 md:h-16 md:w-16 text-slate-400" />
              <button className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-center">
                  <Upload className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2" />
                  <span className="text-xs md:text-sm">Upload Photo</span>
                </div>
              </button>
            </div>
            <div className="text-center">
              <h2 className="mb-1 text-base md:text-lg truncate px-2">
                {vehicle.make} {vehicle.model}
              </h2>
              <p className="text-xs md:text-sm text-slate-600 mb-2">
                {vehicle.year} • {vehicle.plate}
              </p>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs break-all">
                {vehicle.id}
              </Badge>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Owner Information */}
              <div>
                <h3 className="text-xs uppercase text-slate-500 mb-3 font-medium">
                  Owner Information
                </h3>
                <button
                  onClick={() => onViewOwner?.(vehicle.ownerId)}
                  className="flex items-center gap-3 w-full p-3 border rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white flex-shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{vehicle.ownerName}</p>
                    <p className="text-xs text-slate-500">View Profile →</p>
                  </div>
                </button>
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
                      <Wrench className="h-4 w-4" />
                      <span className="text-sm">Total Services</span>
                    </div>
                    <span className="font-medium">{stats.totalServices}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Total Spent</span>
                    </div>
                    <span className="font-medium">
                      <span className="text-lg font-normal mr-0.5">₨</span>
                      <span className="font-semibold">{stats.totalSpent.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Avg. Service Cost</span>
                    </div>
                    <span className="font-medium">
                      <span className="text-lg font-normal mr-0.5">₨</span>
                      <span className="font-semibold">{stats.averageServiceCost.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Last Service</span>
                    </div>
                    <span className="text-sm text-slate-600">
                      {stats.daysSinceLastService !== null ? `${stats.daysSinceLastService} days ago` : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Service Schedule */}
              <div>
                <h3 className="text-xs uppercase text-slate-500 mb-3 font-medium">
                  Service Schedule
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        Last Service
                      </span>
                    </div>
                    <p className="text-sm text-green-700">{formatDate(vehicleData.lastService)}</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Bell className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Next Service
                      </span>
                    </div>
                    <p className="text-sm text-blue-700">{formatDate(vehicleData.nextService)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Marketplace Toggle */}
              <div>
                <h3 className="text-xs uppercase text-slate-500 mb-3 font-medium">
                  Marketplace
                </h3>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ShoppingCart className="h-4 w-4 text-slate-600" />
                        <Label htmlFor="marketplace" className="font-medium text-sm">
                          List for Sale
                        </Label>
                      </div>
                      <p className="text-xs text-slate-500">
                        Mark this vehicle for the members-only marketplace
                      </p>
                    </div>
                    <Switch
                      id="marketplace"
                      checked={marketplaceEnabled}
                      onCheckedChange={setMarketplaceEnabled}
                    />
                  </div>
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
                  value="details"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Details</span>
                  <span className="sm:hidden">Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap"
                >
                  History
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm whitespace-nowrap"
                >
                  Files
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
                  {/* Quick Info Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Gauge className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Current Mileage</p>
                          <p className="font-medium">{vehicleData.mileage?.toLocaleString() || 0} km</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Route className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Status</p>
                          <p className="font-medium">{vehicleData.status || "Active"}</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Droplet className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Oil Type</p>
                          <p className="font-medium text-sm">{vehicleData.oilType || "N/A"}</p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Vehicle Specifications */}
                  <Card className="p-4 md:p-6">
                    <h3 className="font-medium mb-4 text-base md:text-lg">Vehicle Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-slate-500">Make</label>
                          <p className="font-medium mt-1">{vehicleData.make || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Model</label>
                          <p className="font-medium mt-1">{vehicleData.model || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Year</label>
                          <p className="font-medium mt-1">{vehicleData.year || "N/A"}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-slate-500">Plate Number</label>
                          <p className="font-medium mt-1">{vehicleData.plateNo || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Oil Type</label>
                          <p className="font-medium mt-1">{vehicleData.oilType || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Status</label>
                          <p className="font-medium mt-1">{vehicleData.status || "Active"}</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Recent Services */}
                  <Card className="p-4 md:p-6">
                    <h3 className="font-medium mb-4 text-base md:text-lg">Recent Service Activity</h3>
                    {serviceHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No service history available</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {serviceHistory.slice(0, 3).map((service) => {
                          const jobId = service.job?._id || service.job || service._id;
                          const jobNumber = formatJobId({ _id: jobId });
                          const isFromJob = service.isFromJob || service.jobDetails;
                          
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
                                    <h4 className="font-medium text-sm">
                                      {service.jobDetails?.title || service.description || "Service"}
                                    </h4>
                                    <p className="text-sm text-slate-600">
                                      {isFromJob ? `Job Card: JOB-${jobNumber}` : formatDate(service.serviceDate)}
                                    </p>
                                    {service.jobDetails?.description && (
                                      <p className="text-xs text-slate-500 mt-0.5">{service.jobDetails.description}</p>
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

              {/* Vehicle Details Tab */}
              <TabsContent
                value="details"
                className="mt-0 h-full overflow-y-auto data-[state=inactive]:hidden"
              >
                <div className="p-4 md:p-6">
                  <Card className="p-4 md:p-6">
                    <h3 className="font-medium mb-4 md:mb-6 text-base md:text-lg">Complete Vehicle Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-12 gap-y-4 md:gap-y-6">
                      {/* Left Column */}
                      <div className="space-y-6">
                        <div className="flex items-start gap-3">
                          <Car className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">Make & Model</label>
                            <p className="font-medium mt-1">
                              {vehicle.make} {vehicle.model}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">Year</label>
                            <p className="font-medium mt-1">{vehicle.year}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Hash className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">License Plate</label>
                            <p className="font-medium mt-1">{vehicle.plate}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Hash className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">VIN Number</label>
                            <p className="font-medium mt-1">{vehicleData.vin || "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Hash className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">Engine Number</label>
                            <p className="font-medium mt-1">{vehicleData.engineNo || "N/A"}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        <div className="flex items-start gap-3">
                          <Palette className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">Color</label>
                            <p className="font-medium mt-1">{vehicleData.color || "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Fuel className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">Fuel Type</label>
                            <p className="font-medium mt-1">{vehicleData.fuelType || "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Gauge className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">Current Mileage</label>
                            <p className="font-medium mt-1">{vehicleData.mileage ? `${vehicleData.mileage.toLocaleString()} km` : "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Route className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">Daily Mileage</label>
                            <p className="font-medium mt-1">{vehicleData.dailyMileage ? `${vehicleData.dailyMileage} km/day` : "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Droplet className="h-5 w-5 text-slate-400 mt-0.5" />
                          <div className="flex-1">
                            <label className="text-xs text-slate-500">Recommended Oil Type</label>
                            <p className="font-medium mt-1">{vehicleData.oilType || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4 md:my-6" />

                    {/* Service Information */}
                    <h3 className="font-medium mb-4 text-base md:text-lg">Service Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                      <div>
                        <label className="text-xs text-slate-500">Last Service Date</label>
                        <p className="font-medium mt-1">{formatDate(vehicleData.lastService)}</p>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Next Service Date</label>
                        <p className="font-medium mt-1">{formatDate(vehicleData.nextService)}</p>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Service Frequency</label>
                        <p className="font-medium mt-1">{vehicleData.serviceFrequency || "N/A"}</p>
                      </div>
                    </div>
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
                      <h3 className="font-medium mb-1 text-base md:text-lg">Complete Service History</h3>
                      <p className="text-xs md:text-sm text-slate-600">
                        All services and maintenance performed on this vehicle
                      </p>
                    </div>
                    <div className="overflow-x-auto -mx-4 md:mx-0">
                      <div className="min-w-[800px] md:min-w-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs md:text-sm">Date</TableHead>
                              <TableHead className="text-xs md:text-sm">Job Card #</TableHead>
                              <TableHead className="text-xs md:text-sm">Work Performed</TableHead>
                              <TableHead className="text-xs md:text-sm hidden lg:table-cell">Technician</TableHead>
                              <TableHead className="text-xs md:text-sm hidden lg:table-cell">Supervisor</TableHead>
                              <TableHead className="text-xs md:text-sm">Total Amount</TableHead>
                              <TableHead className="text-xs md:text-sm hidden md:table-cell">Invoice</TableHead>
                              <TableHead className="text-xs md:text-sm">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                        <TableBody>
                          {serviceHistory.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm">No service history available</p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            serviceHistory.map((service) => {
                              const jobId = service.job?._id || service.job || service._id;
                              const jobNumber = formatJobId({ _id: jobId });
                              const isFromJob = service.isFromJob || service.jobDetails;
                              const jobStatus = service.jobDetails?.status || service.job?.status || 'COMPLETED';
                              
                              return (
                                <TableRow key={service._id || service.id}>
                                  <TableCell className="text-xs md:text-sm">{formatDate(service.serviceDate || service.createdAt)}</TableCell>
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
                                      <p className="font-medium">{service.jobDetails?.title || service.description || "N/A"}</p>
                                      {service.jobDetails?.description && (
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{service.jobDetails.description}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs md:text-sm text-slate-600 hidden lg:table-cell">
                                    {service.technician || "N/A"}
                                  </TableCell>
                                  <TableCell className="text-xs md:text-sm text-slate-600 hidden lg:table-cell">
                                    {service.supervisor || "N/A"}
                                  </TableCell>
                                  <TableCell className="font-medium text-xs md:text-sm">
                                    <span className="text-xs font-normal mr-0.5">₨</span>
                                    <span className="font-medium">{(service.cost || service.jobDetails?.amount || 0).toLocaleString()}</span>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    {service.invoice ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-blue-600 hover:text-blue-700 text-xs"
                                      >
                                        {formatInvoiceId({ _id: service.invoice.toString() })}
                                        <ExternalLink className="h-3 w-3 ml-1" />
                                      </Button>
                                    ) : (
                                      <span className="text-xs text-gray-400">N/A</span>
                                    )}
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
                            })
                          )}
                        </TableBody>
                      </Table>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* Files & Documents Tab */}
              <TabsContent
                value="files"
                className="mt-0 h-full overflow-y-auto data-[state=inactive]:hidden"
              >
                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                  {/* Upload Area */}
                  <Card className="p-4 md:p-6">
                    <h3 className="font-medium mb-4">Upload Files</h3>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
                      <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <h4 className="font-medium mb-1">Upload vehicle photos or documents</h4>
                      <p className="text-sm text-slate-600 mb-3">
                        Drag and drop files here, or click to browse
                      </p>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Choose Files
                      </Button>
                    </div>
                  </Card>

                  {/* Existing Files */}
                  <Card className="p-6">
                    <h3 className="font-medium mb-4">
                      Uploaded Files (0)
                    </h3>
                    <div className="text-center py-8 text-gray-500">
                      <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No files uploaded yet</p>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
