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
  const visualizationMode = useUIStore((s) => s.visualizationMode);

  const isStructureSelected =
    (selectedObjectType === 'structure' || selectedObjectType === 'structure-part') &&
    selectedObjectId === structure?.id;

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

  // Determine the orbit target based on structure
  const orbitTarget = useMemo((): [number, number, number] => {
    if (structure) {
      const bd = Number(structure.burialDepth.value);
      const hgt = Number(structure.height.value);
      return [0, -bd - hgt / 2, 0];
    }
    if (soilProfile) {
      const totalDepth = Number(soilProfile.totalDepth.value);
      return [0, -totalDepth / 2, 0];
    }
    return [0, -2, 0];
  }, [structure, soilProfile]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      {/* Fill light from opposite side */}
      <directionalLight
        position={[-8, 5, -8]}
        intensity={0.3}
      />

      {/* Camera + Controls */}
      <CameraController />
      <OrbitControls
        makeDefault
        target={orbitTarget}
        minDistance={2}
        maxDistance={60}
        enableDamping
        dampingFactor={0.1}
      />

      {/* Ground Grid */}
      <gridHelper args={[20, 20, '#94a3b8', '#cbd5e1']} position={[0, 0, 0]} />
      <axesHelper args={[3]} />

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
        style={{ backgroundColor: '#e8edf3' }}
        gl={{ antialias: true, alpha: false, localClippingEnabled: true }}
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