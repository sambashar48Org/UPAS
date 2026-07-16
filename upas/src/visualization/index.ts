/**
 * UPAS — Visualization Layer Exports
 * Sprint 3B: Adapter + ViewModel barrel
 */

// 3D Visualization
export type { VisualizationModel, DamageZoneVM, ThreatObjectVM, PressureContourVM, StressRegionVM } from './VisualizationModel';
export { buildVisualizationModel } from './VisualizationAdapter';

// Results Panel
export type { ResultViewModel, ResultSummaryVM, BlastResultVM, SSIResultVM, StructureResponseVM, PenetrationResultVM, WarningVM } from './ResultViewModel';
export { buildResultViewModel } from './ResultAdapter';

// Report Viewer
export type { ReportViewModel, ReportSectionVM, ReportContentVM } from './ReportViewModel';
export { buildReportViewModel } from './ReportAdapter';