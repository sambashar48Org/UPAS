/**
 * UPAS — Benchmark Baseline Population Script
 * Phase 5B: One-time execution to record frozen-engine baseline values.
 *
 * This script runs each of the 5 benchmark cases through the frozen
 * design engine and prints the expected values that should be hard-coded
 * into benchmarks.ts.
 *
 * Run: npx tsx scripts/populate-baselines.ts
 */

import {
  BENCHMARK_CASES,
} from '../src/calculations/design/benchmarks';
import type { DesignInput, DesignResult } from '../src/calculations/design/types';
import { runStructuralDesign } from '../src/calculations/design/structural-design';
import { runVerification, assembleDesignResult } from '../src/calculations/design/design-verification';

function runFullDesign(input: DesignInput): DesignResult {
  const elementResults = runStructuralDesign(input);
  const verification = runVerification(
    elementResults,
    input.penetration,
    {
      roof: input.elements.roof.span,
      wall: input.elements.wall.span,
      floor: input.elements.floor.span,
    },
    input.criteria,
  );
  return assembleDesignResult(elementResults, verification, []);
}

// ── Run each benchmark ──
console.log('═══════════════════════════════════════════════════════════════');
console.log('UPAS — Benchmark Baseline Population (Frozen Engine)');
console.log('═══════════════════════════════════════════════════════════════\n');

for (const bm of BENCHMARK_CASES) {
  const input = bm.input();
  const result = runFullDesign(input);

  console.log(`── ${bm.id}: ${bm.name} ──`);
  console.log(`   Status: ${result.designStatus}`);
  console.log(`   Governing Element: ${result.verification.governingElement}`);
  console.log(`   Governing Mode: ${result.verification.governingMode}`);
  console.log('');

  for (const key of ['roof', 'wall', 'floor'] as const) {
    const el = result[key];
    const ver = result.verification.elements[key];
    console.log(`   ${key.toUpperCase()}:`);
    console.log(`     requiredThickness: ${el.requiredThickness.toFixed(4)}`);
    console.log(`     designMoment:      ${el.designMoment.toFixed(4)}`);
    console.log(`     designShear:       ${el.designShear.toFixed(4)}`);
    console.log(`     requiredAs:        ${el.requiredAs.toFixed(2)}`);
    console.log(`     flexuralSF:        ${el.flexuralSafetyFactor.toFixed(4)}`);
    console.log(`     shearSF:           ${el.shearSafetyFactor.toFixed(4)}`);
    console.log(`     governingMode:     ${ver.governingMode}`);
    console.log('');
  }
}