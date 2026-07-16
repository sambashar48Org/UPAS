import { Suspense, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';

import CameraController from './CameraController';
import ParametricStructure from './ParametricStructure';
import SoilLayers3D from './SoilLayers3D';
import EngineeringLabels from './EngineeringLabels';
import DimensionLines from './DimensionLines';
import SelectionManager from './SelectionManager';

interface EngineeringSceneProps {
  className?: string;
  style?: React.CSSProperties;
}

function SceneContent() {
  const structure = useProjectStore((s) => s.structure);
  const soilProfile = useProjectStore((s) => s.soilProfile);

  const selectedObjectId = useUIStore((s) => s.selectedObjectId);
  const selectedObjectType = useUIStore((s) => s.selectedObjectType);
  const setSelectedObject = useUIStore((s) => s.setSelectedObject);
  const clearSelection = useUIStore((s) => s.clearSelection);
  const hiddenSoilLayers = useUIStore((s) => s.hiddenSoilLayers);

  const isStructureSelected =
    selectedObjectType === 'structure' && selectedObjectId === structure?.id;

  const selectedLayerIndex = useMemo(() => {
    if (selectedObjectType !== 'soil-layer' || !soilProfile || !selectedObjectId) return null;
    const found = soilProfile.layers.find((l) => l.id === selectedObjectId);
    return found ? found.layerIndex : null;
  }, [selectedObjectType, selectedObjectId, soilProfile]);

  const handleStructureSelect = useCallback(() => {
    if (structure) {
      setSelectedObject(structure.id, 'structure');
    }
  }, [structure, setSelectedObject]);

  const handleLayerSelect = useCallback(
    (index: number) => {
      if (soilProfile) {
        const layer = soilProfile.layers.find((l) => l.layerIndex === index);
        if (layer) {
          setSelectedObject(layer.id, 'soil-layer');
        }
      }
    },
    [soilProfile, setSelectedObject]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Camera + Controls */}
      <CameraController />
      <OrbitControls
        makeDefault
        target={[0, -2, 0]}
        minDistance={3}
        maxDistance={60}
        enableDamping
        dampingFactor={0.1}
      />

      {/* Ground Grid */}
      <gridHelper args={[40, 40, '#94a3b8', '#cbd5e1']} position={[0, 0, 0]} />
      <axesHelper args={[5]} />

      {/* Ground plane — click to deselect */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          clearSelection();
        }}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Scene Objects */}
      {soilProfile && (
        <SoilLayers3D
          soilProfile={soilProfile}
          hiddenLayers={hiddenSoilLayers}
          onLayerSelect={handleLayerSelect}
          selectedLayerIndex={selectedLayerIndex}
        />
      )}

      {structure && (
        <ParametricStructure
          structure={structure}
          isSelected={isStructureSelected}
          onSelect={handleStructureSelect}
        />
      )}

      {structure && <EngineeringLabels structure={structure} soilProfile={soilProfile} />}
      {structure && <DimensionLines structure={structure} />}

      {/* FPS counter + scene ready signal */}
      <SelectionManager />
    </>
  );
}

export default function EngineeringScene({ className, style }: EngineeringSceneProps) {
  return (
    <div className={className} style={style}>
      <Canvas
        style={{ backgroundColor: '#e2e8f0' }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        shadows
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}