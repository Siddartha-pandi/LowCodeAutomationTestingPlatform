"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Video,
  Play,
  Square,
  Globe,
  MousePointer,
  Type,
  Trash2,
  Edit2,
  Save,
  Clock,
  RefreshCw,
  Loader2,
  Crosshair,
  X,
  ArrowLeft,
  RotateCcw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Navigation,
  Monitor,
  ArrowDown,
  ArrowUp,
  ShieldCheck,
  FileCode,
  GitBranch,
  Keyboard,
  CornerDownLeft,
  Sparkles,
  Check,
} from "lucide-react";
import { recorderApi, browserApi, flowsApi, testsApi, environmentsApi } from "@/api";
import { useToast } from "../common/ToastProvider";
import { useConfirm } from "../common/ConfirmModal";
import { NavView } from "../layout/AppShell";

interface BrowserRecorderPageProps {
  projectId: string;
  onNavigate: (view: NavView) => void;
  onSelectFlow?: (flowId: string) => void;
  onSelectTest?: (testId: string) => void;
}

export interface RecordedAction {
  id: string;
  action: "navigate" | "click" | "fill" | "select" | "check" | "radio" | "scroll" | "hover" | "dblclick" | "reload" | "back";
  target: string;
  value?: string;
  timestamp: string;
  status: "verified" | "pending";
}

export function BrowserRecorderPage({
  projectId,
  onNavigate,
  onSelectFlow,
  onSelectTest,
}: BrowserRecorderPageProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [environments, setEnvironments] = useState<any[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [navbarUrl, setNavbarUrl] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recordedActions, setRecordedActions] = useState<RecordedAction[]>([]);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveType, setSaveType] = useState<"flow" | "test">("test");
  const [viewportExpanded, setViewportExpanded] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Auto-refresh polling
  const [autoRefresh, setAutoRefresh] = useState(true);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Viewport image ref & click ripple
  const viewportImgRef = useRef<HTMLImageElement | null>(null);
  const [clickIndicator, setClickIndicator] = useState<{ x: number; y: number } | null>(null);

  // Input Mode & Quick Input State
  const [interactionMode, setInteractionMode] = useState<"click" | "input">("click");
  const [quickInputText, setQuickInputText] = useState("");
  const [activeInputTarget, setActiveInputTarget] = useState("");
  const [activeInputCoords, setActiveInputCoords] = useState<{ x: number; y: number } | null>(null);
  
  // Interactive Input Popover Modal
  const [inputModalOpen, setInputModalOpen] = useState(false);
  const [modalInputSelector, setModalInputSelector] = useState("");
  const [modalInputValue, setModalInputValue] = useState("");
  const [modalInputPlaceholder, setModalInputPlaceholder] = useState("");
  const [pressEnterAfterSubmit, setPressEnterAfterSubmit] = useState(true);
  const modalInputRef = useRef<HTMLInputElement | null>(null);

  // Manual interactive input state
  const [interactiveAction, setInteractiveAction] = useState<RecordedAction["action"]>("click");
  const [interactiveSelector, setInteractiveSelector] = useState("");
  const [interactiveValue, setInteractiveValue] = useState("");

  // Inspect page elements state
  const [inspecting, setInspecting] = useState(false);
  const [detectedElements, setDetectedElements] = useState<any[]>([]);
  const [elementFilter, setElementFilter] = useState("");

  const sessionIdRef = useRef<string | null>(null);
  const { success, error, info } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    const loadEnvs = async () => {
      try {
        const envList = await environmentsApi.list(projectId);
        if (envList && envList.length > 0) {
          setEnvironments(envList);
          setSelectedEnvId(String(envList[0].id));
          if (envList[0].base_url) {
            setTargetUrl(envList[0].base_url);
          }
        } else {
          setTargetUrl("");
        }
      } catch {
        setTargetUrl("");
      }
    };
    loadEnvs();
  }, [projectId]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback((sessId: string) => {
    stopPolling();
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const shot = await browserApi.screenshot(sessId, { full_page: false });
        const b64 = shot?.image_base64 || shot?.screenshot;
        if (b64 && b64.startsWith("data:image")) {
          setScreenshotUrl(b64);
        }
      } catch {}
    }, 2000);
  }, [stopPolling]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (sessionIdRef.current) {
        recorderApi.stop(sessionIdRef.current).catch(() => {});
      }
    };
  }, [stopPolling]);

  // Toggle auto polling
  useEffect(() => {
    if (isRecording && sessionId) {
      if (autoRefresh) {
        startPolling(sessionId);
      } else {
        stopPolling();
      }
    } else {
      stopPolling();
    }
  }, [autoRefresh, isRecording, sessionId, startPolling, stopPolling]);

  // Auto focus input modal when opened
  useEffect(() => {
    if (inputModalOpen) {
      setTimeout(() => {
        modalInputRef.current?.focus();
      }, 50);
    }
  }, [inputModalOpen]);

  // Refresh screenshot manually
  const refreshScreenshot = async (sessId: string) => {
    try {
      const shot = await browserApi.screenshot(sessId, { full_page: false });
      if (shot && shot.image_base64) {
        setScreenshotUrl(shot.image_base64);
      } else if (shot && shot.screenshot) {
        setScreenshotUrl(shot.screenshot);
      }
    } catch (err) {
      console.warn("Could not capture preview screenshot:", err);
    }
  };

  // Click directly on viewport image
  const handleViewportClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!sessionId || !isRecording || isLoading) return;
    const img = viewportImgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const naturalW = img.naturalWidth || 1280;
    const naturalH = img.naturalHeight || 800;
    const clickX = Math.round((e.clientX - rect.left) * (naturalW / rect.width));
    const clickY = Math.round((e.clientY - rect.top) * (naturalH / rect.height));
    const bx = Math.max(0, Math.min(naturalW - 1, clickX));
    const by = Math.max(0, Math.min(naturalH - 1, clickY));

    // Save exact click coordinates for precise input filling
    setActiveInputCoords({ x: bx, y: by });

    // Ripple visual indicator
    setClickIndicator({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setClickIndicator(null), 700);

    setIsLoading(true);
    try {
      const actRes = await recorderApi.recordAction(sessionId, "click", "", undefined, bx, by);

      const resolvedSel = actRes?.element_info?.selector || actRes?.recorded_action?.selector || `(${bx}, ${by})`;
      const targetLabel = resolvedSel.startsWith("(") ? `(${bx}, ${by})` : resolvedSel;

      const newAction: RecordedAction = {
        id: `rec_${Date.now()}`,
        action: "click",
        target: targetLabel,
        timestamp: new Date().toLocaleTimeString(),
        status: "verified",
      };
      setRecordedActions((prev) => [...prev, newAction]);

      // Update active input target
      if (!resolvedSel.startsWith("(")) {
        setActiveInputTarget(resolvedSel);
      } else {
        setActiveInputTarget("");
      }

      const b64 = actRes?.image_base64 || actRes?.screenshot;
      if (b64 && b64.startsWith("data:image")) {
        setScreenshotUrl(b64);
      } else {
        await refreshScreenshot(sessionId);
      }

      // Check if user clicked an input element or is in input mode
      if (actRes?.element_info?.isInput || interactionMode === "input") {
        const inputSel = !resolvedSel.startsWith("(") ? resolvedSel : "";
        setModalInputSelector(inputSel);
        setModalInputPlaceholder(actRes?.element_info?.placeholder || "Enter value...");
        setModalInputValue(actRes?.element_info?.value || "");
        setInputModalOpen(true);
      }

      // Re-inspect elements in background
      recorderApi.inspect(sessionId).then((insRes) => {
        if (insRes && insRes.elements) setDetectedElements(insRes.elements);
      }).catch(() => {});
    } catch (err: any) {
      error("Click Failed", err.message || "Failed to execute click at coordinates.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fill text into browser element
  const handleSendInputText = async (targetSelector: string, textToType: string, pressEnter: boolean = false) => {
    if (!sessionId) return;
    if (!textToType && !pressEnter) return;

    setIsLoading(true);
    try {
      const cleanSelector = targetSelector && !targetSelector.startsWith("(") ? targetSelector : "";
      const actRes = await recorderApi.recordAction(
        sessionId,
        "fill",
        cleanSelector,
        textToType,
        activeInputCoords?.x,
        activeInputCoords?.y
      );

      const targetLabel = cleanSelector || (activeInputCoords ? `(${activeInputCoords.x}, ${activeInputCoords.y})` : "focused_element");
      const newAction: RecordedAction = {
        id: `rec_${Date.now()}`,
        action: "fill",
        target: targetLabel,
        value: textToType,
        timestamp: new Date().toLocaleTimeString(),
        status: "verified",
      };
      setRecordedActions((prev) => [...prev, newAction]);
      success("Input Recorded", `Entered "${textToType}" into ${targetLabel}`);

      if (pressEnter) {
        await browserApi.action(sessionId, { action: "press", value: "Enter" });
        setRecordedActions((prev) => [
          ...prev,
          {
            id: `rec_${Date.now() + 1}`,
            action: "fill" as any,
            target: "keyboard",
            value: "Enter (⏎)",
            timestamp: new Date().toLocaleTimeString(),
            status: "verified",
          },
        ]);
      }

      const b64 = actRes?.image_base64 || actRes?.screenshot;
      if (b64 && b64.startsWith("data:image")) {
        setScreenshotUrl(b64);
      } else {
        await refreshScreenshot(sessionId);
      }

      setInputModalOpen(false);
      setModalInputValue("");
      setQuickInputText("");
    } catch (err: any) {
      error("Input Failed", err.message || "Failed to enter text into browser.");
    } finally {
      setIsLoading(false);
    }
  };

  // Dispatch key press (e.g. Enter, Tab, Escape)
  const handleSendKey = async (key: string) => {
    if (!sessionId || isLoading) return;
    setIsLoading(true);
    try {
      const actRes = await browserApi.action(sessionId, { action: "press", value: key });
      const newAction: RecordedAction = {
        id: `rec_${Date.now()}`,
        action: "fill" as any,
        target: `key_${key}`,
        value: key,
        timestamp: new Date().toLocaleTimeString(),
        status: "verified",
      };
      setRecordedActions((prev) => [...prev, newAction]);
      const b64 = actRes?.image_base64 || actRes?.screenshot;
      if (b64 && b64.startsWith("data:image")) setScreenshotUrl(b64);
      else await refreshScreenshot(sessionId);
      success("Key Sent", `Dispatched ${key} key to browser`);
    } catch (err: any) {
      error("Key Failed", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate using the address bar
  const handleViewportNavigate = async (urlToNav: string = navbarUrl) => {
    if (!sessionId || !urlToNav.trim()) return;
    let nav = urlToNav.trim();
    if (!nav.startsWith("http://") && !nav.startsWith("https://")) nav = `https://${nav}`;
    setNavbarUrl(nav);
    setIsLoading(true);
    try {
      const res = await browserApi.navigate(sessionId, nav);
      const newAction: RecordedAction = {
        id: `rec_${Date.now()}`,
        action: "navigate",
        target: nav,
        timestamp: new Date().toLocaleTimeString(),
        status: "verified",
      };
      setRecordedActions((prev) => [...prev, newAction]);
      setCurrentUrl(nav);
      const b64 = res?.image_base64 || res?.screenshot;
      if (b64 && b64.startsWith("data:image")) {
        setScreenshotUrl(b64);
      } else {
        await refreshScreenshot(sessionId);
      }
    } catch (err: any) {
      error("Navigate Failed", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Start recording
  const handleStartRecording = async () => {
    let url = targetUrl.trim();
    if (!url) {
      error("URL Required", "Please enter a valid target URL.");
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
      setTargetUrl(url);
    }

    setIsLoading(true);
    try {
      info("Initializing Session", "Spawning isolated Agent Browser subprocess...");
      const res = await recorderApi.start(projectId, url);

      const newSessionId = res.session_id;
      setSessionId(newSessionId);
      sessionIdRef.current = newSessionId;
      setCurrentUrl(url);
      setNavbarUrl(url);
      setIsRecording(true);

      const initAction: RecordedAction = {
        id: `rec_${Date.now()}`,
        action: "navigate",
        target: url,
        timestamp: new Date().toLocaleTimeString(),
        status: "verified",
      };
      setRecordedActions([initAction]);

      const b64 = res.image_base64 || res.initial_screenshot || res.screenshot;
      if (b64 && b64.startsWith("data:image")) {
        setScreenshotUrl(b64);
      } else {
        await refreshScreenshot(newSessionId);
      }

      success("Session Active", "Browser active! Click directly in viewport to click or enter input.");
      if (autoRefresh) startPolling(newSessionId);

      recorderApi.inspect(newSessionId).then((insRes) => {
        if (insRes && insRes.elements) setDetectedElements(insRes.elements);
      }).catch(() => {});
    } catch (err: any) {
      error("Session Failed", err.message || "Failed to start Agent Browser recording session.");
    } finally {
      setIsLoading(false);
    }
  };

  // Stop recording
  const handleStopRecording = async () => {
    stopPolling();
    if (sessionId) {
      try {
        await recorderApi.stop(sessionId);
      } catch {}
    }
    setIsRecording(false);
    success("Recording Paused", `Captured ${recordedActions.length} verified actions.`);
  };

  // Inspect elements
  const handleInspectElements = async () => {
    if (!sessionId) return;
    setInspecting(true);
    try {
      const res = await recorderApi.inspect(sessionId);
      if (res && res.elements) {
        setDetectedElements(res.elements);
        info("Elements Detected", `Identified ${res.elements.length} interactive elements on current page.`);
      }
    } catch (err: any) {
      error("Inspection Failed", err.message);
    } finally {
      setInspecting(false);
    }
  };

  const handleSelectElement = (el: any) => {
    setInteractiveSelector(el.selector);
    setActiveInputTarget(el.selector);
    if (el.tag === "input" || el.tag === "textarea") {
      setInteractiveAction("fill");
      setModalInputSelector(el.selector);
      setModalInputPlaceholder(el.text || el.selector);
      setModalInputValue("");
      setInputModalOpen(true);
    } else if (el.tag === "select") {
      setInteractiveAction("select");
    } else {
      setInteractiveAction("click");
    }
    success("Selector Set", `Selected ${el.tag} '${el.text || el.selector}'`);
  };

  // Dispatch manual action
  const handleExecuteAction = async () => {
    if (!sessionId) return;
    const isNavigation = ["scroll", "reload", "back"].includes(interactiveAction);
    if (!interactiveSelector && !isNavigation) {
      error("Selector Required", "Specify an element selector or click one from Page Elements.");
      return;
    }

    setIsLoading(true);
    try {
      const actRes = await recorderApi.recordAction(
        sessionId,
        interactiveAction,
        interactiveSelector,
        interactiveValue || undefined
      );

      const newAction: RecordedAction = {
        id: `rec_${Date.now()}`,
        action: interactiveAction,
        target: interactiveSelector || "page",
        value: interactiveValue || undefined,
        timestamp: new Date().toLocaleTimeString(),
        status: "verified",
      };
      setRecordedActions((prev) => [...prev, newAction]);
      success("Action Recorded", `Verified: ${interactiveAction} → ${interactiveSelector || "page"}`);

      const b64 = actRes?.image_base64 || actRes?.screenshot;
      if (b64 && b64.startsWith("data:image")) {
        setScreenshotUrl(b64);
      } else {
        await refreshScreenshot(sessionId);
      }

      setInteractiveSelector("");
      setInteractiveValue("");

      recorderApi.inspect(sessionId).then((ins) => {
        if (ins && ins.elements) setDetectedElements(ins.elements);
      }).catch(() => {});
    } catch (err: any) {
      error("Action Failed", err.message || "Agent Browser could not execute action.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick actions: scroll
  const handleQuickScroll = async (direction: "down" | "up") => {
    if (!sessionId || isLoading) return;
    setIsLoading(true);
    try {
      const actRes = await browserApi.action(sessionId, {
        action: "scroll",
        value: direction === "down" ? "400" : "-400",
      });
      setRecordedActions((prev) => [
        ...prev,
        {
          id: `rec_${Date.now()}`,
          action: "scroll",
          target: direction === "down" ? "scroll_down (400px)" : "scroll_up (-400px)",
          timestamp: new Date().toLocaleTimeString(),
          status: "verified",
        },
      ]);
      const b64 = actRes?.image_base64 || actRes?.screenshot;
      if (b64 && b64.startsWith("data:image")) setScreenshotUrl(b64);
      else await refreshScreenshot(sessionId);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  // Mouse wheel scrolling for live interactive viewport
  const scrollTimeoutRef = useRef<any>(null);
  const scrollAccumulatorRef = useRef<number>(0);

  const handleViewportWheel = (e: React.WheelEvent) => {
    if (!sessionId || isLoading) return;
    scrollAccumulatorRef.current += e.deltaY;

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(async () => {
      const delta = scrollAccumulatorRef.current;
      scrollAccumulatorRef.current = 0;
      if (Math.abs(delta) < 20) return;

      const scrollAmount = Math.sign(delta) * Math.min(Math.abs(Math.round(delta * 1.8)), 600);
      try {
        setIsLoading(true);
        const actRes = await browserApi.action(sessionId, {
          action: "scroll",
          value: String(scrollAmount),
        });

        if (isRecording) {
          setRecordedActions((prev) => [
            ...prev,
            {
              id: `rec_${Date.now()}`,
              action: "scroll",
              target: `scroll (${scrollAmount > 0 ? "+" : ""}${scrollAmount}px)`,
              timestamp: new Date().toLocaleTimeString(),
              status: "verified",
            },
          ]);
        }
        const b64 = actRes?.image_base64 || actRes?.screenshot;
        if (b64 && b64.startsWith("data:image")) setScreenshotUrl(b64);
        else await refreshScreenshot(sessionId);
      } catch {} finally {
        setIsLoading(false);
      }
    }, 150);
  };

  const handleDeleteAction = (id: string) => {
    setRecordedActions((prev) => prev.filter((a) => a.id !== id));
  };

  const [editingAction, setEditingAction] = useState<RecordedAction | null>(null);
  const [editActionType, setEditActionType] = useState("click");
  const [editActionTarget, setEditActionTarget] = useState("");
  const [editActionValue, setEditActionValue] = useState("");

  const handleOpenEditAction = (act: RecordedAction) => {
    setEditingAction(act);
    setEditActionType(act.action);
    setEditActionTarget(act.target);
    setEditActionValue(act.value || "");
  };

  const handleSaveEditAction = () => {
    if (!editingAction) return;
    setRecordedActions((prev) =>
      prev.map((a) =>
        a.id === editingAction.id
          ? { ...a, action: editActionType as any, target: editActionTarget.trim(), value: editActionValue.trim() || undefined }
          : a
      )
    );
    setEditingAction(null);
    success("Step Updated", "Recorded action parameters modified.");
  };

  const handleClearAll = () => {
    confirm({
      title: "Clear Recorded Actions?",
      message: "This will remove all recorded steps from this session. This cannot be undone.",
      confirmText: "Clear Actions",
      variant: "danger",
      onConfirm: () => {
        setRecordedActions([]);
        success("Actions Cleared", "Timeline reset.");
      },
    });
  };

  const handleSaveRecording = async () => {
    if (!saveTitle.trim()) {
      error("Title Required", "Please provide a name for the saved item.");
      return;
    }
    setIsLoading(true);
    try {
      if (sessionId) {
        try {
          const res = await recorderApi.save({
            session_id: sessionId,
            project_id: projectId,
            name: saveTitle.trim(),
            target_type: saveType,
            description: `Imported from Browser Recorder (${recordedActions.length} steps)`,
          });
          if (res && res.id) {
            success("Recording Saved", `Created ${saveType === "flow" ? "visual flow" : "test case"} '${saveTitle}'.`);
            setSaveModalOpen(false);
            if (saveType === "flow") {
              if (onSelectFlow) onSelectFlow(res.id);
              onNavigate("automation_builder");
            } else {
              if (onSelectTest) onSelectTest(res.id);
              onNavigate("testing_builder");
            }
            return;
          }
        } catch (backendSaveErr) {
          console.warn("Backend save fallback:", backendSaveErr);
        }
      }

      if (saveType === "flow") {
        info("Generating Flow", "Transforming recorded actions into visual flow...");
        const nodes: any[] = recordedActions.map((act, idx) => ({
          id: `node_${idx + 1}`,
          type: "action",
          action: act.action,
          config: {
            url: act.action === "navigate" ? act.target : undefined,
            target: act.action !== "navigate" ? { selector: act.target } : undefined,
            value: act.value,
          },
          position: { x: 100 + idx * 240, y: 150 },
        }));
        nodes.push({
          id: `node_${nodes.length + 1}`,
          type: "stop",
          action: "stop" as any,
          config: { reason: "Recording completed" },
          position: { x: 100 + nodes.length * 240, y: 150 },
        });
        const edges = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          edges.push({ id: `e_${i}`, source: nodes[i].id, target: nodes[i + 1].id });
        }
        const created = await flowsApi.create({
          project_id: projectId,
          name: saveTitle.trim(),
          description: `Imported from Browser Recorder (${recordedActions.length} steps)`,
          definition: {
            name: saveTitle.trim(),
            description: `Recorded session from ${currentUrl || targetUrl}`,
            start_node_id: "node_1",
            nodes,
            edges,
          },
        });
        success("Flow Saved", `Created visual flow '${saveTitle}'.`);
        setSaveModalOpen(false);
        if (onSelectFlow && created.id) onSelectFlow(created.id);
        onNavigate("automation_builder");
      } else {
        info("Generating Test Case", "Transforming recorded actions into Test Case definition...");
        const steps = recordedActions.map((act, idx) => ({
          id: `step_${idx + 1}`,
          name: `${act.action.toUpperCase()} ${act.target}`,
          step_type: "action",
          action: act.action,
          target: act.action !== "navigate" ? { selector: act.target } : undefined,
          config: act.action === "navigate" ? { url: act.target } : { value: act.value },
        }));
        const created = await testsApi.create({
          project_id: projectId,
          name: saveTitle.trim(),
          description: `Imported from Browser Recorder (${recordedActions.length} steps)`,
          test_case: {
            name: saveTitle.trim(),
            description: `Recorded regression test from ${currentUrl || targetUrl}`,
            setup_steps: [],
            steps,
            teardown_steps: [],
          },
        });
        success("Test Case Saved", `Created test case '${saveTitle}'.`);
        setSaveModalOpen(false);
        if (onSelectTest && created.id) onSelectTest(created.id);
        onNavigate("testing_builder");
      }
    } catch (err: any) {
      error("Save Failed", err.message || "Failed to persist recording.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredElements = detectedElements.filter((el) => {
    if (!elementFilter) return true;
    const q = elementFilter.toLowerCase();
    return (
      (el.text && el.text.toLowerCase().includes(q)) ||
      (el.selector && el.selector.toLowerCase().includes(q)) ||
      (el.tag && el.tag.toLowerCase().includes(q))
    );
  });

  // Interactive Viewport Component
  const ViewportPanel = (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col transition-all duration-200 ${
        viewportExpanded ? "fixed inset-3 z-50 shadow-2xl" : ""
      }`}
    >
      {/* 1. Browser Chrome Header Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs">
        {/* Window control dots */}
        <div className="flex items-center gap-1.5 shrink-0 mr-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 dark:bg-rose-600" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 dark:bg-amber-600" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 dark:bg-emerald-600" />
        </div>

        {/* Back Button */}
        <button
          onClick={async () => {
            if (!sessionId) return;
            setIsLoading(true);
            try {
              await browserApi.action(sessionId, { action: "back" });
              await refreshScreenshot(sessionId);
              setRecordedActions((p) => [
                ...p,
                { id: `rec_${Date.now()}`, action: "back", target: "page", timestamp: new Date().toLocaleTimeString(), status: "verified" },
              ]);
            } catch {} finally {
              setIsLoading(false);
            }
          }}
          disabled={!isRecording || isLoading}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        {/* Reload Button */}
        <button
          onClick={async () => {
            if (!sessionId) return;
            setIsLoading(true);
            try {
              await browserApi.action(sessionId, { action: "reload" });
              await refreshScreenshot(sessionId);
              setRecordedActions((p) => [
                ...p,
                { id: `rec_${Date.now()}`, action: "reload", target: "page", timestamp: new Date().toLocaleTimeString(), status: "verified" },
              ]);
            } catch {} finally {
              setIsLoading(false);
            }
          }}
          disabled={!isRecording || isLoading}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition cursor-pointer"
          title="Reload"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>

        {/* Scroll Buttons */}
        <button
          onClick={() => handleQuickScroll("up")}
          disabled={!isRecording || isLoading}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition cursor-pointer"
          title="Scroll Up"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleQuickScroll("down")}
          disabled={!isRecording || isLoading}
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 transition cursor-pointer"
          title="Scroll Down"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>

        {/* Interactive Address Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleViewportNavigate();
          }}
          className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 gap-2 min-w-0"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={navbarUrl}
            onChange={(e) => setNavbarUrl(e.target.value)}
            disabled={!isRecording}
            placeholder="Type URL and press Enter..."
            className="flex-1 bg-transparent text-xs font-mono text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none disabled:opacity-60 truncate"
          />
          <button
            type="submit"
            disabled={!isRecording}
            className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white disabled:opacity-30 transition cursor-pointer"
            title="Navigate"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Interaction Mode: Click vs Type/Fill */}
        {isRecording && (
          <div className="hidden md:flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 text-[11px] font-semibold">
            <button
              onClick={() => setInteractionMode("click")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer ${
                interactionMode === "click"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
              }`}
              title="Click mode: click elements in viewport"
            >
              <MousePointer className="w-3 h-3" />
              <span>Click</span>
            </button>
            <button
              onClick={() => {
                setInteractionMode("input");
                if (activeInputTarget) {
                  setModalInputSelector(activeInputTarget);
                  setInputModalOpen(true);
                }
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition cursor-pointer ${
                interactionMode === "input"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
              }`}
              title="Input mode: click an element to enter text"
            >
              <Type className="w-3 h-3" />
              <span>Enter Input</span>
            </button>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <button
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="p-1 hover:text-black dark:hover:text-white transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-9 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            className="p-1 hover:text-black dark:hover:text-white transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live stream indicator & auto refresh */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isRecording && (
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"
              }`}
              title="Toggle live viewport polling"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              <span>{autoRefresh ? "LIVE" : "PAUSED"}</span>
            </button>
          )}

          <button
            onClick={() => sessionId && refreshScreenshot(sessionId)}
            disabled={!sessionId || isLoading}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white disabled:opacity-30 transition cursor-pointer"
            title="Refresh Viewport"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setViewportExpanded((v) => !v)}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition cursor-pointer"
            title={viewportExpanded ? "Exit Fullscreen" : "Fullscreen Viewport"}
          >
            {viewportExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Direct Interactive Input & Keystroke Strip */}
      {isRecording && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 shrink-0 font-medium">
            <Keyboard className="w-3.5 h-3.5 text-black dark:text-white" />
            <span className="hidden sm:inline">Active Input:</span>
            <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
              {activeInputTarget || "Focused Element"}
            </span>
          </div>

          {/* Direct typing input box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendInputText(activeInputTarget, quickInputText, false);
            }}
            className="flex-1 flex items-center gap-1.5 min-w-[220px]"
          >
            <input
              type="text"
              value={quickInputText}
              onChange={(e) => setQuickInputText(e.target.value)}
              placeholder="Type text to enter into active element..."
              className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
            <button
              type="submit"
              disabled={isLoading || !quickInputText.trim()}
              className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 font-semibold rounded-lg text-xs shadow-xs transition disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>Fill</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          </form>

          {/* Quick Key Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleSendKey("Enter")}
              disabled={isLoading}
              className="px-2 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Send Enter Key"
            >
              ⏎ Enter
            </button>
            <button
              type="button"
              onClick={() => handleSendKey("Tab")}
              disabled={isLoading}
              className="px-2 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Send Tab Key"
            >
              ⇥ Tab
            </button>
            <button
              type="button"
              onClick={() => {
                setModalInputSelector(activeInputTarget || "input");
                setModalInputPlaceholder("Enter text value...");
                setModalInputValue("");
                setInputModalOpen(true);
              }}
              className="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
              title="Open full text input modal"
            >
              <Type className="w-3 h-3" />
              <span>Custom Input</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Viewport Frame */}
      <div
        onWheel={handleViewportWheel}
        className="relative flex-1 bg-slate-950 flex flex-col items-center justify-center p-2 overflow-auto scrollbar-thin"
        style={{ minHeight: viewportExpanded ? "calc(100vh - 270px)" : "440px" }}
      >
        {/* Executing action indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xs flex flex-col items-center justify-center gap-2 z-20 animate-in fade-in">
            <Loader2 className="w-8 h-8 text-black dark:text-white animate-spin" />
            <span className="text-xs font-mono text-slate-200">
              Dispatching interaction and capturing live frame...
            </span>
          </div>
        )}

        {screenshotUrl ? (
          <div
            className="relative inline-block max-w-full"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              transition: "transform 0.12s ease-out",
            }}
          >
            <img
              ref={viewportImgRef}
              src={screenshotUrl}
              alt="Interactive Browser Viewport"
              onClick={handleViewportClick}
              className={`block max-w-full rounded-md shadow-2xl select-none ${
                isRecording
                  ? interactionMode === "input"
                    ? "cursor-text ring-2 ring-blue-500/30"
                    : "cursor-crosshair hover:ring-2 hover:ring-blue-500/50"
                  : "cursor-default"
              }`}
              style={{ maxHeight: viewportExpanded ? "calc(100vh - 290px)" : "none", maxWidth: "100%", filter: "none", WebkitFilter: "none" }}
              draggable={false}
            />

            {/* Visual ripple effect when user clicks */}
            {clickIndicator && (
              <span
                className="absolute pointer-events-none w-7 h-7 rounded-full border-2 border-white bg-blue-500/30 animate-ping"
                style={{
                  left: clickIndicator.x - 14,
                  top: clickIndicator.y - 14,
                }}
              />
            )}

            {/* Quick Floating Scroll Controls */}
            <div className="absolute right-3 bottom-3 flex flex-col gap-1.5 z-30 bg-black/80 backdrop-blur-md p-1 rounded-lg border border-neutral-700 shadow-xl">
              <button
                type="button"
                onClick={() => handleQuickScroll("up")}
                disabled={isLoading}
                className="p-1.5 rounded hover:bg-white/20 text-white transition disabled:opacity-50 cursor-pointer"
                title="Scroll Up (Page Up)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickScroll("down")}
                disabled={isLoading}
                className="p-1.5 rounded hover:bg-white/20 text-white transition disabled:opacity-50 cursor-pointer"
                title="Scroll Down (Page Down)"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 space-y-3 p-8">
            <Monitor className="w-12 h-12 mx-auto opacity-30 text-black dark:text-white" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-300">
                {isRecording ? "Capturing live frame from Agent Browser..." : "Browser Session Idle"}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Enter target URL above and click <strong>Start Recording</strong> to launch the interactive browser.
              </p>
            </div>
          </div>
        )}

        {/* Viewport Hint Badge */}
        {isRecording && screenshotUrl && (
          <div className="absolute bottom-3 left-4 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-neutral-700 text-[11px] text-neutral-300 flex items-center gap-2 pointer-events-none select-none z-10 shadow-lg">
            <MousePointer className="w-3.5 h-3.5 text-black dark:text-white" />
            <span>
              {interactionMode === "input"
                ? "Click any input field to type text into it"
                : "Click elements to click or enter input directly"}
            </span>
          </div>
        )}
      </div>

      {/* 4. Bottom Manual Action Bar */}
      {isRecording && (
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <MousePointer className="w-3.5 h-3.5 text-black dark:text-white" />
              <span>Targeted Action Dispatcher</span>
            </span>

            <button
              onClick={handleInspectElements}
              disabled={inspecting}
              className="inline-flex items-center gap-1 text-[11px] text-black dark:text-white hover:underline capitalize font-semibold cursor-pointer"
            >
              {inspecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
              <span>{inspecting ? "Scanning DOM..." : "Inspect Page Elements"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select
              value={interactiveAction}
              onChange={(e) => setInteractiveAction(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="click">Click</option>
              <option value="fill">Fill Input (Text)</option>
              <option value="dblclick">Double Click</option>
              <option value="select">Select Option</option>
              <option value="hover">Hover</option>
              <option value="check">Check Box / Radio</option>
              <option value="scroll">Scroll Down</option>
              <option value="reload">Reload</option>
              <option value="back">Back</option>
            </select>

            <input
              type="text"
              value={interactiveSelector}
              onChange={(e) => setInteractiveSelector(e.target.value)}
              placeholder="Selector (#id, .btn, input[name='q'])"
              className="sm:col-span-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
            />

            <button
              disabled={isLoading}
              onClick={handleExecuteAction}
              className="px-3 py-1.5 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{isLoading ? "Running..." : "Dispatch & Record"}</span>
            </button>
          </div>

          {["fill", "select"].includes(interactiveAction) && (
            <input
              type="text"
              value={interactiveValue}
              onChange={(e) => setInteractiveValue(e.target.value)}
              placeholder={interactiveAction === "fill" ? "Enter text value to type into the element..." : "Option value or visible label..."}
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          )}

          {/* Detected Elements Chips */}
          {detectedElements.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Click element to auto-fill selector ({detectedElements.length} found):</span>
                <input
                  type="text"
                  placeholder="Filter elements..."
                  value={elementFilter}
                  onChange={(e) => setElementFilter(e.target.value)}
                  className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px]"
                />
              </div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                {filteredElements.slice(0, 24).map((el, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectElement(el)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition truncate max-w-[200px]"
                    title={`${el.tag}: ${el.selector}`}
                  >
                    <span className={`font-bold uppercase text-[9px] ${el.tag === 'input' || el.tag === 'textarea' ? 'text-blue-600 dark:text-blue-400' : 'text-black dark:text-white'}`}>
                      {el.tag}
                    </span>
                    <span className="truncate">{el.text || el.selector}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 max-w-auto mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Video className="w-6 h-6 text-black dark:text-white" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Browser Recorder
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Interactive live browser viewport: click anywhere, type input directly, and record workflows.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-white border border-blue-200 dark:border-blue-900 w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-black dark:text-white" />
          <span>Interactive Playwright Session • Deterministic</span>
        </div>
      </div>

      {/* Target URL & Session Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        {environments.length > 0 && !isRecording && (
          <select
            value={selectedEnvId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedEnvId(id);
              const env = environments.find((ev) => String(ev.id) === id);
              if (env?.base_url) {
                setTargetUrl(env.base_url);
              }
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
            title="Select Project Environment"
          >
            {environments.map((env) => (
              <option key={env.id} value={String(env.id)}>
                Env: {env.name}
              </option>
            ))}
          </select>
        )}
        <div className="relative flex-1 w-full">
          <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            disabled={isRecording || isLoading}
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isRecording && handleStartRecording()}
            placeholder="Enter target URL (e.g. https://example.com)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white disabled:opacity-60"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              disabled={isLoading}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{isLoading ? "Starting..." : "Start Recording"}</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              disabled={isLoading}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Square className="w-4 h-4" />
              <span>Stop Session</span>
            </button>
          )}

          {recordedActions.length > 0 && (
            <button
              onClick={() => {
                setSaveTitle(`Recorded Flow - ${new Date().toLocaleDateString()}`);
                setSaveModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save As...</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Recording Workspace: Viewport (Left) + Recorded Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left: Viewport (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          {ViewportPanel}
        </div>

        {/* Right: Recorded Timeline (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recorded Actions ({recordedActions.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Verified event trail
              </p>
            </div>
            {recordedActions.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[11px] text-neutral-500 dark:text-neutral-400 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
            {recordedActions.map((act, idx) => (
              <div
                key={act.id}
                className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 group hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase text-slate-800 dark:text-slate-200">
                        {act.action}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Verified
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate max-w-[180px]">
                      {act.target}
                    </div>
                    {act.value && (
                      <div className="text-[10px] text-slate-600 dark:text-slate-300 font-mono font-medium truncate bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded mt-0.5">
                        value: "{act.value}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenEditAction(act)}
                    className="p-1 text-slate-400 hover:text-black dark:hover:text-white rounded transition cursor-pointer"
                    title="Edit step"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAction(act.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                    title="Remove step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {recordedActions.length === 0 && (
              <div className="text-center py-12 text-slate-400 space-y-1">
                <Clock className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs font-medium">No actions recorded yet</p>
                <p className="text-[11px] text-slate-500">
                  Click viewport or type in the input bar to build your timeline.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Enter Input Modal (shown when clicking an input element or clicking Enter Input) */}
      {inputModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Type className="w-4 h-4 text-black dark:text-white" />
                <span>Enter Input Value</span>
              </h3>
              <button
                onClick={() => setInputModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendInputText(modalInputSelector, modalInputValue, pressEnterAfterSubmit);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Field / Selector
                </label>
                <input
                  type="text"
                  value={modalInputSelector}
                  onChange={(e) => setModalInputSelector(e.target.value)}
                  placeholder="e.g. #username or input[name='email']"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Text to Enter *
                </label>
                <input
                  ref={modalInputRef}
                  type="text"
                  required
                  value={modalInputValue}
                  onChange={(e) => setModalInputValue(e.target.value)}
                  placeholder={modalInputPlaceholder || "Type text to enter into the input..."}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  id="pressEnterAfter"
                  checked={pressEnterAfterSubmit}
                  onChange={(e) => setPressEnterAfterSubmit(e.target.checked)}
                  className="rounded border-slate-300 text-black focus:ring-black dark:focus:ring-white"
                />
                <label htmlFor="pressEnterAfter" className="cursor-pointer select-none">
                  Press <strong>Enter (⏎)</strong> key after typing
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInputModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !modalInputValue.trim()}
                  className="px-4 py-2 rounded-lg bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CornerDownLeft className="w-3.5 h-3.5" />}
                  <span>Enter & Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Save Recorded Session
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Entity
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setSaveType("test")}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      saveType === "test"
                        ? "border-black dark:border-white bg-black/5 dark:bg-white/10 ring-1 ring-black dark:ring-white"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <FileCode className="w-4 h-4 mb-1" />
                    <div className="text-xs font-bold">Test Case</div>
                    <div className="text-[10px] opacity-80">WrightTest test suite</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaveType("flow")}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      saveType === "flow"
                        ? "border-black dark:border-white bg-black/5 dark:bg-white/10 ring-1 ring-black dark:ring-white"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <GitBranch className="w-4 h-4 mb-1" />
                    <div className="text-xs font-bold">Visual Flow</div>
                    <div className="text-[10px] opacity-80">React Flow DAG</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRecording}
                disabled={isLoading || !saveTitle.trim()}
                className="px-4 py-2 bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save Definition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Recorded Step Modal */}
      {editingAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-neutral-950 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-black dark:text-white" />
                <span>Edit Recorded Step</span>
              </h3>
              <button
                onClick={() => setEditingAction(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Action Type
                </label>
                <select
                  value={editActionType}
                  onChange={(e) => setEditActionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="click">click</option>
                  <option value="fill">fill</option>
                  <option value="navigate">navigate</option>
                  <option value="hover">hover</option>
                  <option value="select">select</option>
                  <option value="check">check</option>
                  <option value="scroll">scroll</option>
                  <option value="reload">reload</option>
                  <option value="back">back</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Selector / URL
                </label>
                <input
                  type="text"
                  value={editActionTarget}
                  onChange={(e) => setEditActionTarget(e.target.value)}
                  placeholder="e.g. #submit-btn or https://example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              {(editActionType === "fill" || editActionType === "select") && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Value
                  </label>
                  <input
                    type="text"
                    value={editActionValue}
                    onChange={(e) => setEditActionValue(e.target.value)}
                    placeholder="Input or option value"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAction(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditAction}
                  className="px-4 py-2 rounded-lg bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold shadow-xs cursor-pointer"
                >
                  Save Step
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
