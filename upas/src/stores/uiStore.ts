/**
 * UPAS — UI Store (Zustand)
 * Manages UI state: sidebar, modals, active view, loading states
 * Architecture Rule: NO business logic — only UI concerns
 */

import { create } from 'zustand';

// ─── View / Route identifiers ──────────────────────────────────────
export type AppView =
  | 'dashboard'
  | 'new-project'
  | 'project-setup'
  | 'analysis'
  | 'results'
  | 'settings';

// ─── State Shape ───────────────────────────────────────────────────
interface UIState {
  // Navigation
  activeView: AppView;
  setActiveView: (view: AppView) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Loading
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Notifications (future)
  notifications: Array<{ id: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }>;
  addNotification: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
  dismissNotification: (id: string) => void;

  // 3D Scene state
  sceneReady: boolean;
  setSceneReady: (ready: boolean) => void;
  sceneFPS: number;
  setSceneFPS: (fps: number) => void;
}

// ─── Store ─────────────────────────────────────────────────────────
export const useUIStore = create<UIState>((set) => ({
  // Navigation
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),

  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Loading
  isGlobalLoading: false,
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

  // Notifications
  notifications: [],
  addNotification: (message, type) => {
    const id = crypto.randomUUID();
    set((s) => ({
      notifications: [...s.notifications, { id, message, type }],
    }));
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      set((s) => ({
        notifications: s.notifications.filter((n) => n.id !== id),
      }));
    }, 5000);
  },
  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  // 3D Scene
  sceneReady: false,
  setSceneReady: (ready) => set({ sceneReady: ready }),
  sceneFPS: 0,
  setSceneFPS: (fps) => set({ sceneFPS: fps }),
}));