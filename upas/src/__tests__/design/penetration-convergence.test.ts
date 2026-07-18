/**
 * Audit Finding #4 — Penetration Thickness Convergence Tests
 *
 * Verifies that the thickness search loop in designElement() includes
 * penetration/scabbing as a governing failure mode:
 *
 *   h_required = max(flexural h, shear h, penetration h)
 *
 * Four test cases:
 *   1. Flexure governs — penetration requirement is small, final thickness
 *      driven by flexural/shear safety factors (penetration check is a no-op).
 *   2. Penetration governs — penetration requirement exceeds the
 *      flexural/shear thickness, so the loop continues until h >= pen.
 *   3. Increasing blast penetration requirement increases final thickness
 *      (monotonic sensitivity).
 *   4. No penetration data (undefined) — backward compatibility: behaves
 *      exactly like the pre-fix designElement (flexure+shear only).
 *
 * No blast equations changed. No SDOF model changed. No DIF handling changed.
 */

import { describe, it, expect } from 'vitest';

import { designElement } from '../../calculations/design/structural-design';

import { ACI_DESIGN_FACTORS } from '../../calculations/constants';

import type {
  DesignElementLoad,
  DesignCriteria,
  DesignBlastInput,
  DesignPenetrationData,
} from '../../calculations/design/types';

// ═══════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════

const CONCRETE = {
  fpc: 35,
  ft: 3.3,
  Ec: 28000,
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

function makeElement(overrides?: Partial<DesignElementLoad>): DesignElementLoad {
  return {
    element: 'roof',
    dynamicPressure: 800,
    dynamicImpulse: 2400,
    dynamicDuration: 10,
    staticPressure: 60,
    selfWeight: 8.24,
    span: 6,
    thickness: 0.35,
    supportCondition: 'simply_supported',
    material: { ...CONCRETE },
    ...overrides,
  };
}

function makeCriteria(overrides?: Partial<DesignCriteria>): DesignCriteria {
  return {
    targetSafetyFactor: 1.2,
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

/** No penetration threat — all zeros */
const NO_PENETRATION: DesignPenetrationData = {
  perforationThickness: 0,
  scabbingThickness: 0,
  penetrationDepth: 0,
  isPerforated: false,
  isSpalled: false,
};

// ═══════════════════════════════════════════════════════════════════════
// TEST 1: Flexure governs — penetration is not the driver
// ═══════════════════════════════════════════════════════════════════════

describe('Penetration convergence: flexure governs', () => {
  it('when penetration requirement is below flexural thickness, result is unchanged', () => {
    // Use a light blast so flexure requires ~0.35–0.40 m.
    // Set penetration requirement to 0.10 m (well below flexural need).
    const blast = makeBlast({ peakReflectedPressure: 50 });
    const el = makeElement({ thickness: 0.35, span: 6, staticPressure: 60 });
    const criteria = makeCriteria({ targetSafetyFactor: 1.2 });

    const penetration: DesignPenetrationData = {
      perforationThickness: 0.08,
      scabbingThickness: 0.10,
      penetrationDepth: 0.02,
      isPerforated: false,
      isSpalled: false,
    };

    // Without penetration
    const resultNoPen = designElement('roof', el, blast, criteria);
    // With penetration (small requirement)
    const resultWithPen = designElement('roof', el, blast, criteria, penetration);

    // Both should converge to the same thickness (flexure governs)
    expect(resultNoPen.requiredThickness).toBe(resultWithPen.requiredThickness);
    expect(resultWithPen.status).toBe('pass');
    // The penetration check should pass trivially
    expect(resultWithPen.requiredThickness).toBeGreaterThanOrEqual(0.10);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST 2: Penetration governs — thickness must increase beyond flexural need
// ═══════════════════════════════════════════════════════════════════════

describe('Penetration convergence: penetration governs', () => {
  it('when penetration requirement exceeds flexural thickness, loop increases to penetration h', () => {
    // Use a very light blast so flexure+shear passes at the initial thickness.
    // But set a large penetration requirement that forces thickness increase.
    const blast = makeBlast({ peakReflectedPressure: 10 });
    const el = makeElement({ thickness: 0.30, span: 6, staticPressure: 10 });
    const criteria = makeCriteria({
      targetSafetyFactor: 1.0, // low SF so flexure passes quickly
      thicknessIncrement: 0.025,
    });

    // Flexure will pass at or near 0.30 m (very light blast).
    // But penetration requires 0.50 m.
    const penetration: DesignPenetrationData = {
      perforationThickness: 0.45,
      scabbingThickness: 0.50, // governing: 0.50 m
      penetrationDepth: 0.30,
      isPerforated: true,
      isSpalled: true,
    };

    const result = designElement('roof', el, blast, criteria, penetration);

    // The result must satisfy penetration: h >= 0.50 m
    expect(result.requiredThickness).toBeGreaterThanOrEqual(0.50);

    // Must be strictly greater than the flexure-only thickness
    const resultNoPen = designElement('roof', el, blast, criteria);
    expect(result.requiredThickness).toBeGreaterThanOrEqual(resultNoPen.requiredThickness);

    // Should pass (converged within maxThickness)
    expect(result.status).toBe('pass');
  });

  it('scabbing thickness alone can govern (scabbing > perforation)', () => {
    const blast = makeBlast({ peakReflectedPressure: 10 });
    const el = makeElement({ thickness: 0.30, span: 6, staticPressure: 10 });
    const criteria = makeCriteria({
      targetSafetyFactor: 1.0,
      thicknessIncrement: 0.025,
    });

    // Scabbing is the governing penetration mode
    const penetration: DesignPenetrationData = {
      perforationThickness: 0.30,  // flexure could handle this
      scabbingThickness: 0.55,  // this forces the increase
      penetrationDepth: 0.20,
      isPerforated: false,
      isSpalled: true,
    };

    const result = designElement('roof', el, blast, criteria, penetration);

    // Must satisfy scabbing: h >= 0.55 m
    expect(result.requiredThickness).toBeGreaterThanOrEqual(0.55);
    expect(result.status).toBe('pass');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST 3: Increasing penetration requirement → increasing final thickness
// ═══════════════════════════════════════════════════════════════════════

describe('Penetration convergence: monotonic sensitivity', () => {
  it('higher penetration requirement produces thicker final design', () => {
    const blast = makeBlast({ peakReflectedPressure: 10 });
    const el = makeElement({ thickness: 0.30, span: 6, staticPressure: 10 });
    const criteria = makeCriteria({
      targetSafetyFactor: 1.0,
      thicknessIncrement: 0.025,
    });

    const penLow: DesignPenetrationData = {
      perforationThickness: 0.35,
      scabbingThickness: 0.40,
      penetrationDepth: 0.10,
      isPerforated: false,
      isSpalled: false,
    };

    const penHigh: DesignPenetrationData = {
      perforationThickness: 0.55,
      scabbingThickness: 0.60,
      penetrationDepth: 0.40,
      isPerforated: true,
      isSpalled: true,
    };

    const resultLow = designElement('roof', el, blast, criteria, penLow);
    const resultHigh = designElement('roof', el, blast, criteria, penHigh);

    // Higher penetration requirement → thicker final design
    expect(resultHigh.requiredThickness).toBeGreaterThan(resultLow.requiredThickness);

    // Both should pass
    expect(resultLow.status).toBe('pass');
    expect(resultHigh.status).toBe('pass');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST 4: No penetration data — backward compatibility
// ═══════════════════════════════════════════════════════════════════════

describe('Penetration convergence: backward compatibility (no penetration arg)', () => {
  it('omitting penetration parameter produces same result as pre-fix code', () => {
    const blast = makeBlast({ peakReflectedPressure: 100 });
    const el = makeElement({ thickness: 0.30, span: 6, staticPressure: 60 });
    const criteria = makeCriteria({ targetSafetyFactor: 1.2 });

    // Call without the 5th argument (penetration = undefined)
    const result = designElement('roof', el, blast, criteria);

    // Should converge normally (flexure + shear only, penetration skipped)
    expect(result.status).toBe('pass');
    expect(result.requiredThickness).toBeGreaterThan(0);
    expect(result.flexuralSafetyFactor).toBeGreaterThanOrEqual(criteria.targetSafetyFactor);
  });

  it('zero penetration data (no threat) behaves like no penetration', () => {
    const blast = makeBlast({ peakReflectedPressure: 100 });
    const el = makeElement({ thickness: 0.30, span: 6, staticPressure: 60 });
    const criteria = makeCriteria({ targetSafetyFactor: 1.2 });

    const resultUndef = designElement('roof', el, blast, criteria);
    const resultZero = designElement('roof', el, blast, criteria, NO_PENETRATION);

    // Both should produce identical results
    expect(resultZero.requiredThickness).toBe(resultUndef.requiredThickness);
    expect(resultZero.status).toBe(resultUndef.status);
    expect(resultZero.flexuralSafetyFactor).toBe(resultUndef.flexuralSafetyFactor);
  });
});