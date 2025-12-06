/**
 * LRUCache.test.ts - Tests para C.3 Cache LRU
 * 
 * @version 1.0.0
 * @date 2025-12-07
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import LRUCache, { generateCacheKey, geocodingCache } from '../lib/LRUCache';

// ============================================================================
// TESTS BÁSICOS
// ============================================================================

describe('LRUCache', () => {
  let cache: LRUCache<string>;
  
  beforeEach(() => {
    cache = new LRUCache<string>({ maxSize: 3, ttlMs: 0, name: 'TestCache' });
  });
  
  describe('Operaciones básicas', () => {
    it('set y get funcionan', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });
    
    it('get retorna undefined si no existe', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });
    
    it('has funciona correctamente', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });
    
    it('delete elimina entrada', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });
    
    it('clear limpia todo el cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
    });
    
    it('size retorna número correcto', () => {
      expect(cache.size).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
    });
  });
  
  describe('Evicción LRU', () => {
    it('evicta entrada más antigua cuando excede maxSize', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Debe evictar key1
      
      expect(cache.size).toBe(3);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });
    
    it('acceso actualiza orden LRU', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Acceder a key1 lo mueve al final (más reciente)
      cache.get('key1');
      
      // Ahora key2 es el más antiguo
      cache.set('key4', 'value4'); // Debe evictar key2, no key1
      
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
    });
    
    it('actualizar entrada existente la mueve al final', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Actualizar key1
      cache.set('key1', 'updated');
      
      // key2 ahora es más antiguo
      cache.set('key4', 'value4'); // Debe evictar key2
      
      expect(cache.get('key1')).toBe('updated');
      expect(cache.get('key2')).toBeUndefined();
    });
  });
  
  describe('TTL (Time To Live)', () => {
    it('entrada expira después de TTL', () => {
      vi.useFakeTimers();
      
      const ttlCache = new LRUCache<string>({ maxSize: 10, ttlMs: 1000 });
      ttlCache.set('key1', 'value1');
      
      expect(ttlCache.get('key1')).toBe('value1');
      
      // Avanzar tiempo más allá del TTL
      vi.advanceTimersByTime(1500);
      
      expect(ttlCache.get('key1')).toBeUndefined();
      
      vi.useRealTimers();
    });
    
    it('has retorna false si entrada expiró', () => {
      vi.useFakeTimers();
      
      const ttlCache = new LRUCache<string>({ maxSize: 10, ttlMs: 1000 });
      ttlCache.set('key1', 'value1');
      
      expect(ttlCache.has('key1')).toBe(true);
      
      vi.advanceTimersByTime(1500);
      
      expect(ttlCache.has('key1')).toBe(false);
      
      vi.useRealTimers();
    });
    
    it('cleanup elimina entradas expiradas', () => {
      vi.useFakeTimers();
      
      const ttlCache = new LRUCache<string>({ maxSize: 10, ttlMs: 1000 });
      ttlCache.set('key1', 'value1');
      ttlCache.set('key2', 'value2');
      
      vi.advanceTimersByTime(500);
      ttlCache.set('key3', 'value3'); // Esta no expira aún
      
      vi.advanceTimersByTime(700); // key1 y key2 expiran, key3 no
      
      const removed = ttlCache.cleanup();
      expect(removed).toBe(2);
      expect(ttlCache.size).toBe(1);
      expect(ttlCache.get('key3')).toBe('value3');
      
      vi.useRealTimers();
    });
    
    it('TTL=0 desactiva expiración', () => {
      vi.useFakeTimers();
      
      const noTtlCache = new LRUCache<string>({ maxSize: 10, ttlMs: 0 });
      noTtlCache.set('key1', 'value1');
      
      vi.advanceTimersByTime(999999999);
      
      expect(noTtlCache.get('key1')).toBe('value1');
      
      vi.useRealTimers();
    });
  });
  
  describe('Estadísticas', () => {
    it('cuenta hits y misses correctamente', () => {
      cache.set('key1', 'value1');
      
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key2'); // miss
      cache.get('key3'); // miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRatio).toBe(0.5);
    });
    
    it('cuenta evictions correctamente', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // eviction
      cache.set('key5', 'value5'); // eviction
      
      const stats = cache.getStats();
      expect(stats.evictions).toBe(2);
    });
    
    it('resetStats funciona', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('nonexistent');
      
      cache.resetStats();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
  
  describe('Serialización', () => {
    it('serialize y deserialize funcionan', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1'); // hit para stats
      
      const serialized = cache.serialize();
      const restored = LRUCache.deserialize(serialized);
      
      // Verificar que stats se restauraron (1 hit original)
      const statsBeforeAccess = restored.getStats();
      expect(statsBeforeAccess.hits).toBe(1);
      
      // Verificar que datos se restauraron
      expect(restored.get('key1')).toBe('value1');
      expect(restored.get('key2')).toBe('value2');
      
      // Ahora debería tener 3 hits (1 restaurado + 2 nuevos gets)
      expect(restored.getStats().hits).toBe(3);
    });
    
    it('deserialize filtra entradas expiradas', () => {
      vi.useFakeTimers();
      
      const ttlCache = new LRUCache<string>({ maxSize: 10, ttlMs: 1000 });
      ttlCache.set('key1', 'value1');
      
      vi.advanceTimersByTime(500);
      ttlCache.set('key2', 'value2');
      
      const serialized = ttlCache.serialize();
      
      vi.advanceTimersByTime(700); // key1 expira
      
      const restored = LRUCache.deserialize(serialized);
      expect(restored.has('key1')).toBe(false);
      expect(restored.has('key2')).toBe(true);
      
      vi.useRealTimers();
    });
  });
  
  describe('Iteradores', () => {
    it('entries itera sobre entradas', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const entries = Array.from(cache.entries());
      expect(entries).toHaveLength(2);
      expect(entries).toContainEqual(['key1', 'value1']);
      expect(entries).toContainEqual(['key2', 'value2']);
    });
    
    it('keys itera sobre claves', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const keys = Array.from(cache.keys());
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
    
    it('values itera sobre valores', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const values = Array.from(cache.values());
      expect(values).toContain('value1');
      expect(values).toContain('value2');
    });
    
    it('iteradores saltan entradas expiradas', () => {
      vi.useFakeTimers();
      
      const ttlCache = new LRUCache<string>({ maxSize: 10, ttlMs: 1000 });
      ttlCache.set('key1', 'value1');
      
      vi.advanceTimersByTime(500);
      ttlCache.set('key2', 'value2');
      
      vi.advanceTimersByTime(700); // key1 expira
      
      const entries = Array.from(ttlCache.entries());
      expect(entries).toHaveLength(1);
      expect(entries[0][0]).toBe('key2');
      
      vi.useRealTimers();
    });
  });
});

// ============================================================================
// TESTS generateCacheKey
// ============================================================================

describe('generateCacheKey', () => {
  it('genera clave con municipio', () => {
    const key = generateCacheKey({ municipio: 'Almería' });
    expect(key).toBe('almeria');
  });
  
  it('genera clave con múltiples parámetros', () => {
    const key = generateCacheKey({
      municipio: 'Almería',
      tipo: 'SALUD',
      nombre: 'Centro de Salud',
    });
    expect(key).toBe('almeria|salud|centro-de-salud');
  });
  
  it('normaliza acentos', () => {
    const key = generateCacheKey({ municipio: 'Vélez-Málaga' });
    expect(key).toBe('velez-malaga');
  });
  
  it('normaliza caracteres especiales', () => {
    const key = generateCacheKey({ nombre: 'C.E.I.P. "San José"' });
    expect(key).toBe('c-e-i-p-san-jose');
  });
  
  it('limita longitud', () => {
    const longName = 'A'.repeat(100);
    const key = generateCacheKey({ nombre: longName });
    expect(key.length).toBeLessThanOrEqual(50);
  });
  
  it('maneja parámetros vacíos', () => {
    const key = generateCacheKey({});
    expect(key).toBe('');
  });
});

// ============================================================================
// TESTS geocodingCache global
// ============================================================================

describe('geocodingCache (instancia global)', () => {
  beforeEach(() => {
    geocodingCache.clear();
    geocodingCache.resetStats();
  });
  
  it('existe y es usable', () => {
    expect(geocodingCache).toBeInstanceOf(LRUCache);
  });
  
  it('tiene configuración apropiada', () => {
    const stats = geocodingCache.getStats();
    expect(stats.name).toBe('GeocodingCache');
    expect(stats.maxSize).toBe(2000);
  });
  
  it('puede almacenar resultados de geocodificación', () => {
    const mockResult = {
      x: 504750.92,
      y: 4076367.12,
      municipio: 'Almería',
      confianza: 'ALTA',
    };
    
    geocodingCache.set('almeria|salud|centro', mockResult);
    expect(geocodingCache.get('almeria|salud|centro')).toEqual(mockResult);
  });
});

// ============================================================================
// TESTS de rendimiento (smoke tests)
// ============================================================================

describe('Rendimiento', () => {
  it('soporta 10000 operaciones sin degradación', () => {
    const largeCache = new LRUCache<number>({ maxSize: 5000, ttlMs: 0 });
    
    const start = performance.now();
    
    for (let i = 0; i < 10000; i++) {
      largeCache.set(`key-${i}`, i);
    }
    
    for (let i = 0; i < 10000; i++) {
      largeCache.get(`key-${i % 5000}`);
    }
    
    const elapsed = performance.now() - start;
    
    // Debe completar en menos de 100ms
    expect(elapsed).toBeLessThan(100);
    expect(largeCache.size).toBe(5000);
  });
});
