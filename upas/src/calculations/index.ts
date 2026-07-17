/**
 * UPAS — Calculation Engine Main API
 * Sprint 3A: Primary interface between the application and the calculation core
 *
 * Architecture:
 *   UI → projectStore → runAnalysis() → FullAnalysisResult
 *                      → FullAnalysisResult.visualization → 3D Scene
 *                      → FullAnalysisResult → Reports
 *
 * Design Principles:
 * 1. All calculations are in calculations/ — isolated from UI
 * 2. Input is resolved to SI units before entering the engine
 * 3. No hardcoded values — all from data files
 * 4. All inputs/outputs are TypeScript interfaces
 */

import type {
  ProjectInput,
  FullAnalysisResult,
  AnalysisSettingsInput,
  SoilLayerInput,
  MaterialInput,
  ExplosiveInput,
} from './types';

// Domain model types (from models/ not from calculations/types)
import type { Project } from '../models/Project';
import type { SoilProfile } from '../models/Soil';
import type { Structure } from '../models/Structure';
import type { Threat } from '../models/Threat';
import type { Bomb } from '../models/Bomb';
import type { AnalysisResult, BlastResults, PenetrationResults } from '../models/AnalysisResult';
import { AnalysisType } from '../types';

// Sub-module imports
import { calculateGeometry } from './geometry';
import { calculateBlastParameters } from './threat';
import { calculateSoilStructureInteraction } from './soil';
import {
  getAllStructureResponses,
  getAllPenetrationResults,
} from './structure';
import { compileResults } from './results';
import type { ReportSection } from './reports';
import { generateEngineeringReport } from './reports';
import {
  toMeters, toKilograms, toKPa, toMPa, toGPa,
  toKgPerM3, toMetersPerSecond, safeConvert,
} from './units';

// ─── Data Access Imports ────────────────────────────────────────────
import { getMaterialByRef, getSoilTypeByRef, getBombTypeByRef } from '../database';

// ═══════════════════════════════════════════════════════════════════════
// MAIN API — Public Interface
// ═══════════════════════════════════════════════════════════════════════

/** Settings that can be overridden by the caller */
export interface AnalysisSettings {
  analysisType?: 'blast' | 'penetration' | 'combined';
  outputUnits?: 'metric' | 'imperial';
  includeSSI?: boolean;
  targetSafetyFactor?: number;
  allowPlasticResponse?: boolean;
  useEnhancedSoilModel?: boolean;
}

/**
 * Run a complete engineering analysis.
 * This is THE main entry point for the calculation engine.
 *
 * @param project - The domain Project model
 * @param soilProfile - The domain SoilProfile model
 * @param structure - The domain Structure model
 * @param threat - The domain Threat model
 * @param bomb - The domain Bomb model
 * @param settings - Analysis settings (optional, uses defaults if not provided)
 * @returns FullAnalysisResult with all calculation outputs
 */
export function runAnalysis(params: {
  project: Project;
  soilProfile: SoilProfile;
  structure: Structure;
  threat: Threat;
  bomb: Bomb;
  settings?: AnalysisSettings;
}): FullAnalysisResult {
  // 1. Resolve input — convert domain models to calculation input (SI units)
  const input = resolveProjectInput(params);

  // 2. Run calculations
  return runAnalysisFromInput(input);
}

/**
 * Run analysis from a pre-resolved ProjectInput (all SI units).
 * Useful for testing and programmatic access.
 */
export function runAnalysisFromInput(input: ProjectInput): FullAnalysisResult {
  // 1. Geometry
  const geometry = calculateGeometry(input);

  // 2. Blast parameters (always calculated)
  const blastParams = calculateBlastParameters(input);

  // 3. Soil-Structure Interaction
  const ssi = blastParams.scaledDistance > 0
    ? calculateSoilStructureInteraction(input, blastParams)
    : null;

  // 4. Structure responses
  const responses = ssi
    ? getAllStructureResponses(input.structure, blastParams, ssi)
    : { roof: null, wall: null, floor: null };

  // 5. Penetration (if needed)
  const penetrations = input.settings.analysisType !== 'blast'
    ? getAllPenetrationResults(input.structure, blastParams)
    : { roof: null, wall: null, floor: null };

  // 6. Compile results
  return compileResults({
    input,
    blastParams,
    ssi,
    roofResponse: responses.roof,
    wallResponse: responses.wall,
    floorResponse: responses.floor,
    roofPenetration: penetrations.roof,
    wallPenetration: penetrations.wall,
    floorPenetration: penetrations.floor,
    geometry,
  });
}

/**
 * Generate an engineering report from analysis results.
 * Returns structured data for rendering.
 */
export function generateReport(result: FullAnalysisResult): ReportSection[] {
  return generateEngineeringReport(result);
}

/**
 * Convert a FullAnalysisResult to the domain AnalysisResult model
 * for storage in the project store / database.
 */
export function toDomainResult(result: FullAnalysisResult): AnalysisResult {
  const blast: BlastResults | null = result.blast.parameters
    ? {
        peakIncidentPressure: { value: result.blast.parameters.peakIncidentPressure, unit: 'kPa' },
        peakReflectedPressure: { value: result.blast.parameters.peakReflectedPressure, unit: 'kPa' },
        peakDynamicPressure: { value: result.blast.parameters.peakDynamicPressure, unit: 'kPa' },
        positivePhaseDuration: { value: result.blast.parameters.positivePhaseDuration, unit: 'ms' },
        positivePhaseImpulse: { value: result.blast.parameters.positivePhaseImpulse, unit: 'kPa·ms' },
        structureResponse: result.blast.roofResponse?.responseMode ?? 'elastic',
        maxDisplacement: { value: result.blast.roofResponse?.maxDisplacement ?? 0, unit: 'mm' },
        supportRotation: result.blast.roofResponse?.supportRotation ?? null,
        pressureAtSurface: { value: result.blast.soilInteraction?.pressureAtStructure ?? 0, unit: 'kPa' },
      }
    : null;

  const penetration = result.penetration.roofPenetration
    ? {
        penetrationDepth: { value: result.penetration.roofPenetration.penetrationDepthStructure, unit: 'm' },
        perforationThickness: { value: result.penetration.roofPenetration.perforationThickness, unit: 'm' },
        spallingThickness: { value: result.penetration.roofPenetration.scabbingThickness, unit: 'm' },
        isPerforated: result.penetration.roofPenetration.isPerforated,
        isSpalled: result.penetration.roofPenetration.isSpalled,
        craterDiameter: { value: result.penetration.roofPenetration.craterDiameter, unit: 'm' },
        craterDepth: { value: result.penetration.roofPenetration.craterDepth, unit: 'm' },
      }
    : null;

  return {
    id: result.id,
    projectId: result.projectId,
    name: 'تحليل هندسي',
    analysisType: result.analysisType === 'combined' ? AnalysisType.Combined
      : result.analysisType === 'blast' ? AnalysisType.Blast
      : AnalysisType.Penetration,
    threatId: '',
    bombId: '',
    structureId: '',
    soilProfileId: '',
    calculatedAt: result.calculatedAt,
    blastResults: blast,
    penetrationResults: penetration,
    overallSafetyFactor: result.overall.minSafetyFactor,
    protectionLevel: result.overall.protectionLevel,
    recommendations: result.recommendations,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// INPUT RESOLUTION — Domain Models → Calculation Input (SI)
// ═══════════════════════════════════════════════════════════════════════

function resolveProjectInput(params: {
  project: Project;
  soilProfile: SoilProfile;
  structure: Structure;
  threat: Threat;
  bomb: Bomb;
  settings?: AnalysisSettings;
}): ProjectInput {
  const { project, soilProfile, structure, threat, bomb, settings } = params;

  return {
    projectId: project.id,
    groundLevel: safeConvert(project.groundLevel, toMeters, 0),

    soil: resolveSoilInput(soilProfile),

    structure: resolveStructureInput(structure),

    threat: resolveThreatInput(threat, bomb),

    settings: {
      analysisType: settings?.analysisType ?? 'combined',
      outputUnits: settings?.outputUnits ?? 'metric',
      includeSSI: settings?.includeSSI ?? true,
      targetSafetyFactor: settings?.targetSafetyFactor ?? 1.4,
      allowPlasticResponse: settings?.allowPlasticResponse ?? true,
      useEnhancedSoilModel: settings?.useEnhancedSoilModel ?? false,
    },
  };
}

function resolveSoilInput(profile: SoilProfile): ProjectInput['soil'] {
  const layers: SoilLayerInput[] = profile.layers.map((layer: import('../models/Soil').SoilLayer, i: number) => {
    const soilType = getSoilTypeByRef(layer.soilTypeRef);
    if (!soilType) {
      throw new Error(`Soil type not found: ${layer.soilTypeRef}`);
    }

    return {
      name: layer.name,
      soilTypeRef: layer.soilTypeRef,
      thickness: safeConvert(layer.thickness, toMeters, 2),
      topElevation: safeConvert(layer.topElevation, toMeters, -i * 2),
      unitWeight: safeConvert(soilType.unitWeight, toKPa, 18),
      frictionAngle: soilType.frictionAngle.value as number,
      cohesion: safeConvert(soilType.cohesion, toKPa, 0),
      modulusOfElasticity: safeConvert(soilType.modulusOfElasticity, toMPa, 20),
      poissonRatio: soilType.poissonRatio ?? 0.3,
      waveVelocity: safeConvert(soilType.waveVelocity, toMetersPerSecond, 200),
      category: soilType.category ?? 'cohesiveless',
      // Sprint 3D: Enhanced properties from soil-types.json v2
      relativeDensity: (soilType as any).relativeDensity ?? null,
      SPT_NValue: (soilType as any).SPT_NValue ?? 10,
      dampingRatio: (soilType as any).dampingRatio ?? 0.2,
      groundShockCoefficients: {
        legacy: {
          K: (soilType as any).groundShock?.legacy?.K ?? 500,
          n: (soilType as any).groundShock?.legacy?.n ?? 1.5,
        },
        enhanced: {
          K: (soilType as any).groundShock?.enhanced?.K ?? 500,
          n: (soilType as any).groundShock?.enhanced?.n ?? 1.5,
        },
      },
    };
  });

  return {
    layers,
    waterTableDepth: profile.waterTableDepth
      ? safeConvert(profile.waterTableDepth, toMeters, 0)
      : null,
    totalDepth: safeConvert(profile.totalDepth, toMeters, 2),
  };
}

function resolveStructureInput(structure: Structure): ProjectInput['structure'] {
  return {
    type: structure.type as ProjectInput['structure']['type'],
    position: structure.position,
    length: safeConvert(structure.length, toMeters, 6),
    width: safeConvert(structure.width, toMeters, 4),
    height: safeConvert(structure.height, toMeters, 3),
    wallThickness: safeConvert(structure.wallThickness, toMeters, 0.3),
    roofThickness: safeConvert(structure.roofThickness, toMeters, 0.35),
    floorThickness: safeConvert(structure.floorThickness, toMeters, 0.3),
    wallMaterial: resolveMaterial(structure.wallMaterialRef),
    roofMaterial: resolveMaterial(structure.roofMaterialRef),
    floorMaterial: resolveMaterial(structure.floorMaterialRef),
    burialDepth: safeConvert(structure.burialDepth, toMeters, 3),
    shapeParams: {
      archRadius: structure.shapeParams.archRadius
        ? safeConvert(structure.shapeParams.archRadius, toMeters, 0)
        : null,
      archAngle: structure.shapeParams.archAngle,
      cylinderRadius: structure.shapeParams.cylinderRadius
        ? safeConvert(structure.shapeParams.cylinderRadius, toMeters, 0)
        : null,
      domeRadius: structure.shapeParams.domeRadius
        ? safeConvert(structure.shapeParams.domeRadius, toMeters, 0)
        : null,
      domeHeight: structure.shapeParams.domeHeight
        ? safeConvert(structure.shapeParams.domeHeight, toMeters, 0)
        : null,
    },
    hasEntry: structure.hasEntry,
    entryWidth: structure.entryWidth ? safeConvert(structure.entryWidth, toMeters, 0) : null,
    entryHeight: structure.entryHeight ? safeConvert(structure.entryHeight, toMeters, 0) : null,
  };
}

function resolveMaterial(materialRef: string): MaterialInput {
  const matData = getMaterialByRef(materialRef);
  if (!matData) {
    return {
      materialRef,
      name: 'RC 350 (default)',
      category: 'concrete',
      compressiveStrength: 35,
      tensileStrength: 3.3,
      modulusOfElasticity: 28,
      density: 2400,
      poissonRatio: 0.2,
      yieldStrength: null,
      difCompressive: 1.19,
      difTensile: 1.0,
    };
  }

  return {
    materialRef: matData.ref,
    name: matData.nameAr || matData.name,
    category: matData.category as MaterialInput['category'],
    compressiveStrength: safeConvert(matData.compressiveStrength, toMPa, 30),
    tensileStrength: safeConvert(matData.tensileStrength, toMPa, 3),
    modulusOfElasticity: safeConvert(matData.modulusOfElasticity, toGPa, 28),
    density: safeConvert(matData.density, toKgPerM3, 2400),
    poissonRatio: matData.poissonRatio ?? 0.2,
    yieldStrength: matData.yieldStrength ? safeConvert(matData.yieldStrength, toMPa, 0) : null,
    difCompressive: matData.dynamicIncreaseFactorCompressive ?? 1.19,
    difTensile: matData.dynamicIncreaseFactorTensile ?? 1.0,
  };
}

function resolveThreatInput(threat: Threat, bomb: Bomb): ProjectInput['threat'] {
  const bombData = getBombTypeByRef(bomb.explosiveTypeRef);

  const tntFactor = bombData?.tntEquivalentFactor ?? 1.0;

  let chargeDiameter: number | null = null;
  let chargeLength: number | null = null;
  if (bomb.chargeShape === 'cylindrical') {
    chargeDiameter = bomb.chargeDiameter ? safeConvert(bomb.chargeDiameter, toMeters, 0) : null;
    chargeLength = bomb.chargeLength ? safeConvert(bomb.chargeLength, toMeters, 0) : null;
  }

  const explosive: ExplosiveInput = {
    explosiveTypeRef: bomb.explosiveTypeRef,
    name: bombData?.nameAr ?? bombData?.name ?? bomb.explosiveTypeRef,
    chargeMass: safeConvert(bomb.chargeMass, toKilograms, 100),
    chargeShape: bomb.chargeShape,
    chargeLength,
    chargeDiameter,
    tntEquivalentFactor: tntFactor,
    detonationVelocity: bombData ? safeConvert(bombData.detonationVelocity, toMetersPerSecond, 6930) : 6930,
    energyRelease: bombData?.energyRelease?.value as number ?? 4.184,
    density: bombData ? safeConvert(bombData.density, toKgPerM3, 1600) : 1600,
  };

  return {
    type: threat.type as ProjectInput['threat']['type'],
    position: threat.position,
    detonationType: threat.detonationType as ProjectInput['threat']['detonationType'],
    standoffDistance: safeConvert(threat.standoffDistance, toMeters, 10),
    explosive,
    burialDepth: threat.burialDepth ? safeConvert(threat.burialDepth, toMeters, 0) : null,
    detonationHeight: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// TYPES RE-EXPORT — Convenience for consumers
// ═══════════════════════════════════════════════════════════════════════

export type {
  ProjectInput,
  FullAnalysisResult,
  BlastParameters,
  SoilStructureInteraction,
  StructureResponse,
  PenetrationParameters,
  VisualizationData,
  EngineeringWarning,
  GeometryResults,
} from './types';