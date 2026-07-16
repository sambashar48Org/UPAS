'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { StructureType } from '../../types';
import type { Structure } from '../../models/Structure';

interface ParametricStructureProps {
  structure: Structure;
  isSelected: boolean;
  onSelect: () => void;
}

function getMaterial(isSelected: boolean) {
  return new THREE.MeshStandardMaterial({
    color: isSelected ? '#f97316' : '#6b7280',
    transparent: true,
    opacity: isSelected ? 0.55 : 0.4,
    roughness: isSelected ? 0.4 : 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
    emissive: isSelected ? '#f97316' : '#000000',
    emissiveIntensity: isSelected ? 0.15 : 0,
  });
}

/* ─────────── BOX ─────────── */
function BoxStructure({ structure, isSelected, onSelect }: ParametricStructureProps) {
  const len = Number(structure.length.value);
  const wid = Number(structure.width.value);
  const hgt = Number(structure.height.value);
  const wt = Number(structure.wallThickness.value);
  const rt = Number(structure.roofThickness.value);
  const ft = Number(structure.floorThickness.value);
  const bd = Number(structure.burialDepth.value);

  const centerY = -bd - hgt / 2;
  const mat = useMemo(() => getMaterial(isSelected), [isSelected]);

  const wallH = Math.max(0.01, hgt - rt - ft);

  const parts = useMemo(() => {
    const p: Array<{ key: string; pos: [number, number, number]; args: [number, number, number] }> = [];
    // Floor
    p.push({ key: 'floor', pos: [0, centerY - hgt / 2 + ft / 2, 0], args: [len, ft, wid] });
    // Roof
    p.push({ key: 'roof', pos: [0, centerY + hgt / 2 - rt / 2, 0], args: [len, rt, wid] });
    // Front wall +Z
    p.push({ key: 'front', pos: [0, centerY, wid / 2 - wt / 2], args: [len, wallH, wt] });
    // Back wall -Z
    p.push({ key: 'back', pos: [0, centerY, -(wid / 2 - wt / 2)], args: [len, wallH, wt] });
    // Left wall -X
    p.push({ key: 'left', pos: [-(len / 2 - wt / 2), centerY, 0], args: [wt, wallH, wid] });
    // Right wall +X
    p.push({ key: 'right', pos: [len / 2 - wt / 2, centerY, 0], args: [wt, wallH, wid] });
    return p;
  }, [len, wid, hgt, wt, rt, ft, centerY, wallH]);

  return (
    <group onPointerDown={(e) => { e.stopPropagation(); onSelect(); }}>
      {parts.map((w) => (
        <mesh key={w.key} position={w.pos} material={mat}>
          <boxGeometry args={w.args} />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────── ARCH ─────────── */
function ArchStructure({ structure, isSelected, onSelect }: ParametricStructureProps) {
  const len = Number(structure.length.value);
  const wid = Number(structure.width.value);
  const hgt = Number(structure.height.value);
  const wt = Number(structure.wallThickness.value);
  const rt = Number(structure.roofThickness.value);
  const ft = Number(structure.floorThickness.value);
  const bd = Number(structure.burialDepth.value);

  const centerY = -bd - hgt / 2;
  const mat = useMemo(() => getMaterial(isSelected), [isSelected]);

  // The arch radius equals width/2, the remaining height below the arch is for rectangular walls
  const archRadius = wid / 2;
  const wallH = Math.max(0.01, hgt - archRadius - ft);

  return (
    <group onPointerDown={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Floor */}
      <mesh position={[0, centerY - hgt / 2 + ft / 2, 0]} material={mat}>
        <boxGeometry args={[len, ft, wid]} />
      </mesh>

      {/* Front wall +Z */}
      <mesh position={[0, centerY - hgt / 2 + ft + wallH / 2, wid / 2 - wt / 2]} material={mat}>
        <boxGeometry args={[len, wallH, wt]} />
      </mesh>

      {/* Back wall -Z */}
      <mesh position={[0, centerY - hgt / 2 + ft + wallH / 2, -(wid / 2 - wt / 2)]} material={mat}>
        <boxGeometry args={[len, wallH, wt]} />
      </mesh>

      {/* Left wall -X */}
      <mesh position={[-(len / 2 - wt / 2), centerY - hgt / 2 + ft + wallH / 2, 0]} material={mat}>
        <boxGeometry args={[wt, wallH, wid]} />
      </mesh>

      {/* Right wall +X */}
      <mesh position={[len / 2 - wt / 2, centerY - hgt / 2 + ft + wallH / 2, 0]} material={mat}>
        <boxGeometry args={[wt, wallH, wid]} />
      </mesh>

      {/* Arch roof — half-cylinder along the LENGTH (X) axis */}
      {/* Default cylinder axis = Y. Rotate Z by PI/2 to make axis = X. */}
      {/* Arch sits on top of the walls */}
      <mesh
        position={[0, centerY - hgt / 2 + ft + wallH, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={mat}
      >
        <cylinderGeometry args={[archRadius, archRadius, len, 32, 1, false, 0, Math.PI]} />
      </mesh>
    </group>
  );
}

/* ─────────── CYLINDER (Tunnel) ─────────── */
function CylinderTunnel({ structure, isSelected, onSelect }: ParametricStructureProps) {
  const len = Number(structure.length.value);
  const wid = Number(structure.width.value);
  const hgt = Number(structure.height.value);
  const wt = Number(structure.wallThickness.value);
  const ft = Number(structure.floorThickness.value);
  const bd = Number(structure.burialDepth.value);

  const centerY = -bd - hgt / 2;
  const mat = useMemo(() => getMaterial(isSelected), [isSelected]);

  const outerR = wid / 2;
  const innerR = Math.max(0.01, outerR - wt);

  return (
    <group onPointerDown={(e) => { e.stopPropagation(); onSelect(); }}>
      {/* Outer cylinder — horizontal along X axis */}
      <mesh
        position={[0, centerY, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={mat}
      >
        <cylinderGeometry args={[outerR, outerR, len, 32, 1, false]} />
      </mesh>

      {/* Inner cylinder (hollow core) */}
      <mesh
        position={[0, centerY, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={mat}
      >
        <cylinderGeometry args={[innerR, innerR, len, 32, 1, false]} />
      </mesh>

      {/* Floor slab at the bottom */}
      <mesh
        position={[0, centerY - outerR + ft / 2, 0]}
        material={mat}
      >
        <boxGeometry args={[len, ft, wid]} />
      </mesh>
    </group>
  );
}

/* ─────────── MAIN ─────────── */
const ParametricStructure = React.memo(function ParametricStructure(props: ParametricStructureProps) {
  const { structure, isSelected, onSelect } = props;

  switch (structure.type) {
    case StructureType.Arch:
      return <ArchStructure structure={structure} isSelected={isSelected} onSelect={onSelect} />;
    case StructureType.Cylinder:
      return <CylinderTunnel structure={structure} isSelected={isSelected} onSelect={onSelect} />;
    case StructureType.Box:
    default:
      return <BoxStructure structure={structure} isSelected={isSelected} onSelect={onSelect} />;
  }
});

export default ParametricStructure;