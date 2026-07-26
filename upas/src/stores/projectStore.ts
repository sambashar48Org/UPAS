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
import type { FullAnalysisResult } from '../calculations/types';
import type { ReportSection } from '../calculations/reports';
import type { DesignResult, DesignCriteria } from '../calculations/design/types';
import type { VisualizationSettings } from '../models/VisualizationSettings';
import { createProject } from '../models/Project';
import { createVisualizationSettings } from '../models/VisualizationSettings';
import { createSoilProfile, createSoilLayer } from '../models/Soil';
import { createStructure } from '../models/Structure';
import { createThreat } from '../models/Threat';
import { createBomb } from '../models/Bomb';
import { StructureType } from '../types';
import { ThreatType } from '../types';
import { DetonationType } from '../types';

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

  // Sprint 3B: Analysis pipeline state
  isAnalyzing: boolean;
  lastFullResult: FullAnalysisResult | null;
  lastReport: ReportSection[] | null;
  analysisError: string | null;

  // Phase 4F: Design state
  designEnabled: boolean;
  designCriteria: Partial<DesignCriteria>;
  lastDesignResult: DesignResult | null;

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

  // Sprint 3B: Pipeline actions
  setIsAnalyzing: (val: boolean) => void;
  setLastFullResult: (result: FullAnalysisResult | null) => void;
  setLastReport: (report: ReportSection[] | null) => void;
  setAnalysisError: (err: string | null) => void;

  // Phase 4F: Design actions
  setDesignEnabled: (enabled: boolean) => void;
  setDesignCriteria: (criteria: Partial<DesignCriteria>) => void;
  setLastDesignResult: (result: DesignResult | null) => void;

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

  // Sprint 3B
  isAnalyzing: false,
  lastFullResult: null as FullAnalysisResult | null,
  lastReport: null as ReportSection[] | null,
  analysisError: null as string | null,

  // Phase 4F: Design (disabled by default — backward compatible)
  designEnabled: false,
  designCriteria: {},
  lastDesignResult: null as DesignResult | null,

  projects: [] as Project[],
};

// ─── Store ─────────────────────────────────────────────────────────
export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialState,

  createNewProject: (name, description) => {
    const project = createProject({ name, description });
    const settings = createVisualizationSettings({ projectId: project.id });

    // ─── Rich default soil profile (4 layers, like the demo) ───────
    const layer0 = createSoilLayer({
      name: 'رمل مفكوك',
      soilTypeRef: 'sand_loose',
      topElevation: { value: 0, unit: 'm' },
      thickness: { value: 1.5, unit: 'm' },
    }, 0);
    const layer1 = createSoilLayer({
      name: 'طين رخو',
      soilTypeRef: 'clay_soft',
      topElevation: { value: -1.5, unit: 'm' },
      thickness: { value: 2.5, unit: 'm' },
    }, 1);
    const layer2 = createSoilLayer({
      name: 'رمل متوسط',
      soilTypeRef: 'sand_medium',
      topElevation: { value: -4, unit: 'm' },
      thickness: { value: 3, unit: 'm' },
    }, 2);
    const layer3 = createSoilLayer({
      name: 'صخر متآكل',
      soilTypeRef: 'rock_weathered',
      topElevation: { value: -7, unit: 'm' },
      thickness: { value: 4, unit: 'm' },
    }, 3);
    const soil = createSoilProfile({
      projectId: project.id,
      name: 'ملف تربة جديد',
      layers: [layer0, layer1, layer2, layer3],
      waterTableDepth: { value: -3, unit: 'm' },
      totalDepth: { value: 11, unit: 'm' },
    });

    // ─── Rich default structure (Box, full dimensions) ────────────
    const struct = createStructure({
      projectId: project.id,
      name: 'منشأ تحت أرضي',
      type: StructureType.Box,
      length: { value: 8, unit: 'm' },
      width: { value: 5, unit: 'm' },
      height: { value: 3.5, unit: 'm' },
      wallThickness: { value: 0.35, unit: 'm' },
      roofThickness: { value: 0.40, unit: 'm' },
      floorThickness: { value: 0.35, unit: 'm' },
      burialDepth: { value: 3, unit: 'm' },
      roofMaterialRef: 'rc_350',
      wallMaterialRef: 'rc_350',
      floorMaterialRef: 'rc_350',
    });

    // ─── Default threat (surface blast, 5m standoff) ──────────────
    const threat = createThreat({
      projectId: project.id,
      name: 'تهديد انفجاري سطحي',
      type: ThreatType.External,
      standoffDistance: { value: 5, unit: 'm' },
      detonationType: 'surface',
      burialDepth: null,
      position: { x: 0, y: 0, z: 0 },
    });

    // ─── Default bomb (100kg TNT, surface detonation) ─────────────
    const bomb = createBomb({
      projectId: project.id,
      name: 'شحنة TNT',
      explosiveTypeRef: 'TNT',
      chargeMass: { value: 100, unit: 'kg' },
      chargeShape: 'spherical',
      detonationType: DetonationType.Surface,
    });

    // ─── Default design criteria (UFC 3-340-02 + ACI 318-19) ──────
    const defaultCriteria: Partial<DesignCriteria> = {
      targetSafetyFactor: 1.5,
      allowPlasticResponse: true,
      supportCondition: 'simply_supported',
      wallSupportCondition: 'fixed',
      reinforcementGrade: { fy: 420, standard: 'ASTM A615 Grade 60' },
      concreteCover: 0.050,
      maxDeflectionRatio: 1 / 360,
      thicknessIncrement: 0.025,
      maxThickness: 2.0,
      includeSelfWeight: true,
      includeOverburden: true,
      includeLateralPressure: true,
      maxSupportRotation: 8.0,
      steelGrade: 420,
    };

    set({
      currentProject: project,
      threats: [threat],
      bombs: [bomb],
      soilProfile: soil,
      structure: struct,
      analysisResults: [],
      visualizationSettings: settings,
      projects: [...get().projects, project],
      // Enable design by default with rich criteria so the user sees the
      // design tab populated immediately. (No calculation happens until
      // the user clicks "تشغيل التحليل".)
      designEnabled: true,
      designCriteria: defaultCriteria,
      lastDesignResult: null,
      lastFullResult: null,
      lastReport: null,
      analysisError: null,
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

  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  setLastFullResult: (result) => set({ lastFullResult: result }),
  setLastReport: (report) => set({ lastReport: report }),
  setAnalysisError: (err) => set({ analysisError: err }),

  setDesignEnabled: (enabled) => set({ designEnabled: enabled }),
  setDesignCriteria: (criteria) => set((s) => ({ designCriteria: { ...s.designCriteria, ...criteria } })),
  setLastDesignResult: (result) => set({ lastDesignResult: result }),

  resetProjectState: () => set({ ...initialState, designEnabled: false, designCriteria: {}, lastDesignResult: null }),
}));