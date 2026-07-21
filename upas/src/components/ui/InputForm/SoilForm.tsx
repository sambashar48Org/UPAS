/**
 * UPAS — Soil Form Component
 * Sprint 3B: Edit soil layers — reads from database, writes to projectStore.
 * Architecture: NO validation, NO calculations — only UI + state management.
 */

import React, { useCallback } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { createSoilProfile } from '../../../models/Soil';
import { createSoilLayer } from '../../../models/Soil';
import type { SoilProfile } from '../../../models/Soil';
import { getSoilTypes } from '../../../database';

export default function SoilForm() {
  const soilProfile = useProjectStore((s) => s.soilProfile);
  const setSoilProfile = useProjectStore((s) => s.setSoilProfile);

  const soilTypes = getSoilTypes();

  // ─── Update Profile Fields ───────────────────────────────────
  const updateProfile = useCallback(<K extends keyof SoilProfile>(key: K, value: SoilProfile[K]) => {
    if (!soilProfile) return;
    setSoilProfile({ ...soilProfile, [key]: value });
  }, [soilProfile, setSoilProfile]);

  // ─── Layer Operations ────────────────────────────────────────
  const addLayer = useCallback(() => {
    if (!soilProfile) return;
    const layers = soilProfile.layers;
    const lastBottom = layers.length > 0
      ? (Number(layers[layers.length - 1]!.topElevation.value) - Number(layers[layers.length - 1]!.thickness.value))
      : 0;
    const newLayer = createSoilLayer({
      name: `طبقة ${layers.length + 1}`,
      soilTypeRef: soilTypes[0]?.ref ?? 'sand_medium',
      topElevation: { value: lastBottom, unit: 'm' },
      thickness: { value: 2, unit: 'm' },
    }, layers.length);
    const totalDepth = { value: Number(soilProfile.totalDepth.value) + 2, unit: 'm' };
    setSoilProfile({ ...soilProfile, layers: [...layers, newLayer], totalDepth });
  }, [soilProfile, soilTypes, setSoilProfile]);

  const removeLayer = useCallback((index: number) => {
    if (!soilProfile || soilProfile.layers.length <= 1) return;
    const layers = soilProfile.layers.filter((_, i) => i !== index).map((l, i) => ({
      ...l,
      layerIndex: i,
    }));
    const totalDepth = { value: layers.reduce((sum, l) => sum + Number(l.thickness.value), 0), unit: 'm' };
    setSoilProfile({ ...soilProfile, layers, totalDepth });
  }, [soilProfile, setSoilProfile]);

  const updateLayer = useCallback((index: number, field: string, value: string | number) => {
    if (!soilProfile) return;
    const layers = [...soilProfile.layers];
    const layer = { ...layers[index]! };

    if (field === 'name') {
      layer.name = value as string;
    } else if (field === 'soilTypeRef') {
      layer.soilTypeRef = value as string;
    } else if (field === 'thickness') {
      const numVal = Number(value);
      if (numVal > 0) {
        layer.thickness = { value: numVal, unit: 'm' };
      }
    }
    layers[index] = layer;

    const totalDepth = { value: layers.reduce((sum, l) => sum + Number(l.thickness.value), 0), unit: 'm' };
    setSoilProfile({ ...soilProfile, layers, totalDepth });
  }, [soilProfile, setSoilProfile]);

  if (!soilProfile) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--upas-text-secondary)' }}>
        <p className="text-sm mb-3">لا يوجد ملف تربة</p>
        <button
          onClick={() => {
            const profile = createSoilProfile({ projectId: useProjectStore.getState().currentProject?.id });
            useProjectStore.getState().setSoilProfile(profile);
          }}
          className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--upas-accent, #3b82f6)' }}
        >
          + إنشاء ملف تربة جديد
        </button>
      </div>
    );
  }

  const inputCls = 'w-full px-2 py-1 text-xs rounded border';
  const inputStyle = {
    backgroundColor: 'var(--upas-bg-secondary, #f1f5f9)',
    borderColor: 'var(--upas-border, #e2e8f0)',
    color: 'var(--upas-text-primary, #1e293b)',
    direction: 'rtl' as const,
  };

  return (
    <div className="space-y-3 p-3" dir="rtl">
      {/* Profile-level fields */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--upas-text-secondary)' }}>اسم الملف</label>
          <input
            className={inputCls}
            style={inputStyle}
            value={soilProfile.name}
            onChange={(e) => updateProfile('name', e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--upas-text-secondary)' }}>منسوب المياه (m)</label>
          <input
            className={inputCls}
            style={inputStyle}
            type="number"
            value={soilProfile.waterTableDepth ? soilProfile.waterTableDepth.value : ''}
            placeholder="مثال: -3"
            onChange={(e) => {
              const v = e.target.value;
              updateProfile('waterTableDepth', v ? { value: Number(v), unit: 'm' } : null);
            }}
          />
        </div>
      </div>

      {/* Layers */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold" style={{ color: 'var(--upas-text-primary)' }}>
            الطبقات ({soilProfile.layers.length})
          </span>
          <button
            onClick={addLayer}
            className="text-[10px] px-2 py-0.5 rounded font-medium"
            style={{ backgroundColor: 'var(--upas-primary, #1e3a5f)', color: '#fff' }}
          >
            + إضافة طبقة
          </button>
        </div>

        <div className="space-y-2">
          {soilProfile.layers.map((layer, i) => (
            <div
              key={layer.id}
              className="p-2 rounded border"
              style={{ borderColor: 'var(--upas-border)', backgroundColor: 'var(--upas-bg-secondary, #f8fafc)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium" style={{ color: 'var(--upas-text-secondary)' }}>
                  طبقة {i + 1}
                </span>
                {soilProfile.layers.length > 1 && (
                  <button
                    onClick={() => removeLayer(i)}
                    className="text-[10px] text-red-500 hover:text-red-700"
                  >
                    حذف
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                <input
                  className={inputCls}
                  style={inputStyle}
                  placeholder="اسم الطبقة"
                  value={layer.name}
                  onChange={(e) => updateLayer(i, 'name', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    className={inputCls}
                    style={inputStyle}
                    value={layer.soilTypeRef}
                    onChange={(e) => updateLayer(i, 'soilTypeRef', e.target.value)}
                  >
                    {soilTypes.map((st) => (
                      <option key={st.ref} value={st.ref}>{st.nameAr}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      className={inputCls}
                      style={inputStyle}
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={layer.thickness.value}
                      onChange={(e) => updateLayer(i, 'thickness', e.target.value)}
                    />
                    <span className="text-[10px] shrink-0" style={{ color: 'var(--upas-text-secondary)' }}>m</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total depth */}
      <div className="text-[10px] pt-1 border-t" style={{ color: 'var(--upas-text-secondary)', borderColor: 'var(--upas-border)' }}>
        العمق الكلي: <span className="font-mono font-medium">{Number(soilProfile.totalDepth.value).toFixed(1)} m</span>
      </div>
    </div>
  );
}