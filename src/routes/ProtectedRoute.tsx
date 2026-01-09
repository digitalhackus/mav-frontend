import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const ProtectedRoute = () => {
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

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Optionally check if user is active (uncomment if needed)
  // if (user.status !== "active") {
  //   return <Navigate to="/pending-approval" replace />;
  // }

  // User is authenticated - render the protected content
  return <Outlet />;
};

