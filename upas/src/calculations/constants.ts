/**
 * UPAS — Physical & Engineering Constants
 * Sprint 3A: All constants used by the calculation engine
 *
 * Architecture Rule: NO hardcoded values in calculation functions.
 * All constants live here, sourced from engineering references.
 *
 * References:
 * - TM 5-1300 / UFC 3-340-02
 * - TM 5-855-1
 * - ASCE 59-11
 * - CEB-FIP Model Code 2010
 * - ACI 318-19
 */

// ─── Fundamental Constants ──────────────────────────────────────────

/** Standard gravitational acceleration (m/s²) */
export const GRAVITY = 9.80665;

/** Atmospheric pressure at sea level (kPa) */
export const ATMOSPHERIC_PRESSURE_KPA = 101.325;

/** Speed of sound in air at 20°C (m/s) */
export const SPEED_OF_SOUND_AIR = 343.0;

/** Standard air density at sea level (kg/m³) */
export const AIR_DENSITY = 1.225;

/** Ratio of specific heats for air (γ) */
export const AIR_GAMMA = 1.4;

// ─── TNT Reference Properties ───────────────────────────────────────

/** TNT density (kg/m³) */
export const TNT_DENSITY = 1600;

/** TNT detonation velocity (m/s) */
export const TNT_VOD = 6930;

/** TNT energy release (MJ/kg) */
export const TNT_ENERGY = 4.184;

/** TNT heat of detonation (kJ/kg) */
export const TNT_HEAT_OF_DETONATION = 4184;

// ─── Charge Shape Factors ───────────────────────────────────────────
// Correction factors for non-spherical charges
// Reference: TM 5-1300, Chapter 2

export const CHARGE_SHAPE_FACTORS: Record<string, number> = {
  spherical: 1.0,
  cylindrical: 1.1,  // L/D = 1
  cuboid: 1.15,
} as const;

/** Cylindrical charge shape factor interpolation: depends on L/D ratio */
export function cylindricalShapeFactor(lengthToDiameter: number): number {
  // Simplified: varies from 1.0 (sphere-like) to 1.4 (very long)
  if (lengthToDiameter <= 1) return 1.0;
  if (lengthToDiameter >= 6) return 1.4;
  return 1.0 + 0.08 * (lengthToDiameter - 1);
}

// ─── Kingery-Bulmash Coefficients ───────────────────────────────────
// Reference: TM 5-1300 / UFC 3-340-02, Chapter 2
// For free-air burst peak incident pressure
// Log10(Pso) = A + B*(log10(Z)) + C*(log10(Z))^2 + ... + F*(log10(Z))^5

/** Kingery-Bulmash coefficients for incident pressure (kPa) */
export const KB_INCIDENT_PRESSURE = {
  // Range 1: Z = 0.0669 to 0.2687 m/kg^(1/3)
  range1: {
    zMin: 0.0669, zMax: 0.2687,
    A: 8.6296, B: -5.4498, C: 1.3615, D: -0.1901, E: 0.01432, F: -0.000455,
  },
  // Range 2: Z = 0.2687 to 1.3435 m/kg^(1/3)
  range2: {
    zMin: 0.2687, zMax: 1.3435,
    A: 7.5938, B: -3.5116, C: 0.6218, D: -0.05305, E: 0.002103, F: -0.000032,
  },
  // Range 3: Z = 1.3435 to 6.7176 m/kg^(1/3)
  range3: {
    zMin: 1.3435, zMax: 6.7176,
    A: 7.0976, B: -2.5542, C: 0.3335, D: -0.02182, E: 0.000742, F: -0.000010,
  },
  // Range 4: Z = 6.7176 to 40 m/kg^(1/3) (extended)
  range4: {
    zMin: 6.7176, zMax: 40.0,
    A: 6.6613, B: -1.8716, C: 0.1851, D: -0.00886, E: 0.000215, F: -0.000002,
  },
} as const;

/** Kingery-Bulmash coefficients for positive phase impulse (kPa·ms) */
export const KB_IMPULSE = {
  // Range 1: Z = 0.0737 to 0.2949 m/kg^(1/3)
  range1: {
    zMin: 0.0737, zMax: 0.2949,
    A: 3.6222, B: -2.0158, C: 0.3902, D: -0.03537, E: 0.001551, F: -0.000026,
  },
  // Range 2: Z = 0.2949 to 4.4245 m/kg^(1/3)
  range2: {
    zMin: 0.2949, zMax: 4.4245,
    A: 3.0566, B: -1.5162, C: 0.2306, D: -0.01685, E: 0.000589, F: -0.000008,
  },
  // Range 3: Z = 4.4245 to 40 m/kg^(1/3)
  range3: {
    zMin: 4.4245, zMax: 40.0,
    A: 2.6985, B: -1.0835, C: 0.1084, D: -0.00541, E: 0.000132, F: -0.000001,
  },
} as const;

/** Kingery-Bulmash coefficients for positive phase duration (ms) */
export const KB_DURATION = {
  // Range 1: Z = 0.0669 to 1.3435 m/kg^(1/3)
  range1: {
    zMin: 0.0669, zMax: 1.3435,
    A: 1.0534, B: 0.2267, C: -0.0842, D: 0.01713, E: -0.00168, F: 0.000063,
  },
  // Range 2: Z = 1.3435 to 40 m/kg^(1/3)
  range2: {
    zMin: 1.3435, zMax: 40.0,
    A: 0.5196, B: 0.3266, C: -0.0226, D: 0.00095, E: -0.00002, F: 0.000000,
  },
} as const;

// ─── Reflection Coefficient ─────────────────────────────────────────
// Approximate reflection coefficient as function of incident angle
// Reference: TM 5-1300, Table 2-7

/** Normal incidence reflection coefficient vs. Pso (kPa) */
export function normalReflectionCoefficient(psoKpa: number): number {
  if (psoKpa <= 0) return 2.0;
  if (psoKpa < 345) return 2.0 + (psoKpa / 345) * 1.0; // 2.0 to 3.0
  if (psoKpa < 6900) return 3.0 + ((psoKpa - 345) / (6900 - 345)) * 5.0; // 3.0 to 8.0
  return 8.0; // cap for very high pressures
}

// ─── Soil Attenuation Constants ──────────────────────────────────────
// Reference: TM 5-855-1, Drake & Little (1983)

/** Attenuation exponent by soil category */
export const SOIL_ATTENUATION_EXPONENTS: Record<string, number> = {
  cohesiveless: 1.5,  // Sand/gravel
  cohesive: 1.3,      // Clay
  rock: 1.8,          // Rock (less attenuation)
} as const;

/** Ground shock coupling factor — fraction of blast energy transmitted to ground */
export const GROUND_COUPLING_FACTORS: Record<string, number> = {
  surface: 0.10,   // Surface burst
  buried: 0.30,    // Buried (direct coupling)
  aerial: 0.05,    // Aerial (minimal ground coupling)
  internal: 0.15,  // Internal to structure
} as const;

// ─── Penetration Formula Constants ──────────────────────────────────
// Reference: Modified NDRC (National Defense Research Committee)
// TM 5-855-1, Chapter 6

/** NDRC penetration constant for concrete */
export const NDRC_CONCRETE_CONSTANT = 0.00018;

/** NDRC penetration constant for soil */
export const NDRC_SOIL_CONSTANT = 0.00012;

/** Petry penetration constant for concrete */
export const PETRY_CONCRETE_K = 0.000058;

/** ACE formula constant for concrete */
export const ACE_CONCRETE_CONSTANT = 3.5;

/** Minimum projectile L/D ratio for nose factor */
export const MIN_LD_RATIO = 1.0;

// ─── Structure Response Constants ───────────────────────────────────

/** Maximum allowable support rotation for elastic response (degrees) */
export const MAX_ELASTIC_ROTATION = 2.0;

/** Maximum allowable support rotation for plastic response (degrees) */
export const MAX_PLASTIC_ROTATION = 8.0;

/** Maximum allowable support rotation before failure (degrees) */
export const MAX_FAILURE_ROTATION = 12.0;

/** Default target ductility ratio */
export const DEFAULT_DUCTILITY_RATIO = 3.0;

/** Load-mass factor for uniform blast on simply supported element */
export const LOAD_MASS_FACTOR_SS = 0.78;

/** Load-mass factor for uniform blast on fixed-fixed element */
export const LOAD_MASS_FACTOR_FF = 0.64;

// ─── Protection Level Thresholds ────────────────────────────────────

export const PROTECTION_THRESHOLDS = {
  safe:     { minSF: 1.5, description: 'آمن',     descriptionEn: 'Safe' },
  marginal: { minSF: 1.2, description: 'هامشي',   descriptionEn: 'Marginal' },
  unsafe:   { minSF: 1.0, description: 'غير آمن', descriptionEn: 'Unsafe' },
  critical: { minSF: 0.0, description: 'حرج',     descriptionEn: 'Critical' },
} as const;

// ─── Water Properties ───────────────────────────────────────────────

/** Water unit weight (kN/m³) */
export const WATER_UNIT_WEIGHT = 9.81;

// ─── Concrete Design Constants (ACI 318) ───────────────────────────

/** ACI 318 concrete modulus of elasticity factor */
export const ACI_E_FACTOR = 4700; // Ec = 4700 * sqrt(f'c) in MPa when f'c in psi; SI: Ec = 4700 * sqrt(f'c * 1450) * 0.006895 ≈ 0.043 * sqrt(f'c_MPa) * 1000
/** Simpler SI formula: Ec (MPa) = 4700 * sqrt(f'c in MPa) — this is the common approximation */
export const ACI_EC_COEFFICIENT = 4700;