/**
 * UPAS — Visualization Model Types
 * Sprint 3B: Pre-computed visualization data for 3D components.
 * Sprint 3C: Added ThreatPathVM, CraterVM, StressOverlayVM, EngineeringAnnotationVM.
 *
 * Architecture Rule: 3D components read ONLY these types.
 * All color/style computation happens in the Adapter layer.
 * No engineering logic in 3D components.
 */

// ─── Damage Zone ─────────────────────────────────────────────────
export interface DamageZoneVM {
  type: 'crater' | 'plastic' | 'elastic' | 'safe';
  radius: number;
  color: string;
  opacity: number;
  position: [number, number, number];
  label: string;
}

// ─── Threat Object ───────────────────────────────────────────────
export interface ThreatObjectVM {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label: string;
  direction: [number, number, number];
  burialDepth: number;
  chargeDiameter: number;
  chargeLength: number;
  chargeShape: 'spherical' | 'cylindrical' | 'cuboid';
  explosiveName: string;
  chargeMassKg: number;
}

// ─── Pressure Contour ────────────────────────────────────────────
export interface PressureContourVM {
  radius: number;
  pressure: number;
  color: string;
  opacity: number;
}

// ─── Stress Region ───────────────────────────────────────────────
export interface StressRegionVM {
  element: 'roof' | 'wall' | 'floor';
  stressRatio: number;
  color: string;
  label: string;
}

// ─── Sprint 3C: Threat Path ──────────────────────────────────────
/** Visual representation of the threat-to-structure path.
 *  Built by ThreatPathAdapter — NOT from calculations layer. */
export interface ThreatPathVM {
  /** Start point (threat position) */
  start: [number, number, number];
  /** End point (nearest structure surface) */
  end: [number, number, number];
  /** Unit direction vector */
  direction: [number, number, number];
  /** Total distance from threat to structure center (m) */
  distanceToCenter: number;
  /** Distance from threat to nearest structure surface (m) */
  distanceToSurface: number;
  /** Path color (pre-computed by adapter) */
  color: string;
  /** Label text */
  label: string;
}

// ─── Sprint 3C: Crater Visualization ─────────────────────────────
/** Visual crater representation in soil.
 *  Built by GeometryBridge — NOT from calculations layer. */
export interface CraterVM {
  /** Crater center position */
  position: [number, number, number];
  /** Crater radius (m) — from damage zones or penetration data */
  radius: number;
  /** Crater depth (m) — estimated from penetration crater data */
  depth: number;
  /** Crater fill color (pre-computed) */
  color: string;
  /** Crater border color */
  borderColor: string;
  /** Label */
  label: string;
}

// ─── Sprint 3C: Stress Overlay ───────────────────────────────────
/** Per-element stress overlay for structure coloring.
 *  Visualization only — no FEA. Uses stressRegions data. */
export interface StressOverlayVM {
  /** Map of element → pre-computed color */
  elementColors: {
    roof: string;
    wall: string;
    floor: string;
  };
  /** Whether stress overlay data is available */
  hasData: boolean;
}

// ─── Sprint 3C: Engineering Annotations ──────────────────────────
/** Floating engineering annotations in 3D scene.
 *  All values pre-computed by adapter — no logic in 3D component. */
export interface EngineeringAnnotationVM {
  /** Annotation type */
  type: 'scaled-distance' | 'burial-depth' | 'crater-radius' | 'safety-factor' | 'soil-cover';
  /** World position for the annotation */
  position: [number, number, number];
  /** Primary label (Arabic) */
  label: string;
  /** Value with unit */
  value: string;
  /** Text color (pre-computed) */
  color: string;
}

// ─── Complete Visualization Model ────────────────────────────────
export interface VisualizationModel {
  damageZones: DamageZoneVM[];
  threatObject: ThreatObjectVM | null;
  pressureContours: PressureContourVM[];
  stressRegions: StressRegionVM[];

  // Sprint 3C additions
  threatPath: ThreatPathVM | null;
  crater: CraterVM | null;
  stressOverlay: StressOverlayVM;
  annotations: EngineeringAnnotationVM[];
}