"use client";

import React from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/common/ThemeProvider";
import { BrowserAutomationLogo } from "@/components/common/BrowserLogo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="h-screen h-dvh flex flex-col bg-white dark:bg-black text-black dark:text-white transition-colors duration-200 overflow-hidden">
      {/* Full-width Responsive Navigation Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800/80 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-50 w-full shrink-0">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <BrowserAutomationLogo size={32} />
            <span className="font-bold text-base sm:text-lg tracking-tight text-neutral-900 dark:text-white group-hover:opacity-80 transition">
              Dolphin Flow
            </span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
              title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-black" />}
            </button>

            <Link
              href="/login"
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition"
            >
              Sign In
            </Link>

            <Link
              href="/dashboard"
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white dark:text-black bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 rounded-xl shadow-xs transition"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Single-Viewport Content (No Scroll) */}
      <main className="flex-1 flex flex-col w-full min-h-0 overflow-hidden">{children}</main>

      {/* Full-width Responsive Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-black text-neutral-500 dark:text-neutral-400 text-xs py-3 sm:py-4 w-full shrink-0">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 flex flex-row items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-2">
            <BrowserAutomationLogo size={18} />
            <span className="text-[11px] sm:text-xs">&copy; {new Date().getFullYear()} Dolphin Flow. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-[11px] sm:text-xs">
            <Link href="/dashboard" className="hover:text-black dark:hover:text-white transition font-medium">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-black dark:hover:text-white transition font-medium">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-black dark:hover:text-white transition font-medium">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
