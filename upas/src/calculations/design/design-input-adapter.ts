/**
 * UPAS — Design Input Adapter
 * Phase 0: Design Model Foundation
 *
 * Transforms FullAnalysisResult + DesignCriteria into the unified DesignInput
 * that the design engine will consume. This is the ONLY bridge between the
 * analysis world and the design world.
 *
 * Architecture Rule:
 *   The design engine reads ONLY DesignInput. It never imports from
 *   calculations/types.ts (analysis types), results/, structure/, soil/, or threat/.
 *
 * This adapter is responsible for:
 *   1. Extracting per-element loads from FullAnalysisResult
 *   2. Computing missing data (impulse distribution, lateral pressure, self-weight)
 *   3. Applying DesignCriteria defaults
 *   4. Producing diagnostics (DesignInputWarning) for missing/questionable data
 *
 * Data gaps resolved here (from Phase 0 audit):
 *   G1: fy → from DesignCriteria.reinforcementGrade (NOT from materials.json)
 *   G2: Lateral earth pressure → delegated to soil-pressure.ts
 *   G3: supportCondition → from DesignCriteria
 *   G4: Impulse per-element → global impulse × distribution factor
 *   G5: Concrete cover → from DesignCriteria
 *   G6: Self-weight → computed: ρ × h × g
 *   G7: Soil reaction (floor) → approximated from effectiveStress
 *
 * Reference Standards:
 * - UFC 3-340-02 (Loads & Response)
 * - ACI 318-19 (Reinforcement Design)
 * - TM 5-855-1 (Blast & Ground Shock)
 */

import type { FullAnalysisResult } from '../types';
import type {
  DesignInput,
  DesignElementLoad,
  DesignMaterial,
  DesignSoil,
  DesignCriteria,
  DesignAdapterResult,
  DesignInputWarning,
  DesignPenetrationData,
} from './types';

import {
  calculateActiveEarthPressureCoeff,
  calculateAtRestEarthPressureCoeff,
  calculateAverageWallLateralPressure,
} from './soil-pressure';

import { GRAVITY, DEFAULT_DESIGN_CRITERIA } from '../constants';

// ─── Pressure Distribution Factors ──────────────────────────────────
// Reference: TM 5-1300 / UFC 3-340-02, Chapter 5
// These factors distribute the soil-attenuated blast pressure to each element.

const ROOF_PRESSURE_FACTOR = 1.00;   // Roof receives 100% of pressure
const WALL_PRESSURE_FACTOR = 0.70;   // Wall receives 70% (lateral reduction)
const FLOOR_PRESSURE_FACTOR = 0.50;  // Floor receives 50% (attenuated through structure)

// ─── Span Determination ─────────────────────────────────────────────

/** Determine the design span for a structural element (m).
 *  Matches the logic in structure/index.ts for consistency.
 */
function getElementSpan(
  element: 'roof' | 'wall' | 'floor',
  structure: FullAnalysisResult['input']['structure'],
): number {
  switch (element) {
    case 'wall':
      return Math.min(structure.length, structure.height);
    case 'roof':
    case 'floor':
      return structure.length;
  }
}

// ─── Material Extraction ────────────────────────────────────────────

/** Extract DesignMaterial from the analysis MaterialInput. */
function extractDesignMaterial(materialInput: FullAnalysisResult['input']['structure']['roofMaterial']): DesignMaterial {
  return {
    fpc: materialInput.compressiveStrength,
    ft: materialInput.tensileStrength,
    // Convert GPa to MPa for design calculations
    Ec: materialInput.modulusOfElasticity * 1000,
    density: materialInput.density,
    poissonRatio: materialInput.poissonRatio,
    difCompressive: materialInput.difCompressive,
    difTensile: materialInput.difTensile,
    category: materialInput.category,
    materialRef: materialInput.materialRef,
  };
}

// ─── Soil Properties Extraction ─────────────────────────────────────

/** Build DesignSoil from FullAnalysisResult's soil and SSI data. */
function extractDesignSoil(
  analysisResult: FullAnalysisResult,
  criteria: DesignCriteria,
): { soil: DesignSoil; warnings: DesignInputWarning[] } {
  const warnings: DesignInputWarning[] = [];
  const ssi = analysisResult.blast.soilInteraction;
  const soilInput = analysisResult.input.soil;

  // Average properties from the first layer (surrounding the structure)
  // For multi-layer profiles, the top layer typically surrounds the structure
  const topLayer = soilInput.layers[0];

  // Compute coefficients from friction angle
  const Ka = calculateActiveEarthPressureCoeff(topLayer.frictionAngle);
  const Ko = calculateAtRestEarthPressureCoeff(topLayer.frictionAngle);

  const soil: DesignSoil = {
    averageUnitWeight: ssi?.averageUnitWeight ?? topLayer.unitWeight,
    frictionAngle: topLayer.frictionAngle,
    cohesion: topLayer.cohesion,
    activeEarthPressureCoeff: Ka,
    atRestEarthPressureCoeff: Ko,
    coverDepth: analysisResult.input.structure.burialDepth,
    overburdenPressure: ssi?.overburdenPressure ?? 0,
    effectiveStress: ssi?.effectiveStress ?? 0,
  };

  // Warn if no SSI data
  if (!ssi) {
    warnings.push({
      code: 'NO_SSI_DATA',
      messageAr: 'لا توجد بيانات تفاعل التربة-المنشأ',
      messageEn: 'No soil-structure interaction data available',
      severity: 'warning',
      field: 'soil.overburdenPressure',
    });
  }

  // Warn if multi-layer soil (simplified to top layer)
  if (soilInput.layers.length > 1) {
    warnings.push({
      code: 'MULTI_LAYER_SIMPLIFICATION',
      messageAr: `يتم استخدام خصائص الطبقة العلوية فقط (${topLayer.name}) لتصميم الجدران`,
      messageEn: `Only top layer properties (${topLayer.name}) used for wall design — multi-layer pressure requires manual review`,
      severity: 'info',
      field: 'soil.frictionAngle',
    });
  }

  return { soil, warnings };
}

// ─── Element Load Builder ───────────────────────────────────────────

/** Build a DesignElementLoad for one structural element. */
function buildElementLoad(
  element: 'roof' | 'wall' | 'floor',
  analysisResult: FullAnalysisResult,
  criteria: DesignCriteria,
  soil: DesignSoil,
  soilLateralPressure: number,
): DesignElementLoad {
  const structure = analysisResult.input.structure;
  const blastParams = analysisResult.blast.parameters;
  const ssi = analysisResult.blast.soilInteraction;

  // Select material and thickness for this element
  const materialInput = element === 'roof'
    ? structure.roofMaterial
    : element === 'wall'
      ? structure.wallMaterial
      : structure.floorMaterial;

  const thickness = element === 'roof'
    ? structure.roofThickness
    : element === 'wall'
      ? structure.wallThickness
      : structure.floorThickness;

  // Dynamic pressure from analysis (already distributed per element in getAllStructureResponses)
  const response = element === 'roof'
    ? analysisResult.blast.roofResponse
    : element === 'wall'
      ? analysisResult.blast.wallResponse
      : analysisResult.blast.floorResponse;

  const dynamicPressure = response?.appliedPressure ?? 0;

  // Impulse per-element: global impulse × distribution factor (G4)
  const pressureFactor = element === 'roof'
    ? ROOF_PRESSURE_FACTOR
    : element === 'wall'
      ? WALL_PRESSURE_FACTOR
      : FLOOR_PRESSURE_FACTOR;

  const dynamicImpulse = blastParams
    ? blastParams.positivePhaseImpulse * pressureFactor
    : 0;

  // Duration is global (same blast event for all elements)
  const dynamicDuration = blastParams?.positivePhaseDuration ?? 0;

  // Self-weight: ρ × h × g (G6)
  const selfWeight = criteria.includeSelfWeight
    ? (materialInput.density * thickness * GRAVITY) / 1000 // kg/m³ × m × m/s² → kPa
    : 0;

  // Static pressure depends on element type
  let staticPressure = 0;

  switch (element) {
    case 'roof':
      // Roof static = overburden (soil weight above roof) + self-weight
      staticPressure = selfWeight;
      if (criteria.includeOverburden && ssi) {
        staticPressure += ssi.overburdenPressure;
      }
      break;

    case 'wall':
      // Wall static = lateral earth pressure at mid-height (G2 — from soil-pressure.ts)
      if (criteria.includeLateralPressure) {
        staticPressure = soilLateralPressure + selfWeight;
      } else {
        staticPressure = selfWeight;
      }
      break;

    case 'floor':
      // Floor static = self-weight + effective stress (soil reaction from below)
      staticPressure = selfWeight;
      if (ssi) {
        // Approximate soil reaction as effective stress (G7)
        staticPressure += ssi.effectiveStress;
      }
      break;
  }

  // Support condition per element
  const supportCondition = element === 'wall'
    ? criteria.wallSupportCondition
    : criteria.supportCondition;

  return {
    element,
    dynamicPressure,
    dynamicImpulse,
    dynamicDuration,
    staticPressure,
    selfWeight,
    span: getElementSpan(element, structure),
    thickness,
    supportCondition,
    material: extractDesignMaterial(materialInput),
  };
}

// ─── Penetration Data Extraction ────────────────────────────────────

/** Extract DesignPenetrationData for one element. */
function extractPenetrationData(
  penetration: FullAnalysisResult['penetration']['roofPenetration'],
): DesignPenetrationData {
  if (!penetration) {
    return {
      perforationThickness: 0,
      scabbingThickness: 0,
      penetrationDepth: 0,
      isPerforated: false,
      isSpalled: false,
    };
  }

  return {
    perforationThickness: penetration.perforationThickness,
    scabbingThickness: penetration.scabbingThickness,
    penetrationDepth: penetration.penetrationDepthStructure,
    isPerforated: penetration.isPerforated,
    isSpalled: penetration.isSpalled,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Transform a FullAnalysisResult into a DesignInput.
 *
 * This function is the ONLY bridge between the analysis world and the design world.
 * The design engine never sees FullAnalysisResult — only DesignInput.
 *
 * @param analysisResult - The complete analysis result from runAnalysis()
 * @param criteria - Optional design criteria (defaults applied for missing fields)
 * @returns DesignAdapterResult with the design input and any warnings
 */
export function buildDesignInput(
  analysisResult: FullAnalysisResult,
  criteria?: Partial<DesignCriteria>,
): DesignAdapterResult {
  const warnings: DesignInputWarning[] = [];

  // Merge user criteria with defaults
  const resolvedCriteria: DesignCriteria = {
    targetSafetyFactor: criteria?.targetSafetyFactor ?? DEFAULT_DESIGN_CRITERIA.targetSafetyFactor,
    allowPlasticResponse: criteria?.allowPlasticResponse ?? DEFAULT_DESIGN_CRITERIA.allowPlasticResponse,
    supportCondition: criteria?.supportCondition ?? DEFAULT_DESIGN_CRITERIA.supportCondition,
    wallSupportCondition: criteria?.wallSupportCondition ?? DEFAULT_DESIGN_CRITERIA.wallSupportCondition,
    reinforcementGrade: criteria?.reinforcementGrade ?? { ...DEFAULT_DESIGN_CRITERIA.reinforcementGrade },
    concreteCover: criteria?.concreteCover ?? DEFAULT_DESIGN_CRITERIA.concreteCover,
    maxDeflectionRatio: criteria?.maxDeflectionRatio ?? DEFAULT_DESIGN_CRITERIA.maxDeflectionRatio,
    thicknessIncrement: criteria?.thicknessIncrement ?? DEFAULT_DESIGN_CRITERIA.thicknessIncrement,
    maxThickness: criteria?.maxThickness ?? DEFAULT_DESIGN_CRITERIA.maxThickness,
    includeSelfWeight: criteria?.includeSelfWeight ?? DEFAULT_DESIGN_CRITERIA.includeSelfWeight,
    includeOverburden: criteria?.includeOverburden ?? DEFAULT_DESIGN_CRITERIA.includeOverburden,
    includeLateralPressure: criteria?.includeLateralPressure ?? DEFAULT_DESIGN_CRITERIA.includeLateralPressure,
  };

  // ─── Validate analysis result has required data ───
  const blastParams = analysisResult.blast.parameters;
  const ssi = analysisResult.blast.soilInteraction;

  if (!blastParams) {
    warnings.push({
      code: 'NO_BLAST_DATA',
      messageAr: 'لا توجد بيانات انفجار — لا يمكن إجراء التصميم',
      messageEn: 'No blast parameters available — design cannot proceed',
      severity: 'critical',
      field: 'blast.parameters',
    });
  }

  if (!analysisResult.blast.roofResponse) {
    warnings.push({
      code: 'NO_ROOF_RESPONSE',
      messageAr: 'لا توجد استجابة السقف — تم استخدام الضغط المباشر',
      messageEn: 'No roof response available — using direct pressure',
      severity: 'warning',
      field: 'elements.roof',
    });
  }

  // ─── Extract soil properties ───
  const { soil, warnings: soilWarnings } = extractDesignSoil(analysisResult, resolvedCriteria);
  warnings.push(...soilWarnings);

  // ─── Calculate lateral earth pressure on walls (G2) ───
  const wallLateralPressure = ssi
    ? calculateAverageWallLateralPressure(
        analysisResult.input.structure.burialDepth,
        analysisResult.input.structure.height,
        soil.averageUnitWeight,
        soil.frictionAngle,
        soil.cohesion,
        'active',
      )
    : 0;

  // ─── Build per-element loads ───
  const elements = {
    roof: buildElementLoad('roof', analysisResult, resolvedCriteria, soil, 0),
    wall: buildElementLoad('wall', analysisResult, resolvedCriteria, soil, wallLateralPressure),
    floor: buildElementLoad('floor', analysisResult, resolvedCriteria, soil, 0),
  };

  // ─── Extract penetration data ───
  const penetration = {
    roof: extractPenetrationData(analysisResult.penetration.roofPenetration),
    wall: extractPenetrationData(analysisResult.penetration.wallPenetration),
    floor: extractPenetrationData(analysisResult.penetration.floorPenetration),
  };

  // Warn if no penetration data
  if (!analysisResult.penetration.roofPenetration && analysisResult.input.settings.analysisType === 'combined') {
    warnings.push({
      code: 'NO_PENETRATION_DATA',
      messageAr: 'لا توجد بيانات اختراق — فحص الاختراق غير متاح',
      messageEn: 'No penetration data available — penetration check will be skipped',
      severity: 'warning',
      field: 'penetration',
    });
  }

  // ─── Assemble DesignInput ───
  // Blast data: complete preservation from BlastParameters — no recalculation
  const blast: DesignInput['blast'] = blastParams
    ? {
        tntEquivalentMass: blastParams.tntEquivalentMass,
        chargeMass: analysisResult.input.threat.explosive.chargeMass,
        distance: blastParams.distance,
        scaledDistance: blastParams.scaledDistance,
        detonationType: analysisResult.input.threat.detonationType,
        peakIncidentPressure: blastParams.peakIncidentPressure,
        peakReflectedPressure: blastParams.peakReflectedPressure,
        peakDynamicPressure: blastParams.peakDynamicPressure,
        positivePhaseImpulse: blastParams.positivePhaseImpulse,
        positivePhaseDuration: blastParams.positivePhaseDuration,
        reflectionCoefficient: blastParams.reflectionCoefficient,
      }
    : {
        tntEquivalentMass: 0,
        chargeMass: 0,
        distance: 0,
        scaledDistance: 0,
        detonationType: analysisResult.input.threat.detonationType,
        peakIncidentPressure: 0,
        peakReflectedPressure: 0,
        peakDynamicPressure: 0,
        positivePhaseImpulse: 0,
        positivePhaseDuration: 0,
        reflectionCoefficient: 0,
      };

  const input: DesignInput = {
    elements,
    soil,
    reinforcement: {
      steelYieldStrength: resolvedCriteria.reinforcementGrade.fy,
      standard: resolvedCriteria.reinforcementGrade.standard,
      concreteCover: resolvedCriteria.concreteCover,
    },
    criteria: resolvedCriteria,
    penetration,
    burialDepth: analysisResult.input.structure.burialDepth,
    structureType: analysisResult.input.structure.type,
    blast,
  };

  return { input, warnings };
}