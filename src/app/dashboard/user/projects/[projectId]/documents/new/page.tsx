"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { database } from "@/lib/firebase";
import { ref, get, push, set } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, UploadCloud, Cpu, Save, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

export default function NewDocument() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");

  const [stage, setStage] = useState<"setup" | "parsing" | "analyzing" | "review" | "error">("setup");
  const [errorMsg, setErrorMsg] = useState("");
  const [finalContent, setFinalContent] = useState("");
  const [saving, setSaving] = useState(false);

  const editorConfig = useMemo(() => ({
    readonly: false,
    height: 550,
    allowResizeY: true,
    allowResizeX: false,
  }), []);

  useEffect(() => {
    const fetchData = async () => {
      const projSnap = await get(ref(database, `projects/${projectId}`));
      if (projSnap.exists()) setProject(projSnap.val());

      const tmplSnap = await get(ref(database, "templates"));
      if (tmplSnap.exists()) setTemplates(Object.values(tmplSnap.val()));
    };
    fetchData();
  }, [projectId]);

  const handleProcess = async () => {
    if (!file) return alert("Please select a document to upload");
    if (!selectedTemplate) return alert("Please select a template format");
    if (!documentName.trim()) return alert("Please enter a document name");

    setStage("parsing");
    setErrorMsg("");

    try {
      // 1. Parse PDF text
      const fd = new FormData();
      fd.append("file", file);
      const parseRes = await fetch("/api/parse-pdf", { method: "POST", body: fd });
      const parseData = await parseRes.json();
      if (!parseData.success) throw new Error(parseData.error || "Failed to parse PDF");

      // 2. AI Extraction
      setStage("analyzing");
      const tagRegex = /{{(.*?)}}/g;
      const matches = [...selectedTemplate.content.matchAll(tagRegex)];
      const variables = Array.from(new Set(matches.map((m: RegExpMatchArray) => m[1])));

      let extractedResult: Record<string, string> = {};
      if (variables.length > 0) {
        const extractRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: parseData.text, variables }),
        });
        const extractData = await extractRes.json();
        if (!extractData.success) throw new Error(extractData.error || "AI Extraction Failed");
        extractedResult = extractData.extractedData;
      }

      // 3. Fill Template — tables insert raw HTML, scalars get blue highlight
      let populated = selectedTemplate.content;
      for (const [key, val] of Object.entries(extractedResult)) {
        if (key.startsWith("TABLE:")) {
          // TABLE variables contain pre-built HTML — insert directly
          populated = populated.replaceAll(`{{${key}}}`, val as string);
        } else {
          // Scalar variables get a blue highlighted span
          populated = populated.replaceAll(
            `{{${key}}}`,
            `<span style="background:#dbeafe;color:#1e40af;padding:1px 4px;border-radius:3px;font-weight:600">${val}</span>`
          );
        }
      }

      setFinalContent(populated);
      setStage("review");
    } catch (e: any) {
      setErrorMsg(e.message);
      setStage("error");
    }
  };

  const handleSubmit = async () => {
    if (!finalContent.trim()) return alert("Document content is empty");
    setSaving(true);
    try {
      const subRef = push(ref(database, "submissions"));
      await set(subRef, {
        id: subRef.key,
        projectId,
        projectName: project?.name,
        userId: user?.uid,
        userEmail: user?.email,
        documentName: documentName.trim(),
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        documentContent: finalContent,
        status: "Pending",
        createdAt: new Date().toISOString(),
        versions: [{ documentContent: finalContent, status: "Submitted", savedAt: new Date().toISOString() }],
      });
      router.push(`/dashboard/user/projects/${projectId}`);
    } catch (e: any) {
      alert("Failed to submit: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <div className="flex h-screen flex-col bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 shrink-0">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/user/projects/${projectId}`} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{project?.name}</p>
              <h1 className="text-lg font-bold text-slate-800">Add New Document</h1>
            </div>
          </div>
          {stage === "review" && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Submitting..." : "Submit for Approval"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Setup Stage */}
            {(stage === "setup" || stage === "error") && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-6"
              >
                <h2 className="text-lg font-semibold text-slate-800">Configure Document</h2>

                {/* Document Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Document Name *</label>
                  <input
                    type="text"
                    value={documentName}
                    onChange={e => setDocumentName(e.target.value)}
                    placeholder="e.g. MoU with Vendor ABC"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Template Select */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Format Template *</label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none"
                      onChange={e => setSelectedTemplate(templates.find(t => t.id === e.target.value))}
                      defaultValue=""
                    >
                      <option value="" disabled>-- Choose a template --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload Source Document (PDF) *</label>
                    <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="h-7 w-7 text-slate-400 dark:text-slate-500 mx-auto mb-1.5" />
                      <span className="text-sm text-slate-500 dark:text-slate-400 block">
                        {file ? <strong className="text-blue-700 dark:text-blue-400">{file.name}</strong> : "Click or drag PDF here"}
                      </span>
                    </div>
                  </div>
                </div>

                {stage === "error" && errorMsg && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 rounded-lg text-sm border border-red-200">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleProcess}
                    disabled={!selectedTemplate || !file || !documentName.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Cpu className="h-5 w-5" />
                    Run AI Document Generator
                  </button>
                </div>
              </motion.div>
            )}

            {/* Processing Stage */}
            {(stage === "parsing" || stage === "analyzing") && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-16 text-center"
              >
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Cpu className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {stage === "parsing" ? "📄 Reading your document..." : "🤖 AI is extracting data..."}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                  {stage === "parsing" ? "Parsing PDF content" : "Groq LLaMA is analyzing and filling your template"}
                </p>
              </motion.div>
            )}

            {/* Review Stage */}
            {stage === "review" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Review Generated Document
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">AI has filled in the template. Review, edit if needed, then submit.</p>
                  </div>
                  <button onClick={() => setStage("setup")} className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 underline">
                    Start Over
                  </button>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <JoditEditor
                    value={finalContent}
                    config={editorConfig}
                    onBlur={newContent => setFinalContent(newContent)}
                    onChange={() => {}}
                  />
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
