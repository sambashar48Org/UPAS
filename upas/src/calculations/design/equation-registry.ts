/**
 * UPAS — Equation Trace Registry
 * Phase 5B: Professional Engineering Review Package
 *
 * Complete registry of every equation used in the design engine.
 * Each entry provides a unique ID, the equation in mathematical notation,
 * the engineering standard reference, input/output units, and the
 * source function where the equation is implemented.
 *
 * PURPOSE:
 *   Any reviewer can trace every computed value back to its equation
 *   and standard. This enables audit-ready engineering documentation.
 *
 * ARCHITECTURE RULE:
 *   This file is READ-ONLY reference data. No calculations are performed.
 *   It never imports from results/, structure/, soil/, or threat/.
 *
 * Frozen: This registry documents existing frozen equations.
 * Any modification to the registry itself must match frozen equations.
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Equation category for filtering and grouping */
export type EquationCategory =
  | 'blast-loading'
  | 'sdof-dynamics'
  | 'structural-demand'
  | 'reinforcement-design'
  | 'capacity-verification'
  | 'earth-pressure'
  | 'soil-attenuation'
  | 'material-properties';

/** A single equation entry in the trace registry */
export interface EquationEntry {
  /** Unique equation identifier (e.g. "SDOF-001") */
  id: string;

  /** Short descriptive name */
  name: string;

  /** Mathematical notation of the equation */
  equation: string;

  /** Engineering standard or reference source */
  source: string;

  /** Specific section/table/figure in the reference */
  sourceDetail: string;

  /** Input variables with units (e.g. "P: kPa, td: ms, T: ms") */
  inputs: string;

  /** Output variable with unit (e.g. "DLF: dimensionless") */
  output: string;

  /** Category for grouping */
  category: EquationCategory;

  /** Source file where implemented (relative to src/) */
  file: string;

  /** Function name containing the implementation */
  function_: string;

  /** Whether this equation is frozen (must not be modified) */
  frozen: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPLETE EQUATION REGISTRY
// ═══════════════════════════════════════════════════════════════════════

export const EQUATION_REGISTRY: EquationEntry[] = [
  // ─── Blast Loading ─────────────────────────────────────────────────
  {
    id: 'BLAST-001',
    name: 'Peak Blast Pressure per Element',
    equation: 'P_peak = Pr (roof), 0.70 x Pr (wall), q (floor)',
    source: 'TM 5-1300 Ch.5; UFC 3-340-02 Ch.5',
    sourceDetail: 'Lateral reduction factor 0.70 for walls; dynamic pressure q for floor',
    inputs: 'Pr: kPa, q: kPa',
    output: 'P_peak: kPa',
    category: 'blast-loading',
    file: 'calculations/design/structural-design.ts',
    function_: 'getPeakBlastPressure',
    frozen: true,
  },
  {
    id: 'BLAST-002',
    name: 'Kingery-Bulmash Incident Pressure',
    equation: 'Log10(Pso) = A + B*log10(Z) + C*log10(Z)^2 + D*log10(Z)^3 + E*log10(Z)^4 + F*log10(Z)^5',
    source: 'TM 5-1300 / UFC 3-340-02 Ch.2',
    sourceDetail: '4 polynomial ranges for Z = 0.067 to 40 m/kg^(1/3)',
    inputs: 'Z: m/kg^(1/3) (scaled distance)',
    output: 'Pso: kPa',
    category: 'blast-loading',
    file: 'calculations/threat/',
    function_: 'calculateBlastParameters',
    frozen: true,
  },
  {
    id: 'BLAST-003',
    name: 'Normal Reflection Coefficient',
    equation: 'Cr = f(Pso): 2.0 (Pso<345kPa) to 8.0 (Pso>=6900kPa), linear interpolation',
    source: 'TM 5-1300 Table 2-7',
    sourceDetail: 'Piecewise linear: 2.0->3.0 for Pso<345, 3.0->8.0 for 345<=Pso<6900',
    inputs: 'Pso: kPa',
    output: 'Cr: dimensionless',
    category: 'blast-loading',
    file: 'calculations/constants.ts',
    function_: 'normalReflectionCoefficient',
    frozen: true,
  },
  {
    id: 'BLAST-004',
    name: 'Reflected Pressure',
    equation: 'Pr = Cr x Pso',
    source: 'TM 5-1300 Ch.2; UFC 3-340-02 Ch.2',
    sourceDetail: 'Normal incidence reflection',
    inputs: 'Cr: dimensionless, Pso: kPa',
    output: 'Pr: kPa',
    category: 'blast-loading',
    file: 'calculations/threat/',
    function_: 'calculateBlastParameters',
    frozen: true,
  },

  // ─── SDOF Dynamics ─────────────────────────────────────────────────
  {
    id: 'SDOF-001',
    name: 'Natural Period (Empirical)',
    equation: 'T = C x L x (L/h)^2  [ms]; C_SS=0.063, C_FF=0.031, C_PF=0.047',
    source: 'Euler-Bernoulli beam theory + Biggs (1964) Table 5-1 KLM factors',
    sourceDetail: 'C_SS derived from omega_1 = (pi/L)^2 * h * sqrt(E/12*rho), KLM=0.78; C_FF from KLM=0.64',
    inputs: 'L: m (span), h: m (thickness)',
    output: 'T: ms',
    category: 'sdof-dynamics',
    file: 'calculations/design/structural-design.ts',
    function_: 'estimateNaturalPeriod',
    frozen: true,
  },
  {
    id: 'SDOF-002',
    name: 'Load-Mass Factor KLM',
    equation: 'KLM = K_M / K_L; SS: 0.50/0.64 = 0.78, FF: 0.41/0.64 = 0.64, PF: 0.50/0.67 = 0.75',
    source: 'Biggs (1964) Table 5-1; UFC 3-340-02 Table 5-1; TM 5-1300 Table 5-1',
    sourceDetail: 'K_M = mass transformation factor, K_L = load transformation factor for uniform blast load',
    inputs: 'supportCondition: SS/FF/PF',
    output: 'KLM: dimensionless',
    category: 'sdof-dynamics',
    file: 'calculations/design/structural-design.ts',
    function_: 'getLoadMassFactor',
    frozen: true,
  },
  {
    id: 'SDOF-003',
    name: 'Dynamic Response Factor (DLF)',
    equation: 'DLF = f(td/T) — piecewise linear approximation of Biggs Fig. 4-8; 6 regimes from td/T<0.1 to >3.0',
    source: 'Biggs (1964) Fig. 4-8; UFC 3-340-02 Ch.5 Fig. 5-4; TM 5-1300 Ch.5',
    sourceDetail: 'Impulsive (<0.1): DLF=2*pi*td/T; Quasi-static (>3.0): DLF=1.0; Intermediate: linear interpolation',
    inputs: 'P_peak: kPa, I: kPa*ms, td: ms, T: ms',
    output: 'DLF: dimensionless',
    category: 'sdof-dynamics',
    file: 'calculations/design/structural-design.ts',
    function_: 'calculateDynamicResponseFactor',
    frozen: true,
  },

  // ─── Structural Demand ────────────────────────────────────────────
  {
    id: 'DEMAND-001',
    name: 'Equivalent Dynamic Load — Pressure Path',
    equation: 'w1 = P_peak x DLF(td/T)',
    source: 'Biggs (1964) Ch.4; UFC 3-340-02 Ch.5',
    sourceDetail: 'Pressure-controlled regime: when DLF from SDOF chart governs',
    inputs: 'P_peak: kPa, DLF: dimensionless',
    output: 'w1: kPa',
    category: 'structural-demand',
    file: 'calculations/design/structural-design.ts',
    function_: 'calculateDesignLoad',
    frozen: true,
  },
  {
    id: 'DEMAND-002',
    name: 'Equivalent Dynamic Load — Impulse Path',
    equation: 'w2 = 2*pi*I / (T x KLM)   [active only when td/T < 0.2]',
    source: 'Biggs (1964) Eq. 4-18',
    sourceDetail: 'Impulse-controlled regime for short-duration loads; derived from SDOF impulse-momentum',
    inputs: 'I: kPa*ms, T: ms, KLM: dimensionless',
    output: 'w2: kPa',
    category: 'structural-demand',
    file: 'calculations/design/structural-design.ts',
    function_: 'calculateDesignLoad',
    frozen: true,
  },
  {
    id: 'DEMAND-003',
    name: 'Blast Design Load (Dual-Path Maximum)',
    equation: 'w_blast = max(w1, w2)',
    source: 'UFC 3-340-02 Ch.5',
    sourceDetail: 'Ensures correct load selection without double-counting; matches UFC SDOF methodology',
    inputs: 'w1: kPa, w2: kPa',
    output: 'w_blast: kPa',
    category: 'structural-demand',
    file: 'calculations/design/structural-design.ts',
    function_: 'calculateDesignLoad',
    frozen: true,
  },
  {
    id: 'DEMAND-004',
    name: 'Total Design Load',
    equation: 'w_total = w_blast + staticPressure   [static NOT multiplied by DLF]',
    source: 'UFC 3-340-02 Ch.5',
    sourceDetail: 'Static loads (self-weight, overburden, lateral pressure) are added without dynamic amplification',
    inputs: 'w_blast: kPa, staticPressure: kPa',
    output: 'w_total: kPa',
    category: 'structural-demand',
    file: 'calculations/design/structural-design.ts',
    function_: 'calculateDesignLoad',
    frozen: true,
  },
  {
    id: 'DEMAND-005',
    name: 'Design Moment',
    equation: 'Mu = w x L^2 / C;  SS: C=8, FF: C=12, PF: C=10',
    source: 'Structural mechanics (beam theory)',
    sourceDetail: 'Simply supported: wL^2/8; Fixed-fixed: wL^2/12; Partial fixity: wL^2/10',
    inputs: 'w: kPa, L: m',
    output: 'Mu: kN*m/m',
    category: 'structural-demand',
    file: 'calculations/design/structural-design.ts',
    function_: 'calculateDesignMoment',
    frozen: true,
  },
  {
    id: 'DEMAND-006',
    name: 'Design Shear',
    equation: 'Vu = w x L / 2',
    source: 'Structural mechanics (beam theory)',
    sourceDetail: 'Maximum shear at support for uniformly loaded beam',
    inputs: 'w: kPa, L: m',
    output: 'Vu: kN/m',
    category: 'structural-demand',
    file: 'calculations/design/structural-design.ts',
    function_: 'calculateDesignShear',
    frozen: true,
  },
  {
    id: 'DEMAND-007',
    name: 'Serviceability Deflection (Gross Section)',
    equation: 'delta = C x w x L^4 / (E x I);  I = h^3/12 (b=1m);  SS: C=5/384, FF: C=1/384, PF: C=3/384',
    source: 'Euler-Bernoulli beam theory',
    sourceDetail: 'Gross moment of inertia (uncracked section); per-meter strip width',
    inputs: 'w: kPa, L: m, E: MPa, h: m',
    output: 'delta: mm',
    category: 'structural-demand',
    file: 'calculations/design/structural-design.ts',
    function_: 'calculateDeflection',
    frozen: true,
  },
  {
    id: 'DEMAND-008',
    name: 'Self-Weight Pressure',
    equation: 'sw = rho x h x g / 1000',
    source: 'Basic mechanics',
    sourceDetail: 'Concrete density x thickness x gravitational acceleration; divided by 1000 for kPa',
    inputs: 'rho: kg/m^3, h: m, g: m/s^2',
    output: 'sw: kPa',
    category: 'structural-demand',
    file: 'calculations/design/design-input-adapter.ts',
    function_: 'buildElementLoad',
    frozen: true,
  },

  // ─── Reinforcement Design ─────────────────────────────────────────
  {
    id: 'RC-001',
    name: 'Effective Depth',
    equation: 'd = (h - cover) x 1000 - db/2',
    source: 'ACI 318-19',
    sourceDetail: 'Distance from extreme compression fiber to centroid of tension reinforcement',
    inputs: 'h: m, cover: m, db: mm',
    output: 'd: mm',
    category: 'reinforcement-design',
    file: 'calculations/design/reinforcement-design.ts',
    function_: 'calculateEffectiveDepth',
    frozen: true,
  },
  {
    id: 'RC-002',
    name: 'Required Flexural Reinforcement (Quadratic)',
    equation: 'A = fy^2 / (1.7 x fc x b);  B = -fy x d;  C = Mu_Nmm / phi;  As = (-B - sqrt(B^2 - 4AC)) / (2A)',
    source: 'ACI 318-19',
    sourceDetail: 'Derived from Mu = phi x As x fy x (d - a/2) with a = As*fy/(0.85*fc*b). Smaller root = tension-controlled.',
    inputs: 'Mu: kN*m/m, d: mm, fc: MPa, fy: MPa, phi: dimensionless',
    output: 'As: mm^2/m',
    category: 'reinforcement-design',
    file: 'calculations/design/reinforcement-design.ts',
    function_: 'calculateRequiredAs',
    frozen: true,
  },
  {
    id: 'RC-003',
    name: 'Whitney Stress Block Depth',
    equation: 'a = As x fy / (0.85 x fc x b)',
    source: 'ACI 318-19 Ch.22 (Whitney equivalent stress block)',
    sourceDetail: 'Equivalent rectangular stress block depth for flexural capacity calculation',
    inputs: 'As: mm^2, fy: MPa, fc: MPa, b: mm (=1000)',
    output: 'a: mm',
    category: 'reinforcement-design',
    file: 'calculations/design/reinforcement-design.ts',
    function_: 'calculateFlexuralCapacity',
    frozen: true,
  },
  {
    id: 'RC-004',
    name: 'Nominal Flexural Capacity',
    equation: 'Mn = As x fy x (d - a/2);  phiMn = phi x Mn',
    source: 'ACI 318-19 Ch.22',
    sourceDetail: 'phi=0.90 for flexure (ACI 318-19 Table 21.2.1); fy may include DIF for blast',
    inputs: 'As: mm^2, fy: MPa, d: mm, a: mm, phi: dimensionless',
    output: 'phiMn: kN*m/m',
    category: 'reinforcement-design',
    file: 'calculations/design/reinforcement-design.ts',
    function_: 'calculateFlexuralCapacity',
    frozen: true,
  },
  {
    id: 'RC-005',
    name: 'Shear Capacity (ACI Simplified)',
    equation: 'Vc = 0.17 x lambda x sqrt(fc) x b x d;  phiVc = phi x Vc   [lambda=1.0 normal-weight]',
    source: 'ACI 318-19 Ch.22 (Simplified shear provision)',
    sourceDetail: 'phi=0.75 for shear (ACI 318-19 Table 21.2.1); lambda=1.0 for normal-weight concrete; fc may include DIF',
    inputs: 'fc: MPa, d: mm, phi: dimensionless, b: mm (=1000)',
    output: 'phiVc: kN/m',
    category: 'reinforcement-design',
    file: 'calculations/design/reinforcement-design.ts',
    function_: 'calculateShearCapacity',
    frozen: true,
  },
  {
    id: 'RC-006',
    name: 'Reinforcement Ratio',
    equation: 'rho = As / (b x d)',
    source: 'ACI 318-19',
    sourceDetail: 'Used for minimum/maximum reinforcement checks',
    inputs: 'As: mm^2, b: mm, d: mm',
    output: 'rho: dimensionless',
    category: 'reinforcement-design',
    file: 'calculations/design/reinforcement-design.ts',
    function_: 'calculateReinforcementRatio',
    frozen: true,
  },

  // ─── Capacity Verification ────────────────────────────────────────
  {
    id: 'VERIFY-001',
    name: 'Flexural Safety Factor',
    equation: 'SF_flexure = phiMn / Mu',
    source: 'UFC 3-340-02; ACI 318-19',
    sourceDetail: 'Ratio of flexural capacity to demand; must be >= targetSF',
    inputs: 'phiMn: kN*m/m, Mu: kN*m/m',
    output: 'SF: dimensionless',
    category: 'capacity-verification',
    file: 'calculations/design/design-verification.ts',
    function_: 'verifyElementFlexure',
    frozen: true,
  },
  {
    id: 'VERIFY-002',
    name: 'Shear Safety Factor',
    equation: 'SF_shear = phiVn / Vu',
    source: 'UFC 3-340-02; ACI 318-19',
    sourceDetail: 'Ratio of shear capacity to demand; must be >= targetSF',
    inputs: 'phiVn: kN/m, Vu: kN/m',
    output: 'SF: dimensionless',
    category: 'capacity-verification',
    file: 'calculations/design/design-verification.ts',
    function_: 'verifyElementShear',
    frozen: true,
  },
  {
    id: 'VERIFY-003',
    name: 'Penetration Safety Factor',
    equation: 'SF_penetration = h / max(h_perf, h_scab)',
    source: 'TM 5-855-1 Ch.6; NDRC equations',
    sourceDetail: 'h=actual thickness, h_perf=perforation thickness, h_scab=scabbing thickness; SF=Infinity when no threat',
    inputs: 'h: m, h_perf: m, h_scab: m',
    output: 'SF: dimensionless (>=1.0 required)',
    category: 'capacity-verification',
    file: 'calculations/design/design-verification.ts',
    function_: 'verifyElementPenetration',
    frozen: true,
  },
  {
    id: 'VERIFY-004',
    name: 'Deflection Check',
    equation: 'delta / L <= maxDeflectionRatio   [default: L/360]',
    source: 'ACI 318-19; serviceability requirements',
    sourceDetail: 'Gross section deflection ratio; maxDeflectionRatio default = 1/360',
    inputs: 'delta: mm, L: m',
    output: 'ratio: dimensionless (delta/L)',
    category: 'capacity-verification',
    file: 'calculations/design/design-verification.ts',
    function_: 'verifyElementDeflection',
    frozen: true,
  },

  // ─── Dynamic Increase Factors ─────────────────────────────────────
  {
    id: 'DIF-001',
    name: 'Steel Dynamic Increase Factor',
    equation: 'DIF_steel = 1.0 + (0.26 x fy / 414) <= 1.20',
    source: 'UFC 3-340-02 Sec. 5.14.3',
    sourceDetail: 'Applied to fy in capacity calculations (phiMn); NOT applied to As demand calculation',
    inputs: 'fy: MPa',
    output: 'DIF: dimensionless',
    category: 'material-properties',
    file: 'calculations/constants.ts',
    function_: 'calculateSteelDIF',
    frozen: true,
  },

  // ─── Earth Pressure ───────────────────────────────────────────────
  {
    id: 'SOIL-001',
    name: 'Rankine Active Earth Pressure Coefficient',
    equation: 'Ka = (1 - sin(phi)) / (1 + sin(phi))',
    source: 'Rankine earth pressure theory; Das "Principles of Geotechnical Engineering"',
    sourceDetail: 'Ka=1.0 for purely cohesive soil (phi=0)',
    inputs: 'phi: degrees (friction angle)',
    output: 'Ka: dimensionless',
    category: 'earth-pressure',
    file: 'calculations/design/soil-pressure.ts',
    function_: 'calculateActiveEarthPressureCoeff',
    frozen: true,
  },
  {
    id: 'SOIL-002',
    name: 'At-Rest Earth Pressure Coefficient (Jaky)',
    equation: 'Ko = 1 - sin(phi)',
    source: "Jaky's equation; UFC 3-340-02 Appendix B",
    sourceDetail: 'For walls with no lateral movement; Ko=1.0 for phi=0',
    inputs: 'phi: degrees (friction angle)',
    output: 'Ko: dimensionless',
    category: 'earth-pressure',
    file: 'calculations/design/soil-pressure.ts',
    function_: 'calculateAtRestEarthPressureCoeff',
    frozen: true,
  },
  {
    id: 'SOIL-003',
    name: 'Lateral Earth Pressure with Cohesion',
    equation: 'sigma_h = K x sigma_v - 2c x sqrt(K)   [clamped >= 0]',
    source: 'Rankine theory with cohesion; TM 5-855-1 Ch.4',
    sourceDetail: 'Cohesion term reduces lateral pressure; clamped to zero for tension crack zone',
    inputs: 'sigma_v: kPa, K: dimensionless, c: kPa',
    output: 'sigma_h: kPa',
    category: 'earth-pressure',
    file: 'calculations/design/soil-pressure.ts',
    function_: 'calculateLateralEarthPressure',
    frozen: true,
  },
  {
    id: 'SOIL-004',
    name: 'Average Wall Lateral Pressure',
    equation: 'sigma_h_avg = (sigma_h_top + sigma_h_bottom) / 2',
    source: 'Uniform pressure approximation for design',
    sourceDetail: 'Triangular distribution averaged for simplified beam design',
    inputs: 'sigma_h_top: kPa, sigma_h_bottom: kPa',
    output: 'sigma_h_avg: kPa',
    category: 'earth-pressure',
    file: 'calculations/design/soil-pressure.ts',
    function_: 'calculateAverageWallLateralPressure',
    frozen: true,
  },

  // ─── Soil Attenuation ─────────────────────────────────────────────
  {
    id: 'ATTEN-001',
    name: 'Soil Blast Attenuation Factor',
    equation: 'attenuation = 1 / (1 + d/R_ref)^n   [R_ref = 1.0m]',
    source: 'TM 5-855-1; Drake & Little (1983)',
    sourceDetail: 'n: cohesiveless=1.5, cohesive=1.3, rock=1.8 (SOIL_ATTENUATION_EXPONENTS)',
    inputs: 'd: m (burial depth), n: dimensionless',
    output: 'attenuation: dimensionless (0-1)',
    category: 'soil-attenuation',
    file: 'calculations/design/burial-optimization.ts',
    function_: 'computeSoilAttenuationFactor',
    frozen: true,
  },
  {
    id: 'ATTEN-002',
    name: 'Arriving Blast Pressure (Burial)',
    equation: 'P_arriving = P_free_air x attenuation x coupling',
    source: 'TM 5-855-1; Drake & Little (1983)',
    sourceDetail: 'coupling: surface=0.10, buried=0.30, aerial=0.05, internal=0.15',
    inputs: 'P_free_air: kPa, attenuation: dimensionless, coupling: dimensionless',
    output: 'P_arriving: kPa',
    category: 'soil-attenuation',
    file: 'calculations/design/burial-optimization.ts',
    function_: 'attenuateBlast (internal)',
    frozen: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// QUERY HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** Get all equations in a specific category */
export function getEquationsByCategory(category: EquationCategory): EquationEntry[] {
  return EQUATION_REGISTRY.filter(eq => eq.category === category);
}

/** Get a specific equation by ID */
export function getEquationById(id: string): EquationEntry | undefined {
  return EQUATION_REGISTRY.find(eq => eq.id === id);
}

/** Get all equations used in a specific source file */
export function getEquationsByFile(file: string): EquationEntry[] {
  return EQUATION_REGISTRY.filter(eq => eq.file.includes(file));
}

/** Get all frozen equations */
export function getFrozenEquations(): EquationEntry[] {
  return EQUATION_REGISTRY.filter(eq => eq.frozen);
}

/** Get equation categories with counts */
export function getEquationCategories(): { category: EquationCategory; count: number }[] {
  const counts = new Map<EquationCategory, number>();
  for (const eq of EQUATION_REGISTRY) {
    counts.set(eq.category, (counts.get(eq.category) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/** Get all equation IDs as a set (for quick lookup) */
export function getEquationIdSet(): Set<string> {
  return new Set(EQUATION_REGISTRY.map(eq => eq.id));
}