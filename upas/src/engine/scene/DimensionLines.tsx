'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { Structure } from '../../models/Structure';
import { StructureType } from '../../types';
import { getMaterialByRef } from '../../database';

interface DimensionLinesProps {
  structure: Structure | null;
}

const LINE_COLOR = '#1e3a5f';
const EXTENSION_COLOR = '#64748b';
const BG_COLOR = 'rgba(255,255,255,0.92)';
const OFFSET = 1.0;
const TICK = 0.25;
const LABEL_OFFSET = 0.6;
const EXTENSION_OVERSHOOT = 0.4;

function fmt(v: number): string {
  return v.toFixed(2) + ' m';
}

function ArrowHead({
  position,
  direction,
}: {
  position: [number, number, number];
  direction: [number, number, number];
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // Small triangle arrow
    const dir = new THREE.Vector3(...direction).normalize();
    const size = 0.15;
    const perp = new THREE.Vector3();

    if (Math.abs(dir.y) > 0.9) {
      perp.set(1, 0, 0);
    } else {
      perp.set(0, 1, 0);
    }

    const cross = new THREE.Vector3().crossVectors(dir, perp).normalize().multiplyScalar(size * 0.5);
    const tip = new THREE.Vector3(...position);
    const base = tip.clone().sub(dir.clone().multiplyScalar(size));
    const left = base.clone().add(cross);
    const right = base.clone().sub(cross);

    g.setFromPoints([left, tip, right, left]);
    return g;
  }, [position, direction]);

  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: LINE_COLOR }), []);

  const line = useMemo(() => new THREE.Line(geo, mat), [geo, mat]);

  return <primitive object={line} />;
}

function DimensionLineSegment({
  start,
  end,
  label,
  extensionStart,
  extensionEnd,
}: {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  extensionStart?: [number, number, number]; // Point on object for extension line start
  extensionEnd?: [number, number, number];
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

  // Extension lines
  const extensionLines = useMemo(() => {
    if (!extensionStart || !extensionEnd) return null;

    const lines: THREE.BufferGeometry[] = [];

    // Extension line at start
    const extStart = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...extensionStart),
      new THREE.Vector3(...start),
    ]);
    lines.push(extStart);

    // Extension line at end
    const extEnd = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...extensionEnd),
      new THREE.Vector3(...end),
    ]);
    lines.push(extEnd);

    return lines;
  }, [start, end, extensionStart, extensionEnd]);

  // Arrow directions
  const dirVec = useMemo(() => {
    return [
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2],
    ] as [number, number, number];
  }, [start, end]);

  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: LINE_COLOR }), []);
  const extMat = useMemo(() => new THREE.LineBasicMaterial({ color: EXTENSION_COLOR }), []);

  const mainLine = useMemo(() => new THREE.Line(mainGeo, mat), [mainGeo, mat]);

  return (
    <group>
      <primitive object={mainLine} />

      {/* Extension lines */}
      {extensionLines?.map((geo, i) => (
        <primitive key={i} object={new THREE.Line(geo, extMat)} />
      ))}

      {/* Arrow heads */}
      <ArrowHead position={start} direction={dirVec} />
      <ArrowHead
        position={end}
        direction={[end[0] - start[0], end[1] - start[1], end[2] - start[2]]}
      />

      {/* Label */}
      <Html position={mid} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            fontSize: '10px',
            color: LINE_COLOR,
            backgroundColor: BG_COLOR,
            padding: '2px 6px',
            borderRadius: '2px',
            whiteSpace: 'nowrap',
            fontWeight: 600,
            pointerEvents: 'none',
            userSelect: 'none',
            border: `1px solid ${LINE_COLOR}30`,
            fontFamily: 'monospace',
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
  const ft = Number(structure.floorThickness.value);
  const bd = Number(structure.burialDepth.value);

  const topY = -bd;
  const botY = -bd - hgt;
  const off = OFFSET;

  return (
    <group>
      {/* Length — along X, below the structure */}
      <DimensionLineSegment
        start={[-len / 2, botY - off, 0]}
        end={[len / 2, botY - off, 0]}
        label={fmt(len)}
        extensionStart={[-len / 2, botY, 0]}
        extensionEnd={[len / 2, botY, 0]}
      />

      {/* Width — along Z, to the side */}
      <DimensionLineSegment
        start={[len / 2 + off, (topY + botY) / 2, -wid / 2]}
        end={[len / 2 + off, (topY + botY) / 2, wid / 2]}
        label={fmt(wid)}
        extensionStart={[len / 2, (topY + botY) / 2, -wid / 2]}
        extensionEnd={[len / 2, (topY + botY) / 2, wid / 2]}
      />

      {/* Height — along Y, to the side */}
      <DimensionLineSegment
        start={[len / 2 + off, topY, 0]}
        end={[len / 2 + off, botY, 0]}
        label={fmt(hgt)}
        extensionStart={[len / 2, topY, 0]}
        extensionEnd={[len / 2, botY, 0]}
      />

      {/* Roof thickness — along Y at front */}
      <DimensionLineSegment
        start={[0, topY, wid / 2 + off * 0.7]}
        end={[0, topY - rt, wid / 2 + off * 0.7]}
        label={fmt(rt)}
        extensionStart={[0, topY, wid / 2]}
        extensionEnd={[0, topY - rt, wid / 2]}
      />

      {/* Wall thickness — along Z at mid-height */}
      <DimensionLineSegment
        start={[len / 2 + off * 0.7, (topY + botY) / 2, wid / 2]}
        end={[len / 2 + off * 0.7, (topY + botY) / 2, wid / 2 - wt]}
        label={fmt(wt)}
      />

      {/* Floor thickness */}
      <DimensionLineSegment
        start={[-len / 2 - off * 0.7, botY, 0]}
        end={[-len / 2 - off * 0.7, botY + ft, 0]}
        label={fmt(ft)}
        extensionStart={[-len / 2, botY, 0]}
        extensionEnd={[-len / 2, botY + ft, 0]}
      />
    </group>
  );
});

export default DimensionLines;