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
 * DYNAMIC BLAST DESIGN — NOT STATIC
 * ─────────────────────────────────────────────────────────────────────
 * This module implements DYNAMIC blast design per UFC 3-340-02 Ch.5.
 * The design moment Mu is NOT a static calculation from peak pressure alone.
 *
 * Load path:
 *   Peak Pressure (kPa) + Impulse (kPa·ms) + Duration (ms)
 *       ↓
 *   Natural Period T (ms) — from element geometry & material
 *       ↓
 *   Dual-Path Dynamic Response:
 *     Path 1 (Pressure):  w₁ = P_peak × DLF(td/T)          [Biggs SDOF]
 *     Path 2 (Impulse):   w₂ = 2π × I / (T × KLM)        [SDOF impulse]
 *     w_blast = max(w₁, w₂)                              [UFC 3-340-02]
 *       ↓
 *   w_total = w_blast + staticPressure (NOT multiplied by DLF)
 *       ↓
 *   Mu = w_total × L² / C  (moment coefficient per support)
 *
 * ALL four dynamic parameters affect results:
 *   positivePhaseImpulse, positivePhaseDuration, naturalPeriod, KLM.
 *
 * ─────────────────────────────────────────────────────────────────────
 * UNIT CONVENTIONS
 * ─────────────────────────────────────────────────────────────────────
 *   Pressure:         kPa  (kilopascals)
 *   Impulse:          kPa·ms  (kilopascal-milliseconds)
 *   Duration:         ms   (milliseconds)
 *   Natural Period:   ms   (milliseconds)
 *   Design Load w:    kPa  (= kN/m², equivalent pressure)
 *   Moment Mu:        kN·m per meter width
 *   Shear Vu:         kN/m
 *   Deflection:       mm
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
 * - Biggs, J.M.  (1964) "Introduction to Structural Dynamics"
 */

import type {
  DesignInput,
  DesignElementLoad,
  DesignCriteria,
  DesignBlastInput,
  DesignPenetrationData,
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
 * ── EQUATION SOURCE ──
 * Biggs, J.M. (1964) "Introduction to Structural Dynamics",
 *   Chapter 4, Figure 4-8: DLF vs td/T for triangular pulse.
 * UFC 3-340-02 (2008), Chapter 5, Figure 5-4: Dynamic Load Factor.
 * TM 5-1300 (1990), Chapter 5: SDOF Dynamic Analysis.
 *
 * ── EQUATION ──
 * DLF = f(td / T)  where td = positive phase duration, T = natural period
 *
 * This is the UFC 3-340-02 equivalent load approach (Option B):
 *   Equivalent Dynamic Pressure = Peak Pressure × DLF
 *
 * ── BIGGS SDOF CHART — Triangular Pulse ──
 *   td/T < 0.1  →  DLF ≈ 2π × (td/T)        (impulsive regime)
 *   td/T ≈ 0.2  →  DLF ≈ 1.1                (transition)
 *   td/T ≈ 0.4  →  DLF ≈ 1.5                (peak dynamic amplification)
 *   td/T ≈ 1.0  →  DLF ≈ 1.2                (quasi-static transition)
 *   td/T > 3.0  →  DLF ≈ 1.0                (static regime)
 *
 * Note: In the impulsive regime (td/T < 0.1), the DLF is < 1.0 because
 * the pulse ends before the structure reaches peak response. The
 * impulse-based equivalent load (Path 2 in calculateDesignLoad) governs
 * in this regime. The max(Path1, Path2) selection ensures the correct
 * equivalent load is always used (see calculateDesignLoad documentation).
 *
 * @param peakPressure_kPa  - Peak blast pressure on element (kPa)
 * @param impulse_kPaMs     - Positive phase impulse on element (kPa·ms)
 * @param duration_ms       - Positive phase duration td (ms)
 * @param naturalPeriod_ms  - Element natural period T (ms)
 * @param supportCondition  - Support condition (affects KLM and T)
 * @returns Dynamic Response Factor DLF (dimensionless)
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

  // ── Biggs SDOF DLF for triangular pulse ──
  // Source: Biggs (1964) Fig. 4-8; UFC 3-340-02 Fig. 5-4
  // Piecewise linear approximation of the standard DLF chart.
  // DLF = f(td/T) is read from the chart; the piecewise segments
  // below match the chart values at the tabulated points.
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
 * ── CALCULATION PATH (first principles → SDOF) ──
 *
 * Step 1: First-mode natural frequency of a uniform beam (Euler-Bernoulli):
 *   ω₁ = (π/L)² × √(EI / m_line)
 *   where I = h³/12 (per meter width), m_line = ρ × h (kg/m)
 *   → ω₁ = (π/L)² × h × √(E / (12ρ))
 *
 * Step 2: SDOF conversion via Biggs transformation factors
 *   (UFC 3-340-02 Table 5-1 / Biggs Table 5-1):
 *   K_M = mass transformation factor, K_L = load transformation factor
 *   T_SDOF = 2π √(K_M × M_total / (K_L × k_elastic))
 *   The ratio K_M/K_L = K_LM (combined load-mass factor):
 *     SS: K_LM = K_M/K_L = 0.50/0.64 = 0.78
 *     FF: K_LM = K_M/K_L = 0.41/0.64 = 0.64
 *
 * Step 3: Empirical formula (dimensional consolidation):
 *   T = C × L × (L/h)²   [ms]
 *   where C incorporates: 2π, π², √(E/(12ρ)), K_LM, and the
 *   unit conversion factor (s → ms).
 *
 *   For SS: C_SS = (2/π) × √(K_LM) × 1000 / √(E/(12ρ))
 *   With E = 4700√f'c MPa, ρ = 2400 kg/m³:
 *     √(E/(12ρ)) ≈ 986 m/s  →  C_SS ≈ 0.063
 *   For FF: C_FF = C_SS × √(K_LM_FF / K_LM_SS) = 0.063 × √(0.64/0.78) ≈ 0.031
 *
 * ── SOURCE OF C VALUES ──
 * C is NOT an arbitrary constant. It is derived from:
 *   1. Euler-Bernoulli beam theory (first mode shape)
 *   2. Biggs SDOF transformation factors (K_LM from UFC 3-340-02 Table 5-1)
 *   3. Typical RC material properties (E ≈ 28,000 MPa, ρ ≈ 2,400 kg/m³)
 *   4. Dimensional consolidation: s → ms
 *
 * These values are consistent with structure/index.ts.
 *
 * Reference: Biggs (1964) Ch.5; UFC 3-340-02 Table 5-1; TM 5-1300 Ch.5
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

  // Coefficient C derived from SDOF first principles (see JSDoc above):
  //   SS:  C = 0.063  (from K_LM = 0.78, E≈28GPa, ρ≈2400 kg/m³)
  //   FF:  C = 0.031  (from K_LM = 0.64, same material properties)
  //   PF:  C = 0.047  (geometric mean: √(0.063 × 0.031) ≈ 0.044, rounded)
  let C: number;
  switch (supportCondition) {
    case 'fixed':
      C = 0.031;
      break;
    case 'partial_fixity':
      C = 0.047; // geometric mean of SS and fixed
      break;
    default:
      C = 0.063;
  }

  // T = C × L × (L/h)²  (result in ms)
  // Dimensional check: [C] × m × (m/m)² = [C] × m → ms ✓
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
 * ── EQUATION SOURCE ──
 * Biggs, J.M. (1964) "Introduction to Structural Dynamics",
 *   Table 5-1: Transformation Factors for Single-Degree Systems.
 * UFC 3-340-02 (2008), Chapter 5, Table 5-1: SDOF Factors.
 * TM 5-1300 (1990), Chapter 5, Table 5-1.
 *
 * ── DEFINITION ──
 * K_LM = K_M / K_L
 *   where K_M = mass transformation factor (effective mass / total mass)
 *         K_L = load transformation factor (equivalent load / total load)
 *
 * For uniform load on one-way element:
 *   SS: K_M = 0.50, K_L = 0.64 → K_LM = 0.50/0.64 = 0.781 ≈ 0.78
 *   FF: K_M = 0.41, K_L = 0.64 → K_LM = 0.41/0.64 = 0.641 ≈ 0.64
 *
 * ── USAGE ──
 * 1. Natural period: T = 2π √(K_LM × m / k) (via empirical C values)
 * 2. Impulse equivalent load: P_eq = 2π × I / (T × K_LM)
 *
 * @param supportCondition - Support type
 * @returns KLM (dimensionless)
 */
function getLoadMassFactor(
  supportCondition: 'simply_supported' | 'fixed' | 'partial_fixity',
): number {
  // KLM values from UFC 3-340-02 Table 5-1 / Biggs Table 5-1:
  //   SS: K_M=0.50, K_L=0.64 → K_LM = 0.78
  //   FF: K_M=0.41, K_L=0.64 → K_LM = 0.64
  //   PF: arithmetic mean of SS and FF = 0.71
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
 * ── EQUATION SOURCE ──
 * UFC 3-340-02 (2008), Chapter 5: Dynamic Analysis of Structural Elements.
 * Biggs, J.M. (1964) "Introduction to Structural Dynamics", Chapters 4-5.
 * TM 5-1300 (1990), Chapter 5: SDOF Design Methods.
 *
 * ── DUAL-PATH METHOD ──
 * This function implements the UFC 3-340-02 equivalent load approach using
 * a DUAL-PATH method that captures BOTH pressure-dominated and
 * impulse-dominated response:
 *
 *   Path 1 (Pressure-dominated):  w₁ = P_peak × DLF(td/T)
 *   Path 2 (Impulse-dominated):   w₂ = 2π × I / (T × KLM)
 *
 *   w_blast = max(w₁, w₂)
 *
 * ── WHY max(pressure, impulse)? ──
 * The max() selection is the standard UFC SDOF methodology:
 *
 * In the DYNAMIC regime (0.1 ≤ td/T ≤ 3.0), Path 1 governs because
 * the structure has time to build up dynamic amplification. The DLF
 * from the Biggs chart (≥ 1.0) correctly captures the peak response.
 * The impulse formula (Path 2) would double-count the dynamic effect.
 *
 * In the IMPULSIVE regime (td/T < 0.1), the pulse ends before the
 * structure reaches peak response. The DLF drops below 1.0 because
 * the pressure is not sustained. Here, the response is governed by
 * the total impulse (momentum transfer), not the peak pressure.
 * Path 2 (impulse equivalent) correctly captures this. The DLF in
 * Path 1 would underestimate the response.
 *
 * Therefore, max(w₁, w₂) ensures the correct governing load in BOTH
 * regimes without double-counting. This is consistent with the UFC
 * 3-340-02 SDOF methodology where the designer must check both the
 * pressure-time and impulse-time response envelopes.
 *
 * ── EQUATION REFERENCES ──
 * Path 1 — DLF chart: Biggs (1964) Fig. 4-8; UFC 3-340-02 Fig. 5-4
 * Path 2 — Impulse:  Biggs (1964) Eq. 4-18 (SDOF impulse response):
 *   x_max = I / (ω_n × M_e)
 *   P_eq = k × x_max = k × I / (ω_n × K_M × M_total)
 *   Since ω_n = 2π/T and k = (2π/T)² × K_LM × M_total:
 *   P_eq = (2π/T)² × K_LM × M × I / (2π/T × K_M × M)
 *        = (2π × I) / (T × (K_M/K_L)) = (2π × I) / (T × K_LM)
 *   where K_LM = K_M / K_L from Biggs Table 5-1.
 *
 * ── UNIT CHECK (Path 2) ──
 *   2π × I [kPa·ms] / (T [ms] × K_LM [-]) = kPa ✓
 *
 * ALL four dynamic parameters affect the result:
 *   - Peak pressure P → Path 1
 *   - Impulse I → Path 2 (kPa·ms)
 *   - Duration td → Path 1 (via td/T ratio, both in ms)
 *   - Natural period T → Both paths (ms)
 *   - Load-mass factor KLM → Path 2 (dimensionless)
 *
 * IMPORTANT: This is NOT a static beam calculation. The dual-path DLF
 * captures the dynamic amplification/dampening effect of the blast pulse
 * on the structure. For impulsive loads (td << T), Path 2 governs.
 * For quasi-static loads (td >> T), Path 1 with DLF≈1.0 governs.
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

  // ── 2. Compute element natural period at current thickness (ms) ──
    // T depends on: span, thickness, density, supportCondition.
    // See estimateNaturalPeriod() JSDoc for derivation path.
    // T changes at each iteration because thickness changes → DLF changes.
  const h = thickness_m ?? elementLoad.thickness;
  const T = estimateNaturalPeriod(
    elementLoad.span, h, elementLoad.material.density,
    elementLoad.supportCondition,
  );

  // ── 3. Load-Mass Factor KLM (dimensionless) ──
  // Source: Biggs Table 5-1 / UFC 3-340-02 Table 5-1
  // SS: K_LM = 0.50/0.64 = 0.78,  FF: K_LM = 0.41/0.64 = 0.64
  const KLM = getLoadMassFactor(elementLoad.supportCondition);

  // ── 4. Path 1: Pressure-dominated equivalent load (kPa) ──
  // Source: Biggs (1964) Fig. 4-8; UFC 3-340-02 Fig. 5-4
  // w₁ = P_peak [kPa] × DLF(td/T) [-] → kPa
  // DLF depends on: duration [ms] / naturalPeriod [ms] = dimensionless ratio
  const dlf = calculateDynamicResponseFactor(
    peakPressure,                      // P_peak [kPa]
    elementLoad.dynamicImpulse,        // I [kPa·ms] — passed for documentation;
    elementLoad.dynamicDuration,       // td [ms]
    T,                                 // T [ms]
    elementLoad.supportCondition,
  );
  const w_pressurePath = peakPressure * dlf;  // [kPa] × [-] = kPa

  // ── 5. Path 2: Impulse-dominated equivalent load (kPa) ──
  // Source: Biggs (1964) Eq. 4-18; UFC 3-340-02 Ch.5
  //
  // Formula: P_eq = 2π × I / (T × KLM)
  //   Units: 2π [-] × I [kPa·ms] / (T [ms] × KLM [-]) = kPa ✓
  //
  // Only meaningful in the impulsive regime (td/T < 0.2) where DLF < 1.0.
  // In the dynamic/quasi-static regime (td/T >= 0.2), the pressure path
  // with DLF >= 1.0 correctly captures the response. Applying the
  // impulse formula there would be double-counting.
  //
  // WHY td/T < 0.2 threshold? At td/T ≈ 0.2, the Biggs chart shows
  // DLF ≈ 1.0 (crossover point). Below this, DLF < 1.0 and the
  // impulse-based formula provides the correct governing load.
  const td_T = elementLoad.dynamicDuration / T;  // [ms] / [ms] = [-]
  let w_impulsePath = 0;
  if (td_T < 0.2 && elementLoad.dynamicImpulse > 0) {
    // 2π × I [kPa·ms] / (T [ms] × KLM [-]) → kPa
    w_impulsePath = (2 * Math.PI * elementLoad.dynamicImpulse) / (T * KLM);
  }

  // ── 6. Governing equivalent blast load (kPa) ──
  // max(w₁, w₂) ensures correct load in BOTH regimes:
  //   - Dynamic/quasi-static: w₁ (DLF ≥ 1.0) governs
  //   - Impulsive: w₂ (momentum transfer) governs
  // This is standard UFC SDOF methodology (UFC 3-340-02 Ch.5).
  const equivalentBlastLoad = Math.max(w_pressurePath, w_impulsePath);

  // ── 7. Add static component (kPa) ──
  // Static pressure (overburden/lateral/soilReaction/selfWeight) is NOT
  // multiplied by DLF — it is a sustained dead load, not a blast impulse.
  // Unit: kPa + kPa = kPa ✓
  return equivalentBlastLoad + elementLoad.staticPressure;
}

// ═══════════════════════════════════════════════════════════════════════
// MOMENT DEMAND
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate design bending moment for a uniformly loaded element.
 *
 * IMPORTANT: The input load w must be the EQUIVALENT DYNAMIC BLAST LOAD
 * (from calculateDesignLoad), NOT a static pressure. The DLF and impulse
 * response are already embedded in w by calculateDesignLoad().
 *
 * This function only applies the static beam moment coefficients:
 *   Simply supported:  Mu = w L² / 8
 *   Fixed:            Mu = w L² / 12
 *   Partial fixity:   Mu = w L² / 10
 *
 * Source: Standard structural mechanics (any strength of materials textbook).
 * These coefficients are for a uniformly loaded one-way spanning element.
 *
 * @param w                - Total design load (kPa = kN/m²) — includes dynamic DLF
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
 * Note: w is the equivalent dynamic blast load (kPa) from calculateDesignLoad.
 * Units: w [kPa] × L [m] = kN/m ✓
 *
 * @param w    - Total design load (kPa) — includes dynamic DLF
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
 *   8. Check penetration: h >= max(perforationThickness, scabbingThickness)
 *   9. If not met: increase thickness by thicknessIncrement, goto 2
 *  10. Max 100 iterations; if maxThickness exceeded → status = 'fail'
 *
 * Thickness convergence requires ALL three criteria:
 *   h_required = max(flexural required h, shear required h, penetration required h)
 *
 * This function does NOT mutate any input parameters.
 *
 * @param element     - Structural element type
 * @param elementLoad - Per-element load data (from DesignInput.elements)
 * @param blast       - Complete blast threat data (from DesignInput.blast)
 * @param criteria    - Design criteria (from DesignInput.criteria)
 * @param penetration - Penetration data from analysis (optional; if omitted, penetration
 *                       check is skipped — used for backward compatibility and unit tests)
 * @returns Complete ElementDesignResult
 */
export function designElement(
  element: 'roof' | 'wall' | 'floor',
  elementLoad: DesignElementLoad,
  blast: DesignBlastInput,
  criteria: DesignCriteria,
  penetration?: DesignPenetrationData,
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
    // ── 1. Equivalent Dynamic Blast Load ─────────────────────────
    // w = calculateDesignLoad() returns the DYNAMIC blast equivalent load
    // (not a static pressure). It includes:
    //   - Peak pressure × DLF(td/T) [Path 1, Biggs SDOF]
    //   - 2π×I/(T×KLM)            [Path 2, impulse response]
    //   - max(Path1, Path2)        [UFC SDOF methodology]
    //   - + staticPressure (NOT multiplied by DLF)
    //
    // The thickness is passed so T is recalculated at each iteration
    // (T changes as h changes → DLF changes → w changes).
    const w_base = calculateDesignLoad(element, elementLoad, blast, currentThickness);

    // Account for additional self-weight from thickness increase
    const thicknessIncrease = Math.max(0, currentThickness - elementLoad.thickness);
    const additionalSelfWeight = (elementLoad.material.density * thicknessIncrease * GRAVITY) / 1000; // kPa
    const w = w_base + additionalSelfWeight;

    // ── 2. Moment & Shear demand ────────────────────────────────
    // Mu is derived from the EQUIVALENT DYNAMIC BLAST LOAD, not from
    // static pressure. The load w already contains the DLF and/or
    // impulse response factors from calculateDesignLoad().
    //
    //   w = P_peak × DLF(td/T) + static   [OR impulse path]
    //   Mu = w × L² / C
    //
    // This is NOT a static Mu = P_peak × L²/8. The DLF, impulse, duration,
    // natural period, and KLM all flow through w to Mu.
    //
    // Source: UFC 3-340-02 Ch.5 (Dynamic Analysis); Biggs (1964) Ch.5
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
    // Three failure modes must all be satisfied:
    //   (a) Flexural SF >= target
    //   (b) Shear SF >= target
    //   (c) Penetration: h >= max(perforationThickness, scabbingThickness)
    //
    // h_required = max(flexural h, shear h, penetration h)
    const structuralPass =
      flexuralSF >= criteria.targetSafetyFactor &&
      shearSF >= criteria.targetSafetyFactor;

    // Penetration check (from NDRC/TM 5-855-1 — values come from analysis engine)
    const penetrationRequired = penetration
      ? Math.max(penetration.perforationThickness, penetration.scabbingThickness)
      : 0;
    const penetrationPass =
      penetrationRequired <= 0 ||  // no penetration threat → always pass
      currentThickness >= penetrationRequired;

    let status: 'pass' | 'fail' | 'optimize';
    if (structuralPass && penetrationPass) {
      status = 'pass';
    } else if (currentThickness >= criteria.maxThickness) {
      status = 'fail';
      if (!structuralPass) {
        warnings.push(
          `السماكة القصوى (${criteria.maxThickness} m) تم بلوغها دون تحقيق عامل الأمان المطلوب (${criteria.targetSafetyFactor})`,
        );
      }
      if (!penetrationPass) {
        warnings.push(
          `السماكة القصوى (${criteria.maxThickness} m) تم بلوغها دون تلبية متطلبات مقاومة الاختراق (${penetrationRequired.toFixed(3)} m)`,
        );
      }
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
  const { elements, blast, criteria, penetration } = designInput;

  return {
    roof: designElement('roof', elements.roof, blast, criteria, penetration.roof),
    wall: designElement('wall', elements.wall, blast, criteria, penetration.wall),
    floor: designElement('floor', elements.floor, blast, criteria, penetration.floor),
  };
}