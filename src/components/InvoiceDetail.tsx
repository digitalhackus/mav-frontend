import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  ArrowLeft,
  Printer, 
  Download, 
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Banknote,
  CreditCard,
  Smartphone,
  FileText,
  Share2,
  MessageCircle,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { settingsAPI } from "../api/client";

interface InvoiceDetailProps {
  invoice: {
    id: string;
    customer: string;
    customerId?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    make: string;
    model: string;
    year?: string;
    plate?: string;
    vin?: string;
    mileage?: string;
    date: string;
    amount: number;
    status: string;
    paymentMethod: string;
    services: number;
    items?: Array<{
      id?: string;
      name?: string; // New format
      description?: string; // Old format uses this as item name, new format uses as details
      quantity: number;
      unitPrice?: number; // New format
      price?: number; // Old format
      tax?: number;
    }>;
    technician?: string;
    technicianSignature?: string;
    supervisor?: string;
    supervisorSignature?: string;
    notes?: string;
    subtotal?: number;
    taxRate?: number;
    tax?: number;
    discount?: number;
    terms?: string;
  };
  onClose?: () => void;
  onEdit?: (data: any) => void;
}

// Default terms and conditions
const DEFAULT_TERMS = "Payment is due immediately upon receipt. No credit is extended under any circumstances.\nQuoted rates are valid for 5 days only and may change thereafter.";

export function InvoiceDetail({ invoice, onClose, onEdit }: InvoiceDetailProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [businessProfile, setBusinessProfile] = useState({
    name: "MOMENTUM AUTOWORKS",
    tagline: "Premium Auto Care & Service",
    address: "",
    city: "",
    state: "",
    country: "",
    phone: "+92 300 1234567",
    email: "info@momentumauto.pk",
    website: "www.momentumauto.pk",
    taxId: "NTN-1234567",
    logo: null,
  });

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Editable fields state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [isEditingFooter, setIsEditingFooter] = useState(false);
  const [editedNotes, setEditedNotes] = useState(invoice.notes || "");
  const [editedTerms, setEditedTerms] = useState(invoice.terms || "");
  const [editedFooter, setEditedFooter] = useState("Thank you for your business! For any questions regarding this invoice, please contact us.");
  
  // Calculate totals if items exist
  const defaultItems = invoice.items || [
    { name: "Oil Change", description: "Full synthetic oil + filter replacement", quantity: 1, unitPrice: 3500, tax: 630 },
    { name: "Brake Pad Replacement", description: "Front brake pads - ceramic", quantity: 1, unitPrice: 6800, tax: 1224 },
    { name: "General Inspection", description: "Complete vehicle inspection", quantity: 1, unitPrice: 500, tax: 90 },
    { name: "Labor Charges", description: "Technician service time", quantity: 2, unitPrice: 1500, tax: 270 },
  ];
  const items = invoice.items || defaultItems;
  
  // Helper function to convert backend status to display status
  const getDisplayStatus = (backendStatus: string): "Draft" | "Unpaid" | "Paid" => {
    if (backendStatus === "Paid") return "Paid";
    if (backendStatus === "Pending") {
      // Check if invoice was created recently (within 24 hours) - consider it Draft
      const invoiceDate = new Date(invoice.date || Date.now());
      const now = new Date();
      const hoursDiff = (now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 24 && !invoice.paymentMethod) {
        return "Draft";
      }
      return "Unpaid";
    }
    return "Unpaid"; // Default for cancelled or other statuses
  };

  // Helper function to convert display status to backend status
  const getBackendStatus = (displayStatus: "Draft" | "Unpaid" | "Paid"): string => {
    if (displayStatus === "Paid") return "Paid";
    return "Pending"; // Draft and Unpaid both map to Pending
  };

  // Editable invoice fields
  const [editedDate, setEditedDate] = useState(invoice.date || "");
  const [editedStatus, setEditedStatus] = useState<"Draft" | "Unpaid" | "Paid">(getDisplayStatus(invoice.status || "Pending"));
  const [editedPaymentMethod, setEditedPaymentMethod] = useState(invoice.paymentMethod || "Cash");
  const [editedItems, setEditedItems] = useState(items);
  const [editedDiscount, setEditedDiscount] = useState(invoice.discount || 0);

  const taxRate = invoice.taxRate || 0.18; // 18% default
  
  // Helper function to get item price (handles both old and new format)
  const getItemPrice = (item: any) => item.unitPrice ?? item.price ?? 0;
  
  // Helper function to get item name (handles both old and new format)
  const getItemName = (item: any) => item.name ?? item.description ?? "Service";
  
  // Use edited values when in edit mode
  const currentItems = isEditMode ? editedItems : items;
  const currentDate = isEditMode ? editedDate : invoice.date;
  const currentStatus = isEditMode ? editedStatus : getDisplayStatus(invoice.status || "Pending");
  const currentPaymentMethod = isEditMode ? editedPaymentMethod : invoice.paymentMethod;
  const currentDiscount = isEditMode ? editedDiscount : (invoice.discount || 0);
  
  const subtotal = invoice.subtotal || currentItems.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0);
  const taxAmount = invoice.tax || currentItems.reduce((sum, item) => {
    const itemPrice = getItemPrice(item);
    return sum + (item.tax || (itemPrice * item.quantity * taxRate));
  }, 0);
  const discount = currentDiscount;
  const total = invoice.amount || (subtotal - discount + taxAmount);
  
  // Fetch business profile from settings
  useEffect(() => {
    const fetchBusinessProfile = async () => {
      try {
        const response = await settingsAPI.get();
        if (response.success && response.data?.workshop) {
          const workshop = response.data.workshop;
          setBusinessProfile({
            name: (workshop.businessName || "MOMENTUM AUTOWORKS").toUpperCase(),
            tagline: "Premium Auto Care & Service",
            address: workshop.address || "",
            city: "",
            state: "",
            country: "",
            phone: workshop.phone || "+92 300 1234567",
            email: workshop.email || "info@momentumauto.pk",
            website: "www.momentumauto.pk",
            taxId: workshop.taxRegistration || "NTN-1234567",
            logo: workshop.logo || null,
          });
        }
      } catch (error) {
        console.error("Failed to fetch business profile:", error);
      }
    };
    fetchBusinessProfile();
  }, []);
  
  // Handle edit mode actions
  const handleEdit = () => {
    setIsEditMode(true);
  };
  
  const handleSave = () => {
    if (!onEdit) return;
    
    // Calculate updated totals
    const updatedSubtotal = currentItems.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0);
    const updatedTax = currentItems.reduce((sum, item) => {
      const itemPrice = getItemPrice(item);
      return sum + (item.tax || (itemPrice * item.quantity * taxRate));
    }, 0);
    const updatedTotal = updatedSubtotal + updatedTax - currentDiscount;
    
    // Prepare update data - convert display status to backend status
    const updateData = {
      date: currentDate,
      status: getBackendStatus(currentStatus),
      paymentMethod: currentPaymentMethod,
      items: currentItems.map(item => ({
        description: getItemName(item),
        quantity: item.quantity,
        price: getItemPrice(item),
      })),
      subtotal: updatedSubtotal,
      tax: updatedTax,
      discount: currentDiscount,
      amount: updatedTotal,
      notes: editedNotes,
      terms: editedTerms,
    };
    
    onEdit(updateData);
    setIsEditMode(false);
  };
  
  const handleCancel = () => {
    // Reset to original values
    setEditedDate(invoice.date || "");
    setEditedStatus(getDisplayStatus(invoice.status || "Pending"));
    setEditedPaymentMethod(invoice.paymentMethod || "Cash");
    setEditedItems(items);
    setEditedDiscount(invoice.discount || 0);
    setEditedNotes(invoice.notes || "");
    setEditedTerms(invoice.terms || "");
    setIsEditMode(false);
  };

  const getStatusIcon = (status: "Draft" | "Unpaid" | "Paid" | string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "paid") return <CheckCircle2 className="h-4 w-4" />;
    if (statusLower === "draft") return <FileText className="h-4 w-4" />;
    if (statusLower === "unpaid" || statusLower === "pending") return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getStatusColor = (status: "Draft" | "Unpaid" | "Paid" | string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "paid") return "bg-green-100 text-green-700 border-green-200";
    if (statusLower === "draft") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (statusLower === "unpaid" || statusLower === "pending") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const getPaymentIcon = (method: string) => {
    const methodLower = method.toLowerCase();
    if (methodLower.includes("cash")) return Banknote;
    if (methodLower.includes("card")) return CreditCard;
    return Smartphone;
  };

  const PaymentIcon = getPaymentIcon(invoice.paymentMethod);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadClick = () => {
    setShowPreviewModal(true);
  };

  const handleDownloadPDF = async () => {
    // Only allow download for paid invoices
    if (invoice.status !== "Paid") {
      alert("Only paid invoices can be downloaded.");
      return;
    }
    
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
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      const invoiceDate = typeof invoice.date === 'string' ? new Date(invoice.date) : new Date(invoice.date);
      const dateStr = invoiceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Karachi' });
      const timeStr = invoiceDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
      
      // Generate invoice ID from plate number and customer name initials
      const plateNo = invoice.plate || invoice.vehicle?.plateNo || '';
      const customerName = invoice.customer || '';
      const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
      const invoiceId = (plateNo && initials) ? `${plateNo}-${initials}` : `INV-${invoice.id.padStart(6, '0')}`;
      
      doc.text(`DATE: ${dateStr.toUpperCase()}`, margin, currentY + 30);
      doc.text(`TIME: ${timeStr.toUpperCase()}`, margin, currentY + 36);
      if (invoiceId) {
        doc.text(`INVOICE ID: ${invoiceId.toUpperCase()}`, margin, currentY + 42);
      }

      // Logo and company address on right - Use original resolution, perfect square
      let logoHeight = 30; // Default height for placeholder
      const logoDataUrl = await loadLogoAsDataUrl();
      if (logoDataUrl) {
        // Load image to get original dimensions
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(null);
          img.onerror = reject;
          img.src = logoDataUrl;
        });
        
        // Calculate size to fit in a square container (30x30mm) while maintaining aspect ratio
        const containerSize = 30;
        const imgAspect = img.width / img.height;
        let logoWidth = containerSize;
        logoHeight = containerSize;
        
        if (imgAspect > 1) {
          // Image is wider than tall - fit to width, center vertically
          logoHeight = containerSize / imgAspect;
        } else {
          // Image is taller than wide or square - fit to height, center horizontally
          logoWidth = containerSize * imgAspect;
        }
        
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

      // Bill To and Payment Method
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Bill To:", margin, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(invoice.customer.toUpperCase(), margin, currentY + 6);
      if (invoice.customerPhone) {
        doc.text(invoice.customerPhone, margin, currentY + 12);
      }
      if (invoice.customerEmail) {
        doc.text(invoice.customerEmail, margin, currentY + 18);
      }

      const paymentColumnX = pageWidth / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Payment Method", paymentColumnX, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(invoice.paymentMethod.toUpperCase(), paymentColumnX, currentY + 6);
      if (invoice.technician) {
        doc.text(invoice.technician.toUpperCase(), paymentColumnX, currentY + 12);
      }

      currentY += 30;

      // Table
      autoTable(doc, {
        startY: currentY,
        head: [["DESCRIPTION", "QTY", "PRICE", "SUBTOTAL"]],
        body: items.map((item) => {
          const itemPrice = getItemPrice(item);
          const itemName = getItemName(item);
          const itemTotal = itemPrice * item.quantity;
          return [
            itemName.toUpperCase(),
            item.quantity.toString().padStart(2, '0'),
            `Rs${itemPrice.toLocaleString('en-US')}`,
            `Rs${itemTotal.toLocaleString('en-US')}`,
          ];
        }),
        styles: { 
          fontSize: 10, 
          cellPadding: 4,
          lineColor: [200, 200, 200],
          lineWidth: 0.5,
          font: "courier"
        },
        headStyles: { 
          fillColor: [200, 200, 200],
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
      if (discount > 0) {
        doc.setFont("courier", "bold");
        doc.setFontSize(10);
        doc.text("DISCOUNT", summaryX - labelWidth, summaryStartY, { align: "right" });
        doc.text(`-Rs${Math.round(discount).toLocaleString('en-US')}`, summaryX, summaryStartY, { align: "right" });
        summaryStartY += 8;
      }
      
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.text("TAX", summaryX - labelWidth, summaryStartY, { align: "right" });
      doc.text(`Rs${Math.round(taxAmount).toLocaleString('en-US')}`, summaryX, summaryStartY, { align: "right" });
      
      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.text("GRAND TOTAL", summaryX - labelWidth, summaryStartY + 8, { align: "right" });
      doc.text(`Rs${Math.round(total).toLocaleString('en-US')}`, summaryX, summaryStartY + 8, { align: "right" });

      // Footer
      currentY = summaryStartY + 25;
      const footerLeftX = margin;
      const footerRightX = pageWidth - margin;

      // Notes section (if any)
      const notesText = editedNotes || invoice.notes;
      if (notesText) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("NOTES", footerLeftX, currentY);
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.text(
          notesText,
          footerLeftX,
          currentY + 6,
          { maxWidth: (pageWidth - margin * 2) / 2 }
        );
        currentY += 20;
      }

      // Terms & Conditions
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TERM & CONDITION", footerLeftX, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const termsText = editedTerms || invoice.terms || DEFAULT_TERMS;
      doc.text(
        termsText,
        footerLeftX,
        currentY + 6,
        { maxWidth: (pageWidth - margin * 2) / 2 }
      );

      // Contact info
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("FOR ANY QUESTIONS, PLEASE CONTACT", footerRightX, currentY, { align: "right" });
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(businessProfile.email.toUpperCase(), footerRightX, currentY + 6, { align: "right" });
      doc.text(`OR ${businessProfile.phone}.`, footerRightX, currentY + 12, { align: "right" });

      // Signature
      if (invoice.technician) {
        doc.setDrawColor(0, 0, 0);
        doc.line(footerRightX - 50, currentY + 25, footerRightX, currentY + 25);
        doc.setFont("courier", "bold");
        doc.setFontSize(10);
        doc.text(invoice.technician.toUpperCase(), footerRightX, currentY + 30, { align: "right" });
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.text("GENERAL MANAGER", footerRightX, currentY + 35, { align: "right" });
      }

      // Reuse invoiceId already declared above for PDF filename
      doc.save(`Invoice-${invoiceId}.pdf`);
      setShowPreviewModal(false);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Unable to generate PDF. Please try again.");
    }
  };

  const handleShareWhatsApp = () => {
    const plateNo = invoice.plate || invoice.vehicle?.plateNo || '';
    const customerName = invoice.customer || '';
    const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
    const invoiceNumber = (plateNo && initials) ? `${plateNo}-${initials}` : `INV-${invoice.id.padStart(6, '0')}`;
    const message = `Invoice ${invoiceNumber} from ${businessProfile.name}\n\nCustomer: ${invoice.customer}\nAmount: Rs${total.toLocaleString('en-US')}\n\nView invoice details at your convenience.`;
    const whatsappUrl = `https://wa.me/${invoice.customerPhone?.replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  const handleShareEmail = () => {
    if (!invoice.customerEmail) {
      alert("Customer email is not available");
      setShowShareMenu(false);
      return;
    }
    
    const subject = encodeURIComponent(`Invoice ${invoice.id} - ${businessProfile.name}`);
    const body = encodeURIComponent(
      `Dear ${invoice.customer},\n\n` +
      `Please find attached invoice ${invoice.id} for your vehicle.\n\n` +
      `Invoice Details:\n` +
      `- Invoice ID: ${(() => {
        const plateNo = invoice.plate || invoice.vehicle?.plateNo || '';
        const customerName = invoice.customer || '';
        if (plateNo && customerName) {
          const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
          if (initials) {
            return `${plateNo}-${initials}`;
          }
        }
        return `INV-${invoice.id.padStart(6, '0')}`;
      })()}\n` +
      `- Date: ${invoice.date}\n` +
      `- Vehicle: ${invoice.make} ${invoice.model} ${invoice.year || ''}\n` +
      `- Total Amount: Rs ${invoice.amount?.toLocaleString() || '0'}\n\n` +
      `Thank you for choosing ${businessProfile.name}!\n\n` +
      `Best regards,\n${businessProfile.name} Team`
    );
    const mailtoUrl = `mailto:${invoice.customerEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    setShowShareMenu(false);
  };

  const handleEmailInvoice = () => {
    if (!invoice.customerEmail) {
      alert("Customer email is not available");
      return;
    }
    
    const subject = encodeURIComponent(`Invoice ${invoice.id} - ${businessProfile.name}`);
    const body = encodeURIComponent(
      `Dear ${invoice.customer},\n\n` +
      `Please find attached invoice ${invoice.id} for your vehicle.\n\n` +
      `Invoice Details:\n` +
      `- Invoice ID: ${(() => {
        const plateNo = invoice.plate || invoice.vehicle?.plateNo || '';
        const customerName = invoice.customer || '';
        if (plateNo && customerName) {
          const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
          if (initials) {
            return `${plateNo}-${initials}`;
          }
        }
        return `INV-${invoice.id.padStart(6, '0')}`;
      })()}\n` +
      `- Date: ${invoice.date}\n` +
      `- Vehicle: ${invoice.make} ${invoice.model} ${invoice.year || ''}\n` +
      `- Total Amount: Rs ${invoice.amount?.toLocaleString() || '0'}\n\n` +
      `Thank you for choosing ${businessProfile.name}!\n\n` +
      `Best regards,\n${businessProfile.name} Team`
    );
    const mailtoUrl = `mailto:${invoice.customerEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  // Close share menu when clicking outside
  const shareMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

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


  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Header Bar - Hidden in Print */}
      <div className="bg-white border-b px-4 lg:px-6 py-4 flex items-center justify-between flex-shrink-0 print:hidden">
        <div className="flex items-center gap-3 lg:gap-4">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onClose}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="mb-0.5">Invoice Details</h1>
            <p className="text-sm text-slate-600">
              {(() => {
                const plateNo = invoice.plate || invoice.vehicle?.plateNo || '';
                const customerName = invoice.customer || '';
                if (plateNo && customerName) {
                  const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
                  if (initials) {
                    return `${plateNo}-${initials}`;
                  }
                }
                return `INV-${invoice.id.padStart(3, '0')}`;
              })()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === "Paid" && (
            <Button variant="outline" size="sm" onClick={handleDownloadClick}>
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
          )}
          
          {/* Invoice Preview Modal */}
          <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
              <div className="flex items-center justify-between p-6 border-b shrink-0">
                <DialogTitle className="text-lg font-semibold">Invoice Preview</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPreviewModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Invoice Preview Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto">
                  {/* Invoice Document Preview - Same as main view but in modal */}
                  <Card className="p-8 lg:p-12 bg-white print:shadow-none print:border-none" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                    {/* Header - INVOICE in large red, logo top right */}
                    <div className="flex items-start justify-between mb-10">
                      {/* Left: INVOICE title and details */}
                      <div className="flex-1">
                        <h1 className="text-6xl lg:text-7xl font-bold text-[#c53032] mb-6 leading-none" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          INVOICE
                        </h1>
                        <div className="space-y-2 text-base text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          {(() => {
                            const invoiceDate = typeof currentDate === 'string' ? new Date(currentDate) : new Date(currentDate);
                            const dateStr = invoiceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Karachi' });
                            const timeStr = invoiceDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
                            const plateNo = invoice.plate || invoice.vehicle?.plateNo || '';
                            const customerName = invoice.customer || '';
                            const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
                            const invoiceId = plateNo && initials ? `${plateNo}-${initials}` : '';
                            return (
                              <>
                                <div>DATE: {dateStr.toUpperCase()}</div>
                                <div>TIME: {timeStr.toUpperCase()}</div>
                                {invoiceId && <div>INVOICE ID: {invoiceId.toUpperCase()}</div>}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      
                      {/* Right: Logo and company address */}
                      <div className="text-right">
                        {/* Logo - MW with lightning bolt style */}
                        {businessProfile.logo ? (
                          <div className="mb-4 flex justify-end">
                            <img 
                              src={businessProfile.logo} 
                              alt={businessProfile.name}
                              className="h-20 w-20 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="mb-4 flex justify-end">
                            <div className="w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-200 rounded-lg flex items-center justify-center">
                              <span className="text-white text-3xl font-bold">MW</span>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2 text-base text-slate-900 text-right" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          {businessProfile.address ? (
                            businessProfile.address.split('\n').map((line, index) => (
                              <div key={index}>{line.toUpperCase()}</div>
                            ))
                          ) : null}
                          <div>{businessProfile.phone}</div>
                        </div>
                      </div>
                    </div>

                    {/* Billing and Payment Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                      {/* Bill To */}
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          Bill To:
                        </h3>
                        <div className="space-y-2 text-base text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          <p className="font-bold">{invoice.customer.toUpperCase()}</p>
                          {invoice.customerPhone && (
                            <p>{invoice.customerPhone}</p>
                          )}
                          {invoice.customerEmail && (
                            <p>{invoice.customerEmail}</p>
                          )}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          Payment Method
                        </h3>
                        <div className="space-y-2 text-base text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          <p className="font-bold">{invoice.paymentMethod.toUpperCase()}</p>
                          {invoice.technician && (
                            <p>{invoice.technician.toUpperCase()}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Service Items Table - Gray header */}
                    <div className="mb-10">
                      <table className="w-full border-collapse" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                        <thead>
                          <tr className="bg-slate-300">
                            <th className="text-left py-4 px-5 text-base font-bold text-slate-900 border border-slate-400">
                              DESCRIPTION
                            </th>
                            <th className="text-center py-4 px-5 text-base font-bold text-slate-900 border border-slate-400">
                              QTY
                            </th>
                            <th className="text-right py-4 px-5 text-base font-bold text-slate-900 border border-slate-400">
                              PRICE
                            </th>
                            <th className="text-right py-4 px-5 text-base font-bold text-slate-900 border border-slate-400">
                              SUBTOTAL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentItems.map((item, index) => {
                            const itemPrice = getItemPrice(item);
                            const itemName = getItemName(item);
                            const itemTotal = itemPrice * item.quantity;
                            
                            return (
                              <tr key={index} className="bg-white">
                                <td className="py-4 px-5 text-base text-slate-900 border border-slate-300 font-bold">
                                  {itemName.toUpperCase()}
                                </td>
                                <td className="text-center py-4 px-5 text-base text-slate-900 border border-slate-300">
                                  {item.quantity.toString().padStart(2, '0')}
                                </td>
                                <td className="text-right py-4 px-5 text-base text-slate-900 border border-slate-300">
                                  Rs{itemPrice.toLocaleString('en-US')}
                                </td>
                                <td className="text-right py-4 px-5 text-base font-bold text-slate-900 border border-slate-300">
                                  Rs{itemTotal.toLocaleString('en-US')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Section - Right aligned */}
                    <div className="flex justify-end mb-10">
                      <div className="w-full lg:w-96">
                        <table className="w-full" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          <tbody>
                            {discount > 0 && (
                              <tr>
                                <td className="text-left py-3 text-lg font-bold text-green-600">DISCOUNT</td>
                                <td className="text-right py-3 text-lg font-bold text-green-600">-Rs{Math.round(discount).toLocaleString('en-US')}</td>
                              </tr>
                            )}
                            <tr>
                              <td className="text-left py-3 text-lg font-bold text-slate-900">TAX</td>
                              <td className="text-right py-3 text-lg font-bold text-slate-900">Rs{Math.round(taxAmount).toLocaleString('en-US')}</td>
                            </tr>
                            <tr>
                              <td className="text-left py-3 text-xl font-bold text-slate-900">GRAND TOTAL</td>
                              <td className="text-right py-3 text-xl font-bold text-slate-900">Rs{Math.round(total).toLocaleString('en-US')}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Notes Section (if any) */}
                    {(editedNotes || invoice.notes) && (
                      <div className="mb-8">
                        <h4 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          NOTES
                        </h4>
                        <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          {editedNotes || invoice.notes}
                        </p>
                      </div>
                    )}

                    {/* Footer - TERM & CONDITION and Contact Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                      {/* Terms & Conditions - Left */}
                      <div className="lg:col-span-1">
                        <h4 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          TERM & CONDITION
                        </h4>
                        <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          {editedTerms || invoice.terms || DEFAULT_TERMS}
                        </p>
                      </div>

                      {/* Contact Info - Right */}
                      <div className="lg:col-span-2 text-right">
                        <h4 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          FOR ANY QUESTIONS, PLEASE CONTACT
                        </h4>
                        <div className="space-y-2 text-base text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          <p>{businessProfile.email.toUpperCase()}</p>
                          <p>OR {businessProfile.phone}.</p>
                        </div>
                        
                        {/* Signature */}
                        {invoice.technician && (
                          <div className="mt-8">
                            <div className="border-b-2 border-slate-900 pb-10 mb-2 inline-block w-56"></div>
                            <p className="text-base font-bold text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                              {invoice.technician.toUpperCase()}
                            </p>
                            <p className="text-sm text-slate-600" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                              GENERAL MANAGER
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-between gap-3 p-6 border-t bg-slate-50 shrink-0 relative">
                <div className="flex items-center gap-2 relative" ref={shareMenuRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShareMenu(!showShareMenu)}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  {showShareMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-50 flex flex-col gap-1 min-w-[150px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleShareWhatsApp}
                        className="justify-start w-full"
                      >
                        <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleShareEmail}
                        className="justify-start w-full"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                  >
            <Printer className="h-4 w-4 mr-2" />
                    Print
          </Button>
                  {invoice.status === "Paid" && (
                    <Button
                      size="sm"
                      onClick={handleDownloadPDF}
                      className="bg-[#c53032] hover:bg-[#a6212a] text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Email Button - Opens email client directly */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleEmailInvoice}
            disabled={!invoice.customerEmail}
            className="bg-[#c53032] text-white hover:bg-[#a6212a] hover:text-white border-[#c53032]"
          >
            <Mail className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Email</span>
          </Button>

        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto print:overflow-visible">
        <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
          {/* Status and Info Cards - Hidden in Print */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  currentStatus === "Paid" ? "bg-green-100" :
                  currentStatus === "Draft" ? "bg-yellow-100" :
                  "bg-orange-100"
                }`}>
                  {getStatusIcon(currentStatus)}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Status</p>
                  {isEditMode ? (
                    <Select value={currentStatus} onValueChange={(value: "Draft" | "Unpaid" | "Paid") => setEditedStatus(value)}>
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Draft</Badge>
                        </SelectItem>
                        <SelectItem value="Unpaid">
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200">Unpaid</Badge>
                        </SelectItem>
                        <SelectItem value="Paid">
                          <Badge className="bg-green-100 text-green-700 border-green-200">Paid</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getStatusColor(currentStatus)}>
                      {currentStatus}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <PaymentIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Payment Method</p>
                  {isEditMode ? (
                    <Select value={currentPaymentMethod} onValueChange={setEditedPaymentMethod}>
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium text-sm">{currentPaymentMethod}</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Invoice Date</p>
                  {isEditMode ? (
                    <Input
                      type="date"
                      value={currentDate}
                      onChange={(e) => setEditedDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <p className="font-medium text-sm">{currentDate}</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Invoice Document - Anonymous Pro Design */}
          <Card className="p-8 lg:p-12 bg-white print:shadow-none print:border-none" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
            {/* Header - INVOICE in large red, logo top right */}
            <div className="flex items-start justify-between mb-10">
              {/* Left: INVOICE title and details */}
              <div className="flex-1">
                <h1 className="text-6xl lg:text-7xl font-bold text-[#c53032] mb-6 leading-none" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  INVOICE
                </h1>
                <div className="space-y-2 text-base text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  {(() => {
                    const invoiceDate = typeof currentDate === 'string' ? new Date(currentDate) : new Date(currentDate);
                    const dateStr = invoiceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Karachi' });
                    const timeStr = invoiceDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
                    const plateNo = invoice.plate || invoice.vehicle?.plateNo || '';
                    const customerName = invoice.customer || '';
                    const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
                    const invoiceId = plateNo && initials ? `${plateNo}-${initials}` : '';
                    return (
                      <>
                        <div>DATE: {dateStr.toUpperCase()}</div>
                        <div>TIME: {timeStr.toUpperCase()}</div>
                        {invoiceId && <div>INVOICE ID: {invoiceId.toUpperCase()}</div>}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* Right: Logo and company address */}
              <div className="text-right">
                {/* Logo - MW with lightning bolt style */}
                {businessProfile.logo ? (
                  <div className="mb-4 flex justify-end">
                    <img 
                      src={businessProfile.logo} 
                      alt={businessProfile.name}
                      className="h-20 w-20 object-contain"
                    />
                  </div>
                ) : (
                  <div className="mb-4 flex justify-end">
                    <div className="w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-700 rounded flex items-center justify-center">
                      <span className="text-white text-3xl font-bold">MW</span>
                    </div>
                  </div>
                )}
                <div className="space-y-2 text-base text-slate-900 text-right" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  {businessProfile.address ? (
                    businessProfile.address.split('\n').map((line, index) => (
                      <div key={index}>{line.toUpperCase()}</div>
                    ))
                  ) : null}
                  <div>{businessProfile.phone}</div>
                    </div>
                </div>
              </div>
              
            {/* Billing and Payment Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              {/* Bill To */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  Bill To:
                </h3>
                <div className="space-y-2 text-base text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  <p className="font-bold">{invoice.customer.toUpperCase()}</p>
                  {invoice.customerAddress && (
                    <p>{invoice.customerAddress}</p>
                  )}
                  {invoice.customerPhone && (
                    <p>{invoice.customerPhone}</p>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  Payment Method
                </h3>
                <div className="space-y-2 text-base text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  <p className="font-bold">{currentPaymentMethod.toUpperCase()}</p>
                  {invoice.technician && (
                    <p>{invoice.technician.toUpperCase()}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Service Items Table - Gray header */}
            <div className="mb-10">
              <table className="w-full border-collapse" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                <thead>
                  <tr className="bg-slate-300">
                    <th className="text-left py-4 px-5 text-base font-bold text-slate-900 border border-slate-400">
                      DESCRIPTION
                      </th>
                    <th className="text-center py-4 px-5 text-base font-bold text-slate-900 border border-slate-400">
                      QTY
                      </th>
                    <th className="text-right py-4 px-5 text-base font-bold text-slate-900 border border-slate-400">
                      PRICE
                      </th>
                    <th className="text-right py-4 px-5 text-base font-bold text-slate-900 border border-slate-400">
                      SUBTOTAL
                      </th>
                    </tr>
                  </thead>
                <tbody>
                    {currentItems.map((item, index) => {
                      const itemPrice = getItemPrice(item);
                      const itemName = getItemName(item);
                      const itemTotal = itemPrice * item.quantity;
                      
                      return (
                      <tr key={index} className="bg-white">
                        <td className="py-4 px-5 text-base text-slate-900 border border-slate-300 font-bold">
                          {itemName.toUpperCase()}
                          </td>
                        <td className="text-center py-4 px-5 text-base text-slate-900 border border-slate-300">
                          {item.quantity.toString().padStart(2, '0')}
                          </td>
                        <td className="text-right py-4 px-5 text-base text-slate-900 border border-slate-300">
                          Rs{itemPrice.toLocaleString()}
                          </td>
                        <td className="text-right py-4 px-5 text-base font-bold text-slate-900 border border-slate-300">
                          Rs{itemTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>

            {/* Totals Section - Right aligned */}
            <div className="flex justify-end mb-10">
              <div className="w-full lg:w-96">
                <table className="w-full" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  <tbody>
                    {discount > 0 && (
                      <tr>
                        <td className="text-left py-3 text-lg font-bold text-green-600">DISCOUNT</td>
                        <td className="text-right py-3 text-lg font-bold text-green-600">-Rs{Math.round(discount).toLocaleString()}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="text-left py-3 text-lg font-bold text-slate-900">TAX</td>
                      <td className="text-right py-3 text-lg font-bold text-slate-900">Rs{Math.round(taxAmount).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="text-left py-3 text-xl font-bold text-slate-900">GRAND TOTAL</td>
                      <td className="text-right py-3 text-xl font-bold text-slate-900">Rs{Math.round(total).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes Section (if any) */}
            {(editedNotes || invoice.notes) && (
              <div className="mb-8">
                <h4 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  NOTES
                </h4>
                <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  {editedNotes || invoice.notes}
                </p>
              </div>
            )}

            {/* Footer - TERM & CONDITION and Contact Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Terms & Conditions - Left */}
              <div className="lg:col-span-1">
                <h4 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  TERM & CONDITION
                </h4>
                <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  {editedTerms || invoice.terms || DEFAULT_TERMS}
                </p>
              </div>

              {/* Contact Info - Right */}
              <div className="lg:col-span-2 text-right">
                <h4 className="text-base font-bold text-slate-900 mb-4" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  FOR ANY QUESTIONS, PLEASE CONTACT
                </h4>
                <div className="space-y-2 text-base text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  <p>{businessProfile.email.toUpperCase()}</p>
                  <p>OR {businessProfile.phone}.</p>
              </div>
                
                {/* Signature */}
                {invoice.technician && (
                  <div className="mt-8">
                    <div className="border-b-2 border-slate-900 pb-10 mb-2 inline-block w-56"></div>
                    <p className="text-base font-bold text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                      {invoice.technician.toUpperCase()}
                    </p>
                    <p className="text-sm text-slate-600" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                      GENERAL MANAGER
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-none {
            border: none !important;
          }
          
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          
          /* Ensure proper page breaks */
          .print\\:page-break-before {
            page-break-before: always;
          }
          
          .print\\:page-break-after {
            page-break-after: always;
          }
          
          /* Prevent page breaks inside elements */
          table, .print\\:keep-together {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
