/**
 * UPAS — Database Layer (Sprint 1: In-Memory)
 * Provides data access for JSON datasets and in-memory entity storage.
 * Will be replaced/extended with persistent storage in later phases.
 */

import materialsData from '../data/materials.json';
import bombTypesData from '../data/bomb-types.json';
import soilTypesData from '../data/soil-types.json';

// ─── Data Access Functions ────────────────────────────────────────

/** Get all material definitions from JSON */
export function getMaterials() {
  return materialsData.materials;
}

/** Get a specific material by reference key */
export function getMaterialByRef(ref: string) {
  return materialsData.materials.find((m) => m.ref === ref) ?? null;
}

/** Get all bomb/explosive type definitions */
export function getBombTypes() {
  return bombTypesData.bombTypes;
}

/** Get a specific bomb type by reference key */
export function getBombTypeByRef(ref: string) {
  return bombTypesData.bombTypes.find((b) => b.ref === ref) ?? null;
}

/** Get all soil type definitions */
export function getSoilTypes() {
  return soilTypesData.soilTypes;
}

/** Get a specific soil type by reference key */
export function getSoilTypeByRef(ref: string) {
  return soilTypesData.soilTypes.find((s) => s.ref === ref) ?? null;
}

// ─── In-Memory Entity Storage ─────────────────────────────────────
// Sprint 1: simple Map-based storage. Future: IndexedDB / backend API.

const entityStore = new Map<string, Map<string, unknown>>();

function getEntityCollection(type: string): Map<string, unknown> {
  if (!entityStore.has(type)) {
    entityStore.set(type, new Map());
  }
  return entityStore.get(type)!;
}

export function saveEntity<T>(type: string, entity: T): T {
  const id = (entity as { id: string }).id;
  getEntityCollection(type).set(id, entity);
  return entity;
}

export function getEntity<T>(type: string, id: string): T | null {
  return (getEntityCollection(type).get(id) as T) ?? null;
}

export function getAllEntities<T>(type: string): T[] {
  return Array.from(getEntityCollection(type).values()) as T[];
}

export function deleteEntity(type: string, id: string): boolean {
  return getEntityCollection(type).delete(id);
}

export function clearEntityStore(type?: string): void {
  if (type) {
    entityStore.delete(type);
  } else {
    entityStore.clear();
  }
}