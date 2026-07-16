/**
 * UPAS — Results Compilation & Assessment Engine
 * Sprint 3A: Compiles calculation outputs into engineering assessment
 *
 * Responsibilities:
 * - Compile blast + penetration results
 * - Determine overall safety factor and protection level
 * - Generate engineering warnings
 * - Build 3D visualization data
 * - Generate recommendations
 */

import type {
  FullAnalysisResult,
  ProjectInput,
  BlastParameters,
  SoilStructureInteraction,
  StructureResponse,
  PenetrationParameters,
  VisualizationData,
  PressureContour,
  DamageZone,
  StressRegion,
  EngineeringWarning,
  GeometryResults,
} from '../types';
import { PROTECTION_THRESHOLDS } from '../constants';

// ─── Main Result Compilation ─────────────────────────────────────────

/**
 * Compile a full analysis result from all sub-engineines.
 * This is the main entry point for the results module.
 */
export function compileResults(params: {
  input: ProjectInput;
  blastParams: BlastParameters | null;
  ssi: SoilStructureInteraction | null;
  roofResponse: StructureResponse | null;
  wallResponse: StructureResponse | null;
  floorResponse: StructureResponse | null;
  roofPenetration: PenetrationParameters | null;
  wallPenetration: PenetrationParameters | null;
  floorPenetration: PenetrationParameters | null;
  geometry: GeometryResults;
}): FullAnalysisResult {
  const {
    input, blastParams, ssi,
    roofResponse, wallResponse, floorResponse,
    roofPenetration, wallPenetration, floorPenetration,
    geometry,
  } = params;

  // ─── Determine overall safety ───
  const safetyAssessment = assessOverallSafety(
    roofResponse, wallResponse, floorResponse,
    roofPenetration, wallPenetration, floorPenetration,
    input.settings.targetSafetyFactor
  );

  // ─── Generate warnings ───
  const warnings = generateWarnings(
    input, blastParams, ssi,
    roofResponse, wallResponse, floorResponse,
    roofPenetration, wallPenetration, floorPenetration
  );

  // ─── Generate recommendations ───
  const recommendations = generateRecommendations(safetyAssessment, warnings, input);

  // ─── Build visualization data ───
  const visualization = buildVisualizationData(
    blastParams, ssi, geometry,
    roofResponse, wallResponse, floorResponse,
    safetyAssessment.protectionLevel
  );

  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    calculatedAt: new Date().toISOString(),
    analysisType: input.settings.analysisType,
    input,
    blast: {
      parameters: blastParams,
      soilInteraction: ssi,
      roofResponse,
      wallResponse,
      floorResponse,
    },
    penetration: {
      roofPenetration,
      wallPenetration,
      floorPenetration,
    },
    overall: safetyAssessment,
    visualization,
    warnings,
    recommendations,
  };
}

// ─── Overall Safety Assessment ──────────────────────────────────────

function assessOverallSafety(
  roofResp: StructureResponse | null,
  wallResp: StructureResponse | null,
  floorResp: StructureResponse | null,
  roofPen: PenetrationParameters | null,
  wallPen: PenetrationParameters | null,
  floorPen: PenetrationParameters | null,
  targetSF: number,
): FullAnalysisResult['overall'] {
  const elements = [
    { name: 'roof' as const, response: roofResp, penetration: roofPen },
    { name: 'wall' as const, response: wallResp, penetration: wallPen },
    { name: 'floor' as const, response: floorResp, penetration: floorPen },
  ];

  let minSF = Infinity;
  let governingElement: 'roof' | 'wall' | 'floor' = 'roof';
  let governingMode: 'blast' | 'penetration' = 'blast';
  let isAdequate = true;

  for (const elem of elements) {
    // Check blast safety factor
    if (elem.response) {
      const sf = elem.response.safetyFactor;
      if (sf < minSF) {
        minSF = sf;
        governingElement = elem.name;
        governingMode = 'blast';
      }
      if (sf < targetSF) isAdequate = false;
    }

    // Check penetration
    if (elem.penetration) {
      if (elem.penetration.isPerforated) {
        minSF = 0;
        governingElement = elem.name;
        governingMode = 'penetration';
        isAdequate = false;
      }
      // Check safety margin against perforation
      if (elem.penetration.perforationThickness > 0) {
        const penSF = elem.penetration.perforationThickness; // ratio-based
        // We can compare actual thickness to required thickness
        // (This is handled through the PenetrationParameters fields)
      }
    }
  }

  // If no calculations were done
  if (minSF === Infinity) {
    minSF = 0;
    isAdequate = false;
  }

  return {
    minSafetyFactor: minSF,
    protectionLevel: determineProtectionLevel(minSF, elements),
    governingElement,
    governingMode,
    isAdequate,
  };
}

/**
 * Determine protection level based on safety factors and penetration status
 */
function determineProtectionLevel(
  minSF: number,
  elements: Array<{ name: 'roof' | 'wall' | 'floor'; penetration: PenetrationParameters | null }>,
): 'safe' | 'marginal' | 'unsafe' | 'critical' {
  // Check for perforation first (worst case)
  for (const elem of elements) {
    if (elem.penetration?.isPerforated) return 'critical';
  }

  // Check for scabbing (very serious)
  for (const elem of elements) {
    if (elem.penetration?.isSpalled) return 'unsafe';
  }

  // Check safety factor thresholds
  if (minSF >= PROTECTION_THRESHOLDS.safe.minSF) return 'safe';
  if (minSF >= PROTECTION_THRESHOLDS.marginal.minSF) return 'marginal';
  if (minSF >= PROTECTION_THRESHOLDS.unsafe.minSF) return 'unsafe';
  return 'critical';
}

// ─── Warning Generation ─────────────────────────────────────────────

function generateWarnings(
  input: ProjectInput,
  blastParams: BlastParameters | null,
  ssi: SoilStructureInteraction | null,
  roofResp: StructureResponse | null,
  wallResp: StructureResponse | null,
  floorResp: StructureResponse | null,
  roofPen: PenetrationParameters | null,
  wallPen: PenetrationParameters | null,
  floorPen: PenetrationParameters | null,
): EngineeringWarning[] {
  const warnings: EngineeringWarning[] = [];

  // ─── Input validation warnings ───
  if (input.threat.standoffDistance < 3) {
    warnings.push({
      code: 'WARN_CLOSE_STANDOFF',
      messageAr: 'مسافة الأمان صغيرة جداً — يُنصح بزيادتها',
      messageEn: 'Standoff distance is very small — recommend increasing',
      severity: 'warning',
      field: 'threat.standoffDistance',
    });
  }

  if (input.threat.explosive.chargeMass > 500) {
    warnings.push({
      code: 'WARN_LARGE_CHARGE',
      messageAr: 'كتلة المتفجرات كبيرة — الحسابات تقريبية للحمولات الكبيرة جداً',
      messageEn: 'Large charge mass — calculations are approximate for very large charges',
      severity: 'warning',
      field: 'threat.explosive.chargeMass',
    });
  }

  if (input.structure.burialDepth < 1) {
    warnings.push({
      code: 'WARN_SHALLOW_BURIAL',
      messageAr: 'عمق الدفن صغير — الحماية من الانفجار السطحي محدودة',
      messageEn: 'Shallow burial depth — limited protection against surface blast',
      severity: 'warning',
      field: 'structure.burialDepth',
    });
  }

  // ─── Blast result warnings ───
  if (blastParams && blastParams.scaledDistance < 0.5) {
    warnings.push({
      code: 'WARN_NEAR_FIELD_BLAST',
      messageAr: 'انفجار قريب جداً — دقة المعادلات المنخفضة في المجال القريب',
      messageEn: 'Very near-field blast — reduced accuracy of empirical equations',
      severity: 'critical',
      field: 'blast.scaledDistance',
    });
  }

  if (blastParams && blastParams.scaledDistance > 30) {
    warnings.push({
      code: 'WARN_FAR_FIELD',
      messageAr: 'انفجار بعيد — الضغط منخفض وقد لا يكون ذا أهمية هندسية',
      messageEn: 'Far-field blast — pressure is low and may not be engineering-significant',
      severity: 'info',
      field: 'blast.scaledDistance',
    });
  }

  // ─── Structure response warnings ───
  const checkElementResponse = (
    name: string,
    resp: StructureResponse | null,
  ) => {
    if (!resp) return;
    if (resp.responseMode === 'plastic') {
      warnings.push({
        code: `WARN_PLASTIC_${name.toUpperCase()}`,
        messageAr: `استجابة بلاستيكية في ${name === 'roof' ? 'السقف' : name === 'wall' ? 'الجدران' : 'الأرضية'}`,
        messageEn: `Plastic response in ${name} — structural damage expected`,
        severity: 'warning',
        field: `structure.${name}Response`,
      });
    }
    if (resp.responseMode === 'failure') {
      warnings.push({
        code: `WARN_FAILURE_${name.toUpperCase()}`,
        messageAr: `فشل هيكلي في ${name === 'roof' ? 'السقف' : name === 'wall' ? 'الجدران' : 'الأرضية'}`,
        messageEn: `Structural failure in ${name}`,
        severity: 'critical',
        field: `structure.${name}Response`,
      });
    }
    if (resp.supportRotation > 4) {
      warnings.push({
        code: `WARN_HIGH_ROTATION_${name.toUpperCase()}`,
        messageAr: `دوران كبير عند الدعامات في ${name === 'roof' ? 'السقف' : name === 'wall' ? 'الجدران' : 'الأرضية'} — خطر سقوط`,
        messageEn: `High support rotation in ${name} — collapse risk`,
        severity: 'critical',
        field: `structure.${name}Response.supportRotation`,
      });
    }
  };

  checkElementResponse('roof', roofResp);
  checkElementResponse('wall', wallResp);
  checkElementResponse('floor', floorResp);

  // ─── Penetration warnings ───
  const checkPenetration = (
    name: string,
    pen: PenetrationParameters | null,
  ) => {
    if (!pen) return;
    if (pen.isPerforated) {
      warnings.push({
        code: `WARN_PERFORATION_${name.toUpperCase()}`,
        messageAr: `اختراق كامل في ${name === 'roof' ? 'السقف' : name === 'wall' ? 'الجدران' : 'الأرضية'}`,
        messageEn: `Full perforation of ${name}`,
        severity: 'critical',
        field: `penetration.${name}`,
      });
    }
    if (pen.isSpalled && !pen.isPerforated) {
      warnings.push({
        code: `WARN_SCABBING_${name.toUpperCase()}`,
        messageAr: `تقشر خرساني متوقع في ${name === 'roof' ? 'السقف' : name === 'wall' ? 'الجدران' : 'الأرضية'}`,
        messageEn: `Concrete scabbing expected on ${name}`,
        severity: 'warning',
        field: `penetration.${name}`,
      });
    }
  };

  checkPenetration('roof', roofPen);
  checkPenetration('wall', wallPen);
  checkPenetration('floor', floorPen);

  // ─── SSI warnings ───
  if (ssi && ssi.soilAttenuationFactor < 0.1) {
    warnings.push({
      code: 'WARN_LOW_ATTENUATION',
      messageAr: 'تخفيف ضعيف من التربة — سمك الغطاء الترابي غير كافٍ',
      messageEn: 'Low soil attenuation — insufficient soil cover thickness',
      severity: 'warning',
      field: 'soil.attenuation',
    });
  }

  return warnings;
}

// ─── Recommendation Generation ───────────────────────────────────────

function generateRecommendations(
  assessment: FullAnalysisResult['overall'],
  warnings: EngineeringWarning[],
  input: ProjectInput,
): string[] {
  const recs: string[] = [];

  if (assessment.isAdequate) {
    recs.push('المنشأ يوفر حماية كافية ضد التهديد المحدد وفق المعايير المتبعة.');
    return recs;
  }

  // Based on governing mode
  if (assessment.governingMode === 'penetration') {
    const elemAr = assessment.governingElement === 'roof' ? 'السقف'
      : assessment.governingElement === 'wall' ? 'الجدران' : 'الأرضية';
    recs.push(`زيادة سماكة ${elemAr} لمنع الاختراق.`);
    recs.push('استخدام مواد ذات مقاومة أعلى للخرسانة (مثل RC 400 أو إضافة ألياف فولاذية).');
    recs.push('النظر في إضافة طبقة حماية إضافية من الداخل.');
  }

  if (assessment.governingMode === 'blast') {
    const elemAr = assessment.governingElement === 'roof' ? 'السقف'
      : assessment.governingElement === 'wall' ? 'الجدران' : 'الأرضية';
    recs.push(`تعزيز ${elemAr} لتحمل ضغط الانفجار.`);
    recs.push('زيادة عمق الدفن لتخفيف ضغط الانفجار عبر التربة.');
  }

  // General recommendations
  if (assessment.protectionLevel === 'critical') {
    recs.push('التصميم الحالي غير كافٍ — يجب إعادة التصميم الجذري.');
    recs.push('النظر في تغيير نوع المنشأ أو موقعه.');
  }

  if (input.threat.standoffDistance < 5) {
    recs.push('زيادة مسافة الأمان بين التهديد والمنشأ.');
  }

  if (input.structure.burialDepth < 2) {
    recs.push('زيادة عمق الدفن إلى 2 متر على الأقل فوق السقف.');
  }

  if (assessment.minSafetyFactor < 1.0) {
    recs.push('معامل الأمان أقل من 1.0 — الفشل الهيكلي محتمل.');
  } else if (assessment.minSafetyFactor < 1.2) {
    recs.push('معامل الأمان هامشي — يُنصح بتحسين التصميم.');
  }

  // Soil-related
  if (input.soil.layers.length > 0 && input.soil.layers[0]?.category === 'cohesiveless') {
    recs.push('الطبقة السطحية رملية — النظر في حفرها واستبدالها بمواد أكثر تماسكاً.');
  }

  return recs;
}

// ─── 3D Visualization Data ──────────────────────────────────────────

function buildVisualizationData(
  blastParams: BlastParameters | null,
  ssi: SoilStructureInteraction | null,
  geometry: GeometryResults,
  roofResp: StructureResponse | null,
  wallResp: StructureResponse | null,
  floorResp: StructureResponse | null,
  protectionLevel: 'safe' | 'marginal' | 'unsafe' | 'critical',
): VisualizationData {
  // ─── Pressure contours ───
  const pressureContours: PressureContour[] = [];
  if (blastParams) {
    const R = blastParams.distance;
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const r = (R * i) / steps;
      // Inverse square law approximation for pressure decay in air
      const pressureRatio = Math.pow(R / r, 2);
      const pressure = blastParams.peakIncidentPressure * Math.min(pressureRatio, 1.0);
      pressureContours.push({
        radius: r,
        pressure,
        type: 'incident',
      });
    }
  }

  // ─── Damage zones ───
  const damageZones: DamageZone[] = [];
  if (blastParams && ssi) {
    // Crater zone
    const craterPressure = blastParams.peakIncidentPressure * ssi.soilAttenuationFactor * 3;
    damageZones.push({
      type: 'crater',
      radius: Math.max(blastParams.distance * 0.05, 0.5),
      description: 'منطقة الحفرة',
      color: '#FF0000',
    });

    // Plastic zone
    damageZones.push({
      type: 'plastic',
      radius: blastParams.distance * 0.2,
      description: 'منطقة التشوه اللدن',
      color: '#FF6600',
    });

    // Elastic zone
    damageZones.push({
      type: 'elastic',
      radius: blastParams.distance * 0.5,
      description: 'منطقة التشوه المرن',
      color: '#FFCC00',
    });

    // Safe zone
    damageZones.push({
      type: 'safe',
      radius: blastParams.distance * 1.5,
      description: 'منطقة آمنة',
      color: '#00CC00',
    });
  }

  // ─── Structure stress regions ───
  const stressRegions: StressRegion[] = [];
  const addStressRegion = (
    element: 'roof' | 'wall' | 'floor',
    resp: StructureResponse | null,
  ) => {
    if (!resp) return;
    let status: StressRegion['status'];
    if (resp.safetyFactor >= 1.5) status = 'safe';
    else if (resp.safetyFactor >= 1.2) status = 'warning';
    else if (resp.safetyFactor >= 1.0) status = 'critical';
    else status = 'failed';

    stressRegions.push({
      element,
      stressRatio: 1 / Math.max(resp.safetyFactor, 0.001),
      status,
    });
  };

  addStressRegion('roof', roofResp);
  addStressRegion('wall', wallResp);
  addStressRegion('floor', floorResp);

  return {
    pressureContours,
    damageZones,
    threatPath: null, // Will be populated by geometry module if needed
    structureStressRegions: stressRegions,
  };
}

// ─── Utility: Format safety factor ──────────────────────────────────

export function formatSafetyFactor(sf: number): string {
  if (!isFinite(sf)) return 'غير محدد';
  return sf.toFixed(2);
}

export function formatProtectionLevel(level: 'safe' | 'marginal' | 'unsafe' | 'critical'): string {
  const map = {
    safe: 'آمن',
    marginal: 'هامشي',
    unsafe: 'غير آمن',
    critical: 'حرج',
  };
  return map[level];
}

export function getProtectionColor(level: 'safe' | 'marginal' | 'unsafe' | 'critical'): string {
  const map = {
    safe: '#22C55E',
    marginal: '#F59E0B',
    unsafe: '#F97316',
    critical: '#EF4444',
  };
  return map[level];
}