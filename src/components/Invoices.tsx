import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
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

export function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await invoicesAPI.getAll(
        searchQuery || undefined,
        statusFilter || undefined
      );
      if (response.success) {
        setInvoices(response.data);
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
  }, [searchQuery, statusFilter]);

  const handleInvoiceClick = (invoice: any) => {
    setSelectedInvoice(invoice);
  };

  const handleCloseInvoiceDetail = () => {
    setSelectedInvoice(null);
  };

  const handleCreateInvoice = () => {
    setIsAddInvoiceOpen(true);
  };

  const handleCloseCreateInvoice = () => {
    setIsAddInvoiceOpen(false);
    fetchInvoices();
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

  // If creating a new invoice, show the AddInvoice view
  if (isAddInvoiceOpen) {
    return (
      <AddInvoice
        onClose={handleCloseCreateInvoice}
        onSubmit={async (data) => {
          try {
            const response = await invoicesAPI.create(data);
            if (response.success) {
              handleCloseCreateInvoice(); // This will refresh the list
            } else {
              alert(response.message || "Failed to create invoice");
            }
          } catch (err: any) {
            alert(err.message || "Failed to create invoice");
          }
        }}
      />
    );
  }

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
      paymentMethod: invoice.paymentMethod || 'Cash',
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
            handleCloseInvoiceDetail();
            fetchInvoices();
          } catch (err: any) {
            alert(err.message || "Failed to update invoice");
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
        <Button 
          className="bg-[#c53032] hover:bg-[#a6212a] w-full lg:w-auto" 
          size="sm"
          onClick={handleCreateInvoice}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
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
                  <p className="text-sm text-gray-600 mb-1">Total Collected</p>
                  <p className="text-3xl">
                    <span className="text-2xl font-normal mr-0.5">₨</span>
                    <span className="font-semibold">{invoices.filter(i => i.status === 'Paid' && i.isActive !== false).reduce((sum, i) => sum + (i.amount || 0), 0).toLocaleString()}</span>
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
          <Card className="border-l-4 border-[#e15b5b] h-full">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl">{invoices.filter(i => i.status === 'Pending').length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Clock className="h-6 w-6 text-[#c53032]" />
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
                  <p className="text-sm text-gray-600 mb-1">Overdue</p>
                  <p className="text-3xl">{invoices.filter(i => i.status === 'Cancelled').length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <FileText className="h-6 w-6 text-[#c53032]" />
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
              <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                <Filter className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Filter by Date</span>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                <Filter className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Filter by Status</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Invoices</CardTitle>
            <Button variant="outline" size="sm">
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
                        <p className="font-medium">{invoice.invoiceNumber || `INV-${invoice._id?.slice(-6) || invoice.id}`}</p>
                        <p className="text-sm text-gray-600">{invoice.customer?.name || 'N/A'}</p>
                      </div>
                      <Badge
                        className={
                          invoice.status === "Paid" ? "bg-green-100 text-green-700 border-green-200" :
                          invoice.status === "Pending" ? "bg-orange-100 text-orange-700 border-orange-200" :
                          "bg-red-100 text-red-700 border-red-200"
                        }
                      >
                        {invoice.status === "Paid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {invoice.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">{invoice.vehicle?.make} {invoice.vehicle?.model} {invoice.vehicle?.year}</p>
                      <p className="text-gray-500">{new Date(invoice.date).toLocaleDateString()} • {invoice.paymentMethod || 'N/A'}</p>
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
                  <TableCell className="font-medium">{invoice.invoiceNumber || `INV-${invoice._id?.slice(-6) || invoice.id}`}</TableCell>
                  <TableCell>{invoice.customer?.name || 'N/A'}</TableCell>
                  <TableCell>{invoice.vehicle?.make || 'N/A'}</TableCell>
                  <TableCell>{invoice.vehicle?.model} {invoice.vehicle?.year}</TableCell>
                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{invoice.items?.length || 0} items</Badge>
                  </TableCell>
                  <TableCell>{invoice.paymentMethod || 'N/A'}</TableCell>
                  <TableCell className="font-medium">
                    <span className="text-sm font-normal mr-0.5">₨</span>
                    <span>{invoice.amount?.toLocaleString() || 0}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        invoice.status === "Paid" ? "bg-green-100 text-green-700 border-green-200" :
                        invoice.status === "Pending" ? "bg-orange-100 text-orange-700 border-orange-200" :
                        "bg-red-100 text-red-700 border-red-200"
                      }
                    >
                      {invoice.status === "Paid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {invoice.status}
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
                {invoiceToDelete?.invoiceNumber || `INV-${invoiceToDelete?._id?.slice(-6) || invoiceToDelete?.id}`}
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
    </div>
  );
}
