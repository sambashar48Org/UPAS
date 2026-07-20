# Phase 5F — Architecture Planning: Standard Mode vs Advanced Mode

> **Status:** Planning Only — No Code Execution
> **Date:** 2026-07-20
> **Rule:** Zero modifications to frozen engine. Standard Mode remains the sole reference.

---

## 1. Standard Mode (النمط القياسي) — Current Frozen Engine

### 1.1 Definition

Standard Mode is the **current production engine** with all 27 frozen equations,
15 documented assumptions, and 5 benchmark cases validated across 549+ tests.

### 1.2 Frozen Components

| Layer | Functions | Status |
|-------|-----------|--------|
| Blast Demand (Layer 1) | 9 functions: scaled distance, incident/reflected pressure, dynamic pressure, impulse, duration, reflection coefficient, ground shock, wave propagation, soil attenuation | **FROZEN** |
| Material Resistance (Layer 2) | 7 functions: concrete capacity (ACI 318-19), steel capacity, DIF, reinforcement selection, shear capacity, development length, minimum reinforcement | **FROZEN** |
| Verification (Layer 3) | 7+ functions: flexural SF, shear SF, penetration depth, scabbing, perforation, deflection ratio, overall verification | **FROZEN** |

### 1.3 Files (READ-ONLY)

```
src/calculations/design/
  ├── structural-design.ts          — Main design pipeline
  ├── reinforcement-design.ts       — ACI 318-19 reinforcement
  ├── design-verification.ts        — Multi-mode verification
  ├── design-input-adapter.ts       — Analysis → Design adapter
  ├── professional-report.ts        — Report data transformer
  ├── calculation-trace-report.ts   — Calculation trace formatter
  ├── audit-export.ts               — Audit package generator
  ├── equation-registry.ts          — 27 frozen equations
  ├── design-assumptions.ts         — 15 documented assumptions
  ├── benchmarks.ts                 — 5 benchmark cases
  ├── burial-optimization.ts        — Burial depth optimization
  ├── soil-pressure.ts              — Earth pressure calculation
  └── types.ts                      — All design types
```

### 1.4 Rule

> **Standard Mode files SHALL NOT be modified.**
> Any future enhancement MUST go through Advanced Mode.

---

## 2. Advanced Mode (النمط المتقدم) — Future Extension Architecture

### 2.1 Directory Structure

```
src/calculations/design/advanced/
  ├── README.md                      — This architecture document
  ├── index.ts                       — Advanced mode entry point
  ├── types.ts                       — Advanced-specific types
  ├── nonlinear-sdof/
  │   ├── index.ts                   — Nonlinear SDOF solver
  │   ├── types.ts
  │   ├── tests/
  │   └── benchmarks.ts
  ├── cracked-stiffness/
  │   ├── index.ts                   — Cracked section properties
  │   ├── types.ts
  │   ├── tests/
  │   └── benchmarks.ts
  ├── plastic-rotation/
  │   ├── index.ts                   — Plastic rotation acceptance criteria
  │   ├── types.ts
  │   ├── tests/
  │   └── benchmarks.ts
  └── advanced-materials/
      ├── index.ts                   — Advanced material models (confined concrete, etc.)
      ├── types.ts
      ├── tests/
      └── benchmarks.ts
```

### 2.2 Architecture Rules

#### R1: Independence
Each advanced model is a **standalone module** with its own:
- Types (`types.ts`)
- Tests (`tests/`)
- Benchmarks (`benchmarks.ts`)
- Equation Registry entries (if applicable)

#### R2: No Side Effects
Advanced modules SHALL NOT:
- Import from Standard Mode calculation files (type imports are OK)
- Modify any Standard Mode state
- Change any frozen equation or result
- Affect the `DesignResult` type used by Standard Mode

#### R3: Opt-in
Advanced models are **optional**. They are:
- Disabled by default
- Enabled only via explicit user selection in the UI
- Each can be toggled independently

#### R4: Separate Results
Advanced models produce their own result type (e.g., `AdvancedDesignResult`)
that EXTENDS (not replaces) the Standard Mode `DesignResult`.

#### R5: Separate Tests
Advanced model tests:
- Do NOT interact with Standard Mode tests
- Run independently
- Have their own benchmarks
- Do NOT affect the 549+ Standard Mode test count

#### R6: Separate Verification
Each advanced model has its own verification criteria,
equation registry entries (with `advanced/` prefix), and assumption documentation.

---

## 3. Dual-Mode Architecture

### 3.1 UI Integration

```
User selects mode:
  ├── Standard Mode → uses frozen engine only
  └── Advanced Mode → uses frozen engine + selected advanced modules
```

### 3.2 Report Integration

The professional report displays:
- Standard Mode results (always)
- Advanced Mode results (if enabled, in a separate section)
- Clear labeling of which results come from which mode

### 3.3 Export Integration

The export bundle includes:
- Standard Mode results (always)
- Advanced Mode results (if any enabled)
- Mode identification in all exported files

---

## 4. Candidate Features Priority

| Feature | Priority | Complexity | Test Est. | Status |
|---------|----------|------------|-----------|--------|
| Nonlinear SDOF | ⭐⭐⭐ | High | 30-50 tests | Planned |
| Cracked Section Stiffness | ⭐⭐⭐ | Medium | 20-30 tests | Planned |
| Plastic Rotation Acceptance | ⭐⭐ | Medium | 15-25 tests | Planned |
| Advanced Material Models | ⭐⭐ | High | 25-40 tests | Planned |
| Confinement Effects | ⭐ | Low | 10-15 tests | Future |

---

## 5. Governance

### 5.1 Change Control

1. Any change to Standard Mode requires a **Freeze Gate Review**
2. New advanced modules require: types, tests, benchmarks, documentation
3. No advanced module may degrade Standard Mode test performance

### 5.2 Regression Policy

- Standard Mode: 549+ tests must remain at 100% pass rate
- Advanced Mode: Each module must achieve 100% pass rate independently
- Cross-mode: No advanced module may cause a Standard Mode test failure

---

*This document is the architectural reference for all future advanced model development.
Standard Mode remains the verified, frozen, production reference engine.*