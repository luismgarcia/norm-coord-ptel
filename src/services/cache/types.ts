/**
 * PTEL Cache System - Type Definitions
 * Fase 2: Sistema de caché multinivel para geocodificación
 */

/**
 * Entrada individual en el cache de geocodificación
 */
export interface CacheEntry {
  /** Clave única del cache (hash de nombre + municipio + tipo) */
  key: string;
  
  /** Coordenadas UTM30 ETRS89 [X, Y] */
  coordinates: [number, number];
  
  /** Sistema de referencia de coordenadas */
  crs: 'EPSG:25830';
  
  /** Fuente de la geocodificación (WFS, CartoCiudad, etc.) */
  source: string;
  
  /** Nivel de confianza 0-100 */
  confidence: number;
  
  /** Timestamp de creación (ms desde epoch) */
  timestamp: number;
  
  /** Time To Live en milisegundos (default: 90 días) */
  ttl: number;
  
  /** Metadatos adicionales opcionales */
  metadata?: {
    municipio: string;
    tipo: string;
    nombreOriginal: string;
  };
}
/**
 * Configuración del sistema de cache
 */
export interface CacheConfig {
  /** Tamaño máximo en MB para localStorage (default: 5MB) */
  maxSizeMB: number;
  
  /** TTL por defecto en días (default: 90) */
  defaultTTLDays: number;
  
  /** Habilitar compresión para entries grandes */
  enableCompression: boolean;
  
  /** Política de eviction ('lru' | 'fifo' | 'lfu') */
  evictionPolicy: 'lru' | 'fifo' | 'lfu';
}

/**
 * Métricas del sistema de cache
 */
export interface CacheMetrics {
  /** Tasa de aciertos (hits / total requests) */
  hitRate: number;
  
  /** Tasa de fallos (misses / total requests) */
  missRate: number;
  
  /** Latencia promedio para hits en ms */
  avgHitLatency: number;
  
  /** Latencia promedio para misses en ms */
  avgMissLatency: number;
  
  /** Total de entradas en cache */
  totalEntries: number;
  
  /** Tamaño total en bytes */
  sizeBytes: number;
  
  /** Número de evictions realizadas */
  evictions: number;
  
  /** Timestamp de última actualización */
  lastUpdated: number;
}

/**
 * Resultado de operación de cache
 */
export interface CacheResult<T> {
  /** Indica si se encontró en cache */
  hit: boolean;
  
  /** Dato recuperado (si hit=true) */
  data?: T;
  
  /** Razón de miss (si hit=false) */
  missReason?: 'not_found' | 'expired' | 'corrupted';
  
  /** Latencia de la operación en ms */
  latency: number;
}

/**
 * Opciones para operación set
 */
export interface SetOptions {
  /** TTL personalizado para esta entrada (ms) */
  ttl?: number;
  
  /** Forzar sobrescritura si existe */
  force?: boolean;
}
