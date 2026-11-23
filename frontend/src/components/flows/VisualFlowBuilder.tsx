"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  NodeProps,
  Edge,
  Node,
} from "@xyflow/react";
import {
  Play,
  Save,
  CheckCircle2,
  AlertTriangle,
  Globe,
  MousePointer,
  Edit3,
  FileText,
  Clock,
  GitBranch,
  Camera,
  XCircle,
  Plus,
  Trash2,
  UploadCloud,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Repeat,
  Table,
  ListOrdered,
  Eye,
  Crosshair,
  ArrowLeft,
  RotateCw,
  Calculator,
  Calendar,
  Code,
  Braces,
  Split,
  CheckSquare,
  ArrowDown,
  Search,
  Monitor,
  ExternalLink,
} from "lucide-react";
import { flowsApi, browserApi, executionsApi } from "../../api";
import { useToast } from "../common/ToastProvider";
import { useConfirm } from "../common/ConfirmModal";

// 1. Custom Node Components
const StartNode = ({ selected }: NodeProps) => (
  <div
    className={`px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-950 border transition shadow-sm min-w-[190px] text-xs ${
      selected
        ? "border-black dark:border-white ring-2 ring-neutral-400/20 shadow-md"
        : "border-neutral-200 dark:border-neutral-800"
    }`}
  >
    <div className="flex items-center gap-2 font-bold text-black dark:text-white">
      <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <Play className="w-3 h-3 fill-black dark:fill-white text-black dark:text-white" />
      </div>
      <span>Start Flow</span>
    </div>
    <div className="mt-1 text-[11px] text-neutral-500 font-mono">Entry Point</div>
    <Handle type="source" position={Position.Bottom} className="!bg-black dark:!bg-white !w-2 !h-2" />
  </div>
);

const StopNode = ({ selected }: NodeProps) => (
  <div
    className={`px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-950 border transition shadow-sm min-w-[190px] text-xs ${
      selected
        ? "border-black dark:border-white ring-2 ring-neutral-400/20 shadow-md"
        : "border-neutral-200 dark:border-neutral-800"
    }`}
  >
    <Handle type="target" position={Position.Top} className="!bg-neutral-400 !w-2 !h-2" />
    <div className="flex items-center gap-2 font-bold text-black dark:text-white">
      <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <XCircle className="w-3 h-3 text-black dark:text-white" />
      </div>
      <span>End Flow</span>
    </div>
    <div className="mt-1 text-[11px] text-neutral-500 font-mono">Exit Point</div>
  </div>
);

const ActionNode = ({ data, selected }: NodeProps) => {
  const getIcon = () => {
    switch (data.action) {
      case "navigate": return <Globe className="w-4 h-4 text-black dark:text-white" />;
      case "click": return <MousePointer className="w-4 h-4 text-black dark:text-white" />;
      case "double_click": return <MousePointer className="w-4 h-4 text-black dark:text-white" />;
      case "right_click": return <MousePointer className="w-4 h-4 text-black dark:text-white" />;
      case "hover": return <Eye className="w-4 h-4 text-black dark:text-white" />;
      case "fill": return <Edit3 className="w-4 h-4 text-black dark:text-white" />;
      case "type": return <Edit3 className="w-4 h-4 text-black dark:text-white" />;
      case "press_key": return <Edit3 className="w-4 h-4 text-black dark:text-white" />;
      case "keyboard_type": return <Edit3 className="w-4 h-4 text-black dark:text-white" />;
      case "select": return <ListOrdered className="w-4 h-4 text-black dark:text-white" />;
      case "check": return <CheckSquare className="w-4 h-4 text-black dark:text-white" />;
      case "uncheck": return <CheckSquare className="w-4 h-4 text-neutral-400" />;
      case "focus": return <Crosshair className="w-4 h-4 text-black dark:text-white" />;
      case "clear": return <Trash2 className="w-4 h-4 text-black dark:text-white" />;
      case "scroll": return <ArrowDown className="w-4 h-4 text-black dark:text-white" />;
      case "scroll_into_view": return <ArrowDown className="w-4 h-4 text-black dark:text-white" />;
      case "drag_and_drop": return <MousePointer className="w-4 h-4 text-black dark:text-white" />;
      case "upload_file": return <UploadCloud className="w-4 h-4 text-black dark:text-white" />;
      case "extract_text": return <FileText className="w-4 h-4 text-black dark:text-white" />;
      case "extract_attribute": return <FileText className="w-4 h-4 text-black dark:text-white" />;
      case "extract_table": return <Table className="w-4 h-4 text-black dark:text-white" />;
      case "wait": return <Clock className="w-4 h-4 text-neutral-500" />;
      case "wait_until": return <Clock className="w-4 h-4 text-neutral-400" />;
      case "wait_for_element": return <Clock className="w-4 h-4 text-neutral-400" />;
      case "wait_for_url": return <Clock className="w-4 h-4 text-neutral-400" />;
      case "wait_for_text": return <Clock className="w-4 h-4 text-neutral-400" />;
      case "wait_for_network_idle": return <Clock className="w-4 h-4 text-neutral-400" />;
      case "browser_back": return <ArrowLeft className="w-4 h-4 text-black dark:text-white" />;
      case "browser_forward": return <ArrowRight className="w-4 h-4 text-black dark:text-white" />;
      case "refresh": return <RotateCw className="w-4 h-4 text-black dark:text-white" />;
      case "switch": return <Split className="w-4 h-4 text-black dark:text-white" />;
      case "loop": return <Repeat className="w-4 h-4 text-black dark:text-white" />;
      case "set_variable": return <Code className="w-4 h-4 text-black dark:text-white" />;
      case "string_operation": return <Code className="w-4 h-4 text-black dark:text-white" />;
      case "number_operation": return <Calculator className="w-4 h-4 text-black dark:text-white" />;
      case "json_operation": return <Braces className="w-4 h-4 text-black dark:text-white" />;
      case "date_operation": return <Calendar className="w-4 h-4 text-black dark:text-white" />;
      case "array_operation": return <ListOrdered className="w-4 h-4 text-black dark:text-white" />;
      case "screenshot": return <Camera className="w-4 h-4 text-black dark:text-white" />;
      case "approval":
      case "approval_gate": return <ShieldCheck className="w-4 h-4 text-black dark:text-white" />;
      case "element_visible":
      case "element_hidden":
      case "element_enabled":
      case "element_disabled": return <Eye className="w-4 h-4 text-black dark:text-white" />;
      case "text_equals":
      case "text_contains":
      case "url_equals":
      case "url_contains":
      case "title_equals": return <CheckCircle2 className="w-4 h-4 text-black dark:text-white" />;
      case "element_count": return <Table className="w-4 h-4 text-black dark:text-white" />;
      default: return <Play className="w-4 h-4 text-black dark:text-white" />;
    }
  };

  const status = (data as any).executionStatus;

  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-950 border transition shadow-sm min-w-[190px] text-xs ${
        selected
          ? "border-black dark:border-white ring-2 ring-neutral-400/20 shadow-md"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-neutral-400 !w-2 !h-2" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-black dark:text-white">
          {getIcon()}
          <span className="capitalize">{String(data.action || "Action").replace(/_/g, " ")}</span>
        </div>
        {status && (
          <span
            className={`w-2 h-2 rounded-full ${
              status === "passed"
                ? "bg-white border border-neutral-600"
                : status === "running"
                ? "bg-neutral-400 animate-pulse"
                : "bg-neutral-800"
            }`}
          />
        )}
      </div>
      <div className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400 truncate max-w-[180px]">
        {String(
          (data as any).summary ||
          (data as any).config?.url ||
          (data as any).config?.target?.url ||
          (data as any).config?.selector ||
          (data as any).config?.target?.selector ||
          (data as any).config?.logical_id ||
          ((data as any).config?.value !== undefined && (data as any).config?.value !== "" ? `"${(data as any).config.value}"` : "") ||
          (data as any).config?.value_template ||
          (data as any).config?.key ||
          ""
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-black dark:!bg-white !w-2 !h-2" />
    </div>
  );
};

const ConditionNode = ({ data, selected }: NodeProps) => (
  <div
    className={`px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border transition shadow-sm min-w-[190px] text-xs ${
      selected
        ? "border-black dark:border-white ring-2 ring-neutral-400/20 shadow-md"
        : "border-neutral-300 dark:border-neutral-700"
    }`}
  >
    <Handle type="target" position={Position.Top} className="!bg-neutral-600 !w-2 !h-2" />
    <div className="flex items-center gap-2 font-bold text-black dark:text-white">
      <GitBranch className="w-4 h-4" />
      <span>Condition Branch</span>
    </div>
    <div className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400 font-mono truncate">
      {`${(data as any).config?.variable || "var"} ${(data as any).config?.operator || "=="} ${(data as any).config?.expected_value || "true"}`}
    </div>
    <Handle
      id="true"
      type="source"
      position={Position.Bottom}
      style={{ left: "30%" }}
      className="!bg-black dark:!bg-white !w-2 !h-2"
    />
    <Handle
      id="false"
      type="source"
      position={Position.Bottom}
      style={{ left: "70%" }}
      className="!bg-neutral-500 !w-2 !h-2"
    />
  </div>
);

const LoopNode = ({ data, selected }: NodeProps) => (
  <div
    className={`px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border transition shadow-sm min-w-[190px] text-xs ${
      selected
        ? "border-black dark:border-white ring-2 ring-neutral-400/20 shadow-md"
        : "border-neutral-300 dark:border-neutral-700"
    }`}
  >
    <Handle type="target" position={Position.Top} className="!bg-neutral-600 !w-2 !h-2" />
    <div className="flex items-center gap-2 font-bold text-black dark:text-white">
      <Repeat className="w-4 h-4" />
      <span>Loop (for/while)</span>
    </div>
    <div className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400 font-mono truncate">
      {`Iterations: ${(data as any).config?.iterations || (data as any).config?.max_iterations || 10}`}
    </div>
    <div className="flex justify-between items-center text-[10px] text-neutral-600 dark:text-neutral-400 mt-1 px-1 font-semibold">
      <span>Body</span>
      <span>Exit</span>
    </div>
    <Handle
      id="loop_body"
      type="source"
      position={Position.Bottom}
      style={{ left: "25%" }}
      className="!bg-black dark:!bg-white !w-2 !h-2"
    />
    <Handle
      id="loop_exit"
      type="source"
      position={Position.Bottom}
      style={{ left: "75%" }}
      className="!bg-neutral-400 !w-2 !h-2"
    />
  </div>
);

// Categorized Catalog of Browser, Logic, Data, and Control Actions
const ACTION_CATALOG = [
  // Browser Actions
  { action: "navigate", label: "Navigate URL", icon: Globe, category: "Browser" },
  { action: "click", label: "Click", icon: MousePointer, category: "Browser" },
  { action: "double_click", label: "Double Click", icon: MousePointer, category: "Browser" },
  { action: "right_click", label: "Right Click", icon: MousePointer, category: "Browser" },
  { action: "hover", label: "Hover Element", icon: Eye, category: "Browser" },
  { action: "fill", label: "Fill Input", icon: Edit3, category: "Browser" },
  { action: "type", label: "Type Text", icon: Edit3, category: "Browser" },
  { action: "press_key", label: "Press Key", icon: Edit3, category: "Browser" },
  { action: "keyboard_type", label: "Keyboard Type", icon: Edit3, category: "Browser" },
  { action: "focus", label: "Focus Element", icon: Crosshair, category: "Browser" },
  { action: "clear", label: "Clear Input", icon: Trash2, category: "Browser" },
  { action: "select", label: "Select Option", icon: ListOrdered, category: "Browser" },
  { action: "check", label: "Check Checkbox", icon: CheckSquare, category: "Browser" },
  { action: "uncheck", label: "Uncheck Checkbox", icon: CheckSquare, category: "Browser" },
  { action: "scroll", label: "Scroll Page", icon: ArrowDown, category: "Browser" },
  { action: "scroll_into_view", label: "Scroll Into View", icon: ArrowDown, category: "Browser" },
  { action: "drag_and_drop", label: "Drag & Drop", icon: MousePointer, category: "Browser" },
  { action: "upload_file", label: "Upload File", icon: UploadCloud, category: "Browser" },
  { action: "wait", label: "Wait Delay", icon: Clock, category: "Browser" },
  { action: "wait_until", label: "Wait Until State", icon: Clock, category: "Browser" },
  { action: "wait_for_element", label: "Wait For Element", icon: Clock, category: "Browser" },
  { action: "wait_for_url", label: "Wait For URL", icon: Globe, category: "Browser" },
  { action: "wait_for_text", label: "Wait For Text", icon: FileText, category: "Browser" },
  { action: "wait_for_network_idle", label: "Wait Network Idle", icon: Activity, category: "Browser" },
  { action: "screenshot", label: "Screenshot", icon: Camera, category: "Browser" },
  { action: "browser_back", label: "Browser Back", icon: ArrowLeft, category: "Browser" },
  { action: "browser_forward", label: "Browser Forward", icon: ArrowRight, category: "Browser" },
  { action: "refresh", label: "Refresh Page", icon: RotateCw, category: "Browser" },
  { action: "evaluate_js", label: "Run JavaScript", icon: Code, category: "Browser" },
  { action: "extract_text", label: "Extract Text", icon: FileText, category: "Browser" },
  { action: "extract_attribute", label: "Extract Attribute", icon: FileText, category: "Browser" },
  { action: "extract_table", label: "Extract Table", icon: Table, category: "Browser" },

  // Logic & Branching Actions
  { action: "condition", label: "Condition (If/Else)", icon: GitBranch, category: "Logic" },
  { action: "switch", label: "Switch Case", icon: Split, category: "Logic" },
  { action: "loop", label: "For Loop", icon: Repeat, category: "Logic" },
  { action: "while_loop", label: "While Loop", icon: Repeat, category: "Logic" },
  { action: "break", label: "Break Loop", icon: XCircle, category: "Logic" },
  { action: "continue", label: "Continue Loop", icon: ArrowRight, category: "Logic" },

  // Data Operations
  { action: "set_variable", label: "Set Variable", icon: Code, category: "Data" },
  { action: "string_operation", label: "String Operations", icon: FileText, category: "Data" },
  { action: "number_operation", label: "Number Operations", icon: Calculator, category: "Data" },
  { action: "json_operation", label: "JSON Operations", icon: Braces, category: "Data" },
  { action: "date_operation", label: "Date Operations", icon: Calendar, category: "Data" },
  { action: "array_operation", label: "Array Operations", icon: ListOrdered, category: "Data" },

  // Assertions
  { action: "element_visible", label: "Element Visible", icon: Eye, category: "Assertions" },
  { action: "element_hidden", label: "Element Hidden", icon: Eye, category: "Assertions" },
  { action: "element_enabled", label: "Element Enabled", icon: CheckCircle2, category: "Assertions" },
  { action: "element_disabled", label: "Element Disabled", icon: XCircle, category: "Assertions" },
  { action: "text_equals", label: "Text Equals", icon: FileText, category: "Assertions" },
  { action: "text_contains", label: "Text Contains", icon: FileText, category: "Assertions" },
  { action: "url_equals", label: "URL Equals", icon: Globe, category: "Assertions" },
  { action: "url_contains", label: "URL Contains", icon: Globe, category: "Assertions" },
  { action: "title_equals", label: "Title Equals", icon: FileText, category: "Assertions" },
  { action: "element_count", label: "Element Count", icon: Table, category: "Assertions" },

  // Control Actions
  { action: "approval_gate", label: "Human Approval", icon: ShieldCheck, category: "Control" },
  { action: "stop", label: "Stop Flow", icon: XCircle, category: "Control" },
];

const normalizeNode = (n: any, idx: number): Node => {
  const rawType = String(n.type || n.action || "action").toLowerCase();
  let resolvedType = rawType;
  if (rawType === "start") {
    resolvedType = "start";
  } else if (rawType === "stop" || rawType === "end") {
    resolvedType = "stop";
  } else if (rawType === "condition" || rawType === "if_else") {
    resolvedType = "condition";
  } else if (rawType === "loop" || rawType === "while_loop") {
    resolvedType = "loop";
  } else {
    resolvedType = "action";
  }

  const action =
    n.action ||
    (rawType !== "action" && rawType !== "condition" && rawType !== "loop" && rawType !== "stop" && rawType !== "end" && rawType !== "start" ? rawType : undefined) ||
    (resolvedType === "start" ? "start" : resolvedType === "stop" ? "stop" : "action");

  const cfg = { ...(n.config || {}), ...(n.data?.config || {}) };
  const selector = cfg.selector || cfg.target?.selector || (typeof cfg.target === "string" ? cfg.target : "");
  const url = cfg.url || cfg.target?.url || (action === "navigate" && typeof cfg.target === "string" ? cfg.target : "");
  const val = cfg.value !== undefined ? cfg.value : (cfg.value_template !== undefined ? cfg.value_template : cfg.text);

  let summary = n.data?.summary || url || selector || cfg.logical_id || "";
  if (!summary && val !== undefined && val !== "") {
    summary = `Value: ${val}`;
  }
  if (!summary && action) {
    summary = action.replace(/_/g, " ");
  }

  return {
    id: n.id || `node_${idx + 1}`,
    type: resolvedType,
    position: n.position && typeof n.position.x === "number" && typeof n.position.y === "number"
      ? n.position
      : { x: 280, y: 50 + idx * 110 },
    data: {
      action,
      config: {
        ...cfg,
        ...(selector ? { selector, target: { selector } } : {}),
        ...(url ? { url, target: { url } } : {}),
        ...(val !== undefined ? { value: val, value_template: val } : {}),
      },
      summary: String(summary || ""),
      label: action,
      ...(n.data || {}),
    },
  };
};

interface VisualFlowBuilderProps {
  flowId?: string;
  projectId: string;
  initialDefinition?: any;
  flowName?: string;
  onSaveSuccess?: () => void;
  onNavigateHistory?: () => void;
}

export const VisualFlowBuilder: React.FC<VisualFlowBuilderProps> = ({
  flowId,
  projectId,
  initialDefinition,
  flowName = "New Automation Flow",
  onSaveSuccess,
  onNavigateHistory,
}) => {
  const nodeTypes = useMemo(
    () => ({
      start: StartNode,
      end: StopNode,
      stop: StopNode,
      action: ActionNode,
      condition: ConditionNode,
      loop: LoopNode,
      // Map all action types to ActionNode as fallbacks
      navigate: ActionNode,
      click: ActionNode,
      double_click: ActionNode,
      right_click: ActionNode,
      hover: ActionNode,
      fill: ActionNode,
      type: ActionNode,
      press_key: ActionNode,
      keyboard_type: ActionNode,
      focus: ActionNode,
      clear: ActionNode,
      select: ActionNode,
      check: ActionNode,
      uncheck: ActionNode,
      scroll: ActionNode,
      scroll_into_view: ActionNode,
      drag_and_drop: ActionNode,
      upload_file: ActionNode,
      wait: ActionNode,
      wait_until: ActionNode,
      wait_for_element: ActionNode,
      wait_for_url: ActionNode,
      wait_for_text: ActionNode,
      wait_for_network_idle: ActionNode,
      screenshot: ActionNode,
      browser_back: ActionNode,
      browser_forward: ActionNode,
      refresh: ActionNode,
      evaluate_js: ActionNode,
      extract_text: ActionNode,
      extract_attribute: ActionNode,
      extract_table: ActionNode,
      approval_gate: ActionNode,
      set_variable: ActionNode,
      string_operation: ActionNode,
      number_operation: ActionNode,
      json_operation: ActionNode,
      date_operation: ActionNode,
      array_operation: ActionNode,
      element_visible: ActionNode,
      element_hidden: ActionNode,
      element_enabled: ActionNode,
      element_disabled: ActionNode,
      text_equals: ActionNode,
      text_contains: ActionNode,
      url_equals: ActionNode,
      url_contains: ActionNode,
      title_equals: ActionNode,
      element_count: ActionNode,
    }),
    []
  );

  // Helper to ensure all edge keys are globally unique to eliminate React Flow key warnings
  const sanitizeEdges = (rawEdges: any[]): Edge[] => {
    if (!Array.isArray(rawEdges)) return [];
    const seen = new Set<string>();
    return rawEdges.map((e: any, idx: number) => {
      let baseId = e.id || `e_${e.source || "src"}_${e.target || "tgt"}`;
      let finalId = baseId;
      if (seen.has(finalId)) {
        finalId = `${baseId}_${idx}`;
      }
      seen.add(finalId);
      return {
        id: finalId,
        source: String(e.source || ""),
        target: String(e.target || ""),
        sourceHandle: e.source_handle || e.sourceHandle || null,
        animated: e.animated ?? false,
      };
    });
  };

  const defaultNodes: Node[] = (initialDefinition?.nodes || []).map(normalizeNode);
  const defaultEdges: Edge[] = sanitizeEdges(initialDefinition?.edges || []);

  const [activeFlowId, setActiveFlowId] = useState<string | null>(flowId || null);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node_1");
  const [name, setName] = useState(flowName);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [isHeadless, setIsHeadless] = useState<boolean>(true);
  const [blockedPopupUrl, setBlockedPopupUrl] = useState<string | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<any[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("All");

  const { success, error, warning, info } = useToast();
  const { confirm } = useConfirm();

  // Sync flowId prop to activeFlowId
  useEffect(() => {
    if (flowId) {
      setActiveFlowId(flowId);
    }
  }, [flowId]);

  // Load flow definition when activeFlowId or initialDefinition changes
  useEffect(() => {
    if (activeFlowId) {
      flowsApi
        .get(activeFlowId)
        .then((flow) => {
          if (!flow) return;
          if (flow.name) setName(flow.name);
          const def = flow.definition || flow.current_version?.definition_json;
          if (def && Array.isArray(def.nodes) && def.nodes.length > 0) {
            const loadedNodes: Node[] = def.nodes.map(normalizeNode);
            const loadedEdges: Edge[] = sanitizeEdges(def.edges || []);
            setNodes(loadedNodes);
            setEdges(loadedEdges);
            if (loadedNodes.length > 0) {
              setSelectedNodeId(loadedNodes[0].id);
            }
          }
        })
        .catch((err) => {
          console.warn("Could not load flow:", err);
        });
    } else if (initialDefinition && Array.isArray(initialDefinition.nodes) && initialDefinition.nodes.length > 0) {
      if (initialDefinition.name) setName(initialDefinition.name);
      const loadedNodes: Node[] = initialDefinition.nodes.map(normalizeNode);
      const loadedEdges: Edge[] = sanitizeEdges(initialDefinition.edges || []);
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      if (loadedNodes.length > 0) {
        setSelectedNodeId(loadedNodes[0].id);
      }
    } else if (nodes.length === 0) {
      // Sensible initial flow for new workflows
      const starterNodes: Node[] = [
        {
          id: "node_1",
          type: "action",
          position: { x: 250, y: 100 },
          data: {
            action: "navigate",
            config: { url: "https://example.com", timeout: 30, wait_until: "load" },
            summary: "https://example.com",
          },
        },
        {
          id: "node_2",
          type: "stop",
          position: { x: 250, y: 220 },
          data: {
            action: "stop",
            config: { reason: "Flow completed successfully" },
            summary: "Stop",
          },
        },
      ];
      const starterEdges: Edge[] = [
        { id: "e_1_2", source: "node_1", target: "node_2" },
      ];
      setNodes(starterNodes);
      setEdges(starterEdges);
      setSelectedNodeId("node_1");
    }
  }, [activeFlowId]);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: params.id || `e_${params.source}_${params.target}_${Date.now()}`,
          },
          eds
        )
      ),
    [setEdges]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const filteredCatalog = useMemo(() => {
    return ACTION_CATALOG.filter((item) => {
      const matchCat = catalogCategory === "All" || item.category === catalogCategory;
      const matchSearch =
        catalogSearch.trim() === "" ||
        item.label.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        item.action.toLowerCase().includes(catalogSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [catalogCategory, catalogSearch]);

  // Add node from left action catalog
  const addNodeFromCatalog = (action: string) => {
    const newId = `node_${Date.now()}`;
    const type =
      action === "condition"
        ? "condition"
        : action === "stop"
        ? "stop"
        : action === "loop" || action === "while_loop"
        ? "loop"
        : "action";

    const defaultConfigs: Record<string, any> = {
      // Browser
      navigate: { url: "https://example.com", timeout: 30, wait_until: "load" },
      click: { selector: "", logical_id: "button_element", recognition_strategy: "deterministic_multi_factor", timeout: 15, retry_count: 0 },
      double_click: { selector: "", logical_id: "grid_row", timeout: 10 },
      right_click: { selector: "", logical_id: "context_menu_target" },
      hover: { selector: "", logical_id: "nav_dropdown" },
      fill: { selector: "", logical_id: "input_element", value_template: "Sample Input", is_secret: false },
      type: { selector: "", logical_id: "input_element", text: "Hello World", delay_ms: 50 },
      press_key: { key: "Enter" },
      keyboard_type: { text: "Hello World" },
      focus: { selector: "" },
      clear: { selector: "" },
      scroll_into_view: { selector: "" },
      drag_and_drop: { source_selector: "", destination_selector: "" },
      upload_file: { selector: "", files: [] },
      select: { selector: "", logical_id: "dropdown_element", option_value: "1" },
      check: { selector: "", logical_id: "terms_checkbox" },
      uncheck: { selector: "", logical_id: "newsletter_checkbox" },
      scroll: { direction: "down", amount: 400 },
      wait: { duration_ms: 2000, condition: "none" },
      wait_until: { selector: "#target-element", condition: "visible", timeout_ms: 10000 },
      wait_for_element: { selector: "", state: "visible", timeout_ms: 10000 },
      wait_for_url: { url_pattern: "https://example.com/success", is_regex: false, timeout_ms: 10000 },
      wait_for_text: { selector: "body", text: "Welcome", exact: false, timeout_ms: 10000 },
      wait_for_network_idle: { timeout_ms: 10000 },
      screenshot: { filename: "step_capture.png", full_page: false },
      browser_back: {},
      browser_forward: {},
      refresh: {},
      evaluate_js: { script: "return document.title;", variable_name: "page_title" },
      extract_text: { selector: "", logical_id: "heading_element", target_variable: "extracted_header" },
      extract_attribute: { selector: "", logical_id: "link_element", attribute_name: "href", target_variable: "extracted_link" },
      extract_table: { selector: "", logical_id: "data_table", target_variable: "table_rows" },

      // Logic
      condition: { variable: "status_code", operator: "==", expected_value: "200" },
      switch: { expression: "{{status}}", cases: ["active", "pending", "default"] },
      loop: { collection_variable: "items", iterator_variable: "item", max_iterations: 10 },
      while_loop: { condition_variable: "has_more", max_iterations: 20 },
      break: {},
      continue: {},

      // Data
      set_variable: { variable_name: "custom_var", value_template: "value" },
      string_operation: { operation: "upper", input: "Sample Text", output_variable: "str_result" },
      number_operation: { operation: "add", a: 10, b: 5, output_variable: "num_result" },
      json_operation: { operation: "parse", input: '{"status": "ok"}', output_variable: "json_result" },
      date_operation: { operation: "now", output_variable: "date_result", format: "%Y-%m-%d" },
      array_operation: { operation: "length", array: [], output_variable: "arr_result" },

      // Control
      approval_gate: { approver_role: "Admin", prompt: "Approve critical order mutation", timeout_hours: 24 },
      stop: { reason: "Flow completed successfully", status_code: 0 },
    };

    const newNode: Node = {
      id: newId,
      type,
      position: { x: 280, y: 50 + (nodes.length + 1) * 110 },
      data: {
        action,
        config: defaultConfigs[action] || {},
        summary: defaultConfigs[action]?.url || defaultConfigs[action]?.logical_id || defaultConfigs[action]?.selector || action,
        label: action,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    if (nodes.length > 0) {
      const prevNode = nodes[nodes.length - 1];
      setEdges((eds) => [
        ...eds,
        {
          id: `e_${prevNode.id}_${newId}`,
          source: prevNode.id,
          target: newId,
        },
      ]);
    }
    setSelectedNodeId(newId);
    success("Node Added", `Added '${action.replace(/_/g, " ")}' to canvas.`);
  };

  // Update selected node configuration
  const updateConfig = (key: string, value: any) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedNodeId) return n;
        const currentConfig = (n.data?.config as Record<string, any>) || {};
        const newConfig = { ...currentConfig, [key]: value };
        if (key === "selector") {
          newConfig.target = { ...(newConfig.target || {}), selector: value };
        }
        if (key === "url") {
          newConfig.target = { ...(newConfig.target || {}), url: value };
        }
        if (key === "value" || key === "value_template") {
          newConfig.value = value;
          newConfig.value_template = value;
        }
        const summary =
          newConfig.url ||
          newConfig.target?.url ||
          newConfig.selector ||
          newConfig.target?.selector ||
          newConfig.logical_id ||
          (newConfig.value !== undefined && newConfig.value !== "" ? `Value: ${newConfig.value}` : "") ||
          newConfig.value_template ||
          String(n.data?.action || "");

        return {
          ...n,
          data: {
            ...n.data,
            config: newConfig,
            summary: String(summary || ""),
          },
        };
      })
    );
  };

  // Delete selected node
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    confirm({
      title: "Delete Node",
      message: `Delete selected step '${selectedNode?.data?.action || selectedNodeId}' from the workflow?`,
      confirmText: "Delete Node",
      variant: "danger",
      onConfirm: () => {
        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
        setSelectedNodeId(null);
        success("Node Removed", "Step deleted from flow DAG.");
      },
    });
  };

  // Helper to compile clean FlowGraphDefinition payload
  const compileFlowDefinition = () => {
    return {
      name,
      start_node_id: nodes.find((n) => n.type === "start")?.id || nodes[0]?.id || "node-start",
      nodes: nodes.map((n) => {
        const cfg = (n.data?.config as Record<string, any>) || {};
        const sel = cfg.selector || cfg.target?.selector;
        return {
          id: n.id,
          type: n.type || "action",
          action: n.data?.action || n.type,
          config: {
            ...cfg,
            target: sel ? { selector: sel, logical_id: cfg.logical_id, fallbacks: cfg.fallbacks || [] } : cfg.target,
            selector: sel,
            value: cfg.value !== undefined ? cfg.value : (cfg.value_template !== undefined ? cfg.value_template : cfg.text),
            value_template: cfg.value_template !== undefined ? cfg.value_template : cfg.value,
          },
          position: n.position,
        };
      }),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        source_handle: e.sourceHandle || (e as any).source_handle || null,
      })),
    };
  };

  // Validate Flow DAG with backend engine
  const handleValidateDAG = async () => {
    if (nodes.length === 0) {
      error("Validation Failed", "Workflow canvas must have at least one node.");
      return;
    }

    const flowDef = compileFlowDefinition();

    try {
      const res = await flowsApi.validate(flowDef);
      if (res.warnings && res.warnings.length > 0) {
        warning("Graph Topology Warnings", res.warnings.join(" | "));
      } else {
        success("DAG Validated", `Workflow topology verified (${res.node_count} nodes, ${res.edge_count} edges).`);
      }
    } catch (err: any) {
      error("DAG Validation Failed", err.message || "Invalid flow graph topology.");
    }
  };

  // Save Draft to PostgreSQL
  const handleSaveDraft = async () => {
    if (nodes.length === 0) {
      error("Cannot Save", "Add at least one node to canvas before saving.");
      return;
    }
    setSaving(true);
    const flowDef = compileFlowDefinition();

    try {
      if (activeFlowId) {
        await flowsApi.update(activeFlowId, { name, definition: flowDef });
        success("Draft Saved", `Updated flow '${name}' in PostgreSQL.`);
      } else {
        const created = await flowsApi.create({ project_id: projectId, name, definition: flowDef });
        if (created && created.id) {
          setActiveFlowId(created.id);
        }
        success("Draft Saved", `Created flow '${name}' in PostgreSQL.`);
      }
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      error("Save Failed", err.message || "Could not save flow draft.");
    } finally {
      setSaving(false);
    }
  };

  // Publish Immutable Version
  const handlePublish = async () => {
    setSaving(true);
    try {
      let fid = activeFlowId;
      if (!fid) {
        const flowDef = compileFlowDefinition();
        const created = await flowsApi.create({ project_id: projectId, name, definition: flowDef });
        fid = created.id;
        setActiveFlowId(created.id);
      }
      await flowsApi.publish(fid!);
      success("Flow Published", "Created immutable published definition with SHA-256 checksum.");
    } catch (err: any) {
      error("Publishing Failed", err.message || "Failed to publish flow.");
    } finally {
      setSaving(false);
    }
  };

  // Execute Flow DAG via Agent Browser
  const handleExecute = async () => {
    if (nodes.length === 0) {
      error("Cannot Execute", "Canvas has no nodes to execute.");
      return;
    }

    const fid = activeFlowId || flowId;
    const runnerUrl = fid
      ? `/dashboard?view=automation_live_runner&flowId=${fid}&headless=${isHeadless}&autostart=true`
      : `/dashboard?view=automation_live_runner&headless=${isHeadless}&autostart=true`;

    // 1. Immediately open new tab synchronously on user click gesture (guarantees browser allows it)
    let newTab: Window | null = null;
    try {
      if (typeof window !== "undefined") {
        newTab = window.open(runnerUrl, "_blank");
      }
    } catch {}

    if (!newTab || newTab.closed) {
      setBlockedPopupUrl(runnerUrl);
      info("Popup Blocked", "Your browser prevented opening the new tab automatically. Click 'Open in Tab' in the toolbar.");
    } else {
      setBlockedPopupUrl(null);
      success("Opening Live Runner", "Automation launched in a new tab.");
    }

    setExecuting(true);
    setConsoleOpen(true);
    setConsoleLogs([
      {
        step: "Init",
        action: `Launching Live Runner (${isHeadless ? "Headless Viewport" : "Headed Browser"})`,
        status: "running",
        duration: "0.1s",
        error: null,
        time: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      // Persist draft in background
      const flowDef = compileFlowDefinition();
      if (fid) {
        await flowsApi.update(fid, { name, definition: flowDef });
      } else {
        const created = await flowsApi.create({ project_id: projectId, name, definition: flowDef });
        if (created && created.id) {
          setActiveFlowId(created.id);
          const newUrl = `/dashboard?view=automation_live_runner&flowId=${created.id}&headless=${isHeadless}&autostart=true`;
          if (newTab && !newTab.closed) {
            newTab.location.href = newUrl;
          }
        }
      }
    } catch (saveErr) {
      console.warn("Background draft update:", saveErr);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-neutral-50 dark:bg-black">
      {/* 1. TOP TOOLBAR */}
      <div className="h-13 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white border border-neutral-200 dark:border-neutral-800 flex items-center justify-center font-bold text-xs">
            <GitBranch className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-bold text-xs text-neutral-900 dark:text-white bg-transparent border-b border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 focus:border-black dark:focus:border-white focus:outline-none px-1 py-0.5 max-w-sm"
          />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 font-mono text-neutral-500 dark:text-neutral-400">
            {nodes.length} Steps
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Validate Button */}
          <button
            onClick={handleValidateDAG}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Check className="w-3.5 h-3.5 text-black dark:text-white" />
            <span>Validate DAG</span>
          </button>

          {/* Save Draft Button */}
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-neutral-500" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-black dark:text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Publish</span>
          </button>

          {/* Mode Switcher: Headless (Live Viewport) vs Headed (Real Browser) */}
          <div className="flex items-center rounded-lg border border-neutral-300 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-900 text-xs">
            <button
              type="button"
              onClick={() => setIsHeadless(true)}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 ${
                isHeadless
                  ? "bg-white dark:bg-black text-black dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-black dark:hover:text-white"
              }`}
              title="Headless Mode: View live website viewport inside runner tab"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Headless</span>
            </button>
            <button
              type="button"
              onClick={() => setIsHeadless(false)}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center gap-1.5 ${
                !isHeadless
                  ? "bg-white dark:bg-black text-black dark:text-white shadow-xs"
                  : "text-neutral-500 hover:text-black dark:hover:text-white"
              }`}
              title="Headed Mode: Opens real visible browser window on machine"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Headed</span>
            </button>
          </div>

          {/* Direct New Tab Anchor Link */}
          <a
            href={`/dashboard?view=automation_live_runner&flowId=${activeFlowId || flowId || ""}&headless=${isHeadless}&autostart=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-black dark:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Open Live Flow Runner in a new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in Tab</span>
          </a>

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={executing}
            className="px-3.5 py-1.5 rounded-lg bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${executing ? "animate-spin" : ""}`} />
            <span>{executing ? "Launching..." : "Execute Flow"}</span>
          </button>
        </div>
      </div>

      {/* Pop-up blocked warning banner */}
      {blockedPopupUrl && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Browser Pop-up was blocked:</span>
            <span>Click to launch the live viewport automation tab:</span>
          </div>
          <a
            href={blockedPopupUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setBlockedPopupUrl(null)}
            className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <span>Open Runner Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* 2. 3-PANEL WORKSPACE (Left Catalog, Center Canvas, Right Configuration) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANEL: Action Catalog */}
        <div className="w-64 bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-bold text-xs text-slate-700 dark:text-slate-300">
              <span>Action Catalog</span>
              <span className="text-[10px] text-slate-400 font-mono">{filteredCatalog.length} Actions</span>
            </div>
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Search actions..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px] font-semibold">
              {["All", "Browser", "Assertions", "Logic", "Data", "Control"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCatalogCategory(cat)}
                  className={`px-2 py-0.5 rounded-md transition shrink-0 ${
                    catalogCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
            {filteredCatalog.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.action}
                  onClick={() => addNodeFromCatalog(item.action)}
                  className="w-full flex items-center justify-between p-2 rounded-lg border border-neutral-100 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left transition group"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-black dark:text-white group-hover:scale-110 transition shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block leading-tight">
                        {item.label}
                      </span>
                      <span className="text-[9px] text-neutral-400 block">{item.category}</span>
                    </div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-neutral-400 group-hover:text-black dark:group-hover:text-white transition shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER PANEL: React Flow Canvas */}
        <div className="flex-1 h-full relative bg-neutral-50 dark:bg-black">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            fitView
            className="bg-neutral-50 dark:bg-black"
          >
            <Controls className="!bg-white dark:!bg-neutral-950 !border-neutral-200 dark:!border-neutral-800 !rounded-lg !shadow-sm" />
            <MiniMap className="!bg-white dark:!bg-neutral-950 !border-neutral-200 dark:!border-neutral-800 !rounded-lg" />
            <Background color="#737373" gap={16} size={1} />
          </ReactFlow>
        </div>

        {/* RIGHT PANEL: Step Configuration Inspector */}
        <div className="w-80 bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 font-bold text-xs text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
            <span>Step Configuration</span>
            {selectedNode && (
              <button
                onClick={deleteSelectedNode}
                className="text-neutral-500 hover:text-black dark:hover:text-white p-1 rounded"
                title="Delete Step"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
            {!selectedNode ? (
              <div className="p-4 text-center text-neutral-400 text-xs">
                Select a step on the canvas to configure parameters.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-white capitalize">
                      {String(selectedNode.data?.action || selectedNode.type || "Step").replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono block">
                      ID: {selectedNode.id}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white font-mono">
                    {selectedNode.type}
                  </span>
                </div>

                {selectedNode.type === "start" && (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1">
                    <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 text-black dark:text-white" /> Start Trigger
                    </div>
                    <p className="text-neutral-500 text-[11px]">
                      Execution begins at this trigger and runs through all connected workflow actions.
                    </p>
                  </div>
                )}

                {(selectedNode.type === "stop" || selectedNode.type === "end") && (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1">
                    <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-black dark:text-white" /> End of Flow
                    </div>
                    <p className="text-neutral-500 text-[11px]">
                      The automation flow terminates successfully when reaching this point.
                    </p>
                  </div>
                )}

                {/* Parameters by Action */}
                {selectedNode.data?.action === "navigate" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target URL *</label>
                      <input
                        type="url"
                        value={(selectedNode.data?.config as any)?.url || (selectedNode.data?.config as any)?.target?.url || ""}
                        onChange={(e) => updateConfig("url", e.target.value)}
                        placeholder="https://example.com/checkout"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Timeout (seconds)</label>
                      <input
                        type="number"
                        value={(selectedNode.data?.config as any)?.timeout || 30}
                        onChange={(e) => updateConfig("timeout", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {(["click", "double_click", "right_click", "hover", "check", "uncheck", "focus", "clear", "scroll_into_view", "fill", "type"].includes(String(selectedNode.data?.action))) && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Target Selector *</label>
                        <button
                          type="button"
                          onClick={() => {
                            const sel = (selectedNode.data?.config as any)?.selector || (selectedNode.data?.config as any)?.target?.selector;
                            if (sel) {
                              browserApi.validateSelector(sel)
                                .then((r) => r.is_valid ? success("Valid Selector", `Recognized as ${r.selector_type.toUpperCase()}`) : error("Invalid Selector", r.error_message))
                                .catch((e) => error("Validation Error", e.message));
                            } else {
                              warning("Empty Selector", "Enter a selector first.");
                            }
                          }}
                          className="text-[10px] text-black dark:text-white hover:underline flex items-center gap-0.5"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Check Syntax
                        </button>
                      </div>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.selector || (selectedNode.data?.config as any)?.target?.selector || ""}
                        onChange={(e) => updateConfig("selector", e.target.value)}
                        placeholder="#submit-btn, input[name='search'], testid=order"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>

                    {(selectedNode.data?.action === "fill" || selectedNode.data?.action === "type") && (
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Input Value / Text *</label>
                        <input
                          type="text"
                          value={(selectedNode.data?.config as any)?.value !== undefined ? (selectedNode.data?.config as any)?.value : ((selectedNode.data?.config as any)?.value_template || "")}
                          onChange={(e) => {
                            updateConfig("value", e.target.value);
                            updateConfig("value_template", e.target.value);
                          }}
                          placeholder="Text to fill or {{env.variable}}"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    )}

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Fallbacks (comma-separated)</label>
                      <input
                        type="text"
                        value={((selectedNode.data?.config as any)?.fallbacks || []).join(", ")}
                        onChange={(e) => updateConfig("fallbacks", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                        placeholder=".backup-btn, button[type='submit']"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Logical ID (Profile)</label>
                        <input
                          type="text"
                          value={(selectedNode.data?.config as any)?.logical_id || ""}
                          onChange={(e) => updateConfig("logical_id", e.target.value)}
                          placeholder="e.g. submit_btn"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Retries</label>
                        <select
                          value={(selectedNode.data?.config as any)?.retry_count ?? 0}
                          onChange={(e) => updateConfig("retry_count", Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[11px]"
                        >
                          <option value={0}>0 (No retry)</option>
                          <option value={1}>1 Retry</option>
                          <option value={2}>2 Retries</option>
                          <option value={3}>3 Retries</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "press_key" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Key / Shortcut *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.key || "Enter"}
                        onChange={(e) => updateConfig("key", e.target.value)}
                        placeholder="Enter, Tab, Escape, Control+a"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "keyboard_type" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Text to Type *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.text || ""}
                        onChange={(e) => updateConfig("text", e.target.value)}
                        placeholder="Real keystroke input"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "drag_and_drop" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Source Selector *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.source_selector || ""}
                        onChange={(e) => updateConfig("source_selector", e.target.value)}
                        placeholder="#card-1, [data-draggable]"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Destination Selector *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.destination_selector || ""}
                        onChange={(e) => updateConfig("destination_selector", e.target.value)}
                        placeholder="#column-done, [data-droppable]"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "upload_file" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">File Input Selector *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.selector || ""}
                        onChange={(e) => updateConfig("selector", e.target.value)}
                        placeholder="input[type='file'], #avatar-upload"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">File Paths (comma-separated)</label>
                      <input
                        type="text"
                        value={((selectedNode.data?.config as any)?.files || []).join(", ")}
                        onChange={(e) => updateConfig("files", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                        placeholder="/path/to/invoice.pdf, /path/to/doc.png"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "evaluate_js" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">JavaScript Code *</label>
                      <textarea
                        rows={3}
                        value={(selectedNode.data?.config as any)?.script || ""}
                        onChange={(e) => updateConfig("script", e.target.value)}
                        placeholder="return document.querySelector('.price')?.innerText;"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Store in Variable</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.variable_name || ""}
                        onChange={(e) => updateConfig("variable_name", e.target.value)}
                        placeholder="e.g. page_title"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "wait_for_element" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Selector *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.selector || ""}
                        onChange={(e) => updateConfig("selector", e.target.value)}
                        placeholder="#submit-btn, .modal"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Desired State</label>
                      <select
                        value={(selectedNode.data?.config as any)?.state || "visible"}
                        onChange={(e) => updateConfig("state", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="visible">Visible</option>
                        <option value="clickable">Clickable (Visible + Enabled + Stable)</option>
                        <option value="hidden">Hidden / Detached</option>
                        <option value="present">Present in DOM</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Timeout (ms)</label>
                      <input
                        type="number"
                        value={(selectedNode.data?.config as any)?.timeout_ms || 10000}
                        onChange={(e) => updateConfig("timeout_ms", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "wait_for_url" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">URL Pattern / Substring *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.url_pattern || ""}
                        onChange={(e) => updateConfig("url_pattern", e.target.value)}
                        placeholder="/dashboard or https://app.corp.internal/success"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="regex_toggle"
                        checked={Boolean((selectedNode.data?.config as any)?.is_regex)}
                        onChange={(e) => updateConfig("is_regex", e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <label htmlFor="regex_toggle" className="text-slate-700 dark:text-slate-300 text-xs">Regular Expression pattern</label>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Timeout (ms)</label>
                      <input
                        type="number"
                        value={(selectedNode.data?.config as any)?.timeout_ms || 10000}
                        onChange={(e) => updateConfig("timeout_ms", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "wait_for_text" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Container Selector</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.selector || "body"}
                        onChange={(e) => updateConfig("selector", e.target.value)}
                        placeholder="body, #alert-box, .status"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Expected Text *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.text || ""}
                        onChange={(e) => updateConfig("text", e.target.value)}
                        placeholder="Operation Successful"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="exact_text_toggle"
                        checked={Boolean((selectedNode.data?.config as any)?.exact)}
                        onChange={(e) => updateConfig("exact", e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <label htmlFor="exact_text_toggle" className="text-slate-700 dark:text-slate-300 text-xs">Exact match</label>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Timeout (ms)</label>
                      <input
                        type="number"
                        value={(selectedNode.data?.config as any)?.timeout_ms || 10000}
                        onChange={(e) => updateConfig("timeout_ms", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "wait_for_network_idle" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Timeout (ms)</label>
                      <input
                        type="number"
                        value={(selectedNode.data?.config as any)?.timeout_ms || 10000}
                        onChange={(e) => updateConfig("timeout_ms", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "select" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Element Logical ID *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.logical_id || ""}
                        onChange={(e) => updateConfig("logical_id", e.target.value)}
                        placeholder="e.g. country_select"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Option Value *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.option_value || ""}
                        onChange={(e) => updateConfig("option_value", e.target.value)}
                        placeholder="e.g. US"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {(["extract_text", "extract_attribute", "extract_table"].includes(String(selectedNode.data?.action))) && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Element Logical ID *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.logical_id || ""}
                        onChange={(e) => updateConfig("logical_id", e.target.value)}
                        placeholder="e.g. order_total_span"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    {selectedNode.data?.action === "extract_attribute" && (
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Attribute Name</label>
                        <input
                          type="text"
                          value={(selectedNode.data?.config as any)?.attribute_name || "href"}
                          onChange={(e) => updateConfig("attribute_name", e.target.value)}
                          placeholder="e.g. href, data-id, value"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                        />
                      </div>
                    )}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Variable Name *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.target_variable || "extracted_data"}
                        onChange={(e) => updateConfig("target_variable", e.target.value)}
                        placeholder="e.g. extracted_data"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "scroll" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Scroll Direction</label>
                      <select
                        value={(selectedNode.data?.config as any)?.direction || "down"}
                        onChange={(e) => updateConfig("direction", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="down">Down</option>
                        <option value="up">Up</option>
                        <option value="top">To Top of Page</option>
                        <option value="bottom">To Bottom of Page</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Scroll Amount (pixels)</label>
                      <input
                        type="number"
                        value={(selectedNode.data?.config as any)?.amount || 400}
                        onChange={(e) => updateConfig("amount", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "wait_until" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Selector *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.selector || ""}
                        onChange={(e) => updateConfig("selector", e.target.value)}
                        placeholder="#modal-ready, .checkout-btn"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Condition</label>
                      <select
                        value={(selectedNode.data?.config as any)?.condition || "visible"}
                        onChange={(e) => updateConfig("condition", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="visible">Element Visible</option>
                        <option value="hidden">Element Hidden</option>
                        <option value="enabled">Element Enabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Timeout (ms)</label>
                      <input
                        type="number"
                        value={(selectedNode.data?.config as any)?.timeout_ms || 10000}
                        onChange={(e) => updateConfig("timeout_ms", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "switch" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Expression / Variable *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.expression || ""}
                        onChange={(e) => updateConfig("expression", e.target.value)}
                        placeholder="{{status}} or env.ENV_NAME"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Cases (comma-separated)</label>
                      <input
                        type="text"
                        value={((selectedNode.data?.config as any)?.cases || []).join(", ")}
                        onChange={(e) =>
                          updateConfig(
                            "cases",
                            e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="active, pending, error"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "set_variable" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Variable Name *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.variable_name || ""}
                        onChange={(e) => updateConfig("variable_name", e.target.value)}
                        placeholder="e.g. auth_token"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Value / Template</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.value_template || ""}
                        onChange={(e) => updateConfig("value_template", e.target.value)}
                        placeholder="e.g. https://api.corp.internal"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "string_operation" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Operation</label>
                      <select
                        value={(selectedNode.data?.config as any)?.operation || "upper"}
                        onChange={(e) => updateConfig("operation", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="upper">UPPERCASE</option>
                        <option value="lower">lowercase</option>
                        <option value="trim">Trim Whitespace</option>
                        <option value="replace">Find & Replace</option>
                        <option value="split">Split by Delimiter</option>
                        <option value="length">Length</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Input Text / Variable</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.input || ""}
                        onChange={(e) => updateConfig("input", e.target.value)}
                        placeholder="{{extracted_text}}"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    {(selectedNode.data?.config as any)?.operation === "replace" && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Find"
                          value={(selectedNode.data?.config as any)?.find || ""}
                          onChange={(e) => updateConfig("find", e.target.value)}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Replace With"
                          value={(selectedNode.data?.config as any)?.replace || ""}
                          onChange={(e) => updateConfig("replace", e.target.value)}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                        />
                      </div>
                    )}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Output Variable *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.output_variable || "str_result"}
                        onChange={(e) => updateConfig("output_variable", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "number_operation" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Operation</label>
                      <select
                        value={(selectedNode.data?.config as any)?.operation || "add"}
                        onChange={(e) => updateConfig("operation", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="add">Add (a + b)</option>
                        <option value="subtract">Subtract (a - b)</option>
                        <option value="multiply">Multiply (a * b)</option>
                        <option value="divide">Divide (a / b)</option>
                        <option value="round">Round</option>
                        <option value="abs">Absolute Value</option>
                        <option value="min">Minimum (min(a,b))</option>
                        <option value="max">Maximum (max(a,b))</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Operand A</label>
                        <input
                          type="text"
                          value={(selectedNode.data?.config as any)?.a ?? 0}
                          onChange={(e) => updateConfig("a", e.target.value)}
                          className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Operand B</label>
                        <input
                          type="text"
                          value={(selectedNode.data?.config as any)?.b ?? 0}
                          onChange={(e) => updateConfig("b", e.target.value)}
                          className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Output Variable *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.output_variable || "num_result"}
                        onChange={(e) => updateConfig("output_variable", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "json_operation" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Operation</label>
                      <select
                        value={(selectedNode.data?.config as any)?.operation || "parse"}
                        onChange={(e) => updateConfig("operation", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="parse">Parse JSON String</option>
                        <option value="stringify">Stringify Object</option>
                        <option value="get_key">Get Key Value</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Input Data / Variable</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.input || ""}
                        onChange={(e) => updateConfig("input", e.target.value)}
                        placeholder="{{json_payload}}"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    {(selectedNode.data?.config as any)?.operation === "get_key" && (
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Key Name</label>
                        <input
                          type="text"
                          value={(selectedNode.data?.config as any)?.key || ""}
                          onChange={(e) => updateConfig("key", e.target.value)}
                          placeholder="data.items.0.id"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                        />
                      </div>
                    )}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Output Variable *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.output_variable || "json_result"}
                        onChange={(e) => updateConfig("output_variable", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "date_operation" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Operation</label>
                      <select
                        value={(selectedNode.data?.config as any)?.operation || "now"}
                        onChange={(e) => updateConfig("operation", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value="now">Current ISO Date (UTC)</option>
                        <option value="timestamp">Unix Timestamp</option>
                        <option value="format">Formatted Date</option>
                        <option value="add_days">Add Days</option>
                      </select>
                    </div>
                    {(selectedNode.data?.config as any)?.operation === "format" && (
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Format Pattern</label>
                        <input
                          type="text"
                          value={(selectedNode.data?.config as any)?.format || "%Y-%m-%d"}
                          onChange={(e) => updateConfig("format", e.target.value)}
                          placeholder="%Y-%m-%d %H:%M:%S"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                        />
                      </div>
                    )}
                    {(selectedNode.data?.config as any)?.operation === "add_days" && (
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Days to Add</label>
                        <input
                          type="number"
                          value={(selectedNode.data?.config as any)?.days || 1}
                          onChange={(e) => updateConfig("days", Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    )}
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Output Variable *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.output_variable || "date_result"}
                        onChange={(e) => updateConfig("output_variable", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "approval_gate" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Approver Role</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.approver_role || "Admin"}
                        onChange={(e) => updateConfig("approver_role", e.target.value)}
                        placeholder="Admin or Lead QA"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Prompt / Reason</label>
                      <textarea
                        value={(selectedNode.data?.config as any)?.prompt || ""}
                        onChange={(e) => updateConfig("prompt", e.target.value)}
                        rows={2}
                        placeholder="Please verify before continuing..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                )}


                {selectedNode.data?.action === "screenshot" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Screenshot Name</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.filename || "capture.png"}
                        onChange={(e) => updateConfig("filename", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={(selectedNode.data?.config as any)?.full_page || false}
                        onChange={(e) => updateConfig("full_page", e.target.checked)}
                        className="rounded text-black dark:text-white focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Full Page Capture</span>
                    </label>
                  </div>
                )}

                {selectedNode.data?.action === "wait" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Duration (ms)</label>
                      <input
                        type="number"
                        value={(selectedNode.data?.config as any)?.duration_ms || 2000}
                        onChange={(e) => updateConfig("duration_ms", Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "condition" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Variable *</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.variable || "status"}
                        onChange={(e) => updateConfig("variable", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Operator</label>
                      <select
                        value={(selectedNode.data?.config as any)?.operator || "=="}
                        onChange={(e) => updateConfig("operator", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                      >
                        <option value="==">== (Equals)</option>
                        <option value="!=">!= (Not Equals)</option>
                        <option value="contains">contains</option>
                        <option value=">">&gt; (Greater)</option>
                        <option value="<">&lt; (Less)</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Expected Value</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.expected_value || "true"}
                        onChange={(e) => updateConfig("expected_value", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.data?.action === "stop" && (
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Stop Reason</label>
                      <input
                        type="text"
                        value={(selectedNode.data?.config as any)?.reason || "Flow completed successfully"}
                        onChange={(e) => updateConfig("reason", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM EXECUTION CONSOLE */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shrink-0">
        <button
          onClick={() => setConsoleOpen(!consoleOpen)}
          className="w-full h-8 px-4 flex items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-black dark:text-white" />
            <span>Execution Console</span>
            {consoleLogs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                {consoleLogs.length} events
              </span>
            )}
          </div>
          {consoleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {consoleOpen && (
          <div className="h-44 overflow-y-auto p-3 bg-slate-950 text-slate-200 font-mono text-[11px] space-y-1.5 scrollbar-thin">
            {consoleLogs.length === 0 ? (
              <div className="text-slate-500 italic">No execution run initiated yet. Click 'Execute Flow' to run.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                    <th className="py-1">Step</th>
                    <th className="py-1">Action</th>
                    <th className="py-1">Status</th>
                    <th className="py-1">Duration</th>
                    <th className="py-1">Error</th>
                    <th className="py-1">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {consoleLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td className="py-1 text-slate-300">{log.step}</td>
                      <td className="py-1 text-neutral-400 dark:text-neutral-200">{log.action}</td>
                      <td className="py-1">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] ${
                            log.status === "passed"
                              ? "bg-emerald-950 text-neutral-400 dark:text-neutral-200"
                              : log.status === "running"
                              ? "bg-blue-950 text-neutral-400 dark:text-neutral-200"
                              : "bg-rose-950 text-neutral-400 dark:text-neutral-200"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-1 text-slate-400">{log.duration}</td>
                      <td className="py-1 text-neutral-400 dark:text-neutral-200">{log.error || "-"}</td>
                      <td className="py-1 text-slate-500">{log.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
