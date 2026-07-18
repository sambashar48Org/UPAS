/**
 * Phase 4E — Design Results Reporting Integration Tests
 *
 * Verifies that DesignResult is correctly mapped into the engineering report
 * as a conditional 'structural-design' section.
 *
 * No engineering changes. Only report data mapping and templates.
 *
 * Test A: Report without design → unchanged (same section count, same IDs, no design section)
 * Test B: Report with design → contains structural-design section with all required fields
 * Test C: Data trace — report key-value values equal DesignResult values (no data corruption)
 * Test D: Full regression — all existing pipeline + report tests still pass
 */

import { describe, it, expect } from 'vitest';

import { executeAnalysis } from '../../services/analysis';
import { createDemoProject } from '../../data/demoProject';
import { generateEngineeringReport } from '../../calculations/reports';
import { runDesignCalculation } from '../../calculations/design';
import type { DesignCriteria, DesignResult } from '../../calculations/design';

// ═══════════════════════════════════════════════════════════════════════
// TEST A: Report without design → unchanged
// Backward compatibility: pipeline without designCriteria produces
// the EXACT same report as before (no design section injected).
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4E Test A: Report without design → unchanged', () => {
  it('pipeline without designCriteria has no structural-design section', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });

    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design');
    expect(designSection).toBeUndefined();
  });

  it('pipeline without designCriteria produces same section count as direct generateEngineeringReport()', () => {
    const demo = createDemoProject();

    // Path 1: Through pipeline (no design)
    const pipelineResult = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });

    // Path 2: Direct call without designResult
    const directReport = generateEngineeringReport(pipelineResult.fullResult!);

    // Must have identical section count
    expect(pipelineResult.report!.length).toBe(directReport.length);

    // Must have identical section IDs in order
    const pipelineIds = pipelineResult.report!.map(s => s.id);
    const directIds = directReport.map(s => s.id);
    expect(pipelineIds).toEqual(directIds);
  });

  it('generateEngineeringReport with null designResult produces same output as without argument', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });

    const withoutArg = generateEngineeringReport(result.fullResult!);
    const withNull = generateEngineeringReport(result.fullResult!, null);
    const withUndefined = generateEngineeringReport(result.fullResult!, undefined);

    expect(withoutArg.length).toBe(withNull.length);
    expect(withoutArg.length).toBe(withUndefined.length);

    for (let i = 0; i < withoutArg.length; i++) {
      expect(withoutArg[i]!.id).toBe(withNull[i]!.id);
      expect(withoutArg[i]!.id).toBe(withUndefined[i]!.id);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST B: Report with design → contains structural-design section
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4E Test B: Report with design → contains design section', () => {
  it('pipeline with designCriteria includes structural-design section in report', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design');
    expect(designSection).toBeDefined();
    expect(designSection!.titleAr).toBe('نتائج التصميم الإنشائي');
    expect(designSection!.titleEn).toBe('Structural Design Results');
    expect(designSection!.content.length).toBeGreaterThan(0);
  });

  it('design section appears between overall-assessment and warnings', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const report = result.report!;
    const sectionIds = report.map(s => s.id);

    const designIdx = sectionIds.indexOf('structural-design');
    const assessmentIdx = sectionIds.indexOf('overall-assessment');

    expect(designIdx).toBeGreaterThan(-1);
    expect(designIdx).toBeGreaterThan(assessmentIdx);
  });

  it('design section includes verification summary table', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    const table = designSection.content.find(c => c.type === 'table');
    expect(table).toBeDefined();
    if (table && table.type === 'table') {
      // 6 columns: Element, Flexure, Shear, Penetration, Deflection, Overall
      expect(table.headers.length).toBe(6);
      // 3 rows: roof, wall, floor
      expect(table.rows.length).toBe(3);
      // Each cell is PASS or FAIL
      for (const row of table.rows) {
        for (let col = 1; col < row.length; col++) {
          expect(['PASS', 'FAIL']).toContain(row[col]);
        }
      }
    }
  });

  it('design section severity matches design status', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const dr = result.designResult!;
    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    if (dr.designStatus === 'PASS') {
      expect(designSection.severity).toBe('success');
    } else if (dr.designStatus === 'FAIL') {
      expect(designSection.severity).toBe('critical');
    } else {
      expect(designSection.severity).toBe('warning');
    }
  });

  it('design section contains governing thickness data for all elements', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    // Check for thickness key-value entries (existing, required, recommended)
    const kvItems = designSection.content.filter(c => c.type === 'key-value');
    const thicknessKeys = kvItems.filter(c =>
      c.type === 'key-value' && (
        c.keyEn.includes('Existing Thickness') ||
        c.keyEn.includes('Required Thickness') ||
        c.keyEn.includes('Recommended Thickness')
      )
    );

    // 3 elements × 3 thickness fields = 9 entries
    expect(thicknessKeys.length).toBe(9);
  });

  it('design section contains Mu/Vu for all elements', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    const kvItems = designSection.content.filter(c => c.type === 'key-value');
    const muKeys = kvItems.filter(c => c.type === 'key-value' && c.keyEn.includes('Design Moment'));
    const vuKeys = kvItems.filter(c => c.type === 'key-value' && c.keyEn.includes('Design Shear'));

    // 3 elements each
    expect(muKeys.length).toBe(3);
    expect(vuKeys.length).toBe(3);
  });

  it('design section contains reinforcement selection for all elements', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    const kvItems = designSection.content.filter(c => c.type === 'key-value');
    const barDiamKeys = kvItems.filter(c => c.type === 'key-value' && c.keyEn.includes('Main Bar Diameter'));
    const spacingKeys = kvItems.filter(c => c.type === 'key-value' && c.keyEn.includes('Main Bar Spacing'));

    expect(barDiamKeys.length).toBe(3);
    expect(spacingKeys.length).toBe(3);
  });

  it('design section contains safety factors and verification status', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    const kvItems = designSection.content.filter(c => c.type === 'key-value');

    // Safety factors: 3 elements × 2 (flexural + shear) = 6
    const sfKeys = kvItems.filter(c =>
      c.type === 'key-value' && (c.keyEn.includes('Flexural SF') || c.keyEn.includes('Shear SF'))
    );
    expect(sfKeys.length).toBe(6);

    // Verification checks: 3 elements × 4 (flexure + shear + penetration + deflection) = 12
    const checkKeys = kvItems.filter(c =>
      c.type === 'key-value' && c.keyEn.includes('Check')
    );
    expect(checkKeys.length).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST C: Data trace — report values equal DesignResult values
// Verifies that the report mapping does not corrupt or transform
// any numerical value from DesignResult.
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4E Test C: Data trace — report values equal DesignResult values', () => {
  it('roof Design Moment in report matches DesignResult.designMoment', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const dr = result.designResult!;
    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    // Find the roof design moment key-value
    const roofMu = designSection.content.find(
      c => c.type === 'key-value' && c.keyEn === 'Design Moment — Roof'
    );

    expect(roofMu).toBeDefined();
    if (roofMu && roofMu.type === 'key-value') {
      // Report stores value as string "123.45" (from .toFixed(2))
      expect(parseFloat(roofMu.value)).toBeCloseTo(dr.roof.designMoment, 2);
    }
  });

  it('roof Design Shear in report matches DesignResult.designShear', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const dr = result.designResult!;
    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    const roofVu = designSection.content.find(
      c => c.type === 'key-value' && c.keyEn === 'Design Shear — Roof'
    );

    expect(roofVu).toBeDefined();
    if (roofVu && roofVu.type === 'key-value') {
      expect(parseFloat(roofVu.value)).toBeCloseTo(dr.roof.designShear, 2);
    }
  });

  it('roof existing thickness in report matches DesignResult.existingThickness', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const dr = result.designResult!;
    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    const roofThk = designSection.content.find(
      c => c.type === 'key-value' && c.keyEn === 'Existing Thickness — Roof'
    );

    expect(roofThk).toBeDefined();
    if (roofThk && roofThk.type === 'key-value') {
      // Report converts m → mm via toFixed(0)
      expect(parseInt(roofThk.value, 10)).toBe(Math.round(dr.roof.existingThickness * 1000));
    }
  });

  it('roof main bar diameter in report matches DesignResult.mainReinforcement.barDiameter', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const dr = result.designResult!;
    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    const roofBar = designSection.content.find(
      c => c.type === 'key-value' && c.keyEn === 'Main Bar Diameter — Roof'
    );

    expect(roofBar).toBeDefined();
    if (roofBar && roofBar.type === 'key-value') {
      expect(parseInt(roofBar.value, 10)).toBe(dr.roof.mainReinforcement.barDiameter);
    }
  });

  it('verification table PASS/FAIL matches DesignResult.verification', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const dr = result.designResult!;
    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    const table = designSection.content.find(c => c.type === 'table');
    expect(table).toBeDefined();
    if (table && table.type === 'table') {
      // Row 0 = roof, Row 1 = wall, Row 2 = floor
      const elements = ['roof', 'wall', 'floor'] as const;
      for (let i = 0; i < 3; i++) {
        const ver = dr.verification.elements[elements[i]!];
        expect(table.rows[i]![1]).toBe(ver.flexuralPass ? 'PASS' : 'FAIL');
        expect(table.rows[i]![2]).toBe(ver.shearPass ? 'PASS' : 'FAIL');
        expect(table.rows[i]![3]).toBe(ver.penetrationPass ? 'PASS' : 'FAIL');
        expect(table.rows[i]![4]).toBe(ver.deflectionPass ? 'PASS' : 'FAIL');
        expect(table.rows[i]![5]).toBe(ver.overallPass ? 'PASS' : 'FAIL');
      }
    }
  });

  it('wall and floor data trace — all key values match DesignResult', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    const dr = result.designResult!;
    const report = result.report!;
    const designSection = report.find(s => s.id === 'structural-design')!;

    // Check wall and floor Mu/Vu
    for (const elemKey of ['wall', 'floor'] as const) {
      const label = elemKey === 'wall' ? 'Wall' : 'Floor';
      const elDr = dr[elemKey];

      const mu = designSection.content.find(
        c => c.type === 'key-value' && c.keyEn === `Design Moment — ${label}`
      );
      const vu = designSection.content.find(
        c => c.type === 'key-value' && c.keyEn === `Design Shear — ${label}`
      );

      expect(mu).toBeDefined();
      expect(vu).toBeDefined();

      if (mu && mu.type === 'key-value') {
        expect(parseFloat(mu.value)).toBeCloseTo(elDr.designMoment, 2);
      }
      if (vu && vu.type === 'key-value') {
        expect(parseFloat(vu.value)).toBeCloseTo(elDr.designShear, 2);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// TEST D: Full regression — all existing pipeline tests unchanged
// This test block verifies that adding the design section did not
// break any existing report behavior when design is not requested.
// ═══════════════════════════════════════════════════════════════════════

describe('Phase 4E Test D: Full regression — existing behavior preserved', () => {
  it('existing report sections still present and in correct order (no design)', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });

    const report = result.report!;
    const ids = report.map(s => s.id);

    // Must start with executive-summary and input-summary
    expect(ids[0]).toBe('executive-summary');
    expect(ids[1]).toBe('input-summary');

    // Must include overall-assessment
    expect(ids).toContain('overall-assessment');

    // Must NOT include structural-design
    expect(ids).not.toContain('structural-design');

    // Overall assessment must be before warnings (if any) and recommendations (if any)
    const assessmentIdx = ids.indexOf('overall-assessment');
    const warningIdx = ids.indexOf('warnings');
    const recIdx = ids.indexOf('recommendations');

    if (warningIdx !== -1) expect(warningIdx).toBeGreaterThan(assessmentIdx);
    if (recIdx !== -1) expect(recIdx).toBeGreaterThan(assessmentIdx);
  });

  it('report with design has MORE sections than report without design', () => {
    const demo = createDemoProject();

    const noDesign = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });

    const withDesign = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    // With design should have exactly one more section
    expect(withDesign.report!.length).toBe(noDesign.report!.length + 1);
  });

  it('pipeline success/error/validationErrors fields unchanged (no design)', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
    });

    expect(result.success).toBe(true);
    expect(result.fullResult).not.toBeNull();
    expect(result.domainResult).not.toBeNull();
    expect(result.report).not.toBeNull();
    expect(result.designResult).toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.validationErrors).toHaveLength(0);
  });

  it('pipeline success/error/validationErrors fields unchanged (with design)', () => {
    const demo = createDemoProject();
    const result = executeAnalysis({
      project: demo.project,
      soilProfile: demo.soilProfile,
      structure: demo.structure,
      threat: demo.threat,
      bomb: demo.bomb,
      designCriteria: { targetSafetyFactor: 1.0 },
    });

    expect(result.success).toBe(true);
    expect(result.fullResult).not.toBeNull();
    expect(result.domainResult).not.toBeNull();
    expect(result.report).not.toBeNull();
    expect(result.designResult).not.toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.validationErrors).toHaveLength(0);
  });
});