/**
 * UPAS — Damage Zones 3D Component
 * Sprint 3B: Renders damage zones and pressure contours in the 3D scene.
 * Reads from VisualizationModel — never FullAnalysisResult directly.
 *
 * Architecture: No engineering logic. Colors/positions pre-computed in VisualizationAdapter.
 */

import React from 'react';
import { Text } from '@react-three/drei';
import type { VisualizationModel } from '../../visualization/VisualizationModel';

interface Props {
  data: VisualizationModel;
}

export default function DamageZones3D({ data }: Props) {
  return (
    <group>
      {/* Damage zone spheres */}
      {data.damageZones.map((zone, i) => (
        <mesh key={`dz-${i}`} position={zone.position}>
          <sphereGeometry args={[zone.radius, 32, 16]} />
          <meshStandardMaterial
            color={zone.color}
            transparent
            opacity={zone.opacity}
            side={2} // DoubleSide
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Pressure contour rings */}
      {data.pressureContours.map((contour, i) => (
        <group key={`pc-${i}`} position={[data.damageZones[0]?.position[0] ?? 0, (data.damageZones[0]?.position[1] ?? 0) - 0.05, data.damageZones[0]?.position[2] ?? 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[contour.radius - 0.03, contour.radius + 0.03, 48]} />
            <meshBasicMaterial
              color={contour.color}
              transparent
              opacity={contour.opacity + 0.1}
              side={2}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}