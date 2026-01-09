import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "./ui/dialog";
import { AddCustomer } from "./AddCustomer";
import {
  Coins,
  Wrench,
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowUpRight,
  Clock,
  Car,
  NotebookPen,
  Loader2
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { motion } from "motion/react";
import { dashboardAPI, jobsAPI, customersAPI } from "../api/client";
import { connectSocket, onJobUpdated, onInvoiceUpdated } from "../lib/socket";
import { formatCurrency } from "../utils/currency";
import { useThemeStyles } from "../hooks/useThemeStyles";

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    DELIVERED: "Delivered"
  };
  return statusMap[status] || status;
};

export function Dashboard({ onNavigate }: DashboardProps = {}) {
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [avgTime, setAvgTime] = useState<number>(0);
  const { getButtonStyle } = useThemeStyles();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [summaryData, jobsData] = await Promise.all([
        dashboardAPI.getSummary(),
        jobsAPI.getAll()
      ]);

      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      if (jobsData.success) {
        // Get recent 4 jobs, sorted by creation date
        const sorted = jobsData.data
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 4);
        setRecentJobs(sorted);

        // Calculate average time for today's jobs
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayJobs = jobsData.data.filter((job: any) => {
          const jobDate = new Date(job.createdAt);
          return jobDate >= today && jobDate < tomorrow && job.estimatedTimeHours;
        });

        if (todayJobs.length > 0) {
          const totalTime = todayJobs.reduce((sum: number, job: any) => sum + (job.estimatedTimeHours || 0), 0);
          const average = totalTime / todayJobs.length;
          setAvgTime(Math.round(average * 10) / 10); // Round to 1 decimal place
        } else {
          setAvgTime(0);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Connect Socket.IO and listen for job and invoice updates
    const socket = connectSocket();
    const unsubscribeJob = onJobUpdated(() => {
      // Refresh data when job is updated
      fetchDashboardData();
    });
    
    const unsubscribeInvoice = onInvoiceUpdated(() => {
      // Refresh data when invoice is created, updated, or deleted
      fetchDashboardData();
    });

    return () => {
      unsubscribeJob();
      unsubscribeInvoice();
    };
  }, []);

  // Generate chart data from summary (placeholder - you can enhance this with historical data)
  const salesData = [
    { day: "Mon", revenue: 0, jobs: 0 },
    { day: "Tue", revenue: 0, jobs: 0 },
    { day: "Wed", revenue: 0, jobs: 0 },
    { day: "Thu", revenue: 0, jobs: 0 },
    { day: "Fri", revenue: summary?.todayRevenue || 0, jobs: summary?.todayJobs || 0 },
    { day: "Sat", revenue: 0, jobs: 0 },
    { day: "Sun", revenue: 0, jobs: 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#c53032]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1 lg:mb-2">Dashboard</h1>
          <p className="text-sm lg:text-base text-gray-600">Welcome back! Here's your workshop overview.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:gap-3">
          <Button
            className="w-full sm:w-auto lg:flex-none text-white"
            size="sm"
            style={getButtonStyle()}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = getButtonStyle(true).backgroundColor;
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = getButtonStyle().backgroundColor;
            }}
            onClick={() => onNavigate && onNavigate("create-job-card")}
          >
            <Wrench className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">New Job Card</span>
            <span className="sm:hidden">New Job</span>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto lg:flex-none"
            size="sm"
            onClick={() => onNavigate && onNavigate("create-invoice")}
          >
            <NotebookPen className="h-4 w-4 lg:mr-2" />
            <span className="hidden lg:inline">Create Invoice</span>
          </Button>
          <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto lg:flex-none" size="sm">
                <Users className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Add Customer</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] p-0 bg-transparent border-0 shadow-none [&>button]:hidden" aria-describedby={undefined}>
              <DialogTitle className="sr-only">Add New Customer</DialogTitle>
              <AddCustomer 
                onClose={() => {
                  setIsCustomerDialogOpen(false);
                  fetchDashboardData();
                }}
                onSubmit={async (data) => {
                  try {
                    await customersAPI.create({
                      name: data.fullName,
                      phone: data.phone,
                      email: data.email || undefined,
                      address: `${data.street}, ${data.area}, ${data.city}, ${data.state}`.trim()
                    });
                    setIsCustomerDialogOpen(false);
                    fetchDashboardData();
                  } catch (err) {
                    console.error("Failed to create customer:", err);
                  }
                }}
                onSaveAndAddVehicle={(data) => {
                  console.log("Form submitted and navigating to vehicles:", data);
                  setIsCustomerDialogOpen(false);
                  if (onNavigate) {
                    onNavigate("vehicles");
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Today's Performance */}
      <motion.div 
        className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-5 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-xl lg:text-2xl text-white mb-1">Today's Performance</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.08em] text-slate-300">Total Revenue</p>
              <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                <span className="text-lg sm:text-xl font-normal mr-1.5" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.02em' }}>Rs</span>
                <span>{summary?.todayRevenue?.toLocaleString() || 0}</span>
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.08em] text-slate-300">Jobs Today</p>
              <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                {summary?.todayJobs || 0}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.08em] text-slate-300">Avg. Time</p>
              <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
                {avgTime > 0 ? `${avgTime}h` : '0h'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-[#c53032] h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-gray-600">Weekly Revenue</CardTitle>
              <div className="p-2 bg-[#fde7e7] rounded-lg">
                <Coins className="h-5 w-5 text-[#c53032]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl mb-1">
                <span className="text-lg font-normal mr-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.02em' }}>Rs</span>
                <span className="font-semibold">{summary?.todayRevenue?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center text-sm text-[#c53032]">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                <span>Today's revenue</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-l-4 border-l-[#d94848] h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-gray-600">Jobs in Progress</CardTitle>
              <div className="p-2 bg-[#fde7e7] rounded-lg">
                <Wrench className="h-5 w-5 text-[#d94848]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl mb-1">{summary?.jobsByStatus?.IN_PROGRESS || 0}</div>
              <div className="flex items-center text-sm text-[#d94848]">
                <Clock className="h-4 w-4 mr-1" />
                <span>Active jobs</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-l-4 border-l-[#e15b5b] h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-gray-600">Completed Today</CardTitle>
              <div className="p-2 bg-[#fde7e7] rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-[#e15b5b]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl mb-1">{summary?.jobsByStatus?.COMPLETED || 0}</div>
              <div className="flex items-center text-sm text-[#e15b5b]">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Completed jobs</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-l-4 border-l-[#f87171] h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-gray-600">Active Customers</CardTitle>
              <div className="p-2 bg-[#fde7e7] rounded-lg">
                <Users className="h-5 w-5 text-[#f87171]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl mb-1">{summary?.totalCustomers || 0}</div>
              <div className="flex items-center text-sm text-[#f87171]">
                <Car className="h-4 w-4 mr-1" />
                <span>Total customers</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#c53032" strokeWidth={3} dot={{ fill: "#c53032", r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Jobs Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="jobs" fill="#c53032" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Recent Jobs</CardTitle>
              <p className="text-xs lg:text-sm text-gray-600 mt-1">Latest service activities in your workshop</p>
            </div>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => onNavigate && onNavigate("job-cards")}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No jobs yet</div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {recentJobs.map((job) => (
                  <div key={job._id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">ID: {job._id.slice(-6)}</p>
                        <p className="text-sm text-gray-600">{job.customer?.name || 'N/A'}</p>
                      </div>
                      <Badge 
                        className={
                          job.status === "COMPLETED" ? "bg-green-100 text-green-700 border-green-200" :
                          job.status === "IN_PROGRESS" ? "bg-[#fde7e7] text-[#a6212a] border-[#f4bfc1]" :
                          "bg-gray-100 text-gray-700 border-gray-200"
                        }
                      >
                        {formatStatus(job.status)}
                      </Badge>
                    </div>
                    <p className="text-sm">{job.vehicle?.make} {job.vehicle?.model} {job.vehicle?.year}</p>
                    <p className="text-sm text-gray-600">{job.title}</p>
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="font-medium">
                        <span className="text-[10px] font-normal mr-0.5" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.02em' }}>Rs</span>
                        <span>{job.amount?.toLocaleString() || 0}</span>
                      </span>
                      <span className="text-gray-500">{formatTimeAgo(new Date(job.createdAt))}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Make</TableHead>
                      <TableHead>Model/Year</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Amount (PKR)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentJobs.map((job) => (
                      <TableRow key={job._id}>
                        <TableCell className="font-medium">{job._id.slice(-6)}</TableCell>
                        <TableCell>{job.customer?.name || 'N/A'}</TableCell>
                        <TableCell>{job.vehicle?.make || 'N/A'}</TableCell>
                        <TableCell>{job.vehicle?.model} {job.vehicle?.year}</TableCell>
                        <TableCell>{job.title}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs font-normal mr-0.5" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.02em' }}>Rs</span>
                          <span className="font-medium">{job.amount?.toLocaleString() || 0}</span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              job.status === "COMPLETED" ? "bg-green-100 text-green-700 border-green-200" :
                              job.status === "IN_PROGRESS" ? "bg-[#fde7e7] text-[#a6212a] border-[#f4bfc1]" :
                              "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {formatStatus(job.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">{formatTimeAgo(new Date(job.createdAt))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
