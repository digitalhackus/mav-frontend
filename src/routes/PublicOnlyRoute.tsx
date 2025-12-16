import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const PublicOnlyRoute = () => {
  const { user, authReady } = useAuth();

  // Show loading state while checking authentication
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#c53032] mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If already logged in (and active if status is used), redirect to dashboard
  if (user && (!user.status || user.status === "active")) {
    return <Navigate to="/dashboard" replace />;
  }

  // Not logged in - render public content (login/signup pages)
  return <Outlet />;
};

