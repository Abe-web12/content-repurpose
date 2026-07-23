"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";

export interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  role: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  selected: Workspace;
  select: (id: string) => void;
  loading: boolean;
  refetch: () => Promise<void>;
}

const PERSONAL: Workspace = {
  id: "personal",
  name: "Personal Workspace",
  slug: null,
  logo: null,
  role: "OWNER",
};

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [PERSONAL],
  selected: PERSONAL,
  select: () => {},
  loading: true,
  refetch: async () => {},
});

const STORAGE_KEY = "selected_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([PERSONAL]);
  const [selected, setSelected] = useState<Workspace>(PERSONAL);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setWorkspaces([PERSONAL]);
      setSelected(PERSONAL);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/workspace");
      if (res.ok) {
        const json = await res.json();
        const orgs = json.data?.organizations ?? [];
        const all = [PERSONAL, ...orgs];
        setWorkspaces(all);

        const stored = localStorage.getItem(STORAGE_KEY);
        const saved = stored ? all.find((w) => w.id === stored) : null;
        setSelected(saved ?? PERSONAL);
      }
    } catch {
      setWorkspaces([PERSONAL]);
      setSelected(PERSONAL);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const select = useCallback((id: string) => {
    const ws = workspaces.find((w) => w.id === id);
    if (ws) {
      setSelected(ws);
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, [workspaces]);

  return (
    <WorkspaceContext.Provider value={{ workspaces, selected, select, loading, refetch }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
