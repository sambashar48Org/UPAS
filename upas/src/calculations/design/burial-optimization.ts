/**
 * UPAS — Burial Depth Optimization
 * Phase 4C: Verification & Integration
 *
 * Iterates burial depth from an initial value upward, recalculating
 * soil-dependent static loads at each step, and checks whether the
 * target safety factor is achieved.
 *
 * Flow:
 *   current burial depth
 *       ↓
 *   increase depth step
 *       ↓
 *   recalculate overburden, lateral pressure, effective stress
 *       ↓
 *   recalculate design load
 *       ↓
 *   run structural design + verification
 *       ↓
 *   check target SF → STOP or CONTINUE
 *
 * ARCHITECTURE RULE:
 *   This module does NOT create a new soil model. It uses:
 *     - design/soil-pressure.ts  (existing Rankine lateral pressure)
 *     - calculations/constants   (SOIL_ATTENUATION_EXPONENTS, GROUND_COUPLING_FACTORS)
 *   for static pressure recalculation.
 *
 *   Blast attenuation through soil is modeled using the SAME inverse-power
 *   formula as soil/index.ts (TM 5-855-1 / Drake & Little). This is
 *   the existing formula — not a new model.
 *
 * This module NEVER imports from:
 *   ❌ calculations/results/
 *   ❌ calculations/structure/
 *   ❌ calculations/soil/index.ts  (uses the formula directly from constants)
 *   ❌ calculations/threat/
 *
 * Reference Standards:
 * - TM 5-855-1 (Fundamentals of Protective Design for Conventional Weapons)
 * - Drake & Little (1983) — Ground Shock Attenuation
 * - UFC 3-340-02, Appendix B (Soil Mechanics for Protective Structures)
 */

import type {
  DesignInput,
  DesignElementLoad,
  DesignBlastInput,
  DesignCriteria,
  DesignSoil,
  ElementDesignResult,
  VerificationResult,
} from './types';

import {
  calculateAverageWallLateralPressure,
} from './soil-pressure';

import {
  SOIL_ATTENUATION_EXPONENTS,
  GROUND_COUPLING_FACTORS,
  GRAVITY,
} from '../constants';

import { runStructuralDesign } from './structural-design';
import { runVerification, getMinSafetyFactor } from './design-verification';

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

/** Configuration for burial depth optimization. */
export interface BurialOptimizationConfig {
  /** Starting burial depth (m) — typically from DesignInput.burialDepth */
  initialBurialDepth: number;

  /** Maximum burial depth to try (m). Default: 10.0m */
  maxBurialDepth: number;

  /** Depth increment per step (m). Default: 0.5m */
  depthStep: number;

  /** Target safety factor. Default: from DesignCriteria */
  targetSafetyFactor: number;

  /** Soil category for attenuation exponent.
   *  'cohesiveless' | 'cohesive' | 'rock'. Default: 'cohesiveless' */
  soilCategory?: string;

  /** Maximum iterations before stopping. Default: 40 */
  maxIterations?: number;
}

/** Result of burial depth optimization. */
export interface BurialOptimizationResult {
  /** Optimal burial depth found (m) */
  optimalBurialDepth: number;

  /** Minimum required burial depth for target SF (m) */
  requiredBurialDepth: number;

  /** Minimum safety factor at initial depth */
  initialMinSF: number;

  /** Minimum safety factor at optimal depth */
  finalMinSF: number;

  /** Number of iterations executed */
  iterations: number;

  /** Did the optimization converge (SF >= target)? */
  converged: boolean;

  /** Warnings generated during optimization */
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute soil blast attenuation factor at a given burial depth.
 *
 * Uses the SAME formula as soil/index.ts (TM 5-855-1 / Drake & Little):
 *   attenuation = 1 / (1 + d/R_ref)^n
 *
 * where d = burial depth (m), R_ref = 1.0 m, n = attenuation exponent.
 *
 * @param burialDepth   - Soil cover above structure (m)
 * @param soilCategory  - 'cohesiveless' | 'cohesive' | 'rock'
 * @returns Attenuation factor (0–1, 1 = no attenuation)
 */
export function computeSoilAttenuationFactor(
  burialDepth: number,
  soilCategory: string,
): number {
  if (burialDepth <= 0) return 1.0;

  const n = SOIL_ATTENUATION_EXPONENTS[soilCategory] ?? SOIL_ATTENUATION_EXPONENTS['cohesiveless'];
  const R_ref = 1.0;
  return 1.0 / Math.pow(1.0 + burialDepth / R_ref, n);
}

/**
 * Create an attenuated copy of DesignBlastInput for a given burial depth.
 *
 * The original DesignBlastInput contains FREE-AIR blast pressures
 * (from the threat engine / Kingery-Bulmash). For buried structures,
 * the arriving pressure is attenuated by the soil cover.
 *
 *   P_arriving = P_free_air × attenuation × coupling
 *
 * @param blast         - Original blast input (free-air pressures)
 * @param burialDepth   - Soil cover thickness (m)
 * @param soilCategory  - Soil category for attenuation exponent
 * @param detonationType - Detonation type for ground coupling factor
 * @returns New DesignBlastInput with attenuated pressures
 */
function attenuateBlast(
  blast: DesignBlastInput,
  burialDepth: number,
  soilCategory: string,
  detonationType: string,
): DesignBlastInput {
  if (burialDepth <= 0) return blast;

  const attenuation = computeSoilAttenuationFactor(burialDepth, soilCategory);
  const coupling = GROUND_COUPLING_FACTORS[detonationType] ?? GROUND_COUPLING_FACTORS['surface'];
  const scaleFactor = attenuation * coupling;

  return {
    ...blast,
    peakIncidentPressure: blast.peakIncidentPressure * scaleFactor,
    peakReflectedPressure: blast.peakReflectedPressure * scaleFactor,
    peakDynamicPressure: blast.peakDynamicPressure * scaleFactor,
    // Impulse attenuated proportionally
    positivePhaseImpulse: blast.positivePhaseImpulse * scaleFactor,
  };
}

/**
 * Recalculate element static pressures at a new burial depth.
 *
 * This uses existing functions (soil-pressure.ts for lateral, simple
 * overburden calculation for roof/floor). NO new soil model is created.
 *
 * Roof static:  overburden (γ × d) + selfWeight
 * Wall static:  lateral pressure (Rankine) + selfWeight
 * Floor static: effective stress (γ × (d + H)) + selfWeight
 *
 * @param elements  - Original element loads (provides material, span, selfWeight)
 * @param soil      - Soil properties from DesignInput
 * @param newDepth  - New burial depth (m)
 * @param criteria  - Design criteria
 * @returns Updated element loads with new static pressures
 */
function rebuildElementsAtDepth(
  elements: DesignInput['elements'],
  soil: DesignSoil,
  newDepth: number,
  criteria: DesignCriteria,
): DesignInput['elements'] {
  const γ = soil.averageUnitWeight; // kN/m³
  const φ = soil.frictionAngle;     // degrees
  const c = soil.cohesion;          // kPa

  // Wall height ≈ wall span (same approximation as design-input-adapter.ts)
  const wallHeight = elements.wall.span;

  // ── Overburden at new depth ──
  const overburden = γ * newDepth; // kPa

  // ── Lateral earth pressure at new depth (existing function from soil-pressure.ts) ──
  const lateralPressure = calculateAverageWallLateralPressure(
    newDepth,
    wallHeight,
    γ,
    φ,
    c,
    'active',
  );

  // ── Effective stress at floor level (simplified, no water table) ──
  const floorDepth = newDepth + wallHeight;
  const effectiveStress = γ * floorDepth; // kPa (simplified: no pore pressure)

  return {
    roof: {
      ...elements.roof,
      staticPressure: criteria.includeOverburden
        ? overburden + elements.roof.selfWeight
        : elements.roof.selfWeight,
    },
    wall: {
      ...elements.wall,
      staticPressure: criteria.includeLateralPressure
        ? lateralPressure + elements.wall.selfWeight
        : elements.wall.selfWeight,
    },
    floor: {
      ...elements.floor,
      staticPressure: effectiveStress + elements.floor.selfWeight,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Optimize burial depth for a protective structure.
 *
 * Algorithm:
 *   1. Run design at initial depth (with blast attenuation at that depth)
 *   2. Verify: if minSF >= target → DONE (depth is sufficient)
 *   3. Increase depth by step
 *   4. Recalculate:
 *      a. Blast attenuation (existing formula from constants)
 *      b. Overburden pressure on roof
 *      c. Lateral earth pressure on walls (existing soil-pressure.ts)
 *      d. Effective stress on floor
 *   5. Run structural design + verification at new depth
 *   6. If minSF >= target → DONE
 *   7. If depth > max → FAIL (report best depth found)
 *   8. Go to 3
 *
 * This function does NOT mutate any input.
 *
 * @param designInput  - Complete design input (from DesignInputAdapter)
 * @param config      - Optimization configuration
 * @returns BurialOptimizationResult
 */
export function optimizeBurialDepth(
  designInput: DesignInput,
  config: BurialOptimizationConfig,
): BurialOptimizationResult {
  const warnings: string[] = [];
  const {
    elements,
    blast: originalBlast,
    criteria,
    penetration,
    soil,
  } = designInput;

  const soilCategory = config.soilCategory ?? 'cohesiveless';
  const maxIter = config.maxIterations ?? 40;
  const detonationType = originalBlast.detonationType;

  // ── Helper: run design + verification at a given depth ──
  function evaluateAtDepth(
    depth: number,
  ): { verification: VerificationResult; minSF: number; results: ElementDesignResult[] } {
    // Attenuate blast for this depth
    const attenuatedBlast = attenuateBlast(originalBlast, depth, soilCategory, detonationType);

    // Rebuild static pressures for this depth
    const updatedElements = rebuildElementsAtDepth(elements, soil, depth, criteria);

    // Run structural design with attenuated blast + updated statics
    const designResults = runStructuralDesign({
      ...designInput,
      blast: attenuatedBlast,
      elements: updatedElements,
    });

    // Run verification (includes penetration + deflection)
    const verification = runVerification(
      designResults,
      penetration,
      {
        roof: updatedElements.roof.span,
        wall: updatedElements.wall.span,
        floor: updatedElements.floor.span,
      },
      criteria,
    );

    return {
      verification,
      minSF: getMinSafetyFactor(verification),
      results: [designResults.roof, designResults.wall, designResults.floor],
    };
  }

  // ── Step 1: Evaluate at initial depth ──
  const initial = evaluateAtDepth(config.initialBurialDepth);
  let bestDepth = config.initialBurialDepth;
  let bestMinSF = initial.minSF;
  let bestVerification = initial.verification;
  let converged = bestMinSF >= config.targetSafetyFactor;

  // ── Step 2: Iterate deeper ──
  let iterations = 0;
  let currentDepth = config.initialBurialDepth;

  while (!converged && iterations < maxIter) {
    currentDepth += config.depthStep;
    iterations++;

    if (currentDepth > config.maxBurialDepth) {
      warnings.push(
        `تم بلوغ الحد الأقصى لعمق الدفن (${config.maxBurialDepth} m) دون تحقيق عامل الأمان المطلوب`,
      );
      break;
    }

    const result = evaluateAtDepth(currentDepth);

    // Track best depth (highest minimum SF)
    if (result.minSF > bestMinSF) {
      bestDepth = currentDepth;
      bestMinSF = result.minSF;
      bestVerification = result.verification;
    }

    // Check convergence
    if (result.minSF >= config.targetSafetyFactor) {
      converged = true;
    }
  }

  return {
    optimalBurialDepth: bestDepth,
    requiredBurialDepth: converged ? bestDepth : bestDepth,
    initialMinSF: initial.minSF,
    finalMinSF: bestMinSF,
    iterations,
    converged,
    warnings,
  };
}