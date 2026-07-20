/**
 * UPAS — Analysis Toolbar
 * Run analysis button + tab selector (input/results/report).
 */

import React from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore, type AnalysisTab } from '../../stores/uiStore';
import { useAnalysisPipeline } from '../../hooks/useAnalysisPipeline';

/* SVG icons for tabs */
const InputIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const ResultsIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" />
  </svg>
);
const ReportIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const TAB_ITEMS: Array<{ key: AnalysisTab; label: string; Icon: React.FC }> = [
  { key: 'input', label: 'المدخلات', Icon: InputIcon },
  { key: 'results', label: 'النتائج', Icon: ResultsIcon },
  { key: 'report', label: 'التقرير', Icon: ReportIcon },
];

export default function AnalysisToolbar() {
  const isAnalyzing = useProjectStore((s) => s.isAnalyzing);
  const analysisError = useProjectStore((s) => s.analysisError);
  const lastFullResult = useProjectStore((s) => s.lastFullResult);

  const analysisTab = useUIStore((s) => s.analysisTab);
  const setAnalysisTab = useUIStore((s) => s.setAnalysisTab);
  const addNotification = useUIStore((s) => s.addNotification);

  const { runAnalysis } = useAnalysisPipeline();

  const handleRun = () => {
    runAnalysis();
  };

  const protectionLevel = lastFullResult?.overall.protectionLevel;
  const protectionColor = protectionLevel === 'safe' ? '#22c55e'
    : protectionLevel === 'marginal' ? '#eab308'
    : protectionLevel === 'unsafe' ? '#f97316'
    : protectionLevel === 'critical' ? '#dc2626' : undefined;

  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 border-b shrink-0"
      style={{ borderColor: 'var(--upas-border)', backgroundColor: 'var(--upas-bg-card)' }}
      dir="rtl"
    >
      {/* Left: Run button + status */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRun}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold text-white transition-opacity cursor-pointer"
          style={{
            backgroundColor: isAnalyzing ? '#94a3b8' : 'var(--upas-primary, #1e3a5f)',
            opacity: isAnalyzing ? 0.7 : 1,
          }}
        >
          {isAnalyzing ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري التحليل...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              تشغيل التحليل
            </>
          )}
        </button>

        {analysisError && (
          <span className="text-[10px] text-red-500 max-w-xs truncate" title={analysisError}>
            {analysisError}
          </span>
        )}

        {lastFullResult && !isAnalyzing && (
          <span className="text-[10px] font-medium flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: protectionColor }} />
            معامل الأمان: {lastFullResult.overall.minSafetyFactor.toFixed(2)}
          </span>
        )}
      </div>

      {/* Right: Tab selector */}
      <div className="flex items-center gap-0.5 rounded border overflow-hidden" style={{ borderColor: 'var(--upas-border)' }}>
        {TAB_ITEMS.map((tab) => {
          const active = analysisTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setAnalysisTab(tab.key)}
              className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--upas-primary, #1e3a5f)' : 'transparent',
                color: active ? '#fff' : 'var(--upas-text-secondary)',
              }}
            >
              <tab.Icon /> {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
