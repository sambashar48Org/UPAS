/**
 * UPAS — Model Validation Tests
 * Sprint 1: Basic model creation and validation
 */

import { describe, it, expect } from 'vitest';
import { createProject } from '../../models/Project';
import { createThreat } from '../../models/Threat';
import { createBomb } from '../../models/Bomb';
import { createSoilLayer, createSoilProfile } from '../../models/Soil';
import { createStructure } from '../../models/Structure';
import { createMaterial } from '../../models/Material';
import { createAnalysisResult } from '../../models/AnalysisResult';
import { createVisualizationSettings } from '../../models/VisualizationSettings';
import { validateProject } from '../../validation/projectValidation';
import { validateSoilProfile } from '../../validation/soilValidation';
import { validateStructure } from '../../validation/structureValidation';

describe('Model Creation', () => {
  it('should create a project with defaults', () => {
    const project = createProject();
    expect(project.id).toBeTruthy();
    expect(project.name).toBe('مشروع جديد');
    expect(project.status).toBe('draft');
    expect(project.version.version).toBe('1.0.0');
    expect(project.version.createdWith).toBe('UPAS v0.1.0');
    expect(project.threatId).toBeNull();
    expect(project.analysisResultIds).toEqual([]);
    expect(project.groundLevel).toEqual({ value: 0, unit: 'm' });
  });

  it('should create a project with custom values', () => {
    const project = createProject({
      name: 'اختبار المشروع',
      location: 'الرياض',
    });
    expect(project.name).toBe('اختبار المشروع');
    expect(project.location).toBe('الرياض');
  });

  it('should create a threat with defaults', () => {
    const threat = createThreat({ projectId: 'test-id' });
    expect(threat.id).toBeTruthy();
    expect(threat.projectId).toBe('test-id');
    expect(threat.standoffDistance).toEqual({ value: 10, unit: 'm' });
    expect(threat.probabilityLevel).toBe(5);
  });

  it('should create a bomb with defaults', () => {
    const bomb = createBomb({ projectId: 'test-id' });
    expect(bomb.id).toBeTruthy();
    expect(bomb.explosiveTypeRef).toBe('TNT');
    expect(bomb.chargeShape).toBe('spherical');
    expect(bomb.chargeMass).toEqual({ value: 100, unit: 'kg' });
  });

  it('should create a soil profile with a default layer', () => {
    const profile = createSoilProfile({ projectId: 'test-id' });
    expect(profile.id).toBeTruthy();
    expect(profile.layers).toHaveLength(1);
    expect(profile.layers[0]!.soilTypeRef).toBe('sand');
  });

  it('should create a structure with defaults', () => {
    const structure = createStructure({ projectId: 'test-id' });
    expect(structure.id).toBeTruthy();
    expect(structure.type).toBe('box');
    expect(structure.length).toEqual({ value: 6, unit: 'm' });
    expect(structure.wallThickness).toEqual({ value: 0.3, unit: 'm' });
    expect(structure.hasEntry).toBe(true);
  });

  it('should create a material with defaults', () => {
    const material = createMaterial({ materialRef: 'rc_350' });
    expect(material.id).toBeTruthy();
    expect(material.materialRef).toBe('rc_350');
    expect(material.category).toBe('concrete');
  });

  it('should create an analysis result with pending status', () => {
    const result = createAnalysisResult({ projectId: 'test-id' });
    expect(result.id).toBeTruthy();
    expect(result.protectionLevel).toBe('pending');
    expect(result.blastResults).toBeNull();
    expect(result.recommendations).toEqual([]);
  });

  it('should create visualization settings with defaults', () => {
    const settings = createVisualizationSettings({ projectId: 'test-id' });
    expect(settings.showGrid).toBe(true);
    expect(settings.showAxes).toBe(true);
    expect(settings.showSoilLayers).toBe(true);
    expect(settings.soilTransparency).toBe(0.7);
    expect(settings.displayUnits).toBe('metric');
  });
});

describe('Project Validation', () => {
  it('should validate a correct project', () => {
    const project = createProject({ name: 'مشروع صالح' });
    const result = validateProject(project);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject a project with empty name', () => {
    const project = createProject({ name: '' });
    const result = validateProject(project);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'PROJECT_NAME_EMPTY')).toBe(true);
  });

  it('should reject a project with missing version', () => {
    const project = createProject();
    // @ts-expect-error — testing invalid state
    project.version = null;
    const result = validateProject(project);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'PROJECT_VERSION_MISSING')).toBe(true);
  });
});

describe('Soil Validation', () => {
  it('should validate a correct soil profile', () => {
    const profile = createSoilProfile({ name: 'ملف تربة صالح' });
    const result = validateSoilProfile(profile);
    expect(result.isValid).toBe(true);
  });

  it('should reject a profile with empty layers', () => {
    const profile = createSoilProfile();
    profile.layers = [];
    const result = validateSoilProfile(profile);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'SOIL_LAYERS_EMPTY')).toBe(true);
  });

  it('should reject a layer with invalid thickness', () => {
    const layer = createSoilLayer();
    layer.thickness = { value: -1, unit: 'm' };
    const profile = createSoilProfile();
    profile.layers = [layer];
    const result = validateSoilProfile(profile);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'SOIL_THICKNESS_INVALID')).toBe(true);
  });
});

describe('Structure Validation', () => {
  it('should validate a correct structure', () => {
    const structure = createStructure({ name: 'منشأ صالح' });
    const result = validateStructure(structure);
    expect(result.isValid).toBe(true);
  });

  it('should reject a structure with missing dimensions', () => {
    const structure = createStructure();
    structure.length = { value: 0, unit: 'm' };
    const result = validateStructure(structure);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'STRUCTURE_LENGTH_INVALID')).toBe(true);
  });

  it('should warn about excessive thickness', () => {
    const structure = createStructure();
    structure.wallThickness = { value: 5, unit: 'm' };
    const result = validateStructure(structure);
    expect(result.warnings.some((e) => e.code === 'STRUCTURE_WALLTHICKNESS_EXCESSIVE')).toBe(true);
  });
});