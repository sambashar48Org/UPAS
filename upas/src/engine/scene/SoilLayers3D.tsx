'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SoilProfile } from '../../models/Soil';
import { useUIStore } from '../../stores/uiStore';

interface SoilLayers3DProps {
  soilProfile: SoilProfile;
  hiddenLayers: number[];
  onLayerSelect: (index: number) => void;
  selectedLayerIndex: number | null;
}

const SOIL_COLORS: Record<string, string> = {
  sand_loose: '#e8d5b7',
  sand_medium: '#d4a843',
  sand_dense: '#b8860b',
  clay_soft: '#8b7355',
  clay_stiff: '#6b4423',
  rock_weathered: '#808080',
  rock_sound: '#4a4a4a',
};

const DEFAULT_COLOR = '#a0886c';

const WATER_MAT = new THREE.MeshStandardMaterial({
  color: '#3b82f6',
  transparent: true,
  opacity: 0.25,
  roughness: 0.1,
  side: THREE.DoubleSide,
  depthWrite: false,
});

// Clipping plane for cutaway mode: clips z > 0 (front half)
const CUTAWAY_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.01);

const SIZE = 16; // Reduced from 30 for better proportions

function SoilLayerMesh({
  layerIndex,
  soilTypeRef,
  topElevation,
  thickness,
  isSelected,
  onSelect,
  visualizationMode,
}: {
  layerIndex: number;
  soilTypeRef: string;
  topElevation: number;
  thickness: number;
  isSelected: boolean;
  onSelect: () => void;
  visualizationMode: string;
}) {
  const mat = useMemo(() => {
    const color = SOIL_COLORS[soilTypeRef] ?? DEFAULT_COLOR;

    // X-Ray mode: very transparent with slight wireframe feel
    if (visualizationMode === 'xray') {
      return new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: isSelected ? 0.35 : 0.12,
        roughness: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        emissive: isSelected ? '#f97316' : '#000000',
        emissiveIntensity: isSelected ? 0.15 : 0,
      });
    }

    // Cutaway mode: normal opacity but with clipping plane
    if (visualizationMode === 'cutaway') {
      return new THREE.MeshStandardMaterial({
        color: isSelected ? '#f97316' : color,
        transparent: true,
        opacity: isSelected ? 0.75 : 0.65,
        roughness: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
        clippingPlanes: [CUTAWAY_PLANE],
        clipShadows: true,
        emissive: isSelected ? '#f97316' : '#000000',
        emissiveIntensity: isSelected ? 0.1 : 0,
      });
    }

    // Normal / Surface mode (surface hides these anyway)
    return new THREE.MeshStandardMaterial({
      color: isSelected ? '#f97316' : color,
      transparent: true,
      opacity: isSelected ? 0.7 : 0.55,
      roughness: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: isSelected ? '#f97316' : '#000000',
      emissiveIntensity: isSelected ? 0.1 : 0,
    });
  }, [soilTypeRef, isSelected, visualizationMode]);

  // Edge material for X-Ray mode
  const edgeMat = useMemo(() => {
    if (visualizationMode !== 'xray') return null;
    return new THREE.LineBasicMaterial({
      color: SOIL_COLORS[soilTypeRef] ?? DEFAULT_COLOR,
      transparent: true,
      opacity: 0.3,
    });
  }, [soilTypeRef, visualizationMode]);

  const yPos = topElevation - thickness / 2;

  // In cutaway mode, extend the box slightly past z=0 so the clip plane creates a clean edge
  const zSize = visualizationMode === 'cutaway' ? SIZE * 2 : SIZE;
  const zPos = visualizationMode === 'cutaway' ? -SIZE / 2 + SIZE / 2 : 0;

  return (
    <group>
      <mesh
        position={[0, yPos, zPos]}
        material={mat}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <boxGeometry args={[SIZE, thickness, zSize]} />
      </mesh>

      {/* X-Ray wireframe edges */}
      {edgeMat && (
        <lineSegments position={[0, yPos, zPos]}>
          <edgesGeometry args={[new THREE.BoxGeometry(SIZE, thickness, SIZE)]} />
          <primitive object={edgeMat} />
        </lineSegments>
      )}
    </group>
  );
}

const SoilLayers3D = React.memo(function SoilLayers3D({
  soilProfile,
  hiddenLayers,
  onLayerSelect,
  selectedLayerIndex,
}: SoilLayers3DProps) {
  const visualizationMode = useUIStore((s) => s.visualizationMode);

  // In surface mode, don't render any soil boxes
  if (visualizationMode === 'surface') {
    return null;
  }

  const layers = useMemo(
    () =>
      soilProfile.layers.filter(
        (layer) => !hiddenLayers.includes(layer.layerIndex)
      ),
    [soilProfile.layers, hiddenLayers]
  );

  return (
    <group>
      {layers.map((layer) => (
        <SoilLayerMesh
          key={layer.id}
          layerIndex={layer.layerIndex}
          soilTypeRef={layer.soilTypeRef}
          topElevation={Number(layer.topElevation.value)}
          thickness={Number(layer.thickness.value)}
          isSelected={selectedLayerIndex === layer.layerIndex}
          onSelect={() => onLayerSelect(layer.layerIndex)}
          visualizationMode={visualizationMode}
        />
      ))}

      {/* Water table — only in normal/cutaway mode */}
      {soilProfile.waterTableDepth != null && visualizationMode !== 'xray' && (
        <mesh
          position={[0, Number(soilProfile.waterTableDepth.value), visualizationMode === 'cutaway' ? -SIZE / 2 + SIZE / 2 : 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={WATER_MAT}
        >
          <planeGeometry args={[SIZE, visualizationMode === 'cutaway' ? SIZE * 2 : SIZE]} />
        </mesh>
      )}
    </group>
  );
});

export default SoilLayers3D;