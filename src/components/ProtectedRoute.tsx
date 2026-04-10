"use client";

import { useAuth, UserRole } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (allowedRoles && role && !allowedRoles.includes(role)) {
        // Redirect to their default dashboard if they try to access unauthorized area
        if (role === "admin") router.push("/dashboard/admin");
        else if (role === "head") router.push("/dashboard/head");
        else router.push("/dashboard/user");
      }
    }
  }, [user, role, loading, router, allowedRoles]);

  if (loading || (!user && !loading)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Double check before rendering children
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
