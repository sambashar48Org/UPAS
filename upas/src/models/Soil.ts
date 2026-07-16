/**
 * UPAS — Soil Domain Models
 * Represents soil layers and soil profiles
 * Data-driven: soil type properties loaded from JSON data files
 */

import { v4 as uuidv4 } from 'uuid';
import type { EngineeringValue } from '../types';

// ─── Soil Layer ──────────────────────────────────────────────────
export interface SoilLayer {
  id: string;
  layerIndex: number; // 0 = topmost layer
  name: string;

  // Thickness of this layer
  thickness: EngineeringValue;

  // Soil type reference (key into soil-types.json)
  soilTypeRef: string; // e.g., 'sand', 'clay', 'rock'

  // Positioning (top of this layer relative to ground level, negative = below ground)
  topElevation: EngineeringValue;

  // Notes
  description: string;
}

// ─── Soil Profile ────────────────────────────────────────────────
export interface SoilProfile {
  id: string;
  projectId: string;
  name: string;
  description: string;

  // Ordered list of soil layers (top to bottom)
  layers: SoilLayer[];

  // Water table depth (negative = below ground level)
  waterTableDepth: EngineeringValue | null;

  // Total depth of soil profile
  totalDepth: EngineeringValue;
}

/**
 * Factory: create a single soil layer with defaults
 */
export function createSoilLayer(partial?: Partial<SoilLayer>, index?: number): SoilLayer {
  return {
    id: uuidv4(),
    layerIndex: index ?? 0,
    name: partial?.name ?? 'طبقة تربة',
    thickness: partial?.thickness ?? { value: 2, unit: 'm' },
    soilTypeRef: partial?.soilTypeRef ?? 'sand',
    topElevation: partial?.topElevation ?? { value: 0, unit: 'm' },
    description: partial?.description ?? '',
  };
}

/**
 * Factory: create a soil profile with a default single layer
 */
export function createSoilProfile(partial?: Partial<SoilProfile>): SoilProfile {
  const defaultLayer = createSoilLayer({ name: 'طبقة التربة السطحية', soilTypeRef: 'sand' }, 0);
  return {
    id: uuidv4(),
    projectId: partial?.projectId ?? '',
    name: partial?.name ?? 'ملف تربة جديد',
    description: partial?.description ?? '',
    layers: partial?.layers ?? [defaultLayer],
    waterTableDepth: partial?.waterTableDepth ?? null,
    totalDepth: partial?.totalDepth ?? { value: 2, unit: 'm' },
  };
}