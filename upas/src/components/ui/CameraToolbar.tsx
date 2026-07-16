import React from 'react';
import { useUIStore, type CameraPreset } from '../../stores/uiStore';

const PRESETS: Array<{ key: CameraPreset; label: string; icon: string }> = [
  { key: 'perspective', label: 'منظور', icon: '◎' },
  { key: 'top', label: 'علوي', icon: '□' },
  { key: 'front', label: 'أمامي', icon: '▢' },
  { key: 'side', label: 'جانبي', icon: '◧' },
  { key: 'back', label: 'خلفي', icon: '◑' },
];

export default function CameraToolbar() {
  const cameraPreset = useUIStore((s) => s.cameraPreset);
  const setCameraPreset = useUIStore((s) => s.setCameraPreset);

  return (
    <div
      className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1.5 rounded-lg shadow-md"
      style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' }}
      dir="rtl"
    >
      {PRESETS.map((p) => {
        const active = cameraPreset === p.key;
        return (
          <button
            key={p.key}
            onClick={() => setCameraPreset(p.key)}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor: active ? 'var(--upas-primary, #ea580c)' : 'transparent',
              color: active ? '#fff' : 'var(--upas-text-primary, #1e293b)',
            }}
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)');
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget.style.backgroundColor = 'transparent');
            }}
          >
            <span className="text-sm leading-none">{p.icon}</span>
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}