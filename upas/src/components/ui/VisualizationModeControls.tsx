import React from 'react';
import { useUIStore, type VisualizationMode } from '../../stores/uiStore';

const modes: Array<{ key: VisualizationMode; label: string; icon: string; desc: string }> = [
  { key: 'normal', label: 'عادي', icon: '◎', desc: 'عرض كامل' },
  { key: 'surface', label: 'السطح', icon: '▬', desc: 'سطح الأرض فقط' },
  { key: 'cutaway', label: 'مقطع', icon: '◧', desc: 'قسم عرضي' },
  { key: 'xray', label: 'أشعة سينية', icon: '◇', desc: 'تربة شفافة' },
];

export default function VisualizationModeControls() {
  const visualizationMode = useUIStore((s) => s.visualizationMode);
  const setVisualizationMode = useUIStore((s) => s.setVisualizationMode);
  const requestAutoFit = useUIStore((s) => s.requestAutoFit);
  const showDamageZones = useUIStore((s) => s.showDamageZones);
  const showThreatObject = useUIStore((s) => s.showThreatObject);
  const toggleDamageZones = useUIStore((s) => s.toggleDamageZones);
  const toggleThreatObject = useUIStore((s) => s.toggleThreatObject);
  // Sprint 3C toggles
  const showStressOverlay = useUIStore((s) => s.showStressOverlay);
  const showThreatPath = useUIStore((s) => s.showThreatPath);
  const showCrater = useUIStore((s) => s.showCrater);
  const showAnnotations = useUIStore((s) => s.showAnnotations);
  const toggleStressOverlay = useUIStore((s) => s.toggleStressOverlay);
  const toggleThreatPath = useUIStore((s) => s.toggleThreatPath);
  const toggleCrater = useUIStore((s) => s.toggleCrater);
  const toggleAnnotations = useUIStore((s) => s.toggleAnnotations);

  return (
    <div
      className="absolute bottom-3 left-3 z-10 flex items-center gap-1 px-2 py-1.5 rounded-lg shadow-md"
      style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' }}
      dir="rtl"
    >
      {modes.map((m) => {
        const active = visualizationMode === m.key;
        return (
          <button
            key={m.key}
            onClick={() => setVisualizationMode(m.key)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: active ? 'var(--upas-primary, #1e3a5f)' : 'transparent',
              color: active ? '#fff' : 'var(--upas-text-primary, #1e293b)',
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)');
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget.style.backgroundColor = 'transparent');
            }}
            title={m.desc}
          >
            <span className="text-sm leading-none">{m.icon}</span>
            <span>{m.label}</span>
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--upas-border, #cbd5e1)' }} />

      {/* Auto Fit button */}
      <button
        onClick={requestAutoFit}
        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors"
        style={{ color: 'var(--upas-text-primary, #1e293b)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        title="ملائمة تلقائية"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </svg>
        <span>ملاءمة</span>
      </button>

      {/* Sprint 3B: Analysis visualization toggles */}
      <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--upas-border, #cbd5e1)' }} />
      <button
        onClick={toggleThreatObject}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor: showThreatObject ? '#ef444420' : 'transparent',
          color: showThreatObject ? '#ef4444' : 'var(--upas-text-primary, #1e293b)',
        }}
        title="كائن التهديد"
      >
        <span className="text-sm">⚠</span>
      </button>
      <button
        onClick={toggleDamageZones}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor: showDamageZones ? '#f9731620' : 'transparent',
          color: showDamageZones ? '#f97316' : 'var(--upas-text-primary, #1e293b)',
        }}
        title="مناطق الضرر"
      >
        <span className="text-sm">◎</span>
      </button>

      {/* Sprint 3C: Engineering geometry toggles */}
      <button
        onClick={toggleStressOverlay}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor: showStressOverlay ? '#22c55e20' : 'transparent',
          color: showStressOverlay ? '#22c55e' : 'var(--upas-text-primary, #1e293b)',
        }}
        title="تلوين الإجهاد"
      >
        <span className="text-sm">▧</span>
      </button>
      <button
        onClick={toggleThreatPath}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor: showThreatPath ? '#ef444420' : 'transparent',
          color: showThreatPath ? '#ef4444' : 'var(--upas-text-primary, #1e293b)',
        }}
        title="مسار التهديد"
      >
        <span className="text-sm">→</span>
      </button>
      <button
        onClick={toggleCrater}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor: showCrater ? '#7c2d1220' : 'transparent',
          color: showCrater ? '#7c2d12' : 'var(--upas-text-primary, #1e293b)',
        }}
        title="الحفرة"
      >
        <span className="text-sm">◉</span>
      </button>
      <button
        onClick={toggleAnnotations}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          backgroundColor: showAnnotations ? '#7c3aed20' : 'transparent',
          color: showAnnotations ? '#7c3aed' : 'var(--upas-text-primary, #1e293b)',
        }}
        title="التعليقات الهندسية"
      >
        <span className="text-sm">T</span>
      </button>
    </div>
  );
}