"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, get, push, set, remove } from "firebase/database";
import { Plus, Trash2, Building2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminSettings() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchDepts = async () => {
    setLoading(true);
    const snap = await get(ref(database, "departments"));
    if (snap.exists()) {
      setDepartments(Object.values(snap.val()));
    } else {
      setDepartments([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDepts(); }, []);

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setAdding(true);
    try {
      const deptRef = push(ref(database, "departments"));
      await set(deptRef, {
        id: deptRef.key,
        name: newDeptName.trim(),
        description: newDeptDesc.trim(),
        createdAt: new Date().toISOString(),
      });
      setNewDeptName("");
      setNewDeptDesc("");
      await fetchDepts();
    } catch (e: any) {
      alert("Failed to add department: " + e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    try {
      await remove(ref(database, `departments/${id}`));
      await fetchDepts();
    } catch (e: any) {
      alert("Failed to delete: " + e.message);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500 mt-1">Configure departments and global platform settings.</p>
        </header>

        {/* Department Manager */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-slate-100">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Departments</h2>
              <p className="text-sm text-slate-500">These will appear as options when assigning roles via invite links.</p>
            </div>
          </div>

          {/* Add Form */}
          <form onSubmit={handleAddDept} className="p-6 border-b border-slate-100 bg-slate-50">
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  placeholder="Department name (e.g. Engineering, Finance, Legal...)"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={newDeptDesc}
                  onChange={e => setNewDeptDesc(e.target.value)}
                  placeholder="Short description (optional)"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60 shrink-0"
              >
                <Plus className="h-4 w-4" />
                {adding ? "Adding..." : "Add"}
              </button>
            </div>
          </form>

          {/* Department List */}
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg" />)}
            </div>
          ) : departments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No departments added yet. Add your first one above.
            </div>
          ) : (
            <AnimatePresence>
              {departments.map((dept, idx) => (
                <motion.div
                  key={dept.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {dept.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{dept.name}</p>
                      {dept.description && <p className="text-xs text-slate-400">{dept.description}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
