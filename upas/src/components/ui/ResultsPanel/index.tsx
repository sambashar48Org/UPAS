/**
 * UPAS — Results Panel
 * Sprint 3B: Main results display. Reads ResultViewModel — never FullAnalysisResult.
 */

import React, { useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { buildResultViewModel } from '../../../visualization';
import { StructureResponseCard, PenetrationCard, ResultRow } from './ResultCard';
import WarningList from './WarningList';
import type { ElementDesignResult, ElementVerificationResult } from '../../../calculations/design/types';

export default function ResultsPanel() {
  const lastFullResult = useProjectStore((s) => s.lastFullResult);
  const lastDesignResult = useProjectStore((s) => s.lastDesignResult);

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
          <ResultRow label="سرعة الموجة الأرضية" value={vm.ssi.groundShockPPV.toFixed(2)} unit="m/s" />
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

      {/* ─── Design Results (Phase 4F) ──────────── */}
      {lastDesignResult && (
        <div>
          <h4 className="text-[11px] font-bold mb-1.5 pb-1 border-b" style={{ color: 'var(--upas-text-secondary)', borderColor: 'var(--upas-border)' }}>
            نتائج التصميم الإنشائي
          </h4>

          {/* Design status badge */}
          <div
            className="border rounded-lg p-2 mb-2"
            style={{
              borderColor: lastDesignResult.designStatus === 'PASS' ? '#22c55e'
                : lastDesignResult.designStatus === 'FAIL' ? '#dc2626' : '#f59e0b',
              backgroundColor: (lastDesignResult.designStatus === 'PASS' ? '#22c55e'
                : lastDesignResult.designStatus === 'FAIL' ? '#dc2626' : '#f59e0b') + '08',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{
                color: lastDesignResult.designStatus === 'PASS' ? '#22c55e'
                  : lastDesignResult.designStatus === 'FAIL' ? '#dc2626' : '#f59e0b',
              }}>
                {lastDesignResult.designStatus === 'PASS' ? 'التصميم ناجح' : lastDesignResult.designStatus === 'FAIL' ? 'التصميم فاشل' : 'يحتاج تحسين'}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--upas-text-secondary)' }}>
                العنصر الحاكم: {
                  lastDesignResult.governingElement === 'roof' ? 'السقف'
                    : lastDesignResult.governingElement === 'wall' ? 'الجدران' : 'الأرضية'
                }
              </span>
            </div>
          </div>

          {/* Per-element design cards */}
          {(['roof', 'wall', 'floor'] as const).map((elemKey) => {
            const el: ElementDesignResult = lastDesignResult[elemKey];
            const ver: ElementVerificationResult = lastDesignResult.verification.elements[elemKey];
            const elemLabel = elemKey === 'roof' ? 'السقف' : elemKey === 'wall' ? 'الجدران' : 'الأرضية';
            const statusColor = el.status === 'pass' ? '#22c55e' : el.status === 'fail' ? '#dc2626' : '#f59e0b';

            return (
              <div key={elemKey} className="border rounded p-2 mb-2" style={{ borderColor: 'var(--upas-border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold" style={{ color: statusColor }}>{elemLabel}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: statusColor + '20', color: statusColor }}
                  >
                    {ver.overallPass ? 'ناجح' : 'فاشل'}
                  </span>
                </div>

                {/* Thickness */}
                <ResultRow label="السماكة الحالية" value={`${(el.existingThickness * 1000).toFixed(0)}`} unit="mm" />
                <ResultRow label="السماكة المطلوبة" value={`${(el.requiredThickness * 1000).toFixed(0)}`} unit="mm"
                  color={el.existingThickness >= el.requiredThickness ? '#22c55e' : '#dc2626'} />
                <ResultRow label="السماكة الموصى بها" value={`${(el.recommendedThickness * 1000).toFixed(0)}`} unit="mm" />

                {/* Mu / Vu */}
                <ResultRow label="عزم الانحناء Mu" value={el.designMoment.toFixed(2)} unit="kN·m/m" />
                <ResultRow label="قوة القص Vu" value={el.designShear.toFixed(2)} unit="kN/m" />

                {/* Reinforcement */}
                <ResultRow label="التسليح الرئيسي" value={`${el.mainReinforcement.barDiameter}mm @ ${el.mainReinforcement.spacing}mm`} />
                <ResultRow label="As المقدمة" value={el.mainReinforcement.asProvided.toFixed(0)} unit="mm²/m" />
                <ResultRow label="As المطلوبة" value={el.requiredAs.toFixed(0)} unit="mm²/m"
                  color={el.mainReinforcement.asProvided >= el.requiredAs ? '#22c55e' : '#dc2626'} />

                {/* Safety Factors */}
                <ResultRow label="معامل أمان الانحناء" value={el.flexuralSafetyFactor.toFixed(2)}
                  color={el.flexuralSafetyFactor >= 1.0 ? '#22c55e' : '#dc2626'} />
                <ResultRow label="معامل أمان القص" value={el.shearSafetyFactor.toFixed(2)}
                  color={el.shearSafetyFactor >= 1.0 ? '#22c55e' : '#dc2626'} />

                {/* Verification checks */}
                <div className="flex gap-2 mt-1">
                  {([
                    { label: 'انحناء', pass: ver.flexuralPass },
                    { label: 'قص', pass: ver.shearPass },
                    { label: 'اختراق', pass: ver.penetrationPass },
                    { label: 'انحراف', pass: ver.deflectionPass },
                  ] as const).map((check) => (
                    <span
                      key={check.label}
                      className="text-[9px] px-1 py-0.5 rounded"
                      style={{
                        backgroundColor: check.pass ? '#22c55e20' : '#dc262620',
                        color: check.pass ? '#22c55e' : '#dc2626',
                      }}
                    >
                      {check.label}: {check.pass ? 'OK' : 'FAIL'}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
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