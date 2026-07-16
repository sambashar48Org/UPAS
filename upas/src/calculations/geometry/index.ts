/**
 * UPAS — Geometry Calculations Module
 *
 * Computes structural geometry, distances, and volumes for the
 * blast / penetration calculation engine.
 *
 * Reference Standards: TM 5-1300, UFC 3-340-02, TM 5-855-1, ASCE 59-11
 */

import type { ProjectInput, GeometryResults } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Resolve a nullable shape parameter, falling back to a safe default
 * when the value is null or non-positive.
 */
function resolveParam(value: number | null, fallback: number): number {
  return value !== null && value > 0 ? value : fallback;
}

/**
 * Euclidean distance between two 3-D points.
 */
function euclideanDistance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalize a 3-D vector to unit length.
 * Returns the zero vector when the magnitude is zero.
 */
function normalize(v: { x: number; y: number; z: number }): {
  x: number;
  y: number;
  z: number;
} {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (mag === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

// ─── 1. Structure Volume ──────────────────────────────────────────────

/**
 * Calculate the gross volume of the structure in m³ based on its type.
 *
 * - **box**     : L × W × H
 * - **arch**    : cross-section area (rectangle + semicircle cap) × length
 *                 Area = W×(H−r) + π×r²/2  where r = archRadius
 * - **cylinder** : π × r² × L  where r = cylinderRadius
 * - **dome**    : (box portion volume) + (2/3 × π × r³) for hemispherical cap
 * - **custom**  : falls back to the box formula
 */
export function calculateStructureVolume(input: ProjectInput): number {
  const { type, length: L, width: W, height: H } = input.structure;
  const sp = input.structure.shapeParams;

  switch (type) {
    case 'box':
    case 'custom': {
      return L * W * H;
    }

    case 'arch': {
      const r = resolveParam(sp.archRadius, W / 2);
      const rectangularArea = W * (H - r);
      const semicircleArea = (Math.PI * r * r) / 2;
      return (rectangularArea + semicircleArea) * L;
    }

    case 'cylinder': {
      const r = resolveParam(sp.cylinderRadius, W / 2);
      return Math.PI * r * r * L;
    }

    case 'dome': {
      const r = resolveParam(sp.domeRadius, Math.min(L, W) / 2);
      const boxVolume = L * W * (H - r);
      const domeCapVolume = (2 / 3) * Math.PI * r * r * r;
      return boxVolume + domeCapVolume;
    }

    default: {
      // Exhaustive guard — should never be reached with strict typing
      const _exhaustive: never = type;
      return L * W * H;
    }
  }
}

// ─── 2. Surface Areas ─────────────────────────────────────────────────

/**
 * Calculate structural surface areas in m².
 *
 * Returns the roof, wall, floor, and total external surface areas.
 */
export function calculateSurfaceAreas(input: ProjectInput): {
  roofArea: number;
  wallArea: number;
  floorArea: number;
  externalSurfaceArea: number;
} {
  const { type, length: L, width: W, height: H } = input.structure;
  const sp = input.structure.shapeParams;

  let roofArea: number;
  let wallArea: number;
  let floorArea: number;

  switch (type) {
    case 'box':
    case 'custom': {
      roofArea = L * W;
      wallArea = 2 * (L + W) * H;
      floorArea = L * W;
      break;
    }

    case 'arch': {
      const r = resolveParam(sp.archRadius, W / 2);
      const arcLength = Math.PI * r; // semicircle
      roofArea = arcLength * L;
      wallArea = 2 * L * (H - r);
      floorArea = L * W;
      break;
    }

    case 'cylinder': {
      const r = resolveParam(sp.cylinderRadius, W / 2);
      roofArea = Math.PI * r * r;
      wallArea = 2 * Math.PI * r * L;
      floorArea = Math.PI * r * r;
      break;
    }

    case 'dome': {
      const r = resolveParam(sp.domeRadius, Math.min(L, W) / 2);
      roofArea = 2 * Math.PI * r * r; // hemisphere external area
      wallArea = 2 * Math.PI * r * (H - r);
      floorArea = Math.PI * r * r;
      break;
    }

    default: {
      const _exhaustive: never = type;
      roofArea = L * W;
      wallArea = 2 * (L + W) * H;
      floorArea = L * W;
      break;
    }
  }

  const externalSurfaceArea = roofArea + wallArea + floorArea;

  return { roofArea, wallArea, floorArea, externalSurfaceArea };
}

// ─── 3. Charge Volume ─────────────────────────────────────────────────

/**
 * Calculate the explosive charge volume in m³.
 *
 * - **spherical**  : derived from mass and density; r = (3W / 4πρ)^(1/3)
 * - **cylindrical** : π × (D/2)² × L  using chargeDiameter & chargeLength
 * - **cuboid**     : approximated as a cylinder with the same mass
 */
export function calculateChargeVolume(input: ProjectInput): number {
  const { chargeShape, chargeMass, density, chargeDiameter, chargeLength } =
    input.threat.explosive;

  switch (chargeShape) {
    case 'spherical': {
      // Sphere radius from mass: V = m/ρ  →  r = (3m / 4πρ)^(1/3)
      const r = Math.pow(
        (3 * chargeMass) / (4 * Math.PI * Math.max(density, 1)),
        1 / 3,
      );
      return (4 / 3) * Math.PI * r * r * r;
    }

    case 'cylindrical': {
      const d = resolveParam(chargeDiameter, 0.3);
      const l = resolveParam(chargeLength, 0.5);
      return Math.PI * Math.pow(d / 2, 2) * l;
    }

    case 'cuboid': {
      // Approximate as a cylinder with equivalent mass
      const r = Math.pow(
        (3 * chargeMass) / (4 * Math.PI * Math.max(density, 1)),
        1 / 3,
      );
      return (4 / 3) * Math.PI * r * r * r;
    }

    default: {
      const _exhaustive: never = chargeShape;
      const r = Math.pow(
        (3 * chargeMass) / (4 * Math.PI * Math.max(density, 1)),
        1 / 3,
      );
      return (4 / 3) * Math.PI * r * r * r;
    }
  }
}

// ─── 4. Distance to Structure ─────────────────────────────────────────

/**
 * Calculate the distance from the threat position to the structure.
 *
 * - **distanceToCenter** : Euclidean distance from threat to structure center.
 * - **distanceToSurface** : approximate distance to the nearest structure
 *   surface by subtracting half the relevant structure dimension along
 *   the threat direction.
 * - **threatDirection**   : unit vector from threat → structure center.
 */
export function calculateDistanceToStructure(input: ProjectInput): {
  distanceToCenter: number;
  distanceToSurface: number;
  threatDirection: { x: number; y: number; z: number };
} {
  const threatPos = input.threat.position;
  const structPos = input.structure.position;

  const dx = structPos.x - threatPos.x;
  const dy = structPos.y - threatPos.y;
  const dz = structPos.z - threatPos.z;

  const distanceToCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Normalize threat direction vector
  const threatDirection = normalize({ x: dx, y: dy, z: dz });

  // Estimate the half-extent of the structure projected onto the threat direction.
  // This approximates the distance from center to the nearest surface along
  // the line of approach.
  const halfExtent =
    (Math.abs(threatDirection.x) * input.structure.length) / 2 +
    (Math.abs(threatDirection.y) * input.structure.height) / 2 +
    (Math.abs(threatDirection.z) * input.structure.width) / 2;

  const distanceToSurface = Math.max(distanceToCenter - halfExtent, 0);

  return { distanceToCenter, distanceToSurface, threatDirection };
}

// ─── 5. Soil Cover Thickness ──────────────────────────────────────────

/**
 * Calculate the soil cover thickness above the structure roof.
 *
 * This equals the burial depth — the depth of the structure top
 * below ground level (already in meters).
 */
export function calculateSoilCoverThickness(input: ProjectInput): number {
  return input.structure.burialDepth;
}

// ─── 6. Scaled Distance ───────────────────────────────────────────────

/**
 * Calculate the Hopkinson-Cranz scaled distance.
 *
 * Z = R / W^(1/3)
 *
 * @param standoffDistance - R in meters
 * @param tntMass - W in kg TNT equivalent
 * @returns Z in m/kg^(1/3)
 */
export function calculateScaledDistance(
  standoffDistance: number,
  tntMass: number,
): number {
  if (tntMass <= 0) {
    return Infinity;
  }
  return standoffDistance / Math.pow(tntMass, 1 / 3);
}

// ─── 7. Main Orchestrator ─────────────────────────────────────────────

/**
 * Calculate all geometric properties required by the blast/penetration
 * engine in a single pass.
 *
 * @param input - Fully-resolved project input (SI units)
 * @returns Aggregated geometry results
 */
export function calculateGeometry(input: ProjectInput): GeometryResults {
  const volume = calculateStructureVolume(input);
  const areas = calculateSurfaceAreas(input);
  const chargeVolume = calculateChargeVolume(input);
  const distances = calculateDistanceToStructure(input);
  const soilCoverThickness = calculateSoilCoverThickness(input);

  return {
    volume,
    externalSurfaceArea: areas.externalSurfaceArea,
    roofArea: areas.roofArea,
    wallArea: areas.wallArea,
    floorArea: areas.floorArea,
    chargeVolume,
    distanceToCenter: distances.distanceToCenter,
    distanceToSurface: distances.distanceToSurface,
    threatDirection: distances.threatDirection,
    soilCoverThickness,
  };
}