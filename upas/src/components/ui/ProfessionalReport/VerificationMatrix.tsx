/**
 * UPAS — Verification Matrix Component
 * Phase 5C-2: 4×3 colored status grid for flexure/shear/penetration/deflection
 *
 * Architecture Rule: READS ONLY from VerificationCell[]. No calculations.
 */

import React from 'react';
import type { VerificationCell } from '../../../calculations/design/professional-report';

interface Props {
  matrix: VerificationCell[];
  governingElement: 'roof' | 'wall' | 'floor';
}

const PASS_STYLE: React.CSSProperties = {
  backgroundColor: '#22c55e18',
  color: '#16a34a',
  fontWeight: 600,
};

const FAIL_STYLE: React.CSSProperties = {
  backgroundColor: '#ef444418',
  color: '#dc2626',
  fontWeight: 600,
};

const GOVERNING_HEADER: React.CSSProperties = {
  backgroundColor: '#f59e0b18',
  color: '#b45309',
  fontWeight: 700,
  borderBottom: '2px solid #f59e0b',
};

function cellStyle(pass: boolean, elementKey: string, governingElement: string): React.CSSProperties {
  if (!pass) return FAIL_STYLE;
  if (elementKey === governingElement) return { ...PASS_STYLE, borderLeft: '2px solid #f59e0b' };
  return PASS_STYLE;
}

export default function VerificationMatrix({ matrix, governingElement }: Props) {
  const elementKeys = ['roof', 'wall', 'floor'] as const;
  const elementLabels: Record<string, { ar: string; en: string }> = {
    roof: { ar: 'السقف', en: 'Roof' },
    wall: { ar: 'الجدران', en: 'Walls' },
    floor: { ar: 'الأرضية', en: 'Floor' },
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" style={{ minWidth: 280 }}>
        <thead>
          <tr>
            <th
              className="px-3 py-2 border text-right text-[11px]"
              style={{ borderColor: 'var(--upas-border)', backgroundColor: 'var(--upas-bg-primary, #f8fafc)', color: 'var(--upas-text-secondary)' }}
            >
              الفحص
            </th>
            {elementKeys.map((key) => (
              <th
                key={key}
                className="px-3 py-2 border text-center text-[11px]"
                style={{
                  borderColor: 'var(--upas-border)',
                  ...(key === governingElement ? GOVERNING_HEADER : { backgroundColor: 'var(--upas-bg-primary, #f8fafc)', color: 'var(--upas-text-secondary)' }),
                }}
              >
                {elementLabels[key].ar}
                {key === governingElement && (
                  <span className="block text-[9px] font-normal opacity-70">(حاكم)</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row) => (
            <tr key={row.checkEn}>
              <td
                className="px-3 py-1.5 border text-right font-medium"
                style={{ borderColor: 'var(--upas-border)', color: 'var(--upas-text-primary)' }}
              >
                {row.check}
                <span className="block text-[9px] font-normal" style={{ color: 'var(--upas-text-secondary)' }}>
                  {row.checkEn}
                </span>
              </td>
              {elementKeys.map((key) => {
                const pass = row[key];
                return (
                  <td
                    key={key}
                    className="px-3 py-1.5 border text-center text-[11px]"
                    style={{
                      borderColor: 'var(--upas-border)',
                      ...cellStyle(pass, key, governingElement),
                    }}
                  >
                    {pass ? (
                      <span className="inline-flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        ناجح
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        فاشل
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}