"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  Lock,
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Maximize2,
  Minimize2,
  Layers,
  ArrowLeft,
  ChevronRight,
  Eye,
  Monitor,
  MousePointer,
  Edit3,
  CheckSquare,
  ArrowDown,
  ExternalLink,
} from "lucide-react";
import { flowsApi, executionsApi } from "@/api";
import { useToast } from "../common/ToastProvider";
import { NavView } from "../layout/AppShell";

interface FlowLiveRunnerPageProps {
  flowId?: string;
  executionId?: string;
  projectId: string;
  onNavigate: (view: NavView) => void;
}

export function FlowLiveRunnerPage({
  flowId,
  executionId: initialExecutionId,
  projectId,
  onNavigate,
}: FlowLiveRunnerPageProps) {
  const [activeExecId, setActiveExecId] = useState<string>(initialExecutionId || "");
  const [flow, setFlow] = useState<any | null>(null);
  const [execution, setExecution] = useState<any | null>(null);
  const [status, setStatus] = useState<"queued" | "running" | "passed" | "failed" | "idle">("idle");
  const [liveViewport, setLiveViewport] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [isHeadless, setIsHeadless] = useState<boolean>(true);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentStepInfo, setCurrentStepInfo] = useState<any | null>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [logs, setLogs] = useState<{ time: string; msg: string; level: string }[]>([]);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [consoleOpen, setConsoleOpen] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"fit" | "scroll">("scroll");

  const { success, error, warning, info } = useToast();
  const timerRef = useRef<any>(null);

  // 1. Read URL query parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const eid = params.get("executionId") || params.get("id");
      const fid = params.get("flowId");
      const hl = params.get("headless");
      if (eid && !activeExecId) setActiveExecId(eid);
      if (hl !== null) setIsHeadless(hl !== "false");
    }
  }, []);

  // 2. Fetch flow definition if flowId available
  useEffect(() => {
    const fid = flowId || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("flowId") : null);
    if (!fid) return;

    flowsApi
      .get(fid)
      .then((f) => {
        if (!f) return;
        setFlow(f);
        const def = f.definition || f.current_version?.definition_json;
        if (def && Array.isArray(def.nodes)) {
          const actionNodes = def.nodes.filter((n: any) => n.type !== "start" && n.type !== "stop" && n.type !== "end");
          const formattedSteps = actionNodes.map((n: any, idx: number) => ({
            id: n.id,
            index: idx + 1,
            action: n.action || n.type || "action",
            selector: n.config?.selector || n.config?.target?.selector || "",
            url: n.config?.url || n.config?.target?.url || "",
            value: n.config?.value || n.config?.value_template || n.config?.text || "",
            status: "pending",
            duration: null,
          }));
          setSteps(formattedSteps);

          // Find initial URL
          const navNode = actionNodes.find((n: any) => n.action === "navigate" || n.type === "navigate");
          const urlFound = navNode?.config?.url || navNode?.config?.target?.url || "";
          if (urlFound) {
            setTargetUrl(urlFound);
            setCurrentUrl(urlFound);
          }
        }
      })
      .catch(() => {});
  }, [flowId]);

  // 3. Connect to WebSocket & Poll execution
  useEffect(() => {
    if (!activeExecId) return;

    setStatus("running");
    setIsRunning(true);

    const token = typeof window !== "undefined"
      ? localStorage.getItem("auth_token") || localStorage.getItem("token") || ""
      : "";
    const wsProto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const wsUrl = `${wsProto}//${wsHost}:8000/ws/executions/${activeExecId}?token=${encodeURIComponent(token)}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        console.log("[LiveRunner WS] Connected to execution:", activeExecId);
      };
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const pData = payload.data || payload.payload || {};

          if (payload.type === "execution:status_change") {
            const newStatus = pData.status;
            if (newStatus) {
              setStatus(newStatus);
              if (["passed", "failed", "completed", "cancelled"].includes(newStatus)) {
                setIsRunning(false);
              }
            }
          } else if (payload.type === "step:start") {
            const nodeId = pData.node_id;
            setCurrentStepInfo(pData);
            setSteps((prev) =>
              prev.map((s) => (s.id === nodeId ? { ...s, status: "running" } : s))
            );
          } else if (payload.type === "step:complete" || payload.type === "step:failed") {
            const nodeId = pData.node_id;
            const stepStatus = payload.type === "step:failed" ? "failed" : "passed";
            const dur = pData.duration_ms ? `${(pData.duration_ms / 1000).toFixed(2)}s` : "0.1s";
            if (pData.url) setCurrentUrl(pData.url);
            setSteps((prev) =>
              prev.map((s) =>
                s.id === nodeId ? { ...s, status: stepStatus, duration: dur, error: pData.error } : s
              )
            );
          } else if (payload.type === "viewport:frame") {
            const frameData = pData.frame_base64 || payload.frame_base64;
            if (frameData) {
              setLiveViewport(`data:image/jpeg;base64,${frameData}`);
            }
            if (pData.url) setCurrentUrl(pData.url);
          } else if (payload.type === "console:log") {
            setLogs((prev) => [
              ...prev,
              {
                time: new Date().toLocaleTimeString(),
                msg: pData.message || "",
                level: pData.level || "INFO",
              },
            ]);
          }
        } catch {}
      };
    } catch {}

    // Polling fallback
    const pollInterval = setInterval(async () => {
      try {
        const res = await executionsApi.get(activeExecId);
        if (res) {
          setExecution(res);
          if (res.status) setStatus(res.status);
          if (["passed", "failed", "completed", "cancelled"].includes(res.status)) {
            setIsRunning(false);
            clearInterval(pollInterval);
          }
          if (Array.isArray(res.steps) && res.steps.length > 0) {
            setSteps((prev) =>
              prev.map((s) => {
                const match = res.steps.find((rs: any) => rs.nodeId === s.id || rs.node_id === s.id);
                if (match) {
                  return {
                    ...s,
                    status: match.status,
                    duration: match.durationMs ? `${(match.durationMs / 1000).toFixed(2)}s` : s.duration,
                    error: match.errorMessage,
                  };
                }
                return s;
              })
            );
          }
        }
      } catch {}
    }, 1500);

    return () => {
      if (ws) ws.close();
      clearInterval(pollInterval);
    };
  }, [activeExecId]);

  // Timer for elapsed seconds
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Start / Re-run flow
  const handleRunFlow = async (headedMode = !isHeadless) => {
    const fid = flowId || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("flowId") : null);
    if (!fid) {
      error("Cannot Execute", "No Flow ID provided.");
      return;
    }

    setIsRunning(true);
    setStatus("running");
    setElapsedSeconds(0);
    setLiveViewport(null);
    setLogs([]);
    setSteps((prev) => prev.map((s) => ({ ...s, status: "pending", duration: null, error: null })));

    try {
      info("Launching Flow", `Starting automation in ${headedMode ? "Headed (Visible)" : "Headless (Live Viewport)"} mode...`);
      const res = await flowsApi.execute(fid, { headless: !headedMode, async_exec: false });
      const newExecId = res.execution_id || res.id;
      if (newExecId) {
        setActiveExecId(newExecId);
        success("Flow Active", `Session started for '${flow?.name || "Flow"}'.`);
      }
    } catch (err: any) {
      error("Execution Failed", err.message || "Failed to start flow.");
      setStatus("failed");
      setIsRunning(false);
    }
  };

  // Auto-start on mount if flowId is present and not currently running or attached to an execution
  const autostartRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || autostartRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const eid = params.get("executionId") || params.get("id");
    const fid = params.get("flowId") || flowId;
    if (eid) {
      if (!activeExecId) setActiveExecId(eid);
      autostartRef.current = true;
      return;
    }
    if (fid && !activeExecId && !isRunning) {
      autostartRef.current = true;
      const hlParam = params.get("headless");
      const headed = hlParam === "false";
      // Allow brief timeout for flow definition to load
      setTimeout(() => {
        handleRunFlow(headed);
      }, 350);
    }
  }, [flowId, activeExecId]);

  const getActionIcon = (act: string) => {
    switch (act) {
      case "navigate": return <Globe className="w-3.5 h-3.5 text-black dark:text-white" />;
      case "click":
      case "double_click":
      case "right_click": return <MousePointer className="w-3.5 h-3.5 text-black dark:text-white" />;
      case "fill":
      case "type":
      case "press_key": return <Edit3 className="w-3.5 h-3.5 text-black dark:text-white" />;
      case "check":
      case "uncheck": return <CheckSquare className="w-3.5 h-3.5 text-black dark:text-white" />;
      case "scroll":
      case "scroll_into_view": return <ArrowDown className="w-3.5 h-3.5 text-black dark:text-white" />;
      default: return <Play className="w-3.5 h-3.5 text-black dark:text-white" />;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex flex-col h-full w-full bg-neutral-100 dark:bg-black select-none ${fullscreen ? "fixed inset-0 z-50 p-2" : "p-4 space-y-3"}`}>
      {/* 1. TOP BROWSER WINDOW CHROME */}
      <div className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("automation_builder")}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-300 transition"
            title="Back to Flow Builder"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-neutral-900 dark:text-white">
              {flow?.name || "Live Flow Automation"}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              ({steps.length} Steps)
            </span>
          </div>
        </div>

        {/* Browser URL Display Bar */}
        <div className="flex-1 max-w-xl mx-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-800 dark:text-neutral-200">
          <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="truncate flex-1">
            {currentUrl || targetUrl || "https://..."}
          </span>
          {currentUrl && (
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-neutral-400 hover:text-black dark:hover:text-white shrink-0"
              title="Open website directly in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Headless / Headed Toggle & Controls */}
        <div className="flex items-center gap-2">
          {/* Headless / Headed Selector */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold">
            <button
              onClick={() => {
                setIsHeadless(true);
                if (!isRunning) handleRunFlow(false);
              }}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                isHeadless
                  ? "bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs font-bold"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
              title="Headless Mode: streams viewport frames smoothly inside this view"
            >
              <Eye className="w-3 h-3" />
              <span>Headless</span>
            </button>
            <button
              onClick={() => {
                setIsHeadless(false);
                if (!isRunning) handleRunFlow(true);
              }}
              className={`px-2.5 py-1 rounded-md transition flex items-center gap-1.5 ${
                !isHeadless
                  ? "bg-white dark:bg-neutral-800 text-black dark:text-white shadow-xs font-bold"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
              title="Headed Mode: opens physical Chromium window if desktop environment is active"
            >
              <Monitor className="w-3 h-3" />
              <span>Headed</span>
            </button>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs font-mono">
            {status === "running" && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-neutral-900 dark:text-white">RUNNING</span>
                <span className="text-neutral-500">{formatSeconds(elapsedSeconds)}</span>
              </>
            )}
            {status === "passed" && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">PASSED</span>
              </>
            )}
            {status === "failed" && (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-bold text-rose-600 dark:text-rose-400">FAILED</span>
              </>
            )}
            {status === "idle" && (
              <>
                <span className="w-2 h-2 rounded-full bg-neutral-400" />
                <span className="text-neutral-500">READY</span>
              </>
            )}
          </div>

          {/* Action Button: Rerun / Start */}
          <button
            onClick={() => handleRunFlow(!isHeadless)}
            disabled={isRunning}
            className="px-3 py-1.5 rounded-lg bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isRunning ? "Running..." : "Re-run Flow"}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setFullscreen((f) => !f)}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-300 transition"
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen Viewport"}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: Viewport (Left) + Steps Checklist (Right) */}
      <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
        {/* LEFT: Full Live Browser Viewport */}
        <div className="flex-1 flex flex-col bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm relative">
          {/* Viewport Top Bar */}
          <div className="px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/50 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>PLAYWRIGHT BROWSER VIEWPORT</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === "fit" ? "scroll" : "fit"))}
                className="px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 font-sans text-[11px] font-semibold transition cursor-pointer"
                title={viewMode === "fit" ? "Switch to 100% natural scrollable view" : "Fit whole page into window"}
              >
                {viewMode === "fit" ? "Fit to Screen" : "100% Scrollable"}
              </button>
              <span>1280 × 800 px</span>
            </div>
          </div>

          {/* Viewport Screen */}
          <div className="flex-1 bg-neutral-950 flex items-start justify-center overflow-auto p-2 relative scrollbar-thin">
            {liveViewport ? (
              <img
                src={liveViewport}
                alt="Live Website Viewport"
                className={`select-none rounded shadow-2xl ${
                  viewMode === "fit"
                    ? "w-full h-full object-contain pointer-events-none"
                    : "w-full max-w-full h-auto object-top pointer-events-none"
                }`}
                style={{ filter: "none", WebkitFilter: "none" }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center max-w-sm">
                <div className="w-9 h-9 border-2 border-neutral-500 border-t-white rounded-full animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {isRunning ? "Automating Browser Actions..." : "Ready to Automate"}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {currentUrl || targetUrl
                      ? `Targeting ${currentUrl || targetUrl}. Real-time browser frames will appear here.`
                      : "Click 'Start Automation' to launch this flow."}
                  </p>
                </div>
                {!isRunning && (
                  <button
                    onClick={() => handleRunFlow(!isHeadless)}
                    className="mt-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Start Automation Now</span>
                  </button>
                )}
              </div>
            )}

            {/* Floating Current Action Badge */}
            {isRunning && currentStepInfo && (
              <div className="absolute bottom-4 left-4 bg-black/85 backdrop-blur-md border border-white/20 text-white px-3.5 py-1.5 rounded-lg text-xs font-mono shadow-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="capitalize font-bold">{currentStepInfo.action || "Action"}</span>
                {currentStepInfo.node_id && (
                  <span className="text-neutral-400 text-[10px]">({currentStepInfo.node_id})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Steps Checklist Panel */}
        <div className="w-80 flex flex-col bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm shrink-0">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <span className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-black dark:text-white" />
              <span>Flow Steps Execution</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 font-mono font-bold text-neutral-700 dark:text-neutral-300">
              {steps.filter((s) => s.status === "passed").length} / {steps.length}
            </span>
          </div>

          {/* Steps List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin text-xs">
            {steps.length === 0 ? (
              <div className="p-6 text-center text-neutral-400 text-xs">
                No steps found in flow definition.
              </div>
            ) : (
              steps.map((st) => (
                <div
                  key={st.id || st.index}
                  className={`p-2.5 rounded-lg border transition ${
                    st.status === "running"
                      ? "border-black dark:border-white bg-neutral-50 dark:bg-neutral-900 ring-1 ring-neutral-400/20"
                      : st.status === "passed"
                      ? "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 opacity-90"
                      : st.status === "failed"
                      ? "border-rose-400 bg-rose-50/20 dark:bg-rose-950/20"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white truncate">
                      <span className="font-mono text-[10px] text-neutral-400 w-4">{st.index}.</span>
                      {getActionIcon(st.action)}
                      <span className="capitalize truncate">{st.action.replace(/_/g, " ")}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {st.status === "passed" && (
                        <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{st.duration || "✓"}</span>
                        </div>
                      )}
                      {st.status === "running" && (
                        <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-black dark:border-t-white rounded-full animate-spin" />
                      )}
                      {st.status === "failed" && (
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      )}
                      {st.status === "pending" && (
                        <span className="text-[10px] text-neutral-400 font-mono">wait</span>
                      )}
                    </div>
                  </div>

                  {/* Step Target or Value */}
                  <div className="mt-1 text-[11px] text-neutral-500 font-mono truncate pl-6">
                    {st.url || st.selector || (st.value ? `Value: "${st.value}"` : st.action)}
                  </div>
                  {st.error && (
                    <div className="mt-1 text-[10px] text-rose-500 font-mono pl-6 truncate">
                      {st.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Bottom Console Toggle */}
          <div className="p-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
            <button
              onClick={() => setConsoleOpen((c) => !c)}
              className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-1.5 transition"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{consoleOpen ? "Hide Console" : `Console Logs (${logs.length})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. OPTIONAL BOTTOM CONSOLE DRAWER */}
      {consoleOpen && (
        <div className="h-40 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-3 flex flex-col shadow-sm shrink-0">
          <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
            <span>Playwright Execution Stream</span>
            <button
              onClick={() => setConsoleOpen(false)}
              className="text-neutral-400 hover:text-black dark:hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-[11px] p-2 space-y-1 text-neutral-700 dark:text-neutral-300 scrollbar-thin">
            {logs.length === 0 ? (
              <div className="text-neutral-400">Waiting for browser stdout/stderr...</div>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-neutral-400">[{l.time}]</span>
                  <span className="font-bold text-neutral-500">[{l.level}]</span>
                  <span className="truncate">{l.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
