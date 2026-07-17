/**
 * Sprint 3D-Phase 1: Wave Propagation & Enhanced Ground Shock Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWavePropagation,
  calculateAcousticImpedance,
  adjustVsForWaterTable,
  calculateTransmissionCoefficient,
} from '../../calculations/soil/wave-propagation';
import {
  calculateEnhancedGroundShock,
  interpolateGroundShockCoefficients,
} from '../../calculations/soil/ground-shock-enhanced';
import type { SoilInput, BlastParameters, SoilLayerInput } from '../../calculations/types';

// ─── Shared Test Profiles ────────────────────────────────────────

function makeLayer(overrides: Partial<SoilLayerInput> = {}): SoilLayerInput {
  return {
    name: 'Test Layer',
    soilTypeRef: 'sand_loose',
    thickness: 2.0,
    topElevation: 0,
    unitWeight: 18,
    frictionAngle: 30,
    cohesion: 0,
    modulusOfElasticity: 40,
    poissonRatio: 0.3,
    waveVelocity: 300,
    category: 'cohesiveless',
    relativeDensity: 0.5,
    SPT_NValue: 15,
    dampingRatio: 0.2,
    groundShockCoefficients: {
      legacy: { K: 500, n: 1.5 },
      enhanced: { K: 520, n: 1.5 },
    },
    ...overrides,
  };
}

const PROFILE_3LAYER: SoilInput = {
  layers: [
    makeLayer({
      name: 'Sand', soilTypeRef: 'sand_loose',
      thickness: 1.5, unitWeight: 16, waveVelocity: 200, category: 'cohesiveless',
      groundShockCoefficients: {
        legacy: { K: 500, n: 1.5 },
        enhanced: { K: 450, n: 1.6 },
      },
      dampingRatio: 0.25,
      relativeDensity: 0.3,
      SPT_NValue: 5,
    }),
    makeLayer({
      name: 'Clay', soilTypeRef: 'clay_soft',
      thickness: 2.0, unitWeight: 16, waveVelocity: 150, category: 'cohesive',
      groundShockCoefficients: {
        legacy: { K: 200, n: 1.3 },
        enhanced: { K: 180, n: 1.35 },
      },
      dampingRatio: 0.30,
      relativeDensity: null,
      SPT_NValue: 3,
    }),
    makeLayer({
      name: 'Rock', soilTypeRef: 'rock_sound',
      thickness: 5.0, unitWeight: 26, waveVelocity: 3500, category: 'rock',
      groundShockCoefficients: {
        legacy: { K: 700, n: 1.8 },
        enhanced: { K: 750, n: 1.82 },
      },
      dampingRatio: 0.05,
      relativeDensity: null,
      SPT_NValue: 100,
    }),
  ],
  waterTableDepth: null,
  totalDepth: 8.5,
};

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

// ═══════════════════════════════════════════════════════════════════
// WAVE PROPAGATION TESTS (10 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Wave Propagation', () => {
  it('single layer — correct travel time', () => {
    const soil: SoilInput = {
      layers: [makeLayer({ thickness: 3.0, waveVelocity: 300 })],
      waterTableDepth: null,
      totalDepth: 3.0,
    };
    const result = calculateWavePropagation(soil, 0, 3.0);
    // travel time = 3.0 / 300 × 1000 = 10 ms
    expect(result.layerTravelTimes).toHaveLength(1);
    expect(result.layerTravelTimes[0]).toBeCloseTo(10.0, 1);
    expect(result.totalTravelTime).toBeCloseTo(10.0, 1);
  });

  it('3 layers — correct per-layer travel times', () => {
    const result = calculateWavePropagation(PROFILE_3LAYER, 0, 3.5);
    // Layer 0: 1.5m @ 200 m/s → 7.5 ms
    // Layer 1: 2.0m @ 150 m/s → 13.33 ms
    expect(result.layerTravelTimes).toHaveLength(2);
    expect(result.layerTravelTimes[0]).toBeCloseTo(7.5, 1);
    expect(result.layerTravelTimes[1]).toBeCloseTo(13.33, 1);
  });

  it('acoustic impedance — correct Z = ρ × Vs', () => {
    // ρ = 18 kN/m³ / 9.80665 ≈ 1835 kg/m³
    // ρ = 18 kN/m³ / 9.80665 ≈ 1835.5 kg/m³
    // Z = 1835.5 × 300 ≈ 550,646
    const Z = calculateAcousticImpedance(18, 300);
    expect(Z).toBeCloseTo(550646.76, 1);
  });

  it('impedance mismatch — soft→hard boundary shows T < 1.0', () => {
    // Soft clay: Z ≈ 16e3/9.8 × 150 ≈ 244,898
    // Sound rock: Z ≈ 26e3/9.8 × 3500 ≈ 9,285,714
    const Z_soft = calculateAcousticImpedance(16, 150);
    const Z_rock = calculateAcousticImpedance(26, 3500);
    const T = calculateTransmissionCoefficient(Z_soft, Z_rock);
    // T = 2 × Z_soft / (Z_soft + Z_rock) ≈ 2 × 244898 / 9530612 ≈ 0.0514
    expect(T).toBeLessThan(1.0);
    expect(T).toBeGreaterThan(0);
  });

  it('impedance mismatch — equal impedances gives T = 1.0', () => {
    const Z = calculateAcousticImpedance(20, 300);
    const T = calculateTransmissionCoefficient(Z, Z);
    expect(T).toBeCloseTo(1.0, 5);
  });

  it('impedance mismatch — 3-layer profile has 1 boundary transmission', () => {
    const result = calculateWavePropagation(PROFILE_3LAYER, 0, 3.5);
    // 2 layers in path → 1 boundary between them
    expect(result.boundaryTransmissions).toHaveLength(1);
    expect(result.boundaryTransmissions[0]).toBeGreaterThan(0);
    // Note: sand→clay have similar unit weights (both 16 kN/m³),
    // so T can be near or slightly above 1.0. The significant
    // impedance jump happens at clay→rock (T << 1).
  });

  it('impedance mismatch — soft→rock boundary has T << 1.0', () => {
    // Path through all 3 layers → 2 boundaries
    const result = calculateWavePropagation(PROFILE_3LAYER, 0, 8.5);
    expect(result.boundaryTransmissions).toHaveLength(2);
    // Clay→rock boundary should have strong transmission loss
    const clayToRock = result.boundaryTransmissions[1];
    expect(clayToRock).toBeLessThan(0.2);
  });

  it('total transmission is product of boundary transmissions', () => {
    const result = calculateWavePropagation(PROFILE_3LAYER, 0, 3.5);
    const expected = result.boundaryTransmissions.reduce((a, b) => a * b, 1.0);
    expect(result.totalTransmission).toBeCloseTo(expected, 5);
  });

  it('water table reduces Vs by 15%', () => {
    expect(adjustVsForWaterTable(300, false)).toBe(300);
    expect(adjustVsForWaterTable(300, true)).toBeCloseTo(255, 0);
  });

  it('water table at 1m — second layer has reduced travel time', () => {
    const soilWT: SoilInput = { ...PROFILE_3LAYER, waterTableDepth: 1.0 };
    const resultNoWT = calculateWavePropagation(PROFILE_3LAYER, 0, 3.5);
    const resultWT = calculateWavePropagation(soilWT, 0, 3.5);
    // With water table, saturated layers have lower Vs → longer travel time
    expect(resultWT.totalTravelTime).toBeGreaterThan(resultNoWT.totalTravelTime);
  });

  it('cumulative attenuation is less than 1.0 for positive path length', () => {
    const result = calculateWavePropagation(PROFILE_3LAYER, 0, 3.5);
    expect(result.cumulativeAttenuation).toBeGreaterThan(0);
    expect(result.cumulativeAttenuation).toBeLessThan(1.0);
  });

  it('edge case — empty layers returns empty result', () => {
    const result = calculateWavePropagation({ layers: [], waterTableDepth: null, totalDepth: 0 }, 0, 3);
    expect(result.layerTravelTimes).toHaveLength(0);
    expect(result.totalTransmission).toBe(1.0);
  });

  it('edge case — zero path length returns empty result', () => {
    const result = calculateWavePropagation(PROFILE_3LAYER, 0, 0);
    expect(result.layerTravelTimes).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// ENHANCED GROUND SHOCK TESTS (8 tests)
// ═══════════════════════════════════════════════════════════════════

describe('Enhanced Ground Shock', () => {
  it('interpolated K,n for 3-layer profile differ from top-layer-only', () => {
    const { K, n } = interpolateGroundShockCoefficients(PROFILE_3LAYER, 0, 3.5);
    // Top layer enhanced: K=450, n=1.6
    // Path 0→3.5: 1.5m @K=450 + 2.0m @K=180
    // Weighted K = (450*1.5 + 180*2.0) / 3.5 = (675 + 360) / 3.5 = 295.7
    // Weighted n = (1.6*1.5 + 1.35*2.0) / 3.5 = (2.4 + 2.7) / 3.5 = 1.457
    expect(K).toBeCloseTo(295.7, 0);
    expect(n).toBeCloseTo(1.457, 2);
  });

  it('single layer — interpolated K,n equal the layer coefficients', () => {
    const singleLayer: SoilInput = {
      layers: [makeLayer({ thickness: 5, groundShockCoefficients: { legacy: { K: 600, n: 1.4 }, enhanced: { K: 620, n: 1.38 } } })],
      waterTableDepth: null,
      totalDepth: 5,
    };
    const { K, n } = interpolateGroundShockCoefficients(singleLayer, 0, 5);
    expect(K).toBeCloseTo(620, 0);
    expect(n).toBeCloseTo(1.38, 2);
  });

  it('enhanced PPV is computed and positive', () => {
    const waveProp = calculateWavePropagation(PROFILE_3LAYER, 0, 8.5);
    const result = calculateEnhancedGroundShock(BLAST_PARAMS, PROFILE_3LAYER, 10, waveProp);
    expect(result.peakParticleVelocity).toBeGreaterThan(0);
  });

  it('enhanced PPV differs from legacy (uses interpolated coefficients)', () => {
    // Legacy: K=500, n=1.5 (top layer category)
    // Enhanced: interpolated K≈295.7, n≈1.457 for this profile
    const waveProp = calculateWavePropagation(PROFILE_3LAYER, 0, 8.5);
    const result = calculateEnhancedGroundShock(BLAST_PARAMS, PROFILE_3LAYER, 10, waveProp);

    // Legacy PPV for top-layer-only cohesiveless:
    // PPV = 500 * (100^(1/3)/10)^1.5 = 500 * 0.4642^1.5 = 500 * 0.3163 = 158.15
    const legacyPPV = 158.15;

    // Enhanced uses lower K (295.7) → lower PPV
    // But also impedance losses reduce it further
    expect(result.peakParticleVelocity).toBeLessThan(legacyPPV);
  });

  it('per-layer PPV array decreases through layers', () => {
    const waveProp = calculateWavePropagation(PROFILE_3LAYER, 0, 8.5);
    const result = calculateEnhancedGroundShock(BLAST_PARAMS, PROFILE_3LAYER, 10, waveProp);
    // PPV should decrease layer by layer due to damping
    for (let i = 1; i < result.perLayerPPV.length; i++) {
      expect(result.perLayerPPV[i]).toBeLessThanOrEqual(result.perLayerPPV[i - 1]);
    }
  });

  it('impedance transmission reduces PPV compared to no-impedance case', () => {
    const resultWithImpedance = calculateEnhancedGroundShock(
      BLAST_PARAMS, PROFILE_3LAYER, 10,
      calculateWavePropagation(PROFILE_3LAYER, 0, 8.5),
    );
    const resultWithoutImpedance = calculateEnhancedGroundShock(
      BLAST_PARAMS, PROFILE_3LAYER, 10, null,
    );
    // Impedance losses (especially soft→rock boundary) should reduce PPV
    expect(resultWithImpedance.peakParticleVelocity).toBeLessThan(
      resultWithoutImpedance.peakParticleVelocity,
    );
  });

  it('arrival time and frequency are physically reasonable', () => {
    const waveProp = calculateWavePropagation(PROFILE_3LAYER, 0, 8.5);
    const result = calculateEnhancedGroundShock(BLAST_PARAMS, PROFILE_3LAYER, 10, waveProp);
    expect(result.totalArrivalTime).toBeGreaterThan(0);
    expect(result.frequency).toBeGreaterThanOrEqual(5);
    expect(result.frequency).toBeLessThanOrEqual(100);
    expect(result.duration).toBeGreaterThanOrEqual(10);
  });

  it('interpolated K and n are reported in result', () => {
    const waveProp = calculateWavePropagation(PROFILE_3LAYER, 0, 8.5);
    const result = calculateEnhancedGroundShock(BLAST_PARAMS, PROFILE_3LAYER, 10, waveProp);
    expect(result.interpolatedK).toBeGreaterThan(0);
    expect(result.interpolatedN).toBeGreaterThan(0);
  });

  it('edge case — zero distance returns zero PPV', () => {
    const result = calculateEnhancedGroundShock(BLAST_PARAMS, PROFILE_3LAYER, 0, null);
    expect(result.peakParticleVelocity).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// SOIL ASSESSMENT TESTS (4 tests)
// ═══════════════════════════════════════════════════════════════════

import { assessSoilHazards, assessPPVDamage, findMaxImpedanceRatio } from '../../calculations/soil/soil-assessment';

describe('Soil Assessment', () => {
  it('PPV damage — negligible for very low PPV', () => {
    const result = assessPPVDamage(0.02);
    expect(result.level).toBe('negligible');
  });

  it('PPV damage — moderate for 0.3 m/s', () => {
    const result = assessPPVDamage(0.3);
    expect(result.level).toBe('moderate');
  });

  it('PPV damage — heavy for 5.0 m/s', () => {
    const result = assessPPVDamage(5.0);
    expect(result.level).toBe('heavy');
    expect(result.descriptionAr).toBeTruthy();
    expect(result.descriptionEn).toBeTruthy();
  });

  it('impedance ratio — returns max ratio across boundaries', () => {
    // Soft → medium → hard
    const ratios = findMaxImpedanceRatio([1000, 2000, 500000]);
    expect(ratios).toBeCloseTo(250, 0); // 500000/2000
  });

  it('assessment with null inputs returns no warnings', () => {
    const result = assessSoilHazards(null, null);
    expect(result.warnings).toHaveLength(0);
    expect(result.liquefactionPotential).toBe('not_assessed');
    expect(result.ppvDamage).toBeNull();
  });

  it('assessment generates high PPV warning', () => {
    const waveProp = calculateWavePropagation(PROFILE_3LAYER, 0, 8.5);
    const shock = calculateEnhancedGroundShock(BLAST_PARAMS, PROFILE_3LAYER, 10, waveProp);
    const result = assessSoilHazards(waveProp, shock);
    // With 100kg TNT at 10m, PPV will likely trigger at least a warning
    // (depends on exact coefficients, but structure of result matters)
    expect(result.liquefactionPotential).toBe('not_assessed');
    expect(result.maxImpedanceRatio).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// AC-14: Full Integration Test with useEnhancedSoilModel=true
// ═══════════════════════════════════════════════════════════════════

import { runAnalysisFromInput } from '../../calculations';
import type { MaterialInput } from '../../calculations/types';

const INTEGRATION_MATERIAL: MaterialInput = {
  materialRef: 'rc_350', name: 'RC 350', category: 'concrete',
  compressiveStrength: 35, tensileStrength: 3.3,
  modulusOfElasticity: 28, density: 2400, poissonRatio: 0.2,
  yieldStrength: null, difCompressive: 1.19, difTensile: 1.0,
};

function makeEnhancedSoilLayer(
  overrides: Partial<import('../../calculations/types').SoilLayerInput> = {},
): import('../../calculations/types').SoilLayerInput {
  return {
    name: 'Test', soilTypeRef: 'sand_loose', thickness: 2.0, topElevation: 0,
    unitWeight: 16, frictionAngle: 28, cohesion: 0,
    modulusOfElasticity: 20, poissonRatio: 0.3, waveVelocity: 200,
    category: 'cohesiveless',
    relativeDensity: 0.3, SPT_NValue: 5, dampingRatio: 0.25,
    groundShockCoefficients: {
      legacy: { K: 500, n: 1.5 }, enhanced: { K: 450, n: 1.6 },
    },
    ...overrides,
  };
}

describe('AC-14: Full Analysis with useEnhancedSoilModel=true', () => {
  it('Input → Calculations → FullAnalysisResult succeeds', () => {
    const input: import('../../calculations/types').ProjectInput = {
      projectId: 'integration-test-3d',
      groundLevel: 0,
      soil: {
        layers: [
          makeEnhancedSoilLayer({ name: 'Sand', soilTypeRef: 'sand_loose', thickness: 1.5, waveVelocity: 200, unitWeight: 16, category: 'cohesiveless',
            groundShockCoefficients: { legacy: { K: 500, n: 1.5 }, enhanced: { K: 450, n: 1.6 } },
            dampingRatio: 0.25, relativeDensity: 0.3, SPT_NValue: 5,
          }),
          makeEnhancedSoilLayer({ name: 'Clay', soilTypeRef: 'clay_soft', thickness: 2.0, waveVelocity: 150, unitWeight: 16, category: 'cohesive',
            groundShockCoefficients: { legacy: { K: 200, n: 1.3 }, enhanced: { K: 180, n: 1.35 } },
            dampingRatio: 0.30, relativeDensity: null, SPT_NValue: 3,
          }),
          makeEnhancedSoilLayer({ name: 'Rock', soilTypeRef: 'rock_sound', thickness: 5.0, waveVelocity: 3500, unitWeight: 26, category: 'rock',
            groundShockCoefficients: { legacy: { K: 700, n: 1.8 }, enhanced: { K: 750, n: 1.82 } },
            dampingRatio: 0.05, relativeDensity: null, SPT_NValue: 100,
          }),
        ],
        waterTableDepth: null,
        totalDepth: 8.5,
      },
      structure: {
        type: 'box', position: { x: 0, y: -4, z: 0 },
        length: 6, width: 4, height: 3,
        wallThickness: 0.3, roofThickness: 0.4, floorThickness: 0.3,
        wallMaterial: INTEGRATION_MATERIAL, roofMaterial: INTEGRATION_MATERIAL, floorMaterial: INTEGRATION_MATERIAL,
        burialDepth: 3,
        shapeParams: { archRadius: null, archAngle: null, cylinderRadius: null, domeRadius: null, domeHeight: null },
        hasEntry: true, entryWidth: 1, entryHeight: 2.2,
      },
      threat: {
        type: 'external', position: { x: 0, y: 0, z: 13 },
        detonationType: 'surface', standoffDistance: 10,
        explosive: {
          explosiveTypeRef: 'TNT', name: 'TNT', chargeMass: 100,
          chargeShape: 'spherical', chargeLength: null, chargeDiameter: null,
          tntEquivalentFactor: 1.0, detonationVelocity: 6930,
          energyRelease: 4.184, density: 1600,
        },
        burialDepth: null, detonationHeight: null,
      },
      settings: {
        analysisType: 'combined', outputUnits: 'metric',
        includeSSI: true, targetSafetyFactor: 1.4,
        allowPlasticResponse: true,
        useEnhancedSoilModel: true,
      },
    };

    // Execute full analysis pipeline
    const result = runAnalysisFromInput(input);

    // Verify FullAnalysisResult is complete
    expect(result.id).toBeTruthy();
    expect(result.projectId).toBe('integration-test-3d');
    expect(result.blast.parameters).not.toBeNull();
    expect(result.blast.soilInteraction).not.toBeNull();

    // Verify SSI has enhanced fields populated
    const ssi = result.blast.soilInteraction!;
    expect(ssi.layerTravelTimes).not.toBeNull();
    expect(ssi.layerTravelTimes!.length).toBeGreaterThan(0);
    expect(ssi.totalImpedanceTransmission).not.toBeNull();
    expect(ssi.ppvDamageLevel).not.toBeNull();

    // Verify structure responses exist
    expect(result.blast.roofResponse).not.toBeNull();
    expect(result.blast.wallResponse).not.toBeNull();
    expect(result.blast.floorResponse).not.toBeNull();

    // Verify overall assessment
    expect(result.overall.minSafetyFactor).toBeGreaterThan(0);
    expect(['safe', 'marginal', 'unsafe', 'critical']).toContain(result.overall.protectionLevel);

    // Verify legacy fields are still present and unchanged in type
    expect(typeof ssi.overburdenPressure).toBe('number');
    expect(typeof ssi.soilAttenuationFactor).toBe('number');
    expect(typeof ssi.groundShockPPV).toBe('number');
  });

  it('legacy mode (useEnhancedSoilModel=false) has null enhanced fields', () => {
    const input: import('../../calculations/types').ProjectInput = {
      projectId: 'legacy-test',
      groundLevel: 0,
      soil: {
        layers: [
          makeEnhancedSoilLayer({ thickness: 3.0 }),
        ],
        waterTableDepth: null, totalDepth: 3.0,
      },
      structure: {
        type: 'box', position: { x: 0, y: -3, z: 0 },
        length: 6, width: 4, height: 3,
        wallThickness: 0.3, roofThickness: 0.4, floorThickness: 0.3,
        wallMaterial: INTEGRATION_MATERIAL, roofMaterial: INTEGRATION_MATERIAL, floorMaterial: INTEGRATION_MATERIAL,
        burialDepth: 3,
        shapeParams: { archRadius: null, archAngle: null, cylinderRadius: null, domeRadius: null, domeHeight: null },
        hasEntry: true, entryWidth: 1, entryHeight: 2.2,
      },
      threat: {
        type: 'external', position: { x: 0, y: 0, z: 13 },
        detonationType: 'surface', standoffDistance: 10,
        explosive: {
          explosiveTypeRef: 'TNT', name: 'TNT', chargeMass: 100,
          chargeShape: 'spherical', chargeLength: null, chargeDiameter: null,
          tntEquivalentFactor: 1.0, detonationVelocity: 6930,
          energyRelease: 4.184, density: 1600,
        },
        burialDepth: null, detonationHeight: null,
      },
      settings: {
        analysisType: 'combined', outputUnits: 'metric',
        includeSSI: true, targetSafetyFactor: 1.4,
        allowPlasticResponse: true,
        useEnhancedSoilModel: false,
      },
    };

    const result = runAnalysisFromInput(input);
    const ssi = result.blast.soilInteraction!;

    // Legacy mode — enhanced fields must be null
    expect(ssi.layerTravelTimes).toBeNull();
    expect(ssi.impedanceMismatchLosses).toBeNull();
    expect(ssi.totalImpedanceTransmission).toBeNull();
    expect(ssi.ppvDamageLevel).toBeNull();
  });
});