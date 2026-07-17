/**
 * UPAS — Design Engine Type Definitions
 * Phase 0: Design Model Foundation
 *
 * These types define the input contract for the structural design engine.
 * The DesignInputAdapter transforms FullAnalysisResult → DesignInput.
 * The design engine reads ONLY DesignInput — never touches FullAnalysisResult directly.
 *
 * Reference Standards:
 * - UFC 3-340-02 (Structures to Resist the Effects of Accidental Explosions) — Loads & Response
 * - ACI 318-19 (Building Code Requirements for Structural Concrete) — Reinforcement Design
 * - TM 5-1300 / TM 5-855-1 — Blast & Ground Shock
 */

// ═══════════════════════════════════════════════════════════════════════
// DESIGN CRITERIA — User-specified design requirements
// ═══════════════════════════════════════════════════════════════════════

/** Steel reinforcement grade — a design decision, NOT a material property.
 *  Same concrete (e.g. C40) can use different reinforcement grades (420, 500, 600 MPa).
 */
export interface ReinforcementGrade {
  /** Yield strength of reinforcement steel fy (MPa) */
  fy: number;
  /** Standard reference string */
  standard: string;
}

/** Criteria that control the design output.
 *  These are design decisions made by the engineer, not analysis inputs.
 */
export interface DesignCriteria {
  /** Target safety factor for blast design (default: 1.5) */
  targetSafetyFactor: number;

  /** Allow plastic response in the structure (default: true for blast design) */
  allowPlasticResponse: boolean;

  /** Support condition for roof and floor slabs (default: 'simply_supported') */
  supportCondition: 'simply_supported' | 'fixed' | 'partial_fixity';

  /** Support condition for walls (default: 'fixed' — walls are typically more constrained) */
  wallSupportCondition: 'simply_supported' | 'fixed' | 'partial_fixity';

  /** Reinforcement steel grade */
  reinforcementGrade: ReinforcementGrade;

  /** Concrete cover depth (m). Default: 0.050m for underground structures */
  concreteCover: number;

  /** Maximum allowable deflection ratio δ/L (default: 1/360) */
  maxDeflectionRatio: number;

  /** Thickness increment for iterative search (m). Default: 0.025m (25mm) */
  thicknessIncrement: number;

  /** Maximum thickness to try before declaring FAIL (m). Default: 2.0m */
  maxThickness: number;

  /** Include self-weight in design loads (default: true) */
  includeSelfWeight: boolean;

  /** Include overburden pressure on roof in design loads (default: true) */
  includeOverburden: boolean;

  /** Include lateral earth pressure on walls (default: true) */
  includeLateralPressure: boolean;

  /** Maximum allowable support rotation θ_max (degrees).
   *  UFC 3-340-02: 2° elastic, 8° plastic, 12° failure.
   *  Default: 8.0° (plastic response permitted) */
  maxSupportRotation: number;

  /** Reinforcement steel yield strength fy (MPa) — flat field for convenience.
   *  When set, overrides reinforcementGrade.fy. Default: 420 MPa (Grade 60). */
  steelGrade: number;
}

// ═══════════════════════════════════════════════════════════════════════
// DESIGN INPUT — The unified input for the design engine
// ═══════════════════════════════════════════════════════════════════════

/** Material properties needed for design — extracted from MaterialInput */
export interface DesignMaterial {
  /** Compressive strength f'c (MPa) */
  fpc: number;
  /** Tensile strength ft (MPa) */
  ft: number;
  /** Modulus of elasticity Ec (MPa) */
  Ec: number;
  /** Density ρ (kg/m³) */
  density: number;
  /** Poisson's ratio ν */
  poissonRatio: number;
  /** Dynamic Increase Factor for compression (blast loading) */
  difCompressive: number;
  /** Dynamic Increase Factor for tension */
  difTensile: number;
  /** Material category */
  category: 'concrete' | 'steel' | 'masonry' | 'soil' | 'composite';
  /** Material reference key (for traceability) */
  materialRef: string;
}

/** Soil properties at the structure's depth — needed for lateral pressure & burial optimization */
export interface DesignSoil {
  /** Average unit weight along wave path (kN/m³) */
  averageUnitWeight: number;
  /** Friction angle of the soil surrounding the structure (degrees) */
  frictionAngle: number;
  /** Cohesion of the soil surrounding the structure (kPa) */
  cohesion: number;
  /** Active earth pressure coefficient Ka (dimensionless) */
  activeEarthPressureCoeff: number;
  /** At-rest earth pressure coefficient Ko (dimensionless) */
  atRestEarthPressureCoeff: number;
  /** Cover depth — depth of structure top below ground surface (m) */
  coverDepth: number;
  /** Total overburden pressure at structure crown (kPa) */
  overburdenPressure: number;
  /** Effective stress at structure crown (kPa) */
  effectiveStress: number;
}

/** Per-element design load — the complete load picture for one structural element */
export interface DesignElementLoad {
  /** Which structural element */
  element: 'roof' | 'wall' | 'floor';

  // ─── Dynamic Blast Loads (from analysis) ───
  /** Peak dynamic pressure on this element from blast (kPa) */
  dynamicPressure: number;
  /** Positive phase impulse on this element (kPa·ms) — distributed per element */
  dynamicImpulse: number;
  /** Positive phase duration (ms) */
  dynamicDuration: number;

  // ─── Static Loads (from analysis + adapter calculations) ───
  /** Static pressure on this element (kPa).
   *  Roof: overburden (soil weight above roof)
   *  Wall: lateral earth pressure at mid-height
   *  Floor: self-weight (+ soil reaction if applicable)
   */
  staticPressure: number;

  /** Self-weight of this element (kPa) = ρ × thickness × g */
  selfWeight: number;

  // ─── Geometry ───
  /** Clear span of this element (m) */
  span: number;
  /** Current thickness of this element (m) */
  thickness: number;
  /** Support condition for this specific element */
  supportCondition: 'simply_supported' | 'fixed' | 'partial_fixity';

  // ─── Material ───
  /** Material properties for this element */
  material: DesignMaterial;
}

/** Penetration data per element — from analysis results */
export interface DesignPenetrationData {
  /** Minimum thickness to prevent perforation (m) */
  perforationThickness: number;
  /** Minimum thickness to prevent scabbing (m) */
  scabbingThickness: number;
  /** Current penetration depth into structure (m) */
  penetrationDepth: number;
  /** Is the current element perforated? */
  isPerforated: boolean;
  /** Is the current element spalled? */
  isSpalled: boolean;
}

/** Complete blast threat data — preserved from the analysis engine.
 *  The design engine must receive the full blast loading history.
 *  No blast equations are recalculated inside the Design module.
 *
 *  All values come directly from BlastParameters (calculated by threat/index.ts
 *  using Kingery-Bulmash polynomials per TM 5-1300 / UFC 3-340-02).
 *
 *  Reference: UFC 3-340-02 Ch.2 (Free-Air Blast), TM 5-1300 Ch.2
 */
export interface DesignBlastInput {
  /** TNT equivalent mass (kg) — from chargeMass × tntEquivalentFactor */
  tntEquivalentMass: number;

  /** Original charge mass W (kg) — before TNT conversion */
  chargeMass: number;

  /** Actual distance from detonation to target structure (m) */
  distance: number;

  /** Scaled distance Z = R / W^(1/3) (m/kg^⅓) */
  scaledDistance: number;

  /** Detonation type — affects ground coupling and pressure distribution */
  detonationType: 'surface' | 'buried' | 'aerial' | 'internal';

  /** Peak incident (side-on) pressure Pso (kPa) — from Kingery-Bulmash */
  peakIncidentPressure: number;

  /** Peak reflected pressure Pr (kPa) — from normal reflection coefficient */
  peakReflectedPressure: number;

  /** Peak dynamic pressure q (kPa) — from Rankine-Hugoniot */
  peakDynamicPressure: number;

  /** Positive phase impulse Is (kPa·ms) — from Kingery-Bulmash */
  positivePhaseImpulse: number;

  /** Positive phase duration td (ms) — from Kingery-Bulmash */
  positivePhaseDuration: number;

  /** Reflection coefficient Cr = Pr / Pso (dimensionless) */
  reflectionCoefficient: number;
}

/** The complete input to the design engine.
 *  This is the ONLY type the design engine reads.
 *  Everything upstream is the adapter's responsibility.
 */
export interface DesignInput {
  /** Per-element design loads */
  elements: {
    roof: DesignElementLoad;
    wall: DesignElementLoad;
    floor: DesignElementLoad;
  };

  /** Soil properties at structure depth */
  soil: DesignSoil;

  /** Reinforcement properties (from DesignCriteria) */
  reinforcement: {
    /** Yield strength of reinforcement steel fy (MPa) */
    steelYieldStrength: number;
    /** Standard reference */
    standard: string;
    /** Concrete cover depth (m) */
    concreteCover: number;
  };

  /** Design criteria (passed through from user) */
  criteria: DesignCriteria;

  /** Penetration data per element (from analysis) */
  penetration: {
    roof: DesignPenetrationData;
    wall: DesignPenetrationData;
    floor: DesignPenetrationData;
  };

  /** Burial depth — depth of structure top below ground surface (m) */
  burialDepth: number;

  /** Structure type (affects load distribution assumptions) */
  structureType: 'box' | 'arch' | 'cylinder' | 'dome' | 'custom';

  /** Complete blast threat data — preserved from BlastParameters/Threat.
   *  The design engine must receive the full blast loading history.
   *  No blast equations are recalculated inside the Design module.
   *  Reference: UFC 3-340-02 (loads), TM 5-1300 (KB polynomials) */
  blast: DesignBlastInput;
}

// ═══════════════════════════════════════════════════════════════════════
// DESIGN OUTPUT TYPES — Result types for the structural design engine
// Phase 4A: Type definitions only — no calculation logic here.
// ═══════════════════════════════════════════════════════════════════════

/** Reinforcement bar selection for one layer of one element.
 *  Populated by the reinforcement design module (Phase 4C).
 */
export interface RebarSelection {
  /** Selected bar diameter (mm) */
  barDiameter: number;
  /** Single bar cross-sectional area (mm²) */
  barArea: number;
  /** Bar spacing (mm) */
  spacing: number;
  /** Provided steel area per meter width As (mm²/m) */
  asProvided: number;
  /** Number of bars within the element width */
  numberOfBars: number;
}

/** Design result for a single structural element.
 *  Populated by the structural design engine (Phase 4B) and
 *  reinforcement design module (Phase 4C).
 */
export interface ElementDesignResult {
  /** Which structural element */
  element: 'roof' | 'wall' | 'floor';

  // ─── Thickness ───
  /** Existing thickness from analysis input (m) */
  existingThickness: number;
  /** Minimum required thickness for strength (m) */
  requiredThickness: number;
  /** Recommended thickness — rounded up to nearest increment (m) */
  recommendedThickness: number;

  // ─── Flexure ───
  /** Design moment Mu (kN·m/m) */
  designMoment: number;
  /** Required steel area As_req (mm²/m) */
  requiredAs: number;
  /** Provided steel area As_prov (mm²/m) */
  providedAs: number;

  // ─── Reinforcement ───
  /** Main (tension) reinforcement selection */
  mainReinforcement: RebarSelection;
  /** Distribution (secondary) reinforcement selection */
  distributionReinforcement: RebarSelection;

  // ─── Shear ───
  /** Design shear Vu (kN/m) */
  designShear: number;
  /** Shear capacity φVn (kN/m) */
  shearCapacity: number;

  // ─── Deflection ───
  /** Maximum computed deflection δ (mm) */
  maxDeflection: number;
  /** Allowable deflection δ_allow (mm) */
  allowableDeflection: number;

  // ─── Safety Factors ───
  /** Flexural safety factor = φMn / Mu */
  flexuralSafetyFactor: number;
  /** Shear safety factor = φVn / Vu */
  shearSafetyFactor: number;

  // ─── Status ───
  /** Element design status */
  status: 'pass' | 'fail' | 'optimize';

  // ─── Diagnostics ───
  /** Design warnings for this element */
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// VERIFICATION TYPES — Phase 4C
// ═══════════════════════════════════════════════════════════════════════

/** Verification mode identifiers */
export type VerificationMode = 'flexure' | 'shear' | 'penetration' | 'deflection' | 'none';

/** Per-element verification result — checks flexure, shear, penetration, deflection. */
export interface ElementVerificationResult {
  /** Which structural element */
  element: 'roof' | 'wall' | 'floor';

  // ─── Flexure ───
  /** Flexural safety factor SF = φMn / Mu */
  flexuralSF: number;
  /** Flexural check: SF >= targetSafetyFactor */
  flexuralPass: boolean;

  // ─── Shear ───
  /** Shear safety factor SF = φVn / Vu */
  shearSF: number;
  /** Shear check: SF >= targetSafetyFactor */
  shearPass: boolean;

  // ─── Penetration ───
  /** Penetration safety factor SF = h / max(h_perf, h_scab).
   *  Infinity when no penetration threat (both thicknesses = 0). */
  penetrationSF: number;
  /** Penetration check: SF >= 1.0 */
  penetrationPass: boolean;

  // ─── Deflection ───
  /** Actual deflection ratio δ/L */
  deflectionRatio: number;
  /** Deflection check: δ/L <= maxDeflectionRatio */
  deflectionPass: boolean;

  // ─── Overall ───
  /** Element passes ALL checks */
  overallPass: boolean;
  /** Governing (weakest) failure mode for this element */
  governingMode: VerificationMode;
  /** Verification warnings for this element */
  warnings: string[];
}

/** Complete verification result for all elements.
 *  The final PASS/FAIL decision:
 *    PASS = Flexure PASS AND Shear PASS AND Penetration PASS AND Deflection PASS
 *  for ALL elements.
 */
export interface VerificationResult {
  /** Per-element verification */
  elements: {
    roof: ElementVerificationResult;
    wall: ElementVerificationResult;
    floor: ElementVerificationResult;
  };

  /** Overall: ALL elements pass ALL checks */
  overallPass: boolean;

  /** Governing (weakest) element across all modes */
  governingElement: 'roof' | 'wall' | 'floor';

  /** Governing failure mode across all elements */
  governingMode: VerificationMode;

  /** Verification warnings */
  warnings: string[];
}

/** Complete design result for all structural elements.
 *  This is the output of the structural design engine.
 */
export interface DesignResult {
  /** Per-element design results */
  roof: ElementDesignResult;
  wall: ElementDesignResult;
  floor: ElementDesignResult;

  /** Overall design status */
  designStatus: 'PASS' | 'FAIL' | 'OPTIMIZED';

  /** Governing (weakest) element */
  governingElement: 'roof' | 'wall' | 'floor';

  /** Global design warnings */
  warnings: string[];

  /** Design recommendations (Arabic) */
  recommendations: string[];

  /** Verification result — penetration + deflection + combined PASS/FAIL.
   *  Populated by design-verification.ts (Phase 4C). */
  verification: VerificationResult;
}

// ═══════════════════════════════════════════════════════════════════════
// ADAPTER WARNING — Diagnostics from the adapter
// ═══════════════════════════════════════════════════════════════════════

export interface DesignInputWarning {
  /** Warning code (e.g. 'NO_PENETRATION_DATA', 'WALL_PRESSURE_APPROXIMATE') */
  code: string;
  /** Warning message in Arabic */
  messageAr: string;
  /** Warning message in English */
  messageEn: string;
  /** Severity level */
  severity: 'info' | 'warning' | 'critical';
  /** Affected element or field */
  field: string;
}

/** Complete output of the DesignInputAdapter */
export interface DesignAdapterResult {
  /** The design input ready for the design engine */
  input: DesignInput;
  /** Warnings generated during adaptation */
  warnings: DesignInputWarning[];
}