"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, setToken as setTokenCookie, clearToken } from "@/lib/auth";

type AuthContextValue = {
  token: string | null;
  user: any | null;
  isAdmin: boolean;
  setToken: (t: string) => void;
  clearToken: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  function parseJwtPayload(t: string | null) {
    if (!t) return null;
    try {
      const parts = t.split(".");
      if (parts.length < 2) return null;
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const t = getToken();
    setTokenState(t);
    setUser(parseJwtPayload(t));
  }, []);

  function setToken(t: string) {
    setTokenCookie(t);
    setTokenState(t);
    setUser(parseJwtPayload(t));
  }

  function clear() {
    clearToken();
    setTokenState(null);
    setUser(null);
  }

  function signOut() {
    clear();
  }

  const isAdmin = Boolean(
    user?.role === "admin" || (user?.roles && user.roles.includes("admin")),
  );

  return (
    <AuthContext.Provider
      value={{ token, user, isAdmin, setToken, clearToken: clear, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
