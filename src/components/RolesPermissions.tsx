import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { authAPI } from "../api/client";
import { Loader2 } from "lucide-react";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Crown,
  Wrench,
  Shield,
  Calculator,
  UserCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Info,
  Edit,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Permission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  userCount?: number;
  isCustom?: boolean;
  permissions: Permission[];
}

const permissionDescriptions = {
  createEditJobCard: "Ability to create new job cards and edit existing ones",
  editServicePrice: "Permission to modify service pricing and costs",
  markJobComplete: "Authority to mark jobs as completed and ready for billing",
  viewCustomerData: "Access to view customer information and history",
  manageInvoices: "Create, edit, and manage customer invoices",
  accessReports: "View analytics, reports, and business insights",
};

export function RolesPermissions() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users data on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authAPI.getAllUsers();
        
        if (response.success) {
          // Map real data to role structure
          const roleMapping: Record<string, { icon: any; iconColor: string; iconBg: string; description: string }> = {
            "Admin": {
              icon: Crown,
              iconColor: "text-yellow-600",
              iconBg: "bg-yellow-100",
              description: "Full system access with all permissions"
            },
            "Supervisor": {
              icon: Shield,
              iconColor: "text-purple-600",
              iconBg: "bg-purple-100",
              description: "Oversee operations and approve completions"
            },
            "Technician": {
              icon: Wrench,
              iconColor: "text-blue-600",
              iconBg: "bg-blue-100",
              description: "Perform services and update job progress"
            },
            "Cashier": {
              icon: Calculator,
              iconColor: "text-green-600",
              iconBg: "bg-green-100",
              description: "Manage financial records and invoicing"
            },
            "Receptionist": {
              icon: UserCircle,
              iconColor: "text-pink-600",
              iconBg: "bg-pink-100",
              description: "Handle customer interactions and scheduling"
            }
          };

          // Define default permissions for each role
          const defaultPermissions: Record<string, Record<string, boolean>> = {
            "Admin": {
              createEditJobCard: true,
              editServicePrice: true,
              markJobComplete: true,
              viewCustomerData: true,
              manageInvoices: true,
              accessReports: true,
            },
            "Supervisor": {
              createEditJobCard: true,
              editServicePrice: true,
              markJobComplete: true,
              viewCustomerData: true,
              manageInvoices: true,
              accessReports: true,
            },
            "Technician": {
              createEditJobCard: false,
              editServicePrice: false,
              markJobComplete: true,
              viewCustomerData: true,
              manageInvoices: false,
              accessReports: false,
            },
            "Cashier": {
              createEditJobCard: false,
              editServicePrice: true,
              markJobComplete: false,
              viewCustomerData: true,
              manageInvoices: true,
              accessReports: true,
            },
            "Receptionist": {
              createEditJobCard: true,
              editServicePrice: false,
              markJobComplete: false,
              viewCustomerData: true,
              manageInvoices: true,
              accessReports: false,
            }
          };

          // Build roles array from real data
          const rolesList: Role[] = [];
          
          // Process each role that has users
          Object.keys(response.usersByRole || {}).forEach(roleName => {
            const roleInfo = roleMapping[roleName];
            if (roleInfo) {
              const userCount = response.roleCounts[roleName] || 0;
              const permissions = Object.keys(permissionDescriptions).map(permId => ({
                id: permId,
                name: permId === "createEditJobCard" ? "Create/Edit Job Card" :
                      permId === "editServicePrice" ? "Edit Service Price" :
                      permId === "markJobComplete" ? "Mark Job Complete" :
                      permId === "viewCustomerData" ? "View Customer Data" :
                      permId === "manageInvoices" ? "Manage Invoices" :
                      "Access Reports",
                description: permissionDescriptions[permId as keyof typeof permissionDescriptions],
                enabled: defaultPermissions[roleName]?.[permId] ?? false
              }));

              rolesList.push({
                id: roleName.toLowerCase(),
                name: roleName,
                description: roleInfo.description,
                icon: roleInfo.icon,
                iconColor: roleInfo.iconColor,
                iconBg: roleInfo.iconBg,
                userCount: userCount,
                isCustom: false,
                permissions: permissions
              });
            }
          });

          // Sort roles: Admin first, then others alphabetically
          rolesList.sort((a, b) => {
            if (a.name === "Admin") return -1;
            if (b.name === "Admin") return 1;
            return a.name.localeCompare(b.name);
          });

          setRoles(rolesList);
          // Expand first role by default
          if (rolesList.length > 0) {
            setExpandedRoles([rolesList[0].id]);
          }
        } else {
          setError(response.error || "Failed to fetch users");
        }
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError(err.message || "Failed to load user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleRole = (roleId: string) => {
    setExpandedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const togglePermission = (roleId: string, permissionId: string) => {
    setRoles((prev) =>
      prev.map((role) =>
        role.id === roleId
          ? {
              ...role,
              permissions: role.permissions.map((perm) =>
                perm.id === permissionId
                  ? { ...perm, enabled: !perm.enabled }
                  : perm
              ),
            }
          : role
      )
    );
  };

  const getEnabledPermissionsCount = (role: Role) => {
    return role.permissions.filter((p) => p.enabled).length;
  };

  const getAccessModules = (role: Role) => {
    const modules: string[] = [];
    role.permissions.forEach((perm) => {
      if (perm.enabled) {
        if (perm.id === "createEditJobCard" || perm.id === "markJobComplete") {
          if (!modules.includes("Job Cards")) modules.push("Job Cards");
        }
        if (perm.id === "manageInvoices") {
          if (!modules.includes("Invoices")) modules.push("Invoices");
        }
        if (perm.id === "viewCustomerData") {
          if (!modules.includes("Customers")) modules.push("Customers");
        }
        if (perm.id === "accessReports") {
          if (!modules.includes("Reports")) modules.push("Reports");
        }
      }
    });
    return modules;
  };

  const totalUsers = roles.reduce((sum, role) => sum + (role.userCount || 0), 0);
  const systemRoles = roles.filter(r => !r.isCustom).length;
  const customRoles = roles.filter(r => r.isCustom).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#c53032]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-600">No users found. Users will appear here once they are created.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-medium text-blue-900">Total Users</p>
          </div>
          <p className="text-2xl font-semibold text-blue-900">{totalUsers}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-purple-600" />
            <p className="text-xs font-medium text-purple-900">System Roles</p>
          </div>
          <p className="text-2xl font-semibold text-purple-900">{systemRoles}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="h-4 w-4 text-green-600" />
            <p className="text-xs font-medium text-green-900">Custom Roles</p>
          </div>
          <p className="text-2xl font-semibold text-green-900">{customRoles}</p>
        </div>
      </div>

      {/* Header with Add Custom Role Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-medium text-slate-900">Role Management</h3>
          <p className="text-sm text-slate-500 mt-1">
            Configure permissions and access levels for each role
          </p>
        </div>
        <Button className="bg-[#c53032] hover:bg-[#a6212a] w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Role
        </Button>
      </div>

      {/* Roles Table - Desktop */}
      <div className="hidden lg:block border border-slate-200 rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-64">Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-64">Access Modules</TableHead>
              <TableHead className="w-48 text-center">Permissions</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TooltipProvider>
              {roles.map((role) => {
                const isExpanded = expandedRoles.includes(role.id);
                const accessModules = getAccessModules(role);
                const enabledCount = getEnabledPermissionsCount(role);

                return (
                  <Collapsible
                    key={role.id}
                    open={isExpanded}
                    onOpenChange={() => toggleRole(role.id)}
                    asChild
                  >
                    <>
                      {/* Main Row */}
                      <TableRow className="border-b border-slate-200">
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${role.iconBg} flex items-center justify-center`}>
                              <role.icon className={`h-5 w-5 ${role.iconColor}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-900">{role.name}</p>
                                {role.isCustom && (
                                  <Badge variant="outline" className="text-xs">
                                    Custom
                                  </Badge>
                                )}
                              </div>
                              {role.userCount !== undefined && (
                                <p className="text-xs text-slate-500">
                                  {role.userCount} user{role.userCount !== 1 ? "s" : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-600">{role.description}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {accessModules.length > 0 ? (
                              accessModules.map((module) => (
                                <Badge
                                  key={module}
                                  variant="secondary"
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  {module}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">No access</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {enabledCount}/{role.permissions.length}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-slate-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {enabledCount} of {role.permissions.length} permissions enabled
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {role.isCustom && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Edit className="h-4 w-4 text-slate-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Edit role</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Delete role</p>
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Permissions */}
                      <CollapsibleContent asChild>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableCell colSpan={6} className="p-0">
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="px-12 py-6"
                                >
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-4">
                                      <Shield className="h-4 w-4 text-slate-600" />
                                      <h4 className="text-sm font-medium text-slate-900">
                                        Permission Settings
                                      </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {role.permissions.map((permission) => (
                                        <div
                                          key={permission.id}
                                          className="flex items-start justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                                        >
                                          <div className="flex-1 pr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                              <p className="text-sm font-medium text-slate-900">
                                                {permission.name}
                                              </p>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                  <p className="text-xs">{permission.description}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1">
                                              {permission.description}
                                            </p>
                                          </div>
                                          <Switch
                                            checked={permission.enabled}
                                            onCheckedChange={() =>
                                              togglePermission(role.id, permission.id)
                                            }
                                            disabled={role.id === "admin"} // Admin always has all permissions
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TooltipProvider>
          </TableBody>
        </Table>
      </div>

      {/* Roles Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        <TooltipProvider>
          {roles.map((role) => {
            const isExpanded = expandedRoles.includes(role.id);
            const accessModules = getAccessModules(role);
            const enabledCount = getEnabledPermissionsCount(role);

            return (
              <Collapsible
                key={role.id}
                open={isExpanded}
                onOpenChange={() => toggleRole(role.id)}
              >
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                  {/* Card Header */}
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-4 text-left hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${role.iconBg} flex items-center justify-center flex-shrink-0`}>
                          <role.icon className={`h-5 w-5 ${role.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-slate-900">{role.name}</p>
                            {role.isCustom && (
                              <Badge variant="outline" className="text-xs">
                                Custom
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mb-2">{role.description}</p>
                          {role.userCount !== undefined && (
                            <p className="text-xs text-slate-500">
                              {role.userCount} user{role.userCount !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-600 flex-shrink-0" />
                        )}
                      </div>
                      
                      {/* Access Modules */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {accessModules.length > 0 ? (
                          accessModules.map((module) => (
                            <Badge
                              key={module}
                              variant="secondary"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {module}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">No access</span>
                        )}
                      </div>

                      {/* Permissions Count */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${(enabledCount / role.permissions.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">
                          {enabledCount}/{role.permissions.length}
                        </span>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  {/* Expanded Permissions */}
                  <CollapsibleContent>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4 pb-4 pt-2 bg-slate-50 border-t border-slate-200"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                              <Shield className="h-4 w-4 text-slate-600" />
                              <h4 className="text-sm font-medium text-slate-900">
                                Permissions
                              </h4>
                            </div>
                            {role.permissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-start justify-between p-3 bg-white border border-slate-200 rounded-lg"
                              >
                                <div className="flex-1 pr-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-medium text-slate-900">
                                      {permission.name}
                                    </p>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-xs">{permission.description}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    {permission.description}
                                  </p>
                                </div>
                                <Switch
                                  checked={permission.enabled}
                                  onCheckedChange={() =>
                                    togglePermission(role.id, permission.id)
                                  }
                                  disabled={role.id === "admin"}
                                />
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Footer Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Permission Management Guidelines
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Click on any role row to expand and view detailed permission settings. Admin role
              permissions cannot be modified. Custom roles can be edited or deleted as needed.
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-sm font-medium text-slate-900 mb-3">Role Icons</p>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded ${role.iconBg} flex items-center justify-center`}>
                  <role.icon className={`h-4 w-4 ${role.iconColor}`} />
                </div>
                <span className="text-xs text-slate-700">{role.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
