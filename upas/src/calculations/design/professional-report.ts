/**
 * UPAS — Professional Engineering Report Generator
 * Phase 5C-2: Transforms design results into a structured professional report
 *
 * This module produces READ-ONLY presentation data from frozen engine outputs.
 * No calculations performed — only data extraction and formatting.
 *
 * Architecture Rule:
 *   This file READS from DesignResult, FullAnalysisResult, and Phase 5B registries.
 *   It NEVER calls any design engine function or modifies any frozen data.
 *
 * Report Sections (per user spec):
 *   1. Cover Page — project info, date, status
 *   2. Design Basis — from design-assumptions.ts
 *   3. Threat Summary — TNT, standoff, detonation
 *   4. Blast Parameters — pressures, duration, impulse
 *   5. Structural Response — SDOF trace per element
 *   6. Design Results — thickness, reinforcement, SF per element
 *   7. Verification Matrix — 4×3 colored status grid
 *   8. Critical Elements — governing element detail
 *   9. Warnings / Limitations
 *   10. Equation References — count + categories
 *   11. Audit Trace — link to full audit package
 */

import type { DesignInput, DesignResult, ElementDesignResult, ElementVerificationResult } from './types';
import type { FullAnalysisResult } from '../types';
import { DESIGN_ASSUMPTIONS, getAssumptionsByCategory, getAssumptionsByImpact } from './design-assumptions';
import { EQUATION_REGISTRY, getEquationCategories, getEquationIdSet } from './equation-registry';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Verification cell in the matrix */
export interface VerificationCell {
  check: string;
  checkEn: string;
  roof: boolean;
  wall: boolean;
  floor: boolean;
}

/** Per-element data for the professional report */
export interface ProfessionalElementData {
  label: string;
  labelEn: string;
  existingThickness: number;  // mm
  requiredThickness: number;  // mm
  recommendedThickness: number; // mm
  designMoment: number;       // kN·m/m
  designShear: number;        // kN/m
  requiredAs: number;         // mm²/m
  providedAs: number;         // mm²/m
  barDiameter: number;        // mm
  barSpacing: number;         // mm
  flexuralSF: number;
  shearSF: number;
  overallPass: boolean;
  governingMode: string;
}

/** Complete professional report data */
export interface ProfessionalReportData {
  // ── Cover ──
  projectName: string;
  calculatedAt: string;
  designMode: 'standard';
  designStatus: 'PASS' | 'FAIL' | 'OPTIMIZED';
  statusLabelAr: string;
  statusColor: string;
  governingElement: string;
  governingElementAr: string;
  governingMode: string;

  // ── Design Basis ──
  designBasis: Array<{ item: string; itemEn: string; value: string; source?: string }>;

  // ── Threat Summary ──
  threat: {
    tntEquivalent: number;
    standoff: number;
    scaledDistance: number;
    detonationType: string;
    detonationTypeAr: string;
  };

  // ── Blast Parameters ──
  blast: {
    incidentPressure: number;
    reflectedPressure: number;
    dynamicPressure: number;
    duration: number;
    impulse: number;
    reflectionCoefficient: number;
  };

  // ── Per-element design data ──
  elements: {
    roof: ProfessionalElementData;
    wall: ProfessionalElementData;
    floor: ProfessionalElementData;
  };

  // ── Verification Matrix (4 checks × 3 elements) ──
  verificationMatrix: VerificationCell[];

  // ── Critical Elements ──
  criticalElement: {
    key: 'roof' | 'wall' | 'floor';
    label: string;
    labelEn: string;
    governingMode: string;
    flexuralSF: number;
    shearSF: number;
    penetrationSF: number;
    deflectionRatio: number;
  };

  // ── Warnings ──
  warnings: string[];

  // ── Audit Summary ──
  equationCount: number;
  assumptionCount: number;
  equationCategories: string[];
  criticalAssumptions: Array<{ id: string; description: string; descriptionEn: string }>;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

const ELEMENT_LABELS: Record<string, { ar: string; en: string }> = {
  roof: { ar: 'السقف', en: 'Roof' },
  wall: { ar: 'الجدران', en: 'Walls' },
  floor: { ar: 'الأرضية', en: 'Floor' },
};

const STATUS_LABELS: Record<string, { ar: string; color: string }> = {
  PASS: { ar: 'التصميم ناجح', color: '#22c55e' },
  FAIL: { ar: 'التصميم يحتاج مراجعة', color: '#dc2626' },
  OPTIMIZED: { ar: 'تم تحسين التصميم', color: '#f59e0b' },
};

const GOVERNING_MODE_LABELS: Record<string, string> = {
  flexure: 'انحناء',
  shear: 'قص',
  penetration: 'اختراق',
  deflection: 'انحراف',
  none: 'لا يوجد',
};

const DETONATION_AR: Record<string, string> = {
  surface: 'سطحي',
  air: 'جوي',
  subsurface: 'تحت سطحي',
  contact: 'تماسي',
};

function extractElementData(
  key: 'roof' | 'wall' | 'floor',
  el: ElementDesignResult,
  ver: ElementVerificationResult,
): ProfessionalElementData {
  return {
    label: ELEMENT_LABELS[key].ar,
    labelEn: ELEMENT_LABELS[key].en,
    existingThickness: el.existingThickness * 1000,   // m → mm
    requiredThickness: el.requiredThickness * 1000,
    recommendedThickness: el.recommendedThickness * 1000,
    designMoment: el.designMoment,
    designShear: el.designShear,
    requiredAs: el.requiredAs,
    providedAs: el.mainReinforcement.asProvided,
    barDiameter: el.mainReinforcement.barDiameter,
    barSpacing: el.mainReinforcement.spacing,
    flexuralSF: el.flexuralSafetyFactor,
    shearSF: el.shearSafetyFactor,
    overallPass: ver.overallPass,
    governingMode: (() => {
      const labels: Record<string, string> = { flexure: 'انحناء', shear: 'قص', penetration: 'اختراق', deflection: 'انحراف', none: 'لا يوجد' };
      return labels[ver.governingMode] ?? ver.governingMode;
    })(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate professional engineering report data.
 *
 * This function READS ONLY from:
 *   - DesignResult (frozen engine output)
 *   - DesignInput (frozen adapter output)
 *   - FullAnalysisResult (frozen analysis output)
 *   - DESIGN_ASSUMPTIONS (Phase 5B registry)
 *   - EQUATION_REGISTRY (Phase 5B registry)
 *
 * No calculations are performed. No frozen functions are called.
 *
 * @param designResult    - Complete design result from frozen engine
 * @param designInput     - Design input (for blast/geometry data)
 * @param analysisResult  - Full analysis result (for blast parameters)
 * @param projectName     - Project name for cover page
 */
export function generateProfessionalReport(
  designResult: DesignResult,
  designInput: DesignInput,
  analysisResult: FullAnalysisResult,
  projectName: string,
): ProfessionalReportData {
  const { verification, designStatus, governingElement, warnings } = designResult;
  const governingMode = verification.governingMode;

  // ── Status ──
  const statusInfo = STATUS_LABELS[designStatus] ?? STATUS_LABELS.FAIL;

  // ── Design Basis (from assumptions registry) ──
  const designBasis: ProfessionalReportData['designBasis'] = [
    { item: 'كود التصميم', itemEn: 'Design Code', value: 'UFC 3-340-02', source: 'UFC 3-340-02' },
    { item: 'نموذج الخرسانة', itemEn: 'Concrete Model', value: 'ACI 318-19', source: 'ACI 318-19' },
    { item: 'درجة الفولاذ', itemEn: 'Steel Grade', value: `${designInput.criteria.steelGrade} MPa`, source: 'Design Criteria' },
    { item: 'معامل الزيادة الديناميكي', itemEn: 'DIF', value: 'مُفعّل', source: 'UFC 3-340-02 Sec 5.14.3' },
    { item: 'نوع التحليل', itemEn: 'Analysis Type', value: 'SDOF — ديناميكي', source: 'Biggs 1964' },
    { item: 'حالة الدعم — السقف', itemEn: 'Roof Support', value: designInput.criteria.supportCondition === 'simply_supported' ? 'بسيط' : 'مثبت', source: 'Design Criteria' },
    { item: 'حالة الدعم — الجدران', itemEn: 'Wall Support', value: designInput.criteria.wallSupportCondition === 'fixed' ? 'مثبت' : 'بسيط', source: 'Design Criteria' },
    { item: 'معامل الأمان المستهدف', itemEn: 'Target SF', value: `${designInput.criteria.targetSafetyFactor}`, source: 'Design Criteria' },
    { item: 'غطاء الخرسانة', itemEn: 'Concrete Cover', value: `${(designInput.criteria.concreteCover * 1000).toFixed(0)} mm`, source: 'Design Criteria' },
    { item: 'نوع الهيكل', itemEn: 'Structure Type', value: designInput.structureType === 'box' ? 'صندوقي' : designInput.structureType, source: 'Design Input' },
  ];

  // ── Threat Summary ──
  const blast = designInput.blast;
  const threat = {
    tntEquivalent: blast.tntEquivalentMass,
    standoff: blast.distance,
    scaledDistance: blast.scaledDistance,
    detonationType: blast.detonationType,
    detonationTypeAr: DETONATION_AR[blast.detonationType] ?? blast.detonationType,
  };

  // ── Blast Parameters ──
  const blastParams = {
    incidentPressure: blast.peakIncidentPressure,
    reflectedPressure: blast.peakReflectedPressure,
    dynamicPressure: blast.peakDynamicPressure,
    duration: blast.positivePhaseDuration,
    impulse: blast.positivePhaseImpulse,
    reflectionCoefficient: blast.reflectionCoefficient,
  };

  // ── Per-element data ──
  const elements = {
    roof: extractElementData('roof', designResult.roof, verification.elements.roof),
    wall: extractElementData('wall', designResult.wall, verification.elements.wall),
    floor: extractElementData('floor', designResult.floor, verification.elements.floor),
  };

  // ── Verification Matrix ──
  const verificationMatrix: VerificationCell[] = [
    {
      check: 'انحناء',
      checkEn: 'Flexure',
      roof: verification.elements.roof.flexuralPass,
      wall: verification.elements.wall.flexuralPass,
      floor: verification.elements.floor.flexuralPass,
    },
    {
      check: 'قص',
      checkEn: 'Shear',
      roof: verification.elements.roof.shearPass,
      wall: verification.elements.wall.shearPass,
      floor: verification.elements.floor.shearPass,
    },
    {
      check: 'اختراق',
      checkEn: 'Penetration',
      roof: verification.elements.roof.penetrationPass,
      wall: verification.elements.wall.penetrationPass,
      floor: verification.elements.floor.penetrationPass,
    },
    {
      check: 'انحراف',
      checkEn: 'Deflection',
      roof: verification.elements.roof.deflectionPass,
      wall: verification.elements.wall.deflectionPass,
      floor: verification.elements.floor.deflectionPass,
    },
  ];

  // ── Critical Element ──
  const critVer = verification.elements[governingElement];
  const critEl = designResult[governingElement];
  const criticalElement = {
    key: governingElement,
    label: ELEMENT_LABELS[governingElement].ar,
    labelEn: ELEMENT_LABELS[governingElement].en,
    governingMode: GOVERNING_MODE_LABELS[verification.governingMode] ?? verification.governingMode,
    flexuralSF: critEl.flexuralSafetyFactor,
    shearSF: critEl.shearSafetyFactor,
    penetrationSF: critVer.penetrationSF,
    deflectionRatio: critVer.deflectionRatio,
  };

  // ── Audit Summary ──
  const criticalAssumptions = getAssumptionsByImpact('critical').map((a) => ({
    id: a.id,
    description: a.description,
    descriptionEn: a.rationale,
  }));

  return {
    // Cover
    projectName,
    calculatedAt: analysisResult.calculatedAt,
    designMode: 'standard',
    designStatus,
    statusLabelAr: statusInfo.ar,
    statusColor: statusInfo.color,
    governingElement: governingElement,
    governingElementAr: ELEMENT_LABELS[governingElement].ar,
    governingMode: GOVERNING_MODE_LABELS[governingMode] ?? governingMode,
    // Design Basis
    designBasis,
    // Threat
    threat,
    // Blast
    blast: blastParams,
    // Elements
    elements,
    // Verification Matrix
    verificationMatrix,
    // Critical Element
    criticalElement,
    // Warnings
    warnings: [...warnings, ...verification.warnings],
    // Audit
    equationCount: EQUATION_REGISTRY.length,
    assumptionCount: DESIGN_ASSUMPTIONS.length,
    equationCategories: getEquationCategories().map((c) => `${c.category} (${c.count})`),
    criticalAssumptions,
  };
}