/** UPAS — Structure Resistance Calculation Engine
 * Calculates structural capacity, dynamic response, and penetration resistance
 * for underground protective structures under blast loading.
 *
 * Reference Standards:
 * - TM 5-1300 / UFC 3-340-02 (Structures to Resist the Effects of Accidental Explosions)
 * - TM 5-855-1 (Fundamentals of Protective Design for Conventional Weapons)
 * - ACI 318-19 (Building Code Requirements for Structural Concrete)
 * - ASCE 59-11 (Blast Protection of Buildings)
 */

import type {
  StructureInput,
  MaterialInput,
  StructureResponse,
  PenetrationParameters,
  BlastParameters,
  SoilStructureInteraction,
} from '../types';
import {
  MAX_ELASTIC_ROTATION,
  MAX_PLASTIC_ROTATION,
  MAX_FAILURE_ROTATION,
  LOAD_MASS_FACTOR_SS,
  LOAD_MASS_FACTOR_FF,
  NDRC_CONCRETE_CONSTANT,
  PETRY_CONCRETE_K,
  ACE_CONCRETE_CONSTANT,
  GRAVITY,
} from '../constants';

// ─────────────────────────────────────────────────────────────────────
// 1. Dynamic Resistance
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate the resistance of a structural element under blast loading.
 * Determines static resistance from flexural capacity, then applies the
 * Dynamic Increase Factor (DIF) for high strain-rate blast loading.
 *
 * @param material - Material properties of the element
 * @param thickness - Element thickness (m)
 * @param span - Element span (m)
 * @param supportCondition - 'simply_supported' or 'fixed'
 * @returns Static resistance (kPa), dynamic resistance (kPa), and DIF used
 */
export function calculateDynamicResistance(
  material: MaterialInput,
  thickness: number,
  span: number,
  supportCondition: 'simply_supported' | 'fixed',
): { staticResistance: number; dynamicResistance: number; dif: number } {
  // Edge cases: zero thickness or zero span → no resistance
  if (thickness <= 0 || span <= 0) {
    return { staticResistance: 0, dynamicResistance: 0, dif: material.difCompressive };
  }

  // ── Determine DIF based on material category (blast = high strain rate) ──
  let dif: number;
  switch (material.category) {
    case 'concrete':
      dif = material.difCompressive;
      break;
    case 'steel':
      dif = material.difTensile;
      break;
    case 'masonry':
      dif = Math.min(material.difCompressive, 1.2);
      break;
    default:
      dif = material.difCompressive;
      break;
  }

  // ── Simplified concrete flexural capacity ──
  // Whitney stress block factor
  const alpha = 0.85;
  // Unit width (mm)
  const b = 1000;
  // Effective depth: thickness converted to mm minus 40 mm concrete cover
  const thicknessMm = thickness * 1000;
  const d = Math.max(thicknessMm - 40, 0);

  // Moment capacity Mu (kN·m/m) = 0.5 × α × f'c × b × d² / 1000
  const Mu = (0.5 * alpha * material.compressiveStrength * b * d * d) / 1000;

  // ── Convert moment capacity to equivalent uniform pressure (kPa) ──
  // Use span in mm for consistent unit handling with d in mm
  const spanMm = span * 1000;
  let staticResistance: number;

  if (supportCondition === 'simply_supported') {
    // Simply supported: w = 8 × Mu / L²
    staticResistance = (8 * Mu * 1000) / (spanMm * spanMm);
  } else {
    // Fixed (plastic mechanism): 12 × Mu / L²
    staticResistance = (12 * Mu * 1000) / (spanMm * spanMm);
  }

  const dynamicResistance = staticResistance * dif;

  return { staticResistance, dynamicResistance, dif };
}

// ─────────────────────────────────────────────────────────────────────
// 2. Structure Response (SDOF Approximation)
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate the dynamic response of a structural element to blast loading
 * using a Single-Degree-of-Freedom (SDOF) approximation.
 *
 * @param element - Which structural element is being analyzed
 * @param input - Full structure input (dimensions, materials, etc.)
 * @param appliedPressure - Blast pressure on the element (kPa)
 * @param blastParams - Computed blast parameters
 * @returns Complete structure response for the element
 */
export function calculateStructureResponse(
  element: 'roof' | 'wall' | 'floor',
  input: StructureInput,
  appliedPressure: number,
  blastParams: BlastParameters,
): StructureResponse {
  // ── Select material and thickness for the element ──
  const material =
    element === 'roof'
      ? input.roofMaterial
      : element === 'wall'
        ? input.wallMaterial
        : input.floorMaterial;

  const thickness =
    element === 'roof'
      ? input.roofThickness
      : element === 'wall'
        ? input.wallThickness
        : input.floorThickness;

  // ── Determine span ──
  const span =
    element === 'wall'
      ? Math.min(input.length, input.height)
      : input.length;

  // Default to simply supported (no fixed-end data in input)
  const supportCondition: 'simply_supported' | 'fixed' = 'simply_supported';

  // ── Get dynamic resistance ──
  const { staticResistance, dynamicResistance, dif } = calculateDynamicResistance(
    material,
    thickness,
    span,
    supportCondition,
  );

  // ── Safety factor (clamp applied pressure to avoid division by zero) ──
  const safePressure = Math.max(appliedPressure, 0.001);
  const safetyFactor = dynamicResistance / safePressure;

  // ── Determine response mode ──
  let responseMode: 'elastic' | 'plastic' | 'failure';
  if (safetyFactor >= 1.5) {
    responseMode = 'elastic';
  } else if (safetyFactor >= 1.0) {
    responseMode = 'plastic';
  } else {
    responseMode = 'failure';
  }

  // ── Natural period (empirical for concrete slabs) ──
  const safeThickness = Math.max(thickness, 0.001);
  const safeSpan = Math.max(span, 0.001);
  const naturalPeriod = 0.1 * Math.pow(safeSpan / safeThickness, 1.5);

  // ── Yield displacement (SDOF) ──
  const loadMassFactor = LOAD_MASS_FACTOR_SS;
  const massPerArea = material.density * thickness; // kg/m²
  const safeMassPerArea = Math.max(massPerArea, 0.001);

  // δ_y = staticResistance × T² / (4 × π² × K_LM × mass_per_area)
  // T in ms, staticResistance in kPa, mass_per_area in kg/m² → δ_y in mm
  const deltaYield =
    (staticResistance * naturalPeriod * naturalPeriod) /
    (4 * Math.PI * Math.PI * loadMassFactor * safeMassPerArea);

  // ── Max displacement based on response mode ──
  let maxDisplacement: number;
  let ductilityRatio: number;

  if (responseMode === 'elastic') {
    maxDisplacement = deltaYield;
    ductilityRatio = 1.0;
  } else if (responseMode === 'plastic') {
    ductilityRatio = Math.min(Math.max(safetyFactor, 1.0), 10);
    maxDisplacement = deltaYield * ductilityRatio;
  } else {
    // Failure: large plastic deformation
    ductilityRatio = 15;
    maxDisplacement = deltaYield * ductilityRatio;
  }

  // ── Support rotation (degrees) ──
  // Convert maxDisplacement from mm to m for rotation calculation
  const maxDispMeters = maxDisplacement / 1000;
  const supportRotation =
    (maxDispMeters / Math.max(safeSpan / 2, 0.001)) * (180 / Math.PI);

  // ── Response time ──
  const responseTime = Math.min(3 * naturalPeriod, blastParams.positivePhaseDuration);

  return {
    element,
    appliedPressure,
    dynamicResistance,
    staticResistance,
    dif,
    safetyFactor,
    responseMode,
    maxDisplacement: Math.max(maxDisplacement, 0),
    supportRotation: Math.max(supportRotation, 0),
    ductilityRatio: Math.max(ductilityRatio, 1.0),
    naturalPeriod,
    responseTime,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 3. Penetration Resistance (Modified NDRC Formula)
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate penetration into a structural element using the Modified NDRC
 * (National Defense Research Committee) formula for concrete.
 *
 * Reference: TM 5-855-1, Chapter 6
 *
 * @param material - Material properties of the element
 * @param thickness - Element thickness (m)
 * @param blastParams - Computed blast parameters (includes TNT equivalent mass)
 * @param element - Which structural element is being analyzed
 * @returns Penetration parameters including depth, perforation, and scabbing
 */
export function calculatePenetrationResistance(
  material: MaterialInput,
  thickness: number,
  blastParams: BlastParameters,
  _element: 'roof' | 'wall' | 'floor',
): PenetrationParameters {
  // Concrete compressive strength (MPa)
  const fc = Math.max(material.compressiveStrength, 0.001);

  // TNT equivalent mass (kg)
  const W = Math.max(blastParams.tntEquivalentMass, 0.001);

  // Estimate charge diameter from spherical equivalent
  // d = 2 × (3 × W / (4 × π × ρ_exp))^(1/3), ρ_exp = 1600 kg/m³
  const rhoExp = 1600;
  const chargeDiameter =
    2 *
    Math.pow((3 * W) / (4 * Math.PI * rhoExp), 1 / 3);

  // ── Modified NDRC penetration formula ──
  // X/d = NDRC_CONCRETE_CONSTANT × W^0.5 / (f'c^0.5 × d^0.5)
  const xdRatio =
    (NDRC_CONCRETE_CONSTANT * Math.sqrt(W)) /
    (Math.sqrt(fc) * Math.sqrt(Math.max(chargeDiameter, 0.001)));

  // Penetration depth into structure (m)
  const penetrationDepthStructure = xdRatio * chargeDiameter;

  // ── Perforation and scabbing thicknesses ──
  // Minimum thickness to prevent perforation: t_perf = 1.3 × X
  const perforationThickness = 1.3 * penetrationDepthStructure;

  // Minimum thickness to prevent scabbing: t_scab = 2.2 × X
  const scabbingThickness = 2.2 * penetrationDepthStructure;

  // ── Check perforation and spalling ──
  const isPerforated = thickness < perforationThickness;
  const isSpalled = thickness < scabbingThickness;

  return {
    // Soil penetration is not computed for structure elements (set to 0)
    penetrationDepthSoil: 0,
    penetrationDepthStructure,
    perforationThickness,
    scabbingThickness,
    isPerforated,
    isSpalled,
    // Crater dimensions apply to soil, not structure (set to 0)
    craterDiameter: 0,
    craterDepth: 0,
    formulaUsed: 'Modified NDRC (Concrete)',
  };
}

// ─────────────────────────────────────────────────────────────────────
// 4. Natural Period of Vibration
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate the natural period of vibration for a structural element.
 * Uses the simplified formula: T = C × H × (L/h)²
 *
 * @param material - Material properties of the element
 * @param thickness - Element thickness (m)
 * @param span - Element span (m)
 * @param supportCondition - 'simply_supported' or 'fixed'
 * @returns Natural period in milliseconds (clamped to 1–500 ms)
 */
export function calculateNaturalPeriod(
  material: MaterialInput,
  thickness: number,
  span: number,
  supportCondition: 'simply_supported' | 'fixed',
): number {
  // Edge cases
  if (thickness <= 0 || span <= 0) {
    return 1; // minimum period
  }

  // Coefficient based on support condition
  const C = supportCondition === 'simply_supported' ? 0.063 : 0.031;

  // T = C × H × (L/h)²
  // H = span (m), L = span (m), h = thickness (m)
  const T = C * span * Math.pow(span / thickness, 2);

  // Clamp between 1 ms and 500 ms
  return Math.max(1, Math.min(500, T));
}

// ─────────────────────────────────────────────────────────────────────
// 5. Element Material Capacity
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate the dynamic capacity of a material for compression, tension, and shear.
 * Applies the Dynamic Increase Factor (DIF) to static strengths.
 * Shear capacity uses a simplified ACI formula: φVc = 0.17 × √f'c × DIF
 *
 * @param material - Material properties
 * @param thickness - Element thickness (m) — not used directly but kept for interface consistency
 * @returns Compressive, tensile, and shear capacities (MPa)
 */
export function calculateElementCapacity(
  material: MaterialInput,
  _thickness: number,
): { compressiveCapacity: number; tensileCapacity: number; shearCapacity: number } {
  const compressiveCapacity = material.compressiveStrength * material.difCompressive;
  const tensileCapacity = material.tensileStrength * material.difTensile;
  const shearCapacity =
    0.17 * Math.sqrt(material.compressiveStrength) * material.difCompressive;

  return { compressiveCapacity, tensileCapacity, shearCapacity };
}

// ─────────────────────────────────────────────────────────────────────
// 6. All Structure Responses (Roof, Wall, Floor)
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate blast response for all three structural elements.
 * Applies pressure distribution factors:
 * - Roof: 100% of soil-attenuated pressure
 * - Wall: 70% (lateral pressure is reduced)
 * - Floor: 50% (floor receives least direct pressure)
 *
 * @param input - Full structure input
 * @param blastParams - Computed blast parameters
 * @param ssi - Soil-structure interaction results (provides pressure at structure)
 * @returns Response for roof, wall, and floor
 */
export function getAllStructureResponses(
  input: StructureInput,
  blastParams: BlastParameters,
  ssi: SoilStructureInteraction,
): { roof: StructureResponse; wall: StructureResponse; floor: StructureResponse } {
  // Pressure distribution after soil attenuation
  const roofPressure = ssi.pressureAtStructure;
  const wallPressure = ssi.pressureAtStructure * 0.7;
  const floorPressure = ssi.pressureAtStructure * 0.5;

  return {
    roof: calculateStructureResponse('roof', input, roofPressure, blastParams),
    wall: calculateStructureResponse('wall', input, wallPressure, blastParams),
    floor: calculateStructureResponse('floor', input, floorPressure, blastParams),
  };
}

// ─────────────────────────────────────────────────────────────────────
// 7. All Penetration Results (Roof, Wall, Floor)
// ─────────────────────────────────────────────────────────────────────

/**
 * Calculate penetration resistance for all three structural elements.
 * Uses the Modified NDRC formula for each element with its
 * respective material and thickness.
 *
 * @param input - Full structure input
 * @param blastParams - Computed blast parameters
 * @returns Penetration parameters for roof, wall, and floor
 */
export function getAllPenetrationResults(
  input: StructureInput,
  blastParams: BlastParameters,
): { roof: PenetrationParameters; wall: PenetrationParameters; floor: PenetrationParameters } {
  return {
    roof: calculatePenetrationResistance(
      input.roofMaterial,
      input.roofThickness,
      blastParams,
      'roof',
    ),
    wall: calculatePenetrationResistance(
      input.wallMaterial,
      input.wallThickness,
      blastParams,
      'wall',
    ),
    floor: calculatePenetrationResistance(
      input.floorMaterial,
      input.floorThickness,
      blastParams,
      'floor',
    ),
  };
}