import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { RolesPermissions } from "./RolesPermissions";
import { CatalogManagement } from "./CatalogManagement";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { 
  Building2, 
  User, 
  Bell, 
  Mail, 
  Lock, 
  Save,
  Shield,
  AlertCircle,
  Server,
  Chrome,
  Info,
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { settingsAPI } from "../api/client";
import { toast } from "sonner";
import { useTheme, getHoverColor } from "../contexts/ThemeContext";

interface SettingsProps {
  userRole?: "Admin" | "Supervisor" | "Technician";
}

export function Settings({ userRole = "Admin" }: SettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  
  // Workshop settings
  const [workshopName, setWorkshopName] = useState("");
  const [workshopPhone, setWorkshopPhone] = useState("");
  const [workshopEmail, setWorkshopEmail] = useState("");
  const [workshopAddress, setWorkshopAddress] = useState("");
  const [taxRegistration, setTaxRegistration] = useState("");
  const [selectedColor, setSelectedColor] = useState("#c53032");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<{
    businessName?: string;
    phone?: string;
    email?: string;
    address?: string;
    taxRegistration?: string;
  }>({});

  // Tax settings
  const [taxCash, setTaxCash] = useState(18);
  const [taxCard, setTaxCard] = useState(18);
  const [taxOnline, setTaxOnline] = useState(18);

  // Notification settings
  const [serviceDueReminders, setServiceDueReminders] = useState(true);
  const [serviceDueDays, setServiceDueDays] = useState(7);
  const [overdueAlerts, setOverdueAlerts] = useState(true);
  const [overdueDays, setOverdueDays] = useState(7);
  const [jobCompletion, setJobCompletion] = useState(true);

  // Email settings
  const [fromEmail, setFromEmail] = useState("");
  const [emailSignature, setEmailSignature] = useState("");
  const [invoiceSubject, setInvoiceSubject] = useState("");
  const [invoiceTemplate, setInvoiceTemplate] = useState("");

  // Security settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Advanced settings
  const [marketplaceMode, setMarketplaceMode] = useState(false);

  // Email connection status
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [outlookConfigured, setOutlookConfigured] = useState(false);

  const { themeColor, setThemeColor, refreshTheme } = useTheme();

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Validation functions
  const validatePhone = (phone: string): string | undefined => {
    if (!phone || phone.trim() === "") {
      return "Phone number is required";
    }
    // Remove spaces and check format
    const cleaned = phone.replace(/\s/g, "");
    // Check if starts with +92
    if (!cleaned.startsWith("+92")) {
      return "Phone number must start with +92";
    }
    // Check if it's exactly 13 characters (+92 + 10 digits)
    if (cleaned.length !== 13) {
      return "Phone number must be 10 digits after +92";
    }
    // Check if all characters after +92 are digits
    const digits = cleaned.substring(3);
    if (!/^\d{10}$/.test(digits)) {
      return "Phone number must contain only digits after +92";
    }
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email || email.trim() === "") {
      return "Email address is required";
    }
    // Check for @ symbol
    if (!email.includes("@")) {
      return "Email must contain '@' symbol";
    }
    // Check for .com, .pk, or .org at the end
    if (!email.endsWith(".com") && !email.endsWith(".pk") && !email.endsWith(".org")) {
      return "Email must end with '.com', '.pk', or '.org'";
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.(com|pk|org)$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return undefined;
  };

  const validateNTN = (ntn: string): string | undefined => {
    if (!ntn || ntn.trim() === "") {
      return undefined; // NTN is optional
    }
    // NTN format: NTN-XXXXXXX-X (where X are digits)
    const ntnRegex = /^NTN-\d{7}-\d$/;
    if (!ntnRegex.test(ntn)) {
      return "NTN must be in format: NTN-XXXXXXX-X (7 digits, dash, 1 digit)";
    }
    return undefined;
  };

  const validateWorkshopFields = (): boolean => {
    const newErrors: typeof errors = {};

    // Validate business name
    if (!workshopName || workshopName.trim() === "") {
      newErrors.businessName = "Business name is required";
    }

    // Validate phone
    const phoneError = validatePhone(workshopPhone);
    if (phoneError) {
      newErrors.phone = phoneError;
    }

    // Validate email
    const emailError = validateEmail(workshopEmail);
    if (emailError) {
      newErrors.email = emailError;
    }

    // Validate address
    if (!workshopAddress || workshopAddress.trim() === "") {
      newErrors.address = "Business address is required";
    }

    // Validate NTN (optional but must be correct format if provided)
    const ntnError = validateNTN(taxRegistration);
    if (ntnError) {
      newErrors.taxRegistration = ntnError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.get();
      if (response.success && response.data) {
        const data = response.data;
        setSettings(data);
        
        // Load workshop settings
        if (data.workshop) {
          setWorkshopName(data.workshop.businessName || "");
          setWorkshopPhone(data.workshop.phone || "");
          setWorkshopEmail(data.workshop.email || "");
          setWorkshopAddress(data.workshop.address || "");
          setTaxRegistration(data.workshop.taxRegistration || "");
          const savedColor = data.workshop.themeColor || "#c53032";
          setSelectedColor(savedColor);
          setThemeColor(savedColor); // Update theme context
          setLogoPreview(data.workshop.logo || null);
        }

        // Load tax settings
        if (data.tax) {
          setTaxCash(data.tax.cash || 18);
          setTaxCard(data.tax.card || 18);
          setTaxOnline(data.tax.online || 18);
        }

        // Load notification settings
        if (data.notifications) {
          setServiceDueReminders(data.notifications.serviceDueReminders ?? true);
          setServiceDueDays(data.notifications.serviceDueDays || 7);
          setOverdueAlerts(data.notifications.overdueAlerts ?? true);
          setOverdueDays(data.notifications.overdueDays || 7);
          setJobCompletion(data.notifications.jobCompletion ?? true);
        }

        // Load email settings
        if (data.email) {
          setFromEmail(data.email.fromEmail || "");
          setEmailSignature(data.email.signature || "");
          setInvoiceSubject(data.email.invoiceSubject || "");
          setInvoiceTemplate(data.email.invoiceTemplate || "");
          setSmtpConfigured(data.email.smtpConfigured || false);
          setGoogleConfigured(data.email.googleConfigured || false);
          setOutlookConfigured(data.email.outlookConfigured || false);
        }

        // Load security settings
        if (data.security) {
          setTwoFactorEnabled(data.security.twoFactorEnabled || false);
        }

        // Load advanced settings
        if (data.advanced) {
          setMarketplaceMode(data.advanced.marketplaceMode || false);
        }
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error(error.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkshop = async () => {
    // Clear previous errors
    setErrors({});

    // Validate all fields
    if (!validateWorkshopFields()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    try {
      setSaving("workshop");
      const response = await settingsAPI.update({
        workshop: {
          businessName: workshopName,
          phone: workshopPhone,
          email: workshopEmail,
          address: workshopAddress,
          taxRegistration: taxRegistration,
          themeColor: selectedColor,
          logo: logoPreview,
        },
        advanced: {
          marketplaceMode: marketplaceMode,
        },
      });

      if (response.success) {
        toast.success("Workshop settings saved successfully");
        refreshTheme(); // Refresh theme after saving
        // Clear errors on successful save
        setErrors({});
      } else {
        // Handle backend validation errors
        if (response.errors) {
          setErrors(response.errors);
          toast.error("Please fix the errors before saving");
        } else {
          toast.error(response.message || "Failed to save workshop settings");
        }
      }
    } catch (error: any) {
      // Handle backend validation errors
      if (error.errors) {
        setErrors(error.errors);
        toast.error("Please fix the errors before saving");
      } else {
        toast.error(error.message || "Failed to save workshop settings");
      }
    } finally {
      setSaving(null);
    }
  };

  const handleSaveTax = async () => {
    try {
      setSaving("tax");
      await settingsAPI.update({
        tax: {
          cash: taxCash,
          card: taxCard,
          online: taxOnline,
        },
      });
      toast.success("Tax settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save tax settings");
    } finally {
      setSaving(null);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving("notifications");
      await settingsAPI.update({
        notifications: {
          serviceDueReminders,
          serviceDueDays,
          overdueAlerts,
          overdueDays,
          jobCompletion,
        },
      });
      toast.success("Notification settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save notification settings");
    } finally {
      setSaving(null);
    }
  };

  const handleSaveEmail = async () => {
    try {
      setSaving("email");
      await settingsAPI.update({
        email: {
          fromEmail,
          signature: emailSignature,
          invoiceSubject,
          invoiceTemplate,
        },
      });
      toast.success("Email settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save email settings");
    } finally {
      setSaving(null);
    }
  };

  const handleConnectEmail = async (provider: 'smtp' | 'google' | 'outlook') => {
    try {
      setSaving(`email-${provider}`);
      // For now, just mark as connected (in production, implement OAuth/SMTP)
      await settingsAPI.connectEmail(provider, {});
      
      if (provider === 'smtp') setSmtpConfigured(true);
      if (provider === 'google') setGoogleConfigured(true);
      if (provider === 'outlook') setOutlookConfigured(true);

      toast.success(`${provider.toUpperCase()} email service connected successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to connect ${provider} email service`);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      setSaving("security");
      await settingsAPI.update({
        security: {
          twoFactorEnabled,
        },
      });
      toast.success("Security settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save security settings");
    } finally {
      setSaving(null);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    try {
      setSaving("password");
      await settingsAPI.updatePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#c53032]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1 lg:mb-2">Settings</h1>
          <p className="text-sm lg:text-base text-gray-600">Configure your workshop management system</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="workshop" className="space-y-4 lg:space-y-6">
        <TabsList className={`grid w-full gap-1 ${userRole === "Admin" ? "grid-cols-3 lg:grid-cols-6" : "grid-cols-3 lg:grid-cols-5"}`}>
          <TabsTrigger value="workshop" className="text-xs lg:text-sm">Workshop</TabsTrigger>
          {userRole === "Admin" && (
            <TabsTrigger value="catalog" className="text-xs lg:text-sm">Catalog</TabsTrigger>
          )}
          <TabsTrigger value="users" className="text-xs lg:text-sm">Users</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs lg:text-sm">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="text-xs lg:text-sm">Security</TabsTrigger>
        </TabsList>

        {/* Workshop Settings */}
        <TabsContent value="workshop">
          <TooltipProvider>
            <div className="grid gap-6">
              {/* Business Profile Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Business Profile</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Manage your workshop details and information</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="workshop-name">
                        Business Name <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="workshop-name" 
                        value={workshopName}
                        onChange={(e) => {
                          setWorkshopName(e.target.value);
                          if (errors.businessName) {
                            setErrors({ ...errors, businessName: undefined });
                          }
                        }}
                        className={errors.businessName ? "border-red-500" : ""}
                      />
                      {errors.businessName && (
                        <p className="text-sm text-red-500">{errors.businessName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workshop-phone">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="workshop-phone" 
                        value={workshopPhone}
                        onChange={(e) => {
                          setWorkshopPhone(e.target.value);
                          if (errors.phone) {
                            setErrors({ ...errors, phone: undefined });
                          }
                        }}
                        placeholder="+92 XXX XXXXXXX"
                        className={errors.phone ? "border-red-500" : ""}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-500">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workshop-email">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="workshop-email" 
                      type="email" 
                      value={workshopEmail}
                      onChange={(e) => {
                        setWorkshopEmail(e.target.value);
                        if (errors.email) {
                          setErrors({ ...errors, email: undefined });
                        }
                      }}
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workshop-address">
                      Business Address <span className="text-red-500">*</span>
                    </Label>
                    <Textarea 
                      id="workshop-address" 
                      value={workshopAddress}
                      onChange={(e) => {
                        setWorkshopAddress(e.target.value);
                        if (errors.address) {
                          setErrors({ ...errors, address: undefined });
                        }
                      }}
                      className={`min-h-[80px] ${errors.address ? "border-red-500" : ""}`}
                    />
                    {errors.address && (
                      <p className="text-sm text-red-500">{errors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax-registration">Tax Registration Number</Label>
                      <Input 
                        id="tax-registration" 
                        value={taxRegistration}
                        onChange={(e) => {
                          setTaxRegistration(e.target.value);
                          if (errors.taxRegistration) {
                            setErrors({ ...errors, taxRegistration: undefined });
                          }
                        }}
                        placeholder="NTN-XXXXXXX-X"
                        className={errors.taxRegistration ? "border-red-500" : ""}
                      />
                      {errors.taxRegistration && (
                        <p className="text-sm text-red-500">{errors.taxRegistration}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">
                        Default Currency <span className="text-red-500">*</span>
                      </Label>
                      <Input id="currency" value="PKR (Rs)" disabled className="bg-slate-50" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tax Settings Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Receipt className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>Tax Settings</CardTitle>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Tax rate automatically applied based on payment type in invoice.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Configure tax rates by payment method</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-slate-600" />
                        <Label htmlFor="tax-cash">Tax Rate - Cash (%)</Label>
                      </div>
                      <Input 
                        id="tax-cash" 
                        type="number" 
                        value={taxCash}
                        onChange={(e) => setTaxCash(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <p className="text-xs text-slate-500">Applied when payment method is Cash</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-600" />
                        <Label htmlFor="tax-card">Tax Rate - Card (%)</Label>
                      </div>
                      <Input 
                        id="tax-card" 
                        type="number" 
                        value={taxCard}
                        onChange={(e) => setTaxCard(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <p className="text-xs text-slate-500">Applied when payment method is Card</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-slate-600" />
                        <Label htmlFor="tax-online">Tax Rate - Online Transfer (%)</Label>
                      </div>
                      <Input 
                        id="tax-online" 
                        type="number" 
                        value={taxOnline}
                        onChange={(e) => setTaxOnline(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <p className="text-xs text-slate-500">Applied for Online/Bank Transfer</p>
                    </div>
                  </div>
                  
                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t mt-4">
                    <Button 
                      onClick={handleSaveTax}
                      disabled={saving === "tax"}
                      className="px-6"
                      style={{ backgroundColor: themeColor }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                        const hoverColor = getHoverColor(themeColor);
                        e.currentTarget.style.backgroundColor = hoverColor;
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.backgroundColor = themeColor;
                      }}
                    >
                      {saving === "tax" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Tax Settings"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sticky Footer with Save Button */}
              <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-slate-200 pt-6 pb-6 mt-6 flex justify-center gap-3 z-10 shadow-lg">
                <Button 
                  className="px-8 text-white"
                  style={{ backgroundColor: themeColor }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    const hoverColor = getHoverColor(themeColor);
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.backgroundColor = themeColor;
                  }}
                  onClick={handleSaveWorkshop}
                  disabled={saving === "workshop"}
                >
                  {saving === "workshop" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TooltipProvider>
        </TabsContent>

        {/* Catalog Management - Admin Only */}
        {userRole === "Admin" && (
          <TabsContent value="catalog">
            <CatalogManagement />
          </TabsContent>
        )}

        {/* User Settings */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>User Roles & Permissions</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Manage user access and permissions across the system</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <RolesPermissions />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Bell className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Notification Preferences</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Configure automated notifications and reminders</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-24">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Service Due Reminders</p>
                    <p className="text-sm text-gray-600">Send reminders before service due</p>
                  </div>
                  <Switch 
                    checked={serviceDueReminders}
                    onCheckedChange={setServiceDueReminders}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="service-due-days" className="text-sm whitespace-nowrap">Days before:</Label>
                  <Input 
                    id="service-due-days" 
                    type="number" 
                    value={serviceDueDays}
                    onChange={(e) => setServiceDueDays(parseInt(e.target.value) || 7)}
                    className="w-24"
                    min="1"
                  />
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Overdue Service Alerts</p>
                    <p className="text-sm text-gray-600">Alert customers when service is overdue</p>
                  </div>
                  <Switch 
                    checked={overdueAlerts}
                    onCheckedChange={setOverdueAlerts}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="overdue-days" className="text-sm whitespace-nowrap">Days after:</Label>
                  <Input 
                    id="overdue-days" 
                    type="number" 
                    value={overdueDays}
                    onChange={(e) => setOverdueDays(parseInt(e.target.value) || 7)}
                    className="w-24"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Job Completion Notifications</p>
                  <p className="text-sm text-gray-600">Notify customers when their vehicle is ready</p>
                </div>
                <Switch 
                  checked={jobCompletion}
                  onCheckedChange={setJobCompletion}
                />
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 left-0 right-0 bg-white border-t pt-4 mt-6 flex justify-center gap-3">
                <Button 
                  className="text-white"
                  style={{ backgroundColor: themeColor }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    const hoverColor = getHoverColor(themeColor);
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.backgroundColor = themeColor;
                  }}
                  onClick={handleSaveNotifications}
                  disabled={saving === "notifications"}
                >
                  {saving === "notifications" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Notification Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle>Security Settings</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Manage security and access control</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-24">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-600">Add an extra layer of security</p>
                </div>
                <Switch 
                  checked={twoFactorEnabled}
                  onCheckedChange={setTwoFactorEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 left-0 right-0 bg-white border-t pt-4 mt-6 flex justify-center gap-3">
                <Button 
                  variant="outline"
                  onClick={handleUpdatePassword}
                  disabled={saving === "password"}
                >
                  {saving === "password" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
                <Button 
                  className="text-white"
                  style={{ backgroundColor: themeColor }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    const hoverColor = getHoverColor(themeColor);
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.backgroundColor = themeColor;
                  }}
                  onClick={handleSaveSecurity}
                  disabled={saving === "security"}
                >
                  {saving === "security" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Security Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
