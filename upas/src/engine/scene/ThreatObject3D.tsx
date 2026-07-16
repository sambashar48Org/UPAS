/**
 * UPAS — Threat Object 3D Component
 * Sprint 3B: Renders the explosive threat in the 3D scene.
 * Reads from ThreatObjectVM — never FullAnalysisResult directly.
 *
 * Architecture: No engineering logic. Colors/positions pre-computed in VisualizationAdapter.
 */

import React, { useRef, useMemo } from 'react';
import { Text } from '@react-three/drei';
import type { ThreatObjectVM } from '../../visualization/VisualizationModel';

interface Props {
  data: ThreatObjectVM;
}

export default function ThreatObject3D({ data }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const size = useMemo(() => ({
    sx: Math.max(data.size[0], 0.1),
    sy: Math.max(data.size[1], 0.1),
    sz: Math.max(data.size[2], 0.1),
  }), [data.size]);

  const [px, py, pz] = data.position;

  return (
    <group ref={groupRef} position={[px, py, pz]}>
      {/* Charge body */}
      {data.chargeShape === 'spherical' ? (
        <mesh>
          <sphereGeometry args={[size.sx / 2, 16, 16]} />
          <meshStandardMaterial
            color={data.color}
            transparent
            opacity={0.85}
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
      ) : (
        <mesh>
          <cylinderGeometry args={[size.sx / 2, size.sx / 2, size.sy, 16]} rotation={[0, 0, 0]} />
          <meshStandardMaterial
            color={data.color}
            transparent
            opacity={0.85}
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
      )}

      {/* Direction line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, data.direction[0] * 2, data.direction[1] * 2, data.direction[2] * 2]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={data.color} linewidth={1} />
      </line>

      {/* Label */}
      <Text
        position={[0, size.sy / 2 + 0.3, 0]}
        fontSize={0.22}
        color={data.color}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#00000080"
      >
        {data.label} ({data.chargeMassKg.toFixed(0)} kg)
      </Text>
    </group>
  );
}