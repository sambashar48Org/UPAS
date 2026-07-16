/**
 * UPAS — Sprint 3B Pipeline Tests
 * AC-13: Headless analysis — no React, no Three.js, no DOM.
 * Tests the full pipeline: Mock Project → AnalysisPipeline → FullAnalysisResult
 * Also tests: VisualizationAdapter, ResultAdapter, ReportAdapter
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { executeAnalysis } from '../../services/analysis';
import { createDemoProject } from '../../data/demoProject';
import { buildVisualizationModel } from '../../visualization/VisualizationAdapter';
import { buildResultViewModel } from '../../visualization/ResultAdapter';
import { buildReportViewModel } from '../../visualization/ReportAdapter';
import type { FullAnalysisResult } from '../../calculations/types';

describe('Sprint 3B — Analysis Pipeline', () => {
  // ─── AC-13: Headless Analysis ─────────────────────────────
  describe('AC-13: Headless Analysis (no UI)', () => {
    it('should execute a full analysis without any UI dependencies', () => {
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
      expect(result.errors).toHaveLength(0);
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should return valid FullAnalysisResult structure', () => {
      const demo = createDemoProject();
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });

      const r = result.fullResult!;
      expect(r.id).toBeDefined();
      expect(r.projectId).toBe(demo.project.id);
      expect(r.calculatedAt).toBeDefined();
      expect(r.analysisType).toBeDefined();
      expect(r.input).toBeDefined();
      expect(r.blast).toBeDefined();
      expect(r.overall).toBeDefined();
      expect(r.visualization).toBeDefined();
      expect(r.warnings).toBeInstanceOf(Array);
      expect(r.recommendations).toBeInstanceOf(Array);
    });

    it('should produce blast parameters', () => {
      const demo = createDemoProject();
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });

      const bp = result.fullResult!.blast.parameters;
      expect(bp).not.toBeNull();
      expect(bp!.tntEquivalentMass).toBeGreaterThan(0);
      expect(bp!.scaledDistance).toBeGreaterThan(0);
      expect(bp!.peakIncidentPressure).toBeGreaterThan(0);
      expect(bp!.peakReflectedPressure).toBeGreaterThanOrEqual(bp!.peakIncidentPressure);
      expect(bp!.positivePhaseDuration).toBeGreaterThan(0);
      expect(bp!.positivePhaseImpulse).toBeGreaterThan(0);
    });

    it('should produce structure responses', () => {
      const demo = createDemoProject();
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });

      const r = result.fullResult!;
      // At least roof response should exist (it's the primary loaded element)
      expect(r.blast.roofResponse || r.blast.wallResponse || r.blast.floorResponse).toBeTruthy();
    });

    it('should produce overall assessment', () => {
      const demo = createDemoProject();
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });

      const overall = result.fullResult!.overall;
      expect(overall.minSafetyFactor).toBeGreaterThan(0);
      expect(['safe', 'marginal', 'unsafe', 'critical']).toContain(overall.protectionLevel);
      expect(['roof', 'wall', 'floor']).toContain(overall.governingElement);
      expect(['blast', 'penetration']).toContain(overall.governingMode);
      expect(typeof overall.isAdequate).toBe('boolean');
    });

    it('should produce domain AnalysisResult', () => {
      const demo = createDemoProject();
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });

      const dr = result.domainResult!;
      expect(dr.id).toBeDefined();
      expect(dr.blastResults).not.toBeNull();
      expect(dr.overallSafetyFactor).toBeGreaterThan(0);
      expect(['safe', 'marginal', 'unsafe', 'critical', 'pending']).toContain(dr.protectionLevel);
    });

    it('should produce engineering report', () => {
      const demo = createDemoProject();
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });

      const report = result.report!;
      expect(report.length).toBeGreaterThan(0);
      expect(report[0]!.id).toBeDefined();
      expect(report[0]!.titleAr).toBeDefined();
      expect(report[0]!.titleEn).toBeDefined();
      expect(report[0]!.content.length).toBeGreaterThan(0);
    });
  });

  // ─── Validation Failure Test ─────────────────────────────
  describe('Pipeline Validation', () => {
    it('should fail validation for empty project name', () => {
      const demo = createDemoProject();
      demo.project.name = '';
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });

      expect(result.success).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });
  });

  // ─── Visualization Adapter Tests ──────────────────────────
  describe('VisualizationAdapter', () => {
    let fullResult: FullAnalysisResult;

    beforeAll(() => {
      const demo = createDemoProject();
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });
      fullResult = result.fullResult!;
    });

    it('should build VisualizationModel with all fields', () => {
      const vm = buildVisualizationModel(fullResult);
      expect(vm.damageZones).toBeInstanceOf(Array);
      expect(vm.threatObject).not.toBeNull();
      expect(vm.pressureContours).toBeInstanceOf(Array);
      expect(vm.stressRegions).toBeInstanceOf(Array);
    });

    it('should have threat object with required fields', () => {
      const vm = buildVisualizationModel(fullResult);
      const t = vm.threatObject!;
      expect(t.position).toHaveLength(3);
      expect(t.size).toHaveLength(3);
      expect(t.color).toBeDefined();
      expect(t.label).toBeDefined();
      expect(t.chargeMassKg).toBeGreaterThan(0);
      expect(t.chargeShape).toBeDefined();
    });

    it('should have damage zones with pre-computed colors', () => {
      const vm = buildVisualizationModel(fullResult);
      for (const dz of vm.damageZones) {
        expect(dz.color).toMatch(/^#[0-9a-f]{6}$/);
        expect(dz.opacity).toBeGreaterThan(0);
        expect(dz.radius).toBeGreaterThan(0);
      }
    });
  });

  // ─── Result Adapter Tests ─────────────────────────────────
  describe('ResultAdapter', () => {
    let fullResult: FullAnalysisResult;

    beforeAll(() => {
      const demo = createDemoProject();
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });
      fullResult = result.fullResult!;
    });

    it('should build ResultViewModel with summary', () => {
      const vm = buildResultViewModel(fullResult);
      expect(vm.summary.safetyFactor).toBeGreaterThan(0);
      expect(vm.summary.protectionLabelAr).toBeDefined();
      expect(vm.summary.statusColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(vm.summary.governingElementLabelAr).toBeDefined();
      expect(vm.summary.governingModeLabelAr).toBeDefined();
    });

    it('should build blast result VM', () => {
      const vm = buildResultViewModel(fullResult);
      expect(vm.blast).not.toBeNull();
      expect(vm.blast!.tntEquivalentMass).toBeGreaterThan(0);
      expect(vm.blast!.peakIncidentPressure).toBeGreaterThan(0);
    });

    it('should build warnings with pre-computed severity colors', () => {
      const vm = buildResultViewModel(fullResult);
      for (const w of vm.warnings) {
        expect(w.severityColor).toMatch(/^#[0-9a-f]{6}$/);
        expect(w.severityLabelAr).toBeDefined();
        expect(w.messageAr).toBeDefined();
      }
    });
  });

  // ─── Report Adapter Tests ─────────────────────────────────
  describe('ReportAdapter', () => {
    it('should build ReportViewModel with styled sections', () => {
      const demo = createDemoProject();
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });

      const vm = buildReportViewModel(result.report!, {
        projectName: demo.project.name,
        calculatedAt: result.fullResult!.calculatedAt,
        protectionLevel: result.fullResult!.overall.protectionLevel,
      });

      expect(vm.sections.length).toBeGreaterThan(0);
      expect(vm.projectName).toBe(demo.project.name);
      expect(vm.protectionColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(vm.protectionLevelAr).toBeDefined();

      for (const section of vm.sections) {
        expect(section.severityColor).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });

  // ─── Demo Project Factory Test ────────────────────────────
  describe('Demo Project Factory', () => {
    it('should create complete demo data', () => {
      const demo = createDemoProject();
      expect(demo.project.id).toBeDefined();
      expect(demo.soilProfile.layers.length).toBe(4);
      expect(demo.structure.length.value).toBe(8);
      expect(demo.threat.standoffDistance.value).toBe(5);
      expect(demo.bomb.chargeMass.value).toBe(100);
      expect(demo.bomb.explosiveTypeRef).toBe('TNT');
    });

    it('should produce valid analysis from demo data', () => {
      const demo = createDemoProject();
      const result = executeAnalysis({
        project: demo.project,
        soilProfile: demo.soilProfile,
        structure: demo.structure,
        threat: demo.threat,
        bomb: demo.bomb,
      });
      expect(result.success).toBe(true);
    });
  });
});