"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  Terminal,
  Cpu,
  ArrowRight,
  CheckCircle,
  GitBranch,
  Layers,
  Activity,
  Lock,
  Globe,
  Sliders,
  Sparkles,
} from "lucide-react";

export default function PublicLandingPage() {
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-neutral-200/50 dark:from-neutral-800/40 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-neutral-600 dark:bg-neutral-400 animate-pulse" />
            <span>Agent Browser CLI v0.41.2 Native Integration</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-black dark:text-white max-w-4xl mx-auto leading-tight">
            Deterministic Browser Flow & Testing Automation for the Enterprise
          </h1>

          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto font-normal">
            A secure multi-user platform for visual workflow orchestration, comprehensive regression testing, and mathematical self-healing without sending confidential company data to third-party AI services.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Launch Platform</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-black dark:text-white border border-neutral-300 dark:border-neutral-700 font-medium rounded-xl transition flex items-center justify-center gap-2"
            >
              <span>Enterprise Sign In</span>
            </Link>
          </div>

          {/* Compliance Banner */}
          <div className="pt-8 max-w-3xl mx-auto">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center gap-4 text-neutral-800 dark:text-neutral-300 text-xs sm:text-sm font-medium">
              <Shield className="w-5 h-5 shrink-0 text-black dark:text-white" />
              <span>
                <strong>Company AI Policy Mandate:</strong> Strict Zero-AI architecture. No LLM APIs, no third-party telemetry, 100% deterministic rule-based algorithms.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="py-20 bg-neutral-50 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-black dark:text-white">
              Enterprise-Grade Automation Architecture
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
              Engineered with deterministic safety gates, AES-256 encryption, and tamper-resistant audit trails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-black dark:text-white">
                <GitBranch className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-black dark:text-white">Visual Flow Builder</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Drag-and-drop React Flow canvas supporting 15 deterministic action nodes, conditional branching, loops, and live DAG validation.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-black dark:text-white">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-black dark:text-white">Mathematical Self-Healing</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Normalized Levenshtein distances, Jaccard ancestor sets, and ARIA tree semantics with automated tiers and human-in-the-loop approval.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-black dark:text-white">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-black dark:text-white">Vault & Security Governance</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Write-only AES-256-GCM credential encryption, domain whitelisting, RBAC capability matrices, and append-only audit ledgers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
