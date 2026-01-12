import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { Separator } from "./ui/separator";
import { 
  Car, 
  Search, 
  Filter, 
  Plus,
  Calendar,
  Wrench,
  Droplet,
  Gauge,
  User,
  ArrowRight,
  UserPlus,
  Mail,
  Phone,
  Upload,
  X,
  ImageIcon,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronDown
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { motion } from "motion/react";
import { VehicleProfile } from "./VehicleProfile";
import { vehiclesAPI, customersAPI, serviceHistoryAPI, jobsAPI } from "../api/client";
import { connectSocket, onJobUpdated } from "../lib/socket";
import { useThemeStyles } from "../hooks/useThemeStyles";

export function Vehicles() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [step, setStep] = useState<"customer" | "newCustomer" | "vehicle">("customer");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [vehicleImage, setVehicleImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showOwnerAlert, setShowOwnerAlert] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [oilType, setOilType] = useState("");
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeServices: 0,
    serviceDue: 0,
    overdue: 0,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<any | null>(null);
  const [editVehicleStatus, setEditVehicleStatus] = useState<string>("Active");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterServiceAge, setFilterServiceAge] = useState<string>("all");
  const { getButtonStyle } = useThemeStyles();

  // Filter and sort vehicles based on selected filters
  const filteredVehicles = vehicles
    .filter(vehicle => {
      const statusMatch = filterStatus === "all" || vehicle.status === filterStatus;
      return statusMatch;
    })
    .sort((a, b) => {
      if (filterServiceAge === "oldest") {
        // Sort by last service date (oldest first, no service date = oldest)
        const dateA = a.lastService ? new Date(a.lastService).getTime() : 0;
        const dateB = b.lastService ? new Date(b.lastService).getTime() : 0;
        return dateA - dateB;
      } else if (filterServiceAge === "newest") {
        // Sort by last service date (newest first)
        const dateA = a.lastService ? new Date(a.lastService).getTime() : 0;
        const dateB = b.lastService ? new Date(b.lastService).getTime() : 0;
        return dateB - dateA;
      } else if (filterServiceAge === "never") {
        // Filter only vehicles that have never been serviced
        return 0;
      }
      return 0;
    })
    .filter(vehicle => {
      if (filterServiceAge === "never") {
        return !vehicle.lastService;
      }
      return true;
    });

  const activeFiltersCount = (filterStatus !== "all" ? 1 : 0) + (filterServiceAge !== "all" ? 1 : 0);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterServiceAge("all");
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await vehiclesAPI.getAll(searchQuery || undefined);
      if (response.success) {
        setVehicles(response.data);
        calculateStats(response.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      const response = await jobsAPI.getAll();
      if (response.success && Array.isArray(response.data)) {
        // Count jobs that are either IN_PROGRESS or PENDING as active services
        const activeJobs = response.data.filter((job: any) => 
          job.status === "IN_PROGRESS" || job.status === "PENDING"
        );
        console.log("Active jobs count:", activeJobs.length, "Total jobs:", response.data.length, "Jobs:", response.data.map((j: any) => ({ id: j._id, status: j.status })));
        setStats(prev => ({ ...prev, activeServices: activeJobs.length }));
      } else {
        console.warn("Jobs API response format unexpected:", response);
        setStats(prev => ({ ...prev, activeServices: 0 }));
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
      setStats(prev => ({ ...prev, activeServices: 0 }));
    }
  }, []);

  const calculateStats = (vehiclesData: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    let serviceDue = 0;
    let overdue = 0;

    vehiclesData.forEach((vehicle) => {
      if (vehicle.nextService) {
        const nextServiceDate = new Date(vehicle.nextService);
        nextServiceDate.setHours(0, 0, 0, 0);

        if (nextServiceDate < today) {
          overdue++;
        } else if (nextServiceDate <= nextWeek) {
          serviceDue++;
        }
      }
    });

    setStats(prev => ({
      ...prev,
      totalVehicles: vehiclesData.length,
      serviceDue,
      overdue,
    }));
  };

  const fetchCustomers = async (searchTerm?: string) => {
    try {
      const response = await customersAPI.getAll(searchTerm);
      if (response.success) {
        setCustomers(response.data);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchJobs();
    
    // Connect Socket.IO and listen for updates
    const socket = connectSocket();
    const unsubscribe = onJobUpdated(() => {
      // Refresh vehicles and jobs when jobs are updated
      fetchVehicles();
      fetchJobs();
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Also fetch jobs when component mounts (separate effect to ensure it runs)
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Check for ID in URL params and open vehicle profile
  useEffect(() => {
    const vehicleId = searchParams.get('id');
    if (vehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => (v._id || v.id) === vehicleId);
      if (vehicle) {
        setSelectedVehicle(vehicle);
        // Clean up URL
        setSearchParams({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, vehicles]);

  useEffect(() => {
    if (customerSearch) {
      // When searching, debounce the search
      const timeoutId = setTimeout(() => {
        fetchCustomers(customerSearch);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      // When no search term, show recently added customers (last 10)
      fetchCustomers();
    }
  }, [customerSearch]);

  // Sort customers by creation date (most recent first)
  const sortedCustomers = [...customers].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA; // Most recent first
  });

  // If searching, filter the results; otherwise show all (already sorted by recent)
  const filteredCustomers = customerSearch
    ? sortedCustomers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.phone.includes(customerSearch) ||
        (customer.email && customer.email.toLowerCase().includes(customerSearch.toLowerCase()))
      )
    : sortedCustomers.slice(0, 10); // Show top 10 most recent when not searching

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setStep("vehicle");
  };

  const handleAddNewCustomer = () => {
    setStep("newCustomer");
  };

  const handleBackToCustomerSearch = () => {
    setStep("customer");
  };

  const handleNewCustomerComplete = () => {
    setStep("vehicle");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVehicleImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVehicleImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setVehicleImage(null);
  };

  const handleCloseDialog = () => {
    setIsAddVehicleOpen(false);
    setTimeout(() => {
      setStep("customer");
      setCustomerSearch("");
      setSelectedCustomer(null);
      setVehicleImage(null);
      setShowOwnerAlert(false);
      setVehicleType("");
      setFuelType("");
      setOilType("");
    }, 200);
  };

  const handleVehicleClick = (vehicle: typeof vehicles[0]) => {
    setSelectedVehicle(vehicle);
  };

  const handleCloseVehicleProfile = () => {
    setSelectedVehicle(null);
    setSearchParams({});
    // Navigate to vehicles page
    navigate("/vehicles");
  };

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    
    try {
      const vehicleId = vehicleToDelete._id || vehicleToDelete.id;
      const response = await vehiclesAPI.delete(vehicleId);
      if (response.success) {
        setDeleteDialogOpen(false);
        setVehicleToDelete(null);
        setSelectedVehicle(null);
        fetchVehicles();
      } else {
        alert(response.message || "Failed to delete vehicle");
      }
    } catch (err: any) {
      console.error("Error deleting vehicle:", err);
      alert(err.message || "Failed to delete vehicle");
    }
  };

  const handleDeleteClick = (vehicle: any) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setVehicleToDelete(null);
  };

  const handleCreateJobCard = (vehicle: any) => {
    const vehicleId = vehicle._id || vehicle.id;
    const customerId = vehicle.customer?._id || vehicle.customer?.id;
    if (customerId && vehicleId) {
      navigate(`/create-job-card?customerId=${customerId}&vehicleId=${vehicleId}`);
    } else {
      alert("Cannot create job card: Missing customer or vehicle information");
    }
  };

  const handleCreateInvoice = (vehicle: any) => {
    const vehicleId = vehicle._id || vehicle.id;
    const customerId = vehicle.customer?._id || vehicle.customer?.id;
    if (customerId && vehicleId) {
      navigate(`/create-invoice?customerId=${customerId}&vehicleId=${vehicleId}`);
    } else {
      alert("Cannot create invoice: Missing customer or vehicle information");
    }
  };

  const handleEditVehicle = (vehicle: any) => {
    setVehicleToEdit(vehicle);
    setEditVehicleStatus(vehicle.status || "Active");
    setIsEditDialogOpen(true);
  };

  const handleEditCancel = () => {
    setIsEditDialogOpen(false);
    setVehicleToEdit(null);
    setEditVehicleStatus("Active");
  };

  const handleSaveEditVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vehicleToEdit) return;

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const make = formData.get('make') as string;
      const model = formData.get('model') as string;
      const yearStr = formData.get('year') as string;
      const plateNo = formData.get('plate') as string;
      const mileageStr = formData.get('mileage') as string;
      const oilType = formData.get('oilType') as string;
      if (!make || !model || !yearStr || !plateNo) {
        alert("Please fill in all required fields");
        return;
      }
      
      const year = parseInt(yearStr);
      const mileage = parseInt(mileageStr) || 0;
      
      if (isNaN(year) || year < 1900 || year > 2025) {
        alert("Please enter a valid year");
        return;
      }

      const vehicleId = vehicleToEdit._id || vehicleToEdit.id;
      await vehiclesAPI.update(vehicleId, {
        make: make.trim(),
        model: model.trim(),
        year,
        plateNo: plateNo.trim(),
        mileage,
        oilType: oilType?.trim() || undefined,
        status: editVehicleStatus || undefined,
      });
      
      toast.success("Vehicle updated successfully");
      handleEditCancel();
      fetchVehicles();
      
      // If this vehicle is currently selected, refresh it
      if (selectedVehicle && (selectedVehicle._id || selectedVehicle.id) === vehicleId) {
        const updatedResponse = await vehiclesAPI.getById(vehicleId);
        if (updatedResponse.success) {
          setSelectedVehicle(updatedResponse.data);
        }
      }
    } catch (err: any) {
      console.error("Failed to update vehicle:", err);
      alert(err.message || "Failed to update vehicle. Please try again.");
    }
  };

  // If a vehicle is selected, show the VehicleProfile
  if (selectedVehicle) {
    return (
      <>
      <VehicleProfile
        vehicle={{
          id: selectedVehicle._id || selectedVehicle.id,
          make: selectedVehicle.make,
          model: selectedVehicle.model,
          year: selectedVehicle.year,
          plate: selectedVehicle.plateNo,
          ownerId: selectedVehicle.customer?._id || selectedVehicle.customer?.id,
          ownerName: selectedVehicle.customer?.name || 'N/A',
        }}
        onClose={handleCloseVehicleProfile}
        onEdit={() => handleEditVehicle(selectedVehicle)}
        onDelete={() => handleDeleteClick(selectedVehicle)}
        onViewOwner={(ownerId) => {
          // Navigate to customers page and highlight this customer
          navigate(`/customers?customerId=${ownerId}`);
        }}
        onCreateJobCard={() => handleCreateJobCard(selectedVehicle)}
        onCreateInvoice={() => handleCreateInvoice(selectedVehicle)}
      />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{vehicleToDelete?.make} {vehicleToDelete?.model}</strong> (Plate: {vehicleToDelete?.plateNo})? 
                This action cannot be undone. The vehicle will be marked as inactive but service history will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVehicle}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Vehicle Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Vehicle</DialogTitle>
              <DialogDescription>
                Update vehicle information for {vehicleToEdit?.make} {vehicleToEdit?.model}
              </DialogDescription>
            </DialogHeader>
            {vehicleToEdit && (
              <form onSubmit={handleSaveEditVehicle} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-make">Make *</Label>
                    <Input
                      id="edit-make"
                      name="make"
                      defaultValue={vehicleToEdit.make}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-model">Model *</Label>
                    <Input
                      id="edit-model"
                      name="model"
                      defaultValue={vehicleToEdit.model}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-year">Year *</Label>
                    <Input
                      id="edit-year"
                      name="year"
                      type="number"
                      min="1900"
                      max="2025"
                      defaultValue={vehicleToEdit.year}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-plate">Plate Number *</Label>
                    <Input
                      id="edit-plate"
                      name="plate"
                      defaultValue={vehicleToEdit.plateNo}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-mileage">Mileage (km)</Label>
                    <Input
                      id="edit-mileage"
                      name="mileage"
                      type="number"
                      min="0"
                      defaultValue={vehicleToEdit.mileage || 0}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-oilType">Oil Type</Label>
                    <Input
                      id="edit-oilType"
                      name="oilType"
                      defaultValue={vehicleToEdit.oilType || ""}
                      placeholder="e.g., 5w30-synthetic"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-status">Status</Label>
                    <Select value={editVehicleStatus} onValueChange={setEditVehicleStatus}>
                      <SelectTrigger id="edit-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Due">Due</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleEditCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" style={getButtonStyle()}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1 lg:mb-2">Vehicles & Service History</h1>
          <p className="text-sm lg:text-base text-gray-600">Track all registered vehicles and their service records</p>
        </div>
        <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full lg:w-auto text-white" 
              size="sm"
              style={getButtonStyle()}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = getButtonStyle(true).backgroundColor;
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = getButtonStyle().backgroundColor;
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {step === "customer" && "Select Customer"}
                {step === "newCustomer" && "Add New Customer"}
                {step === "vehicle" && "Add Vehicle"}
              </DialogTitle>
              <DialogDescription>
                {step === "customer" && "Search for an existing customer or add a new one"}
                {step === "newCustomer" && "Enter customer details to create a new record"}
                {step === "vehicle" && `Adding vehicle for ${selectedCustomer?.name || "new customer"}`}
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: Customer Selection */}
            {step === "customer" && (
              <div className="space-y-4 mt-4">
                {/* Info Alert */}
                <Alert className="border-blue-200 bg-blue-50">
                  <User className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Select an existing customer or add a new one to continue
                  </AlertDescription>
                </Alert>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customer by name, email, or phone..."
                    className="pl-10"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                {filteredCustomers.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer._id || customer.id}
                        className="p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all group"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium group-hover:text-blue-600 transition-colors">{customer.name}</p>
                              <div className="flex items-center gap-3 text-sm text-gray-600 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {customer.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </span>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : customerSearch ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-2">No customers found</p>
                    <p className="text-xs text-gray-500">Try a different search or add a new customer</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500">Showing recently added customers</p>
                  </div>
                )}

                <Separator />

                <Button
                  variant="outline"
                  className="w-full border-dashed border-2 h-12 hover:border-blue-400 hover:bg-blue-50"
                  onClick={handleAddNewCustomer}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New Customer
                </Button>
              </div>
            )}

            {/* Step 2: New Customer Form */}
            {step === "newCustomer" && (
              <form className="space-y-6 mt-4">
                <div className="space-y-4">
                  <h4 className="text-sm">Customer Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="(555) 123-4567" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john@example.com" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm">Address Information</h4>
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input id="street" placeholder="123 Main St" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="area">Area/Region</Label>
                      <Input id="area" placeholder="e.g., Soan Garden" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" placeholder="e.g., Islamabad" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input id="state" placeholder="e.g., Punjab" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleBackToCustomerSearch}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 text-white"
                    style={getButtonStyle()}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = getButtonStyle(true).backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = getButtonStyle().backgroundColor;
                    }}
                    onClick={handleNewCustomerComplete}
                  >
                    Continue to Vehicle
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Vehicle Form */}
            {step === "vehicle" && (
              <form className="space-y-6 mt-4">
                {/* Owner Alert if no customer selected */}
                {!selectedCustomer && showOwnerAlert && (
                  <Alert className="border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-900">
                      Please select an owner for this vehicle or{" "}
                      <button
                        type="button"
                        onClick={handleAddNewCustomer}
                        className="font-medium underline hover:text-orange-700"
                      >
                        add a new customer
                      </button>
                      .
                    </AlertDescription>
                  </Alert>
                )}

                {/* Selected Owner Display */}
                {selectedCustomer && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Vehicle Owner</p>
                          <p className="font-medium">{selectedCustomer.name}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBackToCustomerSearch}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}

                {/* Vehicle Image Upload */}
                <div className="space-y-3">
                  <Label>Vehicle Image</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Image Preview */}
                    {vehicleImage ? (
                      <div className="relative aspect-video border-2 border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                        <img 
                          src={vehicleImage} 
                          alt="Vehicle preview" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-video border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                        <div className="text-center">
                          <ImageIcon className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No image uploaded</p>
                        </div>
                      </div>
                    )}

                    {/* Upload Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
                        isDragging 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <label htmlFor="vehicle-image" className="cursor-pointer text-center p-4 w-full h-full flex flex-col items-center justify-center">
                        <Upload className="h-10 w-10 text-slate-400 mb-3" />
                        <p className="text-sm font-medium text-slate-700 mb-1">
                          {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                        </p>
                        <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                        <input
                          id="vehicle-image"
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Basic Vehicle Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="make">Vehicle Make *</Label>
                      <Input id="make" name="make" placeholder="e.g., Toyota, Honda, BMW" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Vehicle Model *</Label>
                      <Input id="model" name="model" placeholder="e.g., Corolla, Civic, X5" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year *</Label>
                      <Input 
                        id="year" 
                        name="year"
                        type="number" 
                        placeholder="2024" 
                        min="1900"
                        max="2025"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Vehicle Type *</Label>
                      <Select value={vehicleType} onValueChange={setVehicleType}>
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedan">Sedan</SelectItem>
                          <SelectItem value="suv">SUV</SelectItem>
                          <SelectItem value="hatchback">Hatchback</SelectItem>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                          <SelectItem value="coupe">Coupe</SelectItem>
                          <SelectItem value="convertible">Convertible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plate">License Plate *</Label>
                      <Input id="plate" name="plate" placeholder="ABC-1234" required />
                    </div>
                  </div>
                </div>

                {/* Mileage & Service Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Mileage & Service Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Current Mileage (km) *</Label>
                      <div className="relative">
                        <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                          id="mileage" 
                          name="mileage"
                          type="number"
                          placeholder="45230" 
                          className="pl-10"
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="daily-mileage">Daily Mileage (km/day) *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                          id="daily-mileage" 
                          name="daily-mileage"
                          type="number"
                          placeholder="50" 
                          className="pl-10"
                          required 
                        />
                      </div>
                      <p className="text-xs text-slate-500">Used to calculate service due dates</p>
                    </div>
                  </div>
                </div>

                {/* Fuel & Oil Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Fuel & Oil Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fuel-type">Fuel Type *</Label>
                      <Select value={fuelType} onValueChange={setFuelType}>
                        <SelectTrigger id="fuel-type">
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="petrol">Petrol</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="electric">Electric</SelectItem>
                          <SelectItem value="cng">CNG</SelectItem>
                          <SelectItem value="lpg">LPG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="oil-type">Oil Type *</Label>
                      <Select value={oilType} onValueChange={setOilType}>
                        <SelectTrigger id="oil-type">
                          <SelectValue placeholder="Select oil type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5w30-synthetic">5W-30 Synthetic</SelectItem>
                          <SelectItem value="5w40-synthetic">5W-40 Synthetic</SelectItem>
                          <SelectItem value="10w30-synthetic">10W-30 Synthetic</SelectItem>
                          <SelectItem value="10w40-synthetic">10W-40 Synthetic</SelectItem>
                          <SelectItem value="0w20-synthetic">0W-20 Synthetic</SelectItem>
                          <SelectItem value="5w30-semi">5W-30 Semi-Synthetic</SelectItem>
                          <SelectItem value="10w40-mineral">10W-40 Mineral</SelectItem>
                          <SelectItem value="15w40-mineral">15W-40 Mineral</SelectItem>
                          <SelectItem value="na">N/A (Electric)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleBackToCustomerSearch}
                  >
                    Back to Owner
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 text-white"
                    style={getButtonStyle()}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = getButtonStyle(true).backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = getButtonStyle().backgroundColor;
                    }}
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!selectedCustomer) {
                        setShowOwnerAlert(true);
                        return;
                      }
                      try {
                        const form = e.currentTarget.closest('form');
                        if (!form) return;
                        
                        const formData = new FormData(form);
                        const make = formData.get('make') as string;
                        const model = formData.get('model') as string;
                        const yearStr = formData.get('year') as string;
                        const plateNo = formData.get('plate') as string;
                        const mileageStr = formData.get('mileage') as string;
                        
                        // Validate required fields
                        if (!make || !model || !yearStr || !plateNo || !oilType) {
                          alert("Please fill in all required fields");
                          return;
                        }
                        
                        const year = parseInt(yearStr);
                        const mileage = parseInt(mileageStr) || 0;
                        
                        if (isNaN(year) || year < 1900 || year > 2025) {
                          alert("Please enter a valid year");
                          return;
                        }
                        
                        await vehiclesAPI.create({
                          customer: selectedCustomer._id || selectedCustomer.id,
                          make: make.trim(),
                          model: model.trim(),
                          year,
                          plateNo: plateNo.trim(),
                          mileage,
                          oilType: oilType.trim(),
                          status: 'Active'
                        });
                        
                        handleCloseDialog();
                        fetchVehicles();
                      } catch (err: any) {
                        console.error("Error creating vehicle:", err);
                        alert(err.message || "Failed to create vehicle");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-[#c53032] h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Vehicles</p>
                  <p className="text-3xl">{stats.totalVehicles}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Car className="h-6 w-6 text-[#c53032]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-[#d94848] h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Services</p>
                  <p className="text-3xl">{stats.activeServices}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Wrench className="h-6 w-6 text-[#c53032]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-l-4 border-l-[#e15b5b] h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Service Due</p>
                  <p className="text-3xl">{stats.serviceDue}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-[#c53032]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-l-4 border-l-[#f87171] h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Overdue</p>
                  <p className="text-3xl">{stats.overdue}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-[#c53032]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by plate number, owner, or vehicle model..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#c53032] text-white text-xs flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                        Clear all
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Due">Due</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Service History</Label>
                    <Select value={filterServiceAge} onValueChange={setFilterServiceAge}>
                      <SelectTrigger>
                        <SelectValue placeholder="All vehicles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All vehicles</SelectItem>
                        <SelectItem value="oldest">Oldest service first</SelectItem>
                        <SelectItem value="newest">Newest service first</SelectItem>
                        <SelectItem value="never">Never serviced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full text-white"
                    style={getButtonStyle()}
                    onClick={() => setIsFilterOpen(false)}
                  >
                    Apply Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Registry</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#c53032]" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
              {error}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {vehicles.length === 0 ? "No vehicles found" : "No vehicles match the selected filters"}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {filteredVehicles.map((vehicle, index) => (
                  <motion.div
                    key={vehicle._id || vehicle.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border rounded-lg space-y-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                onClick={() => handleVehicleClick(vehicle)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Car className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                      <p className="text-xs text-gray-500">{vehicle.year} • {vehicle.plateNo}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      vehicle.status === "Active" ? "bg-green-100 text-green-700 border-green-200" :
                      vehicle.status === "Due" ? "bg-orange-100 text-orange-700 border-orange-200" :
                      "bg-red-100 text-red-700 border-red-200"
                    }
                  >
                    {vehicle.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Owner:</span>
                    <span className="font-medium">{vehicle.customer?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mileage:</span>
                    <span>{vehicle.mileage?.toLocaleString() || 0} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Service:</span>
                    <span>{vehicle.lastService ? new Date(vehicle.lastService).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Next Service:</span>
                    <span>{vehicle.nextService ? new Date(vehicle.nextService).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Oil Type:</span>
                    <span>{vehicle.oilType || 'N/A'}</span>
                  </div>
                </div>
              </motion.div>
                ))}
              </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Plate Number</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead>Last Service</TableHead>
                <TableHead>Next Service</TableHead>
                <TableHead>Oil Type</TableHead>
                <TableHead>History</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle, index) => (
                <motion.tr
                  key={vehicle._id || vehicle.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b cursor-pointer hover:bg-blue-50/50 transition-colors"
                  onClick={() => handleVehicleClick(vehicle)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Car className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                        <p className="text-sm text-gray-500">{vehicle.year}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{vehicle.plateNo}</TableCell>
                  <TableCell>{vehicle.customer?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-gray-400" />
                      <span>{vehicle.mileage?.toLocaleString() || 0} km</span>
                    </div>
                  </TableCell>
                  <TableCell>{vehicle.lastService ? new Date(vehicle.lastService).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{vehicle.nextService ? new Date(vehicle.nextService).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Droplet className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{vehicle.oilType || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">View History</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        vehicle.status === "Active" ? "bg-green-100 text-green-700 border-green-200" :
                        vehicle.status === "Due" ? "bg-orange-100 text-orange-700 border-orange-200" :
                        "bg-red-100 text-red-700 border-red-200"
                      }
                    >
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      View Details →
                    </Badge>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
          </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{vehicleToDelete?.make} {vehicleToDelete?.model}</strong> (Plate: {vehicleToDelete?.plateNo})? 
              This action cannot be undone. The vehicle will be marked as inactive but service history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicle}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Vehicle Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update vehicle information for {vehicleToEdit?.make} {vehicleToEdit?.model}
            </DialogDescription>
          </DialogHeader>
          {vehicleToEdit && (
            <form onSubmit={handleSaveEditVehicle} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-make">Make *</Label>
                  <Input
                    id="edit-make"
                    name="make"
                    defaultValue={vehicleToEdit.make}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-model">Model *</Label>
                  <Input
                    id="edit-model"
                    name="model"
                    defaultValue={vehicleToEdit.model}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-year">Year *</Label>
                  <Input
                    id="edit-year"
                    name="year"
                    type="number"
                    min="1900"
                    max="2025"
                    defaultValue={vehicleToEdit.year}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-plate">Plate Number *</Label>
                  <Input
                    id="edit-plate"
                    name="plate"
                    defaultValue={vehicleToEdit.plateNo}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-mileage">Mileage (km)</Label>
                  <Input
                    id="edit-mileage"
                    name="mileage"
                    type="number"
                    min="0"
                    defaultValue={vehicleToEdit.mileage || 0}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-oilType">Oil Type</Label>
                  <Input
                    id="edit-oilType"
                    name="oilType"
                    defaultValue={vehicleToEdit.oilType || ""}
                    placeholder="e.g., 5w30-synthetic"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editVehicleStatus} onValueChange={setEditVehicleStatus}>
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Due">Due</SelectItem>
                      <SelectItem value="Overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleEditCancel}>
                  Cancel
                </Button>
                <Button type="submit" style={getButtonStyle()}>
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
