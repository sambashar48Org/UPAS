/**
 * Phase 4A Tests: Design Foundation
 *
 * Verifies the foundation layer for the structural design engine:
 * 1. REBAR_DATABASE exists with all required diameters
 * 2. steelGrade loads from materials.json via resolveMaterial()
 * 3. DEFAULT_DESIGN_CRITERIA matches Phase 4A specification
 * 4. DesignResult output types are usable (type compilation check)
 * 5. ACI_DESIGN_FACTORS has correct values
 *
 * No structural design calculations are performed here.
 * No moment, As, thickness, shear, deflection, or PASS/FAIL logic.
 */

import { describe, it, expect } from 'vitest';
import {
  REBAR_DATABASE,
  DEFAULT_DESIGN_CRITERIA,
  ACI_DESIGN_FACTORS,
  ACI_STRENGTH_REDUCTION_FACTORS,
} from '../../calculations/constants';

import type {
  DesignCriteria,
  RebarSelection,
  ElementDesignResult,
  DesignResult,
  DesignInput,
} from '../../calculations/design/types';

import type { MaterialInput } from '../../calculations/types';

// ═══════════════════════════════════════════════════════════════════════
// Test 1: REBAR_DATABASE exists and is an array
// ═══════════════════════════════════════════════════════════════════════
describe('Phase 4A — REBAR_DATABASE', () => {
  it('REBAR_DATABASE should exist and be a non-empty array', () => {
    expect(Array.isArray(REBAR_DATABASE)).toBe(true);
    expect(REBAR_DATABASE.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 2: All required diameters are present
// ═══════════════════════════════════════════════════════════════════════
describe('Phase 4A — Rebar diameters', () => {
  const requiredDiameters = [10, 12, 14, 16, 20, 25, 32, 40];

  it('should contain all 8 standard metric bar diameters', () => {
    const actualDiameters = REBAR_DATABASE.map(bar => bar.diameter);
    for (const d of requiredDiameters) {
      expect(actualDiameters).toContain(d);
    }
  });

  it('should have correct cross-sectional areas (mm²)', () => {
    const expected: Record<number, number> = {
      10: 78.5,
      12: 113.1,
      14: 153.9,
      16: 201.1,
      20: 314.2,
      25: 490.9,
      32: 804.2,
      40: 1256.6,
    };
    for (const bar of REBAR_DATABASE) {
      expect(bar.area).toBeCloseTo(expected[bar.diameter]!, 1);
    }
  });

  it('should be sorted by diameter ascending', () => {
    for (let i = 1; i < REBAR_DATABASE.length; i++) {
      expect(REBAR_DATABASE[i].diameter).toBeGreaterThan(REBAR_DATABASE[i - 1].diameter);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 3: steelGrade loads from materials.json
// ═══════════════════════════════════════════════════════════════════════
describe('Phase 4A — steelGrade from materials.json', () => {
  it('should load steelGrade from materials.json for concrete materials', async () => {
    // Dynamically import the JSON to verify it at runtime
    const materialsData = await import('../../data/materials.json');
    const concreteMaterials = materialsData.default.materials.filter(
      (m: any) => m.category === 'concrete',
    );

    // All concrete materials should have steelGrade = 420
    for (const mat of concreteMaterials) {
      expect(mat.steelGrade).toBe(420);
    }
  });

  it('MaterialInput type should accept optional steelGrade', () => {
    // Type-level check: this compiles = type is correct
    const mat: MaterialInput = {
      materialRef: 'rc_350',
      name: 'RC 350',
      category: 'concrete',
      compressiveStrength: 35,
      tensileStrength: 3.3,
      modulusOfElasticity: 28,
      density: 2400,
      poissonRatio: 0.2,
      yieldStrength: null,
      difCompressive: 1.19,
      difTensile: 1.0,
      steelGrade: 420,
    };
    expect(mat.steelGrade).toBe(420);
  });

  it('MaterialInput without steelGrade should also be valid (backward compat)', () => {
    const mat: MaterialInput = {
      materialRef: 'steel_s250',
      name: 'Steel S250',
      category: 'steel',
      compressiveStrength: 250,
      tensileStrength: 250,
      modulusOfElasticity: 200,
      density: 7850,
      poissonRatio: 0.3,
      yieldStrength: 250,
      difCompressive: 1.1,
      difTensile: 1.1,
    };
    expect(mat.steelGrade).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 4: DEFAULT_DESIGN_CRITERIA matches Phase 4A specification
// ═══════════════════════════════════════════════════════════════════════
describe('Phase 4A — DEFAULT_DESIGN_CRITERIA', () => {
  it('should have targetSafetyFactor = 1.5', () => {
    expect(DEFAULT_DESIGN_CRITERIA.targetSafetyFactor).toBe(1.5);
  });

  it('should have concreteCover = 0.05 m', () => {
    expect(DEFAULT_DESIGN_CRITERIA.concreteCover).toBe(0.050);
  });

  it('should have steelGrade = 420 MPa', () => {
    expect(DEFAULT_DESIGN_CRITERIA.steelGrade).toBe(420);
  });

  it('should have maxDeflectionRatio = 1/360', () => {
    expect(DEFAULT_DESIGN_CRITERIA.maxDeflectionRatio).toBeCloseTo(1 / 360, 6);
  });

  it('should have thicknessIncrement = 0.025 m', () => {
    expect(DEFAULT_DESIGN_CRITERIA.thicknessIncrement).toBe(0.025);
  });

  it('should have supportCondition = simply_supported', () => {
    expect(DEFAULT_DESIGN_CRITERIA.supportCondition).toBe('simply_supported');
  });

  it('should have maxSupportRotation = 8.0 degrees (plastic)', () => {
    expect(DEFAULT_DESIGN_CRITERIA.maxSupportRotation).toBe(8.0);
  });

  it('should have allowPlasticResponse = true', () => {
    expect(DEFAULT_DESIGN_CRITERIA.allowPlasticResponse).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 5: DesignResult output types are usable
// ═══════════════════════════════════════════════════════════════════════
describe('Phase 4A — DesignResult types compilation', () => {
  it('RebarSelection should be assignable', () => {
    const rebar: RebarSelection = {
      barDiameter: 16,
      barArea: 201.1,
      spacing: 150,
      asProvided: 1340.7,
      numberOfBars: 7,
    };
    expect(rebar.barDiameter).toBe(16);
    expect(rebar.asProvided).toBeCloseTo(1340.7, 1);
  });

  it('ElementDesignResult should be assignable with all fields', () => {
    const result: ElementDesignResult = {
      element: 'roof',
      existingThickness: 0.35,
      requiredThickness: 0.40,
      recommendedThickness: 0.425,
      designMoment: 125.5,
      requiredAs: 980,
      providedAs: 1072,
      mainReinforcement: {
        barDiameter: 16,
        barArea: 201.1,
        spacing: 150,
        asProvided: 1340.7,
        numberOfBars: 7,
      },
      distributionReinforcement: {
        barDiameter: 12,
        barArea: 113.1,
        spacing: 200,
        asProvided: 565.5,
        numberOfBars: 5,
      },
      designShear: 245.0,
      shearCapacity: 320.0,
      maxDeflection: 8.5,
      allowableDeflection: 16.7,
      flexuralSafetyFactor: 1.65,
      shearSafetyFactor: 1.31,
      status: 'pass',
      warnings: [],
    };
    expect(result.element).toBe('roof');
    expect(result.status).toBe('pass');
    expect(result.flexuralSafetyFactor).toBeGreaterThan(1.0);
  });

  it('DesignResult should be assignable with all elements', () => {
    const designResult: DesignResult = {
      roof: {
        element: 'roof',
        existingThickness: 0.35,
        requiredThickness: 0.40,
        recommendedThickness: 0.425,
        designMoment: 125.5,
        requiredAs: 980,
        providedAs: 1072,
        mainReinforcement: { barDiameter: 16, barArea: 201.1, spacing: 150, asProvided: 1340.7, numberOfBars: 7 },
        distributionReinforcement: { barDiameter: 12, barArea: 113.1, spacing: 200, asProvided: 565.5, numberOfBars: 5 },
        designShear: 245.0,
        shearCapacity: 320.0,
        maxDeflection: 8.5,
        allowableDeflection: 16.7,
        flexuralSafetyFactor: 1.65,
        shearSafetyFactor: 1.31,
        status: 'pass',
        warnings: [],
      },
      wall: {
        element: 'wall',
        existingThickness: 0.30,
        requiredThickness: 0.30,
        recommendedThickness: 0.30,
        designMoment: 80.0,
        requiredAs: 620,
        providedAs: 671,
        mainReinforcement: { barDiameter: 16, barArea: 201.1, spacing: 200, asProvided: 1005.5, numberOfBars: 5 },
        distributionReinforcement: { barDiameter: 12, barArea: 113.1, spacing: 200, asProvided: 565.5, numberOfBars: 5 },
        designShear: 180.0,
        shearCapacity: 280.0,
        maxDeflection: 5.2,
        allowableDeflection: 8.3,
        flexuralSafetyFactor: 1.85,
        shearSafetyFactor: 1.56,
        status: 'pass',
        warnings: [],
      },
      floor: {
        element: 'floor',
        existingThickness: 0.30,
        requiredThickness: 0.25,
        recommendedThickness: 0.30,
        designMoment: 60.0,
        requiredAs: 450,
        providedAs: 565,
        mainReinforcement: { barDiameter: 12, barArea: 113.1, spacing: 200, asProvided: 565.5, numberOfBars: 5 },
        distributionReinforcement: { barDiameter: 12, barArea: 113.1, spacing: 200, asProvided: 565.5, numberOfBars: 5 },
        designShear: 120.0,
        shearCapacity: 250.0,
        maxDeflection: 3.1,
        allowableDeflection: 16.7,
        flexuralSafetyFactor: 2.10,
        shearSafetyFactor: 2.08,
        status: 'pass',
        warnings: [],
      },
      designStatus: 'PASS',
      governingElement: 'roof',
      warnings: [],
      recommendations: [],
    };
    expect(designResult.designStatus).toBe('PASS');
    expect(designResult.governingElement).toBe('roof');
    expect(Object.keys(designResult)).toContain('roof');
    expect(Object.keys(designResult)).toContain('wall');
    expect(Object.keys(designResult)).toContain('floor');
  });

  it('DesignCriteria should accept partial_fixity support condition', () => {
    const criteria: DesignCriteria = {
      targetSafetyFactor: 1.5,
      allowPlasticResponse: true,
      supportCondition: 'partial_fixity',
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
    expect(criteria.supportCondition).toBe('partial_fixity');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 6: ACI_DESIGN_FACTORS
// ═══════════════════════════════════════════════════════════════════════
describe('Phase 4A — ACI_DESIGN_FACTORS', () => {
  it('should have flexure factor = 0.9', () => {
    expect(ACI_DESIGN_FACTORS.flexure).toBe(0.9);
  });

  it('should have shear factor = 0.75', () => {
    expect(ACI_DESIGN_FACTORS.shear).toBe(0.75);
  });

  it('should have compression factor = 0.65', () => {
    expect(ACI_DESIGN_FACTORS.compression).toBe(0.65);
  });
});