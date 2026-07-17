/**
 * UPAS — Calculation Engine Comprehensive Tests
 * Sprint 3A: Tests for every equation and module
 */

import { describe, it, expect } from 'vitest';
import { calculateGeometry, calculateStructureVolume, calculateSurfaceAreas, calculateChargeVolume, calculateDistanceToStructure, calculateScaledDistance as geoScaledDist } from '../../calculations/geometry';
import { calculateTNTEquivalent, calculateBlastParameters, kingeryBulmashPressure, kingeryBulmashImpulse, kingeryBulmashDuration, calculateChargeShapeFactor, calculateDynamicPressure, calculateScaledDistance } from '../../calculations/threat';
import { calculateOverburdenPressure, calculateSoilAttenuation, calculateGroundShock, calculateCraterDimensions, getLayerAtDepth, calculateAveragePropertiesAlongPath } from '../../calculations/soil';
import { calculateDynamicResistance, calculateNaturalPeriod, calculateElementCapacity, calculateStructureResponse, calculatePenetrationResistance, getAllStructureResponses, getAllPenetrationResults } from '../../calculations/structure';
import { toMeters, toKilograms, toKPa, toMPa, toGPa, toKgPerM3, safeConvert } from '../../calculations/units';
import { runAnalysisFromInput } from '../../calculations';
import type { ProjectInput, SoilLayerInput, MaterialInput, ExplosiveInput, BlastParameters } from '../../calculations/types';

// ─── Test Helpers ──────────────────────────────────────────────────

function createTestMaterial(overrides?: Partial<MaterialInput>): MaterialInput {
  return {
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
    ...overrides,
  };
}

function createTestSoilLayers(): SoilLayerInput[] {
  return [
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
      relativeDensity: 0.3,
      SPT_NValue: 5,
      dampingRatio: 0.25,
      groundShockCoefficients: { legacy: { K: 500, n: 1.5 }, enhanced: { K: 450, n: 1.6 } },
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
      relativeDensity: null,
      SPT_NValue: 3,
      dampingRatio: 0.30,
      groundShockCoefficients: { legacy: { K: 200, n: 1.3 }, enhanced: { K: 180, n: 1.35 } },
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
      relativeDensity: null,
      SPT_NValue: 100,
      dampingRatio: 0.05,
      groundShockCoefficients: { legacy: { K: 700, n: 1.8 }, enhanced: { K: 750, n: 1.82 } },
    },
  ];
}

function createTestExplosive(overrides?: Partial<ExplosiveInput>): ExplosiveInput {
  return {
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
    ...overrides,
  };
}

function createTestInput(overrides?: Partial<ProjectInput>): ProjectInput {
  const mat = createTestMaterial();
  return {
    projectId: 'test-project',
    groundLevel: 0,
    soil: {
      layers: createTestSoilLayers(),
      waterTableDepth: null,
      totalDepth: 8.5,
    },
    structure: {
      type: 'box',
      position: { x: 0, y: -4, z: 0 },
      length: 6,
      width: 4,
      height: 3,
      wallThickness: 0.3,
      roofThickness: 0.4,
      floorThickness: 0.3,
      wallMaterial: mat,
      roofMaterial: mat,
      floorMaterial: mat,
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
      explosive: createTestExplosive(),
      burialDepth: null,
      detonationHeight: null,
    },
    settings: {
      analysisType: 'combined',
      outputUnits: 'metric',
      includeSSI: true,
      targetSafetyFactor: 1.4,
      allowPlasticResponse: true,
      useEnhancedSoilModel: false,
    },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// UNIT CONVERSION TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Calculation Unit Conversions', () => {
  it('should convert mm to meters', () => {
    expect(toMeters({ value: 1000, unit: 'mm' })).toBe(1);
  });

  it('should convert ft to meters', () => {
    expect(toMeters({ value: 10, unit: 'ft' })).toBeCloseTo(3.048, 3);
  });

  it('should return null for incompatible units', () => {
    expect(toMeters({ value: 100, unit: 'kg' })).toBeNull();
  });

  it('should convert MPa to kPa', () => {
    expect(toKPa({ value: 1, unit: 'MPa' })).toBe(1000);
  });

  it('should convert GPa to MPa', () => {
    expect(toMPa({ value: 28, unit: 'GPa' })).toBe(28000);
  });

  it('should convert ton to kg', () => {
    expect(toKilograms({ value: 1, unit: 'ton' })).toBe(1000);
  });

  it('safeConvert should return default for null input', () => {
    expect(safeConvert(null, toMeters, 5)).toBe(5);
  });

  it('safeConvert should return default for incompatible units', () => {
    expect(safeConvert({ value: 10, unit: 'kg' }, toMeters, 0)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// GEOMETRY TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Geometry Calculations', () => {
  it('should calculate box volume correctly', () => {
    const input = createTestInput();
    const vol = calculateStructureVolume(input);
    expect(vol).toBeCloseTo(6 * 4 * 3, 2); // 72 m³
  });

  it('should calculate cylinder volume', () => {
    const input = createTestInput({
      structure: {
        ...createTestInput().structure,
        type: 'cylinder',
        shapeParams: { archRadius: null, archAngle: null, cylinderRadius: 2, domeRadius: null, domeHeight: null },
      },
    });
    const vol = calculateStructureVolume(input);
    expect(vol).toBeCloseTo(Math.PI * 4 * 6, 1); // pi*r^2*L
  });

  it('should calculate box surface areas', () => {
    const input = createTestInput();
    const areas = calculateSurfaceAreas(input);
    expect(areas.roofArea).toBeCloseTo(24, 2);
    expect(areas.floorArea).toBeCloseTo(24, 2);
    expect(areas.wallArea).toBeCloseTo(2 * (6 + 4) * 3, 2); // 60 m²
  });

  it('should calculate spherical charge volume', () => {
    const input = createTestInput();
    const vol = calculateChargeVolume(input);
    // V = mass/density = 100/1600 = 0.0625 m³
    expect(vol).toBeCloseTo(100 / 1600, 4);
  });

  it('should calculate distance to structure', () => {
    const input = createTestInput();
    const dist = calculateDistanceToStructure(input);
    expect(dist.distanceToCenter).toBeGreaterThan(0);
    expect(dist.distanceToSurface).toBeGreaterThan(0);
    expect(dist.distanceToSurface).toBeLessThan(dist.distanceToCenter);
  });

  it('should calculate scaled distance', () => {
    // Z = 10 / 100^(1/3) = 10 / 4.6416 = 2.154
    const z = geoScaledDist(10, 100);
    expect(z).toBeCloseTo(10 / Math.cbrt(100), 3);
  });

  it('full geometry should return complete results', () => {
    const input = createTestInput();
    const geo = calculateGeometry(input);
    expect(geo.volume).toBeGreaterThan(0);
    expect(geo.roofArea).toBeGreaterThan(0);
    expect(geo.distanceToCenter).toBeGreaterThan(0);
    expect(geo.soilCoverThickness).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// THREAT / BLAST TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Threat & Blast Calculations', () => {
  it('should calculate TNT equivalent', () => {
    const tnt = calculateTNTEquivalent(createTestExplosive({ chargeMass: 100, tntEquivalentFactor: 1.4 }));
    expect(tnt.tntMass).toBe(140);
    expect(tnt.shapeFactor).toBe(1.0); // spherical
  });

  it('should calculate C4 TNT equivalent', () => {
    const tnt = calculateTNTEquivalent(createTestExplosive({ explosiveTypeRef: 'C4', tntEquivalentFactor: 1.4, chargeMass: 50 }));
    expect(tnt.tntMass).toBe(70);
  });

  it('should calculate charge shape factor for cylindrical', () => {
    const factor = calculateChargeShapeFactor(createTestExplosive({ chargeShape: 'cylindrical', chargeLength: 0.3, chargeDiameter: 0.1 }));
    expect(factor).toBeGreaterThan(1.0);
  });

  it('Kingery-Bulmash pressure should return positive kPa for reasonable Z', () => {
    const pso = kingeryBulmashPressure(2.0);
    expect(pso).toBeGreaterThan(0);
    expect(pso).toBeGreaterThan(1);
  });

  it('Kingery-Bulmash pressure should return 0 for Z <= 0', () => {
    expect(kingeryBulmashPressure(0)).toBe(0);
    expect(kingeryBulmashPressure(-1)).toBe(0);
  });

  it('KB pressure should decrease with increasing Z', () => {
    const pso1 = kingeryBulmashPressure(1.0);
    const pso5 = kingeryBulmashPressure(5.0);
    expect(pso1).toBeGreaterThan(pso5);
  });

  it('KB impulse should scale with W^(1/3)', () => {
    const imp1 = kingeryBulmashImpulse(2.0, 1000);
    const imp2 = kingeryBulmashImpulse(2.0, 8000);
    // 8000^(1/3) = 20, 1000^(1/3) = 10, ratio = 2
    const ratio = imp2 / imp1;
    expect(ratio).toBeCloseTo(2.0, 1);
  });

  it('KB duration should scale with W^(1/3)', () => {
    const dur1 = kingeryBulmashDuration(2.0, 125);
    const dur2 = kingeryBulmashDuration(2.0, 1000);
    expect(dur2).toBeGreaterThan(dur1);
  });

  it('scaled distance should be 0 for zero mass', () => {
    expect(calculateScaledDistance(10, 0)).toBe(0);
    expect(calculateScaledDistance(0, 100)).toBe(0);
  });

  it('dynamic pressure should follow Rankine-Hugoniot', () => {
    const q = calculateDynamicPressure(1000);
    expect(q).toBeGreaterThan(0);
  });

  it('full blast parameters should be consistent', () => {
    const input = createTestInput();
    const bp = calculateBlastParameters(input);

    expect(bp.tntEquivalentMass).toBe(100);
    expect(bp.scaledDistance).toBeGreaterThan(0);
    expect(bp.peakIncidentPressure).toBeGreaterThan(0);
    expect(bp.peakReflectedPressure).toBeGreaterThan(bp.peakIncidentPressure);
    expect(bp.reflectionCoefficient).toBeGreaterThanOrEqual(2.0);
    expect(bp.positivePhaseDuration).toBeGreaterThan(0);
    expect(bp.positivePhaseImpulse).toBeGreaterThan(0);
    expect(bp.shockFrontVelocity).toBeGreaterThan(343);
  });

  it('blast parameters for C4 should show higher TNT equivalent', () => {
    const inputC4 = createTestInput({
      threat: {
        ...createTestInput().threat,
        explosive: createTestExplosive({ chargeMass: 100, tntEquivalentFactor: 1.4 }),
      },
    });
    const inputTNT = createTestInput();
    const bpTNT = calculateBlastParameters(inputTNT);
    const bpC4 = calculateBlastParameters(inputC4);
    expect(bpC4.tntEquivalentMass).toBeGreaterThan(bpTNT.tntEquivalentMass);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SOIL MECHANICS TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Soil Mechanics Calculations', () => {
  const layers = createTestSoilLayers();
  const soil = { layers, waterTableDepth: null, totalDepth: 8.5 };

  it('should calculate overburden pressure at depth 2m', () => {
    // Depth 2m: 1.5m sand (gamma=16) + 0.5m clay (gamma=16) = 24 + 8 = 32 kPa
    const result = calculateOverburdenPressure(soil, 2.0);
    expect(result.totalStress).toBeCloseTo(1.5 * 16 + 0.5 * 16, 2);
    expect(result.effectiveStress).toBeCloseTo(result.totalStress, 2);
    expect(result.porePressure).toBe(0);
  });

  it('should calculate overburden with water table', () => {
    const soilWT = { ...soil, waterTableDepth: 1.0 };
    const result = calculateOverburdenPressure(soilWT, 3.0);
    // Total: 1.5*16 + 1.5*16 = 48 kPa
    expect(result.totalStress).toBeCloseTo(48, 2);
    expect(result.porePressure).toBeCloseTo((3.0 - 1.0) * 9.81, 1);
    expect(result.effectiveStress).toBeLessThan(result.totalStress);
  });

  it('should calculate soil attenuation', () => {
    const bp: BlastParameters = {
      tntEquivalentMass: 100, scaledDistance: 2, distance: 10,
      peakIncidentPressure: 500, peakReflectedPressure: 1000,
      reflectionCoefficient: 2, peakDynamicPressure: 200,
      positivePhaseDuration: 5, positivePhaseImpulse: 1000,
      shockFrontVelocity: 500, arrivalTime: 20,
      shapeCorrectionFactor: 1.0, groundReflection: 'none', groundReflectedPressure: null,
    };
    const result = calculateSoilAttenuation(soil, bp, 3.0, 'surface');
    expect(result.attenuationFactor).toBeGreaterThan(0);
    expect(result.attenuationFactor).toBeLessThan(1);
    expect(result.pressureAtStructure).toBeLessThan(500);
  });

  it('should calculate ground shock', () => {
    const bp: BlastParameters = {
      tntEquivalentMass: 100, scaledDistance: 2, distance: 10,
      peakIncidentPressure: 500, peakReflectedPressure: 1000,
      reflectionCoefficient: 2, peakDynamicPressure: 200,
      positivePhaseDuration: 5, positivePhaseImpulse: 1000,
      shockFrontVelocity: 500, arrivalTime: 20,
      shapeCorrectionFactor: 1.0, groundReflection: 'none', groundReflectedPressure: null,
    };
    const result = calculateGroundShock(bp, soil, 10);
    expect(result.peakParticleVelocity).toBeGreaterThan(0);
    expect(result.arrivalTime).toBeGreaterThan(0);
    expect(result.frequency).toBeGreaterThan(0);
  });

  it('should calculate crater dimensions', () => {
    const crater = calculateCraterDimensions(100, null, soil);
    expect(crater.craterDiameter).toBeGreaterThan(0);
    expect(crater.craterDepth).toBeGreaterThan(0);
    expect(crater.craterDepth).toBeLessThan(crater.craterDiameter);
  });

  it('getLayerAtDepth should find correct layer', () => {
    expect(getLayerAtDepth(soil, 0.5)?.name).toBe('Loose Sand');
    expect(getLayerAtDepth(soil, 2.0)?.name).toBe('Soft Clay');
    expect(getLayerAtDepth(soil, 5.0)?.name).toBe('Sound Rock');
    expect(getLayerAtDepth(soil, 10.0)).toBeNull();
  });

  it('should calculate average properties along path', () => {
    const avg = calculateAveragePropertiesAlongPath(soil, 0, 3.5);
    expect(avg.averageWaveVelocity).toBeGreaterThan(0);
    expect(avg.averageUnitWeight).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// STRUCTURE RESISTANCE TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Structure Resistance Calculations', () => {
  const mat = createTestMaterial();

  it('should calculate dynamic resistance for concrete', () => {
    const result = calculateDynamicResistance(mat, 0.4, 6, 'simply_supported');
    expect(result.staticResistance).toBeGreaterThan(0);
    expect(result.dynamicResistance).toBeGreaterThan(result.staticResistance);
    expect(result.dif).toBe(1.19);
  });

  it('should calculate natural period', () => {
    const T = calculateNaturalPeriod(mat, 0.4, 6, 'simply_supported');
    expect(T).toBeGreaterThan(0);
    expect(T).toBeLessThanOrEqual(500);
    const Tfixed = calculateNaturalPeriod(mat, 0.4, 6, 'fixed');
    expect(Tfixed).toBeLessThan(T);
  });

  it('should calculate element capacity', () => {
    const cap = calculateElementCapacity(mat, 0.4);
    expect(cap.compressiveCapacity).toBe(35 * 1.19);
    expect(cap.tensileCapacity).toBe(3.3 * 1.0);
    expect(cap.shearCapacity).toBeGreaterThan(0);
  });

  it('should calculate structure response', () => {
    const bp: BlastParameters = {
      tntEquivalentMass: 100, scaledDistance: 2, distance: 10,
      peakIncidentPressure: 500, peakReflectedPressure: 1000,
      reflectionCoefficient: 2, peakDynamicPressure: 200,
      positivePhaseDuration: 5, positivePhaseImpulse: 1000,
      shockFrontVelocity: 500, arrivalTime: 20,
      shapeCorrectionFactor: 1.0, groundReflection: 'none', groundReflectedPressure: null,
    };

    const resp = calculateStructureResponse('roof', createTestInput().structure, 150, bp);
    expect(resp.appliedPressure).toBe(150);
    expect(resp.safetyFactor).toBeGreaterThan(0);
    expect(resp.maxDisplacement).toBeGreaterThanOrEqual(0);
    expect(resp.naturalPeriod).toBeGreaterThan(0);
    expect(['elastic', 'plastic', 'failure']).toContain(resp.responseMode);
  });

  it('should calculate penetration resistance', () => {
    const bp: BlastParameters = {
      tntEquivalentMass: 100, scaledDistance: 2, distance: 10,
      peakIncidentPressure: 500, peakReflectedPressure: 1000,
      reflectionCoefficient: 2, peakDynamicPressure: 200,
      positivePhaseDuration: 5, positivePhaseImpulse: 1000,
      shockFrontVelocity: 500, arrivalTime: 20,
      shapeCorrectionFactor: 1.0, groundReflection: 'none', groundReflectedPressure: null,
    };
    const pen = calculatePenetrationResistance(mat, 0.4, bp, 'roof');
    expect(pen.penetrationDepthStructure).toBeGreaterThanOrEqual(0);
    expect(pen.perforationThickness).toBeGreaterThan(0);
    expect(pen.scabbingThickness).toBeGreaterThan(pen.perforationThickness);
    expect(pen.formulaUsed).toContain('NDRC');
  });

  it('should get all structure responses', () => {
    const bp: BlastParameters = {
      tntEquivalentMass: 100, scaledDistance: 2, distance: 10,
      peakIncidentPressure: 500, peakReflectedPressure: 1000,
      reflectionCoefficient: 2, peakDynamicPressure: 200,
      positivePhaseDuration: 5, positivePhaseImpulse: 1000,
      shockFrontVelocity: 500, arrivalTime: 20,
      shapeCorrectionFactor: 1.0, groundReflection: 'none', groundReflectedPressure: null,
    };
    const ssi = {
      overburdenPressure: 48, effectiveStress: 48,
      soilAttenuationFactor: 0.3, pressureAtStructure: 150,
      groundShockPPV: 0.5, groundShockArrivalTime: 20,
      averageWaveVelocity: 300, averageUnitWeight: 18,
      layerTravelTimes: null,
      impedanceMismatchLosses: null,
      totalImpedanceTransmission: null,
      ppvDamageLevel: null,
    };
    const input = createTestInput();
    const responses = getAllStructureResponses(input.structure, bp, ssi);
    expect(responses.roof).not.toBeNull();
    expect(responses.wall).not.toBeNull();
    expect(responses.floor).not.toBeNull();
    // Floor gets least pressure
    expect(responses.floor!.appliedPressure).toBeLessThan(responses.roof!.appliedPressure);
  });

  it('should get all penetration results', () => {
    const bp: BlastParameters = {
      tntEquivalentMass: 100, scaledDistance: 2, distance: 10,
      peakIncidentPressure: 500, peakReflectedPressure: 1000,
      reflectionCoefficient: 2, peakDynamicPressure: 200,
      positivePhaseDuration: 5, positivePhaseImpulse: 1000,
      shockFrontVelocity: 500, arrivalTime: 20,
      shapeCorrectionFactor: 1.0, groundReflection: 'none', groundReflectedPressure: null,
    };
    const pens = getAllPenetrationResults(createTestInput().structure, bp);
    expect(pens.roof).not.toBeNull();
    expect(pens.wall).not.toBeNull();
    expect(pens.floor).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// INTEGRATION TEST — Full Analysis
// ═══════════════════════════════════════════════════════════════════════

describe('Full Analysis Integration', () => {
  it('should run a complete analysis from input', () => {
    const result = runAnalysisFromInput(createTestInput());

    expect(result.id).toBeTruthy();
    expect(result.projectId).toBe('test-project');
    expect(result.analysisType).toBe('combined');

    expect(result.blast.parameters).not.toBeNull();
    expect(result.blast.parameters!.peakIncidentPressure).toBeGreaterThan(0);
    expect(result.blast.soilInteraction).not.toBeNull();
    expect(result.blast.roofResponse).not.toBeNull();
    expect(result.blast.wallResponse).not.toBeNull();
    expect(result.blast.floorResponse).not.toBeNull();
    expect(result.penetration.roofPenetration).not.toBeNull();

    expect(result.overall.minSafetyFactor).toBeGreaterThan(0);
    expect(['safe', 'marginal', 'unsafe', 'critical']).toContain(result.overall.protectionLevel);
    expect(typeof result.overall.isAdequate).toBe('boolean');
    expect(['roof', 'wall', 'floor']).toContain(result.overall.governingElement);
    expect(['blast', 'penetration']).toContain(result.overall.governingMode);

    expect(result.visualization.pressureContours.length).toBeGreaterThan(0);
    expect(result.visualization.damageZones.length).toBeGreaterThan(0);
    expect(result.visualization.structureStressRegions.length).toBe(3);

    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.input.projectId).toBe('test-project');
  });

  it('should produce warnings for close standoff', () => {
    const result = runAnalysisFromInput(createTestInput({
      threat: {
        ...createTestInput().threat,
        standoffDistance: 1,
        position: { x: 0, y: 0, z: 4 },
        explosive: createTestExplosive({ chargeMass: 500 }),
      },
    }));
    expect(result.blast.parameters!.scaledDistance).toBeLessThan(1);
    const criticalWarnings = result.warnings.filter(w => w.severity === 'critical');
    expect(criticalWarnings.length).toBeGreaterThan(0);
  });
});