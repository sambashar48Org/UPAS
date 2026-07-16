/**
 * UPAS — Visualization Settings Model
 * Controls 3D scene appearance and display options
 */

import { v4 as uuidv4 } from 'uuid';

export interface VisualizationSettings {
  id: string;
  projectId: string;

  // Scene display
  showGrid: boolean;
  showAxes: boolean;
  showDimensions: boolean;
  showLabels: boolean;

  // Visibility toggles
  showSoilLayers: boolean;
  showStructure: boolean;
  showThreat: boolean;
  showBlastRadius: boolean;
  showPressureContours: boolean;
  showWaterTable: boolean;

  // Transparency
  soilTransparency: number; // 0–1
  structureTransparency: number; // 0–1

  // Camera
  cameraPreset: CameraPreset;

  // Units display
  displayUnits: 'metric' | 'imperial';
}

export type CameraPreset =
  | 'perspective'
  | 'top'
  | 'front'
  | 'side'
  | 'iso';

/**
 * Factory: create default visualization settings
 */
export function createVisualizationSettings(
  partial?: Partial<VisualizationSettings>
): VisualizationSettings {
  return {
    id: uuidv4(),
    projectId: partial?.projectId ?? '',
    showGrid: partial?.showGrid ?? true,
    showAxes: partial?.showAxes ?? true,
    showDimensions: partial?.showDimensions ?? true,
    showLabels: partial?.showLabels ?? true,
    showSoilLayers: partial?.showSoilLayers ?? true,
    showStructure: partial?.showStructure ?? true,
    showThreat: partial?.showThreat ?? true,
    showBlastRadius: partial?.showBlastRadius ?? false,
    showPressureContours: partial?.showPressureContours ?? false,
    showWaterTable: partial?.showWaterTable ?? true,
    soilTransparency: partial?.soilTransparency ?? 0.7,
    structureTransparency: partial?.structureTransparency ?? 0.3,
    cameraPreset: partial?.cameraPreset ?? 'perspective',
    displayUnits: partial?.displayUnits ?? 'metric',
  };
}