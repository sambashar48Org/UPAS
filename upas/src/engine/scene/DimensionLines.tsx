'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { Structure } from '../../models/Structure';

interface DimensionLinesProps {
  structure: Structure | null;
}

const LINE_COLOR = '#1e3a5f';
const OFFSET = 1.2;
const TICK = 0.3;
const LABEL_OFFSET = 0.5;

function fmt(v: number): string {
  return v.toFixed(2) + ' m';
}

function DimensionLineSegment({
  start,
  end,
  label,
}: {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  labelUp?: boolean;
}) {
  const mainGeo = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
    ]);
    return g;
  }, [start, end]);

  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 - LABEL_OFFSET,
    (start[2] + end[2]) / 2,
  ];

  const tickLines = useMemo(() => {
    const dir = new THREE.Vector3(
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2],
    ).normalize();

    // Perpendicular direction
    let perp: THREE.Vector3;
    if (Math.abs(dir.y) > 0.9) {
      perp = new THREE.Vector3(1, 0, 0);
    } else {
      perp = new THREE.Vector3(0, 1, 0);
    }
    perp.multiplyScalar(TICK / 2);

    const startTick = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(start[0] - perp.x, start[1] - perp.y, start[2] - perp.z),
      new THREE.Vector3(start[0] + perp.x, start[1] + perp.y, start[2] + perp.z),
    ]);

    const endTick = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(end[0] - perp.x, end[1] - perp.y, end[2] - perp.z),
      new THREE.Vector3(end[0] + perp.x, end[1] + perp.y, end[2] + perp.z),
    ]);

    return { startTick, endTick };
  }, [start, end]);

  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: LINE_COLOR }), []);

  const mainLine = useMemo(() => new THREE.Line(mainGeo, mat), [mainGeo, mat]);
  const startLine = useMemo(() => new THREE.Line(tickLines.startTick, mat), [tickLines.startTick, mat]);
  const endLine = useMemo(() => new THREE.Line(tickLines.endTick, mat), [tickLines.endTick, mat]);

  return (
    <group>
      <primitive object={mainLine} />
      <primitive object={startLine} />
      <primitive object={endLine} />
      <Html position={mid} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            fontSize: '10px',
            color: LINE_COLOR,
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: '1px 5px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

const DimensionLines = React.memo(function DimensionLines({ structure }: DimensionLinesProps) {
  if (!structure) return null;

  const len = Number(structure.length.value);
  const wid = Number(structure.width.value);
  const hgt = Number(structure.height.value);
  const wt = Number(structure.wallThickness.value);
  const rt = Number(structure.roofThickness.value);
  const bd = Number(structure.burialDepth.value);

  const topY = -bd;
  const botY = -bd - hgt;

  return (
    <group>
      {/* Length — along X, below the structure */}
      <DimensionLineSegment
        start={[-len / 2, botY - OFFSET, 0]}
        end={[len / 2, botY - OFFSET, 0]}
        label={fmt(len)}
        labelUp={false}
      />

      {/* Width — along Z, to the side */}
      <DimensionLineSegment
        start={[len / 2 + OFFSET, (topY + botY) / 2, -wid / 2]}
        end={[len / 2 + OFFSET, (topY + botY) / 2, wid / 2]}
        label={fmt(wid)}
      />

      {/* Height — along Y, to the side */}
      <DimensionLineSegment
        start={[len / 2 + OFFSET, topY, 0]}
        end={[len / 2 + OFFSET, botY, 0]}
        label={fmt(hgt)}
      />

      {/* Wall thickness — small annotation on the front wall */}
      <DimensionLineSegment
        start={[0, (topY + botY) / 2, wid / 2]}
        end={[0, (topY + botY) / 2, wid / 2 - wt]}
        label={fmt(wt)}
      />

      {/* Roof thickness */}
      <DimensionLineSegment
        start={[0, topY, -wid / 2 - OFFSET]}
        end={[0, topY - rt, -wid / 2 - OFFSET]}
        label={fmt(rt)}
      />
    </group>
  );
});

export default DimensionLines;