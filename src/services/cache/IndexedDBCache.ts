/**
 * IndexedDBCache - Sistema de caché IndexedDB para datasets grandes (>5MB)
 * Fase 2 PTEL: Cache persistente con capacidad 50-100MB
 * 
 * Características:
 * - Almacenamiento persistente navegador
 * - Capacidad 50-100MB por municipio
 * - Compresión LZ-string opcional
 * - Queries by municipio para batch processing
 * - Indexación optimizada
 */

import Dexie, { type EntityTable } from 'dexie';
import type { CacheEntry, CacheMetrics, CacheResult } from './types';

/**
 * Interfaz de entrada para IndexedDB
 */
interface IndexedDBEntry extends CacheEntry {
  id?: number;
  municipio: string;
  tipo: string;
}

/**
 * Configuración IndexedDB
 */
interface IndexedDBConfig {
  maxSizeMB: number;
  defaultTTLDays: number;
  enableCompression: boolean;
  dbName: string;
  version: number;
}

/**
 * Configuración por defecto
 */
const DEFAULT_CONFIG: IndexedDBConfig = {
  maxSizeMB: 50,
  defaultTTLDays: 90,
  enableCompression: false,
  dbName: 'ptel_geocache_idb',
  version: 1
};

/**
 * Sistema de caché IndexedDB con Dexie.js
 */
export class IndexedDBCache extends Dexie {
  geocodes!: EntityTable<IndexedDBEntry, 'id'>;
  metadata!: EntityTable<
    {
      id: string;
      version: number;
      lastUpdate: number;
      totalSize: number;
      totalEntries: number;
    },
    'id'
  >;

  private config: IndexedDBConfig;
  private metrics: CacheMetrics;

  constructor(config: Partial<IndexedDBConfig> = {}) {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    
    super(fullConfig.dbName);
    this.config = fullConfig;
    this.metrics = this.initMetrics();

    // Definir schema
    this.version(fullConfig.version).stores({
      geocodes: '++id, &key, municipio, tipo, timestamp, [municipio+tipo]',
      metadata: '&id'
    });
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
   * Inicializa la base de datos
   */
  async initialize(): Promise<void> {
    try {
      await this.open();
      await this.loadMetrics();
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Carga métricas desde metadata
   */
  private async loadMetrics(): Promise<void> {
    try {
      const meta = await this.metadata.get('metrics');
      if (meta) {
        const totalEntries = await this.geocodes.count();
        this.metrics = {
          hitRate: 0,
          missRate: 0,
          avgHitLatency: 0,
          avgMissLatency: 0,
          totalEntries,
          sizeBytes: meta.totalSize,
          evictions: 0,
          lastUpdated: meta.lastUpdate
        };
      }
    } catch (error) {
      console.warn('Failed to load IndexedDB metrics:', error);
    }
  }

  /**
   * Guarda métricas en metadata
   */
  private async saveMetrics(): Promise<void> {
    try {
      await this.metadata.put({
        id: 'metrics',
        version: this.config.version,
        lastUpdate: Date.now(),
        totalSize: this.metrics.sizeBytes,
        totalEntries: this.metrics.totalEntries
      });
    } catch (error) {
      console.warn('Failed to save IndexedDB metrics:', error);
    }
  }

  /**
   * Recupera entrada del cache
   */
  async get(
    name: string,
    municipio: string,
    tipo?: string
  ): Promise<CacheResult<CacheEntry>> {
    const startTime = performance.now();
    const key = this.generateKey(name, municipio, tipo);

    try {
      const entry = await this.geocodes.where('key').equals(key).first();

      if (!entry) {
        const latency = performance.now() - startTime;
        this.updateMetrics(false, latency);
        return {
          hit: false,
          missReason: 'not_found',
          latency
        };
      }

      // Verificar TTL
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        // Expirado - eliminar
        await this.geocodes.where('key').equals(key).delete();
        
        const latency = performance.now() - startTime;
        this.updateMetrics(false, latency);
        return {
          hit: false,
          missReason: 'expired',
          latency
        };
      }

      // Hit - retornar
      const latency = performance.now() - startTime;
      this.updateMetrics(true, latency);

      return {
        hit: true,
        data: entry,
        latency
      };
    } catch (error) {
      console.error('IndexedDB get error:', error);
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
   */
  async set(
    entry: Omit<IndexedDBEntry, 'id'>,
    options: { force?: boolean; ttl?: number } = {}
  ): Promise<boolean> {
    try {
      const key = entry.key;
      
      // Verificar si ya existe
      const existing = await this.geocodes.where('key').equals(key).first();
      if (existing && !options.force) {
        return false;
      }

      // Aplicar TTL
      const ttlMs = options.ttl || (this.config.defaultTTLDays * 24 * 60 * 60 * 1000);
      const entryToStore: Omit<IndexedDBEntry, 'id'> = {
        ...entry,
        ttl: ttlMs,
        timestamp: Date.now()
      };

      // Verificar espacio
      const sizeBytes = JSON.stringify(entryToStore).length * 2; // Aproximado UTF-16
      if (!(await this.ensureSpace(sizeBytes))) {
        console.warn('IndexedDB full, could not evict enough space');
        return false;
      }

      // Guardar o actualizar
      if (existing) {
        await this.geocodes.update(existing.id!, entryToStore);
      } else {
        await this.geocodes.add(entryToStore as IndexedDBEntry);
        this.metrics.totalEntries++;
      }

      this.metrics.sizeBytes += sizeBytes;
      await this.saveMetrics();

      return true;
    } catch (error) {
      console.error('IndexedDB set error:', error);
      return false;
    }
  }

  /**
   * Asegura espacio suficiente
   */
  private async ensureSpace(requiredBytes: number): Promise<boolean> {
    const maxBytes = this.config.maxSizeMB * 1024 * 1024;
    const currentSize = await this.getCurrentSize();

    if (currentSize + requiredBytes <= maxBytes) {
      return true;
    }

    // Evicción LRU: eliminar entradas más antiguas
    const targetSize = maxBytes * 0.8;
    const toRemove = currentSize - targetSize;
    
    const oldestEntries = await this.geocodes
      .orderBy('timestamp')
      .limit(Math.ceil(toRemove / 1024)) // Aproximado 1KB por entrada
      .toArray();

    for (const entry of oldestEntries) {
      if (entry.id) {
        await this.geocodes.delete(entry.id);
        this.metrics.evictions++;
      }
    }

    return true;
  }

  /**
   * Calcula tamaño actual aproximado
   */
  private async getCurrentSize(): Promise<number> {
    const entries = await this.geocodes.toArray();
    return entries.reduce((acc, entry) => {
      return acc + JSON.stringify(entry).length * 2;
    }, 0);
  }

  /**
   * Invalida entrada por key
   */
  async invalidate(key: string): Promise<void>;
  
  /**
   * Invalida entradas por criterios
   */
  async invalidate(criteria: {
    municipio?: string;
    tipo?: string;
    olderThan?: number;
  }): Promise<number>;
  
  /**
   * Implementación de invalidate con sobrecarga
   */
  async invalidate(
    keyOrCriteria: string | { municipio?: string; tipo?: string; olderThan?: number }
  ): Promise<void | number> {
    // Si es string, invalidar por key
    if (typeof keyOrCriteria === 'string') {
      await this.geocodes.where('key').equals(keyOrCriteria).delete();
      this.metrics.totalEntries = Math.max(0, this.metrics.totalEntries - 1);
      await this.saveMetrics();
      return;
    }
    
    // Si es objeto de criterios, invalidar múltiples
    const criteria = keyOrCriteria;
    let invalidatedCount = 0;
    
    try {
      let query = this.geocodes.toCollection();
      
      // Filtrar por municipio
      if (criteria.municipio) {
        query = this.geocodes.where('municipio').equals(criteria.municipio.toLowerCase());
      }
      
      // Filtrar por tipo
      if (criteria.tipo && criteria.municipio) {
        query = this.geocodes
          .where('[municipio+tipo]')
          .equals([criteria.municipio.toLowerCase(), criteria.tipo.toLowerCase()]);
      } else if (criteria.tipo) {
        query = this.geocodes.where('tipo').equals(criteria.tipo.toLowerCase());
      }
      
      // Filtrar por fecha si se proporciona
      if (criteria.olderThan) {
        const entries = await query.toArray();
        const toDelete = entries.filter(e => e.timestamp < criteria.olderThan!);
        
        for (const entry of toDelete) {
          if (entry.key) {
            await this.geocodes.where('key').equals(entry.key).delete();
            invalidatedCount++;
          }
        }
      } else {
        // Si no hay criterio de fecha, borrar todos los que coincidan
        invalidatedCount = await query.delete();
      }
      
      this.metrics.totalEntries = await this.geocodes.count();
      await this.saveMetrics();
      
      return invalidatedCount;
    } catch (error) {
      console.error('Invalidation by criteria failed:', error);
      return invalidatedCount;
    }
  }

  /**
   * Limpia cache por municipio
   */
  async clearByMunicipio(municipio: string): Promise<void> {
    await this.geocodes.where('municipio').equals(municipio).delete();
    this.metrics.totalEntries = await this.geocodes.count();
    await this.saveMetrics();
  }

  /**
   * Limpia cache por tipo
   */
  async clearByTipo(tipo: string): Promise<void> {
    await this.geocodes.where('tipo').equals(tipo).delete();
    this.metrics.totalEntries = await this.geocodes.count();
    await this.saveMetrics();
  }

  /**
   * Limpia todo el cache
   */
  async clear(): Promise<void> {
    await this.geocodes.clear();
    this.metrics = this.initMetrics();
    await this.saveMetrics();
  }

  /**
   * Genera key única para cache
   */
  private generateKey(name: string, municipio: string, tipo?: string): string {
    const normalized = name.toLowerCase().trim();
    const parts = [normalized, municipio.toLowerCase()];
    if (tipo) parts.push(tipo.toLowerCase());
    return parts.join('_');
  }

  /**
   * Actualiza métricas
   */
  private updateMetrics(isHit: boolean, latency: number): void {
    const totalRequests = (this.metrics.hitRate + this.metrics.missRate) * 100 || 1;
    
    if (isHit) {
      const currentHits = this.metrics.hitRate * totalRequests;
      this.metrics.hitRate = (currentHits + 1) / (totalRequests + 1);
      this.metrics.avgHitLatency = 
        (this.metrics.avgHitLatency * currentHits + latency) / (currentHits + 1);
    } else {
      const currentMisses = this.metrics.missRate * totalRequests;
      this.metrics.missRate = (currentMisses + 1) / (totalRequests + 1);
      this.metrics.avgMissLatency = 
        (this.metrics.avgMissLatency * currentMisses + latency) / (currentMisses + 1);
    }
    
    this.metrics.lastUpdated = Date.now();
  }

  /**
   * Obtiene métricas actuales
   */
  async getMetrics(): Promise<CacheMetrics> {
    const totalEntries = await this.geocodes.count();
    const sizeBytes = await this.getCurrentSize();
    
    return {
      ...this.metrics,
      totalEntries,
      sizeBytes
    };
  }

  /**
   * Query batch por municipio (para procesamiento masivo)
   */
  async getByMunicipio(municipio: string): Promise<IndexedDBEntry[]> {
    return this.geocodes
      .where('municipio')
      .equals(municipio.toLowerCase())
      .toArray();
  }

  /**
   * Query batch por municipio + tipo
   */
  async getByMunicipioAndTipo(
    municipio: string,
    tipo: string
  ): Promise<IndexedDBEntry[]> {
    return this.geocodes
      .where('[municipio+tipo]')
      .equals([municipio.toLowerCase(), tipo.toLowerCase()])
      .toArray();
  }
}
