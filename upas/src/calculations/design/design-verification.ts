/**
 * UPAS — Design Verification Module
 * Phase 4C: Verification & Integration
 *
 * Verifies structural design results against four independent criteria:
 *   1. Flexure:      SF = φMn / Mu  ≥  targetSafetyFactor
 *   2. Shear:        SF = φVn / Vu  ≥  targetSafetyFactor
 *   3. Penetration:  SF = h / max(h_perf, h_scab)  ≥  1.0
 *   4. Deflection:   δ/L  ≤  maxDeflectionRatio
 *
 * Final PASS/FAIL decision:
 *   PASS = Flexure PASS  AND  Shear PASS  AND  Penetration PASS  AND  Deflection PASS
 *   for ALL elements.
 *
 * This module also determines the governing (weakest) element and failure mode.
 *
 * ARCHITECTURE RULE:
 *   This module reads ONLY design/types.ts and ElementDesignResult.
 *   It does NOT import from calculations/types.ts, results/, structure/,
 *   soil/, or threat/.
 *
 * Reference Standards:
 * - UFC 3-340-02 (Structures to Resist the Effects of Accidental Explosions)
 * - ACI 318-19 (Building Code Requirements for Structural Concrete)
 * - TM 5-855-1 (Fundamentals of Protective Design for Conventional Weapons)
 */

import type {
  ElementDesignResult,
  DesignPenetrationData,
  DesignCriteria,
  DesignResult,
  ElementVerificationResult,
  VerificationResult,
  VerificationMode,
  DesignInputWarning,
} from './types';

// ═══════════════════════════════════════════════════════════════════════
// ELEMENT-LEVEL VERIFICATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Verify flexural adequacy of a single element.
 *
 *   SF_flexure = φMn / Mu
 *
 * The safety factors are already computed in ElementDesignResult
 * by the structural design engine (Phase 4B).
 *
 * @param result    - Element design result (contains flexuralSafetyFactor)
 * @param targetSF  - Target safety factor from DesignCriteria
 * @returns Safety factor and pass/fail status
 */
export function verifyElementFlexure(
  result: ElementDesignResult,
  targetSF: number,
): { sf: number; pass: boolean } {
  const sf = result.flexuralSafetyFactor;
  return { sf, pass: sf >= targetSF };
}

/**
 * Verify shear adequacy of a single element.
 *
 *   SF_shear = φVn / Vu
 *
 * @param result    - Element design result (contains shearSafetyFactor)
 * @param targetSF  - Target safety factor from DesignCriteria
 * @returns Safety factor and pass/fail status
 */
export function verifyElementShear(
  result: ElementDesignResult,
  targetSF: number,
): { sf: number; pass: boolean } {
  const sf = result.shearSafetyFactor;
  return { sf, pass: sf >= targetSF };
}

/**
 * Verify penetration resistance of a single element.
 *
 *   SF_penetration = actualThickness / max(perforationThickness, scabbingThickness)
 *
 * The penetration data comes from the analysis engine (NDRC formulas).
 * If both perforationThickness and scabbingThickness are zero (no penetration
 * threat — e.g. blast-only analysis), SF = Infinity (always pass).
 *
 * @param result       - Element design result (contains requiredThickness)
 * @param penetration  - Penetration data from analysis (NDRC)
 * @returns Safety factor and pass/fail status
 */
export function verifyElementPenetration(
  result: ElementDesignResult,
  penetration: DesignPenetrationData,
): { sf: number; pass: boolean } {
  const h = result.requiredThickness;
  const criticalThickness = Math.max(
    penetration.perforationThickness,
    penetration.scabbingThickness,
  );

  // No penetration threat — always pass
  if (criticalThickness <= 0) {
    return { sf: Infinity, pass: true };
  }

  const sf = h / criticalThickness;
  return { sf, pass: sf >= 1.0 };
}

/**
 * Verify deflection serviceability of a single element.
 *
 *   δ/L  ≤  maxDeflectionRatio
 *
 * @param result          - Element design result (contains maxDeflection in mm)
 * @param span_m          - Element clear span (m)
 * @param maxDeflRatio    - Maximum allowable δ/L (e.g. 1/360)
 * @returns Actual ratio and pass/fail status
 */
export function verifyElementDeflection(
  result: ElementDesignResult,
  span_m: number,
  maxDeflRatio: number,
): { ratio: number; pass: boolean } {
  const delta_mm = result.maxDeflection;
  const span_mm = span_m * 1000;

  if (span_mm <= 0) {
    return { ratio: 0, pass: true };
  }

  const ratio = delta_mm / span_mm;
  return { ratio, pass: ratio <= maxDeflRatio };
}

// ═══════════════════════════════════════════════════════════════════════
// COMBINED ELEMENT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Verify a single structural element against all four criteria.
 *
 * Determines the governing (weakest) mode by normalizing all checks
 * to a common "margin" scale:
 *   margin = actual / required  (1.0 = exactly at limit)
 *
 *   Flexure:      margin = SF / targetSF
 *   Shear:        margin = SF / targetSF
 *   Penetration:  margin = SF  (target is 1.0)
 *   Deflection:   margin = maxRatio / actualRatio
 *
 * The mode with the lowest margin is the governing mode.
 *
 * @param result       - Element design result
 * @param penetration  - Penetration data from analysis
 * @param span_m       - Element clear span (m)
 * @param criteria     - Design criteria
 * @returns Complete ElementVerificationResult
 */
export function verifyElement(
  result: ElementDesignResult,
  penetration: DesignPenetrationData,
  span_m: number,
  criteria: DesignCriteria,
): ElementVerificationResult {
  const warnings: string[] = [];

  // ── 1. Flexure ──
  const flex = verifyElementFlexure(result, criteria.targetSafetyFactor);
  if (!flex.pass) {
    warnings.push(
      `عامل أمان الانحناء (${flex.sf.toFixed(2)}) أقل من المطلوب (${criteria.targetSafetyFactor})`,
    );
  }

  // ── 2. Shear ──
  const shr = verifyElementShear(result, criteria.targetSafetyFactor);
  if (!shr.pass) {
    warnings.push(
      `عامل أمان القص (${shr.sf.toFixed(2)}) أقل من المطلوب (${criteria.targetSafetyFactor})`,
    );
  }

  // ── 3. Penetration ──
  const pen = verifyElementPenetration(result, penetration);
  if (!pen.pass) {
    warnings.push(
      `عامل أمان الاختراق (${pen.sf.toFixed(2)}) أقل من 1.0`,
    );
  }

  // ── 4. Deflection ──
  const defl = verifyElementDeflection(result, span_m, criteria.maxDeflectionRatio);
  if (!defl.pass) {
    warnings.push(
      `نسبة الانحراف (${(defl.ratio * 1000).toFixed(1)}‰) تتجاوز الحد المسموح (${(criteria.maxDeflectionRatio * 1000).toFixed(1)}‰)`,
    );
  }

  // ── 5. Determine governing mode (lowest margin) ──
  const flexMargin = criteria.targetSafetyFactor > 0 ? flex.sf / criteria.targetSafetyFactor : Infinity;
  const shearMargin = criteria.targetSafetyFactor > 0 ? shr.sf / criteria.targetSafetyFactor : Infinity;
  const penMargin = pen.sf;
  const deflMargin = defl.ratio > 0 ? criteria.maxDeflectionRatio / defl.ratio : Infinity;

  const margins: Array<{ mode: VerificationMode; margin: number }> = [
    { mode: 'flexure', margin: flexMargin },
    { mode: 'shear', margin: shearMargin },
    { mode: 'penetration', margin: penMargin },
    { mode: 'deflection', margin: deflMargin },
  ];

  margins.sort((a, b) => a.margin - b.margin);
  const governingMode = margins[0].margin === Infinity ? 'none' : margins[0].mode;

  // ── 6. Overall pass ──
  const overallPass = flex.pass && shr.pass && pen.pass && defl.pass;

  return {
    element: result.element,
    flexuralSF: flex.sf,
    flexuralPass: flex.pass,
    shearSF: shr.sf,
    shearPass: shr.pass,
    penetrationSF: pen.sf,
    penetrationPass: pen.pass,
    deflectionRatio: defl.ratio,
    deflectionPass: defl.pass,
    overallPass,
    governingMode,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// FULL VERIFICATION — All Elements
// ═══════════════════════════════════════════════════════════════════════

/**
 * Verify all three structural elements.
 *
 * Final decision:
 *   PASS = ALL elements pass ALL four checks.
 *
 * @param elementResults  - Per-element design results from structural design engine
 * @param penetration     - Per-element penetration data from analysis
 * @param spans           - Per-element clear spans (m)
 * @param criteria        - Design criteria
 * @returns Complete VerificationResult
 */
export function runVerification(
  elementResults: {
    roof: ElementDesignResult;
    wall: ElementDesignResult;
    floor: ElementDesignResult;
  },
  penetration: {
    roof: DesignPenetrationData;
    wall: DesignPenetrationData;
    floor: DesignPenetrationData;
  },
  spans: {
    roof: number;
    wall: number;
    floor: number;
  },
  criteria: DesignCriteria,
): VerificationResult {
  const warnings: string[] = [];

  const roof = verifyElement(elementResults.roof, penetration.roof, spans.roof, criteria);
  const wall = verifyElement(elementResults.wall, penetration.wall, spans.wall, criteria);
  const floor = verifyElement(elementResults.floor, penetration.floor, spans.floor, criteria);

  warnings.push(...roof.warnings, ...wall.warnings, ...floor.warnings);

  // ── Determine governing element (lowest margin across all modes) ──
  type ElKey = 'roof' | 'wall' | 'floor';
  const allElements: Array<{ key: ElKey; v: ElementVerificationResult }> = [
    { key: 'roof', v: roof },
    { key: 'wall', v: wall },
    { key: 'floor', v: floor },
  ];

  let governingElement: ElKey = 'roof';
  let governingMode: VerificationMode = 'none';
  let lowestMargin = Infinity;

  for (const { key, v } of allElements) {
    const targetSF = criteria.targetSafetyFactor;
    const modes: Array<{ mode: VerificationMode; margin: number }> = [
      { mode: 'flexure', margin: targetSF > 0 ? v.flexuralSF / targetSF : Infinity },
      { mode: 'shear', margin: targetSF > 0 ? v.shearSF / targetSF : Infinity },
      { mode: 'penetration', margin: v.penetrationSF },
      { mode: 'deflection', margin: v.deflectionRatio > 0 ? criteria.maxDeflectionRatio / v.deflectionRatio : Infinity },
    ];

    for (const m of modes) {
      if (m.margin < lowestMargin) {
        lowestMargin = m.margin;
        governingElement = key;
        governingMode = m.mode;
      }
    }
  }

  const overallPass = roof.overallPass && wall.overallPass && floor.overallPass;

  return {
    elements: { roof, wall, floor },
    overallPass,
    governingElement,
    governingMode: lowestMargin === Infinity ? 'none' : governingMode,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// DESIGN RESULT ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════

/** Arabic element name map */
const ELEMENT_NAME_AR: Record<string, string> = {
  roof: 'السقف',
  wall: 'الجدار',
  floor: 'الأرضية',
};

/**
 * Assemble the final DesignResult from structural design results,
 * verification results, and adapter warnings.
 *
 * @param elementResults    - Per-element structural design results
 * @param verification      - Complete verification result
 * @param adapterWarnings   - Warnings from the DesignInputAdapter
 * @returns Complete DesignResult
 */
export function assembleDesignResult(
  elementResults: {
    roof: ElementDesignResult;
    wall: ElementDesignResult;
    floor: ElementDesignResult;
  },
  verification: VerificationResult,
  adapterWarnings: DesignInputWarning[],
): DesignResult {
  // ── Warnings: adapter warnings (English) + verification warnings ──
  const warnings: string[] = [
    ...adapterWarnings.map(w => w.messageEn),
    ...verification.warnings,
  ];

  // ── Recommendations ──
  const recommendations = generateRecommendations(verification);

  // ── Determine status ──
  let designStatus: 'PASS' | 'FAIL' | 'OPTIMIZED';
  if (!verification.overallPass) {
    designStatus = 'FAIL';
  } else {
    // Check if any element was optimized (required > existing)
    const anyOptimized =
      elementResults.roof.requiredThickness > elementResults.roof.existingThickness ||
      elementResults.wall.requiredThickness > elementResults.wall.existingThickness ||
      elementResults.floor.requiredThickness > elementResults.floor.existingThickness;

    designStatus = anyOptimized ? 'OPTIMIZED' : 'PASS';
  }

  return {
    roof: elementResults.roof,
    wall: elementResults.wall,
    floor: elementResults.floor,
    designStatus,
    governingElement: verification.governingElement,
    warnings,
    recommendations,
    verification,
  };
}

/**
 * Generate Arabic design recommendations based on verification results.
 *
 * @param verification - Complete verification result
 * @returns Array of Arabic recommendation strings
 */
function generateRecommendations(verification: VerificationResult): string[] {
  const recs: string[] = [];

  for (const el of ['roof', 'wall', 'floor'] as const) {
    const v = verification.elements[el];
    if (v.overallPass) continue;

    const name = ELEMENT_NAME_AR[el];

    switch (v.governingMode) {
      case 'flexure':
        recs.push(
          `زيادة سماكة ${name} أو زيادة التسليح لتحسين عامل أمان الانحناء (الحالي: ${v.flexuralSF.toFixed(2)})`,
        );
        break;
      case 'shear':
        recs.push(
          `زيادة سماكة ${name} أو إضافة تسليح قص لتحسين عامل أمان القص (الحالي: ${v.shearSF.toFixed(2)})`,
        );
        break;
      case 'penetration':
        recs.push(
          `زيادة سماكة ${name} لمنع الاختراق (عامل الأمان الحالي: ${v.penetrationSF.toFixed(2)})`,
        );
        break;
      case 'deflection':
        recs.push(
          `زيادة سماكة ${name} لتقليل الانحراف تحت الحد المسموح`,
        );
        break;
    }
  }

  return recs;
}

/**
 * Extract the minimum safety factor across all elements and all modes.
 * Used by burial optimization to track convergence.
 *
 * @param verification - Complete verification result
 * @returns Minimum safety factor (or Infinity if all are infinite)
 */
export function getMinSafetyFactor(verification: VerificationResult): number {
  let minSF = Infinity;

  for (const el of ['roof', 'wall', 'floor'] as const) {
    const v = verification.elements[el];
    minSF = Math.min(
      minSF,
      v.flexuralSF,
      v.shearSF,
      v.penetrationSF,
      // For deflection, convert ratio to equivalent SF
      v.deflectionRatio > 0 ? (1 / v.deflectionRatio) * 0.003 : Infinity, // normalized
    );
  }

  return minSF;
}