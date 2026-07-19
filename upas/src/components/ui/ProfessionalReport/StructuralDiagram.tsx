/**
 * UPAS — Enhanced Structural Cross-Section Diagram
 * Phase 5E-5: Professional engineering diagram with dimensions, Mu, Vu, SF, reinforcement
 *
 * Shows:
 *   - Box cross-section (roof / walls / floor) with proportional thickness
 *   - Blast pressure arrows from above
 *   - Color-coded element status: green=PASS, amber=governing, red=FAIL
 *   - Thickness labels (mm)
 *   - Reinforcement labels (bar dia @ spacing)
 *   - Mu (design moment) and Vu (design shear) per element
 *   - Safety Factor indicators
 *   - Dimension lines with arrows
 *   - Span dimension indicator
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
  pass: { fill: '#22c55e', fillAlpha: '15', stroke: '#16a34a', text: '#15803d', bg: '#f0fdf4' },
  fail: { fill: '#ef4444', fillAlpha: '15', stroke: '#dc2626', text: '#b91c1c', bg: '#fef2f2' },
  warn: { fill: '#f59e0b', fillAlpha: '15', stroke: '#d97706', text: '#b45309', bg: '#fffbeb' },
};

function getStatusColor(pass: boolean, isGoverning: boolean) {
  if (!pass) return STATUS_COLORS.fail;
  if (isGoverning) return STATUS_COLORS.warn;
  return STATUS_COLORS.pass;
}

const THICKNESS_SCALE = 0.08;
const WALL_WIDTH = 30;
const SPAN_WIDTH = 220;
const PADDING = 45;
const LABEL_OFFSET = 16;
const DATA_PANEL_WIDTH = 160;

function sfBadge(x: number, y: number, sf: number, label: string) {
  const pass = sf >= 1.0;
  const color = pass ? '#16a34a' : '#dc2626';
  const bg = pass ? '#f0fdf4' : '#fef2f2';
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="-8" width="52" height="12" rx="3" fill={bg} stroke={color} strokeWidth="0.8" />
      <text x="4" y="1" fontSize="6.5" fill={color} fontFamily="monospace" fontWeight="bold">
        {label} {sf.toFixed(2)}
      </text>
    </g>
  );
}

function dimensionLine(x1: number, y1: number, x2: number, y2: number, label: string, offset: number, side: 'left' | 'right') {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const isHorizontal = Math.abs(y2 - y1) < 2;

  return (
    <g stroke="#94a3b8" strokeWidth="0.6" fill="none">
      {/* Extension lines */}
      <line x1={x1} y1={y1} x2={isHorizontal ? x1 : x1 + (side === 'left' ? -offset : offset)} y2={isHorizontal ? y1 + (side === 'left' ? -offset : offset) : y2} />
      <line x1={x2} y1={y2} x2={isHorizontal ? x2 : x2 + (side === 'left' ? -offset : offset)} y2={isHorizontal ? y2 + (side === 'left' ? -offset : offset) : y2} />
      {/* Dimension line */}
      {isHorizontal ? (
        <>
          <line x1={x1} y1={y1 + (side === 'left' ? -offset : offset)} x2={midX - 14} y2={y1 + (side === 'left' ? -offset : offset)} />
          <line x1={midX + 14} y1={y1 + (side === 'left' ? -offset : offset)} x2={x2} y2={y1 + (side === 'left' ? -offset : offset)} />
        </>
      ) : (
        <>
          <line x1={x1 + (side === 'left' ? -offset : offset)} y1={y1} x2={x1 + (side === 'left' ? -offset : offset)} y2={midY - 6} />
          <line x1={x2 + (side === 'left' ? -offset : offset)} y1={midY + 6} x2={x2 + (side === 'left' ? -offset : offset)} y2={y2} />
        </>
      )}
      {/* Label */}
      <text
        x={midX} y={isHorizontal ? y1 + (side === 'left' ? -offset + 3 : offset - 3) : midY + 2}
        textAnchor="middle"
        fontSize="6.5"
        fill="#64748b"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );
}

export default function StructuralDiagram({ roof, wall, floor, governingElement }: Props) {
  const roofH = Math.max(10, roof.requiredThickness * THICKNESS_SCALE);
  const wallH = SPAN_WIDTH;
  const floorH = Math.max(10, floor.requiredThickness * THICKNESS_SCALE);
  const wallThick = Math.max(8, wall.requiredThickness * THICKNESS_SCALE);

  const totalH = PADDING + roofH + wallH + floorH + PADDING + 30;
  const totalW = SPAN_WIDTH + wallThick * 2 + PADDING * 2 + DATA_PANEL_WIDTH;

  const originX = PADDING;
  const originY = PADDING;
  const roofY = originY;
  const wallTopY = originY + roofH;
  const wallBotY = wallTopY + wallH;
  const floorY = wallBotY;
  const structRight = originX + SPAN_WIDTH + wallThick * 2;

  const roofColor = getStatusColor(roof.overallPass, governingElement === 'roof');
  const wallColor = getStatusColor(wall.overallPass, governingElement === 'wall');
  const floorColor = getStatusColor(floor.overallPass, governingElement === 'floor');

  const reinfLabel = (el: ProfessionalElementData) =>
    `${el.barDiameter}mm @ ${el.barSpacing}mm`;

  const dataPanelX = structRight + LABEL_OFFSET + 8;

  return (
    <div className="flex justify-center py-2" dir="ltr">
      <svg
        viewBox={`0 0 ${totalW} ${totalH + 30}`}
        width="100%"
        style={{ maxWidth: 520 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker id="arrowhead" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="#64748b" />
          </marker>
          <marker id="dim-arrow-left" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
            <polygon points="6 0, 0 2, 6 4" fill="#94a3b8" />
          </marker>
          <marker id="dim-arrow-right" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
          </marker>
        </defs>

        {/* ── Blast Pressure Arrows ── */}
        <text x={originX + (SPAN_WIDTH + wallThick * 2) / 2} y={14} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">
          Blast Pressure
        </text>
        {[0.2, 0.4, 0.6, 0.8].map((frac) => (
          <line
            key={frac}
            x1={originX + wallThick + (SPAN_WIDTH * frac)}
            y1={18}
            x2={originX + wallThick + (SPAN_WIDTH * frac)}
            y2={roofY - 3}
            stroke="#64748b"
            strokeWidth="1"
            markerEnd="url(#arrowhead)"
            strokeDasharray="3 2"
          />
        ))}

        {/* ── Roof ── */}
        <rect x={originX} y={roofY} width={SPAN_WIDTH + wallThick * 2} height={roofH}
          fill={roofColor.fill + roofColor.fillAlpha} stroke={roofColor.stroke} strokeWidth="1.5" rx="1" />
        <text x={originX + (SPAN_WIDTH + wallThick * 2) / 2} y={roofY + roofH / 2 + 3}
          textAnchor="middle" fontSize="8" fontWeight="bold" fill={roofColor.text} fontFamily="sans-serif">
          ROOF {roof.requiredThickness.toFixed(0)} mm
        </text>
        <text x={structRight + LABEL_OFFSET} y={roofY + roofH / 2 - 2}
          textAnchor="start" fontSize="6.5" fill={roofColor.text} fontFamily="monospace">
          {reinfLabel(roof)} | As={roof.providedAs.toFixed(0)} mm²/m
        </text>

        {/* ── Left Wall ── */}
        <rect x={originX} y={wallTopY} width={wallThick} height={wallH}
          fill={wallColor.fill + wallColor.fillAlpha} stroke={wallColor.stroke} strokeWidth="1.5" rx="1" />
        <text x={originX + wallThick / 2} y={wallTopY + wallH / 2 - 6}
          textAnchor="middle" fontSize="6.5" fontWeight="bold" fill={wallColor.text} fontFamily="sans-serif"
          transform={`rotate(-90, ${originX + wallThick / 2}, ${wallTopY + wallH / 2})`}>
          WALL {wall.requiredThickness.toFixed(0)}mm
        </text>
        <text x={originX + wallThick / 2} y={wallTopY + wallH / 2 + 10}
          textAnchor="middle" fontSize="5.5" fill={wallColor.text} fontFamily="monospace"
          transform={`rotate(-90, ${originX + wallThick / 2}, ${wallTopY + wallH / 2 + 10})`}>
          {reinfLabel(wall)}
        </text>

        {/* ── Right Wall ── */}
        <rect x={originX + SPAN_WIDTH + wallThick} y={wallTopY} width={wallThick} height={wallH}
          fill={wallColor.fill + wallColor.fillAlpha} stroke={wallColor.stroke} strokeWidth="1.5" rx="1" />

        {/* ── Floor ── */}
        <rect x={originX} y={floorY} width={SPAN_WIDTH + wallThick * 2} height={floorH}
          fill={floorColor.fill + floorColor.fillAlpha} stroke={floorColor.stroke} strokeWidth="1.5" rx="1" />
        <text x={originX + (SPAN_WIDTH + wallThick * 2) / 2} y={floorY + floorH / 2 + 3}
          textAnchor="middle" fontSize="8" fontWeight="bold" fill={floorColor.text} fontFamily="sans-serif">
          FLOOR {floor.requiredThickness.toFixed(0)} mm
        </text>
        <text x={structRight + LABEL_OFFSET} y={floorY + floorH / 2 - 2}
          textAnchor="start" fontSize="6.5" fill={floorColor.text} fontFamily="monospace">
          {reinfLabel(floor)} | As={floor.providedAs.toFixed(0)} mm²/m
        </text>

        {/* ── Room Interior ── */}
        <rect x={originX + wallThick} y={wallTopY} width={SPAN_WIDTH} height={wallH}
          fill="#f8fafc" fillOpacity="0.4" stroke="none" />
        <text x={originX + wallThick + SPAN_WIDTH / 2} y={wallTopY + wallH / 2 + 3}
          textAnchor="middle" fontSize="9" fill="#94a3b8" fontFamily="sans-serif" fontStyle="italic">
          Protected Space
        </text>

        {/* ── Dimension Lines ── */}
        {/* Roof thickness dimension */}
        {dimensionLine(originX - 2, roofY, originX - 2, roofY + roofH, `${roof.requiredThickness.toFixed(0)}`, 12, 'left')}
        {/* Wall thickness dimension */}
        {dimensionLine(originX, wallTopY - 6, originX + wallThick, wallTopY - 6, `${wall.requiredThickness.toFixed(0)}`, 8, 'left')}
        {/* Floor thickness dimension */}
        {dimensionLine(originX - 2, floorY, originX - 2, floorY + floorH, `${floor.requiredThickness.toFixed(0)}`, 12, 'left')}
        {/* Span dimension (below floor) */}
        {dimensionLine(originX + wallThick, floorY + floorH + 4, originX + wallThick + SPAN_WIDTH, floorY + floorH + 4, 'Span', 10, 'right')}

        {/* ── Governing Indicator ── */}
        {governingElement === 'roof' && (
          <g>
            <circle cx={originX + (SPAN_WIDTH + wallThick * 2) / 2} cy={roofY - 8} r="6"
              fill="none" stroke={roofColor.stroke} strokeWidth="1.5" strokeDasharray="2 1" />
            <text x={originX + (SPAN_WIDTH + wallThick * 2) / 2} y={roofY - 5.5}
              textAnchor="middle" fontSize="7" fill={roofColor.text} fontFamily="sans-serif" fontWeight="bold">G</text>
          </g>
        )}
        {governingElement === 'wall' && (
          <g>
            <circle cx={originX - 14} cy={wallTopY + wallH / 2} r="6"
              fill="none" stroke={wallColor.stroke} strokeWidth="1.5" strokeDasharray="2 1" />
            <text x={originX - 14} y={wallTopY + wallH / 2 + 2.5}
              textAnchor="middle" fontSize="7" fill={wallColor.text} fontFamily="sans-serif" fontWeight="bold">G</text>
          </g>
        )}
        {governingElement === 'floor' && (
          <g>
            <circle cx={originX + (SPAN_WIDTH + wallThick * 2) / 2} cy={floorY + floorH + 16} r="6"
              fill="none" stroke={floorColor.stroke} strokeWidth="1.5" strokeDasharray="2 1" />
            <text x={originX + (SPAN_WIDTH + wallThick * 2) / 2} y={floorY + floorH + 18.5}
              textAnchor="middle" fontSize="7" fill={floorColor.text} fontFamily="sans-serif" fontWeight="bold">G</text>
          </g>
        )}

        {/* ═══ DATA PANEL (Right Side) ═══ */}
        <g transform={`translate(${dataPanelX}, ${originY})`}>
          <rect x="-4" y="-4" width={DATA_PANEL_WIDTH - 4} height={wallH + roofH + floorH + 8}
            rx="4" fill="white" stroke="#e2e8f0" strokeWidth="0.8" />
          <text x="0" y="8" fontSize="7.5" fill="#1e3a5f" fontFamily="sans-serif" fontWeight="bold">
            Engineering Data
          </text>
          <line x1="0" y1="12" x2={DATA_PANEL_WIDTH - 12} y2="12" stroke="#e2e8f0" strokeWidth="0.5" />

          {/* Roof data */}
          <text x="0" y="24" fontSize="7" fill={roofColor.text} fontFamily="sans-serif" fontWeight="bold">ROOF</text>
          <text x="0" y="34" fontSize="6" fill="#64748b" fontFamily="monospace">Mu = {roof.designMoment.toFixed(1)} kN·m/m</text>
          <text x="0" y="43" fontSize="6" fill="#64748b" fontFamily="monospace">Vu = {roof.designShear.toFixed(1)} kN/m</text>
          {sfBadge(0, 48, roof.flexuralSF, 'SFφ')}
          {sfBadge(58, 48, roof.shearSF, 'SFv')}

          {/* Wall data */}
          <text x="0" y={wallTopY - originY + 10} fontSize="7" fill={wallColor.text} fontFamily="sans-serif" fontWeight="bold">WALL</text>
          <text x="0" y={wallTopY - originY + 20} fontSize="6" fill="#64748b" fontFamily="monospace">Mu = {wall.designMoment.toFixed(1)} kN·m/m</text>
          <text x="0" y={wallTopY - originY + 29} fontSize="6" fill="#64748b" fontFamily="monospace">Vu = {wall.designShear.toFixed(1)} kN/m</text>
          {sfBadge(0, wallTopY - originY + 34, wall.flexuralSF, 'SFφ')}
          {sfBadge(58, wallTopY - originY + 34, wall.shearSF, 'SFv')}

          {/* Floor data */}
          <text x="0" y={floorY - originY + 10} fontSize="7" fill={floorColor.text} fontFamily="sans-serif" fontWeight="bold">FLOOR</text>
          <text x="0" y={floorY - originY + 20} fontSize="6" fill="#64748b" fontFamily="monospace">Mu = {floor.designMoment.toFixed(1)} kN·m/m</text>
          <text x="0" y={floorY - originY + 29} fontSize="6" fill="#64748b" fontFamily="monospace">Vu = {floor.designShear.toFixed(1)} kN/m</text>
          {sfBadge(0, floorY - originY + 34, floor.flexuralSF, 'SFφ')}
          {sfBadge(58, floorY - originY + 34, floor.shearSF, 'SFv')}
        </g>

        {/* ── Legend ── */}
        <g transform={`translate(${originX}, ${totalH + 10})`}>
          <text x="0" y="0" fontSize="7" fill="#64748b" fontFamily="sans-serif" fontWeight="bold">Status:</text>
          <rect x="46" y="-7" width="10" height="9" rx="2" fill={STATUS_COLORS.pass.fill + STATUS_COLORS.pass.fillAlpha} stroke={STATUS_COLORS.pass.stroke} strokeWidth="0.8" />
          <text x="60" y="0" fontSize="6.5" fill="#64748b" fontFamily="sans-serif">PASS</text>
          <rect x="92" y="-7" width="10" height="9" rx="2" fill={STATUS_COLORS.warn.fill + STATUS_COLORS.warn.fillAlpha} stroke={STATUS_COLORS.warn.stroke} strokeWidth="0.8" />
          <text x="106" y="0" fontSize="6.5" fill="#64748b" fontFamily="sans-serif">Governing</text>
          <rect x="155" y="-7" width="10" height="9" rx="2" fill={STATUS_COLORS.fail.fill + STATUS_COLORS.fail.fillAlpha} stroke={STATUS_COLORS.fail.stroke} strokeWidth="0.8" />
          <text x="169" y="0" fontSize="6.5" fill="#64748b" fontFamily="sans-serif">FAIL</text>
          <text x="205" y="0" fontSize="6" fill="#94a3b8" fontFamily="sans-serif">SFφ=Flexural SF | SFv=Shear SF | G=Governing Element</text>
        </g>
      </svg>
    </div>
  );
}