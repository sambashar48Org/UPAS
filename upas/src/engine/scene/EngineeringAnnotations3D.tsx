/**
 * UPAS — Engineering Annotations 3D
 * Sprint 3C: Floating engineering annotations in the 3D scene.
 *
 * Architecture: Reads EngineeringAnnotationVM[] only.
 * All values, colors, positions pre-computed by GeometryBridge.
 * No engineering logic in this component.
 */

'use client';

import React from 'react';
import { Text } from '@react-three/drei';
import type { EngineeringAnnotationVM } from '../../visualization/VisualizationModel';

interface Props {
  annotations: EngineeringAnnotationVM[];
}

function Annotation({ ann }: { ann: EngineeringAnnotationVM }) {
  return (
    <group position={ann.position}>
      {/* Background pill */}
      <mesh>
        <planeGeometry args={[3.2, 0.45]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.85}
          side={2}
          depthWrite={false}
        />
      </mesh>

      {/* Border */}
      <mesh position={[0, 0, -0.001]}>
        <planeGeometry args={[3.2, 0.45]} />
        <meshBasicMaterial
          color={ann.color}
          transparent
          opacity={0.15}
          side={2}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[-1.4, 0.08, 0.01]}
        fontSize={0.13}
        color={ann.color}
        anchorX="left"
        anchorY="middle"
        fontWeight={600}
      >
        {ann.label}
      </Text>

      {/* Value */}
      <Text
        position={[-1.4, -0.1, 0.01]}
        fontSize={0.14}
        color="#1e293b"
        anchorX="left"
        anchorY="middle"
        font={undefined}
      >
        {ann.value}
      </Text>
    </group>
  );
}

export default function EngineeringAnnotations3D({ annotations }: Props) {
  if (!annotations.length) return null;

  return (
    <group>
      {annotations.map((ann, i) => (
        <Annotation key={`${ann.type}-${i}`} ann={ann} />
      ))}
    </group>
  );
}