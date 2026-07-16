/**
 * UPAS — Engineering Unit System
 * Modification #2: value+unit type system
 *
 * All engineering values in the system use { value, unit } objects.
 * This file provides conversion utilities between unit systems.
 */

import type {
  LengthUnit,
  MassUnit,
  PressureUnit,
  ForceUnit,
  DensityUnit,
  VelocityUnit,
  EngineeringValue,
} from '../../types';

// ─── Conversion Factor Tables ──────────────────────────────────────
// All conversions go TO the base unit, then FROM base unit TO target.

const LENGTH_TO_METERS: Record<LengthUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  'in': 0.0254,
  ft: 0.3048,
};

const MASS_TO_KG: Record<MassUnit, number> = {
  kg: 1,
  lb: 0.453592,
  ton: 1000,
};

const PRESSURE_TO_KPA: Record<PressureUnit, number> = {
  kPa: 1,
  MPa: 1000,
  GPa: 1_000_000,
  psi: 6.89476,
  bar: 100,
};

const FORCE_TO_KN: Record<ForceUnit, number> = {
  kN: 1,
  N: 0.001,
  lbf: 0.00444822,
};

const DENSITY_TO_KG_M3: Record<DensityUnit, number> = {
  'kg/m³': 1,
  'lb/ft³': 16.0185,
};

const VELOCITY_TO_MS: Record<VelocityUnit, number> = {
  'm/s': 1,
  'ft/s': 0.3048,
  'km/h': 0.277778,
};

// ─── Supported Unit Groups ─────────────────────────────────────────
type UnitGroup = 'length' | 'mass' | 'pressure' | 'force' | 'density' | 'velocity';

const UNIT_GROUP_MAP: Record<string, UnitGroup> = {
  // Length
  mm: 'length', cm: 'length', m: 'length', 'in': 'length', ft: 'length',
  // Mass
  kg: 'mass', lb: 'mass', ton: 'mass',
  // Pressure
  kPa: 'pressure', MPa: 'pressure', GPa: 'pressure', psi: 'pressure', bar: 'pressure',
  // Force
  kN: 'force', N: 'force', lbf: 'force',
  // Density
  'kg/m³': 'density', 'lb/ft³': 'density',
  // Velocity
  'm/s': 'velocity', 'ft/s': 'velocity', 'km/h': 'velocity',
};

// ─── Core Conversion Functions ─────────────────────────────────────

/**
 * Convert an EngineeringValue from one unit to another within the same group.
 * Returns null if units are incompatible.
 */
export function convertUnit<T extends number = number>(
  ev: EngineeringValue<T>,
  targetUnit: string
): EngineeringValue<T> | null {
  const sourceGroup = UNIT_GROUP_MAP[ev.unit];
  const targetGroup = UNIT_GROUP_MAP[targetUnit];

  if (!sourceGroup || !targetGroup || sourceGroup !== targetGroup) {
    return null; // incompatible units
  }

  const converted = convertRaw(ev.value as number, ev.unit, targetUnit);
  if (converted === null) return null;

  return { value: converted as T, unit: targetUnit };
}

/**
 * Raw number conversion between two units of the same group.
 */
export function convertRaw(
  value: number,
  fromUnit: string,
  toUnit: string
): number | null {
  if (fromUnit === toUnit) return value;

  const group = UNIT_GROUP_MAP[fromUnit];
  if (!group || UNIT_GROUP_MAP[toUnit] !== group) return null;

  switch (group) {
    case 'length': {
      const factors = LENGTH_TO_METERS as Record<string, number>;
      const fromFactor = factors[fromUnit]!;
      const toFactor = factors[toUnit]!;
      return (value * fromFactor) / toFactor;
    }
    case 'mass': {
      const factors = MASS_TO_KG as Record<string, number>;
      const fromFactor = factors[fromUnit]!;
      const toFactor = factors[toUnit]!;
      return (value * fromFactor) / toFactor;
    }
    case 'pressure': {
      const factors = PRESSURE_TO_KPA as Record<string, number>;
      const fromFactor = factors[fromUnit]!;
      const toFactor = factors[toUnit]!;
      return (value * fromFactor) / toFactor;
    }
    case 'force': {
      const factors = FORCE_TO_KN as Record<string, number>;
      const fromFactor = factors[fromUnit]!;
      const toFactor = factors[toUnit]!;
      return (value * fromFactor) / toFactor;
    }
    case 'density': {
      const factors = DENSITY_TO_KG_M3 as Record<string, number>;
      const fromFactor = factors[fromUnit]!;
      const toFactor = factors[toUnit]!;
      return (value * fromFactor) / toFactor;
    }
    case 'velocity': {
      const factors = VELOCITY_TO_MS as Record<string, number>;
      const fromFactor = factors[fromUnit]!;
      const toFactor = factors[toUnit]!;
      return (value * fromFactor) / toFactor;
    }
    default:
      return null;
  }
}

/**
 * Create an EngineeringValue helper
 */
export function ev<T extends number = number>(value: T, unit: string): EngineeringValue<T> {
  return { value, unit };
}

/**
 * Extract numeric value in a specific target unit.
 * Returns null if conversion is not possible.
 */
export function toUnit(
  engineeringValue: EngineeringValue,
  targetUnit: string
): number | null {
  return convertRaw(engineeringValue.value as number, engineeringValue.unit, targetUnit);
}

/**
 * Format an EngineeringValue for display
 */
export function formatEngineeringValue(
  engineeringValue: EngineeringValue,
  decimals: number = 2
): string {
  return `${Number(engineeringValue.value).toFixed(decimals)} ${engineeringValue.unit}`;
}

/**
 * Check if two EngineeringValues are equivalent (same value in same unit)
 */
export function areEqual(
  a: EngineeringValue,
  b: EngineeringValue,
  tolerance: number = 0.0001
): boolean {
  if (a.unit === b.unit) {
    return Math.abs((a.value as number) - (b.value as number)) < tolerance;
  }
  // Convert b to a's unit
  const converted = convertRaw(b.value as number, b.unit, a.unit);
  if (converted === null) return false;
  return Math.abs((a.value as number) - converted) < tolerance;
}