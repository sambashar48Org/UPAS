# UPAS — Phase 4G Freeze Gate Registry

**Date**: 2026-07-20
**Phase**: 4G — Final Engineering Validation Gate
**Status**: FROZEN — No modifications permitted without separate engineering review.

---

## Frozen Modules

The following modules have been validated by Phase 4G (36 tests, 453 total, 0 regression)
and are hereby FROZEN. Any modification requires:
1. A separate Phase proposal with engineering justification
2. Impact analysis on all downstream consumers
3. New validation tests that cover the proposed change
4. Re-run of the full 453-test suite with 0 regression

### 1. Blast Equations
| File | Function/Export | Standard | Freeze Reason |
|------|----------------|----------|---------------|
| `src/calculations/blast/index.ts` | `calculateBlastParameters()` | TM 5-1300 / UFC 3-340-02 Ch.2 | Kingery-Bulmash polynomials |
| `src/calculations/blast/kingery-bulmash.ts` | All KB polynomial functions | TM 5-1300 | Direct polynomial coefficients |

### 2. SDOF Dynamic Response
| File | Function/Export | Standard | Freeze Reason |
|------|----------------|----------|---------------|
| `src/calculations/design/structural-design.ts` | `calculateDynamicResponseFactor()` | Biggs (1964) Fig. 4-8; UFC 3-340-02 Fig. 5-4 | DLF piecewise-linear chart |
| `src/calculations/design/structural-design.ts` | `estimateNaturalPeriod()` | Biggs (1964) Table 5-1 | C values from first principles |
| `src/calculations/design/structural-design.ts` | `getLoadMassFactor()` | Biggs Table 5-1 | KLM: SS=0.78, FF=0.64 |
| `src/calculations/design/structural-design.ts` | `calculateDesignLoad()` | UFC 3-340-02 Ch.5 | Dual-path dynamic blast |
| `src/calculations/design/structural-design.ts` | `getPeakBlastPressure()` | TM 5-1300 Ch.5 | Roof=Pr, Wall=Pr*0.70, Floor=q |

### 3. Dynamic Increase Factors (DIF)
| File | Function/Export | Standard | Freeze Reason |
|------|----------------|----------|---------------|
| `src/calculations/constants.ts` | `calculateSteelDIF()` | UFC 3-340-02 Sec 5.14.3 | 1.0 + (0.26*fy/414), cap 1.20 |
| `src/calculations/design/structural-design.ts` | DIF in `designElement()` | UFC 3-340-02 Sec 5.14.3 | DIF on capacity only |

### 4. Reinforcement Design
| File | Function/Export | Standard | Freeze Reason |
|------|----------------|----------|---------------|
| `src/calculations/design/reinforcement-design.ts` | `calculateRequiredAs()` | ACI 318-19 Ch.22 | Quadratic tension solution |
| `src/calculations/design/reinforcement-design.ts` | `calculateFlexuralCapacity()` | ACI 318-19 Ch.22 | phiMn formula |
| `src/calculations/design/reinforcement-design.ts` | `calculateShearCapacity()` | ACI 318-19 Ch.22 | phiVc = 0.17*sqrt(fc)*b*d |
| `src/calculations/design/reinforcement-design.ts` | `selectReinforcement()` | ACI 318-19 | Bar database selection |
| `src/calculations/design/reinforcement-design.ts` | `calculateEffectiveDepth()` | ACI 318-19 | d = h - cover - db/2 |

### 5. Penetration
| File | Function/Export | Standard | Freeze Reason |
|------|----------------|----------|---------------|
| `src/calculations/penetration/` | All NDRC functions | TM 5-855-1; UFC 3-340-02 Ch.5 | Frozen since Phase 4C |

### 6. Soil Models
| File | Function/Export | Standard | Freeze Reason |
|------|----------------|----------|---------------|
| `src/calculations/soil/` | Wave, attenuation, SSI | TM 5-855-1; UFC 3-340-02 Ch.4 | Frozen since Phase 3 |
| `src/calculations/design/soil-pressure.ts` | Lateral earth pressure | Rankine/Coulomb | Ka, Ko coefficients |

### 7. Coefficients
| Location | Constant | Value | Source |
|----------|----------|-------|--------|
| structural-design.ts | SS moment coeff | 8 | Mu = wL^2/8 |
| structural-design.ts | FF moment coeff | 12 | Mu = wL^2/12 |
| structural-design.ts | PF moment coeff | 10 | Mu = wL^2/10 |
| constants.ts | ACI phi flexure | 0.90 | ACI 318-19 T21.2.1 |
| constants.ts | ACI phi shear | 0.75 | ACI 318-19 T21.2.1 |

---

## Validation Evidence

| Suite | Tests | Status |
|-------|-------|--------|
| 4G-A: Data Path Integrity | 7 | PASS |
| 4G-B: Dynamic Blast Integrity | 7 | PASS |
| 4G-C: Unit Consistency | 6 | PASS |
| 4G-D: Benchmark Cases | 5 | PASS |
| 4G-E: Governing Mode Report | 5 | PASS |
| 4G-F: steelGrade Data Path | 4 | PASS |
| 4G-G: Regression Guard | 2 | PASS |
| **Phase 4G Total** | **36** | **PASS** |
| **Full Suite** | **453** | **0 regression** |

---

## Audit Notes (Non-Blocking)

1. `steelGrade` vs `reinforcementGrade.fy`: Engine uses `steelGrade` only. `reinforcementGrade.fy` in DesignInput.reinforcement is dead code. Not a bug — functional path is correct.

2. `maxDeflectionRatio`, `thicknessIncrement`, `maxThickness` not in UI — always use defaults.

3. Design results bypass ViewModel adapter (read directly from DesignResult) — acceptable.

---

## Unfreeze Procedure

1. Phase proposal with engineering justification
2. Impact analysis on downstream consumers
3. Validation tests for proposed change
4. Full 453-test suite — 0 regression
5. Explicit approval before merge