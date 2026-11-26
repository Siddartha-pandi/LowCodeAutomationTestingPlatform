"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi, setCsrfTokenCache } from "@/api";

export interface UserProfile {
  email: string;
  full_name: string;
  role: string;
  roles?: string[];
  permissions?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toProfile(rawUser: any, fallbackEmail = ""): UserProfile {
  return {
    email: rawUser?.email || fallbackEmail,
    full_name: rawUser?.full_name || fallbackEmail.split("@")[0] || "User",
    role: (Array.isArray(rawUser?.roles) && rawUser.roles[0]) || rawUser?.role || "User",
    roles: Array.isArray(rawUser?.roles) ? rawUser.roles : undefined,
    permissions: Array.isArray(rawUser?.permissions) ? rawUser.permissions : undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Purge any legacy localStorage JWT tokens on migration to HttpOnly cookies
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
    }

    authApi
      .me()
      .then((me) => {
        if (!active || !me) return;
        if (me.csrf_token) setCsrfTokenCache(me.csrf_token);
        const refreshed = toProfile(me);
        localStorage.setItem("auth_user", JSON.stringify(refreshed));
        setUser(refreshed);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem("auth_user");
        setCsrfTokenCache(null);
        setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const handleUnauthorized = () => {
      localStorage.removeItem("auth_user");
      setCsrfTokenCache(null);
      setUser(null);
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      active = false;
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  async function login(email: string, pass: string) {
    const res: any = await authApi.login(email, pass);
    if (res?.csrf_token) setCsrfTokenCache(res.csrf_token);
    const profile = toProfile(res?.user, email);
    localStorage.setItem("auth_user", JSON.stringify(profile));
    setUser(profile);
  }

  async function register(email: string, pass: string) {
    const res: any = await authApi.register(email, pass);
    if (res?.csrf_token) setCsrfTokenCache(res.csrf_token);
    const profile = toProfile(res?.user, email);
    localStorage.setItem("auth_user", JSON.stringify(profile));
    setUser(profile);
  }

  function logout() {
    authApi.logout().catch(() => {});
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    setCsrfTokenCache(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token: null, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
