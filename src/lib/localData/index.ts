/**
 * PTEL LocalData - Módulo de base de datos local
 * 
 * Exporta todos los tipos y funciones para la BBDD IndexedDB local.
 * 
 * @module lib/localData
 * @version 1.0.0
 * @date 2025-12-05
 */

// Esquemas y tipos
export {
  // Base de datos
  db,
  PTELDatabase,
  
  // Tipos
  type InfraTipologia,
  type DERAFeature,
  type INEMunicipio,
  type MunicipioBoundary,
  type GeocodingCache,
  type SyncStatus,
  type SyncMetadata,
  
  // Helpers
  isDatabaseReady,
  getDatabaseStats,
  cleanExpiredCache,
  generateCacheKey,
  
  // Constantes
  CACHE_TTL_MS,
  SYNC_INTERVAL_DAYS,
  SCHEMA_VERSION
} from './schemas';
