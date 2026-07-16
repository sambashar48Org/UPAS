/**
 * UPAS — Calculation Engine Type Definitions
 * Sprint 3A: All input/output types for the engineering calculation core
 *
 * Architecture Rule: These types bridge domain models → calculation engine → results.
 * NO hardcoded values — all parameters come from data files or user input.
 * Reference Standards: TM 5-1300, UFC 3-340-02, TM 5-855-1, ASCE 59-11
 */

import type { EngineeringValue, Coordinate3D } from '../types';

// ─── Project Input Schema ──────────────────────────────────────────
// This is the unified input that the calculation engine receives.
// All values are already resolved to SI units by the caller.

export interface ProjectInput {
  /** Unique project identifier */
  projectId: string;

  /** Ground surface elevation (m, datum) */
  groundLevel: number;

  /** Soil profile data */
  soil: SoilInput;

  /** Structure data */
  structure: StructureInput;

  /** Threat + explosive data */
  threat: ThreatInput;

  /** Analysis configuration */
  settings: AnalysisSettingsInput;
}

// ─── Soil Input ─────────────────────────────────────────────────────
export interface SoilInput {
  /** Ordered layers from top (ground surface) to bottom */
  layers: SoilLayerInput[];

  /** Water table depth below ground level (m). Null = no water table considered */
  waterTableDepth: number | null;

  /** Total depth of soil profile (m) */
  totalDepth: number;
}

export interface SoilLayerInput {
  /** Layer name (display only) */
  name: string;
  /** Soil type reference key (into soil-types.json) */
  soilTypeRef: string;

  /** Layer thickness (m) */
  thickness: number;

  /** Top elevation relative to ground level (m, negative = below ground) */
  topElevation: number;

  // ─── Engineering properties (resolved from soil-types.json) ───
  /** Unit weight γ (kN/m³) */
  unitWeight: number;
  /** Friction angle φ (degrees) */
  frictionAngle: number;
  /** Cohesion c (kPa) */
  cohesion: number;
  /** Modulus of elasticity E (MPa) */
  modulusOfElasticity: number;
  /** Poisson's ratio ν */
  poissonRatio: number;
  /** Shear wave velocity Vs (m/s) */
  waveVelocity: number;
  /** Soil category: cohesiveless, cohesive, rock */
  category: string;
}

// ─── Structure Input ────────────────────────────────────────────────
export interface StructureInput {
  /** Structure type */
  type: 'box' | 'arch' | 'cylinder' | 'dome' | 'custom';

  /** Position of structure center (m, Y is vertical, negative = below ground) */
  position: Coordinate3D;

  // ─── Outer dimensions (m) ───
  length: number;
  width: number;
  height: number;

  // ─── Component thicknesses (m) ───
  wallThickness: number;
  roofThickness: number;
  floorThickness: number;

  // ─── Material properties (resolved from materials.json) ───
  wallMaterial: MaterialInput;
  roofMaterial: MaterialInput;
  floorMaterial: MaterialInput;

  /** Burial depth — depth of structure TOP below ground level (m) */
  burialDepth: number;

  // ─── Shape-specific parameters ───
  shapeParams: {
    archRadius: number | null;
    archAngle: number | null;
    cylinderRadius: number | null;
    domeRadius: number | null;
    domeHeight: number | null;
  };

  /** Has entry/opening */
  hasEntry: boolean;
  entryWidth: number | null;
  entryHeight: number | null;
}

export interface MaterialInput {
  /** Material reference key */
  materialRef: string;
  /** Material name */
  name: string;
  /** Material category */
  category: 'concrete' | 'steel' | 'masonry' | 'soil' | 'composite';

  // ─── Engineering properties (SI units) ───
  /** Compressive strength f'c (MPa) */
  compressiveStrength: number;
  /** Tensile strength ft (MPa) */
  tensileStrength: number;
  /** Modulus of elasticity E (GPa) */
  modulusOfElasticity: number;
  /** Density ρ (kg/m³) */
  density: number;
  /** Poisson's ratio ν */
  poissonRatio: number;
  /** Yield strength fy (MPa) — for steel only */
  yieldStrength: number | null;

  // ─── Dynamic properties (from data file) ───
  /** Dynamic Increase Factor for compression */
  difCompressive: number;
  /** Dynamic Increase Factor for tension */
  difTensile: number;
}

// ─── Threat Input ───────────────────────────────────────────────────
export interface ThreatInput {
  /** Threat type */
  type: 'external' | 'internal' | 'underground' | 'vehicle_borne';

  /** Threat position (m) */
  position: Coordinate3D;

  /** Detonation type */
  detonationType: 'surface' | 'buried' | 'aerial' | 'internal';

  /** Standoff distance from threat to nearest structure surface (m) */
  standoffDistance: number;

  // ─── Explosive data ───
  explosive: ExplosiveInput;

  /** Burial depth of explosive (m) — for buried detonation */
  burialDepth: number | null;

  /** Detonation height above ground (m) — for aerial detonation */
  detonationHeight: number | null;
}

export interface ExplosiveInput {
  /** Explosive type reference key (into bomb-types.json) */
  explosiveTypeRef: string;
  /** Explosive name */
  name: string;

  /** Charge mass W (kg) */
  chargeMass: number;

  /** Charge shape */
  chargeShape: 'spherical' | 'cylindrical' | 'cuboid';

  /** Charge dimensions (if non-spherical) */
  chargeLength: number | null;  // m
  chargeDiameter: number | null; // m

  // ─── Explosive properties (resolved from bomb-types.json) ───
  /** TNT equivalent factor */
  tntEquivalentFactor: number;
  /** Detonation velocity VOD (m/s) */
  detonationVelocity: number;
  /** Energy release (MJ/kg) */
  energyRelease: number;
  /** Explosive density (kg/m³) */
  density: number;
}

// ─── Analysis Settings ──────────────────────────────────────────────
export interface AnalysisSettingsInput {
  /** Type of analysis to run */
  analysisType: 'blast' | 'penetration' | 'combined';

  /** Use metric or imperial for output */
  outputUnits: 'metric' | 'imperial';

  /** Include soil-structure interaction */
  includeSSI: boolean;

  /** Safety factor target (design requirement) */
  targetSafetyFactor: number;

  /** Allow plastic deformation in structure response */
  allowPlasticResponse: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// INTERMEDIATE CALCULATION TYPES
// ═══════════════════════════════════════════════════════════════════════

// ─── Blast Parameters (intermediate) ────────────────────────────────
export interface BlastParameters {
  /** TNT equivalent mass (kg) */
  tntEquivalentMass: number;

  /** Scaled distance Z = R / W^(1/3) (m/kg^(1/3)) */
  scaledDistance: number;

  /** Actual distance from detonation to target (m) */
  distance: number;

  // ─── Free-air blast parameters (Kingery-Bulmash) ───
  /** Peak incident (side-on) pressure Pso (kPa) */
  peakIncidentPressure: number;
  /** Peak reflected pressure Pr (kPa) */
  peakReflectedPressure: number;
  /** Reflection coefficient Cr = Pr / Pso */
  reflectionCoefficient: number;
  /** Peak dynamic pressure q (kPa) */
  peakDynamicPressure: number;
  /** Positive phase duration td (ms) */
  positivePhaseDuration: number;
  /** Positive phase impulse Is (kPa·ms) */
  positivePhaseImpulse: number;
  /** Shock front velocity U (m/s) */
  shockFrontVelocity: number;
  /** Arrival time ta (ms) */
  arrivalTime: number;

  // ─── Charge geometry corrections ───
  /** Charge shape correction factor */
  shapeCorrectionFactor: number;

  // ─── Ground reflection (for surface/above-ground bursts) ───
  /** Ground reflection type */
  groundReflection: 'none' | 'regular' | 'mach';
  /** Ground-reflected peak pressure (kPa) — if applicable */
  groundReflectedPressure: number | null;
}

// ─── Soil-Structure Interaction Parameters ─────────────────────────
export interface SoilStructureInteraction {
  /** Total overburden pressure at structure crown (kPa) */
  overburdenPressure: number;

  /** Effective vertical stress at structure crown (kPa) */
  effectiveStress: number;

  /** Soil attenuation factor — pressure reduction through soil cover */
  soilAttenuationFactor: number;

  /** Blast pressure arriving at structure surface after soil attenuation (kPa) */
  pressureAtStructure: number;

  /** Ground shock peak particle velocity (m/s) */
  groundShockPPV: number;

  /** Ground shock arrival time (ms) */
  groundShockArrivalTime: number;

  /** Average soil properties along wave path */
  averageWaveVelocity: number;
  averageUnitWeight: number;
}

// ─── Structure Response Parameters ─────────────────────────────────
export interface StructureResponse {
  /** Structural element being analyzed */
  element: 'roof' | 'wall' | 'floor';

  /** Applied blast pressure on this element (kPa) */
  appliedPressure: number;

  /** Dynamic resistance of this element (kPa) */
  dynamicResistance: number;

  /** Static resistance of this element (kPa) */
  staticResistance: number;

  /** Dynamic Increase Factor used */
  dif: number;

  /** Safety factor = dynamic resistance / applied pressure */
  safetyFactor: number;

  /** Structure response mode */
  responseMode: 'elastic' | 'plastic' | 'failure';

  /** Maximum displacement (mm) */
  maxDisplacement: number;

  /** Support rotation (degrees) */
  supportRotation: number;

  /** Ductility ratio μ */
  ductilityRatio: number;

  /** Natural period of element (ms) */
  naturalPeriod: number;

  /** Response time (ms) */
  responseTime: number;
}

// ─── Penetration Parameters ─────────────────────────────────────────
export interface PenetrationParameters {
  /** Penetration depth X into soil (m) */
  penetrationDepthSoil: number;

  /** Penetration depth X into structure element (m) */
  penetrationDepthStructure: number;

  /** Minimum thickness to prevent perforation (m) */
  perforationThickness: number;

  /** Minimum thickness to prevent scabbing (m) */
  scabbingThickness: number;

  /** Is the element perforated? */
  isPerforated: boolean;

  /** Is scabbing expected on the inside face? */
  isSpalled: boolean;

  /** Crater diameter in soil (m) */
  craterDiameter: number;

  /** Crater depth in soil (m) */
  craterDepth: number;

  /** Penetration formula used */
  formulaUsed: string;
}

// ═══════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════

// ─── 3D Visualization Data (for scene integration) ──────────────────
export interface VisualizationData {
  /** Pressure contour points for 3D visualization */
  pressureContours: PressureContour[];

  /** Damage zones */
  damageZones: DamageZone[];

  /** Threat trajectory/path */
  threatPath: ThreatPathData | null;

  /** Color-coded structure stress regions */
  structureStressRegions: StressRegion[];
}

export interface PressureContour {
  /** Distance from detonation point (m) */
  radius: number;
  /** Pressure at this distance (kPa) */
  pressure: number;
  /** Contour type */
  type: 'incident' | 'reflected' | 'attenuated';
}

export interface DamageZone {
  /** Zone type */
  type: 'crater' | 'plastic' | 'elastic' | 'safe';
  /** Zone boundary radius (m) */
  radius: number;
  /** Description */
  description: string;
  /** Color for 3D visualization (hex) */
  color: string;
}

export interface ThreatPathData {
  /** Start point */
  start: Coordinate3D;
  /** End point (structure surface) */
  end: Coordinate3D;
  /** Total path length through soil (m) */
  pathLengthSoil: number;
  /** Total path length through structure (m) */
  pathLengthStructure: number;
  /** Direction vector (normalized) */
  direction: Coordinate3D;
}

export interface StressRegion {
  /** Structure element */
  element: 'roof' | 'wall' | 'floor';
  /** Stress ratio (applied / capacity) */
  stressRatio: number;
  /** Status */
  status: 'safe' | 'warning' | 'critical' | 'failed';
}

// ─── Engineering Warnings ───────────────────────────────────────────
export interface EngineeringWarning {
  /** Warning code */
  code: string;
  /** Warning message (Arabic) */
  messageAr: string;
  /** Warning message (English) */
  messageEn: string;
  /** Severity */
  severity: 'info' | 'warning' | 'critical';
  /** Related field/path */
  field: string;
}

// ─── Full Analysis Result (output) ─────────────────────────────────
export interface FullAnalysisResult {
  /** Unique result identifier */
  id: string;
  /** Project ID */
  projectId: string;
  /** Timestamp */
  calculatedAt: string;
  /** Analysis type performed */
  analysisType: 'blast' | 'penetration' | 'combined';

  // ─── Input snapshot (for reproducibility) ───
  input: ProjectInput;

  // ─── Blast results ───
  blast: {
    parameters: BlastParameters | null;
    soilInteraction: SoilStructureInteraction | null;
    roofResponse: StructureResponse | null;
    wallResponse: StructureResponse | null;
    floorResponse: StructureResponse | null;
  };

  // ─── Penetration results ───
  penetration: {
    roofPenetration: PenetrationParameters | null;
    wallPenetration: PenetrationParameters | null;
    floorPenetration: PenetrationParameters | null;
  };

  // ─── Overall Assessment ───
  overall: {
    /** Minimum safety factor across all elements */
    minSafetyFactor: number;
    /** Overall protection level */
    protectionLevel: 'safe' | 'marginal' | 'unsafe' | 'critical';
    /** Governing element (weakest link) */
    governingElement: 'roof' | 'wall' | 'floor';
    /** Governing failure mode */
    governingMode: 'blast' | 'penetration';
    /** Is the structure adequate? */
    isAdequate: boolean;
  };

  // ─── 3D Visualization Data ───
  visualization: VisualizationData;

  // ─── Warnings ───
  warnings: EngineeringWarning[];

  // ─── Recommendations (Arabic) ───
  recommendations: string[];
}

// ─── Geometry Calculation Results ───────────────────────────────────
export interface GeometryResults {
  /** Structure volume (m³) */
  volume: number;
  /** External surface area (m²) */
  externalSurfaceArea: number;
  /** Roof area (m²) */
  roofArea: number;
  /** Wall area (m²) — total for all walls */
  wallArea: number;
  /** Floor area (m²) */
  floorArea: number;
  /** Charge volume (m³) */
  chargeVolume: number;
  /** Distance from threat to structure center (m) */
  distanceToCenter: number;
  /** Distance from threat to nearest structure surface (m) */
  distanceToSurface: number;
  /** Threat direction vector (normalized) */
  threatDirection: Coordinate3D;
  /** Soil cover thickness above structure roof (m) */
  soilCoverThickness: number;
}