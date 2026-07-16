'use client';

import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useUIStore, type CameraPreset } from '../../stores/uiStore';

const PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  perspective: { pos: [15, 12, 15], target: [0, -2, 0] },
  top: { pos: [0, 20, 0.01], target: [0, -2, 0] },
  front: { pos: [0, -2, 20], target: [0, -2, 0] },
  side: { pos: [20, -2, 0], target: [0, -2, 0] },
  back: { pos: [0, -2, -20], target: [0, -2, 0] },
};

const LERP = 0.05;
const SNAP_DIST = 0.05;

export default function CameraController() {
  const cameraPreset = useUIStore((s) => s.cameraPreset);
  const { camera } = useThree();
  const controls = useThree((s) => s.controls);

  const targetPos = useRef(new THREE.Vector3(15, 12, 15));
  const targetLookAt = useRef(new THREE.Vector3(0, -2, 0));
  const isAnimating = useRef(true);
  const prevPreset = useRef<CameraPreset>(cameraPreset);

  useFrame(() => {
    // Detect preset change
    if (prevPreset.current !== cameraPreset) {
      prevPreset.current = cameraPreset;
      const preset = PRESETS[cameraPreset];
      if (preset) {
        targetPos.current.set(...preset.pos);
        targetLookAt.current.set(...preset.target);
        isAnimating.current = true;
      }
    }

    if (!isAnimating.current) return;

    // Lerp camera position
    camera.position.lerp(targetPos.current, LERP);

    // Lerp orbit controls target
    if (controls) {
      const orbitTarget = (controls as unknown as { target: THREE.Vector3 }).target;
      orbitTarget.lerp(targetLookAt.current, LERP);
    }

    // Check if we've arrived
    const dist = camera.position.distanceTo(targetPos.current);
    if (dist < SNAP_DIST) {
      isAnimating.current = false;
    }
  });

  return null;
}