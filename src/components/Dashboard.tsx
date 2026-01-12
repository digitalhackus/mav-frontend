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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { motion } from "motion/react";
import { dashboardAPI, jobsAPI, customersAPI, reportsAPI } from "../api/client";
import { connectSocket, onJobUpdated, onInvoiceUpdated } from "../lib/socket";
import { formatCurrency } from "../utils/currency";
import { getPSTDate, getCurrentWeekDates } from "../utils/dateUtils";
import { useThemeStyles } from "../hooks/useThemeStyles";
import { formatJobId } from "../utils/idFormatter";

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
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<number>(7); // Default to 7 days
  const { getButtonStyle } = useThemeStyles();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Get current week dates in PST
      const weekDates = getCurrentWeekDates();
      
      // Request data based on selected date range
      const [summaryData, jobsData, dailyPerformanceData] = await Promise.all([
        dashboardAPI.getSummary(dateRange),
        jobsAPI.getAll(),
        reportsAPI.getDailyPerformance(dateRange) // Get data for selected date range
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

        // Calculate average time for today's jobs (using PST)
        const pstNow = getPSTDate();
        pstNow.setHours(0, 0, 0, 0);
        const tomorrow = new Date(pstNow);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayJobs = jobsData.data.filter((job: any) => {
          const jobDate = new Date(job.createdAt);
          // Convert job date to PST for comparison
          const jobPST = new Date(jobDate.getTime() + (jobDate.getTimezoneOffset() * 60000) + (5 * 3600000));
          return jobPST >= pstNow && jobPST < tomorrow && job.estimatedTimeHours;
        });

        if (todayJobs.length > 0) {
          const totalTime = todayJobs.reduce((sum: number, job: any) => sum + (job.estimatedTimeHours || 0), 0);
          const average = totalTime / todayJobs.length;
          setAvgTime(Math.round(average * 10) / 10); // Round to 1 decimal place
        } else {
          setAvgTime(0);
        }
      }

      // Map weekly data to current week dates
      if (dailyPerformanceData.success && dailyPerformanceData.data) {
        const mappedWeeklyData = weekDates.map(weekDay => {
          // Find matching data for this day
          // Backend returns dates in YYYY-MM-DD format (PKT-based from backend conversion)
          // Match by direct date string comparison - both are in PKT (YYYY-MM-DD format)
          const matchingData = dailyPerformanceData.data.find((item: any) => {
            if (!item.date) return false;
            
            // Backend date is already in PKT format (YYYY-MM-DD)
            const itemDateStr = typeof item.date === 'string' ? item.date.split('T')[0] : item.date;
            
            // Direct comparison - both dates are in PKT format
            return itemDateStr === weekDay.isoDate;
          });

          return {
            day: weekDay.dayLabel, // e.g., "Mon Dec 2"
            dayShort: weekDay.dayName, // e.g., "Mon"
            date: weekDay.dateStr, // e.g., "Dec 2"
            isoDate: weekDay.isoDate,
            revenue: matchingData?.revenue || 0,
            jobs: matchingData?.jobs || 0,
            dateObj: weekDay.date
          };
        });

        setWeeklyData(mappedWeeklyData);
      } else {
        // If API fails, create empty data for the week
        const emptyWeeklyData = weekDates.map(weekDay => ({
          day: weekDay.dayLabel,
          dayShort: weekDay.dayName,
          date: weekDay.dateStr,
          isoDate: weekDay.isoDate,
          revenue: 0,
          jobs: 0,
          dateObj: weekDay.date
        }));
        setWeeklyData(emptyWeeklyData);
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
  }, [dateRange]); // Refetch when date range changes

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
            onClick={() => onNavigate && onNavigate("invoices?tab=create")}
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

      {/* Date Range Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
                <p className="text-sm text-gray-600 mt-1">Select a date range to view performance metrics</p>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="date-range" className="text-sm text-gray-600">Date Range:</Label>
                <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(parseInt(value))}>
                  <SelectTrigger id="date-range" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card 
            className="border-l-4 border-[#c53032] h-full cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate && onNavigate("reports?period=week")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-gray-600">Revenue</CardTitle>
              <div className="p-2 bg-[#fde7e7] rounded-lg">
                <Coins className="h-5 w-5 text-[#c53032]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl mb-1">
                <span className="text-lg font-normal mr-1" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.02em' }}>Rs</span>
                <span className="font-semibold">{summary?.periodRevenue?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center text-sm text-[#c53032]">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                <span>Last {dateRange} days</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card 
            className="border-l-4 border-l-[#d94848] h-full cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate && onNavigate("job-cards")}
          >
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
          <Card 
            className="border-l-4 border-l-[#e15b5b] h-full cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate && onNavigate("job-cards")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-gray-600">Completed Today</CardTitle>
              <div className="p-2 bg-[#fde7e7] rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-[#e15b5b]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl mb-1">{summary?.completedToday || 0}</div>
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
          <Card 
            className="border-l-4 border-l-[#f87171] h-full cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate && onNavigate("customers")}
          >
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
                        <p className="font-medium">ID: {formatJobId(job)}</p>
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
                        <TableCell className="font-medium">{formatJobId(job)}</TableCell>
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
