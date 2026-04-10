"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { database } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Plus, FileText, Clock, CheckCircle, XCircle, Folder } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";

export default function ProjectDetail() {
  const { user } = useAuth();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !projectId) return;

    const fetchData = async () => {
      setLoading(true);
      // Fetch project info
      const projSnap = await get(ref(database, `projects/${projectId}`));
      if (projSnap.exists()) setProject(projSnap.val());

      // Fetch documents belonging to this project
      const docsSnap = await get(ref(database, "submissions"));
      if (docsSnap.exists()) {
        const all = Object.values(docsSnap.val()) as any[];
        const projectDocs = all
          .filter((d: any) => d.projectId === projectId)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDocuments(projectDocs);
      } else {
        setDocuments([]);
      }
      setLoading(false);
    };

    fetchData();
  }, [user, projectId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved": return (
        <span className="flex items-center gap-1 text-xs font-medium bg-green-100 text-green-800 px-2.5 py-1 rounded-full">
          <CheckCircle className="h-3 w-3" /> Approved
        </span>
      );
      case "Rejected": return (
        <span className="flex items-center gap-1 text-xs font-medium bg-red-100 text-red-800 px-2.5 py-1 rounded-full">
          <XCircle className="h-3 w-3" /> Rejected
        </span>
      );
      default: return (
        <span className="flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
          <Clock className="h-3 w-3" /> Pending
        </span>
      );
    }
  };

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Back + Header */}
        <div>
          <Link href="/dashboard/user/projects" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm mb-6 w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Link>

          {loading ? (
            <div className="h-12 w-64 bg-slate-200 animate-pulse rounded-lg" />
          ) : project ? (
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Folder className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
                  {project.description && (
                    <p className="text-slate-500 mt-1">{project.description}</p>
                  )}
                </div>
              </div>
              <Link href={`/dashboard/user/projects/${projectId}/documents/new`}>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all">
                  <Plus className="h-5 w-5" /> Add Document
                </button>
              </Link>
            </div>
          ) : (
            <p className="text-red-500">Project not found.</p>
          )}
        </div>

        {/* Stats Bar */}
        {!loading && project && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Documents", value: documents.length, color: "blue" },
              { label: "Approved", value: documents.filter(d => d.status === "Approved").length, color: "green" },
              { label: "Pending", value: documents.filter(d => d.status === "Pending").length, color: "amber" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
              >
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Documents List */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Documents</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-xl" />)}
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Documents Yet</h3>
              <p className="text-slate-400 mt-2 mb-6 text-sm">Upload your first document to this project for AI processing.</p>
              <Link href={`/dashboard/user/projects/${projectId}/documents/new`}>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium text-sm">
                  Add First Document
                </button>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {documents.map((doc, idx) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{doc.documentName || doc.templateName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Template: {doc.templateName} · {new Date(doc.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(doc.status)}
                    <button className="text-sm text-blue-600 font-medium hover:underline">View</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
