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

// ─── Sprint 3D: PPV Damage Thresholds ────────────────────────────
// Reference: TM 5-855-1 Table 5-1, DIN 4150-3, ASCE 59-11
// PPV in m/s — for underground protective structures

export const PPV_DAMAGE_THRESHOLDS = {
  negligible:  { maxPPV: 0.05, descriptionAr: 'لا ضرر',                descriptionEn: 'No damage' },
  minor:       { maxPPV: 0.20, descriptionAr: 'ضرر طفيف — تشققات سطحية', descriptionEn: 'Minor damage — superficial cracking' },
  moderate:    { maxPPV: 0.50, descriptionAr: 'ضرر متوسط — تشققات هيكلية', descriptionEn: 'Moderate damage — structural cracking' },
  severe:      { maxPPV: 1.00, descriptionAr: 'ضرر شديد — تشوهات كبيرة', descriptionEn: 'Severe damage — significant deformation' },
  heavy:       { maxPPV: Infinity, descriptionAr: 'ضرر كبير — خطر انهيار', descriptionEn: 'Heavy damage — collapse risk' },
} as const;

// ─── Sprint 3D: Impedance Mismatch Warning Threshold ──────────────
/** Impedance ratio above which a warning is generated (dimensionless) */
export const IMPEDANCE_MISMATCH_WARNING_RATIO = 3.0;

// ─── Concrete Design Constants (ACI 318) ───────────────────────────

/** ACI 318 concrete modulus of elasticity factor */
export const ACI_E_FACTOR = 4700; // Ec = 4700 * sqrt(f'c) in MPa when f'c in psi; SI: Ec = 4700 * sqrt(f'c * 1450) * 0.006895 ≈ 0.043 * sqrt(f'c_MPa) * 1000
/** Simpler SI formula: Ec (MPa) = 4700 * sqrt(f'c in MPa) — this is the common approximation */
export const ACI_EC_COEFFICIENT = 4700;

// ═══════════════════════════════════════════════════════════════════════
// SPRINT 4 PHASE 0: Structural Design Constants
// These are NOT used by the analysis engine. They exist for the design
// engine that will consume them in later phases.
//
// Reference Standards:
// - UFC 3-340-02 (Structures to Resist the Effects of Accidental Explosions) — Loads & Response
// - ACI 318-19 (Building Code Requirements for Structural Concrete) — Reinforcement Design
// - TM 5-855-1 — Blast & Ground Shock
// ═══════════════════════════════════════════════════════════════════════

// ─── Rebar Database (Standard Metric Bars) ─────────────────────────
// Reference: ACI 318-19, Table 20.2.1
// Areas are for single bar cross-section

export interface RebarEntry {
  /** Nominal diameter (mm) */
  diameter: number;
  /** Common designation (e.g. "T16") */
  designation: string;
  /** Cross-sectional area (mm²) */
  area: number;
  /** Linear weight (kg/m) */
  weightPerMeter: number;
}

/** Standard reinforcement bar database — sorted by diameter ascending */
export const REBAR_DATABASE: RebarEntry[] = [
  { diameter: 10, designation: 'T10', area: 78.5,   weightPerMeter: 0.617 },
  { diameter: 12, designation: 'T12', area: 113.1,  weightPerMeter: 0.888 },
  { diameter: 14, designation: 'T14', area: 153.9,  weightPerMeter: 1.208 },
  { diameter: 16, designation: 'T16', area: 201.1,  weightPerMeter: 1.580 },
  { diameter: 20, designation: 'T20', area: 314.2,  weightPerMeter: 2.466 },
  { diameter: 25, designation: 'T25', area: 490.9,  weightPerMeter: 3.853 },
  { diameter: 32, designation: 'T32', area: 804.2,  weightPerMeter: 6.313 },
  { diameter: 40, designation: 'T40', area: 1256.6, weightPerMeter: 9.864 },
] as const;

// ─── ACI 318-19 Strength Reduction Factors ──────────────────────────
// φ factors for ultimate strength design
// Reference: ACI 318-19, Table 21.2.1

export const ACI_STRENGTH_REDUCTION_FACTORS = {
  /** Flexure and axial tension: φ = 0.90 */
  flexure: 0.90,
  /** Shear and torsion: φ = 0.75 */
  shear: 0.75,
  /** Axial compression with tied reinforcement: φ = 0.65 */
  compressionTied: 0.65,
  /** Axial compression with spiral reinforcement: φ = 0.75 */
  compressionSpiral: 0.75,
} as const;

// ─── ACI 318-19 Reinforcement Limits ────────────────────────────────
// Reference: ACI 318-19, Sections 24.4, 7.6

/** Minimum reinforcement ratio ρ_min for flexural members
 *  ACI 318-19 Eq. 24.4.2.1: ρ_min = max(0.25√f'c/fy, 1.33×ρ_balanced)
 *  Simplified: ρ_min = 0.25√f'c / fy (for typical f'c/fy ratios)
 *  This is computed per-design, not stored as a constant.
 */

/** Maximum reinforcement ratio ρ_max = 0.75 × ρ_balanced (ACI 318-19)
 *  Computed per-design from: ρ_b = 0.85 × β1 × (f'c/fy) × (87000/(87000+fy))
 *  β1 = 0.85 for f'c ≤ 28 MPa, reduces by 0.05 per 7 MPa above
 */

/** Minimum bar spacing for single layer (mm) */
export const MIN_BAR_SPACING_MM = 75;

/** Maximum bar spacing for flexural reinforcement (mm)
 *  ACI 318-19: min(3h, 450mm) for slabs — we use 200mm for blast design
 */
export const MAX_BAR_SPACING_BLAST_MM = 200;

// ─── UFC 3-340-02 Blast Design Constants ───────────────────────────
// Reference: UFC 3-340-02, Chapter 5 (Dynamic Analysis)

/** Dynamic Increase Factor (DIF) for reinforcing steel under blast.
 *  UFC 3-340-02, Section 5.14.3: DIF_s = 1.0 + (0.26 × f_y / 414) ≤ 1.20
 *  For fy = 420 MPa: DIF ≈ 1.0 + 0.26 × 420/414 = 1.264 → capped at 1.20
 */
export function calculateSteelDIF(fy: number): number {
  const dif = 1.0 + (0.26 * fy) / 414;
  return Math.min(dif, 1.20);
}

// ─── Default Design Criteria ───────────────────────────────────────
// These defaults are used when the user does not specify DesignCriteria.

export const DEFAULT_DESIGN_CRITERIA = {
  /** Target safety factor — UFC 3-340-02 recommends ≥ 1.2 for containment, ≥ 1.5 for personnel protection */
  targetSafetyFactor: 1.5,

  /** Allow plastic response — UFC 3-340-02 permits plastic design for blast with controlled ductility */
  allowPlasticResponse: true,

  /** Default support condition for roof/floor slabs */
  supportCondition: 'simply_supported' as const,

  /** Default support condition for walls (typically more restrained) */
  wallSupportCondition: 'fixed' as const,

  /** Default reinforcement grade */
  reinforcementGrade: {
    fy: 420,
    standard: 'ASTM A615 Grade 60',
  },

  /** Concrete cover for underground structures — larger than buildings due to soil exposure */
  concreteCover: 0.050, // 50mm

  /** Maximum deflection ratio δ/L — L/360 for typical serviceability */
  maxDeflectionRatio: 1 / 360,

  /** Thickness search increment — 25mm is the standard construction increment */
  thicknessIncrement: 0.025,

  /** Maximum thickness to attempt before declaring design failure */
  maxThickness: 2.0,

  /** Include self-weight in design loads */
  includeSelfWeight: true,

  /** Include overburden on roof */
  includeOverburden: true,

  /** Include lateral earth pressure on walls */
  includeLateralPressure: true,
} as const;