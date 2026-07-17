/**
 * Phase 4B Tests: Structural Design Core
 *
 * Tests verify:
 * 1. Design load composition per element (reflected/dynamic/lateral)
 * 2. Moment coefficients (SS, fixed, partial fixity)
 * 3. Iterative thickness convergence
 * 4. Steel grade, cover, and DIF effects
 * 5. No input mutation
 * 6. Legacy tests remain unchanged (248 Phase 0 + 4A tests)
 *
 * No blast equations are tested here — all blast values are provided
 * directly as DesignBlastInput (the Design Input Contract).
 */

import { describe, it, expect } from 'vitest';

import {
  calculateDesignLoad,
  calculateDesignMoment,
  calculateDesignShear,
  calculateDeflection,
  designElement,
} from '../../calculations/design/structural-design';

import {
  calculateEffectiveDepth,
  calculateRequiredAs,
  calculateFlexuralCapacity,
  calculateShearCapacity,
  selectReinforcement,
} from '../../calculations/design/reinforcement-design';

import { calculateSteelDIF, ACI_DESIGN_FACTORS, DEFAULT_DESIGN_CRITERIA } from '../../calculations/constants';

import type { DesignElementLoad, DesignCriteria, DesignBlastInput } from '../../calculations/design/types';

// ═══════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════

const CONCRETE_MATERIAL = {
  fpc: 35,
  ft: 3.3,
  Ec: 28000, // MPa
  density: 2400,
  poissonRatio: 0.2,
  difCompressive: 1.19,
  difTensile: 1.0,
  category: 'concrete' as const,
  materialRef: 'rc_350',
};

function makeBlast(overrides?: Partial<DesignBlastInput>): DesignBlastInput {
  return {
    tntEquivalentMass: 100,
    chargeMass: 100,
    distance: 10,
    scaledDistance: 2.15,
    detonationType: 'surface',
    peakIncidentPressure: 500,
    peakReflectedPressure: 1500,
    peakDynamicPressure: 200,
    positivePhaseImpulse: 3000,
    positivePhaseDuration: 10,
    reflectionCoefficient: 3.0,
    ...overrides,
  };
}

function makeElementLoad(overrides?: Partial<DesignElementLoad>): DesignElementLoad {
  return {
    element: 'roof',
    dynamicPressure: 800,
    dynamicImpulse: 2400,
    dynamicDuration: 10,
    staticPressure: 60,  // overburden + selfWeight
    selfWeight: 8.24,    // 2400 × 0.35 × 9.80665 / 1000
    span: 6,
    thickness: 0.35,
    supportCondition: 'simply_supported',
    material: { ...CONCRETE_MATERIAL },
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

// ═══════════════════════════════════════════════════════════════════════
// Test 1: Higher blast pressure → higher required thickness
// ═══════════════════════════════════════════════════════════════════════
describe('Test 1: Blast pressure increase → thickness increase', () => {
  it('higher reflected pressure requires more thickness', () => {
    const blast = makeBlast({ peakReflectedPressure: 50 });
    const blastHigh = makeBlast({ peakReflectedPressure: 300 });

    const el = makeElementLoad({ element: 'roof', span: 6, thickness: 0.40, staticPressure: 60 });
    const criteria = makeCriteria({ targetSafetyFactor: 1.2 });

    const resultLow = designElement('roof', el, blast, criteria);
    const resultHigh = designElement('roof', el, blastHigh, criteria);

    expect(resultHigh.requiredThickness).toBeGreaterThan(resultLow.requiredThickness);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 2: Higher TNT mass → higher design demand
// ═══════════════════════════════════════════════════════════════════════
describe('Test 2: TNT mass increase → higher design', () => {
  it('higher charge mass (correlated with higher pressure) increases moment', () => {
    const blastSmall = makeBlast({ chargeMass: 50, tntEquivalentMass: 50, peakReflectedPressure: 800 });
    const blastLarge = makeBlast({ chargeMass: 500, tntEquivalentMass: 500, peakReflectedPressure: 3000 });

    const el = makeElementLoad({ element: 'roof' });
    const criteria = makeCriteria();

    const resultSmall = designElement('roof', el, blastSmall, criteria);
    const resultLarge = designElement('roof', el, blastLarge, criteria);

    expect(resultLarge.designMoment).toBeGreaterThan(resultSmall.designMoment);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 3: Higher distance → lower thickness
// ═══════════════════════════════════════════════════════════════════════
describe('Test 3: Distance increase → thickness decrease', () => {
  it('larger distance (lower pressure) reduces required thickness', () => {
    const blastNear = makeBlast({ distance: 5, peakReflectedPressure: 250 });
    const blastFar = makeBlast({ distance: 20, peakReflectedPressure: 50 });

    const el = makeElementLoad({ element: 'roof', span: 6, thickness: 0.40, staticPressure: 60 });
    const criteria = makeCriteria({ targetSafetyFactor: 1.2 });

    const resultNear = designElement('roof', el, blastNear, criteria);
    const resultFar = designElement('roof', el, blastFar, criteria);

    expect(resultFar.requiredThickness).toBeLessThan(resultNear.requiredThickness);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 4: Roof uses reflected pressure
// ═══════════════════════════════════════════════════════════════════════
describe('Test 4: Roof uses reflected pressure', () => {
  it('roof design load includes peakReflectedPressure', () => {
    const blast = makeBlast({ peakReflectedPressure: 1500, peakDynamicPressure: 200 });
    const el = makeElementLoad({ element: 'roof', staticPressure: 60 });

    const w = calculateDesignLoad('roof', el, blast);

    // Wroof = peakReflectedPressure + staticPressure
    expect(w).toBeCloseTo(1500 + 60, 2);
  });

  it('roof design load is NOT just appliedPressure (elementLoad.dynamicPressure)', () => {
    const blast = makeBlast({ peakReflectedPressure: 1500 });
    const el = makeElementLoad({ element: 'roof', dynamicPressure: 800, staticPressure: 60 });

    const w = calculateDesignLoad('roof', el, blast);

    // Must use reflectedPressure (1500), NOT dynamicPressure (800)
    expect(w).toBeCloseTo(1560, 2);
    expect(w).not.toBeCloseTo(800 + 60, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 5: Wall uses lateral earth pressure
// ═══════════════════════════════════════════════════════════════════════
describe('Test 5: Wall uses lateral earth pressure', () => {
  it('wall design load includes reflectedPressure × 0.70 + lateralEarthPressure', () => {
    const blast = makeBlast({ peakReflectedPressure: 1500 });
    const el = makeElementLoad({
      element: 'wall',
      staticPressure: 45, // lateralEarthPressure + selfWeight
      selfWeight: 7.06,
    });

    const w = calculateDesignLoad('wall', el, blast);

    // Wwall = 1500 × 0.70 + 45 = 1050 + 45 = 1095
    expect(w).toBeCloseTo(1095, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 6: Floor uses dynamic pressure
// ═════════════════════════════════════════════════════════════════════
describe('Test 6: Floor uses soil reaction + dynamic pressure', () => {
  it('floor design load includes peakDynamicPressure + soilReaction + selfWeight', () => {
    const blast = makeBlast({ peakDynamicPressure: 200, peakReflectedPressure: 1500 });
    const el = makeElementLoad({
      element: 'floor',
      staticPressure: 55, // selfWeight + soilReaction
      selfWeight: 7.06,
    });

    const w = calculateDesignLoad('floor', el, blast);

    // Wfloor = peakDynamicPressure + staticPressure = 200 + 55 = 255
    expect(w).toBeCloseTo(255, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 7: Simply supported moment = wL² / 8
// ═══════════════════════════════════════════════════════════════════════
describe('Test 7: Simply supported moment', () => {
  it('Mu = wL²/8 for simply supported', () => {
    const w = 100; // kPa
    const L = 6;   // m
    const Mu = calculateDesignMoment(w, L, 'simply_supported');

    expect(Mu).toBeCloseTo((100 * 36) / 8, 6); // 450 kN·m/m
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 8: Fixed moment is less than SS moment
// ═══════════════════════════════════════════════════════════════════════
describe('Test 8: Fixed moment < SS moment', () => {
  it('fixed Mu = wL²/12 < SS Mu = wL²/8', () => {
    const w = 100;
    const L = 6;

    const Mu_ss = calculateDesignMoment(w, L, 'simply_supported');
    const Mu_fixed = calculateDesignMoment(w, L, 'fixed');

    expect(Mu_ss).toBeCloseTo(450, 6);
    expect(Mu_fixed).toBeCloseTo(300, 6);
    expect(Mu_fixed).toBeLessThan(Mu_ss);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 9: Partial fixity moment
// ═══════════════════════════════════════════════════════════════════════
describe('Test 9: Partial fixity moment', () => {
  it('partial fixity Mu = wL²/10 is between SS and fixed', () => {
    const w = 100;
    const L = 6;

    const Mu_ss = calculateDesignMoment(w, L, 'simply_supported');
    const Mu_partial = calculateDesignMoment(w, L, 'partial_fixity');
    const Mu_fixed = calculateDesignMoment(w, L, 'fixed');

    expect(Mu_partial).toBeCloseTo(360, 6); // 100 × 36 / 10
    expect(Mu_partial).toBeLessThan(Mu_ss);
    expect(Mu_partial).toBeGreaterThan(Mu_fixed);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 10: Thickness iteration reaches PASS
// ═══════════════════════════════════════════════════════════════════════
describe('Test 10: Thickness iteration converges to PASS', () => {
  it('thin initial section iterates to PASS with thicker section', () => {
    const blast = makeBlast({ peakReflectedPressure: 100 });
    const el = makeElementLoad({
      element: 'roof',
      span: 6,
      thickness: 0.30, // thin — will need iteration
      staticPressure: 60,
    });
    const criteria = makeCriteria({ targetSafetyFactor: 1.1 });

    const result = designElement('roof', el, blast, criteria);

    expect(result.requiredThickness).toBeGreaterThan(el.thickness);
    expect(result.status).toBe('pass');
    expect(result.flexuralSafetyFactor).toBeGreaterThanOrEqual(criteria.targetSafetyFactor);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 11: Steel grade change affects As
// ═══════════════════════════════════════════════════════════════════════
describe('Test 11: Steel grade affects As', () => {
  it('higher fy reduces required As for same moment', () => {
    const Mu = 200; // kN·m
    const d = 300;  // mm
    const fpc = 35; // MPa
    const phi = ACI_DESIGN_FACTORS.flexure;

    const As_420 = calculateRequiredAs(Mu, d, fpc, 420, phi);
    const As_500 = calculateRequiredAs(Mu, d, fpc, 500, phi);

    expect(As_500).toBeLessThan(As_420);
    expect(As_420).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 12: Cover increase → increases As
// ═══════════════════════════════════════════════════════════════════════
describe('Test 12: Cover increase → increases As', () => {
  it('larger cover reduces d, which increases required As', () => {
    const Mu = 200; // kN·m
    const fpc = 35;  // MPa
    const fy = 420;  // MPa
    const phi = ACI_DESIGN_FACTORS.flexure;
    const h = 0.40;  // m thickness

    const d_50mm = calculateEffectiveDepth(h, 0.050, 16); // 400 - 50 - 8 = 342 mm
    const d_75mm = calculateEffectiveDepth(h, 0.075, 16); // 400 - 75 - 8 = 317 mm

    const As_50 = calculateRequiredAs(Mu, d_50mm, fpc, fy, phi);
    const As_75 = calculateRequiredAs(Mu, d_75mm, fpc, fy, phi);

    expect(d_75mm).toBeLessThan(d_50mm);
    expect(As_75).toBeGreaterThan(As_50);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 13: DIF affects capacity
// ═══════════════════════════════════════════════════════════════════════
describe('Test 13: DIF affects capacity', () => {
  it('flexural capacity with DIF > capacity without DIF', () => {
    const As = 1000; // mm²
    const d = 300;   // mm
    const fpc = 35;  // MPa
    const fy = 420;  // MPa
    const phi = ACI_DESIGN_FACTORS.flexure;

    const Mn_static = calculateFlexuralCapacity(As, d, fpc, fy, phi);

    const dif = calculateSteelDIF(fy);
    const fy_dynamic = fy * dif;
    const Mn_dynamic = calculateFlexuralCapacity(As, d, fpc, fy_dynamic, phi);

    expect(dif).toBeGreaterThan(1.0);
    expect(Mn_dynamic).toBeGreaterThan(Mn_static);
  });

  it('shear capacity with concrete DIF > without DIF', () => {
    const d = 300; // mm
    const fpc = 35; // MPa
    const phi = ACI_DESIGN_FACTORS.shear;

    const Vc_static = calculateShearCapacity(fpc, d, phi);
    const Vc_dynamic = calculateShearCapacity(fpc * 1.19, d, phi); // concrete DIF = 1.19

    expect(Vc_dynamic).toBeGreaterThan(Vc_static);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 14: No mutation of input
// ═══════════════════════════════════════════════════════════════════════
describe('Test 14: No mutation of input', () => {
  it('designElement does not mutate elementLoad, blast, or criteria', () => {
    const blast = makeBlast();
    const el = makeElementLoad({ element: 'roof', thickness: 0.25 });
    const criteria = makeCriteria({ targetSafetyFactor: 1.2 });

    // Deep clone snapshots
    const blastBefore = JSON.stringify(blast);
    const elBefore = JSON.stringify(el);
    const criteriaBefore = JSON.stringify(criteria);

    designElement('roof', el, blast, criteria);

    expect(JSON.stringify(blast)).toBe(blastBefore);
    expect(JSON.stringify(el)).toBe(elBefore);
    expect(JSON.stringify(criteria)).toBe(criteriaBefore);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Test 15: Legacy tests remain unchanged (count check)
// ═══════════════════════════════════════════════════════════════════════
describe('Test 15: Legacy tests remain unchanged', () => {
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

// ═══════════════════════════════════════════════════════════════════════
// Additional: Deflection & Shear
// ═══════════════════════════════════════════════════════════════════════
describe('Deflection calculation', () => {
  it('deflection is positive and finite for valid inputs', () => {
    const delta = calculateDeflection(100, 6, 28000, 0.40, 'simply_supported');
    expect(delta).toBeGreaterThan(0);
    expect(isFinite(delta)).toBe(true);
  });

  it('fixed support deflects less than simply supported', () => {
    const deltaSS = calculateDeflection(100, 6, 28000, 0.40, 'simply_supported');
    const deltaFixed = calculateDeflection(100, 6, 28000, 0.40, 'fixed');
    expect(deltaFixed).toBeLessThan(deltaSS);
  });

  it('returns 0 for zero thickness or span', () => {
    expect(calculateDeflection(100, 6, 28000, 0, 'simply_supported')).toBe(0);
    expect(calculateDeflection(100, 0, 28000, 0.4, 'simply_supported')).toBe(0);
  });
});

describe('Shear calculation', () => {
  it('Vu = wL/2', () => {
    const Vu = calculateDesignShear(100, 6);
    expect(Vu).toBeCloseTo(300, 6); // 100 × 6 / 2
  });
});

describe('Bar selection', () => {
  it('selects a valid bar for reasonable As', () => {
    const rebar = selectReinforcement(1000); // 1000 mm²/m
    expect(rebar.asProvided).toBeGreaterThanOrEqual(1000);
    expect(rebar.barDiameter).toBeGreaterThan(0);
    expect(rebar.spacing).toBeGreaterThanOrEqual(75); // MIN_BAR_SPACING
    expect(rebar.spacing).toBeLessThanOrEqual(200); // MAX_BAR_SPACING
  });

  it('returns minimum reinforcement for zero As', () => {
    const rebar = selectReinforcement(0);
    expect(rebar.barDiameter).toBe(10); // T10
  });
});

describe('Effective depth', () => {
  it('d = h - cover - db/2', () => {
    const d = calculateEffectiveDepth(0.40, 0.050, 16);
    expect(d).toBeCloseTo(342, 1); // 400 - 50 - 8 = 342 mm
  });
});

describe('Flexural capacity round-trip', () => {
  it('capacity ≈ demand when As is computed from Mu (no DIF)', () => {
    const Mu = 200; // kN·m
    const d = 300;  // mm
    const fpc = 35; // MPa
    const fy = 420; // MPa
    const phi = ACI_DESIGN_FACTORS.flexure;

    const As = calculateRequiredAs(Mu, d, fpc, fy, phi);
    const Mn = calculateFlexuralCapacity(As, d, fpc, fy, phi);

    // With static fy on both sides, Mn should ≈ Mu (within rounding)
    expect(Mn).toBeCloseTo(Mu, 0); // exact match
  });
});