"use client";

import { useState, useEffect, Suspense } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { ref, set, get } from "firebase/database";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, User, FileText, Mail, Lock, Phone, ArrowRight, Loader2, AlertCircle } from "lucide-react";

function SignupForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Invite token state
  const [inviteRole, setInviteRole] = useState<"user" | "head">("user");
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [inviteChecking, setInviteChecking] = useState(true);
  const [inviteInvalid, setInviteInvalid] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  // On mount, look up the invite token to determine role
  useEffect(() => {
    if (!inviteToken) {
      setInviteChecking(false);
      setInviteInvalid(true);
      return;
    }

    const checkInvite = async () => {
      try {
        const snap = await get(ref(database, `invites/${inviteToken}`));
        if (snap.exists() && !snap.val().used) {
          const data = snap.val();
          setInviteInfo(data);
          setInviteRole(data.role || "user");
          setInviteInvalid(false);
        } else {
          setInviteInvalid(true);
        }
      } catch (e) {
        console.error("Failed to fetch invite:", e);
        setInviteInvalid(true);
      } finally {
        setInviteChecking(false);
      }
    };
    checkInvite();
  }, [inviteToken]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteInvalid) {
      setError("Cannot sign up without a valid invite token.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user with role determined by invite token
      await set(ref(database, `users/${user.uid}`), {
        uid: user.uid,
        email: user.email,
        name,
        phone,
        role: inviteRole,
        departmentId: inviteInfo?.departmentId || null,
        departmentName: inviteInfo?.departmentName || null,
        invitedBy: inviteInfo?.createdBy || null,
        createdAt: new Date().toISOString(),
      });

      // Mark invite as used
      if (inviteToken && inviteInfo) {
        await set(ref(database, `invites/${inviteToken}/used`), true);
        await set(ref(database, `invites/${inviteToken}/usedBy`), user.uid);
        await set(ref(database, `invites/${inviteToken}/usedAt`), new Date().toISOString());
      }

      // Redirect based on role
      if (inviteRole === "head") {
        router.push("/dashboard/head");
      } else {
        router.push("/dashboard/user");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create an account.");
      setLoading(false);
    }
  };

  if (inviteChecking) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#030712]">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="font-medium animate-pulse">Verifying invite token...</p>
        </div>
      </div>
    );
  }

  if (inviteInvalid) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#030712] p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invalid or Missing Invite</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            KairoDocs is currently an invite-only platform. Please contact your organization's Administrator or Department Head for a valid invitation link.
          </p>
          <Link href="/login" className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25">
            Return to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-[#030712] relative overflow-hidden selection:bg-blue-500/30">
      {/* Background design elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
        <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-600/20 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen"></div>
      </div>

      <div className="flex w-full flex-col lg:flex-row relative z-10">
        
        {/* Left Side - Form Area */}
        <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 overflow-y-auto">
          
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
            className="w-full max-w-[420px] py-12"
          >
            <div className="mb-6 pl-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Account</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Complete your registration below.</p>
            </div>

            <div className={`mb-6 rounded-xl p-4 text-sm border flex items-start gap-3 backdrop-blur-sm ${
              inviteRole === "head"
                ? "bg-purple-50/80 dark:bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-500/20"
                : "bg-blue-50/80 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/20"
            }`}>
              {inviteRole === "head" ? <Shield className="h-5 w-5 shrink-0 mt-0.5" /> : <User className="h-5 w-5 shrink-0 mt-0.5" />}
              <div className="flex flex-col gap-0.5">
                <strong className="font-semibold text-base block">Invited as {inviteRole === "head" ? "Department Head" : "User"}</strong>
                <span>{inviteInfo?.departmentName ? `Assigned to ${inviteInfo.departmentName}` : "General Access"}</span>
                {inviteInfo?.createdByName && <span className="opacity-80">Invited by: {inviteInfo.createdByName}</span>}
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 text-sm text-red-600 dark:text-red-400 font-medium flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>{error}</div>
              </motion.div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827]/50 pl-11 pr-4 py-3.5 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white font-medium transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Phone Number</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Phone className="h-5 w-5" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827]/50 pl-11 pr-4 py-3.5 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white font-medium transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
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
                    placeholder="you@example.com"
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
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111827]/50 pl-11 pr-4 py-3.5 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white font-medium transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    {inviteRole === "head" ? "Register Head Account" : "Register Account"}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors">
                Sign in to KairoDocs
              </Link>
            </div>

          </motion.div>
        </div>

        {/* Right Side - Brand / Info (Hidden on smaller screens) */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 lg:p-20 border-l border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-[#0f1525]/30 backdrop-blur-3xl">
          <div className="flex justify-end">
            <Link href="/" className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/30 border border-blue-500">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">KairoDocs</span>
            </Link>
          </div>

          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-right flex flex-col items-end"
            >
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight max-w-lg">
                Join your team's secure <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-indigo-500">
                  Document Workspace
                </span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-md leading-relaxed">
                Complete your registration to access approved templates, draft new documents with AI, and collaborate with your department seamlessly.
              </p>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
