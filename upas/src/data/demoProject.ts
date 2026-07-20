/**
 * UPAS — Demo Project Data Factory
 * Sprint 3B: Reusable demo scenario for first-time users, testing, and regression.
 *
 * No UI dependencies — pure data factory.
 */

import { createProject } from '../models/Project';
import { createSoilProfile, createSoilLayer } from '../models/Soil';
import { createStructure } from '../models/Structure';
import { createThreat } from '../models/Threat';
import { createBomb } from '../models/Bomb';
import { ThreatType } from '../types';
import { DetonationType } from '../types';
import { StructureType } from '../types';
import type { Project } from '../models/Project';
import type { SoilProfile } from '../models/Soil';
import type { Structure } from '../models/Structure';
import type { Threat } from '../models/Threat';
import type { Bomb } from '../models/Bomb';

import type { DesignCriteria } from '../calculations/design/types';

export interface DemoProjectData {
  project: Project;
  soilProfile: SoilProfile;
  structure: Structure;
  threat: Threat;
  bomb: Bomb;
  /** Pre-configured design criteria for the demo — enables one-click analysis + design */
  designCriteria: DesignCriteria;
}

/** Default design criteria used by the demo project (UFC 3-340-02 + ACI 318-19) */
const DEMO_DESIGN_CRITERIA: DesignCriteria = {
  targetSafetyFactor: 1.5,
  allowPlasticResponse: true,
  supportCondition: 'simply_supported',
  wallSupportCondition: 'fixed',
  reinforcementGrade: { fy: 420, standard: 'ASTM A615 Grade 60' },
  concreteCover: 0.050,
  maxDeflectionRatio: 1 / 360,
  thicknessIncrement: 0.025,
  maxThickness: 2.0,
  includeSelfWeight: true,
  includeOverburden: true,
  includeLateralPressure: true,
  maxSupportRotation: 8.0,
  steelGrade: 420,
};

export function createDemoProject(): DemoProjectData {
  const project = createProject({
    name: 'Underground Hardened Structure Demo',
    description: 'سيناريو تجريبي شامل — تحليل وتصميم منشأ تحت أرضي ضد تهديد انفجاري سطحي | Complete demo: blast analysis + structural design + verification',
  });

  const structure = createStructure({
    projectId: project.id,
    name: 'ملجأ تحت أرضي تجريبي',
    type: StructureType.Box,
    length: { value: 8, unit: 'm' },
    width: { value: 5, unit: 'm' },
    height: { value: 3.5, unit: 'm' },
    wallThickness: { value: 0.35, unit: 'm' },
    roofThickness: { value: 0.40, unit: 'm' },
    floorThickness: { value: 0.35, unit: 'm' },
    burialDepth: { value: 3, unit: 'm' },
    roofMaterialRef: 'rc_350',
    wallMaterialRef: 'rc_350',
    floorMaterialRef: 'rc_350',
  });

  const layer0 = createSoilLayer({ name: 'رمل مفكوك', soilTypeRef: 'sand_loose', topElevation: { value: 0, unit: 'm' }, thickness: { value: 1.5, unit: 'm' } }, 0);
  const layer1 = createSoilLayer({ name: 'طين رخو', soilTypeRef: 'clay_soft', topElevation: { value: -1.5, unit: 'm' }, thickness: { value: 2.5, unit: 'm' } }, 1);
  const layer2 = createSoilLayer({ name: 'رمل متوسط', soilTypeRef: 'sand_medium', topElevation: { value: -4, unit: 'm' }, thickness: { value: 3, unit: 'm' } }, 2);
  const layer3 = createSoilLayer({ name: 'صخر متآكل', soilTypeRef: 'rock_weathered', topElevation: { value: -7, unit: 'm' }, thickness: { value: 4, unit: 'm' } }, 3);

  const soilProfile = createSoilProfile({
    projectId: project.id,
    name: 'ملف تربة تجريبي',
    layers: [layer0, layer1, layer2, layer3],
    waterTableDepth: { value: -3, unit: 'm' },
    totalDepth: { value: 11, unit: 'm' },
  });

  const threat = createThreat({
    projectId: project.id,
    name: 'تهديد انفجاري سطحي',
    type: ThreatType.External,
    standoffDistance: { value: 5, unit: 'm' },
    detonationType: 'surface',
    burialDepth: null,
    position: { x: 0, y: 0, z: 0 },
  });

  const bomb = createBomb({
    projectId: project.id,
    name: 'شحنة TNT سطحي',
    explosiveTypeRef: 'TNT',
    chargeMass: { value: 100, unit: 'kg' },
    chargeShape: 'spherical',
    detonationType: DetonationType.Surface,
  });

  return { project, soilProfile, structure, threat, bomb, designCriteria: DEMO_DESIGN_CRITERIA };
}