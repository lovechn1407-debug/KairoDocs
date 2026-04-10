"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check role
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      let targetPath = "/dashboard/user";
      if (snapshot.exists()) {
        const role = snapshot.val().role;
        if (role === "admin") targetPath = "/dashboard/admin";
        else if (role === "head") targetPath = "/dashboard/head";
        else if (role === "mentor") targetPath = "/dashboard/mentor";
      }

      router.push(targetPath);
    } catch (err: any) {
      setError(err.message || "Failed to login. Please check your credentials.");
    } finally {
      if (!router) setLoading(false); // only toggle if not redirecting
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-[#030712] relative overflow-hidden selection:bg-blue-500/30">
      
      {/* Background design elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
      </div>

      <div className="flex w-full flex-col lg:flex-row relative z-10">
        
        {/* Left Side - Brand / Info (Hidden on smaller screens) */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 lg:p-20 border-r border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-[#0f1525]/30 backdrop-blur-3xl">
          <Link href="/" className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/30 border border-blue-500">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">KairoDocs</span>
          </Link>

          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                Streamline your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
                  Institutional Workflow
                </span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-md leading-relaxed">
                Log in to access your AI-powered drafting assistant, review pending documents, and manage templates via the secure KairoDocs environment.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.6, duration: 1 }}
              className="mt-12 flex items-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-500"
            >
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-[#0f1525]"></div>
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-white dark:border-[#0f1525]"></div>
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 border-2 border-white dark:border-[#0f1525]"></div>
              </div>
              Trusted by Incubation Centers
            </motion.div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
          
          {/* Mobile Header (Shows only on Mobile) */}
          <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 lg:hidden">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">KairoDocs</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-[420px]"
          >
            <div className="mb-8 pl-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Please enter your details to sign in.</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 text-sm text-red-600 dark:text-red-400 font-medium flex items-start gap-3"
              >
                <div className="min-w-4 mt-0.5">⚠️</div>
                <div>{error}</div>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827]/50 pl-11 pr-4 py-3.5 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white font-medium transition-all"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827]/50 pl-11 pr-4 py-3.5 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white font-medium transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pl-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 bg-slate-50 dark:bg-slate-800 dark:border-slate-600" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Remember for 30 days</span>
                </label>
                <a href="#" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

          </motion.div>
        </div>

      </div>
    </div>
  );
}
