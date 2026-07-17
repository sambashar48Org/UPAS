/**
 * UPAS — Structural Design Engine (Core)
 * Phase 4B: Structural Design Core
 *
 * Computes structural design for RC elements under blast loading.
 * This module performs:
 *   1. Design load calculation (blast + static) per element
 *   2. Moment and shear demand
 *   3. Iterative thickness search (existing → +25 mm → PASS/FAIL)
 *   4. Per-element design result assembly
 *
 * ─────────────────────────────────────────────────────────────────────
 * ARCHITECTURE RULE — Design Input Contract
 * ─────────────────────────────────────────────────────────────────────
 * This module reads ONLY:
 *   • design/types.ts  (DesignInput, DesignElementLoad, DesignCriteria, …)
 *   • calculations/constants  (ACI_DESIGN_FACTORS, calculateSteelDIF, GRAVITY)
 *   • design/reinforcement-design.ts  (pure calculation helpers)
 *
 * This module NEVER imports from:
 *   ❌ calculations/types.ts  (analysis types)
 *   ❌ calculations/results/
 *   ❌ calculations/structure/
 *   ❌ calculations/soil/
 *   ❌ calculations/threat/
 *
 * All blast parameters come from DesignInput.blast (DesignBlastInput).
 * No blast equations are recalculated. No KB polynomials. No TNT conversion.
 * No threat engine. No blast engine.
 *
 * Reference Standards:
 * - UFC 3-340-02  (Loads & Response, Dynamic Analysis)
 * - ACI 318-19    (Reinforcement Design)
 * - TM 5-855-1    (Blast & Ground Shock)
 */

import type {
  DesignInput,
  DesignElementLoad,
  DesignCriteria,
  DesignBlastInput,
  ElementDesignResult,
} from './types';

import { ACI_DESIGN_FACTORS, calculateSteelDIF, GRAVITY } from '../constants';

import {
  calculateEffectiveDepth,
  calculateRequiredAs,
  calculateFlexuralCapacity,
  calculateShearCapacity,
  selectReinforcement,
  selectDistributionReinforcement,
} from './reinforcement-design';

// ═══════════════════════════════════════════════════════════════════════
// LOAD DISTRIBUTION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Wall blast pressure distribution factor.
 *  Reference: TM 5-1300 / UFC 3-340-02 Ch.5 — lateral pressure reduction. */
const WALL_BLAST_FACTOR = 0.70;

// ═══════════════════════════════════════════════════════════════════════
// MOMENT COEFFICIENTS — uniform load, one-way spanning element
// ═══════════════════════════════════════════════════════════════════════

const MOMENT_COEFFICIENTS: Record<string, number> = {
  simply_supported: 8,    // Mu = wL² / 8
  fixed: 12,              // Mu = wL² / 12
  partial_fixity: 10,     // Mu = wL² / 10  (documented intermediate)
} as const;

// ═══════════════════════════════════════════════════════════════════════
// DEFLECTION COEFFICIENTS — C in  δ = C × w L⁴ / (384 E I)
// ═══════════════════════════════════════════════════════════════════════

const DEFLECTION_COEFFICIENTS: Record<string, number> = {
  simply_supported: 5 / 384,
  fixed: 1 / 384,
  partial_fixity: 3 / 384,   // intermediate
} as const;

// ═══════════════════════════════════════════════════════════════════════
// DESIGN LOAD CALCULATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate the total design load for one structural element.
 *
 * Load composition (blast values from DesignBlastInput — NEVER recalculated):
 *
 *   Roof:  W = peakReflectedPressure  + overburdenPressure + selfWeight
 *   Wall:  W = peakReflectedPressure × 0.70  + lateralEarthPressure + selfWeight
 *   Floor: W = peakDynamicPressure    + soilReaction       + selfWeight
 *
 * Static components (overburden, lateral pressure, soil reaction, self-weight)
 * are already assembled in DesignElementLoad.staticPressure by the adapter.
 * This function adds the BLAST component from DesignBlastInput.
 *
 * @param element     - Structural element type
 * @param elementLoad - Per-element load data (contains staticPressure with
 *                      overburden/lateral/soilReaction/selfWeight as applicable)
 * @param blast       - Complete blast threat data (DesignInput.blast)
 * @returns Total design load w (kPa)
 */
export function calculateDesignLoad(
  element: 'roof' | 'wall' | 'floor',
  elementLoad: DesignElementLoad,
  blast: DesignBlastInput,
): number {
  let blastComponent: number;

  switch (element) {
    case 'roof':
      // Roof receives full reflected pressure (normal incidence on horizontal slab)
      blastComponent = blast.peakReflectedPressure;
      break;
    case 'wall':
      // Wall receives reduced pressure (lateral distribution factor)
      blastComponent = blast.peakReflectedPressure * WALL_BLAST_FACTOR;
      break;
    case 'floor':
      // Floor receives dynamic pressure (attenuated through structure)
      blastComponent = blast.peakDynamicPressure;
      break;
  }

  return blastComponent + elementLoad.staticPressure;
}

// ═══════════════════════════════════════════════════════════════════════
// MOMENT DEMAND
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate design bending moment for a uniformly loaded element.
 *
 *   Simply supported:  Mu = w L² / 8
 *   Fixed:            Mu = w L² / 12
 *   Partial fixity:   Mu = w L² / 10
 *
 * @param w                - Total design load (kPa = kN/m²)
 * @param span             - Clear span L (m)
 * @param supportCondition - Support type
 * @returns Design moment Mu (kN·m per meter width)
 */
export function calculateDesignMoment(
  w: number,
  span: number,
  supportCondition: 'simply_supported' | 'fixed' | 'partial_fixity',
): number {
  const C = MOMENT_COEFFICIENTS[supportCondition] ?? 8;
  return (w * span * span) / C;
}

// ═══════════════════════════════════════════════════════════════════════
// SHEAR DEMAND
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate design shear for a uniformly loaded element.
 * Vu = w × L / 2  (same for all support conditions)
 *
 * @param w    - Total design load (kPa)
 * @param span - Clear span (m)
 * @returns Design shear Vu (kN/m)
 */
export function calculateDesignShear(
  w: number,
  span: number,
): number {
  return (w * span) / 2;
}

// ═══════════════════════════════════════════════════════════════════════
// DEFLECTION (gross moment of inertia)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate mid-span deflection using gross moment of inertia.
 *
 * δ = C × w × L⁴ / (E × I)
 * where  I = b × h³ / 12   (b = 1 m for per-meter strip)
 *
 * @param w                - Total design load (kPa)
 * @param span             - Clear span (m)
 * @param Ec_MPa           - Concrete modulus of elasticity (MPa)
 * @param thickness_m      - Element thickness (m)
 * @param supportCondition - Support type
 * @returns Maximum deflection δ (mm)
 */
export function calculateDeflection(
  w: number,
  span: number,
  Ec_MPa: number,
  thickness_m: number,
  supportCondition: 'simply_supported' | 'fixed' | 'partial_fixity',
): number {
  if (Ec_MPa <= 0 || thickness_m <= 0 || span <= 0) return 0;

  const C = DEFLECTION_COEFFICIENTS[supportCondition] ?? (5 / 384);
  const E_kN_m2 = Ec_MPa * 1000;           // MPa → kN/m²
  const I_m4 = Math.pow(thickness_m, 3) / 12; // b=1m

  const delta_m = (C * w * Math.pow(span, 4)) / (E_kN_m2 * I_m4);
  return delta_m * 1000; // → mm
}

// ═══════════════════════════════════════════════════════════════════════
// ELEMENT DESIGN — Iterative Thickness Search
// ═══════════════════════════════════════════════════════════════════════

/**
 * Design a single structural element with iterative thickness search.
 *
 * Algorithm:
 *   1. Start at existingThickness (from analysis input)
 *   2. Compute design load w (blast + static)
 *   3. Compute moment Mu and shear Vu
 *   4. Compute required As (using static fy)
 *   5. Select reinforcement bars
 *   6. Compute capacity φMn (using DIF-modified fy) and φVc (using DIF-modified f'c)
 *   7. Check safety factors against targetSafetyFactor
 *   8. If not met: increase thickness by thicknessIncrement, goto 2
 *   9. Max 100 iterations; if maxThickness exceeded → status = 'fail'
 *
 * This function does NOT mutate any input parameters.
 *
 * @param element     - Structural element type
 * @param elementLoad - Per-element load data (from DesignInput.elements)
 * @param blast       - Complete blast threat data (from DesignInput.blast)
 * @param criteria    - Design criteria (from DesignInput.criteria)
 * @returns Complete ElementDesignResult
 */
export function designElement(
  element: 'roof' | 'wall' | 'floor',
  elementLoad: DesignElementLoad,
  blast: DesignBlastInput,
  criteria: DesignCriteria,
): ElementDesignResult {
  const warnings: string[] = [];
  const MAX_ITERATIONS = 100;

  const supportCondition = element === 'wall'
    ? criteria.wallSupportCondition
    : criteria.supportCondition;

  // Dynamic Increase Factors (UFC 3-340-02 Sec 5.14.3)
  const steelDIF = calculateSteelDIF(criteria.steelGrade);
  const fy_dynamic = criteria.steelGrade * steelDIF;   // DIF applied to capacity only

  // Concrete DIF from material properties (set by adapter from analysis)
  const fpc_dynamic = elementLoad.material.fpc * elementLoad.material.difCompressive;

  let currentThickness = elementLoad.thickness;
  let result: ElementDesignResult;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // ── 1. Design load ──────────────────────────────────────────
    // Blast component + adapter's staticPressure (which already contains
    // overburden/lateral/soilReaction/selfWeight per element type).
    const w_base = calculateDesignLoad(element, elementLoad, blast);

    // Account for additional self-weight from thickness increase
    const thicknessIncrease = Math.max(0, currentThickness - elementLoad.thickness);
    const additionalSelfWeight = (elementLoad.material.density * thicknessIncrease * GRAVITY) / 1000; // kPa
    const w = w_base + additionalSelfWeight;

    // ── 2. Moment & Shear demand ────────────────────────────────
    const Mu = calculateDesignMoment(w, elementLoad.span, supportCondition);
    const Vu = calculateDesignShear(w, elementLoad.span);

    // ── 3. Effective depth (assume T16 for initial As estimate) ─
    const d_assumed = calculateEffectiveDepth(currentThickness, criteria.concreteCover, 16);

    // ── 4. Required As (STATIC fy — DIF applied only to capacity) ─
    const As_req = calculateRequiredAs(
      Mu, d_assumed, elementLoad.material.fpc, criteria.steelGrade, ACI_DESIGN_FACTORS.flexure,
    );

    // ── 5. Select reinforcement ─────────────────────────────────
    const mainRebar = selectReinforcement(As_req);
    const distributionRebar = selectDistributionReinforcement(mainRebar);

    // ── 6. Recompute d with actual selected bar diameter ────────
    const d_actual = calculateEffectiveDepth(
      currentThickness, criteria.concreteCover, mainRebar.barDiameter,
    );

    // ── 7. Flexural capacity (DYNAMIC fy — DIF applied) ────────
    const Mn = calculateFlexuralCapacity(
      mainRebar.asProvided, d_actual, elementLoad.material.fpc, fy_dynamic, ACI_DESIGN_FACTORS.flexure,
    );

    // ── 8. Shear capacity (DYNAMIC f'c — concrete DIF applied) ──
    const phiVc = calculateShearCapacity(fpc_dynamic, d_actual, ACI_DESIGN_FACTORS.shear);

    // ── 9. Safety factors ───────────────────────────────────────
    const flexuralSF = Mu > 0 ? Mn / Mu : Infinity;
    const shearSF = Vu > 0 ? phiVc / Vu : Infinity;

    // ── 10. Deflection ─────────────────────────────────────────
    const maxDeflection = calculateDeflection(
      w, elementLoad.span, elementLoad.material.Ec, currentThickness, supportCondition,
    );
    const allowableDeflection = criteria.maxDeflectionRatio * elementLoad.span * 1000; // mm

    // ── 11. Status determination ───────────────────────────────
    let status: 'pass' | 'fail' | 'optimize';
    if (flexuralSF >= criteria.targetSafetyFactor && shearSF >= criteria.targetSafetyFactor) {
      status = 'pass';
    } else if (currentThickness >= criteria.maxThickness) {
      status = 'fail';
      warnings.push(
        `السماكة القصوى (${criteria.maxThickness} m) تم بلوغها دون تحقيق عامل الأمان المطلوب (${criteria.targetSafetyFactor})`,
      );
    } else {
      status = 'optimize';
    }

    // ── 12. Assemble result ─────────────────────────────────────
    result = {
      element,
      existingThickness: elementLoad.thickness,
      requiredThickness: currentThickness,
      recommendedThickness: currentThickness,
      designMoment: Mu,
      requiredAs: As_req,
      providedAs: mainRebar.asProvided,
      mainReinforcement: mainRebar,
      distributionReinforcement: distributionRebar,
      designShear: Vu,
      shearCapacity: phiVc,
      maxDeflection,
      allowableDeflection,
      flexuralSafetyFactor: flexuralSF,
      shearSafetyFactor: shearSF,
      status,
      warnings: [...warnings],
    };

    // ── 13. Check convergence ───────────────────────────────────
    if (status === 'pass' || status === 'fail') break;

    // Increase thickness for next iteration
    currentThickness += criteria.thicknessIncrement;
  }

  return result!;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════

/**
 * Run structural design for all three elements.
 *
 * This is the main entry point for the structural design engine.
 * It reads ONLY DesignInput — never touches FullAnalysisResult.
 *
 * @param designInput - Complete design input (from DesignInputAdapter)
 * @returns Per-element design results
 */
export function runStructuralDesign(designInput: DesignInput): {
  roof: ElementDesignResult;
  wall: ElementDesignResult;
  floor: ElementDesignResult;
} {
  const { elements, blast, criteria } = designInput;

  return {
    roof: designElement('roof', elements.roof, blast, criteria),
    wall: designElement('wall', elements.wall, blast, criteria),
    floor: designElement('floor', elements.floor, blast, criteria),
  };
}