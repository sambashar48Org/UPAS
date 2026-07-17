/**
 * UPAS — Lateral Earth Pressure Calculations
 * Phase 0: Design Model Foundation
 *
 * Independent module for calculating lateral earth pressure on
 * buried structure walls. Extracted from the adapter so it can be
 * reused and extended in future sprints (active, passive, at-rest,
 * drained/undrained, water table effects).
 *
 * Current scope: Rankine active and at-rest coefficients only.
 * Passive pressure, Coulomb theory, and water table corrections
 * are deferred to Sprint 6.
 *
 * Reference Standards:
 * - UFC 3-340-02, Appendix B (Soil Mechanics for Protective Structures)
 * - TM 5-855-1, Chapter 4 (Earth Pressure on Buried Structures)
 * - Das, B.M. "Principles of Geotechnical Engineering" — Rankine Theory
 */

// ─── Lateral Earth Pressure Coefficients ─────────────────────────────

/**
 * Calculate Rankine active earth pressure coefficient Ka.
 * Used when the wall can move away from the soil (typical for
 * buried blast-resistant structures under dynamic loading).
 *
 * Formula: Ka = (1 - sin(φ)) / (1 + sin(φ))
 *
 * For purely cohesive soils (φ = 0): Ka = 1.0
 * For cohesionless backfill: Ka < 1.0 (reduces with increasing φ)
 *
 * @param frictionAngle - Internal friction angle φ (degrees)
 * @returns Ka (dimensionless)
 */
export function calculateActiveEarthPressureCoeff(frictionAngle: number): number {
  if (frictionAngle <= 0) {
    // Purely cohesive soil — full pressure transfer
    return 1.0;
  }

  const phiRad = (frictionAngle * Math.PI) / 180;
  const sinPhi = Math.sin(phiRad);

  return (1 - sinPhi) / (1 + sinPhi);
}

/**
 * Calculate at-rest earth pressure coefficient Ko.
 * Used when the wall cannot move laterally (at-rest condition).
 * More conservative than Ka for walls with significant restraint.
 *
 * Formula (Jaky's equation): Ko = 1 - sin(φ)
 *
 * For purely cohesive soils (φ = 0): Ko = 1.0
 * For dense sand (φ = 40°): Ko = 0.357
 *
 * @param frictionAngle - Internal friction angle φ (degrees)
 * @returns Ko (dimensionless)
 */
export function calculateAtRestEarthPressureCoeff(frictionAngle: number): number {
  if (frictionAngle <= 0) {
    return 1.0;
  }

  const phiRad = (frictionAngle * Math.PI) / 180;
  return 1 - Math.sin(phiRad);
}

// ─── Lateral Pressure Calculations ───────────────────────────────────

/**
 * Calculate the lateral earth pressure at a given depth.
 * Uses Rankine active earth pressure theory for cohesionless soils,
 * with a simplified cohesion contribution for cohesive soils.
 *
 * For cohesionless soils (c = 0):
 *   σ_h = Ka × σ_v = Ka × γ × z
 *
 * For cohesive soils (c > 0, simplified):
 *   σ_h = Ka × σ_v - 2c × √Ka
 *   (clamped to ≥ 0 to avoid negative pressure — tension cracks)
 *
 * Note: This is the TOTAL lateral pressure. For effective stress
 * analysis with water table, use effectiveStress instead of
 * totalStress and add hydrostatic pressure separately (deferred
 * to Sprint 6).
 *
 * @param verticalStress - Total vertical stress at the point of interest (kPa)
 * @param frictionAngle - Internal friction angle φ (degrees)
 * @param cohesion - Cohesion c (kPa). Use 0 for cohesionless soils.
 * @param pressureType - 'active' (wall can move) or 'at_rest' (wall restrained)
 * @returns Lateral earth pressure (kPa)
 */
export function calculateLateralEarthPressure(
  verticalStress: number,
  frictionAngle: number,
  cohesion: number,
  pressureType: 'active' | 'at_rest',
): number {
  if (verticalStress <= 0) {
    return 0;
  }

  const K = pressureType === 'active'
    ? calculateActiveEarthPressureCoeff(frictionAngle)
    : calculateAtRestEarthPressureCoeff(frictionAngle);

  // Rankine formula: σ_h = K × σ_v - 2c × √K
  const effectiveLateralPressure = K * verticalStress;

  if (cohesion > 0 && K > 0) {
    // Cohesion reduces lateral pressure
    const cohesionReduction = 2 * cohesion * Math.sqrt(K);
    return Math.max(effectiveLateralPressure - cohesionReduction, 0);
  }

  return effectiveLateralPressure;
}

/**
 * Calculate the average lateral pressure on a wall element.
 * Computes pressure at the top and bottom of the wall, then
 * returns the average (for uniform pressure approximation in design).
 *
 * Wall top depth = burial depth (structure top below ground).
 * Wall bottom depth = burial depth + structure height.
 * Mid-depth pressure is the average for a triangular distribution.
 *
 * @param burialDepth - Depth of structure top below ground (m)
 * @param wallHeight - Height of the wall (m)
 * @param soilUnitWeight - Average soil unit weight γ (kN/m³)
 * @param frictionAngle - Internal friction angle φ (degrees)
 * @param cohesion - Cohesion c (kPa)
 * @param pressureType - 'active' or 'at_rest'
 * @returns Average lateral pressure on the wall (kPa)
 */
export function calculateAverageWallLateralPressure(
  burialDepth: number,
  wallHeight: number,
  soilUnitWeight: number,
  frictionAngle: number,
  cohesion: number,
  pressureType: 'active' | 'at_rest',
): number {
  // Vertical stress at wall top
  const sigmaVTop = soilUnitWeight * burialDepth;

  // Vertical stress at wall bottom
  const sigmaVBottom = soilUnitWeight * (burialDepth + wallHeight);

  // Lateral pressure at both points
  const lateralTop = calculateLateralEarthPressure(sigmaVTop, frictionAngle, cohesion, pressureType);
  const lateralBottom = calculateLateralEarthPressure(sigmaVBottom, frictionAngle, cohesion, pressureType);

  // Average of triangular distribution = (top + bottom) / 2
  // For uniform design approximation
  return (lateralTop + lateralBottom) / 2;
}