import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Login } from "./components/Login";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Customers } from "./components/Customers";
import { Vehicles } from "./components/Vehicles";
import { Invoices } from "./components/Invoices";
import { JobCards } from "./components/JobCards";
import { JobCardDetail } from "./components/JobCardDetail";
import { AddInvoice } from "./components/AddInvoice";
import { Reports } from "./components/Reports";
import { Notifications } from "./components/Notifications";
import { Settings } from "./components/Settings";
import { Inventory } from "./components/Inventory";
import { connectSocket, disconnectSocket } from "./lib/socket";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicOnlyRoute } from "./routes/PublicOnlyRoute";
import { jobsAPI } from "./api/client";

// Login page wrapper
function LoginPage() {
  const { refreshTheme } = useTheme();
  const { user } = useAuth();

  // Connect socket and refresh theme when user logs in
  useEffect(() => {
    if (user) {
    connectSocket();
    refreshTheme();
    }
  }, [user, refreshTheme]);

  return <Login />;
}

// Protected app layout with navigation
function AppLayout() {
  const { user, logout, refreshAuth } = useAuth();
  const { refreshTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Connect socket and load theme when app mounts
  useEffect(() => {
    if (user) {
      connectSocket();
      refreshTheme();
    }
  }, [user, refreshTheme]);

  // Handle tab visibility and window focus - refresh auth only (no page refresh)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Tab became visible - refresh auth to ensure token is still valid
        // Only refresh auth, don't force page refresh
        refreshAuth().catch(() => {
          // Silently fail - auth will be checked on next interaction
        });
      }
    };

    const handleFocus = () => {
      if (user) {
        // Window gained focus - refresh auth only
        // Only refresh auth, don't force page refresh
        refreshAuth().catch(() => {
          // Silently fail - auth will be checked on next interaction
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, refreshAuth]);

  const handleLogout = () => {
    logout();
    disconnectSocket();
    navigate("/login", { replace: true });
  };

  const handleNavigate = (page: string) => {
    navigate(`/${page}`);
  };

  // Get current page from location for Layout
  const getCurrentPage = (): string => {
    const path = location.pathname.slice(1) || "dashboard";
    return path;
  };

  return (
    <Layout currentPage={getCurrentPage()} onNavigate={handleNavigate} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={<Dashboard onNavigate={handleNavigate} />} 
        />
        <Route 
          path="/customers" 
          element={<Customers onNavigate={handleNavigate} />} 
        />
        <Route 
          path="/vehicles" 
          element={<Vehicles />} 
        />
        <Route 
          path="/invoices" 
          element={<Invoices />} 
        />
        <Route 
          path="/job-cards" 
          element={<JobCards />} 
        />
        <Route 
          path="/create-job-card" 
          element={
            <JobCardDetail
              onClose={() => navigate("/job-cards")}
              onSave={async (data) => {
                try {
                  await jobsAPI.create(data);
                  navigate("/job-cards");
                } catch (err: any) {
                  console.error("Failed to create job:", err);
                  alert(err.message || "Failed to create job. Please try again.");
                }
              }}
              userRole={user?.role || "Admin"}
            />
          } 
        />
        <Route 
          path="/create-invoice" 
          element={<Navigate to="/invoices?tab=create" replace />} 
        />
        <Route 
          path="/inventory" 
          element={<Inventory />} 
        />
        <Route 
          path="/reports" 
          element={<Reports />} 
        />
        <Route 
          path="/notifications" 
          element={<Notifications />} 
        />
        <Route 
          path="/settings" 
          element={<Settings userRole={user?.role || "Admin"} />} 
        />
        {/* Fallback for unknown routes within protected area */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root path - redirect based on auth (handled by PublicOnlyRoute) */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Route>

      {/* Public auth routes - only accessible when NOT logged in */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        {/* Add signup routes here if needed */}
      </Route>

      {/* Protected app routes - only accessible when logged in */}
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppLayout />} />
      </Route>

      {/* Fallback for any other routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
