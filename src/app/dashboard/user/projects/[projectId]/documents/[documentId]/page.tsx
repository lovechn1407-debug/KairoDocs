"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState, useRef, useMemo } from "react";
import { database } from "@/lib/firebase";
import { ref, get, update } from "firebase/database";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit3, Save, AlertTriangle, Send } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

export default function DocumentEditor() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const documentId = params.documentId as string;

  const [document, setDoc] = useState<any>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<any>(null);

  const editorConfig = useMemo(() => ({
    readonly: false,
    height: 600,
    allowResizeY: true,
    table: {
      splitBlockOnInsertTable: false,
    },
  }), []);

  useEffect(() => {
    if (!documentId) return;
    const fetchDoc = async () => {
      const snap = await get(ref(database, `submissions/${documentId}`));
      if (snap.exists()) {
        const data = snap.val();
        setDoc(data);
        setContent(data.documentContent || "");
      }
      setLoading(false);
    };
    fetchDoc();
  }, [documentId]);

  const handleSaveAndResubmit = async () => {
    if (!content.trim()) return alert("Document is empty!");
    setSaving(true);
    try {
      await update(ref(database, `submissions/${documentId}`), {
        documentContent: content,
        status: "Pending", // Mark it back to pending
        updatedAt: new Date().toISOString()
      });
      alert("Document resubmitted successfully! It is now Pending review.");
      router.push(`/dashboard/user/projects/${projectId}`);
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!content.trim()) return alert("Document is empty!");
    setSaving(true);
    try {
      await update(ref(database, `submissions/${documentId}`), {
        documentContent: content,
        updatedAt: new Date().toISOString()
      });
      alert("Draft saved!");
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  }


  if (loading) return (
    <ProtectedRoute allowedRoles={["user"]}>
      <div className="p-8 max-w-5xl mx-auto flex justify-center items-center h-64">
        <div className="animate-pulse flex items-center gap-2 text-slate-400">
           Loading document...
        </div>
      </div>
    </ProtectedRoute>
  );

  if (!document) return (
    <ProtectedRoute allowedRoles={["user"]}>
      <div className="p-8 max-w-5xl mx-auto text-center">
        <h2 className="text-xl font-semibold text-slate-800">Document not found</h2>
        <Link href={`/dashboard/user/projects/${projectId}`} className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Project
        </Link>
      </div>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <div className="flex flex-col h-screen bg-slate-50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-6">
            <Link href={`/dashboard/user/projects/${projectId}`} className="text-slate-400 hover:text-slate-600 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {document.projectName || "Document"} 
                <span className="text-slate-300 font-normal">/</span> 
                {document.templateName || "Unknown Template"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Status: {document.status}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition shadow-sm"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
            <button
              onClick={handleSaveAndResubmit}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              <Send className="h-4 w-4" />
              {saving ? "Processing..." : "Resubmit"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl flex flex-col gap-6 mx-auto">
            
            {/* Feedback Alert */}
            {document.status === "Needs Edit" && document.feedback && (
              <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-xl shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-orange-800">Action Required: Department Head Feedback</h3>
                    <div className="mt-1.5 text-sm text-orange-700/90 whitespace-pre-wrap leading-relaxed">
                      {document.feedback}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Warning for approved docs */}
            {document.status === "Approved" && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-green-800 text-sm font-medium text-center shadow-sm">
                    This document has been Approved. Editing it here and resubmitting will change its status back to Pending.
                </div>
            )}

            {/* Editor */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden min-h-[600px] mb-8">
              <JoditEditor
                ref={editorRef}
                value={content}
                config={editorConfig}
                onBlur={val => setContent(val)}
                onChange={() => {}}
              />
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
