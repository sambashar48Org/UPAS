/**
 * UPAS — Threat & Blast Calculation Engine
 *
 * Implements Kingery-Bulmash (TM 5-1300 / UFC 3-340-02) blast parameter
 * computation: peak incident pressure, reflected pressure, dynamic pressure,
 * impulse, duration, shock front velocity, and arrival time.
 *
 * All polynomials follow the standard KB form:
 *   Log10(value) = A + B·Y + C·Y² + D·Y³ + E·Y⁴ + F·Y⁵
 *   where Y = Log10(Z), Z = R / W^(1/3)
 */

import type { BlastParameters, ExplosiveInput, ThreatInput, ProjectInput } from '../types';
import {
  KB_INCIDENT_PRESSURE, KB_IMPULSE, KB_DURATION,
  normalReflectionCoefficient,
  CHARGE_SHAPE_FACTORS,
  cylindricalShapeFactor,
  SPEED_OF_SOUND_AIR, AIR_DENSITY, AIR_GAMMA,
  ATMOSPHERIC_PRESSURE_KPA,
} from '../constants';

import { calculateDistanceToStructure } from '../geometry';

// ─── Internal helpers ──────────────────────────────────────────────

/** Single Kingery-Bulmash coefficient range */
interface KBRange {
  zMin: number;
  zMax: number;
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
}

/** Object holding one or more KB ranges keyed by name */
interface KBCoefficients {
  [key: string]: KBRange;
}

/**
 * Evaluates a Kingery-Bulmash 5th-order polynomial for a given scaled distance.
 *
 * @param coeffs  - KB coefficient object with named ranges
 * @param Z       - Scaled distance R / W^(1/3)  (m/kg^(1/3))
 * @returns The raw 10^(polynomial) result (no mass scaling applied)
 */
function evaluateKBPolynomial(coeffs: KBCoefficients, Z: number): number {
  const logZ = Math.log10(Z);
  const logZ2 = logZ * logZ;
  const logZ3 = logZ2 * logZ;
  const logZ4 = logZ3 * logZ;
  const logZ5 = logZ4 * logZ;

  // Select appropriate range (clamp to nearest if out of bounds)
  const rangeNames = Object.keys(coeffs);
  let range: KBRange = coeffs[rangeNames[0]];

  for (const name of rangeNames) {
    const r = coeffs[name];
    if (Z >= r.zMin && Z <= r.zMax) {
      range = r;
      break;
    }
    // Clamp: if Z is below all ranges, use the lowest range
    if (Z < r.zMin && r.zMin <= (range?.zMin ?? Infinity)) {
      range = r;
    }
    // Clamp: if Z is above all ranges, use the highest range
    if (Z > r.zMax && r.zMax >= (range?.zMax ?? -Infinity)) {
      range = r;
    }
  }

  const result =
    range.A +
    range.B * logZ +
    range.C * logZ2 +
    range.D * logZ3 +
    range.E * logZ4 +
    range.F * logZ5;

  return Math.pow(10, result);
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTED FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculates the TNT equivalent mass and charge shape correction factor.
 *
 * @param explosive - Explosive input with charge mass, TNT factor, and shape
 * @returns TNT equivalent mass (kg) and dimensionless shape factor
 */
export function calculateTNTEquivalent(
  explosive: ExplosiveInput,
): { tntMass: number; shapeFactor: number } {
  const tntMass = explosive.chargeMass * explosive.tntEquivalentFactor;
  const shapeFactor = calculateChargeShapeFactor(explosive);
  return { tntMass, shapeFactor };
}

/**
 * Main blast parameter computation.
 *
 * Follows TM 5-1300 / UFC 3-340-02 methodology:
 *   1. TNT equivalence
 *   2. Scaled distance
 *   3. Kingery-Bulmash pressure, impulse, duration
 *   4. Reflected & dynamic pressure (Rankine-Hugoniot)
 *   5. Shock front velocity & arrival time
 *   6. Ground reflection (hemispherical correction for surface bursts)
 *
 * @param input - Full project input (geometry, threat, settings)
 * @returns Complete BlastParameters object
 */
export function calculateBlastParameters(input: ProjectInput): BlastParameters {
  // a) TNT equivalent
  const { tntMass, shapeFactor } = calculateTNTEquivalent(input.threat.explosive);

  // b) Distance from geometry module
  const distResult = calculateDistanceToStructure(input);
  const distance = distResult.distanceToSurface;

  // c) Scaled distance
  const scaledDistance = calculateScaledDistance(distance, tntMass);

  // Guard: invalid scaled distance → return zeroed parameters
  if (scaledDistance <= 0) {
    return zeroBlastParameters(tntMass, scaledDistance, distance, shapeFactor, input);
  }

  // d) Peak incident (side-on) pressure via Kingery-Bulmash
  const peakIncidentPressure = kingeryBulmashPressure(scaledDistance);

  // e) Reflected pressure
  const Cr = normalReflectionCoefficient(peakIncidentPressure);
  const peakReflectedPressure = peakIncidentPressure * Cr;

  // g) Dynamic pressure (Rankine-Hugoniot)
  const peakDynamicPressure = calculateDynamicPressure(peakIncidentPressure);

  // h) Positive phase impulse
  const positivePhaseImpulse = kingeryBulmashImpulse(scaledDistance, tntMass);

  // i) Positive phase duration
  const positivePhaseDuration = kingeryBulmashDuration(scaledDistance, tntMass);

  // j) Shock front velocity
  let shockFrontVelocity: number;
  if (peakIncidentPressure > ATMOSPHERIC_PRESSURE_KPA) {
    shockFrontVelocity =
      SPEED_OF_SOUND_AIR *
      Math.sqrt(1 + (6 * (peakIncidentPressure - ATMOSPHERIC_PRESSURE_KPA)) / (7 * ATMOSPHERIC_PRESSURE_KPA));
  } else {
    // Sub-atmospheric incident pressure — wave has decayed to acoustic
    shockFrontVelocity = SPEED_OF_SOUND_AIR;
  }

  // k) Arrival time
  const arrivalTime = shockFrontVelocity > 0 ? (distance / shockFrontVelocity) * 1000 : 0; // convert s → ms

  // l) Ground reflection
  const detonationType = input.threat.detonationType;
  let groundReflection: BlastParameters['groundReflection'];
  let groundReflectedPressure: BlastParameters['groundReflectedPressure'];

  if (detonationType === 'buried') {
    groundReflection = 'none';
    groundReflectedPressure = null;
  } else {
    // Surface, aerial, and internal bursts → hemispherical ground reflection
    groundReflection = 'regular';
    groundReflectedPressure = peakIncidentPressure * 2.0;
  }

  return {
    tntEquivalentMass: tntMass,
    scaledDistance,
    distance: Number(distance),
    peakIncidentPressure,
    peakReflectedPressure,
    reflectionCoefficient: Cr,
    peakDynamicPressure,
    positivePhaseDuration,
    positivePhaseImpulse,
    shockFrontVelocity,
    arrivalTime,
    shapeCorrectionFactor: shapeFactor,
    groundReflection,
    groundReflectedPressure,
  };
}

/**
 * Kingery-Bulmash polynomial for peak incident (side-on) pressure.
 *
 * Returns Pso in kPa. Uses four coefficient ranges with clamping
 * for Z values outside the standard TM 5-1300 domain.
 *
 * @param Z - Scaled distance (m/kg^(1/3))
 * @returns Peak incident pressure Pso (kPa)
 */
export function kingeryBulmashPressure(Z: number): number {
  if (Z <= 0) return 0;
  return evaluateKBPolynomial(
    KB_INCIDENT_PRESSURE as unknown as KBCoefficients,
    Z,
  );
}

/**
 * Kingery-Bulmash polynomial for positive phase impulse.
 *
 * The KB coefficients give impulse for W = 1 kg. The result is scaled
 * by W^(1/3) for the actual charge mass.
 *
 * @param Z       - Scaled distance (m/kg^(1/3))
 * @param tntMass - TNT equivalent mass (kg)
 * @returns Positive phase impulse Is (kPa·ms)
 */
export function kingeryBulmashImpulse(Z: number, tntMass: number): number {
  if (Z <= 0 || tntMass <= 0) return 0;
  const baseImpulse = evaluateKBPolynomial(
    KB_IMPULSE as unknown as KBCoefficients,
    Z,
  );
  const cubeRootW = Math.cbrt(tntMass);
  return cubeRootW * baseImpulse;
}

/**
 * Kingery-Bulmash polynomial for positive phase duration.
 *
 * The KB coefficients give duration for W = 1 kg. The result is scaled
 * by W^(1/3) for the actual charge mass.
 *
 * @param Z       - Scaled distance (m/kg^(1/3))
 * @param tntMass - TNT equivalent mass (kg)
 * @returns Positive phase duration td (ms)
 */
export function kingeryBulmashDuration(Z: number, tntMass: number): number {
  if (Z <= 0 || tntMass <= 0) return 0;
  const baseDuration = evaluateKBPolynomial(
    KB_DURATION as unknown as KBCoefficients,
    Z,
  );
  const cubeRootW = Math.cbrt(tntMass);
  return cubeRootW * baseDuration;
}

/**
 * Returns the charge shape correction factor based on charge geometry.
 *
 * - Spherical and cuboid shapes use lookup values from CHARGE_SHAPE_FACTORS.
 * - Cylindrical shapes use the L/D-dependent interpolation function.
 *
 * @param explosive - Explosive input describing charge shape and dimensions
 * @returns Dimensionless shape correction factor (≥ 1.0)
 */
export function calculateChargeShapeFactor(explosive: ExplosiveInput): number {
  if (explosive.chargeShape === 'cylindrical') {
    const lengthToDiameter =
      explosive.chargeLength && explosive.chargeDiameter && explosive.chargeDiameter > 0
        ? explosive.chargeLength / explosive.chargeDiameter
        : 1.0;
    return cylindricalShapeFactor(lengthToDiameter);
  }

  // Spherical or cuboid
  return CHARGE_SHAPE_FACTORS[explosive.chargeShape] ?? 1.0;
}

/**
 * Computes the Hopkinson-Cranz scaled distance.
 *
 * @param standoffDistance - Actual standoff distance R (m)
 * @param tntMass         - TNT equivalent mass W (kg)
 * @returns Scaled distance Z = R / W^(1/3) (m/kg^(1/3)), or 0 if inputs invalid
 */
export function calculateScaledDistance(standoffDistance: number, tntMass: number): number {
  if (standoffDistance <= 0 || tntMass <= 0) return 0;
  return standoffDistance / Math.cbrt(tntMass);
}

/**
 * Computes the peak dynamic (stagnation) pressure using the Rankine-Hugoniot
 * relationship for a planar shock wave in air.
 *
 * @param psoKpa - Peak incident (side-on) pressure Pso (kPa)
 * @returns Peak dynamic pressure q (kPa)
 */
export function calculateDynamicPressure(psoKpa: number): number {
  const numerator = 5 * psoKpa * psoKpa;
  const denominator = 2 * psoKpa + 7 * ATMOSPHERIC_PRESSURE_KPA;
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

// ─── Internal: zeroed fallback ─────────────────────────────────────

/**
 * Returns a BlastParameters object with all blast values zeroed.
 * Used when the scaled distance is invalid (≤ 0).
 */
function zeroBlastParameters(
  tntMass: number,
  scaledDistance: number,
  distance: number,
  shapeFactor: number,
  input: ProjectInput,
): BlastParameters {
  return {
    tntEquivalentMass: tntMass,
    scaledDistance,
    distance,
    peakIncidentPressure: 0,
    peakReflectedPressure: 0,
    reflectionCoefficient: 0,
    peakDynamicPressure: 0,
    positivePhaseDuration: 0,
    positivePhaseImpulse: 0,
    shockFrontVelocity: 0,
    arrivalTime: 0,
    shapeCorrectionFactor: shapeFactor,
    groundReflection: input.threat.detonationType === 'buried' ? 'none' : 'regular',
    groundReflectedPressure: null,
  };
}