/**
 * UPAS — Bomb Domain Model
 * Represents explosive ordnance characteristics
 * Data-driven: all explosive types loaded from JSON data files
 */

import { v4 as uuidv4 } from 'uuid';
import { DetonationType } from '../types';
import type { EngineeringValue } from '../types';

export interface Bomb {
  id: string;
  projectId: string;
  name: string;

  // Explosive type reference (key into bomb-types.json)
  explosiveTypeRef: string; // e.g., 'TNT', 'C4', 'ANFO'

  // Charge properties
  chargeMass: EngineeringValue; // TNT equivalent mass
  chargeShape: 'spherical' | 'cylindrical' | 'cuboid';

  // Charge dimensions (if non-spherical)
  chargeLength: EngineeringValue | null;
  chargeDiameter: EngineeringValue | null;

  // Detonation
  detonationType: DetonationType;
  detonationHeight: EngineeringValue | null; // for aerial detonation
  burialDepth: EngineeringValue | null; // for buried detonation

  // Derived properties (populated by calculation engine)
  tntEquivalent: EngineeringValue | null; // actual TNT equivalent after conversion
}

/**
 * Factory function to create a new Bomb with defaults
 */
export function createBomb(partial?: Partial<Bomb>): Bomb {
  return {
    id: uuidv4(),
    projectId: partial?.projectId ?? '',
    name: partial?.name ?? 'متفجرات جديدة',
    explosiveTypeRef: partial?.explosiveTypeRef ?? 'TNT',
    chargeMass: partial?.chargeMass ?? { value: 100, unit: 'kg' },
    chargeShape: partial?.chargeShape ?? 'spherical',
    chargeLength: partial?.chargeLength ?? null,
    chargeDiameter: partial?.chargeDiameter ?? null,
    detonationType: partial?.detonationType ?? DetonationType.Surface,
    detonationHeight: partial?.detonationHeight ?? null,
    burialDepth: partial?.burialDepth ?? null,
    tntEquivalent: partial?.tntEquivalent ?? null,
  };
}