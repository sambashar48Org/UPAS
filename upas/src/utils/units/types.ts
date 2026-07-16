/**
 * UPAS — Engineering Unit Types
 * Re-exports and extends base types for unit operations
 */

export type { EngineeringValue } from '../../types';

export type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft';
export type MassUnit = 'kg' | 'lb' | 'ton';
export type PressureUnit = 'kPa' | 'MPa' | 'GPa' | 'psi' | 'bar';
export type ForceUnit = 'kN' | 'N' | 'lbf';
export type DensityUnit = 'kg/m³' | 'lb/ft³';
export type VelocityUnit = 'm/s' | 'ft/s' | 'km/h';

export type AnyUnit =
  | LengthUnit
  | MassUnit
  | PressureUnit
  | ForceUnit
  | DensityUnit
  | VelocityUnit;