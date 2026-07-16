import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import { getSoilTypeByRef, getMaterialByRef } from '../../database';
import type { EngineeringValue } from '../../types';
import { StructureType } from '../../types';

function Ev({ value, decimals = 2 }: { value: EngineeringValue; decimals?: number }) {
  return (
    <span className="font-mono">
      {Number(value.value).toFixed(decimals)}{' '}
      <span className="text-[10px] opacity-60">{value.unit}</span>
    </span>
  );
}

function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h4
        className="text-[11px] font-bold mb-1.5 pb-1 border-b flex items-center gap-1.5"
        style={{ color: 'var(--upas-text-secondary)', borderColor: 'var(--upas-border)' }}
      >
        {icon && <span>{icon}</span>}
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className="flex justify-between items-center py-1 text-xs"
      style={highlight ? { backgroundColor: 'rgba(245, 158, 11, 0.08)', padding: '4px 6px', borderRadius: '4px', margin: '2px -6px' } : undefined}
    >
      <span style={{ color: 'var(--upas-text-secondary)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--upas-text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t" style={{ borderColor: 'var(--upas-border)' }} />;
}

const TYPE_LABELS_AR: Record<string, string> = {
  box: 'صندوق (Box)',
  arch: 'قوس (Arch)',
  cylinder: 'نفق دائري (Cylinder)',
  dome: 'قبة (Dome)',
  custom: 'مخصص (Custom)',
};

const PART_LABELS: Record<string, { label: string; icon: string }> = {
  roof: { label: 'السقف', icon: '▬' },
  wall: { label: 'الجدران', icon: '║' },
  floor: { label: 'الأرضية', icon: '━━' },
};

export default function PropertiesPanel() {
  const propertiesPanelOpen = useUIStore((s) => s.propertiesPanelOpen);
  const selectedObjectType = useUIStore((s) => s.selectedObjectType);
  const selectedStructurePart = useUIStore((s) => s.selectedStructurePart);
  const setPropertiesPanelOpen = useUIStore((s) => s.setPropertiesPanelOpen);

  const structure = useProjectStore((s) => s.structure);
  const soilProfile = useProjectStore((s) => s.soilProfile);
  const selectedObjectId = useUIStore((s) => s.selectedObjectId);
  const lastFullResult = useProjectStore((s) => s.lastFullResult);

  if (!propertiesPanelOpen) return null;

  let content: React.ReactNode = null;
  let title = '';

  // ─── Structure or Structure Part selected ───────────────
  if ((selectedObjectType === 'structure' || selectedObjectType === 'structure-part') && structure) {
    const isPart = selectedObjectType === 'structure-part' && selectedStructurePart;
    const partInfo = selectedStructurePart ? PART_LABELS[selectedStructurePart] : null;

    // Look up materials
    const roofMat = getMaterialByRef(structure.roofMaterialRef);
    const wallMat = getMaterialByRef(structure.wallMaterialRef);
    const floorMat = getMaterialByRef(structure.floorMaterialRef);

    title = isPart && partInfo
      ? `${partInfo.icon} ${partInfo.label} — ${structure.name}`
      : `المنشأ — ${structure.name}`;

    content = (
      <>
        {/* Type info */}
        <Section title="النوع" icon="◈">
          <Row label="الشكل" value={TYPE_LABELS_AR[structure.type] ?? structure.type} />
        </Section>

        {/* Overall dimensions */}
        <Section title="الأبعاد الكلية" icon="📏">
          <Row label="الطول" value={<Ev value={structure.length} />} />
          <Row label="العرض" value={<Ev value={structure.width} />} />
          <Row label="الارتفاع" value={<Ev value={structure.height} />} />
          <Row label="عمق الدفن" value={<Ev value={structure.burialDepth} />} />
        </Section>

        {/* Thicknesses — highlight selected part */}
        <Section title="السماكات" icon="◧">
          <Row
            label="السقف"
            value={<Ev value={structure.roofThickness} />}
            highlight={selectedStructurePart === 'roof'}
          />
          <Row
            label="الجدران"
            value={<Ev value={structure.wallThickness} />}
            highlight={selectedStructurePart === 'wall'}
          />
          <Row
            label="الأرضية"
            value={<Ev value={structure.floorThickness} />}
            highlight={selectedStructurePart === 'floor'}
          />
        </Section>

        {/* Materials with real data from JSON */}
        <Section title="المواد" icon="⚙">
          <Row
            label="السقف"
            value={roofMat ? `${roofMat.nameAr} (${roofMat.compressiveStrength.value} MPa)` : structure.roofMaterialRef}
            highlight={selectedStructurePart === 'roof'}
          />
          {roofMat && selectedStructurePart === 'roof' && (
            <div className="mt-1 space-y-0.5 text-[11px]" style={{ color: 'var(--upas-text-secondary)' }}>
              <Row label="الكثافة" value={<Ev value={roofMat.density} decimals={0} />} />
              <Row label="معامل المرونة" value={<Ev value={roofMat.modulusOfElasticity} />} />
              <Row label="DIF ضغط" value={roofMat.dynamicIncreaseFactorCompressive.toFixed(2)} />
              <Row label="DIF شد" value={roofMat.dynamicIncreaseFactorTensile.toFixed(2)} />
            </div>
          )}

          <Divider />
          <Row
            label="الجدران"
            value={wallMat ? `${wallMat.nameAr} (${wallMat.compressiveStrength.value} MPa)` : structure.wallMaterialRef}
            highlight={selectedStructurePart === 'wall'}
          />
          {wallMat && selectedStructurePart === 'wall' && (
            <div className="mt-1 space-y-0.5 text-[11px]" style={{ color: 'var(--upas-text-secondary)' }}>
              <Row label="الكثافة" value={<Ev value={wallMat.density} decimals={0} />} />
              <Row label="معامل المرونة" value={<Ev value={wallMat.modulusOfElasticity} />} />
            </div>
          )}

          <Divider />
          <Row
            label="الأرضية"
            value={floorMat ? `${floorMat.nameAr} (${floorMat.compressiveStrength.value} MPa)` : structure.floorMaterialRef}
            highlight={selectedStructurePart === 'floor'}
          />
          {floorMat && selectedStructurePart === 'floor' && (
            <div className="mt-1 space-y-0.5 text-[11px]" style={{ color: 'var(--upas-text-secondary)' }}>
              <Row label="الكثافة" value={<Ev value={floorMat.density} decimals={0} />} />
              <Row label="معامل المرونة" value={<Ev value={floorMat.modulusOfElasticity} />} />
            </div>
          )}
        </Section>

        {/* Sprint 3C: Analysis response for selected part */}
        {isPart && selectedStructurePart && lastFullResult && (() => {
          const elemKey = selectedStructurePart as 'roof' | 'wall' | 'floor';
          const resp = lastFullResult.blast[`${elemKey}Response` as keyof typeof lastFullResult.blast];
          const pen = lastFullResult.penetration[`${elemKey}Penetration` as keyof typeof lastFullResult.penetration];
          if (!resp && !pen) return null;
          return (
            <>
              <Divider />
              <Section title="استجابة التحليل" icon="📊">
                {resp && (
                  <>
                    <Row label="معامل الأمان" value={resp.safetyFactor.toFixed(2)} highlight={resp.safetyFactor < 1.2} />
                    <Row label="الضغط المطبق" value={`${resp.appliedPressure.toFixed(1)} kPa`} />
                    <Row label="المقاومة الديناميكية" value={`${resp.dynamicResistance.toFixed(1)} kPa`} />
                    <Row label="نمط الاستجابة" value={resp.responseMode === 'elastic' ? 'مرن' : resp.responseMode === 'plastic' ? 'لدن' : 'فشل'} highlight={resp.responseMode === 'failure'} />
                    <Row label="الإزاحة القصوى" value={`${resp.maxDisplacement.toFixed(2)} mm`} />
                    <Row label="دوران الدعامات" value={`${resp.supportRotation.toFixed(2)}°`} />
                    <Row label="الدوران الطبيعي" value={`${resp.naturalPeriod.toFixed(2)} ms`} />
                  </>
                )}
                {pen && (
                  <>
                    <Divider />
                    <Row label="عمق الاختراق" value={`${(pen.penetrationDepthStructure * 1000).toFixed(1)} mm`} highlight={pen.isPerforated} />
                    <Row label="اختراق كامل" value={pen.isPerforated ? 'نعم' : 'لا'} color={pen.isPerforated ? '#dc2626' : '#22c55e'} />
                    <Row label="تقشر" value={pen.isSpalled ? 'نعم' : 'لا'} color={pen.isSpalled ? '#f97316' : '#22c55e'} />
                    <Row label="قطر الحفرة" value={`${pen.craterDiameter.toFixed(2)} m`} />
                    <Row label="عمق الحفرة" value={`${pen.craterDepth.toFixed(2)} m`} />
                  </>
                )}
              </Section>
            </>
          );
        })()}
      </>
    );
  }
  // ─── Soil Layer selected ────────────────────────────────
  else if (selectedObjectType === 'soil-layer' && soilProfile && selectedObjectId) {
    const layer = soilProfile.layers.find((l) => l.id === selectedObjectId);
    if (layer) {
      const soilType = getSoilTypeByRef(layer.soilTypeRef);
      title = layer.name;

      content = (
        <>
          <Section title="معلومات الطبقة" icon="▓">
            <Row label="الاسم" value={layer.name} />
            <Row label="نوع التربة" value={soilType?.nameAr ?? layer.soilTypeRef} />
            <Row label="الفئة" value={
              soilType?.category === 'cohesiveless' ? 'غير تماسكي' :
              soilType?.category === 'cohesive' ? 'تماسكي' :
              soilType?.category === 'rock' ? 'صخري' : layer.soilTypeRef
            } />
          </Section>

          <Section title="الأبعاد" icon="📏">
            <Row label="السماكة" value={<Ev value={layer.thickness} />} />
            <Row label="أعلى الطبقة" value={<Ev value={layer.topElevation} />} />
            <Row
              label="أسفل الطبقة"
              value={(
                <span className="font-mono">
                  {(Number(layer.topElevation.value) - Number(layer.thickness.value)).toFixed(2)}{' '}
                  <span className="text-[10px] opacity-60">{layer.topElevation.unit}</span>
                </span>
              )}
            />
          </Section>

          {soilType && (
            <Section title="الخصائص الهندسية" icon="⚙">
              <Row label="وزن الوحدة" value={<Ev value={soilType.unitWeight} />} />
              <Row label="زاوية الاحتكاك" value={<Ev value={soilType.frictionAngle} />} />
              <Row label="التماسك" value={<Ev value={soilType.cohesion} />} />
              <Row label="معامل المرونة E" value={<Ev value={soilType.modulusOfElasticity} />} />
              <Row label="نسبة بواسون" value={soilType.poissonRatio.toFixed(2)} />
              <Row label="سرعة الموجة" value={<Ev value={soilType.waveVelocity} />} />
            </Section>
          )}

          {soilType?.description && (
            <div
              className="mt-2 text-[11px] p-2 rounded"
              style={{ color: 'var(--upas-text-secondary)', backgroundColor: 'var(--upas-bg-secondary)' }}
            >
              {soilType.description}
            </div>
          )}
        </>
      );
    }
  }

  if (!content) return null;

  return (
    <div
      className="h-full overflow-y-auto border-l"
      style={{
        width: 300,
        minWidth: 300,
        backgroundColor: 'var(--upas-bg-card)',
        borderColor: 'var(--upas-border)',
        borderLeftWidth: 1,
      }}
      dir="rtl"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
        style={{ borderColor: 'var(--upas-border)' }}
      >
        <h3 className="text-xs font-bold truncate" style={{ color: 'var(--upas-text-primary)' }}>
          {title}
        </h3>
        <button
          onClick={() => setPropertiesPanelOpen(false)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 transition-colors text-xs"
          style={{ color: 'var(--upas-text-secondary)' }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-2">{content}</div>
    </div>
  );
}