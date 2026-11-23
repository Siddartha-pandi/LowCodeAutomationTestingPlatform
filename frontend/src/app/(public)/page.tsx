"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, GitBranch, Sparkles, Activity } from "lucide-react";
import { BrowserAutomationLogo } from "@/components/common/BrowserLogo";

export default function PublicLandingPage() {
  return (
    <div className="flex-1 w-full h-full flex flex-col justify-center items-center px-4 sm:px-8 lg:px-12 xl:px-16 py-2 sm:py-4 bg-white dark:bg-black text-black dark:text-white transition-colors duration-200 relative overflow-hidden">
      {/* Subtle Ambient Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-neutral-200/40 dark:from-neutral-900/40 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-4xl xl:max-w-5xl mx-auto flex flex-col items-center text-center space-y-4 sm:space-y-6 md:space-y-7 relative z-10">
        {/* Brand Icon */}
        <div className="p-2 sm:p-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <BrowserAutomationLogo size={44} />
        </div>

        {/* Hero Heading & Subtitle */}
        <div className="space-y-2 sm:space-y-3 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-[1.12]">
            Browser Automation &amp; Testing
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed font-normal">
            Build visual browser workflows, run automated regression tests, and monitor executions in real time.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row items-center justify-center gap-3 w-auto">
          <Link
            href="/dashboard"
            className="px-5 sm:px-6 py-2.5 sm:py-3 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2 text-xs sm:text-sm group"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/login"
            className="px-5 sm:px-6 py-2.5 sm:py-3 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-800 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <span>Sign In</span>
          </Link>
        </div>

        {/* Responsive 3-Card Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-1 sm:pt-2 text-left">
          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/40 backdrop-blur-sm space-y-1.5 hover:border-neutral-400 dark:hover:border-neutral-700 transition">
            <div className="w-8 h-8 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white">
              <GitBranch className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
              Visual Flow Builder
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Drag-and-drop canvas for composing browser steps, conditionals, and loops.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/40 backdrop-blur-sm space-y-1.5 hover:border-neutral-400 dark:hover:border-neutral-700 transition">
            <div className="w-8 h-8 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
              Self-Healing Tests
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Automatic locator recovery keeps your test suites reliable when UI elements change.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/40 backdrop-blur-sm space-y-1.5 hover:border-neutral-400 dark:hover:border-neutral-700 transition">
            <div className="w-8 h-8 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
              Live Execution
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Observe browser runs live with step logs, screenshots, and DOM inspection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
