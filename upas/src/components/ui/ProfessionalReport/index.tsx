/**
 * UPAS — Professional Engineering Report View
 * Phase 5C-2: Complete professional report with all 10 sections
 *
 * Reads from:
 *   - ProfessionalReportData (generated from frozen engine output)
 *   - Phase 5B audit registries
 *
 * Sections:
 *   1. Cover Page
 *   2. Design Basis
 *   3. Threat Summary
 *   4. Blast Parameters
 *   5. Structural Response (diagram + trace)
 *   6. Design Results Table
 *   7. Verification Matrix
 *   8. Critical Elements
 *   9. Warnings / Limitations
 *  10. Engineering Audit Appendix
 */

import React, { useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { buildDesignInput } from '../../../calculations/design/design-input-adapter';
import { generateProfessionalReport } from '../../../calculations/design/professional-report';
import { generateCalculationTraceReport } from '../../../calculations/design/calculation-trace-report';
import type { ProfessionalReportData } from '../../../calculations/design/professional-report';
import VerificationMatrix from './VerificationMatrix';
import StructuralDiagram from './StructuralDiagram';

// ═══════════════════════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════════════════════

const sectionBorder = 'var(--upas-border)';
const textPrimary = 'var(--upas-text-primary)';
const textSecondary = 'var(--upas-text-secondary)';

function SectionCard({
  title,
  children,
  badge,
  badgeColor,
}: {
  title: string;
  children: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: sectionBorder }}>
      <div
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: sectionBorder, backgroundColor: 'var(--upas-bg-primary, #f8fafc)' }}
      >
        <h3 className="text-xs font-bold" style={{ color: textPrimary }}>{title}</h3>
        {badge && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: (badgeColor ?? '#64748b') + '15', color: badgeColor ?? '#64748b' }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function KVRow({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-0.5 text-[11px]">
      <span style={{ color: textSecondary }}>{label}</span>
      <span className="font-mono font-medium" style={{ color: color ?? textPrimary }}>
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function ProfessionalReport() {
  const lastFullResult = useProjectStore((s) => s.lastFullResult);
  const lastDesignResult = useProjectStore((s) => s.lastDesignResult);
  const currentProject = useProjectStore((s) => s.currentProject);

  const report = useMemo<ProfessionalReportData | null>(() => {
    if (!lastDesignResult || !lastFullResult) return null;
    try {
      const designInput = buildDesignInput(lastFullResult);
      return generateProfessionalReport(
        lastDesignResult,
        designInput,
        lastFullResult,
        currentProject?.name ?? 'مشروع بدون اسم',
      );
    } catch {
      return null;
    }
  }, [lastDesignResult, lastFullResult, currentProject]);

  if (!report) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="text-2xl mb-3 opacity-30">📋</div>
        <p className="text-sm" style={{ color: textSecondary }}>
          شغّل التحليل مع التصميم الإنشائي لعرض التقرير المهني
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" dir="rtl">
      <div className="p-4 space-y-3 max-w-3xl mx-auto">
        {/* ═══ 1. COVER PAGE ═══ */}
        <div
          className="border-2 rounded-xl p-5 text-center"
          style={{ borderColor: report.statusColor + '40', backgroundColor: report.statusColor + '06' }}
        >
          <div className="text-[10px] font-mono mb-1" style={{ color: textSecondary }}>
            UPAS — Underground Protective Structure Analysis
          </div>
          <h2 className="text-base font-bold mb-1" style={{ color: textPrimary }}>
            التقرير الهندسي الاحترافي
          </h2>
          <h3 className="text-sm font-medium mb-3" style={{ color: report.statusColor }}>
            {report.projectName}
          </h3>
          <div className="flex justify-center gap-4 text-[10px] mb-3" style={{ color: textSecondary }}>
            <span>{report.calculatedAt}</span>
            <span>|</span>
            <span>نمط التصميم: {report.designMode === 'standard' ? 'قياسي' : 'متقدم'}</span>
          </div>
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: report.statusColor + '18', color: report.statusColor }}
          >
            {report.designStatus === 'PASS' && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4.5 7L6.5 9L9.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {report.designStatus !== 'PASS' && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 5L9 9M9 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
            {report.statusLabelAr}
          </div>
          <div className="mt-2 text-[10px]" style={{ color: textSecondary }}>
            العنصر الحاكم: {report.governingElementAr} — النمط الحاكم: {report.governingMode}
          </div>
        </div>

        {/* ═══ 2. DESIGN BASIS ═══ */}
        <SectionCard title="أساس التصميم" badge={`${report.assumptionCount} افتراض`} badgeColor="#3b82f6">
          <div className="grid grid-cols-1 gap-0.5">
            {report.designBasis.map((row, i) => (
              <div key={i} className="flex justify-between items-center py-0.5 text-[11px]">
                <span style={{ color: textSecondary }}>{row.item}</span>
                <span className="font-mono font-medium" style={{ color: textPrimary }}>{row.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ═══ 3. THREAT SUMMARY ═══ */}
        <SectionCard title="ملخص التهديد">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <KVRow label="كتلة TNT المكافئة" value={report.threat.tntEquivalent.toFixed(1)} unit="kg" />
            <KVRow label="مسافة الوقوف" value={report.threat.standoff.toFixed(1)} unit="m" />
            <KVRow label="المسافة المقيسة Z" value={report.threat.scaledDistance.toFixed(3)} unit="m/kg^⅓" />
            <KVRow label="نوع الانفجار" value={report.threat.detonationTypeAr} />
          </div>
        </SectionCard>

        {/* ═══ 4. BLAST PARAMETERS ═══ */}
        <SectionCard title="معاملات الانفجار">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <KVRow label="الضغط الحادث الأقصى" value={report.blast.incidentPressure.toFixed(1)} unit="kPa" />
            <KVRow label="الضغط المنعكس الأقصى" value={report.blast.reflectedPressure.toFixed(1)} unit="kPa" />
            <KVRow label="الضغط الديناميكي" value={report.blast.dynamicPressure.toFixed(1)} unit="kPa" />
            <KVRow label="معامل الانعكاس" value={report.blast.reflectionCoefficient.toFixed(2)} />
            <KVRow label="مدة الطور الموجب" value={report.blast.duration.toFixed(2)} unit="ms" />
            <KVRow label="الدافع" value={report.blast.impulse.toFixed(1)} unit="kPa·ms" />
          </div>
        </SectionCard>

        {/* ═══ 5. STRUCTURAL RESPONSE (DIAGRAM + TRACE) ═══ */}
        <SectionCard title="الاستجابة الإنشائية" badge="مقطع عرضي" badgeColor="#8b5cf6">
          <StructuralDiagram
            roof={report.elements.roof}
            wall={report.elements.wall}
            floor={report.elements.floor}
            governingElement={report.governingElement as 'roof' | 'wall' | 'floor'}
          />

          {/* Per-element SDOF trace */}
          <div className="mt-3 space-y-2">
            {(['roof', 'wall', 'floor'] as const).map((key) => {
              const el = report.elements[key];
              const isGov = key === report.governingElement;
              return (
                <div
                  key={key}
                  className="border rounded p-2"
                  style={{
                    borderColor: isGov ? '#f59e0b' : sectionBorder,
                    backgroundColor: isGov ? '#f59e0b06' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold" style={{ color: textPrimary }}>
                      {el.label}
                      {isGov && <span className="text-[9px] font-normal mr-1" style={{ color: '#b45309' }}>(حاكم)</span>}
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: el.overallPass ? '#22c55e20' : '#dc262620',
                        color: el.overallPass ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {el.overallPass ? 'ناجح' : 'فاشل'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                    <KVRow label="السماكة المطلوبة" value={el.requiredThickness.toFixed(0)} unit="mm"
                      color={el.existingThickness >= el.requiredThickness ? '#22c55e' : '#dc2626'} />
                    <KVRow label="عزم الانحناء Mu" value={el.designMoment.toFixed(1)} unit="kN·m/m" />
                    <KVRow label="قوة القص Vu" value={el.designShear.toFixed(1)} unit="kN/m" />
                    <KVRow label="التسليح المطلوب As" value={el.requiredAs.toFixed(0)} unit="mm²/m" />
                    <KVRow label="SF الانحناء" value={el.flexuralSF.toFixed(2)}
                      color={el.flexuralSF >= 1.0 ? '#22c55e' : '#dc2626'} />
                    <KVRow label="SF القص" value={el.shearSF.toFixed(2)}
                      color={el.shearSF >= 1.0 ? '#22c55e' : '#dc2626'} />
                    <KVRow label="التسليح" value={`${el.barDiameter}mm @ ${el.barSpacing}mm`} />
                    <KVRow label="As المقدمة" value={el.providedAs.toFixed(0)} unit="mm²/m"
                      color={el.providedAs >= el.requiredAs ? '#22c55e' : '#dc2626'} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* ═══ 6. DESIGN RESULTS TABLE ═══ */}
        <SectionCard title="جدول نتائج التصميم">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr style={{ backgroundColor: 'var(--upas-bg-primary, #f8fafc)' }}>
                  <th className="px-2 py-1.5 border text-right" style={{ borderColor: sectionBorder }}>العنصر</th>
                  <th className="px-2 py-1.5 border text-center" style={{ borderColor: sectionBorder }}>السماكة (mm)</th>
                  <th className="px-2 py-1.5 border text-center" style={{ borderColor: sectionBorder }}>التسليح</th>
                  <th className="px-2 py-1.5 border text-center" style={{ borderColor: sectionBorder }}>SF انحناء</th>
                  <th className="px-2 py-1.5 border text-center" style={{ borderColor: sectionBorder }}>SF قص</th>
                  <th className="px-2 py-1.5 border text-center" style={{ borderColor: sectionBorder }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(['roof', 'wall', 'floor'] as const).map((key) => {
                  const el = report.elements[key];
                  return (
                    <tr key={key}>
                      <td className="px-2 py-1 border font-medium" style={{ borderColor: sectionBorder, color: textPrimary }}>
                        {el.label}
                      </td>
                      <td className="px-2 py-1 border text-center font-mono" style={{ borderColor: sectionBorder }}>
                        {el.requiredThickness.toFixed(0)}
                      </td>
                      <td className="px-2 py-1 border text-center font-mono" style={{ borderColor: sectionBorder }}>
                        {el.barDiameter}@{el.barSpacing}
                      </td>
                      <td
                        className="px-2 py-1 border text-center font-mono font-medium"
                        style={{ borderColor: sectionBorder, color: el.flexuralSF >= 1.0 ? '#16a34a' : '#dc2626' }}
                      >
                        {el.flexuralSF.toFixed(2)}
                      </td>
                      <td
                        className="px-2 py-1 border text-center font-mono font-medium"
                        style={{ borderColor: sectionBorder, color: el.shearSF >= 1.0 ? '#16a34a' : '#dc2626' }}
                      >
                        {el.shearSF.toFixed(2)}
                      </td>
                      <td className="px-2 py-1 border text-center" style={{ borderColor: sectionBorder }}>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: el.overallPass ? '#22c55e20' : '#dc262620',
                            color: el.overallPass ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {el.overallPass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* ═══ 7. VERIFICATION MATRIX ═══ */}
        <SectionCard
          title="مصفوفة التحقق"
          badge={report.designStatus}
          badgeColor={report.statusColor}
        >
          <VerificationMatrix
            matrix={report.verificationMatrix}
            governingElement={report.governingElement as 'roof' | 'wall' | 'floor'}
          />
        </SectionCard>

        {/* ═══ 8. CRITICAL ELEMENTS ═══ */}
        <SectionCard
          title="العنصر الحاكم — التفاصيل"
          badge={report.criticalElement.label}
          badgeColor="#f59e0b"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <KVRow label="العنصر" value={report.criticalElement.label} />
            <KVRow label="النمط الحاكم" value={report.criticalElement.governingMode} />
            <KVRow label="SF الانحناء" value={report.criticalElement.flexuralSF.toFixed(3)}
              color={report.criticalElement.flexuralSF >= 1.0 ? '#22c55e' : '#dc2626'} />
            <KVRow label="SF القص" value={report.criticalElement.shearSF.toFixed(3)}
              color={report.criticalElement.shearSF >= 1.0 ? '#22c55e' : '#dc2626'} />
            <KVRow label="SF الاختراق" value={report.criticalElement.penetrationSF.toFixed(3)}
              color={report.criticalElement.penetrationSF >= 1.0 ? '#22c55e' : '#dc2626'} />
            <KVRow label="نسبة الانحراف" value={report.criticalElement.deflectionRatio.toFixed(4)} />
          </div>
        </SectionCard>

        {/* ═══ 9. WARNINGS / LIMITATIONS ═══ */}
        {report.warnings.length > 0 && (
          <SectionCard
            title="التحذيرات والقيود"
            badge={`${report.warnings.length}`}
            badgeColor="#f59e0b"
          >
            <ul className="space-y-1.5">
              {report.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 shrink-0">
                    <path d="M6 1L11 10H1L6 1Z" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1" />
                    <line x1="6" y1="4.5" x2="6" y2="7" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx="6" cy="8.5" r="0.5" fill="#f59e0b" />
                  </svg>
                  <span style={{ color: textPrimary }}>{w}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {/* ═══ 10. ENGINEERING AUDIT APPENDIX ═══ */}
        <SectionCard
          title="ملحق التدقيق الهندسي"
          badge="Phase 5B"
          badgeColor="#6366f1"
        >
          <div className="text-[11px] space-y-1.5 mb-3" style={{ color: textPrimary }}>
            <p>
              تم إعداد هذا التصميم باستخدام {report.equationCount} معادلة هندسية مسجلة
              و {report.assumptionCount} افتراض تصميمي موثق.
              جميع المعادلات مجمدة ومستقرة عبر {report.equationCategories.length} فئات.
            </p>
          </div>

          {/* Equation categories */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {report.equationCategories.map((cat) => (
              <span
                key={cat}
                className="text-[9px] px-2 py-0.5 rounded-full border font-mono"
                style={{ borderColor: '#6366f140', color: '#6366f1', backgroundColor: '#6366f108' }}
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Critical assumptions */}
          {report.criticalAssumptions.length > 0 && (
            <div>
              <div className="text-[10px] font-bold mb-1" style={{ color: textSecondary }}>
                الافتراضات الحرجة (Critical):
              </div>
              <div className="space-y-1">
                {report.criticalAssumptions.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-[10px]">
                    <span className="font-mono px-1 rounded" style={{ backgroundColor: '#ef444410', color: '#dc2626' }}>
                      {a.id}
                    </span>
                    <span style={{ color: textPrimary }}>{a.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}