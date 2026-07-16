/**
 * UPAS — Underground Protection Analysis System
 * Shared type definitions and enums
 */

// ─── Project Status ─────────────────────────────────────────────
export enum ProjectStatus {
  Draft = 'draft',
  InProgress = 'in_progress',
  Completed = 'completed',
  Archived = 'archived',
}

// ─── Threat Types ───────────────────────────────────────────────
export enum ThreatType {
  External = 'external',
  Internal = 'internal',
  Underground = 'underground',
  VehicleBorne = 'vehicle_borne',
}

// ─── Bomb Detonation Types ──────────────────────────────────────
export enum DetonationType {
  Surface = 'surface',
  Buried = 'buried',
  Aerial = 'aerial',
  Internal = 'internal',
}

// ─── Structure Types ────────────────────────────────────────────
export enum StructureType {
  Box = 'box',
  Arch = 'arch',
  Cylinder = 'cylinder',
  Dome = 'dome',
  Custom = 'custom',
}

// ─── Material Categories ────────────────────────────────────────
export enum MaterialCategory {
  Concrete = 'concrete',
  Steel = 'steel',
  Masonry = 'masonry',
  Soil = 'soil',
  Composite = 'composite',
}

// ─── Analysis Types ─────────────────────────────────────────────
export enum AnalysisType {
  Blast = 'blast',
  Penetration = 'penetration',
  Combined = 'combined',
}

// ─── Unit System ─────────────────────────────────────────────────
export type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft';
export type MassUnit = 'kg' | 'lb' | 'ton';
export type PressureUnit = 'kPa' | 'MPa' | 'GPa' | 'psi' | 'bar';
export type ForceUnit = 'kN' | 'N' | 'lbf';
export type DensityUnit = 'kg/m³' | 'lb/ft³';
export type VelocityUnit = 'm/s' | 'ft/s' | 'km/h';

// ─── Engineering Value with Unit ─────────────────────────────────
export interface EngineeringValue<T = number> {
  value: T;
  unit: string;
}

// ─── Coordinate3D ────────────────────────────────────────────────
export interface Coordinate3D {
  x: number;
  y: number;
  z: number;
}

// ─── Validation Result ───────────────────────────────────────────
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// ─── Project Version Info ────────────────────────────────────────
export interface VersionInfo {
  version: string;
  createdWith: string;
  lastModified: string;
  modifiedBy?: string;
}