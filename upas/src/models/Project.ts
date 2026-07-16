/**
 * UPAS — Project Domain Model
 * Represents a complete underground protection analysis project
 */

import { v4 as uuidv4 } from 'uuid';
import { ProjectStatus } from '../types';
import type {
  VersionInfo,
  Coordinate3D,
  EngineeringValue,
} from '../types';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;

  // Versioning (Modification #5)
  version: VersionInfo;

  // Project location & reference
  location: string;
  referencePoint: Coordinate3D;

  // Project scale
  groundLevel: EngineeringValue; // e.g., { value: 0, unit: 'm' }

  // Associated data IDs (foreign keys to other models)
  threatId: string | null;
  soilProfileId: string | null;
  structureId: string | null;
  analysisResultIds: string[];

  // Visualization settings reference
  visualizationSettingsId: string | null;
}

/**
 * Factory function to create a new Project with sensible defaults
 */
export function createProject(partial?: Partial<Project>): Project {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: partial?.name ?? 'مشروع جديد',
    description: partial?.description ?? '',
    status: ProjectStatus.Draft,
    createdAt: now,
    updatedAt: now,
    version: partial?.version ?? {
      version: '1.0.0',
      createdWith: 'UPAS v0.1.0',
      lastModified: now,
    },
    location: partial?.location ?? '',
    referencePoint: partial?.referencePoint ?? { x: 0, y: 0, z: 0 },
    groundLevel: partial?.groundLevel ?? { value: 0, unit: 'm' },
    threatId: partial?.threatId ?? null,
    soilProfileId: partial?.soilProfileId ?? null,
    structureId: partial?.structureId ?? null,
    analysisResultIds: partial?.analysisResultIds ?? [],
    visualizationSettingsId: partial?.visualizationSettingsId ?? null,
  };
}