/**
 * Sprint 3D: Soil Hazard Assessment
 *
 * Independent assessment module — does NOT modify calculations/results/index.ts.
 * Evaluates soil-specific hazards from wave propagation and ground shock results.
 *
 * Responsibilities:
 * - PPV damage assessment (TM 5-855-1 thresholds)
 * - Impedance mismatch warnings
 * - Liquefaction placeholder (deferred to future sprint)
 *
 * Architecture: This module is called by soil/index.ts (calculation layer)
 * and produces SoilAssessmentWarnings — NOT EngineeringWarnings.
 * The bridge to EngineeringWarnings (for FullAnalysisResult) will happen
 * in a future sprint via an adapter, NOT by modifying results/index.ts.
 */

import type {
  WavePropagationResult,
  EnhancedGroundShockResult,
  SoilAssessment,
  SoilAssessmentWarning,
  PPVDamageAssessment,
} from '../types';
import { PPV_DAMAGE_THRESHOLDS, IMPEDANCE_MISMATCH_WARNING_RATIO } from '../constants';

// ─── PPV Damage Assessment ──────────────────────────────────────

/**
 * Assess structural damage level based on Peak Particle Velocity.
 *
 * Thresholds (TM 5-855-1 Table 5-1, adapted for underground structures):
 *   negligible: PPV < 0.05 m/s
 *   minor:      PPV < 0.20 m/s
 *   moderate:   PPV < 0.50 m/s
 *   severe:     PPV < 1.00 m/s
 *   heavy:      PPV >= 1.00 m/s
 *
 * @param ppv - Peak particle velocity (m/s)
 * @returns PPV damage assessment
 */
export function assessPPVDamage(ppv: number): PPVDamageAssessment {
  if (ppv < PPV_DAMAGE_THRESHOLDS.negligible.maxPPV) {
    return {
      level: 'negligible',
      threshold: PPV_DAMAGE_THRESHOLDS.negligible.maxPPV,
      assessedPPV: ppv,
      descriptionAr: PPV_DAMAGE_THRESHOLDS.negligible.descriptionAr,
      descriptionEn: PPV_DAMAGE_THRESHOLDS.negligible.descriptionEn,
    };
  }
  if (ppv < PPV_DAMAGE_THRESHOLDS.minor.maxPPV) {
    return {
      level: 'minor',
      threshold: PPV_DAMAGE_THRESHOLDS.minor.maxPPV,
      assessedPPV: ppv,
      descriptionAr: PPV_DAMAGE_THRESHOLDS.minor.descriptionAr,
      descriptionEn: PPV_DAMAGE_THRESHOLDS.minor.descriptionEn,
    };
  }
  if (ppv < PPV_DAMAGE_THRESHOLDS.moderate.maxPPV) {
    return {
      level: 'moderate',
      threshold: PPV_DAMAGE_THRESHOLDS.moderate.maxPPV,
      assessedPPV: ppv,
      descriptionAr: PPV_DAMAGE_THRESHOLDS.moderate.descriptionAr,
      descriptionEn: PPV_DAMAGE_THRESHOLDS.moderate.descriptionEn,
    };
  }
  if (ppv < PPV_DAMAGE_THRESHOLDS.severe.maxPPV) {
    return {
      level: 'severe',
      threshold: PPV_DAMAGE_THRESHOLDS.severe.maxPPV,
      assessedPPV: ppv,
      descriptionAr: PPV_DAMAGE_THRESHOLDS.severe.descriptionAr,
      descriptionEn: PPV_DAMAGE_THRESHOLDS.severe.descriptionEn,
    };
  }
  return {
    level: 'heavy',
    threshold: PPV_DAMAGE_THRESHOLDS.heavy.maxPPV,
    assessedPPV: ppv,
    descriptionAr: PPV_DAMAGE_THRESHOLDS.heavy.descriptionAr,
    descriptionEn: PPV_DAMAGE_THRESHOLDS.heavy.descriptionEn,
  };
}

// ─── Impedance Mismatch Analysis ───────────────────────────────

/**
 * Find the maximum impedance ratio across all layer boundaries.
 *
 * @param impedances - Per-layer acoustic impedances
 * @returns Maximum ratio Z_{i+1}/Z_i across boundaries
 */
export function findMaxImpedanceRatio(impedances: number[]): number {
  let maxRatio = 1.0;
  for (let i = 0; i < impedances.length - 1; i++) {
    if (impedances[i] > 0) {
      const ratio = impedances[i + 1] / impedances[i];
      // Track the larger of ratio or 1/ratio (worst case direction)
      maxRatio = Math.max(maxRatio, ratio, 1 / ratio);
    }
  }
  return maxRatio;
}

// ─── Main Assessment Function ───────────────────────────────────

/**
 * Perform a complete soil hazard assessment.
 *
 * Independent from calculations/results/index.ts — produces its own
 * SoilAssessmentWarning objects.
 *
 * @param wavePropagation - Wave propagation result (may be null for legacy mode)
 * @param groundShock - Enhanced ground shock result (may be null for legacy mode)
 * @returns Complete soil assessment
 */
export function assessSoilHazards(
  wavePropagation: WavePropagationResult | null,
  groundShock: EnhancedGroundShockResult | null,
): SoilAssessment {
  const warnings: SoilAssessmentWarning[] = [];

  // ─── PPV Damage Assessment ───
  let ppvDamage: PPVDamageAssessment | null = null;
  if (groundShock && groundShock.peakParticleVelocity > 0) {
    ppvDamage = assessPPVDamage(groundShock.peakParticleVelocity);

    if (ppvDamage.level === 'severe' || ppvDamage.level === 'heavy') {
      warnings.push({
        code: 'SOIL_HIGH_PPV',
        messageAr: `سرعة الجسيمات القصوى عالية (${groundShock.peakParticleVelocity.toFixed(2)} m/s) — ${ppvDamage.descriptionAr}`,
        messageEn: `High PPV (${groundShock.peakParticleVelocity.toFixed(2)} m/s) — ${ppvDamage.descriptionEn}`,
        severity: ppvDamage.level === 'heavy' ? 'critical' : 'warning',
        layerIndex: null,
      });
    }
  }

  // ─── Impedance Mismatch Warnings ───
  let maxImpedanceRatio = 1.0;
  if (wavePropagation && wavePropagation.layerImpedances.length > 1) {
    maxImpedanceRatio = findMaxImpedanceRatio(wavePropagation.layerImpedances);

    if (maxImpedanceRatio > IMPEDANCE_MISMATCH_WARNING_RATIO) {
      // Find which boundary has the max ratio
      for (let i = 0; i < wavePropagation.layerImpedances.length - 1; i++) {
        const Z1 = wavePropagation.layerImpedances[i];
        const Z2 = wavePropagation.layerImpedances[i + 1];
        if (Z1 > 0) {
          const ratio = Math.max(Z2 / Z1, Z1 / Z2);
          if (ratio > IMPEDANCE_MISMATCH_WARNING_RATIO) {
            warnings.push({
              code: 'SOIL_IMPEDANCE_MISMATCH',
              messageAr: `عدم توافق معاوقة صوتية كبير عند حد الطبقة ${i + 1} (نسبة ${ratio.toFixed(1)}) — انعكاسات ضغط محتملة`,
              messageEn: `Large acoustic impedance mismatch at layer ${i + 1} boundary (ratio ${ratio.toFixed(1)}) — pressure reflection likely`,
              severity: ratio > 10 ? 'critical' : 'warning',
              layerIndex: i,
            });
          }
        }
      }
    }
  }

  return {
    ppvDamage,
    maxImpedanceRatio,
    liquefactionPotential: 'not_assessed',
    warnings,
  };
}