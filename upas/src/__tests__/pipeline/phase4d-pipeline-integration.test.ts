/**
 * Phase 4D — Design Engine Pipeline Integration Tests
 *
 * Verifies that runDesignCalculation() is correctly wired into
 * AnalysisPipeline.execute() as an optional post-analysis step.
 *
 * No new engineering calculations. No new equations. Wiring only.
 *
 * Test A: Pipeline without design criteria → designResult = null (backward compat)
 * Test B: Pipeline with design criteria → designResult exists with roof/wall/floor
 * Test C: Data trace — peakReflectedPressure reaches DesignInput.blast unmodified
 * Test D: Regression — existing pipeline tests unchanged
 */

import { describe, it, expect } from 'vitest';

import { executeAnalysis } from '../../services/analysis';
import { createDemoProject } from '../../data/demoProject';
import { runDesignCalculation } from '../../calculations/design';
import { buildDesignInput } from '../../calculations/design/design-input-adapter';
import type { DesignCriteria } from '../../calculations/design';

// ═══════════════════════════════════════════════════════════════════════
// TEST A: Pipeline without design criteria → designResult = null
// Backward compatibility: existing pipeline output unchanged.
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4D Test A: No design criteria → designResult = null', () => {
  it('pipeline without designCriteria produces null designResult', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      // No designCriteria — backward compatible
    });

    expect(result.success).toBe(true);
    expect(result.designResult).toBeNull();

    // Existing outputs unchanged
    expect(result.fullResult).not.toBeNull();
    expect(result.domainResult).not.toBeNull();
    expect(result.report).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.validationErrors).toHaveLength(0);
  });

  it('pipeline output structure has designResult field even when null', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });

    // The field must exist (TypeScript compile-time check) and be null
    expect('designResult' in result).toBe(true);
    expect(result.designResult).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST B: Pipeline with design criteria → designResult exists
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4D Test B: With design criteria → designResult exists', () => {
  it('pipeline with designCriteria produces non-null designResult', () => {
    const demo = createDemoProject();
    const designCriteria: Partial<DesignCriteria> = {
      targetSafetyFactor: 1.2,
    };

    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria,
    });

    expect(result.success).toBe(true);
    expect(result.designResult).not.toBeNull();

    // Existing analysis outputs still present
    expect(result.fullResult).not.toBeNull();
    expect(result.domainResult).not.toBeNull();
    expect(result.report).not.toBeNull();
  });

  it('designResult contains roof, wall, and floor element results', () => {
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

    // All three elements must have results
    expect(dr.roof).toBeDefined();
    expect(dr.wall).toBeDefined();
    expect(dr.floor).toBeDefined();

    // Each element must have structural design outputs
    for (const el of [dr.roof, dr.wall, dr.floor]) {
      expect(el.requiredThickness).toBeGreaterThan(0);
      expect(el.designMoment).toBeGreaterThan(0);
      expect(el.designShear).toBeGreaterThan(0);
      expect(el.flexuralSafetyFactor).toBeGreaterThan(0);
      expect(el.shearSafetyFactor).toBeGreaterThan(0);
      expect(el.mainReinforcement).toBeDefined();
      expect(el.mainReinforcement.barDiameter).toBeGreaterThan(0);
    }
  });

  it('designResult contains verification data', () => {
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

    // Verification must be present
    expect(dr.verification).toBeDefined();
    expect(dr.verification.overallPass).toBeDefined();
    expect(typeof dr.verification.overallPass).toBe('boolean');
    expect(['roof', 'wall', 'floor']).toContain(dr.verification.governingElement);
    expect(['flexure', 'shear', 'penetration', 'deflection', 'none']).toContain(dr.verification.governingMode);

    // Per-element verification
    for (const elKey of ['roof', 'wall', 'floor'] as const) {
      const v = dr.verification.elements[elKey];
      expect(v.flexuralSF).toBeGreaterThan(0);
      expect(v.shearSF).toBeGreaterThan(0);
      expect(v.penetrationSF).toBeGreaterThan(0);
    }
  });

  it('design status is one of the valid values', () => {
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
    expect(['PASS', 'FAIL', 'OPTIMIZED']).toContain(dr.designStatus);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST C: Data trace — peakReflectedPressure reaches DesignInput.blast
// Verifies no duplication: blast data flows from analysis → adapter → design
// without modification or recalculation.
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4D Test C: Data trace — blast data reaches design unmodified', () => {
  it('peakReflectedPressure in analysis output equals DesignInput.blast.peakReflectedPressure', () => {
    const demo = createDemoProject();

    // Run analysis only (no design)
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });

    const fullResult = result.fullResult!;
    const blastParams = fullResult.blast.parameters!;

    // Run the adapter manually to inspect DesignInput
    const adapterResult = buildDesignInput(fullResult, { targetSafetyFactor: 1.0 });
    const designInput = adapterResult.input;

    // Trace: peakReflectedPressure must flow unchanged
    expect(designInput.blast.peakReflectedPressure).toBe(blastParams.peakReflectedPressure);
    expect(designInput.blast.peakIncidentPressure).toBe(blastParams.peakIncidentPressure);
    expect(designInput.blast.peakDynamicPressure).toBe(blastParams.peakDynamicPressure);
    expect(designInput.blast.positivePhaseImpulse).toBe(blastParams.positivePhaseImpulse);
    expect(designInput.blast.positivePhaseDuration).toBe(blastParams.positivePhaseDuration);
    expect(designInput.blast.tntEquivalentMass).toBe(blastParams.tntEquivalentMass);
    expect(designInput.blast.distance).toBe(blastParams.distance);
    expect(designInput.blast.scaledDistance).toBe(blastParams.scaledDistance);
    expect(designInput.blast.reflectionCoefficient).toBe(blastParams.reflectionCoefficient);
  });

  it('design via pipeline produces same result as direct runDesignCalculation', () => {
    const demo = createDemoProject();
    const criteria: Partial<DesignCriteria> = { targetSafetyFactor: 1.0 };

    // Path 1: Through pipeline
    const pipelineResult = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: criteria,
    });

    // Path 2: Direct call
    const directResult = runDesignCalculation(pipelineResult.fullResult!, criteria);

    // Both must produce identical results (same adapter → same design)
    expect(pipelineResult.designResult!.roof.requiredThickness).toBe(directResult.roof.requiredThickness);
    expect(pipelineResult.designResult!.wall.requiredThickness).toBe(directResult.wall.requiredThickness);
    expect(pipelineResult.designResult!.floor.requiredThickness).toBe(directResult.floor.requiredThickness);

    expect(pipelineResult.designResult!.roof.designMoment).toBeCloseTo(directResult.roof.designMoment, 6);
    expect(pipelineResult.designResult!.roof.designShear).toBeCloseTo(directResult.roof.designShear, 6);
    expect(pipelineResult.designResult!.roof.flexuralSafetyFactor).toBeCloseTo(directResult.roof.flexuralSafetyFactor, 6);
  });
});