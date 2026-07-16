/**
 * UPAS — Domain Models Index
 * Single entry point for all domain models
 *
 * Architecture Rule: NO calculations in models.
 * Models are pure data structures with factory functions.
 */

// Re-export all models
export type { Project } from './Project';
export { createProject } from './Project';

export type { Threat } from './Threat';
export { createThreat } from './Threat';

export type { Bomb } from './Bomb';
export { createBomb } from './Bomb';

export type { SoilLayer, SoilProfile } from './Soil';
export { createSoilLayer, createSoilProfile } from './Soil';

export type { Structure, ShapeParams } from './Structure';
export { createStructure } from './Structure';

export type { Material } from './Material';
export { createMaterial } from './Material';

export type {
  AnalysisResult,
  BlastResults,
  PenetrationResults,
  ProtectionLevel,
} from './AnalysisResult';
export { createAnalysisResult } from './AnalysisResult';

export type { VisualizationSettings, CameraPreset } from './VisualizationSettings';
export { createVisualizationSettings } from './VisualizationSettings';