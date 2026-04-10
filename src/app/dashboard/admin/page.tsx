"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { motion } from "framer-motion";
import { Settings, FileText, LayoutDashboard, Component } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Admin Control Panel</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Global settings, Knowledge Base management, and announcements.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/50 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
              <Component className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Departments</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage Heads & Groups</p>
          </motion.div>

          <Link href="/dashboard/admin/knowledge-base" passHref>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/50 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer h-full block"
            >
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Knowledge Base</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Pinecone Vector RAG</p>
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/50 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-4">
              <LayoutDashboard className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Announcements</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Global Ticker Settings</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/50 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="w-16 h-16 bg-slate-100 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center mb-4">
              <Settings className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Global Settings</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">System preferences</p>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
