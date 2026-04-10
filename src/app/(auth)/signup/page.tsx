"use client";

import { useState, useEffect, Suspense } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { ref, set, get } from "firebase/database";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, User } from "lucide-react";

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
  const [inviteChecking, setInviteChecking] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const urlRole = searchParams.get("role") as "user" | "head" | null;
  const urlDeptName = searchParams.get("deptName");
  const urlInviter = searchParams.get("inviter");

  // On mount, use URL params for invite info to bypass Firebase Rules
  useEffect(() => {
    if (!inviteToken) return;

    setInviteInfo({
      departmentName: urlDeptName || null,
      createdByName: urlInviter || null,
    });
    setInviteRole(urlRole || "user");
  }, [inviteToken, urlRole, urlDeptName, urlInviter]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
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
        departmentName: inviteInfo?.departmentName || null,
        invitedBy: inviteInfo?.createdByName || null,
        createdAt: new Date().toISOString(),
      });

      // Mark invite as used
      if (inviteToken) {
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-xl border border-slate-100 dark:border-slate-800/50"
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            KairoDocs
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Create a new account</p>
        </div>

        {inviteChecking ? (
          <div className="mb-4 rounded-lg bg-slate-50 dark:bg-[#0a0a0a] p-3 text-sm text-slate-500 dark:text-slate-400 animate-pulse">
            Verifying invitation...
          </div>
        ) : inviteInfo && inviteToken ? (
          <div className={`mb-4 rounded-lg p-3 text-sm border flex items-center gap-2 ${
            inviteRole === "head"
              ? "bg-purple-50 text-purple-800 border-purple-200"
              : "bg-blue-50 dark:bg-blue-900/30 text-blue-800 border-blue-200"
          }`}>
            {inviteRole === "head"
              ? <Shield className="h-4 w-4 shrink-0" />
              : <User className="h-4 w-4 shrink-0" />
            }
            <div className="flex flex-col gap-0.5 text-left">
              <span>
                You've been invited as a <strong>{inviteRole === "head" ? "Department Head" : "User"}</strong>
                {inviteInfo.createdByName ? ` by ${inviteInfo.createdByName}` : ""}.
              </span>
              {inviteInfo.departmentName && (
                <span className="font-semibold text-xs opacity-90 block">
                  Assigned Department: {inviteInfo.departmentName}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
          >
            {loading ? "Creating account..." : inviteRole === "head" ? "Create Head Account" : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500">
            Sign in
          </Link>
        </div>
      </motion.div>
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
