/**
 * Sprint 3D-Phase 1: Regression Tests
 *
 * CRITICAL: These tests capture the NUMERICAL baseline of current soil functions
 * BEFORE any equation modifications. All values use toBeCloseTo with engineering
 * tolerances — never snapshots.
 *
 * 3 Standard Profiles:
 *   A: 3-layer (sand_loose → clay_soft → rock_sound), no water table
 *   B: 2-layer (sand_dense → clay_stiff), water table at 2m
 *   C: 1-layer (rock_weathered), no water table
 *
 * If these fail after Sprint 3D changes, the legacy code path is broken.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSoilAttenuation,
  calculateGroundShock,
  calculateSoilStructureInteraction,
  calculateOverburdenPressure,
  calculateCraterDimensions,
} from '../../calculations/soil';
import type { SoilInput, BlastParameters } from '../../calculations/types';

// ─── Standard Blast Parameters ──────────────────────────────────────
const BLAST_PARAMS: BlastParameters = {
  tntEquivalentMass: 100,
  scaledDistance: 2.154,
  distance: 10,
  peakIncidentPressure: 500,
  peakReflectedPressure: 1000,
  reflectionCoefficient: 2.0,
  peakDynamicPressure: 200,
  positivePhaseDuration: 5,
  positivePhaseImpulse: 1000,
  shockFrontVelocity: 500,
  arrivalTime: 20,
  shapeCorrectionFactor: 1.0,
  groundReflection: 'none',
  groundReflectedPressure: null,
};

// ─── Profile A: 3-layer (sand_loose → clay_soft → rock_sound) ──────
const PROFILE_A: SoilInput = {
  layers: [
    {
      name: 'Loose Sand',
      soilTypeRef: 'sand_loose',
      thickness: 1.5,
      topElevation: 0,
      unitWeight: 16,
      frictionAngle: 28,
      cohesion: 0,
      modulusOfElasticity: 20,
      poissonRatio: 0.3,
      waveVelocity: 200,
      category: 'cohesiveless',
    },
    {
      name: 'Soft Clay',
      soilTypeRef: 'clay_soft',
      thickness: 2.0,
      topElevation: -1.5,
      unitWeight: 16,
      frictionAngle: 0,
      cohesion: 25,
      modulusOfElasticity: 8,
      poissonRatio: 0.4,
      waveVelocity: 150,
      category: 'cohesive',
    },
    {
      name: 'Sound Rock',
      soilTypeRef: 'rock_sound',
      thickness: 5.0,
      topElevation: -3.5,
      unitWeight: 26,
      frictionAngle: 45,
      cohesion: 1000,
      modulusOfElasticity: 30000,
      poissonRatio: 0.2,
      waveVelocity: 3500,
      category: 'rock',
    },
  ],
  waterTableDepth: null,
  totalDepth: 8.5,
};

// ─── Profile B: 2-layer (sand_dense → clay_stiff), WT at 2m ───────
const PROFILE_B: SoilInput = {
  layers: [
    {
      name: 'Dense Sand',
      soilTypeRef: 'sand_dense',
      thickness: 3.0,
      topElevation: 0,
      unitWeight: 20,
      frictionAngle: 40,
      cohesion: 0,
      modulusOfElasticity: 60,
      poissonRatio: 0.25,
      waveVelocity: 450,
      category: 'cohesiveless',
    },
    {
      name: 'Stiff Clay',
      soilTypeRef: 'clay_stiff',
      thickness: 5.0,
      topElevation: -3.0,
      unitWeight: 19,
      frictionAngle: 15,
      cohesion: 75,
      modulusOfElasticity: 30,
      poissonRatio: 0.35,
      waveVelocity: 300,
      category: 'cohesive',
    },
  ],
  waterTableDepth: 2.0,
  totalDepth: 8.0,
};

// ─── Profile C: 1-layer (rock_weathered) ───────────────────────────
const PROFILE_C: SoilInput = {
  layers: [
    {
      name: 'Weathered Rock',
      soilTypeRef: 'rock_weathered',
      thickness: 10.0,
      topElevation: 0,
      unitWeight: 22,
      frictionAngle: 35,
      cohesion: 200,
      modulusOfElasticity: 5000,
      poissonRatio: 0.25,
      waveVelocity: 1500,
      category: 'rock',
    },
  ],
  waterTableDepth: null,
  totalDepth: 10.0,
};

// ─── Test Input for SSI ────────────────────────────────────────────
import type { ProjectInput, MaterialInput } from '../../calculations/types';

const TEST_MATERIAL: MaterialInput = {
  materialRef: 'rc_350',
  name: 'RC 350',
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

function createTestProjectInput(soil: SoilInput): ProjectInput {
  return {
    projectId: 'regression-test',
    groundLevel: 0,
    soil,
    structure: {
      type: 'box',
      position: { x: 0, y: -4, z: 0 },
      length: 6,
      width: 4,
      height: 3,
      wallThickness: 0.3,
      roofThickness: 0.4,
      floorThickness: 0.3,
      wallMaterial: TEST_MATERIAL,
      roofMaterial: TEST_MATERIAL,
      floorMaterial: TEST_MATERIAL,
      burialDepth: 3,
      shapeParams: {
        archRadius: null, archAngle: null,
        cylinderRadius: null, domeRadius: null, domeHeight: null,
      },
      hasEntry: true,
      entryWidth: 1,
      entryHeight: 2.2,
    },
    threat: {
      type: 'external',
      position: { x: 0, y: 0, z: 13 },
      detonationType: 'surface',
      standoffDistance: 10,
      explosive: {
        explosiveTypeRef: 'TNT',
        name: 'TNT',
        chargeMass: 100,
        chargeShape: 'spherical',
        chargeLength: null,
        chargeDiameter: null,
        tntEquivalentFactor: 1.0,
        detonationVelocity: 6930,
        energyRelease: 4.184,
        density: 1600,
      },
      burialDepth: null,
      detonationHeight: null,
    },
    settings: {
      analysisType: 'combined',
      outputUnits: 'metric',
      includeSSI: true,
      targetSafetyFactor: 1.4,
      allowPlasticResponse: true,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// REGRESSION: Profile A (3-layer, no water table)
// ═══════════════════════════════════════════════════════════════════

describe('Regression — Profile A (sand_loose → clay_soft → rock_sound)', () => {
  it('attenuation factor baseline', () => {
    const result = calculateSoilAttenuation(PROFILE_A, BLAST_PARAMS, 3.0, 'surface');
    // Attenuation = 1 / (1 + 3/1)^1.5 = 1 / 4^1.5 = 1/8 = 0.125
    // Category: cohesiveless (top layer), n=1.5
    expect(result.attenuationFactor).toBeCloseTo(0.125, 3);
  });

  it('pressure at structure baseline', () => {
    const result = calculateSoilAttenuation(PROFILE_A, BLAST_PARAMS, 3.0, 'surface');
    // 500 * 0.125 * 0.10 (surface coupling) = 6.25
    expect(result.pressureAtStructure).toBeCloseTo(6.25, 2);
  });

  it('average wave velocity baseline', () => {
    const result = calculateSoilAttenuation(PROFILE_A, BLAST_PARAMS, 3.0, 'surface');
    // Path 0→3m: 1.5m @200 + 1.5m @150 = (300 + 225) / 3 = 175 m/s
    expect(result.averageWaveVelocity).toBeCloseTo(175, 1);
  });

  it('average unit weight baseline', () => {
    const result = calculateSoilAttenuation(PROFILE_A, BLAST_PARAMS, 3.0, 'surface');
    // Path 0→3m: 1.5m @16 + 1.5m @16 = 16 kN/m³
    expect(result.averageUnitWeight).toBeCloseTo(16, 1);
  });

  it('ground shock PPV baseline', () => {
    const result = calculateGroundShock(BLAST_PARAMS, PROFILE_A, 10);
    // Top layer: cohesiveless, K=500, n=1.5
    // PPV = 500 * (100^(1/3)/10)^1.5 = 500 * (4.642/10)^1.5 = 500 * 0.4642^1.5
    // 0.4642^1.5 = 0.4642 * sqrt(0.4642) = 0.4642 * 0.6813 = 0.3163
    // PPV = 500 * 0.3163 = 158.15
    expect(result.peakParticleVelocity).toBeCloseTo(158.15, 0);
  });

  it('ground shock arrival time baseline', () => {
    const result = calculateGroundShock(BLAST_PARAMS, PROFILE_A, 10);
    // Ground shock uses min(distance, totalDepth) for avg properties path
    // Actual computed: 4.696 ms
    expect(result.arrivalTime).toBeCloseTo(4.696, 1);
  });

  it('ground shock frequency baseline', () => {
    const result = calculateGroundShock(BLAST_PARAMS, PROFILE_A, 10);
    // f = Vs_avg / (2 * chargeRadius)
    // chargeRadius = (3*100/(4*π*1600))^(1/3) = (0.01492)^(1/3) = 0.2462 m
    // f = 2100 / (2 * 0.2462) = 2100 / 0.4924 = 4266 Hz → capped at 100
    expect(result.frequency).toBe(100);
  });

  it('overburden at 3m depth baseline', () => {
    const result = calculateOverburdenPressure(PROFILE_A, 3.0);
    // 1.5*16 + 1.5*16 = 48 kPa, no water table
    expect(result.totalStress).toBeCloseTo(48, 1);
    expect(result.effectiveStress).toBeCloseTo(48, 1);
    expect(result.porePressure).toBe(0);
  });

  it('SSI full integration baseline', () => {
    const input = createTestProjectInput(PROFILE_A);
    const result = calculateSoilStructureInteraction(input, BLAST_PARAMS);
    expect(result.overburdenPressure).toBeCloseTo(48, 1);
    expect(result.soilAttenuationFactor).toBeCloseTo(0.125, 3);
    expect(result.pressureAtStructure).toBeCloseTo(6.25, 2);
    expect(result.groundShockPPV).toBeCloseTo(158.15, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// REGRESSION: Profile B (sand_dense → clay_stiff, WT at 2m)
// ═══════════════════════════════════════════════════════════════════

describe('Regression — Profile B (sand_dense → clay_stiff, WT@2m)', () => {
  it('attenuation factor baseline', () => {
    const result = calculateSoilAttenuation(PROFILE_B, BLAST_PARAMS, 3.0, 'surface');
    // Category: cohesiveless (top layer), n=1.5
    // Attenuation = 1 / (1 + 3/1)^1.5 = 0.125
    expect(result.attenuationFactor).toBeCloseTo(0.125, 3);
  });

  it('average wave velocity baseline (2 layers)', () => {
    const result = calculateSoilAttenuation(PROFILE_B, BLAST_PARAMS, 3.0, 'surface');
    // Path 0→3m: 3.0m @450 = 450 m/s (only first layer)
    expect(result.averageWaveVelocity).toBeCloseTo(450, 1);
  });

  it('ground shock PPV baseline', () => {
    const result = calculateGroundShock(BLAST_PARAMS, PROFILE_B, 10);
    // Top layer: cohesiveless, K=500, n=1.5 → same formula
    expect(result.peakParticleVelocity).toBeCloseTo(158.15, 0);
  });

  it('overburden at 3m with water table', () => {
    const result = calculateOverburdenPressure(PROFILE_B, 3.0);
    // Total: 3.0 * 20 = 60 kPa (all in first layer)
    // Pore: (3.0 - 2.0) * 9.81 = 9.81 kPa
    expect(result.totalStress).toBeCloseTo(60, 1);
    expect(result.porePressure).toBeCloseTo(9.81, 1);
    expect(result.effectiveStress).toBeCloseTo(50.19, 1);
  });

  it('SSI full integration baseline', () => {
    const input = createTestProjectInput(PROFILE_B);
    const result = calculateSoilStructureInteraction(input, BLAST_PARAMS);
    expect(result.overburdenPressure).toBeCloseTo(60, 1);
    expect(result.soilAttenuationFactor).toBeCloseTo(0.125, 3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// REGRESSION: Profile C (rock_weathered, single layer)
// ═══════════════════════════════════════════════════════════════════

describe('Regression — Profile C (rock_weathered, single layer)', () => {
  it('attenuation factor baseline', () => {
    const result = calculateSoilAttenuation(PROFILE_C, BLAST_PARAMS, 3.0, 'surface');
    // Category: rock, n=1.8
    // Attenuation = 1 / (1 + 3/1)^1.8 = 1 / 4^1.8 = 1 / 12.125 = 0.0825
    expect(result.attenuationFactor).toBeCloseTo(0.0825, 3);
  });

  it('ground shock PPV baseline (rock)', () => {
    const result = calculateGroundShock(BLAST_PARAMS, PROFILE_C, 10);
    // Top layer: rock, K=700, n=1.8
    // PPV = 700 * (4.642/10)^1.8 = 700 * 0.4642^1.8
    // 0.4642^1.8 = exp(1.8 * ln(0.4642)) = exp(1.8 * -0.768) = exp(-1.382) = 0.251
    // PPV = 700 * 0.251 = 175.7
    expect(result.peakParticleVelocity).toBeCloseTo(175.7, 0);
  });

  it('ground shock arrival time baseline (fast rock)', () => {
    const result = calculateGroundShock(BLAST_PARAMS, PROFILE_C, 10);
    // Vs = 1500 m/s, arrival = (10/1500)*1000 = 6.667 ms
    expect(result.arrivalTime).toBeCloseTo(6.667, 1);
  });

  it('SSI full integration baseline', () => {
    const input = createTestProjectInput(PROFILE_C);
    const result = calculateSoilStructureInteraction(input, BLAST_PARAMS);
    expect(result.overburdenPressure).toBeCloseTo(66, 1);
    expect(result.soilAttenuationFactor).toBeCloseTo(0.0825, 3);
  });
});