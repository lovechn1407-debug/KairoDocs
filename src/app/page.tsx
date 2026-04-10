"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, FileText, Database, Brain, ArrowUpRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-50 overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-[#030712]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg border border-blue-500 shadow-sm shadow-blue-500/50">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">KairoDocs</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 border border-blue-500 hover:border-blue-400">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 flex flex-col items-center justify-center min-h-[90vh]">
        {/* Background glows */}
        <div className="absolute top-0 inset-x-0 h-[600px] overflow-hidden -z-10 pointer-events-none flex justify-center">
          <div className="absolute top-[-100px] w-[800px] h-[500px] bg-blue-500/20 dark:bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen"></div>
          <div className="absolute top-[50px] translate-x-32 w-[500px] h-[400px] bg-indigo-500/20 dark:bg-indigo-600/20 blur-[100px] rounded-full mix-blend-screen"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative text-center w-full z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium border border-blue-200 dark:border-blue-800/50 mb-8 backdrop-blur-sm shadow-sm">
              <SparklesIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Next-Gen RAG Architecture is Live</span>
            </div>
            
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] max-w-4xl">
              AI-Powered Institutional <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 drop-shadow-sm">
                Document Intelligence
              </span>
            </h1>
            
            <p className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed font-medium">
              Automate drafting, enforce policy compliance, and centralize your organizational knowledge base with state-of-the-art Retrieval-Augmented Generation.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-lg transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] flex items-center justify-center gap-2 border border-blue-500 hover:scale-105 active:scale-95 duration-200">
                Enter Workspace
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-sm text-slate-800 dark:text-slate-200 hover:scale-105 active:scale-95 duration-200">
                View Features
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dashboard Preview / Screenshot Mockup */}
      <div className="max-w-6xl mx-auto px-6 relative z-10 pb-24 -mt-10 sm:-mt-20">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="rounded-xl border border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl p-2 sm:p-4 shadow-2xl relative"
        >
          {/* Mock Dashboard Window */}
          <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0f1c] aspect-[16/10] sm:aspect-video relative flex flex-col shadow-inner">
            
            {/* Fake Mac Header */}
            <div className="flex items-center px-4 h-12 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0f1525]/80 gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-[inset_0_1px_rgba(255,255,255,0.4)]"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[inset_0_1px_rgba(255,255,255,0.4)]"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[inset_0_1px_rgba(255,255,255,0.4)]"></div>
              <div className="h-6 w-full max-w-[200px] bg-slate-100 dark:bg-[#1a2333] rounded mx-auto border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center">
                <div className="h-1.5 w-24 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
              </div>
            </div>
            
            {/* Fake Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Fake Sidebar */}
              <div className="w-16 sm:w-56 h-full bg-white dark:bg-[#0c111d] border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col pt-6 px-3 gap-2">
                <div className="h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100/50 dark:border-blue-800/30 flex items-center px-2 shrink-0">
                  <div className="h-4 w-4 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                  <div className="h-2 w-16 bg-blue-200 dark:bg-blue-700 rounded-full ml-3 hidden sm:block"></div>
                </div>
                <div className="h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 flex items-center px-2 mt-4 shrink-0">
                  <div className="h-4 w-4 bg-slate-300 dark:bg-slate-700 rounded shadow-sm"></div>
                  <div className="h-2 w-20 bg-slate-200 dark:bg-slate-700 rounded-full ml-3 hidden sm:block"></div>
                </div>
                <div className="h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 flex items-center px-2 shrink-0">
                  <div className="h-4 w-4 bg-slate-300 dark:bg-slate-700 rounded shadow-sm"></div>
                  <div className="h-2 w-12 bg-slate-200 dark:bg-slate-700 rounded-full ml-3 hidden sm:block"></div>
                </div>
              </div>
              
              {/* Fake Content Area */}
              <div className="flex-1 p-6 flex flex-col gap-6 bg-slate-50 dark:bg-transparent">
                {/* Header row */}
                <div className="flex justify-between items-center shrink-0">
                  <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-8 w-24 bg-blue-500 rounded-lg shadow-sm"></div>
                </div>
                
                {/* Stats / Cards row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-24 bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-4 flex flex-col justify-between">
                      <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded"></div>
                      <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  ))}
                </div>

                {/* Main Graph/Table area */}
                <div className="flex-1 bg-white dark:bg-[#111827] rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm p-6 flex flex-col gap-4">
                   <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
                   {[1,2,3].map(i => (
                     <div key={i} className="h-12 w-full bg-slate-50 dark:bg-slate-900/50 rounded-lg flex items-center px-4 justify-between border border-slate-100 dark:border-slate-800/50">
                       <div className="flex items-center gap-3 w-1/3">
                         <div className="h-6 w-6 rounded bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                           <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                         </div>
                         <div className="h-2 w-3/4 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                       </div>
                       <div className="h-2 w-16 bg-emerald-200 dark:bg-emerald-900/50 rounded-full hidden sm:block"></div>
                       <div className="h-2 w-12 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            {/* Overlay Glass Badge */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-white/80 dark:bg-[#030712]/80 px-6 py-3 rounded-full font-semibold shadow-2xl backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                Live Dashboard Preview
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 bg-white dark:bg-[#070b14] border-t border-slate-200 dark:border-slate-800 relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 relative">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-slate-900 dark:text-white">Everything You Need to Scale</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              From automated drafting to strict approval workflows, KairoDocs provides an end-to-end solution for institutional documents.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Brain className="h-6 w-6 text-blue-500" />}
              title="Groq AI RAG Framework"
              description="Automatically draft documents using institutional templates and historical precedents from Pinecone vector databases in milliseconds."
            />
            <FeatureCard 
              icon={<Shield className="h-6 w-6 text-indigo-500" />}
              title="Policy Compliance"
              description="AI automatically cross-references drafts against mandatory clauses, throwing alerts for missing or conflicting data before submission."
            />
            <FeatureCard 
              icon={<FileText className="h-6 w-6 text-emerald-500" />}
              title="Smart DOCX Export"
              description="Download perfectly formatted Word documents with preserved typography, standard layouts, and no messy HTML artifacts."
            />
            <FeatureCard 
              icon={<Zap className="h-6 w-6 text-amber-500" />}
              title="Blazing Fast Execution"
              description="Backed by LLaMA 3.3 70B on Groq and optimized serverless endpoints for sub-second vector embedding and retrieval workflows."
            />
            <FeatureCard 
              icon={<Database className="h-6 w-6 text-rose-500" />}
              title="Centralized Knowledge"
              description="Admins control active valid templates and upload direct PDF precedents while AI manages metadata and auto-tagging."
            />
            <FeatureCard 
              icon={<ArrowUpRight className="h-6 w-6 text-cyan-500" />}
              title="Role-Based Workflows"
              description="Segmented dashboards for Users, Mentors, Head of Incubation ensure documents are thoroughly verified before final approval."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#030712] text-center relative z-20">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="bg-blue-600/10 p-1 rounded">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-slate-100">KairoDocs</span>
        </div>
        <p className="text-slate-500 dark:text-slate-500 text-sm font-medium">
          © {new Date().getFullYear()} KairoDocs Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group shadow-sm hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none"></div>
      
      <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300 group-hover:shadow-md relative z-10">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100 relative z-10">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed relative z-10">
        {description}
      </p>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
