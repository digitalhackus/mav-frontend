import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
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

export function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [financialOverview, setFinancialOverview] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [popularServices, setPopularServices] = useState<any[]>([]);
  const [dailyPerformance, setDailyPerformance] = useState<any[]>([]);
  const [period, setPeriod] = useState("month");

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
        <div className="flex gap-2 lg:gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <Button className="bg-[#c53032] hover:bg-[#a6212a] flex-1 lg:flex-none" size="sm">
            <Download className="h-4 w-4 lg:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
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
            <Button variant="outline" className="h-20 lg:h-24 flex-col gap-2">
              <FileText className="h-6 lg:h-8 w-6 lg:w-8 text-[#c53032]" />
              <span className="text-sm lg:text-base">Daily Report</span>
            </Button>
            <Button variant="outline" className="h-20 lg:h-24 flex-col gap-2">
              <BarChart3 className="h-6 lg:h-8 w-6 lg:w-8 text-[#d94848]" />
              <span className="text-sm lg:text-base">Monthly Summary</span>
            </Button>
            <Button variant="outline" className="h-20 lg:h-24 flex-col gap-2">
              <Download className="h-6 lg:h-8 w-6 lg:w-8 text-[#f87171]" />
              <span className="text-sm lg:text-base">Custom Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
