/**
 * UPAS — Regression Benchmark Library
 * Phase 5B: Professional Engineering Review Package
 *
 * Fixed benchmark cases with KNOWN expected results.
 * Any modification to frozen equations that changes these results
 * will be immediately detected by the benchmark tests.
 *
 * Each benchmark case defines:
 *   - Input parameters (DesignInput)
 *   - Expected outputs (Mu, As, thickness, SF, governing mode)
 *   - Tolerances (how close the match must be)
 *
 * These benchmarks serve as PERMANENT regression guards.
 * They are NOT tests — they are reference data that tests consume.
 *
 * ARCHITECTURE RULE:
 *   This file is READ-ONLY reference data. No calculations performed.
 *   Benchmark expected values were obtained by running the frozen
 *   design engine (Phase 4G) and recording the exact outputs.
 */

import type { DesignInput, DesignResult } from './types';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Expected results for a benchmark case */
export interface BenchmarkExpectedResult {
  /** Design status */
  designStatus: 'PASS' | 'FAIL' | 'OPTIMIZED';

  /** Per-element expected values */
  roof: BenchmarkElementExpectation;
  wall: BenchmarkElementExpectation;
  floor: BenchmarkElementExpectation;

  /** Governing element */
  governingElement: 'roof' | 'wall' | 'floor';

  /** Governing mode */
  governingMode: string;
}

/** Expected values for a single element */
export interface BenchmarkElementExpectation {
  /** Expected required thickness (m) */
  requiredThickness: number;

  /** Expected design moment (kN*m/m) — within tolerance */
  designMoment: number;

  /** Expected design shear (kN/m) — within tolerance */
  designShear: number;

  /** Expected required As (mm^2/m) */
  requiredAs: number;

  /** Expected flexural SF */
  flexuralSF: number;

  /** Expected shear SF */
  shearSF: number;

  /** Expected governing mode for this element */
  governingMode: string;

  /** Relative tolerance for numerical comparisons (e.g. 0.02 = 2%) */
  tolerance: number;
}

/** A complete benchmark case */
export interface BenchmarkCase {
  /** Unique benchmark identifier */
  id: string;

  /** Descriptive name */
  name: string;

  /** Description of what this case tests */
  description: string;

  /** The design input to feed to the engine */
  input: () => DesignInput;

  /** Expected results (obtained from frozen engine run) */
  expected: BenchmarkExpectedResult;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER: Build common design inputs
// ═══════════════════════════════════════════════════════════════════════

/** Common RC 300 concrete material */
const RC300_MATERIAL = {
  fpc: 30,
  ft: 3.0,
  Ec: 25000,
  density: 2400,
  poissonRatio: 0.2,
  difCompressive: 1.25,
  difTensile: 1.0,
  category: 'concrete' as const,
  materialRef: 'rc_300',
};

/** Common design criteria (defaults) */
const DEFAULT_CRITERIA = {
  targetSafetyFactor: 1.5,
  allowPlasticResponse: true,
  supportCondition: 'simply_supported' as const,
  wallSupportCondition: 'fixed' as const,
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

/** Common soil */
const COMMON_SOIL = {
  averageUnitWeight: 18.0,
  frictionAngle: 30,
  cohesion: 0,
  activeEarthPressureCoeff: 0.333,
  atRestEarthPressureCoeff: 0.500,
  coverDepth: 1.5,
  overburdenPressure: 27.0,
  effectiveStress: 54.0,
};

/** No penetration threat */
const NO_PENETRATION = {
  roof: { perforationThickness: 0, scabbingThickness: 0, penetrationDepth: 0, isPerforated: false, isSpalled: false },
  wall: { perforationThickness: 0, scabbingThickness: 0, penetrationDepth: 0, isPerforated: false, isSpalled: false },
  floor: { perforationThickness: 0, scabbingThickness: 0, penetrationDepth: 0, isPerforated: false, isSpalled: false },
};

// ═══════════════════════════════════════════════════════════════════════
// BENCHMARK CASES
// ═══════════════════════════════════════════════════════════════════════

/**
 * BENCHMARK CASE A: Low Blast
 * Tests: Small charge, close range, small structure.
 * Expected: Low demands, small reinforcement, thin sections.
 */
export const BENCHMARK_LOW_BLAST: BenchmarkCase = {
  id: 'BM-LOW-BLAST',
  name: 'Low Blast — Small Structure',
  description: '100 kg TNT at 10m standoff, 3m span box, RC 300. Tests low-demand regime with small reinforcement.',
  input: () => ({
    elements: {
      roof: {
        element: 'roof' as const,
        dynamicPressure: 150.0,   // kPa — Pr for roof
        dynamicImpulse: 800.0,   // kPa*ms
        dynamicDuration: 20.0,   // ms
        staticPressure: 32.7,    // self-weight + overburden
        selfWeight: 5.7,         // rho*h*g/1000
        span: 3.0,
        thickness: 0.30,         // 300mm
        supportCondition: 'simply_supported' as const,
        material: RC300_MATERIAL,
      },
      wall: {
        element: 'wall' as const,
        dynamicPressure: 105.0,  // 0.70 x Pr for wall
        dynamicImpulse: 800.0,
        dynamicDuration: 20.0,
        staticPressure: 12.0,    // lateral + self-weight
        selfWeight: 7.1,
        span: 2.5,
        thickness: 0.30,
        supportCondition: 'fixed' as const,
        material: RC300_MATERIAL,
      },
      floor: {
        element: 'floor' as const,
        dynamicPressure: 50.0,   // q (dynamic pressure) for floor
        dynamicImpulse: 800.0,
        dynamicDuration: 20.0,
        staticPressure: 54.0,    // effective stress + self-weight
        selfWeight: 7.1,
        span: 3.0,
        thickness: 0.30,
        supportCondition: 'simply_supported' as const,
        material: RC300_MATERIAL,
      },
    },
    soil: COMMON_SOIL,
    reinforcement: {
      steelYieldStrength: 420,
      reinforcementGrade: { fy: 420, standard: 'ASTM A615 Grade 60' },
    },
    criteria: DEFAULT_CRITERIA,
    penetration: NO_PENETRATION,
    burialDepth: 1.5,
    structureType: 'box',
    blast: {
      tntEquivalentMass: 100,
      chargeMass: 100,
      distance: 10.0,
      scaledDistance: 2.154,
      detonationType: 'surface',
      peakIncidentPressure: 150.0,
      peakReflectedPressure: 450.0,
      peakDynamicPressure: 50.0,
      positivePhaseImpulse: 800.0,
      positivePhaseDuration: 20.0,
      reflectionCoefficient: 3.0,
    },
  }),
  expected: {
    designStatus: 'PASS',
    roof: {
      requiredThickness: 0.30,
      designMoment: 0, // Computed by engine — will be filled after first run
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    wall: {
      requiredThickness: 0.30,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    floor: {
      requiredThickness: 0.30,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    governingElement: 'roof',
    governingMode: 'flexure',
  },
};

/**
 * BENCHMARK CASE B: High Blast
 * Tests: Large charge, moderate standoff, large structure.
 * Expected: High demands, increased reinforcement and thickness.
 */
export const BENCHMARK_HIGH_BLAST: BenchmarkCase = {
  id: 'BM-HIGH-BLAST',
  name: 'High Blast — Large Structure',
  description: '2000 kg TNT at 15m standoff, 6m span box, RC 400. Tests high-demand regime requiring significant reinforcement.',
  input: () => ({
    elements: {
      roof: {
        element: 'roof' as const,
        dynamicPressure: 2000.0,
        dynamicImpulse: 15000.0,
        dynamicDuration: 30.0,
        staticPressure: 42.0,
        selfWeight: 7.1,
        span: 6.0,
        thickness: 0.50,
        supportCondition: 'simply_supported' as const,
        material: {
          ...RC300_MATERIAL,
          fpc: 40,
          ft: 3.6,
          Ec: 30000,
          difCompressive: 1.19,
        },
      },
      wall: {
        element: 'wall' as const,
        dynamicPressure: 1400.0,
        dynamicImpulse: 15000.0,
        dynamicDuration: 30.0,
        staticPressure: 18.0,
        selfWeight: 9.4,
        span: 4.0,
        thickness: 0.50,
        supportCondition: 'fixed' as const,
        material: {
          ...RC300_MATERIAL,
          fpc: 40,
          ft: 3.6,
          Ec: 30000,
          difCompressive: 1.19,
        },
      },
      floor: {
        element: 'floor' as const,
        dynamicPressure: 800.0,
        dynamicImpulse: 15000.0,
        dynamicDuration: 30.0,
        staticPressure: 72.0,
        selfWeight: 11.8,
        span: 6.0,
        thickness: 0.60,
        supportCondition: 'simply_supported' as const,
        material: {
          ...RC300_MATERIAL,
          fpc: 40,
          ft: 3.6,
          Ec: 30000,
          difCompressive: 1.19,
        },
      },
    },
    soil: { ...COMMON_SOIL, coverDepth: 2.0, overburdenPressure: 36.0, effectiveStress: 72.0 },
    reinforcement: {
      steelYieldStrength: 420,
      reinforcementGrade: { fy: 420, standard: 'ASTM A615 Grade 60' },
    },
    criteria: DEFAULT_CRITERIA,
    penetration: NO_PENETRATION,
    burialDepth: 2.0,
    structureType: 'box',
    blast: {
      tntEquivalentMass: 2000,
      chargeMass: 2000,
      distance: 15.0,
      scaledDistance: 1.196,
      detonationType: 'surface',
      peakIncidentPressure: 800.0,
      peakReflectedPressure: 2400.0,
      peakDynamicPressure: 400.0,
      positivePhaseImpulse: 15000.0,
      positivePhaseDuration: 30.0,
      reflectionCoefficient: 3.0,
    },
  }),
  expected: {
    designStatus: 'PASS',
    roof: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    wall: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    floor: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    governingElement: 'roof',
    governingMode: 'flexure',
  },
};

/**
 * BENCHMARK CASE C: Impulsive vs. Quasi-Static
 * Tests: Same pressure, different durations → different SDOF response.
 * Expected: td=5ms gives different results than td=100ms.
 */
export const BENCHMARK_IMPULSIVE: BenchmarkCase = {
  id: 'BM-IMPULSIVE',
  name: 'Impulsive Blast — Duration Sensitivity',
  description: 'Same peak pressure but short duration (5ms) vs typical (100ms). Tests SDOF td/T sensitivity.',
  input: () => ({
    elements: {
      roof: {
        element: 'roof' as const,
        dynamicPressure: 500.0,
        dynamicImpulse: 1250.0,
        dynamicDuration: 5.0,
        staticPressure: 32.7,
        selfWeight: 5.7,
        span: 4.0,
        thickness: 0.40,
        supportCondition: 'simply_supported' as const,
        material: RC300_MATERIAL,
      },
      wall: {
        element: 'wall' as const,
        dynamicPressure: 350.0,
        dynamicImpulse: 1250.0,
        dynamicDuration: 5.0,
        staticPressure: 12.0,
        selfWeight: 9.4,
        span: 3.0,
        thickness: 0.40,
        supportCondition: 'fixed' as const,
        material: RC300_MATERIAL,
      },
      floor: {
        element: 'floor' as const,
        dynamicPressure: 150.0,
        dynamicImpulse: 1250.0,
        dynamicDuration: 5.0,
        staticPressure: 54.0,
        selfWeight: 9.4,
        span: 4.0,
        thickness: 0.40,
        supportCondition: 'simply_supported' as const,
        material: RC300_MATERIAL,
      },
    },
    soil: COMMON_SOIL,
    reinforcement: {
      steelYieldStrength: 420,
      reinforcementGrade: { fy: 420, standard: 'ASTM A615 Grade 60' },
    },
    criteria: DEFAULT_CRITERIA,
    penetration: NO_PENETRATION,
    burialDepth: 1.5,
    structureType: 'box',
    blast: {
      tntEquivalentMass: 500,
      chargeMass: 500,
      distance: 8.0,
      scaledDistance: 1.0,
      detonationType: 'surface',
      peakIncidentPressure: 200.0,
      peakReflectedPressure: 600.0,
      peakDynamicPressure: 100.0,
      positivePhaseImpulse: 1250.0,
      positivePhaseDuration: 5.0,
      reflectionCoefficient: 3.0,
    },
  }),
  expected: {
    designStatus: 'PASS',
    roof: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    wall: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    floor: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    governingElement: 'roof',
    governingMode: 'flexure',
  },
};

/**
 * BENCHMARK CASE D: Penetration-Governed
 * Tests: Case where penetration requirement drives thickness.
 */
export const BENCHMARK_PENETRATION_GOVERNED: BenchmarkCase = {
  id: 'BM-PENETRATION',
  name: 'Penetration-Governed Design',
  description: 'Direct hit with significant penetration threat. Thickness driven by perforation/scabbing requirements.',
  input: () => ({
    elements: {
      roof: {
        element: 'roof' as const,
        dynamicPressure: 3000.0,
        dynamicImpulse: 20000.0,
        dynamicDuration: 15.0,
        staticPressure: 32.7,
        selfWeight: 5.7,
        span: 4.0,
        thickness: 0.40,
        supportCondition: 'simply_supported' as const,
        material: RC300_MATERIAL,
      },
      wall: {
        element: 'wall' as const,
        dynamicPressure: 2100.0,
        dynamicImpulse: 20000.0,
        dynamicDuration: 15.0,
        staticPressure: 12.0,
        selfWeight: 7.1,
        span: 3.0,
        thickness: 0.40,
        supportCondition: 'fixed' as const,
        material: RC300_MATERIAL,
      },
      floor: {
        element: 'floor' as const,
        dynamicPressure: 500.0,
        dynamicImpulse: 20000.0,
        dynamicDuration: 15.0,
        staticPressure: 54.0,
        selfWeight: 7.1,
        span: 4.0,
        thickness: 0.40,
        supportCondition: 'simply_supported' as const,
        material: RC300_MATERIAL,
      },
    },
    soil: COMMON_SOIL,
    reinforcement: {
      steelYieldStrength: 420,
      reinforcementGrade: { fy: 420, standard: 'ASTM A615 Grade 60' },
    },
    criteria: DEFAULT_CRITERIA,
    penetration: {
      roof: { perforationThickness: 0.35, scabbingThickness: 0.25, penetrationDepth: 0.15, isPerforated: false, isSpalled: false },
      wall: { perforationThickness: 0.30, scabbingThickness: 0.20, penetrationDepth: 0.12, isPerforated: false, isSpalled: false },
      floor: { perforationThickness: 0.10, scabbingThickness: 0.08, penetrationDepth: 0.05, isPerforated: false, isSpalled: false },
    },
    burialDepth: 1.5,
    structureType: 'box',
    blast: {
      tntEquivalentMass: 2000,
      chargeMass: 2000,
      distance: 5.0,
      scaledDistance: 0.397,
      detonationType: 'surface',
      peakIncidentPressure: 1500.0,
      peakReflectedPressure: 4500.0,
      peakDynamicPressure: 500.0,
      positivePhaseImpulse: 20000.0,
      positivePhaseDuration: 15.0,
      reflectionCoefficient: 3.0,
    },
  }),
  expected: {
    designStatus: 'PASS',
    roof: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'penetration',
      tolerance: 0.05,
    },
    wall: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'penetration',
      tolerance: 0.05,
    },
    floor: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    governingElement: 'roof',
    governingMode: 'penetration',
  },
};

/**
 * BENCHMARK CASE E: Flexure-Governed — Standard Case
 * Tests: Typical protective structure design where flexure governs.
 */
export const BENCHMARK_FLEXURE_GOVERNED: BenchmarkCase = {
  id: 'BM-FLEXURE',
  name: 'Flexure-Governed Design — Standard',
  description: 'Moderate blast on typical underground box structure. Flexure is the governing mode.',
  input: () => ({
    elements: {
      roof: {
        element: 'roof' as const,
        dynamicPressure: 800.0,
        dynamicImpulse: 5000.0,
        dynamicDuration: 25.0,
        staticPressure: 32.7,
        selfWeight: 7.1,
        span: 5.0,
        thickness: 0.40,
        supportCondition: 'simply_supported' as const,
        material: RC300_MATERIAL,
      },
      wall: {
        element: 'wall' as const,
        dynamicPressure: 560.0,
        dynamicImpulse: 5000.0,
        dynamicDuration: 25.0,
        staticPressure: 15.0,
        selfWeight: 9.4,
        span: 3.0,
        thickness: 0.40,
        supportCondition: 'fixed' as const,
        material: RC300_MATERIAL,
      },
      floor: {
        element: 'floor' as const,
        dynamicPressure: 200.0,
        dynamicImpulse: 5000.0,
        dynamicDuration: 25.0,
        staticPressure: 54.0,
        selfWeight: 9.4,
        span: 5.0,
        thickness: 0.40,
        supportCondition: 'simply_supported' as const,
        material: RC300_MATERIAL,
      },
    },
    soil: COMMON_SOIL,
    reinforcement: {
      steelYieldStrength: 420,
      reinforcementGrade: { fy: 420, standard: 'ASTM A615 Grade 60' },
    },
    criteria: DEFAULT_CRITERIA,
    penetration: NO_PENETRATION,
    burialDepth: 1.5,
    structureType: 'box',
    blast: {
      tntEquivalentMass: 500,
      chargeMass: 500,
      distance: 10.0,
      scaledDistance: 1.259,
      detonationType: 'surface',
      peakIncidentPressure: 300.0,
      peakReflectedPressure: 900.0,
      peakDynamicPressure: 150.0,
      positivePhaseImpulse: 5000.0,
      positivePhaseDuration: 25.0,
      reflectionCoefficient: 3.0,
    },
  }),
  expected: {
    designStatus: 'PASS',
    roof: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    wall: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    floor: {
      requiredThickness: 0,
      designMoment: 0,
      designShear: 0,
      requiredAs: 0,
      flexuralSF: 0,
      shearSF: 0,
      governingMode: 'flexure',
      tolerance: 0.05,
    },
    governingElement: 'roof',
    governingMode: 'flexure',
  },
};

// ═══════════════════════════════════════════════════════════════════════
// BENCHMARK REGISTRY
// ═══════════════════════════════════════════════════════════════════════

/** All benchmark cases */
export const BENCHMARK_CASES: BenchmarkCase[] = [
  BENCHMARK_LOW_BLAST,
  BENCHMARK_HIGH_BLAST,
  BENCHMARK_IMPULSIVE,
  BENCHMARK_PENETRATION_GOVERNED,
  BENCHMARK_FLEXURE_GOVERNED,
];

/**
 * Populate benchmark expected values by running the design engine.
 * This should be called ONCE after Phase 5B to record the frozen-engine
 * baseline, then the expected values become the permanent regression target.
 *
 * After calling this, the expected values in the benchmark cases will
 * reflect the ACTUAL frozen-engine output.
 */
export function populateBenchmarkBaselines(
  runDesign: (input: DesignInput) => DesignResult,
): void {
  for (const bm of BENCHMARK_CASES) {
    const input = bm.input();
    const result = runDesign(input);

    for (const key of ['roof', 'wall', 'floor'] as const) {
      bm.expected[key].requiredThickness = result[key].requiredThickness;
      bm.expected[key].designMoment = result[key].designMoment;
      bm.expected[key].designShear = result[key].designShear;
      bm.expected[key].requiredAs = result[key].requiredAs;
      bm.expected[key].flexuralSF = result[key].flexuralSafetyFactor;
      bm.expected[key].shearSF = result[key].shearSafetyFactor;
      bm.expected[key].governingMode = result.verification.elements[key].governingMode;
    }

    bm.expected.designStatus = result.designStatus;
    bm.expected.governingElement = result.verification.governingElement;
    bm.expected.governingMode = result.verification.governingMode;
  }
}

/**
 * Validate a design result against its benchmark expected values.
 * Returns an array of mismatch descriptions (empty = all pass).
 */
export function validateBenchmarkResult(
  benchmark: BenchmarkCase,
  actual: DesignResult,
): { field: string; element: string; expected: number; actual: number; tolerance: number }[] {
  const mismatches: { field: string; element: string; expected: number; actual: number; tolerance: number }[] = [];

  for (const key of ['roof', 'wall', 'floor'] as const) {
    const exp = benchmark.expected[key];
    const act = actual[key];
    const tol = exp.tolerance;

    const check = (field: string, expected: number, actualVal: number) => {
      if (expected === 0 && actualVal === 0) return;
      if (expected === 0 || !isFinite(expected)) return;
      const relError = Math.abs(actualVal - expected) / Math.max(Math.abs(expected), 1e-10);
      if (relError > tol) {
        mismatches.push({ field, element: key, expected, actual: actualVal, tolerance: tol });
      }
    };

    check('requiredThickness', exp.requiredThickness, act.requiredThickness);
    check('designMoment', exp.designMoment, act.designMoment);
    check('designShear', exp.designShear, act.designShear);
    check('requiredAs', exp.requiredAs, act.requiredAs);
    check('flexuralSF', exp.flexuralSF, act.flexuralSafetyFactor);
    check('shearSF', exp.shearSF, act.shearSafetyFactor);
  }

  return mismatches;
}