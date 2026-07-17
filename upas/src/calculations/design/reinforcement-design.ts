/**
 * UPAS — Reinforcement Design Module
 * Phase 4B: Structural Design Core
 *
 * Calculates flexural reinforcement for RC elements under blast loading.
 * Pure calculation functions — no iteration, no state mutation.
 *
 * Input: Mu, dimensions, material properties (from DesignInput)
 * Output: As, bar selection, spacing, capacity
 *
 * ARCHITECTURE RULE:
 *   This module NEVER imports from calculations/types.ts, results/,
 *   structure/, soil/, or threat/. It reads ONLY design/types and
 *   calculations/constants.
 *
 * Reference Standards:
 * - ACI 318-19 (Building Code Requirements for Structural Concrete)
 * - UFC 3-340-02 (Structures to Resist the Effects of Accidental Explosions)
 */

import {
  REBAR_DATABASE,
  MIN_BAR_SPACING_MM,
  MAX_BAR_SPACING_BLAST_MM,
} from '../constants';

import type { RebarSelection } from './types';

// ═══════════════════════════════════════════════════════════════════════
// EFFECTIVE DEPTH
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate the effective depth d of a reinforced concrete section.
 * d = h - cover - db/2
 *
 * @param thickness_m - Total thickness h (m)
 * @param cover_m - Concrete cover (m)
 * @param barDiameter_mm - Assumed bar diameter (mm)
 * @returns Effective depth d (mm)
 */
export function calculateEffectiveDepth(
  thickness_m: number,
  cover_m: number,
  barDiameter_mm: number,
): number {
  return (thickness_m - cover_m) * 1000 - barDiameter_mm / 2;
}

// ═══════════════════════════════════════════════════════════════════════
// REQUIRED STEEL AREA
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate required flexural reinforcement area via quadratic solution.
 *
 * From equilibrium:  Mu = φ × As × fy × (d − a/2)
 *   where a = As × fy / (0.85 × f'c × b)
 *
 * Substituting and rearranging into Ax² + Bx + C = 0:
 *   A = fy² / (1.7 × f'c × b)
 *   B = −fy × d
 *   C = Mu_Nmm / φ
 *
 * As = (−B − √(B² − 4AC)) / (2A)   [smaller root = tension-controlled]
 *
 * If the discriminant is negative the section is too small;
 * the function returns Infinity to trigger a thickness increase.
 *
 * @param Mu_kNm  - Design moment (kN·m per meter width)
 * @param d_mm    - Effective depth (mm)
 * @param fpc_MPa - Concrete compressive strength f'c (MPa)
 * @param fy_MPa  - Steel yield strength fy (MPa)
 * @param phi     - Strength reduction factor φ (from ACI_DESIGN_FACTORS)
 * @returns Required steel area As (mm²/m)
 */
export function calculateRequiredAs(
  Mu_kNm: number,
  d_mm: number,
  fpc_MPa: number,
  fy_MPa: number,
  phi: number,
): number {
  if (Mu_kNm <= 0 || d_mm <= 0 || fy_MPa <= 0 || phi <= 0) return 0;

  const b = 1000; // mm  (per-meter strip)
  const Mu_Nmm = Mu_kNm * 1e6; // kN·m → N·mm
  const Mn_req = Mu_Nmm / phi;

  // Quadratic: A·As² + B·As + C = 0
  const j = 1.7 * fpc_MPa * b;
  const A = (fy_MPa * fy_MPa) / j;
  const B = -fy_MPa * d_mm;
  const C = Mn_req;

  const discriminant = B * B - 4 * A * C;

  if (discriminant < 0) {
    // Section too small — signal that thickness must increase
    return Infinity;
  }

  const As = (-B - Math.sqrt(discriminant)) / (2 * A);
  return Math.max(0, As);
}

// ═══════════════════════════════════════════════════════════════════════
// FLEXURAL CAPACITY
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate the nominal flexural capacity φMn.
 *
 * a = As × fy / (0.85 × f'c × b)
 * Mn = As × fy × (d − a/2)
 * φMn = φ × Mn
 *
 * @param As_mm2  - Provided steel area (mm²/m)
 * @param d_mm    - Effective depth (mm)
 * @param fpc_MPa - Concrete compressive strength (MPa)
 * @param fy_MPa  - Steel yield strength (MPa), may include DIF
 * @param phi     - Strength reduction factor φ
 * @returns Flexural capacity φMn (kN·m/m)
 */
export function calculateFlexuralCapacity(
  As_mm2: number,
  d_mm: number,
  fpc_MPa: number,
  fy_MPa: number,
  phi: number,
): number {
  if (As_mm2 <= 0 || d_mm <= 0 || fpc_MPa <= 0 || fy_MPa <= 0 || phi <= 0) return 0;

  const b = 1000; // mm
  const a = (As_mm2 * fy_MPa) / (0.85 * fpc_MPa * b); // mm
  const leverArm = d_mm - a / 2;

  if (leverArm <= 0) return 0;

  const Mn_Nmm = As_mm2 * fy_MPa * leverArm; // N·mm
  return (phi * Mn_Nmm) / 1e6; // → kN·m
}

// ═══════════════════════════════════════════════════════════════════════
// SHEAR CAPACITY
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate shear capacity φVc (ACI 318-19 simplified).
 * Vc = 0.17 × λ × √(f'c) × b × d
 * φVc = φ × Vc
 *
 * @param fpc_MPa  - Concrete compressive strength (MPa), may include DIF
 * @param d_mm     - Effective depth (mm)
 * @param phi      - Shear strength reduction factor (0.75)
 * @param b_mm     - Section width (mm), default 1000 (per-meter strip)
 * @returns Shear capacity φVc (kN/m)
 */
export function calculateShearCapacity(
  fpc_MPa: number,
  d_mm: number,
  phi: number,
  b_mm: number = 1000,
): number {
  if (fpc_MPa <= 0 || d_mm <= 0 || phi <= 0) return 0;

  const lambda = 1.0; // normal-weight concrete
  const Vc = 0.17 * lambda * Math.sqrt(fpc_MPa) * b_mm * d_mm; // N
  return (phi * Vc) / 1000; // → kN
}

// ═══════════════════════════════════════════════════════════════════════
// REINFORCEMENT RATIO
// ═══════════════════════════════════════════════════════════════════════

/**
 * Reinforcement ratio ρ = As / (b × d).
 *
 * @param As - Steel area (mm²)
 * @param b  - Section width (mm)
 * @param d  - Effective depth (mm)
 * @returns ρ (dimensionless)
 */
export function calculateReinforcementRatio(
  As: number,
  b: number,
  d: number,
): number {
  if (b <= 0 || d <= 0) return 0;
  return As / (b * d);
}

// ═══════════════════════════════════════════════════════════════════════
// BAR SELECTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Select reinforcement bars from REBAR_DATABASE.
 *
 * Algorithm:
 * 1. Try each bar size from smallest to largest
 * 2. For each bar, compute spacing needed: s = (area × 1000) / requiredAs
 * 3. Clamp spacing to [MIN_BAR_SPACING_MM, maxSpacing_mm]
 * 4. First bar whose clamped spacing meets requiredAs is selected
 *
 * @param requiredAs     - Required steel area (mm²/m)
 * @param maxSpacing_mm  - Maximum allowed spacing (mm)
 * @returns RebarSelection
 */
export function selectReinforcement(
  requiredAs: number,
  maxSpacing_mm: number = MAX_BAR_SPACING_BLAST_MM,
): RebarSelection {
  if (requiredAs <= 0 || !isFinite(requiredAs)) {
    const minBar = REBAR_DATABASE[0]; // T10
    return {
      barDiameter: minBar.diameter,
      barArea: minBar.area,
      spacing: maxSpacing_mm,
      asProvided: (minBar.area * 1000) / maxSpacing_mm,
      numberOfBars: Math.ceil(1000 / maxSpacing_mm) + 1,
    };
  }

  for (const bar of REBAR_DATABASE) {
    const requiredSpacing = (bar.area * 1000) / requiredAs;
    const clampedSpacing = Math.max(
      MIN_BAR_SPACING_MM,
      Math.min(requiredSpacing, maxSpacing_mm),
    );
    const asProvided = (bar.area * 1000) / clampedSpacing;

    if (asProvided >= requiredAs) {
      return {
        barDiameter: bar.diameter,
        barArea: bar.area,
        spacing: clampedSpacing,
        asProvided,
        numberOfBars: Math.ceil(1000 / clampedSpacing) + 1,
      };
    }
  }

  // Largest bar at minimum spacing (last resort)
  const largest = REBAR_DATABASE[REBAR_DATABASE.length - 1];
  const asProvided = (largest.area * 1000) / MIN_BAR_SPACING_MM;
  return {
    barDiameter: largest.diameter,
    barArea: largest.area,
    spacing: MIN_BAR_SPACING_MM,
    asProvided,
    numberOfBars: Math.ceil(1000 / MIN_BAR_SPACING_MM) + 1,
  };
}

/**
 * Select distribution (secondary) reinforcement.
 * Minimum 25 % of main As, at least T10 @ 200 mm.
 *
 * @param mainRebar - Main reinforcement selection
 * @returns Distribution reinforcement selection
 */
export function selectDistributionReinforcement(
  mainRebar: RebarSelection,
): RebarSelection {
  const distAs = Math.max(
    mainRebar.asProvided * 0.25,
    REBAR_DATABASE[0].area, // T10 area
  );
  return selectReinforcement(distAs, MAX_BAR_SPACING_BLAST_MM);
}