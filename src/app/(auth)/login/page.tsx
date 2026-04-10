"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setError("Failed to login. Please check your credentials.");
    } finally {
      if (!router) setLoading(false); // only toggle if not redirecting
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F19] text-white selection:bg-white/30 font-sans relative overflow-hidden">
      
      {/* Top Navigation */}
      <header className="w-full flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md z-20">
        <div className="text-xl font-bold tracking-widest text-white/90">
          {/* USER NOTED: Logo will be added later. Keep this as a clear placeholder. */}
          [LOGO HOLDER]
        </div>
        <nav className="hidden md:flex items-center gap-8 text-xs font-mono tracking-widest text-white/50">
          <Link href="#" className="hover:text-white transition-colors duration-300">RESEARCH</Link>
          <Link href="#" className="hover:text-white transition-colors duration-300">MODEL</Link>
          <button className="text-white border px-4 py-1.5 border-white/20 hover:bg-white/10 transition-colors duration-300">
            SIGN IN
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-[420px] relative"
        >
          {/* The Login Card */}
          <div className="relative bg-[#0E131F] border border-white/10 p-10 md:p-12 overflow-hidden">
            
            {/* 01 Watermark */}
            <div className="absolute -bottom-8 -left-4 text-9xl font-mono font-bold text-white/[0.02] select-none pointer-events-none">
              01
            </div>

            <div className="relative z-10">
              <div className="mb-10 text-center">
                <p className="font-mono text-xs text-white/40 tracking-[0.2em] mb-2 uppercase">Welcome to</p>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">KAIRODOCS</h1>
                <p className="text-sm text-white/50">Incubation access terminal</p>
              </div>

              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 p-3 text-center text-sm text-red-400 font-mono">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-white/40 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-white/10 text-white px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-0 transition-colors font-mono placeholder:text-white/20"
                    placeholder="name@company.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-white/40 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-white/10 text-white px-4 py-3 pr-10 text-sm focus:border-white/40 focus:outline-none focus:ring-0 transition-colors font-mono placeholder:text-white/20"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black font-semibold tracking-widest text-sm uppercase py-3.5 hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {loading ? "INITIALIZING..." : "SIGN IN"}
                  </button>
                </div>
              </form>
              
              <div className="mt-8 text-center border-t border-white/5 pt-6">
                <Link href="/signup" className="text-xs font-mono text-white/40 hover:text-white transition-colors">
                  REQUEST ACCESS
                </Link>
              </div>

            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-8 flex flex-col md:flex-row items-center justify-between border-t border-white/5 text-[10px] text-white/30 font-mono uppercase tracking-widest z-20">
        <div>© 2024 KAIRODOCS</div>
        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <Link href="#" className="hover:text-white transition-colors">PRIVACY</Link>
          <Link href="#" className="hover:text-white transition-colors">TERMS</Link>
          <Link href="#" className="hover:text-white transition-colors">SECURITY</Link>
        </div>
      </footer>

    </div>
  );
}
