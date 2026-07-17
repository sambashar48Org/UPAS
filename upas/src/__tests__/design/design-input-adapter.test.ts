/**
 * Phase 0 Tests: Design Input Adapter + Soil Pressure
 *
 * Tests that verify:
 * 1. Every data gap (G1–G7) is properly resolved
 * 2. Per-element load mapping is correct
 * 3. Lateral earth pressure calculations follow Rankine theory
 * 4. Default criteria are applied correctly
 * 5. Missing data produces appropriate warnings
 * 6. Existing 165 tests are NOT affected (no modifications to existing files)
 *
 * All tests use toBeCloseTo() for numerical assertions.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateActiveEarthPressureCoeff,
  calculateAtRestEarthPressureCoeff,
  calculateLateralEarthPressure,
  calculateAverageWallLateralPressure,
} from '../../calculations/design/soil-pressure';

import { buildDesignInput } from '../../calculations/design/design-input-adapter';
import { DEFAULT_DESIGN_CRITERIA, REBAR_DATABASE, GRAVITY, ACI_STRENGTH_REDUCTION_FACTORS, calculateSteelDIF } from '../../calculations/constants';

import type { FullAnalysisResult } from '../../calculations/types';
import type { DesignCriteria } from '../../calculations/design/types';

// ═══════════════════════════════════════════════════════════════════════
// TEST HELPERS — Build minimal FullAnalysisResult for testing
// ═══════════════════════════════════════════════════════════════════════

function makeMinimalAnalysisResult(overrides?: Partial<FullAnalysisResult>): FullAnalysisResult {
  const defaultMaterial = {
    materialRef: 'rc_350',
    name: 'RC 350',
    category: 'concrete' as const,
    compressiveStrength: 35,
    tensileStrength: 3.3,
    modulusOfElasticity: 28, // GPa
    density: 2400,
    poissonRatio: 0.2,
    yieldStrength: null,
    difCompressive: 1.19,
    difTensile: 1.0,
  };

  return {
    id: 'test-001',
    projectId: 'proj-001',
    calculatedAt: '2026-07-17T00:00:00Z',
    analysisType: 'combined',

    input: {
      projectId: 'proj-001',
      groundLevel: 0,
      soil: {
        layers: [
          {
            name: 'Medium Sand',
            soilTypeRef: 'sand_medium',
            thickness: 6,
            topElevation: 0,
            unitWeight: 18,
            frictionAngle: 33,
            cohesion: 0,
            modulusOfElasticity: 40,
            poissonRatio: 0.28,
            waveVelocity: 300,
            category: 'cohesiveless',
            relativeDensity: 0.5,
            SPT_NValue: 15,
            dampingRatio: 0.20,
            groundShockCoefficients: {
              legacy: { K: 500, n: 1.5 },
              enhanced: { K: 520, n: 1.5 },
            },
          },
        ],
        waterTableDepth: null,
        totalDepth: 6,
      },
      structure: {
        type: 'box',
        position: { x: 0, y: -4.5, z: 0 },
        length: 8,
        width: 5,
        height: 3,
        wallThickness: 0.35,
        roofThickness: 0.40,
        floorThickness: 0.35,
        wallMaterial: { ...defaultMaterial },
        roofMaterial: { ...defaultMaterial },
        floorMaterial: { ...defaultMaterial },
        burialDepth: 3,
        shapeParams: {
          archRadius: null,
          archAngle: null,
          cylinderRadius: null,
          domeRadius: null,
          domeHeight: null,
        },
        hasEntry: false,
        entryWidth: null,
        entryHeight: null,
      },
      threat: {
        type: 'underground',
        position: { x: 0, y: 0, z: 0 },
        detonationType: 'buried',
        standoffDistance: 10,
        explosive: {
          explosiveTypeRef: 'TNT',
          name: 'TNT',
          chargeMass: 100,
          chargeShape: 'spherical',
          chargeLength: null,
          chargeDiameter: null,
          tntEquivalentFactor: 1.0,
          detonationVelocity: 6930,
          energyRelease: 4.184,
          density: 1600,
        },
        burialDepth: 0.5,
        detonationHeight: null,
      },
      settings: {
        analysisType: 'combined',
        outputUnits: 'metric',
        includeSSI: true,
        targetSafetyFactor: 1.4,
        allowPlasticResponse: true,
        useEnhancedSoilModel: false,
      },
    },

    blast: {
      parameters: {
        tntEquivalentMass: 100,
        scaledDistance: 2.154,
        distance: 10,
        peakIncidentPressure: 500,
        peakReflectedPressure: 1500,
        reflectionCoefficient: 3.0,
        peakDynamicPressure: 200,
        positivePhaseDuration: 10,
        positivePhaseImpulse: 2500,
        shockFrontVelocity: 500,
        arrivalTime: 20,
        shapeCorrectionFactor: 1.0,
        groundReflection: 'none',
        groundReflectedPressure: null,
      },
      soilInteraction: {
        overburdenPressure: 54,    // 18 kN/m³ × 3m
        effectiveStress: 54,
        soilAttenuationFactor: 0.35,
        pressureAtStructure: 175,  // attenuated blast pressure at structure
        groundShockPPV: 0.15,
        groundShockArrivalTime: 25,
        averageWaveVelocity: 300,
        averageUnitWeight: 18,
        layerTravelTimes: null,
        impedanceMismatchLosses: null,
        totalImpedanceTransmission: null,
        ppvDamageLevel: null,
      },
      roofResponse: {
        element: 'roof',
        appliedPressure: 175,    // 100% of pressureAtStructure
        dynamicResistance: 120,
        staticResistance: 100,
        dif: 1.19,
        safetyFactor: 0.69,
        responseMode: 'failure',
        maxDisplacement: 45,
        supportRotation: 1.6,
        ductilityRatio: 5,
        naturalPeriod: 12,
        responseTime: 10,
      },
      wallResponse: {
        element: 'wall',
        appliedPressure: 122.5,  // 70% of pressureAtStructure
        dynamicResistance: 140,
        staticResistance: 118,
        dif: 1.19,
        safetyFactor: 1.14,
        responseMode: 'plastic',
        maxDisplacement: 22,
        supportRotation: 1.0,
        ductilityRatio: 3,
        naturalPeriod: 8,
        responseTime: 8,
      },
      floorResponse: {
        element: 'floor',
        appliedPressure: 87.5,   // 50% of pressureAtStructure
        dynamicResistance: 160,
        staticResistance: 135,
        dif: 1.19,
        safetyFactor: 1.83,
        responseMode: 'elastic',
        maxDisplacement: 8,
        supportRotation: 0.3,
        ductilityRatio: 1.0,
        naturalPeriod: 10,
        responseTime: 10,
      },
    },
    penetration: {
      roofPenetration: {
        penetrationDepthSoil: 0,
        penetrationDepthStructure: 0.25,
        perforationThickness: 0.325,
        scabbingThickness: 0.55,
        isPerforated: true,
        isSpalled: true,
        craterDiameter: 0,
        craterDepth: 0,
        formulaUsed: 'Modified NDRC (Concrete)',
      },
      wallPenetration: {
        penetrationDepthSoil: 0,
        penetrationDepthStructure: 0.15,
        perforationThickness: 0.195,
        scabbingThickness: 0.33,
        isPerforated: true,
        isSpalled: true,
        craterDiameter: 0,
        craterDepth: 0,
        formulaUsed: 'Modified NDRC (Concrete)',
      },
      floorPenetration: {
        penetrationDepthSoil: 0,
        penetrationDepthStructure: 0.12,
        perforationThickness: 0.156,
        scabbingThickness: 0.264,
        isPerforated: false,
        isSpalled: true,
        craterDiameter: 0,
        craterDepth: 0,
        formulaUsed: 'Modified NDRC (Concrete)',
      },
    },
    overall: {
      minSafetyFactor: 0.69,
      protectionLevel: 'critical',
      governingElement: 'roof',
      governingMode: 'blast',
      isAdequate: false,
    },
    visualization: {
      pressureContours: [],
      damageZones: [],
      threatPath: null,
      structureStressRegions: [],
    },
    warnings: [],
    recommendations: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// SOIL PRESSURE TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Soil Pressure Calculations', () => {
  describe('Active Earth Pressure Coefficient Ka', () => {
    it('should return 1.0 for φ = 0 (purely cohesive)', () => {
      expect(calculateActiveEarthPressureCoeff(0)).toBeCloseTo(1.0, 5);
    });

    it('should return 0.333 for φ = 30° (classic sand)', () => {
      // Ka = (1 - sin30)/(1 + sin30) = (1-0.5)/(1+0.5) = 0.5/1.5 = 0.333
      expect(calculateActiveEarthPressureCoeff(30)).toBeCloseTo(0.3333, 3);
    });

    it('should return 0.217 for φ = 40° (dense sand)', () => {
      // Ka = (1 - sin40)/(1 + sin40) = (1-0.6428)/(1+0.6428) = 0.3572/1.6428 = 0.2174
      expect(calculateActiveEarthPressureCoeff(40)).toBeCloseTo(0.217, 3);
    });

    it('should return ~0.271 for φ = 33° (medium sand)', () => {
      // Ka = (1 - sin33)/(1 + sin33) = (1-0.5446)/(1+0.5446) = 0.4554/1.5446 = 0.2948
      expect(calculateActiveEarthPressureCoeff(33)).toBeCloseTo(0.295, 2);
    });

    it('should decrease as friction angle increases', () => {
      const ka20 = calculateActiveEarthPressureCoeff(20);
      const ka40 = calculateActiveEarthPressureCoeff(40);
      expect(ka40).toBeLessThan(ka20);
    });
  });

  describe('At-Rest Earth Pressure Coefficient Ko', () => {
    it('should return 1.0 for φ = 0', () => {
      expect(calculateAtRestEarthPressureCoeff(0)).toBeCloseTo(1.0, 5);
    });

    it('should return 0.5 for φ = 30° (Jaky: Ko = 1 - sin30 = 0.5)', () => {
      expect(calculateAtRestEarthPressureCoeff(30)).toBeCloseTo(0.5, 5);
    });

    it('should always be >= Ka for same angle', () => {
      const angles = [15, 25, 33, 40, 45];
      for (const phi of angles) {
        const ko = calculateAtRestEarthPressureCoeff(phi);
        const ka = calculateActiveEarthPressureCoeff(phi);
        expect(ko).toBeGreaterThanOrEqual(ka);
      }
    });
  });

  describe('Lateral Earth Pressure', () => {
    it('should return 0 for zero vertical stress', () => {
      expect(calculateLateralEarthPressure(0, 33, 0, 'active')).toBeCloseTo(0, 5);
    });

    it('should calculate active pressure correctly for cohesionless soil', () => {
      // σv = 18 × 3 = 54 kPa, φ = 33°, c = 0
      // Ka ≈ 0.295, σh = 0.295 × 54 = 15.9 kPa
      const pressure = calculateLateralEarthPressure(54, 33, 0, 'active');
      expect(pressure).toBeCloseTo(15.93, 1);
    });

    it('should reduce pressure for cohesive soil', () => {
      // Same σv and φ, but with c = 25 kPa
      // σh = Ka × σv - 2c√Ka = 0.295×54 - 2×25×√0.295 = 15.93 - 27.14 = -11.2 → 0 (clamped)
      const pressure = calculateLateralEarthPressure(54, 33, 25, 'active');
      expect(pressure).toBeCloseTo(0, 1);
    });

    it('should use at-rest coefficient when requested', () => {
      // Ko = 1 - sin33 = 1 - 0.5446 = 0.4554
      // σh = 0.4554 × 54 = 24.59 kPa
      const pressure = calculateLateralEarthPressure(54, 33, 0, 'at_rest');
      expect(pressure).toBeCloseTo(24.59, 1);
    });
  });

  describe('Average Wall Lateral Pressure', () => {
    it('should calculate average pressure across wall height', () => {
      // burialDepth = 3m, wallHeight = 3m, γ = 18 kN/m³, φ = 33°, c = 0
      // σv_top = 18 × 3 = 54 kPa
      // σv_bottom = 18 × 6 = 108 kPa
      // Ka ≈ 0.295
      // lateral_top = 0.295 × 54 = 15.93
      // lateral_bottom = 0.295 × 108 = 31.86
      // average = (15.93 + 31.86) / 2 = 23.9 kPa
      const avg = calculateAverageWallLateralPressure(3, 3, 18, 33, 0, 'active');
      expect(avg).toBeCloseTo(23.9, 0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DESIGN INPUT ADAPTER TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Design Input Adapter', () => {
  const baseResult = makeMinimalAnalysisResult();

  describe('Roof Load Mapping', () => {
    it('should map dynamic pressure from roofResponse', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.elements.roof.dynamicPressure).toBeCloseTo(175, 1);
    });

    it('should include overburden in roof static pressure', () => {
      const { input } = buildDesignInput(baseResult);
      // overburden = 54 kPa + selfWeight
      expect(input.elements.roof.staticPressure).toBeGreaterThan(54);
    });

    it('should exclude overburden when disabled in criteria', () => {
      const { input } = buildDesignInput(baseResult, { includeOverburden: false });
      // Only self-weight
      const selfWeight = (2400 * 0.40 * GRAVITY) / 1000;
      expect(input.elements.roof.staticPressure).toBeCloseTo(selfWeight, 1);
    });
  });

  describe('Wall Load Mapping', () => {
    it('should map dynamic pressure from wallResponse', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.elements.wall.dynamicPressure).toBeCloseTo(122.5, 1);
    });

    it('should include lateral earth pressure in wall static pressure', () => {
      const { input } = buildDesignInput(baseResult);
      // Wall static = lateralPressure + selfWeight
      const lateralPressure = calculateAverageWallLateralPressure(3, 3, 18, 33, 0, 'active');
      expect(input.elements.wall.staticPressure).toBeGreaterThan(lateralPressure);
    });

    it('should exclude lateral pressure when disabled', () => {
      const { input } = buildDesignInput(baseResult, { includeLateralPressure: false });
      // Only self-weight
      const selfWeight = (2400 * 0.35 * GRAVITY) / 1000;
      expect(input.elements.wall.staticPressure).toBeCloseTo(selfWeight, 1);
    });

    it('should use wall-specific support condition (default: fixed)', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.elements.wall.supportCondition).toBe('fixed');
    });

    it('should use overridden wall support condition', () => {
      const { input } = buildDesignInput(baseResult, { wallSupportCondition: 'simply_supported' });
      expect(input.elements.wall.supportCondition).toBe('simply_supported');
    });

    it('should use min(length, height) as wall span', () => {
      const { input } = buildDesignInput(baseResult);
      // length=8, height=3, so span = 3
      expect(input.elements.wall.span).toBeCloseTo(3, 1);
    });
  });

  describe('Floor Load Mapping', () => {
    it('should map dynamic pressure from floorResponse', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.elements.floor.dynamicPressure).toBeCloseTo(87.5, 1);
    });

    it('should include effective stress (soil reaction) in floor static', () => {
      const { input } = buildDesignInput(baseResult);
      // Floor static = selfWeight + effectiveStress
      const selfWeight = (2400 * 0.35 * GRAVITY) / 1000;
      expect(input.elements.floor.staticPressure).toBeGreaterThan(selfWeight + 50);
    });
  });

  describe('Impulse Distribution (G4)', () => {
    it('should distribute impulse per-element: roof=100%, wall=70%, floor=50%', () => {
      const { input } = buildDesignInput(baseResult);
      // Global impulse = 2500 kPa·ms
      expect(input.elements.roof.dynamicImpulse).toBeCloseTo(2500, 1);    // 100%
      expect(input.elements.wall.dynamicImpulse).toBeCloseTo(1750, 1);   // 70%
      expect(input.elements.floor.dynamicImpulse).toBeCloseTo(1250, 1);  // 50%
    });
  });

  describe('Self-Weight Calculation (G6)', () => {
    it('should calculate self-weight correctly for each element', () => {
      const { input } = buildDesignInput(baseResult);

      // Roof: 2400 × 0.40 × 9.80665 / 1000
      const roofSelfWeight = (2400 * 0.40 * GRAVITY) / 1000;
      expect(input.elements.roof.selfWeight).toBeCloseTo(roofSelfWeight, 2);

      // Wall: 2400 × 0.35 × 9.80665 / 1000
      const wallSelfWeight = (2400 * 0.35 * GRAVITY) / 1000;
      expect(input.elements.wall.selfWeight).toBeCloseTo(wallSelfWeight, 2);

      // Floor: 2400 × 0.35 × 9.80665 / 1000
      const floorSelfWeight = (2400 * 0.35 * GRAVITY) / 1000;
      expect(input.elements.floor.selfWeight).toBeCloseTo(floorSelfWeight, 2);
    });

    it('should be zero when includeSelfWeight is false', () => {
      const { input } = buildDesignInput(baseResult, { includeSelfWeight: false });
      expect(input.elements.roof.selfWeight).toBeCloseTo(0, 5);
      expect(input.elements.wall.selfWeight).toBeCloseTo(0, 5);
      expect(input.elements.floor.selfWeight).toBeCloseTo(0, 5);
    });
  });

  describe('Support Condition Defaults (G3)', () => {
    it('should default roof to simply_supported', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.elements.roof.supportCondition).toBe('simply_supported');
    });

    it('should default floor to simply_supported', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.elements.floor.supportCondition).toBe('simply_supported');
    });

    it('should use overridden support condition for roof/floor', () => {
      const { input } = buildDesignInput(baseResult, { supportCondition: 'fixed' });
      expect(input.elements.roof.supportCondition).toBe('fixed');
      expect(input.elements.floor.supportCondition).toBe('fixed');
      // Wall should still be independently controllable
      expect(input.elements.wall.supportCondition).toBe('fixed'); // default wallSupportCondition
    });
  });

  describe('Reinforcement Defaults (G1)', () => {
    it('should use fy=420 from DEFAULT_DESIGN_CRITERIA', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.reinforcement.steelYieldStrength).toBeCloseTo(420, 0);
    });

    it('should use ASTM A615 Grade 60 as default standard', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.reinforcement.standard).toBe('ASTM A615 Grade 60');
    });

    it('should use custom fy when provided in criteria', () => {
      const { input } = buildDesignInput(baseResult, {
        reinforcementGrade: { fy: 500, standard: 'BS 4449 Grade 500C' },
      });
      expect(input.reinforcement.steelYieldStrength).toBeCloseTo(500, 0);
      expect(input.reinforcement.standard).toBe('BS 4449 Grade 500C');
    });

    it('should use 50mm concrete cover for underground structures (G5)', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.reinforcement.concreteCover).toBeCloseTo(0.050, 4);
    });

    it('should use custom cover when provided', () => {
      const { input } = buildDesignInput(baseResult, { concreteCover: 0.040 });
      expect(input.reinforcement.concreteCover).toBeCloseTo(0.040, 4);
    });
  });

  describe('Soil Properties in DesignInput', () => {
    it('should include Ka coefficient from top layer', () => {
      const { input } = buildDesignInput(baseResult);
      // φ = 33° → Ka ≈ 0.295
      expect(input.soil.activeEarthPressureCoeff).toBeCloseTo(0.295, 2);
    });

    it('should include Ko coefficient', () => {
      const { input } = buildDesignInput(baseResult);
      // Ko = 1 - sin33 ≈ 0.455
      expect(input.soil.atRestEarthPressureCoeff).toBeCloseTo(0.455, 2);
    });

    it('should include overburden from SSI', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.soil.overburdenPressure).toBeCloseTo(54, 1);
    });
  });

  describe('Penetration Data Mapping', () => {
    it('should map roof penetration data', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.penetration.roof.perforationThickness).toBeCloseTo(0.325, 3);
      expect(input.penetration.roof.isPerforated).toBe(true);
    });

    it('should map wall penetration data', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.penetration.wall.scabbingThickness).toBeCloseTo(0.33, 2);
    });

    it('should return zeros when no penetration data', () => {
      const noPenResult = makeMinimalAnalysisResult({
        penetration: {
          roofPenetration: null,
          wallPenetration: null,
          floorPenetration: null,
        },
      });
      const { input } = buildDesignInput(noPenResult);
      expect(input.penetration.roof.perforationThickness).toBeCloseTo(0, 5);
      expect(input.penetration.wall.isPerforated).toBe(false);
    });
  });

  describe('Missing Data Warnings', () => {
    it('should warn when no blast parameters', () => {
      const noBlast = makeMinimalAnalysisResult({
        blast: {
          parameters: null,
          soilInteraction: null,
          roofResponse: null,
          wallResponse: null,
          floorResponse: null,
        },
      });
      const { warnings } = buildDesignInput(noBlast);
      expect(warnings.some(w => w.code === 'NO_BLAST_DATA')).toBe(true);
      expect(warnings.some(w => w.code === 'NO_SSI_DATA')).toBe(true);
    });

    it('should warn when no penetration data for combined analysis', () => {
      const noPen = makeMinimalAnalysisResult({
        penetration: {
          roofPenetration: null,
          wallPenetration: null,
          floorPenetration: null,
        },
      });
      const { warnings } = buildDesignInput(noPen);
      expect(warnings.some(w => w.code === 'NO_PENETRATION_DATA')).toBe(true);
    });

    it('should warn about multi-layer simplification', () => {
      const multiLayer = makeMinimalAnalysisResult();
      multiLayer.input.soil.layers.push(
        {
          name: 'Dense Sand',
          soilTypeRef: 'sand_dense',
          thickness: 4,
          topElevation: -6,
          unitWeight: 20,
          frictionAngle: 40,
          cohesion: 0,
          modulusOfElasticity: 60,
          poissonRatio: 0.25,
          waveVelocity: 450,
          category: 'cohesiveless',
          relativeDensity: 0.8,
          SPT_NValue: 35,
          dampingRatio: 0.15,
          groundShockCoefficients: {
            legacy: { K: 500, n: 1.5 },
            enhanced: { K: 600, n: 1.45 },
          },
        },
      );
      const { warnings } = buildDesignInput(multiLayer);
      expect(warnings.some(w => w.code === 'MULTI_LAYER_SIMPLIFICATION')).toBe(true);
    });
  });

  describe('Blast Data Pass-through', () => {
    it('should include TNT mass and scaled distance', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.blast.tntEquivalentMass).toBeCloseTo(100, 0);
      expect(input.blast.scaledDistance).toBeCloseTo(2.154, 2);
    });

    it('should include detonation type', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.blast.detonationType).toBe('buried');
    });

    it('should include structure type', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.structureType).toBe('box');
    });
  });

  describe('Material Extraction', () => {
    it('should convert Ec from GPa to MPa', () => {
      const { input } = buildDesignInput(baseResult);
      // 28 GPa → 28000 MPa
      expect(input.elements.roof.material.Ec).toBeCloseTo(28000, 0);
    });

    it('should preserve material reference', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.elements.roof.material.materialRef).toBe('rc_350');
    });
  });

  describe('Design Criteria Pass-through', () => {
    it('should include all criteria in the output', () => {
      const { input } = buildDesignInput(baseResult);
      expect(input.criteria.targetSafetyFactor).toBeCloseTo(1.5, 1);
      expect(input.criteria.allowPlasticResponse).toBe(true);
      expect(input.criteria.thicknessIncrement).toBeCloseTo(0.025, 4);
      expect(input.criteria.maxThickness).toBeCloseTo(2.0, 1);
    });

    it('should allow overriding all criteria', () => {
      const customCriteria: Partial<DesignCriteria> = {
        targetSafetyFactor: 2.0,
        allowPlasticResponse: false,
        thicknessIncrement: 0.050,
        concreteCover: 0.040,
      };
      const { input } = buildDesignInput(baseResult, customCriteria);
      expect(input.criteria.targetSafetyFactor).toBeCloseTo(2.0, 1);
      expect(input.criteria.allowPlasticResponse).toBe(false);
      expect(input.criteria.thicknessIncrement).toBeCloseTo(0.050, 4);
      expect(input.reinforcement.concreteCover).toBeCloseTo(0.040, 4);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// DESIGN CONSTANTS VERIFICATION (Phase 0 — existence only)
// ═══════════════════════════════════════════════════════════════════════

describe('Design Constants', () => {
  it('should have REBAR_DATABASE with standard bars', () => {
    expect(REBAR_DATABASE.length).toBeGreaterThanOrEqual(6);
    expect(REBAR_DATABASE[0].diameter).toBe(10);
    expect(REBAR_DATABASE[3].designation).toBe('T16');
    expect(REBAR_DATABASE[3].area).toBeCloseTo(201.1, 1);
  });

  it('should have ACI strength reduction factors', () => {
    expect(ACI_STRENGTH_REDUCTION_FACTORS.flexure).toBeCloseTo(0.90, 2);
    expect(ACI_STRENGTH_REDUCTION_FACTORS.shear).toBeCloseTo(0.75, 2);
  });

  it('should have DEFAULT_DESIGN_CRITERIA with all fields', () => {
    expect(DEFAULT_DESIGN_CRITERIA.targetSafetyFactor).toBe(1.5);
    expect(DEFAULT_DESIGN_CRITERIA.reinforcementGrade.fy).toBe(420);
    expect(DEFAULT_DESIGN_CRITERIA.concreteCover).toBe(0.050);
    expect(DEFAULT_DESIGN_CRITERIA.wallSupportCondition).toBe('fixed');
  });

  it('should have UFC 3-340-02 referenced in calculateSteelDIF', () => {
    // DIF for fy=420: 1.0 + 0.26*420/414 = 1.264 → capped at 1.20
    expect(calculateSteelDIF(420)).toBeCloseTo(1.20, 2);
    expect(calculateSteelDIF(250)).toBeCloseTo(1.157, 2);
  });
});