/**
 * CacheManager - Facade Unificado para Sistema de Caché Multinivel
 * Fase 2 PTEL: Gestión inteligente localStorage vs IndexedDB
 * 
 * Responsabilidades:
 * - Decide automáticamente qué backend usar según tamaño dataset
 * - API unificada para ambos backends
 * - Métricas agregadas en tiempo real
 * - Gestión de lifecycle (init, clear, metrics)
 * 
 * Estrategia:
 * - Dataset <5MB → localStorage (GeoCache)
 * - Dataset ≥5MB → IndexedDB (IndexedDBCache)
 * 
 * @author PTEL Team
 * @version 1.0.0
 */

import { GeoCache } from './GeoCache';
import { IndexedDBCache } from './IndexedDBCache';
import { generateCacheKey } from './utils/hashGenerator';
import type { 
  CacheEntry, 
  CacheConfig, 
  CacheMetrics, 
  CacheResult, 
  SetOptions 
} from './types';

/**
 * Configuración extendida para CacheManager
 */
interface CacheManagerConfig extends CacheConfig {
  /** Threshold en MB para cambiar de localStorage a IndexedDB */
  indexedDBThresholdMB: number;
  
  /** Prefiere IndexedDB incluso para datasets pequeños (testing) */
  preferIndexedDB: boolean;
}

/**
 * Configuración por defecto del CacheManager
 */
const DEFAULT_CONFIG: CacheManagerConfig = {
  maxSizeMB: 5,
  defaultTTLDays: 90,
  enableCompression: false,
  evictionPolicy: 'lru',
  indexedDBThresholdMB: 5,
  preferIndexedDB: false
};

/**
 * Tipos de backend disponibles
 */
type CacheBackend = 'localStorage' | 'indexedDB' | 'hybrid';

/**
 * Clase CacheManager - Gestión inteligente de caché multinivel
 */
export class CacheManager {
  private config: CacheManagerConfig;
  private geoCache: GeoCache;
  private indexedDBCache: IndexedDBCache | null = null;
  private currentBackend: CacheBackend = 'localStorage';
  private isInitialized = false;
  
  // Métricas agregadas
  private aggregatedMetrics: CacheMetrics;
  
  // Contadores para decisión backend
  private estimatedSizeMB = 0;
  private entryCount = 0;

  constructor(config: Partial<CacheManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Inicializar backend localStorage por defecto
    this.geoCache = new GeoCache({
      maxSizeMB: this.config.maxSizeMB,
      defaultTTLDays: this.config.defaultTTLDays,
      enableCompression: this.config.enableCompression,
      evictionPolicy: this.config.evictionPolicy
    });
    
    // Inicializar métricas
    this.aggregatedMetrics = this.initMetrics();
    
    // Si preferimos IndexedDB, inicializar de inmediato
    if (this.config.preferIndexedDB) {
      this.initIndexedDB();
    }
  }

  /**
   * Inicializa métricas vacías
   */
  private initMetrics(): CacheMetrics {
    return {
      hitRate: 0,
      missRate: 0,
      avgHitLatency: 0,
      avgMissLatency: 0,
      totalEntries: 0,
      sizeBytes: 0,
      evictions: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * Inicializa IndexedDB de forma asíncrona
   */
  private async initIndexedDB(): Promise<void> {
    if (this.indexedDBCache) return;
    
    try {
      this.indexedDBCache = new IndexedDBCache({
        maxSizeMB: 50, // IndexedDB permite mucho más espacio
        defaultTTLDays: this.config.defaultTTLDays,
        enableCompression: this.config.enableCompression,
        dbName: 'ptel_geocache_idb',
        version: 1
      });
      
      await this.indexedDBCache.initialize();
      this.currentBackend = 'indexedDB';
      
      console.log('[CacheManager] IndexedDB initialized successfully');
    } catch (error) {
      console.error('[CacheManager] Failed to initialize IndexedDB:', error);
      console.warn('[CacheManager] Falling back to localStorage only');
      this.indexedDBCache = null;
      this.currentBackend = 'localStorage';
    }
  }

  /**
   * Inicializa el sistema de caché
   * Debe llamarse antes de usar get/set
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Calcular tamaño estimado actual en localStorage
      this.estimatedSizeMB = this.estimateLocalStorageSize();
      
      // Si superamos threshold, migrar a IndexedDB
      if (this.estimatedSizeMB >= this.config.indexedDBThresholdMB) {
        console.log(`[CacheManager] Size ${this.estimatedSizeMB.toFixed(2)}MB exceeds threshold, initializing IndexedDB`);
        await this.initIndexedDB();
      }
      
      this.isInitialized = true;
      console.log(`[CacheManager] Initialized with backend: ${this.currentBackend}`);
    } catch (error) {
      console.error('[CacheManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Estima tamaño actual de localStorage en MB
   */
  private estimateLocalStorageSize(): number {
    try {
      let totalSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('ptel_geocache_')) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      return totalSize / (1024 * 1024); // Convertir a MB
    } catch {
      return 0;
    }
  }

  /**
   * Recupera entrada del cache
   * Decide automáticamente qué backend usar
   */
  async get(
    name: string,
    municipio: string,
    tipo?: string
  ): Promise<CacheResult<CacheEntry>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = performance.now();
    
    try {
      // Intentar primero en backend actual
      let result: CacheResult<CacheEntry>;
      
      if (this.currentBackend === 'indexedDB' && this.indexedDBCache) {
        result = await this.indexedDBCache.get(name, municipio, tipo);
      } else {
        result = this.geoCache.get(name, municipio, tipo);
      }
      
      // Si no encontramos y tenemos ambos backends, buscar en el otro
      if (!result.hit && this.currentBackend === 'indexedDB' && this.geoCache) {
        result = this.geoCache.get(name, municipio, tipo);
        if (result.hit) {
          console.log('[CacheManager] Found in localStorage fallback');
        }
      }
      
      // Actualizar métricas agregadas
      this.updateAggregatedMetrics(result.hit, performance.now() - startTime);
      
      return result;
    } catch (error) {
      console.error('[CacheManager] Get operation failed:', error);
      return {
        hit: false,
        missReason: 'corrupted',
        latency: performance.now() - startTime
      };
    }
  }

  /**
   * Almacena entrada en el cache
   * Decide automáticamente qué backend usar
   */
  async set(
    name: string,
    municipio: string,
    entry: CacheEntry,
    options?: SetOptions
  ): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // ✅ GENERAR CLAVE CONSISTENTE con get()
      const tipo = entry.metadata?.tipo;
      const correctKey = generateCacheKey(name, municipio, tipo);
      
      // ✅ ASEGURAR que entry.key coincide con la clave generada
      const entryWithCorrectKey: CacheEntry = {
        ...entry,
        key: correctKey
      };
      
      // Estimar tamaño de la entrada
      const entrySize = this.estimateEntrySize(entryWithCorrectKey);
      this.estimatedSizeMB += entrySize;
      this.entryCount++;
      
      // Decidir si necesitamos cambiar de backend
      if (
        this.currentBackend === 'localStorage' && 
        this.estimatedSizeMB >= this.config.indexedDBThresholdMB
      ) {
        console.log(`[CacheManager] Threshold reached (${this.estimatedSizeMB.toFixed(2)}MB), migrating to IndexedDB`);
        await this.migrateToIndexedDB();
      }
      
      // Almacenar en el backend apropiado
      let success: boolean;
      
      if (this.currentBackend === 'indexedDB' && this.indexedDBCache) {
        // ✅ LLAMADA CORRECTA: solo entry y options
        success = await this.indexedDBCache.set(entryWithCorrectKey, options);
      } else {
        // ✅ LLAMADA CORRECTA: solo entry y options
        success = this.geoCache.set(entryWithCorrectKey, options);
      }
      
      return success;
    } catch (error) {
      console.error('[CacheManager] Set operation failed:', error);
      return false;
    }
  }

  /**
   * Estima tamaño de una entrada en MB
   */
  private estimateEntrySize(entry: CacheEntry): number {
    const jsonStr = JSON.stringify(entry);
    return jsonStr.length / (1024 * 1024);
  }

  /**
   * Migra datos de localStorage a IndexedDB
   */
  private async migrateToIndexedDB(): Promise<void> {
    try {
      // Inicializar IndexedDB si no existe
      if (!this.indexedDBCache) {
        await this.initIndexedDB();
      }
      
      if (!this.indexedDBCache) {
        console.warn('[CacheManager] Migration failed: IndexedDB not available');
        return;
      }
      
      // TODO: Implementar migración de datos existentes
      // Por ahora, simplemente cambiamos de backend
      // Las nuevas entradas irán a IndexedDB
      // Las viejas permanecen en localStorage como fallback
      
      this.currentBackend = 'indexedDB';
      console.log('[CacheManager] Migration to IndexedDB completed');
    } catch (error) {
      console.error('[CacheManager] Migration failed:', error);
    }
  }

  /**
   * Actualiza métricas agregadas
   */
  private updateAggregatedMetrics(hit: boolean, latency: number): void {
    const totalRequests = this.aggregatedMetrics.totalEntries + 1;
    const currentHits = this.aggregatedMetrics.hitRate * this.aggregatedMetrics.totalEntries;
    
    if (hit) {
      this.aggregatedMetrics.hitRate = (currentHits + 1) / totalRequests;
      this.aggregatedMetrics.avgHitLatency = 
        (this.aggregatedMetrics.avgHitLatency * currentHits + latency) / (currentHits + 1);
    } else {
      this.aggregatedMetrics.missRate = 1 - this.aggregatedMetrics.hitRate;
      const currentMisses = this.aggregatedMetrics.missRate * this.aggregatedMetrics.totalEntries;
      this.aggregatedMetrics.avgMissLatency =
        (this.aggregatedMetrics.avgMissLatency * currentMisses + latency) / (currentMisses + 1);
    }
    
    this.aggregatedMetrics.totalEntries = totalRequests;
    this.aggregatedMetrics.lastUpdated = Date.now();
  }

  /**
   * Obtiene métricas agregadas del sistema
   */
  getMetrics(): CacheMetrics {
    // Combinar métricas de ambos backends
    const localMetrics = this.geoCache.getMetrics();
    
    let combinedMetrics = { ...localMetrics };
    
    if (this.indexedDBCache) {
      const idbMetrics = this.indexedDBCache.getMetrics();
      
      // Promediar métricas de ambos backends
      combinedMetrics = {
        hitRate: (localMetrics.hitRate + idbMetrics.hitRate) / 2,
        missRate: (localMetrics.missRate + idbMetrics.missRate) / 2,
        avgHitLatency: (localMetrics.avgHitLatency + idbMetrics.avgHitLatency) / 2,
        avgMissLatency: (localMetrics.avgMissLatency + idbMetrics.avgMissLatency) / 2,
        totalEntries: localMetrics.totalEntries + idbMetrics.totalEntries,
        sizeBytes: localMetrics.sizeBytes + idbMetrics.sizeBytes,
        evictions: localMetrics.evictions + idbMetrics.evictions,
        lastUpdated: Math.max(localMetrics.lastUpdated, idbMetrics.lastUpdated)
      };
    }
    
    return combinedMetrics;
  }

  /**
   * Limpia todo el cache (ambos backends)
   */
  async clear(): Promise<void> {
    try {
      this.geoCache.clear();
      
      if (this.indexedDBCache) {
        await this.indexedDBCache.clear();
      }
      
      this.estimatedSizeMB = 0;
      this.entryCount = 0;
      this.aggregatedMetrics = this.initMetrics();
      
      console.log('[CacheManager] All caches cleared');
    } catch (error) {
      console.error('[CacheManager] Clear operation failed:', error);
    }
  }

  /**
   * Invalida entradas específicas por criterios
   */
  async invalidate(criteria: {
    municipio?: string;
    tipo?: string;
    olderThan?: number; // timestamp
  }): Promise<number> {
    let invalidatedCount = 0;
    
    try {
      // Invalidar en localStorage
      invalidatedCount += this.geoCache.invalidate(criteria);
      
      // Invalidar en IndexedDB
      if (this.indexedDBCache) {
        invalidatedCount += await this.indexedDBCache.invalidate(criteria);
      }
      
      console.log(`[CacheManager] Invalidated ${invalidatedCount} entries`);
      return invalidatedCount;
    } catch (error) {
      console.error('[CacheManager] Invalidation failed:', error);
      return invalidatedCount;
    }
  }

  /**
   * Obtiene información del backend actual
   */
  getBackendInfo(): {
    current: CacheBackend;
    hasIndexedDB: boolean;
    estimatedSizeMB: number;
    entryCount: number;
  } {
    return {
      current: this.currentBackend,
      hasIndexedDB: this.indexedDBCache !== null,
      estimatedSizeMB: this.estimatedSizeMB,
      entryCount: this.entryCount
    };
  }

  /**
   * Fuerza cambio de backend (para testing)
   */
  async forceBackend(backend: 'localStorage' | 'indexedDB'): Promise<void> {
    if (backend === 'indexedDB' && !this.indexedDBCache) {
      await this.initIndexedDB();
    }
    
    this.currentBackend = backend;
    console.log(`[CacheManager] Forced backend change to: ${backend}`);
  }
}

/**
 * Instancia singleton del CacheManager
 * Exportar para uso global en la aplicación
 */
export const cacheManager = new CacheManager();
