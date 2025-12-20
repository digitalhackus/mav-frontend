import { useState, useEffect } from "react";
import { authAPI } from "../api/client";
import { Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { UserCircle } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isActive: boolean;
  isEmailVerified: boolean;
}

export function RolesPermissions() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRoles, setUpdatingRoles] = useState<Record<string, boolean>>({});
  
  // Check if current user is admin@maws.pk
  const isMainAdmin = currentUser?.email?.toLowerCase() === 'admin@maws.pk';

  // Fetch users data on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await authAPI.getAllUsers();
        
        if (response.success) {
          // Flatten all users from all roles into a single array
          const allUsers: User[] = [];
          Object.keys(response.usersByRole || {}).forEach(roleName => {
            const roleUsers = response.usersByRole[roleName] || [];
            allUsers.push(...roleUsers);
          });
          setUsers(allUsers);
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

  const handleRoleChange = async (userId: string, newRole: string, currentRole: string) => {
    if (!isMainAdmin) {
      toast.error("Only the main admin (admin@maws.pk) can change user roles");
      return;
    }

    if (newRole === currentRole) {
      return;
    }

    try {
      setUpdatingRoles(prev => ({ ...prev, [userId]: true }));
      const response = await authAPI.updateUserRole(userId, newRole);
      
      if (response.success) {
        toast.success(response.message || "User role updated successfully");
        // Refresh users data
        const usersResponse = await authAPI.getAllUsers();
        if (usersResponse.success) {
          // Flatten all users from all roles into a single array
          const allUsers: User[] = [];
          Object.keys(usersResponse.usersByRole || {}).forEach(roleName => {
            const roleUsers = usersResponse.usersByRole[roleName] || [];
            allUsers.push(...roleUsers);
          });
          setUsers(allUsers);
        }
      } else {
        toast.error(response.error || "Failed to update user role");
      }
    } catch (err: any) {
      console.error("Error updating user role:", err);
      toast.error(err.message || "Failed to update user role");
    } finally {
      setUpdatingRoles(prev => ({ ...prev, [userId]: false }));
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Users List Header */}
      <div className="flex items-center gap-2 mb-4">
        <UserCircle className="h-5 w-5 text-slate-600" />
        <h3 className="text-lg font-medium text-slate-900">
          Users ({users.length})
        </h3>
      </div>

      {/* Users List */}
      {users.length > 0 ? (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant={user.status === 'active' ? 'default' : 'outline'}
                    className={`text-xs ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {user.status}
                  </Badge>
                  {user.email.toLowerCase() === 'admin@maws.pk' && (
                    <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-200 font-semibold">
                      Super Admin
                    </Badge>
                  )}
                  {!user.isEmailVerified && (
                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                      Unverified
                    </Badge>
                  )}
                </div>
              </div>
              {isMainAdmin && user.email.toLowerCase() !== 'admin@maws.pk' && (
                <div className="ml-4">
                  <Select
                    value={user.role}
                    onValueChange={(newRole) => handleRoleChange(user.id, newRole, user.role)}
                    disabled={updatingRoles[user.id]}
                  >
                    <SelectTrigger className="w-40">
                      {updatingRoles[user.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Technician">Technician</SelectItem>
                      <SelectItem value="Cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-gray-600">No users found. Users will appear here once they are created.</p>
        </div>
      )}
    </div>
  );
}
