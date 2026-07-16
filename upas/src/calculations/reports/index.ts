/**
 * UPAS — Engineering Report Generator
 * Sprint 3A: Generates structured engineering reports from analysis results
 *
 * The report is a data structure (not a PDF renderer).
 * Rendering will be handled by the UI layer in a future sprint.
 */

import type { FullAnalysisResult, EngineeringWarning } from '../types';
import { formatSafetyFactor, formatProtectionLevel } from '../results';

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
 */
export function generateEngineeringReport(result: FullAnalysisResult): ReportSection[] {
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

  // 8. Warnings
  if (result.warnings.length > 0) {
    sections.push(generateWarningsSection(result.warnings));
  }

  // 9. Recommendations
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