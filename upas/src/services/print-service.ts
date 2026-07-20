/**
 * UPAS — Print Service
 * Phase 5E-1 / 5E-2: Professional PDF/Print export
 *
 * Strategy: Opens a new browser window with print-optimized report HTML,
 * then triggers window.print(). The user can "Save as PDF" from the browser
 * print dialog. This ensures perfect Arabic text rendering without needing
 * client-side PDF font embedding.
 *
 * Architecture: UI only — reads from stores, zero calculation changes.
 */

import type { ProfessionalReportData } from '../calculations/design/professional-report';
import { getVersionInfo } from './version';

// ─── Types ───────────────────────────────────────────────────────────────

export interface PrintOptions {
  /** Report data to render */
  report: ProfessionalReportData;
  /** Project name */
  projectName: string;
  /** Organization name from settings */
  organizationName?: string;
  /** Engineer name from settings */
  engineerName?: string;
  /** Custom footer text */
  footerText?: string;
  /** Show page numbers */
  showPageNumbers: boolean;
  /** Show date */
  showDate: boolean;
  /** Report number */
  reportNumber?: string;
}

// ─── HTML Generation ─────────────────────────────────────────────────────

function generatePrintHTML(options: PrintOptions): string {
  const { report, projectName, organizationName, engineerName, footerText, showPageNumbers, showDate, reportNumber } = options;
  const versionInfo = getVersionInfo();
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  const sections = buildSections(report);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UPAS — ${projectName} — تقرير هندسي</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 25mm 15mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, 'Noto Sans Arabic', sans-serif;
      color: #1e293b;
      font-size: 11pt;
      line-height: 1.6;
      direction: rtl;
    }

    /* ── Cover Page ── */
    .cover {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      text-align: center;
      border: 3px solid #1e3a5f;
      border-radius: 8px;
      padding: 40px 30px;
      margin: 20px 0;
    }
    .cover-logo {
      width: 60px; height: 60px;
      background: #f59e0b;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
    }
    .cover-logo svg { width: 30px; height: 30px; }
    .cover-app { font-size: 10pt; color: #64748b; margin-bottom: 8px; }
    .cover-title { font-size: 20pt; font-weight: bold; color: #1e293b; margin-bottom: 6px; }
    .cover-subtitle { font-size: 14pt; color: #1e3a5f; margin-bottom: 24px; }
    .cover-meta { font-size: 10pt; color: #64748b; margin-bottom: 4px; }
    .cover-status {
      display: inline-block;
      padding: 6px 20px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14pt;
      margin-top: 16px;
    }
    .cover-footer { margin-top: 30px; font-size: 9pt; color: #94a3b8; }

    /* ── Table of Contents ── */
    .toc {
      page-break-after: always;
      padding: 10px 0;
    }
    .toc h2 { font-size: 14pt; color: #1e3a5f; margin-bottom: 16px; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; }
    .toc-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dotted #cbd5e1; font-size: 11pt; }
    .toc-num { color: #64748b; font-weight: bold; margin-left: 8px; }

    /* ── Sections ── */
    .section { page-break-inside: avoid; margin-bottom: 20px; }
    .section-header {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .section-header h3 { font-size: 12pt; color: #1e293b; }
    .section-badge { font-size: 9pt; padding: 2px 8px; border-radius: 10px; background: #e2e8f0; color: #64748b; }
    .section-body { padding: 4px 8px; }

    /* ── Key-Value Grid ── */
    .kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; }
    .kv-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 10pt; }
    .kv-label { color: #64748b; }
    .kv-value { font-family: 'Consolas', 'Courier New', monospace; font-weight: 600; }
    .kv-pass { color: #16a34a; }
    .kv-fail { color: #dc2626; }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-weight: bold; }
    td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; }
    .status-pass { background: #f0fdf4; color: #16a34a; padding: 2px 8px; border-radius: 8px; font-size: 9pt; font-weight: bold; }
    .status-fail { background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 8px; font-size: 9pt; font-weight: bold; }

    /* ── Warning List ── */
    .warning-item { display: flex; align-items: flex-start; gap: 8px; padding: 4px 0; font-size: 10pt; }
    .warning-icon { color: #f59e0b; font-weight: bold; shrink: 0; }

    /* ── Footer ── */
    .page-footer {
      position: fixed;
      bottom: 10mm;
      left: 15mm;
      right: 15mm;
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
    }

    /* ── Diagram ── */
    .diagram-container { text-align: center; margin: 10px 0; }
    .diagram-container svg { max-width: 100%; }

    /* Print-specific */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cover { min-height: 95vh; }
      .section { page-break-inside: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${sections.cover}
  ${sections.toc}
  ${sections.body}
  <div class="page-footer">
    ${organizationName ? `${organizationName} — ` : ''}UPAS v${versionInfo.version}
    ${showDate ? ` — ${today}` : ''}
    ${engineerName ? ` — ${engineerName}` : ''}
    ${footerText ? ` — ${footerText}` : ''}
  </div>
</body>
</html>`;
}

// ─── Section Builders ────────────────────────────────────────────────────

function buildSections(report: ProfessionalReportData) {
  const versionInfo = getVersionInfo();
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  const statusColor = report.designStatus === 'PASS' ? '#16a34a' : '#dc2626';
  const statusBg = report.designStatus === 'PASS' ? '#f0fdf4' : '#fef2f2';

  return {
    cover: `
      <div class="cover">
        <div class="cover-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><path d="M9 20v-6h6v6"/>
          </svg>
        </div>
        <div class="cover-app">UPAS — Underground Protective Analysis System</div>
        <div class="cover-title">التقرير الهندسي الاحترافي</div>
        <div class="cover-subtitle">${report.projectName}</div>
        <div class="cover-meta">نمط التصميم: قياسي (Standard Mode)</div>
        <div class="cover-meta">${report.calculatedAt}</div>
        <div class="cover-status" style="background:${statusBg};color:${statusColor}">
          ${report.designStatus === 'PASS' ? '&#10003;' : '&#10007;'} ${report.statusLabelAr}
        </div>
        <div class="cover-meta" style="margin-top:12px">العنصر الحاكم: ${report.governingElementAr}</div>
        <div class="cover-meta">النمط الحاكم: ${report.governingMode}</div>
        <div class="cover-footer">
          UPAS v${versionInfo.version} — ${today}
          ${report.equationCount} معادلة — ${report.assumptionCount} افتراض
        </div>
      </div>`,

    toc: `
      <div class="toc">
        <h2>فهرس المحتويات</h2>
        ${buildTocItems()}
      </div>`,

    body: `
      ${buildDesignBasisSection(report)}
      ${buildThreatSection(report)}
      ${buildBlastSection(report)}
      ${buildResponseSection(report)}
      ${buildResultsTableSection(report)}
      ${buildVerificationSection(report)}
      ${buildCriticalSection(report)}
      ${report.warnings.length > 0 ? buildWarningsSection(report) : ''}
      ${buildAuditSection(report)}`,
  };
}

function buildTocItems(): string {
  const items = [
    { num: '1', title: 'أساس التصميم', en: 'Design Basis' },
    { num: '2', title: 'ملخص التهديد', en: 'Threat Summary' },
    { num: '3', title: 'معاملات الانفجار', en: 'Blast Parameters' },
    { num: '4', title: 'الاستجابة الإنشائية', en: 'Structural Response' },
    { num: '5', title: 'جدول نتائج التصميم', en: 'Design Results' },
    { num: '6', title: 'مصفوفة التحقق', en: 'Verification Matrix' },
    { num: '7', title: 'العنصر الحاكم', en: 'Critical Element' },
    { num: '8', title: 'التحذيرات والقيود', en: 'Warnings' },
    { num: '9', title: 'ملحق التدقيق الهندسي', en: 'Audit Appendix' },
  ];
  return items.map(it => `
    <div class="toc-item">
      <span><span class="toc-num">${it.num}.</span> ${it.title} <span style="color:#94a3b8;font-size:9pt">(${it.en})</span></span>
      <span class="toc-num">${it.num}</span>
    </div>
  `).join('');
}

function buildDesignBasisSection(r: ProfessionalReportData): string {
  const rows = r.designBasis.map(row =>
    `<div class="kv-row"><span class="kv-label">${row.item}</span><span class="kv-value">${row.value}</span></div>`
  ).join('');
  return `
    <div class="section">
      <div class="section-header"><h3>1. أساس التصميم</h3><span class="section-badge">${r.assumptionCount} افتراض</span></div>
      <div class="section-body"><div class="kv-grid">${rows}</div></div>
    </div>`;
}

function buildThreatSection(r: ProfessionalReportData): string {
  return `
    <div class="section">
      <div class="section-header"><h3>2. ملخص التهديد</h3></div>
      <div class="section-body"><div class="kv-grid">
        <div class="kv-row"><span class="kv-label">كتلة TNT المكافئة</span><span class="kv-value">${r.threat.tntEquivalent.toFixed(1)} kg</span></div>
        <div class="kv-row"><span class="kv-label">مسافة الوقوف</span><span class="kv-value">${r.threat.standoff.toFixed(1)} m</span></div>
        <div class="kv-row"><span class="kv-label">المسافة المقيسة Z</span><span class="kv-value">${r.threat.scaledDistance.toFixed(3)} m/kg^⅓</span></div>
        <div class="kv-row"><span class="kv-label">نوع الانفجار</span><span class="kv-value">${r.threat.detonationTypeAr}</span></div>
      </div></div>
    </div>`;
}

function buildBlastSection(r: ProfessionalReportData): string {
  return `
    <div class="section">
      <div class="section-header"><h3>3. معاملات الانفجار</h3></div>
      <div class="section-body"><div class="kv-grid">
        <div class="kv-row"><span class="kv-label">الضغط الحادث الأقصى Pso</span><span class="kv-value">${r.blast.incidentPressure.toFixed(1)} kPa</span></div>
        <div class="kv-row"><span class="kv-label">الضغط المنعكس الأقصى Pr</span><span class="kv-value">${r.blast.reflectedPressure.toFixed(1)} kPa</span></div>
        <div class="kv-row"><span class="kv-label">الضغط الديناميكي q</span><span class="kv-value">${r.blast.dynamicPressure.toFixed(1)} kPa</span></div>
        <div class="kv-row"><span class="kv-label">معامل الانعكاس Cr</span><span class="kv-value">${r.blast.reflectionCoefficient.toFixed(2)}</span></div>
        <div class="kv-row"><span class="kv-label">مدة الطور الموجب td</span><span class="kv-value">${r.blast.duration.toFixed(2)} ms</span></div>
        <div class="kv-row"><span class="kv-label">الدافع Impulse</span><span class="kv-value">${r.blast.impulse.toFixed(1)} kPa·ms</span></div>
      </div></div>
    </div>`;
}

function buildResponseSection(r: ProfessionalReportData): string {
  const elements = (['roof', 'wall', 'floor'] as const).map(key => {
    const el = r.elements[key];
    const isGov = key === r.governingElement;
    const sfClass = (v: number) => v >= 1.0 ? 'kv-pass' : 'kv-fail';
    return `
      <div style="border:1px solid ${isGov ? '#f59e0b' : '#cbd5e1'}; border-radius:6px; padding:8px; margin-bottom:8px; ${isGov ? 'background:#fffbeb;' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong>${el.label} ${isGov ? '(حاكم)' : ''}</strong>
          <span class="${el.overallPass ? 'status-pass' : 'status-fail'}">${el.overallPass ? 'PASS' : 'FAIL'}</span>
        </div>
        <div class="kv-grid">
          <div class="kv-row"><span class="kv-label">السماكة المطلوبة</span><span class="kv-value ${sfClass(el.existingThickness >= el.requiredThickness ? 1 : 0)}">${el.requiredThickness.toFixed(0)} mm</span></div>
          <div class="kv-row"><span class="kv-label">عزم الانحناء Mu</span><span class="kv-value">${el.designMoment.toFixed(1)} kN·m/m</span></div>
          <div class="kv-row"><span class="kv-label">قوة القص Vu</span><span class="kv-value">${el.designShear.toFixed(1)} kN/m</span></div>
          <div class="kv-row"><span class="kv-label">التسليح As</span><span class="kv-value">${el.requiredAs.toFixed(0)} mm²/m</span></div>
          <div class="kv-row"><span class="kv-label">SF انحناء</span><span class="kv-value ${sfClass(el.flexuralSF)}">${el.flexuralSF.toFixed(2)}</span></div>
          <div class="kv-row"><span class="kv-label">SF قص</span><span class="kv-value ${sfClass(el.shearSF)}">${el.shearSF.toFixed(2)}</span></div>
          <div class="kv-row"><span class="kv-label">التسليح</span><span class="kv-value">${el.barDiameter}mm @ ${el.barSpacing}mm</span></div>
          <div class="kv-row"><span class="kv-label">As المقدمة</span><span class="kv-value ${sfClass(el.providedAs >= el.requiredAs ? 1 : 0)}">${el.providedAs.toFixed(0)} mm²/m</span></div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="section">
      <div class="section-header"><h3>4. الاستجابة الإنشائية</h3><span class="section-badge">مقطع عرضي</span></div>
      <div class="section-body">${elements}</div>
    </div>`;
}

function buildResultsTableSection(r: ProfessionalReportData): string {
  const bodyRows = (['roof', 'wall', 'floor'] as const).map(key => {
    const el = r.elements[key];
    const fClass = el.flexuralSF >= 1.0 ? 'kv-pass' : 'kv-fail';
    const sClass = el.shearSF >= 1.0 ? 'kv-pass' : 'kv-fail';
    return `<tr>
      <td style="text-align:right;font-weight:bold">${el.label}</td>
      <td class="font-mono">${el.requiredThickness.toFixed(0)}</td>
      <td class="font-mono">${el.barDiameter}@${el.barSpacing}</td>
      <td class="font-mono ${fClass}">${el.flexuralSF.toFixed(2)}</td>
      <td class="font-mono ${sClass}">${el.shearSF.toFixed(2)}</td>
      <td><span class="${el.overallPass ? 'status-pass' : 'status-fail'}">${el.overallPass ? 'PASS' : 'FAIL'}</span></td>
    </tr>`;
  }).join('');

  return `
    <div class="section">
      <div class="section-header"><h3>5. جدول نتائج التصميم</h3></div>
      <div class="section-body">
        <table>
          <thead><tr>
            <th>العنصر</th><th>السماكة (mm)</th><th>التسليح</th><th>SF انحناء</th><th>SF قص</th><th>الحالة</th>
          </tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </div>`;
}

function buildVerificationSection(r: ProfessionalReportData): string {
  const rows = r.verificationMatrix.map(cell => {
    const passClass = (v: boolean) => v ? 'status-pass' : 'status-fail';
    return `<tr>
      <td style="text-align:right">${cell.check}</td>
      <td><span class="${passClass(cell.roof)}">${cell.roof ? 'ناجح' : 'فاشل'}</span></td>
      <td><span class="${passClass(cell.wall)}">${cell.wall ? 'ناجح' : 'فاشل'}</span></td>
      <td><span class="${passClass(cell.floor)}">${cell.floor ? 'ناجح' : 'فاشل'}</span></td>
    </tr>`;
  }).join('');

  return `
    <div class="section">
      <div class="section-header"><h3>6. مصفوفة التحقق</h3><span class="section-badge" style="color:${r.statusColor}">${r.designStatus}</span></div>
      <div class="section-body">
        <table>
          <thead><tr>
            <th>الفحص</th><th>السقف</th><th>الجدران</th><th>الأرضية</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function buildCriticalSection(r: ProfessionalReportData): string {
  const c = r.criticalElement;
  const sfClass = (v: number) => v >= 1.0 ? 'kv-pass' : 'kv-fail';
  return `
    <div class="section">
      <div class="section-header"><h3>7. العنصر الحاكم — التفاصيل</h3><span class="section-badge">${c.label}</span></div>
      <div class="section-body"><div class="kv-grid">
        <div class="kv-row"><span class="kv-label">العنصر</span><span class="kv-value">${c.label}</span></div>
        <div class="kv-row"><span class="kv-label">النمط الحاكم</span><span class="kv-value">${c.governingMode}</span></div>
        <div class="kv-row"><span class="kv-label">SF الانحناء</span><span class="kv-value ${sfClass(c.flexuralSF)}">${c.flexuralSF.toFixed(3)}</span></div>
        <div class="kv-row"><span class="kv-label">SF القص</span><span class="kv-value ${sfClass(c.shearSF)}">${c.shearSF.toFixed(3)}</span></div>
        <div class="kv-row"><span class="kv-label">SF الاختراق</span><span class="kv-value ${sfClass(c.penetrationSF)}">${c.penetrationSF.toFixed(3)}</span></div>
        <div class="kv-row"><span class="kv-label">نسبة الانحراف</span><span class="kv-value">${c.deflectionRatio.toFixed(4)}</span></div>
      </div></div>
    </div>`;
}

function buildWarningsSection(r: ProfessionalReportData): string {
  const items = r.warnings.map(w =>
    `<div class="warning-item"><span class="warning-icon">&#9888;</span><span>${w}</span></div>`
  ).join('');
  return `
    <div class="section">
      <div class="section-header"><h3>8. التحذيرات والقيود</h3><span class="section-badge">${r.warnings.length}</span></div>
      <div class="section-body">${items}</div>
    </div>`;
}

function buildAuditSection(r: ProfessionalReportData): string {
  const cats = r.equationCategories.map(c =>
    `<span style="display:inline-block;font-size:8pt;padding:2px 8px;margin:2px;border:1px solid #6366f140;border-radius:10px;color:#6366f1;">${c}</span>`
  ).join('');

  const assumptions = r.criticalAssumptions.map(a =>
    `<div style="display:flex;align-items:flex-start;gap:6px;font-size:9pt;padding:2px 0;">
      <span style="font-family:monospace;background:#fef2f2;color:#dc2626;padding:1px 4px;border-radius:3px;">${a.id}</span>
      <span>${a.description}</span>
    </div>`
  ).join('');

  return `
    <div class="section">
      <div class="section-header"><h3>9. ملحق التدقيق الهندسي</h3><span class="section-badge">Phase 5B</span></div>
      <div class="section-body">
        <p style="font-size:10pt;margin-bottom:8px;">
          تم إعداد هذا التصميم باستخدام ${r.equationCount} معادلة هندسية مسجلة
          و ${r.assumptionCount} افتراض تصميمي موثق.
        </p>
        <div style="margin-bottom:10px;">${cats}</div>
        ${assumptions ? `<div style="margin-top:8px;"><strong style="font-size:9pt;color:#64748b;">الافتراضات الحرجة:</strong>${assumptions}</div>` : ''}
      </div>
    </div>`;
}

// ─── Public API ──────────────────────────────────────────────────────────

/** Open the report in a new window for print/save-as-PDF. */
export function openPrintView(options: PrintOptions): void {
  const html = generatePrintHTML(options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }
}

/** Generate the print-optimized HTML string (for export bundle). */
export function generatePrintHTMLString(options: PrintOptions): string {
  return generatePrintHTML(options);
}