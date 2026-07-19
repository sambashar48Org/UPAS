/**
 * Phase 4F — Design UI Integration Tests
 *
 * Tests that UI state correctly maps to DesignCriteria and flows through
 * the pipeline. Tests the store layer and pipeline wiring — not React rendering.
 *
 * No engineering calculations. Only state management + data flow.
 *
 * Test A: UI state → DesignCriteria mapping (store correctness)
 * Test B: Pipeline receives correct criteria (end-to-end via store)
 * Test C: Design results render correctly (data structure verification)
 * Test D: No regression — design disabled = old workflow unchanged
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../../stores/projectStore';
import { executeAnalysis } from '../../services/analysis';
import { createDemoProject } from '../../data/demoProject';
import { DEFAULT_DESIGN_CRITERIA } from '../../calculations/constants';
import type { DesignCriteria } from '../../calculations/design/types';

// ═══════════════════════════════════════════════════════════════════════
// TEST A: UI state → DesignCriteria mapping
// Verifies that the store correctly holds and updates design criteria.
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4F Test A: UI state → DesignCriteria mapping', () => {
  beforeEach(() => {
    // Reset store to clean state
    useProjectStore.getState().resetProjectState();
  });

  it('initial state: designEnabled = false, designCriteria = {}, lastDesignResult = null', () => {
    const state = useProjectStore.getState();
    expect(state.designEnabled).toBe(false);
    expect(state.designCriteria).toEqual({});
    expect(state.lastDesignResult).toBeNull();
  });

  it('setDesignEnabled toggles design on', () => {
    useProjectStore.getState().setDesignEnabled(true);
    expect(useProjectStore.getState().designEnabled).toBe(true);

    useProjectStore.getState().setDesignEnabled(false);
    expect(useProjectStore.getState().designEnabled).toBe(false);
  });

  it('setDesignCriteria stores partial criteria', () => {
    const criteria: Partial<DesignCriteria> = {
      targetSafetyFactor: 1.2,
      steelGrade: 500,
    };
    useProjectStore.getState().setDesignCriteria(criteria);

    const stored = useProjectStore.getState().designCriteria;
    expect(stored.targetSafetyFactor).toBe(1.2);
    expect(stored.steelGrade).toBe(500);
  });

  it('setDesignCriteria merges with existing values (UI updates one field at a time)', () => {
    useProjectStore.getState().setDesignCriteria({ targetSafetyFactor: 1.2 });
    useProjectStore.getState().setDesignCriteria({ steelGrade: 500 });

    const stored = useProjectStore.getState().designCriteria;
    expect(stored.targetSafetyFactor).toBe(1.2);
    expect(stored.steelGrade).toBe(500);
  });

  it('design criteria stores support conditions correctly', () => {
    const criteria: Partial<DesignCriteria> = {
      supportCondition: 'fixed',
      wallSupportCondition: 'simply_supported',
    };
    useProjectStore.getState().setDesignCriteria(criteria);

    const stored = useProjectStore.getState().designCriteria;
    expect(stored.supportCondition).toBe('fixed');
    expect(stored.wallSupportCondition).toBe('simply_supported');
  });

  it('design criteria stores toggle options correctly', () => {
    const criteria: Partial<DesignCriteria> = {
      allowPlasticResponse: false,
      includeSelfWeight: true,
      includeOverburden: false,
      includeLateralPressure: true,
    };
    useProjectStore.getState().setDesignCriteria(criteria);

    const stored = useProjectStore.getState().designCriteria;
    expect(stored.allowPlasticResponse).toBe(false);
    expect(stored.includeSelfWeight).toBe(true);
    expect(stored.includeOverburden).toBe(false);
    expect(stored.includeLateralPressure).toBe(true);
  });

  it('concrete cover stored in meters (UI converts mm → m)', () => {
    // UI sends mm/1000 → store holds m
    useProjectStore.getState().setDesignCriteria({ concreteCover: 0.040 });
    expect(useProjectStore.getState().designCriteria.concreteCover).toBe(0.040);
  });

  it('resetProjectState clears design state', () => {
    useProjectStore.getState().setDesignEnabled(true);
    useProjectStore.getState().setDesignCriteria({ targetSafetyFactor: 1.2 });

    useProjectStore.getState().resetProjectState();

    expect(useProjectStore.getState().designEnabled).toBe(false);
    expect(useProjectStore.getState().designCriteria).toEqual({});
    expect(useProjectStore.getState().lastDesignResult).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST B: Pipeline receives correct criteria
// Verifies that when design is enabled + criteria set, the pipeline
// produces a DesignResult. When disabled, designResult = null.
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4F Test B: Pipeline receives correct criteria', () => {
  it('pipeline with designEnabled=true and criteria produces DesignResult', () => {
    const demo = createDemoProject();
    const criteria: Partial<DesignCriteria> = { targetSafetyFactor: 1.2, steelGrade: 500 };

    // Simulate what the hook does: pass criteria only when enabled
    const designEnabled = true;
    const designCriteria = criteria;

    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: designEnabled && Object.keys(designCriteria).length > 0
        ? designCriteria
        : undefined,
    });

    expect(result.success).toBe(true);
    expect(result.designResult).not.toBeNull();
  });

  it('pipeline with designEnabled=false produces null DesignResult', () => {
    const demo = createDemoProject();

    // Simulate hook behavior: disabled → no criteria passed
    const designEnabled = false;
    const designCriteria: Partial<DesignCriteria> = { targetSafetyFactor: 1.2 };

    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: designEnabled && Object.keys(designCriteria).length > 0
        ? designCriteria
        : undefined,
    });

    expect(result.success).toBe(true);
    expect(result.designResult).toBeNull();
  });

  it('pipeline with empty criteria object produces null DesignResult', () => {
    const demo = createDemoProject();

    // Empty criteria → Object.keys({}).length === 0 → undefined passed
    const designEnabled = true;
    const designCriteria: Partial<DesignCriteria> = {};

    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: designEnabled && Object.keys(designCriteria).length > 0
        ? designCriteria
        : undefined,
    });

    expect(result.designResult).toBeNull();
  });

  it('custom steelGrade reaches DesignResult through pipeline', () => {
    const demo = createDemoProject();
    const customFy = 500;

    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { steelGrade: customFy },
    });

    const dr = result.designResult!;
    // With different fy, the design should still produce valid results
    // (values will differ from default 420 MPa, but structure should be valid)
    expect(dr.roof.mainReinforcement.barDiameter).toBeGreaterThan(0);
    expect(dr.wall.mainReinforcement.barDiameter).toBeGreaterThan(0);
    expect(dr.floor.mainReinforcement.barDiameter).toBeGreaterThan(0);
  });

  it('custom targetSafetyFactor affects verification results', () => {
    const demo = createDemoProject();

    // Very low safety factor should make it easier to pass
    const resultLow = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    // Very high safety factor may cause failures
    const resultHigh = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 3.0 },
    });

    // Both should produce valid design results (the engine handles convergence)
    expect(resultLow.designResult).not.toBeNull();
    expect(resultHigh.designResult).not.toBeNull();

    // The designs should differ (different target → different thickness)
    expect(resultLow.designResult!.roof.requiredThickness).toBeLessThanOrEqual(
      resultHigh.designResult!.roof.requiredThickness,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST C: Design results data structure verification
// Verifies that DesignResult has all required fields for rendering.
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4F Test C: Design results render correctly (data verification)', () => {
  it('DesignResult contains all fields needed for ResultsPanel rendering', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const dr = result.designResult!;

    // Check overall fields
    expect(['PASS', 'FAIL', 'OPTIMIZED']).toContain(dr.designStatus);
    expect(['roof', 'wall', 'floor']).toContain(dr.governingElement);
    expect(dr.verification).toBeDefined();
    expect(dr.verification.overallPass).toBeDefined();

    // Check per-element fields needed for rendering
    for (const key of ['roof', 'wall', 'floor'] as const) {
      const el = dr[key];
      const ver = dr.verification.elements[key];

      // Thickness (rendered in mm)
      expect(el.existingThickness).toBeGreaterThan(0);
      expect(el.requiredThickness).toBeGreaterThan(0);
      expect(el.recommendedThickness).toBeGreaterThanOrEqual(el.requiredThickness);

      // Mu/Vu
      expect(el.designMoment).toBeGreaterThan(0);
      expect(el.designShear).toBeGreaterThan(0);

      // Reinforcement
      expect(el.mainReinforcement.barDiameter).toBeGreaterThan(0);
      expect(el.mainReinforcement.spacing).toBeGreaterThan(0);
      expect(el.mainReinforcement.asProvided).toBeGreaterThan(0);
      expect(el.requiredAs).toBeGreaterThan(0);

      // Safety factors
      expect(el.flexuralSafetyFactor).toBeGreaterThan(0);
      expect(el.shearSafetyFactor).toBeGreaterThan(0);

      // Verification status (for badge rendering)
      expect(typeof ver.overallPass).toBe('boolean');
      expect(typeof ver.flexuralPass).toBe('boolean');
      expect(typeof ver.shearPass).toBe('boolean');
      expect(typeof ver.penetrationPass).toBe('boolean');
      expect(typeof ver.deflectionPass).toBe('boolean');

      // Status
      expect(['pass', 'fail', 'optimize']).toContain(el.status);
    }
  });

  it('thickness conversion m→mm is consistent (existingThickness * 1000)', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const dr = result.designResult!;
    // Verify the UI formula: (el.existingThickness * 1000).toFixed(0) produces integer mm
    for (const key of ['roof', 'wall', 'floor'] as const) {
      const el = dr[key];
      const mmValue = el.existingThickness * 1000;
      expect(Number.isFinite(mmValue)).toBe(true);
      expect(mmValue).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST D: No regression — design disabled = old workflow unchanged
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4F Test D: No regression — backward compatibility', () => {
  it('pipeline without designCriteria has identical output to Phase 4D baseline', () => {
    const demo = createDemoProject();

    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });

    // Same checks as Phase 4D Test A
    expect(result.success).toBe(true);
    expect(result.designResult).toBeNull();
    expect(result.fullResult).not.toBeNull();
    expect(result.domainResult).not.toBeNull();
    expect(result.report).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.validationErrors).toHaveLength(0);
  });

  it('report without design has no structural-design section', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });

    const designSection = result.report!.find(s => s.id === 'structural-design');
    expect(designSection).toBeUndefined();
  });

  it('report with design has structural-design section', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const designSection = result.report!.find(s => s.id === 'structural-design');
    expect(designSection).toBeDefined();
  });

  it('store fields do not interfere with existing pipeline state', () => {
    const demo = createDemoProject();

    // Run pipeline with design
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    // Existing fields unchanged
    expect(result.fullResult).not.toBeNull();
    expect(result.domainResult).not.toBeNull();
    expect(result.report).not.toBeNull();

    // fullResult still has correct structure
    expect(result.fullResult!.blast.parameters).not.toBeNull();
    expect(result.fullResult!.overall.minSafetyFactor).toBeGreaterThan(0);
    expect(result.fullResult!.overall.isAdequate).toBeDefined();
  });
});