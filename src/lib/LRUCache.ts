/**
 * LRUCache.ts - C.3 Cache LRU para Geocodificación
 * 
 * Implementación de cache Least Recently Used (LRU) optimizado
 * para operaciones de geocodificación en PTEL Andalucía.
 * 
 * CARACTERÍSTICAS:
 * - Límite de tamaño configurable (evita memory leaks)
 * - Evicción automática de entradas menos usadas
 * - TTL (Time To Live) opcional por entrada
 * - Estadísticas de hit/miss para debugging
 * - Serializable para persistencia en IndexedDB
 * 
 * USO TÍPICO:
 * - Cachear resultados de geocodificación (~5KB por entrada)
 * - Reducir llamadas repetidas a APIs externas (CartoCiudad, CDAU)
 * - Acelerar procesamiento batch de documentos PTEL
 * 
 * RENDIMIENTO:
 * - Get: O(1) con Map
 * - Set: O(1) amortizado
 * - Evicción: O(1) con lista doblemente enlazada
 * 
 * @version 1.0.0
 * @date 2025-12-07
 * @see F014 CacheManager, C.3 Cache LRU
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface CacheOptions {
  /** Número máximo de entradas (default: 1000) */
  maxSize?: number;
  /** TTL en milisegundos (default: 1 hora, 0 = sin expiración) */
  ttlMs?: number;
  /** Nombre del cache para debugging */
  name?: string;
}

export interface CacheStats {
  /** Nombre del cache */
  name: string;
  /** Número de entradas actuales */
  size: number;
  /** Tamaño máximo permitido */
  maxSize: number;
  /** Aciertos de cache */
  hits: number;
  /** Fallos de cache */
  misses: number;
  /** Ratio de aciertos (0-1) */
  hitRatio: number;
  /** Eviciones por límite de tamaño */
  evictions: number;
  /** Expiraciones por TTL */
  expirations: number;
}

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  lastAccess: number;
}

export interface SerializedCache<T> {
  name: string;
  maxSize: number;
  ttlMs: number;
  entries: Array<[string, CacheEntry<T>]>;
  stats: {
    hits: number;
    misses: number;
    evictions: number;
    expirations: number;
  };
}

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================

/**
 * Cache LRU genérico con TTL opcional
 * 
 * @template T - Tipo de valor almacenado
 * 
 * @example
 * const cache = new LRUCache<GeocodingResult>({ maxSize: 500, ttlMs: 3600000 });
 * cache.set('almeria-centro-salud', result);
 * const cached = cache.get('almeria-centro-salud');
 */
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private readonly name: string;
  
  // Estadísticas
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;
  private expirations: number = 0;
  
  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.ttlMs = options.ttlMs ?? 3600000; // 1 hora default
    this.name = options.name ?? 'LRUCache';
    this.cache = new Map();
  }
  
  /**
   * Obtiene un valor del cache
   * 
   * @param key - Clave a buscar
   * @returns Valor si existe y no ha expirado, undefined si no
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }
    
    // Verificar TTL
    if (this.ttlMs > 0 && Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      this.expirations++;
      this.misses++;
      return undefined;
    }
    
    // Actualizar acceso (mover al final del Map = más reciente)
    entry.lastAccess = Date.now();
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.hits++;
    return entry.value;
  }
  
  /**
   * Almacena un valor en el cache
   * 
   * @param key - Clave única
   * @param value - Valor a almacenar
   */
  set(key: string, value: T): void {
    // Si ya existe, eliminar primero (para reordenar)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Evicción si excede tamaño máximo
    while (this.cache.size >= this.maxSize) {
      // Map mantiene orden de inserción, el primero es el más antiguo
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.evictions++;
      }
    }
    
    // Insertar nueva entrada
    const now = Date.now();
    this.cache.set(key, {
      value,
      createdAt: now,
      lastAccess: now,
    });
  }
  
  /**
   * Verifica si una clave existe en el cache (sin actualizar acceso)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Verificar TTL sin eliminar
    if (this.ttlMs > 0 && Date.now() - entry.createdAt > this.ttlMs) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Elimina una entrada del cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Limpia todo el cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Obtiene el número de entradas actuales
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Obtiene estadísticas del cache
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      name: this.name,
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? this.hits / total : 0,
      evictions: this.evictions,
      expirations: this.expirations,
    };
  }
  
  /**
   * Resetea las estadísticas
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expirations = 0;
  }
  
  /**
   * Limpia entradas expiradas manualmente
   * 
   * @returns Número de entradas eliminadas
   */
  cleanup(): number {
    if (this.ttlMs === 0) return 0;
    
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > this.ttlMs) {
        this.cache.delete(key);
        this.expirations++;
        removed++;
      }
    }
    
    return removed;
  }
  
  /**
   * Serializa el cache para persistencia
   */
  serialize(): SerializedCache<T> {
    return {
      name: this.name,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      entries: Array.from(this.cache.entries()),
      stats: {
        hits: this.hits,
        misses: this.misses,
        evictions: this.evictions,
        expirations: this.expirations,
      },
    };
  }
  
  /**
   * Restaura el cache desde datos serializados
   */
  static deserialize<T>(data: SerializedCache<T>): LRUCache<T> {
    const cache = new LRUCache<T>({
      maxSize: data.maxSize,
      ttlMs: data.ttlMs,
      name: data.name,
    });
    
    // Restaurar entradas (filtrar expiradas)
    const now = Date.now();
    for (const [key, entry] of data.entries) {
      if (data.ttlMs === 0 || now - entry.createdAt <= data.ttlMs) {
        cache.cache.set(key, entry);
      }
    }
    
    // Restaurar stats
    cache.hits = data.stats.hits;
    cache.misses = data.stats.misses;
    cache.evictions = data.stats.evictions;
    cache.expirations = data.stats.expirations;
    
    return cache;
  }
  
  /**
   * Itera sobre las entradas del cache
   */
  *entries(): IterableIterator<[string, T]> {
    for (const [key, entry] of this.cache.entries()) {
      // Saltar expiradas
      if (this.ttlMs > 0 && Date.now() - entry.createdAt > this.ttlMs) {
        continue;
      }
      yield [key, entry.value];
    }
  }
  
  /**
   * Itera sobre las claves del cache
   */
  *keys(): IterableIterator<string> {
    for (const [key] of this.entries()) {
      yield key;
    }
  }
  
  /**
   * Itera sobre los valores del cache
   */
  *values(): IterableIterator<T> {
    for (const [, value] of this.entries()) {
      yield value;
    }
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Genera clave de cache normalizada para geocodificación
 * 
 * @param params - Parámetros de búsqueda
 * @returns Clave única normalizada
 * 
 * @example
 * generateCacheKey({ municipio: 'Almería', nombre: 'Centro Salud' })
 * // => "almeria|centro-salud"
 */
export function generateCacheKey(params: {
  municipio?: string;
  nombre?: string;
  tipo?: string;
  direccion?: string;
}): string {
  const parts: string[] = [];
  
  if (params.municipio) {
    parts.push(normalizeForKey(params.municipio));
  }
  if (params.tipo) {
    parts.push(normalizeForKey(params.tipo));
  }
  if (params.nombre) {
    parts.push(normalizeForKey(params.nombre));
  }
  if (params.direccion) {
    parts.push(normalizeForKey(params.direccion));
  }
  
  return parts.join('|');
}

/**
 * Normaliza string para usar como parte de clave de cache
 */
function normalizeForKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-')     // Reemplazar no-alfanuméricos
    .replace(/^-|-$/g, '')           // Eliminar guiones extremos
    .substring(0, 50);               // Limitar longitud
}

// ============================================================================
// INSTANCIA GLOBAL PARA GEOCODIFICACIÓN
// ============================================================================

/**
 * Cache global para resultados de geocodificación
 * 
 * Configuración optimizada para PTEL:
 * - maxSize: 2000 entradas (~10MB memoria estimada)
 * - ttlMs: 4 horas (datos geográficos cambian poco)
 */
export const geocodingCache = new LRUCache<unknown>({
  maxSize: 2000,
  ttlMs: 4 * 60 * 60 * 1000, // 4 horas
  name: 'GeocodingCache',
});

// ============================================================================
// EXPORTS
// ============================================================================

export default LRUCache;
