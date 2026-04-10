"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { motion } from "framer-motion";
import { Users, FileText, CheckCircle, Link as LinkIcon, Copy, Check, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, set, push, get } from "firebase/database";
import { useAuth } from "@/context/AuthContext";

export default function HeadDashboard() {
  const { user } = useAuth();
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [headProfile, setHeadProfile] = useState<any>(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, users: 0 });

  useEffect(() => {
    if (!user?.uid) return;
    
    get(ref(database, `users/${user.uid}`)).then(snap => {
      if (snap.exists()) setHeadProfile(snap.val());
    });

    // Fetch dashboard stats
    Promise.all([
      get(ref(database, "submissions")),
      get(ref(database, "users"))
    ]).then(([subsSnap, usersSnap]) => {
      let pending = 0, approved = 0, totalUsers = 0;
      if (subsSnap.exists()) {
        const subs = Object.values(subsSnap.val()) as any[];
        pending = subs.filter(s => s.status === "Pending").length;
        approved = subs.filter(s => s.status === "Approved").length;
      }
      if (usersSnap.exists()) {
        const users = Object.values(usersSnap.val()) as any[];
        totalUsers = users.length;
      }
      setStats({ pending, approved, users: totalUsers });
    });
  }, [user]);

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      // Include head's department info in the invite so invited users inherit it
      const inviteRef = push(ref(database, "invites"));
      const token = inviteRef.key!;
      await set(inviteRef, {
        token,
        role: "user",
        departmentId: headProfile?.departmentId || null,
        departmentName: headProfile?.departmentName || null,
        createdBy: user?.uid,
        createdByName: headProfile?.name || user?.email,
        createdAt: new Date().toISOString(),
        used: false,
      });
      const baseUrl = window.location.hostname === 'localhost' ? window.location.origin : 'https://kairodocs-nojs.vercel.app';
      setInviteLink(`${baseUrl}/signup?invite=${token}`);
    } catch (e: any) {
      alert("Failed to generate link: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ProtectedRoute allowedRoles={["head"]}>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Department Head</h1>
            {headProfile?.departmentName ? (
              <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-purple-500" />
                <span>Managing: <strong className="text-purple-700">{headProfile.departmentName}</strong></span>
              </p>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 mt-1">Review submissions and manage department users.</p>
            )}
          </div>
          <button 
            onClick={handleGenerateLink}
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-60"
          >
            <LinkIcon className="h-4 w-4" />
            {generating ? "Generating..." : "Generate Invite Link"}
          </button>
        </header>

        {inviteLink && (
          <div className="bg-green-50 dark:bg-green-900/30 text-green-800 p-4 rounded-lg flex items-center justify-between border border-green-200">
            <span className="font-mono text-sm max-w-[80%] truncate">{inviteLink}</span>
            <button 
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="text-sm bg-white dark:bg-slate-900 px-3 py-1 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Copy
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/50"
          >
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pending Approvals</h3>
            <p className="text-3xl font-bold mt-2">{stats.pending}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/50"
          >
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Approved Docs</h3>
            <p className="text-3xl font-bold mt-2">{stats.approved}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/50"
          >
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Total Users</h3>
            <p className="text-3xl font-bold mt-2">{stats.users}</p>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
