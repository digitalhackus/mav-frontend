import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { settingsAPI } from "../api/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Download, Share2, Printer, X, Mail, MessageCircle, Check, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: {
    invoiceNumber: string;
    issueDate: string;
    jobId?: string;
    customer: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
    };
    vehicle: {
      year?: string | number;
      make: string;
      model: string;
      plate?: string;
      plateNo?: string;
    };
    services: Array<{
      name: string;
      estimatedCost: number;
      quantity?: number;
    }>;
    technician?: {
      name: string;
    };
    totalCost: number;
    subtotal?: number;
    tax?: number;
    discount?: number;
    notes?: string;
  };
  onShare?: (method: 'email' | 'whatsapp') => void;
  onCreateInvoice?: () => Promise<void>;
  isCreating?: boolean;
}

// Default terms and conditions
const DEFAULT_TERMS = "Payment is due immediately upon receipt. No credit is extended under any circumstances.\nQuoted rates are valid for 5 days only and may change thereafter.";

export function InvoicePreviewModal({
  open,
  onOpenChange,
  invoiceData,
  onShare,
  onCreateInvoice,
  isCreating = false,
}: InvoicePreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [businessProfile, setBusinessProfile] = useState({
    name: "Momentum AutoWorks",
    address: "123 Auto Street, Workshop City",
    city: "Punjab, Pakistan",
    phone: "+92 300 1234567",
    email: "info@momentumautoworks.com",
  });

  // Fetch business profile from settings
  useEffect(() => {
    const fetchBusinessProfile = async () => {
      try {
        const response = await settingsAPI.get();
        if (response.success && response.data?.workshop) {
          const workshop = response.data.workshop;
          setBusinessProfile({
            name: workshop.businessName || "Momentum AutoWorks",
            address: workshop.address || "123 Auto Street, Workshop City",
            city: "",
            phone: workshop.phone || "+92 300 1234567",
            email: workshop.email || "info@momentumautoworks.com",
          });
        }
      } catch (error) {
        console.error("Failed to fetch business profile:", error);
      }
    };
    fetchBusinessProfile();
  }, []);

  const loadLogoAsDataUrl = async (): Promise<string | null> => {
    try {
      const logoPath = "/1.png";
      const response = await fetch(logoPath);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = margin;

      const logoDataUrl = await loadLogoAsDataUrl();
      if (logoDataUrl) {
        // Load image to get dimensions and maintain aspect ratio
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(null);
          img.onerror = reject;
          img.src = logoDataUrl;
        });
        
        // Calculate dimensions to fit in a square container (30x30mm) while maintaining aspect ratio
        const containerSize = 30;
        const imgAspect = img.width / img.height;
        let logoWidth = containerSize;
        let logoHeight = containerSize;
        
        if (imgAspect > 1) {
          // Image is wider than tall - fit to width, center vertically
          logoHeight = containerSize / imgAspect;
        } else {
          // Image is taller than wide or square - fit to height, center horizontally
          logoWidth = containerSize * imgAspect;
        }
        
        // Position logo at top left, centered within square container
        const logoX = margin;
        const logoY = currentY;
        doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
      }

      const headerLeftX = margin + (logoDataUrl ? 40 : 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(businessProfile.name, headerLeftX, currentY + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      if (businessProfile.address) {
        const addressLines = businessProfile.address.split('\n').filter(line => line.trim());
        addressLines.forEach((line, index) => {
          doc.text(line, headerLeftX, currentY + 16 + (index * 5));
        });
        doc.text(`Phone: ${businessProfile.phone}`, headerLeftX, currentY + 16 + (addressLines.length * 5));
        doc.text(businessProfile.email, headerLeftX, currentY + 16 + (addressLines.length * 5) + 5);
      } else {
        doc.text(`Phone: ${businessProfile.phone}`, headerLeftX, currentY + 16);
        doc.text(businessProfile.email, headerLeftX, currentY + 21);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("INVOICE", pageWidth - margin, currentY + 8, { align: "right" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      // Show date, time, and invoice ID separately
      const invoiceDate = new Date(invoiceData.issueDate);
      const dateStr = invoiceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const timeStr = invoiceDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      // Generate invoice ID from plate number and customer name initials
      const plateNo = invoiceData.vehicle?.plateNo || invoiceData.vehicle?.plate || '';
      const customerName = invoiceData.customer?.name || '';
      const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
      const invoiceId = plateNo && initials ? `${plateNo}-${initials}` : '';
      
      doc.text(`Date: ${dateStr}`, pageWidth - margin, currentY + 18, { align: "right" });
      doc.text(`Time: ${timeStr}`, pageWidth - margin, currentY + 25, { align: "right" });
      if (invoiceId) {
        doc.text(`Invoice ID: ${invoiceId.toUpperCase()}`, pageWidth - margin, currentY + 32, { align: "right" });
      }

      currentY += 45;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("BILL TO", margin, currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(invoiceData.customer.name, margin, currentY + 7);
      if (invoiceData.customer.phone) {
        doc.text(invoiceData.customer.phone, margin, currentY + 12);
      }
      if (invoiceData.customer.email) {
        doc.text(invoiceData.customer.email, margin, currentY + 17);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const vehicleColumnX = pageWidth / 2;
      doc.text("VEHICLE", vehicleColumnX, currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const vehicleYear = invoiceData.vehicle.year || "";
      doc.text(
        `${vehicleYear} ${invoiceData.vehicle.make} ${invoiceData.vehicle.model}`.trim(),
        vehicleColumnX,
        currentY + 7
      );
      // Reuse plateNo already declared above
      if (plateNo) {
        doc.text(`License Plate: ${plateNo}`, vehicleColumnX, currentY + 12);
      }
      if (invoiceData.technician?.name) {
        doc.text(`Assigned Technician: ${invoiceData.technician.name}`, vehicleColumnX, currentY + 17);
      }

      currentY += 32;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Summary", margin, currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Total Items: ${invoiceData.services.length}`, margin, currentY + 6);

      currentY += 15;

      autoTable(doc, {
        startY: currentY,
        head: [["Description", "Qty", "Unit Price", "Line Total"]],
        body: invoiceData.services.map((service) => {
          const amount = Number(service.estimatedCost) || 0;
          const quantity = service.quantity || 1;
          return [
            service.name || "Service",
            quantity.toString(),
            formatCurrency(amount),
            formatCurrency(amount * quantity),
          ];
        }),
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [197, 48, 50], textColor: 255, halign: "left" },
        columnStyles: {
          1: { halign: "center" },
          2: { halign: "right" },
          3: { halign: "right" },
        },
        alternateRowStyles: { fillColor: [248, 248, 248] },
      });

      const tableFinalY = (doc as any).lastAutoTable?.finalY ?? currentY + 20;

      const subtotal = invoiceData.subtotal || invoiceData.totalCost;
      const taxes = invoiceData.tax || 0;
      const discount = invoiceData.discount || 0;
      const grandTotal = subtotal + taxes - discount;
      const summaryX = pageWidth - margin;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Subtotal: ${formatCurrency(subtotal)}`, summaryX, tableFinalY + 10, { align: "right" });
      if (discount > 0) {
        doc.text(`Discount: ${formatCurrency(discount)}`, summaryX, tableFinalY + 17, { align: "right" });
      }
      // Calculate tax rate percentage for display (assuming 16% GST if tax > 0)
      const taxRatePercent = taxes > 0 && subtotal > 0 ? Math.round((taxes / subtotal) * 100) : 16;
      doc.text(`GST (${taxRatePercent}%): ${formatCurrency(taxes)}`, summaryX, tableFinalY + (discount > 0 ? 24 : 17), { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Amount Due: ${formatCurrency(grandTotal)}`, summaryX, tableFinalY + (discount > 0 ? 35 : 28), { align: "right" });

      // Footer - Terms and Contact
      const footerY = tableFinalY + (discount > 0 ? 53 : 46);
      const footerLeftX = margin;
      const footerRightX = pageWidth - margin;

      // Terms & Conditions on left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TERM & CONDITION", footerLeftX, footerY);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const termsText = invoiceData.notes || DEFAULT_TERMS;
      doc.text(
        termsText,
        footerLeftX,
        footerY + 6,
        { maxWidth: (pageWidth - margin * 2) / 2 }
      );

      // Contact info on right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("FOR ANY QUESTIONS, PLEASE CONTACT", footerRightX, footerY, { align: "right" });
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(businessProfile.email.toUpperCase(), footerRightX, footerY + 6, { align: "right" });
      doc.text(`OR ${businessProfile.phone}.`, footerRightX, footerY + 12, { align: "right" });

      const plateNo = invoiceData.vehicle?.plateNo || invoiceData.vehicle?.plate || '';
      const customerName = invoiceData.customer?.name || '';
      const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
      const invoiceId = (plateNo && initials) ? `${plateNo}-${initials}` : invoiceData.invoiceNumber;
      doc.save(`Invoice-${invoiceId}.pdf`);
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Failed to generate invoice", error);
      toast.error("Could not generate invoice. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceData.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .invoice-title { font-size: 32px; font-weight: bold; color: #c53032; }
            .invoice-details { text-align: right; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #c53032; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            .total-section { text-align: right; margin-top: 20px; }
            .total-amount { font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          ${generateInvoiceHTML()}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const generateInvoiceHTML = () => {
    const subtotal = invoiceData.subtotal || invoiceData.totalCost;
    const taxes = invoiceData.tax || 0;
    const discount = invoiceData.discount || 0;
    const grandTotal = subtotal + taxes - discount;
    const vehicleYear = invoiceData.vehicle.year || "";
    const plateNo = invoiceData.vehicle.plateNo || invoiceData.vehicle.plate || "";

    return `
      <div class="invoice-preview">
        <div class="invoice-header">
          <div class="invoice-header-left">
            <h1 class="invoice-title">${businessProfile.name}</h1>
            ${businessProfile.address ? `<p>${businessProfile.address.split('\n').join('</p><p>')}</p>` : ''}
            <p>Phone: ${businessProfile.phone}</p>
            <p>${businessProfile.email}</p>
          </div>
          <div class="invoice-header-right">
            <div class="invoice-details">
              <h2>INVOICE</h2>
              ${(() => {
                const invoiceDate = new Date(invoiceData.issueDate);
                const dateStr = invoiceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                const timeStr = invoiceDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const plateNo = invoiceData.vehicle?.plateNo || invoiceData.vehicle?.plate || '';
                const customerName = invoiceData.customer?.name || '';
                const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
                const invoiceId = plateNo && initials ? `${plateNo}-${initials}` : '';
                return `
                  <p><strong>Date:</strong> ${dateStr}</p>
                  <p><strong>Time:</strong> ${timeStr}</p>
                  ${invoiceId ? `<p><strong>Invoice ID:</strong> ${invoiceId.toUpperCase()}</p>` : ''}
                `;
              })()}
            </div>
          </div>
        </div>

        <div class="customer-vehicle-section">
          <div class="section">
            <div class="section-title">BILL TO</div>
            <p>${invoiceData.customer.name}</p>
            ${invoiceData.customer.phone ? `<p>${invoiceData.customer.phone}</p>` : ""}
            ${invoiceData.customer.email ? `<p>${invoiceData.customer.email}</p>` : ""}
          </div>
          <div class="section">
            <div class="section-title">VEHICLE</div>
            <p>${vehicleYear ? `${vehicleYear} ` : ""}${invoiceData.vehicle.make} ${invoiceData.vehicle.model}</p>
            ${plateNo ? `<p>License Plate: ${plateNo}</p>` : ""}
            ${invoiceData.technician?.name ? `<p>Assigned Technician: ${invoiceData.technician.name}</p>` : ""}
          </div>
        </div>

        <div class="summary-section">
          <div class="section-title">Summary</div>
          <p>Total Items: ${invoiceData.services.length}</p>
        </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.services.map((service) => {
            const amount = Number(service.estimatedCost) || 0;
            const quantity = service.quantity || 1;
            return `
              <tr>
                <td>${service.name || "Service"}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(amount)}</td>
                <td>${formatCurrency(amount * quantity)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <div class="total-section">
        <p>Subtotal: ${formatCurrency(subtotal)}</p>
        ${discount > 0 ? `<p>Discount: ${formatCurrency(discount)}</p>` : ""}
        ${(() => {
          const taxRatePercent = taxes > 0 && subtotal > 0 ? Math.round((taxes / subtotal) * 100) : 16;
          return `<p>GST (${taxRatePercent}%): ${formatCurrency(taxes)}</p>`;
        })()}
        <p class="total-amount">Amount Due: ${formatCurrency(grandTotal)}</p>
      </div>

      <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #666;">
        <div style="flex: 1; max-width: 50%;">
          <p style="font-weight: bold; margin-bottom: 8px;">TERM & CONDITION</p>
          <p style="font-size: 10px; margin-bottom: 8px; white-space: pre-line;">${invoiceData.notes || DEFAULT_TERMS}</p>
        </div>
        <div style="flex: 1; max-width: 45%; text-align: right;">
          <p style="font-weight: bold; margin-bottom: 8px;">FOR ANY QUESTIONS, PLEASE CONTACT</p>
          <p style="font-size: 10px; margin-bottom: 4px;">${businessProfile.email.toUpperCase()}</p>
          <p style="font-size: 10px;">OR ${businessProfile.phone}.</p>
        </div>
      </div>
      <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
        <p>Thank you for choosing ${businessProfile.name}!</p>
      </div>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Invoice Preview</DialogTitle>
              <DialogDescription>
                Review your invoice before downloading or sharing
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          <div 
            className="bg-white p-8 shadow-sm mx-auto"
            style={{
              fontFamily: 'Arial, sans-serif',
              maxWidth: '800px',
              width: '100%',
            }}
            dangerouslySetInnerHTML={{ 
              __html: `
                <style>
                  .invoice-preview { 
                    font-family: Arial, sans-serif; 
                    max-width: 800px;
                    width: 100%;
                    margin: 0 auto;
                  }
                  .invoice-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: flex-start;
                    margin-bottom: 30px; 
                  }
                  .invoice-header-left {
                    flex: 1;
                    max-width: 50%;
                  }
                  .invoice-header-right {
                    text-align: right;
                    flex-shrink: 0;
                    max-width: 45%;
                  }
                  .invoice-title { 
                    font-size: 24px; 
                    font-weight: bold; 
                    color: #c53032; 
                    margin-bottom: 10px; 
                  }
                  .invoice-details { 
                    text-align: right; 
                  }
                  .invoice-details h2 {
                    font-size: 24px;
                    font-weight: bold;
                    color: #c53032;
                    margin: 0 0 10px 0;
                  }
                  .invoice-details p {
                    margin: 4px 0;
                    font-size: 12px;
                  }
                  .customer-vehicle-section {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                    gap: 40px;
                  }
                  .section { 
                    margin-bottom: 20px; 
                    flex: 1;
                    min-width: 0;
                  }
                  .section-title { 
                    font-weight: bold; 
                    margin-bottom: 10px; 
                    font-size: 12px; 
                    text-transform: uppercase;
                  }
                  .section p {
                    margin: 4px 0;
                    font-size: 12px;
                  }
                  .summary-section {
                    margin-bottom: 20px;
                  }
                  .summary-section p {
                    margin: 4px 0;
                    font-size: 12px;
                  }
                  table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 20px 0; 
                    table-layout: fixed;
                  }
                  table th:nth-child(1) { width: 50%; }
                  table th:nth-child(2) { width: 15%; }
                  table th:nth-child(3) { width: 17.5%; }
                  table th:nth-child(4) { width: 17.5%; }
                  th { 
                    background-color: #c53032; 
                    color: white; 
                    padding: 12px; 
                    text-align: left; 
                    font-size: 12px; 
                    font-weight: bold;
                  }
                  td { 
                    padding: 10px 12px; 
                    border-bottom: 1px solid #ddd; 
                    font-size: 12px; 
                    word-wrap: break-word;
                  }
                  td:nth-child(2),
                  td:nth-child(3),
                  td:nth-child(4) {
                    text-align: right;
                  }
                  tbody tr:last-child td {
                    border-bottom: none;
                  }
                  .total-section { 
                    text-align: right; 
                    margin-top: 20px; 
                  }
                  .total-section p {
                    margin: 6px 0;
                    font-size: 12px;
                  }
                  .total-amount { 
                    font-size: 18px; 
                    font-weight: bold; 
                    color: #c53032;
                    margin-top: 10px;
                  }
                  p { 
                    margin: 4px 0; 
                    font-size: 12px; 
                  }
                  .invoice-footer { 
                    text-align: center; 
                    margin-top: 40px; 
                    font-size: 12px; 
                    color: #666; 
                  }
                  .invoice-footer p {
                    margin: 4px 0;
                  }
                </style>
                ${generateInvoiceHTML()}
              `
            }} 
          />
        </div>

        <div className="px-6 py-4 border-t bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {onShare && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (invoiceData.customer.email) {
                      const plateNo = invoiceData.vehicle?.plateNo || invoiceData.vehicle?.plate || '';
                      const customerName = invoiceData.customer?.name || '';
                      const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
                      const invoiceId = (plateNo && initials) ? `${plateNo}-${initials}` : invoiceData.invoiceNumber;
                      const subject = encodeURIComponent(`Invoice ${invoiceId} - ${businessProfile.name}`);
                      const body = encodeURIComponent(
                        `Dear ${invoiceData.customer.name},\n\n` +
                        `Please find attached invoice ${invoiceId} for your vehicle.\n\n` +
                        `Invoice Details:\n` +
                        `- Invoice ID: ${invoiceId}\n` +
                        `- Date: ${invoiceData.issueDate}\n` +
                        `- Total Amount: ${formatCurrency(invoiceData.totalCost)}\n\n` +
                        `Thank you for choosing ${businessProfile.name}!\n\n` +
                        `Best regards,\n${businessProfile.name} Team`
                      );
                      const mailtoUrl = `mailto:${invoiceData.customer.email}?subject=${subject}&body=${body}`;
                      window.location.href = mailtoUrl;
                    } else {
                      toast.error("Customer email is not available");
                    }
                  }}
                  disabled={!invoiceData.customer.email}
                  className="flex-shrink-0"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Share via Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onShare('whatsapp');
                    const plateNo = invoiceData.vehicle?.plateNo || invoiceData.vehicle?.plate || '';
                    const customerName = invoiceData.customer?.name || '';
                    const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
                    const invoiceId = (plateNo && initials) ? `${plateNo}-${initials}` : invoiceData.invoiceNumber;
                    const message = `Invoice ${invoiceId} - ${formatCurrency(invoiceData.totalCost)}`;
                    const whatsappUrl = `https://wa.me/${invoiceData.customer.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  disabled={!invoiceData.customer.phone}
                  className="flex-shrink-0"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Share via WhatsApp
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex-shrink-0"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="bg-[#c53032] hover:bg-[#a6212a] text-white flex-shrink-0"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
            {onCreateInvoice && (
              <Button
                onClick={onCreateInvoice}
                disabled={isCreating || isGenerating}
                className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Invoice
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

