/**
 * PTEL Cache System - Module Exports
 * Sistema de caché multinivel para geocodificación
 */

// Backends de caché
export { GeoCache } from './GeoCache';
export { IndexedDBCache } from './IndexedDBCache';

// Facade unificado (recomendado para uso en la app)
export { CacheManager, cacheManager } from './CacheManager';

// Utilidades
export { LRUEvictionManager } from './utils/lruEviction';
export { generateCacheKey } from './utils/hashGenerator';

// Tipos
export type {
  CacheEntry,
  CacheConfig,
  CacheMetrics,
  CacheResult,
  SetOptions
} from './types';
