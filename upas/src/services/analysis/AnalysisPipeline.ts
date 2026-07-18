/**
 * UPAS — Analysis Pipeline Service
 * Sprint 3B: Service layer between UI and Calculation Engine
 *
 * Architecture Rule: NO React, NO Three.js, NO UI dependencies.
 * This is a pure TypeScript service that orchestrates:
 *   Validation → Calculation → Domain Conversion → Report Generation
 *
 * Flow: UI → AnalysisPipeline.execute() → FullAnalysisResult
 *       UI ← PipelineResult { domainResult, report, fullResult }
 */

import type { Project } from '../../models/Project';
import type { SoilProfile } from '../../models/Soil';
import type { Structure } from '../../models/Structure';
import type { Threat } from '../../models/Threat';
import type { Bomb } from '../../models/Bomb';
import type { AnalysisResult } from '../../models/AnalysisResult';

import { validateProject } from '../../validation/projectValidation';
import { validateSoilProfile } from '../../validation/soilValidation';
import { validateStructure } from '../../validation/structureValidation';
import {
  runAnalysis,
  toDomainResult,
  generateReport,
  type AnalysisSettings,
  type FullAnalysisResult,
} from '../../calculations';
import type { ReportSection } from '../../calculations/reports';
import { runDesignCalculation } from '../../calculations/design';
import type { DesignCriteria, DesignResult } from '../../calculations/design';

// ─── Pipeline Input ──────────────────────────────────────────────
export interface PipelineInput {
  project: Project;
  soilProfile: SoilProfile;
  structure: Structure;
  threat: Threat;
  bomb: Bomb;
  settings?: AnalysisSettings;
  /** Optional design criteria — when provided, runs structural design after analysis */
  designCriteria?: Partial<DesignCriteria>;
}

// ─── Pipeline Output ─────────────────────────────────────────────
export interface PipelineResult {
  success: boolean;
  fullResult: FullAnalysisResult | null;
  domainResult: AnalysisResult | null;
  report: ReportSection[] | null;
  /** Structural design result — present only when designCriteria was provided */
  designResult: DesignResult | null;
  errors: string[];
  validationErrors: Array<{ field: string; message: string; code: string }>;
}

// ─── Pipeline Execution ──────────────────────────────────────────
export function executeAnalysis(input: PipelineInput): PipelineResult {
  // 1. Validate — Project
  const projectVal = validateProject(input.project);
  if (!projectVal.isValid) {
    return failResult(projectVal.errors.map(e => ({
      field: e.field, message: e.message, code: e.code,
    })));
  }

  // 2. Validate — Soil Profile
  const soilVal = validateSoilProfile(input.soilProfile);
  if (!soilVal.isValid) {
    return failResult(soilVal.errors.map(e => ({
      field: e.field, message: e.message, code: e.code,
    })));
  }

  // 3. Validate — Structure
  const structVal = validateStructure(input.structure);
  if (!structVal.isValid) {
    return failResult(structVal.errors.map(e => ({
      field: e.field, message: e.message, code: e.code,
    })));
  }

  // 4. Execute Calculation (pure function — no side effects)
  let fullResult: FullAnalysisResult;
  try {
    fullResult = runAnalysis({
      project: input.project,
      soilProfile: input.soilProfile,
      structure: input.structure,
      threat: input.threat,
      bomb: input.bomb,
      settings: input.settings,
    });
  } catch (err) {
    return {
      success: false,
      fullResult: null,
      domainResult: null,
      report: null,
      errors: [`خطأ في الحسابات: ${err instanceof Error ? err.message : String(err)}`],
      validationErrors: [],
    };
  }

  // 5. Convert to domain model for storage
  const domainResult = toDomainResult(fullResult);

  // 6. Structural Design (optional — only when designCriteria provided)
  let designResult: DesignResult | null = null;
  if (input.designCriteria) {
    try {
      designResult = runDesignCalculation(fullResult, input.designCriteria);
    } catch (err) {
      // Design failure does not fail the pipeline — analysis results are still valid.
      // The design error is reported but the pipeline succeeds.
      const designErrorMsg = `خطأ في التصميم الإنشائي: ${err instanceof Error ? err.message : String(err)}`;
      return {
        success: true,
        fullResult,
        domainResult,
        report: generateReport(fullResult, null), // Report without design
        designResult: null,
        errors: [designErrorMsg],
        validationErrors: [],
      };
    }
  }

  // 7. Generate engineering report (after design — so design section can be included)
  const report = generateReport(fullResult, designResult);

  return {
    success: true,
    fullResult,
    domainResult,
    report,
    designResult,
    errors: [],
    validationErrors: [],
  };
}

// ─── Helpers ─────────────────────────────────────────────────────
function failResult(validationErrors: Array<{ field: string; message: string; code: string }>): PipelineResult {
  return {
    success: false,
    fullResult: null,
    domainResult: null,
    report: null,
    designResult: null,
    errors: ['فشل التحقق من صحة المدخلات'],
    validationErrors,
  };
}