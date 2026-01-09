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
  ArrowLeft,
  Printer, 
  Download, 
  Mail,
  Edit,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Car,
  Calendar,
  Banknote,
  CreditCard,
  Smartphone,
  UserCog,
  Building2,
  Phone,
  MapPin,
  Globe,
  Hash,
  FileText,
  Send,
  CheckCircle,
  Share2,
  MessageCircle,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  onEdit?: () => void;
}

// Mock business profile data (would come from Settings → Business Profile)
const businessProfile = {
  name: "MOMENTUM AUTOWORKS",
  tagline: "Premium Auto Care & Service",
  address: "House 123, Street 45, Soan Garden",
  city: "Islamabad",
  state: "Federal",
  country: "Pakistan",
  phone: "+92 300 1234567",
  email: "info@momentumauto.pk",
  website: "www.momentumauto.pk",
  taxId: "NTN-1234567",
  logo: null, // Would be uploaded in Business Profile settings
};

export function InvoiceDetail({ invoice, onClose, onEdit }: InvoiceDetailProps) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [emailTo, setEmailTo] = useState(invoice.customerEmail || "");
  const [emailSubject, setEmailSubject] = useState(`Invoice INV-${invoice.id.padStart(3, '0')} from ${businessProfile.name}`);
  const [emailMessage, setEmailMessage] = useState(`Dear ${invoice.customer},\n\nPlease find attached your invoice for the recent service at ${businessProfile.name}.\n\nThank you for your business!`);

  // Editable fields state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [isEditingFooter, setIsEditingFooter] = useState(false);
  const [editedNotes, setEditedNotes] = useState(invoice.notes || "");
  const [editedTerms, setEditedTerms] = useState(invoice.terms || "");
  const [editedFooter, setEditedFooter] = useState("Thank you for your business! For any questions regarding this invoice, please contact us.");

  // Calculate totals if items exist
  const items = invoice.items || [
    { name: "Oil Change", description: "Full synthetic oil + filter replacement", quantity: 1, unitPrice: 3500, tax: 630 },
    { name: "Brake Pad Replacement", description: "Front brake pads - ceramic", quantity: 1, unitPrice: 6800, tax: 1224 },
    { name: "General Inspection", description: "Complete vehicle inspection", quantity: 1, unitPrice: 500, tax: 90 },
    { name: "Labor Charges", description: "Technician service time", quantity: 2, unitPrice: 1500, tax: 270 },
  ];

  const taxRate = invoice.taxRate || 0.18; // 18% default
  
  // Helper function to get item price (handles both old and new format)
  const getItemPrice = (item: any) => item.unitPrice ?? item.price ?? 0;
  
  // Helper function to get item name (handles both old and new format)
  const getItemName = (item: any) => item.name ?? item.description ?? "Service";
  
  const subtotal = invoice.subtotal || items.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0);
  const taxAmount = invoice.tax || items.reduce((sum, item) => {
    const itemPrice = getItemPrice(item);
    return sum + (item.tax || (itemPrice * item.quantity * taxRate));
  }, 0);
  const discount = invoice.discount || 0;
  const total = invoice.amount || (subtotal - discount + taxAmount);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return <CheckCircle2 className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-red-100 text-red-700 border-red-200";
    }
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
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = margin;

      // Set background color (beige)
      doc.setFillColor(245, 245, 220);
      doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

      // INVOICE title - Large red letters on left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(48);
      doc.setTextColor(197, 48, 50); // Red color
      doc.text("INVOICE", margin, currentY + 20);
      doc.setTextColor(0, 0, 0);

      // Invoice details on left below INVOICE
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(`INVOICE NUMBER: #${invoice.id.padStart(4, '0')}`, margin, currentY + 30);
      const invoiceDate = typeof invoice.date === 'string' ? invoice.date : new Date(invoice.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      doc.text(`DATE: ${invoiceDate.toUpperCase()}`, margin, currentY + 36);
      doc.text(`DUE DATE: ${invoiceDate.toUpperCase()}`, margin, currentY + 42);

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
      doc.text(businessProfile.address.toUpperCase(), pageWidth - margin, addressStartY, { align: "right" });
      doc.text(businessProfile.city.toUpperCase(), pageWidth - margin, addressStartY + 6, { align: "right" });
      doc.text(businessProfile.phone, pageWidth - margin, addressStartY + 12, { align: "right" });

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
      if (invoice.customerPhone) {
        doc.text(invoice.customerPhone, paymentColumnX, currentY + 18);
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
      const summaryStartY = tableFinalY + 10;
      const labelWidth = 40;
      
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

      // Terms & Conditions
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TERM & CONDITION", footerLeftX, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const termsText = editedTerms || invoice.terms || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent placerat vel sapien a ornare.";
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

      doc.save(`Invoice-INV-${invoice.id.padStart(6, '0')}.pdf`);
      setShowPreviewModal(false);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Unable to generate PDF. Please try again.");
    }
  };

  const handleShareWhatsApp = () => {
    const invoiceNumber = `INV-${invoice.id.padStart(6, '0')}`;
    const message = `Invoice ${invoiceNumber} from ${businessProfile.name}\n\nCustomer: ${invoice.customer}\nAmount: Rs${total.toLocaleString('en-US')}\n\nView invoice details at your convenience.`;
    const whatsappUrl = `https://wa.me/${invoice.customerPhone?.replace(/[^0-9]/g, '') || ''}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  const handleShareEmail = () => {
    setShowEmailDialog(true);
    setShowShareMenu(false);
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

  const handleSendEmail = () => {
    // In a real app, this would send the invoice via email
    console.log("Sending email to:", emailTo);
    console.log("Subject:", emailSubject);
    console.log("Message:", emailMessage);
    alert(`Invoice sent to ${emailTo}!`);
    setShowEmailDialog(false);
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
            <p className="text-sm text-slate-600">INV-{invoice.id.padStart(3, '0')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleDownloadClick}>
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Download PDF</span>
          </Button>
          
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
                  <Card className="p-8 lg:p-12 bg-[#f5f5dc] print:shadow-none print:border-none" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                    {/* Header - INVOICE in large red, logo top right */}
                    <div className="flex items-start justify-between mb-8">
                      {/* Left: INVOICE title and details */}
                      <div className="flex-1">
                        <h1 className="text-6xl lg:text-7xl font-bold text-[#c53032] mb-6 leading-none" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          INVOICE
                        </h1>
                        <div className="space-y-1 text-sm text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          <div>INVOICE NUMBER: #{invoice.id.padStart(4, '0')}</div>
                          <div>DATE: {typeof invoice.date === 'string' ? invoice.date.toUpperCase() : new Date(invoice.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div>
                          <div>DUE DATE: {typeof invoice.date === 'string' ? invoice.date.toUpperCase() : new Date(invoice.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div>
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
                              className="h-16 w-16 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="mb-4 flex justify-end">
                            <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-200 rounded-lg flex items-center justify-center">
                              <span className="text-white text-2xl font-bold">MW</span>
                            </div>
                          </div>
                        )}
                        <div className="space-y-1 text-sm text-slate-900 text-right" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          <div>{businessProfile.address.toUpperCase()}</div>
                          <div>{businessProfile.city.toUpperCase()}</div>
                          <div>{businessProfile.phone}</div>
                        </div>
                      </div>
                    </div>

                    {/* Billing and Payment Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                      {/* Bill To */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          Bill To:
                        </h3>
                        <div className="space-y-1 text-sm text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
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
                        <h3 className="text-sm font-bold text-slate-900 mb-3" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          Payment Method
                        </h3>
                        <div className="space-y-1 text-sm text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          <p className="font-bold">{invoice.paymentMethod.toUpperCase()}</p>
                          {invoice.technician && (
                            <p>{invoice.technician.toUpperCase()}</p>
                          )}
                          {invoice.customerPhone && (
                            <p>{invoice.customerPhone}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Service Items Table - Gray header */}
                    <div className="mb-8">
                      <table className="w-full border-collapse" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                        <thead>
                          <tr className="bg-slate-300">
                            <th className="text-left py-3 px-4 text-sm font-bold text-slate-900 border border-slate-400">
                              DESCRIPTION
                            </th>
                            <th className="text-center py-3 px-4 text-sm font-bold text-slate-900 border border-slate-400">
                              QTY
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-bold text-slate-900 border border-slate-400">
                              PRICE
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-bold text-slate-900 border border-slate-400">
                              SUBTOTAL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => {
                            const itemPrice = getItemPrice(item);
                            const itemName = getItemName(item);
                            const itemTotal = itemPrice * item.quantity;
                            
                            return (
                              <tr key={index} className="bg-white">
                                <td className="py-3 px-4 text-sm text-slate-900 border border-slate-300">
                                  {itemName.toUpperCase()}
                                </td>
                                <td className="text-center py-3 px-4 text-sm text-slate-900 border border-slate-300">
                                  {item.quantity.toString().padStart(2, '0')}
                                </td>
                                <td className="text-right py-3 px-4 text-sm text-slate-900 border border-slate-300">
                                  Rs{itemPrice.toLocaleString('en-US')}
                                </td>
                                <td className="text-right py-3 px-4 text-sm font-bold text-slate-900 border border-slate-300">
                                  Rs{itemTotal.toLocaleString('en-US')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals Section - Right aligned */}
                    <div className="flex justify-end mb-8">
                      <div className="w-full lg:w-80">
                        <table className="w-full" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          <tbody>
                            <tr>
                              <td className="text-left py-2 text-sm font-bold text-slate-900">TAX</td>
                              <td className="text-right py-2 text-sm font-bold text-slate-900">Rs{Math.round(taxAmount).toLocaleString('en-US')}</td>
                            </tr>
                            <tr>
                              <td className="text-left py-2 text-base font-bold text-slate-900">GRAND TOTAL</td>
                              <td className="text-right py-2 text-base font-bold text-slate-900">Rs{Math.round(total).toLocaleString('en-US')}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer - TERM & CONDITION and Contact Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                      {/* Terms & Conditions - Left */}
                      <div className="lg:col-span-1">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                            TERM & CONDITION
                          </h4>
                        </div>
                        <p className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          {editedTerms || invoice.terms || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent placerat vel sapien a ornare."}
                        </p>
                      </div>

                      {/* Contact Info - Right */}
                      <div className="lg:col-span-2 text-right">
                        <h4 className="text-sm font-bold text-slate-900 mb-3" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          FOR ANY QUESTIONS, PLEASE CONTACT
                        </h4>
                        <div className="space-y-1 text-sm text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                          <p>{businessProfile.email.toUpperCase()}</p>
                          <p>OR {businessProfile.phone}.</p>
                        </div>
                        
                        {/* Signature */}
                        {invoice.technician && (
                          <div className="mt-6">
                            <div className="border-b-2 border-slate-900 pb-8 mb-2 inline-block w-48"></div>
                            <p className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                              {invoice.technician.toUpperCase()}
                            </p>
                            <p className="text-xs text-slate-600" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
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
                  <Button
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="bg-[#c53032] hover:bg-[#a6212a] text-white"
                  >
            <Download className="h-4 w-4 mr-2" />
                    Download PDF
          </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Email Dialog */}
          <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-[#c53032] text-white hover:bg-[#a6212a] hover:text-white border-[#c53032]"
              >
                <Mail className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Email</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Email Invoice</DialogTitle>
                <DialogDescription>
                  Send this invoice to the customer via email
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-to">To</Label>
                  <Input
                    id="email-to"
                    type="email"
                    placeholder="customer@email.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-subject">Subject</Label>
                  <Input
                    id="email-subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-message">Message</Label>
                  <Textarea
                    id="email-message"
                    rows={5}
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSendEmail}
                    className="flex-1 bg-[#c53032] hover:bg-[#a6212a]"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowEmailDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          )}
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
                  invoice.status === "Paid" ? "bg-green-100" :
                  invoice.status === "Pending" ? "bg-orange-100" : "bg-red-100"
                }`}>
                  {getStatusIcon(invoice.status)}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <PaymentIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Payment Method</p>
                  <p className="font-medium text-sm">{invoice.paymentMethod}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Invoice Date</p>
                  <p className="font-medium text-sm">{invoice.date}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Invoice Document - Anonymous Pro Design */}
          <Card className="p-8 lg:p-12 bg-[#f5f5dc] print:shadow-none print:border-none" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
            {/* Header - INVOICE in large red, logo top right */}
            <div className="flex items-start justify-between mb-8">
              {/* Left: INVOICE title and details */}
              <div className="flex-1">
                <h1 className="text-6xl lg:text-7xl font-bold text-[#c53032] mb-6 leading-none" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  INVOICE
                </h1>
                <div className="space-y-1 text-sm text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  <div>INVOICE NUMBER: #{invoice.id.padStart(4, '0')}</div>
                  <div>DATE: {typeof invoice.date === 'string' ? invoice.date.toUpperCase() : new Date(invoice.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div>
                  <div>DUE DATE: {typeof invoice.date === 'string' ? invoice.date.toUpperCase() : new Date(invoice.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</div>
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
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                ) : (
                  <div className="mb-4 flex justify-end">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">MW</span>
                    </div>
                  </div>
                )}
                <div className="space-y-1 text-sm text-slate-900 text-right" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  <div>{businessProfile.address.toUpperCase()}</div>
                  <div>{businessProfile.city.toUpperCase()}</div>
                  <div>{businessProfile.phone}</div>
                    </div>
                </div>
              </div>
              
            {/* Billing and Payment Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Bill To */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  Bill To:
                </h3>
                <div className="space-y-1 text-sm text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
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
                <h3 className="text-sm font-bold text-slate-900 mb-3" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  Payment Method
                </h3>
                <div className="space-y-1 text-sm text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  <p className="font-bold">{invoice.paymentMethod.toUpperCase()}</p>
                  {invoice.technician && (
                    <p>{invoice.technician.toUpperCase()}</p>
                  )}
                  {invoice.customerPhone && (
                    <p>{invoice.customerPhone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Service Items Table - Gray header */}
            <div className="mb-8">
              <table className="w-full border-collapse" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                <thead>
                  <tr className="bg-slate-300">
                    <th className="text-left py-3 px-4 text-sm font-bold text-slate-900 border border-slate-400">
                      DESCRIPTION
                      </th>
                    <th className="text-center py-3 px-4 text-sm font-bold text-slate-900 border border-slate-400">
                      QTY
                      </th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-900 border border-slate-400">
                      PRICE
                      </th>
                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-900 border border-slate-400">
                      SUBTOTAL
                      </th>
                    </tr>
                  </thead>
                <tbody>
                    {items.map((item, index) => {
                      const itemPrice = getItemPrice(item);
                      const itemName = getItemName(item);
                      const itemTotal = itemPrice * item.quantity;
                      
                      return (
                      <tr key={index} className="bg-white">
                        <td className="py-3 px-4 text-sm text-slate-900 border border-slate-300">
                          {itemName.toUpperCase()}
                          </td>
                        <td className="text-center py-3 px-4 text-sm text-slate-900 border border-slate-300">
                          {item.quantity.toString().padStart(2, '0')}
                          </td>
                        <td className="text-right py-3 px-4 text-sm text-slate-900 border border-slate-300">
                          ₨{itemPrice.toLocaleString()}
                          </td>
                        <td className="text-right py-3 px-4 text-sm font-bold text-slate-900 border border-slate-300">
                          ₨{itemTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>

            {/* Totals Section - Right aligned */}
            <div className="flex justify-end mb-8">
              <div className="w-full lg:w-80">
                <table className="w-full" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  <tbody>
                    <tr>
                      <td className="text-left py-2 text-sm font-bold text-slate-900">TAX</td>
                      <td className="text-right py-2 text-sm font-bold text-slate-900">₨{Math.round(taxAmount).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="text-left py-2 text-base font-bold text-slate-900">GRAND TOTAL</td>
                      <td className="text-right py-2 text-base font-bold text-slate-900">₨{Math.round(total).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>

            {/* Signatures Section - Minimal */}
            {(invoice.technician || invoice.supervisor) && (
              <div className="mb-12">
                <div className="border-t border-slate-200 pt-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Technician Signature */}
                {invoice.technician && (
                  <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Technician</p>
                        <div className="border-b border-slate-300 pb-8 mb-2">
                      {invoice.technicianSignature && (
                        <div className="text-center text-2xl text-slate-400 italic">
                          {invoice.technicianSignature}
                        </div>
                      )}
                    </div>
                        <p className="font-semibold text-slate-900">{invoice.technician}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Authorized Technician</p>
                  </div>
                )}

                {/* Supervisor Signature */}
                {invoice.supervisor && (
                  <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Supervisor</p>
                        <div className="border-b border-slate-300 pb-8 mb-2">
                      {invoice.supervisorSignature && (
                        <div className="text-center text-2xl text-slate-400 italic">
                          {invoice.supervisorSignature}
                        </div>
                      )}
                    </div>
                        <p className="font-semibold text-slate-900">{invoice.supervisor}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Authorized Supervisor</p>
                  </div>
                )}
              </div>
            </div>
              </div>
            )}

            {/* Notes/Terms - Editable */}
            <div className="mb-12 space-y-6">
              {/* Notes Section */}
                    <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</h4>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsEditingNotes(!isEditingNotes)}
                    >
                      {isEditingNotes ? "Save" : <Edit className="h-3 w-3 mr-1" />}
                      {isEditingNotes ? null : "Edit"}
                    </Button>
                  )}
                    </div>
                {isEditingNotes && onEdit ? (
                  <Textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Add notes..."
                    className="min-h-[100px] text-sm"
                    onBlur={() => {
                      setIsEditingNotes(false);
                      // Here you would save to backend
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {editedNotes || invoice.notes || <span className="text-slate-400 italic">No notes added</span>}
                  </p>
                )}
              </div>

              {/* Terms Section */}
                    <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Terms & Conditions</h4>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsEditingTerms(!isEditingTerms)}
                    >
                      {isEditingTerms ? "Save" : <Edit className="h-3 w-3 mr-1" />}
                      {isEditingTerms ? null : "Edit"}
                    </Button>
                  )}
                    </div>
                {isEditingTerms && onEdit ? (
                  <Textarea
                    value={editedTerms}
                    onChange={(e) => setEditedTerms(e.target.value)}
                    placeholder="Add terms and conditions..."
                    className="min-h-[100px] text-sm"
                    onBlur={() => {
                      setIsEditingTerms(false);
                      // Here you would save to backend
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {editedTerms || invoice.terms || <span className="text-slate-400 italic">No terms specified</span>}
                  </p>
                  )}
                </div>
            </div>

            {/* Footer - TERM & CONDITION and Contact Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Terms & Conditions - Left */}
              <div className="lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                    TERM & CONDITION
                  </h4>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsEditingTerms(!isEditingTerms)}
                    >
                      {isEditingTerms ? "Save" : <Edit className="h-3 w-3 mr-1" />}
                      {isEditingTerms ? null : "Edit"}
                    </Button>
                  )}
                </div>
                {isEditingTerms && onEdit ? (
                  <Textarea
                    value={editedTerms}
                    onChange={(e) => setEditedTerms(e.target.value)}
                    placeholder="Add terms and conditions..."
                    className="min-h-[100px] text-sm"
                    style={{ fontFamily: "'Anonymous Pro', monospace" }}
                    onBlur={() => {
                      setIsEditingTerms(false);
                    }}
                  />
                ) : (
                  <p className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                    {editedTerms || invoice.terms || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent placerat vel sapien a ornare. Morbi faucibus nunc diam, in sodales nunc rutrum et."}
                  </p>
                )}
              </div>

              {/* Contact Info - Right */}
              <div className="lg:col-span-2 text-right">
                <h4 className="text-sm font-bold text-slate-900 mb-3" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  FOR ANY QUESTIONS, PLEASE CONTACT
                </h4>
                <div className="space-y-1 text-sm text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                  <p>{businessProfile.email.toUpperCase()}</p>
                  <p>OR {businessProfile.phone}.</p>
              </div>
                
                {/* Signature */}
                {invoice.technician && (
                  <div className="mt-6">
                    <div className="border-b-2 border-slate-900 pb-8 mb-2 inline-block w-48"></div>
                    <p className="text-sm font-bold text-slate-900" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
                      {invoice.technician.toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-600" style={{ fontFamily: "'Anonymous Pro', monospace" }}>
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
