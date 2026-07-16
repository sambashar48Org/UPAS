import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useUIStore } from '../../stores/uiStore';

function SceneContent() {
  const setSceneFPS = useUIStore((s) => s.setSceneFPS);
  const setSceneReady = useUIStore((s) => s.setSceneReady);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    const delta = now - lastTime.current;

    if (delta >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / delta);
      setSceneFPS(fps);
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  // Signal scene ready on first frame
  useFrame(() => {
    if (!useUIStore.getState().sceneReady) {
      setSceneReady(true);
    }
  });

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

      {/* Camera */}
      <EngineerCamera position={[15, 12, 15]} fov={50} />

      {/* Engineering reference grid */}
      <gridHelper
        args={[20, 20, '#94a3b8', '#cbd5e1']}
        position={[0, 0, 0]}
      />

      {/* XYZ Axes */}
      <axesHelper args={[5]} />

      {/* Controls */}
      <OrbitControls
        makeDefault
        target={[0, -2, 0]}
        minDistance={5}
        maxDistance={60}
        enableDamping
        dampingFactor={0.1}
      />
    </>
  );
}

/** Camera that continuously looks at the scene origin */
function EngineerCamera({
  position,
  fov,
}: {
  position: [number, number, number];
  fov: number;
}) {
  const ref = useRef<THREE.PerspectiveCamera>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.lookAt(0, -2, 0);
    }
  });

  return <perspectiveCamera ref={ref} position={position} fov={fov} />;
}

export default function EngineeringScene() {
  return (
    <div className="w-full h-full relative">
      <Canvas
        style={{ backgroundColor: '#e2e8f0' }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}