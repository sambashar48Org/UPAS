/**
 * UPAS — Report Adapter
 * Sprint 3B: Converts ReportSection[] → ReportViewModel
 *
 * ReportViewer reads ReportViewModel — never ReportSection from calculations.
 */

import type { ReportSection } from '../calculations/reports';
import type { ReportViewModel, ReportSectionVM, ReportContentVM } from './ReportViewModel';

const SEVERITY_COLORS: Record<string, string> = {
  neutral: '#64748b',
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f97316',
  critical: '#dc2626',
};

const PROTECTION_LABELS: Record<string, string> = {
  safe: 'آمن',
  marginal: 'حدي',
  unsafe: 'غير آمن',
  critical: 'حرج',
};

const PROTECTION_COLORS: Record<string, string> = {
  safe: '#22c55e',
  marginal: '#eab308',
  unsafe: '#f97316',
  critical: '#dc2626',
};

export function buildReportViewModel(
  sections: ReportSection[],
  metadata: { projectName: string; calculatedAt: string; protectionLevel: string }
): ReportViewModel {
  return {
    sections: sections.map(adaptSection),
    projectName: metadata.projectName,
    calculatedAt: metadata.calculatedAt,
    analysisType: 'مدمج',
    protectionLevel: metadata.protectionLevel,
    protectionLevelAr: PROTECTION_LABELS[metadata.protectionLevel] ?? metadata.protectionLevel,
    protectionColor: PROTECTION_COLORS[metadata.protectionLevel] ?? '#94a3b8',
  };
}

function adaptSection(section: ReportSection): ReportSectionVM {
  return {
    id: section.id,
    titleAr: section.titleAr,
    titleEn: section.titleEn,
    content: section.content.map(adaptContent) as ReportContentVM[],
    severity: section.severity,
    severityColor: SEVERITY_COLORS[section.severity] ?? '#64748b',
  };
}

function adaptContent(content: ReportSection['content'][number]): ReportContentVM {
  return content as ReportContentVM;
}