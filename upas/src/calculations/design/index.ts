/**
 * UPAS — Design Engine Main Entry Point
 * Phase 4C: Verification & Integration
 *
 * This is the ONLY file that bridges the analysis world (FullAnalysisResult)
 * with the design world. It orchestrates the complete design pipeline:
 *
 *   FullAnalysisResult
 *       ↓  DesignInputAdapter
 *   DesignInput
 *       ↓  Structural Design (Phase 4B)
 *   Per-element design results
 *       ↓  Verification (Phase 4C)
 *   VerificationResult (flexure + shear + penetration + deflection)
 *       ↓  Assembly
 *   DesignResult
 *
 * ARCHITECTURE RULE:
 *   This file is the SINGLE entry point for the design engine.
 *   Individual design modules (structural-design.ts, reinforcement-design.ts,
 *   design-verification.ts) never import from calculations/types.ts.
 *   Only this file and design-input-adapter.ts import from calculations/types.ts.
 *
 * Reference Standards:
 * - UFC 3-340-02 (Structures to Resist the Effects of Accidental Explosions)
 * - ACI 318-19 (Building Code Requirements for Structural Concrete)
 * - TM 5-855-1 (Fundamentals of Protective Design for Conventional Weapons)
 */

// ─── Adapter: Analysis → Design ──────────────────────────────────────
import { buildDesignInput } from './design-input-adapter';

// ─── Structural Design (Phase 4B) ───────────────────────────────────
import { runStructuralDesign } from './structural-design';

// ─── Verification (Phase 4C) ─────────────────────────────────────────
import {
  runVerification,
  assembleDesignResult,
} from './design-verification';

// ─── Burial Optimization (Phase 4C) ──────────────────────────────────
import { optimizeBurialDepth } from './burial-optimization';

// ─── Types ──────────────────────────────────────────────────────────
import type { FullAnalysisResult } from '../types';
import type {
  DesignCriteria,
  DesignResult,
  DesignAdapterResult,
  VerificationResult,
} from './types';

import type {
  BurialOptimizationConfig,
  BurialOptimizationResult,
} from './burial-optimization';

// ═══════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Run the complete structural design pipeline.
 *
 * Pipeline:
 *   1. FullAnalysisResult → DesignInputAdapter → DesignInput
 *   2. DesignInput → Structural Design → Per-element results
 *   3. Per-element results + Penetration data → Verification → VerificationResult
 *   4. Assembly → DesignResult
 *
 * @param analysisResult  - Complete analysis result from the calculation engine
 * @param criteria        - Optional design criteria overrides
 * @returns Complete DesignResult with verification
 */
export function runDesignCalculation(
  analysisResult: FullAnalysisResult,
  criteria?: Partial<DesignCriteria>,
): DesignResult {
  // ── Step 1: Adapt analysis result → design input ──
  const adapterResult: DesignAdapterResult = buildDesignInput(analysisResult, criteria);
  const designInput = adapterResult.input;

  // ── Step 2: Run structural design (includes reinforcement) ──
  const elementResults = runStructuralDesign(designInput);

  // ── Step 3: Run verification (flexure + shear + penetration + deflection) ──
  const verification: VerificationResult = runVerification(
    elementResults,
    designInput.penetration,
    {
      roof: designInput.elements.roof.span,
      wall: designInput.elements.wall.span,
      floor: designInput.elements.floor.span,
    },
    designInput.criteria,
  );

  // ── Step 4: Assemble final DesignResult ──
  const designResult: DesignResult = assembleDesignResult(
    elementResults,
    verification,
    adapterResult.warnings,
  );

  return designResult;
}

// ═══════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════════════════

// Re-export types for downstream consumers
export type {
  DesignInput,
  DesignCriteria,
  DesignResult,
  DesignBlastInput,
  DesignElementLoad,
  DesignSoil,
  DesignMaterial,
  DesignPenetrationData,
  ElementDesignResult,
  VerificationResult,
  ElementVerificationResult,
  VerificationMode,
  RebarSelection,
  DesignInputWarning,
  DesignAdapterResult,
} from './types';

export type {
  BurialOptimizationConfig,
  BurialOptimizationResult,
} from './burial-optimization';

// Re-export burial optimization
export { optimizeBurialDepth } from './burial-optimization';
export { computeSoilAttenuationFactor } from './burial-optimization';