'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { StructureType } from '../../types';
import type { Structure } from '../../models/Structure';
import { useUIStore } from '../../stores/uiStore';
import DomeStructure from './DomeStructure';

interface ParametricStructureProps {
  structure: Structure;
  isSelected: boolean;
  onSelect: () => void;
  /** Sprint 3C: Pre-computed stress colors from adapter */
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

/* ─────────── BOX ─────────── */
function BoxStructure({ structure, isSelected, onSelect }: ParametricStructureProps) {
  const selectedPart = useUIStore((s) => s.selectedStructurePart);
  const setSelectedObject = useUIStore((s) => s.setSelectedObject);
  const setSelectedStructurePart = useUIStore((s) => s.setSelectedStructurePart);

  const len = Number(structure.length.value);
  const wid = Number(structure.width.value);
  const hgt = Number(structure.height.value);
  const wt = Number(structure.wallThickness.value);
  const rt = Number(structure.roofThickness.value);
  const ft = Number(structure.floorThickness.value);
  const bd = Number(structure.burialDepth.value);

  const centerY = -bd - hgt / 2;
  const wallH = Math.max(0.01, hgt - rt - ft);

  const roofMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'roof', CONCRETE_ROOF_COLOR, CONCRETE_SELECTED), [isSelected, selectedPart]);
  const wallMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'wall', CONCRETE_COLOR, CONCRETE_SELECTED), [isSelected, selectedPart]);
  const floorMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'floor', CONCRETE_FLOOR_COLOR, CONCRETE_SELECTED), [isSelected, selectedPart]);

  const handleRoofClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('roof'); };
  const handleWallClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('wall'); };
  const handleFloorClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('floor'); };

  const parts = useMemo(() => {
    const p: Array<{ key: string; part: 'roof' | 'wall' | 'floor'; pos: [number, number, number]; args: [number, number, number] }> = [];
    p.push({ key: 'floor', part: 'floor', pos: [0, centerY - hgt / 2 + ft / 2, 0], args: [len, ft, wid] });
    p.push({ key: 'roof', part: 'roof', pos: [0, centerY + hgt / 2 - rt / 2, 0], args: [len, rt, wid] });
    p.push({ key: 'front', part: 'wall', pos: [0, centerY, wid / 2 - wt / 2], args: [len, wallH, wt] });
    p.push({ key: 'back', part: 'wall', pos: [0, centerY, -(wid / 2 - wt / 2)], args: [len, wallH, wt] });
    p.push({ key: 'left', part: 'wall', pos: [-(len / 2 - wt / 2), centerY, 0], args: [wt, wallH, wid] });
    p.push({ key: 'right', part: 'wall', pos: [len / 2 - wt / 2, centerY, 0], args: [wt, wallH, wid] });
    return p;
  }, [len, wid, hgt, wt, rt, ft, centerY, wallH]);

  const getMat = (part: 'roof' | 'wall' | 'floor') => {
    if (part === 'roof') return roofMat;
    if (part === 'floor') return floorMat;
    return wallMat;
  };

  const getHandler = (part: 'roof' | 'wall' | 'floor') => {
    if (part === 'roof') return handleRoofClick;
    if (part === 'floor') return handleFloorClick;
    return handleWallClick;
  };

  return (
    <group>
      {parts.map((w) => (
        <mesh key={w.key} position={w.pos} material={getMat(w.part)} onPointerDown={getHandler(w.part)}>
          <boxGeometry args={w.args} />
        </mesh>
      ))}

      {/* Wireframe edges for structure clarity */}
      <lineSegments position={[0, centerY, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(len, hgt, wid)]} />
        <lineBasicMaterial color="#1e3a5f" transparent opacity={0.2} />
      </lineSegments>
    </group>
  );
}

/* ─────────── ARCH ─────────── */
function ArchStructure({ structure, isSelected, onSelect }: ParametricStructureProps) {
  const selectedPart = useUIStore((s) => s.selectedStructurePart);
  const setSelectedStructurePart = useUIStore((s) => s.setSelectedStructurePart);

  const len = Number(structure.length.value);
  const wid = Number(structure.width.value);
  const hgt = Number(structure.height.value);
  const wt = Number(structure.wallThickness.value);
  const rt = Number(structure.roofThickness.value);
  const ft = Number(structure.floorThickness.value);
  const bd = Number(structure.burialDepth.value);

  const centerY = -bd - hgt / 2;

  const roofMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'roof', CONCRETE_ROOF_COLOR, CONCRETE_SELECTED), [isSelected, selectedPart]);
  const wallMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'wall', CONCRETE_COLOR, CONCRETE_SELECTED), [isSelected, selectedPart]);
  const floorMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'floor', CONCRETE_FLOOR_COLOR, CONCRETE_SELECTED), [isSelected, selectedPart]);

  const archRadius = wid / 2;
  const wallH = Math.max(0.01, hgt - archRadius - ft);

  const handleRoofClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('roof'); };
  const handleWallClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('wall'); };
  const handleFloorClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('floor'); };

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

      {/* Arch roof */}
      <mesh
        position={[0, centerY - hgt / 2 + ft + wallH, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={roofMat}
        onPointerDown={handleRoofClick}
      >
        <cylinderGeometry args={[archRadius, archRadius, len, 32, 1, false, 0, Math.PI]} />
      </mesh>

      {/* Wireframe outline */}
      <lineSegments position={[0, centerY, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(len, hgt, wid)]} />
        <lineBasicMaterial color="#1e3a5f" transparent opacity={0.15} />
      </lineSegments>
    </group>
  );
}

/* ─────────── CYLINDER (Tunnel) — Sprint 3C: Added part selection ─────────── */
function CylinderTunnel({ structure, isSelected, onSelect }: ParametricStructureProps) {
  const selectedPart = useUIStore((s) => s.selectedStructurePart);
  const setSelectedStructurePart = useUIStore((s) => s.setSelectedStructurePart);

  const len = Number(structure.length.value);
  const wid = Number(structure.width.value);
  const hgt = Number(structure.height.value);
  const wt = Number(structure.wallThickness.value);
  const ft = Number(structure.floorThickness.value);
  const bd = Number(structure.burialDepth.value);

  const centerY = -bd - hgt / 2;
  const outerR = wid / 2;
  const innerR = Math.max(0.01, outerR - wt);

  const roofMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'roof', CONCRETE_ROOF_COLOR, CONCRETE_SELECTED), [isSelected, selectedPart]);
  const wallMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'wall', CONCRETE_COLOR, CONCRETE_SELECTED), [isSelected, selectedPart]);
  const floorMat = useMemo(() => getPartMaterial(isSelected, selectedPart === 'floor', CONCRETE_FLOOR_COLOR, CONCRETE_SELECTED), [isSelected, selectedPart]);

  const handleRoofClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('roof'); };
  const handleWallClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('wall'); };
  const handleFloorClick = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(); setSelectedStructurePart('floor'); };

  return (
    <group>
      {/* Outer cylinder shell — wall + roof combined */}
      <mesh
        position={[0, centerY, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={wallMat}
        onPointerDown={handleWallClick}
      >
        <cylinderGeometry args={[outerR, outerR, len, 32, 1, false]} />
      </mesh>

      {/* Inner cylinder (hollow) — same wall material */}
      <mesh
        position={[0, centerY, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={wallMat}
      >
        <cylinderGeometry args={[innerR, innerR, len, 32, 1, false]} />
      </mesh>

      {/* Roof cap (top disc) */}
      <mesh
        position={[0, centerY, -len / 2]}
        rotation={[0, 0, Math.PI / 2]}
        material={roofMat}
        onPointerDown={handleRoofClick}
      >
        <ringGeometry args={[innerR, outerR, 32]} />
      </mesh>

      {/* Floor slab */}
      <mesh
        position={[0, centerY - outerR + ft / 2, 0]}
        material={floorMat}
        onPointerDown={handleFloorClick}
      >
        <boxGeometry args={[len, ft, wid]} />
      </mesh>
    </group>
  );
}

/* ─────────── MAIN ─────────── */
const ParametricStructure = React.memo(function ParametricStructure(props: ParametricStructureProps) {
  const { structure, isSelected, onSelect, stressColor } = props;

  switch (structure.type) {
    case StructureType.Arch:
      return <ArchStructure structure={structure} isSelected={isSelected} onSelect={onSelect} />;
    case StructureType.Cylinder:
      return <CylinderTunnel structure={structure} isSelected={isSelected} onSelect={onSelect} />;
    case StructureType.Dome:
      return <DomeStructure structure={structure} isSelected={isSelected} onSelect={onSelect} stressColor={stressColor} />;
    case StructureType.Box:
    default:
      return <BoxStructure structure={structure} isSelected={isSelected} onSelect={onSelect} />;
  }
});

export default ParametricStructure;