"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { database } from "@/lib/firebase";
import { ref, get, push, set } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, UploadCloud, Cpu, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

export default function NewProject() {
  const { user } = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<"idle" | "parsing" | "analyzing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [finalContent, setFinalContent] = useState("");
  
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch Templates
    const fetchTemplates = async () => {
      const snap = await get(ref(database, "templates"));
      if (snap.exists()) {
        const data = snap.val();
        setTemplates(Object.values(data));
      }
    };
    fetchTemplates();
  }, []);

  // Process Document
  const handleProcess = async () => {
    if (!file) return alert("Please select a document first");
    if (!selectedTemplate) return alert("Please select a template format");

    setProcessingState("parsing");
    setErrorMsg("");

    try {
      // 1. Parse PDF
      const fd = new FormData();
      fd.append("file", file);
      
      const parseRes = await fetch("/api/parse-pdf", {
        method: "POST",
        body: fd
      });
      const parseData = await parseRes.json();
      
      if (!parseData.success) throw new Error(parseData.error || "Failed to parse PDF");
      const pdfText = parseData.text;

      // 2. Extract Variables
      setProcessingState("analyzing");
      
      // Extract all {{TAG}} from template content
      const tagRegex = /{{(.*?)}}/g;
      const matches = [...selectedTemplate.content.matchAll(tagRegex)];
      const variables = matches.map(m => m[1]); // e.g. ["DATE", "USER_NAME"]
      const uniqueVars = Array.from(new Set(variables));

      let extractedResult = {};
      if (uniqueVars.length > 0) {
        const extractRes = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: pdfText,
            variables: uniqueVars
          })
        });
        
        const extractData = await extractRes.json();
        if (!extractData.success) throw new Error(extractData.error || "AI Extraction Failed");
        
        extractedResult = extractData.extractedData;
      }

      // 3. Populate Template
      let populatedContent = selectedTemplate.content;
      for (const [key, val] of Object.entries(extractedResult)) {
        const valStr = (val as string) || "Not Found";
        populatedContent = populatedContent.replaceAll(`{{${key}}}`, `<strong>${valStr}</strong>`);
      }

      setFinalContent(populatedContent);
      setProcessingState("done");

    } catch (e: any) {
      console.error(e);
      setProcessingState("error");
      setErrorMsg(e.message);
    }
  };

  const handleSubmit = async () => {
    if (!projectName.trim()) return alert("Project Name is required");
    if (!finalContent.trim()) return alert("Document is empty");

    setSaving(true);
    try {
      // Here usually we would upload the original file to Telegram to keep history.
      // For simplicity in this checkpoint we save the resulting HTML to Realtime Database.
      const subRef = push(ref(database, "submissions"));
      await set(subRef, {
        id: subRef.key,
        userId: user?.uid,
        userEmail: user?.email,
        projectName,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        documentContent: finalContent,
        status: "Pending", // Pending -> Approved -> Rejected
        createdAt: new Date().toISOString()
      });

      alert("Project submitted successfully!");
      router.push("/dashboard/user/projects");
    } catch (e: any) {
      alert("Submission failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["user"]}>
      <div className="flex h-screen flex-col w-full bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/user" className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-800">New Incubation Project</h1>
          </div>
          {processingState === "done" && (
            <div className="flex items-center gap-4">
               <input
                type="text"
                placeholder="Unique Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
              >
                <Save className="h-4 w-4" />
                {saving ? "Submitting..." : "Submit for Approval"}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Step 1: Select Format & Upload */}
            {processingState !== "done" && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                <h2 className="text-lg font-semibold mb-4">1. Document Setup</h2>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Format Template</label>
                    <select
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                      onChange={(e) => {
                        const t = templates.find(temp => temp.id === e.target.value);
                        setSelectedTemplate(t);
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>-- Select a template format --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload Source Document</label>
                    <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="h-8 w-8 text-slate-400 dark:text-slate-500 mb-2" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {file ? file.name : "Click or drag a PDF here"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleProcess}
                    disabled={!selectedTemplate || !file || processingState === "parsing" || processingState === "analyzing"}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Cpu className={`h-5 w-5 ${["parsing", "analyzing"].includes(processingState) ? "animate-pulse" : ""}`} />
                    {processingState === "parsing" && "Parsing PDF..."}
                    {processingState === "analyzing" && "AI is Extracting Data..."}
                    {processingState === "idle" || processingState === "error" ? "Run AI RAG Engine" : ""}
                  </button>
                </div>
                
                {errorMsg && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 rounded-lg text-sm border border-red-200">
                    {errorMsg}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Review (Jodit Editor) */}
            {processingState === "done" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <h2 className="text-lg font-semibold flex items-center gap-2">
                     <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 w-6 h-6 flex items-center justify-center rounded-full text-xs">2</span>
                     Review Generated Document
                   </h2>
                   <button onClick={() => setProcessingState("idle")} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 underline">
                     Start Over
                   </button>
                </div>
                
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <JoditEditor
                    value={finalContent}
                    config={{ readonly: false, height: 600, allowResizeX: false, allowResizeY: true }}
                    onBlur={(newContent) => setFinalContent(newContent)}
                    onChange={() => {}}
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
