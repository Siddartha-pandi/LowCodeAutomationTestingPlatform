"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  GitBranch,
  PlusCircle,
  Calendar,
  CheckSquare,
  FolderKanban,
  Wrench,
  FileText,
  Compass,
  Code2,
  Crosshair,
  Sparkles,
  History,
  PlayCircle,
  Clock,
  Terminal,
  Image as ImageIcon,
  Layers,
  Globe,
  KeyRound,
  Sliders,
  Users,
  ShieldAlert,
  ShieldCheck,
  ClipboardList,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Lock,
  Search,
  Bell,
  Sun,
  Moon,
  User,
  Check,
  X,
  ExternalLink,
  Cpu,
  Activity,
  FileCode,
  LayoutTemplate,
  Database,
  Video,
} from "lucide-react";
import { useTheme } from "../common/ThemeProvider";
import { BrowserAutomationLogo } from "../common/BrowserLogo";

export type NavView =
  | "dashboard_overview"
  | "automation_all_flows"
  | "automation_builder"
  | "automation_live_runner"
  | "automation_create_flow"
  | "automation_templates"
  | "automation_schedules"
  | "testing_cases"
  | "testing_suites"
  | "testing_builder"
  | "testing_reports"
  | "testing_data"
  | "browser_live"
  | "browser_recorder"
  | "browser_dom"
  | "browser_profiles"
  | "browser_recognition"
  | "browser_healing"
  | "executions_running"
  | "executions_history"
  | "executions_details"
  | "executions_logs"
  | "executions_screenshots"
  | "config_projects"
  | "config_environments"
  | "config_credentials"
  | "config_browser"
  | "admin_users"
  | "admin_roles"
  | "admin_audit"
  | "user_profile";

interface NavItem {
  id: NavView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "DASHBOARD",
    items: [
      { id: "dashboard_overview", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "AUTOMATION",
    items: [
      { id: "automation_all_flows", label: "All Flows", icon: GitBranch },
      { id: "automation_builder", label: "Flow Builder", icon: Wrench },
      { id: "automation_create_flow", label: "Create Flow", icon: PlusCircle },
      { id: "automation_templates", label: "Flow Templates", icon: LayoutTemplate },
      { id: "automation_schedules", label: "Schedules", icon: Calendar },
    ],
  },
  {
    title: "TESTING",
    items: [
      { id: "testing_cases", label: "Test Cases", icon: CheckSquare },
      { id: "testing_suites", label: "Test Suites", icon: FolderKanban },
      { id: "testing_builder", label: "Test Builder", icon: FileCode },
      { id: "testing_reports", label: "Test Reports", icon: FileText },
      { id: "testing_data", label: "Test Data", icon: Database },
    ],
  },
  {
    title: "BROWSER INTELLIGENCE",
    items: [
      { id: "browser_live", label: "Live Browser", icon: Compass },
      { id: "browser_recorder", label: "Browser Recorder", icon: Video },
      { id: "browser_dom", label: "DOM Explorer", icon: Code2 },
      { id: "browser_profiles", label: "Element Profiles", icon: Crosshair },
      { id: "browser_recognition", label: "Element Recognition", icon: Sparkles },
      { id: "browser_healing", label: "Self-Healing History", icon: History },
    ],
  },
  {
    title: "EXECUTIONS",
    items: [
      { id: "executions_running", label: "Running Executions", icon: PlayCircle, badge: "Live" },
      { id: "executions_history", label: "Execution History", icon: Clock },
      { id: "executions_details", label: "Execution Details", icon: Activity },
      { id: "executions_logs", label: "Logs", icon: Terminal },
      { id: "executions_screenshots", label: "Screenshots", icon: ImageIcon },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      { id: "config_projects", label: "Projects", icon: Layers },
      { id: "config_environments", label: "Environments", icon: Globe },
      { id: "config_credentials", label: "Credentials", icon: KeyRound },
      { id: "config_browser", label: "Browser Settings", icon: Sliders },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { id: "admin_users", label: "Users", icon: Users },
      { id: "admin_roles", label: "Roles & Permissions", icon: ShieldAlert },
      { id: "admin_audit", label: "Audit Logs", icon: ClipboardList },
    ],
  },
];

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "success" | "warning" | "info";
}

interface AppShellProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  user: { email: string; full_name?: string; role?: string } | null;
  onLogout: () => void;
  currentProject: { id: string; name: string } | null;
  children: React.ReactNode;
}

export function AppShell({
  currentView,
  onNavigate,
  user,
  onLogout,
  currentProject,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const { resolvedTheme, toggleTheme } = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "n1",
      title: "Self-Healing Triggered",
      description: "Element '#submit-order' healed with 96.4% confidence",
      time: "10m ago",
      read: false,
      type: "success",
    },
    {
      id: "n2",
      title: "Schedule Execution Complete",
      description: "Daily QA Regression Suite passed 28/28 assertions",
      time: "1h ago",
      read: false,
      type: "info",
    },
    {
      id: "n3",
      title: "Healing Approval Required",
      description: "Checkout button changed in Staging. Confidence 91.2%",
      time: "3h ago",
      read: true,
      type: "warning",
    },
  ]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Shortcut Ctrl+K / Cmd+K for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile drawer when navigating
  function handleNavigate(view: NavView) {
    setMobileOpen(false);
    onNavigate(view);
  }

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Derive human-readable section breadcrumb
  let activeSectionTitle = "Dashboard";
  let activeItemLabel = "Dashboard";
  for (const sec of NAV_SECTIONS) {
    const item = sec.items.find((i) => i.id === currentView);
    if (item) {
      activeSectionTitle = sec.title;
      activeItemLabel = item.label;
      break;
    }
  }
  if (currentView === "user_profile") {
    activeSectionTitle = "SETTINGS";
    activeItemLabel = "User Profile & Preferences";
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Filter search items across all 27 pages
  const allNavItems = NAV_SECTIONS.flatMap((s) =>
    s.items.map((i) => ({ ...i, section: s.title }))
  );
  if (allNavItems.every((i) => i.id !== "user_profile")) {
    allNavItems.push({
      id: "user_profile",
      label: "User Profile & Preferences",
      icon: User,
      section: "SETTINGS",
    });
  }

  const filteredSearchItems = searchQuery.trim()
    ? allNavItems.filter(
        (i) =>
          i.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.section.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allNavItems;

  return (
    <div className="flex h-screen w-full bg-neutral-50 dark:bg-black text-black dark:text-white font-sans antialiased overflow-hidden transition-colors duration-200">
      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 1. SIDEBAR */}
      <aside
        className={`flex flex-col bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 transition-all duration-200 z-50 shrink-0 select-none
          fixed inset-y-0 left-0 md:relative md:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${collapsed ? "w-16" : "w-64"}
        `}
      >
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <BrowserAutomationLogo size={32} className="shrink-0" />
              <div className="leading-tight truncate">
                <div className="font-bold text-xs tracking-tight text-black dark:text-white truncate">
                  {process.env.NEXT_PUBLIC_APP_NAME || "AgentFlow"}
                </div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium tracking-wider uppercase truncate">
                  {process.env.NEXT_PUBLIC_COMPANY_NAME || "Enterprise Platform"}
                </div>
              </div>
            </div>
          ) : (
            <BrowserAutomationLogo size={32} className="mx-auto" />
          )}
          {/* Desktop collapse button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="flex md:hidden text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
            title="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project Selector Indicator & Switcher */}
        {!collapsed && (
          <button
            type="button"
            onClick={() => handleNavigate("config_projects")}
            title="Click to switch workspace"
            className="w-full text-left px-4 py-2.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs transition cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 truncate">
              <Building2 className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
              <div className="flex flex-col truncate">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold">
                  Workspace
                </span>
                <span className="font-bold text-black dark:text-white truncate text-xs">
                  {currentProject?.name || "No Project Selected"}
                </span>
              </div>
            </div>
            {currentProject?.id ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-900 text-black dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-mono">
                Active
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 font-mono">
                None
              </span>
            )}
          </button>
        )}

        {/* Navigation List across 7 Categories */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3.5 text-xs scrollbar-thin">
          {NAV_SECTIONS.map((sec) => (
            <div key={sec.title} className="space-y-1">
              {!collapsed && (
                <div className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
                  {sec.title}
                </div>
              )}
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-medium transition text-left relative ${
                      isActive
                        ? "bg-black text-white dark:bg-white dark:text-black font-bold shadow-xs"
                        : "text-neutral-600 hover:text-black hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? "text-white dark:text-black"
                          : "text-neutral-500 group-hover:text-black dark:text-neutral-400 dark:group-hover:text-white"
                      }`}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-800 text-black dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-mono font-medium">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Info / Profile footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex items-center justify-between gap-2">
          {!collapsed ? (
            <button
              onClick={() => handleNavigate("user_profile")}
              className="flex items-center gap-2 overflow-hidden text-left hover:opacity-90 transition flex-1"
            >
              <div className="w-7 h-7 rounded-full bg-black text-white dark:bg-white dark:text-black border border-neutral-700 dark:border-neutral-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user?.full_name ? user.full_name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "U"}
              </div>
              <div className="overflow-hidden leading-tight flex-1">
                <div className="font-semibold text-black dark:text-white truncate text-xs">
                  {user?.full_name || user?.email?.split("@")[0] || "Administrator"}
                </div>
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate capitalize">
                  {user?.role || "Owner"}
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => handleNavigate("user_profile")}
              className="w-7 h-7 mx-auto rounded-full bg-black text-white dark:bg-white dark:text-black border border-neutral-700 dark:border-neutral-300 flex items-center justify-center font-bold text-xs"
              title="Profile"
            >
              {user?.email ? user.email[0].toUpperCase() : "U"}
            </button>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              title="Sign out"
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP HEADER */}
        <header className="h-14 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-xs z-20">
          {/* Breadcrumb Navigation + Mobile hamburger */}
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[11px]">
              {activeSectionTitle}
            </span>
            <span className="text-neutral-300 dark:text-neutral-700">/</span>
            <span className="font-bold text-black dark:text-white text-xs">
              {activeItemLabel}
            </span>
          </div>

          {/* Center/Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Global Search Input Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs transition shadow-2xs w-60 justify-between"
            >
              <div className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-[11px]">Global search...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[10px] font-mono text-neutral-400">
                Ctrl K
              </kbd>
            </button>

            {/* Quick action buttons */}
            <button
              onClick={() => onNavigate("automation_create_flow")}
              className="px-2 md:px-3 py-1.5 rounded-lg bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-black font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Flow</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition"
            >
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-black" />}
            </button>

            {/* Notification Drawer Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileMenuOpen(false);
                }}
                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 transition relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black dark:bg-white text-white dark:text-black text-[9px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-black dark:text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white text-[10px] rounded font-semibold">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[10px] text-neutral-600 dark:text-neutral-400 hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-72 overflow-y-auto mt-1 scrollbar-thin">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`py-2 px-1 text-xs transition ${
                          !n.read ? "bg-neutral-100 dark:bg-neutral-900" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-black dark:text-white text-xs">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-neutral-400">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-snug">
                          {n.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileMenuOpen(!profileMenuOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
              >
                <div className="w-7 h-7 rounded-full bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black flex items-center justify-center font-bold text-xs">
                  {user?.full_name ? user.full_name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "A"}
                </div>
                <div className="hidden sm:block text-left text-xs leading-tight">
                  <div className="font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[100px]">
                    {user?.full_name?.split(" ")[0] || "Admin"}
                  </div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 capitalize">
                    {user?.role || "Owner"}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {/* Profile Menu Popover */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-xs font-bold text-black dark:text-white">
                      {user?.full_name || "Administrator"}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {user?.email || "admin@company.internal"}
                    </p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-[10px] font-semibold">
                      Role: {user?.role || "Owner"}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onNavigate("user_profile");
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left transition"
                    >
                      <User className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Profile & Preferences</span>
                    </button>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onNavigate("config_browser");
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left transition"
                    >
                      <Sliders className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Browser Settings</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* VIEWPORT BODY */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-black">
          {children}
        </main>
      </div>

      {/* 3. GLOBAL SEARCH MODAL (Ctrl + K) */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-950 rounded-2xl max-w-xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 gap-2">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search all 27 pages, flows, tests, DOM elements, or settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none placeholder:text-neutral-400"
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="text-neutral-400 hover:text-black dark:hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
              {filteredSearchItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400">
                  No matching platform pages or assets found.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredSearchItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-black dark:text-white" />
                          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                          {item.section}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 flex items-center justify-between text-[11px] text-neutral-400">
              <span>Select item to jump directly to page</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-[10px]">
                ESC to close
              </kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
