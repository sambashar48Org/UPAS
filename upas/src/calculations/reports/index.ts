/**
 * UPAS — Engineering Report Generator
 * Sprint 3A: Generates structured engineering reports from analysis results
 *
 * The report is a data structure (not a PDF renderer).
 * Rendering will be handled by the UI layer in a future sprint.
 */

import type { FullAnalysisResult, EngineeringWarning } from '../types';
import { formatSafetyFactor, formatProtectionLevel } from '../results';
import type { DesignResult, ElementDesignResult, ElementVerificationResult } from '../design/types';

// ─── Report Section Types ────────────────────────────────────────────

export interface ReportSection {
  id: string;
  titleAr: string;
  titleEn: string;
  content: ReportContent[];
  severity: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
}

export type ReportContent =
  | { type: 'paragraph'; textAr: string; textEn: string }
  | { type: 'key-value'; keyAr: string; keyEn: string; value: string; unit?: string }
  | { type: 'table'; headers: string[]; rows: string[][]; captionAr?: string; captionEn?: string }
  | { type: 'list'; itemsAr: string[]; itemsEn: string[] }
  | { type: 'divider' };

// ─── Main Report Generator ──────────────────────────────────────────

/**
 * Generate a complete engineering report from analysis results.
 * Returns structured data ready for rendering.
 *
 * @param result       - Complete analysis result
 * @param designResult - Optional design result — when provided, adds a structural design section
 */
export function generateEngineeringReport(
  result: FullAnalysisResult,
  designResult?: DesignResult | null,
): ReportSection[] {
  const sections: ReportSection[] = [];

  // 1. Executive Summary
  sections.push(generateExecutiveSummary(result));

  // 2. Input Parameters Summary
  sections.push(generateInputSummary(result));

  // 3. Blast Analysis Results
  if (result.blast.parameters) {
    sections.push(generateBlastResultsSection(result));
  }

  // 4. Soil-Structure Interaction
  if (result.blast.soilInteraction) {
    sections.push(generateSSISection(result));
  }

  // 5. Structure Response
  if (result.blast.roofResponse || result.blast.wallResponse || result.blast.floorResponse) {
    sections.push(generateStructureResponseSection(result));
  }

  // 6. Penetration Analysis
  if (result.penetration.roofPenetration || result.penetration.wallPenetration || result.penetration.floorPenetration) {
    sections.push(generatePenetrationSection(result));
  }

  // 7. Overall Assessment
  sections.push(generateAssessmentSection(result));

  // 8. Structural Design Results (conditional — only when design was executed)
  if (designResult) {
    sections.push(generateDesignResultsSection(designResult));
  }

  // 9. Warnings
  if (result.warnings.length > 0) {
    sections.push(generateWarningsSection(result.warnings));
  }

  // 10. Recommendations
  if (result.recommendations.length > 0) {
    sections.push(generateRecommendationsSection(result.recommendations));
  }

  return sections;
}

// ─── Section Generators ─────────────────────────────────────────────

function generateExecutiveSummary(result: FullAnalysisResult): ReportSection {
  const { overall, input, blast } = result;
  const protectionAr = formatProtectionLevel(overall.protectionLevel);
  const protectionEn = overall.protectionLevel.charAt(0).toUpperCase() + overall.protectionLevel.slice(1);
  const adequateAr = overall.isAdequate ? 'نعم' : 'لا';
  const adequateEn = overall.isAdequate ? 'Yes' : 'No';

  const elemAr = overall.governingElement === 'roof' ? 'السقف'
    : overall.governingElement === 'wall' ? 'الجدران' : 'الأرضية';

  const modeAr = overall.governingMode === 'blast' ? 'انفجار' : 'اختراق';
  const modeEn = overall.governingMode === 'blast' ? 'Blast' : 'Penetration';

  const severity = overall.isAdequate
    ? (overall.minSafetyFactor >= 1.5 ? 'success' : 'warning')
    : (overall.protectionLevel === 'critical' ? 'critical' : 'warning');

  return {
    id: 'executive-summary',
    titleAr: 'الملخص التنفيذي',
    titleEn: 'Executive Summary',
    severity,
    content: [
      {
        type: 'paragraph',
        textAr: `تم تحليل منشأ تحت أرضي ضد تهديد انفجاري. مستوى الحماية: ${protectionAr}. العنصر الحاكم: ${elemAr} (${modeAr}).`,
        textEn: `Analysis of an underground structure against a blast threat. Protection level: ${protectionEn}. Governing element: ${overall.governingElement} (${modeEn}).`,
      },
      { type: 'divider' },
      {
        type: 'key-value', keyAr: 'مستوى الحماية', keyEn: 'Protection Level',
        value: protectionAr,
      },
      {
        type: 'key-value', keyAr: 'معامل الأمان الأدنى', keyEn: 'Minimum Safety Factor',
        value: formatSafetyFactor(overall.minSafetyFactor),
      },
      {
        type: 'key-value', keyAr: 'المنشأ مُلائم', keyEn: 'Structure Adequate',
        value: adequateAr,
      },
      {
        type: 'key-value', keyAr: 'العنصر الحاكم', keyEn: 'Governing Element',
        value: `${elemAr} (${modeAr})`,
      },
    ],
  };
}

function generateInputSummary(result: FullAnalysisResult): ReportSection {
  const { input } = result;
  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'ملخص مدخلات التحليل الهندسي.',
      textEn: 'Summary of engineering analysis inputs.',
    },
    { type: 'divider' },
  ];

  // Threat info
  content.push(
    { type: 'key-value', keyAr: 'نوع المتفجرات', keyEn: 'Explosive Type', value: input.threat.explosive.name },
    { type: 'key-value', keyAr: 'كتلة الشحنة', keyEn: 'Charge Mass', value: `${input.threat.explosive.chargeMass.toFixed(1)}`, unit: 'kg' },
    { type: 'key-value', keyAr: 'نوع الانفجار', keyEn: 'Detonation Type', value: input.threat.detonationType },
    { type: 'key-value', keyAr: 'مسافة الأمان', keyEn: 'Standoff Distance', value: `${input.threat.standoffDistance.toFixed(1)}`, unit: 'm' },
  );

  content.push({ type: 'divider' });

  // Structure info
  const typeNames: Record<string, string> = { box: 'صندوقي', arch: 'قوسي', cylinder: 'أسطواني', dome: 'قببي', custom: 'مخصص' };
  content.push(
    { type: 'key-value', keyAr: 'نوع المنشأ', keyEn: 'Structure Type', value: typeNames[input.structure.type] ?? input.structure.type },
    { type: 'key-value', keyAr: 'الأبعاد', keyEn: 'Dimensions', value: `${input.structure.length} × ${input.structure.width} × ${input.structure.height}`, unit: 'm' },
    { type: 'key-value', keyAr: 'سماكة السقف', keyEn: 'Roof Thickness', value: `${input.structure.roofThickness.toFixed(2)}`, unit: 'm' },
    { type: 'key-value', keyAr: 'سماكة الجدران', keyEn: 'Wall Thickness', value: `${input.structure.wallThickness.toFixed(2)}`, unit: 'm' },
    { type: 'key-value', keyAr: 'مادة السقف', keyEn: 'Roof Material', value: input.structure.roofMaterial.name },
    { type: 'key-value', keyAr: 'عمق الدفن', keyEn: 'Burial Depth', value: `${input.structure.burialDepth.toFixed(1)}`, unit: 'm' },
  );

  content.push({ type: 'divider' });

  // Soil info
  content.push(
    { type: 'key-value', keyAr: 'عدد الطبقات', keyEn: 'Number of Layers', value: `${input.soil.layers.length}` },
  );

  if (input.soil.layers.length > 0) {
    content.push(
      { type: 'key-value', keyAr: 'الطبقة السطحية', keyEn: 'Surface Layer', value: input.soil.layers[0]!.name },
      { type: 'key-value', keyAr: 'العمق الكلي', keyEn: 'Total Depth', value: `${input.soil.totalDepth.toFixed(1)}`, unit: 'm' },
    );
  }

  return {
    id: 'input-summary',
    titleAr: 'ملخص المدخلات',
    titleEn: 'Input Summary',
    severity: 'neutral',
    content,
  };
}

function generateBlastResultsSection(result: FullAnalysisResult): ReportSection {
  const bp = result.blast.parameters!;

  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'نتائج تحليل الانفجار باستخدام معادلات Kingery-Bulmash (TM 5-1300 / UFC 3-340-02).',
      textEn: 'Blast analysis results using Kingery-Bulmash equations (TM 5-1300 / UFC 3-340-02).',
    },
    { type: 'divider' },
    { type: 'key-value', keyAr: 'كتلة TNT المكافئة', keyEn: 'TNT Equivalent Mass', value: `${bp.tntEquivalentMass.toFixed(1)}`, unit: 'kg' },
    { type: 'key-value', keyAr: 'المسافة المقيسة Z', keyEn: 'Scaled Distance Z', value: `${bp.scaledDistance.toFixed(3)}`, unit: 'm/kg^(1/3)' },
    { type: 'key-value', keyAr: 'الضغط الحادث الأقصى', keyEn: 'Peak Incident Pressure', value: `${bp.peakIncidentPressure.toFixed(1)}`, unit: 'kPa' },
    { type: 'key-value', keyAr: 'الضغط المنعكس الأقصى', keyEn: 'Peak Reflected Pressure', value: `${bp.peakReflectedPressure.toFixed(1)}`, unit: 'kPa' },
    { type: 'key-value', keyAr: 'معامل الانعكاس', keyEn: 'Reflection Coefficient', value: `${bp.reflectionCoefficient.toFixed(2)}` },
    { type: 'key-value', keyAr: 'الضغط الديناميكي الأقصى', keyEn: 'Peak Dynamic Pressure', value: `${bp.peakDynamicPressure.toFixed(1)}`, unit: 'kPa' },
    { type: 'key-value', keyAr: 'مدة الطور الموجب', keyEn: 'Positive Phase Duration', value: `${bp.positivePhaseDuration.toFixed(2)}`, unit: 'ms' },
    { type: 'key-value', keyAr: 'دافع الطور الموجب', keyEn: 'Positive Phase Impulse', value: `${bp.positivePhaseImpulse.toFixed(1)}`, unit: 'kPa·ms' },
  ];

  return {
    id: 'blast-results',
    titleAr: 'نتائج تحليل الانفجار',
    titleEn: 'Blast Analysis Results',
    severity: 'neutral',
    content,
  };
}

function generateSSISection(result: FullAnalysisResult): ReportSection {
  const ssi = result.blast.soilInteraction!;

  return {
    id: 'soil-structure-interaction',
    titleAr: 'التفاعل بين التربة والمنشأ',
    titleEn: 'Soil-Structure Interaction',
    severity: ssi.soilAttenuationFactor < 0.2 ? 'warning' : 'neutral',
    content: [
      {
        type: 'paragraph',
        textAr: 'تحليل تخفيف ضغط الانفجار عبر غطاء التربة والتفاعل مع المنشأ.',
        textEn: 'Analysis of blast pressure attenuation through soil cover and interaction with structure.',
      },
      { type: 'divider' },
      { type: 'key-value', keyAr: 'ضغط الغطاء الترابي', keyEn: 'Overburden Pressure', value: `${ssi.overburdenPressure.toFixed(1)}`, unit: 'kPa' },
      { type: 'key-value', keyAr: 'الإجهاد الفعال', keyEn: 'Effective Stress', value: `${ssi.effectiveStress.toFixed(1)}`, unit: 'kPa' },
      { type: 'key-value', keyAr: 'عامل التخفيف', keyEn: 'Attenuation Factor', value: `${ssi.soilAttenuationFactor.toFixed(4)}` },
      { type: 'key-value', keyAr: 'الضغط على سطح المنشأ', keyEn: 'Pressure at Structure', value: `${ssi.pressureAtStructure.toFixed(1)}`, unit: 'kPa' },
      { type: 'key-value', keyAr: 'سرعة الموجة المتوسطة', keyEn: 'Avg Wave Velocity', value: `${ssi.averageWaveVelocity.toFixed(0)}`, unit: 'm/s' },
    ],
  };
}

function generateStructureResponseSection(result: FullAnalysisResult): ReportSection {
  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'استجابة عناصر المنشأ تحت تأثير الحمل الانفجاري.',
      textEn: 'Structural element response under blast loading.',
    },
    { type: 'divider' },
  ];

  const addElementResponse = (
    nameAr: string,
    nameEn: string,
    resp: import('../types').StructureResponse | null,
  ) => {
    if (!resp) return;
    const modeAr = resp.responseMode === 'elastic' ? 'مرن'
      : resp.responseMode === 'plastic' ? 'بلاستيكي' : 'فشل';
    content.push(
      { type: 'key-value', keyAr: `معامل الأمان — ${nameAr}`, keyEn: `Safety Factor — ${nameEn}`, value: formatSafetyFactor(resp.safetyFactor) },
      { type: 'key-value', keyAr: `نمط الاستجابة — ${nameAr}`, keyEn: `Response Mode — ${nameEn}`, value: modeAr },
      { type: 'key-value', keyAr: `الإزاحة القصوى — ${nameAr}`, keyEn: `Max Displacement — ${nameEn}`, value: `${resp.maxDisplacement.toFixed(1)}`, unit: 'mm' },
      { type: 'key-value', keyAr: `دوران الدعامة — ${nameAr}`, keyEn: `Support Rotation — ${nameEn}`, value: `${resp.supportRotation.toFixed(2)}`, unit: 'deg' },
    );
    content.push({ type: 'divider' });
  };

  addElementResponse('السقف', 'Roof', result.blast.roofResponse);
  addElementResponse('الجدران', 'Wall', result.blast.wallResponse);
  addElementResponse('الأرضية', 'Floor', result.blast.floorResponse);

  // Remove trailing divider
  if (content.length > 0 && content[content.length - 1]?.type === 'divider') {
    content.pop();
  }

  const hasFailure = [result.blast.roofResponse, result.blast.wallResponse, result.blast.floorResponse]
    .some(r => r?.responseMode === 'failure');

  return {
    id: 'structure-response',
    titleAr: 'استجابة المنشأ',
    titleEn: 'Structure Response',
    severity: hasFailure ? 'critical' : 'neutral',
    content,
  };
}

function generatePenetrationSection(result: FullAnalysisResult): ReportSection {
  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'تحليل الاختراق باستخدام معادلات NDRC المعدلة.',
      textEn: 'Penetration analysis using Modified NDRC equations.',
    },
    { type: 'divider' },
  ];

  const addPenetration = (
    nameAr: string,
    nameEn: string,
    pen: import('../types').PenetrationParameters | null,
  ) => {
    if (!pen) return;
    const perfAr = pen.isPerforated ? 'نعم' : 'لا';
    const scabAr = pen.isSpalled ? 'نعم' : 'لا';
    content.push(
      { type: 'key-value', keyAr: `عمق الاختراق — ${nameAr}`, keyEn: `Penetration Depth — ${nameEn}`, value: `${(pen.penetrationDepthStructure * 1000).toFixed(1)}`, unit: 'mm' },
      { type: 'key-value', keyAr: `سماكة منع الاختراق — ${nameAr}`, keyEn: `Perforation Thickness — ${nameEn}`, value: `${(pen.perforationThickness * 1000).toFixed(1)}`, unit: 'mm' },
      { type: 'key-value', keyAr: `اختراق كامل — ${nameAr}`, keyEn: `Perforated — ${nameEn}`, value: perfAr },
      { type: 'key-value', keyAr: `تقشر — ${nameAr}`, keyEn: `Scabbed — ${nameEn}`, value: scabAr },
    );
    content.push({ type: 'divider' });
  };

  addPenetration('السقف', 'Roof', result.penetration.roofPenetration);
  addPenetration('الجدران', 'Wall', result.penetration.wallPenetration);
  addPenetration('الأرضية', 'Floor', result.penetration.floorPenetration);

  // Remove trailing divider
  if (content.length > 0 && content[content.length - 1]?.type === 'divider') {
    content.pop();
  }

  const hasPerforation = [result.penetration.roofPenetration, result.penetration.wallPenetration, result.penetration.floorPenetration]
    .some(p => p?.isPerforated);

  return {
    id: 'penetration',
    titleAr: 'تحليل الاختراق',
    titleEn: 'Penetration Analysis',
    severity: hasPerforation ? 'critical' : 'neutral',
    content,
  };
}

function generateAssessmentSection(result: FullAnalysisResult): ReportSection {
  const { overall } = result;
  const severity = overall.isAdequate
    ? (overall.minSafetyFactor >= 1.5 ? 'success' : 'warning')
    : (overall.protectionLevel === 'critical' ? 'critical' : 'warning');

  return {
    id: 'overall-assessment',
    titleAr: 'التقييم العام',
    titleEn: 'Overall Assessment',
    severity,
    content: [
      {
        type: 'paragraph',
        textAr: `مستوى الحماية الإجمالي: ${formatProtectionLevel(overall.protectionLevel)}. معامل الأمان الأدنى: ${formatSafetyFactor(overall.minSafetyFactor)}.`,
        textEn: `Overall protection level: ${overall.protectionLevel}. Minimum safety factor: ${formatSafetyFactor(overall.minSafetyFactor)}.`,
      },
      { type: 'divider' },
      {
        type: 'key-value', keyAr: 'مستوى الحماية', keyEn: 'Protection Level', value: formatProtectionLevel(overall.protectionLevel) },
      {
        type: 'key-value', keyAr: 'معامل الأمان الأدنى', keyEn: 'Min Safety Factor', value: formatSafetyFactor(overall.minSafetyFactor) },
      {
        type: 'key-value', keyAr: 'العنصر الحاكم', keyEn: 'Governing Element', value: overall.governingElement },
      {
        type: 'key-value', keyAr: 'نمط الفشل الحاكم', keyEn: 'Governing Mode', value: overall.governingMode },
      {
        type: 'key-value', keyAr: 'المنشأ مُلائم', keyEn: 'Structure Adequate', value: overall.isAdequate ? 'نعم' : 'لا' },
      ],
  };
}

function generateWarningsSection(warnings: EngineeringWarning[]): ReportSection {
  const content: ReportContent[] = warnings.map(w => ({
    type: 'paragraph' as const,
    textAr: `[${w.severity.toUpperCase()}] ${w.messageAr}`,
    textEn: `[${w.severity.toUpperCase()}] ${w.messageEn}`,
  }));

  return {
    id: 'warnings',
    titleAr: `تحذيرات هندسية (${warnings.length})`,
    titleEn: `Engineering Warnings (${warnings.length})`,
    severity: warnings.some(w => w.severity === 'critical') ? 'critical' : 'warning',
    content,
  };
}

function generateRecommendationsSection(recommendations: string[]): ReportSection {
  return {
    id: 'recommendations',
    titleAr: 'التوصيات',
    titleEn: 'Recommendations',
    severity: 'info',
    content: [
      {
        type: 'list',
        itemsAr: recommendations,
        itemsEn: recommendations.map(r => r), // Same for now — English translation can be added later
      },
    ],
  };
}

// ─── Section 8: Structural Design Results (Phase 4E) ─────────────────

/**
 * Generate the structural design results section.
 * Maps DesignResult → ReportSection with per-element design data.
 *
 * Includes: governing thickness, reinforcement selection, Mu/Vu,
 * verification status (flexure/shear/penetration/deflection), safety factors.
 */
function generateDesignResultsSection(design: DesignResult): ReportSection {
  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'نتائج التصميم الإنشائي للعناصر الهيكلية وفق معايير ACI 318-19 و UFC 3-340-02.',
      textEn: 'Structural design results for structural elements per ACI 318-19 and UFC 3-340-02.',
    },
    { type: 'divider' },
  ];

  // Overall design status
  const statusAr = design.designStatus === 'PASS' ? 'ناجح'
    : design.designStatus === 'FAIL' ? 'فاشل' : 'مُحسَّن';
  const statusEn = design.designStatus;

  const govElemAr = design.governingElement === 'roof' ? 'السقف'
    : design.governingElement === 'wall' ? 'الجدران' : 'الأرضية';

  content.push(
    { type: 'key-value', keyAr: 'حالة التصميم', keyEn: 'Design Status', value: statusAr },
    { type: 'key-value', keyAr: 'العنصر الحاكم', keyEn: 'Governing Element', value: govElemAr },
  );
  content.push({ type: 'divider' });

  // Per-element design data
  const elementLabels: Record<string, { ar: string; en: string }> = {
    roof: { ar: 'السقف', en: 'Roof' },
    wall: { ar: 'الجدران', en: 'Wall' },
    floor: { ar: 'الأرضية', en: 'Floor' },
  };

  for (const key of ['roof', 'wall', 'floor'] as const) {
    const labels = elementLabels[key]!;
    const el: ElementDesignResult = design[key];
    const ver: ElementVerificationResult = design.verification.elements[key];

    // Element sub-heading
    content.push({
      type: 'paragraph',
      textAr: `── ${labels.ar} ──`,
      textEn: `── ${labels.en} ──`,
    });

    // Governing thickness
    content.push(
      { type: 'key-value', keyAr: `السماكة الحالية — ${labels.ar}`, keyEn: `Existing Thickness — ${labels.en}`, value: `${(el.existingThickness * 1000).toFixed(0)}`, unit: 'mm' },
      { type: 'key-value', keyAr: `السماكة المطلوبة — ${labels.ar}`, keyEn: `Required Thickness — ${labels.en}`, value: `${(el.requiredThickness * 1000).toFixed(0)}`, unit: 'mm' },
      { type: 'key-value', keyAr: `السماكة الموصى بها — ${labels.ar}`, keyEn: `Recommended Thickness — ${labels.en}`, value: `${(el.recommendedThickness * 1000).toFixed(0)}`, unit: 'mm' },
    );

    // Mu / Vu
    content.push(
      { type: 'key-value', keyAr: `عزم الانحناء التصميمي — ${labels.ar}`, keyEn: `Design Moment — ${labels.en}`, value: `${el.designMoment.toFixed(2)}`, unit: 'kN·m/m' },
      { type: 'key-value', keyAr: `قوة القص التصميمية — ${labels.ar}`, keyEn: `Design Shear — ${labels.en}`, value: `${el.designShear.toFixed(2)}`, unit: 'kN/m' },
    );

    // Reinforcement selection
    content.push(
      { type: 'key-value', keyAr: `قطر التسليح الرئيسي — ${labels.ar}`, keyEn: `Main Bar Diameter — ${labels.en}`, value: `${el.mainReinforcement.barDiameter}`, unit: 'mm' },
      { type: 'key-value', keyAr: `مسافة التسليح الرئيسي — ${labels.ar}`, keyEn: `Main Bar Spacing — ${labels.en}`, value: `${el.mainReinforcement.spacing}`, unit: 'mm' },
      { type: 'key-value', keyAr: `المساحة المقدمة — ${labels.ar}`, keyEn: `As Provided — ${labels.en}`, value: `${el.mainReinforcement.asProvided.toFixed(1)}`, unit: 'mm²/m' },
      { type: 'key-value', keyAr: `المساحة المطلوبة — ${labels.ar}`, keyEn: `As Required — ${labels.en}`, value: `${el.requiredAs.toFixed(1)}`, unit: 'mm²/m' },
    );

    // Safety factors
    content.push(
      { type: 'key-value', keyAr: `معامل أمان الانحناء — ${labels.ar}`, keyEn: `Flexural SF — ${labels.en}`, value: formatSafetyFactor(el.flexuralSafetyFactor) },
      { type: 'key-value', keyAr: `معامل أمان القص — ${labels.ar}`, keyEn: `Shear SF — ${labels.en}`, value: formatSafetyFactor(el.shearSafetyFactor) },
    );

    // Verification status
    const flexAr = ver.flexuralPass ? 'ناجح' : 'فاشل';
    const shearAr = ver.shearPass ? 'ناجح' : 'فاشل';
    const penAr = ver.penetrationPass ? 'ناجح' : 'فاشل';
    const deflAr = ver.deflectionPass ? 'ناجح' : 'فاشل';

    content.push(
      { type: 'key-value', keyAr: `تحقق الانحناء — ${labels.ar}`, keyEn: `Flexure Check — ${labels.en}`, value: flexAr },
      { type: 'key-value', keyAr: `تحقق القص — ${labels.ar}`, keyEn: `Shear Check — ${labels.en}`, value: shearAr },
      { type: 'key-value', keyAr: `تحقق الاختراق — ${labels.ar}`, keyEn: `Penetration Check — ${labels.en}`, value: penAr },
      { type: 'key-value', keyAr: `تحقق الانحراف — ${labels.ar}`, keyEn: `Deflection Check — ${labels.en}`, value: deflAr },
    );

    // Element status
    const elStatusAr = el.status === 'pass' ? 'ناجح'
      : el.status === 'fail' ? 'فاشل' : 'يحتاج تحسين';
    content.push(
      { type: 'key-value', keyAr: `حالة العنصر — ${labels.ar}`, keyEn: `Element Status — ${labels.en}`, value: elStatusAr },
    );

    content.push({ type: 'divider' });
  }

  // Remove trailing divider
  if (content.length > 0 && content[content.length - 1]?.type === 'divider') {
    content.pop();
  }

  // Verification summary table
  const verTableHeaders = ['العنصر / Element', 'انحناء / Flexure', 'قص / Shear', 'اختراق / Penetration', 'انحناء / Deflection', 'إجمالي / Overall'];
  const verTableRows = (['roof', 'wall', 'floor'] as const).map(key => {
    const labels = elementLabels[key]!;
    const v = design.verification.elements[key];
    return [
      `${labels.ar} / ${labels.en}`,
      v.flexuralPass ? 'PASS' : 'FAIL',
      v.shearPass ? 'PASS' : 'FAIL',
      v.penetrationPass ? 'PASS' : 'FAIL',
      v.deflectionPass ? 'PASS' : 'FAIL',
      v.overallPass ? 'PASS' : 'FAIL',
    ];
  });

  content.push({
    type: 'table',
    headers: verTableHeaders,
    rows: verTableRows,
    captionAr: 'ملخص التحقق من التصميم لجميع العناصر',
    captionEn: 'Design verification summary for all elements',
  });

  // Design warnings (if any)
  if (design.warnings.length > 0) {
    content.push({ type: 'divider' });
    content.push({
      type: 'list',
      itemsAr: design.warnings,
      itemsEn: design.warnings,
    });
  }

  const severity = design.designStatus === 'PASS'
    ? 'success'
    : design.designStatus === 'FAIL'
      ? 'critical'
      : 'warning';

  return {
    id: 'structural-design',
    titleAr: 'نتائج التصميم الإنشائي',
    titleEn: 'Structural Design Results',
    severity,
    content,
  };
}