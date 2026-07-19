/**
 * UPAS — Design Criteria Form Component
 * Phase 4F: Edit design criteria — reads/writes projectStore.
 * Architecture: NO calculations, NO engineering logic — only UI + state management.
 *
 * User-specified fields (per Phase 4F spec):
 *   - Steel grade (fy)
 *   - Target safety factor
 *   - Support conditions
 *   - Design toggles (self-weight, overburden, lateral pressure, plastic response)
 *   - Concrete cover, max deflection ratio, max support rotation
 */

import React, { useCallback } from 'react';
import { useProjectStore } from '../../../stores/projectStore';

const STEEL_GRADES = [
  { value: 250, label: '250 MPa (Grade 40)' },
  { value: 420, label: '420 MPa (Grade 60)' },
  { value: 500, label: '500 MPa (Grade 75)' },
  { value: 600, label: '600 MPa (Grade 87)' },
];

const SUPPORT_CONDITIONS = [
  { value: 'simply_supported', label: 'بسيط الإسناد' },
  { value: 'fixed', label: 'تثبيت كامل' },
  { value: 'partial_fixity', label: 'تثبيت جزئي' },
];

export default function DesignCriteriaForm() {
  const designEnabled = useProjectStore((s) => s.designEnabled);
  const designCriteria = useProjectStore((s) => s.designCriteria);
  const setDesignEnabled = useProjectStore((s) => s.setDesignEnabled);
  const setDesignCriteria = useProjectStore((s) => s.setDesignCriteria);

  const updateField = useCallback(<K extends keyof typeof designCriteria>(
    field: K,
    value: (typeof designCriteria)[K],
  ) => {
    setDesignCriteria({ ...designCriteria, [field]: value });
  }, [designCriteria, setDesignCriteria]);

  const inputCls = 'w-full px-2 py-1 text-xs rounded border';
  const inputStyle = {
    backgroundColor: 'var(--upas-bg-secondary, #f1f5f9)',
    borderColor: 'var(--upas-border, #e2e8f0)',
    color: 'var(--upas-text-primary, #1e293b)',
    direction: 'rtl' as const,
  };

  const checkboxStyle = {
    accentColor: 'var(--upas-primary, #1e3a5f)',
  };

  return (
    <div className="space-y-3 p-3" dir="rtl">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: 'var(--upas-bg-secondary, #f1f5f9)' }}>
        <label className="text-xs font-bold" style={{ color: 'var(--upas-text-primary)' }}>
          تفعيل التصميم الإنشائي
        </label>
        <button
          onClick={() => setDesignEnabled(!designEnabled)}
          className="relative w-10 h-5 rounded-full transition-colors"
          style={{ backgroundColor: designEnabled ? 'var(--upas-primary, #1e3a5f)' : 'var(--upas-border, #cbd5e1)' }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
            style={{ left: designEnabled ? '2px' : '22px' }}
          />
        </button>
      </div>

      {!designEnabled && (
        <p className="text-[10px] text-center py-4" style={{ color: 'var(--upas-text-secondary)' }}>
          فعّل التصميم الإنشائي لإظهار معايير التصميم
        </p>
      )}

      {designEnabled && (
        <>
          {/* Steel Grade + Safety Factor */}
          <fieldset className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
            <legend className="text-[10px] font-bold px-1" style={{ color: 'var(--upas-text-secondary)' }}>
              المعايير الأساسية
            </legend>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
                  درجة الفولاذ (fy)
                </label>
                <select
                  className={inputCls} style={inputStyle}
                  value={designCriteria.steelGrade ?? 420}
                  onChange={(e) => updateField('steelGrade', Number(e.target.value))}
                >
                  {STEEL_GRADES.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
                  معامل الأمان المستهدف
                </label>
                <input
                  className={inputCls} style={inputStyle} type="number" step="0.1" min="1.0" max="3.0"
                  value={designCriteria.targetSafetyFactor ?? 1.5}
                  onChange={(e) => updateField('targetSafetyFactor', Number(e.target.value))}
                />
              </div>
            </div>
          </fieldset>

          {/* Support Conditions */}
          <fieldset className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
            <legend className="text-[10px] font-bold px-1" style={{ color: 'var(--upas-text-secondary)' }}>
              ظروف الإسناد
            </legend>
            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
                  السقف والأرضية
                </label>
                <select
                  className={inputCls} style={inputStyle}
                  value={designCriteria.supportCondition ?? 'simply_supported'}
                  onChange={(e) => updateField('supportCondition', e.target.value as 'simply_supported' | 'fixed' | 'partial_fixity')}
                >
                  {SUPPORT_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
                  الجدران
                </label>
                <select
                  className={inputCls} style={inputStyle}
                  value={designCriteria.wallSupportCondition ?? 'fixed'}
                  onChange={(e) => updateField('wallSupportCondition', e.target.value as 'simply_supported' | 'fixed' | 'partial_fixity')}
                >
                  {SUPPORT_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Concrete & Deflection */}
          <fieldset className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
            <legend className="text-[10px] font-bold px-1" style={{ color: 'var(--upas-text-secondary)' }}>
              الخرسانة والانحراف
            </legend>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
                  غطاء الخرسانة (mm)
                </label>
                <input
                  className={inputCls} style={inputStyle} type="number" step="5" min="20" max="100"
                  value={Math.round((designCriteria.concreteCover ?? 0.050) * 1000)}
                  onChange={(e) => updateField('concreteCover', Number(e.target.value) / 1000)}
                />
              </div>
              <div>
                <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
                  أقصى دوران (deg)
                </label>
                <input
                  className={inputCls} style={inputStyle} type="number" step="0.5" min="1" max="12"
                  value={designCriteria.maxSupportRotation ?? 8.0}
                  onChange={(e) => updateField('maxSupportRotation', Number(e.target.value))}
                />
              </div>
            </div>
          </fieldset>

          {/* Design Options */}
          <fieldset className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
            <legend className="text-[10px] font-bold px-1" style={{ color: 'var(--upas-text-secondary)' }}>
              خيارات التصميم
            </legend>
            <div className="space-y-1.5">
              {([
                { field: 'allowPlasticResponse' as const, label: 'السماح بالاستجابة البلاستيكية', default: true },
                { field: 'includeSelfWeight' as const, label: 'تضمين وزن الذاتي', default: true },
                { field: 'includeOverburden' as const, label: 'تضمين ضغط الغطاء الترابي', default: true },
                { field: 'includeLateralPressure' as const, label: 'تضمين الضغط الجانبي', default: true },
              ] as const).map(({ field, label, default: def }) => (
                <label key={field} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    style={checkboxStyle}
                    checked={designCriteria[field] ?? def}
                    onChange={(e) => updateField(field, e.target.checked)}
                  />
                  <span className="text-[10px]" style={{ color: 'var(--upas-text-primary)' }}>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
    </div>
  );
}