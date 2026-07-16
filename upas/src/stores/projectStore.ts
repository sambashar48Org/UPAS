/**
 * UPAS — Project Store (Zustand)
 * Manages all project-related state: project data, threats, soil, structures
 * Architecture Rule: NO calculations in stores — only state management
 */

import { create } from 'zustand';
import type { Project } from '../models/Project';
import type { Threat } from '../models/Threat';
import type { Bomb } from '../models/Bomb';
import type { SoilProfile } from '../models/Soil';
import type { Structure } from '../models/Structure';
import type { AnalysisResult } from '../models/AnalysisResult';
import type { VisualizationSettings } from '../models/VisualizationSettings';
import { createProject } from '../models/Project';
import { createVisualizationSettings } from '../models/VisualizationSettings';

// ─── State Shape ───────────────────────────────────────────────────
interface ProjectState {
  // Current project
  currentProject: Project | null;

  // Associated entities
  threats: Threat[];
  bombs: Bomb[];
  soilProfile: SoilProfile | null;
  structure: Structure | null;
  analysisResults: AnalysisResult[];
  visualizationSettings: VisualizationSettings | null;

  // Project list (for dashboard)
  projects: Project[];

  // Actions
  createNewProject: (name?: string, description?: string) => Project;
  setCurrentProject: (project: Project) => void;
  updateProject: (partial: Partial<Project>) => void;

  setThreats: (threats: Threat[]) => void;
  addThreat: (threat: Threat) => void;
  removeThreat: (id: string) => void;

  setBombs: (bombs: Bomb[]) => void;
  addBomb: (bomb: Bomb) => void;
  removeBomb: (id: string) => void;

  setSoilProfile: (profile: SoilProfile) => void;
  clearSoilProfile: () => void;

  setStructure: (structure: Structure) => void;
  clearStructure: () => void;

  setAnalysisResults: (results: AnalysisResult[]) => void;
  addAnalysisResult: (result: AnalysisResult) => void;

  setVisualizationSettings: (settings: VisualizationSettings) => void;

  resetProjectState: () => void;
}

// ─── Initial State ─────────────────────────────────────────────────
const initialState = {
  currentProject: null,
  threats: [] as Threat[],
  bombs: [] as Bomb[],
  soilProfile: null as SoilProfile | null,
  structure: null as Structure | null,
  analysisResults: [] as AnalysisResult[],
  visualizationSettings: null as VisualizationSettings | null,
  projects: [] as Project[],
};

// ─── Store ─────────────────────────────────────────────────────────
export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialState,

  createNewProject: (name, description) => {
    const project = createProject({ name, description });
    const settings = createVisualizationSettings({ projectId: project.id });
    set({
      currentProject: project,
      threats: [],
      bombs: [],
      soilProfile: null,
      structure: null,
      analysisResults: [],
      visualizationSettings: settings,
      projects: [...get().projects, project],
    });
    return project;
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  updateProject: (partial) => {
    const current = get().currentProject;
    if (!current) return;
    set({
      currentProject: {
        ...current,
        ...partial,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setThreats: (threats) => set({ threats }),
  addThreat: (threat) => set((s) => ({ threats: [...s.threats, threat] })),
  removeThreat: (id) => set((s) => ({ threats: s.threats.filter((t) => t.id !== id) })),

  setBombs: (bombs) => set({ bombs }),
  addBomb: (bomb) => set((s) => ({ bombs: [...s.bombs, bomb] })),
  removeBomb: (id) => set((s) => ({ bombs: s.bombs.filter((b) => b.id !== id) })),

  setSoilProfile: (profile) => set({ soilProfile: profile }),
  clearSoilProfile: () => set({ soilProfile: null }),

  setStructure: (structure) => set({ structure }),
  clearStructure: () => set({ structure: null }),

  setAnalysisResults: (results) => set({ analysisResults: results }),
  addAnalysisResult: (result) =>
    set((s) => ({ analysisResults: [...s.analysisResults, result] })),

  setVisualizationSettings: (settings) => set({ visualizationSettings: settings }),

  resetProjectState: () => set(initialState),
}));