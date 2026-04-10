"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, setPersistence, browserSessionPersistence } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { ref, get } from "firebase/database";

// Roles: "admin", "head", "user", "mentor"
export type UserRole = "admin" | "head" | "user" | "mentor" | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure auth state only persists in the current tab/session
    setPersistence(auth, browserSessionPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch role from RTDB
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          setRole(snapshot.val().role || "user");
        } else {
          setRole("user"); // default role
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
