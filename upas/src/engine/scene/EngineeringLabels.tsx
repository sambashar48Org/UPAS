'use client';

import React from 'react';
import { Html } from '@react-three/drei';
import type { Structure } from '../../models/Structure';
import type { SoilProfile } from '../../models/Soil';
import { StructureType } from '../../types';

interface EngineeringLabelsProps {
  structure: Structure | null;
  soilProfile: SoilProfile | null;
}

const TYPE_LABELS: Record<string, string> = {
  box: 'صندوق',
  arch: 'قوس',
  cylinder: 'نفق',
  dome: 'قبة',
  custom: 'مخصص',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  lineHeight: '1.3',
  pointerEvents: 'none',
  userSelect: 'none',
};

const pillClass =
  'bg-gray-900/80 text-white px-2 py-0.5 rounded text-center whitespace-nowrap backdrop-blur-sm';

const EngineeringLabels = React.memo(function EngineeringLabels({
  structure,
  soilProfile,
}: EngineeringLabelsProps) {
  return (
    <group>
      {/* Structure labels */}
      {structure && (
        <>
          <Html
            position={[
              0,
              -Number(structure.burialDepth.value) - Number(structure.height.value) - 0.8,
              0,
            ]}
            center
            distanceFactor={12}
            style={{ pointerEvents: 'none' }}
          >
            <div className={pillClass} style={labelStyle}>
              {structure.name}
            </div>
          </Html>
          <Html
            position={[
              0,
              -Number(structure.burialDepth.value) - Number(structure.height.value) - 0.3,
              0,
            ]}
            center
            distanceFactor={12}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="bg-orange-600/80 text-white px-2 py-0.5 rounded text-center whitespace-nowrap backdrop-blur-sm"
              style={labelStyle}
            >
              {TYPE_LABELS[structure.type] ?? structure.type}
            </div>
          </Html>
        </>
      )}

      {/* Soil layer labels */}
      {soilProfile &&
        soilProfile.layers.map((layer) => {
          const top = Number(layer.topElevation.value);
          const thk = Number(layer.thickness.value);
          return (
            <Html
              key={layer.id}
              position={[0, top - thk / 2, 0]}
              center
              distanceFactor={15}
              style={{ pointerEvents: 'none' }}
            >
              <div className={pillClass} style={labelStyle}>
                {layer.name}
              </div>
            </Html>
          );
        })}
    </group>
  );
});

export default EngineeringLabels;