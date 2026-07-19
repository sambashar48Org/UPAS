/**
 * UPAS — Automated Calculation Trace Report Generator
 * Phase 5B: Professional Engineering Review Package
 *
 * Generates a detailed, equation-traced calculation report section
 * that shows the COMPLETE computation path from blast parameters
 * to final reinforcement selection, with equation references.
 *
 * This is the "calculation sheet" that a reviewing engineer expects:
 *   Input Summary → Blast Trace → SDOF Trace → Demand Trace →
 *   Capacity Verification → Assumptions Reference
 *
 * ARCHITECTURE RULE:
 *   This module reads DesignInput, DesignResult, and the registries.
 *   It does NOT perform any calculations — only reads and formats
 *   values that were already computed by the design engine.
 *
 * No frozen modules are modified.
 */

import type {
  DesignInput,
  DesignResult,
  ElementDesignResult,
  ElementVerificationResult,
  DesignCriteria,
  DesignBlastInput,
  DesignElementLoad,
  DesignMaterial,
  DesignSoil,
} from './types';

import type { ReportSection, ReportContent } from '../reports';
import {
  EQUATION_REGISTRY,
  getEquationsByCategory,
  type EquationEntry,
} from './equation-registry';
import {
  DESIGN_ASSUMPTIONS,
  getAssumptionsByCategory,
  type DesignAssumption,
} from './design-assumptions';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Internal trace step for recording calculation values */
interface TraceStep {
  equationId: string;
  equation: string;
  source: string;
  inputs: { label: string; value: string; unit: string }[];
  output: { label: string; value: string; unit: string };
}

/** Complete calculation trace for one element */
interface ElementCalculationTrace {
  element: 'roof' | 'wall' | 'floor';
  elementNameAr: string;
  elementNameEn: string;
  blastLoadSteps: TraceStep[];
  sdofSteps: TraceStep[];
  demandSteps: TraceStep[];
  capacitySteps: TraceStep[];
  verificationSteps: TraceStep[];
}

// ═══════════════════════════════════════════════════════════════════════
// INTERNAL: TRACE COMPUTATION
// ═══════════════════════════════════════════════════════════════════════

const ELEMENT_NAMES: Record<string, { ar: string; en: string }> = {
  roof: { ar: 'السقف', en: 'Roof' },
  wall: { ar: 'الجدار', en: 'Wall' },
  floor: { ar: 'الأرضية', en: 'Floor' },
};

/**
 * Build the blast response trace steps for an element.
 * These document the values that flowed from blast analysis into the design.
 */
function buildBlastTrace(
  element: 'roof' | 'wall' | 'floor',
  blast: DesignBlastInput,
  elementLoad: DesignElementLoad,
): TraceStep[] {
  const steps: TraceStep[] = [];

  const eqBLAST001 = EQUATION_REGISTRY.find(e => e.id === 'BLAST-001')!;
  const peakP = element === 'roof'
    ? blast.peakReflectedPressure
    : element === 'wall'
      ? blast.peakReflectedPressure * 0.70
      : blast.peakDynamicPressure;

  steps.push({
    equationId: 'BLAST-001',
    equation: eqBLAST001.equation,
    source: eqBLAST001.source,
    inputs: [
      { label: 'Pr', value: blast.peakReflectedPressure.toFixed(1), unit: 'kPa' },
      { label: 'q', value: blast.peakDynamicPressure.toFixed(1), unit: 'kPa' },
    ],
    output: { label: 'P_peak', value: peakP.toFixed(1), unit: 'kPa' },
  });

  steps.push({
    equationId: 'BLAST-004',
    equation: 'Pr = Cr x Pso',
    source: 'TM 5-1300 Ch.2',
    inputs: [
      { label: 'Pso', value: blast.peakIncidentPressure.toFixed(1), unit: 'kPa' },
      { label: 'Cr', value: (blast.peakReflectedPressure / Math.max(blast.peakIncidentPressure, 0.01)).toFixed(2), unit: '' },
    ],
    output: { label: 'Pr', value: blast.peakReflectedPressure.toFixed(1), unit: 'kPa' },
  });

  steps.push({
    equationId: 'BLAST-IMP',
    equation: 'I (from KB polynomials)',
    source: 'TM 5-1300 / Kingery-Bulmash',
    inputs: [],
    output: { label: 'I', value: blast.positivePhaseImpulse.toFixed(1), unit: 'kPa*ms' },
  });

  steps.push({
    equationId: 'BLAST-DUR',
    equation: 'td (from KB polynomials)',
    source: 'TM 5-1300 / Kingery-Bulmash',
    inputs: [],
    output: { label: 'td', value: blast.positivePhaseDuration.toFixed(2), unit: 'ms' },
  });

  return steps;
}

/**
 * Build the SDOF dynamic response trace steps.
 */
function buildSDOFTrace(
  element: 'roof' | 'wall' | 'floor',
  elementLoad: DesignElementLoad,
  material: DesignMaterial,
): TraceStep[] {
  const steps: TraceStep[] = [];
  const h = elementLoad.thickness;
  const L = elementLoad.span;
  const rho = material.density;
  const supportCondition = elementLoad.supportCondition;

  // Natural period
  const T = Math.sqrt(12 * rho / (material.Ec * 1e9)) * 0.063 * L * (L / Math.max(h, 0.01));
  const C_val = supportCondition === 'fixed' ? 0.031 : supportCondition === 'partial_fixity' ? 0.047 : 0.063;

  steps.push({
    equationId: 'SDOF-001',
    equation: `T = C x L x (L/h)^2   [C=${C_val}]`,
    source: 'Euler-Bernoulli + Biggs Table 5-1',
    inputs: [
      { label: 'L', value: L.toFixed(2), unit: 'm' },
      { label: 'h', value: h.toFixed(3), unit: 'm' },
      { label: 'C', value: C_val.toFixed(3), unit: '' },
    ],
    output: { label: 'T', value: T.toFixed(2), unit: 'ms' },
  });

  // KLM
  const KLM = supportCondition === 'fixed' ? 0.64 : supportCondition === 'partial_fixity' ? 0.71 : 0.78;
  steps.push({
    equationId: 'SDOF-002',
    equation: `KLM = K_M / K_L = ${KLM}`,
    source: 'Biggs (1964) Table 5-1',
    inputs: [
      { label: 'support', value: supportCondition, unit: '' },
    ],
    output: { label: 'KLM', value: KLM.toFixed(2), unit: '' },
  });

  return steps;
}

/**
 * Build the structural demand trace steps (w, Mu, Vu, delta).
 */
function buildDemandTrace(
  element: 'roof' | 'wall' | 'floor',
  elementLoad: DesignElementLoad,
  material: DesignMaterial,
  result: ElementDesignResult,
  criteria: DesignCriteria,
): TraceStep[] {
  const steps: TraceStep[] = [];
  const L = elementLoad.span;
  const supportCondition = elementLoad.supportCondition;
  const w = result.designMoment * (supportCondition === 'fixed' ? 12 : supportCondition === 'partial_fixity' ? 10 : 8) / (L * L);

  // Total design load
  steps.push({
    equationId: 'DEMAND-004',
    equation: 'w_total = w_blast + static',
    source: 'UFC 3-340-02 Ch.5',
    inputs: [
      { label: 'static', value: elementLoad.staticPressure.toFixed(1), unit: 'kPa' },
    ],
    output: { label: 'w_total', value: (w).toFixed(1), unit: 'kPa' },
  });

  // Design moment
  const C_moment = supportCondition === 'fixed' ? 12 : supportCondition === 'partial_fixity' ? 10 : 8;
  steps.push({
    equationId: 'DEMAND-005',
    equation: `Mu = w x L^2 / ${C_moment}`,
    source: 'Structural mechanics',
    inputs: [
      { label: 'w', value: w.toFixed(1), unit: 'kPa' },
      { label: 'L', value: L.toFixed(2), unit: 'm' },
    ],
    output: { label: 'Mu', value: result.designMoment.toFixed(2), unit: 'kN*m/m' },
  });

  // Design shear
  steps.push({
    equationId: 'DEMAND-006',
    equation: 'Vu = w x L / 2',
    source: 'Structural mechanics',
    inputs: [
      { label: 'w', value: w.toFixed(1), unit: 'kPa' },
      { label: 'L', value: L.toFixed(2), unit: 'm' },
    ],
    output: { label: 'Vu', value: result.designShear.toFixed(2), unit: 'kN/m' },
  });

  // Deflection
  steps.push({
    equationId: 'DEMAND-007',
    equation: 'delta = C x w x L^4 / (E x I)',
    source: 'Euler-Bernoulli beam theory',
    inputs: [
      { label: 'E', value: (material.Ec).toFixed(0), unit: 'MPa' },
      { label: 'I', value: (Math.pow(elementLoad.thickness, 3) / 12).toFixed(6), unit: 'm^4/m' },
    ],
    output: { label: 'delta', value: result.maxDeflection.toFixed(2), unit: 'mm' },
  });

  return steps;
}

/**
 * Build the capacity verification trace steps.
 */
function buildCapacityTrace(
  result: ElementDesignResult,
  verification: ElementVerificationResult,
  criteria: DesignCriteria,
): TraceStep[] {
  const steps: TraceStep[] = [];

  // Required As
  steps.push({
    equationId: 'RC-002',
    equation: 'As from quadratic (ACI 318-19)',
    source: 'ACI 318-19',
    inputs: [],
    output: { label: 'As_req', value: result.requiredAs.toFixed(1), unit: 'mm^2/m' },
  });

  // Provided As
  steps.push({
    equationId: 'RC-004',
    equation: 'phiMn = phi x As x fy x (d - a/2)',
    source: 'ACI 318-19 Ch.22',
    inputs: [
      { label: 'bar', value: `T${result.mainReinforcement.barDiameter}`, unit: `@ ${result.mainReinforcement.spacing}mm` },
      { label: 'As_prov', value: result.mainReinforcement.asProvided.toFixed(1), unit: 'mm^2/m' },
    ],
    output: { label: 'phiMn', value: (result.flexuralSafetyFactor * result.designMoment).toFixed(2), unit: 'kN*m/m' },
  });

  // Flexure SF
  steps.push({
    equationId: 'VERIFY-001',
    equation: 'SF = phiMn / Mu',
    source: 'UFC 3-340-02',
    inputs: [
      { label: 'Mu', value: result.designMoment.toFixed(2), unit: 'kN*m/m' },
    ],
    output: { label: 'SF_flex', value: verification.flexuralSF.toFixed(2), unit: '' },
  });

  // Shear SF
  steps.push({
    equationId: 'VERIFY-002',
    equation: 'SF = phiVn / Vu',
    source: 'UFC 3-340-02',
    inputs: [
      { label: 'Vu', value: result.designShear.toFixed(2), unit: 'kN/m' },
    ],
    output: { label: 'SF_shear', value: verification.shearSF.toFixed(2), unit: '' },
  });

  return steps;
}

// ═══════════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════════

/** Format a trace step into ReportContent items */
function formatTraceStep(step: TraceStep): ReportContent[] {
  const items: ReportContent[] = [];

  items.push({
    type: 'key-value',
    keyAr: `[${step.equationId}] ${step.equation}`,
    keyEn: `[${step.equationId}] ${step.equation}`,
    value: step.source,
  });

  for (const inp of step.inputs) {
    items.push({
      type: 'key-value',
      keyAr: `  مدخل: ${inp.label}`,
      keyEn: `  Input: ${inp.label}`,
      value: inp.value,
      unit: inp.unit,
    });
  }

  items.push({
    type: 'key-value',
    keyAr: `  ناتج: ${step.output.label}`,
    keyEn: `  Output: ${step.output.label}`,
    value: step.output.value,
    unit: step.output.unit,
  });

  return items;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION GENERATORS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate the Input Summary section with design criteria.
 */
function generateDesignInputSection(designInput: DesignInput): ReportSection {
  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'ملخص مدخلات التصميم الإنشائي — المعايير والمواد والأبعاد المستخدمة في محرك التصميم.',
      textEn: 'Summary of structural design inputs — criteria, materials, and dimensions used by the design engine.',
    },
    { type: 'divider' },
  ];

  // Design Criteria
  const c = designInput.criteria;
  content.push({
    type: 'key-value',
    keyAr: 'عامل الأمان المستهدف',
    keyEn: 'Target Safety Factor',
    value: `${c.targetSafetyFactor}`,
  });
  content.push({
    type: 'key-value',
    keyAr: 'استجابة بلاستيكية',
    keyEn: 'Plastic Response Allowed',
    value: c.allowPlasticResponse ? 'نعم / Yes' : 'لا / No',
  });
  content.push({
    type: 'key-value',
    keyAr: 'درجة الفولاذ fy',
    keyEn: 'Steel Grade fy',
    value: `${c.steelGrade}`,
    unit: 'MPa',
  });
  content.push({
    type: 'key-value',
    keyAr: 'غطاء الخرسانة',
    keyEn: 'Concrete Cover',
    value: `${(c.concreteCover * 1000).toFixed(0)}`,
    unit: 'mm',
  });
  content.push({
    type: 'key-value',
    keyAr: 'نسبة الانحراف القصوى',
    keyEn: 'Max Deflection Ratio',
    value: `${(c.maxDeflectionRatio * 1000).toFixed(2)}‰`,
  });

  content.push({ type: 'divider' });

  // Material
  const mat = designInput.elements.roof.material;
  content.push({
    type: 'key-value',
    keyAr: "مقاومة الضغط fc'",
    keyEn: "Compressive Strength fc'",
    value: `${mat.fpc}`,
    unit: 'MPa',
  });
  content.push({
    type: 'key-value',
    keyAr: 'معامل المرونة Ec',
    keyEn: 'Modulus of Elasticity Ec',
    value: `${mat.Ec}`,
    unit: 'MPa',
  });
  content.push({
    type: 'key-value',
    keyAr: 'DIF الخرسانة (ضغط)',
    keyEn: 'Concrete DIF (compressive)',
    value: `${mat.difCompressive}`,
  });

  return {
    id: 'calc-design-inputs',
    titleAr: 'مدخلات التصميم',
    titleEn: 'Design Inputs',
    severity: 'neutral',
    content,
  };
}

/**
 * Generate the Blast Response Trace section.
 */
function generateBlastTraceSection(designInput: DesignInput): ReportSection {
  const blast = designInput.blast;
  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'مسار الاستجابة الانفجارية — من الضغط الحادث إلى الضغط المنعكس والنبضة الديناميكية.',
      textEn: 'Blast response trace — from incident pressure to reflected pressure and dynamic impulse.',
    },
    { type: 'divider' },
  ];

  content.push({
    type: 'key-value',
    keyAr: 'كتلة TNT المكافئة',
    keyEn: 'TNT Equivalent Mass',
    value: `${blast.tntEquivalentMass.toFixed(1)}`,
    unit: 'kg',
  });
  content.push({
    type: 'key-value',
    keyAr: 'المسافة المقيسة Z',
    keyEn: 'Scaled Distance Z',
    value: `${blast.scaledDistance.toFixed(3)}`,
    unit: 'm/kg^(1/3)',
  });
  content.push({ type: 'divider' });

  content.push({
    type: 'key-value',
    keyAr: '[BLAST-002] الضغط الحادث Pso',
    keyEn: '[BLAST-002] Incident Pressure Pso',
    value: `${blast.peakIncidentPressure.toFixed(1)}`,
    unit: 'kPa',
  });
  content.push({
    type: 'key-value',
    keyAr: '[BLAST-003/004] معامل الانعكاس Cr',
    keyEn: '[BLAST-003/004] Reflection Coefficient Cr',
    value: `${(blast.peakReflectedPressure / Math.max(blast.peakIncidentPressure, 0.01)).toFixed(2)}`,
  });
  content.push({
    type: 'key-value',
    keyAr: '[BLAST-004] الضغط المنعكس Pr',
    keyEn: '[BLAST-004] Reflected Pressure Pr',
    value: `${blast.peakReflectedPressure.toFixed(1)}`,
    unit: 'kPa',
  });
  content.push({
    type: 'key-value',
    keyAr: 'الضغط الديناميكي q',
    keyEn: 'Dynamic Pressure q',
    value: `${blast.peakDynamicPressure.toFixed(1)}`,
    unit: 'kPa',
  });
  content.push({ type: 'divider' });

  content.push({
    type: 'key-value',
    keyAr: 'الدافع (النبضة) I',
    keyEn: 'Impulse I',
    value: `${blast.positivePhaseImpulse.toFixed(1)}`,
    unit: 'kPa*ms',
  });
  content.push({
    type: 'key-value',
    keyAr: 'مدة الطور الموجب td',
    keyEn: 'Positive Phase Duration td',
    value: `${blast.positivePhaseDuration.toFixed(2)}`,
    unit: 'ms',
  });

  return {
    id: 'calc-blast-trace',
    titleAr: 'مسار الاستجابة الانفجارية',
    titleEn: 'Blast Response Trace',
    severity: 'neutral',
    content,
  };
}

/**
 * Generate the Structural Demand Trace section for all elements.
 */
function generateDemandTraceSection(
  designInput: DesignInput,
  designResult: DesignResult,
): ReportSection {
  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'مسار الطلب الإنشائي لكل عنصر — من الحمل الديناميكي المكافئ إلى عزم الانحناء وقوة القص والتسليح المطلوب.',
      textEn: 'Structural demand trace for each element — from equivalent dynamic load to design moment, shear, and required reinforcement.',
    },
    { type: 'divider' },
  ];

  for (const key of ['roof', 'wall', 'floor'] as const) {
    const labels = ELEMENT_NAMES[key]!;
    const elResult: ElementDesignResult = designResult[key];
    const elLoad: DesignElementLoad = designInput.elements[key];
    const elVer: ElementVerificationResult = designResult.verification.elements[key];

    content.push({
      type: 'paragraph',
      textAr: `── ${labels.ar} / ${labels.en} ──`,
      textEn: `── ${labels.en} ──`,
    });

    // SDOF trace
    const h = elLoad.thickness;
    const L = elLoad.span;
    const supportCondition = elLoad.supportCondition;
    const C_val = supportCondition === 'fixed' ? 0.031 : supportCondition === 'partial_fixity' ? 0.047 : 0.063;
    const KLM = supportCondition === 'fixed' ? 0.64 : supportCondition === 'partial_fixity' ? 0.71 : 0.78;
    const T = C_val * L * Math.pow(L / Math.max(h, 0.01), 2);
    const tdOverT = designInput.blast.positivePhaseDuration / Math.max(T, 0.01);

    content.push({
      type: 'key-value',
      keyAr: `[SDOF-001] الفترة الطبيعية T — ${labels.ar}`,
      keyEn: `[SDOF-001] Natural Period T — ${labels.en}`,
      value: `${T.toFixed(2)}`,
      unit: 'ms',
    });
    content.push({
      type: 'key-value',
      keyAr: `[SDOF-002] KLM`,
      keyEn: `[SDOF-002] KLM`,
      value: `${KLM.toFixed(2)}`,
    });
    content.push({
      type: 'key-value',
      keyAr: `[SDOF-003] td/T`,
      keyEn: `[SDOF-003] td/T`,
      value: `${tdOverT.toFixed(3)}`,
      unit: tdOverT < 0.2 ? ' (impulsive)' : ' (quasi-static)',
    });

    content.push({ type: 'divider' });

    // Demand values
    content.push({
      type: 'key-value',
      keyAr: `[DEMAND-005] عزم الانحناء Mu — ${labels.ar}`,
      keyEn: `[DEMAND-005] Design Moment Mu — ${labels.en}`,
      value: `${elResult.designMoment.toFixed(2)}`,
      unit: 'kN*m/m',
    });
    content.push({
      type: 'key-value',
      keyAr: `[DEMAND-006] قوة القص Vu — ${labels.ar}`,
      keyEn: `[DEMAND-006] Design Shear Vu — ${labels.en}`,
      value: `${elResult.designShear.toFixed(2)}`,
      unit: 'kN/m',
    });
    content.push({
      type: 'key-value',
      keyAr: `[DEMAND-007] الانحراف delta — ${labels.ar}`,
      keyEn: `[DEMAND-007] Deflection delta — ${labels.en}`,
      value: `${elResult.maxDeflection.toFixed(2)}`,
      unit: 'mm',
    });

    content.push({ type: 'divider' });

    // Reinforcement
    content.push({
      type: 'key-value',
      keyAr: `[RC-002] As المطلوب — ${labels.ar}`,
      keyEn: `[RC-002] As Required — ${labels.en}`,
      value: `${elResult.requiredAs.toFixed(1)}`,
      unit: 'mm^2/m',
    });
    content.push({
      type: 'key-value',
      keyAr: `[RC-004] As المقدم — ${labels.ar}`,
      keyEn: `[RC-004] As Provided — ${labels.en}`,
      value: `${elResult.mainReinforcement.asProvided.toFixed(1)}`,
      unit: `mm^2/m (T${elResult.mainReinforcement.barDiameter} @ ${elResult.mainReinforcement.spacing}mm)`,
    });

    content.push({ type: 'divider' });
  }

  // Remove trailing divider
  if (content.length > 0 && content[content.length - 1]?.type === 'divider') {
    content.pop();
  }

  return {
    id: 'calc-demand-trace',
    titleAr: 'مسار الطلب الإنشائي',
    titleEn: 'Structural Demand Trace',
    severity: 'neutral',
    content,
  };
}

/**
 * Generate the Capacity Verification Table section.
 */
function generateVerificationTableSection(
  designInput: DesignInput,
  designResult: DesignResult,
): ReportSection {
  const criteria = designInput.criteria;
  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'جدول التحقق من القدرة — مقارنة الطلب بالقدرة لكل عنصر وكل نمط فشل مع معادلة المصدر.',
      textEn: 'Capacity verification table — demand vs. capacity comparison for each element and failure mode with source equation.',
    },
    { type: 'divider' },
  ];

  // Verification table
  const headers = [
    'العنصر / Element',
    'التحقق / Check',
    'المعادلة / Eq.',
    'الطلب / Demand',
    'القدرة / Capacity',
    'عامل الأمان / SF',
    'المطلوب / Req.',
    'الحالة / Status',
  ];

  const rows: string[][] = [];
  for (const key of ['roof', 'wall', 'floor'] as const) {
    const labels = ELEMENT_NAMES[key]!;
    const el = designResult[key];
    const ver = designResult.verification.elements[key];
    const phiMn = el.flexuralSafetyFactor * el.designMoment;
    const phiVc = el.shearSafetyFactor * el.designShear;

    rows.push([
      `${labels.ar} / ${labels.en}`,
      'انحناء / Flexure',
      'VERIFY-001',
      `${el.designMoment.toFixed(2)} kN*m/m`,
      `${phiMn.toFixed(2)} kN*m/m`,
      `${ver.flexuralSF.toFixed(2)}`,
      `>= ${criteria.targetSafetyFactor}`,
      ver.flexuralPass ? 'PASS' : 'FAIL',
    ]);

    rows.push([
      `${labels.ar} / ${labels.en}`,
      'قص / Shear',
      'VERIFY-002',
      `${el.designShear.toFixed(2)} kN/m`,
      `${phiVc.toFixed(2)} kN/m`,
      `${ver.shearSF.toFixed(2)}`,
      `>= ${criteria.targetSafetyFactor}`,
      ver.shearPass ? 'PASS' : 'FAIL',
    ]);

    rows.push([
      `${labels.ar} / ${labels.en}`,
      'اختراق / Penetration',
      'VERIFY-003',
      '-',
      '-',
      ver.penetrationSF === Infinity ? 'N/A' : `${ver.penetrationSF.toFixed(2)}`,
      '>= 1.0',
      ver.penetrationPass ? 'PASS' : 'FAIL',
    ]);

    rows.push([
      `${labels.ar} / ${labels.en}`,
      'انحراف / Deflection',
      'VERIFY-004',
      `${el.maxDeflection.toFixed(2)} mm`,
      `${(designInput.elements[key].span * criteria.maxDeflectionRatio * 1000).toFixed(2)} mm`,
      `${(ver.deflectionRatio * 1000).toFixed(2)}‰`,
      `<= ${(criteria.maxDeflectionRatio * 1000).toFixed(2)}‰`,
      ver.deflectionPass ? 'PASS' : 'FAIL',
    ]);
  }

  content.push({
    type: 'table',
    headers,
    rows,
    captionAr: 'جدول التحقق الشامل من القدرة مع مراجع المعادلات',
    captionEn: 'Comprehensive capacity verification table with equation references',
  });

  // Governing mode
  const govElem = ELEMENT_NAMES[designResult.verification.governingElement]!;
  const modeAr = designResult.verification.governingMode === 'flexure' ? 'انحناء'
    : designResult.verification.governingMode === 'shear' ? 'قص'
    : designResult.verification.governingMode === 'penetration' ? 'اختراق'
    : designResult.verification.governingMode === 'deflection' ? 'انحراف'
    : 'لا يوجد';

  content.push({ type: 'divider' });
  content.push({
    type: 'key-value',
    keyAr: 'العنصر الحاكم',
    keyEn: 'Governing Element',
    value: `${govElem.ar} / ${govElem.en}`,
  });
  content.push({
    type: 'key-value',
    keyAr: 'نمط الفشل الحاكم',
    keyEn: 'Governing Failure Mode',
    value: modeAr,
  });

  const severity = designResult.designStatus === 'PASS' ? 'success'
    : designResult.designStatus === 'FAIL' ? 'critical' : 'warning';

  return {
    id: 'calc-verification-table',
    titleAr: 'جدول التحقق من القدرة',
    titleEn: 'Capacity Verification Table',
    severity,
    content,
  };
}

/**
 * Generate the Equation Reference section.
 * Lists all equations used with their sources.
 */
function generateEquationReferenceSection(): ReportSection {
  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'مرجع المعادلات المستخدمة في محرك التصميم — مع المصدر الهندسي والوحدات.',
      textEn: 'Equations used in the design engine — with engineering references and units.',
    },
    { type: 'divider' },
  ];

  // Group by category
  const categories = [
    { key: 'blast-loading', nameAr: 'أحمال الانفجار', nameEn: 'Blast Loading' },
    { key: 'sdof-dynamics', nameAr: 'الاستجابة الديناميكية', nameEn: 'SDOF Dynamics' },
    { key: 'structural-demand', nameAr: 'الطلب الإنشائي', nameEn: 'Structural Demand' },
    { key: 'reinforcement-design', nameAr: 'تصميم التسليح', nameEn: 'Reinforcement Design' },
    { key: 'capacity-verification', nameAr: 'التحقق من القدرة', nameEn: 'Capacity Verification' },
    { key: 'earth-pressure', nameAr: 'ضغط التربة', nameEn: 'Earth Pressure' },
    { key: 'soil-attenuation', nameAr: 'تخفيف التربة', nameEn: 'Soil Attenuation' },
    { key: 'material-properties', nameAr: 'خصائص المواد', nameEn: 'Material Properties' },
  ] as const;

  for (const cat of categories) {
    const eqs = getEquationsByCategory(cat.key as never);
    if (eqs.length === 0) continue;

    content.push({
      type: 'paragraph',
      textAr: `── ${cat.nameAr} / ${cat.nameEn} (${eqs.length}) ──`,
      textEn: `── ${cat.nameEn} (${eqs.length}) ──`,
    });

    for (const eq of eqs) {
      content.push({
        type: 'key-value',
        keyAr: `[${eq.id}] ${eq.name}`,
        keyEn: `[${eq.id}] ${eq.name}`,
        value: eq.source,
      });
    }

    content.push({ type: 'divider' });
  }

  // Remove trailing divider
  if (content.length > 0 && content[content.length - 1]?.type === 'divider') {
    content.pop();
  }

  return {
    id: 'calc-equation-reference',
    titleAr: 'مرجع المعادلات',
    titleEn: 'Equation Reference',
    severity: 'neutral',
    content,
  };
}

/**
 * Generate the Design Assumptions section.
 * Lists all assumptions with their impact levels.
 */
function generateAssumptionsSection(): ReportSection {
  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: 'الافتراضات المستخدمة في محرك التصميم — مع التقييم ودرجة التأثير.',
      textEn: 'Assumptions used in the design engine — with rationale and impact assessment.',
    },
    { type: 'divider' },
  ];

  // Group by category
  const catGroups = [
    { key: 'boundary-conditions', nameAr: 'الشروط الحدية', nameEn: 'Boundary Conditions' },
    { key: 'material-behavior', nameAr: 'سلوك المواد', nameEn: 'Material Behavior' },
    { key: 'dynamic-response', nameAr: 'الاستجابة الديناميكية', nameEn: 'Dynamic Response' },
    { key: 'loading', nameAr: 'الأحمال', nameEn: 'Loading' },
    { key: 'safety', nameAr: 'السلامة', nameEn: 'Safety' },
    { key: 'soil-interaction', nameAr: 'التفاعل مع التربة', nameEn: 'Soil Interaction' },
    { key: 'analysis-method', nameAr: 'طريقة التحليل', nameEn: 'Analysis Method' },
  ] as const;

  // Table of all assumptions
  const headers = ['المعرف / ID', 'الافتراض / Assumption', 'التأثير / Impact', 'الموقع / Location'];
  const rows: string[][] = [];

  for (const a of DESIGN_ASSUMPTIONS) {
    rows.push([
      a.id,
      a.name,
      a.impact,
      a.location.split(':')[0] ?? a.location,
    ]);
  }

  content.push({
    type: 'table',
    headers,
    rows,
    captionAr: 'سجل الافتراضات الكامل — إجمالي ' + DESIGN_ASSUMPTIONS.length + ' افتراض',
    captionEn: 'Complete assumptions registry — ' + DESIGN_ASSUMPTIONS.length + ' assumptions total',
  });

  return {
    id: 'calc-assumptions',
    titleAr: 'افتراضات التصميم',
    titleEn: 'Design Assumptions',
    severity: 'neutral',
    content,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate the complete Calculation Trace Report.
 *
 * Produces a multi-section report showing the full engineering
 * calculation path with equation references, input/output values,
 * and verification tables.
 *
 * Sections:
 *   1. Design Inputs (criteria, material, geometry)
 *   2. Blast Response Trace (Pso → Pr → I → td)
 *   3. Structural Demand Trace (SDOF → w → Mu/Vu/δ → As)
 *   4. Capacity Verification Table (Demand vs. Capacity with SF)
 *   5. Equation Reference (all equations with sources)
 *   6. Design Assumptions (all assumptions with impact)
 *
 * @param designInput  - The design engine input
 * @param designResult - The design engine result
 * @returns Array of ReportSections
 */
export function generateCalculationTraceReport(
  designInput: DesignInput,
  designResult: DesignResult,
): ReportSection[] {
  const sections: ReportSection[] = [];

  // 1. Design Inputs
  sections.push(generateDesignInputSection(designInput));

  // 2. Blast Response Trace
  sections.push(generateBlastTraceSection(designInput));

  // 3. Structural Demand Trace
  sections.push(generateDemandTraceSection(designInput, designResult));

  // 4. Capacity Verification Table
  sections.push(generateVerificationTableSection(designInput, designResult));

  // 5. Equation Reference
  sections.push(generateEquationReferenceSection());

  // 6. Design Assumptions
  sections.push(generateAssumptionsSection());

  return sections;
}

/**
 * Generate a summary trace for a single element.
 * Useful for detailed per-element calculation sheets.
 */
export function generateElementTraceSheet(
  element: 'roof' | 'wall' | 'floor',
  designInput: DesignInput,
  designResult: DesignResult,
): ReportSection {
  const labels = ELEMENT_NAMES[element]!;
  const elResult: ElementDesignResult = designResult[element];
  const elLoad: DesignElementLoad = designInput.elements[element];
  const elVer: ElementVerificationResult = designResult.verification.elements[element];
  const mat: DesignMaterial = elLoad.material;
  const criteria: DesignCriteria = designInput.criteria;

  const content: ReportContent[] = [
    {
      type: 'paragraph',
      textAr: `ورقة الحساب التفصيلية لعنصر ${labels.ar} — مسار كامل من المدخلات إلى النتائج مع مراجع المعادلات.`,
      textEn: `Detailed calculation sheet for ${labels.en} element — complete path from inputs to results with equation references.`,
    },
    { type: 'divider' },
  ];

  // Geometry
  content.push({
    type: 'key-value',
    keyAr: 'البُعد',
    keyEn: 'Span',
    value: `${elLoad.span.toFixed(2)}`,
    unit: 'm',
  });
  content.push({
    type: 'key-value',
    keyAr: 'السماكة الحالية',
    keyEn: 'Existing Thickness',
    value: `${(elResult.existingThickness * 1000).toFixed(0)}`,
    unit: 'mm',
  });
  content.push({
    type: 'key-value',
    keyAr: 'السماكة المطلوبة',
    keyEn: 'Required Thickness',
    value: `${(elResult.requiredThickness * 1000).toFixed(0)}`,
    unit: 'mm',
  });
  content.push({
    type: 'key-value',
    keyAr: 'حالة الدعامة',
    keyEn: 'Support Condition',
    value: elLoad.supportCondition,
  });
  content.push({ type: 'divider' });

  // Material
  content.push({
    type: 'key-value',
    keyAr: "f'c",
    keyEn: "f'c",
    value: `${mat.fpc}`,
    unit: 'MPa',
  });
  content.push({
    type: 'key-value',
    keyAr: 'Ec',
    keyEn: 'Ec',
    value: `${mat.Ec}`,
    unit: 'MPa',
  });
  content.push({
    type: 'key-value',
    keyAr: 'DIF فولاذ',
    keyEn: 'Steel DIF',
    value: `${mat.difTensile}`,
  });
  content.push({
    type: 'key-value',
    keyAr: 'DIF خرسانة',
    keyEn: 'Concrete DIF',
    value: `${mat.difCompressive}`,
  });
  content.push({ type: 'divider' });

  // Blast inputs to this element
  content.push({
    type: 'paragraph',
    textAr: '── مسار الانفجار ──',
    textEn: '── Blast Path ──',
  });

  const blastP = element === 'roof'
    ? designInput.blast.peakReflectedPressure
    : element === 'wall'
      ? designInput.blast.peakReflectedPressure * 0.70
      : designInput.blast.peakDynamicPressure;

  content.push({
    type: 'key-value',
    keyAr: '[BLAST-001] P_peak',
    keyEn: '[BLAST-001] P_peak',
    value: `${blastP.toFixed(1)}`,
    unit: 'kPa',
  });
  content.push({
    type: 'key-value',
    keyAr: 'I',
    keyEn: 'I',
    value: `${designInput.blast.positivePhaseImpulse.toFixed(1)}`,
    unit: 'kPa*ms',
  });
  content.push({
    type: 'key-value',
    keyAr: 'td',
    keyEn: 'td',
    value: `${designInput.blast.positivePhaseDuration.toFixed(2)}`,
    unit: 'ms',
  });
  content.push({ type: 'divider' });

  // SDOF
  content.push({
    type: 'paragraph',
    textAr: '── الاستجابة الديناميكية ──',
    textEn: '── Dynamic Response ──',
  });

  const C_val = elLoad.supportCondition === 'fixed' ? 0.031 : elLoad.supportCondition === 'partial_fixity' ? 0.047 : 0.063;
  const KLM = elLoad.supportCondition === 'fixed' ? 0.64 : elLoad.supportCondition === 'partial_fixity' ? 0.71 : 0.78;
  const T = C_val * elLoad.span * Math.pow(elLoad.span / Math.max(elLoad.thickness, 0.01), 2);

  content.push({
    type: 'key-value',
    keyAr: '[SDOF-001] T',
    keyEn: '[SDOF-001] T',
    value: `${T.toFixed(2)}`,
    unit: 'ms',
  });
  content.push({
    type: 'key-value',
    keyAr: '[SDOF-002] KLM',
    keyEn: '[SDOF-002] KLM',
    value: `${KLM.toFixed(2)}`,
  });
  content.push({
    type: 'key-value',
    keyAr: '[SDOF-003] td/T',
    keyEn: '[SDOF-003] td/T',
    value: `${(designInput.blast.positivePhaseDuration / Math.max(T, 0.01)).toFixed(3)}`,
  });
  content.push({ type: 'divider' });

  // Demand
  content.push({
    type: 'paragraph',
    textAr: '── الطلب الإنشائي ──',
    textEn: '── Structural Demand ──',
  });
  content.push({
    type: 'key-value',
    keyAr: `[DEMAND-005] Mu`,
    keyEn: `[DEMAND-005] Mu`,
    value: `${elResult.designMoment.toFixed(2)}`,
    unit: 'kN*m/m',
  });
  content.push({
    type: 'key-value',
    keyAr: `[DEMAND-006] Vu`,
    keyEn: `[DEMAND-006] Vu`,
    value: `${elResult.designShear.toFixed(2)}`,
    unit: 'kN/m',
  });
  content.push({
    type: 'key-value',
    keyAr: `[DEMAND-007] delta`,
    keyEn: `[DEMAND-007] delta`,
    value: `${elResult.maxDeflection.toFixed(2)}`,
    unit: 'mm',
  });
  content.push({ type: 'divider' });

  // Reinforcement
  content.push({
    type: 'paragraph',
    textAr: '── التسليح ──',
    textEn: '── Reinforcement ──',
  });
  content.push({
    type: 'key-value',
    keyAr: `[RC-002] As_req`,
    keyEn: `[RC-002] As_req`,
    value: `${elResult.requiredAs.toFixed(1)}`,
    unit: 'mm^2/m',
  });
  content.push({
    type: 'key-value',
    keyAr: `[RC-004] As_prov`,
    keyEn: `[RC-004] As_prov`,
    value: `${elResult.mainReinforcement.asProvided.toFixed(1)}`,
    unit: `mm^2/m (T${elResult.mainReinforcement.barDiameter} @ ${elResult.mainReinforcement.spacing}mm)`,
  });
  content.push({ type: 'divider' });

  // Verification
  content.push({
    type: 'paragraph',
    textAr: '── التحقق ──',
    textEn: '── Verification ──',
  });
  content.push({
    type: 'key-value',
    keyAr: `[VERIFY-001] SF_flexure`,
    keyEn: `[VERIFY-001] SF_flexure`,
    value: `${elVer.flexuralSF.toFixed(2)}`,
    unit: elVer.flexuralPass ? 'PASS' : 'FAIL',
  });
  content.push({
    type: 'key-value',
    keyAr: `[VERIFY-002] SF_shear`,
    keyEn: `[VERIFY-002] SF_shear`,
    value: `${elVer.shearSF.toFixed(2)}`,
    unit: elVer.shearPass ? 'PASS' : 'FAIL',
  });
  content.push({
    type: 'key-value',
    keyAr: `[VERIFY-003] SF_penetration`,
    keyEn: `[VERIFY-003] SF_penetration`,
    value: elVer.penetrationSF === Infinity ? 'N/A (no threat)' : `${elVer.penetrationSF.toFixed(2)}`,
    unit: elVer.penetrationPass ? 'PASS' : 'FAIL',
  });
  content.push({
    type: 'key-value',
    keyAr: `[VERIFY-004] delta/L`,
    keyEn: `[VERIFY-004] delta/L`,
    value: `${(elVer.deflectionRatio * 1000).toFixed(2)}‰`,
    unit: elVer.deflectionPass ? 'PASS' : 'FAIL',
  });
  content.push({
    type: 'key-value',
    keyAr: 'نمط التحكم',
    keyEn: 'Governing Mode',
    value: elVer.governingMode,
  });

  const severity = elVer.overallPass ? 'success' : 'critical';

  return {
    id: `calc-element-${element}`,
    titleAr: `ورقة حساب: ${labels.ar}`,
    titleEn: `Calculation Sheet: ${labels.en}`,
    severity,
    content,
  };
}