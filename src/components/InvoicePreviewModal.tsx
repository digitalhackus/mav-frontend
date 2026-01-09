import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Download, Share2, Printer, X, Mail, MessageCircle } from "lucide-react";
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
  };
  onShare?: (method: 'email' | 'whatsapp') => void;
}

export function InvoicePreviewModal({
  open,
  onOpenChange,
  invoiceData,
  onShare,
}: InvoicePreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

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
        doc.addImage(logoDataUrl, "PNG", margin, currentY, 30, 30);
      }

      const headerLeftX = margin + (logoDataUrl ? 40 : 0);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Momentum AutoWorks", headerLeftX, currentY + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("123 Auto Street, Workshop City", headerLeftX, currentY + 16);
      doc.text("Punjab, Pakistan", headerLeftX, currentY + 21);
      doc.text("Phone: +92 300 0000000", headerLeftX, currentY + 26);
      doc.text("info@momentumautoworks.com", headerLeftX, currentY + 31);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("INVOICE", pageWidth - margin, currentY + 8, { align: "right" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice #: ${invoiceData.invoiceNumber}`, pageWidth - margin, currentY + 18, { align: "right" });
      doc.text(`Date: ${invoiceData.issueDate}`, pageWidth - margin, currentY + 25, { align: "right" });
      if (invoiceData.jobId) {
        doc.text(`Job ID: ${invoiceData.jobId}`, pageWidth - margin, currentY + 32, { align: "right" });
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
      const plateNo = invoiceData.vehicle.plateNo || invoiceData.vehicle.plate || "";
      if (plateNo) {
        doc.text(`License Plate: ${plateNo}`, vehicleColumnX, currentY + 12);
      }
      if (invoiceData.technician?.name) {
        doc.text(`Assigned Technician: ${invoiceData.technician.name}`, vehicleColumnX, currentY + 17);
      }

      currentY += 32;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Service Summary", margin, currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Total Services: ${invoiceData.services.length}`, margin, currentY + 6);

      currentY += 15;

      autoTable(doc, {
        startY: currentY,
        head: [["Service Description", "Qty", "Unit Price", "Line Total"]],
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
      doc.text(`Tax: ${formatCurrency(taxes)}`, summaryX, tableFinalY + (discount > 0 ? 24 : 17), { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Amount Due: ${formatCurrency(grandTotal)}`, summaryX, tableFinalY + (discount > 0 ? 35 : 28), { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        "Payment due upon receipt. For questions regarding this invoice, contact +92 300 0000000 or info@momentumautoworks.com.",
        margin,
        tableFinalY + (discount > 0 ? 53 : 46),
        { maxWidth: pageWidth - margin * 2 }
      );
      doc.text(
        "Thank you for choosing Momentum AutoWorks!",
        margin,
        tableFinalY + (discount > 0 ? 63 : 56)
      );

      doc.save(`Invoice-${invoiceData.invoiceNumber}.pdf`);
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
      <div class="invoice-header">
        <div>
          <h1 class="invoice-title">Momentum AutoWorks</h1>
          <p>123 Auto Street, Workshop City</p>
          <p>Punjab, Pakistan</p>
          <p>Phone: +92 300 0000000</p>
          <p>info@momentumautoworks.com</p>
        </div>
        <div class="invoice-details">
          <h2 style="font-size: 24px; margin: 0;">INVOICE</h2>
          <p><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p>
          <p><strong>Date:</strong> ${invoiceData.issueDate}</p>
          ${invoiceData.jobId ? `<p><strong>Job ID:</strong> ${invoiceData.jobId}</p>` : ""}
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
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

      <div class="section">
        <div class="section-title">Service Summary</div>
        <p>Total Services: ${invoiceData.services.length}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Service Description</th>
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
        <p>Tax: ${formatCurrency(taxes)}</p>
        <p class="total-amount">Amount Due: ${formatCurrency(grandTotal)}</p>
      </div>

      <div style="margin-top: 40px; font-size: 12px; color: #666;">
        <p>Payment due upon receipt. For questions regarding this invoice, contact +92 300 0000000 or info@momentumautoworks.com.</p>
        <p>Thank you for choosing Momentum AutoWorks!</p>
      </div>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
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
            className="bg-white p-8 shadow-sm"
            style={{
              fontFamily: 'Arial, sans-serif',
            }}
            dangerouslySetInnerHTML={{ 
              __html: `
                <style>
                  .invoice-preview { font-family: Arial, sans-serif; }
                  .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                  .invoice-title { font-size: 24px; font-weight: bold; color: #c53032; margin-bottom: 10px; }
                  .invoice-details { text-align: right; }
                  .section { margin-bottom: 20px; }
                  .section-title { font-weight: bold; margin-bottom: 10px; font-size: 12px; }
                  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                  th { background-color: #c53032; color: white; padding: 10px; text-align: left; font-size: 12px; }
                  td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
                  .total-section { text-align: right; margin-top: 20px; }
                  .total-amount { font-size: 18px; font-weight: bold; }
                  p { margin: 4px 0; font-size: 12px; }
                </style>
                ${generateInvoiceHTML()}
              `
            }} 
          />
        </div>

        <div className="px-6 py-4 border-t bg-white flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {onShare && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    onShare('email');
                    toast.info("Email share functionality coming soon");
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Share via Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onShare('whatsapp');
                    const message = `Invoice ${invoiceData.invoiceNumber} - ${formatCurrency(invoiceData.totalCost)}`;
                    const whatsappUrl = `https://wa.me/${invoiceData.customer.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  disabled={!invoiceData.customer.phone}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Share via WhatsApp
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="bg-[#c53032] hover:bg-[#a6212a] text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

