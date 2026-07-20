# UPAS — Phase 5C Design Review Gate

**Date**: 2026-07-20
**Phase**: 5C — Design Review Gate (Pre-Enhancement Assessment)
**Status**: GATE OPEN — No code modifications until gate closes.
**Prerequisite**: Phase 5B CLOSED (505 tests, 0 regression, Freeze Gate active)

---

## Purpose

This gate reviews the engineering readiness for adding optional advanced capabilities
to the UPAS design engine. It establishes:

1. **Formal confirmation** of the 3-layer model freeze
2. **Candidate feature identification** with risk assessment
3. **Architectural decision** for how new capabilities coexist with the frozen engine
4. **Priority ranking** and execution order

**Critical Rule**: No frozen equation, model, or function may be modified.
All Phase 5C work must be ADDITIVE only.

---

## 5C-1 — Three-Layer Model Freeze Confirmation

### Layer 1: Blast Demand Model ✅ FROZEN

This layer covers the path from blast threat to structural demand.

```
TNT Equivalent → Kingery-Bulmash → P_incident
                                        ↓
                              P_reflected (roof/wall)
                              P_dynamic (floor)
                                        ↓
                          SDOF Idealization (KLM)
                                        ↓
                          Natural Period T (Biggs)
                                        ↓
                          ┌─────────────┴─────────────┐
                     Path 1 (Pressure)         Path 2 (Impulse)
                     w₁ = P × DLF(td/T)        w₂ = 2πI/(T×KLM)
                          └─────────────┬─────────────┘
                                  w_blast = max(w₁, w₂)
                                        ↓
                              + static pressure
                                        ↓
                                  Mu / Vu
```

**Frozen Functions** (per FREEZE_GATE_REGISTRY.md):

| Function | Standard | File | Must Not Change |
|----------|----------|------|-----------------|
| `calculateBlastParameters()` | TM 5-1300 | blast/index.ts | YES |
| KB polynomial functions | TM 5-1300 | blast/kingery-bulmash.ts | YES |
| `getPeakBlastPressure()` | TM 5-1300 Ch.5 | design/structural-design.ts | YES |
| `estimateNaturalPeriod()` | Biggs Table 5-1 | design/structural-design.ts | YES |
| `getLoadMassFactor()` | Biggs Table 5-1 | design/structural-design.ts | YES |
| `calculateDynamicResponseFactor()` | Biggs Fig. 4-8 | design/structural-design.ts | YES |
| `calculateDesignLoad()` | UFC 3-340-02 Ch.5 | design/structural-design.ts | YES |
| `calculateDesignMoment()` | — | design/structural-design.ts | YES |
| `calculateDesignShear()` | — | design/structural-design.ts | YES |

**Confirmation**: Layer 1 output (Mu, Vu) is invariant. Any Phase 5C enhancement
operates ON or AFTER this output, never modifying the demand calculation path.

---

### Layer 2: Material Resistance Model ✅ FROZEN

This layer covers material capacity calculations.

```
f'c, fy → Effective depth d
              ↓
         DIF application (capacity only)
              ↓
    ┌─────────┴─────────┐
 φMn              φVn
 (flexure)        (shear)
    └─────────┬─────────┘
         Reinforcement
         Selection (ACI bar DB)
```

**Frozen Functions**:

| Function | Standard | File | Must Not Change |
|----------|----------|------|-----------------|
| `calculateSteelDIF()` | UFC 3-340-02 Sec 5.14.3 | constants.ts | YES |
| `calculateEffectiveDepth()` | ACI 318-19 | design/reinforcement-design.ts | YES |
| `calculateRequiredAs()` | ACI 318-19 Ch.22 | design/reinforcement-design.ts | YES |
| `calculateFlexuralCapacity()` | ACI 318-19 Ch.22 | design/reinforcement-design.ts | YES |
| `calculateShearCapacity()` | ACI 318-19 Ch.22 | design/reinforcement-design.ts | YES |
| `selectReinforcement()` | ACI 318-19 | design/reinforcement-design.ts | YES |
| ACI phi factors (0.90 / 0.75) | ACI 318-19 T21.2.1 | constants.ts | YES |

**Confirmation**: Layer 2 output (φMn, φVn, As, rebar selection) is invariant.

---

### Layer 3: Verification & Penetration Model ✅ FROZEN

```
Mu, Vu, φMn, φVn, hp, h
         ↓
    ┌────┴────┬──────────┬──────────┐
 Flexure  Shear  Penetration  Deflection
   SF       SF      SF          L/360
    └────┬────┴──────────┴──────────┘
              Verification Matrix
              (4 checks × 3 elements)
                    ↓
            PASS / FAIL / OPTIMIZED
```

**Frozen Functions**:

| Function | Standard | File | Must Not Change |
|----------|----------|------|-----------------|
| `verifyElementFlexure()` | ACI 318-19 | design/design-verification.ts | YES |
| `verifyElementShear()` | ACI 318-19 | design/design-verification.ts | YES |
| `verifyElementPenetration()` | TM 5-855-1 | design/design-verification.ts | YES |
| `verifyElementDeflection()` | UFC 3-340-02 | design/design-verification.ts | YES |
| All NDRC penetration functions | TM 5-855-1 | penetration/ | YES |
| Soil pressure functions | Rankine/Coulomb | design/soil-pressure.ts | YES |
| Soil attenuation/wave functions | TM 5-855-1 | soil/ | YES |

**Confirmation**: Layer 3 output (verification matrix, governing mode) is invariant.

---

### Freeze Summary

| Layer | Functions Frozen | Tests Guarding | Baselines |
|-------|-----------------|----------------|-----------|
| 1. Blast Demand | 9 | 453 (Phase 4G) + 52 (Phase 5B) | 5 benchmarks |
| 2. Material Resistance | 7 | (included above) | (included above) |
| 3. Verification | 7+ | (included above) | (included above) |
| **Total** | **23+** | **505** | **5 cases × 3 elements** |

**Gate Verdict on Freeze**: ✅ CONFIRMED — All three layers are verified frozen.
No modification to any frozen function is permitted under Phase 5C.

---

## 5C-2 — Candidate Features Assessment

### Candidate A: Nonlinear SDOF Response

**Current State**: Elastic SDOF → peak response → Mu

**Proposed Enhancement**:
```
Elastic SDOF (current, frozen)
        ↓
Yield point detection
        ↓
Plastic rotation θ_p
        ↓
Ductility demand μ_d = θ_p / θ_y
        ↓
Damage state classification
```

**Engineering Value**: HIGH — Represents actual blast response more accurately
for severe loads. Current elastic-only model overestimates demand for ductile elements.

**Model Impact**: HIGH — Changes the demand path if applied.
Affects: DLF interpretation, equivalent load, Mu, Vu.

**Risk to Frozen Engine**: HIGH — If integrated into demand path,
it fundamentally changes the SDOF response calculation.

**Mitigation**: Must be a SEPARATE module that runs AFTER the frozen
demand calculation. Produces a PARALLEL result, not a replacement.

| Aspect | Assessment |
|--------|-----------|
| Engineering value | Very High |
| Risk to frozen model | High |
| Implementation complexity | High |
| New tests required | 30-50 |
| New benchmarks required | 2-3 (ductile response cases) |

---

### Candidate B: Cracked Section Stiffness

**Current State**: EI = 0.25 × Ec × Ig (gross section, ACI simplified)

**Proposed Enhancement**:
```
Gross EI (current, frozen)
        ↓
Cracking detection: Mcr = fr × Ig / yt
        ↓
if M > Mcr: EI_eff = EI_cracked (using n × As transformation)
        ↓
Updated natural period T'
        ↓
Updated DLF(td/T')
        ↓
Updated equivalent load w'
```

**Engineering Value**: HIGH — Cracked stiffness is more realistic for
RC under blast. Gross section overestimates stiffness → underestimates period
→ overestimates DLF in some td/T ranges.

**Model Impact**: MEDIUM-HIGH — Indirectly affects demand through
period and DLF changes.

**Risk to Frozen Engine**: MEDIUM — Does not modify frozen functions directly,
but changes the INPUTS to the frozen DLF/natural period calculations.

**Critical Concern**: This is the most architecturally sensitive candidate
because it changes values that feed INTO the frozen demand path.
The frozen `estimateNaturalPeriod()` and `calculateDynamicResponseFactor()`
remain unchanged, but their INPUTS (EI, mass) change.

**Mitigation**: Treat cracked EI as a PRE-PROCESSING step before the
frozen demand path. The frozen functions receive different inputs but
execute identically.

| Aspect | Assessment |
|--------|-----------|
| Engineering value | High |
| Risk to frozen model | Medium |
| Implementation complexity | Medium |
| New tests required | 20-30 |
| New benchmarks required | 2 (cracked vs uncracked comparison) |

---

### Candidate C: Plastic Rotation Acceptance Criteria

**Current State**: Binary PASS/FAIL verification

**Proposed Enhancement**:
```
Current (frozen):
  Flexure: SF ≥ 1.0 → PASS

Enhanced:
  θ_actual vs θ_allowable
  → Elastic (θ < θ_yield)
  → Controlled Damage (θ_yield ≤ θ < θ_ultimate)
  → Severe Damage (θ_ultimate ≤ θ < θ_collapse)
  → Failure (θ ≥ θ_collapse)
```

**Engineering Value**: MEDIUM — Important for performance-based design.
Current binary check is conservative but less informative.

**Model Impact**: LOW — This is a NEW verification dimension.
It does not modify existing PASS/FAIL checks.

**Risk to Frozen Engine**: LOW — Purely additive. Adds a new verification
column without touching existing verification.

**Mitigation**: Add as an optional verification method alongside
existing flexure/shear/penetration/deflection checks.

| Aspect | Assessment |
|--------|-----------|
| Engineering value | Medium |
| Risk to frozen model | Low |
| Implementation complexity | Low-Medium |
| New tests required | 15-20 |
| New benchmarks required | 1 (rotation-controlled case) |

---

### Non-Candidate Items (Out of 5C Scope)

The following are NOT part of Phase 5C and remain frozen:

| Item | Reason |
|------|--------|
| Kingery-Bulmash coefficients | Frozen, no engineering justification to change |
| NDRC penetration formulas | Frozen, TM 5-855-1 standard |
| ACI 318-19 capacity equations | Frozen, code-based |
| Soil wave/attenuation models | Frozen, TM 5-855-1 |
| DIF equations | Frozen, UFC 3-340-02 |
| Support condition assumptions | Part of frozen design assumptions |

---

## 5C-3 — Architectural Decision

### Decision: Dual-Mode Engine Architecture

The design engine will be restructured into two coexisting modes:

```
src/calculations/design/
├── index.ts                    ← UNCHANGED (main entry point)
├── types.ts                    ← UNCHANGED (frozen types)
│
├── [EXISTING FROZEN FILES]     ← ZERO MODIFICATIONS
│   ├── structural-design.ts
│   ├── reinforcement-design.ts
│   ├── design-verification.ts
│   ├── design-input-adapter.ts
│   ├── soil-pressure.ts
│   ├── burial-optimization.ts
│   └── constants.ts
│
├── [PHASE 5B FILES]            ← ZERO MODIFICATIONS
│   ├── equation-registry.ts
│   ├── design-assumptions.ts
│   ├── calculation-trace-report.ts
│   ├── audit-export.ts
│   └── benchmarks.ts
│
└── advanced/                   ← NEW: Phase 5C+ additions
    ├── index.ts                ← Advanced mode entry point
    ├── types.ts                ← Extended types
    ├── cracked-stiffness.ts    ← Candidate B
    ├── nonlinear-sdof.ts       ← Candidate A
    ├── plastic-rotation.ts     ← Candidate C
    └── benchmarks/             ← Advanced-specific benchmarks
        ├── cracked-stiffness.test.ts
        ├── nonlinear-sdof.test.ts
        └── plastic-rotation.test.ts
```

### Key Architecture Rules

1. **Frozen files are NEVER modified** — The `advanced/` directory
   contains ONLY new code. Existing files remain at their Phase 5B state.

2. **Standard Mode = Frozen Engine** — The default `runDesignCalculation()`
   in `index.ts` continues to use only the frozen path. No behavioral change.

3. **Advanced Mode = Frozen + Optional Layers** — A new entry point
   `runAdvancedDesignCalculation()` in `advanced/index.ts` wraps the
   frozen engine with optional preprocessing/post-processing layers.

4. **Input/Output Contract Preserved** — Advanced mode accepts the same
   `DesignInput` and produces an extended `AdvancedDesignResult` that
   includes all frozen `DesignResult` fields PLUS additional fields.

5. **Benchmark Isolation** — Advanced benchmarks run ONLY through the
   advanced path. The 5 frozen benchmarks remain unchanged.

6. **Verification Independence** — Existing verification (flexure/shear/
   penetration/deflection) is never modified. New verification dimensions
   (plastic rotation) are additive.

### Mode Selection Interface

```typescript
// Standard mode (frozen, default, certified)
const result = runDesignCalculation(analysisResult);

// Advanced mode (frozen + optional enhancements)
const advancedResult = runAdvancedDesignCalculation(analysisResult, {
  enableCrackedStiffness: true,    // Candidate B
  enableNonlinearSDOF: true,       // Candidate A
  enablePlasticRotation: true,     // Candidate C
});

// Advanced result EXTENDS standard result — all frozen fields present
console.log(advancedResult.standardResult);  // Full DesignResult
console.log(advancedResult.crackedStiffness);  // Additional
console.log(advancedResult.plasticRotation);    // Additional
```

---

## 5C-4 — Decision Priority Table

| Feature | Engineering Value | Risk to Frozen Model | Implementation Complexity | Priority |
|---------|------------------|---------------------|------------------------|----------|
| Professional PDF Report | High (product) | None | Medium | ⭐⭐⭐⭐ |
| Engineering Visualization | High (user) | None | Medium | ⭐⭐⭐⭐ |
| Cracked Stiffness | High | Medium | Medium | ⭐⭐⭐ |
| Nonlinear SDOF | Very High | High | High | ⭐⭐⭐ |
| Plastic Rotation | Medium | Low | Low-Medium | ⭐⭐ |

### Rationale

**PDF Report & Visualization** rank highest because:
- Zero risk to the frozen engine (purely presentational)
- Transform the project from "engineering engine" to "usable product"
- Can be delivered quickly without architectural debate
- Makes all 505 tests' validated results visible and reviewable

**Cracked Stiffness** ranks third because:
- Highest engineering value among model enhancements
- Medium risk is manageable with the dual-mode architecture
- Directly impacts the most sensitive parameter (natural period)

**Nonlinear SDOF** ranks fourth because:
- Highest engineering potential but highest risk
- Requires careful benchmarking against frozen engine
- Should be built only after cracked stiffness validates the architecture

**Plastic Rotation** ranks fifth because:
- Lowest engineering urgency
- But lowest risk — can be added anytime
- Natural companion to nonlinear SDOF

---

## 5C-5 — Recommended Execution Order

### Phase 5C-2: Professional Engineering Report + Visualization
**Scope**: Make the validated design results visible and exportable as
professional engineering documents. No model changes.

**Deliverables**:
- Professional PDF report generation with calculation trace
- Engineering visualization (demand vs capacity diagrams)
- Export-ready audit package formatting

**Risk**: None to frozen engine. Purely presentational layer.

### Phase 5C-3: Advanced Engineering Models
**Scope**: Implement candidate features in `advanced/` directory,
following the dual-mode architecture defined in 5C-3.

**Sub-phases** (sequential, each gated):
- 5C-3A: Cracked Section Stiffness (Candidate B)
- 5C-3B: Plastic Rotation Acceptance (Candidate C)
- 5C-3C: Nonlinear SDOF Response (Candidate A)

**Each sub-phase requires**:
1. Implementation in `advanced/` only
2. New benchmarks comparing advanced vs standard results
3. Full 505-test regression check
4. Equation registry update (new entries only)
5. Design assumptions update (new entries only)

---

## Gate Checklist

| Item | Status |
|------|--------|
| All frozen functions confirmed unchanged | ✅ |
| 505 tests passing, 0 regression | ✅ |
| 5 benchmark baselines populated and verified | ✅ |
| Equation registry (27 entries) complete | ✅ |
| Design assumptions (25 entries) complete | ✅ |
| Architecture for advanced mode defined | ✅ |
| Candidate features assessed | ✅ |
| Priority ranking established | ✅ |
| Execution order recommended | ✅ |
| Risk mitigation strategy defined | ✅ |

**Gate Verdict**: ✅ OPEN FOR PHASE 5C-2

The engineering foundation is solid. The frozen engine is protected by
505 tests, 5 benchmarks, 27 registered equations, and 25 documented
assumptions. The dual-mode architecture provides a clear path for
additive enhancements without risking the certified baseline.

**Next Step**: Phase 5C-2 — Professional Engineering Report + Visualization.