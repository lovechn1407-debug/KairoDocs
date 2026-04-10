"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, get, update, remove, push, set } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { Users, Shield, XCircle, Link as LinkIcon, Check, Building2 } from "lucide-react";

export default function AdminDepartments() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [headInviteLink, setHeadInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [userSnap, deptSnap] = await Promise.all([
      get(ref(database, "users")),
      get(ref(database, "departments")),
    ]);
    setUsers(userSnap.exists() ? Object.values(userSnap.val()) : []);
    setDepartments(deptSnap.exists() ? Object.values(deptSnap.val()) : []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const generateHeadInvite = async () => {
    if (!selectedDept) return alert("Please select a department first.");
    setGeneratingLink(true);
    try {
      const userSnap = await get(ref(database, `users/${user?.uid}`));
      const adminName = userSnap.exists() ? userSnap.val().name : "Admin";
      const dept = departments.find(d => d.id === selectedDept);

      const inviteRef = push(ref(database, "invites"));
      const token = inviteRef.key!;
      await set(inviteRef, {
        token,
        role: "head",
        departmentId: dept?.id,
        departmentName: dept?.name,
        createdBy: user?.uid,
        createdByName: adminName,
        createdAt: new Date().toISOString(),
        used: false,
      });
      const baseUrl = window.location.hostname === 'localhost' ? window.location.origin : 'https://kairodocs-nojs.vercel.app';
      const r = "head";
      const dName = dept?.name || "";
      const invName = adminName || "";
      setHeadInviteLink(`${baseUrl}/signup?invite=${token}&role=${r}&deptName=${encodeURIComponent(dName)}&inviter=${encodeURIComponent(invName)}`);
    } catch (e: any) {
      alert("Failed to generate link: " + e.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(headInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const changeRole = async (uid: string, newRole: string) => {
    if (!confirm(`Make this user a ${newRole}?`)) return;
    await update(ref(database, `users/${uid}`), { role: newRole });
    await fetchData();
  };

  const deleteUserRecord = async (uid: string) => {
    if (!confirm("Remove this user record?")) return;
    await remove(ref(database, `users/${uid}`));
    await fetchData();
  };

  const heads = users.filter(u => u.role === "head");
  const standardUsers = users.filter(u => u.role === "user");

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Department Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Assign roles and invite Department Heads.</p>
        </header>

        {/* Generate Head Invite */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-purple-600" /> Generate Head Invite Link
          </h2>

          {departments.length === 0 ? (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              ⚠️ No departments configured yet. Go to <strong>Settings</strong> tab to add departments first.
            </div>
          ) : (
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Select Department *</label>
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="" disabled>-- Choose department for this Head --</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={generateHeadInvite}
                disabled={generatingLink || !selectedDept}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                <LinkIcon className="h-4 w-4" />
                {generatingLink ? "Generating..." : "Generate Link"}
              </button>
            </div>
          )}

          {headInviteLink && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-purple-700 mb-1 uppercase tracking-wide">
                  Head Invite — {departments.find(d => d.id === selectedDept)?.name}
                </p>
                <p className="font-mono text-sm text-purple-900 break-all">{headInviteLink}</p>
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg shadow-sm border border-purple-200 text-sm font-medium hover:bg-purple-50"
              >
                {copied ? <><Check className="h-4 w-4 text-green-600 dark:text-green-400" /> Copied!</> : <><LinkIcon className="h-4 w-4" /> Copy</>}
              </button>
            </div>
          )}
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Heads */}
          <section>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-purple-600" /> Department Heads ({heads.length})
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              {heads.length === 0 ? (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">No heads assigned. Use the invite link above.</div>
              ) : heads.map((h: any) => (
                <div key={h.uid} className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{h.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{h.email}</p>
                    {h.departmentName && (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full mt-1">
                        <Building2 className="h-3 w-3" /> {h.departmentName}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => changeRole(h.uid, "user")} className="text-xs text-blue-600 dark:text-blue-400 px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:bg-blue-900/50">Demote</button>
                    <button onClick={() => deleteUserRecord(h.uid)} className="text-xs text-red-600 dark:text-red-400 p-1.5 rounded bg-red-50 dark:bg-red-900/30 hover:bg-red-100"><XCircle className="h-4 w-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Users */}
          <section>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Registered Users ({standardUsers.length})
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              {standardUsers.length === 0 ? (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">No regular users yet.</div>
              ) : standardUsers.map((u: any) => (
                <div key={u.uid} className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{u.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                    {u.departmentName && (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full mt-1">
                        <Building2 className="h-3 w-3" /> {u.departmentName}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => changeRole(u.uid, "head")} className="text-xs text-purple-700 font-medium bg-purple-50 px-2 py-1 rounded hover:bg-purple-100">→ Head</button>
                    <button onClick={() => deleteUserRecord(u.uid)} className="text-xs text-red-600 dark:text-red-400 p-1.5 rounded bg-red-50 dark:bg-red-900/30 hover:bg-red-100"><XCircle className="h-4 w-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
