"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState, useRef, useMemo } from "react";
import { database } from "@/lib/firebase";
import { ref, get, update } from "firebase/database";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit3, Save, AlertTriangle, Send, History, ChevronDown, ChevronRight } from "lucide-react";
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
  const [showHistory, setShowHistory] = useState(false);
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
      // Create version snapshot of the newly edited state
      const newVersion = {
        documentContent: content,
        status: "Pending",
        savedAt: new Date().toISOString()
      };
      
      const versions = [...(document.versions || []), newVersion];

      await update(ref(database, `submissions/${documentId}`), {
        documentContent: content,
        status: "Pending", // Mark it back to pending
        feedback: null, // Clear the old feedback
        versions: versions,
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

            {/* Version History */}
            {document.versions && document.versions.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-slate-500" />
                    <span className="font-semibold text-slate-700">Version History ({document.versions.length})</span>
                  </div>
                  {showHistory ? <ChevronDown className="h-5 w-5 text-slate-400"/> : <ChevronRight className="h-5 w-5 text-slate-400"/>}
                </button>
                {showHistory && (
                  <div className="p-4 space-y-4 border-t border-slate-200">
                    {document.versions.map((ver: any, i: number) => (
                      <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="font-semibold text-slate-800">
                             Version {i + 1} {i === document.versions.length - 1 && <span className="text-blue-600 font-bold ml-1">(Current)</span>}
                           </h4>
                           <span className="text-xs text-slate-500">{new Date(ver.savedAt).toLocaleString()}</span>
                        </div>
                        <div className="mb-3 text-xs font-medium bg-slate-200 text-slate-700 inline-block px-2 py-0.5 rounded">
                          Status: {ver.status}
                        </div>
                        {ver.feedback && (
                          <div className="text-sm bg-orange-50 text-orange-800 p-2.5 rounded mb-3 border border-orange-100">
                            <strong>Feedback Required:</strong> {ver.feedback}
                          </div>
                        )}
                        <details>
                          <summary className="text-sm text-blue-600 font-medium cursor-pointer hover:underline mb-2">View Document Content</summary>
                          <div 
                            className="prose prose-sm max-w-none bg-white p-4 border border-slate-200 rounded mt-2 max-h-64 overflow-y-auto"
                            dangerouslySetInnerHTML={{ __html: ver.documentContent || ver.content || "<i>No content safely recorded</i>" }}
                          />
                        </details>
                      </div>
                    ))}
                  </div>
                )}
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
