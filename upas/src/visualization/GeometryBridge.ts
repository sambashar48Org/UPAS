/**
 * UPAS — Geometry Bridge
 * Sprint 3C: Converts FullAnalysisResult → geometry-related VisualizationModel fields.
 *
 * This adapter fills the gap between the calculation engine's geometry results
 * and the 3D visualization. It computes threat path, crater, and annotations
 * from the FullAnalysisResult input data + visualization damage zones.
 *
 * Architecture Rule:
 *   FullAnalysisResult → GeometryBridge → ThreatPathVM / CraterVM / EngineeringAnnotationVM
 *   NO modification to src/calculations/ required.
 */

import type { FullAnalysisResult } from '../calculations/types';
import type { ThreatPathVM, CraterVM, StressOverlayVM, EngineeringAnnotationVM } from './VisualizationModel';

// ─── Main Bridge Function ────────────────────────────────────────

export function buildGeometryData(result: FullAnalysisResult): {
  threatPath: ThreatPathVM;
  crater: CraterVM | null;
  stressOverlay: StressOverlayVM;
  annotations: EngineeringAnnotationVM[];
} {
  const threatPath = buildThreatPath(result);
  const crater = buildCrater(result);
  const stressOverlay = buildStressOverlay(result);
  const annotations = buildAnnotations(result, threatPath);

  return { threatPath, crater, stressOverlay, annotations };
}

// ─── Threat Path ─────────────────────────────────────────────────

function buildThreatPath(result: FullAnalysisResult): ThreatPathVM {
  const tPos = result.input.threat.position;
  const sPos = result.input.structure.position;

  const dx = sPos.x - tPos.x;
  const dy = sPos.y - tPos.y;
  const dz = sPos.z - tPos.z;

  const distToCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const mag = distToCenter > 0 ? distToCenter : 1;

  // Estimate distance to surface by subtracting half the structure extent
  // along the threat direction (same approach as calculations/geometry)
  const dir = { x: dx / mag, y: dy / mag, z: dz / mag };
  const s = result.input.structure;
  const halfExtent =
    (Math.abs(dir.x) * s.length) / 2 +
    (Math.abs(dir.y) * s.height) / 2 +
    (Math.abs(dir.z) * s.width) / 2;

  const distanceToSurface = Math.max(distToCenter - halfExtent, 0);

  // Compute end point (on structure surface)
  const endX = tPos.x + dir.x * (distToCenter - halfExtent);
  const endY = tPos.y + dir.y * (distToCenter - halfExtent);
  const endZ = tPos.z + dir.z * (distToCenter - halfExtent);

  return {
    start: [tPos.x, tPos.y, tPos.z],
    end: [endX, endY, endZ],
    direction: [dir.x, dir.y, dir.z],
    distanceToCenter: distToCenter,
    distanceToSurface,
    color: '#ef4444',
    label: `المسافة: ${distanceToSurface.toFixed(1)} m`,
  };
}

// ─── Crater ──────────────────────────────────────────────────────

function buildCrater(result: FullAnalysisResult): CraterVM | null {
  // Look for crater data from damage zones and penetration results
  const craterZone = result.visualization.damageZones.find(dz => dz.type === 'crater');
  if (!craterZone) return null;

  // Get crater dimensions from penetration data if available
  let craterDepth = craterZone.radius * 0.3; // rough estimate: depth ≈ 30% of radius
  let craterRadius = craterZone.radius;

  // Use penetration data for more accurate dimensions
  const roofPen = result.penetration.roofPenetration;
  if (roofPen && (roofPen.craterDiameter > 0 || roofPen.craterDepth > 0)) {
    craterRadius = roofPen.craterDiameter > 0 ? roofPen.craterDiameter / 2 : craterZone.radius;
    craterDepth = roofPen.craterDepth > 0 ? roofPen.craterDepth : craterZone.radius * 0.3;
  }

  // Crater position: at the threat location (where explosion occurs)
  const tPos = result.input.threat.position;

  return {
    position: [tPos.x, tPos.y, tPos.z],
    radius: craterRadius,
    depth: craterDepth,
    color: '#7c2d12',
    borderColor: '#dc2626',
    label: `الحفرة: ⌀${(craterRadius * 2).toFixed(2)} m`,
  };
}

// ─── Stress Overlay ──────────────────────────────────────────────

function buildStressOverlay(result: FullAnalysisResult): StressOverlayVM {
  const regions = result.visualization.structureStressRegions;
  if (!regions.length) {
    return {
      elementColors: { roof: '#a8b5c4', wall: '#a8b5c4', floor: '#a8b5c4' },
      hasData: false,
    };
  }

  const colorMap: Record<string, string> = {
    safe: '#22c55e',
    warning: '#eab308',
    critical: '#f97316',
    failed: '#dc2626',
  };

  const defaultColor = '#a8b5c4';
  const colors = { roof: defaultColor, wall: defaultColor, floor: defaultColor };

  for (const sr of regions) {
    colors[sr.element] = colorMap[sr.status] ?? defaultColor;
  }

  return { elementColors: colors, hasData: true };
}

// ─── Engineering Annotations ─────────────────────────────────────

function buildAnnotations(
  result: FullAnalysisResult,
  path: ThreatPathVM,
): EngineeringAnnotationVM[] {
  const anns: EngineeringAnnotationVM[] = [];
  const s = result.input.structure;
  const blast = result.blast.parameters;

  // 1. Burial depth annotation (above structure roof)
  const topY = -s.burialDepth;
  anns.push({
    type: 'burial-depth',
    position: [s.length / 2 + 0.5, topY / 2, 0],
    label: 'عمق الدفن',
    value: `${s.burialDepth.toFixed(1)} m`,
    color: '#1e3a5f',
  });

  // 2. Scaled distance (midpoint of threat path)
  if (blast && blast.scaledDistance < Infinity) {
    const mid: [number, number, number] = [
      (path.start[0] + path.end[0]) / 2,
      (path.start[1] + path.end[1]) / 2 + 0.5,
      (path.start[2] + path.end[2]) / 2,
    ];
    anns.push({
      type: 'scaled-distance',
      position: mid,
      label: 'المسافة المقيسة Z',
      value: `Z = ${blast.scaledDistance.toFixed(2)} m/kg^(1/3)`,
      color: '#7c3aed',
    });
  }

  // 3. Soil cover thickness annotation
  anns.push({
    type: 'soil-cover',
    position: [-s.length / 2 - 0.5, topY / 2, 0],
    label: 'الغطاء الترابي',
    value: `${s.burialDepth.toFixed(1)} m`,
    color: '#b45309',
  });

  // 4. Safety factor annotations per element
  const elementLabelAr: Record<string, string> = {
    roof: 'السقف',
    wall: 'الجدران',
    floor: 'الأرضية',
  };
  const elementYOffsets: Record<string, number> = {
    roof: s.height / 2,
    wall: 0,
    floor: -s.height / 2,
  };

  const responses = [
    result.blast.roofResponse,
    result.blast.wallResponse,
    result.blast.floorResponse,
  ];

  for (let i = 0; i < responses.length; i++) {
    const resp = responses[i];
    if (!resp) continue;
    const elem = resp.element;
    const sf = resp.safetyFactor;
    const color = sf >= 1.5 ? '#22c55e' : sf >= 1.2 ? '#eab308' : sf >= 1.0 ? '#f97316' : '#dc2626';
    anns.push({
      type: 'safety-factor',
      position: [
        -s.length / 2 - 0.8,
        -s.burialDepth - s.height / 2 + (elementYOffsets[elem] ?? 0),
        0,
      ],
      label: elementLabelAr[elem],
      value: `SF = ${sf.toFixed(2)}`,
      color,
    });
  }

  // 5. Crater radius annotation
  const crater = result.visualization.damageZones.find(dz => dz.type === 'crater');
  if (crater) {
    anns.push({
      type: 'crater-radius',
      position: [path.start[0], path.start[1] - 0.5, path.start[2]],
      label: 'قطر الحفرة',
      value: `⌀${(crater.radius * 2).toFixed(2)} m`,
      color: '#dc2626',
    });
  }

  return anns;
}