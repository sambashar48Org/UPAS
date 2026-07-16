/**
 * UPAS — Dome Structure 3D Component
 * Sprint 3C: Renders dome-type protective structure.
 *
 * Geometry: Hemisphere cap on top of a rectangular box base.
 * - Box base: L × W × (H - domeRadius)
 * - Dome cap: 2/3 π r³ hemisphere, r = domeRadius
 *
 * Architecture: Reads Structure model only. No engineering logic.
 * Colors come from props (stressColor) — pre-computed by adapter.
 */

'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { Structure } from '../../models/Structure';
import { useUIStore } from '../../stores/uiStore';

interface DomeStructureProps {
  structure: Structure;
  isSelected: boolean;
  onSelect: () => void;
  stressColor?: { roof: string; wall: string; floor: string };
}

const CONCRETE_COLOR = '#a8b5c4';
const CONCRETE_SELECTED = '#f97316';
const CONCRETE_ROOF_COLOR = '#8fa4b8';
const CONCRETE_FLOOR_COLOR = '#7a8a96';

function getPartMaterial(
  isSelected: boolean,
  partSelected: boolean,
  baseColor: string,
  highlight: string,
) {
  const active = isSelected || partSelected;
  return new THREE.MeshStandardMaterial({
    color: active ? highlight : baseColor,
    transparent: false,
    opacity: 1,
    roughness: active ? 0.4 : 0.65,
    metalness: 0.05,
    side: THREE.DoubleSide,
    emissive: active ? highlight : '#000000',
    emissiveIntensity: active ? 0.08 : 0,
  });
}

function DomeStructure({ structure, isSelected, onSelect, stressColor }: DomeStructureProps) {
  const selectedPart = useUIStore((s) => s.selectedStructurePart);
  const setSelectedStructurePart = useUIStore((s) => s.setSelectedStructurePart);

  const len = Number(structure.length.value);
  const wid = Number(structure.width.value);
  const hgt = Number(structure.height.value);
  const wt = Number(structure.wallThickness.value);
  const rt = Number(structure.roofThickness.value);
  const ft = Number(structure.floorThickness.value);
  const bd = Number(structure.burialDepth.value);

  const domeRadius = wid / 2;
  const boxH = Math.max(0.01, hgt - domeRadius - ft);
  const wallH = Math.max(0.01, hgt - domeRadius - ft);
  const centerY = -bd - hgt / 2;

  // Use stress colors if available, otherwise default
  const roofBaseColor = stressColor?.roof ?? CONCRETE_ROOF_COLOR;
  const wallBaseColor = stressColor?.wall ?? CONCRETE_COLOR;
  const floorBaseColor = stressColor?.floor ?? CONCRETE_FLOOR_COLOR;

  const roofMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'roof', roofBaseColor, CONCRETE_SELECTED), [isSelected, selectedPart, roofBaseColor]);
  const wallMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'wall', wallBaseColor, CONCRETE_SELECTED), [isSelected, selectedPart, wallBaseColor]);
  const floorMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'floor', floorBaseColor, CONCRETE_SELECTED), [isSelected, selectedPart, floorBaseColor]);

  const handleRoofClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('roof'); };
  const handleWallClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('wall'); };
  const handleFloorClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('floor'); };

  // Dome cap Y position (top of box portion)
  const boxTopY = centerY - hgt / 2 + ft + wallH;

  // Sphere geometry for dome: use upper hemisphere
  // Position at top of box wall
  const domeGeo = useMemo(() => {
    const geo = new THREE.SphereGeometry(domeRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    return geo;
  }, [domeRadius]);

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, centerY - hgt / 2 + ft / 2, 0]} material={floorMat} onPointerDown={handleFloorClick}>
        <boxGeometry args={[len, ft, wid]} />
      </mesh>

      {/* Walls */}
      <mesh position={[0, centerY - hgt / 2 + ft + wallH / 2, wid / 2 - wt / 2]} material={wallMat} onPointerDown={handleWallClick}>
        <boxGeometry args={[len, wallH, wt]} />
      </mesh>
      <mesh position={[0, centerY - hgt / 2 + ft + wallH / 2, -(wid / 2 - wt / 2)]} material={wallMat} onPointerDown={handleWallClick}>
        <boxGeometry args={[len, wallH, wt]} />
      </mesh>
      <mesh position={[-(len / 2 - wt / 2), centerY - hgt / 2 + ft + wallH / 2, 0]} material={wallMat} onPointerDown={handleWallClick}>
        <boxGeometry args={[wt, wallH, wid]} />
      </mesh>
      <mesh position={[len / 2 - wt / 2, centerY - hgt / 2 + ft + wallH / 2, 0]} material={wallMat} onPointerDown={handleWallClick}>
        <boxGeometry args={[wt, wallH, wid]} />
      </mesh>

      {/* Dome cap (upper hemisphere) */}
      <mesh
        position={[0, boxTopY, 0]}
        material={roofMat}
        onPointerDown={handleRoofClick}
        geometry={domeGeo}
      />

      {/* Wireframe outline */}
      <lineSegments position={[0, centerY, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(len, hgt, wid)]} />
        <lineBasicMaterial color="#1e3a5f" transparent opacity={0.15} />
      </lineSegments>
    </group>
  );
}

export default DomeStructure;