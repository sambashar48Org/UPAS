/**
 * UPAS — Result View Model Types
 * Sprint 3B: Pre-computed result display data for ResultsPanel.
 *
 * ResultsPanel reads ONLY these types — never FullAnalysisResult.
 * All color/style/format decisions happen in the ResultAdapter.
 */

// ─── Summary ────────────────────────────────────────────────────
export interface ResultSummaryVM {
  safetyFactor: number;
  protectionLevel: 'safe' | 'marginal' | 'unsafe' | 'critical';
  protectionLabelAr: string;
  isAdequate: boolean;
  governingElement: string;
  governingElementLabelAr: string;
  governingMode: string;
  governingModeLabelAr: string;
  analysisType: string;
  calculatedAt: string;
  statusColor: string;
}

// ─── Blast Results ──────────────────────────────────────────────
export interface BlastResultVM {
  tntEquivalentMass: number;
  scaledDistance: number;
  distance: number;
  peakIncidentPressure: number;
  peakReflectedPressure: number;
  peakDynamicPressure: number;
  positivePhaseDuration: number;
  positivePhaseImpulse: number;
  pressureAtStructure: number;
}

// ─── SSI Results ────────────────────────────────────────────────
export interface SSIResultVM {
  overburdenPressure: number;
  effectiveStress: number;
  soilAttenuationFactor: number;
  pressureAtStructure: number;
  groundShockPPV: number;
  averageWaveVelocity: number;
}

// ─── Structure Response ─────────────────────────────────────────
export interface StructureResponseVM {
  element: 'roof' | 'wall' | 'floor';
  elementLabelAr: string;
  appliedPressure: number;
  dynamicResistance: number;
  safetyFactor: number;
  responseMode: 'elastic' | 'plastic' | 'failure';
  responseModeLabelAr: string;
  maxDisplacement: number;
  supportRotation: number;
  ductilityRatio: number;
  naturalPeriod: number;
  statusColor: string;
}

// ─── Penetration Result ─────────────────────────────────────────
export interface PenetrationResultVM {
  element: 'roof' | 'wall' | 'floor';
  elementLabelAr: string;
  penetrationDepthMm: number;
  isPerforated: boolean;
  isSpalled: boolean;
  perforationThicknessMm: number;
  scabbingThicknessMm: number;
  craterDiameter: number;
  craterDepth: number;
  statusColor: string;
  statusLabelAr: string;
}

// ─── Warning ────────────────────────────────────────────────────
export interface WarningVM {
  code: string;
  messageAr: string;
  messageEn: string;
  severity: 'info' | 'warning' | 'critical';
  severityColor: string;
  severityLabelAr: string;
}

// ─── Complete Result View Model ─────────────────────────────────
export interface ResultViewModel {
  summary: ResultSummaryVM;
  blast: BlastResultVM | null;
  ssi: SSIResultVM | null;
  structureResponses: StructureResponseVM[];
  penetrationResults: PenetrationResultVM[];
  warnings: WarningVM[];
}