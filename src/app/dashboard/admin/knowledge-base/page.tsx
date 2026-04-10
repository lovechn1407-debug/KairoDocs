"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useState, useEffect } from "react";
import { ArrowLeft, Database } from "lucide-react";
import Link from "next/link";
import { database } from "@/lib/firebase";
import { ref, push, set, get, remove } from "firebase/database";

export default function KnowledgeBase() {
  // RAG Upload States
  const [ragType, setRagType] = useState("precedent"); // default to precedent now that templates are gone
  const [ragCategory, setRagCategory] = useState("MOU");
  const [ragTitle, setRagTitle] = useState("");
  const [ragText, setRagText] = useState("");
  const [ragTags, setRagTags] = useState("mou, legal");
  const [ragVersion, setRagVersion] = useState("1.0");
  const [ragDate, setRagDate] = useState(new Date().toISOString().split('T')[0]);
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [vectorStatus, setVectorStatus] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [pdfInfo, setPdfInfo] = useState<{ name: string; pages: number; chars: number } | null>(null);
  
  // RAG Knowledge Viewer states
  const [ragKnowledge, setRagKnowledge] = useState<any[]>([]);
  const [totalVectors, setTotalVectors] = useState(0);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const fetchKnowledge = async () => {
    setLoadingKnowledge(true);
    try {
      const snap = await get(ref(database, "ragKnowledge"));
      if (snap.exists()) {
        const entries = (Object.values(snap.val()) as any[]).sort((a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
        setRagKnowledge(entries);
      } else {
        setRagKnowledge([]);
      }

      try {
        const res = await fetch('/api/admin/vectors');
        const data = await res.json();
        if (data.success) setTotalVectors(data.totalVectors);
      } catch {
        // Ignore vector count failure
      }
    } catch (e) {
      console.warn('Failed to fetch knowledge:', e);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const handleDeleteKnowledge = async (entry: any) => {
    if (!confirm(`Delete "${entry.title}" from Pinecone and registry?`)) return;
    try {
      await remove(ref(database, `ragKnowledge/${entry.id}`));
      setRagKnowledge(prev => prev.filter(e => e.id !== entry.id));

      if (entry.vectorIds?.length > 0) {
        fetch('/api/admin/vectors', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registryId: entry.id, vectorIds: entry.vectorIds }),
        }).catch(e => console.warn('Pinecone delete failed:', e.message));
      }
    } catch (e) {
      alert('Delete failed.');
    }
  };

  const handleResetKnowledge = async () => {
    if (!confirm('⚠️ This will permanently delete ALL vectors from Pinecone and clear the entire registry. This cannot be undone. Continue?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset-knowledge', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRagKnowledge([]);
        setTotalVectors(0);
        alert('✅ Pinecone index and registry fully cleared.');
      } else {
        alert('Reset failed: ' + data.error);
      }
    } catch (e) {
      alert('Reset failed.');
    } finally {
      setIsResetting(false);
    }
  };

  const PRECEDENT_CATEGORIES: Record<string, { label: string; autoTags: string; placeholder: string }> = {
    "MOU":      { label: "MOU Documents",              autoTags: "mou, legal, precedent",           placeholder: "Paste text from a previously approved MOU..." },
    "Invoice":  { label: "Invoice Documents",          autoTags: "invoice, billing, precedent",     placeholder: "Paste text from a previously approved invoice..." },
    "Purchase Order": { label: "Purchase Orders",      autoTags: "purchase-order, precedent",       placeholder: "Paste text from an approved purchase order..." },
    "General": { label: "General Reference Document",  autoTags: "reference, precedent",            placeholder: "Paste any approved reference document text here..." },
  };

  const handleCategoryChange = (cat: string) => {
    setRagCategory(cat);
    const catData = PRECEDENT_CATEGORIES[cat];
    if (catData) setRagTags(catData.autoTags);
  };

  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    setIsParsing(true);
    setPdfInfo(null);
    try {
      const fd = new FormData();
      fd.append('pdf', file);
      const res = await fetch('/api/admin/parse-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRagText(data.text);
      setPdfInfo({ name: data.fileName, pages: data.pages, chars: data.charCount });
      if (!ragTitle.trim()) {
        setRagTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
      }
    } catch (e: any) {
      alert('PDF parse failed: ' + e.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleVectorize = async () => {
    if (!ragTitle.trim() || !ragText.trim()) return alert("Title and Text are required.");
    setIsVectorizing(true);
    setVectorStatus("Processing...");
    try {
      const tags = ragTags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch("/api/admin/vectorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: "precedent", // Hardcoded to precedent since visual templates are removed
          category: ragCategory,
          title: ragTitle, 
          text: ragText,
          tags,
          version: ragVersion,
          effectiveDate: ragDate
        })
      });
      const rawText = await res.text();
      let data: any = {};
      try { data = JSON.parse(rawText); } catch {
        throw new Error(`Server error (${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error ?? `Server returned ${res.status}`);

      if (data.registryEntry) {
        try {
          const registryRef = push(ref(database, "ragKnowledge"));
          await set(registryRef, { ...data.registryEntry, id: registryRef.key });
        } catch (fbErr: any) {
          console.warn("Registry write failed:", fbErr.message);
        }
      }

      setVectorStatus(`✅ ${data.message}`);
      setRagTitle("");
      setRagText("");
      setRagVersion("1.0");
      setPdfInfo(null);
      fetchKnowledge();
      setTimeout(() => setVectorStatus(""), 5000);
    } catch (e: any) {
      alert("Vectorization failed: " + e.message);
      setVectorStatus("");
    } finally {
      setIsVectorizing(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-500" />
              AI Knowledge Base
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload RAG Context</h2>
            <p className="text-slate-500 mb-6 text-sm">
              Paste Legal Precedents, Directives, or Standard Clauses here. The system will encode this text into Pinecone, allowing the AI to dynamically generate structured documents moving forward without rigid templates.
            </p>

            <div className="space-y-6">
              
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Document Category
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {Object.entries(PRECEDENT_CATEGORIES).map(([key]) => (
                    <button
                      key={key}
                      onClick={() => handleCategoryChange(key)}
                      className={`text-center px-3 py-2.5 rounded-lg border text-sm font-medium transition ${
                        ragCategory === key
                          ? "border-indigo-400 bg-indigo-500 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Context Title</label>
                <input 
                  type="text" value={ragTitle} onChange={e => setRagTitle(e.target.value)}
                  placeholder={`e.g. ${ragCategory} Standard Clauses 2026`}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Version</label>
                  <input 
                    type="text" value={ragVersion} onChange={e => setRagVersion(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Effective Date</label>
                  <input 
                    type="date" value={ragDate} onChange={e => setRagDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tags</label>
                  <input 
                    type="text" value={ragTags} onChange={e => setRagTags(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Content Box */}
              <div>
                <label
                  htmlFor="pdf-upload"
                  className={`flex items-center gap-3 w-full border-2 border-dashed rounded-xl px-5 py-4 cursor-pointer transition mb-3 ${
                    isParsing ? 'border-indigo-300 bg-indigo-50' : pdfInfo ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <span className="text-2xl">{isParsing ? '⏳' : pdfInfo ? '✅' : '📎'}</span>
                  <div className="flex-1 min-w-0">
                    {isParsing ? (
                      <p className="text-sm font-medium text-indigo-600">Extracting text from PDF...</p>
                    ) : pdfInfo ? (
                      <>
                        <p className="text-sm font-semibold text-green-700 truncate">{pdfInfo.name}</p>
                        <p className="text-xs text-green-600">{pdfInfo.pages} pages · {pdfInfo.chars.toLocaleString()} characters extracted</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-600">Click to upload PDF</p>
                        <p className="text-xs text-slate-400">Max 10MB · Text will be auto-extracted and editable below</p>
                      </>
                    )}
                  </div>
                  {pdfInfo && (
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); setRagText(''); setPdfInfo(null); }}
                      className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                  )}
                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = ''; }}
                  />
                </label>

                <textarea 
                  value={ragText} onChange={e => setRagText(e.target.value)}
                  rows={8}
                  placeholder={PRECEDENT_CATEGORIES[ragCategory]?.placeholder}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-sm"
                />
              </div>

              <button
                onClick={handleVectorize}
                disabled={isVectorizing}
                className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 transition"
              >
                <Database className="h-5 w-5" />
                {isVectorizing ? "Vectorizing into Pinecone..." : "Embed into Pinecone"}
              </button>
              {vectorStatus && <p className="text-sm mt-2 text-center font-medium text-green-700">{vectorStatus}</p>}
            </div>
          </div>

          <div className="max-w-3xl mx-auto mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-500" />
                <h3 className="font-bold text-slate-800">Stored Knowledge Base</h3>
                {totalVectors > 0 && <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">{totalVectors} vectors</span>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetKnowledge}
                  disabled={isResetting || ragKnowledge.length === 0}
                  className="text-xs font-bold text-red-500 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition"
                >
                  {isResetting ? 'Wiping...' : 'Wipe Pinecone'}
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {ragKnowledge.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No knowledge embedded yet.</div>
              ) : (
                ragKnowledge.map(entry => (
                  <div key={entry.id} className="flex justify-between p-4 hover:bg-slate-50">
                    <div>
                      <div className="flex gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{entry.category || "General"}</span>
                        <h4 className="font-semibold text-slate-800">{entry.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">v{entry.version} • {new Date(entry.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleDeleteKnowledge(entry)} className="text-red-400 hover:text-red-600 px-2">Delete</button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
