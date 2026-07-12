"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, setToken as setTokenCookie, clearToken } from "@/lib/auth";

type AuthContextValue = {
  token: string | null;
  setToken: (t: string) => void;
  clearToken: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  function setToken(t: string) {
    setTokenCookie(t);
    setTokenState(t);
  }

  function clear() {
    clearToken();
    setTokenState(null);
  }

  function signOut() {
    clear();
    // additional client-side cleanup could go here
    // navigation handled by consumers
  }

  return (
    <AuthContext.Provider
      value={{ token, setToken, clearToken: clear, signOut }}
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
