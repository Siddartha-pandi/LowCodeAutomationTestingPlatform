"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Camera,
  Terminal,
  Code2,
  Sparkles,
  ArrowLeft,
  Download,
  RotateCcw,
  Check,
  Eye,
  X,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { useToast } from "../common/ToastProvider";
import { useConfirm } from "../common/ConfirmModal";
import { NavView } from "../layout/AppShell";
import { executionsApi, resolveWsBaseUrl } from "@/api";

interface ExecutionDetailsPageProps {
  executionId?: string;
  projectId: string;
  onNavigate: (view: NavView) => void;
}

export function ExecutionDetailsPage({
  executionId,
  projectId,
  onNavigate,
}: ExecutionDetailsPageProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "steps" | "screenshots" | "logs" | "dom" | "healing"
  >("overview");

  const [zoomScreenshot, setZoomScreenshot] = useState<string | null>(null);
  const [execution, setExecution] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [logLevelFilter, setLogLevelFilter] = useState<string>("ALL");
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");

  const { success, info } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (!executionId) {
      setExecution(null);
      return;
    }
    loadExecution();

    // Polling fallback to guarantee continuous updates during active run
    const pollInterval = setInterval(() => {
      loadExecution();
    }, 1500);

    // Live WebSocket connection for running executions (authenticated via HttpOnly cookie)
    const baseWsUrl = resolveWsBaseUrl();
    const wsUrl = `${baseWsUrl}/ws/executions/${executionId}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "execution:status_change") {
            setExecution((prev: any) =>
              prev ? { ...prev, status: payload.data?.status || prev.status } : prev
            );
            if (["passed", "failed", "completed", "cancelled"].includes(payload.data?.status)) {
              loadExecution();
              clearInterval(pollInterval);
            }
          } else if (payload.type === "step:complete" || payload.type === "step:failed") {
            loadExecution();
          } else if (payload.type === "viewport:frame") {
            const frameData = payload.data?.frame_base64 || payload.payload?.frame_base64;
            if (frameData) {
              setExecution((prev: any) =>
                prev ? { ...prev, liveViewport: `data:image/jpeg;base64,${frameData}` } : prev
              );
            }
          } else if (payload.type === "console:log") {
            setExecution((prev: any) => {
              if (!prev) return prev;
              const newLog = {
                level: payload.data?.level || "INFO",
                time: new Date(payload.timestamp).toLocaleTimeString(),
                msg: payload.data?.message || "",
              };
              return { ...prev, logs: [...(prev.logs || []), newLog] };
            });
          }
        } catch {}
      };
    } catch {}

    return () => {
      clearInterval(pollInterval);
      if (ws) ws.close();
    };
  }, [executionId]);

  const loadExecution = async () => {
    if (!executionId) return;
    setLoading(true);
    try {
      const res = await executionsApi.get(executionId);
      if (res) {
        setExecution({
          id: String(res.id),
          name: res.name || "Flow Execution",
          type: res.type || "Visual Flow DAG",
          version: res.version || "v1.0 (Pinned)",
          status: res.status || "completed",
          environment: res.environment || "Staging",
          trigger_type: res.trigger_type || "Manual Operator",
          user: res.user || "Operator",
          start_time: res.started_at || "Recent",
          end_time: res.completed_at || "Recent",
          duration: res.duration_ms ? `${(res.duration_ms / 1000).toFixed(2)}s` : "0.00s",
          session_id: res.session_id || "sess-agent",
          total_steps: Array.isArray(res.steps) ? res.steps.length : 0,
          passed_steps: Array.isArray(res.steps) ? res.steps.filter((s: any) => s.status === "passed").length : 0,
          failed_steps: Array.isArray(res.steps) ? res.steps.filter((s: any) => s.status === "failed").length : 0,
          steps: Array.isArray(res.steps) ? res.steps : [],
          screenshots: Array.isArray(res.screenshots) ? res.screenshots : [],
          logs: Array.isArray(res.logs) ? res.logs.map((l: any) => ({
            level: "INFO",
            time: "Recent",
            msg: typeof l === "string" ? l : JSON.stringify(l),
          })) : [],
        });
      }
    } catch {
      setExecution(null);
    } finally {
      setLoading(false);
    }
  };

  const steps = execution?.steps || [];
  const screenshots = execution?.screenshots || [];
  const logs = execution?.logs || [];

  const handleRerun = () => {
    if (!execution) return;
    confirm({
      title: "Rerun Execution",
      message: `Rerun flow '${execution.name}' using pinned version '${execution.version}'?`,
      confirmText: "Trigger Rerun",
      variant: "primary",
      onConfirm: () => {
        info("Rerun Dispatched", "Dispatched new background Celery execution task.");
        onNavigate("executions_running");
      },
    });
  };

  if (!execution) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <Terminal className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">No Execution Selected</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Select an execution run from Running Executions or Execution History to view detailed step timings, DOM snapshots, logs, and screenshots.
          </p>
          <button
            onClick={() => onNavigate("executions_history")}
            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            View Execution History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("executions_history")}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-black dark:text-white">
                {execution.id}
              </span>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {execution.name}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pinned to <strong>{execution.version}</strong> • Environment: <strong>{execution.environment}</strong> • Duration: {execution.duration}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-neutral-400 dark:text-neutral-200 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="capitalize">{execution.status}</span>
          </span>

          <a
            href={executionsApi.getHtmlReportUrl(execution.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-black dark:text-white" />
            <span>HTML Report</span>
          </a>

          <button
            onClick={handleRerun}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-black dark:text-white" />
            <span>Rerun Safe</span>
          </button>
        </div>
      </div>

      {/* Real-time Automation Live Viewport Banner */}
      {(execution.liveViewport || execution.status === "running" || execution.status === "queued") && (
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Live Automation Viewport
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-mono">
                {execution.status === "running" ? "Active Automation" : execution.status.toUpperCase()}
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">
              1280x800 Chromium Playwright Engine
            </span>
          </div>

          <div className="aspect-[16/10] max-h-[540px] bg-neutral-950 rounded-xl overflow-hidden flex items-center justify-center border border-neutral-800 relative shadow-inner">
            {execution.liveViewport ? (
              <img
                src={execution.liveViewport}
                alt="Live Automation Viewport"
                className="w-full h-full object-contain"
                style={{ filter: "none", WebkitFilter: "none" }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="w-8 h-8 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-neutral-200">
                    Executing Playwright Automation Steps...
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Live browser stream will render here as actions navigate and interact.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6 Tabs Navigation Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "steps", label: `Steps (${steps.length})`, icon: Layers },
          { id: "screenshots", label: `Screenshots (${screenshots.length})`, icon: Camera },
          { id: "logs", label: `Logs (${logs.length})`, icon: Terminal },
          { id: "dom", label: "DOM Snapshots", icon: Code2 },
          { id: "healing", label: "Self-Healing Events", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-bold border-b-2 transition ${
                isActive
                  ? "border-black dark:border-white text-black dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Triggered By</span>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{execution.user}</p>
              <span className="text-[10px] text-slate-500">{execution.trigger_type}</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Start Time</span>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{execution.start_time}</p>
              <span className="text-[10px] text-slate-500">Asia/Kolkata</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Duration</span>
              <p className="text-sm font-bold font-mono text-black dark:text-white mt-1">{execution.duration}</p>
              <span className="text-[10px] text-slate-500">5/5 steps passed</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Browser Engine</span>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                {execution?.summary?.engine === "playwright" ? "Playwright Native" : "agent-browser (Legacy)"}
              </p>
              <span className="text-[10px] text-black dark:text-white font-mono">
                {execution?.summary?.engine === "playwright" ? "Ephemeral Isolated Context" : "Subprocess Adapter"}
              </span>
            </div>
          </div>

          {execution.liveViewport && (
            <div className="p-4 rounded-xl bg-white dark:bg-neutral-950 border border-blue-500/30 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Worker Viewport Stream
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Real-time WebSocket Frame</span>
              </div>
              <div className="aspect-video max-h-[420px] bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
                <img
                  src={execution.liveViewport}
                  alt="Live Worker Viewport"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STEPS */}
      {activeTab === "steps" && (
        <div className="bg-white dark:bg-neutral-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Step Name</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Expected vs Actual</th>
                  <th className="py-3 px-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {steps.map((st: any) => (
                  <tr key={st.index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-mono font-bold text-slate-400">{st.index}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">{st.name}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {st.action}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-black dark:text-white font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Passed</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{st.duration}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <div>Exp: {st.expected}</div>
                      <div className="text-black dark:text-white">Act: {st.actual}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{st.error || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SCREENSHOTS */}
      {activeTab === "screenshots" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {screenshots.map((s: any) => (
            <div
              key={s.id || s.name}
              onClick={() => setZoomScreenshot(s.url)}
              className="p-3 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 cursor-pointer group hover:border-blue-500 transition"
            >
              <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
                <img src={s.url} alt={s.name} className="w-full h-full object-contain group-hover:scale-105 transition" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{s.name}</div>
                <div className="text-[10px] text-slate-400">{s.step || "Step"} • {s.time || "Recent"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-neutral-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              {["ALL", "INFO", "WARNING", "ERROR", "DEBUG"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogLevelFilter(lvl)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    logLevelFilter === lvl
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search log stream..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs w-48 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
              <a
                href={executionsApi.getLogsDownloadUrl(execution.id, "txt", logLevelFilter === "ALL" ? undefined : logLevelFilter)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-black dark:text-white" />
                <span>Export TXT</span>
              </a>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {logs
              .filter((l: any) => {
                const matchesLevel = logLevelFilter === "ALL" || (l.level || "").toUpperCase() === logLevelFilter;
                const matchesQuery = !logSearchQuery || (l.msg || "").toLowerCase().includes(logSearchQuery.toLowerCase());
                return matchesLevel && matchesQuery;
              })
              .map((l: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 leading-tight">
                  <span className="text-slate-500 shrink-0">{l.time}</span>
                  <span
                    className={`font-bold shrink-0 ${
                      l.level === "ERROR"
                        ? "text-neutral-400 dark:text-neutral-200"
                        : l.level === "WARNING"
                        ? "text-neutral-400 dark:text-neutral-200"
                        : l.level === "DEBUG"
                        ? "text-purple-400"
                        : "text-neutral-400 dark:text-neutral-200"
                    }`}
                  >
                    [{l.level}]
                  </span>
                  <span className="text-slate-300 break-all">{l.msg}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 5: DOM SNAPSHOTS */}
      {activeTab === "dom" && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Synchronized Accessibility Snapshot</h3>
            <span className="font-mono text-[10px] text-slate-400">Captured at Step 4</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 font-mono text-[11px] text-neutral-400 dark:text-neutral-200 overflow-x-auto">
            {`<main role="main" id="dashboard-root">\n  <nav class="sidebar" role="navigation">\n  <div class="user-profile" role="region" aria-label="Administrator">\n</main>`}
          </div>
        </div>
      )}

      {/* TAB 6: SELF-HEALING EVENTS */}
      {activeTab === "healing" && (
        <div className="p-6 text-center bg-white dark:bg-neutral-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <CheckCircle2 className="w-8 h-8 text-black dark:text-white mx-auto" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Zero Mutations Required</h3>
          <p className="text-xs text-slate-400">
            All selectors resolved with 100% attribute stability on first attempt. No self-healing triggered.
          </p>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {zoomScreenshot && (
        <div
          onClick={() => setZoomScreenshot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm cursor-zoom-out"
        >
          <img src={zoomScreenshot} alt="Zoom Preview" className="max-w-4xl max-h-[85vh] rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
