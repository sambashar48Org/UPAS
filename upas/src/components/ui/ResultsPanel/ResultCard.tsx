/**
 * UPAS — Result Card
 * Sprint 3B: Single result display card. Reads from ResultViewModel only.
 */

import React from 'react';
import type { StructureResponseVM, PenetrationResultVM } from '../../../visualization/ResultViewModel';

interface Props {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}

export function ResultRow({ label, value, unit, color }: Props) {
  return (
    <div className="flex justify-between items-center py-0.5 text-xs">
      <span style={{ color: 'var(--upas-text-secondary)' }}>{label}</span>
      <span className="font-mono font-medium" style={{ color: color ?? 'var(--upas-text-primary)' }}>
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}

export function StructureResponseCard({ resp }: { resp: StructureResponseVM }) {
  return (
    <div className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold" style={{ color: resp.statusColor }}>
          {resp.elementLabelAr}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: resp.statusColor + '20', color: resp.statusColor }}
        >
          {resp.responseModeLabelAr}
        </span>
      </div>
      <ResultRow label="معامل الأمان" value={resp.safetyFactor.toFixed(2)} color={resp.statusColor} />
      <ResultRow label="الضغط المطبق" value={resp.appliedPressure.toFixed(1)} unit="kPa" />
      <ResultRow label="المقاومة الديناميكية" value={resp.dynamicResistance.toFixed(1)} unit="kPa" />
      <ResultRow label="الإزاحة القصوى" value={resp.maxDisplacement.toFixed(1)} unit="mm" />
      <ResultRow label="دوران الدعامة" value={resp.supportRotation.toFixed(2)} unit="°" />
      <ResultRow label="الفترة الطبيعية" value={resp.naturalPeriod.toFixed(1)} unit="ms" />
    </div>
  );
}

export function PenetrationCard({ pen }: { pen: PenetrationResultVM }) {
  return (
    <div className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold" style={{ color: pen.statusColor }}>
          {pen.elementLabelAr}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: pen.statusColor + '20', color: pen.statusColor }}
        >
          {pen.statusLabelAr}
        </span>
      </div>
      <ResultRow label="عمق الاختراق" value={pen.penetrationDepthMm.toFixed(1)} unit="mm" color={pen.statusColor} />
      <ResultRow label="سماكة منع الاختراق" value={pen.perforationThicknessMm.toFixed(0)} unit="mm" />
      <ResultRow label="سماكة منع التقشر" value={pen.scabbingThicknessMm.toFixed(0)} unit="mm" />
      {pen.craterDiameter > 0 && <ResultRow label="قطر الفوهة" value={pen.craterDiameter.toFixed(2)} unit="m" />}
      {pen.craterDepth > 0 && <ResultRow label="عمق الفوهة" value={pen.craterDepth.toFixed(2)} unit="m" />}
    </div>
  );
}