/**
 * UPAS — Structure Form Component
 * Sprint 3B: Edit structure properties — reads from database, writes to projectStore.
 * Architecture: NO validation, NO calculations — only UI + state management.
 */

import React, { useCallback } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { getMaterials } from '../../../database';
import { StructureType } from '../../../types';

const STRUCTURE_TYPES = [
  { value: StructureType.Box, label: 'صندوق (Box)' },
  { value: StructureType.Arch, label: 'قوس (Arch)' },
  { value: StructureType.Cylinder, label: 'نفق دائري (Cylinder)' },
  { value: StructureType.Dome, label: 'قبة (Dome)' },
];

export default function StructureForm() {
  const structure = useProjectStore((s) => s.structure);
  const setStructure = useProjectStore((s) => s.setStructure);
  const materials = getMaterials();

  const updateField = useCallback((field: string, value: string | number) => {
    if (!structure) return;
    const evFields = ['length', 'width', 'height', 'wallThickness', 'roofThickness', 'floorThickness', 'burialDepth'];
    if (evFields.includes(field)) {
      setStructure({ ...structure, [field]: { value: Number(value), unit: 'm' } });
    } else {
      setStructure({ ...structure, [field]: value });
    }
  }, [structure, setStructure]);

  if (!structure) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
        لا يوجد منشأ
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

  const ev = (field: string) => {
    const raw = (structure as unknown as Record<string, unknown>)[field];
    return Number((raw as { value: number } | undefined)?.value ?? 0);
  };

  return (
    <div className="space-y-3 p-3" dir="rtl">
      {/* Name + Type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--upas-text-secondary)' }}>اسم المنشأ</label>
          <input className={inputCls} style={inputStyle} value={structure.name} onChange={(e) => updateField('name', e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--upas-text-secondary)' }}>النوع</label>
          <select className={inputCls} style={inputStyle} value={structure.type} onChange={(e) => updateField('type', e.target.value)}>
            {STRUCTURE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Dimensions */}
      <fieldset className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
        <legend className="text-[10px] font-bold px-1" style={{ color: 'var(--upas-text-secondary)' }}>الأبعاد (m)</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { field: 'length', label: 'الطول' },
            { field: 'width', label: 'العرض' },
            { field: 'height', label: 'الارتفاع' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>{label}</label>
              <input
                className={inputCls} style={inputStyle} type="number" step="0.1" min="0.1"
                value={ev(field)} onChange={(e) => updateField(field, e.target.value)}
              />
            </div>
          ))}
        </div>
      </fieldset>

      {/* Thicknesses */}
      <fieldset className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
        <legend className="text-[10px] font-bold px-1" style={{ color: 'var(--upas-text-secondary)' }}>السماكات (m)</legend>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { field: 'roofThickness', label: 'السقف' },
            { field: 'wallThickness', label: 'الجدران' },
            { field: 'floorThickness', label: 'الأرضية' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="text-[10px] block mb-0.5" style={{ color: 'var(--upas-text-secondary)' }}>{label}</label>
              <input
                className={inputCls} style={inputStyle} type="number" step="0.01" min="0.01"
                value={ev(field)} onChange={(e) => updateField(field, e.target.value)}
              />
            </div>
          ))}
        </div>
      </fieldset>

      {/* Burial Depth */}
      <div>
        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--upas-text-secondary)' }}>عمق الدفن (m)</label>
        <input
          className={inputCls} style={inputStyle} type="number" step="0.1" min="0"
          value={ev('burialDepth')} onChange={(e) => updateField('burialDepth', e.target.value)}
        />
      </div>

      {/* Materials */}
      <fieldset className="border rounded p-2" style={{ borderColor: 'var(--upas-border)' }}>
        <legend className="text-[10px] font-bold px-1" style={{ color: 'var(--upas-text-secondary)' }}>المواد</legend>
        <div className="space-y-1.5">
          {[
            { field: 'roofMaterialRef', label: 'السقف' },
            { field: 'wallMaterialRef', label: 'الجدران' },
            { field: 'floorMaterialRef', label: 'الأرضية' },
          ].map(({ field, label }) => (
            <div key={field} className="flex items-center gap-2">
              <span className="text-[10px] w-14 shrink-0" style={{ color: 'var(--upas-text-secondary)' }}>{label}</span>
              <select
                className={inputCls} style={inputStyle}
                value={(structure as unknown as Record<string, string>)[field] ?? ''}
                onChange={(e) => updateField(field, e.target.value)}
              >
                {materials.map((m) => <option key={m.ref} value={m.ref}>{m.nameAr} ({m.compressiveStrength.value} MPa)</option>)}
              </select>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}