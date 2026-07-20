/**
 * UPAS — Export Bundle Service
 * Phase 5E-7 / 5E-8: Creates a ZIP bundle with all project deliverables
 *
 * Bundle contents:
 *   - Project.json          — Full project data
 *   - EngineeringReport.html — Self-contained HTML report (print-to-PDF ready)
 *   - AuditPackage.json     — Engineering audit package
 *   - CalculationTrace.json — Full calculation trace
 *   - Benchmarks.json       — Benchmark validation results
 *   - README.txt            — Bundle description
 *
 * Architecture: UI only — zero calculation changes.
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useSettingsStore } from '../stores/settingsStore';
import { getVersionInfo } from './version';
import type { ProfessionalReportData } from '../calculations/design/professional-report';
import type { PrintOptions } from './print-service';
import { generatePrintHTMLString } from './print-service';

// ─── Types ───────────────────────────────────────────────────────────────

export interface ExportBundleOptions {
  /** Report data */
  report: ProfessionalReportData;
  /** Project data (serializable) */
  projectData: Record<string, unknown>;
  /** Print options for the HTML report */
  printOptions: PrintOptions;
  /** Audit package data (optional) */
  auditPackage?: Record<string, unknown>;
  /** Calculation trace data (optional) */
  calculationTrace?: Record<string, unknown>;
  /** Benchmark results (optional) */
  benchmarkResults?: Record<string, unknown>;
}

export interface BundleManifest {
  version: string;
  generatedAt: string;
  files: Array<{ name: string; description: string; size: number }>;
}

// ─── Bundle Generation ───────────────────────────────────────────────────

export async function generateExportBundle(options: ExportBundleOptions): Promise<void> {
  const zip = new JSZip();
  const versionInfo = getVersionInfo();
  const timestamp = new Date().toISOString();
  const folderName = `UPAS_${options.printOptions.projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
  const folder = zip.folder(folderName)!;

  // 1. Project.json
  const projectJson = JSON.stringify(options.projectData, null, 2);
  folder.file('Project.json', projectJson);

  // 2. EngineeringReport.html (self-contained, print-to-PDF ready)
  const reportHtml = generatePrintHTMLString(options.printOptions);
  folder.file('EngineeringReport.html', reportHtml);

  // 3. AuditPackage.json
  if (options.auditPackage) {
    folder.file('AuditPackage.json', JSON.stringify(options.auditPackage, null, 2));
  }

  // 4. CalculationTrace.json
  if (options.calculationTrace) {
    folder.file('CalculationTrace.json', JSON.stringify(options.calculationTrace, null, 2));
  }

  // 5. Benchmarks.json
  if (options.benchmarkResults) {
    folder.file('Benchmarks.json', JSON.stringify(options.benchmarkResults, null, 2));
  }

  // 6. README.txt
  const readme = generateReadme(options, versionInfo, timestamp);
  folder.file('README.txt', readme);

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${folderName}.zip`);
}

// ─── README Generator ────────────────────────────────────────────────────

function generateReadme(
  options: ExportBundleOptions,
  versionInfo: ReturnType<typeof getVersionInfo>,
  timestamp: string
): string {
  const settings = useSettingsStore.getState();
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  UPAS — Export Package');
  lines.push('  Underground Protective Analysis System');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Project:    ${options.printOptions.projectName}`);
  lines.push(`Date:       ${new Date(timestamp).toLocaleDateString('ar-SA')}`);
  lines.push(`Version:    ${versionInfo.version}`);
  lines.push(`Build:      ${versionInfo.buildDate}`);
  if (settings.report.organizationName) {
    lines.push(`Organization: ${settings.report.organizationName}`);
  }
  if (settings.report.engineerName) {
    lines.push(`Engineer:   ${settings.report.engineerName}`);
  }
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('  Bundle Contents:');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('  Project.json            — Full project data (threat, structure, soil)');
  lines.push('  EngineeringReport.html  — Professional report (open in browser → Print to PDF)');
  lines.push('  AuditPackage.json       — Engineering audit package (equations + assumptions)');
  lines.push('  CalculationTrace.json   — Detailed calculation trace with all steps');
  lines.push('  Benchmarks.json         — Benchmark validation results');
  lines.push('  README.txt              — This file');
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('  Engineering Standards:');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('  UFC 3-340-02  — Structures to Resist the Effects of Accidental Explosions');
  lines.push('  TM 5-1300     — Design of Structures to Resist the Effects of Nuclear Weapons');
  lines.push('  TM 5-855-1    — Fundamentals of Protective Design for Conventional Weapons');
  lines.push('  ACI 318-19    — Building Code Requirements for Structural Concrete');
  lines.push('  Biggs SDOF    — Introduction to Structural Dynamics');
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push('  Generated by UPAS v' + versionInfo.version);
  lines.push('  Developer: Consulting Engineer Bashar Al-Sulaiman');
  lines.push('  All Rights Reserved');
  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}