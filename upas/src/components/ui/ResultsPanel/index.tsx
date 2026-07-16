/**
 * UPAS — Results Panel
 * Sprint 3B: Main results display. Reads ResultViewModel — never FullAnalysisResult.
 */

import React, { useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { buildResultViewModel } from '../../../visualization';
import { StructureResponseCard, PenetrationCard, ResultRow } from './ResultCard';
import WarningList from './WarningList';

export default function ResultsPanel() {
  const lastFullResult = useProjectStore((s) => s.lastFullResult);

  const vm = useMemo(() => {
    if (!lastFullResult) return null;
    return buildResultViewModel(lastFullResult);
  }, [lastFullResult]);

  if (!vm) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="text-2xl mb-3 opacity-30">📊</div>
        <p className="text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
          شغّل التحليل لعرض النتائج
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3" dir="rtl">
      {/* ─── Summary Card ─────────────────────────── */}
      <div
        className="border rounded-lg p-3"
        style={{ borderColor: vm.summary.statusColor, backgroundColor: vm.summary.statusColor + '08' }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold" style={{ color: vm.summary.statusColor }}>
            {vm.summary.protectionLabelAr}
          </h3>
          <span className="text-2xl font-mono font-bold" style={{ color: vm.summary.statusColor }}>
            {vm.summary.safetyFactor.toFixed(2)}
          </span>
        </div>
        <div className="text-[11px] space-y-0.5">
          <ResultRow label="العنصر الحاكم" value={vm.summary.governingElementLabelAr} />
          <ResultRow label="نمط الفشل" value={vm.summary.governingModeLabelAr} />
          <ResultRow label="المنشأ مُلائم" value={vm.summary.isAdequate ? 'نعم' : 'لا'} color={vm.summary.isAdequate ? '#22c55e' : '#dc2626'} />
        </div>
      </div>

      {/* ─── Blast Parameters ─────────────────────── */}
      {vm.blast && (
        <div className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
          <h4 className="text-[11px] font-bold mb-1.5 pb-1 border-b" style={{ color: 'var(--upas-text-secondary)', borderColor: 'var(--upas-border)' }}>
            معاملات الانفجار
          </h4>
          <ResultRow label="كتلة TNT المكافئة" value={vm.blast.tntEquivalentMass.toFixed(1)} unit="kg" />
          <ResultRow label="المسافة المقيسة Z" value={vm.blast.scaledDistance.toFixed(3)} unit="m/kg^(1/3)" />
          <ResultRow label="المسافة" value={vm.blast.distance.toFixed(1)} unit="m" />
          <ResultRow label="الضغط الحادث الأقصى" value={vm.blast.peakIncidentPressure.toFixed(1)} unit="kPa" />
          <ResultRow label="الضغط المنعكس الأقصى" value={vm.blast.peakReflectedPressure.toFixed(1)} unit="kPa" />
          <ResultRow label="الضغط الديناميكي" value={vm.blast.peakDynamicPressure.toFixed(1)} unit="kPa" />
          <ResultRow label="مدة الطور الموجب" value={vm.blast.positivePhaseDuration.toFixed(2)} unit="ms" />
          <ResultRow label="الدافع" value={vm.blast.positivePhaseImpulse.toFixed(1)} unit="kPa·ms" />
          <ResultRow label="الضغط على المنشأ" value={vm.blast.pressureAtStructure.toFixed(1)} unit="kPa" />
        </div>
      )}

      {/* ─── SSI ────────────────────────────────────── */}
      {vm.ssi && (
        <div className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
          <h4 className="text-[11px] font-bold mb-1.5 pb-1 border-b" style={{ color: 'var(--upas-text-secondary)', borderColor: 'var(--upas-border)' }}>
            التفاعل تربة-منشأ
          </h4>
          <ResultRow label="ضغط الغطاء الترابي" value={vm.ssi.overburdenPressure.toFixed(1)} unit="kPa" />
          <ResultRow label="الإجهاد الفعال" value={vm.ssi.effectiveStress.toFixed(1)} unit="kPa" />
          <ResultRow label="عامل التخفيف" value={vm.ssi.soilAttenuationFactor.toFixed(4)} />
          <ResultRow label="الضغط على المنشأ" value={vm.ssi.pressureAtStructure.toFixed(1)} unit="kPa" />
          <ResultRow label="سرعة الموجة الأرضية" value={vm.groundShockPPV.toFixed(2)} unit="m/s" />
        </div>
      )}

      {/* ─── Structure Responses ───────────────────── */}
      {vm.structureResponses.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold mb-1.5 pb-1 border-b" style={{ color: 'var(--upas-text-secondary)', borderColor: 'var(--upas-border)' }}>
            استجابة المنشأ
          </h4>
          <div className="space-y-2">
            {vm.structureResponses.map((r) => (
              <StructureResponseCard key={r.element} resp={r} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Penetration ───────────────────────────── */}
      {vm.penetrationResults.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold mb-1.5 pb-1 border-b" style={{ color: 'var(--upas-text-secondary)', borderColor: 'var(--upas-border)' }}>
            تحليل الاختراق
          </h4>
          <div className="space-y-2">
            {vm.penetrationResults.map((p) => (
              <PenetrationCard key={p.element} pen={p} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Warnings ──────────────────────────────── */}
      {vm.warnings.length > 0 && (
        <div>
          <h4 className="text-[11px] font-bold mb-1.5 pb-1 border-b" style={{ color: 'var(--upas-text-secondary)', borderColor: 'var(--upas-border)' }}>
            التحذيرات ({vm.warnings.length})
          </h4>
          <WarningList warnings={vm.warnings} />
        </div>
      )}
    </div>
  );
}