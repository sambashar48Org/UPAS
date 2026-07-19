/**
 * UPAS — Audit Export Package Generator
 * Phase 5B: Professional Engineering Review Package
 *
 * Generates an engineering audit package as a structured data object
 * that can be rendered into PDF/HTML by the UI layer.
 *
 * The audit package organizes the complete design documentation into
 * separate, independently reviewable sections:
 *   1. Inputs          — All design inputs with sources
 *   2. Blast Response  — Blast trace with equation references
 *   3. Structural Design — Per-element calculation sheets
 *   4. Verification    — Capacity verification tables
 *   5. Equation Ref    — All equations with standards references
 *   6. Assumptions     — All design assumptions with impact
 *
 * ARCHITECTURE RULE:
 *   This module does NOT perform calculations.
 *   It only formats and organizes data from DesignInput, DesignResult,
 *   equation-registry, and design-assumptions.
 */

import type {
  DesignInput,
  DesignResult,
} from './types';

import type { ReportSection } from '../reports';
import { generateCalculationTraceReport, generateElementTraceSheet } from './calculation-trace-report';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** A single audit document within the package */
export interface AuditDocument {
  /** Document identifier (e.g. 'inputs', 'blast-response') */
  id: string;

  /** Document title (Arabic) */
  titleAr: string;

  /** Document title (English) */
  titleEn: string;

  /** Report sections comprising this document */
  sections: ReportSection[];
}

/** The complete audit package */
export interface AuditPackage {
  /** Project identifier */
  projectId: string;

  /** Timestamp of package generation */
  generatedAt: string;

  /** UPAS version/phase identifier */
  version: string;

  /** Individual documents in the package */
  documents: AuditDocument[];

  /** Total number of equations referenced */
  equationCount: number;

  /** Total number of assumptions documented */
  assumptionCount: number;

  /** Design status */
  designStatus: string;
}

// ═══════════════════════════════════════════════════════════════════════
// AUDIT PACKAGE GENERATOR
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate the complete Engineering Audit Package.
 *
 * @param projectId    - Project identifier string
 * @param designInput  - Design engine input
 * @param designResult - Design engine result
 * @returns Structured audit package ready for rendering/export
 */
export function generateAuditPackage(
  projectId: string,
  designInput: DesignInput,
  designResult: DesignResult,
): AuditPackage {
  const generatedAt = new Date().toISOString();
  const allSections = generateCalculationTraceReport(designInput, designResult);

  // Split trace report sections into logical audit documents
  const inputsDoc: ReportSection[] = allSections.filter(s => s.id === 'calc-design-inputs');
  const blastDoc: ReportSection[] = allSections.filter(s => s.id === 'calc-blast-trace');
  const demandDoc: ReportSection[] = allSections.filter(s => s.id === 'calc-demand-trace');
  const verificationDoc: ReportSection[] = allSections.filter(s => s.id === 'calc-verification-table');
  const equationRefDoc: ReportSection[] = allSections.filter(s => s.id === 'calc-equation-reference');
  const assumptionsDoc: ReportSection[] = allSections.filter(s => s.id === 'calc-assumptions');

  // Generate per-element calculation sheets
  const elementSheets: ReportSection[] = [];
  for (const key of ['roof', 'wall', 'floor'] as const) {
    elementSheets.push(generateElementTraceSheet(key, designInput, designResult));
  }

  const documents: AuditDocument[] = [
    {
      id: 'inputs',
      titleAr: 'مدخلات التصميم',
      titleEn: 'Design Inputs',
      sections: inputsDoc,
    },
    {
      id: 'blast-response',
      titleAr: 'الاستجابة الانفجارية',
      titleEn: 'Blast Response',
      sections: blastDoc,
    },
    {
      id: 'structural-design',
      titleAr: 'التصميم الإنشائي',
      titleEn: 'Structural Design',
      sections: [...demandDoc, ...elementSheets],
    },
    {
      id: 'verification',
      titleAr: 'التحقق من القدرة',
      titleEn: 'Capacity Verification',
      sections: verificationDoc,
    },
    {
      id: 'equation-references',
      titleAr: 'مراجع المعادلات',
      titleEn: 'Equation References',
      sections: equationRefDoc,
    },
    {
      id: 'assumptions',
      titleAr: 'افتراضات التصميم',
      titleEn: 'Design Assumptions',
      sections: assumptionsDoc,
    },
  ];

  return {
    projectId,
    generatedAt,
    version: 'UPAS Phase 5B — Professional Engineering Review Package',
    documents,
    equationCount: 27, // EQUATION_REGISTRY.length
    assumptionCount: 25, // DESIGN_ASSUMPTIONS.length
    designStatus: designResult.designStatus,
  };
}

/**
 * Get a flat list of all report sections in the audit package.
 * Useful for rendering a single combined audit report.
 */
export function getAuditPackageSections(auditPackage: AuditPackage): ReportSection[] {
  return auditPackage.documents.flatMap(doc => doc.sections);
}

/**
 * Get a summary of the audit package for display.
 */
export function getAuditPackageSummary(auditPackage: AuditPackage): {
  documentCount: number;
  totalSections: number;
  documents: { id: string; titleEn: string; sectionCount: number }[];
} {
  const documents = auditPackage.documents.map(doc => ({
    id: doc.id,
    titleEn: doc.titleEn,
    sectionCount: doc.sections.length,
  }));

  return {
    documentCount: auditPackage.documents.length,
    totalSections: auditPackage.documents.reduce((sum, doc) => sum + doc.sections.length, 0),
    documents,
  };
}