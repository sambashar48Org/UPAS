/**
 * UPAS — Professional Engineering Report View
 * Phase 5C-2 + 5E: Complete professional report with all sections,
 * Table of Contents, Report Branding, and Export capabilities
 *
 * Reads from:
 *   - ProfessionalReportData (generated from frozen engine output)
 *   - Phase 5B audit registries
 *   - Settings store (branding)
 *
 * Architecture Rule: This component is READ-ONLY.
 * It calls generateProfessionalReport() which only transforms data, never recalculates.
 */

import React, { useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { buildDesignInput } from '../../../calculations/design/design-input-adapter';
import { generateProfessionalReport } from '../../../calculations/design/professional-report';
import type { ProfessionalReportData } from '../../../calculations/design/professional-report';
import { openPrintView, type PrintOptions } from '../../../services/print-service';
import { generateExportBundle, type ExportBundleOptions } from '../../../services/export-bundle';
import { getVersionInfo } from '../../../services/version';
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
  sectionNum,
  children,
  badge,
  badgeColor,
  printBreak,
}: {
  title: string;
  sectionNum?: string;
  children: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  printBreak?: boolean;
}) {
  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: sectionBorder, breakInside: printBreak === false ? 'auto' : 'avoid' } as React.CSSProperties}
    >
      <div
        className="px-3 py-2 border-b flex items-center justify-between"
        style={{ borderColor: sectionBorder, backgroundColor: 'var(--upas-bg-primary, #f8fafc)' }}
      >
        <h3 className="text-xs font-bold" style={{ color: textPrimary }}>
          {sectionNum && <span className="ml-1 opacity-40">{sectionNum}.</span>}
          {title}
        </h3>
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
// TABLE OF CONTENTS (5E-4)
// ═══════════════════════════════════════════════════════════════════════

function TableOfContents({ designStatus }: { designStatus: string }) {
  const sections = [
    { num: '1', title: 'أساس التصميم', en: 'Design Basis' },
    { num: '2', title: 'ملخص التهديد', en: 'Threat Summary' },
    { num: '3', title: 'معاملات الانفجار', en: 'Blast Parameters' },
    { num: '4', title: 'الاستجابة الإنشائية', en: 'Structural Response' },
    { num: '5', title: 'جدول نتائج التصميم', en: 'Design Results Table' },
    { num: '6', title: 'مصفوفة التحقق', en: 'Verification Matrix' },
    { num: '7', title: 'العنصر الحاكم', en: 'Critical Element' },
    { num: '8', title: 'التحذيرات والقيود', en: 'Warnings & Limitations' },
    { num: '9', title: 'ملحق التدقيق الهندسي', en: 'Engineering Audit Appendix' },
  ];

  return (
    <SectionCard title="فهرس المحتويات" badge={designStatus}
      badgeColor={designStatus === 'PASS' ? '#16a34a' : '#dc2626'}>
      <div className="space-y-0.5">
        {sections.map((s) => (
          <div key={s.num} className="flex justify-between items-center py-1 text-[11px] border-b"
            style={{ borderColor: 'var(--upas-border)', borderStyle: 'dotted', borderWidth: 0.5 }}>
            <span style={{ color: textPrimary }}>
              <span className="font-mono ml-1 opacity-40">{s.num}.</span>
              {s.title}
              <span className="text-[9px] ml-1 opacity-40">({s.en})</span>
            </span>
            <span className="font-mono text-[10px]" style={{ color: textSecondary }}>{s.num}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORT TOOLBAR (5E-1 / 5E-7 / 5E-8)
// ═══════════════════════════════════════════════════════════════════════

function ExportToolbar({ report, projectName }: { report: ProfessionalReportData; projectName: string }) {
  const settings = useSettingsStore.getState();
  const [exporting, setExporting] = React.useState(false);

  const printOptions: PrintOptions = {
    report,
    projectName,
    organizationName: settings.report.organizationName || undefined,
    engineerName: settings.report.engineerName || undefined,
    footerText: settings.report.footerText || undefined,
    showPageNumbers: settings.report.showPageNumbers,
    showDate: settings.report.showDate,
  };

  const handlePrint = () => openPrintView(printOptions);

  const handleExportBundle = async () => {
    setExporting(true);
    try {
      await generateExportBundle({
        report,
        projectData: { name: projectName, status: report.designStatus },
        printOptions,
      });
    } catch (err) {
      console.error('Export bundle failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
          transition-colors cursor-pointer hover:opacity-90 border"
        style={{ borderColor: 'var(--upas-primary)', color: 'var(--upas-primary)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        طباعة / PDF
      </button>
      <button
        onClick={handleExportBundle}
        disabled={exporting}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
          text-white transition-colors cursor-pointer hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: 'var(--upas-accent)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {exporting ? 'جاري التصدير...' : 'تصدير الحزمة الكاملة'}
      </button>
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
  const settingsOrg = useSettingsStore((s) => s.report.organizationName);
  const settingsEng = useSettingsStore((s) => s.report.engineerName);
  const versionInfo = getVersionInfo();

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

  const projectName = currentProject?.name ?? 'مشروع بدون اسم';
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="h-full overflow-y-auto" dir="rtl">
      <div className="p-4 space-y-3 max-w-3xl mx-auto">
        {/* ═══ COVER PAGE (5E-3: Branded) ═══ */}
        <div
          className="border-2 rounded-xl p-5 text-center"
          style={{ borderColor: report.statusColor + '40', backgroundColor: report.statusColor + '06' }}
        >
          {/* Branding Header */}
          <div className="flex items-center justify-between mb-3 text-[10px]" style={{ color: textSecondary }}>
            <span className="font-mono">UPAS v{versionInfo.version}</span>
            <span>{today}</span>
          </div>
          {settingsOrg && (
            <div className="text-[10px] mb-1" style={{ color: textSecondary }}>{settingsOrg}</div>
          )}

          <div className="text-[10px] font-mono mb-1" style={{ color: textSecondary }}>
            UPAS — Underground Protective Structure Analysis
          </div>
          <h2 className="text-base font-bold mb-1" style={{ color: textPrimary }}>
            التقرير الهندسي الاحترافي
          </h2>
          <h3 className="text-sm font-medium mb-2" style={{ color: report.statusColor }}>
            {projectName}
          </h3>
          {settingsEng && (
            <div className="text-[10px] mb-2" style={{ color: textSecondary }}>
              المهندس: {settingsEng}
            </div>
          )}
          <div className="flex justify-center gap-4 text-[10px] mb-3" style={{ color: textSecondary }}>
            <span>{report.calculatedAt}</span>
            <span>|</span>
            <span>نمط التصميم: قياسي (Standard Mode)</span>
          </div>
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: report.statusColor + '18', color: report.statusColor }}
          >
            {report.designStatus === 'PASS' ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4.5 7L6.5 9L9.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
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

        {/* ═══ EXPORT TOOLBAR ═══ */}
        <div className="flex items-center justify-between">
          <ExportToolbar report={report} projectName={projectName} />
          <span className="text-[10px] font-mono" style={{ color: textSecondary }}>
            {report.equationCount} معادلة — {report.assumptionCount} افتراض
          </span>
        </div>

        {/* ═══ TABLE OF CONTENTS (5E-4) ═══ */}
        <TableOfContents designStatus={report.designStatus} />

        {/* ═══ 1. DESIGN BASIS ═══ */}
        <SectionCard title="أساس التصميم" sectionNum="1" badge={`${report.assumptionCount} افتراض`} badgeColor="#3b82f6">
          <div className="grid grid-cols-1 gap-0.5">
            {report.designBasis.map((row, i) => (
              <div key={i} className="flex justify-between items-center py-0.5 text-[11px]">
                <span style={{ color: textSecondary }}>{row.item}</span>
                <span className="font-mono font-medium" style={{ color: textPrimary }}>{row.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ═══ 2. THREAT SUMMARY ═══ */}
        <SectionCard title="ملخص التهديد" sectionNum="2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <KVRow label="كتلة TNT المكافئة" value={report.threat.tntEquivalent.toFixed(1)} unit="kg" />
            <KVRow label="مسافة الوقوف" value={report.threat.standoff.toFixed(1)} unit="m" />
            <KVRow label="المسافة المقيسة Z" value={report.threat.scaledDistance.toFixed(3)} unit="m/kg^⅓" />
            <KVRow label="نوع الانفجار" value={report.threat.detonationTypeAr} />
          </div>
        </SectionCard>

        {/* ═══ 3. BLAST PARAMETERS ═══ */}
        <SectionCard title="معاملات الانفجار" sectionNum="3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <KVRow label="الضغط الحادث الأقصى Pso" value={report.blast.incidentPressure.toFixed(1)} unit="kPa" />
            <KVRow label="الضغط المنعكس الأقصى Pr" value={report.blast.reflectedPressure.toFixed(1)} unit="kPa" />
            <KVRow label="الضغط الديناميكي q" value={report.blast.dynamicPressure.toFixed(1)} unit="kPa" />
            <KVRow label="معامل الانعكاس Cr" value={report.blast.reflectionCoefficient.toFixed(2)} />
            <KVRow label="مدة الطور الموجب td" value={report.blast.duration.toFixed(2)} unit="ms" />
            <KVRow label="الدافع Impulse" value={report.blast.impulse.toFixed(1)} unit="kPa·ms" />
          </div>
        </SectionCard>

        {/* ═══ 4. STRUCTURAL RESPONSE (Enhanced Diagram 5E-5) ═══ */}
        <SectionCard title="الاستجابة الإنشائية" sectionNum="4" badge="مقطع عرضي + بيانات" badgeColor="#8b5cf6" printBreak={false}>
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

        {/* ═══ 5. DESIGN RESULTS TABLE ═══ */}
        <SectionCard title="جدول نتائج التصميم" sectionNum="5">
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

        {/* ═══ 6. VERIFICATION MATRIX ═══ */}
        <SectionCard
          title="مصفوفة التحقق"
          sectionNum="6"
          badge={report.designStatus}
          badgeColor={report.statusColor}
        >
          <VerificationMatrix
            matrix={report.verificationMatrix}
            governingElement={report.governingElement as 'roof' | 'wall' | 'floor'}
          />
        </SectionCard>

        {/* ═══ 7. CRITICAL ELEMENTS ═══ */}
        <SectionCard
          title="العنصر الحاكم — التفاصيل"
          sectionNum="7"
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

        {/* ═══ 8. WARNINGS / LIMITATIONS ═══ */}
        {report.warnings.length > 0 && (
          <SectionCard
            title="التحذيرات والقيود"
            sectionNum="8"
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

        {/* ═══ 9. ENGINEERING AUDIT APPENDIX ═══ */}
        <SectionCard
          title="ملحق التدقيق الهندسي"
          sectionNum="9"
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