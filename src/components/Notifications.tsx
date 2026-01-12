import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  Plus
} from "lucide-react";
import { motion } from "motion/react";
import { notificationsAPI, customersAPI, vehiclesAPI } from "../api/client";
import { toast } from "sonner";
import { useConfirmDialog } from "../hooks/useConfirmDialog";

export function Notifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirmDialog();
  
  // Custom notification dialog state
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [customNotification, setCustomNotification] = useState({
    customerId: "",
    vehicleId: "",
    title: "",
    message: "",
    method: "email" as 'email'
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [sendingCustom, setSendingCustom] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (isCustomDialogOpen) {
      // Fetch customers when dialog opens
      fetchCustomers().catch((err) => {
        console.error("Error fetching customers in useEffect:", err);
        setCustomers([]);
      });
    } else {
      // Reset form when dialog closes
      setCustomNotification({
        customerId: "",
        vehicleId: "",
        title: "",
        message: "",
        method: "both"
      });
      setVehicles([]);
    }
  }, [isCustomDialogOpen]);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await customersAPI.getAll();
      if (response && response.success) {
        setCustomers(Array.isArray(response.data) ? response.data : []);
      } else {
        setCustomers([]);
      }
    } catch (err: any) {
      console.error("Error fetching customers:", err);
      setCustomers([]);
      // Don't crash the component, just set empty array
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchVehiclesForCustomer = useCallback(async (customerId: string) => {
    if (!customerId) {
      setVehicles([]);
      setLoadingVehicles(false);
      return;
    }
    try {
      setLoadingVehicles(true);
      setVehicles([]); // Clear previous vehicles
      const response = await vehiclesAPI.getAll(undefined, customerId);
      if (response && response.success) {
        // Handle both response.data and response.vehicles formats
        const vehiclesData = response.data || response.vehicles || [];
        if (Array.isArray(vehiclesData)) {
          setVehicles(vehiclesData);
        } else {
          setVehicles([]);
        }
      } else {
        setVehicles([]);
      }
    } catch (err: any) {
      console.error("Error fetching vehicles:", err);
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

  const handleSendCustomNotification = async () => {
    if (!customNotification.customerId || !customNotification.title || !customNotification.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSendingCustom(true);
    try {
      const response = await notificationsAPI.createCustom(
        customNotification.customerId,
        customNotification.title,
        customNotification.message,
        customNotification.method,
        customNotification.vehicleId || undefined
      );

      if (response.success) {
        toast.success("Custom notification sent successfully!");
        setIsCustomDialogOpen(false);
        setCustomNotification({
          customerId: "",
          vehicleId: "",
          title: "",
          message: "",
          method: "both"
        });
        setVehicles([]);
        fetchNotifications();
      } else {
        toast.error(response.message || "Failed to send custom notification");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send custom notification");
    } finally {
      setSendingCustom(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const [notificationsRes, statsRes] = await Promise.all([
        notificationsAPI.getAll(),
        notificationsAPI.getStats()
      ]);

      if (notificationsRes.success) {
        setNotifications(notificationsRes.data);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  const handleSendEmail = async (notification: any) => {
    if (!notification.customerId || !notification.vehicleId) {
      toast.error('Missing customer or vehicle information');
      return;
    }

    setSendingNotification(notification.id);
    try {
      const response = await notificationsAPI.sendEmail(
        notification.customerId,
        notification.vehicleId,
        notification.notificationId
      );
      
      if (response.success) {
        toast.success('Email sent successfully!');
        // Refresh notifications
        await fetchNotifications();
      } else {
        toast.error(response.message || 'Failed to send email');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSendingNotification(null);
    }
  };

  const handleSendWhatsApp = async (notification: any) => {
    if (!notification.customerId || !notification.vehicleId) {
      toast.error('Missing customer or vehicle information');
      return;
    }

    setSendingNotification(notification.id);
    try {
      const response = await notificationsAPI.sendWhatsApp(
        notification.customerId,
        notification.vehicleId,
        notification.notificationId
      );
      
      if (response.success) {
        toast.success('WhatsApp message sent successfully!');
        // Refresh notifications
        await fetchNotifications();
      } else {
        toast.error(response.message || 'Failed to send WhatsApp message');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send WhatsApp message');
    } finally {
      setSendingNotification(null);
    }
  };

  const handleBulkSend = async (type: 'all' | 'overdue' | 'due_soon', method: 'email' | 'whatsapp' | 'both') => {
    const confirmed = await confirm({
      title: "Confirm Bulk Send",
      description: `Are you sure you want to send ${method} notifications to ${type === 'all' ? 'all' : type === 'overdue' ? 'overdue' : 'due soon'} customers?`,
      confirmText: "Send",
      cancelText: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      const response = await notificationsAPI.sendBulk(type, method);
      if (response.success) {
        toast.success(response.message || 'Bulk notifications sent successfully!');
        await fetchNotifications();
      } else {
        toast.error(response.message || 'Failed to send bulk notifications');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send bulk notifications');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#c53032] mx-auto mb-4" />
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
        <p>{error}</p>
        <Button onClick={fetchNotifications} className="mt-4 bg-[#c53032] hover:bg-[#a6212a]" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  const statsData = [
    { label: "Pending Reminders", value: stats?.pendingReminders || 0, icon: Bell, color: "#c53032" },
    { label: "Sent Today", value: stats?.sentToday || 0, icon: Send, color: "#d94848" },
    { label: "Overdue Alerts", value: stats?.overdueAlerts || 0, icon: AlertCircle, color: "#e15b5b" },
    { label: "Scheduled", value: stats?.scheduled || 0, icon: Clock, color: "#f87171" },
  ];
  
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1 lg:mb-2">Notifications & Reminders</h1>
          <p className="text-sm lg:text-base text-gray-600">Manage service reminders and customer notifications</p>
        </div>
        <div className="flex gap-2 lg:gap-3">
          <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#c53032] hover:bg-[#a6212a] flex-1 lg:flex-none" 
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Custom Notification</span>
                <span className="sm:hidden">Custom</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Send Custom Notification</DialogTitle>
                <DialogDescription>
                  Send a custom notification to any customer via email.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  {loadingCustomers ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading customers...
                    </div>
                  ) : (
                    <Select
                      value={customNotification.customerId || ""}
                      onValueChange={(value) => {
                        // Defensive check
                        if (value === undefined || value === null) {
                          return;
                        }
                        
                        const newCustomerId = String(value || "");
                        
                        // Update state safely
                        try {
                          setCustomNotification(prev => ({
                            ...prev,
                            customerId: newCustomerId,
                            vehicleId: ""
                          }));
                          
                          // Clear vehicles immediately
                          setVehicles([]);
                          setLoadingVehicles(false);
                          
                          // Fetch vehicles asynchronously if customer is selected
                          if (newCustomerId) {
                            // Set loading state immediately
                            setLoadingVehicles(true);
                            // Use a small delay to ensure state is updated first
                            setTimeout(() => {
                              fetchVehiclesForCustomer(newCustomerId).catch((err) => {
                                console.error("Error fetching vehicles:", err);
                                setVehicles([]);
                                setLoadingVehicles(false);
                              });
                            }, 100);
                          }
                        } catch (err: any) {
                          console.error("Error updating customer selection:", err);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(customers) && customers.length > 0 ? (
                          customers.map((customer) => {
                            const customerId = customer?._id || customer?.id;
                            if (!customerId) return null;
                            return (
                              <SelectItem key={String(customerId)} value={String(customerId)}>
                                {customer?.name || 'Unknown'} - {customer?.phone || 'No phone'}
                              </SelectItem>
                            );
                          })
                        ) : (
                          <SelectItem value="_no_customers" disabled>No customers found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {customNotification.customerId && (
                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Vehicle (Optional)</Label>
                    {loadingVehicles ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading vehicles...
                      </div>
                    ) : (
                      <div>
                        <Select
                          value={customNotification.vehicleId || "_no_vehicle"}
                          onValueChange={(value) => {
                            try {
                              setCustomNotification(prev => ({ 
                                ...prev, 
                                vehicleId: value === "_no_vehicle" ? "" : (value || "")
                              }));
                            } catch (err: any) {
                              console.error("Error selecting vehicle:", err);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a vehicle (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_no_vehicle">No vehicle</SelectItem>
                            {Array.isArray(vehicles) && vehicles.length > 0 ? (
                              vehicles
                                .filter((vehicle) => vehicle && (vehicle._id || vehicle.id))
                                .map((vehicle) => {
                                  const vehicleId = vehicle._id || vehicle.id;
                                  if (!vehicleId) return null;
                                  const displayText = `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''} - ${vehicle.plateNo || 'N/A'}`.trim();
                                  return (
                                    <SelectItem key={String(vehicleId)} value={String(vehicleId)}>
                                      {displayText || 'Vehicle'}
                                    </SelectItem>
                                  );
                                })
                            ) : (
                              <SelectItem value="_no_vehicles" disabled>No vehicles found for this customer</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {!loadingVehicles && Array.isArray(vehicles) && vehicles.length === 0 && (
                          <p className="text-xs text-gray-500 mt-1">This customer has no vehicles registered</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Special Offer, Service Update"
                    value={customNotification.title}
                    onChange={(e) => setCustomNotification(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your custom message here..."
                    rows={6}
                    value={customNotification.message}
                    onChange={(e) => setCustomNotification(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Delivery Method *</Label>
                  <Select
                    value={customNotification.method}
                    onValueChange={(value: 'email') => setCustomNotification(prev => ({ ...prev, method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSendCustomNotification}
                    disabled={sendingCustom || !customNotification.customerId || !customNotification.title || !customNotification.message}
                    className="flex-1 bg-[#c53032] hover:bg-[#a6212a]"
                  >
                    {sendingCustom ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Notification
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsCustomDialogOpen(false)}
                    disabled={sendingCustom}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-l-4 h-full" style={{ borderLeftColor: stat.color }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-3xl">{stat.value}</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: `${stat.color}1a` }}>
                      <Icon className="h-6 w-6" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
            <CardTitle>Job Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No notifications available. Add vehicles with service dates to see reminders.
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      notification.type === "service_overdue" ? "bg-[#fee2e2]" :
                      notification.type === "service_due" ? "bg-[#fecaca]" :
                      "bg-[#fde7e7]"
                    }`}>
                      {notification.type === "service_overdue" ? (
                        <AlertCircle className="h-5 w-5 text-[#c53032]" />
                      ) : notification.type === "service_due" ? (
                        <Calendar className="h-5 w-5 text-[#d94848]" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-[#f87171]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-medium">{notification.title}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            className={
                              notification.priority === "high" ? "bg-[#fee2e2] text-[#b91c1c] border-red-200" :
                              notification.priority === "medium" ? "bg-[#fecaca] text-[#c53032] border-red-200" :
                              "bg-[#fde7e7] text-[#db2777] border-red-200"
                            }
                          >
                            {notification.priority}
                          </Badge>
                          {notification.sent && (
                            <Badge className="bg-[#fde7e7] text-[#c53032] border-red-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Sent
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{notification.message}</p>
                      
                      {/* Customer Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="text-gray-500">Customer:</span> <span className="font-medium">{notification.customer}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span> {notification.phone}
                        </div>
                        <div>
                          <span className="text-gray-500">Due Date:</span> {formatDate(notification.dueDate)}
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {!notification.emailSent && notification.email !== 'N/A' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleSendEmail(notification);
                              }}
                              disabled={sendingNotification === notification.id}
                            >
                              <Mail className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Email</span>
                            </Button>
                          )}
                              {notification.emailSent && (
                                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Email Sent
                                </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{formatTimeAgo(notification.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </div>
  );
}
