import { ReactNode, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  Car,
  NotebookPen,
  Wrench,
  Clipboard,
  BarChart3,
  Settings,
  Bell,
  Search,
  User,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Package
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Toaster } from "./ui/sonner";
import { useTheme } from "../contexts/ThemeContext";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "../contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout?: () => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "customers", label: "Customers", icon: Users },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "invoices", label: "Invoices", icon: NotebookPen },
  { id: "job-cards", label: "Job Cards", icon: Wrench },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Layout({ children, currentPage, onNavigate, onLogout }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { themeColor } = useTheme();
  const { user } = useAuth();
  
  // Format role for display
  const getRoleDisplayName = (role: string | undefined) => {
    if (!role) return "User";
    const roleMap: Record<string, string> = {
      "Admin": "Workshop Manager",
      "Supervisor": "Supervisor",
      "Technician": "Technician"
    };
    return roleMap[role] || role;
  };

  const NavigationItems = () => (
    <>
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id);
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentPage === item.id
                ? "text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
            style={currentPage === item.id ? { backgroundColor: themeColor } : {}}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </>
  );

  return (
    <>
      <Toaster />
      <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src="/1.png" alt="Momentum POS" className="h-10 w-auto" />
            <div>
              <h1 className="font-semibold">Momentum POS</h1>
              <p className="text-xs text-slate-400">Point of Sale</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavigationItems />
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-slate-900 text-white p-0" aria-describedby={undefined}>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="p-6 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <img src="/1.png" alt="Momentum POS" className="h-10 w-auto" />
                    <div>
                      <h1 className="font-semibold">Momentum POS</h1>
                      <p className="text-xs text-slate-400">Point of Sale</p>
                    </div>
                  </div>
                </div>
                <nav className="p-4 space-y-1">
                  <NavigationItems />
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo for mobile */}
            <div className="flex lg:hidden items-center gap-2">
              <img src="/1.png" alt="Momentum POS" className="h-8 w-auto" />
              <span className="font-semibold text-sm">Momentum POS</span>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden lg:flex items-center gap-4 flex-1 max-w-xl">
              <GlobalSearch onNavigate={onNavigate} />
            </div>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 lg:gap-3 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors cursor-pointer">
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-xs text-gray-500">{getRoleDisplayName(user?.role)}</p>
                  </div>
                  <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
                    <AvatarFallback className="bg-red-600">
                      <User className="h-4 w-4 lg:h-5 lg:w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-gray-400 hidden md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-xs text-gray-500">{getRoleDisplayName(user?.role)}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate("settings")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onLogout && onLogout()} 
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">
            <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
    </>
  );
}
