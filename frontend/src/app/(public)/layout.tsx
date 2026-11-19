"use client";

import React from "react";
import Link from "next/link";
import { Shield, Terminal, ArrowRight, Sun, Moon, CheckCircle } from "lucide-react";
import { useTheme } from "@/components/common/ThemeProvider";
import { BrowserAutomationLogo } from "@/components/common/BrowserLogo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      {/* Public Navigation Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-black/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <BrowserAutomationLogo size={36} />
              <div className="flex flex-col">
                <span className="font-semibold text-base tracking-tight text-black dark:text-white leading-tight">
                  AutomationTesting<span className="text-black dark:text-white underline decoration-neutral-400 dark:decoration-neutral-500">WithAgentBrowser</span>
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Enterprise Flow & Testing Automation</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-300 text-xs font-medium">
              <Shield className="w-3.5 h-3.5 text-black dark:text-white" />
              <span>Zero-AI Policy Compliant</span>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition"
              title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-black" />}
            </button>

            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition"
            >
              Sign In
            </Link>

            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Public Content */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Public Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-neutral-500 dark:text-neutral-400 text-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrowserAutomationLogo size={24} />
            <span>&copy; {new Date().getFullYear()} AutomationTestingWithAgentBrowser. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-300 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>100% Deterministic Rule Engine</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-300 font-medium">
              <Terminal className="w-3.5 h-3.5" />
              <span>Agent Browser CLI v0.41.2</span>
            </div>
            <span className="text-neutral-500">Confidential Corporate Deployment</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
