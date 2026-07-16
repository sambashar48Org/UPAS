/**
 * UPAS — Material Domain Model
 * Represents construction materials with engineering properties
 * Data-driven: full properties loaded from materials.json
 * This model stores only the reference key + override values
 */

import { v4 as uuidv4 } from 'uuid';
import { MaterialCategory } from '../types';
import type { EngineeringValue } from '../types';

export interface Material {
  id: string;
  name: string;
  nameAr: string;

  category: MaterialCategory;

  // Reference key into materials.json for full properties
  materialRef: string; // e.g., 'rc_250', 'rc_350', 'steel_s250'

  // Core engineering properties (can override JSON defaults)
  compressiveStrength: EngineeringValue | null; // f'c (MPa)
  tensileStrength: EngineeringValue | null; // ft (MPa)
  modulusOfElasticity: EngineeringValue | null; // E (GPa)
  density: EngineeringValue | null; // ρ (kg/m³)
  poissonRatio: number | null; // ν
  yieldStrength: EngineeringValue | null; // fy (MPa) — for steel

  // Dynamic increase factors (populated from data or calculations)
  dynamicIncreaseFactorCompressive: number | null;
  dynamicIncreaseFactorTensile: number | null;

  // Description
  description: string;
}

/**
 * Factory function to create a Material
 * Typically used with a materialRef to load full properties from data
 */
export function createMaterial(partial?: Partial<Material>): Material {
  return {
    id: uuidv4(),
    name: partial?.name ?? 'مادة جديدة',
    nameAr: partial?.nameAr ?? 'مادة جديدة',
    category: partial?.category ?? MaterialCategory.Concrete,
    materialRef: partial?.materialRef ?? 'rc_350',
    compressiveStrength: partial?.compressiveStrength ?? null,
    tensileStrength: partial?.tensileStrength ?? null,
    modulusOfElasticity: partial?.modulusOfElasticity ?? null,
    density: partial?.density ?? null,
    poissonRatio: partial?.poissonRatio ?? null,
    yieldStrength: partial?.yieldStrength ?? null,
    dynamicIncreaseFactorCompressive: partial?.dynamicIncreaseFactorCompressive ?? null,
    dynamicIncreaseFactorTensile: partial?.dynamicIncreaseFactorTensile ?? null,
    description: partial?.description ?? '',
  };
}