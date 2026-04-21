// frontend/src/store/index.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User { id: string; email: string; name: string; role: string; }
interface Workspace { id: string; name: string; description?: string; plan: string; userRole: string; }

interface AppState {
  // Auth
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;

  // Workspaces
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setWorkspaces: (ws: Workspace[]) => void;
  setCurrentWorkspace: (ws: Workspace | null) => void;

  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      clearAuth: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, workspaces: [], currentWorkspace: null });
      },
      workspaces: [],
      currentWorkspace: null,
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (ws) => set({ currentWorkspace: ws }),
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'promptflow-store',
      partialize: (s) => ({ user: s.user, currentWorkspace: s.currentWorkspace, theme: s.theme }),
    }
  )
);
