"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState, useRef } from "react";
import { database } from "@/lib/firebase";
import { ref, get, update } from "firebase/database";
import { CheckCircle, XCircle, FileText, X, Edit3, History, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

export default function HeadSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [acting, setActing] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchSubs = async () => {
    setLoading(true);
    const snap = await get(ref(database, "submissions"));
    if (snap.exists()) {
      const sorted = Object.values(snap.val()).sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSubmissions(sorted);
    } else {
      setSubmissions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const handleAction = async (subId: string, newStatus: string, finalFeedback?: string) => {
    setActing(true);
    try {
      const updates: any = { status: newStatus };
      if (finalFeedback !== undefined) {
        updates.feedback = finalFeedback;
      }
      
      await update(ref(database, `submissions/${subId}`), updates);
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
          <h1 className="text-3xl font-bold text-slate-900">Department Submissions</h1>
          <p className="text-slate-500 mt-1">Review, approve, or reject user incubation documents.</p>
        </header>

        {loading ? (
          <div className="animate-pulse space-y-4">
             <div className="h-16 bg-slate-200 rounded-xl w-full"></div>
             <div className="h-16 bg-slate-200 rounded-xl w-full"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">No submissions found in this department.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                  <th className="p-4 font-semibold">Project Name</th>
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Template</th>
                  <th className="p-4 font-semibold">Date Submitted</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{sub.projectName}</td>
                    <td className="p-4 text-slate-600 text-sm">{sub.userEmail}</td>
                    <td className="p-4 text-slate-600 text-sm">{sub.templateName}</td>
                    <td className="p-4 text-slate-500 text-sm">{new Date(sub.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">{getBadge(sub.status)}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedSub(sub)}
                        className="text-blue-600 font-medium text-sm hover:underline"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
              >
                <div className="flex justify-between items-center p-6 border-b border-slate-200">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Reviewing: {selectedSub.projectName}</h2>
                    <p className="text-sm text-slate-500">Submitted by {selectedSub.userEmail} on {new Date(selectedSub.createdAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => {
                    setSelectedSub(null);
                    setShowFeedbackInput(false);
                    setFeedbackText("");
                  }} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-auto p-6 bg-slate-50 space-y-6">
                   <div className="rounded-xl border border-slate-200 bg-white overflow-hidden pointer-events-none">
                     {/* Readonly editor to see the exact document output safely */}
                     <JoditEditor
                        value={selectedSub.documentContent}
                        config={{ readonly: true, toolbar: false, height: 500 }}
                        onBlur={()=>{}} onChange={()=>{}}
                     />
                   </div>

                   {/* Version History */}
                   {selectedSub.versions && selectedSub.versions.length > 0 && (
                     <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                       <button 
                         onClick={() => setShowHistory(!showHistory)}
                         className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 transition"
                       >
                         <div className="flex items-center gap-2">
                           <History className="h-5 w-5 text-slate-500" />
                           <span className="font-semibold text-slate-700">Version History ({selectedSub.versions.length})</span>
                         </div>
                         {showHistory ? <ChevronDown className="h-5 w-5 text-slate-400"/> : <ChevronRight className="h-5 w-5 text-slate-400"/>}
                       </button>
                       {showHistory && (
                         <div className="p-4 space-y-4 border-t border-slate-200">
                           {selectedSub.versions.map((ver: any, i: number) => (
                             <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                               <div className="flex justify-between items-center mb-2">
                                 <h4 className="font-semibold text-slate-800">Version {i + 1}</h4>
                                 <span className="text-xs text-slate-500">{new Date(ver.savedAt).toLocaleString()}</span>
                               </div>
                               <div className="mb-3 text-xs font-medium bg-slate-200 text-slate-700 inline-block px-2 py-0.5 rounded">
                                 Status: {ver.status}
                               </div>
                               {ver.feedback && (
                                 <div className="text-sm bg-orange-50 text-orange-800 p-2.5 rounded mb-3 border border-orange-100">
                                   <strong>Feedback Given:</strong> {ver.feedback}
                                 </div>
                               )}
                               <details>
                                 <summary className="text-sm text-blue-600 font-medium cursor-pointer hover:underline mb-2 pointer-events-auto">View Document Content</summary>
                                 <div 
                                   className="prose prose-sm max-w-none bg-white p-4 border border-slate-200 rounded mt-2 max-h-64 overflow-y-auto pointer-events-none"
                                   dangerouslySetInnerHTML={{ __html: ver.documentContent }}
                                 />
                               </details>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   )}
                </div>

                <div className="p-6 border-t border-slate-200 bg-white rounded-b-2xl">
                  {showFeedbackInput ? (
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-slate-700">Reason for Re-edit (Feedback)</label>
                      <textarea
                        value={feedbackText}
                        onChange={e => setFeedbackText(e.target.value)}
                        placeholder="Please modify the financial terms correctly..."
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="flex justify-end gap-3">
                        <button 
                          disabled={acting}
                          onClick={() => { setShowFeedbackInput(false); setFeedbackText(""); }}
                          className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button 
                          disabled={acting || !feedbackText.trim()}
                          onClick={() => handleAction(selectedSub.id, "Needs Edit", feedbackText.trim())}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
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
                          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle className="h-5 w-5"/> Reject Document
                        </button>
                      )}
                      
                      {selectedSub.status !== "Needs Edit" && selectedSub.status !== "Approved" && (
                        <button 
                          disabled={acting}
                          onClick={() => setShowFeedbackInput(true)}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50"
                        >
                          <Edit3 className="h-5 w-5"/> Suggest Re-edit
                        </button>
                      )}

                      {selectedSub.status !== "Approved" && (
                        <button 
                          disabled={acting}
                          onClick={() => handleAction(selectedSub.id, "Approved", "")}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-5 w-5"/> Approve Document
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
