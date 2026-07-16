/**
 * UPAS — Structure Domain Model
 * Represents an underground protective structure
 * Parametric: designed to support box, arch, cylinder, dome, and custom shapes
 */

import { v4 as uuidv4 } from 'uuid';
import { StructureType } from '../types';
import type { Coordinate3D, EngineeringValue } from '../types';

export interface Structure {
  id: string;
  projectId: string;
  name: string;
  description: string;

  type: StructureType;

  // Position & orientation
  position: Coordinate3D;
  rotation: Coordinate3D; // Euler angles in degrees

  // Overall dimensions (outer)
  length: EngineeringValue;
  width: EngineeringValue;
  height: EngineeringValue;

  // Wall/roof/floor thickness
  wallThickness: EngineeringValue;
  roofThickness: EngineeringValue;
  floorThickness: EngineeringValue;

  // Material reference (key into materials.json)
  wallMaterialRef: string;
  roofMaterialRef: string;
  floorMaterialRef: string;

  // Burial depth (depth of structure top below ground level)
  burialDepth: EngineeringValue;

  // Shape-specific parameters
  shapeParams: ShapeParams;

  // Opening/refugee entry info
  hasEntry: boolean;
  entryWidth: EngineeringValue | null;
  entryHeight: EngineeringValue | null;
}

// ─── Shape-specific Parameters ───────────────────────────────────
export interface ShapeParams {
  // Arch-specific
  archRadius: EngineeringValue | null;
  archAngle: number | null; // degrees

  // Cylinder-specific
  cylinderRadius: EngineeringValue | null;

  // Dome-specific
  domeRadius: EngineeringValue | null;
  domeHeight: EngineeringValue | null;
}

/**
 * Factory function to create a new Structure with defaults
 */
export function createStructure(partial?: Partial<Structure>): Structure {
  return {
    id: uuidv4(),
    projectId: partial?.projectId ?? '',
    name: partial?.name ?? 'منشأ جديد',
    description: partial?.description ?? '',
    type: partial?.type ?? StructureType.Box,
    position: partial?.position ?? { x: 0, y: -3, z: 0 },
    rotation: partial?.rotation ?? { x: 0, y: 0, z: 0 },
    length: partial?.length ?? { value: 6, unit: 'm' },
    width: partial?.width ?? { value: 4, unit: 'm' },
    height: partial?.height ?? { value: 3, unit: 'm' },
    wallThickness: partial?.wallThickness ?? { value: 0.3, unit: 'm' },
    roofThickness: partial?.roofThickness ?? { value: 0.35, unit: 'm' },
    floorThickness: partial?.floorThickness ?? { value: 0.3, unit: 'm' },
    wallMaterialRef: partial?.wallMaterialRef ?? 'rc_350',
    roofMaterialRef: partial?.roofMaterialRef ?? 'rc_350',
    floorMaterialRef: partial?.floorMaterialRef ?? 'rc_350',
    burialDepth: partial?.burialDepth ?? { value: 3, unit: 'm' },
    shapeParams: partial?.shapeParams ?? {
      archRadius: null,
      archAngle: null,
      cylinderRadius: null,
      domeRadius: null,
      domeHeight: null,
    },
    hasEntry: partial?.hasEntry ?? true,
    entryWidth: partial?.entryWidth ?? { value: 1, unit: 'm' },
    entryHeight: partial?.entryHeight ?? { value: 2.2, unit: 'm' },
  };
}