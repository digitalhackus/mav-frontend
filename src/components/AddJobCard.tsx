import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { 
  X, 
  User,
  Car,
  FileText,
  Wrench,
  Clock,
  DollarSign,
  AlertCircle,
  Loader2,
  Plus,
  Check,
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./ui/dialog";
import { AddCustomer } from "./AddCustomer";
import { customersAPI, vehiclesAPI } from "../api/client";

interface AddJobCardProps {
  onClose?: () => void;
  onSubmit?: (data: any) => void;
}

const mockTechnicians = [
  "Mike T.",
  "Chris R.",
  "David L.",
  "Alex K.",
  "Sarah M."
];

export function AddJobCard({ onClose, onSubmit }: AddJobCardProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assignedTechnician, setAssignedTechnician] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [notes, setNotes] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [vehicleSearchOpen, setVehicleSearchOpen] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

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
    setSelectedCustomer(customerId);
  };

  useEffect(() => {
    if (selectedCustomer) {
      fetchVehicles(selectedCustomer);
    } else {
      setVehicles([]);
      setSelectedVehicle("");
    }
  }, [selectedCustomer]);

  const fetchCustomers = async (search?: string) => {
    try {
      setLoadingCustomers(true);
      const response = await customersAPI.getAll(search);
      if (response.success) {
        setCustomers(response.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch customers:", err);
      if (err.isAuthError && err.status === 401) {
        toast.error(err.message || "Session expired, please log in again");
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else if (!err.isAuthError) {
        toast.error("Failed to load customers. Please try again.");
      }
    } finally {
      setLoadingCustomers(false);
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

  const customer = customers.find(c => (c._id || c.id) === selectedCustomer);
  const vehicle = vehicles.find(v => {
    const vehicleId = v._id || v.id;
    return vehicleId === selectedVehicle;
  });

  // Load vehicles when popover opens
  useEffect(() => {
    if (vehicleSearchOpen && selectedCustomer && !vehicleSearchQuery) {
      fetchVehicles(selectedCustomer);
    }
  }, [vehicleSearchOpen, selectedCustomer]);

  // Debounce vehicle search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (vehicleSearchOpen && vehicleSearchQuery && selectedCustomer) {
        // Filter vehicles client-side since API might not support vehicle search
        // You can implement API search here if available
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [vehicleSearchQuery, vehicleSearchOpen, selectedCustomer]);

  const handleVehicleSelect = (vehicleId: string) => {
    setVehicleSearchOpen(false);
    setVehicleSearchQuery("");
    setSelectedVehicle(vehicleId);
  };

  const filteredVehicles = vehicles.filter(v => {
    if (!vehicleSearchQuery) return true;
    const query = vehicleSearchQuery.toLowerCase();
    const make = (v.make || "").toLowerCase();
    const model = (v.model || "").toLowerCase();
    const plateNo = (v.plateNo || "").toLowerCase();
    const year = (v.year || "").toString().toLowerCase();
    return make.includes(query) || model.includes(query) || plateNo.includes(query) || year.includes(query);
  });

  const handleSubmit = () => {
    if (!selectedCustomer || !selectedVehicle || !serviceDescription || !assignedTechnician) {
      alert("Please fill in all required fields");
      return;
    }

    if (!customer || !vehicle) {
      alert("Please select a valid customer and vehicle");
      return;
    }

    // Parse estimated time to hours
    let estimatedTimeHours: number | undefined;
    if (estimatedTime) {
      const timeStr = estimatedTime.toLowerCase();
      if (timeStr.includes('h')) {
        estimatedTimeHours = parseFloat(timeStr.replace('h', '').trim());
      } else if (timeStr.includes('m')) {
        estimatedTimeHours = parseFloat(timeStr.replace('m', '').trim()) / 60;
      } else {
        estimatedTimeHours = parseFloat(timeStr) || undefined;
      }
    }

    const jobCardData = {
      customer: customer._id || customer.id,
      vehicle: {
        make: vehicle?.make || "",
        model: vehicle?.model || "",
        year: vehicle?.year || null,
        plateNo: vehicle?.plateNo || ""
      },
      title: serviceDescription.split('\n')[0] || serviceDescription.substring(0, 50),
      description: serviceDescription,
      status: "PENDING",
      technician: assignedTechnician,
      estimatedTimeHours: estimatedTimeHours,
      amount: parseFloat(estimatedCost) || 0,
      notes: notes
    };

    if (onSubmit) {
      onSubmit(jobCardData);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center justify-between border-b shrink-0 bg-[#c53032] text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#a6212a] flex items-center justify-center">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Create Job Card</h2>
            <p className="text-xs text-red-100">Create a new service job card</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1">
        <div className="p-6 space-y-8">
          {/* Customer & Vehicle Selection */}
          <div className="space-y-8 max-w-3xl">
            {/* Customer Selection */}
            <div>
              <div className="mb-4">
                <h3 className="mb-1">Select Customer</h3>
                <p className="text-sm text-slate-500">Choose an existing customer or add a new one</p>
              </div>
              <div className="space-y-3">
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
                      ) : customer ? (
                        <span className="font-medium">{customer.name}</span>
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
                          {customers.map((customer) => {
                            const isSelected = (customer._id || customer.id) === selectedCustomer;
                            return (
                            <CommandItem
                              key={customer._id || customer.id}
                              value={`${customer.name} ${customer.phone} ${customer.email || ''} ${customer._id || customer.id}`}
                              onSelect={() => handleCustomerSelect(customer._id || customer.id)}
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
                                <span className="text-xs text-gray-400 mt-0.5">ID: {(customer._id || customer.id).slice(-6)}</span>
                              </div>
                            </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                </div>
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
                          setSelectedCustomer(response.data._id || response.data.id);
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
                          setSelectedCustomer(response.data._id || response.data.id);
                          setIsAddCustomerDialogOpen(false);
                          await fetchCustomers();
                          toast.success("Customer created successfully");
                          // Note: Vehicle selection will be available in the dropdown after customer is selected
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
            {selectedCustomer && (
              <div>
                <div className="mb-4">
                  <h3 className="mb-1">Select Vehicle</h3>
                  <p className="text-sm text-slate-500">Choose a vehicle registered to this customer</p>
                </div>
            <div className="space-y-3">
                  <Popover open={vehicleSearchOpen} onOpenChange={(open) => {
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
                disabled={!selectedCustomer || loadingVehicles}
                        onClick={() => {
                          if (selectedCustomer) {
                            setVehicleSearchOpen(true);
                          }
                        }}
                      >
                        {!selectedCustomer ? (
                          <span className="text-muted-foreground">Select customer first...</span>
                        ) : loadingVehicles ? (
                          <span className="text-muted-foreground">Loading vehicles...</span>
                        ) : vehicle ? (
                          <span className="font-medium">{vehicle.make} {vehicle.model} ({vehicle.plateNo})</span>
                        ) : (
                          <span className="text-muted-foreground">Search vehicle...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
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
                            {filteredVehicles.map((v) => {
                              const vehicleId = v._id || v.id;
                              const isSelected = vehicleId === selectedVehicle;
                      return (
                                <CommandItem
                                  key={vehicleId}
                                  value={`${v.make} ${v.model} ${v.plateNo} ${v.year}`}
                                  onSelect={() => handleVehicleSelect(vehicleId)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2">
                                      <span className="font-medium">{v.make} {v.model}</span>
                                      {isSelected && <Check className="h-4 w-4 text-[#c53032]" />}
                    </div>
                                    <span className="text-xs text-gray-500">{v.plateNo} • {v.year}</span>
                    </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  </div>
                </div>
              )}
            </div>

          {/* Service Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-medium">Service Details</h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Service Description */}
              <div className="col-span-2 space-y-2">
                <Label className="text-xs text-gray-600">Service Description *</Label>
                <Textarea 
                  placeholder="Describe the service or repair needed..."
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <Label className="text-xs text-gray-600">Priority Level *</Label>
                </div>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#c53032]"></div>
                        <span>High Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#c53032]"></div>
                        <span>Medium Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#c53032]"></div>
                        <span>Low Priority</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned Technician */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <Label className="text-xs text-gray-600">Assign Technician *</Label>
                </div>
                <Select value={assignedTechnician} onValueChange={setAssignedTechnician}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTechnicians.map((tech) => (
                      <SelectItem key={tech} value={tech}>
                        {tech}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estimated Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <Label className="text-xs text-gray-600">Estimated Time</Label>
                </div>
                <Input 
                  placeholder="e.g., 2h, 30m, 1.5h"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                />
              </div>

              {/* Estimated Cost */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <Label className="text-xs text-gray-600">Estimated Cost (₨)</Label>
                </div>
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </div>

              {/* Additional Notes */}
              <div className="col-span-2 space-y-2">
                <Label className="text-xs text-gray-600">Additional Notes</Label>
                <Textarea 
                  placeholder="Any additional information or special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </div>
          </div>

          {/* Summary Card */}
          {estimatedCost && (
            <div className="p-4 border rounded-lg bg-[#fde7e7] border-[#f1999b]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Estimated Total</p>
                  <p className="text-2xl text-[#c53032]">
                    <span className="text-xl font-normal mr-0.5">₨</span>
                    <span className="font-semibold">{parseFloat(estimatedCost).toLocaleString()}</span>
                  </p>
                </div>
                {estimatedTime && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Estimated Time</p>
                    <p className="text-lg font-medium">{estimatedTime}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 pt-4 border-t shrink-0 bg-gray-50">
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className="bg-[#c53032] hover:bg-[#a6212a]"
            onClick={handleSubmit}
          >
            <Wrench className="h-4 w-4 mr-2" />
            Create Job Card
          </Button>
        </div>
      </div>
    </div>
  );
}
