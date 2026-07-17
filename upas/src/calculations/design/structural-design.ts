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

import { ACI_DESIGN_FACTORS, calculateSteelDIF, GRAVITY, LOAD_MASS_FACTOR_SS, LOAD_MASS_FACTOR_FF } from '../constants';

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
// DYNAMIC RESPONSE FACTOR — UFC 3-340-02 Ch.5 / Biggs SDOF Method
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate the Dynamic Response Factor (DLF) for a structural element
 * under blast loading, using the Biggs SDOF chart approximation.
 *
 * The DLF depends on the ratio of the positive phase duration td to the
 * element's natural period T, via the load-mass factor KLM.
 *
 * This is the UFC 3-340-02 equivalent load approach (Option B):
 *   Equivalent Dynamic Pressure = Peak Pressure × DLF
 *
 * Reference: UFC 3-340-02 Ch.5, Fig. 5-4; Biggs "Introduction to
 * Structural Dynamics" (1964); TM 5-1300 Ch.5.
 *
 * The DLF is read from the standard Biggs chart for a triangular
 * blast pulse acting on a single-degree-of-freedom system:
 *
 *   td/T < 0.1  →  DLF ≈ 2 × (π × td/T)    (impulsive regime)
 *   td/T ≈ 0.4  →  DLF ≈ 1.5                  (near-maximum response)
 *   td/T ≈ 1.0  →  DLF ≈ 1.2                  (quasi-static transition)
 *   td/T > 3.0  →  DLF ≈ 1.0                  (static regime)
 *
 * The natural period T is estimated from the element's mass and stiffness:
 *   T = 2π √(KLM × m / k)
 * For a uniform simply-supported slab: T ≈ 0.1 × (L/h)^1.5  (ms)
 * (empirical formula consistent with structure/index.ts)
 *
 * @param peakPressure_kPa  - Peak blast pressure on element (kPa)
 * @param impulse_kPaMs     - Positive phase impulse on element (kPa·ms)
 * @param duration_ms       - Positive phase duration td (ms)
 * @param naturalPeriod_ms  - Element natural period T (ms)
 * @param supportCondition  - Support condition (affects KLM and T)
 * @returns Dynamic Response Factor DLF (dimensionless, ≥ 1.0 for blast)
 */
export function calculateDynamicResponseFactor(
  peakPressure_kPa: number,
  impulse_kPaMs: number,
  duration_ms: number,
  naturalPeriod_ms: number,
  supportCondition: 'simply_supported' | 'fixed' | 'partial_fixity',
): number {
  // Edge case: no blast or no duration → static
  if (peakPressure_kPa <= 0 || duration_ms <= 0 || naturalPeriod_ms <= 0) {
    return 1.0;
  }

  const td_T = duration_ms / naturalPeriod_ms;

  // ── Biggs SDOF DLF for triangular pulse (UFC 3-340-02 Fig. 5-4) ──
  // Piecewise approximation of the standard Biggs chart
  let dlf: number;

  if (td_T <= 0.1) {
    // Impulsive regime: response dominated by impulse, not peak pressure
    // DLF ≈ ω × td ≈ 2π × td/T (for small td/T)
    // In this regime, impulse matters more than peak pressure.
    dlf = 2 * Math.PI * td_T;
  } else if (td_T <= 0.2) {
    // Transition from impulsive to dynamic
    const t01 = 0.1;
    const dlf01 = 2 * Math.PI * 0.1;  // ≈ 0.628
    const t02 = 0.2;
    const dlf02 = 1.1;                  // from Biggs chart at td/T=0.2
    // Linear interpolation
    dlf = dlf01 + (dlf02 - dlf01) * (td_T - t01) / (t02 - t01);
  } else if (td_T <= 0.4) {
    // Near peak DLF region
    const t1 = 0.2;
    const d1 = 1.1;
    const t2 = 0.4;
    const d2 = 1.5;
    dlf = d1 + (d2 - d1) * (td_T - t1) / (t2 - t1);
  } else if (td_T <= 1.0) {
    // Dynamic to quasi-static transition
    const t1 = 0.4;
    const d1 = 1.5;
    const t2 = 1.0;
    const d2 = 1.2;
    dlf = d1 + (d2 - d1) * (td_T - t1) / (t2 - t1);
  } else if (td_T <= 3.0) {
    // Quasi-static transition
    const t1 = 1.0;
    const d1 = 1.2;
    const t2 = 3.0;
    const d2 = 1.0;
    dlf = d1 + (d2 - d1) * (td_T - t1) / (t2 - t1);
  } else {
    // Static regime: load is applied slowly relative to structure period
    dlf = 1.0;
  }

  // Return raw DLF — may be < 1.0 in impulsive regime.
  // The calling function (calculateDesignLoad) takes the MAX of
  // the pressure-DLF path and the impulse-based path, so the
  // final equivalent load is always physically correct.
  return dlf;
}

/**
 * Estimate the natural period of vibration for a concrete slab element.
 *
 * Uses the empirical formula consistent with structure/index.ts:
 *   T = C × L × (L/h)^2   (ms)
 *
 * This simplified formula captures the essential relationship:
 *   - Longer spans → longer period
 *   - Thicker sections → shorter period
 *   - Fixed supports → shorter period
 *
 * For a more precise calculation, the SDOF effective stiffness and
 * effective mass (via KLM) would be used:
 *   T = 2π √(KLM × m_per_area / k_eff)
 *
 * Reference: UFC 3-340-02 Ch.5; Biggs (1964)
 *
 * @param span_m           - Clear span (m)
 * @param thickness_m      - Element thickness (m)
 * @param density_kg_m3    - Concrete density (kg/m³)
 * @param supportCondition - Support type
 * @returns Natural period T (ms)
 */
export function estimateNaturalPeriod(
  span_m: number,
  thickness_m: number,
  density_kg_m3: number,
  supportCondition: 'simply_supported' | 'fixed' | 'partial_fixity',
): number {
  if (span_m <= 0 || thickness_m <= 0) return 10; // default 10ms

  const safeH = Math.max(thickness_m, 0.001);
  const safeL = Math.max(span_m, 0.001);

  // Coefficient: SS=0.063, Fixed=0.031 (consistent with structure/index.ts)
  let C: number;
  switch (supportCondition) {
    case 'fixed':
      C = 0.031;
      break;
    case 'partial_fixity':
      C = 0.047; // average of SS and fixed
      break;
    default:
      C = 0.063;
  }

  // T = C × L × (L/h)^2  (result in ms)
  const T = C * safeL * Math.pow(safeL / safeH, 2);

  // Clamp to physically reasonable range [1, 500] ms
  return Math.max(1, Math.min(500, T));
}

// ═══════════════════════════════════════════════════════════════════════
// DESIGN LOAD CALCULATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate the peak blast pressure component for one structural element.
 *
 * This function selects the correct blast pressure source per element type
 * from DesignBlastInput. These values come from the blast engine
 * (Kingery-Bulmash via TM 5-1300) — they are NEVER recalculated in the
 * design module.
 *
 *   Roof:  peakReflectedPressure (normal incidence)
 *   Wall:  peakReflectedPressure × 0.70 (lateral distribution, TM 5-1300 Ch.5)
 *   Floor: peakDynamicPressure (Rankine-Hugoniot dynamic pressure)
 *
 * @param element - Structural element type
 * @param blast   - Complete blast threat data (DesignInput.blast)
 * @returns Peak blast pressure for this element (kPa)
 */
export function getPeakBlastPressure(
  element: 'roof' | 'wall' | 'floor',
  blast: DesignBlastInput,
): number {
  switch (element) {
    case 'roof':
      return blast.peakReflectedPressure;
    case 'wall':
      return blast.peakReflectedPressure * WALL_BLAST_FACTOR;
    case 'floor':
      return blast.peakDynamicPressure;
  }
}

/**
 * Get the Load-Mass Factor (KLM) for an SDOF equivalent system.
 *
 * KLM converts the actual mass distribution into an effective SDOF mass.
 * Used in both the natural period calculation and the impulse-based
 * equivalent load formula.
 *
 * Reference: UFC 3-340-02 Ch.5, Table 5-1; Biggs (1964)
 *
 * @param supportCondition - Support type
 * @returns KLM (dimensionless)
 */
function getLoadMassFactor(
  supportCondition: 'simply_supported' | 'fixed' | 'partial_fixity',
): number {
  switch (supportCondition) {
    case 'fixed':
      return LOAD_MASS_FACTOR_FF;    // 0.64
    case 'partial_fixity':
      return (LOAD_MASS_FACTOR_SS + LOAD_MASS_FACTOR_FF) / 2; // 0.71
    default:
      return LOAD_MASS_FACTOR_SS;    // 0.78
  }
}

/**
 * Calculate the equivalent dynamic blast load for one structural element.
 *
 * This function implements the UFC 3-340-02 equivalent load approach (Option B)
 * using a DUAL-PATH method that captures BOTH pressure-dominated and
 * impulse-dominated response:
 *
 *   Path 1 (Pressure-dominated):  w₁ = P_peak × DLF(T, td)
 *   Path 2 (Impulse-dominated):   w₂ = 2π × I / (T × KLM)
 *
 *   w_blast = max(w₁, w₂)
 *
 * Path 1 uses the Biggs SDOF DLF chart (UFC 3-340-02 Fig. 5-4).
 * Path 2 derives the equivalent pressure from impulse for short-duration
 * blasts where the response is governed by momentum transfer.
 *
 * ALL four dynamic parameters affect the result:
 *   - Peak pressure P → Path 1
 *   - Impulse I → Path 2 (and indirectly Path 1 via td=2I/P correlation)
 *   - Duration td → Path 1 (via td/T ratio)
 *   - Natural period T → Both paths
 *   - Load-mass factor KLM → Path 2
 *
 * The total design load is then:
 *   w_total = w_blast + staticPressure + additional_selfWeight
 *
 * IMPORTANT: This is NOT a static beam calculation. The dual-path DLF
 * captures the dynamic amplification/dampening effect of the blast pulse
 * on the structure. For impulsive loads (td << T), Path 2 governs.
 * For quasi-static loads (td >> T), Path 1 with DLF≈1.0 governs.
 *
 * Reference: UFC 3-340-02 Ch.5 (Dynamic Analysis); Biggs (1964)
 *
 * @param element     - Structural element type
 * @param elementLoad - Per-element load data
 * @param blast       - Complete blast threat data (DesignInput.blast)
 * @param thickness_m - Current design thickness (m) — affects natural period
 * @returns Total equivalent dynamic design load w (kPa)
 */
export function calculateDesignLoad(
  element: 'roof' | 'wall' | 'floor',
  elementLoad: DesignElementLoad,
  blast: DesignBlastInput,
  thickness_m?: number,
): number {
  // ── 1. Select peak blast pressure per element type ──
  const peakPressure = getPeakBlastPressure(element, blast);

  // ── 2. Compute element natural period at current thickness ──
  const h = thickness_m ?? elementLoad.thickness;
  const T = estimateNaturalPeriod(
    elementLoad.span, h, elementLoad.material.density,
    elementLoad.supportCondition,
  );

  // ── 3. Load-Mass Factor (KLM) ──
  const KLM = getLoadMassFactor(elementLoad.supportCondition);

  // ── 4. Path 1: Pressure-dominated equivalent load ──
  // Uses Biggs SDOF DLF chart (UFC 3-340-02 Fig. 5-4)
  const dlf = calculateDynamicResponseFactor(
    peakPressure,
    elementLoad.dynamicImpulse,     // element-distributed impulse
    elementLoad.dynamicDuration,    // global positive phase duration
    T,
    elementLoad.supportCondition,
  );
  const w_pressurePath = peakPressure * dlf;

  // ── 5. Path 2: Impulse-dominated equivalent load ──
  // Only meaningful in the impulsive regime (td/T < 0.2) where DLF < 1.0.
  // In the dynamic/quasi-static regime (td/T >= 0.2), the pressure path
  // with DLF >= 1.0 correctly captures the response. Applying the
  // impulse formula there would be double-counting.
  //
  // Formula: P_eq = 2π × I / (T × KLM)
  // (derived from SDOF impulse response: x_max = I/(ω×Me), P_eq = k×x_max)
  // Reference: Biggs (1964), Ch.4; UFC 3-340-02 Ch.5
  const td_T = elementLoad.dynamicDuration / T;
  let w_impulsePath = 0;
  if (td_T < 0.2 && elementLoad.dynamicImpulse > 0) {
    w_impulsePath = (2 * Math.PI * elementLoad.dynamicImpulse) / (T * KLM);
  }

  // ── 6. Governing equivalent blast load ──
  // Mu obtained from dynamic blast response via dual-path DLF (UFC 3-340-02 Ch.5)
  const equivalentBlastLoad = Math.max(w_pressurePath, w_impulsePath);

  // ── 7. Add static component ──
  // Static pressure (overburden/lateral/soilReaction/selfWeight) is NOT
  // multiplied by DLF — it is a sustained dead load, not a blast impulse.
  return equivalentBlastLoad + elementLoad.staticPressure;
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
    // Blast component (with DLF from SDOF dynamic response) + adapter's
    // staticPressure (overburden/lateral/soilReaction/selfWeight per element).
    // The thickness is passed so the natural period T is recalculated
    // at each iteration (T changes as h changes → DLF changes).
    const w_base = calculateDesignLoad(element, elementLoad, blast, currentThickness);

    // Account for additional self-weight from thickness increase
    const thicknessIncrease = Math.max(0, currentThickness - elementLoad.thickness);
    const additionalSelfWeight = (elementLoad.material.density * thicknessIncrease * GRAVITY) / 1000; // kPa
    const w = w_base + additionalSelfWeight;

    // ── 2. Moment & Shear demand ────────────────────────────────
    // Mu obtained from dynamic blast response (UFC 3-340-02 Ch.5).
    // The DLF applied in calculateDesignLoad() accounts for the
    // blast's duration, impulse, and the element's natural period.
    // This is NOT a static Mu = wL²/8 from peak pressure alone.
    const Mu = calculateDesignMoment(w, elementLoad.span, supportCondition);
    const Vu = calculateDesignShear(w, elementLoad.span);

    // ── 3. Effective depth (assume T16 for initial As estimate) ─
    const d_assumed = calculateEffectiveDepth(currentThickness, criteria.concreteCover, 16);

    // ── 4. Required As (STATIC fy — DIF applied only to capacity) ─
    // Input moment Mu is the DYNAMIC blast moment (via DLF).
    // As is computed with static fy; DIF is applied only at
    // capacity check (step 7) per UFC 3-340-02 Sec 5.14.3.
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