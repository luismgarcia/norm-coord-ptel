/**
 * PTEL LocalData - Módulo de base de datos local
 * 
 * Exporta todos los tipos y funciones para la BBDD IndexedDB local.
 * 
 * @module lib/localData
 * @version 1.1.0
 * @date 2025-12-05
 * @session B.2
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

// Servicio de carga
export {
  // Funciones
  checkDataLoaded,
  loadInitialData,
  clearAllData,
  
  // Tipos
  type LoadProgress,
  type LoadOptions,
  type LoadResult
} from './localDataService';

// Singleton Detector (B.3)
export {
  // Funciones principales
  detectSingleton,
  detectSingletonByNombre,
  getMunicipioTypologyCounts,
  isSingletonType,
  getSingletonFeature,
  getCandidatesByNombre,
  getGlobalSingletonStats,
  
  // Constantes
  ALL_TIPOLOGIAS,
  
  // Tipos
  type SingletonResult,
  type MunicipioTypologyCounts,
  type DetectionOptions
} from './singletonDetector';
