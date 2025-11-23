/**
 * GeoCache - Sistema de caché localStorage para geocodificación
 * Fase 2 PTEL: Cache inteligente con LRU eviction y TTL
 */

import type { CacheEntry, CacheConfig, CacheMetrics, CacheResult, SetOptions } from './types';
import { generateCacheKey } from './utils/hashGenerator';
import { LRUEvictionManager } from './utils/lruEviction';

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG: CacheConfig = {
  maxSizeMB: 5,
  defaultTTLDays: 90,
  enableCompression: false,
  evictionPolicy: 'lru'
};

/**
 * Prefijo para keys en localStorage
 */
const STORAGE_PREFIX = 'ptel_geocache_';
const METRICS_KEY = `${STORAGE_PREFIX}metrics`;

/**
 * Sistema de caché localStorage con gestión inteligente
 */
export class GeoCache {
  private config: CacheConfig;
  private lruManager: LRUEvictionManager;
  private metrics: CacheMetrics;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.lruManager = new LRUEvictionManager();
    this.metrics = this.loadMetrics() || this.initMetrics();
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
   * Carga métricas desde localStorage
   */
  private loadMetrics(): CacheMetrics | null {
    try {
      const stored = localStorage.getItem(METRICS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Guarda métricas en localStorage
   */
  private saveMetrics(): void {
    try {
      localStorage.setItem(METRICS_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save cache metrics:', error);
    }
  }

  /**
   * Recupera entrada del cache
   * @param name - Nombre infraestructura
   * @param municipio - Municipio
   * @param tipo - Tipo infraestructura
   * @returns Resultado con datos si hit, undefined si miss
   */
  public get(
    name: string,
    municipio: string,
    tipo?: string
  ): CacheResult<CacheEntry> {
    const startTime = performance.now();
    const key = generateCacheKey(name, municipio, tipo);
    const storageKey = `${STORAGE_PREFIX}${key}`;

    try {
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        const latency = performance.now() - startTime;
        this.updateMetrics(false, latency);
        return {
          hit: false,
          missReason: 'not_found',
          latency
        };
      }

      const entry: CacheEntry = JSON.parse(stored);
      
      // Verificar TTL
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        // Expirado - eliminar
        localStorage.removeItem(storageKey);
        this.lruManager.removeKey(key);
        
        const latency = performance.now() - startTime;
        this.updateMetrics(false, latency);
        return {
          hit: false,
          missReason: 'expired',
          latency
        };
      }

      // Hit - actualizar LRU y retornar
      this.lruManager.recordAccess(key);
      const latency = performance.now() - startTime;
      this.updateMetrics(true, latency);

      return {
        hit: true,
        data: entry,
        latency
      };

    } catch (error) {
      console.error('Cache get error:', error);
      const latency = performance.now() - startTime;
      this.updateMetrics(false, latency);
      return {
        hit: false,
        missReason: 'corrupted',
        latency
      };
    }
  }

  /**
   * Guarda entrada en el cache
   * @param entry - Entrada a guardar
   * @param options - Opciones de guardado
   * @returns true si se guardó exitosamente
   */
  public set(entry: CacheEntry, options: SetOptions = {}): boolean {
    try {
      const storageKey = `${STORAGE_PREFIX}${entry.key}`;
      
      // Verificar si ya existe y no es force
      if (!options.force && localStorage.getItem(storageKey)) {
        return false;
      }

      // Aplicar TTL personalizado o default
      const ttlMs = options.ttl || (this.config.defaultTTLDays * 24 * 60 * 60 * 1000);
      const entryToStore: CacheEntry = {
        ...entry,
        ttl: ttlMs,
        timestamp: Date.now()
      };

      // Verificar espacio disponible antes de guardar
      const serialized = JSON.stringify(entryToStore);
      const sizeBytes = new Blob([serialized]).size;
      
      if (!this.ensureSpace(sizeBytes)) {
        console.warn('Cache full, could not evict enough space');
        return false;
      }

      // Guardar
      localStorage.setItem(storageKey, serialized);
      this.lruManager.recordAccess(entry.key);
      
      // Actualizar métricas
      this.metrics.totalEntries++;
      this.metrics.sizeBytes += sizeBytes;
      this.saveMetrics();

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Asegura que hay espacio suficiente, evictando si es necesario
   * @param requiredBytes - Bytes necesarios
   * @returns true si hay espacio disponible
   */
  private ensureSpace(requiredBytes: number): boolean {
    const maxBytes = this.config.maxSizeMB * 1024 * 1024;
    const currentSize = this.getCurrentSize();
    
    if (currentSize + requiredBytes <= maxBytes) {
      return true;
    }

    // Necesitamos hacer evicción
    const targetSize = maxBytes * 0.8; // Liberar al 80%
    const entries = this.getAllEntries();
    
    const keysToEvict = this.lruManager.getKeysToEvict(
      entries.length,
      Math.floor(entries.length * 0.7) // Mantener 70%
    );

    for (const key of keysToEvict) {
      this.invalidate(key);
      this.metrics.evictions++;
    }

    return this.getCurrentSize() + requiredBytes <= maxBytes;
  }

  /**
   * Obtiene tamaño actual del cache en bytes
   */
  private getCurrentSize(): number {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          total += new Blob([value]).size;
        }
      }
    }
    return total;
  }

  /**
   * Obtiene todas las entradas del cache
   */
  private getAllEntries(): string[] {
    const entries: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX) && key !== METRICS_KEY) {
        entries.push(key.replace(STORAGE_PREFIX, ''));
      }
    }
    return entries;
  }

  /**
   * Invalida una entrada del cache
   * @param key - Key a invalidar
   */
  public invalidate(key: string): void {
    const storageKey = `${STORAGE_PREFIX}${key}`;
    localStorage.removeItem(storageKey);
    this.lruManager.removeKey(key);
    this.metrics.totalEntries = Math.max(0, this.metrics.totalEntries - 1);
    this.saveMetrics();
  }

  /**
   * Limpia todo el cache
   */
  public clear(): void {
    const entries = this.getAllEntries();
    for (const key of entries) {
      this.invalidate(key);
    }
    this.lruManager.clear();
    this.metrics = this.initMetrics();
    this.saveMetrics();
  }

  /**
   * Actualiza métricas de rendimiento
   */
  private updateMetrics(isHit: boolean, latency: number): void {
    const totalRequests = (this.metrics.hitRate + this.metrics.missRate) * 100 || 1;
    
    if (isHit) {
      const currentHits = this.metrics.hitRate * totalRequests;
      const currentAvgLatency = this.metrics.avgHitLatency;
      
      this.metrics.hitRate = (currentHits + 1) / (totalRequests + 1);
      this.metrics.avgHitLatency = 
        (currentAvgLatency * currentHits + latency) / (currentHits + 1);
    } else {
      const currentMisses = this.metrics.missRate * totalRequests;
      const currentAvgLatency = this.metrics.avgMissLatency;
      
      this.metrics.missRate = (currentMisses + 1) / (totalRequests + 1);
      this.metrics.avgMissLatency = 
        (currentAvgLatency * currentMisses + latency) / (currentMisses + 1);
    }
    
    this.metrics.lastUpdated = Date.now();
    
    // Guardar métricas cada 10 operaciones para no sobrecargar localStorage
    if (totalRequests % 10 === 0) {
      this.saveMetrics();
    }
  }

  /**
   * Obtiene métricas actuales del cache
   */
  public getMetrics(): CacheMetrics {
    return {
      ...this.metrics,
      totalEntries: this.getAllEntries().length,
      sizeBytes: this.getCurrentSize()
    };
  }

  /**
   * Obtiene configuración actual
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }
}
