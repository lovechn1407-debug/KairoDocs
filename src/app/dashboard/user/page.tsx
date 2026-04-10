"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { motion } from "framer-motion";
import { Plus, FileText, Clock, Folder, ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { database } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useAuth } from "@/context/AuthContext";

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ projects: 0, pending: 0, approved: 0 });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [projSnap, subSnap, profileSnap] = await Promise.all([
        get(ref(database, "projects")),
        get(ref(database, "submissions")),
        get(ref(database, `users/${user.uid}`)),
      ]);
      if (profileSnap.exists()) setUserProfile(profileSnap.val());

      let projects = 0, pending = 0, approved = 0;
      let recent: any[] = [];

      if (projSnap.exists()) {
        const all = Object.values(projSnap.val()) as any[];
        const mine = all.filter((p: any) => p.userId === user.uid);
        projects = mine.length;
        recent = mine.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
      }

      if (subSnap.exists()) {
        const allSubs = Object.values(subSnap.val()) as any[];
        const mine = allSubs.filter((s: any) => s.userId === user.uid);
        pending = mine.filter((s: any) => s.status === "Pending").length;
        approved = mine.filter((s: any) => s.status === "Approved").length;
      }

      setStats({ projects, pending, approved });
      setRecentProjects(recent);
    };
    fetchStats();
  }, [user]);

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Welcome back! Here's an overview of your projects.</p>
            {userProfile?.departmentName && (
              <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full">
                <Building2 className="h-3 w-3" />
                Department: {userProfile.departmentName}
              </span>
            )}
          </div>
          <Link href="/dashboard/user/projects">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all">
              <Plus className="h-5 w-5" /> New Project
            </button>
          </Link>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Active Projects", value: stats.projects, icon: Folder, color: "blue" },
            { label: "Pending Reviews", value: stats.pending, icon: Clock, color: "amber" },
            { label: "Approved Documents", value: stats.approved, icon: FileText, color: "green" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/50"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-${stat.color}-50`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</h3>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Projects */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Recent Projects</h2>
            <Link href="/dashboard/user/projects" className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
              <Folder className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No projects yet. Create your first project to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.07 }}
                >
                  <Link href={`/dashboard/user/projects/${project.id}`}>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:shadow-sm flex items-center justify-between group transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Folder className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:text-blue-400">{project.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(project.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
