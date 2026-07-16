/**
 * UPAS — Report Viewer
 * Sprint 3B: Displays engineering report from ReportViewModel.
 * NEVER reads ReportSection from calculations directly.
 */

import React, { useMemo } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useUIStore } from '../../../stores/uiStore';
import { buildReportViewModel } from '../../../visualization';
import type { ReportSectionVM, ReportContentVM } from '../../../visualization/ReportViewModel';

function renderContent(content: ReportContentVM) {
  switch (content.type) {
    case 'divider':
      return <hr className="my-2" style={{ borderColor: 'var(--upas-border)' }} />;
    case 'paragraph':
      return (
        <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--upas-text-primary)' }}>
          {content.textAr}
        </p>
      );
    case 'key-value':
      return (
        <div className="flex justify-between items-center py-0.5 text-xs">
          <span style={{ color: 'var(--upas-text-secondary)' }}>{content.keyAr}</span>
          <span className="font-mono font-medium" style={{ color: 'var(--upas-text-primary)' }}>
            {content.value}{content.unit ? ` ${content.unit}` : ''}
          </span>
        </div>
      );
    case 'table':
      return (
        <div className="overflow-x-auto my-2">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'var(--upas-bg-secondary, #f1f5f9)' }}>
                {content.headers.map((h, i) => (
                  <th key={i} className="px-2 py-1 border text-right font-medium" style={{ borderColor: 'var(--upas-border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-0.5 border" style={{ borderColor: 'var(--upas-border)' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {content.captionAr && (
            <p className="text-[10px] mt-1 italic" style={{ color: 'var(--upas-text-secondary)' }}>
              {content.captionAr}
            </p>
          )}
        </div>
      );
    case 'list':
      return (
        <ul className="list-disc mr-4 space-y-0.5 my-1.5">
          {content.itemsAr.map((item, i) => (
            <li key={i} className="text-xs" style={{ color: 'var(--upas-text-primary)' }}>
              {item}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

export default function ReportViewer() {
  const lastFullResult = useProjectStore((s) => s.lastFullResult);
  const lastReport = useProjectStore((s) => s.lastReport);
  const currentProject = useProjectStore((s) => s.currentProject);

  const vm = useMemo(() => {
    if (!lastReport || !lastFullResult) return null;
    return buildReportViewModel(lastReport, {
      projectName: currentProject?.name ?? '',
      calculatedAt: lastFullResult.calculatedAt,
      protectionLevel: lastFullResult.overall.protectionLevel,
    });
  }, [lastReport, lastFullResult, currentProject]);

  if (!vm) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="text-2xl mb-3 opacity-30">📄</div>
        <p className="text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
          شغّل التحليل لعرض التقرير
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" dir="rtl">
      {/* Report Header */}
      <div
        className="p-4 border-b"
        style={{ borderColor: 'var(--upas-border)', backgroundColor: vm.protectionColor + '08' }}
      >
        <h2 className="text-sm font-bold" style={{ color: 'var(--upas-text-primary)' }}>
          التقرير الهندسي — {vm.projectName}
        </h2>
        <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: 'var(--upas-text-secondary)' }}>
          <span>{vm.calculatedAt}</span>
          <span>•</span>
          <span className="font-medium" style={{ color: vm.protectionColor }}>
            {vm.protectionLevelAr}
          </span>
        </div>
      </div>

      {/* Report Sections */}
      <div className="p-4 space-y-4">
        {vm.sections.map(renderSection)}
      </div>
    </div>
  );
}

function renderSection(section: ReportSectionVM) {
  return (
    <div key={section.id} className="border rounded-lg p-3" style={{ borderColor: 'var(--upas-border)' }}>
      <h3
        className="text-xs font-bold mb-2 pb-1 border-b flex items-center gap-1.5"
        style={{ color: section.severityColor, borderColor: 'var(--upas-border)' }}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: section.severityColor }} />
        {section.titleAr}
      </h3>
      <div>
        {section.content.map((c, i) => (
          <React.Fragment key={i}>{renderContent(c)}</React.Fragment>
        ))}
      </div>
    </div>
  );
}