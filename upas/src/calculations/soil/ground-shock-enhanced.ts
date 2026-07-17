/**
 * Sprint 3D: Enhanced Multi-Layer Ground Shock
 *
 * Improves upon the legacy Drake & Little ground shock model by:
 * 1. Using per-type (not per-category) K,n coefficients from soil-types.json
 * 2. Interpolating K,n along the actual wave path (thickness-weighted)
 * 3. Computing PPV decay through each layer individually
 * 4. Tracking arrival time at each layer boundary
 *
 * The legacy model uses only the top layer's category to select K,n.
 * This module uses the enhanced coefficients and path-weighted interpolation.
 *
 * References:
 * - Drake & Little (1983) — Ground shock from buried explosions
 * - TM 5-855-1, Chapter 5
 * - Wu et al. (1995) — PPV attenuation in layered media
 */

import type {
  SoilInput,
  BlastParameters,
  EnhancedGroundShockResult,
  WavePropagationResult,
} from '../types';
import { TNT_DENSITY } from '../constants';

// ─── Path-Interpolated Coefficients ──────────────────────────────

/**
 * Calculate thickness-weighted average K and n coefficients along
 * the wave path through the soil profile.
 *
 * Uses the ENHANCED per-type coefficients from soil-types.json
 * (which are more specific than the legacy 3-category values).
 *
 * @param soil - Soil profile with enhanced groundShockCoefficients per layer
 * @param startDepth - Top of wave path (m)
 * @param endDepth - Bottom of wave path (m)
 * @returns Interpolated K, n values
 */
export function interpolateGroundShockCoefficients(
  soil: SoilInput,
  startDepth: number,
  endDepth: number,
): { K: number; n: number } {
  if (soil.layers.length === 0 || endDepth <= startDepth) {
    return { K: 500, n: 1.5 };
  }

  const effectiveStart = Math.max(0, startDepth);
  const effectiveEnd = Math.max(effectiveStart, endDepth);

  let sumK = 0;
  let sumN = 0;
  let totalThickness = 0;
  let accumulatedDepth = 0;

  for (const layer of soil.layers) {
    const layerBottom = accumulatedDepth + layer.thickness;

    if (layerBottom <= effectiveStart) {
      accumulatedDepth = layerBottom;
      continue;
    }

    if (accumulatedDepth >= effectiveEnd) {
      break;
    }

    const overlapTop = Math.max(accumulatedDepth, effectiveStart);
    const overlapBottom = Math.min(layerBottom, effectiveEnd);
    const overlapThickness = Math.max(0, overlapBottom - overlapTop);

    if (overlapThickness > 0) {
      // Use enhanced coefficients if available
      const coeffs = layer.groundShockCoefficients?.enhanced;
      const K = coeffs?.K ?? 500;
      const n = coeffs?.n ?? 1.5;

      sumK += K * overlapThickness;
      sumN += n * overlapThickness;
      totalThickness += overlapThickness;
    }

    accumulatedDepth = layerBottom;
  }

  if (totalThickness <= 0) {
    return { K: 500, n: 1.5 };
  }

  return {
    K: sumK / totalThickness,
    n: sumN / totalThickness,
  };
}

// ─── Enhanced Ground Shock ──────────────────────────────────────

/**
 * Calculate enhanced ground shock using path-interpolated coefficients
 * and per-layer PPV decay.
 *
 * Process:
 * 1. Interpolate K, n along the wave path using enhanced per-type data
 * 2. Compute PPV at the source using interpolated K, n (Drake & Little)
 * 3. For each layer, compute additional PPV decay using the layer's
 *    damping ratio and geometric spreading
 * 4. Apply impedance mismatch transmission losses from wave propagation
 * 5. Track arrival time at each layer boundary
 *
 * @param blastParams - Pre-computed blast parameters
 * @param soil - Soil profile
 * @param distance - Total travel distance (m)
 * @param wavePropagation - Pre-computed wave propagation result (for impedance data)
 * @returns Enhanced ground shock result
 */
export function calculateEnhancedGroundShock(
  blastParams: BlastParameters,
  soil: SoilInput,
  distance: number,
  wavePropagation: WavePropagationResult | null,
): EnhancedGroundShockResult {
  // Degenerate cases
  if (distance <= 0 || soil.layers.length === 0 || blastParams.tntEquivalentMass <= 0) {
    return emptyEnhancedGroundShock();
  }

  // 1. Path-interpolated K, n (using enhanced coefficients)
  const pathDepth = Math.min(distance, soil.totalDepth);
  const { K: interpK, n: interpN } = interpolateGroundShockCoefficients(
    soil, 0, pathDepth,
  );

  // 2. Drake & Little PPV at the target using interpolated coefficients
  const W = blastParams.tntEquivalentMass;
  const R = Math.max(0.1, distance);
  const scaledDistance = Math.pow(W, 1 / 3) / R;
  let ppv = interpK * Math.pow(scaledDistance, interpN);

  // 3. Apply impedance mismatch transmission losses if available
  const impedanceTransmission = wavePropagation?.totalTransmission ?? 1.0;
  ppv *= impedanceTransmission;

  // 4. Apply damping-weighted attenuation through layers
  // Each layer's damping reduces PPV: PPV_out = PPV_in × (1 - ξ × d/L)
  // where ξ = damping ratio, d = layer thickness, L = total path
  const effectiveEnd = Math.min(pathDepth, soil.totalDepth);
  const totalPath = Math.max(effectiveEnd, 0.01);

  let accumulatedDepth = 0;
  const perLayerPPV: number[] = [];
  const perLayerArrivalTimes: number[] = [];
  let currentPPV = ppv;
  let cumulativeTime = 0;

  // Average Vs for arrival time calculation
  const avgVs = calculatePathAverageVs(soil, 0, effectiveEnd);

  for (let i = 0; i < soil.layers.length; i++) {
    const layer = soil.layers[i];
    const layerBottom = accumulatedDepth + layer.thickness;

    if (layerBottom <= 0) {
      accumulatedDepth = layerBottom;
      continue;
    }

    if (accumulatedDepth >= effectiveEnd) {
      break;
    }

    const overlapTop = Math.max(accumulatedDepth, 0);
    const overlapBottom = Math.min(layerBottom, effectiveEnd);
    const overlapThickness = Math.max(0, overlapBottom - overlapTop);

    if (overlapThickness > 0) {
      // Damping attenuation for this layer
      const dampingLoss = 1 - (layer.dampingRatio * overlapThickness / totalPath);
      currentPPV *= Math.max(dampingLoss, 0.9); // Floor at 90% per layer

      // Travel time for this layer's contribution
      const Vs = layer.waveVelocity;
      const layerTime = Vs > 0 ? (overlapThickness / Vs) * 1000 : 0;
      cumulativeTime += layerTime;

      perLayerPPV.push(currentPPV);
      perLayerArrivalTimes.push(cumulativeTime);
    }

    accumulatedDepth = layerBottom;
  }

  // 5. Arrival time
  const totalArrivalTime = avgVs > 0 ? (distance / avgVs) * 1000 : 0;

  // 6. Dominant frequency (same approach as legacy)
  const chargeVolume = (3 * W) / (4 * Math.PI * TNT_DENSITY);
  const chargeRadius = Math.pow(chargeVolume, 1 / 3);
  let frequency = chargeRadius > 0 ? avgVs / (2 * chargeRadius) : 0;
  frequency = Math.max(5, Math.min(100, frequency));

  // 7. Duration
  const duration = Math.max(10, 3 / frequency * 1000);

  return {
    perLayerPPV,
    peakParticleVelocity: ppv,
    perLayerArrivalTimes,
    totalArrivalTime,
    frequency,
    duration,
    interpolatedK: interpK,
    interpolatedN: interpN,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Calculate thickness-weighted average shear wave velocity along a path.
 * Accounts for water table reduction.
 */
function calculatePathAverageVs(soil: SoilInput, startDepth: number, endDepth: number): number {
  if (soil.layers.length === 0 || endDepth <= startDepth) return 200;

  let sum = 0;
  let total = 0;
  let acc = 0;

  for (const layer of soil.layers) {
    const bottom = acc + layer.thickness;
    if (bottom <= startDepth) { acc = bottom; continue; }
    if (acc >= endDepth) break;

    const oTop = Math.max(acc, startDepth);
    const oBot = Math.min(bottom, endDepth);
    const oThick = Math.max(0, oBot - oTop);

    if (oThick > 0) {
      // Water table adjustment (conservative 15% reduction)
      const mid = (oTop + oBot) / 2;
      const belowWT = soil.waterTableDepth !== null && mid > soil.waterTableDepth;
      const Vs = belowWT ? layer.waveVelocity * 0.85 : layer.waveVelocity;
      sum += Vs * oThick;
      total += oThick;
    }
    acc = bottom;
  }

  return total > 0 ? sum / total : 200;
}

function emptyEnhancedGroundShock(): EnhancedGroundShockResult {
  return {
    perLayerPPV: [],
    peakParticleVelocity: 0,
    perLayerArrivalTimes: [],
    totalArrivalTime: 0,
    frequency: 0,
    duration: 10,
    interpolatedK: 500,
    interpolatedN: 1.5,
  };
}