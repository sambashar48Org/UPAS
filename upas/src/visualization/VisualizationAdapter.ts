/**
 * UPAS — Visualization Adapter
 * Sprint 3B: Converts FullAnalysisResult → VisualizationModel
 *
 * This is the ONLY place where engineering status → visual style mapping happens.
 * 3D components receive pre-computed colors and never decide on styling.
 *
 * Architecture:
 *   FullAnalysisResult
 *       ↓ (this adapter)
 *   VisualizationModel
 *       ↓ (passed as props)
 *   3D Components (ThreatObject3D, DamageZones3D, etc.)
 */

import type { FullAnalysisResult } from '../calculations/types';
import type { VisualizationModel, DamageZoneVM, ThreatObjectVM, PressureContourVM, StressRegionVM } from './VisualizationModel';

// ─── Style Mapping Tables ───────────────────────────────────────

const DAMAGE_ZONE_COLORS: Record<string, { color: string; opacity: number }> = {
  crater:  { color: '#dc2626', opacity: 0.5 },
  plastic: { color: '#f97316', opacity: 0.35 },
  elastic: { color: '#eab308', opacity: 0.2 },
  safe:    { color: '#22c55e', opacity: 0.15 },
};

const STRESS_COLORS: Record<string, string> = {
  safe:     '#22c55e',
  warning:  '#eab308',
  critical: '#f97316',
  failed:   '#dc2626',
};

// ─── Main Adapter Function ──────────────────────────────────────

export function buildVisualizationModel(result: FullAnalysisResult): VisualizationModel {
  const threatPos = getThreatPosition(result);

  return {
    damageZones: mapDamageZones(result, threatPos),
    threatObject: buildThreatObject(result),
    pressureContours: mapPressureContours(result),
    stressRegions: mapStressRegions(result),
  };
}

// ─── Damage Zones ───────────────────────────────────────────────

function mapDamageZones(result: FullAnalysisResult, pos: [number, number, number]): DamageZoneVM[] {
  return result.visualization.damageZones.map(dz => {
    const style = DAMAGE_ZONE_COLORS[dz.type] ?? { color: '#94a3b8', opacity: 0.2 };
    return {
      type: dz.type,
      radius: dz.radius,
      color: style.color,
      opacity: style.opacity,
      position: pos,
      label: dz.description,
    };
  });
}

// ─── Threat Object ──────────────────────────────────────────────

function buildThreatObject(result: FullAnalysisResult): ThreatObjectVM {
  const threat = result.input.threat;
  const explosive = threat.explosive;
  const pos = getThreatPosition(result);
  const dir = result.geometry?.threatDirection ?? { x: 0, y: -1, z: 0 };

  // Estimate charge visual size from mass (assuming density ~1600 kg/m³)
  const density = explosive.density || 1600;
  const volume = explosive.chargeMass / density;
  const diameter = Math.cbrt((6 * volume) / Math.PI) * 2;

  return {
    position: pos,
    size: [
      explosive.chargeShape === 'cylindrical' && explosive.chargeDiameter
        ? explosive.chargeDiameter
        : diameter,
      explosive.chargeShape === 'cylindrical' && explosive.chargeLength
        ? explosive.chargeLength
        : diameter,
      explosive.chargeShape === 'cylindrical' && explosive.chargeDiameter
        ? explosive.chargeDiameter
        : diameter,
    ],
    color: '#ef4444',
    label: explosive.name,
    direction: [dir.x, dir.y, dir.z],
    burialDepth: threat.burialDepth ?? 0,
    chargeDiameter: explosive.chargeDiameter ?? diameter,
    chargeLength: explosive.chargeLength ?? diameter,
    chargeShape: explosive.chargeShape,
    explosiveName: explosive.name,
    chargeMassKg: explosive.chargeMass,
  };
}

// ─── Pressure Contours ──────────────────────────────────────────

function mapPressureContours(result: FullAnalysisResult): PressureContourVM[] {
  const contours = result.visualization.pressureContours;
  if (!contours.length) return [];

  // Find pressure range for color mapping
  const maxP = Math.max(...contours.map(c => c.pressure), 1);

  return contours.map(pc => ({
    radius: pc.radius,
    pressure: pc.pressure,
    color: pressureToColor(pc.pressure, maxP),
    opacity: 0.12,
  }));
}

// ─── Stress Regions ─────────────────────────────────────────────

function mapStressRegions(result: FullAnalysisResult): StressRegionVM[] {
  return result.visualization.structureStressRegions.map(sr => ({
    element: sr.element,
    stressRatio: sr.stressRatio,
    color: STRESS_COLORS[sr.status] ?? '#94a3b8',
    label: stressLabel(sr.element, sr.stressRatio),
  }));
}

// ─── Position Helpers ───────────────────────────────────────────

function getThreatPosition(result: FullAnalysisResult): [number, number, number] {
  return [
    result.input.threat.position.x,
    result.input.threat.position.y,
    result.input.threat.position.z,
  ];
}

// ─── Color Mapping Helpers ──────────────────────────────────────

function pressureToColor(pressure: number, maxPressure: number): string {
  const ratio = Math.min(pressure / maxPressure, 1);
  if (ratio > 0.75) return '#dc2626';
  if (ratio > 0.5) return '#f97316';
  if (ratio > 0.25) return '#eab308';
  return '#22c55e';
}

function stressLabel(element: string, ratio: number): string {
  const elemAr = element === 'roof' ? 'السقف' : element === 'wall' ? 'الجدران' : 'الأرضية';
  return `${elemAr} — ${ratio.toFixed(2)}`;
}