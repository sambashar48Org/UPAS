'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useUIStore } from '../../stores/uiStore';

export default function SelectionManager() {
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

    if (!useUIStore.getState().sceneReady) {
      setSceneReady(true);
    }
  });

  return null;
}