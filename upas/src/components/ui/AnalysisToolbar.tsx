/**
 * UPAS — Analysis Toolbar
 * Sprint 3B: Run analysis button + status indicator.
 */

import React from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore, type AnalysisTab } from '../../stores/uiStore';
import { useAnalysisPipeline } from '../../hooks/useAnalysisPipeline';

const TAB_ITEMS: Array<{ key: AnalysisTab; label: string; icon: string }> = [
  { key: 'input', label: 'المدخلات', icon: '✏' },
  { key: 'results', label: 'النتائج', icon: '📊' },
  { key: 'report', label: 'التقرير', icon: '📄' },
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
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold text-white transition-opacity"
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
              className="px-2.5 py-0.5 text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: active ? 'var(--upas-primary, #1e3a5f)' : 'transparent',
                color: active ? '#fff' : 'var(--upas-text-secondary)',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}