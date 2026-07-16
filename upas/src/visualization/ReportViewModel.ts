/**
 * UPAS — Report View Model Types
 * Sprint 3B: Pre-formatted report data for ReportViewer.
 *
 * ReportViewer reads ONLY these types — never ReportSection from calculations.
 */

export interface ReportSectionVM {
  id: string;
  titleAr: string;
  titleEn: string;
  content: ReportContentVM[];
  severity: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
  severityColor: string;
}

export type ReportContentVM =
  | { type: 'paragraph'; textAr: string; textEn: string }
  | { type: 'key-value'; keyAr: string; keyEn: string; value: string; unit?: string }
  | { type: 'table'; headers: string[]; rows: string[][]; captionAr?: string; captionEn?: string }
  | { type: 'list'; itemsAr: string[]; itemsEn: string[] }
  | { type: 'divider' };

export interface ReportViewModel {
  sections: ReportSectionVM[];
  projectName: string;
  calculatedAt: string;
  analysisType: string;
  protectionLevel: string;
  protectionLevelAr: string;
  protectionColor: string;
}