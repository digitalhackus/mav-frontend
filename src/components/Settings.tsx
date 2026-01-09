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
  Upload,
  Palette,
  Info,
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  Store,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { settingsAPI } from "../api/client";
import { toast } from "sonner";
import { useTheme, getHoverColor } from "../contexts/ThemeContext";

const themeColors = [
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Green", value: "#059669" },
  { name: "Orange", value: "#ea580c" },
  { name: "Red", value: "#dc2626" },
  { name: "Pink", value: "#db2777" },
];

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
  const [whatsapp, setWhatsapp] = useState(false);

  // Email settings
  const [fromEmail, setFromEmail] = useState("");
  const [emailSignature, setEmailSignature] = useState("");
  const [invoiceSubject, setInvoiceSubject] = useState("");
  const [invoiceTemplate, setInvoiceTemplate] = useState("");

  // Security settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(true);
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
          setWhatsapp(data.notifications.whatsapp ?? false);
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
          setSessionTimeout(data.security.sessionTimeout ?? true);
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveWorkshop = async () => {
    try {
      setSaving("workshop");
      await settingsAPI.update({
        workshop: {
          businessName: workshopName,
          phone: workshopPhone,
          email: workshopEmail,
          address: workshopAddress,
          taxRegistration: taxRegistration,
          themeColor: selectedColor,
          logo: logoPreview,
        },
        tax: {
          cash: taxCash,
          card: taxCard,
          online: taxOnline,
        },
        advanced: {
          marketplaceMode: marketplaceMode,
        },
      });
      toast.success("Workshop settings saved successfully");
      refreshTheme(); // Refresh theme after saving
    } catch (error: any) {
      toast.error(error.message || "Failed to save workshop settings");
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
          whatsapp,
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
          sessionTimeout,
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
          <TabsTrigger value="email" className="text-xs lg:text-sm lg:col-span-1 col-start-1">Email</TabsTrigger>
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
                      <Label htmlFor="workshop-name">Business Name *</Label>
                      <Input 
                        id="workshop-name" 
                        value={workshopName}
                        onChange={(e) => setWorkshopName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workshop-phone">Phone Number *</Label>
                      <Input 
                        id="workshop-phone" 
                        value={workshopPhone}
                        onChange={(e) => setWorkshopPhone(e.target.value)}
                        placeholder="+92 XXX XXXXXXX" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workshop-email">Email Address *</Label>
                    <Input 
                      id="workshop-email" 
                      type="email" 
                      value={workshopEmail}
                      onChange={(e) => setWorkshopEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workshop-address">Business Address *</Label>
                    <Textarea 
                      id="workshop-address" 
                      value={workshopAddress}
                      onChange={(e) => setWorkshopAddress(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax-registration">Tax Registration Number</Label>
                      <Input 
                        id="tax-registration" 
                        value={taxRegistration}
                        onChange={(e) => setTaxRegistration(e.target.value)}
                        placeholder="NTN-XXXXXXX-X"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Default Currency *</Label>
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
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Payment-Based Tax Rates</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Different tax rates will be automatically applied based on the payment method selected during invoice creation.
                      </p>
                    </div>
                  </div>

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
                </CardContent>
              </Card>

              {/* Branding Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Palette className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle>Branding & Appearance</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Customize your business logo and theme colors</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label>Business Logo</Label>
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {/* Logo Preview */}
                      <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain p-2" />
                        ) : (
                          <div className="text-center">
                            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-500">No logo</p>
                          </div>
                        )}
                      </div>

                      {/* Upload Button */}
                      <div className="flex-1">
                        <label htmlFor="logo-upload" className="cursor-pointer">
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-all">
                            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm font-medium text-slate-700">Click to upload logo</p>
                            <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 2MB</p>
                          </div>
                          <input
                            id="logo-upload"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </label>
                        {logoPreview && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2 w-full"
                            onClick={() => setLogoPreview(null)}
                          >
                            Remove Logo
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Theme Color */}
                  <div className="space-y-3">
                    <Label>Theme Color</Label>
                    <p className="text-xs text-slate-500">Choose a primary color for your business theme</p>
                    <div className="flex flex-wrap gap-3">
                      {themeColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => {
                            setSelectedColor(color.value);
                            setThemeColor(color.value); // Update theme immediately for preview
                          }}
                          className={`relative w-12 h-12 rounded-lg transition-all hover:scale-110 ${
                            selectedColor === color.value 
                              ? 'ring-2 ring-offset-2 ring-slate-900' 
                              : 'hover:ring-2 hover:ring-offset-2 hover:ring-slate-400'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        >
                          {selectedColor === color.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color.value }} />
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div 
                        className="w-10 h-10 rounded-lg" 
                        style={{ backgroundColor: selectedColor }}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Selected Color</p>
                        <p className="text-xs text-slate-500 font-mono">{selectedColor}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Settings Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Store className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle>Advanced Settings</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Additional features and configurations</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900">Enable Marketplace Mode</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-slate-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Marketplace mode restricts system access to registered members only. Feature available in future release.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-slate-600">
                        Restrict access to members only (Coming Soon)
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        <AlertCircle className="h-3 w-3" />
                        Future Release
                      </div>
                    </div>
                    <Switch 
                      checked={marketplaceMode}
                      onCheckedChange={setMarketplaceMode}
                      disabled
                    />
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

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">WhatsApp Notifications</p>
                  <p className="text-sm text-gray-600">Send notifications via WhatsApp</p>
                </div>
                <Switch 
                  checked={whatsapp}
                  onCheckedChange={setWhatsapp}
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

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Email Templates</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Customize email templates for automated messages</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pb-24">
              {/* Info Banner */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Requires SMTP or Google/Outlook connection.
                  </p>
                </div>
              </div>

              {/* Email Template Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-from">From Email</Label>
                  <Input 
                    id="email-from" 
                    type="email" 
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-signature">Email Signature</Label>
                  <Textarea 
                    id="email-signature" 
                    rows={4}
                    value={emailSignature}
                    onChange={(e) => setEmailSignature(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Invoice Email Template</Label>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm mb-2">Subject: {invoiceSubject || 'Your Invoice #{invoice_number}'}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {invoiceTemplate || 'Dear {customer_name},\n\nThank you for choosing Momentum AutoWorks. Please find your invoice attached.'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice-subject">Invoice Subject</Label>
                    <Input 
                      id="invoice-subject"
                      value={invoiceSubject}
                      onChange={(e) => setInvoiceSubject(e.target.value)}
                      placeholder="Your Invoice #{invoice_number}"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice-template">Invoice Template</Label>
                    <Textarea 
                      id="invoice-template"
                      value={invoiceTemplate}
                      onChange={(e) => setInvoiceTemplate(e.target.value)}
                      rows={4}
                      placeholder="Dear {customer_name},&#10;&#10;Thank you for choosing Momentum AutoWorks. Please find your invoice attached."
                    />
                  </div>
                </div>
              </div>

              {/* Connect Email Section */}
              <div className="space-y-3">
                <Label>Connect Email</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* SMTP Card */}
                  <Card className={`border-2 ${smtpConfigured ? 'border-green-300 bg-green-50' : 'hover:border-blue-300'} transition-colors`}>
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <Server className="h-6 w-6 text-gray-700" />
                      </div>
                      <div>
                        <p className="font-medium">SMTP</p>
                        <p className="text-xs text-gray-600 mt-1">Custom SMTP server</p>
                      </div>
                      {smtpConfigured ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Connected</span>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleConnectEmail('smtp')}
                          disabled={saving === 'email-smtp'}
                        >
                          {saving === 'email-smtp' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Google Card */}
                  <Card className={`border-2 ${googleConfigured ? 'border-green-300 bg-green-50' : 'hover:border-blue-300'} transition-colors`}>
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                      <div className="p-3 bg-red-100 rounded-lg">
                        <Chrome className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium">Google</p>
                        <p className="text-xs text-gray-600 mt-1">Gmail integration</p>
                      </div>
                      {googleConfigured ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Connected</span>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleConnectEmail('google')}
                          disabled={saving === 'email-google'}
                        >
                          {saving === 'email-google' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Outlook Card */}
                  <Card className={`border-2 ${outlookConfigured ? 'border-green-300 bg-green-50' : 'hover:border-blue-300'} transition-colors`}>
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Mail className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Outlook</p>
                        <p className="text-xs text-gray-600 mt-1">Microsoft 365</p>
                      </div>
                      {outlookConfigured ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Connected</span>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleConnectEmail('outlook')}
                          disabled={saving === 'email-outlook'}
                        >
                          {saving === 'email-outlook' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
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
                  onClick={handleSaveEmail}
                  disabled={saving === "email"}
                >
                  {saving === "email" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Email Settings
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

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Session Timeout</p>
                  <p className="text-sm text-gray-600">Auto logout after 30 minutes of inactivity</p>
                </div>
                <Switch 
                  checked={sessionTimeout}
                  onCheckedChange={setSessionTimeout}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
