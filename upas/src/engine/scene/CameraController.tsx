'use client';

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useUIStore, type CameraPreset } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';

const PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] } | null> = {
  perspective: { pos: [12, 8, 12], target: [0, -2, 0] },
  top: { pos: [0, 20, 0.01], target: [0, -2, 0] },
  front: { pos: [0, -2, 18], target: [0, -2, 0] },
  side: { pos: [18, -2, 0], target: [0, -2, 0] },
  back: { pos: [0, -2, -18], target: [0, -2, 0] },
  fit: null, // Computed dynamically
};

const LERP = 0.06;
const SNAP_DIST = 0.05;

export default function CameraController() {
  const cameraPreset = useUIStore((s) => s.cameraPreset);
  const autoFitRequested = useUIStore((s) => s.autoFitRequested);
  const { camera, size } = useThree();
  const controls = useThree((s) => s.controls);
  const structure = useProjectStore((s) => s.structure);

  const targetPos = useRef(new THREE.Vector3(12, 8, 12));
  const targetLookAt = useRef(new THREE.Vector3(0, -2, 0));
  const isAnimating = useRef(true);
  const prevPreset = useRef<CameraPreset>(cameraPreset);
  const prevAutoFit = useRef(false);

  // Compute auto-fit parameters from structure
  const computeFitView = () => {
    if (!structure) {
      return { pos: [12, 8, 12] as [number, number, number], target: [0, -2, 0] as [number, number, number] };
    }

    const len = Number(structure.length.value);
    const wid = Number(structure.width.value);
    const hgt = Number(structure.height.value);
    const bd = Number(structure.burialDepth.value);

    // Bounding box of the structure + margin
    const margin = 2.5;
    const halfW = wid / 2 + margin;
    const halfL = len / 2 + margin;
    const topY = margin * 0.5;
    const botY = -bd - hgt - margin;

    const centerX = 0;
    const centerY = (topY + botY) / 2;
    const centerZ = 0;

    // Calculate distance based on FOV and bounding box size
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const aspect = size.width / size.height;
    const halfFovH = Math.atan(Math.tan(fov / 2) * aspect);

    const bboxW = (halfW * 2);
    const bboxH = (topY - botY);
    const distX = bboxW / (2 * Math.tan(halfFovH));
    const distY = bboxH / (2 * Math.tan(fov / 2));
    const distance = Math.max(distX, distY) * 1.15; // 15% padding

    // Position at 30° elevation, 45° horizontal
    const elevation = Math.PI / 6;
    const azimuth = Math.PI / 4;
    const posX = centerX + distance * Math.cos(elevation) * Math.sin(azimuth);
    const posY = centerY + distance * Math.sin(elevation);
    const posZ = centerZ + distance * Math.cos(elevation) * Math.cos(azimuth);

    return {
      pos: [posX, posY, posZ] as [number, number, number],
      target: [centerX, centerY, centerZ] as [number, number, number],
    };
  };

  // Handle preset change
  useEffect(() => {
    if (prevPreset.current === cameraPreset && prevAutoFit.current === autoFitRequested) return;
    prevPreset.current = cameraPreset;
    prevAutoFit.current = autoFitRequested;

    let fitParams: { pos: [number, number, number]; target: [number, number, number] };

    if (cameraPreset === 'fit' || autoFitRequested) {
      fitParams = computeFitView();
      // Reset autoFitRequested after consuming it
      if (autoFitRequested) {
        useUIStore.getState().set({ autoFitRequested: false });
      }
    } else {
      const preset = PRESETS[cameraPreset];
      if (!preset) return;
      fitParams = preset;
    }

    targetPos.current.set(...fitParams.pos);
    targetLookAt.current.set(...fitParams.target);
    isAnimating.current = true;
  }, [cameraPreset, autoFitRequested, structure, camera, size]);

  useFrame(() => {
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