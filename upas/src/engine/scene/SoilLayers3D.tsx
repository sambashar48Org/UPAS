'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { SoilProfile } from '../../models/Soil';

interface SoilLayers3DProps {
  soilProfile: SoilProfile;
  hiddenLayers: number[];
  onLayerSelect: (index: number) => void;
  selectedLayerIndex: number | null;
}

const SOIL_COLORS: Record<string, string> = {
  sand_loose: '#f5deb3',
  sand_medium: '#daa520',
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

const SIZE = 30;

function SoilLayerMesh({
  layerIndex,
  soilTypeRef,
  topElevation,
  thickness,
  isSelected,
  onSelect,
}: {
  layerIndex: number;
  soilTypeRef: string;
  topElevation: number;
  thickness: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const mat = useMemo(() => {
    const color = SOIL_COLORS[soilTypeRef] ?? DEFAULT_COLOR;
    return new THREE.MeshStandardMaterial({
      color: isSelected ? '#f97316' : color,
      transparent: true,
      opacity: isSelected ? 0.75 : 0.6,
      roughness: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: isSelected ? '#f97316' : '#000000',
      emissiveIntensity: isSelected ? 0.1 : 0,
    });
  }, [soilTypeRef, isSelected]);

  const yPos = topElevation - thickness / 2;

  return (
    <mesh
      position={[0, yPos, 0]}
      material={mat}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <boxGeometry args={[SIZE, thickness, SIZE]} />
    </mesh>
  );
}

const SoilLayers3D = React.memo(function SoilLayers3D({
  soilProfile,
  hiddenLayers,
  onLayerSelect,
  selectedLayerIndex,
}: SoilLayers3DProps) {
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
        />
      ))}

      {/* Water table */}
      {soilProfile.waterTableDepth != null && (
        <mesh
          position={[0, Number(soilProfile.waterTableDepth.value), 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={WATER_MAT}
        >
          <planeGeometry args={[SIZE, SIZE]} />
        </mesh>
      )}
    </group>
  );
});

export default SoilLayers3D;