import React, { useState } from 'react';
import { useUIStore, type DatabaseView } from '../../../stores/uiStore';
import { useProjectStore } from '../../../stores/projectStore';

import materialsData from '../../../data/materials.json';
import bombTypesData from '../../../data/bomb-types.json';
import soilTypesData from '../../../data/soil-types.json';

const TABS: Array<{ key: DatabaseView; label: string }> = [
  { key: 'bombs', label: 'المتفجرات' },
  { key: 'materials', label: 'المواد' },
  { key: 'soil-types', label: 'أنواع التربة' },
  { key: 'projects', label: 'المشاريع' },
  { key: 'structures', label: 'المنشآت' },
  { key: 'standards', label: 'المعايير' },
];

const TH_CLASS = 'px-4 py-2.5 text-right text-xs font-bold whitespace-nowrap';
const TD_CLASS = 'px-4 py-2 text-right text-sm whitespace-nowrap';

function BombsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className={TH_CLASS}>الاسم</th>
            <th className={TH_CLASS}>الكثافة</th>
            <th className={TH_CLASS}>سرعة الانفجار</th>
            <th className={TH_CLASS}>معادل TNT</th>
            <th className={TH_CLASS}>الوصف</th>
          </tr>
        </thead>
        <tbody>
          {bombTypesData.bombTypes.map((b) => (
            <tr key={b.ref} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--upas-border, #e2e8f0)' }}>
              <td className={`${TD_CLASS} font-medium`}>{b.nameAr}</td>
              <td className={TD_CLASS}>{b.density.value} {b.density.unit}</td>
              <td className={TD_CLASS}>{b.detonationVelocity.value} {b.detonationVelocity.unit}</td>
              <td className={TD_CLASS}>{b.tntEquivalentFactor}</td>
              <td className={`${TD_CLASS} max-w-xs truncate`} style={{ color: 'var(--upas-text-secondary)' }}>{b.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaterialsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className={TH_CLASS}>الاسم</th>
            <th className={TH_CLASS}>f'c (MPa)</th>
            <th className={TH_CLASS}>E (GPa)</th>
            <th className={TH_CLASS}>الكثافة</th>
            <th className={TH_CLASS}>الفئة</th>
          </tr>
        </thead>
        <tbody>
          {materialsData.materials.map((m) => (
            <tr key={m.ref} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--upas-border, #e2e8f0)' }}>
              <td className={`${TD_CLASS} font-medium`}>{m.nameAr}</td>
              <td className={TD_CLASS}>{m.compressiveStrength.value}</td>
              <td className={TD_CLASS}>{m.modulusOfElasticity.value}</td>
              <td className={TD_CLASS}>{m.density.value} {m.density.unit}</td>
              <td className={TD_CLASS}>{m.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SoilTypesTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className={TH_CLASS}>الاسم</th>
            <th className={TH_CLASS}>وزن الوحدة</th>
            <th className={TH_CLASS}>زاوية الاحتكاك</th>
            <th className={TH_CLASS}>التماسك</th>
            <th className={TH_CLASS}>E (MPa)</th>
          </tr>
        </thead>
        <tbody>
          {soilTypesData.soilTypes.map((s) => (
            <tr key={s.ref} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--upas-border, #e2e8f0)' }}>
              <td className={`${TD_CLASS} font-medium`}>{s.nameAr}</td>
              <td className={TD_CLASS}>{s.unitWeight.value} {s.unitWeight.unit}</td>
              <td className={TD_CLASS}>{s.frictionAngle.value}°</td>
              <td className={TD_CLASS}>{s.cohesion.value} {s.cohesion.unit}</td>
              <td className={TD_CLASS}>{s.modulusOfElasticity.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectsTable() {
  const projects = useProjectStore((s) => s.projects);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className={TH_CLASS}>الاسم</th>
            <th className={TH_CLASS}>الوصف</th>
            <th className={TH_CLASS}>الحالة</th>
            <th className={TH_CLASS}>تاريخ الإنشاء</th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--upas-text-secondary)' }}>
                لا توجد مشاريع بعد
              </td>
            </tr>
          ) : (
            projects.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--upas-border, #e2e8f0)' }}>
                <td className={`${TD_CLASS} font-medium`}>{p.name}</td>
                <td className={`${TD_CLASS} max-w-xs truncate`} style={{ color: 'var(--upas-text-secondary)' }}>{p.description || '—'}</td>
                <td className={TD_CLASS}>{p.status}</td>
                <td className={TD_CLASS}>{new Date(p.createdAt).toLocaleDateString('ar')}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: 'var(--upas-bg-secondary)' }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--upas-text-secondary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--upas-text-primary)' }}>
        {label}
      </h2>
      <p className="text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
        قريباً
      </p>
    </div>
  );
}

export default function DatabaseView() {
  const databaseView = useUIStore((s) => s.databaseView);
  const setDatabaseView = useUIStore((s) => s.setDatabaseView);
  const [localTab, setLocalTab] = useState<DatabaseView>('bombs');

  const activeTab = databaseView ?? localTab;

  const handleTabChange = (tab: DatabaseView) => {
    setLocalTab(tab);
    setDatabaseView(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'bombs':
        return <BombsTable />;
      case 'materials':
        return <MaterialsTable />;
      case 'soil-types':
        return <SoilTypesTable />;
      case 'projects':
        return <ProjectsTable />;
      case 'structures':
        return <PlaceholderTab label="المنشآت" />;
      case 'standards':
        return <PlaceholderTab label="المعايير" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--upas-text-primary)' }}>
          قاعدة البيانات
        </h1>
        <p className="text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
          تصفح المتفجرات والمواد وأنواع التربة
        </p>
      </div>

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg overflow-x-auto"
        style={{ backgroundColor: 'var(--upas-bg-secondary)' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: isActive ? 'var(--upas-bg-card, #fff)' : 'transparent',
                color: isActive ? 'var(--upas-text-primary, #1e293b)' : 'var(--upas-text-secondary, #64748b)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--upas-bg-card)',
          borderColor: 'var(--upas-border)',
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}