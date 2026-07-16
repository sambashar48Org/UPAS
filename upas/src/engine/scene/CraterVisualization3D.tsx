/**
 * UPAS — Crater Visualization 3D
 * Sprint 3C: Renders a crater depression in the soil at the threat location.
 *
 * Visualization ONLY — dimensions come from CraterVM (built by GeometryBridge).
 * Uses a cylinder with a concave top (via LatheGeometry) to suggest a crater bowl.
 */

'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { CraterVM } from '../../visualization/VisualizationModel';

interface Props {
  data: CraterVM;
}

export default function CraterVisualization3D({ data }: Props) {
  const craterGeo = useMemo(() => {
    // Build a bowl-shaped crater using LatheGeometry
    // Cross-section: parabolic curve from center bottom to rim
    const points: THREE.Vector2[] = [];
    const segments = 16;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments; // 0 = center, 1 = rim
      const r = t * data.radius;
      // Parabolic depth: deepest at center
      const y = data.depth * (1 - t * t);
      points.push(new THREE.Vector2(r, y));
    }
    return new THREE.LatheGeometry(points, 32);
  }, [data.radius, data.depth]);

  const craterMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: data.color,
    transparent: true,
    opacity: 0.6,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), [data.color]);

  // Rim ring
  const rimGeo = useMemo(() => {
    return new THREE.TorusGeometry(data.radius, 0.05, 8, 48);
  }, [data.radius]);

  const rimMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: data.borderColor,
    transparent: true,
    opacity: 0.7,
  }), [data.borderColor]);

  return (
    <group position={[data.position[0], data.position[1], data.position[2]]}>
      {/* Crater bowl */}
      <mesh geometry={craterGeo} material={craterMat} rotation={[0, 0, 0]} />

      {/* Rim ring */}
      <mesh geometry={rimGeo} material={rimMat} rotation={[Math.PI / 2, 0, 0]} />

      {/* Label */}
      <Text
        position={[data.radius + 0.3, 0.3, 0]}
        fontSize={0.18}
        color={data.borderColor}
        anchorX="left"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#00000080"
      >
        {data.label}
      </Text>
    </group>
  );
}