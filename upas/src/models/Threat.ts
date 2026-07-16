/**
 * UPAS — Threat Domain Model
 * Represents a bomb threat scenario
 */

import { v4 as uuidv4 } from 'uuid';
import { ThreatType } from '../types';
import type { Coordinate3D, EngineeringValue } from '../types';

export interface Threat {
  id: string;
  projectId: string;
  name: string;
  description: string;

  type: ThreatType;

  // Threat position relative to structure
  position: Coordinate3D;
  standoffDistance: EngineeringValue; // distance from threat to structure

  // Detonation parameters
  detonationType: string; // 'surface' | 'buried' | 'aerial' | 'internal'
  burialDepth: EngineeringValue | null; // depth if buried threat

  // Probability assessment (1-10 scale)
  probabilityLevel: number;
  notes: string;
}

/**
 * Factory function to create a new Threat with defaults
 */
export function createThreat(partial?: Partial<Threat>): Threat {
  return {
    id: uuidv4(),
    projectId: partial?.projectId ?? '',
    name: partial?.name ?? 'تهديد جديد',
    description: partial?.description ?? '',
    type: partial?.type ?? ThreatType.External,
    position: partial?.position ?? { x: 0, y: 0, z: 0 },
    standoffDistance: partial?.standoffDistance ?? { value: 10, unit: 'm' },
    detonationType: partial?.detonationType ?? 'surface',
    burialDepth: partial?.burialDepth ?? null,
    probabilityLevel: partial?.probabilityLevel ?? 5,
    notes: partial?.notes ?? '',
  };
}