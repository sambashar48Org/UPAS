/**
 * UPAS — Result Adapter
 * Sprint 3B: Converts FullAnalysisResult → ResultViewModel
 *
 * This is the ONLY place where engineering values → display style mapping happens.
 * ResultsPanel reads ResultViewModel — never FullAnalysisResult.
 */

import type { FullAnalysisResult } from '../calculations/types';
import type {
  ResultViewModel,
  ResultSummaryVM,
  BlastResultVM,
  SSIResultVM,
  StructureResponseVM,
  PenetrationResultVM,
  WarningVM,
} from './ResultViewModel';

// ─── Style Constants ────────────────────────────────────────────

const PROTECTION_LABELS: Record<string, string> = {
  safe: 'آمن',
  marginal: 'حدي',
  unsafe: 'غير آمن',
  critical: 'حرج',
};

const PROTECTION_COLORS: Record<string, string> = {
  safe: '#22c55e',
  marginal: '#eab308',
  unsafe: '#f97316',
  critical: '#dc2626',
};

const ELEMENT_LABELS: Record<string, string> = {
  roof: 'السقف',
  wall: 'الجدران',
  floor: 'الأرضية',
};

const RESPONSE_LABELS: Record<string, string> = {
  elastic: 'مرن',
  plastic: 'بلاستيكي',
  failure: 'فشل',
};

const RESPONSE_COLORS: Record<string, string> = {
  elastic: '#22c55e',
  plastic: '#eab308',
  failure: '#dc2626',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f97316',
  critical: '#dc2626',
};

const SEVERITY_LABELS: Record<string, string> = {
  info: 'معلومات',
  warning: 'تحذير',
  critical: 'حرج',
};

const GOVERNING_ELEMENT_LABELS: Record<string, string> = {
  roof: 'السقف',
  wall: 'الجدران',
  floor: 'الأرضية',
};

const GOVERNING_MODE_LABELS: Record<string, string> = {
  blast: 'انفجار',
  penetration: 'اختراق',
};

// ─── Main Adapter ───────────────────────────────────────────────

export function buildResultViewModel(result: FullAnalysisResult): ResultViewModel {
  return {
    summary: buildSummary(result),
    blast: result.blast.parameters ? buildBlast(result) : null,
    ssi: result.blast.soilInteraction ? buildSSI(result) : null,
    structureResponses: buildStructureResponses(result),
    penetrationResults: buildPenetrationResults(result),
    warnings: buildWarnings(result.warnings),
  };
}

// ─── Summary ────────────────────────────────────────────────────

function buildSummary(result: FullAnalysisResult): ResultSummaryVM {
  const level = result.overall.protectionLevel;
  return {
    safetyFactor: result.overall.minSafetyFactor,
    protectionLevel: level,
    protectionLabelAr: PROTECTION_LABELS[level] ?? level,
    isAdequate: result.overall.isAdequate,
    governingElement: result.overall.governingElement,
    governingElementLabelAr: GOVERNING_ELEMENT_LABELS[result.overall.governingElement] ?? result.overall.governingElement,
    governingMode: result.overall.governingMode,
    governingModeLabelAr: GOVERNING_MODE_LABELS[result.overall.governingMode] ?? result.overall.governingMode,
    analysisType: result.analysisType,
    calculatedAt: result.calculatedAt,
    statusColor: PROTECTION_COLORS[level] ?? '#94a3b8',
  };
}

// ─── Blast ──────────────────────────────────────────────────────

function buildBlast(result: FullAnalysisResult): BlastResultVM {
  const bp = result.blast.parameters!;
  return {
    tntEquivalentMass: bp.tntEquivalentMass,
    scaledDistance: bp.scaledDistance,
    distance: bp.distance,
    peakIncidentPressure: bp.peakIncidentPressure,
    peakReflectedPressure: bp.peakReflectedPressure,
    peakDynamicPressure: bp.peakDynamicPressure,
    positivePhaseDuration: bp.positivePhaseDuration,
    positivePhaseImpulse: bp.positivePhaseImpulse,
    pressureAtStructure: result.blast.soilInteraction?.pressureAtStructure ?? 0,
  };
}

// ─── SSI ────────────────────────────────────────────────────────

function buildSSI(result: FullAnalysisResult): SSIResultVM {
  const ssi = result.blast.soilInteraction!;
  return {
    overburdenPressure: ssi.overburdenPressure,
    effectiveStress: ssi.effectiveStress,
    soilAttenuationFactor: ssi.soilAttenuationFactor,
    pressureAtStructure: ssi.pressureAtStructure,
    groundShockPPV: ssi.groundShockPPV,
    averageWaveVelocity: ssi.averageWaveVelocity,
  };
}

// ─── Structure Responses ────────────────────────────────────────

function buildStructureResponses(result: FullAnalysisResult): StructureResponseVM[] {
  const responses: StructureResponseVM[] = [];
  const elements: Array<'roof' | 'wall' | 'floor'> = ['roof', 'wall', 'floor'];
  const data: Record<string, typeof result.blast.roofResponse> = {
    roof: result.blast.roofResponse,
    wall: result.blast.wallResponse,
    floor: result.blast.floorResponse,
  };

  for (const elem of elements) {
    const resp = data[elem];
    if (!resp) continue;
    responses.push({
      element: elem,
      elementLabelAr: ELEMENT_LABELS[elem],
      appliedPressure: resp.appliedPressure,
      dynamicResistance: resp.dynamicResistance,
      safetyFactor: resp.safetyFactor,
      responseMode: resp.responseMode,
      responseModeLabelAr: RESPONSE_LABELS[resp.responseMode] ?? resp.responseMode,
      maxDisplacement: resp.maxDisplacement,
      supportRotation: resp.supportRotation,
      ductilityRatio: resp.ductilityRatio,
      naturalPeriod: resp.naturalPeriod,
      statusColor: RESPONSE_COLORS[resp.responseMode] ?? '#94a3b8',
    });
  }

  return responses;
}

// ─── Penetration Results ────────────────────────────────────────

function buildPenetrationResults(result: FullAnalysisResult): PenetrationResultVM[] {
  const results: PenetrationResultVM[] = [];
  const elements: Array<'roof' | 'wall' | 'floor'> = ['roof', 'wall', 'floor'];
  const data: Record<string, typeof result.penetration.roofPenetration> = {
    roof: result.penetration.roofPenetration,
    wall: result.penetration.wallPenetration,
    floor: result.penetration.floorPenetration,
  };

  for (const elem of elements) {
    const pen = data[elem];
    if (!pen) continue;
    const statusColor = pen.isPerforated ? '#dc2626' : pen.isSpalled ? '#f97316' : '#22c55e';
    const statusLabel = pen.isPerforated ? 'اختراق كامل' : pen.isSpalled ? 'تقشر' : 'آمن';
    results.push({
      element: elem,
      elementLabelAr: ELEMENT_LABELS[elem],
      penetrationDepthMm: pen.penetrationDepthStructure * 1000,
      isPerforated: pen.isPerforated,
      isSpalled: pen.isSpalled,
      perforationThicknessMm: pen.perforationThickness * 1000,
      scabbingThicknessMm: pen.scabbingThickness * 1000,
      craterDiameter: pen.craterDiameter,
      craterDepth: pen.craterDepth,
      statusColor,
      statusLabelAr: statusLabel,
    });
  }

  return results;
}

// ─── Warnings ───────────────────────────────────────────────────

function buildWarnings(warnings: FullAnalysisResult['warnings']): WarningVM[] {
  return warnings.map(w => ({
    code: w.code,
    messageAr: w.messageAr,
    messageEn: w.messageEn,
    severity: w.severity,
    severityColor: SEVERITY_COLORS[w.severity] ?? '#94a3b8',
    severityLabelAr: SEVERITY_LABELS[w.severity] ?? w.severity,
  }));
}