/**
 * UPAS — Analysis Result Domain Model
 * Stores results from blast/penetration calculations
 * Populated by the Calculation Engine (Sprint 2+)
 */

import { v4 as uuidv4 } from 'uuid';
import { AnalysisType } from '../types';
import type { EngineeringValue } from '../types';

export interface AnalysisResult {
  id: string;
  projectId: string;
  name: string;

  analysisType: AnalysisType;

  // Input references
  threatId: string;
  bombId: string;
  structureId: string;
  soilProfileId: string;

  // Timestamps
  calculatedAt: string;

  // ─── Blast Results (populated when analysisType = blast or combined) ──
  blastResults: BlastResults | null;

  // ─── Penetration Results (populated when analysisType = penetration or combined) ──
  penetrationResults: PenetrationResults | null;

  // ─── Overall Assessment ─────────────────────────────────────────────
  overallSafetyFactor: number | null;
  protectionLevel: ProtectionLevel;
  recommendations: string[];
}

// ─── Blast Results ────────────────────────────────────────────────
export interface BlastResults {
  peakIncidentPressure: EngineeringValue | null; // Pso (kPa)
  peakReflectedPressure: EngineeringValue | null; // Pr (kPa)
  peakDynamicPressure: EngineeringValue | null; // q (kPa)
  positivePhaseDuration: EngineeringValue | null; // td (ms)
  positivePhaseImpulse: EngineeringValue | null; // Is (kPa·ms)

  // Structure response
  structureResponse: string; // 'elastic' | 'plastic' | 'failure'
  maxDisplacement: EngineeringValue | null;
  supportRotation: number | null; // degrees

  // Pressure at structure surface
  pressureAtSurface: EngineeringValue | null;
}

// ─── Penetration Results ──────────────────────────────────────────
export interface PenetrationResults {
  penetrationDepth: EngineeringValue | null; // X (m)
  perforationThickness: EngineeringValue | null; // minimum thickness to prevent perforation
  spallingThickness: EngineeringValue | null; // scabbing thickness
  isPerforated: boolean | null;
  isSpalled: boolean | null;

  // Crater dimensions (in soil)
  craterDiameter: EngineeringValue | null;
  craterDepth: EngineeringValue | null;
}

// ─── Protection Level ─────────────────────────────────────────────
export type ProtectionLevel =
  | 'safe'
  | 'marginal'
  | 'unsafe'
  | 'critical'
  | 'pending'; // not yet calculated

/**
 * Factory: create empty analysis result (pre-calculation)
 */
export function createAnalysisResult(partial?: Partial<AnalysisResult>): AnalysisResult {
  return {
    id: uuidv4(),
    projectId: partial?.projectId ?? '',
    name: partial?.name ?? 'تحليل جديد',
    analysisType: partial?.analysisType ?? AnalysisType.Blast,
    threatId: partial?.threatId ?? '',
    bombId: partial?.bombId ?? '',
    structureId: partial?.structureId ?? '',
    soilProfileId: partial?.soilProfileId ?? '',
    calculatedAt: partial?.calculatedAt ?? '',
    blastResults: partial?.blastResults ?? null,
    penetrationResults: partial?.penetrationResults ?? null,
    overallSafetyFactor: partial?.overallSafetyFactor ?? null,
    protectionLevel: partial?.protectionLevel ?? 'pending',
    recommendations: partial?.recommendations ?? [],
  };
}