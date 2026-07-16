import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';

export default function SectionViewControls() {
  const sectionViewEnabled = useUIStore((s) => s.sectionViewEnabled);
  const toggleSectionView = useUIStore((s) => s.toggleSectionView);
  const hiddenSoilLayers = useUIStore((s) => s.hiddenSoilLayers);
  const toggleSoilLayerVisibility = useUIStore((s) => s.toggleSoilLayerVisibility);
  const showAllSoilLayers = useUIStore((s) => s.showAllSoilLayers);
  const visualizationMode = useUIStore((s) => s.visualizationMode);

  const soilProfile = useProjectStore((s) => s.soilProfile);

  // Only show in cutaway mode or normal mode
  if (visualizationMode === 'surface' || visualizationMode === 'xray') return null;
  if (!soilProfile) return null;

  return (
    <div
      className="absolute top-3 right-3 z-10 rounded-lg shadow-md overflow-hidden"
      style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' }}
      dir="rtl"
    >
      {/* Toggle button */}
      <button
        onClick={toggleSectionView}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors hover:bg-black/5"
        style={{ color: 'var(--upas-text-primary, #1e293b)' }}
      >
        <span>إخفاء الطبقات</span>
        <span className="text-base leading-none">{sectionViewEnabled ? '▲' : '▼'}</span>
      </button>

      {/* Layer list */}
      {sectionViewEnabled && (
        <div className="border-t px-3 py-2 max-h-48 overflow-y-auto" style={{ borderColor: 'var(--upas-border, #e2e8f0)' }}>
          {soilProfile.layers.map((layer) => {
            const isHidden = hiddenSoilLayers.includes(layer.layerIndex);
            return (
              <label
                key={layer.id}
                className="flex items-center gap-2 py-1 cursor-pointer text-xs hover:bg-black/3 rounded px-1"
                style={{ color: 'var(--upas-text-primary, #1e293b)' }}
              >
                <input
                  type="checkbox"
                  checked={!isHidden}
                  onChange={() => toggleSoilLayerVisibility(layer.layerIndex)}
                  className="accent-orange-600"
                />
                <span className="flex-1 truncate">{layer.name}</span>
                <span style={{ color: 'var(--upas-text-secondary, #64748b)' }}>
                  {Number(layer.thickness.value).toFixed(1)} {layer.thickness.unit}
                </span>
              </label>
            );
          })}

          {/* Show all button */}
          <button
            onClick={showAllSoilLayers}
            className="w-full mt-1 py-1 text-xs rounded transition-colors hover:bg-black/5 font-medium"
            style={{ color: 'var(--upas-primary, #ea580c)' }}
          >
            إظهار الكل
          </button>
        </div>
      )}
    </div>
  );
}