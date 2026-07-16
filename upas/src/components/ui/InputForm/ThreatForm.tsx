/**
 * UPAS — Threat Form Component
 * Sprint 3B: Edit threat + bomb — reads from database, writes to projectStore.
 * Architecture: NO validation, NO calculations — only UI + state management.
 */

import React, { useCallback } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { getBombTypes } from '../../../database';
import { ThreatType, DetonationType } from '../../../types';

const DETONATION_TYPES = [
  { value: 'surface', label: 'سطحي' },
  { value: 'buried', label: 'مدفون' },
  { value: 'aerial', label: 'جوي' },
  { value: 'internal', label: 'داخلي' },
];

const CHARGE_SHAPES = [
  { value: 'spherical', label: 'كروي' },
  { value: 'cylindrical', label: 'أسطواني' },
  { value: 'cuboid', label: 'مكعب' },
];

export default function ThreatForm() {
  const threat = useProjectStore((s) => s.threats[0]);
  const bomb = useProjectStore((s) => s.bombs[0]);
  const setThreats = useProjectStore((s) => s.setThreats);
  const setBombs = useProjectStore((s) => s.setBombs);
  const bombTypes = getBombTypes();

  const updateThreat = useCallback((field: string, value: unknown) => {
    if (!threat) return;
    setThreats([{ ...threat, [field]: value }]);
  }, [threat, setThreats]);

  const updateBomb = useCallback((field: string, value: unknown) => {
    if (!bomb) return;
    setBombs([{ ...bomb, [field]: value }]);
  }, [bomb, setBombs]);

  // Auto-create if missing
  if (!threat || !bomb) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
        سيتم إنشاء التهديد عند تحميل مشروع تجريبي
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

  const selectedBombType = bombTypes.find(b => b.ref === bomb.explosiveTypeRef);

  return (
    <div className="space-y-3 p-3" dir="rtl">
      {/* Threat Info */}
      <fieldset className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
        <legend className="text-[10px] font-bold px-1" style={{ color: 'var(--upas-text-secondary)' }}>التهديد</legend>
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>نوع التفجير</label>
            <select
              className={inputCls} style={inputStyle} value={threat.detonationType}
              onChange={(e) => updateThreat('detonationType', e.target.value)}
            >
              {DETONATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>مسافة الأمان (m)</label>
            <input
              className={inputCls} style={inputStyle} type="number" step="0.5" min="0"
              value={Number(threat.standoffDistance.value)}
              onChange={(e) => updateThreat('standoffDistance', { value: Number(e.target.value), unit: 'm' })}
            />
          </div>
        </div>
        {threat.detonationType === 'buried' && (
          <div className="mt-1.5">
            <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>عمق الدفن (m)</label>
            <input
              className={inputCls} style={inputStyle} type="number" step="0.1" min="0"
              value={threat.burialDepth ? Number(threat.burialDepth.value) : ''}
              placeholder="مثال: 1.5"
              onChange={(e) => {
                const v = e.target.value;
                updateThreat('burialDepth', v ? { value: Number(v), unit: 'm' } : null);
              }}
            />
          </div>
        )}
      </fieldset>

      {/* Bomb/Explosive Info */}
      <fieldset className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
        <legend className="text-[10px] font-bold px-1" style={{ color: 'var(--upas-text-secondary)' }}>المتفجرات</legend>
        <div className="space-y-1.5">
          <div>
            <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>نوع المتفجرات</label>
            <select
              className={inputCls} style={inputStyle} value={bomb.explosiveTypeRef}
              onChange={(e) => updateBomb('explosiveTypeRef', e.target.value)}
            >
              {bombTypes.map((bt) => (
                <option key={bt.ref} value={bt.ref}>
                  {bt.nameAr} (معامل TNT: {bt.tntEquivalentFactor})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>كتلة الشحنة (kg)</label>
              <input
                className={inputCls} style={inputStyle} type="number" step="1" min="1"
                value={Number(bomb.chargeMass.value)}
                onChange={(e) => updateBomb('chargeMass', { value: Number(e.target.value), unit: 'kg' })}
              />
            </div>
            <div>
              <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>شكل الشحنة</label>
              <select
                className={inputCls} style={inputStyle} value={bomb.chargeShape}
                onChange={(e) => updateBomb('chargeShape', e.target.value)}
              >
                {CHARGE_SHAPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Selected explosive info */}
          {selectedBombType && (
            <div className="text-[10px] p-1.5 rounded mt-1" style={{ backgroundColor: 'var(--upas-bg-secondary, #f1f5f9)', color: 'var(--upas-text-secondary)' }}>
              <div>كثافة: {selectedBombType.density.value} kg/m³</div>
              <div>سرعة الانفجار: {selectedBombType.detonationVelocity.value} m/s</div>
              <div>معامل TNT: {selectedBombType.tntEquivalentFactor}</div>
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
}