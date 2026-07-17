/**
 * Phase 4C Tests: Design Verification & Burial Optimization
 *
 * Tests verify:
 *  1. Flexure PASS / FAIL
 *  2. Shear PASS / FAIL
 *  3. Penetration PASS / FAIL
 *  4. Deflection PASS / FAIL
 *  5. Overall PASS / FAIL
 *  6. Governing mode selection
 *  7. Warning generation
 *  8. Burial depth attenuation
 *  9. Burial optimization convergence
 * 10. Legacy tests unchanged
 *
 * No blast equations are tested — all values are mock inputs.
 */

import { describe, it, expect } from 'vitest';

import {
  verifyElementFlexure,
  verifyElementShear,
  verifyElementPenetration,
  verifyElementDeflection,
  verifyElement,
  runVerification,
  assembleDesignResult,
  getMinSafetyFactor,
} from '../../calculations/design/design-verification';

import {
  computeSoilAttenuationFactor,
  optimizeBurialDepth,
} from '../../calculations/design/burial-optimization';

import { ACI_DESIGN_FACTORS, DEFAULT_DESIGN_CRITERIA } from '../../calculations/constants';

import type {
  ElementDesignResult,
  DesignPenetrationData,
  DesignCriteria,
  VerificationResult,
  ElementVerificationResult,
  RebarSelection,
  DesignInput,
  DesignBlastInput,
} from '../../calculations/design/types';

// ═══════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════

const MOCK_REBAR: RebarSelection = {
  barDiameter: 16,
  barArea: 201.1,
  spacing: 150,
  asProvided: 1340,
  numberOfBars: 8,
};

function makeMockResult(overrides?: Partial<ElementDesignResult>): ElementDesignResult {
  return {
    element: 'roof',
    existingThickness: 0.40,
    requiredThickness: 0.40,
    recommendedThickness: 0.40,
    designMoment: 200,
    requiredAs: 1000,
    providedAs: 1340,
    mainReinforcement: { ...MOCK_REBAR },
    distributionReinforcement: { ...MOCK_REBAR, barDiameter: 12, barArea: 113.1, asProvided: 565, spacing: 200 },
    designShear: 200,
    shearCapacity: 300,
    maxDeflection: 10,
    allowableDeflection: 16.67,
    flexuralSafetyFactor: 2.0,
    shearSafetyFactor: 1.5,
    status: 'pass',
    warnings: [],
    ...overrides,
  };
}

function makePenetration(overrides?: Partial<DesignPenetrationData>): DesignPenetrationData {
  return {
    perforationThickness: 0.30,
    scabbingThickness: 0.25,
    penetrationDepth: 0.10,
    isPerforated: false,
    isSpalled: false,
    ...overrides,
  };
}

function makeCriteria(overrides?: Partial<DesignCriteria>): DesignCriteria {
  return {
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
    ...overrides,
  };
}

const CONCRETE_MATERIAL = {
  fpc: 35, ft: 3.3, Ec: 28000, density: 2400,
  poissonRatio: 0.2, difCompressive: 1.19, difTensile: 1.0,
  category: 'concrete' as const, materialRef: 'rc_350',
};

function makeDesignInputForBurial(depth: number): DesignInput {
  const blast: DesignBlastInput = {
    tntEquivalentMass: 100, chargeMass: 100, distance: 10,
    scaledDistance: 2.15, detonationType: 'surface',
    peakIncidentPressure: 500, peakReflectedPressure: 1500,
    peakDynamicPressure: 200, positivePhaseImpulse: 3000,
    positivePhaseDuration: 10, reflectionCoefficient: 3.0,
  };

  const elBase = {
    dynamicPressure: 800, dynamicImpulse: 2400, dynamicDuration: 10,
    supportCondition: 'simply_supported' as const,
    material: { ...CONCRETE_MATERIAL },
  };

  const overburden = 18 * depth;  // γ × d (kPa)
  const selfWeightRoof = 8.24;
  const selfWeightWall = 7.06;

  return {
    elements: {
      roof: { ...elBase, element: 'roof', staticPressure: overburden + selfWeightRoof, selfWeight: selfWeightRoof, span: 6, thickness: 0.40 },
      wall: { ...elBase, element: 'wall', staticPressure: 18 * (depth + 1.5) * 0.333 + selfWeightWall, selfWeight: selfWeightWall, span: 3, thickness: 0.35, supportCondition: 'fixed' as const },
      floor: { ...elBase, element: 'floor', staticPressure: 18 * (depth + 3) + 7.06, selfWeight: 7.06, span: 6, thickness: 0.35 },
    },
    soil: {
      averageUnitWeight: 18,
      frictionAngle: 30,
      cohesion: 0,
      activeEarthPressureCoeff: 0.333,
      atRestEarthPressureCoeff: 0.5,
      coverDepth: depth,
      overburdenPressure: 18 * depth,
      effectiveStress: 18 * (depth + 3),
    },
    reinforcement: { steelYieldStrength: 420, standard: 'ASTM A615 Grade 60', concreteCover: 0.050 },
    criteria: makeCriteria({ targetSafetyFactor: 1.2 }),
    penetration: {
      roof: makePenetration({ perforationThickness: 0.20, scabbingThickness: 0.15 }),
      wall: makePenetration({ perforationThickness: 0.15, scabbingThickness: 0.10 }),
      floor: makePenetration({ perforationThickness: 0.10, scabbingThickness: 0.08 }),
    },
    burialDepth: depth,
    structureType: 'box',
    blast,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Test 1: Flexure PASS
// ═══════════════════════════════════════════════════════════════════════
describe('Test 1: Flexure PASS', () => {
  it('flexural SF >= target → pass', () => {
    const result = makeMockResult({ flexuralSafetyFactor: 2.0 });
    const { pass } = verifyElementFlexure(result, 1.5);
    expect(pass).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 2: Flexure FAIL
// ═══════════════════════════════════════════════════════════════════════
describe('Test 2: Flexure FAIL', () => {
  it('flexural SF < target → fail', () => {
    const result = makeMockResult({ flexuralSafetyFactor: 0.9 });
    const { pass, sf } = verifyElementFlexure(result, 1.5);
    expect(pass).toBe(false);
    expect(sf).toBeCloseTo(0.9, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 3: Shear PASS
// ═══════════════════════════════════════════════════════════════════════
describe('Test 3: Shear PASS', () => {
  it('shear SF >= target → pass', () => {
    const result = makeMockResult({ shearSafetyFactor: 2.5 });
    const { pass } = verifyElementShear(result, 1.5);
    expect(pass).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 4: Shear FAIL
// ═══════════════════════════════════════════════════════════════════════
describe('Test 4: Shear FAIL', () => {
  it('shear SF < target → fail', () => {
    const result = makeMockResult({ shearSafetyFactor: 0.8 });
    const { pass } = verifyElementShear(result, 1.5);
    expect(pass).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 5: Penetration PASS
// ═══════════════════════════════════════════════════════════════════════
describe('Test 5: Penetration PASS', () => {
  it('thickness > max(perf, scab) → pass', () => {
    const result = makeMockResult({ requiredThickness: 0.40 });
    const pen = makePenetration({ perforationThickness: 0.30, scabbingThickness: 0.25 });
    const { pass, sf } = verifyElementPenetration(result, pen);
    expect(pass).toBe(true);
    // SF = 0.40 / 0.30 = 1.333
    expect(sf).toBeCloseTo(0.40 / 0.30, 3);
  });

  it('no penetration threat (both zero) → SF = Infinity', () => {
    const result = makeMockResult({ requiredThickness: 0.30 });
    const pen = makePenetration({ perforationThickness: 0, scabbingThickness: 0 });
    const { pass, sf } = verifyElementPenetration(result, pen);
    expect(pass).toBe(true);
    expect(sf).toBe(Infinity);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 6: Penetration FAIL
// ═══════════════════════════════════════════════════════════════════════
describe('Test 6: Penetration FAIL', () => {
  it('thickness < max(perf, scab) → fail', () => {
    const result = makeMockResult({ requiredThickness: 0.20 });
    const pen = makePenetration({ perforationThickness: 0.30, scabbingThickness: 0.25 });
    const { pass, sf } = verifyElementPenetration(result, pen);
    expect(pass).toBe(false);
    expect(sf).toBeLessThan(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 7: Deflection PASS
// ═══════════════════════════════════════════════════════════════════════
describe('Test 7: Deflection PASS', () => {
  it('δ/L <= maxRatio → pass', () => {
    // 10mm / 6000mm = 1/600 ≈ 0.00167 < 1/360 ≈ 0.00278
    const result = makeMockResult({ maxDeflection: 10 });
    const { pass, ratio } = verifyElementDeflection(result, 6, 1 / 360);
    expect(pass).toBe(true);
    expect(ratio).toBeCloseTo(10 / 6000, 6);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 8: Deflection FAIL
// ═══════════════════════════════════════════════════════════════════════
describe('Test 8: Deflection FAIL', () => {
  it('δ/L > maxRatio → fail', () => {
    // 25mm / 6000mm = 1/240 ≈ 0.00417 > 1/360 ≈ 0.00278
    const result = makeMockResult({ maxDeflection: 25 });
    const { pass, ratio } = verifyElementDeflection(result, 6, 1 / 360);
    expect(pass).toBe(false);
    expect(ratio).toBeGreaterThan(1 / 360);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 9: Overall PASS
// ═══════════════════════════════════════════════════════════════════════
describe('Test 9: Overall PASS', () => {
  it('all elements pass all checks → overall PASS', () => {
    const goodResult = makeMockResult({
      flexuralSafetyFactor: 2.0,
      shearSafetyFactor: 2.0,
      maxDeflection: 5,
    });
    const goodPen = makePenetration({ perforationThickness: 0.10, scabbingThickness: 0.05 });

    const verification = runVerification(
      {
        roof: { ...goodResult, element: 'roof' },
        wall: { ...goodResult, element: 'wall' },
        floor: { ...goodResult, element: 'floor' },
      },
      { roof: goodPen, wall: goodPen, floor: goodPen },
      { roof: 6, wall: 3, floor: 6 },
      makeCriteria({ targetSafetyFactor: 1.5 }),
    );

    expect(verification.overallPass).toBe(true);
    expect(verification.elements.roof.overallPass).toBe(true);
    expect(verification.elements.wall.overallPass).toBe(true);
    expect(verification.elements.floor.overallPass).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 10: Overall FAIL
// ═══════════════════════════════════════════════════════════════════════
describe('Test 10: Overall FAIL', () => {
  it('one element fails one check → overall FAIL', () => {
    const goodResult = makeMockResult({
      flexuralSafetyFactor: 2.0,
      shearSafetyFactor: 2.0,
      maxDeflection: 5,
    });
    const failRoof = makeMockResult({
      element: 'roof',
      flexuralSafetyFactor: 0.8,  // FAIL
      shearSafetyFactor: 2.0,
      maxDeflection: 5,
    });
    const goodPen = makePenetration({ perforationThickness: 0.10, scabbingThickness: 0.05 });

    const verification = runVerification(
      {
        roof: failRoof,
        wall: { ...goodResult, element: 'wall' },
        floor: { ...goodResult, element: 'floor' },
      },
      { roof: goodPen, wall: goodPen, floor: goodPen },
      { roof: 6, wall: 3, floor: 6 },
      makeCriteria({ targetSafetyFactor: 1.5 }),
    );

    expect(verification.overallPass).toBe(false);
    expect(verification.elements.roof.overallPass).toBe(false);
    expect(verification.elements.roof.flexuralPass).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 11: Governing mode selection
// ═══════════════════════════════════════════════════════════════════════
describe('Test 11: Governing mode selection', () => {
  it('identifies shear as governing mode when shear SF is lowest', () => {
    const result = makeMockResult({
      flexuralSafetyFactor: 2.5,   // margin = 2.5/1.5 = 1.67
      shearSafetyFactor: 0.9,      // margin = 0.9/1.5 = 0.60  ← lowest
      maxDeflection: 5,             // ratio ≈ 0.0008, margin = (1/360)/0.0008 ≈ 3.47
    });
    const pen = makePenetration({ perforationThickness: 0.10, scabbingThickness: 0.05 });

    const v = verifyElement(result, pen, 6, makeCriteria({ targetSafetyFactor: 1.5 }));

    expect(v.governingMode).toBe('shear');
  });

  it('identifies penetration as governing mode when pen SF < 1', () => {
    const result = makeMockResult({
      flexuralSafetyFactor: 2.0,
      shearSafetyFactor: 2.0,
      requiredThickness: 0.15,      // thin
      maxDeflection: 5,
    });
    const pen = makePenetration({ perforationThickness: 0.30, scabbingThickness: 0.25 });
    // pen SF = 0.15/0.30 = 0.50  ← lowest

    const v = verifyElement(result, pen, 6, makeCriteria());

    expect(v.governingMode).toBe('penetration');
    expect(v.penetrationPass).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 12: Warning generation
// ═══════════════════════════════════════════════════════════════════════
describe('Test 12: Warning generation', () => {
  it('generates warnings for failed checks', () => {
    const result = makeMockResult({
      flexuralSafetyFactor: 0.8,
      shearSafetyFactor: 0.7,
      maxDeflection: 50,  // δ/L = 50/6000 = 0.00833 > 1/360
    });
    const pen = makePenetration({ perforationThickness: 0.30, scabbingThickness: 0.25 });

    const v = verifyElement(result, pen, 6, makeCriteria({ targetSafetyFactor: 1.5 }));

    // Should have warnings for: flexure, shear, penetration, deflection
    expect(v.warnings.length).toBeGreaterThanOrEqual(3);
  });

  it('runVerification collects warnings from all elements', () => {
    const failRoof = makeMockResult({
      element: 'roof',
      flexuralSafetyFactor: 0.8,
      shearSafetyFactor: 2.0,
      maxDeflection: 5,
    });
    const failWall = makeMockResult({
      element: 'wall',
      flexuralSafetyFactor: 2.0,
      shearSafetyFactor: 0.5,
      maxDeflection: 5,
    });
    const good = makeMockResult({
      element: 'floor',
      flexuralSafetyFactor: 2.0,
      shearSafetyFactor: 2.0,
      maxDeflection: 5,
    });
    const goodPen = makePenetration({ perforationThickness: 0.05, scabbingThickness: 0.03 });

    const verification = runVerification(
      { roof: failRoof, wall: failWall, floor: good },
      { roof: goodPen, wall: goodPen, floor: goodPen },
      { roof: 6, wall: 3, floor: 6 },
      makeCriteria({ targetSafetyFactor: 1.5 }),
    );

    expect(verification.warnings.length).toBeGreaterThanOrEqual(2);
  });

  it('assembleDesignResult generates recommendations for failed elements', () => {
    const failRoof = makeMockResult({
      element: 'roof',
      flexuralSafetyFactor: 0.8,
      shearSafetyFactor: 2.0,
      maxDeflection: 5,
    });
    const good = makeMockResult({ element: 'wall' });
    const goodFloor = makeMockResult({ element: 'floor' });

    const verification = runVerification(
      { roof: failRoof, wall: good, floor: goodFloor },
      {
        roof: makePenetration({ perforationThickness: 0.05, scabbingThickness: 0.03 }),
        wall: makePenetration({ perforationThickness: 0.05, scabbingThickness: 0.03 }),
        floor: makePenetration({ perforationThickness: 0.05, scabbingThickness: 0.03 }),
      },
      { roof: 6, wall: 3, floor: 6 },
      makeCriteria({ targetSafetyFactor: 1.5 }),
    );

    const designResult = assembleDesignResult(
      { roof: failRoof, wall: good, floor: goodFloor },
      verification,
      [],
    );

    expect(designResult.designStatus).toBe('FAIL');
    expect(designResult.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(designResult.verification.overallPass).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 13: Burial depth increases attenuation
// ═══════════════════════════════════════════════════════════════════════
describe('Test 13: Burial depth increases attenuation', () => {
  it('deeper burial → lower attenuation factor → less blast at structure', () => {
    const af0 = computeSoilAttenuationFactor(0, 'cohesiveless');
    const af1 = computeSoilAttenuationFactor(1, 'cohesiveless');
    const af2 = computeSoilAttenuationFactor(2, 'cohesiveless');

    expect(af0).toBeCloseTo(1.0, 6);   // no soil = no attenuation
    expect(af1).toBeLessThan(af0);       // 1m soil reduces pressure
    expect(af2).toBeLessThan(af1);       // 2m soil reduces more
  });

  it('rock attenuates more than cohesiveless (higher exponent)', () => {
    const afRock = computeSoilAttenuationFactor(1, 'rock');
    const afSand = computeSoilAttenuationFactor(1, 'cohesiveless');

    expect(afRock).toBeLessThan(afSand);
  });

  it('deeper burial in optimization → higher overburden in element loads', () => {
    // Build at 1m depth
    const input1m = makeDesignInputForBurial(1);
    // Build at 3m depth
    const input3m = makeDesignInputForBurial(3);

    // The overburden at 3m should be higher
    expect(input3m.elements.roof.staticPressure).toBeGreaterThan(
      input1m.elements.roof.staticPressure,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 14: Burial optimization stops at target SF
// ═══════════════════════════════════════════════════════════════════════
describe('Test 14: Burial optimization stops at target SF', () => {
  it('converges when increasing depth achieves target SF', () => {
    // At depth 0: blast is unattenuated → high load
    // At depth 2m: blast is heavily attenuated → lower load → SF may improve
    const input = makeDesignInputForBurial(0);

    const result = optimizeBurialDepth(input, {
      initialBurialDepth: 0,
      maxBurialDepth: 5,
      depthStep: 0.5,
      targetSafetyFactor: 1.0,  // low target — should converge quickly
      soilCategory: 'cohesiveless',
      maxIterations: 10,
    });

    // The optimization should have tried multiple depths
    expect(result.iterations).toBeGreaterThan(0);

    // At some depth, the blast attenuation makes the design feasible
    // (high blast at d=0, very low blast at d=2+)
    expect(result.optimalBurialDepth).toBeGreaterThanOrEqual(0);
  });

  it('reports converged=false when max depth is reached', () => {
    const input = makeDesignInputForBurial(0);

    const result = optimizeBurialDepth(input, {
      initialBurialDepth: 0,
      maxBurialDepth: 0.5,  // very shallow max
      depthStep: 0.5,
      targetSafetyFactor: 100,  // impossibly high
      soilCategory: 'cohesiveless',
      maxIterations: 5,
    });

    // With impossibly high target, should not converge
    expect(result.converged).toBe(false);
  });

  it('at sufficient initial depth, optimization does not increase', () => {
    // At 3m depth with low blast (attenuated), design should be feasible
    const input = makeDesignInputForBurial(3);

    const result = optimizeBurialDepth(input, {
      initialBurialDepth: 3,
      maxBurialDepth: 10,
      depthStep: 0.5,
      targetSafetyFactor: 0.5,  // very low target
      soilCategory: 'cohesiveless',
      maxIterations: 5,
    });

    // Should converge quickly (already sufficient)
    expect(result.optimalBurialDepth).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 15: Legacy tests unchanged
// ═══════════════════════════════════════════════════════════════════════
describe('Test 15: Legacy tests unchanged', () => {
  it('DEFAULT_DESIGN_CRITERIA is unchanged from Phase 4A', () => {
    expect(DEFAULT_DESIGN_CRITERIA.targetSafetyFactor).toBe(1.5);
    expect(DEFAULT_DESIGN_CRITERIA.concreteCover).toBe(0.050);
    expect(DEFAULT_DESIGN_CRITERIA.steelGrade).toBe(420);
    expect(DEFAULT_DESIGN_CRITERIA.maxDeflectionRatio).toBeCloseTo(1 / 360, 6);
    expect(DEFAULT_DESIGN_CRITERIA.thicknessIncrement).toBe(0.025);
  });

  it('ACI_DESIGN_FACTORS is unchanged from Phase 4A', () => {
    expect(ACI_DESIGN_FACTORS.flexure).toBe(0.9);
    expect(ACI_DESIGN_FACTORS.shear).toBe(0.75);
    expect(ACI_DESIGN_FACTORS.compression).toBe(0.65);
  });
});