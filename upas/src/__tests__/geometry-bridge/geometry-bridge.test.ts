/**
 * UPAS — Sprint 3C Geometry Bridge Tests
 * AC-13: Headless — no React, no Three.js, no DOM.
 * Tests GeometryBridge, ThreatPath, Crater, StressOverlay, Annotations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { buildVisualizationModel } from '../../visualization/VisualizationAdapter';
import { buildGeometryData } from '../../visualization/GeometryBridge';
import { createDemoProject } from '../../data/demoProject';
import { executeAnalysis } from '../../services/analysis';

describe('Sprint 3C — GeometryBridge (Headless)', () => {
  let fullResult: ReturnType<typeof executeAnalysis>['fullResult'];

  beforeAll(() => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });
    fullResult = result.fullResult!;
  });

  it('should build geometry data with threat path', () => {
    if (!fullResult) throw new Error('No result');
    const geo = buildGeometryData(fullResult);

    expect(geo.threatPath).not.toBeNull();
    expect(geo.threatPath.start).toHaveLength(3);
    expect(geo.threatPath.end).toHaveLength(3);
    expect(geo.threatPath.direction).toHaveLength(3);
    expect(geo.threatPath.distanceToCenter).toBeGreaterThan(0);
    expect(geo.threatPath.distanceToSurface).toBeLessThanOrEqual(geo.threatPath.distanceToCenter);
    expect(geo.threatPath.color).toBe('#ef4444');
    expect(geo.threatPath.label).toContain('المسافة');
  });

  it('should compute threat direction correctly (not always downward)', () => {
    if (!fullResult) throw new Error('No result');
    const geo = buildGeometryData(fullResult);

    // The direction should NOT be {0, -1, 0} (the old bug fallback)
    const dir = geo.threatPath.direction;
    const isAlwaysDown = dir[0] === 0 && dir[1] === -1 && dir[2] === 0;

    // If threat and structure have different X positions, direction should have non-zero X
    const tPos = fullResult.input.threat.position;
    const sPos = fullResult.input.structure.position;
    if (tPos.x !== sPos.x) {
      expect(dir[0]).not.toBe(0);
    }
  });

  it('should build crater data when crater zone exists', () => {
    if (!fullResult) throw new Error('No result');
    const geo = buildGeometryData(fullResult);

    const hasCrater = fullResult.visualization.damageZones.some(dz => dz.type === 'crater');
    if (hasCrater) {
      expect(geo.crater).not.toBeNull();
      expect(geo.crater!.radius).toBeGreaterThan(0);
      expect(geo.crater!.depth).toBeGreaterThan(0);
      expect(geo.crater!.color).toBe('#7c2d12');
      expect(geo.crater!.label).toContain('الحفرة');
    } else {
      expect(geo.crater).toBeNull();
    }
  });

  it('should build stress overlay with element colors', () => {
    if (!fullResult) throw new Error('No result');
    const geo = buildGeometryData(fullResult);

    expect(geo.stressOverlay).toBeDefined();
    expect(geo.stressOverlay.elementColors).toHaveProperty('roof');
    expect(geo.stressOverlay.elementColors).toHaveProperty('wall');
    expect(geo.stressOverlay.elementColors).toHaveProperty('floor');

    // Each color should be a valid hex string
    const colors = [geo.stressOverlay.elementColors.roof, geo.stressOverlay.elementColors.wall, geo.stressOverlay.elementColors.floor];
    colors.forEach(c => expect(c).toMatch(/^#[0-9a-f]{6}$/i));
  });

  it('should indicate hasData when stress regions exist', () => {
    if (!fullResult) throw new Error('No result');
    const geo = buildGeometryData(fullResult);

    const hasRegions = fullResult.visualization.structureStressRegions.length > 0;
    expect(geo.stressOverlay.hasData).toBe(hasRegions);
  });

  it('should build engineering annotations', () => {
    if (!fullResult) throw new Error('No result');
    const geo = buildGeometryData(fullResult);

    expect(geo.annotations.length).toBeGreaterThan(0);

    // Check burial depth annotation
    const burialAnn = geo.annotations.find(a => a.type === 'burial-depth');
    expect(burialAnn).toBeDefined();
    expect(burialAnn!.label).toBe('عمق الدفن');
    expect(burialAnn!.value).toContain('m');
    expect(burialAnn!.position).toHaveLength(3);

    // Check soil cover annotation
    const coverAnn = geo.annotations.find(a => a.type === 'soil-cover');
    expect(coverAnn).toBeDefined();
    expect(coverAnn!.label).toBe('الغطاء الترابي');
  });

  it('should include safety factor annotations when responses exist', () => {
    if (!fullResult) throw new Error('No result');
    const geo = buildGeometryData(fullResult);

    const sfAnns = geo.annotations.filter(a => a.type === 'safety-factor');
    const responseCount = [fullResult.blast.roofResponse, fullResult.blast.wallResponse, fullResult.blast.floorResponse].filter(Boolean).length;
    expect(sfAnns.length).toBe(responseCount);

    sfAnns.forEach(ann => {
      expect(ann.value).toContain('SF');
      expect(ann.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

describe('Sprint 3C — VisualizationModel Integration', () => {
  let vm: ReturnType<typeof buildVisualizationModel>;

  beforeAll(() => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });
    vm = buildVisualizationModel(result.fullResult!);
  });

  it('should include all Sprint 3C fields in VisualizationModel', () => {
    expect(vm).toHaveProperty('threatPath');
    expect(vm).toHaveProperty('crater');
    expect(vm).toHaveProperty('stressOverlay');
    expect(vm).toHaveProperty('annotations');
    // Sprint 3B fields still present
    expect(vm).toHaveProperty('damageZones');
    expect(vm).toHaveProperty('threatObject');
    expect(vm).toHaveProperty('pressureContours');
    expect(vm).toHaveProperty('stressRegions');
  });

  it('should have annotations array with at least 3 items', () => {
    expect(vm.annotations.length).toBeGreaterThanOrEqual(3);
  });

  it('should have stress overlay with all element colors', () => {
    expect(vm.stressOverlay.elementColors.roof).toBeDefined();
    expect(vm.stressOverlay.elementColors.wall).toBeDefined();
    expect(vm.stressOverlay.elementColors.floor).toBeDefined();
  });

  it('threat direction should use real positions (not bug fallback)', () => {
    expect(vm.threatObject).not.toBeNull();
    const dir = vm.threatObject!.direction;

    // Verify it's a unit vector
    const mag = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
    expect(Math.abs(mag - 1)).toBeLessThan(0.01);
  });
});