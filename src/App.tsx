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
import { connectSocket, disconnectSocket } from "./lib/socket";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicOnlyRoute } from "./routes/PublicOnlyRoute";

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
  const [pageRefreshKey, setPageRefreshKey] = useState(0);

  // Connect socket and load theme when app mounts
  useEffect(() => {
    if (user) {
      connectSocket();
      refreshTheme();
    }
  }, [user, refreshTheme]);

  // Handle tab visibility and window focus - refresh auth and page when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Tab became visible - refresh auth to ensure token is still valid
        refreshAuth().catch(() => {
          // Silently fail - auth will be checked on next interaction
        });
        
        // Force page refresh by updating refresh key
        setPageRefreshKey(prev => prev + 1);
        
        // Dispatch custom event to trigger page refresh
        window.dispatchEvent(new CustomEvent('tabVisible'));
      }
    };

    const handleFocus = () => {
      if (user) {
        // Window gained focus - refresh auth
        refreshAuth().catch(() => {
          // Silently fail - auth will be checked on next interaction
        });
        
        // Force page refresh by updating refresh key
        setPageRefreshKey(prev => prev + 1);
        
        // Dispatch custom event to trigger page refresh
        window.dispatchEvent(new CustomEvent('tabVisible'));
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
          element={<Dashboard key={`dashboard-${pageRefreshKey}`} onNavigate={handleNavigate} />} 
        />
        <Route 
          path="/customers" 
          element={<Customers key={`customers-${pageRefreshKey}`} onNavigate={handleNavigate} />} 
        />
        <Route 
          path="/vehicles" 
          element={<Vehicles key={`vehicles-${pageRefreshKey}`} />} 
        />
        <Route 
          path="/invoices" 
          element={<Invoices key={`invoices-${pageRefreshKey}`} />} 
        />
        <Route 
          path="/job-cards" 
          element={<JobCards key={`job-cards-${pageRefreshKey}`} />} 
        />
        <Route 
          path="/create-job-card" 
          element={
            <JobCardDetail
              key={`create-job-card-${pageRefreshKey}`}
              onClose={() => navigate("/dashboard")}
              onSave={(data) => {
                console.log("Job card created:", data);
                navigate("/job-cards");
              }}
              userRole={user?.role || "Admin"}
            />
          } 
        />
        <Route 
          path="/create-invoice" 
          element={
            <AddInvoice
              key={`create-invoice-${pageRefreshKey}`}
              onClose={() => navigate("/dashboard")}
              onSubmit={(data) => {
                console.log("Invoice created:", data);
                navigate("/invoices");
              }}
              userRole={user?.role || "Admin"}
            />
          } 
        />
        <Route 
          path="/reports" 
          element={<Reports key={`reports-${pageRefreshKey}`} />} 
        />
        <Route 
          path="/notifications" 
          element={<Notifications key={`notifications-${pageRefreshKey}`} />} 
        />
        <Route 
          path="/settings" 
          element={<Settings key={`settings-${pageRefreshKey}`} userRole={user?.role || "Admin"} />} 
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
