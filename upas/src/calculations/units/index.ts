/**
 * UPAS — Calculation Unit Helpers
 * Sprint 3A: Extended unit utilities for the calculation engine
 * Extends the base unit system with calculation-specific conversions
 */

import type { EngineeringValue } from '../../types';

// ─── Common Engineering Conversions for Calculations ────────────────

/** Convert EngineeringValue to meters (returns null if incompatible) */
export function toMeters(ev: EngineeringValue): number | null {
  const value = ev.value as number;
  switch (ev.unit) {
    case 'mm': return value * 0.001;
    case 'cm': return value * 0.01;
    case 'm': return value;
    case 'in': return value * 0.0254;
    case 'ft': return value * 0.3048;
    default: return null;
  }
}

/** Convert EngineeringValue to kilograms (returns null if incompatible) */
export function toKilograms(ev: EngineeringValue): number | null {
  const value = ev.value as number;
  switch (ev.unit) {
    case 'kg': return value;
    case 'lb': return value * 0.453592;
    case 'ton': return value * 1000;
    default: return null;
  }
}

/** Convert EngineeringValue to kPa (returns null if incompatible) */
export function toKPa(ev: EngineeringValue): number | null {
  const value = ev.value as number;
  switch (ev.unit) {
    case 'kPa': return value;
    case 'MPa': return value * 1000;
    case 'GPa': return value * 1_000_000;
    case 'psi': return value * 6.89476;
    case 'bar': return value * 100;
    default: return null;
  }
}

/** Convert EngineeringValue to MPa (returns null if incompatible) */
export function toMPa(ev: EngineeringValue): number | null {
  const kpa = toKPa(ev);
  if (kpa === null) return null;
  return kpa / 1000;
}

/** Convert EngineeringValue to GPa (returns null if incompatible) */
export function toGPa(ev: EngineeringValue): number | null {
  const mpa = toMPa(ev);
  if (mpa === null) return null;
  return mpa / 1000;
}

/** Convert EngineeringValue to kg/m³ (returns null if incompatible) */
export function toKgPerM3(ev: EngineeringValue): number | null {
  const value = ev.value as number;
  switch (ev.unit) {
    case 'kg/m³': return value;
    case 'lb/ft³': return value * 16.0185;
    default: return null;
  }
}

/** Convert EngineeringValue to m/s (returns null if incompatible) */
export function toMetersPerSecond(ev: EngineeringValue): number | null {
  const value = ev.value as number;
  switch (ev.unit) {
    case 'm/s': return value;
    case 'ft/s': return value * 0.3048;
    case 'km/h': return value / 3.6;
    default: return null;
  }
}

/** Convert EngineeringValue to kN (returns null if incompatible) */
export function toKN(ev: EngineeringValue): number | null {
  const value = ev.value as number;
  switch (ev.unit) {
    case 'kN': return value;
    case 'N': return value * 0.001;
    case 'lbf': return value * 0.00444822;
    default: return null;
  }
}

/**
 * Safe conversion: returns defaultValue if conversion fails
 */
export function safeConvert(
  ev: EngineeringValue | null | undefined,
  converter: (ev: EngineeringValue) => number | null,
  defaultValue: number,
): number {
  if (!ev) return defaultValue;
  const result = converter(ev);
  return result ?? defaultValue;
}