"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { NavView } from "@/components/layout/AppShell";
import { projectsApi } from "@/api";

export interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
}

interface AppContextType {
  currentView: NavView;
  setCurrentView: (view: NavView) => void;
  currentProject: ProjectInfo;
  setCurrentProject: (p: ProjectInfo) => void;
  projects: ProjectInfo[];
  refreshProjects: () => Promise<void>;
  selectedExecutionId: string;
  setSelectedExecutionId: (id: string) => void;
  selectedFlowId?: string;
  setSelectedFlowId: (id?: string) => void;
  selectedTestId?: string;
  setSelectedTestId: (id?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentViewState] = useState<NavView>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const v = params.get("view") as NavView;
      if (v) return v;
      try {
        const savedView = localStorage.getItem("active_nav_view") as NavView;
        if (savedView) return savedView;
      } catch {}
    }
    return "dashboard_overview";
  });

  const setCurrentView = useCallback((view: NavView) => {
    setCurrentViewState(view);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("active_nav_view", view);
      } catch {}
      // Update the URL query param seamlessly without a full page reload
      const url = new URL(window.location.href);
      url.searchParams.set("view", view);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [currentProject, setCurrentProjectState] = useState<ProjectInfo>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("active_project");
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      id: "p1-default",
      name: "Enterprise QA Suite",
    };
  });

  const [selectedExecutionId, setSelectedExecutionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const eid = params.get("executionId") || params.get("id");
      if (eid) return eid;
    }
    return "";
  });
  const [selectedFlowId, setSelectedFlowId] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const fid = params.get("flowId");
      if (fid) return fid;
    }
    return undefined;
  });
  const [selectedTestId, setSelectedTestId] = useState<string | undefined>(undefined);

  // Sync state if URL query params change (e.g. opened in new tab or browser navigation)
  useEffect(() => {
    const handleSync = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const v = params.get("view") as NavView;
      const eid = params.get("executionId") || params.get("id");
      const fid = params.get("flowId");
      if (v) {
        setCurrentViewState(v);
        try {
          localStorage.setItem("active_nav_view", v);
        } catch {}
      } else {
        try {
          const savedView = localStorage.getItem("active_nav_view") as NavView;
          if (savedView) {
            setCurrentViewState(savedView);
            const url = new URL(window.location.href);
            url.searchParams.set("view", savedView);
            window.history.replaceState({}, "", url.toString());
          }
        } catch {}
      }
      if (eid) setSelectedExecutionId(eid);
      if (fid) setSelectedFlowId(fid);
    };

    handleSync();
    window.addEventListener("popstate", handleSync);
    return () => window.removeEventListener("popstate", handleSync);
  }, []);

  const setCurrentProject = useCallback((p: ProjectInfo) => {
    setCurrentProjectState(p);
    try {
      localStorage.setItem("active_project", JSON.stringify(p));
    } catch {
      // ignore
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const list = await projectsApi.list();
      if (list && list.length > 0) {
        const mapped: ProjectInfo[] = list.map((item: any) => ({
          id: String(item.id),
          name: item.name,
          description: item.description,
        }));
        setProjects(mapped);

        // Check if current active project exists in the returned list
        const savedProject = typeof window !== "undefined" ? localStorage.getItem("active_project") : null;
        let savedId: string | null = null;
        if (savedProject) {
          try {
            savedId = JSON.parse(savedProject)?.id;
          } catch {}
        }
        const matching = (savedId ? mapped.find((p) => p.id === savedId) : null) || mapped[0];
        if (matching) {
          setCurrentProject(matching);
        }
      }
    } catch {
      // API call failed / offline mode
    }
  }, [setCurrentProject]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        currentProject,
        setCurrentProject,
        projects,
        refreshProjects,
        selectedExecutionId,
        setSelectedExecutionId,
        selectedFlowId,
        setSelectedFlowId,
        selectedTestId,
        setSelectedTestId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppContextProvider");
  }
  return context;
}
