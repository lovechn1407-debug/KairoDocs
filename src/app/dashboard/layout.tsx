"use client";

import { useAuth } from "@/context/AuthContext";
import { auth, database } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { LogOut, Home, FileText, Settings, Users, Megaphone } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState<any>(null);

  useEffect(() => {
    const unsub = onValue(ref(database, "announcements/global"), (snap) => {
       if (snap.exists()) setAnnouncement(snap.val());
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const getNavLinks = () => {
    if (role === "admin") {
      return [
        { name: "Dashboard", href: "/dashboard/admin", icon: Home },
        { name: "Departments", href: "/dashboard/admin/departments", icon: Users },
        { name: "Templates", href: "/dashboard/admin/templates", icon: FileText },
        { name: "Announcements", href: "/dashboard/admin/announcements", icon: Megaphone },
        { name: "Settings", href: "/dashboard/admin/settings", icon: Settings },
      ];
    } else if (role === "head") {
      return [
        { name: "Dashboard", href: "/dashboard/head", icon: Home },
        { name: "Submissions", href: "/dashboard/head/submissions", icon: FileText },
        { name: "Settings", href: "/dashboard/head/settings", icon: Settings },
      ];
    } else {
      return [
        { name: "Dashboard", href: "/dashboard/user", icon: Home },
        { name: "My Projects", href: "/dashboard/user/projects", icon: FileText },
        { name: "Settings", href: "/dashboard/user/settings", icon: Settings },
      ];
    }
  };

  if (loading) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 flex-col bg-white border-r border-slate-200 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            KairoDocs
          </h1>
        </div>
        
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            {role} Panel
          </p>
          <nav className="space-y-1">
            {getNavLinks().map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 px-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {announcement?.active && (
          <div 
            className="w-full shrink-0 overflow-hidden py-2 px-4 shadow-sm z-10 flex items-center gap-4"
            style={{ 
              backgroundColor: announcement.bgColor, 
              color: announcement.color,
              fontWeight: announcement.isBold ? "bold" : "normal",
              fontStyle: announcement.isItalic ? "italic" : "normal",
              textDecoration: announcement.isUnderline ? "underline" : "none"
            }}
          >
            <Megaphone className="h-4 w-4 shrink-0" style={{ color: announcement.color }} />
            <div className="flex-1 overflow-hidden">
               <div 
                  className="whitespace-nowrap"
                  style={{ animation: `marquee ${announcement.speed || 50}s linear infinite` }}
               >
                 {announcement.text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {announcement.text} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {announcement.text}
               </div>
            </div>
            {/* Inject minimal keyframes */}
            <style dangerouslySetInnerHTML={{__html: `
               @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
            `}} />
          </div>
        )}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
