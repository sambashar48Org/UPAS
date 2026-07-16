/**
 * UPAS — Visualization Layer Exports
 * Sprint 3B: Adapter + ViewModel barrel
 * Sprint 3C: Added GeometryBridge exports
 */

// 3D Visualization
export type {
  VisualizationModel,
  DamageZoneVM,
  ThreatObjectVM,
  PressureContourVM,
  StressRegionVM,
  // Sprint 3C
  ThreatPathVM,
  CraterVM,
  StressOverlayVM,
  EngineeringAnnotationVM,
} from './VisualizationModel';
export { buildVisualizationModel } from './VisualizationAdapter';

// Geometry Bridge (Sprint 3C)
export { buildGeometryData } from './GeometryBridge';

// Results Panel
export type {
  ResultViewModel,
  ResultSummaryVM,
  BlastResultVM,
  SSIResultVM,
  StructureResponseVM,
  PenetrationResultVM,
  WarningVM,
} from './ResultViewModel';
export { buildResultViewModel } from './ResultAdapter';

// Report Viewer
export type { ReportViewModel, ReportSectionVM, ReportContentVM } from './ReportViewModel';
export { buildReportViewModel } from './ReportAdapter';