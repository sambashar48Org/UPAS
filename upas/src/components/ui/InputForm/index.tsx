/**
 * UPAS — Input Form Container
 * Sprint 3B: Tabbed container for Soil/Structure/Threat forms.
 */

import React from 'react';
import { useUIStore, type AnalysisTab } from '../../../stores/uiStore';
import SoilForm from './SoilForm';
import StructureForm from './StructureForm';
import ThreatForm from './ThreatForm';

const TABS: Array<{ key: AnalysisTab; label: string; icon: string }> = [
  { key: 'input', label: 'المدخلات', icon: '✏' },
  { key: 'results', label: 'النتائج', icon: '📊' },
  { key: 'report', label: 'التقرير', icon: '📄' },
];

export default function InputForm({ children }: { children?: React.ReactNode }) {
  const analysisTab = useUIStore((s) => s.analysisTab);
  const setAnalysisTab = useUIStore((s) => s.setAnalysisTab);

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--upas-bg-card)' }}
      dir="rtl"
    >
      {/* Tabs */}
      <div className="flex border-b shrink-0" style={{ borderColor: 'var(--upas-border)' }}>
        {TABS.map((tab) => {
          const active = analysisTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setAnalysisTab(tab.key)}
              className="flex-1 py-1.5 text-[11px] font-medium transition-colors"
              style={{
                backgroundColor: active ? 'var(--upas-bg-secondary, #f1f5f9)' : 'transparent',
                color: active ? 'var(--upas-text-primary)' : 'var(--upas-text-secondary)',
                borderBottom: active ? '2px solid var(--upas-primary, #1e3a5f)' : '2px solid transparent',
              }}
            >
              <span className="ml-1">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content — when 'input' tab is active, show sub-tabs for soil/structure/threat */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
}

/** Sub-tab bar for Input tab (Soil/Structure/Threat) */
export function InputSubTabs({ active, onChange }: { active: 'soil' | 'structure' | 'threat'; onChange: (v: 'soil' | 'structure' | 'threat') => void }) {
  const items: Array<{ key: 'soil' | 'structure' | 'threat'; label: string }> = [
    { key: 'soil', label: 'التربة' },
    { key: 'structure', label: 'المنشأ' },
    { key: 'threat', label: 'التهديد' },
  ];

  return (
    <div className="flex border-b shrink-0" style={{ borderColor: 'var(--upas-border)' }}>
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className="flex-1 py-1 text-[10px] font-medium transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--upas-bg-secondary, #f1f5f9)' : 'transparent',
              color: isActive ? 'var(--upas-text-primary)' : 'var(--upas-text-secondary)',
              borderBottom: isActive ? '2px solid var(--upas-primary, #1e3a5f)' : '2px solid transparent',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}