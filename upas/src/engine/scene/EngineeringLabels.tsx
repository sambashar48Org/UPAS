'use client';

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { Structure } from '../../models/Structure';
import type { SoilProfile } from '../../models/Soil';
import { StructureType } from '../../types';
import { getSoilTypeByRef, getMaterialByRef } from '../../database';

interface EngineeringLabelsProps {
  structure: Structure | null;
  soilProfile: SoilProfile | null;
}

const TYPE_LABELS: Record<string, string> = {
  box: 'صندوق',
  arch: 'قوس',
  cylinder: 'نفق دائري',
  dome: 'قبة',
  custom: 'مخصص',
};

const labelBoxStyle: React.CSSProperties = {
  fontSize: '10px',
  lineHeight: '1.4',
  pointerEvents: 'none',
  userSelect: 'none',
  fontFamily: "'Segoe UI', Tahoma, sans-serif",
};

function StructureLabel({ structure }: { structure: Structure }) {
  const len = Number(structure.length.value);
  const wid = Number(structure.width.value);
  const hgt = Number(structure.height.value);
  const rt = Number(structure.roofThickness.value);
  const wt = Number(structure.wallThickness.value);
  const ft = Number(structure.floorThickness.value);

  const roofMat = getMaterialByRef(structure.roofMaterialRef);

  const bd = Number(structure.burialDepth.value);
  const labelY = -bd - hgt - 0.6;

  return (
    <group>
      {/* Main structure label */}
      <Html
        position={[0, labelY - 0.5, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <div style={labelBoxStyle}>
          <div
            style={{
              background: 'rgba(30, 58, 95, 0.9)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(4px)',
              borderBottom: '2px solid #f59e0b',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '11px' }}>{structure.name}</div>
            <div style={{ opacity: 0.8, fontSize: '9px', marginTop: 1 }}>
              {TYPE_LABELS[structure.type] ?? structure.type} — {len}×{wid}×{hgt} m
            </div>
            {roofMat && (
              <div style={{ opacity: 0.7, fontSize: '9px', marginTop: 1 }}>
                {roofMat.nameAr}
              </div>
            )}
          </div>
        </div>
      </Html>

      {/* Part labels — positioned on each part */}
      {/* Roof label */}
      <Html
        position={[0, -bd - rt / 2, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div style={labelBoxStyle}>
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.85)',
              color: '#fff',
              padding: '1px 6px',
              borderRadius: '3px',
              fontSize: '9px',
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            السقف {rt} m
          </div>
        </div>
      </Html>

      {/* Floor label */}
      <Html
        position={[0, -bd - hgt + ft / 2, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div style={labelBoxStyle}>
          <div
            style={{
              background: 'rgba(107, 114, 128, 0.85)',
              color: '#fff',
              padding: '1px 6px',
              borderRadius: '3px',
              fontSize: '9px',
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            الأرضية {ft} m
          </div>
        </div>
      </Html>

      {/* Wall label — on the right wall (front face) */}
      <Html
        position={[0, -bd - hgt / 2, wid / 2 + 0.3]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div style={labelBoxStyle}>
          <div
            style={{
              background: 'rgba(100, 116, 139, 0.85)',
              color: '#fff',
              padding: '1px 6px',
              borderRadius: '3px',
              fontSize: '9px',
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            الجدار {wt} m
          </div>
        </div>
      </Html>
    </group>
  );
}

function SoilLayerLabel({
  layer,
}: {
  layer: { id: string; name: string; topElevation: { value: number; unit: string }; thickness: { value: number; unit: string }; soilTypeRef: string };
}) {
  const top = Number(layer.topElevation.value);
  const thk = Number(layer.thickness.value);
  const yPos = top - thk / 2;

  const soilType = getSoilTypeByRef(layer.soilTypeRef);

  return (
    <Html
      position={[0, yPos, 0]}
      center
      distanceFactor={12}
      style={{ pointerEvents: 'none' }}
    >
      <div style={labelBoxStyle}>
        <div
          style={{
            background: 'rgba(30, 30, 30, 0.78)',
            color: '#fff',
            padding: '3px 8px',
            borderRadius: '4px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
            borderLeft: '3px solid #f59e0b',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '10px' }}>{layer.name}</div>
          <div style={{ opacity: 0.7, fontSize: '9px' }}>
            {thk} m
            {soilType && (
              <span style={{ opacity: 0.6 }}>
                {' '}({soilType.unitWeight.value} kN/m³)
              </span>
            )}
          </div>
        </div>
      </div>
    </Html>
  );
}

const EngineeringLabels = React.memo(function EngineeringLabels({
  structure,
  soilProfile,
}: EngineeringLabelsProps) {
  return (
    <group>
      {/* Structure labels */}
      {structure && <StructureLabel structure={structure} />}

      {/* Soil layer labels — only show if not in surface mode */}
      {soilProfile && soilProfile.layers.map((layer) => (
        <SoilLayerLabel key={layer.id} layer={layer} />
      ))}

      {/* Ground level marker */}
      <Html
        position={[0, 0.3, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
      >
        <div style={labelBoxStyle}>
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.85)',
              color: '#fff',
              padding: '1px 8px',
              borderRadius: '3px',
              fontSize: '9px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            ── مستوى سطح الأرض (±0.00) ──
          </div>
        </div>
      </Html>
    </group>
  );
});

export default EngineeringLabels;