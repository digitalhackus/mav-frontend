import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "./ui/dialog";
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
import { Badge } from "./ui/badge";
import { CustomerProfile } from "./CustomerProfile";
import { AddCustomer } from "./AddCustomer";
import {
  Search,
  Plus,
  Users,
  Car,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Loader2,
  Trash2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { motion } from "motion/react";
import { customersAPI, dashboardAPI } from "../api/client";
import { useThemeStyles } from "../hooks/useThemeStyles";

interface CustomersProps {
  onNavigate?: (page: string) => void;
}

export function Customers({ onNavigate }: CustomersProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState("recent");
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const { getButtonStyle } = useThemeStyles();

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await customersAPI.getAll(searchTerm || undefined);
      if (response.success && Array.isArray(response.data)) {
        setCustomers(response.data);
      } else {
        setCustomers([]);
      }
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message || "Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await dashboardAPI.getSummary();
      if (response.success) {
        setSummary(response.data);
      }
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  };

  // Fetch summary only on mount
  useEffect(() => {
    fetchSummary();
  }, []);

  // Fetch customers on mount and when searchTerm changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCustomers();
    }, searchTerm ? 300 : 0); // No delay on initial mount, 300ms delay for search
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Check for ID in URL params and open customer profile
  useEffect(() => {
    const customerId = searchParams.get('id');
    if (customerId && customers.length > 0) {
      const customer = customers.find(c => (c._id || c.id) === customerId);
      if (customer) {
        setSelectedCustomer(customer);
        // Clean up URL
        setSearchParams({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, customers]);

  const filteredCustomers = [...customers]
    .sort((a, b) => {
      try {
        switch (sortBy) {
          case "recent":
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          case "oldest":
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          case "name-asc":
            return (a.name || '').localeCompare(b.name || '');
          case "name-desc":
            return (b.name || '').localeCompare(a.name || '');
          default:
            return 0;
        }
      } catch (error) {
        console.error('Sort error:', error);
        return 0;
      }
    });

  const handleViewProfile = (customer: any) => {
    setSelectedCustomer(customer);
  };

  const handleCloseProfile = () => {
    setSelectedCustomer(null);
    setSearchParams({});
    // Update URL to remove customer view from history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // If no history, just update to customers page
      window.history.replaceState({ page: "customers" }, "", "/customers");
    }
  };

  const handleDeleteClick = (customer: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    
    try {
      const response = await customersAPI.delete(customerToDelete._id || customerToDelete.id);
      if (response.success) {
        setDeleteDialogOpen(false);
        setCustomerToDelete(null);
        fetchCustomers();
        if (selectedCustomer && (selectedCustomer._id === customerToDelete._id || selectedCustomer.id === customerToDelete.id)) {
          setSelectedCustomer(null);
        }
      } else {
        alert(response.message || "Failed to delete customer");
      }
    } catch (err: any) {
      console.error("Error deleting customer:", err);
      alert(err.message || "Failed to delete customer");
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  // If a customer is selected, show the CustomerProfile (full page)
  if (selectedCustomer) {
    return (
      <CustomerProfile 
        customer={selectedCustomer} 
        onClose={handleCloseProfile}
        onDelete={() => {
          handleDeleteClick(selectedCustomer, { stopPropagation: () => {} } as React.MouseEvent);
          handleCloseProfile();
        }}
        onNavigate={onNavigate}
      />
    );
  }

  const handleCreateCustomer = async (data: any) => {
    try {
      await customersAPI.create({
        name: data.fullName,
        phone: data.phone,
        email: data.email || undefined,
        address: `${data.street}, ${data.area}, ${data.city}, ${data.state}`.trim() || undefined
      });
      setIsDialogOpen(false);
      fetchCustomers();
      fetchSummary();
    } catch (err: any) {
      console.error("Failed to create customer:", err);
      alert(err.message || "Failed to create customer");
    }
  };

  // Error boundary - if there's a critical error, show error message
  if (error && !loading && customers.length === 0) {
    return (
      <div className="space-y-4 lg:space-y-6 p-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
          <h2 className="font-semibold mb-2">Error loading customers</h2>
          <p>{error}</p>
          <Button 
            onClick={() => fetchCustomers()} 
            className="mt-4 text-white"
            size="sm"
            style={getButtonStyle()}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = getButtonStyle(true).backgroundColor;
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = getButtonStyle().backgroundColor;
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1 lg:mb-2">Customer Management</h1>
          <p className="text-sm lg:text-base text-gray-600">View and manage all customer information</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full lg:w-auto text-white" 
              size="sm"
              style={getButtonStyle()}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = getButtonStyle(true).backgroundColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = getButtonStyle().backgroundColor;
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] p-0 bg-transparent border-0 shadow-none [&>button]:hidden" aria-describedby={undefined}>
            <DialogTitle className="sr-only">Add New Customer</DialogTitle>
            <AddCustomer 
              onClose={() => setIsDialogOpen(false)}
              onSubmit={handleCreateCustomer}
              onSaveAndAddVehicle={(data) => {
                handleCreateCustomer(data);
                setIsDialogOpen(false);
                if (onNavigate) {
                  onNavigate("vehicles");
                }
              }}
            />
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
          <Card className="border-l-4 border-[#c53032] h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Customers</p>
                  <p className="text-3xl">{summary?.totalCustomers || customers.length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Users className="h-6 w-6 text-[#c53032]" />
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
          <Card className="border-l-4 border-[#d94848] h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active This Month</p>
                  <p className="text-3xl">{customers.length}</p>
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
          transition={{ delay: 0.3 }}
        >
          <Card className="border-l-4 border-[#e15b5b] h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Jobs</p>
                  <p className="text-3xl">{summary?.jobsByStatus?.PENDING || 0}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Users className="h-6 w-6 text-[#c53032]" />
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
          <Card className="border-l-4 border-[#f87171] h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Today's Revenue</p>
                  <p className="text-3xl">
                    <span className="text-2xl font-normal mr-0.5">₨</span>
                    <span className="font-semibold">{summary?.todayRevenue?.toLocaleString() || 0}</span>
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Car className="h-6 w-6 text-[#c53032]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search Bar & Sort */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone number..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <SelectValue placeholder="Sort by..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Most Recent
                  </div>
                </SelectItem>
                <SelectItem value="oldest">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Oldest First
                  </div>
                </SelectItem>
                <SelectItem value="name-asc">
                  <div className="flex items-center gap-2">
                  <ArrowUp className="h-3.5 w-3.5 text-[#c53032]" />
                    Name (A-Z)
                  </div>
                </SelectItem>
                <SelectItem value="name-desc">
                  <div className="flex items-center gap-2">
                  <ArrowDown className="h-3.5 w-3.5 text-[#c53032]" />
                    Name (Z-A)
                  </div>
                </SelectItem>
                <SelectItem value="spent-high">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-[#c53032]" />
                    Highest Spent
                  </div>
                </SelectItem>
                <SelectItem value="spent-low">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-[#c53032]" />
                    Lowest Spent
                  </div>
                </SelectItem>
                <SelectItem value="services-high">
                  <div className="flex items-center gap-2">
                  <ArrowUp className="h-3.5 w-3.5 text-[#c53032]" />
                    Most Services
                  </div>
                </SelectItem>
                <SelectItem value="services-low">
                  <div className="flex items-center gap-2">
                  <ArrowDown className="h-3.5 w-3.5 text-[#c53032]" />
                    Least Services
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
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
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No customers found</div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {filteredCustomers.map((customer, index) => (
              <motion.div
                key={customer._id || customer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleViewProfile(customer)}
                className="p-4 border rounded-lg space-y-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-medium text-blue-600 text-sm">
                        {customer.name?.split(' ').map((n: string) => n[0]).join('') || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{customer.name || 'N/A'}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    {customer.isActive !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>{customer.phone || 'N/A'}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">{customer.address}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <div className="flex gap-4">
                    <span className="text-gray-600">Customer since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Edit functionality here
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => handleDeleteClick(customer, e)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer, index) => (
                <motion.tr
                  key={customer._id || customer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleViewProfile(customer)}
                  className="border-b cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-medium text-blue-600">
                        {customer.name?.split(' ').map((n: string) => n[0]).join('') || 'N/A'}
                      </span>
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span>{customer.phone}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      {customer.address && (
                        <>
                          <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-400 truncate max-w-[180px]" title={customer.address}>{customer.address}</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">-</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Edit functionality here
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => handleDeleteClick(customer, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{customerToDelete?.name}</strong>? This action cannot be undone.
              All associated vehicles and service history will be preserved but the customer will be marked as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
