import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const RequireAuth: React.FC<{
  children: React.ReactElement;
  requireAdmin?: boolean;
}> = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#009B4D]" />
          <span className="text-lg font-medium">
            Checking authentication...
          </span>
        </div>
      </div>
    );
  }

  if (!user || (requireAdmin && !isAdmin())) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAuth;
