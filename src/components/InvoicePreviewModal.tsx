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
import { Download, Printer, Loader2 } from "lucide-react";
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
    discountType?: "percent" | "fixed";
    discountPercent?: number;
    notes?: string;
    terms?: string;
  };
  businessProfile?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

// Default terms and conditions
const DEFAULT_TERMS = "Payment is due immediately upon receipt. No credit is extended under any circumstances.\nQuoted rates are valid for 5 days only and may change thereafter.";

export function InvoicePreviewModal({
  open,
  onOpenChange,
  invoiceData,
  businessProfile: propBusinessProfile,
}: InvoicePreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [businessProfile, setBusinessProfile] = useState({
    name: "Momentum AutoWorks",
    address: "",
    city: "Punjab, Pakistan",
    phone: "+92 300 1234567",
    email: "info@momentumautoworks.com",
  });

  // Use passed business profile or fetch from settings
  useEffect(() => {
    if (propBusinessProfile) {
      // Use the passed business profile
      setBusinessProfile({
        name: propBusinessProfile.name || "Momentum AutoWorks",
        address: propBusinessProfile.address || "",
        city: "",
        phone: propBusinessProfile.phone || "+92 300 1234567",
        email: propBusinessProfile.email || "info@momentumautoworks.com",
      });
    } else {
      // Fetch from settings if not provided
    const fetchBusinessProfile = async () => {
      try {
        const response = await settingsAPI.get();
        if (response.success && response.data?.workshop) {
          const workshop = response.data.workshop;
          setBusinessProfile({
            name: workshop.businessName || "Momentum AutoWorks",
              address: workshop.address || "",
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
    }
  }, [propBusinessProfile]);

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
      const invoiceDate = new Date(invoiceData.issueDate);
      const dateStr = invoiceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Karachi' });
      const timeStr = invoiceDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });
      
      // Generate invoice ID from plate number and customer name initials
      const plateNo = invoiceData.vehicle?.plateNo || invoiceData.vehicle?.plate || '';
      const customerName = invoiceData.customer?.name || '';
      const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
      const invoiceId = (plateNo && initials) ? `${plateNo}-${initials}` : invoiceData.invoiceNumber;
      
      doc.text(`DATE: ${dateStr.toUpperCase()}`, margin, currentY + 30);
      doc.text(`TIME: ${timeStr.toUpperCase()}`, margin, currentY + 36);
      if (invoiceId) {
        doc.text(`INVOICE ID: ${invoiceId.toUpperCase()}`, margin, currentY + 42);
      }

      // Logo and company address on right
      let logoHeight = 30;
      const logoDataUrl = await loadLogoAsDataUrl();
      if (logoDataUrl) {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve(null);
          img.onerror = reject;
          img.src = logoDataUrl;
        });
        
        const maxHeight = 30;
        const aspectRatio = img.width / img.height;
        logoHeight = maxHeight;
        const logoWidth = logoHeight * aspectRatio;
        
        const logoX = pageWidth - margin - logoWidth;
        doc.addImage(logoDataUrl, "PNG", logoX, currentY, logoWidth, logoHeight);
      } else {
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

      // Company address on right - below logo
      const addressStartY = currentY + logoHeight + 5;
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      if (businessProfile.address) {
        const addressLines = businessProfile.address.split('\n').filter(line => line.trim());
        addressLines.forEach((line, index) => {
          doc.text(line.toUpperCase(), pageWidth - margin, addressStartY + (index * 6), { align: "right" });
        });
        doc.text(businessProfile.phone, pageWidth - margin, addressStartY + (addressLines.length * 6), { align: "right" });
      } else {
        doc.text(businessProfile.phone, pageWidth - margin, addressStartY, { align: "right" });
      }

      currentY += 50;

      // Bill To and Payment Method - Two columns
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Bill To:", margin, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text((invoiceData.customer.name || "N/A").toUpperCase(), margin, currentY + 6);
      if (invoiceData.customer.phone) {
        doc.text(invoiceData.customer.phone, margin, currentY + 12);
      }
      if (invoiceData.customer.email) {
        doc.text(invoiceData.customer.email, margin, currentY + 18);
      }

      const paymentColumnX = pageWidth / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Payment Method", paymentColumnX, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text("CASH", paymentColumnX, currentY + 6); // Default to CASH for preview
      if (invoiceData.technician?.name) {
        doc.text(invoiceData.technician.name.toUpperCase(), paymentColumnX, currentY + 12);
      }

      currentY += 30;

      // Table - Gray header
      autoTable(doc, {
        startY: currentY,
        head: [["DESCRIPTION", "QTY", "PRICE", "SUBTOTAL"]],
        body: invoiceData.services.map((service) => {
          const amount = Number(service.estimatedCost) || 0;
          const quantity = service.quantity || 1;
          return [
            (service.name || "Service").toUpperCase(),
            quantity.toString().padStart(2, '0'),
            `Rs${amount.toLocaleString('en-US')}`,
            `Rs${(amount * quantity).toLocaleString('en-US')}`,
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
          fillColor: [200, 200, 200], // Gray header
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

      // Totals section
      const tableFinalY = (doc as any).lastAutoTable?.finalY ?? currentY + 20;
      const summaryX = pageWidth - margin;
      const summaryStartY = tableFinalY + 10;
      const labelWidth = 40;

      const subtotal = invoiceData.subtotal || invoiceData.totalCost;
      const taxes = invoiceData.tax || 0;
      const discount = invoiceData.discount || 0;
      const grandTotal = subtotal + taxes - discount;
      
      let currentSummaryY = summaryStartY;
      
      // Discount (if any)
      if (discount > 0) {
        doc.setFont("courier", "bold");
        doc.setFontSize(10);
        const discountLabel = invoiceData.discountType === "percent" && invoiceData.discountPercent 
          ? `DISCOUNT (${invoiceData.discountPercent}%)` 
          : "DISCOUNT";
        doc.text(discountLabel, summaryX - labelWidth, currentSummaryY, { align: "right" });
        doc.text(`-Rs${Math.round(discount).toLocaleString('en-US')}`, summaryX, currentSummaryY, { align: "right" });
        currentSummaryY += 8;
      }
      
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.text("TAX", summaryX - labelWidth, currentSummaryY, { align: "right" });
      doc.text(`Rs${Math.round(taxes).toLocaleString('en-US')}`, summaryX, currentSummaryY, { align: "right" });
      
      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.text("GRAND TOTAL", summaryX - labelWidth, currentSummaryY + 8, { align: "right" });
      doc.text(`Rs${Math.round(grandTotal).toLocaleString('en-US')}`, summaryX, currentSummaryY + 8, { align: "right" });

      // Footer - Terms and Contact
      currentY = currentSummaryY + 25;
      const footerLeftX = margin;
      const footerRightX = pageWidth - margin;

      // Notes section (if any)
      if (invoiceData.notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("NOTES", footerLeftX, currentY);
        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.text(
          invoiceData.notes,
          footerLeftX,
          currentY + 6,
          { maxWidth: (pageWidth - margin * 2) / 2 }
        );
        currentY += 20;
      }

      // Terms & Conditions on left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TERM & CONDITION", footerLeftX, currentY);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const termsText = invoiceData.terms || DEFAULT_TERMS;
      doc.text(
        termsText,
        footerLeftX,
        currentY + 6,
        { maxWidth: (pageWidth - margin * 2) / 2 }
      );

      // Contact info on right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("FOR ANY QUESTIONS, PLEASE CONTACT", footerRightX, currentY, { align: "right" });
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.text(businessProfile.email.toUpperCase(), footerRightX, currentY + 6, { align: "right" });
      doc.text(`OR ${businessProfile.phone}.`, footerRightX, currentY + 12, { align: "right" });

      const finalInvoiceId = invoiceId || invoiceData.invoiceNumber;
      doc.save(`Invoice-${finalInvoiceId}.pdf`);
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
            body { margin: 0; padding: 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
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

    // Generate invoice ID
    const customerName = invoiceData.customer?.name || '';
    const initials = customerName.split(' ').map((n: string) => n[0]?.toUpperCase() || '').join('').slice(0, 2);
    const invoiceId = plateNo && initials ? `${plateNo}-${initials}` : invoiceData.invoiceNumber;
    const invoiceDate = new Date(invoiceData.issueDate);
    const dateStr = invoiceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Karachi' });
    const timeStr = invoiceDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' });

    return `
      <div class="invoice-preview" style="background-color: #ffffff; padding: 50px; font-family: 'Courier New', monospace; min-height: 297mm; box-sizing: border-box;">
        <div class="invoice-header" style="display: flex; justify-content: space-between; margin-bottom: 40px;">
          <div class="invoice-header-left">
            <h1 style="font-size: 56px; font-weight: bold; color: #c53032; margin: 0 0 15px 0; font-family: Helvetica, Arial, sans-serif;">INVOICE</h1>
            <p style="margin: 4px 0; font-size: 16px;">DATE: ${dateStr.toUpperCase()}</p>
            <p style="margin: 4px 0; font-size: 16px;">TIME: ${timeStr.toUpperCase()}</p>
            ${invoiceId ? `<p style="margin: 4px 0; font-size: 16px;">INVOICE ID: ${invoiceId.toUpperCase()}</p>` : ''}
          </div>
          <div class="invoice-header-right" style="text-align: right;">
            <div style="margin-bottom: 15px;">
              <img src="/1.png" alt="Logo" style="height: 80px; object-fit: contain;" onerror="this.style.display='none'" />
            </div>
            ${businessProfile.address ? `<p style="margin: 4px 0; font-size: 15px;">${businessProfile.address.split('\n').map(l => l.toUpperCase()).join('</p><p style="margin: 4px 0; font-size: 15px;">')}</p>` : ''}
            <p style="margin: 4px 0; font-size: 15px;">${businessProfile.phone}</p>
          </div>
        </div>

        <div class="customer-payment-section" style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div class="section" style="flex: 1;">
            <div style="font-weight: bold; font-size: 18px; font-family: Helvetica, Arial, sans-serif; margin-bottom: 8px;">Bill To:</div>
            <p style="margin: 4px 0; font-size: 16px;">${invoiceData.customer.name.toUpperCase()}</p>
            ${invoiceData.customer.phone ? `<p style="margin: 4px 0; font-size: 16px;">${invoiceData.customer.phone}</p>` : ""}
            ${invoiceData.customer.email ? `<p style="margin: 4px 0; font-size: 16px;">${invoiceData.customer.email}</p>` : ""}
          </div>
          <div class="section" style="flex: 1;">
            <div style="font-weight: bold; font-size: 18px; font-family: Helvetica, Arial, sans-serif; margin-bottom: 8px;">Payment Method</div>
            <p style="margin: 4px 0; font-size: 16px;">CASH</p>
            ${invoiceData.technician?.name ? `<p style="margin: 4px 0; font-size: 16px;">${invoiceData.technician.name.toUpperCase()}</p>` : ""}
          </div>
        </div>

      <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
        <thead>
          <tr>
            <th style="background-color: #c8c8c8; color: #000; padding: 12px; text-align: left; font-size: 16px; font-weight: bold;">DESCRIPTION</th>
            <th style="background-color: #c8c8c8; color: #000; padding: 12px; text-align: center; font-size: 16px; font-weight: bold;">QTY</th>
            <th style="background-color: #c8c8c8; color: #000; padding: 12px; text-align: right; font-size: 16px; font-weight: bold;">PRICE</th>
            <th style="background-color: #c8c8c8; color: #000; padding: 12px; text-align: right; font-size: 16px; font-weight: bold;">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceData.services.map((service) => {
            const amount = Number(service.estimatedCost) || 0;
            const quantity = service.quantity || 1;
            return `
              <tr style="border-bottom: 1px solid #c8c8c8;">
                <td style="padding: 12px; font-size: 15px; font-weight: bold;">${(service.name || "Service").toUpperCase()}</td>
                <td style="padding: 12px; text-align: center; font-size: 15px;">${String(quantity).padStart(2, '0')}</td>
                <td style="padding: 12px; text-align: right; font-size: 15px;">Rs${amount.toLocaleString('en-US')}</td>
                <td style="padding: 12px; text-align: right; font-size: 15px; font-weight: bold;">Rs${(amount * quantity).toLocaleString('en-US')}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <div class="total-section" style="text-align: right; margin-top: 30px;">
        ${discount > 0 ? `<p style="margin: 6px 0; font-size: 18px; font-weight: bold;">${invoiceData.discountType === "percent" && invoiceData.discountPercent ? `DISCOUNT (${invoiceData.discountPercent}%)` : "DISCOUNT"} <span style="margin-left: 50px;">-Rs${Math.round(discount).toLocaleString('en-US')}</span></p>` : ''}
        <p style="margin: 6px 0; font-size: 18px; font-weight: bold;">TAX <span style="margin-left: 50px;">Rs${Math.round(taxes).toLocaleString('en-US')}</span></p>
        <p style="margin: 6px 0; font-size: 22px; font-weight: bold;">GRAND TOTAL <span style="margin-left: 50px;">Rs${Math.round(grandTotal).toLocaleString('en-US')}</span></p>
      </div>

      <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px;">
        <div style="flex: 1; max-width: 50%;">
          ${invoiceData.notes ? `
          <p style="font-weight: bold; margin-bottom: 12px; font-size: 16px; font-family: Helvetica, Arial, sans-serif;">NOTES</p>
          <p style="font-size: 14px; margin-bottom: 20px; white-space: pre-line;">${invoiceData.notes}</p>
          ` : ''}
          <p style="font-weight: bold; margin-bottom: 12px; font-size: 16px; font-family: Helvetica, Arial, sans-serif;">TERM & CONDITION</p>
          <p style="font-size: 14px; margin-bottom: 12px; white-space: pre-line;">${invoiceData.terms || DEFAULT_TERMS}</p>
        </div>
        <div style="flex: 1; max-width: 45%; text-align: right;">
          <p style="font-weight: bold; margin-bottom: 12px; font-size: 16px; font-family: Helvetica, Arial, sans-serif;">FOR ANY QUESTIONS, PLEASE CONTACT</p>
          <p style="font-size: 15px; margin-bottom: 6px;">${businessProfile.email.toUpperCase()}</p>
          <p style="font-size: 15px;">OR ${businessProfile.phone}.</p>
        </div>
      </div>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="overflow-hidden flex flex-col p-0"
        style={{
          width: '95vw',
          maxWidth: '900px',
          height: '95vh',
          maxHeight: '95vh',
        }}
      >
        <DialogHeader className="px-6 py-3 border-b flex-shrink-0 bg-white">
          <DialogTitle>Invoice Preview</DialogTitle>
          <DialogDescription>
            Review your invoice before downloading or sharing
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 bg-slate-100 min-h-0">
          <div 
            className="shadow-lg mx-auto"
            style={{
              width: '210mm',
              minHeight: '297mm',
              maxWidth: '100%',
              transform: 'scale(var(--preview-scale, 1))',
              transformOrigin: 'top center',
            }}
            dangerouslySetInnerHTML={{ 
              __html: generateInvoiceHTML()
            }} 
          />
        </div>

        <div className="px-6 py-3 border-t bg-white flex items-center justify-end gap-2 flex-shrink-0">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


