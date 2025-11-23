/**
 * PTEL Cache System - Module Exports
 * Sistema de caché multinivel para geocodificación
 */

export { GeoCache } from './GeoCache';
export { LRUEvictionManager } from './utils/lruEviction';
export { generateCacheKey } from './utils/hashGenerator';

export type {
  CacheEntry,
  CacheConfig,
  CacheMetrics,
  CacheResult,
  SetOptions
} from './types';
