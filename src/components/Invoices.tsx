import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AddInvoice } from "./AddInvoice";
import { InvoiceDetail } from "./InvoiceDetail";
import {
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  Printer,
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Trash2,
  MoreVertical,
  Edit,
  Calendar,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
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
import { Label } from "./ui/label";
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
import { motion } from "motion/react";
import { invoicesAPI } from "../api/client";
import { connectSocket, onInvoiceUpdated } from "../lib/socket";
import { formatInvoiceId } from "../utils/idFormatter";

// Helper function to map backend status to display status
const getDisplayStatus = (invoice: any): "Draft" | "Unpaid" | "Paid" => {
  const backendStatus = invoice.status || "Pending";
  
  // If status is "Paid", show "Paid"
  if (backendStatus === "Paid") {
    return "Paid";
  }
  
  // If status is "Pending" and payment method is null/undefined, it's a Draft
  // Draft = user left before completing the invoice
  if (backendStatus === "Pending" && (invoice.paymentMethod === null || invoice.paymentMethod === undefined)) {
    return "Draft";
  }
  
  // If paymentMethod is "Other", it's Unpaid (completed but payment not received yet)
  // Otherwise it's Unpaid (has some payment method set but status is still Pending)
  return "Unpaid";
};

// Helper function to format payment method for display
const getDisplayPaymentMethod = (invoice: any): string => {
  const displayStatus = getDisplayStatus(invoice);
  
  // Draft: show N/A (no payment method selected)
  if (displayStatus === "Draft") {
    return "N/A";
  }
  
  // Unpaid: show N/A (payment not received yet)
  if (displayStatus === "Unpaid") {
    return "N/A";
  }
  
  // Paid: show the actual payment method
  if (invoice.paymentMethod && invoice.paymentMethod !== "Other") {
    return invoice.paymentMethod;
  }
  
  return "N/A";
};

// Helper function to get backend status from display status for filtering
const getBackendStatusFromDisplay = (displayStatus: string): string | undefined => {
  if (displayStatus === "Paid") return "Paid";
  if (displayStatus === "Unpaid") return "Pending";
  return undefined;
};

export function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError("");
      // Convert display status filter to backend status if needed
      const backendStatusFilter = statusFilter ? getBackendStatusFromDisplay(statusFilter) : undefined;
      const response = await invoicesAPI.getAll(
        searchQuery || undefined,
        backendStatusFilter || undefined,
        customerFilter || undefined
      );
      if (response.success) {
        let filteredInvoices = response.data;
        
        // If filtering by Unpaid, we need to filter client-side
        // since it maps to "Pending" in backend
        if (statusFilter === "Unpaid") {
          filteredInvoices = filteredInvoices.filter((invoice: any) => {
            const displayStatus = getDisplayStatus(invoice);
            return displayStatus === statusFilter;
          });
        }
        
        // Apply date filter client-side
        if (startDate || endDate) {
          filteredInvoices = filteredInvoices.filter((invoice: any) => {
            const invoiceDate = new Date(invoice.date);
            invoiceDate.setHours(0, 0, 0, 0);
            
            if (startDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              if (invoiceDate < start) return false;
            }
            
            if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              if (invoiceDate > end) return false;
            }
            
            return true;
          });
        }
        
        setInvoices(filteredInvoices);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    
    // Connect Socket.IO and listen for invoice updates
    const socket = connectSocket();
    const unsubscribe = onInvoiceUpdated(() => {
      // Refresh invoices when updated
      fetchInvoices();
    });

    return () => {
      unsubscribe();
    };
  }, [searchQuery, statusFilter, customerFilter, startDate, endDate]);

  // Clean up old drafts from localStorage (but don't auto-switch to create tab)
  // User should see All Invoices first, where draft invoices are visible in the list
  useEffect(() => {
    const cleanupOldDrafts = () => {
      try {
        const draftData = localStorage.getItem('invoice_draft');
        if (draftData) {
          const draft = JSON.parse(draftData);
          const draftAge = Date.now() - (draft.timestamp || 0);
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          if (draftAge >= sevenDays) {
            // Draft is too old, remove it
            localStorage.removeItem('invoice_draft');
          }
        }
      } catch (error) {
        console.error('Error checking draft:', error);
        localStorage.removeItem('invoice_draft');
      }
    };

    cleanupOldDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for tab parameter in URL (e.g., from Dashboard "Create Invoice" button)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'create') {
      setActiveTab('create');
      // Clean up URL param after setting tab
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('tab');
      setSearchParams(newParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Check for customer filter in URL params
  useEffect(() => {
    const customerId = searchParams.get('customer');
    if (customerId) {
      setCustomerFilter(customerId);
      // Clean up URL param after setting filter
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('customer');
      setSearchParams(newParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Check for ID in URL params and open invoice detail
  useEffect(() => {
    const invoiceId = searchParams.get('id');
    if (invoiceId && invoices.length > 0) {
      const invoice = invoices.find(i => (i._id || i.id) === invoiceId);
      if (invoice) {
        setSelectedInvoice(invoice);
        // Clean up URL
        setSearchParams({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, invoices]);

  const handleInvoiceClick = (invoice: any) => {
    setSelectedInvoice(invoice);
  };

  const handleCloseInvoiceDetail = () => {
    setSelectedInvoice(null);
    setSearchParams({});
  };

  const handleCreateInvoice = () => {
    setActiveTab("create");
  };

  const handleEditInvoice = (invoice: any) => {
    // Store invoice ID in sessionStorage to be picked up by AddInvoice component
    sessionStorage.setItem('editingInvoiceId', invoice._id || invoice.id);
    setActiveTab("create");
  };

  const handleInvoiceCreated = () => {
    fetchInvoices();
    setActiveTab("all");
    // Clear editing invoice ID after creation/update
    sessionStorage.removeItem('editingInvoiceId');
  };

  const handleDeleteClick = (e: React.MouseEvent, invoice: any) => {
    e.stopPropagation(); // Prevent row click
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    
    try {
      const response = await invoicesAPI.delete(invoiceToDelete._id || invoiceToDelete.id);
      if (response.success) {
        setIsDeleteDialogOpen(false);
        setInvoiceToDelete(null);
        fetchInvoices();
      } else {
        alert(response.message || "Failed to delete invoice");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete invoice");
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setInvoiceToDelete(null);
  };

  const handleClearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setDateFilterOpen(false);
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) {
      toast.error("No invoices to export");
      return;
    }

    // Create CSV content
    const headers = ["Invoice ID", "Customer", "Make", "Model", "Year", "Date", "Services", "Payment Method", "Amount", "Status"];
    const rows = invoices.map(invoice => [
      formatInvoiceId(invoice),
      invoice.customer?.name || 'N/A',
      invoice.vehicle?.make || 'N/A',
      invoice.vehicle?.model || 'N/A',
      invoice.vehicle?.year || '',
      new Date(invoice.date).toLocaleDateString(),
      invoice.items?.length || 0,
      getDisplayPaymentMethod(invoice),
      invoice.amount || 0,
      getDisplayStatus(invoice)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Invoices exported successfully");
  };

  // Transform invoice data to match InvoiceDetail format
  const transformInvoiceForDetail = (invoice: any) => {
    const invoiceId = invoice._id || invoice.id || '';
    const invoiceIdStr = invoiceId.toString();
    const shortId = invoiceIdStr.slice(-6).padStart(6, '0');
    
    // Transform items to match InvoiceDetail format
    const transformedItems = (invoice.items || []).map((item: any) => ({
      id: item._id || item.id,
      // If item has 'name', use it; otherwise use 'description' as name (old format)
      name: item.name || item.description,
      description: item.name ? item.description : undefined, // Only set description if name exists
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.price || 0,
      price: item.price || item.unitPrice || 0, // Keep both for compatibility
      tax: item.tax || 0,
    }));
    
    return {
      id: shortId,
      customer: invoice.customer?.name || invoice.customer || 'N/A',
      customerId: invoice.customer?._id || invoice.customer?.id || invoice.customerId,
      customerEmail: invoice.customer?.email || invoice.customerEmail,
      customerPhone: invoice.customer?.phone || invoice.customerPhone,
      customerAddress: invoice.customer?.address || invoice.customerAddress,
      make: invoice.vehicle?.make || invoice.make || 'N/A',
      model: invoice.vehicle?.model || invoice.model || 'N/A',
      year: invoice.vehicle?.year ? String(invoice.vehicle.year) : invoice.year ? String(invoice.year) : undefined,
      plate: invoice.vehicle?.plateNo || invoice.vehicle?.plate || invoice.plate,
      vin: invoice.vehicle?.vin || invoice.vin,
      mileage: invoice.vehicle?.mileage ? String(invoice.vehicle.mileage) : invoice.mileage ? String(invoice.mileage) : undefined,
      date: invoice.date ? new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      amount: invoice.amount || 0,
      status: invoice.status || 'Pending',
      paymentMethod: getDisplayPaymentMethod(invoice),
      services: invoice.items?.length || 0,
      items: transformedItems,
      technician: invoice.technician,
      technicianSignature: invoice.technicianSignature,
      supervisor: invoice.supervisor,
      supervisorSignature: invoice.supervisorSignature,
      notes: invoice.notes,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate || 0.18, // Default 18% if not provided
      tax: invoice.tax,
      discount: invoice.discount || 0,
      terms: invoice.terms,
    };
  };

  // If an invoice is selected, show the InvoiceDetail
  if (selectedInvoice) {
    const transformedInvoice = transformInvoiceForDetail(selectedInvoice);
    return (
      <InvoiceDetail
        invoice={transformedInvoice}
        onClose={handleCloseInvoiceDetail}
        onEdit={async (data) => {
          try {
            await invoicesAPI.update(selectedInvoice._id || selectedInvoice.id, data);
            toast.success("Invoice updated successfully");
            fetchInvoices();
          } catch (err: any) {
            toast.error(err.message || "Failed to update invoice");
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1 lg:mb-2">Invoices</h1>
          <p className="text-sm lg:text-base text-gray-600">Manage and track all invoices</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="create">Create Invoice</TabsTrigger>
        </TabsList>

        {/* All Invoices Tab */}
        <TabsContent value="all" className="space-y-4 lg:space-y-6 mt-4">

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
                  <p className="text-sm text-gray-600 mb-1">Total Collected</p>
                  <p className="text-3xl">
                    <span className="text-2xl font-normal mr-0.5">₨</span>
                    <span className="font-semibold">{invoices.filter(i => getDisplayStatus(i) === 'Paid' && i.isActive !== false).reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString()}</span>
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-semibold tracking-wider text-[#c53032]">PKR</span>
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
                  <p className="text-sm text-gray-600 mb-1">Total Invoices</p>
                  <p className="text-3xl">{invoices.length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <FileText className="h-6 w-6 text-[#c53032]" />
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
          <Card className="border-l-4 border-yellow-500 h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Draft</p>
                  <p className="text-3xl">{invoices.filter(i => getDisplayStatus(i) === 'Draft').length}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <FileText className="h-6 w-6 text-yellow-600" />
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
          <Card className="border-l-4 border-orange-500 h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Unpaid</p>
                  <p className="text-3xl">{invoices.filter(i => getDisplayStatus(i) === 'Unpaid').length}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search invoices..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter || "All"} onValueChange={(value) => setStatusFilter(value === "All" ? "" : value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Draft">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Draft</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="Unpaid">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">Unpaid</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="Paid">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 border-green-200">Paid</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`flex-1 lg:flex-none ${(startDate || endDate) ? 'border-[#c53032] text-[#c53032]' : ''}`}
                  >
                    <Calendar className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">
                      {startDate || endDate ? 'Date Filtered' : 'Filter by Date'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filter by Date</h4>
                      {(startDate || endDate) && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleClearDateFilter}
                          className="h-6 px-2 text-xs text-gray-500"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startDate">From</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">To</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Button 
                      className="w-full bg-[#c53032] hover:bg-[#a82628]" 
                      onClick={() => setDateFilterOpen(false)}
                    >
                      Apply Filter
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {(customerFilter || startDate || endDate) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {customerFilter && (
                <>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    Filtered by Customer
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomerFilter("")}
                    className="h-6 px-2 text-xs"
                  >
                    Clear
                  </Button>
                </>
              )}
              {(startDate || endDate) && (
                <>
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                    {startDate && endDate 
                      ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                      : startDate 
                        ? `From ${new Date(startDate).toLocaleDateString()}`
                        : `Until ${new Date(endDate).toLocaleDateString()}`
                    }
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearDateFilter}
                    className="h-6 px-2 text-xs"
                  >
                    Clear Date
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Invoices</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Export</span>
            </Button>
          </div>
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
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No invoices found</div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {invoices.map((invoice, index) => (
                  <motion.div
                    key={invoice._id || invoice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 border rounded-lg space-y-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                    onClick={() => handleInvoiceClick(invoice)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{formatInvoiceId(invoice)}</p>
                        <p className="text-sm text-gray-600">{invoice.customer?.name || 'N/A'}</p>
                      </div>
                      <Badge
                        className={
                          getDisplayStatus(invoice) === "Paid" ? "bg-green-100 text-green-700 border-green-200" :
                          getDisplayStatus(invoice) === "Draft" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                          "bg-orange-100 text-orange-700 border-orange-200"
                        }
                      >
                        {getDisplayStatus(invoice) === "Paid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {getDisplayStatus(invoice)}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">{invoice.vehicle?.make} {invoice.vehicle?.model} {invoice.vehicle?.year}</p>
                      <p className="text-gray-500">{new Date(invoice.date).toLocaleDateString()} • {getDisplayPaymentMethod(invoice)}</p>
                      <p><Badge variant="outline">{invoice.items?.length || 0} items</Badge></p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-medium text-lg">
                        <span className="text-sm font-normal mr-0.5">₨</span>
                        <span>{invoice.amount?.toLocaleString() || 0}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInvoiceClick(invoice);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => handleDeleteClick(e, invoice)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                <TableHead>Invoice ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice, index) => (
                <motion.tr
                  key={invoice._id || invoice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b cursor-pointer hover:bg-blue-50/50 transition-colors"
                  onClick={() => handleInvoiceClick(invoice)}
                >
                  <TableCell className="font-medium">{formatInvoiceId(invoice)}</TableCell>
                  <TableCell>{invoice.customer?.name || 'N/A'}</TableCell>
                  <TableCell>{invoice.vehicle?.make || 'N/A'}</TableCell>
                  <TableCell>{invoice.vehicle?.model} {invoice.vehicle?.year}</TableCell>
                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{invoice.items?.length || 0} items</Badge>
                  </TableCell>
                  <TableCell>{getDisplayPaymentMethod(invoice)}</TableCell>
                  <TableCell className="font-medium">
                    <span className="text-sm font-normal mr-0.5">₨</span>
                    <span>{invoice.amount?.toLocaleString() || 0}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        getDisplayStatus(invoice) === "Paid" ? "bg-green-100 text-green-700 border-green-200" :
                        getDisplayStatus(invoice) === "Draft" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                        getDisplayStatus(invoice) === "Unpaid" ? "bg-orange-100 text-orange-700 border-orange-200" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      }
                    >
                      {getDisplayStatus(invoice) === "Paid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {getDisplayStatus(invoice)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInvoiceClick(invoice);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleInvoiceClick(invoice);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {(getDisplayStatus(invoice) === "Draft" || getDisplayStatus(invoice) === "Unpaid") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditInvoice(invoice);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Invoice
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteClick(e, invoice)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete invoice{" "}
                  <span className="font-semibold">
                    {formatInvoiceId(invoiceToDelete)}
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
        </TabsContent>

        {/* Create Invoice Tab */}
        <TabsContent value="create" className="mt-4">
          <AddInvoice
            onClose={() => {
              setActiveTab("all");
              sessionStorage.removeItem('editingInvoiceId');
            }}
            onSubmit={async (data) => {
              // Invoice is already created/updated by AddInvoice component
              // Just refresh the list and switch to all tab
              handleInvoiceCreated();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
