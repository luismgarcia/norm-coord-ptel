/**
 * spatialIndex.ts - F023 Fase 3.2
 * 
 * Índice espacial R-tree usando Flatbush para búsquedas O(log n).
 * Optimiza búsquedas por proximidad en datos DERA.
 * 
 * CARACTERÍSTICAS:
 * - Flatbush R-tree para búsquedas espaciales ultra-rápidas
 * - Búsqueda por bounding box
 * - Búsqueda por radio (k-nearest)
 * - Compatible con UTM ETRS89 (EPSG:25830)
 * 
 * @version 1.0.0
 * @date 2025-12-04
 * @see F023 Fase 3 - Optimizaciones
 */

import Flatbush from 'flatbush';

// ============================================================================
// TIPOS
// ============================================================================

export interface SpatialFeature {
  id: string;
  x: number;
  y: number;
  [key: string]: unknown;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface NearestResult<T extends SpatialFeature> {
  feature: T;
  distance: number;
}

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================

/**
 * Índice espacial R-tree para búsquedas geoespaciales eficientes
 */
export class SpatialIndex<T extends SpatialFeature> {
  private index: Flatbush | null = null;
  private features: T[] = [];
  private isBuilt = false;
  
  /**
   * Construye el índice con un array de features
   */
  build(features: T[]): void {
    this.features = features;
    
    if (features.length === 0) {
      this.index = null;
      this.isBuilt = false;
      return;
    }
    
    // Crear índice Flatbush
    this.index = new Flatbush(features.length);
    
    // Añadir cada feature como un punto (bbox con min=max)
    for (const feature of features) {
      this.index.add(feature.x, feature.y, feature.x, feature.y);
    }
    
    // Finalizar construcción
    this.index.finish();
    this.isBuilt = true;
  }
  
  /**
   * Busca features dentro de un bounding box
   */
  searchBBox(bbox: BoundingBox): T[] {
    if (!this.isBuilt || !this.index) {
      return [];
    }
    
    const indices = this.index.search(bbox.minX, bbox.minY, bbox.maxX, bbox.maxY);
    return indices.map(i => this.features[i]);
  }
  
  /**
   * Busca features dentro de un radio desde un punto central
   * @param centerX - Coordenada X del centro
   * @param centerY - Coordenada Y del centro
   * @param radius - Radio de búsqueda en unidades de mapa (metros para UTM)
   */
  searchRadius(centerX: number, centerY: number, radius: number): T[] {
    if (!this.isBuilt || !this.index) {
      return [];
    }
    
    // Buscar en bounding box primero
    const candidates = this.index.search(
      centerX - radius,
      centerY - radius,
      centerX + radius,
      centerY + radius
    );
    
    // Filtrar por distancia real
    const radiusSq = radius * radius;
    const results: T[] = [];
    
    for (const idx of candidates) {
      const feature = this.features[idx];
      const dx = feature.x - centerX;
      const dy = feature.y - centerY;
      const distSq = dx * dx + dy * dy;
      
      if (distSq <= radiusSq) {
        results.push(feature);
      }
    }
    
    return results;
  }
  
  /**
   * Encuentra los k vecinos más cercanos a un punto
   */
  kNearest(centerX: number, centerY: number, k: number): NearestResult<T>[] {
    if (!this.isBuilt || !this.index || this.features.length === 0) {
      return [];
    }
    
    // Usar neighbors de Flatbush
    const indices = this.index.neighbors(centerX, centerY, k);
    
    const results: NearestResult<T>[] = [];
    for (const idx of indices) {
      const feature = this.features[idx];
      const dx = feature.x - centerX;
      const dy = feature.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      results.push({ feature, distance });
    }
    
    return results;
  }
  
  /**
   * Encuentra el vecino más cercano
   */
  nearest(centerX: number, centerY: number): NearestResult<T> | null {
    const results = this.kNearest(centerX, centerY, 1);
    return results.length > 0 ? results[0] : null;
  }
  
  /**
   * Busca features cerca de otro feature
   */
  findNear(feature: T, radius: number): T[] {
    return this.searchRadius(feature.x, feature.y, radius)
      .filter(f => f.id !== feature.id);
  }
  
  /**
   * Verifica si el índice está construido
   */
  get built(): boolean {
    return this.isBuilt;
  }
  
  /**
   * Obtiene el número de features indexados
   */
  get size(): number {
    return this.features.length;
  }
  
  /**
   * Limpia el índice
   */
  clear(): void {
    this.index = null;
    this.features = [];
    this.isBuilt = false;
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Calcula distancia euclidiana entre dos puntos (UTM)
 */
export function calculateDistance(
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calcula bounding box que contiene un punto con buffer
 */
export function createBBoxFromPoint(
  x: number, y: number, 
  buffer: number
): BoundingBox {
  return {
    minX: x - buffer,
    minY: y - buffer,
    maxX: x + buffer,
    maxY: y + buffer,
  };
}

/**
 * Une múltiples bounding boxes en uno solo
 */
export function mergeBBoxes(boxes: BoundingBox[]): BoundingBox | null {
  if (boxes.length === 0) return null;
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const box of boxes) {
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  }
  
  return { minX, minY, maxX, maxY };
}

/**
 * Verifica si un punto está dentro de un bounding box
 */
export function isPointInBBox(
  x: number, y: number,
  bbox: BoundingBox
): boolean {
  return x >= bbox.minX && x <= bbox.maxX &&
         y >= bbox.minY && y <= bbox.maxY;
}

/**
 * Expande un bounding box por un factor
 */
export function expandBBox(bbox: BoundingBox, factor: number): BoundingBox {
  const width = bbox.maxX - bbox.minX;
  const height = bbox.maxY - bbox.minY;
  const expandX = width * (factor - 1) / 2;
  const expandY = height * (factor - 1) / 2;
  
  return {
    minX: bbox.minX - expandX,
    minY: bbox.minY - expandY,
    maxX: bbox.maxX + expandX,
    maxY: bbox.maxY + expandY,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SpatialIndex;
