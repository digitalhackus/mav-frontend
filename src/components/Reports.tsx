import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Download,
  TrendingUp,
  CreditCard,
  Banknote,
  Calendar,
  FileText,
  BarChart3,
  Loader2
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { motion } from "motion/react";
import { reportsAPI } from "../api/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [financialOverview, setFinancialOverview] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [popularServices, setPopularServices] = useState<any[]>([]);
  const [dailyPerformance, setDailyPerformance] = useState<any[]>([]);
  
  // Get period from URL params or default to "month"
  const urlPeriod = searchParams.get('period');
  const [period, setPeriod] = useState(urlPeriod || "month");
  const [isExporting, setIsExporting] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Update period when URL param changes
  useEffect(() => {
    const urlPeriodValue = searchParams.get('period');
    if (urlPeriodValue && urlPeriodValue !== period) {
      setPeriod(urlPeriodValue);
    }
  }, [searchParams, period]);

  useEffect(() => {
    fetchAllReports();
  }, [period]);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      setError("");

      const [financial, revenue, payments, services, daily] = await Promise.all([
        reportsAPI.getFinancialOverview(period),
        reportsAPI.getRevenueTrend(6),
        reportsAPI.getPaymentMethods(period),
        reportsAPI.getPopularServices(period),
        reportsAPI.getDailyPerformance(7)
      ]);

      if (financial.success) setFinancialOverview(financial.data);
      if (revenue.success) setRevenueTrend(revenue.data);
      if (payments.success) setPaymentMethods(payments.data);
      if (services.success) setPopularServices(services.data);
      if (daily.success) setDailyPerformance(daily.data);
    } catch (err: any) {
      console.error("Error fetching reports:", err);
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString()}`;
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

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

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const generatePDF = async (
    reportType: 'daily' | 'monthly' | 'custom',
    data: {
      financialOverview: any;
      paymentMethods: any[];
      popularServices: any[];
      dailyPerformance: any[];
      revenueTrend?: any[];
    },
    customPeriod?: { start: string, end: string }
  ) => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let currentY = margin;

      // Load and add logo
      const logoDataUrl = await loadLogoAsDataUrl();
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", margin, currentY, 30, 30);
      }

      // Header
      const headerLeftX = margin + (logoDataUrl ? 40 : 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(197, 48, 50);
      doc.text("Momentum AutoWorks", headerLeftX, currentY + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("123 Auto Street, Workshop City", headerLeftX, currentY + 16);
      doc.text("Punjab, Pakistan", headerLeftX, currentY + 21);

      // Report Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(197, 48, 50);
      let reportTitle = "";
      let reportPeriod = "";

      const now = new Date();
      if (reportType === 'daily') {
        reportTitle = "Daily Report";
        reportPeriod = formatDate(now);
      } else if (reportType === 'monthly') {
        reportTitle = "Monthly Summary";
        reportPeriod = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else {
        reportTitle = "Custom Report";
        if (customPeriod) {
          reportPeriod = `${formatDate(customPeriod.start)} - ${formatDate(customPeriod.end)}`;
        }
      }

      doc.text(reportTitle, pageWidth - margin, currentY + 10, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Period: ${reportPeriod}`, pageWidth - margin, currentY + 18, { align: "right" });
      doc.text(`Generated: ${formatDate(now)}`, pageWidth - margin, currentY + 24, { align: "right" });

      currentY += 40;

      // Financial Overview Section
      if (data.financialOverview) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(197, 48, 50);
        doc.text("Financial Overview", margin, currentY);
        currentY += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        const overviewData = [
          ["Total Revenue", formatCurrency(data.financialOverview.totalRevenue || 0)],
          ["Card Payments", formatCurrency(data.financialOverview.cardPayments || 0)],
          ["Cash Payments", formatCurrency(data.financialOverview.cashPayments || 0)],
          ["Net Profit", formatCurrency(data.financialOverview.netProfit || 0)],
          ["Profit Margin", `${data.financialOverview.profitMargin || 0}%`],
        ];

        autoTable(doc, {
          startY: currentY,
          head: [["Metric", "Value"]],
          body: overviewData,
          theme: "striped",
          headStyles: { fillColor: [197, 48, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Payment Methods Section
      if (data.paymentMethods && data.paymentMethods.length > 0) {
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = margin;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(197, 48, 50);
        doc.text("Payment Methods Distribution", margin, currentY);
        currentY += 8;

        const paymentData = data.paymentMethods.map(item => [
          item.name,
          `${item.value}%`,
          formatCurrency(item.amount || 0),
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Payment Method", "Percentage", "Amount"]],
          body: paymentData,
          theme: "striped",
          headStyles: { fillColor: [197, 48, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Popular Services Section
      if (data.popularServices && data.popularServices.length > 0) {
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = margin;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(197, 48, 50);
        doc.text("Popular Services", margin, currentY);
        currentY += 8;

        const servicesData = data.popularServices.slice(0, 10).map(item => [
          item.service,
          item.count.toString(),
          formatCurrency(item.revenue || 0),
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Service", "Count", "Revenue"]],
          body: servicesData,
          theme: "striped",
          headStyles: { fillColor: [197, 48, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Daily Performance Section
      if (data.dailyPerformance && data.dailyPerformance.length > 0) {
        if (currentY > pageHeight - 60) {
          doc.addPage();
          currentY = margin;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(197, 48, 50);
        doc.text("Daily Performance", margin, currentY);
        currentY += 8;

        const dailyData = data.dailyPerformance.map(item => [
          item.day || item.date || 'N/A',
          item.jobs?.toString() || '0',
          formatCurrency(item.revenue || 0),
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Day", "Jobs Completed", "Revenue"]],
          body: dailyData,
          theme: "striped",
          headStyles: { fillColor: [197, 48, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
        });
      }

      // Revenue Trend Summary
      if (data.revenueTrend && data.revenueTrend.length > 0) {
        const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : currentY;
        if (finalY > pageHeight - 60) {
          doc.addPage();
          currentY = margin;
        } else {
          currentY = finalY + 15;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(197, 48, 50);
        doc.text("Revenue Trend (Last 6 Months)", margin, currentY);
        currentY += 8;

        const revenueData = data.revenueTrend.map(item => [
          item.month,
          formatCurrency(item.revenue || 0),
          formatCurrency(item.profit || 0),
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Month", "Revenue", "Profit"]],
          body: revenueData,
          theme: "striped",
          headStyles: { fillColor: [197, 48, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
          margin: { left: margin, right: margin },
        });
      }

      // Generate filename
      const filename = reportType === 'daily' 
        ? `Daily_Report_${now.toISOString().split('T')[0]}.pdf`
        : reportType === 'monthly'
        ? `Monthly_Summary_${now.getFullYear()}_${now.getMonth() + 1}.pdf`
        : `Custom_Report_${customPeriod?.start || now.toISOString().split('T')[0]}.pdf`;

      doc.save(filename);
      toast.success(`${reportTitle} generated successfully!`);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error(error.message || "Failed to generate report");
      throw error;
    }
  };

  const handleDailyReport = async () => {
    // Fetch today's data
    try {
      setIsExporting(true);
      const [financial, payments, services, daily] = await Promise.all([
        reportsAPI.getFinancialOverview('today'),
        reportsAPI.getPaymentMethods('today'),
        reportsAPI.getPopularServices('today'),
        reportsAPI.getDailyPerformance(1)
      ]);

      const reportData = {
        financialOverview: financial.success ? financial.data : null,
        paymentMethods: payments.success ? payments.data : [],
        popularServices: services.success ? services.data : [],
        dailyPerformance: daily.success ? daily.data : [],
      };

      await generatePDF('daily', reportData);
    } catch (error: any) {
      console.error("Error generating daily report:", error);
      toast.error("Failed to generate daily report");
    } finally {
      setIsExporting(false);
    }
  };

  const handleMonthlySummary = async () => {
    // Fetch current month's data
    try {
      setIsExporting(true);
      const [financial, payments, services, revenue] = await Promise.all([
        reportsAPI.getFinancialOverview('month'),
        reportsAPI.getPaymentMethods('month'),
        reportsAPI.getPopularServices('month'),
        reportsAPI.getRevenueTrend(6)
      ]);

      const reportData = {
        financialOverview: financial.success ? financial.data : null,
        paymentMethods: payments.success ? payments.data : [],
        popularServices: services.success ? services.data : [],
        dailyPerformance: [],
        revenueTrend: revenue.success ? revenue.data : [],
      };

      await generatePDF('monthly', reportData);
    } catch (error: any) {
      console.error("Error generating monthly summary:", error);
      toast.error("Failed to generate monthly summary");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCustomReport = async () => {
    if (!customStartDate || !customEndDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    try {
      setIsExporting(true);
      setIsCustomDialogOpen(false);

      // Calculate days between dates
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Fetch data for a larger period that includes the custom range
      const [financial, payments, services, daily, revenue] = await Promise.all([
        reportsAPI.getFinancialOverview('year'),
        reportsAPI.getPaymentMethods('year'),
        reportsAPI.getPopularServices('year'),
        reportsAPI.getDailyPerformance(Math.min(days, 90)),
        reportsAPI.getRevenueTrend(12)
      ]);

      // Filter daily performance by custom date range
      let filteredDaily = [];
      if (daily.success && daily.data) {
        filteredDaily = daily.data.filter((item: any) => {
          const itemDate = new Date(item.date || item.day);
          return itemDate >= start && itemDate <= end;
        });
      }

      const reportData = {
        financialOverview: financial.success ? financial.data : null,
        paymentMethods: payments.success ? payments.data : [],
        popularServices: services.success ? services.data : [],
        dailyPerformance: filteredDaily,
        revenueTrend: revenue.success ? revenue.data : [],
      };

      await generatePDF('custom', reportData, { start: customStartDate, end: customEndDate });
      
      // Reset dates
      setCustomStartDate("");
      setCustomEndDate("");
    } catch (error: any) {
      console.error("Error generating custom report:", error);
      toast.error("Failed to generate custom report");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c53032] mx-auto mb-4" />
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
        <p>{error}</p>
        <Button onClick={fetchAllReports} className="mt-4 bg-[#c53032] hover:bg-[#a6212a]" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1 lg:mb-2">Reports & Analytics</h1>
          <p className="text-sm lg:text-base text-gray-600">Analyze workshop performance and financial insights</p>
        </div>
      </div>

      {/* Financial Overview */}
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
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-3xl">{formatCurrency(financialOverview?.totalRevenue || 0)}</p>
                  <div className="flex items-center text-sm text-[#c53032] mt-1">
                    <TrendingUp className="h-4 w-4 mr-1 text-[#c53032]" />
                    <span className="font-medium">Active</span>
                  </div>
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
                  <p className="text-sm text-gray-600 mb-1">Card Payments</p>
                  <p className="text-3xl">{formatCurrency(financialOverview?.cardPayments || 0)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {calculatePercentage(financialOverview?.cardPayments || 0, financialOverview?.totalRevenue || 1)}% of total
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <CreditCard className="h-6 w-6 text-[#c53032]" />
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
                  <p className="text-sm text-gray-600 mb-1">Cash Payments</p>
                  <p className="text-3xl">{formatCurrency(financialOverview?.cashPayments || 0)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {calculatePercentage(financialOverview?.cashPayments || 0, financialOverview?.totalRevenue || 1)}% of total
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <Banknote className="h-6 w-6 text-[#c53032]" />
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
                  <p className="text-sm text-gray-600 mb-1">Net Profit</p>
                  <p className="text-3xl">{formatCurrency(financialOverview?.netProfit || 0)}</p>
                  <p className="text-sm text-gray-500 mt-1">{financialOverview?.profitMargin || 0}% margin</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-[#c53032]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Profit Trend</CardTitle>
            <p className="text-sm text-gray-600">Monthly financial overview</p>
          </CardHeader>
          <CardContent>
            {revenueTrend.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No revenue data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#c53032"
                    strokeWidth={3}
                    name="Revenue"
                    dot={{ fill: "#c53032", r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#f87171"
                    strokeWidth={3}
                    name="Profit"
                    dot={{ fill: "#f87171", r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <p className="text-sm text-gray-600">Distribution of payment types</p>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No payment data available
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentMethods}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentMethods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4 flex-wrap">
                  {paymentMethods.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm">{item.name} ({item.value}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Analysis & Daily Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Services */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Services</CardTitle>
            <p className="text-sm text-gray-600">Most requested services this month</p>
          </CardHeader>
          <CardContent>
            {popularServices.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No service data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={popularServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="service" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#c53032" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Daily Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance</CardTitle>
            <p className="text-sm text-gray-600">Jobs completed and revenue per day</p>
          </CardHeader>
          <CardContent>
            {dailyPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No daily performance data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value: any, name: string) => 
                    name === 'revenue' ? formatCurrency(value) : value
                  } />
                  <Legend />
                  <Bar dataKey="jobs" fill="#c53032" radius={[8, 8, 0, 0]} name="Jobs Completed" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
            <Button 
              variant="outline" 
              className="h-20 lg:h-24 flex-col gap-2"
              onClick={handleDailyReport}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-6 lg:h-8 w-6 lg:w-8 text-[#c53032] animate-spin" />
              ) : (
                <FileText className="h-6 lg:h-8 w-6 lg:w-8 text-[#c53032]" />
              )}
              <span className="text-sm lg:text-base">Daily Report</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 lg:h-24 flex-col gap-2"
              onClick={handleMonthlySummary}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-6 lg:h-8 w-6 lg:w-8 text-[#d94848] animate-spin" />
              ) : (
                <BarChart3 className="h-6 lg:h-8 w-6 lg:w-8 text-[#d94848]" />
              )}
              <span className="text-sm lg:text-base">Monthly Summary</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 lg:h-24 flex-col gap-2"
              onClick={() => setIsCustomDialogOpen(true)}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-6 lg:h-8 w-6 lg:w-8 text-[#f87171] animate-spin" />
              ) : (
                <Download className="h-6 lg:h-8 w-6 lg:w-8 text-[#f87171]" />
              )}
              <span className="text-sm lg:text-base">Custom Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Report Dialog */}
      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Report</DialogTitle>
            <DialogDescription>
              Select a date range to generate a custom report
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                max={customEndDate || new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                min={customStartDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCustomDialogOpen(false);
                setCustomStartDate("");
                setCustomEndDate("");
              }}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCustomReport}
              disabled={isExporting || !customStartDate || !customEndDate}
              className="bg-[#c53032] hover:bg-[#a6212a]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
