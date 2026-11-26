"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Compass,
  Play,
  Square,
  RefreshCw,
  Camera,
  Globe,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ExternalLink,
  Laptop,
  Loader2,
  Maximize2,
  MousePointer,
  Type,
  ArrowDown,
  ArrowUp,
  Keyboard,
  CornerDownLeft,
  ChevronDown,
  Sparkles,
  Layers,
  Crosshair,
  Copy,
  History,
  Video,
  Eye,
  Check,
  X,
  Radio,
} from "lucide-react";
import { browserApi, environmentsApi, intelligenceApi } from "@/api";
import { useToast } from "../common/ToastProvider";
import { NavView } from "../layout/AppShell";

interface LiveBrowserPageProps {
  projectId: string;
  onNavigate: (view: NavView) => void;
}

export function LiveBrowserPage({ projectId, onNavigate }: LiveBrowserPageProps) {
  // Session & navigation state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [browserStatus, setBrowserStatus] = useState<"Connected" | "Navigating" | "Idle" | "Terminated">("Idle");
  const [viewportScreenshot, setViewportScreenshot] = useState<string | null>(null);
  const [browserLogs, setBrowserLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageTitle, setPageTitle] = useState("");

  // Environments & dynamic targets
  const [environments, setEnvironments] = useState<any[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>("");
  const [recentUrls, setRecentUrls] = useState<string[]>([]);

  // Interactive Viewport Controls
  const [interactionMode, setInteractionMode] = useState<"click" | "dblclick" | "input" | "hover" | "inspect">("click");
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);
  const [clickIndicator, setClickIndicator] = useState<{ x: number; y: number; id: number } | null>(null);

  // Quick direct text input
  const [quickInputText, setQuickInputText] = useState("");

  // Input Popover modal
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [targetCoords, setTargetCoords] = useState<{ x: number; y: number } | null>(null);
  const [modalInputValue, setModalInputValue] = useState("");
  const [pressEnterOnSubmit, setPressEnterOnSubmit] = useState(true);

  // Inspect mode element details
  const [inspectedElement, setInspectedElement] = useState<any | null>(null);

  // Live Auto-Refresh Stream
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(2000);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sessionIdRef = useRef<string>("");
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const viewportImgRef = useRef<HTMLImageElement | null>(null);
  const { success, error, warning, info } = useToast();

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Load environments dynamically for current project
  useEffect(() => {
    const loadEnvironments = async () => {
      try {
        const envList = await environmentsApi.list(projectId);
        if (envList && envList.length > 0) {
          setEnvironments(envList);
          const defaultEnv = envList[0];
          setSelectedEnvId(String(defaultEnv.id));
          if (defaultEnv.base_url && !inputUrl) {
            setInputUrl(defaultEnv.base_url);
          }
        } else {
          setEnvironments([]);
          if (!inputUrl) {
            setInputUrl("");
          }
        }
      } catch {
        setEnvironments([]);
        if (!inputUrl) {
          setInputUrl("");
        }
      }
    };

    loadEnvironments();

    // Load recent URLs from localStorage
    try {
      const stored = localStorage.getItem(`recent_urls_${projectId}`);
      if (stored) {
        setRecentUrls(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, [projectId]);

  // Clean up session and timer on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
      if (sessionIdRef.current) {
        browserApi.close(sessionIdRef.current).catch(() => {});
      }
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [browserLogs]);

  // Auto-refresh polling loop
  useEffect(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    if (autoRefresh && sessionActive && sessionId) {
      autoRefreshTimerRef.current = setInterval(async () => {
        if (!sessionIdRef.current || isLoading) return;
        try {
          const res = await browserApi.getViewport(sessionIdRef.current);
          if (res?.image_base64) {
            setViewportScreenshot(res.image_base64);
          }
        } catch {
          // ignore auto-refresh transient failure
        }
      }, refreshIntervalMs);
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh, sessionActive, sessionId, refreshIntervalMs, isLoading]);

  const addLog = (tag: string, message: string) => {
    const time = new Date().toLocaleTimeString();
    setBrowserLogs((prev) => [...prev, `[${time}] [${tag}] ${message}`]);
  };

  const saveRecentUrl = (url: string) => {
    try {
      const updated = Array.from(new Set([url, ...recentUrls])).slice(0, 5);
      setRecentUrls(updated);
      localStorage.setItem(`recent_urls_${projectId}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const ensureSession = async (): Promise<string> => {
    if (sessionActive && sessionIdRef.current) {
      return sessionIdRef.current;
    }
    setIsLoading(true);
    addLog("SESSION", "Spawning new isolated browser process...");
    try {
      const res = await browserApi.launch({
        project_id: projectId || undefined,
        allowed_domains: ["*"],
      });
      const newId = res.session_id;
      setSessionId(newId);
      sessionIdRef.current = newId;
      setSessionActive(true);
      setBrowserStatus("Connected");
      addLog("SESSION", `Isolated browser session initialized (${newId}).`);
      success("Browser Started", `Session ${newId} ready.`);
      return newId;
    } catch (err: any) {
      addLog("ERROR", `Failed to launch browser: ${err.message}`);
      error("Launch Error", err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async () => {
    try {
      await ensureSession();
    } catch {
      // Error handled in ensureSession
    }
  };

  const handleStopSession = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setAutoRefresh(false);
    addLog("SESSION", `Terminating session ${sessionId}...`);
    try {
      await browserApi.close(sessionId);
      setSessionActive(false);
      setSessionId("");
      sessionIdRef.current = "";
      setBrowserStatus("Terminated");
      setViewportScreenshot(null);
      setPageTitle("");
      setInspectedElement(null);
      addLog("SESSION", "Browser subprocess exited cleanly.");
      warning("Session Terminated", "Browser process closed.");
    } catch (err: any) {
      addLog("ERROR", `Error closing session: ${err.message}`);
      error("Close Error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = async (e?: React.FormEvent, customTarget?: string) => {
    if (e) e.preventDefault();

    let target = (customTarget || inputUrl).trim();
    if (!target) return;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
      setInputUrl(target);
    }

    try {
      setIsLoading(true);
      const activeId = await ensureSession();

      setBrowserStatus("Navigating");
      addLog("NAVIGATE", `Navigating to ${target}...`);
      info("Navigating", `Requesting ${target}...`);

      const startTime = performance.now();
      const res = await browserApi.navigate(activeId, target, 35);
      const duration = Math.round(performance.now() - startTime);

      setCurrentUrl(res.url || target);
      if (res.title) setPageTitle(res.title);
      setBrowserStatus("Connected");
      saveRecentUrl(res.url || target);

      if (res.image_base64) {
        setViewportScreenshot(res.image_base64);
        addLog("VIEWPORT", `Live frame rendered (${res.url || target}) in ${duration}ms.`);
      } else {
        // Fallback: request screenshot explicitly
        try {
          const shot = await browserApi.screenshot(activeId);
          if (shot.image_base64) {
            setViewportScreenshot(shot.image_base64);
            addLog("VIEWPORT", `Live frame captured via snapshot.`);
          }
        } catch {
          // Ignore fallback error
        }
      }

      addLog("NAVIGATE", `Page loaded: ${target} (${duration}ms).`);
      success("Page Loaded", `Viewport updated for ${target}`);
    } catch (err: any) {
      setBrowserStatus("Connected");
      addLog("ERROR", `Navigation failed: ${err.message}`);
      error("Navigation Failed", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeScreenshot = async () => {
    if (!sessionId) {
      error("No Active Session", "Please start or navigate first.");
      return;
    }
    setIsLoading(true);
    addLog("SCREENSHOT", "Requesting full viewport frame from agent-browser...");
    try {
      const res = await browserApi.screenshot(sessionId, { full_page: false });
      if (res.image_base64) {
        setViewportScreenshot(res.image_base64);
      }
      addLog("SCREENSHOT", `Captured live viewport frame (${res.file_size || 0} bytes).`);
      success("Screenshot Captured", "Viewport frame refreshed.");
    } catch (err: any) {
      addLog("ERROR", `Screenshot failed: ${err.message}`);
      error("Screenshot Failed", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Viewport Coordinates calculation based on natural 1280x800 resolution
  const calculateViewportCoords = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    return {
      x: Math.max(0, Math.min(1280, x)),
      y: Math.max(0, Math.min(800, y)),
      clientX: e.clientX - rect.left,
      clientY: e.clientY - rect.top,
    };
  };

  const handleViewportMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const coords = calculateViewportCoords(e);
    setCursorCoords({ x: coords.x, y: coords.y });
  };

  // Interactive Viewport Click Execution
  const handleViewportClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!sessionId) {
      info("No Session", "Starting session and navigating first...");
      await handleNavigate();
      return;
    }

    const { x, y, clientX, clientY } = calculateViewportCoords(e);
    setClickIndicator({ x: clientX, y: clientY, id: Date.now() });

    if (interactionMode === "input") {
      setTargetCoords({ x, y });
      setModalInputValue("");
      setInputModalOpen(true);
      return;
    }

    if (interactionMode === "inspect") {
      setIsLoading(true);
      addLog("INSPECT", `Inspecting element at (${x}, ${y})...`);
      try {
        // Extract DOM or element recognition
        const dom = await intelligenceApi.extractDom(sessionId);
        setInspectedElement({
          coords: { x, y },
          url: currentUrl,
          captured_at: new Date().toLocaleTimeString(),
          dom_summary: dom ? `Found ${dom.elements_count || "active"} elements in DOM` : "Element localized",
        });
        addLog("INSPECT", `Element localized at coordinate (${x}, ${y}).`);
        success("Element Inspected", `Coordinates (${x}, ${y}) identified.`);
      } catch (err: any) {
        addLog("ERROR", `Inspection failed: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Default: Click or Double Click
    const actionName = interactionMode === "dblclick" ? "dblclick" : "click";
    setIsLoading(true);
    addLog("ACTION", `Dispatching ${actionName} at coordinate (${x}, ${y})...`);

    try {
      const startTime = performance.now();
      const res = await browserApi.action(sessionId, {
        action: actionName,
        x,
        y,
      });
      const duration = Math.round(performance.now() - startTime);

      if (res.image_base64) {
        setViewportScreenshot(res.image_base64);
      }
      if (res.current_url && res.current_url !== currentUrl) {
        setCurrentUrl(res.current_url);
        saveRecentUrl(res.current_url);
      }
      if (res.title) {
        setPageTitle(res.title);
      }

      addLog("ACTION", `${actionName.toUpperCase()} dispatched (${x}, ${y}) in ${duration}ms.`);
    } catch (err: any) {
      addLog("ERROR", `Action failed: ${err.message}`);
      error("Action Error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Text Fill from Modal
  const handleModalSubmitInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCoords || !sessionId) return;

    setInputModalOpen(false);
    setIsLoading(true);
    addLog("FILL", `Typing "${modalInputValue}" at (${targetCoords.x}, ${targetCoords.y})...`);

    try {
      const res = await browserApi.action(sessionId, {
        action: "fill",
        x: targetCoords.x,
        y: targetCoords.y,
        text: modalInputValue,
      });

      if (pressEnterOnSubmit) {
        await browserApi.action(sessionId, {
          action: "press",
          value: "Enter",
        });
        addLog("KEY", "Dispatched [Enter] key press.");
      }

      if (res?.image_base64) {
        setViewportScreenshot(res.image_base64);
      } else {
        const shot = await browserApi.screenshot(sessionId);
        if (shot.image_base64) setViewportScreenshot(shot.image_base64);
      }

      addLog("FILL", `Input committed: "${modalInputValue}".`);
      success("Text Input Dispatched", `Applied to (${targetCoords.x}, ${targetCoords.y}).`);
    } catch (err: any) {
      addLog("ERROR", `Input failed: ${err.message}`);
      error("Input Error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct quick text input into active focus
  const handleSendQuickInput = async (withEnter = false) => {
    if (!sessionId || !quickInputText.trim()) return;

    setIsLoading(true);
    addLog("TYPE", `Dispatching typing: "${quickInputText}"${withEnter ? " + [Enter]" : ""}...`);

    try {
      const res = await browserApi.action(sessionId, {
        action: "type",
        text: quickInputText,
      });

      if (withEnter) {
        await browserApi.action(sessionId, {
          action: "press",
          value: "Enter",
        });
        addLog("KEY", "Dispatched [Enter] key press.");
      }

      if (res?.image_base64) {
        setViewportScreenshot(res.image_base64);
      } else {
        const shot = await browserApi.screenshot(sessionId);
        if (shot.image_base64) setViewportScreenshot(shot.image_base64);
      }

      setQuickInputText("");
      addLog("TYPE", "Text dispatched to browser active focus.");
      success("Input Sent", "Typed into live browser.");
    } catch (err: any) {
      addLog("ERROR", `Type action failed: ${err.message}`);
      error("Type Error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard Hotkey Action Dispatch
  const handleDispatchKey = async (key: string) => {
    if (!sessionId) return;
    setIsLoading(true);
    addLog("KEY", `Dispatching key press: [${key}]...`);

    try {
      const res = await browserApi.action(sessionId, {
        action: "press",
        value: key,
      });

      if (res?.image_base64) {
        setViewportScreenshot(res.image_base64);
      } else {
        const shot = await browserApi.screenshot(sessionId);
        if (shot.image_base64) setViewportScreenshot(shot.image_base64);
      }

      addLog("KEY", `Key [${key}] executed.`);
    } catch (err: any) {
      addLog("ERROR", `Key dispatch failed: ${err.message}`);
      error("Key Error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll Dispatch
  const handleScroll = async (delta: number) => {
    if (!sessionId) return;
    setIsLoading(true);
    const direction = delta > 0 ? "Down" : "Up";
    addLog("SCROLL", `Scrolling ${direction} (${Math.abs(delta)}px)...`);

    try {
      const res = await browserApi.action(sessionId, {
        action: "scroll",
        value: String(delta),
      });

      if (res?.image_base64) {
        setViewportScreenshot(res.image_base64);
      } else {
        const shot = await browserApi.screenshot(sessionId);
        if (shot.image_base64) setViewportScreenshot(shot.image_base64);
      }

      addLog("SCROLL", `Scrolled ${direction}.`);
    } catch (err: any) {
      addLog("ERROR", `Scroll failed: ${err.message}`);
      error("Scroll Error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll Top / Bottom
  const handleScrollToEdge = async (edge: "top" | "bottom") => {
    if (!sessionId) return;
    setIsLoading(true);
    addLog("SCROLL", `Scrolling to ${edge}...`);

    try {
      const res = await browserApi.action(sessionId, {
        action: edge === "top" ? "scroll_top" : "scroll_bottom",
      });

      if (res?.image_base64) {
        setViewportScreenshot(res.image_base64);
      } else {
        const shot = await browserApi.screenshot(sessionId);
        if (shot.image_base64) setViewportScreenshot(shot.image_base64);
      }

      addLog("SCROLL", `Scrolled to page ${edge}.`);
    } catch (err: any) {
      addLog("ERROR", `Scroll failed: ${err.message}`);
      error("Scroll Error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation Back / Reload
  const handleHistoryAction = async (action: "reload" | "back" | "forward") => {
    if (!sessionId) return;
    setIsLoading(true);
    addLog("NAVIGATE", `Executing ${action}...`);

    try {
      const res = await browserApi.action(sessionId, {
        action,
      });

      if (res?.image_base64) {
        setViewportScreenshot(res.image_base64);
      }
      if (res?.current_url) {
        setCurrentUrl(res.current_url);
        setInputUrl(res.current_url);
      }
      if (res?.title) {
        setPageTitle(res.title);
      }

      addLog("NAVIGATE", `${action.toUpperCase()} completed.`);
    } catch (err: any) {
      addLog("ERROR", `${action} failed: ${err.message}`);
      error("Navigation Error", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Save inspected element to project Element Profiles
  const handleSaveInspectedElement = async () => {
    if (!inspectedElement) return;
    try {
      const logicalId = `elem_${Date.now().toString().slice(-6)}`;
      await intelligenceApi.createElement({
        project_id: projectId,
        logical_id: logicalId,
        description: `Inspected at coordinate (${inspectedElement.coords.x}, ${inspectedElement.coords.y}) on ${currentUrl}`,
        element_type: "element",
        page_context: currentUrl,
        stable_attributes: {
          x: String(inspectedElement.coords.x),
          y: String(inspectedElement.coords.y),
        },
      });
      success("Element Profile Created", `Saved '${logicalId}' to Project Elements.`);
      setInspectedElement(null);
    } catch (err: any) {
      error("Save Error", err.message);
    }
  };

  return (
    <div className="p-6 max-w-auto mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-black dark:text-white" />
            <span>Interactive Live Browser</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              Real-Time Dynamic
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full end-to-end interactive viewport: point-and-click actions, live keystrokes, scroll, and real-time streaming.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bridge shortcuts */}
          <button
            onClick={() => onNavigate("browser_recorder")}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Open in Browser Action Recorder"
          >
            <Video className="w-3.5 h-3.5 text-rose-500" />
            <span>Record Flow</span>
          </button>

          <button
            onClick={() => onNavigate("browser_dom")}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Inspect DOM Tree"
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>DOM Explorer</span>
          </button>

          {/* Session toggle button */}
          {sessionActive ? (
            <button
              onClick={handleStopSession}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Session</span>
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold text-xs flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Start Session</span>
            </button>
          )}

          <button
            onClick={handleTakeScreenshot}
            disabled={!sessionActive || isLoading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-purple-500" />
            <span>Snapshot</span>
          </button>
        </div>
      </div>

      {/* URL Navigation & Environment Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <form onSubmit={handleNavigate} className="flex flex-wrap items-center gap-2 text-xs">
          {/* Dynamic Environment Picker */}
          {environments.length > 0 && (
            <div className="relative">
              <select
                value={selectedEnvId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedEnvId(id);
                  const env = environments.find((ev) => String(ev.id) === id);
                  if (env?.base_url) {
                    setInputUrl(env.base_url);
                    handleNavigate(undefined, env.base_url);
                  }
                }}
                className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer"
                title="Select Project Environment"
              >
                {environments.map((env) => (
                  <option key={env.id} value={String(env.id)}>
                    Env: {env.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* History Back, Forward, Reload */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleHistoryAction("back")}
              disabled={!sessionActive || isLoading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition disabled:opacity-40 cursor-pointer"
              title="Navigate Back"
            >
              <ArrowDown className="w-3.5 h-3.5 rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => handleHistoryAction("forward")}
              disabled={!sessionActive || isLoading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition disabled:opacity-40 cursor-pointer"
              title="Navigate Forward"
            >
              <ArrowUp className="w-3.5 h-3.5 rotate-90" />
            </button>
            <button
              type="button"
              onClick={() => handleHistoryAction("reload")}
              disabled={!sessionActive || isLoading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition disabled:opacity-40 cursor-pointer"
              title="Reload Page"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* URL Input */}
          <div className="flex items-center gap-2 flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
            <Lock className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />
            <input
              type="text"
              required
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://your-app-domain.com"
              className="w-full bg-transparent border-none focus:outline-none font-mono text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading && browserStatus === "Navigating" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            <span>Navigate</span>
          </button>

          {currentUrl && (
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Open Target in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </form>

        {/* Target Details, Recent URLs, and Session Info */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <span>
              Target:{" "}
              <strong className="text-slate-700 dark:text-slate-300 font-mono">
                {currentUrl || "None"}
              </strong>
            </span>
            {pageTitle && (
              <span className="hidden sm:inline text-slate-500 font-medium">
                • {pageTitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 font-mono">
            {recentUrls.length > 0 && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-slate-500">Recent:</span>
                {recentUrls.slice(0, 3).map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputUrl(r);
                      handleNavigate(undefined, r);
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 truncate max-w-[120px] cursor-pointer"
                  >
                    {r.replace(/^https?:\/\//, "")}
                  </button>
                ))}
              </div>
            )}
            <span>
              Session ID:{" "}
              <strong className="text-black dark:text-white">{sessionId || "Disconnected"}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Viewport & Interactive Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Browser Viewport Preview (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          {/* Viewport Action Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-black dark:text-white" />
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                Interactive Viewport (1280x800)
              </h3>
            </div>

            {/* Mode selection & Streaming controls */}
            <div className="flex items-center gap-2">
              {/* Interaction Mode Pill */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setInteractionMode("click")}
                  className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    interactionMode === "click"
                      ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                  title="Click on viewport"
                >
                  <MousePointer className="w-3 h-3" />
                  <span>Click</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInteractionMode("dblclick")}
                  className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    interactionMode === "dblclick"
                      ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                  title="Double click on viewport"
                >
                  <MousePointer className="w-3 h-3 text-purple-500" />
                  <span>DblClick</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInteractionMode("input")}
                  className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    interactionMode === "input"
                      ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                  title="Click to fill text input"
                >
                  <Type className="w-3 h-3 text-blue-500" />
                  <span>Type</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInteractionMode("inspect")}
                  className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    interactionMode === "inspect"
                      ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                  title="Inspect element under cursor"
                >
                  <Crosshair className="w-3 h-3 text-emerald-500" />
                  <span>Inspect</span>
                </button>
              </div>

              {/* Auto-Refresh Live Stream Toggle */}
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                disabled={!sessionActive}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer ${
                  autoRefresh
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                }`}
                title="Toggle Real-Time Stream Auto-Refresh"
              >
                <Radio className={`w-3 h-3 ${autoRefresh ? "animate-pulse text-emerald-500" : ""}`} />
                <span>{autoRefresh ? "Live Stream (2s)" : "Stream: Off"}</span>
              </button>

              {/* Connection Status indicator */}
              <div className="flex items-center gap-1.5 pl-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sessionActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                  }`}
                />
                <span className="text-[11px] font-mono font-semibold capitalize text-slate-700 dark:text-slate-300">
                  {browserStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Screen Viewport Canvas */}
          <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative shadow-inner select-none group">
            {isLoading && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs flex flex-col items-center justify-center gap-2 z-20 animate-in fade-in">
                <Loader2 className="w-7 h-7 text-white animate-spin" />
                <span className="text-xs font-mono text-slate-200">
                  {browserStatus === "Navigating" ? "Navigating and rendering DOM..." : "Executing browser action..."}
                </span>
              </div>
            )}

            {/* Click ripple indicator */}
            {clickIndicator && (
              <div
                key={clickIndicator.id}
                style={{ left: clickIndicator.x - 12, top: clickIndicator.y - 12 }}
                className="absolute w-6 h-6 rounded-full border-2 border-emerald-400 bg-emerald-400/30 pointer-events-none animate-ping z-30"
              />
            )}

            {/* Coordinates overlay badge on hover */}
            {cursorCoords && sessionActive && (
              <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-slate-200 border border-white/10 pointer-events-none">
                X: {cursorCoords.x} Y: {cursorCoords.y} | Mode: {interactionMode.toUpperCase()}
              </div>
            )}

            {viewportScreenshot ? (
              <img
                ref={viewportImgRef}
                src={viewportScreenshot}
                alt="Interactive Live Viewport"
                onMouseMove={handleViewportMouseMove}
                onClick={handleViewportClick}
                className="w-full h-full object-contain cursor-crosshair transition duration-150"
                style={{ filter: "none", WebkitFilter: "none" }}
              />
            ) : (
              <div className="text-center p-8 space-y-2">
                <Compass className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-slate-400 text-xs font-medium">
                  Browser session idle.
                </div>
                <div className="text-slate-600 text-[11px]">
                  Click <strong>Navigate</strong> or <strong>Start Session</strong> above to render the live DOM and interact directly.
                </div>
              </div>
            )}
          </div>

          {/* Direct Browser Interactive Action Toolbar */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
            {/* Quick Text Input */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs">
                <Keyboard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={quickInputText}
                  onChange={(e) => setQuickInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendQuickInput(true);
                    }
                  }}
                  placeholder="Type text directly into focused element..."
                  disabled={!sessionActive || isLoading}
                  className="w-full bg-transparent border-none focus:outline-none font-mono text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSendQuickInput(false)}
                disabled={!sessionActive || !quickInputText.trim() || isLoading}
                className="px-3 py-1.5 rounded-lg bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold text-xs transition disabled:opacity-40 cursor-pointer"
              >
                Send Text
              </button>

              <button
                type="button"
                onClick={() => handleSendQuickInput(true)}
                disabled={!sessionActive || !quickInputText.trim() || isLoading}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center gap-1 transition disabled:opacity-40 cursor-pointer"
              >
                <span>Type & Enter</span>
                <CornerDownLeft className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Scroll & Hotkey triggers */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/60 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Scroll:
                </span>
                <button
                  type="button"
                  onClick={() => handleScroll(-300)}
                  disabled={!sessionActive || isLoading}
                  className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-medium flex items-center gap-1 transition disabled:opacity-40 cursor-pointer"
                >
                  <ArrowUp className="w-3 h-3" />
                  <span>Up</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll(300)}
                  disabled={!sessionActive || isLoading}
                  className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-medium flex items-center gap-1 transition disabled:opacity-40 cursor-pointer"
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>Down</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleScrollToEdge("top")}
                  disabled={!sessionActive || isLoading}
                  className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-medium transition disabled:opacity-40 cursor-pointer"
                >
                  Top
                </button>
                <button
                  type="button"
                  onClick={() => handleScrollToEdge("bottom")}
                  disabled={!sessionActive || isLoading}
                  className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-medium transition disabled:opacity-40 cursor-pointer"
                >
                  Bottom
                </button>
              </div>

              {/* Hotkeys */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Keys:
                </span>
                {["Enter", "Tab", "Escape", "Backspace", "Space"].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleDispatchKey(key)}
                    disabled={!sessionActive || isLoading}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-700 dark:text-slate-300 transition disabled:opacity-40 cursor-pointer"
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Inspected Element Card (if in inspect mode) */}
          {inspectedElement && (
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-300">
                  <Crosshair className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Inspected Element Target</span>
                </div>
                <button
                  onClick={() => setInspectedElement(null)}
                  className="text-purple-500 hover:text-purple-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  Coordinates: X: {inspectedElement.coords.x}, Y: {inspectedElement.coords.y}
                </div>
                <div>Status: {inspectedElement.dom_summary}</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveInspectedElement}
                  className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Save as Element Profile</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Browser Logs & Diagnostic Info (1 col) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-500" />
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                Live Subprocess Logs
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(browserLogs.join("\n"));
                  success("Copied", "Logs copied to clipboard.");
                }}
                disabled={browserLogs.length === 0}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-30"
              >
                Copy
              </button>
              <button
                onClick={() => setBrowserLogs([])}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-950 rounded-xl p-3 font-mono text-[11px] text-slate-300 overflow-y-auto max-h-[480px] min-h-[350px] space-y-1.5 scrollbar-thin">
            {browserLogs.length === 0 ? (
              <div className="text-slate-600 italic">No activity logs recorded yet.</div>
            ) : (
              browserLogs.map((log, index) => {
                const isError = log.includes("[ERROR]");
                const isAction = log.includes("[ACTION]") || log.includes("[CLICK]");
                const isNav = log.includes("[NAVIGATE]");
                const isFill = log.includes("[FILL]") || log.includes("[TYPE]");

                return (
                  <div
                    key={index}
                    className={`leading-tight break-all ${
                      isError
                        ? "text-rose-400 font-semibold"
                        : isAction
                        ? "text-emerald-400"
                        : isNav
                        ? "text-cyan-400"
                        : isFill
                        ? "text-amber-300"
                        : "text-slate-300"
                    }`}
                  >
                    {log}
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Session Diagnostic Note */}
          <div className="p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />
              <span>Full real-time Playwright subprocess session.</span>
            </div>
            <span className="font-mono text-neutral-500">
              {sessionActive ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
        </div>
      </div>

      {/* Input Modal Popover for Coordinates */}
      {inputModalOpen && targetCoords && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Fill Input at ({targetCoords.x}, {targetCoords.y})
                </h3>
              </div>
              <button
                onClick={() => setInputModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmitInput} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Text to type / fill:
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={modalInputValue}
                  onChange={(e) => setModalInputValue(e.target.value)}
                  placeholder="Enter input text..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pressEnter"
                  checked={pressEnterOnSubmit}
                  onChange={(e) => setPressEnterOnSubmit(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700"
                />
                <label htmlFor="pressEnter" className="text-xs text-slate-600 dark:text-slate-300 select-none cursor-pointer">
                  Press [Enter] key automatically after filling
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInputModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-xs hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer"
                >
                  Submit & Fill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
