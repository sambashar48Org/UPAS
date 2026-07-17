/**
 * UPAS — Soil Mechanics Calculation Engine
 *
 * Calculates soil-related engineering properties for protective design:
 * - Overburden pressure (total, effective, pore water)
 * - Blast wave attenuation through soil cover
 * - Ground shock parameters (PPV, arrival time, frequency, duration)
 * - Crater dimension estimation
 * - Soil penetration depth estimation
 * - Soil-structure interaction (combined)
 *
 * References:
 * - TM 5-1300 / UFC 3-340-02 (Structures to Resist the Effects of Accidental Explosions)
 * - TM 5-855-1 (Fundamentals of Protective Design for Conventional Weapons)
 * - ASCE 59-11 (Blast Protection of Buildings)
 * - Drake & Little (1983) — Ground shock from buried explosions
 */

import type {
  SoilInput,
  SoilLayerInput,
  SoilStructureInteraction,
  BlastParameters,
  PenetrationParameters,
} from '../types';
import type { ProjectInput, SoilAssessment } from '../types';
import {
  WATER_UNIT_WEIGHT,
  SOIL_ATTENUATION_EXPONENTS,
  GROUND_COUPLING_FACTORS,
  NDRC_SOIL_CONSTANT,
  TNT_DENSITY,
} from '../constants';

// Sprint 3D: Enhanced modules (delegation targets)
import { calculateWavePropagation } from './wave-propagation';
import { calculateEnhancedGroundShock } from './ground-shock-enhanced';
import { assessSoilHazards } from './soil-assessment';

// ─── Ground Shock Coefficients (Drake & Little) ─────────────────────
// PPV = K × (W^(1/3) / R)^n  [m/s]
// W in kg, R in m

const GROUND_SHOCK_COEFFICIENTS: Record<string, { K: number; n: number }> = {
  cohesiveless: { K: 500, n: 1.5 },
  cohesive:     { K: 200, n: 1.3 },
  rock:         { K: 700, n: 1.8 },
} as const;

// ─── Soil Strength Multipliers for Penetration ──────────────────────

const PENETRATION_STRENGTH_MULTIPLIERS: Record<string, number> = {
  cohesiveless: 1.0,    // Base NDRC constant
  cohesive:     1.5,    // Clay — easier penetration
  rock:         0.3,    // Rock — harder penetration
} as const;

// ─── Helper: Reference distance for attenuation (m) ─────────────────

const ATTENUATION_REFERENCE_DISTANCE = 1.0;

// ═══════════════════════════════════════════════════════════════════════
// 1. OVERBURDEN PRESSURE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate vertical stress state at a given depth below ground surface.
 *
 * Accumulates unit weight × thickness for all full layers above the target
 * depth, plus a partial contribution for the layer that contains the depth.
 * Pore water pressure is computed from the water table position.
 *
 * @param soil  - Soil profile with ordered layers and water table info
 * @param depth - Depth below ground surface (m)
 * @returns Total stress, effective stress, and pore water pressure (all kPa)
 */
export function calculateOverburdenPressure(
  soil: SoilInput,
  depth: number,
): { totalStress: number; effectiveStress: number; porePressure: number } {
  // Edge cases
  if (depth <= 0 || soil.layers.length === 0) {
    return { totalStress: 0, effectiveStress: 0, porePressure: 0 };
  }

  let totalStress = 0;
  let accumulatedDepth = 0;

  for (const layer of soil.layers) {
    const layerBottom = accumulatedDepth + layer.thickness;

    if (accumulatedDepth >= depth) {
      // Already past the target depth — stop
      break;
    }

    if (layerBottom <= depth) {
      // Full layer is above the target depth
      totalStress += layer.unitWeight * layer.thickness;
    } else {
      // Target depth falls within this layer — partial contribution
      const partialThickness = depth - accumulatedDepth;
      totalStress += layer.unitWeight * Math.max(0, partialThickness);
      break;
    }

    accumulatedDepth = layerBottom;
  }

  // Pore water pressure: u = γ_w × (depth - waterTableDepth) if below water table
  let porePressure = 0;
  if (soil.waterTableDepth !== null && depth > soil.waterTableDepth) {
    porePressure = Math.max(0, depth - soil.waterTableDepth) * WATER_UNIT_WEIGHT;
  }

  const effectiveStress = totalStress - porePressure;

  return {
    totalStress,
    effectiveStress: Math.max(0, effectiveStress),
    porePressure,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 2. SOIL ATTENUATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate how blast pressure is attenuated through a soil cover.
 *
 * Uses an inverse-distance power law:  attenuation = 1 / (1 + d/R_ref)^n
 * where n depends on the soil category.  A ground-coupling factor is
 * applied based on the detonation type to scale the arriving pressure.
 *
 * @param soil              - Soil profile
 * @param blastParams       - Pre-computed blast parameters
 * @param soilCoverThickness - Thickness of soil above the structure (m)
 * @param detonationType    - Type of detonation ('surface' | 'buried' | 'aerial' | 'internal')
 * @returns Attenuation factor, pressure at structure, and average soil properties
 */
export function calculateSoilAttenuation(
  soil: SoilInput,
  blastParams: BlastParameters,
  soilCoverThickness: number,
  detonationType: string,
): {
  attenuationFactor: number;
  pressureAtStructure: number;
  averageWaveVelocity: number;
  averageUnitWeight: number;
} {
  // Determine attenuation exponent from topmost layer category
  const topCategory = soil.layers.length > 0 ? soil.layers[0].category : 'cohesiveless';
  const n = SOIL_ATTENUATION_EXPONENTS[topCategory] ?? SOIL_ATTENUATION_EXPONENTS['cohesiveless'];

  // Attenuation factor: inverse power-law with reference distance
  const d = Math.max(0, soilCoverThickness);
  const R_ref = ATTENUATION_REFERENCE_DISTANCE;
  const attenuationFactor = d > 0
    ? 1 / Math.pow(1 + d / R_ref, n)
    : 1.0;

  // Average properties along the soil path (0 to soilCoverThickness)
  const pathProps = calculateAveragePropertiesAlongPath(soil, 0, d);
  const averageWaveVelocity = pathProps.averageWaveVelocity;
  const averageUnitWeight = pathProps.averageUnitWeight;

  // Ground coupling factor by detonation type
  const couplingFactor = GROUND_COUPLING_FACTORS[detonationType] ?? GROUND_COUPLING_FACTORS['surface'];

  // Pressure arriving at structure surface
  let pressureAtStructure: number;
  if (detonationType === 'buried') {
    // Buried detonation — more direct coupling, less attenuation from free-air formula
    // Scale by a factor that accounts for the higher energy coupling
    pressureAtStructure = blastParams.peakIncidentPressure * attenuationFactor * couplingFactor * 2.0;
  } else {
    pressureAtStructure = blastParams.peakIncidentPressure * attenuationFactor * couplingFactor;
  }

  return {
    attenuationFactor,
    pressureAtStructure: Math.max(0, pressureAtStructure),
    averageWaveVelocity,
    averageUnitWeight,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 3. GROUND SHOCK
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate ground shock parameters from a blast through soil.
 *
 * Uses the Drake & Little (1983) empirical relationship:
 *   PPV = K × (W^(1/3) / R)^n
 * where K and n depend on the dominant soil category along the path.
 *
 * @param blastParams - Pre-computed blast parameters
 * @param soil       - Soil profile
 * @param distance   - Distance from detonation point to target (m)
 * @returns Peak particle velocity, arrival time, frequency, and duration
 */
export function calculateGroundShock(
  blastParams: BlastParameters,
  soil: SoilInput,
  distance: number,
): {
  peakParticleVelocity: number;
  arrivalTime: number;
  frequency: number;
  duration: number;
} {
  // Default return for degenerate cases
  if (distance <= 0 || soil.layers.length === 0 || blastParams.tntEquivalentMass <= 0) {
    return { peakParticleVelocity: 0, arrivalTime: 0, frequency: 0, duration: 10 };
  }

  // Average wave velocity along the path
  const Vs_avg = calculateAveragePropertiesAlongPath(
    soil,
    0,
    Math.min(distance, soil.totalDepth),
  ).averageWaveVelocity;

  // Determine soil category for shock coefficients — use the first layer encountered
  const topCategory = soil.layers[0].category;
  const coeffs = GROUND_SHOCK_COEFFICIENTS[topCategory] ?? GROUND_SHOCK_COEFFICIENTS['cohesiveless'];

  const W = blastParams.tntEquivalentMass;
  const R = Math.max(0.1, distance); // Prevent division by zero

  // Drake & Little: PPV = K × (W^(1/3) / R)^n  [m/s]
  const scaledDistance = Math.pow(W, 1 / 3) / R;
  const peakParticleVelocity = coeffs.K * Math.pow(scaledDistance, coeffs.n);

  // Arrival time = distance / Vs_avg (convert s → ms)
  const arrivalTime = Vs_avg > 0
    ? (distance / Vs_avg) * 1000
    : 0;

  // Dominant frequency: f = Vs / (2 × chargeRadius)
  // chargeRadius = (3W / (4π × ρ_TNT))^(1/3)
  const chargeVolume = (3 * W) / (4 * Math.PI * TNT_DENSITY);
  const chargeRadius = Math.pow(chargeVolume, 1 / 3);
  let frequency = chargeRadius > 0
    ? Vs_avg / (2 * chargeRadius)
    : 0;

  // Cap frequency to reasonable range 5–100 Hz
  frequency = Math.max(5, Math.min(100, frequency));

  // Duration ≈ 3 / frequency (ms), minimum 10 ms
  const duration = Math.max(10, 3 / frequency * 1000);

  return {
    peakParticleVelocity,
    arrivalTime,
    frequency,
    duration,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 4. CRATER DIMENSIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Estimate crater dimensions from a surface or buried detonation in soil.
 *
 * Surface burst (empirical):
 *   D_crater = 0.8 × W^0.3  (m)
 *   Depth    = D_crater × 0.3
 *
 * Buried bursts are scaled by a burial depth factor.
 *
 * @param tntMass     - TNT equivalent mass (kg)
 * @param burialDepth - Burial depth of the charge (m). Null = surface burst
 * @param soil        - Soil profile (used for category-based scaling)
 * @returns Crater diameter and depth (m)
 */
export function calculateCraterDimensions(
  tntMass: number,
  burialDepth: number | null,
  soil: SoilInput,
): { craterDiameter: number; craterDepth: number } {
  // Minimum mass guard
  if (tntMass <= 0) {
    return { craterDiameter: 0.5, craterDepth: 0.1 };
  }

  // Surface burst empirical formula (Ambrosini & Luccioni / TM 5-855-1 simplified)
  let craterDiameter = 0.8 * Math.pow(tntMass, 0.3);
  let craterDepth = craterDiameter * 0.3;

  // Burial depth scaling factor
  if (burialDepth !== null && burialDepth > 0) {
    // For buried charges, crater dimensions scale with burial depth
    // Maximum cratering occurs at optimum depth ≈ 0.4 × D_crater (surface)
    const optimumDepth = 0.4 * craterDiameter;
    const depthRatio = burialDepth / optimumDepth;
    const burialFactor = Math.exp(-0.5 * Math.pow(depthRatio - 1, 2));
    craterDiameter *= burialFactor;
    craterDepth *= burialFactor;
  }

  // Soil category adjustment (rock produces smaller craters)
  const topCategory = soil.layers.length > 0 ? soil.layers[0].category : 'cohesiveless';
  if (topCategory === 'rock') {
    craterDiameter *= 0.7;
    craterDepth *= 0.5;
  }

  // Clamp minimums
  craterDiameter = Math.max(0.5, craterDiameter);
  craterDepth = Math.max(0.1, craterDepth);

  return { craterDiameter, craterDepth };
}

// ═══════════════════════════════════════════════════════════════════════
// 5. SOIL PENETRATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Simplified soil penetration estimation for projectile-like threats.
 *
 * Modified NDRC formula:
 *   X = K × W^0.6 / (ρ × d²)
 *
 * where K is the soil-specific penetration constant (scaled by soil category),
 * ρ is soil density derived from unit weight, and d is the standoff distance
 * (used as an effective diameter proxy for the incoming threat).
 *
 * Structure-related fields (perforation, scabbing, etc.) are set to defaults
 * and are calculated in the structure module.
 *
 * @param tntMass          - TNT equivalent mass (kg)
 * @param standoffDistance  - Standoff distance / effective projectile size (m)
 * @param soil             - Soil profile
 * @returns Complete PenetrationParameters with soil-side results
 */
export function calculateSoilPenetration(
  tntMass: number,
  standoffDistance: number,
  soil: SoilInput,
): PenetrationParameters {
  // Determine soil strength multiplier
  const topCategory = soil.layers.length > 0 ? soil.layers[0].category : 'cohesiveless';
  const strengthMultiplier = PENETRATION_STRENGTH_MULTIPLIERS[topCategory] ?? 1.0;

  // Effective penetration constant for this soil type
  const K = NDRC_SOIL_CONSTANT * strengthMultiplier;

  // Soil density (kg/m³) from unit weight: ρ = γ / g
  // Use top layer's unit weight
  const gamma = soil.layers.length > 0 ? soil.layers[0].unitWeight : 18.0; // kN/m³
  const g = 9.80665;
  const rho = (gamma * 1000) / g; // Convert kN/m³ → kg/m³

  // Effective projectile diameter: use charge equivalent diameter
  // d = (6W / (π × ρ_TNT))^(1/3)
  const effectiveDiameter = Math.pow(
    (6 * tntMass) / (Math.PI * TNT_DENSITY),
    1 / 3,
  );

  // Modified NDRC penetration formula
  const penetrationDepthSoil = rho > 0 && effectiveDiameter > 0
    ? K * Math.pow(tntMass, 0.6) / (rho * Math.pow(effectiveDiameter, 2))
    : 0;

  // Crater dimensions (surface burst for penetration context)
  const crater = calculateCraterDimensions(tntMass, null, soil);

  return {
    penetrationDepthSoil: Math.max(0, penetrationDepthSoil),
    penetrationDepthStructure: 0,
    perforationThickness: 0,
    scabbingThickness: 0,
    isPerforated: false,
    isSpalled: false,
    craterDiameter: crater.craterDiameter,
    craterDepth: crater.craterDepth,
    formulaUsed: 'Modified NDRC (Soil)',
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 6. SOIL-STRUCTURE INTERACTION (Combined)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute the complete soil-structure interaction result.
 *
 * Combines overburden pressure, blast attenuation through soil, and
 * ground shock into a single SoilStructureInteraction object suitable
 * for downstream structural response calculations.
 *
 * @param input       - Full project input (soil, structure, threat, settings)
 * @param blastParams - Pre-computed blast parameters
 * @returns Complete soil-structure interaction result
 */
export function calculateSoilStructureInteraction(
  input: ProjectInput,
  blastParams: BlastParameters,
): SoilStructureInteraction {
  const { soil, structure, threat } = input;

  // Structure crown depth = burial depth of structure top below ground surface
  const crownDepth = Math.max(0, structure.burialDepth);

  // 1. Overburden pressure at structure crown
  const overburden = calculateOverburdenPressure(soil, crownDepth);

  // 2. Soil attenuation — soil cover = burial depth (thickness of soil above roof)
  const detonationType = threat.detonationType;
  const attenuation = calculateSoilAttenuation(
    soil,
    blastParams,
    structure.burialDepth,
    detonationType,
  );

  // 3. Ground shock at structure — use standoff distance as travel distance
  const groundShockDistance = Math.max(threat.standoffDistance, structure.burialDepth);
  const groundShock = calculateGroundShock(blastParams, soil, groundShockDistance);

  // ─── Base result (legacy fields — always populated) ───
  const baseResult: SoilStructureInteraction = {
    overburdenPressure: overburden.totalStress,
    effectiveStress: overburden.effectiveStress,
    soilAttenuationFactor: attenuation.attenuationFactor,
    pressureAtStructure: attenuation.pressureAtStructure,
    groundShockPPV: groundShock.peakParticleVelocity,
    groundShockArrivalTime: groundShock.arrivalTime,
    averageWaveVelocity: attenuation.averageWaveVelocity,
    averageUnitWeight: attenuation.averageUnitWeight,
    // Sprint 3D: Enhanced fields — null by default (legacy mode)
    layerTravelTimes: null,
    impedanceMismatchLosses: null,
    totalImpedanceTransmission: null,
    ppvDamageLevel: null,
  };

  // ─── Sprint 3D: Enhanced model branch ───
  // When useEnhancedSoilModel=true, delegate to enhanced modules
  // and populate optional SSI fields WITHOUT changing base values.
  if (input.settings.useEnhancedSoilModel) {
    // Wave propagation through full soil cover
    const waveProp = calculateWavePropagation(soil, 0, crownDepth);

    // Enhanced ground shock with path-interpolated coefficients
    const enhancedShock = calculateEnhancedGroundShock(
      blastParams, soil, groundShockDistance, waveProp,
    );

    // Soil hazard assessment (independent, does not touch results/index.ts)
    const assessment: SoilAssessment = assessSoilHazards(waveProp, enhancedShock);

    // Populate enhanced fields on the base result
    baseResult.layerTravelTimes = waveProp.layerTravelTimes;
    baseResult.impedanceMismatchLosses = waveProp.boundaryTransmissions.map(
      t => 1 - t, // Loss = 1 - transmission
    );
    baseResult.totalImpedanceTransmission = waveProp.totalTransmission;
    baseResult.ppvDamageLevel = assessment.ppvDamage?.level ?? null;
  }

  return baseResult;
}

// ═══════════════════════════════════════════════════════════════════════
// 7. LAYER LOOKUP
// ═══════════════════════════════════════════════════════════════════════

/**
 * Find which soil layer exists at a given depth below ground surface.
 *
 * Iterates through layers top-to-bottom, accumulating thickness,
 * and returns the layer whose vertical extent contains the requested depth.
 *
 * @param soil  - Soil profile with ordered layers
 * @param depth - Depth below ground surface (m)
 * @returns The soil layer at the given depth, or null if depth exceeds the profile
 */
export function getLayerAtDepth(
  soil: SoilInput,
  depth: number,
): SoilLayerInput | null {
  if (depth < 0 || soil.layers.length === 0) {
    return null;
  }

  let accumulatedDepth = 0;

  for (const layer of soil.layers) {
    const layerBottom = accumulatedDepth + layer.thickness;

    if (depth >= accumulatedDepth && depth < layerBottom) {
      return layer;
    }

    accumulatedDepth = layerBottom;
  }

  // Beyond the total profile
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// 8. AVERAGE PROPERTIES ALONG PATH
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate depth-weighted average soil properties between two depths.
 *
 * For each layer intersecting the interval [startDepth, endDepth], the
 * property is weighted by the layer's thickness contribution within that
 * interval.  This gives thickness-weighted (not depth-squared) averages,
 * which is appropriate for wave propagation path averaging.
 *
 * @param soil       - Soil profile
 * @param startDepth - Top of interval below ground surface (m)
 * @param endDepth   - Bottom of interval below ground surface (m)
 * @returns Average wave velocity, unit weight, modulus, friction angle, and cohesion
 */
export function calculateAveragePropertiesAlongPath(
  soil: SoilInput,
  startDepth: number,
  endDepth: number,
): {
  averageWaveVelocity: number;
  averageUnitWeight: number;
  averageModulus: number;
  averageFrictionAngle: number;
  averageCohesion: number;
} {
  const defaults = {
    averageWaveVelocity: 0,
    averageUnitWeight: 0,
    averageModulus: 0,
    averageFrictionAngle: 0,
    averageCohesion: 0,
  };

  // Edge cases
  if (soil.layers.length === 0 || endDepth <= startDepth) {
    return defaults;
  }

  const effectiveStart = Math.max(0, startDepth);
  const effectiveEnd = Math.max(effectiveStart, endDepth);

  let sumWaveVelocity = 0;
  let sumUnitWeight = 0;
  let sumModulus = 0;
  let sumFrictionAngle = 0;
  let sumCohesion = 0;
  let totalThickness = 0;

  let accumulatedDepth = 0;

  for (const layer of soil.layers) {
    const layerBottom = accumulatedDepth + layer.thickness;

    // Skip layers entirely above the interval
    if (layerBottom <= effectiveStart) {
      accumulatedDepth = layerBottom;
      continue;
    }

    // Stop if we've passed the interval
    if (accumulatedDepth >= effectiveEnd) {
      break;
    }

    // Compute the overlap between this layer and [effectiveStart, effectiveEnd]
    const overlapTop = Math.max(accumulatedDepth, effectiveStart);
    const overlapBottom = Math.min(layerBottom, effectiveEnd);
    const overlapThickness = Math.max(0, overlapBottom - overlapTop);

    if (overlapThickness > 0) {
      sumWaveVelocity += layer.waveVelocity * overlapThickness;
      sumUnitWeight += layer.unitWeight * overlapThickness;
      sumModulus += layer.modulusOfElasticity * overlapThickness;
      sumFrictionAngle += layer.frictionAngle * overlapThickness;
      sumCohesion += layer.cohesion * overlapThickness;
      totalThickness += overlapThickness;
    }

    accumulatedDepth = layerBottom;
  }

  if (totalThickness <= 0) {
    return defaults;
  }

  return {
    averageWaveVelocity: sumWaveVelocity / totalThickness,
    averageUnitWeight: sumUnitWeight / totalThickness,
    averageModulus: sumModulus / totalThickness,
    averageFrictionAngle: sumFrictionAngle / totalThickness,
    averageCohesion: sumCohesion / totalThickness,
  };
}