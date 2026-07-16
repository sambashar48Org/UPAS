/**
 * UPAS — Cut Plane Component
 * Sprint 3B: Controllable cross-section plane with depth slider.
 *
 * Architecture: Reads cutPlaneDepth from uiStore only.
 * No engineering calculations in this component.
 */

import React, { useMemo } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';

interface Props {
  onDepthChange?: (depth: number) => void;
}

export default function CutPlane({ onDepthChange }: Props) {
  const cutPlaneDepth = useUIStore((s) => s.cutPlaneDepth);
  const visualizationMode = useUIStore((s) => s.visualizationMode);
  const structure = useProjectStore((s) => s.structure);

  // Only show in cutaway mode
  if (visualizationMode !== 'cutaway') return null;

  const planeY = -cutPlaneDepth;

  return (
    <>
      {/* Clipping plane visual indicator */}
      <mesh position={[0, planeY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial
          color="#1e3a5f"
          transparent
          opacity={0.08}
          side={2}
          depthWrite={false}
        />
      </mesh>

      {/* Cut plane border lines */}
      <gridHelper
        args={[30, 30, '#1e3a5f', '#1e3a5f']}
        position={[0, planeY, 0]}
        rotation={[0, 0, 0]}
      />
    </>
  );
}

/** HTML overlay slider for cut plane depth — rendered outside Canvas */
export function CutPlaneSlider() {
  const cutPlaneDepth = useUIStore((s) => s.cutPlaneDepth);
  const setCutPlaneDepth = useUIStore((s) => s.setCutPlaneDepth);
  const visualizationMode = useUIStore((s) => s.visualizationMode);
  const structure = useProjectStore((s) => s.structure);

  if (visualizationMode !== 'cutaway') return null;

  const maxDepth = structure ? (Number(structure.burialDepth.value) + Number(structure.height.value) + 2) : 20;

  return (
    <div
      className="absolute left-3 z-10 flex flex-col items-center gap-1 px-2 py-2 rounded-lg shadow-md"
      style={{ top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' }}
      dir="ltr"
    >
      <span className="text-[10px] font-medium" style={{ color: 'var(--upas-text-secondary)' }}>
        عمق القطع
      </span>
      <input
        type="range"
        min={0}
        max={maxDepth}
        step={0.1}
        value={cutPlaneDepth}
        onChange={(e) => setCutPlaneDepth(Number(e.target.value))}
        className="w-2 h-28"
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
        } as React.CSSProperties}
        title={`عمق القطع: ${cutPlaneDepth.toFixed(1)} m`}
      />
      <span className="text-[10px] font-mono font-medium" style={{ color: 'var(--upas-text-primary)' }}>
        {cutPlaneDepth.toFixed(1)}m
      </span>
    </div>
  );
}