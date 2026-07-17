/**
 * Sprint 3D: Multi-Layer Blast Wave Propagation
 *
 * Calculates how a blast wave propagates through a layered soil profile:
 * - Per-layer travel time (thickness / Vs)
 * - Acoustic impedance at each layer (Z = ρ × Vs)
 * - Impedance mismatch reflection/transmission at layer boundaries
 * - Water table effect on shear wave velocity
 * - Cumulative attenuation through all layers
 *
 * References:
 * - TM 5-855-1 (Fundamentals of Protective Design for Conventional Weapons)
 * - Drake & Little (1983) — Ground shock from buried explosions
 * - Kolsky (1963) — Stress Waves in Solids (impedance mismatch theory)
 */

import type { SoilInput, WavePropagationResult } from '../types';
import { WATER_UNIT_WEIGHT, GRAVITY } from '../constants';

// ─── Acoustic Impedance ───────────────────────────────────────────

/**
 * Calculate acoustic impedance Z = ρ × Vs for a soil layer.
 *
 * @param unitWeight - Unit weight γ (kN/m³)
 * @param waveVelocity - Shear wave velocity Vs (m/s)
 * @returns Acoustic impedance (kg/m²·s)
 */
export function calculateAcousticImpedance(unitWeight: number, waveVelocity: number): number {
  // ρ = γ / g  (kN/m³ → kg/m³)
  const density = (unitWeight * 1000) / GRAVITY;
  return density * waveVelocity;
}

/**
 * Calculate effective shear wave velocity in a saturated layer.
 * Below the water table, effective stress decreases, reducing Vs.
 *
 * Simplified model: Vs_sat ≈ Vs × (σ'/σ_total)^0.25
 * For fully saturated soil with no effective stress reduction factor,
 * we apply a conservative 15% reduction per TM 5-855-1 guidance.
 *
 * @param Vs - Original shear wave velocity (m/s)
 * @param isBelowWaterTable - Whether the layer midpoint is below the water table
 * @returns Adjusted shear wave velocity (m/s)
 */
export function adjustVsForWaterTable(Vs: number, isBelowWaterTable: boolean): number {
  if (!isBelowWaterTable) return Vs;
  // Conservative 15% reduction for saturated conditions
  return Vs * 0.85;
}

// ─── Impedance Mismatch at Boundary ──────────────────────────────

/**
 * Calculate the transmission coefficient at an interface between
 * two soil layers with different acoustic impedances.
 *
 * Transmission coefficient: T = 2 × Z₁ / (Z₁ + Z₂)
 * Reflection coefficient:  R = (Z₂ - Z₁) / (Z₂ + Z₁)
 *
 * When Z₂ > Z₁ (wave going into stiffer material), pressure
 * is amplified at the boundary (R > 0).
 * When Z₂ < Z₁ (wave going into softer material), pressure
 * is reduced (R < 0), but tensile reflections can cause spalling.
 *
 * @param Z1 - Acoustic impedance of incident layer (kg/m²·s)
 * @param Z2 - Acoustic impedance of transmitted layer (kg/m²·s)
 * @returns Transmission coefficient (0–2), can exceed 1.0 at stiff boundaries
 */
export function calculateTransmissionCoefficient(Z1: number, Z2: number): number {
  if (Z1 + Z2 === 0) return 1.0;
  return (2 * Z1) / (Z1 + Z2);
}

// ─── Main Wave Propagation Function ───────────────────────────────

/**
 * Calculate multi-layer blast wave propagation through a soil profile.
 *
 * Iterates through each soil layer along the wave path [startDepth, endDepth],
 * computing:
 * 1. Travel time per layer (adjusted for water table)
 * 2. Acoustic impedance per layer
 * 3. Transmission coefficient at each layer boundary
 * 4. Cumulative attenuation (geometric spreading + impedance losses)
 *
 * @param soil - Soil profile with ordered layers
 * @param startDepth - Top of wave path (m, typically 0 = ground surface)
 * @param endDepth - Bottom of wave path (m, typically structure crown depth)
 * @returns Complete wave propagation result
 */
export function calculateWavePropagation(
  soil: SoilInput,
  startDepth: number,
  endDepth: number,
): WavePropagationResult {
  // Edge cases
  if (soil.layers.length === 0 || endDepth <= startDepth) {
    return emptyWavePropagationResult();
  }

  const effectiveStart = Math.max(0, startDepth);
  const effectiveEnd = Math.max(effectiveStart, endDepth);

  const layerTravelTimes: number[] = [];
  const layerImpedances: number[] = [];
  const boundaryTransmissions: number[] = [];
  const layerAttenuations: number[] = [];

  let accumulatedDepth = 0;
  let totalTravelTime = 0;
  let cumulativeTransmission = 1.0;

  for (let i = 0; i < soil.layers.length; i++) {
    const layer = soil.layers[i];
    const layerBottom = accumulatedDepth + layer.thickness;

    // Skip layers entirely above the path
    if (layerBottom <= effectiveStart) {
      accumulatedDepth = layerBottom;
      continue;
    }

    // Stop if past the path
    if (accumulatedDepth >= effectiveEnd) {
      break;
    }

    // Compute overlap with [effectiveStart, effectiveEnd]
    const overlapTop = Math.max(accumulatedDepth, effectiveStart);
    const overlapBottom = Math.min(layerBottom, effectiveEnd);
    const overlapThickness = Math.max(0, overlapBottom - overlapTop);

    if (overlapThickness <= 0) {
      accumulatedDepth = layerBottom;
      continue;
    }

    // Check if layer midpoint is below water table
    const layerMidpoint = (overlapTop + overlapBottom) / 2;
    const isBelowWT = soil.waterTableDepth !== null && layerMidpoint > soil.waterTableDepth;

    // Adjusted Vs for water table
    const Vs = adjustVsForWaterTable(layer.waveVelocity, isBelowWT);

    // Travel time through this layer (ms)
    const travelTime = Vs > 0 ? (overlapThickness / Vs) * 1000 : 0;
    layerTravelTimes.push(travelTime);
    totalTravelTime += travelTime;

    // Acoustic impedance
    const impedance = calculateAcousticImpedance(layer.unitWeight, Vs);
    layerImpedances.push(impedance);

    // Impedance mismatch at boundary (between this layer and previous)
    if (layerImpedances.length > 1) {
      const Z_prev = layerImpedances[layerImpedances.length - 2];
      const Z_curr = impedance;
      const T = calculateTransmissionCoefficient(Z_prev, Z_curr);
      boundaryTransmissions.push(T);
      cumulativeTransmission *= T;
    }

    // Per-layer geometric attenuation: 1 / (1 + d/R_ref)^n
    // Using layer-specific attenuation exponent (category-based from constants)
    // This is computed per-layer but the cumulative effect is tracked
    const n = getLayerAttenuationExponent(layer.category);
    const R_ref = 1.0;
    const layerAttenuation = 1 / Math.pow(1 + overlapThickness / R_ref, n);
    layerAttenuations.push(layerAttenuation);

    accumulatedDepth = layerBottom;
  }

  // Total cumulative attenuation = geometric spreading × impedance transmission
  // Geometric spreading over total path
  const totalPathLength = effectiveEnd - effectiveStart;
  const avgN = getAverageAttenuationExponent(soil, effectiveStart, effectiveEnd);
  const geometricAttenuation = 1 / Math.pow(1 + totalPathLength, avgN);
  const cumulativeAttenuation = geometricAttenuation * cumulativeTransmission;

  return {
    layerTravelTimes,
    layerImpedances,
    boundaryTransmissions,
    totalTransmission: cumulativeTransmission,
    totalTravelTime,
    cumulativeAttenuation,
    layerAttenuations,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Get attenuation exponent for a soil category.
 * Falls back to cohesiveless if category is unrecognized.
 */
function getLayerAttenuationExponent(category: string): number {
  const exponents: Record<string, number> = {
    cohesiveless: 1.5,
    cohesive: 1.3,
    rock: 1.8,
  };
  return exponents[category] ?? exponents['cohesiveless'];
}

/**
 * Get thickness-weighted average attenuation exponent along a path.
 */
function getAverageAttenuationExponent(soil: SoilInput, startDepth: number, endDepth: number): number {
  let sum = 0;
  let totalThickness = 0;
  let acc = 0;

  for (const layer of soil.layers) {
    const bottom = acc + layer.thickness;
    if (bottom <= startDepth) { acc = bottom; continue; }
    if (acc >= endDepth) break;

    const oTop = Math.max(acc, startDepth);
    const oBot = Math.min(bottom, endDepth);
    const oThick = Math.max(0, oBot - oTop);

    if (oThick > 0) {
      sum += getLayerAttenuationExponent(layer.category) * oThick;
      totalThickness += oThick;
    }
    acc = bottom;
  }

  return totalThickness > 0 ? sum / totalThickness : 1.5;
}

function emptyWavePropagationResult(): WavePropagationResult {
  return {
    layerTravelTimes: [],
    layerImpedances: [],
    boundaryTransmissions: [],
    totalTransmission: 1.0,
    totalTravelTime: 0,
    cumulativeAttenuation: 1.0,
    layerAttenuations: [],
  };
}