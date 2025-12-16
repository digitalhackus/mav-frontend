import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  MessageCircle,
  Car,
  User,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Wrench,
  Droplet,
  Filter as FilterIcon,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";
import { notificationsAPI } from "../api/client";

type SortOption = "priority-high" | "priority-low" | "date-new" | "date-old" | "customer";

interface ServiceReminder {
  id: string;
  title: string;
  message: string;
  customer: string;
  phone: string;
  vehicle: {
    make: string;
    model: string;
    plate: string;
    year?: number;
  };
  dueDate: Date | string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "Sent" | "Failed" | "Overdue";
  lastSent?: Date | string;
  timestamp: Date | string;
  icon: "wrench" | "droplet" | "filter";
}

export function ServiceReminders() {
  const [sortBy, setSortBy] = useState<SortOption>("priority-high");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reminders, setReminders] = useState<ServiceReminder[]>([]);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await notificationsAPI.getServiceReminders();
      if (response.success) {
        // Convert date strings to Date objects
        const formattedReminders = response.data.map((r: any) => ({
          ...r,
          dueDate: new Date(r.dueDate),
          timestamp: new Date(r.timestamp),
          lastSent: r.lastSent ? new Date(r.lastSent) : undefined,
          vehicle: {
            make: r.vehicle.make,
            model: r.vehicle.model,
            plate: r.vehicle.plate || r.vehicle.plateNo,
            year: r.vehicle.year
          }
        }));
        setReminders(formattedReminders);
      }
    } catch (err: any) {
      console.error("Error fetching reminders:", err);
      setError(err.message || "Failed to load service reminders");
    } finally {
      setLoading(false);
    }
  };

  // Sort function
  const sortReminders = (reminders: ServiceReminder[]) => {
    const priorityOrder = { High: 3, Medium: 2, Low: 1 };
    
    return [...reminders].sort((a, b) => {
      switch (sortBy) {
        case "priority-high":
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case "priority-low":
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case "date-new":
          return b.timestamp.getTime() - a.timestamp.getTime();
        case "date-old":
          return a.timestamp.getTime() - b.timestamp.getTime();
        case "customer":
          return a.customer.localeCompare(b.customer);
        default:
          return 0;
      }
    });
  };

  const sortedReminders = sortReminders(reminders);

  const getSortLabel = () => {
    switch (sortBy) {
      case "priority-high": return "Priority (High to Low)";
      case "priority-low": return "Priority (Low to High)";
      case "date-new": return "Date (Newest First)";
      case "date-old": return "Date (Oldest First)";
      case "customer": return "Customer (A-Z)";
      default: return "Sort";
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getDueDateStatus = (dueDate: Date) => {
    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Overdue", color: "text-red-600" };
    if (diffDays === 0) return { text: "Due Today", color: "text-orange-600" };
    if (diffDays <= 3) return { text: `Due in ${diffDays}d`, color: "text-orange-600" };
    return { text: `Due in ${diffDays}d`, color: "text-gray-600" };
  };

  const getServiceIcon = (icon: string) => {
    switch (icon) {
      case "wrench": return <Wrench className="h-4 w-4" />;
      case "droplet": return <Droplet className="h-4 w-4" />;
      case "filter": return <FilterIcon className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  const handleBulkEmail = () => {
    const overdueReminders = sortedReminders.filter(r => r.status === "Overdue");
    console.log("Sending emails to:", overdueReminders.length, "customers");
    alert(`Bulk email sent to ${overdueReminders.length} overdue customers only`);
  };

  const handleBulkWhatsApp = () => {
    const overdueReminders = sortedReminders.filter(r => r.status === "Overdue");
    console.log("Sending WhatsApp to:", overdueReminders.length, "customers");
    alert(`Bulk WhatsApp sent to ${overdueReminders.length} overdue customers only`);
  };

  const handleSingleEmail = (reminder: ServiceReminder) => {
    if (reminder.status === "Sent" || reminder.status === "Failed") {
      alert("This reminder has already been sent. Only Overdue/Pending reminders can be sent.");
      return;
    }
    console.log("Sending email to:", reminder.customer);
    alert(`Email sent to ${reminder.customer}`);
  };

  const handleSingleWhatsApp = (reminder: ServiceReminder) => {
    if (reminder.status === "Sent" || reminder.status === "Failed") {
      alert("This reminder has already been sent. Only Overdue/Pending reminders can be sent.");
      return;
    }
    console.log("Sending WhatsApp to:", reminder.customer);
    alert(`WhatsApp sent to ${reminder.customer}`);
  };

  // Stats
  const stats = {
    overdue: sortedReminders.filter(r => r.status === "Overdue").length,
    pending: sortedReminders.filter(r => r.status === "Pending").length,
    sent: sortedReminders.filter(r => r.status === "Sent").length,
    failed: sortedReminders.filter(r => r.status === "Failed").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c53032] mx-auto mb-4" />
          <p className="text-gray-600">Loading service reminders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
        <p>{error}</p>
        <Button onClick={fetchReminders} className="mt-4 bg-[#c53032] hover:bg-[#a6212a]" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Title Row */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl mb-1 lg:mb-2">Job Cards</h1>
            <p className="text-sm lg:text-base text-gray-600">
              Automated service reminders based on vehicle mileage and service history
            </p>
          </div>
          <div className="flex gap-2 flex-wrap lg:flex-nowrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <span>{getSortLabel()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("priority-high")}>
                  <ArrowDown className="h-4 w-4 mr-2 text-red-500" />
                  Priority (High to Low)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("priority-low")}>
                  <ArrowUp className="h-4 w-4 mr-2 text-blue-500" />
                  Priority (Low to High)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("date-new")}>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Date (Newest First)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("date-old")}>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Date (Oldest First)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("customer")}>
                  <User className="h-4 w-4 mr-2" />
                  Customer (A-Z)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkEmail}
              className="w-full sm:w-auto"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBulkWhatsApp}
              className="w-full sm:w-auto"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp All
            </Button>
          </div>
        </div>
        
        {/* Info Banner */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="mb-1">
                <strong>Important: Vehicle Daily Mileage Required</strong>
              </p>
              <p>
                For this system to work, you must collect and update <strong>'Daily Mileage'</strong> on each vehicle profile. 
                This data is used to calculate estimated service due dates automatically.
              </p>
              <p className="mt-2">
                <strong>Note:</strong> Notification send-outs are filtered by Status type - bulk sends will only go to <strong>Overdue</strong> customers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border border-red-200 bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Overdue</p>
                  <p className="text-3xl">{stats.overdue}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
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
          <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
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
          <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sent</p>
                  <p className="text-3xl">{stats.sent}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
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
          <Card className="border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Failed</p>
                  <p className="text-3xl">{stats.failed}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Service Reminders List */}
      <div className="grid grid-cols-1 gap-3">
        {sortedReminders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No service reminders available. Add vehicles with service dates to see reminders.
            </CardContent>
          </Card>
        ) : (
          sortedReminders.map((reminder, index) => {
          const dueDateStatus = getDueDateStatus(reminder.dueDate);
          
          return (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Left: Icon & Content */}
                    <div className="flex gap-3 flex-1">
                      {/* Service Icon */}
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                        ${reminder.priority === "High" ? "bg-red-100 text-red-600" : ""}
                        ${reminder.priority === "Medium" ? "bg-orange-100 text-orange-600" : ""}
                        ${reminder.priority === "Low" ? "bg-blue-100 text-blue-600" : ""}
                      `}>
                        {getServiceIcon(reminder.icon)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium mb-1">{reminder.title}</h3>
                            <p className="text-xs text-gray-600 mb-2">{reminder.message}</p>
                          </div>
                        </div>

                        {/* Vehicle Info */}
                        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded text-xs">
                          <Car className="h-3 w-3 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {reminder.vehicle.make} {reminder.vehicle.model}
                          </span>
                          <span className="text-gray-500">–</span>
                          <span className="text-gray-600">{reminder.vehicle.plate}</span>
                        </div>

                        {/* Customer & Contact Info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{reminder.customer}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{reminder.phone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className={dueDateStatus.color}>
                              {dueDateStatus.text} • {reminder.dueDate.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions & Status */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 lg:gap-3">
                      {/* Priority & Status Chips */}
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Badge
                          className={
                            reminder.priority === "High" ? "bg-red-50 text-red-700 border-red-200 text-xs" :
                            reminder.priority === "Medium" ? "bg-orange-50 text-orange-700 border-orange-200 text-xs" :
                            "bg-blue-50 text-blue-700 border-blue-200 text-xs"
                          }
                        >
                          {reminder.priority}
                        </Badge>
                        <Badge
                          className={
                            reminder.status === "Sent" ? "bg-green-50 text-green-700 border-green-200 text-xs" :
                            reminder.status === "Failed" ? "bg-red-50 text-red-700 border-red-200 text-xs" :
                            reminder.status === "Overdue" ? "bg-red-50 text-red-700 border-red-200 text-xs" :
                            "bg-gray-50 text-gray-700 border-gray-200 text-xs"
                          }
                        >
                          {reminder.status}
                        </Badge>
                      </div>

                      {/* Channel Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleSingleEmail(reminder)}
                          disabled={reminder.status === "Sent" || reminder.status === "Failed"}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => handleSingleWhatsApp(reminder)}
                          disabled={reminder.status === "Sent" || reminder.status === "Failed"}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Time Ago */}
                      {reminder.lastSent && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {getTimeAgo(reminder.lastSent)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        }))}
      </div>
    </div>
  );
}
