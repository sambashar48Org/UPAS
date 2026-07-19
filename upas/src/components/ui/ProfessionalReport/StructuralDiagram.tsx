/**
 * UPAS — Structural Cross-Section Diagram
 * Phase 5C-2: 2D SVG visualization of box structure with PASS/FAIL coloring
 *
 * Shows:
 *   - Box cross-section (roof / walls / floor)
 *   - Blast pressure arrow from above
 *   - Color-coded element status: green=PASS, red=FAIL, amber=WARN
 *   - Thickness labels (mm)
 *   - Reinforcement labels
 *
 * Architecture Rule: READS ONLY from ProfessionalElementData. No calculations.
 */

import React from 'react';
import type { ProfessionalElementData } from '../../../calculations/design/professional-report';

interface Props {
  roof: ProfessionalElementData;
  wall: ProfessionalElementData;
  floor: ProfessionalElementData;
  governingElement: 'roof' | 'wall' | 'floor';
}

const STATUS_COLORS = {
  pass: { fill: '#22c55e', fillAlpha: '15', stroke: '#16a34a', text: '#15803d' },
  fail: { fill: '#ef4444', fillAlpha: '15', stroke: '#dc2626', text: '#b91c1c' },
  warn: { fill: '#f59e0b', fillAlpha: '15', stroke: '#d97706', text: '#b45309' },
};

function getStatusColor(pass: boolean, isGoverning: boolean) {
  if (!pass) return STATUS_COLORS.fail;
  if (isGoverning) return STATUS_COLORS.warn; // Governing = amber (attention)
  return STATUS_COLORS.pass;
}

/**
 * Scale: 1mm of thickness → 0.8px of SVG height
 * Max thickness 2000mm → 160px
 */
const THICKNESS_SCALE = 0.08;
const WALL_WIDTH = 30; // Fixed visual wall width in px
const SPAN_WIDTH = 220; // Fixed visual span in px
const PADDING = 40; // Top/bottom padding
const LABEL_OFFSET = 14;

export default function StructuralDiagram({ roof, wall, floor, governingElement }: Props) {
  // Compute visual dimensions (proportional to thickness)
  const roofH = Math.max(8, roof.requiredThickness * THICKNESS_SCALE);
  const wallH = SPAN_WIDTH; // Visual wall height = span width for aesthetics
  const floorH = Math.max(8, floor.requiredThickness * THICKNESS_SCALE);
  const wallThick = Math.max(6, wall.requiredThickness * THICKNESS_SCALE);

  const totalH = PADDING + roofH + wallH + floorH + PADDING;
  const totalW = SPAN_WIDTH + wallThick * 2 + PADDING * 2;

  // Center the structure
  const originX = PADDING;
  const originY = PADDING;

  // Element positions
  const roofY = originY;
  const wallTopY = originY + roofH;
  const wallBotY = wallTopY + wallH;
  const floorY = wallBotY;

  // Status colors
  const roofColor = getStatusColor(roof.overallPass, governingElement === 'roof');
  const wallColor = getStatusColor(wall.overallPass, governingElement === 'wall');
  const floorColor = getStatusColor(floor.overallPass, governingElement === 'floor');

  // Reinforcement label
  const reinfLabel = (el: ProfessionalElementData) =>
    `${el.barDiameter}mm @ ${el.barSpacing}mm`;

  return (
    <div className="flex justify-center py-2" dir="ltr">
      <svg
        viewBox={`0 0 ${totalW} ${totalH + 70}`}
        width="100%"
        style={{ maxWidth: 340 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── Blast Pressure Arrow ── */}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
          </marker>
          <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Pressure arrows */}
        <text x={totalW / 2} y={14} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="sans-serif">
          Blast Pressure
        </text>
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={originX + wallThick + (SPAN_WIDTH * frac)}
            y1={20}
            x2={originX + wallThick + (SPAN_WIDTH * frac)}
            y2={roofY - 4}
            stroke="#64748b"
            strokeWidth="1.2"
            markerEnd="url(#arrowhead)"
          />
        ))}

        {/* ── Roof ── */}
        <rect
          x={originX}
          y={roofY}
          width={SPAN_WIDTH + wallThick * 2}
          height={roofH}
          fill={roofColor.fill + roofColor.fillAlpha}
          stroke={roofColor.stroke}
          strokeWidth="1.5"
        />
        <text
          x={originX + (SPAN_WIDTH + wallThick * 2) / 2}
          y={roofY + roofH / 2 + 3}
          textAnchor="middle"
          fontSize="8"
          fontWeight="bold"
          fill={roofColor.text}
          fontFamily="sans-serif"
        >
          ROOF — {roof.requiredThickness.toFixed(0)} mm
        </text>
        {/* Roof label */}
        <text
          x={originX + SPAN_WIDTH + wallThick * 2 + LABEL_OFFSET}
          y={roofY + roofH / 2 + 3}
          textAnchor="start"
          fontSize="7"
          fill={roofColor.text}
          fontFamily="sans-serif"
        >
          {reinfLabel(roof)}
        </text>

        {/* ── Left Wall ── */}
        <rect
          x={originX}
          y={wallTopY}
          width={wallThick}
          height={wallH}
          fill={wallColor.fill + wallColor.fillAlpha}
          stroke={wallColor.stroke}
          strokeWidth="1.5"
        />
        {/* Wall label (vertical) */}
        <text
          x={originX + wallThick / 2}
          y={wallTopY + wallH / 2}
          textAnchor="middle"
          fontSize="7"
          fontWeight="bold"
          fill={wallColor.text}
          fontFamily="sans-serif"
          transform={`rotate(-90, ${originX + wallThick / 2}, ${wallTopY + wallH / 2})`}
        >
          WALL {wall.requiredThickness.toFixed(0)}mm
        </text>

        {/* ── Right Wall ── */}
        <rect
          x={originX + SPAN_WIDTH + wallThick}
          y={wallTopY}
          width={wallThick}
          height={wallH}
          fill={wallColor.fill + wallColor.fillAlpha}
          stroke={wallColor.stroke}
          strokeWidth="1.5"
        />

        {/* ── Floor ── */}
        <rect
          x={originX}
          y={floorY}
          width={SPAN_WIDTH + wallThick * 2}
          height={floorH}
          fill={floorColor.fill + floorColor.fillAlpha}
          stroke={floorColor.stroke}
          strokeWidth="1.5"
        />
        <text
          x={originX + (SPAN_WIDTH + wallThick * 2) / 2}
          y={floorY + floorH / 2 + 3}
          textAnchor="middle"
          fontSize="8"
          fontWeight="bold"
          fill={floorColor.text}
          fontFamily="sans-serif"
        >
          FLOOR — {floor.requiredThickness.toFixed(0)} mm
        </text>
        <text
          x={originX + SPAN_WIDTH + wallThick * 2 + LABEL_OFFSET}
          y={floorY + floorH / 2 + 3}
          textAnchor="start"
          fontSize="7"
          fill={floorColor.text}
          fontFamily="sans-serif"
        >
          {reinfLabel(floor)}
        </text>

        {/* ── Room Interior (subtle) ── */}
        <rect
          x={originX + wallThick}
          y={wallTopY}
          width={SPAN_WIDTH}
          height={wallH}
          fill="#f8fafc"
          fillOpacity="0.5"
          stroke="none"
        />
        <text
          x={originX + wallThick + SPAN_WIDTH / 2}
          y={wallTopY + wallH / 2 + 3}
          textAnchor="middle"
          fontSize="9"
          fill="#94a3b8"
          fontFamily="sans-serif"
        >
          Protected Space
        </text>

        {/* ── Legend ── */}
        <g transform={`translate(${originX}, ${totalH + 30})`}>
          <text x="0" y="0" fontSize="8" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">Status:</text>
          <rect x="50" y="-7" width="12" height="10" rx="2" fill={STATUS_COLORS.pass.fill + STATUS_COLORS.pass.fillAlpha} stroke={STATUS_COLORS.pass.stroke} strokeWidth="1" />
          <text x="66" y="0" fontSize="7" fill="#64748b" fontFamily="sans-serif">PASS</text>
          <rect x="100" y="-7" width="12" height="10" rx="2" fill={STATUS_COLORS.warn.fill + STATUS_COLORS.warn.fillAlpha} stroke={STATUS_COLORS.warn.stroke} strokeWidth="1" />
          <text x="116" y="0" fontSize="7" fill="#64748b" fontFamily="sans-serif">Governing</text>
          <rect x="165" y="-7" width="12" height="10" rx="2" fill={STATUS_COLORS.fail.fill + STATUS_COLORS.fail.fillAlpha} stroke={STATUS_COLORS.fail.stroke} strokeWidth="1" />
          <text x="181" y="0" fontSize="7" fill="#64748b" fontFamily="sans-serif">FAIL</text>
        </g>

        {/* ── Governing indicator ── */}
        {governingElement === 'wall' && (
          <g>
            <circle cx={originX - 10} cy={wallTopY + wallH / 2} r="5" fill="none" stroke={wallColor.stroke} strokeWidth="1.5" strokeDasharray="2 1" />
            <text x={originX - 10} y={wallTopY + wallH / 2 + 2.5} textAnchor="middle" fontSize="6" fill={wallColor.text} fontFamily="sans-serif">G</text>
          </g>
        )}
      </svg>
    </div>
  );
}