"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AppContextProvider, useApp } from "@/context/AppContext";
import { AppShell } from "@/components/layout/AppShell";

function AuthenticatedShellWrapper({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { currentView, setCurrentView, currentProject } = useApp();

  return (
    <AppShell
      currentView={currentView}
      onNavigate={setCurrentView}
      user={user}
      onLogout={logout}
      currentProject={currentProject}
    >
      {children}
    </AppShell>
  );
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black flex flex-col items-center justify-center text-black dark:text-white space-y-4 transition-colors duration-200">
        <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Verifying security token and permissions...
        </div>
        <div className="text-xs text-neutral-500 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-black dark:text-white" />
          <span>Zero-AI Policy Compliant &bull; Agent Browser Engine</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black flex items-center justify-center p-6 text-black dark:text-white transition-colors duration-200">
        <div className="max-w-md w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-center mx-auto text-black dark:text-white">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-black dark:text-white">
              Authentication Required
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              You must be signed in with an active enterprise session to access this workspace.
            </p>
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-600 dark:text-neutral-400 text-left space-y-1">
            <div className="font-semibold text-neutral-800 dark:text-neutral-300">Security Requirement:</div>
            <div>Valid OAuth2 JWT Bearer Token or corporate session cookie required.</div>
          </div>

          <button
            onClick={() => router.push("/login")}
            className="w-full py-3 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
          >
            <span>Proceed to Enterprise Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppContextProvider>
      <AuthenticatedShellWrapper>{children}</AuthenticatedShellWrapper>
    </AppContextProvider>
  );
}
