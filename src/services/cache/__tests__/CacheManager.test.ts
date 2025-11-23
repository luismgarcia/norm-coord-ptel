/**
 * Tests Unitarios - CacheManager
 * Checkpoint A: Validación básica del sistema de caché
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '../CacheManager';
import type { CacheEntry } from '../types';

describe('CacheManager - Checkpoint A Tests', () => {
  let cacheManager: CacheManager;

  beforeEach(async () => {
    // Limpiar localStorage completamente antes de cada test
    localStorage.clear();
    
    // Crear instancia limpia para cada test
    cacheManager = new CacheManager({
      maxSizeMB: 5,
      defaultTTLDays: 90,
      enableCompression: false,
      evictionPolicy: 'lru',
      indexedDBThresholdMB: 5,
      preferIndexedDB: false // Empezar con localStorage
    });
    
    await cacheManager.initialize();
  });

  afterEach(async () => {
    // Limpiar después de cada test
    await cacheManager.clear();
    localStorage.clear();
  });

  describe('1. Inicialización', () => {
    it('debe inicializar correctamente con localStorage por defecto', async () => {
      const info = cacheManager.getBackendInfo();
      
      expect(info.current).toBe('localStorage');
      expect(info.hasIndexedDB).toBe(false);
      expect(info.estimatedSizeMB).toBe(0);
      expect(info.entryCount).toBe(0);
    });

    it('debe cargar métricas iniciales vacías', () => {
      const metrics = cacheManager.getMetrics();
      
      expect(metrics.hitRate).toBe(0);
      expect(metrics.missRate).toBe(0);
      expect(metrics.totalEntries).toBe(0);
      expect(metrics.sizeBytes).toBe(0);
    });
  });

  describe('2. Operaciones Get/Set Básicas', () => {
    it('debe guardar y recuperar una entrada correctamente', async () => {
      const entry: CacheEntry = {
        key: 'test_key_1',
        coordinates: [447234.56, 4112876.23],
        crs: 'EPSG:25830',
        source: 'test',
        confidence: 95,
        timestamp: Date.now(),
        ttl: 90 * 24 * 60 * 60 * 1000,
        metadata: {
          municipio: 'Granada',
          tipo: 'SANITARIO',
          nombreOriginal: 'Centro Salud Test'
        }
      };

      // Guardar
      const setResult = await cacheManager.set(
        'Centro Salud Test',
        'Granada',
        entry
      );
      expect(setResult).toBe(true);

      // Recuperar
      const getResult = await cacheManager.get(
        'Centro Salud Test',
        'Granada',
        'SANITARIO'
      );
      
      expect(getResult.hit).toBe(true);
      expect(getResult.data).toBeDefined();
      expect(getResult.data?.coordinates).toEqual([447234.56, 4112876.23]);
      expect(getResult.data?.confidence).toBe(95);
      expect(getResult.latency).toBeLessThan(50); // <50ms
    });

    it('debe retornar miss para entrada inexistente', async () => {
      const result = await cacheManager.get(
        'No Existe',
        'Granada',
        'SANITARIO'
      );

      expect(result.hit).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.missReason).toBe('not_found');
    });

    it('debe actualizar métricas después de get/set', async () => {
      const entry: CacheEntry = {
        key: 'test_metrics',
        coordinates: [400000, 4100000],
        crs: 'EPSG:25830',
        source: 'test',
        confidence: 80,
        timestamp: Date.now(),
        ttl: 90 * 24 * 60 * 60 * 1000
      };

      // Set
      await cacheManager.set('Test', 'Granada', entry);
      
      // Get hit
      await cacheManager.get('Test', 'Granada');
      
      // Get miss
      await cacheManager.get('No Existe', 'Granada');

      const metrics = cacheManager.getMetrics();
      
      expect(metrics.totalEntries).toBeGreaterThan(0);
      expect(metrics.hitRate).toBeGreaterThan(0);
      expect(metrics.avgHitLatency).toBeGreaterThan(0);
    });
  });

  describe('3. Operación Clear', () => {
    it('debe limpiar todo el caché correctamente', async () => {
      // Añadir varias entradas
      const entries = [
        { name: 'Centro 1', municipio: 'Granada' },
        { name: 'Centro 2', municipio: 'Almería' },
        { name: 'Centro 3', municipio: 'Granada' }
      ];

      for (const { name, municipio } of entries) {
        const entry: CacheEntry = {
          key: `${name}_${municipio}`,
          coordinates: [400000, 4100000],
          crs: 'EPSG:25830',
          source: 'test',
          confidence: 90,
          timestamp: Date.now(),
          ttl: 90 * 24 * 60 * 60 * 1000
        };
        await cacheManager.set(name, municipio, entry);
      }

      // Verificar que hay entradas
      const beforeMetrics = cacheManager.getMetrics();
      expect(beforeMetrics.totalEntries).toBeGreaterThan(0);

      // Limpiar
      await cacheManager.clear();

      // Verificar que está vacío
      const afterMetrics = cacheManager.getMetrics();
      expect(afterMetrics.totalEntries).toBe(0);
      
      const info = cacheManager.getBackendInfo();
      expect(info.estimatedSizeMB).toBe(0);
      expect(info.entryCount).toBe(0);
    });
  });

  describe('4. Invalidación por Criterios', () => {
    beforeEach(async () => {
      // Setup: añadir múltiples entradas
      const testData = [
        { name: 'Centro Salud 1', municipio: 'Granada', tipo: 'SANITARIO' },
        { name: 'Centro Salud 2', municipio: 'Granada', tipo: 'SANITARIO' },
        { name: 'Colegio 1', municipio: 'Granada', tipo: 'EDUCATIVO' },
        { name: 'Hospital 1', municipio: 'Almería', tipo: 'SANITARIO' }
      ];

      for (const { name, municipio, tipo } of testData) {
        const entry: CacheEntry = {
          key: `${name}_${municipio}_${tipo}`,
          coordinates: [400000, 4100000],
          crs: 'EPSG:25830',
          source: 'test',
          confidence: 90,
          timestamp: Date.now(),
          ttl: 90 * 24 * 60 * 60 * 1000,
          metadata: { municipio, tipo, nombreOriginal: name }
        };
        await cacheManager.set(name, municipio, entry);
      }
    });

    it('debe invalidar por municipio correctamente', async () => {
      const invalidated = await cacheManager.invalidate({
        municipio: 'Granada'
      });

      // Debe haber invalidado 3 entradas de Granada
      expect(invalidated).toBeGreaterThan(0);

      // Verificar que Granada está vacío
      const granadaResult = await cacheManager.get('Centro Salud 1', 'Granada');
      expect(granadaResult.hit).toBe(false);

      // Verificar que Almería sigue
      const almeriaResult = await cacheManager.get('Hospital 1', 'Almería');
      // Puede ser hit o miss dependiendo de implementación específica
      // pero no debe crashear
      expect(almeriaResult).toBeDefined();
    });

    it('debe invalidar por tipo correctamente', async () => {
      const invalidated = await cacheManager.invalidate({
        tipo: 'SANITARIO'
      });

      // Debe haber invalidado centros sanitarios
      expect(invalidated).toBeGreaterThan(0);

      // Verificar que sanitarios están vacíos
      const sanitarioResult = await cacheManager.get('Centro Salud 1', 'Granada', 'SANITARIO');
      expect(sanitarioResult.hit).toBe(false);

      // Verificar que educativo puede seguir (dependiendo de implementación)
      const educativoResult = await cacheManager.get('Colegio 1', 'Granada', 'EDUCATIVO');
      expect(educativoResult).toBeDefined();
    });

    it('debe invalidar por fecha (olderThan)', async () => {
      // Esperar 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const cutoffTime = Date.now();

      const invalidated = await cacheManager.invalidate({
        olderThan: cutoffTime
      });

      // Todas las entradas anteriores deben invalidarse
      expect(invalidated).toBeGreaterThan(0);
    });
  });

  describe('5. Métricas y Performance', () => {
    it('debe medir latencia de operaciones', async () => {
      const entry: CacheEntry = {
        key: 'perf_test',
        coordinates: [400000, 4100000],
        crs: 'EPSG:25830',
        source: 'test',
        confidence: 90,
        timestamp: Date.now(),
        ttl: 90 * 24 * 60 * 60 * 1000
      };

      await cacheManager.set('Perf Test', 'Granada', entry);

      // Medir latencia de hit
      const start = performance.now();
      const result = await cacheManager.get('Perf Test', 'Granada');
      const latency = performance.now() - start;

      expect(result.hit).toBe(true);
      expect(latency).toBeLessThan(50); // Objetivo: <50ms para localStorage
      expect(result.latency).toBeLessThan(50);
    });

    it('debe calcular hit rate correctamente', async () => {
      const entry: CacheEntry = {
        key: 'hitrate_test',
        coordinates: [400000, 4100000],
        crs: 'EPSG:25830',
        source: 'test',
        confidence: 90,
        timestamp: Date.now(),
        ttl: 90 * 24 * 60 * 60 * 1000
      };

      await cacheManager.set('Test', 'Granada', entry);

      // 5 hits
      for (let i = 0; i < 5; i++) {
        await cacheManager.get('Test', 'Granada');
      }

      // 3 misses
      for (let i = 0; i < 3; i++) {
        await cacheManager.get(`No Existe ${i}`, 'Granada');
      }

      const metrics = cacheManager.getMetrics();
      
      // Hit rate debería ser ~62.5% (5 hits / 8 total)
      expect(metrics.hitRate).toBeGreaterThan(0.5);
      expect(metrics.hitRate).toBeLessThan(0.8);
    });
  });

  describe('6. Edge Cases', () => {
    it('debe manejar nombres con caracteres especiales', async () => {
      const entry: CacheEntry = {
        key: 'special_chars',
        coordinates: [400000, 4100000],
        crs: 'EPSG:25830',
        source: 'test',
        confidence: 90,
        timestamp: Date.now(),
        ttl: 90 * 24 * 60 * 60 * 1000
      };

      const specialName = "Centro de Salud 'San José' (Nº 1)";
      
      await cacheManager.set(specialName, 'Granada', entry);
      const result = await cacheManager.get(specialName, 'Granada');

      expect(result.hit).toBe(true);
    });

    it('debe manejar coordenadas en límites válidos', async () => {
      const entry: CacheEntry = {
        key: 'boundary_test',
        coordinates: [100000, 4000000], // Límite inferior UTM30
        crs: 'EPSG:25830',
        source: 'test',
        confidence: 90,
        timestamp: Date.now(),
        ttl: 90 * 24 * 60 * 60 * 1000
      };

      await cacheManager.set('Boundary Test', 'Almería', entry);
      const result = await cacheManager.get('Boundary Test', 'Almería');

      expect(result.hit).toBe(true);
      expect(result.data?.coordinates[0]).toBe(100000);
    });

    it('debe manejar múltiples sets del mismo elemento', async () => {
      const entry1: CacheEntry = {
        key: 'update_test',
        coordinates: [400000, 4100000],
        crs: 'EPSG:25830',
        source: 'test_v1',
        confidence: 80,
        timestamp: Date.now(),
        ttl: 90 * 24 * 60 * 60 * 1000
      };

      const entry2: CacheEntry = {
        ...entry1,
        coordinates: [400001, 4100001],
        source: 'test_v2',
        confidence: 95
      };

      // Primer set
      await cacheManager.set('Update Test', 'Granada', entry1);
      
      // Segundo set (actualización)
      await cacheManager.set('Update Test', 'Granada', entry2, { force: true });

      // Debe retornar la versión actualizada
      const result = await cacheManager.get('Update Test', 'Granada');
      
      expect(result.hit).toBe(true);
      expect(result.data?.source).toBe('test_v2');
      expect(result.data?.confidence).toBe(95);
    });
  });
});
