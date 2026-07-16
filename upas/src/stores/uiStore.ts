/**
 * UPAS — UI Store (Zustand)
 * Sprint 2: Extended with 3D scene interaction state
 * Sprint 2.5: Visualization modes, auto-fit, structure part selection
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
  | 'settings'
  | 'database';

// ─── Database sub-views ────────────────────────────────────────────
export type DatabaseView = 'bombs' | 'materials' | 'soil-types' | 'structures' | 'standards' | 'projects';

// ─── Selection types ───────────────────────────────────────────────
export type SelectedObjectType = 'structure' | 'soil-layer' | 'structure-part' | 'threat' | 'bomb' | null;

// ─── Structure sub-parts ───────────────────────────────────────────
export type StructurePart = 'roof' | 'wall' | 'floor' | null;

// ─── Camera preset ─────────────────────────────────────────────────
export type CameraPreset = 'perspective' | 'top' | 'front' | 'side' | 'back' | 'fit';

// ─── Visualization Mode (Sprint 2.5) ──────────────────────────────
export type VisualizationMode = 'normal' | 'surface' | 'cutaway' | 'xray';

// ─── Sprint 3B: Analysis Tab ──────────────────────────────────────
export type AnalysisTab = 'input' | 'results' | 'report';

// ─── State Shape ───────────────────────────────────────────────────
interface UIState {
  // Navigation
  activeView: AppView;
  setActiveView: (view: AppView) => void;

  // Database view
  databaseView: DatabaseView | null;
  setDatabaseView: (view: DatabaseView | null) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Loading
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Notifications
  notifications: Array<{ id: string; message: string; type: 'info' | 'success' | 'error' | 'warning' }>;
  addNotification: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
  dismissNotification: (id: string) => void;

  // 3D Scene state
  sceneReady: boolean;
  setSceneReady: (ready: boolean) => void;
  sceneFPS: number;
  setSceneFPS: (fps: number) => void;

  // ─── Sprint 2: Selection ────────────────────────────────────────
  selectedObjectId: string | null;
  selectedObjectType: SelectedObjectType;
  setSelectedObject: (id: string | null, type: SelectedObjectType) => void;
  clearSelection: () => void;

  // ─── Sprint 2.5: Structure part selection ───────────────────────
  selectedStructurePart: StructurePart;
  setSelectedStructurePart: (part: StructurePart) => void;

  // ─── Sprint 2: Camera Presets ───────────────────────────────────
  cameraPreset: CameraPreset;
  setCameraPreset: (preset: CameraPreset) => void;

  // ─── Sprint 2.5: Auto Fit ──────────────────────────────────────
  autoFitRequested: boolean;
  requestAutoFit: () => void;

  // ─── Sprint 2.5: Visualization Mode ────────────────────────────
  visualizationMode: VisualizationMode;
  setVisualizationMode: (mode: VisualizationMode) => void;

  // ─── Sprint 2: Section View ─────────────────────────────────────
  sectionViewEnabled: boolean;
  toggleSectionView: () => void;
  hiddenSoilLayers: number[];
  toggleSoilLayerVisibility: (layerIndex: number) => void;
  showAllSoilLayers: () => void;

  // ─── Sprint 2: Properties Panel ─────────────────────────────────
  propertiesPanelOpen: boolean;
  setPropertiesPanelOpen: (open: boolean) => void;

  // ─── Sprint 2.5: Object Tree ────────────────────────────────────
  objectTreeExpanded: Record<string, boolean>;
  toggleObjectTreeNode: (nodeId: string) => void;

  // ─── Sprint 3B: Analysis Tab ─────────────────────────────────────
  analysisTab: AnalysisTab;
  setAnalysisTab: (tab: AnalysisTab) => void;

  // ─── Sprint 3B: Cut Plane Depth ───────────────────────────────────
  cutPlaneDepth: number;
  setCutPlaneDepth: (depth: number) => void;

  // ─── Sprint 3B: Visualization Toggles ────────────────────────────
  showDamageZones: boolean;
  toggleDamageZones: () => void;
  showThreatObject: boolean;
  toggleThreatObject: () => void;

  // ─── Sprint 3C: Engineering Geometry Toggles ─────────────────────
  showStressOverlay: boolean;
  toggleStressOverlay: () => void;
  showThreatPath: boolean;
  toggleThreatPath: () => void;
  showCrater: boolean;
  toggleCrater: () => void;
  showAnnotations: boolean;
  toggleAnnotations: () => void;
}

// ─── Store ─────────────────────────────────────────────────────────
export const useUIStore = create<UIState>((set) => ({
  // Navigation
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),

  // Database view
  databaseView: null,
  setDatabaseView: (view) => set({ databaseView: view }),

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

  // Selection
  selectedObjectId: null,
  selectedObjectType: null,
  setSelectedObject: (id, type) => set({
    selectedObjectId: id,
    selectedObjectType: type,
    selectedStructurePart: type === 'structure-part' ? null : null,
    propertiesPanelOpen: id !== null,
  }),
  clearSelection: () => set({
    selectedObjectId: null,
    selectedObjectType: null,
    selectedStructurePart: null,
    propertiesPanelOpen: false,
  }),

  // Structure part selection
  selectedStructurePart: null,
  setSelectedStructurePart: (part) => set({ selectedStructurePart: part }),

  // Camera Presets
  cameraPreset: 'fit',
  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  // Auto Fit
  autoFitRequested: false,
  requestAutoFit: () => set({ autoFitRequested: true, cameraPreset: 'fit' }),

  // Visualization Mode
  visualizationMode: 'normal',
  setVisualizationMode: (mode) => set({ visualizationMode: mode }),

  // Section View
  sectionViewEnabled: false,
  toggleSectionView: () => set((s) => ({ sectionViewEnabled: !s.sectionViewEnabled })),
  hiddenSoilLayers: [],
  toggleSoilLayerVisibility: (layerIndex) => set((s) => {
    const hidden = s.hiddenSoilLayers.includes(layerIndex)
      ? s.hiddenSoilLayers.filter((i) => i !== layerIndex)
      : [...s.hiddenSoilLayers, layerIndex];
    return { hiddenSoilLayers: hidden };
  }),
  showAllSoilLayers: () => set({ hiddenSoilLayers: [] }),

  // Properties Panel
  propertiesPanelOpen: false,
  setPropertiesPanelOpen: (open) => set({ propertiesPanelOpen: open }),

  // Object Tree
  objectTreeExpanded: { ground: true, structure: true, threat: false },
  toggleObjectTreeNode: (nodeId) => set((s) => ({
    objectTreeExpanded: { ...s.objectTreeExpanded, [nodeId]: !s.objectTreeExpanded[nodeId] },
  })),

  // Sprint 3B: Analysis Tab
  analysisTab: 'input' as AnalysisTab,
  setAnalysisTab: (tab) => set({ analysisTab: tab }),

  // Sprint 3B: Cut Plane Depth
  cutPlaneDepth: 10,
  setCutPlaneDepth: (depth) => set({ cutPlaneDepth: depth }),

  // Sprint 3B: Visualization Toggles
  showDamageZones: false,
  toggleDamageZones: () => set((s) => ({ showDamageZones: !s.showDamageZones })),
  showThreatObject: false,
  toggleThreatObject: () => set((s) => ({ showThreatObject: !s.showThreatObject })),

  // Sprint 3C: Engineering Geometry Toggles
  showStressOverlay: false,
  toggleStressOverlay: () => set((s) => ({ showStressOverlay: !s.showStressOverlay })),
  showThreatPath: false,
  toggleThreatPath: () => set((s) => ({ showThreatPath: !s.showThreatPath })),
  showCrater: false,
  toggleCrater: () => set((s) => ({ showCrater: !s.showCrater })),
  showAnnotations: false,
  toggleAnnotations: () => set((s) => ({ showAnnotations: !s.showAnnotations })),
}));