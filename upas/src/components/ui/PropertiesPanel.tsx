import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import type { EngineeringValue } from '../../types';

function Ev({ value }: { value: EngineeringValue }) {
  return (
    <span>
      {Number(value.value).toFixed(2)} <span className="text-xs opacity-70">{value.unit}</span>
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4
        className="text-xs font-bold mb-2 pb-1 border-b"
        style={{ color: 'var(--upas-text-secondary)', borderColor: 'var(--upas-border)' }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1 text-sm">
      <span style={{ color: 'var(--upas-text-secondary)' }}>{label}</span>
      <span className="font-mono text-xs" style={{ color: 'var(--upas-text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

export default function PropertiesPanel() {
  const propertiesPanelOpen = useUIStore((s) => s.propertiesPanelOpen);
  const selectedObjectType = useUIStore((s) => s.selectedObjectType);
  const setPropertiesPanelOpen = useUIStore((s) => s.setPropertiesPanelOpen);

  const structure = useProjectStore((s) => s.structure);
  const soilProfile = useProjectStore((s) => s.soilProfile);
  const selectedObjectId = useUIStore((s) => s.selectedObjectId);

  if (!propertiesPanelOpen) return null;

  let content: React.ReactNode = null;

  if (selectedObjectType === 'structure' && structure) {
    content = (
      <>
        <Section title="الأبعاد">
          <Row label="الطول" value={<Ev value={structure.length} />} />
          <Row label="العرض" value={<Ev value={structure.width} />} />
          <Row label="الارتفاع" value={<Ev value={structure.height} />} />
        </Section>
        <Section title="السماكات">
          <Row label="الجدار" value={<Ev value={structure.wallThickness} />} />
          <Row label="السقف" value={<Ev value={structure.roofThickness} />} />
          <Row label="الأرضية" value={<Ev value={structure.floorThickness} />} />
        </Section>
        <Section title="المادة">
          <Row label="الجدار" value={structure.wallMaterialRef} />
          <Row label="السقف" value={structure.roofMaterialRef} />
          <Row label="الأرضية" value={structure.floorMaterialRef} />
        </Section>
        <Section title="الدفن">
          <Row label="عمق الدفن" value={<Ev value={structure.burialDepth} />} />
        </Section>
      </>
    );
  } else if (selectedObjectType === 'soil-layer' && soilProfile && selectedObjectId) {
    const layer = soilProfile.layers.find((l) => l.id === selectedObjectId);
    if (layer) {
      content = (
        <>
          <Section title="السماكة">
            <Row label="السماكة" value={<Ev value={layer.thickness} />} />
          </Section>
          <Section title="نوع التربة">
            <Row label="المرجع" value={layer.soilTypeRef} />
          </Section>
          <Section title="المستوى">
            <Row label="أعلى الطبقة" value={<Ev value={layer.topElevation} />} />
          </Section>
          {layer.description && (
            <div className="mt-3 text-xs" style={{ color: 'var(--upas-text-secondary)' }}>
              {layer.description}
            </div>
          )}
        </>
      );
    }
  }

  if (!content) return null;

  const title =
    selectedObjectType === 'structure' && structure
      ? `المنشأ — ${structure.name}`
      : selectedObjectType === 'soil-layer' && soilProfile && selectedObjectId
        ? soilProfile.layers.find((l) => l.id === selectedObjectId)?.name ?? 'طبقة تربة'
        : '';

  return (
    <div
      className="h-full overflow-y-auto border-l"
      style={{
        width: 320,
        minWidth: 320,
        backgroundColor: 'var(--upas-bg-card)',
        borderColor: 'var(--upas-border)',
        borderLeftWidth: 1,
      }}
      dir="rtl"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--upas-border)' }}
      >
        <h3 className="text-sm font-bold truncate" style={{ color: 'var(--upas-text-primary)' }}>
          {title}
        </h3>
        <button
          onClick={() => setPropertiesPanelOpen(false)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
          style={{ color: 'var(--upas-text-secondary)' }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">{content}</div>
    </div>
  );
}