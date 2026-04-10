"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useRef, useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Save, ArrowLeft, GripVertical, Plus, Table2, Type, Image as ImageIcon, Hash, Trash2, ChevronDown, ChevronRight, FileText, Eye, Database } from "lucide-react";
import Link from "next/link";
import { database } from "@/lib/firebase";
import { ref, push, set, get, remove } from "firebase/database";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

// ─── Variable Categories ───────────────────────────────────────────────────
const VARIABLE_GROUPS = [
  {
    id: "identity",
    label: "👤 Party Information",
    color: "blue",
    vars: [
      { name: "User Full Name",       tag: "{{USER_NAME}}" },
      { name: "User Phone",           tag: "{{USER_PHONE}}" },
      { name: "User Email",           tag: "{{USER_EMAIL}}" },
      { name: "Company Name",         tag: "{{COMPANY_NAME}}" },
      { name: "Company Address",      tag: "{{COMPANY_ADDRESS}}" },
      { name: "Party A Name",         tag: "{{PARTY_A}}" },
      { name: "Party B Name",         tag: "{{PARTY_B}}" },
    ],
  },
  {
    id: "document",
    label: "📄 Document Details",
    color: "indigo",
    vars: [
      { name: "Current Date",         tag: "{{DATE}}" },
      { name: "Effective Date",       tag: "{{EFFECTIVE_DATE}}" },
      { name: "Expiry Date",          tag: "{{EXPIRY_DATE}}" },
      { name: "Project Title",        tag: "{{PROJECT_TITLE}}" },
      { name: "Reference Number",     tag: "{{REF_NUMBER}}" },
      { name: "Agreement Type",       tag: "{{AGREEMENT_TYPE}}" },
      { name: "Document Purpose",     tag: "{{PURPOSE}}" },
    ],
  },
  {
    id: "financial",
    label: "💰 Financial",
    color: "green",
    vars: [
      { name: "Total Amount",         tag: "{{TOTAL_AMOUNT}}" },
      { name: "Amount in Words",      tag: "{{AMOUNT_IN_WORDS}}" },
      { name: "GST Number",           tag: "{{GST_NUMBER}}" },
      { name: "PAN Number",           tag: "{{PAN_NUMBER}}" },
      { name: "Invoice Number",       tag: "{{INVOICE_NUMBER}}" },
      { name: "Due Date",             tag: "{{DUE_DATE}}" },
      { name: "Payment Terms",        tag: "{{PAYMENT_TERMS}}" },
    ],
  },
  {
    id: "ai",
    label: "🤖 AI Generated",
    color: "purple",
    vars: [
      { name: "AI Summary",           tag: "{{AI_SUMMARY}}" },
      { name: "AI Key Points",        tag: "{{AI_KEY_POINTS}}" },
      { name: "Scope of Work",        tag: "{{SCOPE_OF_WORK}}" },
    ],
  },
  {
    id: "tables",
    label: "📊 Dynamic Tables",
    color: "amber",
    vars: [
      { name: "Products / Items Table",   tag: "{{TABLE:ITEMS}}" },
      { name: "Services Table",           tag: "{{TABLE:SERVICES}}" },
      { name: "Milestones Table",         tag: "{{TABLE:MILESTONES}}" },
      { name: "Contacts Table",           tag: "{{TABLE:CONTACTS}}" },
    ],
  },
];

// Color maps for Tailwind (must be hardcoded to avoid purging)
const colorMap: Record<string, { bg: string; border: string; text: string; pill: string }> = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/30",   border: "border-blue-200",   text: "text-blue-700 dark:text-blue-400",   pill: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", pill: "bg-indigo-100 text-indigo-700" },
  green:  { bg: "bg-green-50 dark:bg-green-900/30",  border: "border-green-200",  text: "text-green-700",  pill: "bg-green-100 text-green-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", pill: "bg-purple-100 text-purple-700" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-900/30",  border: "border-amber-200",  text: "text-amber-700",  pill: "bg-amber-100 text-amber-700" },
};

export default function TemplateEngine() {
  const editorRef = useRef<any>(null);
  const [content, setContent] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ identity: true, tables: true });
  const [activeTab, setActiveTab] = useState<"editor" | "templates" | "rag">("editor");
  const [customVarName, setCustomVarName] = useState("");
  const [customTableName, setCustomTableName] = useState("");
  
  // RAG Upload States
  const [ragType, setRagType] = useState("template");
  const [ragCategory, setRagCategory] = useState("MOU");
  const [ragSubType, setRagSubType] = useState<"structure" | "clauses">("structure");
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    get(ref(database, "templates")).then(snap => {
      if (snap.exists()) setSavedTemplates(Object.values(snap.val()));
    });
  }, []);

  const fetchKnowledge = async () => {
    setLoadingKnowledge(true);
    try {
      // Read directly from Firebase with the authenticated client SDK
      const snap = await get(ref(database, "ragKnowledge"));
      if (snap.exists()) {
        const entries = (Object.values(snap.val()) as any[]).sort((a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
        setRagKnowledge(entries);
      } else {
        setRagKnowledge([]);
      }

      // Separately fetch Pinecone vector count from API (no Firebase needed)
      try {
        const res = await fetch('/api/admin/vectors');
        const data = await res.json();
        if (data.success) setTotalVectors(data.totalVectors);
      } catch {
        // Non-fatal — vector count badge just won't show
      }
    } catch (e) {
      console.warn('Failed to fetch knowledge:', e);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const handleDeleteKnowledge = async (entry: any) => {
    if (!confirm(`Delete "${entry.title}" from Pinecone and registry?`)) return;
    setDeletingId(entry.id);
    try {
      // Delete from Firebase registry using authenticated client SDK
      await remove(ref(database, `ragKnowledge/${entry.id}`));
      setRagKnowledge(prev => prev.filter(e => e.id !== entry.id));

      // Delete vectors from Pinecone via API (no auth needed for this)
      if (entry.vectorIds?.length > 0) {
        fetch('/api/admin/vectors', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registryId: entry.id, vectorIds: entry.vectorIds }),
        }).catch(e => console.warn('Pinecone delete failed (non-fatal):', e.message));
      }
    } catch (e) {
      alert('Delete failed.');
    } finally {
      setDeletingId(null);
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

  // ─── Jodit Config ───────────────────────────────────────────────────────
  const config = useMemo(() => ({
    readonly: false,
    placeholder: "Start designing your legal document template here...",
    height: "100%",
    minHeight: 600,
    toolbarSticky: true,
    toolbarAdaptive: false,
    showXPathInStatusbar: false,
    showCharsCounter: true,
    showWordsCounter: true,
    allowResizeY: false,
    toolbarButtonSize: "middle" as const,
    style: {
      font: "16px Georgia, serif",
      lineHeight: "1.8",
    },
    buttons: [
      "source", "|",
      "bold", "italic", "underline", "strikethrough", "|",
      "superscript", "subscript", "|",
      "font", "fontsize", "|",
      "brush", "paragraph", "|",
      "ul", "ol", "|",
      "indent", "outdent", "|",
      "align", "|",
      "table", "image", "link", "hr", "|",
      "undo", "redo", "|",
      "copyformat", "eraser", "|",
      "fullsize", "print",
    ],
    uploader: {
      insertImageAsBase64URI: true,
    },
    image: {
      openOnDblClick: true,
      editSrc: true,
      useImageEditor: true,
    },
    table: {
      splitBlockOnInsertTable: false,
    },
    fontValues: {
      "Arial,Helvetica,sans-serif": "Arial",
      "Georgia,serif": "Georgia (Formal)",
      "Times New Roman,Times,serif": "Times New Roman",
      "Courier New,Courier,monospace": "Courier New",
      "Verdana,Geneva,sans-serif": "Verdana",
      "Trebuchet MS,sans-serif": "Trebuchet MS",
    },
  }), []);

  // ─── Insert Tag at Cursor ────────────────────────────────────────────────
  const insertTag = (tag: string) => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.selection.insertHTML(
        `<span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;font-weight:600">${tag}</span>&nbsp;`
      );
    }
  };

  const handleDragStart = (e: React.DragEvent, tag: string) => {
    e.dataTransfer.setData("text/plain", tag);
  };

  // ─── Save Template ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!templateName.trim()) return alert("Please enter a template name");
    if (!content.trim()) return alert("Template content is empty");
    setSaving(true);
    try {
      const newRef = push(ref(database, "templates"));
      await set(newRef, {
        id: newRef.key,
        name: templateName,
        content,
        createdAt: new Date().toISOString(),
      });
      alert(`✅ Template "${templateName}" saved!`);
      setTemplateName("");
      setContent("");
      const snap = await get(ref(database, "templates"));
      if (snap.exists()) setSavedTemplates(Object.values(snap.val()));
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await remove(ref(database, `templates/${id}`));
    const snap = await get(ref(database, "templates"));
    setSavedTemplates(snap.exists() ? Object.values(snap.val()) : []);
  };

  const handleLoadTemplate = (t: any) => {
    setTemplateName(t.name + " (Copy)");
    setContent(t.content);
    setActiveTab("editor");
  };

  const addCustomVar = () => {
    if (!customVarName.trim()) return;
    const tag = `{{${customVarName.toUpperCase().replace(/\s+/g, "_")}}}`;
    insertTag(tag);
    setCustomVarName("");
  };

  const addCustomTable = () => {
    if (!customTableName.trim()) return;
    const tag = `{{TABLE:${customTableName.toUpperCase().replace(/\s+/g, "_")}}}`;
    insertTag(tag);
    setCustomTableName("");
  };

  const TEMPLATE_CATEGORIES: Record<string, { label: string; autoTags: string; placeholder: string }> = {
    "MOU":            { label: "MOU (Memorandum of Understanding)", autoTags: "mou, legal, agreement",         placeholder: "Paste MOU clauses, obligations, IP sharing terms..." },
    "Invoice":        { label: "Invoice / Payment Terms",           autoTags: "invoice, payment, billing",     placeholder: "Paste invoice rules, GST clauses, payment schedule terms..." },
    "Purchase Order": { label: "Purchase Order",                    autoTags: "purchase-order, procurement",   placeholder: "Paste purchase order terms, delivery, penalty clauses..." },
    "NDA":            { label: "NDA (Non-Disclosure Agreement)",    autoTags: "nda, confidentiality, legal",   placeholder: "Paste NDA clauses, confidentiality obligations..." },
    "Service Agreement": { label: "Service Agreement / SLA",       autoTags: "service, sla, agreement",       placeholder: "Paste SLA terms, deliverables, termination clauses..." },
    "Equity / Shareholding": { label: "Equity / Shareholding",     autoTags: "equity, shares, shareholding",  placeholder: "Paste equity clauses, vesting, dilution terms..." },
    "Custom":         { label: "Custom / Other",                   autoTags: "",                             placeholder: "Paste your document content here..." },
  };

  const PRECEDENT_CATEGORIES: Record<string, { label: string; autoTags: string; placeholder: string }> = {
    "Approved MOU":      { label: "Approved MOU",              autoTags: "mou, approved, precedent",           placeholder: "Paste text from a previously approved MOU..." },
    "Approved Invoice":  { label: "Approved Invoice",          autoTags: "invoice, approved, precedent",       placeholder: "Paste text from a previously approved invoice..." },
    "Approved PO":       { label: "Approved Purchase Order",   autoTags: "purchase-order, approved, precedent",placeholder: "Paste text from an approved purchase order..." },
    "General Precedent": { label: "General Reference Document",autoTags: "reference, precedent",              placeholder: "Paste any approved reference document text here..." },
  };

  const activeCategoryMap = ragType === "template" ? TEMPLATE_CATEGORIES : PRECEDENT_CATEGORIES;

  const handleTypeChange = (newType: string) => {
    setRagType(newType);
    setRagSubType("structure"); // reset sub-type when switching
    const firstCat = Object.keys(newType === "template" ? TEMPLATE_CATEGORIES : PRECEDENT_CATEGORIES)[0];
    setRagCategory(firstCat);
    const catData = (newType === "template" ? TEMPLATE_CATEGORIES : PRECEDENT_CATEGORIES)[firstCat];
    if (catData) setRagTags(catData.autoTags);
  };

  const handleCategoryChange = (cat: string) => {
    setRagCategory(cat);
    const catData = activeCategoryMap[cat];
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
          type: ragType,
          category: ragCategory,
          subType: ragType === "template" ? ragSubType : undefined,
          title: ragTitle, 
          text: ragText,
          tags,
          version: ragVersion,
          effectiveDate: ragDate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Write registry entry client-side with authenticated Firebase SDK
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
      // Refresh the knowledge list so new entry shows immediately
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
      <div className="flex h-screen flex-col bg-slate-100 overflow-hidden">

        {/* ─── Topbar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === "editor" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"}`}
              >
                <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Editor</span>
              </button>
              <button
                onClick={() => setActiveTab("templates")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === "templates" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"}`}
              >
                <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Saved Templates ({savedTemplates.length})</span>
              </button>
              <button
                onClick={() => { setActiveTab("rag"); fetchKnowledge(); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === "rag" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> RAG Knowledge Base</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Template name (e.g. MoU Agreement)..."
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-80 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>

        {/* ─── Saved Templates Tab ─────────────────────────────────── */}
        {activeTab === "templates" && (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Saved Templates</h2>
              {savedTemplates.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center">
                  <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No templates saved yet. Build one in the Editor tab!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedTemplates.map(t => (
                    <div key={t.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between hover:shadow-sm transition">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{t.name}</h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Created {new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadTemplate(t)}
                          className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:bg-blue-900/50"
                        >
                          Edit / Duplicate
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="p-2 text-red-400 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── RAG Knowledge Base Tab ──────────────────────────────── */}
        {activeTab === "rag" && (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload RAG Knowledge Context</h2>
              <p className="text-slate-500 mb-6 text-sm">
                Paste Institutional Policies, Contract Terms, and Historical Precedents here. The system will slice this text, 
                compute <strong className="text-slate-700">Hugging Face MiniLM vectors</strong>, and seamlessly push them into <strong className="text-slate-700">Pinecone</strong> to enforce AI compliance globally across templates.
              </p>

              <div className="space-y-6">

                {/* ── Level 1: Context Type ───────────────────── */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Context Type</label>
                  <div className="flex gap-3">
                    {[
                      { value: "template",  label: "Templates",  desc: "Institutional clauses & policies",    color: "blue" },
                      { value: "precedent", label: "Precedents", desc: "Historical approved documents",       color: "purple" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleTypeChange(opt.value)}
                        className={`flex-1 text-left p-4 rounded-xl border-2 transition ${
                          ragType === opt.value
                            ? opt.color === "blue"
                              ? "border-blue-500 bg-blue-50"
                              : "border-purple-500 bg-purple-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className={`font-bold text-sm ${ragType === opt.value ? (opt.color === "blue" ? "text-blue-700" : "text-purple-700") : "text-slate-700"}`}>{opt.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Level 2: Document Category ──────────────── */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Document Category
                    <span className="ml-2 text-[10px] text-slate-400 normal-case font-normal">— select to auto-populate tags</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(activeCategoryMap).map(([key, cat]) => (
                      <button
                        key={key}
                        onClick={() => handleCategoryChange(key)}
                        className={`text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
                          ragCategory === key
                            ? ragType === "template"
                              ? "border-blue-400 bg-blue-500 text-white"
                              : "border-purple-400 bg-purple-500 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{activeCategoryMap[ragCategory]?.label}</p>
                </div>

                {/* ── Level 3: Sub-type (Templates only) ──────── */}
                {ragType === "template" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                      Upload As
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setRagSubType("structure")}
                        className={`flex-1 text-left p-4 rounded-xl border-2 transition ${
                          ragSubType === "structure"
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className={`font-bold text-sm ${ragSubType === "structure" ? "text-blue-700" : "text-slate-700"}`}>
                          📄 Template Structure
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          The document skeleton — layout, headings, sections, and placeholder fields for the {ragCategory}.
                        </p>
                      </button>
                      <button
                        onClick={() => setRagSubType("clauses")}
                        className={`flex-1 text-left p-4 rounded-xl border-2 transition ${
                          ragSubType === "clauses"
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className={`font-bold text-sm ${ragSubType === "clauses" ? "text-indigo-700" : "text-slate-700"}`}>
                          ⚖️ Clauses / Policies
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Specific legal rules, terms, and obligations that the AI must enforce in {ragCategory} documents.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Title ───────────────────────────────────── */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Context Title</label>
                  <input 
                    type="text" value={ragTitle} onChange={e => setRagTitle(e.target.value)}
                    placeholder={`e.g. ${ragCategory} Standard Clauses 2026`}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* ── Version + Date ──────────────────────────── */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Version</label>
                    <input 
                      type="text" value={ragVersion} onChange={e => setRagVersion(e.target.value)}
                      placeholder="e.g. 2.1"
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Effective Date</label>
                    <input 
                      type="date" value={ragDate} onChange={e => setRagDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* ── Tags (auto-populated, editable) ─────────── */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tags
                    <span className="ml-2 text-xs font-normal text-slate-400">(auto-populated · editable · comma separated)</span>
                  </label>
                  <input 
                    type="text" value={ragTags} onChange={e => setRagTags(e.target.value)}
                    placeholder="e.g. legal, mou, confidentiality"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* ── Content: PDF upload OR direct text ──────── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Clause / Policy Content</label>
                    <span className="text-xs text-slate-400">Upload a PDF or paste text directly</span>
                  </div>

                  {/* PDF Drop Zone */}
                  <label
                    htmlFor="pdf-upload"
                    className={`flex items-center gap-3 w-full border-2 border-dashed rounded-xl px-5 py-4 cursor-pointer transition mb-3 ${
                      isParsing
                        ? 'border-blue-300 bg-blue-50'
                        : pdfInfo
                        ? 'border-green-300 bg-green-50'
                        : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <span className="text-2xl">{isParsing ? '⏳' : pdfInfo ? '✅' : '📎'}</span>
                    <div className="flex-1 min-w-0">
                      {isParsing ? (
                        <p className="text-sm font-medium text-blue-600">Extracting text from PDF...</p>
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

                  {/* Editable Text Area */}
                  <textarea 
                    value={ragText} onChange={e => setRagText(e.target.value)}
                    rows={10}
                    placeholder={activeCategoryMap[ragCategory]?.placeholder ?? "Paste your document content here..."}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleVectorize}
                    disabled={isVectorizing}
                    className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 transition"
                  >
                    <Database className="h-5 w-5" />
                    {isVectorizing ? "Chunking & Vectorizing into Pinecone..." : "Embed into Pinecone"}
                  </button>
                  {vectorStatus && <p className="text-sm mt-3 text-center font-medium text-green-700">{vectorStatus}</p>}
                </div>
              </div>

              {/* Stored Knowledge Viewer */}
              <div className="max-w-3xl mx-auto mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-800">Stored Knowledge</h3>
                    {totalVectors > 0 && <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">{totalVectors} vectors</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleResetKnowledge}
                      disabled={isResetting || ragKnowledge.length === 0}
                      className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                    >
                      {isResetting ? 'Wiping...' : '🗑️ Wipe All'}
                    </button>
                    <button
                      onClick={fetchKnowledge}
                      disabled={loadingKnowledge}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      {loadingKnowledge ? 'Loading...' : '↻ Refresh'}
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {ragKnowledge.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-slate-400 text-sm">{loadingKnowledge ? 'Fetching...' : 'No entries yet. Upload a document above to populate the knowledge base.'}</p>
                    </div>
                  ) : (
                    ragKnowledge.map(entry => (
                      <div key={entry.id} className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50 transition">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              entry.type === 'template' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {entry.type === 'template' ? 'Template' : 'Precedent'}
                            </span>
                            {entry.category && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {entry.category}
                              </span>
                            )}
                            {entry.subType && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                entry.subType === 'structure' 
                                  ? 'bg-sky-100 text-sky-700' 
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {entry.subType === 'structure' ? '📄 Structure' : '⚖️ Clauses'}
                              </span>
                            )}
                            <h4 className="font-semibold text-slate-800 truncate">{entry.title}</h4>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>v{entry.version}</span>
                            {entry.effectiveDate && <span>Effective: {entry.effectiveDate}</span>}
                            <span>{entry.chunkCount} chunks</span>
                            <span>Uploaded: {new Date(entry.uploadedAt).toLocaleDateString()}</span>
                          </div>
                          {entry.tags && entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(Array.isArray(entry.tags) ? entry.tags : entry.tags.split(',')).map((tag: string) => (
                                <span key={tag} className="bg-slate-100 text-slate-600 text-[10px] font-medium px-1.5 py-0.5 rounded">{tag.trim()}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteKnowledge(entry)}
                          disabled={deletingId === entry.id}
                          className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Editor Tab ──────────────────────────────────────────── */}
        {activeTab === "editor" && (
          <div className="flex flex-1 overflow-hidden">

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
              <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden">
                <JoditEditor
                  ref={editorRef}
                  value={content}
                  config={config}
                  onBlur={val => setContent(val)}
                  onChange={() => {}}
                />
              </div>
            </div>

            {/* ─── Variables Sidebar ──────────────────────────────── */}
            <aside className="w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800/50">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Variables & Tables</h2>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                  <strong>Drag</strong> or <strong>click</strong> to insert at cursor. AI extracts real values from uploaded documents.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">

                {/* Variable Groups */}
                {VARIABLE_GROUPS.map(group => {
                  const c = colorMap[group.color] || colorMap.blue;
                  const isOpen = openGroups[group.id];
                  return (
                    <div key={group.id} className="rounded-xl border border-slate-100 dark:border-slate-800/50 overflow-hidden">
                      <button
                        onClick={() => setOpenGroups(p => ({ ...p, [group.id]: !p[group.id] }))}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-[#0a0a0a] hover:bg-slate-100 transition"
                      >
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{group.label}</span>
                        {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                      </button>

                      {isOpen && (
                        <div className="p-2 space-y-1.5 bg-white dark:bg-slate-900">
                          {group.vars.map(v => (
                            <div
                              key={v.tag}
                              draggable
                              onDragStart={e => handleDragStart(e, v.tag)}
                              onClick={() => insertTag(v.tag)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer group transition-all hover:shadow-sm ${c.bg} ${c.border} hover:scale-[1.01]`}
                            >
                              <GripVertical className={`h-3.5 w-3.5 ${c.text} flex-shrink-0 opacity-60`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{v.name}</p>
                                <code className={`mt-0.5 block text-[10px] font-mono ${c.pill} px-1.5 py-0.5 rounded w-fit truncate max-w-full`}>
                                  {v.tag}
                                </code>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Custom Variable */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-[#0a0a0a]">
                    <Type className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Custom Variable</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 flex gap-2">
                    <input
                      type="text"
                      placeholder="Variable name..."
                      value={customVarName}
                      onChange={e => setCustomVarName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addCustomVar()}
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={addCustomVar}
                      className="bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Custom Table */}
                <div className="rounded-xl border border-amber-200 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/30">
                    <Table2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-semibold text-amber-800">Custom Dynamic Table</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 space-y-2">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                      AI will auto-detect all rows & columns from the uploaded document — even if rows vary per document!
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Table name (e.g. Orders)..."
                        value={customTableName}
                        onChange={e => setCustomTableName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addCustomTable()}
                        className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        onClick={addCustomTable}
                        className="bg-amber-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-amber-600 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Image hint */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-[#0a0a0a] space-y-1">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Images</span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    Use the <strong>Image</strong> button in the toolbar above to insert a logo or signature. You can upload from your PC or paste a URL.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
