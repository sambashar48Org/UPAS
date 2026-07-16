/**
 * UPAS — Visualization Model Types
 * Sprint 3B: Pre-computed visualization data for 3D components.
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

// ─── Complete Visualization Model ────────────────────────────────
export interface VisualizationModel {
  damageZones: DamageZoneVM[];
  threatObject: ThreatObjectVM | null;
  pressureContours: PressureContourVM[];
  stressRegions: StressRegionVM[];
}