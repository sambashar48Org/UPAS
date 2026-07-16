/**
 * UPAS — Threat Path 3D
 * Sprint 3C: Renders the path line from threat to structure surface.
 *
 * Architecture: Reads ThreatPathVM only. No engineering logic.
 * Color, positions, labels all pre-computed by GeometryBridge.
 */

'use client';

import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreatPathVM } from '../../visualization/VisualizationModel';

interface Props {
  data: ThreatPathVM;
}

export default function ThreatPath3D({ data }: Props) {
  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...data.start),
      new THREE.Vector3(...data.end),
    ]);
    return geo;
  }, [data.start, data.end]);

  const lineMat = useMemo(() => new THREE.LineDashedMaterial({
    color: data.color,
    dashSize: 0.3,
    gapSize: 0.15,
    linewidth: 1,
  }), [data.color]);

  const line = useMemo(() => {
    const l = new THREE.Line(lineGeo, lineMat);
    l.computeLineDistances();
    return l;
  }, [lineGeo, lineMat]);

  // Midpoint for label
  const mid: [number, number, number] = [
    (data.start[0] + data.end[0]) / 2,
    (data.start[1] + data.end[1]) / 2 + 0.4,
    (data.start[2] + data.end[2]) / 2,
  ];

  // Distance markers at start and end
  const startMarker = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: data.color });
    return new THREE.Mesh(geo, mat);
  }, [data.color]);

  const endMarker = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: '#f97316' });
    return new THREE.Mesh(geo, mat);
  }, []);

  return (
    <group>
      {/* Dashed path line */}
      <primitive object={line} />

      {/* Start marker (threat) */}
      <primitive object={startMarker} position={data.start} />

      {/* End marker (structure surface) */}
      <primitive object={endMarker} position={data.end} />

      {/* Distance label at midpoint */}
      <Text
        position={mid}
        fontSize={0.2}
        color={data.color}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#00000080"
      >
        {data.label}
      </Text>

      {/* Distance to surface label at end */}
      <Text
        position={[data.end[0] + 0.3, data.end[1] + 0.2, data.end[2]]}
        fontSize={0.14}
        color="#f97316"
        anchorX="left"
        anchorY="bottom"
        outlineWidth={0.015}
        outlineColor="#00000060"
      >
        {`R = ${data.distanceToSurface.toFixed(1)} m`}
      </Text>
    </group>
  );
}