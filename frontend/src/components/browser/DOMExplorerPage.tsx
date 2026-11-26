"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Code2,
  Search,
  RefreshCw,
  Camera,
  Copy,
  Plus,
  Globe,
  Layers,
  Sparkles,
  ShieldCheck,
  Crosshair,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MousePointerClick,
  Check,
  Maximize2,
  Minimize2,
  Compass,
  Video,
  X,
  ChevronRight,
  Sliders,
  FileCode,
  MousePointer,
  Play,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from "lucide-react";
import { intelligenceApi, environmentsApi, browserApi } from "@/api";
import { useToast } from "../common/ToastProvider";
import { NavView } from "../layout/AppShell";

interface DOMExplorerPageProps {
  projectId: string;
  onNavigate: (view: NavView) => void;
}

export interface ExtractedElement {
  tag: string;
  role?: string | null;
  accessible_name?: string | null;
  text?: string;
  element_id?: string | null;
  stable_attributes: Record<string, string>;
  aria_properties: Record<string, string>;
  associated_label?: string | null;
  ancestors?: Array<{ tag: string; id?: string | null; role?: string | null; test_id?: string | null; depth: number }>;
  siblings?: { prev_tag?: string | null; next_tag?: string | null };
  nearby_heading?: string | null;
  is_visible: boolean;
  is_enabled: boolean;
  box: { x?: number; y?: number; width?: number; height?: number };
  selector?: string;
  page_url?: string;
}

export function DOMExplorerPage({ projectId, onNavigate }: DOMExplorerPageProps) {
  const [url, setUrl] = useState("");
  const [environments, setEnvironments] = useState<any[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [elements, setElements] = useState<ExtractedElement[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "interactive" | "visible">("interactive");
  const [imgScale, setImgScale] = useState<{ scaleX: number; scaleY: number }>({ scaleX: 1, scaleY: 1 });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<"fit" | "100%">("fit");
  const [fullPageScreenshot, setFullPageScreenshot] = useState(false);
  const [interactiveMode, setInteractiveMode] = useState<"inspect" | "interact">("inspect");
  const [clickIndicator, setClickIndicator] = useState<{ x: number; y: number; id: number } | null>(null);
  const [inputText, setInputText] = useState("");
  const [isInteracting, setIsInteracting] = useState(false);
  const [hoveredTreeElement, setHoveredTreeElement] = useState<ExtractedElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const { success, error, info } = useToast();

  useEffect(() => {
    const loadEnvs = async () => {
      try {
        const envList = await environmentsApi.list(projectId);
        if (envList && envList.length > 0) {
          setEnvironments(envList);
          setSelectedEnvId(String(envList[0].id));
          if (envList[0].base_url) {
            setUrl(envList[0].base_url);
          }
        } else {
          setUrl("");
        }
      } catch {
        setUrl("");
      }
    };
    loadEnvs();
  }, [projectId]);

  const handleExploreDOM = async (targetUrl?: string) => {
    const rawUrl = (targetUrl || url).trim();
    if (!rawUrl) {
      error("URL Required", "Please enter a valid target URL to explore.");
      return;
    }

    let normalizedUrl = rawUrl;
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
      setUrl(normalizedUrl);
    }

    setLoading(true);
    info("Exploring DOM", `Inspecting page DOM and capturing snapshot for ${normalizedUrl}...`);

    try {
      const res = await intelligenceApi.exploreDom(
        projectId,
        normalizedUrl,
        sessionId || undefined,
        fullPageScreenshot
      );

      if (res) {
        if (res.session_id) setSessionId(res.session_id);
        const title = res.page_title || (res as any).title || "";
        if (title) setPageTitle(title);
        const shot = res.screenshot || (res as any).image_base64;
        if (shot) setScreenshotUrl(shot);
        if (res.elements && Array.isArray(res.elements) && res.elements.length > 0) {
          setElements(res.elements);
          // Pick the first interactive/meaningful element
          const firstInteractive = res.elements.findIndex(
            (el: ExtractedElement) =>
              ["button", "input", "a", "select", "textarea"].includes(el.tag) ||
              Boolean(el.role) ||
              Boolean(el.accessible_name) ||
              Boolean(el.stable_attributes?.["data-testid"]) ||
              Boolean(el.stable_attributes?.id)
          );
          setSelectedIdx(firstInteractive >= 0 ? firstInteractive : 0);
        }
        success(
          "DOM Synchronized",
          `Extracted ${res.total_elements || res.elements?.length || 0} elements from '${title || normalizedUrl}'.`
        );
      }
    } catch (err: any) {
      error("Exploration Failed", err.message || "Failed to explore DOM with Agent Browser.");
    } finally {
      setLoading(false);
    }
  };

  // Auto explore on initial mount when url is available
  useEffect(() => {
    if (elements.length === 0 && !loading && url) {
      handleExploreDOM(url);
    }
  }, [url]);

  const updateImageScale = () => {
    if (imgRef.current && imgRef.current.naturalWidth > 0) {
      const rect = imgRef.current.getBoundingClientRect();
      setImgScale({
        scaleX: rect.width / imgRef.current.naturalWidth,
        scaleY: rect.height / imgRef.current.naturalHeight,
      });
    }
  };

  useEffect(() => {
    updateImageScale();
  }, [screenshotUrl, zoomLevel]);

  useEffect(() => {
    window.addEventListener("resize", updateImageScale);
    return () => window.removeEventListener("resize", updateImageScale);
  }, []);

  const selectedElement: ExtractedElement | null =
    elements.length > 0 && selectedIdx >= 0 && selectedIdx < elements.length
      ? elements[selectedIdx]
      : null;

  // Filter elements by user search query and type filter
  const filteredElements = useMemo(() => {
    return elements.filter((el) => {
      if (filterType === "visible" && !el.is_visible) return false;
      if (filterType === "interactive") {
        const isInteractive =
          ["button", "input", "a", "select", "textarea", "form", "h1", "h2", "h3", "header", "nav", "main", "footer"].includes(el.tag) ||
          Boolean(el.role) ||
          Boolean(el.accessible_name) ||
          Boolean(el.stable_attributes?.["data-testid"]) ||
          Boolean(el.stable_attributes?.id);
        if (!isInteractive) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const tagMatch = el.tag?.toLowerCase().includes(q);
      const idMatch = (el.element_id || el.stable_attributes?.id || "").toLowerCase().includes(q);
      const testIdMatch = (el.stable_attributes?.["data-testid"] || "").toLowerCase().includes(q);
      const textMatch = (el.text || "").toLowerCase().includes(q);
      const nameMatch = (el.accessible_name || "").toLowerCase().includes(q);
      const roleMatch = (el.role || "").toLowerCase().includes(q);

      return tagMatch || idMatch || testIdMatch || textMatch || nameMatch || roleMatch;
    });
  }, [elements, filterType, searchQuery]);

  // Clicking on the viewport executes element inspection or direct interactive browser click
  const handleViewportClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();

    // Compute coordinate relative to the natural 1280x800 resolution or image dimensions
    const naturalW = img.naturalWidth || 1280;
    const naturalH = img.naturalHeight || 800;
    const scaleX = naturalW / rect.width;
    const scaleY = naturalH / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Show temporary visual ripple at click position
    setClickIndicator({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() });

    // Always identify the best matching element under the click coordinates
    let bestIdx = -1;
    let minArea = Infinity;

    elements.forEach((el, idx) => {
      if (el.box && typeof el.box.x === "number" && typeof el.box.width === "number") {
        const bx = el.box.x;
        const by = el.box.y || 0;
        const bw = el.box.width;
        const bh = el.box.height || 0;

        if (clickX >= bx && clickX <= bx + bw && clickY >= by && clickY <= by + bh) {
          // Strongly favor interactive input/button/select/textarea over large containers like form/div
          const isTargetTag = ["input", "button", "select", "textarea", "a"].includes(el.tag);
          let area = bw * bh;
          if (isTargetTag) {
            area = area * 0.1; // Weight interactive leaf elements higher
          }
          if (area > 0 && area < minArea) {
            minArea = area;
            bestIdx = idx;
          }
        }
      }
    });

    if (bestIdx >= 0) {
      setSelectedIdx(bestIdx);
    }

    // 1. In 'interact' mode, send direct live mouse click to the browser session and refresh DOM
    if (interactiveMode === "interact" && sessionId) {
      setIsInteracting(true);
      try {
        const scaledX = Math.round(clickX);
        const scaledY = Math.round(clickY);

        const actionRes = await browserApi.action(sessionId, {
          action: "click_at",
          x: scaledX,
          y: scaledY,
        });

        const activeUrl = actionRes?.current_url || url;
        if (actionRes?.current_url && actionRes.current_url !== url) {
          setUrl(actionRes.current_url);
        }

        // Automatically re-extract DOM after interaction to reflect page state changes
        const res = await intelligenceApi.exploreDom(projectId, activeUrl, sessionId, fullPageScreenshot);
        if (res) {
          if (res.screenshot) setScreenshotUrl(res.screenshot);
          if (res.page_url && res.page_url !== url) setUrl(res.page_url);
          if (res.elements && Array.isArray(res.elements)) {
            setElements(res.elements);
            // Re-select element under the click in updated elements
            let updatedBestIdx = -1;
            let updatedMinArea = Infinity;
            res.elements.forEach((el: any, idx: number) => {
              if (el.box && typeof el.box.x === "number" && typeof el.box.width === "number") {
                const bx = el.box.x;
                const by = el.box.y || 0;
                const bw = el.box.width;
                const bh = el.box.height || 0;
                if (scaledX >= bx && scaledX <= bx + bw && scaledY >= by && scaledY <= by + bh) {
                  const isTarget = ["input", "button", "select", "textarea", "a"].includes(el.tag);
                  let a = bw * bh;
                  if (isTarget) a = a * 0.1;
                  if (a > 0 && a < updatedMinArea) {
                    updatedMinArea = a;
                    updatedBestIdx = idx;
                  }
                }
              }
            });
            if (updatedBestIdx >= 0) {
              setSelectedIdx(updatedBestIdx);
            }
          }
          if (res.page_title || (res as any).title) setPageTitle(res.page_title || (res as any).title);
        }
      } catch (err: any) {
        error("Action Failed", err.message || "Failed to click on live viewport.");
      } finally {
        setIsInteracting(false);
      }
      return;
    }
  };

  // Direct keyboard typing into active interactive browser session
  const handleSendText = async () => {
    if (!sessionId || !inputText.trim()) return;
    setIsInteracting(true);
    try {
      if (selectedElement?.selector) {
        await browserApi.action(sessionId, {
          action: "fill",
          selector: selectedElement.selector,
          value: inputText,
        });
      } else {
        await browserApi.action(sessionId, {
          action: "type",
          text: inputText,
        });
      }
      setInputText("");
      // Refresh DOM state
      const res = await intelligenceApi.exploreDom(projectId, url, sessionId);
      if (res) {
        if (res.screenshot) setScreenshotUrl(res.screenshot);
        if (res.elements) setElements(res.elements);
      }
    } catch (err: any) {
      error("Type Failed", err.message || "Failed to type into element.");
    } finally {
      setIsInteracting(false);
    }
  };

  // Mouse wheel scroll directly on the live interactive viewport
  const handleViewportWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!sessionId) return;
    e.preventDefault();

    const deltaY = e.deltaY;
    if (Math.abs(deltaY) < 15) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(async () => {
      try {
        const scrollDelta = deltaY > 0 ? 350 : -350;
        await browserApi.action(sessionId, {
          action: "scroll",
          value: String(scrollDelta),
        });
        const res = await intelligenceApi.exploreDom(projectId, url, sessionId);
        if (res) {
          if (res.screenshot) setScreenshotUrl(res.screenshot);
          if (res.elements) setElements(res.elements);
        }
      } catch (err: any) {
        // Silently catch rapid wheel errors
      }
    }, 150);
  };

  // Scroll actions in live interactive viewport
  const handleScroll = async (direction: "up" | "down") => {
    if (!sessionId) return;
    setIsInteracting(true);
    try {
      await browserApi.action(sessionId, {
        action: direction === "down" ? "scroll_bottom" : "scroll_top",
      });
      const res = await intelligenceApi.exploreDom(projectId, url, sessionId);
      if (res) {
        if (res.screenshot) setScreenshotUrl(res.screenshot);
        if (res.elements) setElements(res.elements);
      }
    } catch (err: any) {
      error("Scroll Failed", err.message);
    } finally {
      setIsInteracting(false);
    }
  };

  // Candidate locators computation
  const getCandidateLocators = (el: ExtractedElement | null) => {
    if (!el) return [];
    const locators: Array<{ label: string; value: string; type: string; color: string; badge: string }> = [];

    const testId = el.stable_attributes?.["data-testid"] || el.stable_attributes?.["data-test"];
    if (testId) {
      locators.push({
        label: "Data TestID",
        value: `[data-testid="${testId}"]`,
        type: "TestID",
        color: "border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300",
        badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      });
    }

    const id = el.element_id || el.stable_attributes?.id;
    if (id) {
      locators.push({
        label: "CSS ID",
        value: `#${id}`,
        type: "CSS ID",
        color: "border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300",
        badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      });
    }

    if (el.role && el.accessible_name) {
      locators.push({
        label: "ARIA Role + Name",
        value: `${el.role}[name="${el.accessible_name}"]`,
        type: "ARIA",
        color: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300",
        badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      });
    } else if (el.accessible_name) {
      locators.push({
        label: "Accessible Name",
        value: `${el.tag}[aria-label="${el.accessible_name}"]`,
        type: "ARIA",
        color: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300",
        badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      });
    }

    const name = el.stable_attributes?.name;
    if (name) {
      locators.push({
        label: "Name Attribute",
        value: `${el.tag}[name="${name}"]`,
        type: "Attribute",
        color: "border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300",
        badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      });
    }

    const placeholder = el.stable_attributes?.placeholder;
    if (placeholder) {
      locators.push({
        label: "Placeholder",
        value: `${el.tag}[placeholder="${placeholder}"]`,
        type: "Attribute",
        color: "border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-300",
        badge: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
      });
    }

    const href = el.stable_attributes?.href;
    if (href && el.tag === "a") {
      locators.push({
        label: "Link Target",
        value: `a[href="${href}"]`,
        type: "Link",
        color: "border-cyan-200 dark:border-cyan-800 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-300",
        badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
      });
    }

    if (el.text && el.text.trim().length > 0 && el.text.trim().length <= 50) {
      locators.push({
        label: "Text Match",
        value: `${el.tag}:has-text("${el.text.trim()}")`,
        type: "Text",
        color: "border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300",
        badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
      });
    }

    // Default tag fallback
    if (locators.length === 0) {
      locators.push({
        label: "Tag Selector",
        value: el.tag,
        type: "Tag",
        color: "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200",
        badge: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      });
    }

    return locators;
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    success("Copied to Clipboard", text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveProfile = async () => {
    if (!selectedElement) return;

    const locators = getCandidateLocators(selectedElement);
    const primarySelector = locators[0]?.value || selectedElement.tag;
    const logicalId =
      selectedElement.stable_attributes?.["data-testid"] ||
      selectedElement.element_id ||
      (selectedElement.accessible_name ? selectedElement.accessible_name.toLowerCase().replace(/[^a-z0-9]+/g, "_") : null) ||
      `${selectedElement.tag}_${Date.now().toString(36).slice(-4)}`;

    try {
      await intelligenceApi.createElement({
        project_id: projectId,
        logical_id: logicalId,
        description: selectedElement.accessible_name || selectedElement.text || `Extracted ${selectedElement.tag} element`,
        element_type: selectedElement.tag,
        page_context: pageTitle || url || "Default Page",
        original_text: selectedElement.text || selectedElement.accessible_name || "",
        stable_attributes: {
          ...selectedElement.stable_attributes,
          ...selectedElement.aria_properties,
          selector: primarySelector,
        },
        structural_fingerprint: {
          tag: selectedElement.tag,
          role: selectedElement.role,
          ancestors: selectedElement.ancestors,
          box: selectedElement.box,
        },
      });
      success("Profile Stored", `Saved '${logicalId}' to Project Element Profiles.`);
    } catch (err: any) {
      error("Storage Error", err.message || "Failed to store element profile.");
    }
  };

  const candidateLocators = getCandidateLocators(selectedElement);

  // Scaled bounding box coordinates for overlay
  const boxX = selectedElement?.box?.x !== undefined ? (selectedElement.box.x || 0) * imgScale.scaleX : null;
  const boxY = selectedElement?.box?.y !== undefined ? (selectedElement.box.y || 0) * imgScale.scaleY : null;
  const boxW = selectedElement?.box?.width !== undefined ? Math.max(6, (selectedElement.box.width || 0) * imgScale.scaleX) : null;
  const boxH = selectedElement?.box?.height !== undefined ? Math.max(6, (selectedElement.box.height || 0) * imgScale.scaleY) : null;

  // Tag color badge helper
  const getTagBadgeClass = (tag: string) => {
    switch (tag) {
      case "button":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "a":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "input":
      case "select":
      case "textarea":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "h1":
      case "h2":
      case "h3":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-black dark:text-white" />
            <span>DOM Hierarchy & Element Inspector</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Interactive DevTools
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Inspect live accessibility tree, compute deterministic candidate locators, and view highlighted overlays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("browser_live")}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-black dark:text-white" />
            <span>Live Browser</span>
          </button>
          <button
            onClick={() => onNavigate("browser_recorder")}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Video className="w-3.5 h-3.5 text-rose-500" />
            <span>Action Recorder</span>
          </button>
        </div>
      </div>

      {/* URL Navigation & Snapshot Controls */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2 w-full sm:flex-1">
            {environments.length > 0 && (
              <select
                value={selectedEnvId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedEnvId(id);
                  const env = environments.find((ev) => String(ev.id) === id);
                  if (env?.base_url) {
                    setUrl(env.base_url);
                    handleExploreDOM(env.base_url);
                  }
                }}
                className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer"
                title="Select Project Environment"
              >
                {environments.map((env) => (
                  <option key={env.id} value={String(env.id)}>
                    Env: {env.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-2 flex-1 min-w-[240px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleExploreDOM();
                }}
                placeholder="https://example.com"
                className="w-full bg-transparent border-none focus:outline-none font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={() => handleExploreDOM()}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-black dark:text-white" : ""}`} />
              <span>Refresh DOM</span>
            </button>
            <button
              onClick={() => handleExploreDOM()}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              <span>Inspect Snapshot</span>
            </button>
          </div>
        </div>

        {/* Status info bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Target:</span>
            <span className="font-mono text-slate-900 dark:text-slate-100 truncate max-w-sm">
              {url || "None"}
            </span>
            {pageTitle && (
              <span className="text-slate-500 truncate hidden md:inline">
                • {pageTitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>
              Total: <strong className="text-slate-800 dark:text-slate-200">{elements.length}</strong>
            </span>
            <span>
              Interactive:{" "}
              <strong className="text-blue-600 dark:text-blue-400">
                {elements.filter((e) => ["button", "input", "a", "select", "textarea"].includes(e.tag) || e.role).length}
              </strong>
            </span>
            <span>
              Visible:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {elements.filter((e) => e.is_visible).length}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. THREE-COLUMN SYNCHRONIZED INSPECTOR (Tree / Viewport / Properties) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* =========================================================================
            COLUMN 1: DOM Hierarchy Tree
           ========================================================================= */}
        <div className="lg:col-span-4 xl:col-span-3 p-4 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col h-[700px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-black dark:text-white" />
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                DOM Hierarchy
              </h3>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredElements.length} items
            </span>
          </div>

          {/* Search & Filters */}
          <div className="py-2.5 space-y-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 border border-slate-200 dark:border-slate-800">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <input
                type="text"
                placeholder="Filter tag, id, text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none text-[11px] text-slate-900 dark:text-slate-100"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px]">
              {(["interactive", "visible", "all"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-1 rounded-md capitalize font-medium transition cursor-pointer ${filterType === t
                      ? "bg-black dark:bg-white text-white dark:text-black font-semibold shadow-xs"
                      : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Element Tree List */}
          <div className="flex-1 overflow-y-auto pt-2 space-y-1 scrollbar-thin">
            {loading && elements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-black dark:text-white" />
                <p className="text-xs">Extracting live DOM tree...</p>
              </div>
            ) : filteredElements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2 text-slate-400">
                <Code2 className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {elements.length === 0 ? "No DOM tree loaded" : "No matching elements"}
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs">
                  {elements.length === 0
                    ? "Click 'Inspect Snapshot' above to extract live elements."
                    : "Switch filter to 'All' or clear your search query."}
                </p>
              </div>
            ) : (
              filteredElements.map((el, idx) => {
                const originalIndex = elements.indexOf(el);
                const isSelected = selectedIdx === originalIndex;
                const placeholder = el.stable_attributes?.placeholder || "";
                const label = el.accessible_name || placeholder || el.text || "";

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedIdx(originalIndex)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition text-xs border ${isSelected
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-950 dark:text-blue-100 shadow-xs"
                        : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                      }`}
                  >
                    {/* Tag badge */}
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${getTagBadgeClass(
                        el.tag
                      )}`}
                    >
                      &lt;{el.tag}&gt;
                    </span>

                    {/* Role badge */}
                    {el.role && (
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {el.role}
                      </span>
                    )}

                    {/* Placeholder indicator badge for inputs */}
                    {placeholder && (
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
                        "{placeholder}"
                      </span>
                    )}

                    {/* Label/text */}
                    {label && !placeholder && (
                      <span className="text-[11px] truncate flex-1 font-medium">
                        {label}
                      </span>
                    )}

                    {/* Visibility indicator */}
                    {!el.is_visible && (
                      <span title="Element hidden in DOM">
                        <EyeOff className="w-3 h-3 text-slate-400 shrink-0" />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            COLUMN 2: Target Viewport & Highlights
           ========================================================================= */}
        <div className="lg:col-span-8 xl:col-span-6 p-4 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col h-[700px]">
          {/* Browser-styled Window Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {/* macOS window dots */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-black dark:text-white" />
                <span>Live Viewport Preview</span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* Interaction Mode Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
                <button
                  type="button"
                  onClick={() => setInteractiveMode("inspect")}
                  className={`px-2 py-0.5 rounded font-medium flex items-center gap-1 transition cursor-pointer ${
                    interactiveMode === "inspect"
                      ? "bg-white dark:bg-black text-black dark:text-white font-bold shadow-2xs"
                      : "text-slate-500 hover:text-black dark:hover:text-white"
                  }`}
                  title="Click on viewport to select and inspect elements"
                >
                  <Crosshair className="w-3 h-3 text-black dark:text-white" />
                  <span>Inspect</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInteractiveMode("interact")}
                  className={`px-2 py-0.5 rounded font-medium flex items-center gap-1 transition cursor-pointer ${
                    interactiveMode === "interact"
                      ? "bg-white dark:bg-black text-black dark:text-white font-bold shadow-2xs"
                      : "text-slate-500 hover:text-black dark:hover:text-white"
                  }`}
                  title="Click directly to click links/buttons live on the page"
                >
                  <MousePointer className="w-3 h-3 text-emerald-500" />
                  <span>Live Click</span>
                </button>
              </div>

              {/* Scroll Up / Down Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!sessionId || isInteracting}
                  onClick={() => handleScroll("up")}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-40 cursor-pointer"
                  title="Scroll live page Up"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={!sessionId || isInteracting}
                  onClick={() => handleScroll("down")}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-40 cursor-pointer"
                  title="Scroll live page Down"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                {selectedElement ? `<${selectedElement.tag}>` : "No selection"}
              </span>

              <button
                type="button"
                onClick={() => {
                  const nextVal = !fullPageScreenshot;
                  setFullPageScreenshot(nextVal);
                  if (url) {
                    intelligenceApi
                      .exploreDom(projectId, url, sessionId || undefined, nextVal)
                      .then((res) => {
                        if (res?.screenshot) setScreenshotUrl(res.screenshot);
                        if (res?.elements) setElements(res.elements);
                      })
                      .catch(() => {});
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer border ${
                  fullPageScreenshot
                    ? "bg-purple-600 text-white border-purple-500 font-bold shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                title="Toggle Full Webpage View vs Viewport Window"
              >
                {fullPageScreenshot ? "Full Page: ON" : "Full Page"}
              </button>

              <button
                type="button"
                onClick={() => setZoomLevel(zoomLevel === "fit" ? "100%" : "fit")}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer text-[10px] font-mono"
                title="Toggle fit / 100% zoom"
              >
                {zoomLevel === "fit" ? "Fit" : "100%"}
              </button>
            </div>
          </div>

          {/* Viewport Screen Canvas */}
          <div className="flex-1 bg-slate-900/60 rounded-xl flex flex-col items-center justify-start relative overflow-hidden my-2 shadow-inner border border-slate-800/80">
            {screenshotUrl ? (
              <div
                onWheel={handleViewportWheel}
                className="w-full h-full relative overflow-auto flex items-start justify-center p-2 select-none scrollbar-thin"
              >
                <div className={`relative inline-block ${zoomLevel === "fit" ? "w-full max-w-full" : ""}`}>
                  <img
                    ref={imgRef}
                    src={screenshotUrl}
                    alt="DOM Snapshot"
                    onLoad={updateImageScale}
                    onClick={handleViewportClick}
                    title={
                      interactiveMode === "interact"
                        ? "Click directly to interact live with the page"
                        : "Click anywhere to inspect closest DOM element"
                    }
                    className={`rounded-lg shadow-2xl select-none mx-auto block ${
                      interactiveMode === "interact" ? "cursor-pointer" : "cursor-crosshair"
                    } ${
                      zoomLevel === "fit"
                        ? fullPageScreenshot
                          ? "w-full h-auto object-contain"
                          : "w-full h-auto max-h-none object-contain"
                        : "w-[1280px] max-w-none"
                    }`}
                  />

                  {/* Click indicator ripple animation */}
                  {clickIndicator && (
                    <div
                      key={clickIndicator.id}
                      className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-emerald-400 bg-emerald-400/40 pointer-events-none animate-ping"
                      style={{
                        left: `${clickIndicator.x}px`,
                        top: `${clickIndicator.y}px`,
                      }}
                    />
                  )}

                  {/* Interactive loading overlay indicator */}
                  {isInteracting && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center rounded-lg pointer-events-none">
                      <div className="bg-black/80 text-white text-[10px] font-mono px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/20">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>Executing Live Action...</span>
                      </div>
                    </div>
                  )}

                  {/* Highlight bounding box accurately scaled to image dimensions */}
                  {boxX !== null && boxY !== null && boxW !== null && boxH !== null && (
                    <div
                      className="absolute border-2 border-emerald-400 bg-emerald-400/25 shadow-lg pointer-events-none animate-pulse rounded"
                      style={{
                        left: `${boxX}px`,
                        top: `${boxY}px`,
                        width: `${boxW}px`,
                        height: `${boxH}px`,
                      }}
                    >
                      <span className="absolute -top-5 left-0 px-1 py-0.2 rounded bg-emerald-500 text-black text-[9px] font-mono font-bold uppercase shadow-xs">
                        {selectedElement?.tag}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shadow-inner">
                  <Camera className="w-7 h-7 text-black dark:text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200">No Viewport Snapshot</p>
                  <p className="text-[11px] text-slate-500 max-w-sm">
                    Enter your target URL and click 'Inspect Snapshot' to stream the live visual DOM preview and interactive bounding boxes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleExploreDOM()}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition cursor-pointer"
                >
                  Capture Live Snapshot
                </button>
              </div>
            )}

            {/* Viewport Bottom Overlay Status Bar & Interactive Quick Type */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2 rounded-xl bg-black/90 backdrop-blur-md border border-white/10 text-[10px] text-slate-300 font-mono space-y-1.5 shadow-2xl">
              {/* Quick Input Bar when interacting with active page */}
              {interactiveMode === "interact" && sessionId && (
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-white/10">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendText();
                    }}
                    placeholder={
                      selectedElement?.selector
                        ? `Type into <${selectedElement.tag}> (${selectedElement.selector.slice(0, 24)})...`
                        : "Type text into active page..."
                    }
                    className="flex-1 bg-white/10 border border-white/15 px-2 py-1 rounded text-white text-[11px] font-sans focus:outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    disabled={!inputText.trim() || isInteracting}
                    onClick={handleSendText}
                    className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-black font-semibold font-sans text-[11px] flex items-center gap-1 transition disabled:opacity-40 cursor-pointer"
                  >
                    <CornerDownLeft className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>
                    Rect: X: {selectedElement?.box?.x ?? 0} Y: {selectedElement?.box?.y ?? 0} W:{" "}
                    {selectedElement?.box?.width ?? 0} H: {selectedElement?.box?.height ?? 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1 font-bold ${
                      selectedElement?.is_visible ? "text-emerald-400" : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedElement?.is_visible ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                      }`}
                    />
                    <span>{selectedElement?.is_visible ? "Visible" : "Hidden"}</span>
                  </span>
                  <span className="text-slate-500">•</span>
                  <span>1280×800 Live Stream</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUMN 3: Element Inspector & Locators
           ========================================================================= */}
        <div className="lg:col-span-12 xl:col-span-3 p-4 rounded-2xl bg-white dark:bg-neutral-950 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col h-[700px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                Element Properties
              </h3>
            </div>
            {selectedElement && candidateLocators[0] && (
              <button
                onClick={() => handleCopy(candidateLocators[0].value, "top_selector")}
                className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                title="Copy best selector"
              >
                {copiedKey === "top_selector" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "top_selector" ? "Copied!" : "Copy Selector"}</span>
              </button>
            )}
          </div>

          {/* Properties Content Area */}
          <div className="flex-1 overflow-y-auto space-y-3.5 py-3 text-xs scrollbar-thin">
            {selectedElement ? (
              <>
                {/* 1. Primary Highlight Card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                      &lt;{selectedElement.tag}&gt;
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${selectedElement.is_visible
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                    >
                      {selectedElement.is_visible ? "Visible" : "Hidden"}
                    </span>
                  </div>

                  {selectedElement.accessible_name && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Accessible Name</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate">
                        "{selectedElement.accessible_name}"
                      </p>
                    </div>
                  )}

                  {selectedElement.text && selectedElement.text !== selectedElement.accessible_name && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Inner Text</span>
                      <p className="font-mono text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2">
                        "{selectedElement.text.trim()}"
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Candidate Locators */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center justify-between">
                    <span>Ranked Candidate Locators</span>
                    <span className="text-[10px] font-normal text-slate-400">Click to copy</span>
                  </span>

                  <div className="space-y-1.5 font-mono text-[10px]">
                    {candidateLocators.map((loc, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleCopy(loc.value, `loc_${idx}`)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer hover:shadow-xs transition ${loc.color}`}
                        title="Click to copy selector"
                      >
                        <div className="truncate mr-2 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[9px] uppercase font-bold px-1 rounded ${loc.badge}`}>
                              {loc.type}
                            </span>
                            <span className="text-[9px] text-slate-500 font-sans">{loc.label}</span>
                          </div>
                          <span className="font-bold font-mono text-xs truncate block">{loc.value}</span>
                        </div>
                        {copiedKey === `loc_${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 shrink-0 opacity-60 hover:opacity-100" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Attributes Dictionary */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                    HTML Attributes
                  </span>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[10px] space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                    {Object.keys(selectedElement.stable_attributes || {}).length === 0 &&
                      Object.keys(selectedElement.aria_properties || {}).length === 0 ? (
                      <span className="text-slate-400 italic">No explicit attributes</span>
                    ) : (
                      <>
                        {Object.entries(selectedElement.stable_attributes || {}).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-1 last:border-none">
                            <span className="text-slate-500 shrink-0">{k}:</span>
                            <span
                              onClick={() => handleCopy(v, `attr_${k}`)}
                              className="text-slate-800 dark:text-slate-200 font-semibold truncate hover:text-blue-500 cursor-pointer"
                              title="Click to copy attribute value"
                            >
                              "{v}"
                            </span>
                          </div>
                        ))}
                        {Object.entries(selectedElement.aria_properties || {}).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-1 last:border-none">
                            <span className="text-blue-600 dark:text-blue-400 shrink-0">{k}:</span>
                            <span
                              onClick={() => handleCopy(v, `aria_${k}`)}
                              className="text-slate-800 dark:text-slate-200 font-semibold truncate hover:text-blue-500 cursor-pointer"
                              title="Click to copy ARIA value"
                            >
                              "{v}"
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* 4. DOM Ancestor Breadcrumbs */}
                {selectedElement.ancestors && selectedElement.ancestors.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                      DOM Ancestors
                    </span>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[10px] flex flex-wrap items-center gap-1 text-slate-500">
                      {selectedElement.ancestors
                        .slice()
                        .reverse()
                        .map((anc, idx) => (
                          <React.Fragment key={idx}>
                            <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                              &lt;{anc.tag}&gt;
                            </span>
                            <ChevronRight className="w-2.5 h-2.5 text-slate-400" />
                          </React.Fragment>
                        ))}
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold">
                        &lt;{selectedElement.tag}&gt;
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2 text-slate-400">
                <Crosshair className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No Element Selected</p>
                <p className="text-[11px] text-slate-400">
                  Select any element from the tree on the left or click directly on the live viewport preview.
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleSaveProfile}
              disabled={!selectedElement}
              className="w-full py-2.5 rounded-xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-40 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Save as Element Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
