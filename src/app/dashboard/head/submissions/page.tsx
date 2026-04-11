"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState, useRef } from "react";
import { database } from "@/lib/firebase";
import { ref, get, update } from "firebase/database";
import { CheckCircle, XCircle, FileText, X, Edit3, History, ChevronDown, ChevronRight, ChevronUp, Folder, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

export default function HeadSubmissions() {
  const [groupedProjects, setGroupedProjects] = useState<any[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [acting, setActing] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadDocx = async (contentHtml: string, fileName: string, templateName: string) => {
    setIsDownloading(true);
    try {
      const res = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: contentHtml, documentName: fileName, templateName }),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\s+/g, '_')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("DOCX Download Error: " + e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const fetchSubs = async () => {
    setLoading(true);
    const snap = await get(ref(database, "submissions"));
    if (snap.exists()) {
      const rawSubs = Object.values(snap.val()) as any[];
      
      const projectMap: Record<string, any> = {};
      rawSubs.forEach(sub => {
        if (!projectMap[sub.projectId]) {
          projectMap[sub.projectId] = {
            id: sub.projectId,
            projectName: sub.projectName,
            userEmail: sub.userEmail,
            totalDocs: 0,
            approvedDocs: 0,
            pendingDocs: 0,
            rejectedDocs: 0,
            needsEditDocs: 0,
            createdAt: sub.createdAt,
            documents: []
          };
        }
        projectMap[sub.projectId].documents.push(sub);
        projectMap[sub.projectId].totalDocs += 1;
        if (sub.status === "Approved") projectMap[sub.projectId].approvedDocs += 1;
        else if (sub.status === "Pending") projectMap[sub.projectId].pendingDocs += 1;
        else if (sub.status === "Rejected") projectMap[sub.projectId].rejectedDocs += 1;
        else if (sub.status === "Needs Edit") projectMap[sub.projectId].needsEditDocs += 1;
      });

      const sortedProjects = Object.values(projectMap).sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      sortedProjects.forEach(proj => {
        proj.documents.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      setGroupedProjects(sortedProjects);
    } else {
      setGroupedProjects([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const toggleProject = (pid: string) => {
    const next = new Set(expandedProjects);
    if (next.has(pid)) next.delete(pid);
    else next.add(pid);
    setExpandedProjects(next);
  };

  const handleAction = async (subId: string, newStatus: string, finalFeedback?: string) => {
    setActing(true);
    try {
      const updates: any = { status: newStatus };
      if (finalFeedback !== undefined) {
        updates.feedback = finalFeedback;
      }
      
      // Reflect the head's decision on the specific version snapshot that was reviewed
      if (selectedSub?.versions && selectedSub.versions.length > 0) {
         const lastIndex = selectedSub.versions.length - 1;
         updates[`versions/${lastIndex}/status`] = newStatus;
         if (finalFeedback !== undefined) {
            updates[`versions/${lastIndex}/feedback`] = finalFeedback;
         }
      }

      await update(ref(database, `submissions/${subId}`), updates);

      // ── Auto-ingest into Pinecone as a Precedent when approved ──────────
      if (newStatus === "Approved" && selectedSub?.content) {
        // Fire-and-forget: don't await so approval is instant even if ingest is slow
        fetch("/api/ingest-approved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentContent: selectedSub.content,
            projectName: selectedSub.projectName ?? "Approved Document",
            templateName: selectedSub.templateName ?? "",
            submissionId: subId,
            userEmail: selectedSub.userEmail ?? "",
          }),
        }).then(r => r.json()).then(d => {
          console.log("[AutoIngest]", d.message ?? d.error);
        }).catch(e => {
          console.warn("[AutoIngest] Failed (non-fatal):", e.message);
        });
      }

      alert(`Document marked as ${newStatus}`);
      setSelectedSub(null);
      setFeedbackText("");
      setShowFeedbackInput(false);
      await fetchSubs();
    } catch(e) {
      alert("Error updating status");
    } finally {
      setActing(false);
    }
  }

  const getBadge = (status: string) => {
    if (status === "Approved") return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">Approved</span>;
    if (status === "Rejected") return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-semibold">Rejected</span>;
    if (status === "Needs Edit") return <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-semibold">Needs Edit</span>;
    return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-semibold">Pending</span>;
  }

  return (
    <ProtectedRoute allowedRoles={["head"]}>
      <div className="p-8 max-w-6xl mx-auto space-y-8 flex-1">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Department Submissions</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review, approve, or reject user incubation documents organized by project.</p>
        </header>

        {loading ? (
          <div className="animate-pulse space-y-4">
             <div className="h-20 bg-slate-200 rounded-xl w-full"></div>
             <div className="h-20 bg-slate-200 rounded-xl w-full"></div>
          </div>
        ) : groupedProjects.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-lg">No submissions found in this department.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedProjects.map((proj) => {
              const isExpanded = expandedProjects.has(proj.id);
              return (
                <div key={proj.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
                  
                  {/* Accordion Header */}
                  <div 
                    onClick={() => toggleProject(proj.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-4">
                       <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                         <Folder className="h-7 w-7" />
                       </div>
                       <div>
                         <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">{proj.projectName}</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400">Submitted by: <span className="font-medium text-slate-700 dark:text-slate-300">{proj.userEmail}</span></p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                       <div className="hidden md:flex items-center gap-2 mr-2">
                         {proj.pendingDocs > 0 && (
                           <div className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                              {proj.pendingDocs} Pending
                           </div>
                         )}
                         {proj.needsEditDocs > 0 && (
                           <div className="bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                              {proj.needsEditDocs} Re-edit
                           </div>
                         )}
                         {proj.rejectedDocs > 0 && (
                           <div className="bg-red-100 text-red-800 border border-red-200 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                              {proj.rejectedDocs} Rejected
                           </div>
                         )}
                       </div>

                       <div className="text-center pl-4 md:border-l border-slate-200 dark:border-slate-800">
                         <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{proj.totalDocs}</p>
                         <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide">Total Docs</p>
                       </div>
                       <div className="text-center px-4 border-l border-slate-200 dark:border-slate-800">
                         <p className="text-2xl font-bold text-green-600 dark:text-green-400">{proj.approvedDocs}</p>
                         <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wide opacity-80">Approved</p>
                       </div>
                       <div className="ml-2 text-slate-400 dark:text-slate-500">
                         {isExpanded ? <ChevronUp className="h-6 w-6"/> : <ChevronDown className="h-6 w-6"/>}
                       </div>
                    </div>
                  </div>

                  {/* Expanded Table */}
                  <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      key="content"
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                      variants={{
                        open: { opacity: 1, height: "auto" },
                        collapsed: { opacity: 0, height: 0 }
                      }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden bg-slate-50 dark:bg-[#0a0a0a] border-t border-slate-100 dark:border-slate-800/50"
                    >
                      <div className="p-4">
                        <table className="w-full text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              <th className="p-3 font-semibold">Document Name</th>
                              <th className="p-3 font-semibold">Template</th>
                              <th className="p-3 font-semibold">Date Submitted</th>
                              <th className="p-3 font-semibold">Status</th>
                              <th className="p-3 font-semibold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {proj.documents.map((sub: any, idx: number) => (
                              <tr key={sub.id} className={`${idx !== proj.documents.length - 1 ? "border-b border-slate-100 dark:border-slate-800/50" : ""} hover:bg-slate-50 dark:hover:bg-slate-800 transition`}>
                                <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{sub.documentName || `Document ${idx+1}`}</td>
                                <td className="p-3 text-slate-600 dark:text-slate-300 text-sm">{sub.templateName}</td>
                                <td className="p-3 text-slate-500 dark:text-slate-400 text-sm">{new Date(sub.createdAt).toLocaleDateString()}</td>
                                <td className="p-3">{getBadge(sub.status)}</td>
                                <td className="p-3 text-right">
                                  <button 
                                    onClick={() => setSelectedSub(sub)}
                                    className="bg-white dark:bg-slate-900 border border-slate-300 text-slate-700 dark:text-slate-300 font-medium text-sm px-4 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 focus:ring-2 focus:ring-slate-200 transition"
                                  >
                                    Review
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for Review */}
        <AnimatePresence>
          {selectedSub && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
              >
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-2xl">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                       <FileText className="h-5 w-5 text-indigo-500" />
                       Reviewing: {selectedSub.documentName || selectedSub.templateName}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Project: {selectedSub.projectName} • Submitted on {new Date(selectedSub.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDownloadDocx(selectedSub.documentContent, selectedSub.documentName || "Document", selectedSub.templateName || "Template")}
                      disabled={isDownloading}
                      className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {isDownloading ? "Generating..." : "Download DOCX"}
                    </button>
                    <button onClick={() => {
                      setSelectedSub(null);
                      setShowFeedbackInput(false);
                      setFeedbackText("");
                    }} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 bg-slate-100 p-2 rounded-full transition">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-[#0a0a0a] space-y-6">
                   <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden pointer-events-none shadow-sm min-h-[500px]">
                     {/* Readonly editor to see the exact document output safely */}
                     <JoditEditor
                        value={selectedSub.documentContent}
                        config={{ readonly: true, toolbar: false, height: 500 }}
                        onBlur={()=>{}} onChange={()=>{}}
                     />
                   </div>

                   {/* Version History */}
                   {selectedSub.versions && selectedSub.versions.length > 0 && (
                     <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                       <button 
                         onClick={() => setShowHistory(!showHistory)}
                         className="flex items-center justify-between w-full p-4 bg-slate-50 dark:bg-[#0a0a0a] hover:bg-slate-100 transition"
                       >
                         <div className="flex items-center gap-2">
                           <History className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                           <span className="font-semibold text-slate-700 dark:text-slate-300">Version History ({selectedSub.versions.length})</span>
                         </div>
                         {showHistory ? <ChevronDown className="h-5 w-5 text-slate-400 dark:text-slate-500"/> : <ChevronRight className="h-5 w-5 text-slate-400 dark:text-slate-500"/>}
                       </button>
                       {showHistory && (
                         <div className="p-4 space-y-4 border-t border-slate-200 dark:border-slate-800">
                           {selectedSub.versions.map((ver: any, i: number) => (
                             <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50 dark:bg-[#0a0a0a]">
                               <div className="flex justify-between items-center mb-2">
                                 <h4 className="font-semibold text-slate-800">
                                    Version {i + 1} {i === selectedSub.versions.length - 1 && <span className="text-blue-600 dark:text-blue-400 font-bold ml-1">(Current)</span>}
                                 </h4>
                                 <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(ver.savedAt).toLocaleString()}</span>
                               </div>
                               <div className="mb-3 text-xs font-medium bg-slate-200 text-slate-700 dark:text-slate-300 inline-block px-2 py-0.5 rounded">
                                 Status: {ver.status}
                               </div>
                               {ver.feedback && (
                                 <div className="text-sm bg-orange-50 text-orange-800 p-2.5 rounded mb-3 border border-orange-100">
                                   <strong>Feedback Given:</strong> {ver.feedback}
                                 </div>
                               )}
                               <details>
                                 <summary className="text-sm text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline mb-2 pointer-events-auto">View Document Content</summary>
                                 <div 
                                   className="prose prose-sm max-w-none bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded mt-2 max-h-64 overflow-y-auto pointer-events-none"
                                   dangerouslySetInnerHTML={{ __html: ver.documentContent || ver.content || "<i>No content safely recorded</i>" }}
                                 />
                               </details>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   )}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl">
                  {showFeedbackInput ? (
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reason for Re-edit (Feedback)</label>
                      <textarea
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                        placeholder="Please modify the financial terms correctly..."
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                      />
                      <div className="flex justify-end gap-3">
                        <button 
                          disabled={acting}
                          onClick={() => { setShowFeedbackInput(false); setFeedbackText(""); }}
                          className="px-5 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button 
                          disabled={acting || !feedbackText.trim()}
                          onClick={() => handleAction(selectedSub.id, "Needs Edit", feedbackText.trim())}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition"
                        >
                           Send Feedback
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-4">
                      {selectedSub.status !== "Rejected" && (
                        <button 
                          disabled={acting}
                          onClick={() => handleAction(selectedSub.id, "Rejected", "")}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-red-700 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 disabled:opacity-50 transition"
                        >
                          <XCircle className="h-5 w-5"/> Reject
                        </button>
                      )}
                      
                      {selectedSub.status !== "Needs Edit" && selectedSub.status !== "Approved" && (
                        <button 
                          disabled={acting}
                          onClick={() => setShowFeedbackInput(true)}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 transition"
                        >
                          <Edit3 className="h-5 w-5"/> Suggest Re-edit
                        </button>
                      )}

                      {selectedSub.status !== "Approved" && (
                        <button 
                          disabled={acting}
                          onClick={() => handleAction(selectedSub.id, "Approved", "")}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition shadow-sm"
                        >
                          <CheckCircle className="h-5 w-5"/> Approve
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </ProtectedRoute>
  );
}
