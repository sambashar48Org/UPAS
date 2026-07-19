/**
 * UPAS — Design Assumptions Registry
 * Phase 5B: Professional Engineering Review Package
 *
 * Central registry of ALL assumptions used in the structural design engine.
 * Instead of assumptions being scattered across code comments, they are
 * documented here with unique IDs, descriptions, rationale, and impact.
 *
 * PURPOSE:
 *   1. Enable reviewers to identify every assumption in the design.
 *   2. Support assumption tracking when comparing design revisions.
 *   3. Provide traceability for engineering audits.
 *
 * ARCHITECTURE RULE:
 *   This file is READ-ONLY reference data. No calculations performed.
 *   No imports from results/, structure/, soil/, or threat/.
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Assumption severity: how critical is this assumption? */
export type AssumptionImpact = 'critical' | 'significant' | 'moderate' | 'minor';

/** A single documented design assumption */
export interface DesignAssumption {
  /** Unique assumption identifier */
  id: string;

  /** Short descriptive name */
  name: string;

  /** Full description of the assumption */
  description: string;

  /** Why this assumption was made (engineering rationale) */
  rationale: string;

  /** Impact level if this assumption is incorrect */
  impact: AssumptionImpact;

  /** Category for grouping */
  category: AssumptionCategory;

  /** Where in the code this assumption is applied */
  location: string;

  /** Whether this assumption is frozen (part of the locked design model) */
  frozen: boolean;
}

export type AssumptionCategory =
  | 'boundary-conditions'
  | 'material-behavior'
  | 'dynamic-response'
  | 'geometric'
  | 'loading'
  | 'safety'
  | 'soil-interaction'
  | 'analysis-method';

// ═══════════════════════════════════════════════════════════════════════
// COMPLETE ASSUMPTIONS REGISTRY
// ═══════════════════════════════════════════════════════════════════════

export const DESIGN_ASSUMPTIONS: DesignAssumption[] = [
  // ─── Boundary Conditions ──────────────────────────────────────────
  {
    id: 'BC-001',
    name: 'Simply Supported Roof/Floor',
    description: 'Roof and floor slabs are modeled as simply supported beams (one-way action). No moment transfer at supports.',
    rationale: 'Underground box structures typically have roof/floor slabs supported by walls with limited rotational restraint. Simply supported is conservative for positive moment.',
    impact: 'significant',
    category: 'boundary-conditions',
    location: 'structural-design.ts: getPeakBlastPressure, calculateDesignMoment (C=8)',
    frozen: true,
  },
  {
    id: 'BC-002',
    name: 'Fixed-Fixed Walls',
    description: 'Walls are modeled as fixed-fixed beams (both ends restrained). This is the default wall support condition.',
    rationale: 'Underground walls are monolithically connected to roof and floor slabs, providing significant rotational restraint. Fixed-fixed gives lower design moment than simply supported.',
    impact: 'significant',
    category: 'boundary-conditions',
    location: 'structural-design.ts: calculateDesignMoment (C=12 for walls)',
    frozen: true,
  },
  {
    id: 'BC-003',
    name: 'One-Way Action (Unit Strip)',
    description: 'All elements are designed as one-way members using a 1-meter wide strip. Two-way action is not considered.',
    rationale: 'Simplifies design to beam analogy. Conservative for square or near-square panels where two-way action would reduce moments.',
    impact: 'significant',
    category: 'boundary-conditions',
    location: 'reinforcement-design.ts: b=1000mm throughout',
    frozen: true,
  },

  // ─── Material Behavior ────────────────────────────────────────────
  {
    id: 'MAT-001',
    name: 'Gross (Uncracked) Section Stiffness',
    description: 'Deflection is calculated using the gross moment of inertia Ig = h^3/12. No reduction for cracking.',
    rationale: 'Uncracked deflection provides a lower bound estimate. For blast design, cracked section stiffness would give larger deflections but is more complex to determine without iteration.',
    impact: 'moderate',
    category: 'material-behavior',
    location: 'structural-design.ts: calculateDeflection uses I = h^3/12',
    frozen: true,
  },
  {
    id: 'MAT-002',
    name: 'Linear Elastic Concrete (No Tension Stiffening)',
    description: 'Concrete contribution below cracking is ignored in reinforcement calculations. Only steel carries tension.',
    rationale: 'Standard ACI assumption. Concrete tensile strength is unreliable under dynamic loading.',
    impact: 'minor',
    category: 'material-behavior',
    location: 'reinforcement-design.ts: As calculation ignores ft',
    frozen: true,
  },
  {
    id: 'MAT-003',
    name: 'DIF Applied to Capacity Only',
    description: 'Dynamic Increase Factor (DIF) is applied to fy in capacity calculations (phiMn, phiVc) but NOT to demand (As required).',
    rationale: 'UFC 3-340-02 Sec. 5.14.3: DIF accounts for strain-rate enhancement of material strength. Demand is based on applied loads which are already dynamic.',
    impact: 'critical',
    category: 'material-behavior',
    location: 'structural-design.ts: designElement — DIF on fy in capacity, static fy in As demand',
    frozen: true,
  },
  {
    id: 'MAT-004',
    name: 'Normal-Weight Concrete (lambda = 1.0)',
    description: 'Shear capacity uses lambda = 1.0 for all concrete types. Lightweight concrete correction is not applied.',
    rationale: 'Underground protective structures use normal-weight concrete (rho ~ 2400 kg/m3). Lightweight concrete is uncommon in this application.',
    impact: 'minor',
    category: 'material-behavior',
    location: 'reinforcement-design.ts: calculateShearCapacity — lambda hardcoded to 1.0',
    frozen: true,
  },
  {
    id: 'MAT-005',
    name: 'Steel DIF Cap at 1.20',
    description: 'Steel DIF is capped at 1.20 regardless of calculated value.',
    rationale: 'UFC 3-340-02 Sec. 5.14.3 upper bound. Prevents unrealistic strength enhancement for very high-grade steel.',
    impact: 'moderate',
    category: 'material-behavior',
    location: 'constants.ts: calculateSteelDIF — Math.min(dif, 1.20)',
    frozen: true,
  },

  // ─── Dynamic Response ─────────────────────────────────────────────
  {
    id: 'DYN-001',
    name: 'Elastic SDOF Model (No Plastic Hinge)',
    description: 'Dynamic response uses elastic SDOF model with DLF from Biggs charts. Post-yield behavior (plastic hinges, ductility) is not modeled in the design moment calculation.',
    rationale: 'Design is based on equivalent static load (w = P x DLF). Plastic design would require SDOF time-history analysis with nonlinear resistance functions.',
    impact: 'significant',
    category: 'dynamic-response',
    location: 'structural-design.ts: calculateDynamicResponseFactor (piecewise linear DLF)',
    frozen: true,
  },
  {
    id: 'DYN-002',
    name: 'Empirical Natural Period Formula',
    description: 'Natural period uses T = C x L x (L/h)^2 derived from Euler-Bernoulli + Biggs KLM factors. Not a direct FE eigenvalue analysis.',
    rationale: 'Closed-form approximation adequate for preliminary design. C coefficients are calibrated from KLM factors and typical RC properties (E=25-30 GPa, rho=2400 kg/m3).',
    impact: 'significant',
    category: 'dynamic-response',
    location: 'structural-design.ts: estimateNaturalPeriod (C_SS=0.063, C_FF=0.031, C_PF=0.047)',
    frozen: true,
  },
  {
    id: 'DYN-003',
    name: 'Dual-Path Load Selection (max of pressure/impulse)',
    description: 'Equivalent dynamic load is max(w_pressure_path, w_impulse_path). The two paths are not combined.',
    rationale: 'UFC 3-340-02 SDOF methodology: pressure path governs in quasi-static regime (td/T >= 0.2), impulse path may govern in impulsive regime (td/T < 0.2). Using max avoids double-counting.',
    impact: 'critical',
    category: 'dynamic-response',
    location: 'structural-design.ts: calculateDesignLoad — w_blast = max(w1, w2)',
    frozen: true,
  },
  {
    id: 'DYN-004',
    name: 'Uniform Blast Pressure Distribution',
    description: 'Blast pressure is assumed uniformly distributed across each element face. Spatial pressure variation across the element surface is not modeled.',
    rationale: 'Standard SDOF approximation. Pressure variation is small for typical structure dimensions relative to standoff distance.',
    impact: 'moderate',
    category: 'dynamic-response',
    location: 'structural-design.ts: calculateDesignLoad — single P_peak value per element',
    frozen: true,
  },

  // ─── Geometric ────────────────────────────────────────────────────
  {
    id: 'GEO-001',
    name: 'Wall Height = Wall Span',
    description: 'Wall span for design is approximated as min(structure length, structure height). No explicit wall height input.',
    rationale: 'Design input adapter uses min(L, H) as a reasonable approximation for the critical wall span.',
    impact: 'moderate',
    category: 'geometric',
    location: 'design-input-adapter.ts: buildElementLoad',
    frozen: true,
  },
  {
    id: 'GEO-002',
    name: 'Flat Slab (No Arching Effect)',
    description: 'All slabs are modeled as flat elements. Arching or membrane action under large deflections is not considered.',
    rationale: 'Conservative assumption. Arching action would increase capacity but is difficult to quantify reliably.',
    impact: 'significant',
    category: 'geometric',
    location: 'structural-design.ts: beam theory throughout',
    frozen: true,
  },

  // ─── Loading ──────────────────────────────────────────────────────
  {
    id: 'LOAD-001',
    name: 'Wall Lateral Reduction Factor 0.70',
    description: 'Wall blast pressure is 70% of peak reflected pressure (Pr x 0.70).',
    rationale: 'TM 5-1300 Ch.5: lateral walls receive reduced pressure because blast wave arrives at an angle. The 0.70 factor accounts for oblique incidence.',
    impact: 'significant',
    category: 'loading',
    location: 'structural-design.ts: getPeakBlastPressure — WALL_BLAST_FACTOR = 0.70',
    frozen: true,
  },
  {
    id: 'LOAD-002',
    name: 'Static Loads NOT Multiplied by DLF',
    description: 'Static loads (self-weight, overburden, lateral pressure) are added directly to the blast design load without dynamic amplification.',
    rationale: 'UFC 3-340-02: static dead loads are already present and do not benefit from dynamic amplification. Only the blast component is amplified via DLF.',
    impact: 'critical',
    category: 'loading',
    location: 'structural-design.ts: calculateDesignLoad — w_total = w_blast + staticPressure',
    frozen: true,
  },
  {
    id: 'LOAD-003',
    name: 'No Live Load Consideration',
    description: 'No live load (equipment, personnel, stored materials) is included in the design load combination.',
    rationale: 'Protective structures under blast loading are typically unoccupied during the event. Blast design load dominates over any live load.',
    impact: 'minor',
    category: 'loading',
    location: 'design-input-adapter.ts: buildElementLoad — only selfWeight, overburden, lateral pressure',
    frozen: true,
  },

  // ─── Safety ───────────────────────────────────────────────────────
  {
    id: 'SAF-001',
    name: 'Target Safety Factor 1.5',
    description: 'Default target safety factor for flexure and shear verification is 1.5.',
    rationale: 'UFC 3-340-02: SF >= 1.5 for personnel protection. SF >= 1.2 for containment structures (equipment protection). User can override.',
    impact: 'critical',
    category: 'safety',
    location: 'constants.ts: DEFAULT_DESIGN_CRITERIA.targetSafetyFactor = 1.5',
    frozen: true,
  },
  {
    id: 'SAF-002',
    name: 'Penetration SF >= 1.0',
    description: 'Penetration verification requires SF >= 1.0 (thickness must exceed critical penetration thickness).',
    rationale: 'Penetration is a hard limit — either the projectile penetrates or it does not. A factor of 1.0 means the thickness equals the minimum to prevent perforation.',
    impact: 'critical',
    category: 'safety',
    location: 'design-verification.ts: verifyElementPenetration — sf >= 1.0',
    frozen: true,
  },
  {
    id: 'SAF-003',
    name: 'ACI Strength Reduction Factors',
    description: 'phi_flexure = 0.90, phi_shear = 0.75, phi_compression = 0.65.',
    rationale: 'ACI 318-19 Table 21.2.1 standard values. Applied to nominal capacities to obtain design capacities.',
    impact: 'critical',
    category: 'safety',
    location: 'constants.ts: ACI_DESIGN_FACTORS',
    frozen: true,
  },
  {
    id: 'SAF-004',
    name: 'Governing Mode = Lowest Margin',
    description: 'The governing failure mode is determined by the lowest normalized margin (actual/required) across all verification checks.',
    rationale: 'The mode closest to its limit is the most likely to govern the design. This is standard engineering practice for multi-criteria verification.',
    impact: 'moderate',
    category: 'safety',
    location: 'design-verification.ts: verifyElement — margins sort',
    frozen: true,
  },

  // ─── Soil Interaction ─────────────────────────────────────────────
  {
    id: 'SOIL-001',
    name: 'Rankine Active Earth Pressure',
    description: 'Lateral earth pressure on walls uses Rankine active theory (Ka). At-rest (Ko) is available but not the default.',
    rationale: 'Blast loading causes walls to deflect outward, activating the soil. Rankine active gives lower (more realistic) lateral pressure than at-rest for this condition.',
    impact: 'significant',
    category: 'soil-interaction',
    location: 'soil-pressure.ts: calculateActiveEarthPressureCoeff',
    frozen: true,
  },
  {
    id: 'SOIL-002',
    name: 'No Water Table Effect',
    description: 'Lateral pressure calculation does not include hydrostatic pressure from groundwater. Effective stress analysis assumes no pore water pressure.',
    rationale: 'Simplification for preliminary design. Water table effects can significantly increase lateral pressure and should be considered in detailed design.',
    impact: 'significant',
    category: 'soil-interaction',
    location: 'soil-pressure.ts: calculateLateralEarthPressure — no water table parameter',
    frozen: true,
  },
  {
    id: 'SOIL-003',
    name: 'Uniform Soil Properties',
    description: 'Single average soil unit weight and friction angle are used. Layered soil profile is not modeled in the design lateral pressure calculation.',
    rationale: 'Design engine uses averaged soil properties from the analysis. Detailed layer-by-layer analysis would require integration of pressure distribution.',
    impact: 'moderate',
    category: 'soil-interaction',
    location: 'design-input-adapter.ts: extractDesignSoil — averages from layers',
    frozen: true,
  },

  // ─── Analysis Method ──────────────────────────────────────────────
  {
    id: 'ANL-001',
    name: 'Iterative Thickness Search (+25mm)',
    description: 'Design searches for minimum adequate thickness by incrementing in 25mm steps from the existing thickness.',
    rationale: '25mm is the standard construction increment for concrete. Incremental search is simple and reliable for preliminary design. Max 100 iterations (up to 2.5m additional).',
    impact: 'moderate',
    category: 'analysis-method',
    location: 'structural-design.ts: designElement — iteration loop',
    frozen: true,
  },
  {
    id: 'ANL-002',
    name: 'Penetration Data from Analysis Phase',
    description: 'Penetration verification uses thickness values from the blast analysis phase. If the design increases thickness significantly, the actual penetration resistance may be more conservative than reported.',
    rationale: 'Avoids recalculating blast parameters for each design iteration. The penetration SF uses the analysis-phase values, which makes the design conservative.',
    impact: 'moderate',
    category: 'analysis-method',
    location: 'design-verification.ts: verifyElementPenetration — uses DesignPenetrationData from analysis',
    frozen: true,
  },
  {
    id: 'ANL-003',
    name: 'Minimum Bar Spacing 75mm',
    description: 'Reinforcement bar spacing is clamped to minimum 75mm.',
    rationale: 'Constructability requirement — space for concrete placement and compaction. Also ACI 318-19 minimum clear spacing requirements.',
    impact: 'minor',
    category: 'analysis-method',
    location: 'constants.ts: MIN_BAR_SPACING_MM = 75; reinforcement-design.ts: selectReinforcement',
    frozen: true,
  },
  {
    id: 'ANL-004',
    name: 'Maximum Bar Spacing 200mm (Blast)',
    description: 'Reinforcement bar spacing is clamped to maximum 200mm for blast design.',
    rationale: 'Blast design requires tighter spacing than normal construction to ensure ductile behavior and prevent local failures. ACI 318-19 min(3h, 450mm) is relaxed to 200mm for blast.',
    impact: 'moderate',
    category: 'analysis-method',
    location: 'constants.ts: MAX_BAR_SPACING_BLAST_MM = 200; reinforcement-design.ts: selectReinforcement',
    frozen: true,
  },
  {
    id: 'ANL-005',
    name: 'Distribution Reinforcement = 25% Main',
    description: 'Distribution (secondary) reinforcement is minimum 25% of main reinforcement area, or T10 area, whichever is larger.',
    rationale: 'ACI 318-19 requirement for shrinkage and temperature reinforcement in slabs. Ensures crack control in the transverse direction.',
    impact: 'minor',
    category: 'analysis-method',
    location: 'reinforcement-design.ts: selectDistributionReinforcement',
    frozen: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// QUERY HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** Get all assumptions in a specific category */
export function getAssumptionsByCategory(category: AssumptionCategory): DesignAssumption[] {
  return DESIGN_ASSUMPTIONS.filter(a => a.category === category);
}

/** Get assumptions by impact level */
export function getAssumptionsByImpact(impact: AssumptionImpact): DesignAssumption[] {
  return DESIGN_ASSUMPTIONS.filter(a => a.impact === impact);
}

/** Get a specific assumption by ID */
export function getAssumptionById(id: string): DesignAssumption | undefined {
  return DESIGN_ASSUMPTIONS.find(a => a.id === id);
}

/** Get all frozen assumptions */
export function getFrozenAssumptions(): DesignAssumption[] {
  return DESIGN_ASSUMPTIONS.filter(a => a.frozen);
}

/** Get assumption categories with counts */
export function getAssumptionCategories(): { category: AssumptionCategory; count: number }[] {
  const counts = new Map<AssumptionCategory, number>();
  for (const a of DESIGN_ASSUMPTIONS) {
    counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}