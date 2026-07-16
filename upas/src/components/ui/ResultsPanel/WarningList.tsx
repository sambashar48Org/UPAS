/**
 * UPAS — Warning List
 * Sprint 3B: Displays engineering warnings with severity colors.
 * Reads from WarningVM[] — never from FullAnalysisResult.
 */

import React from 'react';
import type { WarningVM } from '../../../visualization/ResultViewModel';

export default function WarningList({ warnings }: { warnings: WarningVM[] }) {
  if (warnings.length === 0) {
    return (
      <div className="text-center text-xs py-3" style={{ color: 'var(--upas-text-secondary)' }}>
        لا توجد تحذيرات
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {warnings.map((w, i) => (
        <div
          key={`${w.code}-${i}`}
          className="flex items-start gap-2 p-2 rounded text-xs"
          style={{ backgroundColor: w.severityColor + '10', borderRight: `3px solid ${w.severityColor}` }}
          dir="rtl"
        >
          <span
            className="shrink-0 text-[10px] font-bold px-1 py-0.5 rounded"
            style={{ backgroundColor: w.severityColor + '20', color: w.severityColor }}
          >
            {w.severityLabelAr}
          </span>
          <span style={{ color: 'var(--upas-text-primary)' }}>
            {w.messageAr}
          </span>
        </div>
      ))}
    </div>
  );
}