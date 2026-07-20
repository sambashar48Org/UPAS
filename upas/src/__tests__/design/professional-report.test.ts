/**
 * UPAS — Professional Report Tests
 * Phase 5C-2: Tests for professional-report.ts data generator
 *
 * Tests verify:
 *   - Report data structure integrity
 *   - All fields populated from frozen engine output
 *   - Design basis extracted from assumptions registry
 *   - Verification matrix correctly reflects PASS/FAIL
 *   - Equation/assumption counts from Phase 5B registries
 *   - No calculations performed (read-only)
 *
 * Architecture Rule: Tests call generateProfessionalReport() with frozen
 * engine outputs. No frozen functions are tested here.
 */

import { describe, it, expect } from 'vitest';
import { generateProfessionalReport } from '../../calculations/design/professional-report';
import type { DesignInput, DesignResult } from '../../calculations/design/types';
import type { FullAnalysisResult } from '../../calculations/types';
import { BENCHMARK_CASES } from '../../calculations/design/benchmarks';
import { runStructuralDesign } from '../../calculations/design/structural-design';
import { runVerification, assembleDesignResult } from '../../calculations/design/design-verification';

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** Run full design from DesignInput (same as populate-baselines.ts) */
function runDesignFromInput(input: DesignInput): DesignResult {
  const elementResults = runStructuralDesign(input);
  const verification = runVerification(
    elementResults,
    input.penetration,
    {
      roof: input.elements.roof.span,
      wall: input.elements.wall.span,
      floor: input.elements.floor.span,
    },
    input.criteria,
  );
  return assembleDesignResult(elementResults, verification, []);
}

/** Create a minimal FullAnalysisResult for testing */
function makeFakeAnalysisResult(): FullAnalysisResult {
  return {
    calculatedAt: '2026-07-20T12:00:00Z',
    overall: {
      protectionLevel: 'low',
      safetyFactor: 1.2,
      isAdequate: true,
      governingElement: 'roof',
      governingMode: 'flexure',
    },
    blast: {
      parameters: {
        tntEquivalentMass: 100,
        chargeMass: 100,
        distance: 10,
        scaledDistance: 2.154,
        peakIncidentPressure: 150,
        peakReflectedPressure: 450,
        peakDynamicPressure: 50,
        positivePhaseImpulse: 800,
        positivePhaseDuration: 20,
        reflectionCoefficient: 3.0,
      },
      soilInteraction: null,
      roofResponse: null,
      wallResponse: null,
      floorResponse: null,
    },
    penetration: {
      roofPenetration: null,
      wallPenetration: null,
      floorPenetration: null,
    },
    soil: {
      layers: [],
      averageProperties: {
        waveVelocity: 300,
        unitWeight: 18,
        attenuationFactor: 0.5,
      },
    },
    structure: {} as any,
    warnings: [],
  } as FullAnalysisResult;
}

// ═══════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════

describe('5C-2 — Professional Report Generator', () => {
  it('should generate report with all required fields', () => {
    const bm = BENCHMARK_CASES[0]!;
    const input = bm.input();
    const result = runDesignFromInput(input);
    const analysisResult = makeFakeAnalysisResult();

    const report = generateProfessionalReport(result, input, analysisResult, 'Test Project');

    // Cover fields
    expect(report.projectName).toBe('Test Project');
    expect(report.calculatedAt).toBeTruthy();
    expect(report.designMode).toBe('standard');
    expect(['PASS', 'FAIL', 'OPTIMIZED']).toContain(report.designStatus);
    expect(report.statusLabelAr).toBeTruthy();
    expect(report.statusColor).toBeTruthy();
    expect(['roof', 'wall', 'floor']).toContain(report.governingElement);
    expect(report.governingMode).toBeTruthy();

    // Design Basis
    expect(report.designBasis.length).toBeGreaterThanOrEqual(8);
    for (const row of report.designBasis) {
      expect(row.item).toBeTruthy();
      expect(row.itemEn).toBeTruthy();
      expect(row.value).toBeTruthy();
    }

    // Threat
    expect(report.threat.tntEquivalent).toBeGreaterThan(0);
    expect(report.threat.standoff).toBeGreaterThan(0);
    expect(report.threat.scaledDistance).toBeGreaterThan(0);

    // Blast
    expect(report.blast.incidentPressure).toBeGreaterThan(0);
    expect(report.blast.reflectedPressure).toBeGreaterThan(0);
    expect(report.blast.duration).toBeGreaterThan(0);
    expect(report.blast.impulse).toBeGreaterThan(0);

    // Elements
    for (const key of ['roof', 'wall', 'floor'] as const) {
      const el = report.elements[key];
      expect(el.label).toBeTruthy();
      expect(el.labelEn).toBeTruthy();
      expect(el.requiredThickness).toBeGreaterThan(0);
      expect(el.designMoment).toBeGreaterThanOrEqual(0);
      expect(el.designShear).toBeGreaterThanOrEqual(0);
      expect(el.barDiameter).toBeGreaterThan(0);
      expect(el.barSpacing).toBeGreaterThan(0);
    }
  });

  it('should produce correct verification matrix (4 checks × 3 elements)', () => {
    const bm = BENCHMARK_CASES[0]!;
    const input = bm.input();
    const result = runDesignFromInput(input);

    const report = generateProfessionalReport(result, input, makeFakeAnalysisResult(), 'Test');

    expect(report.verificationMatrix).toHaveLength(4);

    const checks = report.verificationMatrix.map((r) => r.checkEn);
    expect(checks).toContain('Flexure');
    expect(checks).toContain('Shear');
    expect(checks).toContain('Penetration');
    expect(checks).toContain('Deflection');

    // Each row has 3 element booleans
    for (const row of report.verificationMatrix) {
      expect(typeof row.roof).toBe('boolean');
      expect(typeof row.wall).toBe('boolean');
      expect(typeof row.floor).toBe('boolean');
    }
  });

  it('should match verification matrix with DesignResult', () => {
    const bm = BENCHMARK_CASES[0]!;
    const input = bm.input();
    const result = runDesignFromInput(input);

    const report = generateProfessionalReport(result, input, makeFakeAnalysisResult(), 'Test');

    // Check that matrix matches the actual verification result
    const flexureRow = report.verificationMatrix.find((r) => r.checkEn === 'Flexure')!;
    expect(flexureRow.roof).toBe(result.verification.elements.roof.flexuralPass);
    expect(flexureRow.wall).toBe(result.verification.elements.wall.flexuralPass);
    expect(flexureRow.floor).toBe(result.verification.elements.floor.flexuralPass);

    const shearRow = report.verificationMatrix.find((r) => r.checkEn === 'Shear')!;
    expect(shearRow.roof).toBe(result.verification.elements.roof.shearPass);
    expect(shearRow.wall).toBe(result.verification.elements.wall.shearPass);
    expect(shearRow.floor).toBe(result.verification.elements.floor.shearPass);
  });

  it('should include critical element detail', () => {
    const bm = BENCHMARK_CASES[0]!;
    const input = bm.input();
    const result = runDesignFromInput(input);

    const report = generateProfessionalReport(result, input, makeFakeAnalysisResult(), 'Test');

    expect(report.criticalElement.key).toBe(result.verification.governingElement);
    expect(report.criticalElement.governingMode).toBe('انحناء'); // Arabic label for flexure
    expect(report.criticalElement.flexuralSF).toBeGreaterThan(0);
    expect(report.criticalElement.shearSF).toBeGreaterThan(0);
    expect(report.criticalElement.label).toBeTruthy();
  });

  it('should include audit summary from Phase 5B registries', () => {
    const bm = BENCHMARK_CASES[0]!;
    const input = bm.input();
    const result = runDesignFromInput(input);

    const report = generateProfessionalReport(result, input, makeFakeAnalysisResult(), 'Test');

    // Equation registry (27 entries from Phase 5B)
    expect(report.equationCount).toBeGreaterThanOrEqual(25);
    expect(report.equationCategories.length).toBeGreaterThanOrEqual(3);

    // Assumption registry (25 entries from Phase 5B)
    expect(report.assumptionCount).toBeGreaterThanOrEqual(20);

    // Critical assumptions
    expect(report.criticalAssumptions.length).toBeGreaterThanOrEqual(1);
    for (const ca of report.criticalAssumptions) {
      expect(ca.id).toBeTruthy();
      expect(ca.description).toBeTruthy();
      expect(ca.descriptionEn).toBeTruthy(); // rationale field
    }
  });

  it('should include design status correctly', () => {
    const bm = BENCHMARK_CASES[0]!;
    const input = bm.input();
    const result = runDesignFromInput(input);

    const report = generateProfessionalReport(result, input, makeFakeAnalysisResult(), 'Test');

    expect(report.designStatus).toBe(result.designStatus);
    expect(report.governingElement).toBe(result.verification.governingElement);
    expect(report.governingMode).toBe('انحناء'); // Arabic label for flexure
  });

  it('should pass through warnings', () => {
    const bm = BENCHMARK_CASES[0]!;
    const input = bm.input();
    const result = runDesignFromInput(input);

    const report = generateProfessionalReport(result, input, makeFakeAnalysisResult(), 'Test');

    // Warnings should include both design warnings and verification warnings
    expect(Array.isArray(report.warnings)).toBe(true);
  });

  it('should work for all 5 benchmark cases', () => {
    for (const bm of BENCHMARK_CASES) {
      const input = bm.input();
      const result = runDesignFromInput(input);

      const report = generateProfessionalReport(result, input, makeFakeAnalysisResult(), bm.name);

      expect(report.projectName).toBe(bm.name);
      expect(report.verificationMatrix).toHaveLength(4);
      expect(report.elements.roof.requiredThickness).toBeGreaterThan(0);
      expect(report.elements.wall.requiredThickness).toBeGreaterThan(0);
      expect(report.elements.floor.requiredThickness).toBeGreaterThan(0);
    }
  });

  it('should have consistent element data with DesignResult', () => {
    const bm = BENCHMARK_CASES[0]!;
    const input = bm.input();
    const result = runDesignFromInput(input);

    const report = generateProfessionalReport(result, input, makeFakeAnalysisResult(), 'Test');

    // Roof data should match exactly
    expect(report.elements.roof.designMoment).toBeCloseTo(result.roof.designMoment, 2);
    expect(report.elements.roof.designShear).toBeCloseTo(result.roof.designShear, 2);
    expect(report.elements.roof.requiredAs).toBeCloseTo(result.roof.requiredAs, 1);
    expect(report.elements.roof.flexuralSF).toBeCloseTo(result.roof.flexuralSafetyFactor, 3);
    expect(report.elements.roof.shearSF).toBeCloseTo(result.roof.shearSafetyFactor, 3);
    expect(report.elements.roof.barDiameter).toBe(result.roof.mainReinforcement.barDiameter);
    expect(report.elements.roof.barSpacing).toBe(result.roof.mainReinforcement.spacing);
  });
});