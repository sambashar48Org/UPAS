/**
 * UPAS — Stress Overlay 3D
 * Sprint 3C: Color-codes structure elements based on analysis results.
 *
 * Visualization ONLY — no FEA, no additional physics.
 * Reads StressOverlayVM — colors already pre-computed by adapter.
 *
 * This component renders transparent colored overlays on top of
 * structure parts. The actual structure meshes handle click events;
 * this is purely visual.
 */

'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { StressOverlayVM } from '../../visualization/VisualizationModel';
import type { Structure } from '../../models/Structure';

interface StressOverlay3DProps {
  structure: Structure;
  overlay: StressOverlayVM;
}

function OverlayMesh({
  position,
  args,
  color,
}: {
  position: [number, number, number];
  args: [number, number, number];
  color: string;
}) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 0.35,
    roughness: 0.5,
    metalness: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), [color]);

  return (
    <mesh position={position} material={mat}>
      <boxGeometry args={args} />
    </mesh>
  );
}

export default function StressOverlay3D({ structure, overlay }: StressOverlay3DProps) {
  if (!overlay.hasData) return null;

  const len = Number(structure.length.value);
  const wid = Number(structure.width.value);
  const hgt = Number(structure.height.value);
  const rt = Number(structure.roofThickness.value);
  const wt = Number(structure.wallThickness.value);
  const ft = Number(structure.floorThickness.value);
  const bd = Number(structure.burialDepth.value);

  const centerY = -bd - hgt / 2;
  const wallH = Math.max(0.01, hgt - rt - ft);

  return (
    <group>
      {/* Roof overlay */}
      <OverlayMesh
        position={[0, centerY + hgt / 2 - rt / 2, 0]}
        args={[len, rt, wid]}
        color={overlay.elementColors.roof}
      />

      {/* Wall overlay — front + back */}
      <OverlayMesh
        position={[0, centerY, wid / 2 - wt / 2]}
        args={[len, wallH, wt]}
        color={overlay.elementColors.wall}
      />
      <OverlayMesh
        position={[0, centerY, -(wid / 2 - wt / 2)]}
        args={[len, wallH, wt]}
        color={overlay.elementColors.wall}
      />

      {/* Wall overlay — left + right */}
      <OverlayMesh
        position={[-(len / 2 - wt / 2), centerY, 0]}
        args={[wt, wallH, wid]}
        color={overlay.elementColors.wall}
      />
      <OverlayMesh
        position={[len / 2 - wt / 2, centerY, 0]}
        args={[wt, wallH, wid]}
        color={overlay.elementColors.wall}
      />

      {/* Floor overlay */}
      <OverlayMesh
        position={[0, centerY - hgt / 2 + ft / 2, 0]}
        args={[len, ft, wid]}
        color={overlay.elementColors.floor}
      />
    </group>
  );
}