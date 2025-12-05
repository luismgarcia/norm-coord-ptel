/**
 * Tests: Esquemas IndexedDB (Dexie.js)
 * 
 * Verifica la estructura y operaciones básicas de la BBDD local.
 * Usa fake-indexeddb para mockear IndexedDB en Node.js
 * 
 * @module tests/schemas
 * @version 1.0.0
 * @date 2025-12-05
 * @session A.3
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// Mock IndexedDB antes de importar el módulo
import 'fake-indexeddb/auto';

import {
  db,
  PTELDatabase,
  isDatabaseReady,
  getDatabaseStats,
  cleanExpiredCache,
  generateCacheKey,
  CACHE_TTL_MS,
  SYNC_INTERVAL_DAYS,
  SCHEMA_VERSION,
  type DERAFeature,
  type INEMunicipio,
  type GeocodingCache,
  type SyncMetadata,
  type InfraTipologia
} from '../localData/schemas';

// ============================================================================
// FIXTURES
// ============================================================================

const SAMPLE_DERA: DERAFeature = {
  id: 'SANITARIO_18051_001',
  tipologia: 'SANITARIO',
  nombre: 'Centro de Salud Colomera',
  subtipo: 'Centro de Salud',
  direccion: 'C/ Doctor Fleming, 2',
  localidad: 'Colomera',
  codMun: '18051',
  municipio: 'Colomera',
  provincia: 'Granada',
  codProv: '18',
  x: 436972.40,
  y: 4137231.90,
  capaOrigen: 'g12_04_equipamiento_sanitario',
  fechaCarga: new Date().toISOString()
};

const SAMPLE_INE: INEMunicipio = {
  codMun: '18051',
  nombre: 'Colomera',
  nombreNorm: 'COLOMERA',
  provincia: 'Granada',
  codProv: '18',
  centroideX: 437000,
  centroideY: 4137000,
  superficie: 58.2,
  poblacion: 1400
};

const SAMPLE_CACHE: GeocodingCache = {
  id: 'cache_abc123',
  query: 'Centro de Salud',
  codMun: '18051',
  tipologia: 'SANITARIO',
  x: 436972.40,
  y: 4137231.90,
  confidence: 95,
  source: 'LOCAL_DERA',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString()
};

const SAMPLE_SYNC: SyncMetadata = {
  id: 'dera',
  status: 'completed',
  lastSync: new Date().toISOString(),
  nextSync: new Date(Date.now() + SYNC_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  dataVersion: '2025-06-30',
  recordCount: 10653,
  sizeBytes: 50 * 1024 * 1024,
  lastAttempt: new Date().toISOString()
};

// ============================================================================
// TESTS
// ============================================================================

describe('LocalData Schemas (Dexie.js)', () => {
  
  beforeEach(async () => {
    // Limpiar tablas antes de cada test
    await db.dera.clear();
    await db.ine.clear();
    await db.boundaries.clear();
    await db.geocodingCache.clear();
    await db.syncMetadata.clear();
  });

  describe('Inicialización de base de datos', () => {
    
    it('debe crear instancia de PTELDatabase', () => {
      expect(db).toBeInstanceOf(PTELDatabase);
      expect(db.name).toBe('PTELLocalData');
    });
    
    it('debe tener todas las tablas definidas', () => {
      expect(db.dera).toBeDefined();
      expect(db.ine).toBeDefined();
      expect(db.boundaries).toBeDefined();
      expect(db.geocodingCache).toBeDefined();
      expect(db.syncMetadata).toBeDefined();
    });
    
    it('debe reportar versión de esquema correcta', () => {
      expect(SCHEMA_VERSION).toBe(1);
    });
    
  });

  describe('Operaciones CRUD: DERA', () => {
    
    it('debe insertar y recuperar feature DERA', async () => {
      await db.dera.add(SAMPLE_DERA);
      
      const retrieved = await db.dera.get(SAMPLE_DERA.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.nombre).toBe('Centro de Salud Colomera');
      expect(retrieved?.tipologia).toBe('SANITARIO');
      expect(retrieved?.codMun).toBe('18051');
    });
    
    it('debe buscar por tipología y municipio (índice compuesto)', async () => {
      // Insertar múltiples features
      const features: DERAFeature[] = [
        { ...SAMPLE_DERA, id: 'SANITARIO_18051_001' },
        { ...SAMPLE_DERA, id: 'SANITARIO_18051_002', nombre: 'Consultorio Auxiliar' },
        { ...SAMPLE_DERA, id: 'EDUCATIVO_18051_001', tipologia: 'EDUCATIVO', nombre: 'CEIP Colomera' },
      ];
      await db.dera.bulkAdd(features);
      
      // Buscar sanitarios en Colomera
      const sanitarios = await db.dera
        .where({ tipologia: 'SANITARIO', codMun: '18051' })
        .toArray();
      
      expect(sanitarios).toHaveLength(2);
      expect(sanitarios[0].tipologia).toBe('SANITARIO');
    });
    
    it('debe contar features por tipología (singleton detection)', async () => {
      await db.dera.add(SAMPLE_DERA);
      
      const count = await db.dera
        .where({ tipologia: 'SANITARIO', codMun: '18051' })
        .count();
      
      expect(count).toBe(1); // Singleton
    });
    
    it('debe buscar por nombre para fuzzy matching', async () => {
      await db.dera.add(SAMPLE_DERA);
      
      const results = await db.dera
        .where('nombre')
        .startsWithIgnoreCase('Centro')
        .toArray();
      
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
    
  });

  describe('Operaciones CRUD: INE', () => {
    
    it('debe insertar y recuperar municipio INE', async () => {
      await db.ine.add(SAMPLE_INE);
      
      const retrieved = await db.ine.get('18051');
      expect(retrieved).toBeDefined();
      expect(retrieved?.nombre).toBe('Colomera');
      expect(retrieved?.centroideX).toBe(437000);
    });
    
    it('debe buscar por nombre normalizado', async () => {
      await db.ine.add(SAMPLE_INE);
      
      const results = await db.ine
        .where('nombreNorm')
        .equals('COLOMERA')
        .toArray();
      
      expect(results).toHaveLength(1);
    });
    
    it('debe buscar por provincia', async () => {
      await db.ine.add(SAMPLE_INE);
      await db.ine.add({ ...SAMPLE_INE, codMun: '18046', nombre: 'Castril', nombreNorm: 'CASTRIL' });
      
      const granadinos = await db.ine
        .where('provincia')
        .equals('Granada')
        .toArray();
      
      expect(granadinos).toHaveLength(2);
    });
    
  });

  describe('Operaciones CRUD: Cache', () => {
    
    it('debe insertar y recuperar cache', async () => {
      await db.geocodingCache.add(SAMPLE_CACHE);
      
      const retrieved = await db.geocodingCache.get(SAMPLE_CACHE.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.confidence).toBe(95);
    });
    
    it('debe limpiar cache expirado', async () => {
      // Cache expirado (hace 1 día)
      const expiredCache: GeocodingCache = {
        ...SAMPLE_CACHE,
        id: 'cache_expired',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      };
      
      // Cache válido
      await db.geocodingCache.add(SAMPLE_CACHE);
      await db.geocodingCache.add(expiredCache);
      
      const cleaned = await cleanExpiredCache();
      expect(cleaned).toBe(1);
      
      const remaining = await db.geocodingCache.count();
      expect(remaining).toBe(1);
    });
    
    it('debe generar cache key consistente', () => {
      const key1 = generateCacheKey('Centro de Salud', '18051', 'SANITARIO');
      const key2 = generateCacheKey('Centro de Salud', '18051', 'SANITARIO');
      const key3 = generateCacheKey('Centro de Salud', '18051', 'EDUCATIVO');
      
      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).toMatch(/^cache_[a-f0-9]+$/);
    });
    
  });

  describe('Operaciones CRUD: Sync Metadata', () => {
    
    it('debe insertar y recuperar metadata de sync', async () => {
      await db.syncMetadata.add(SAMPLE_SYNC);
      
      const retrieved = await db.syncMetadata.get('dera');
      expect(retrieved).toBeDefined();
      expect(retrieved?.status).toBe('completed');
      expect(retrieved?.recordCount).toBe(10653);
    });
    
    it('debe actualizar estado de sync', async () => {
      await db.syncMetadata.add(SAMPLE_SYNC);
      
      await db.syncMetadata.update('dera', {
        status: 'syncing',
        lastAttempt: new Date().toISOString()
      });
      
      const updated = await db.syncMetadata.get('dera');
      expect(updated?.status).toBe('syncing');
    });
    
  });

  describe('Helpers de base de datos', () => {
    
    it('isDatabaseReady debe retornar false si vacía', async () => {
      const ready = await isDatabaseReady();
      expect(ready).toBe(false);
    });
    
    it('isDatabaseReady debe retornar true con datos', async () => {
      await db.dera.add(SAMPLE_DERA);
      await db.ine.add(SAMPLE_INE);
      
      const ready = await isDatabaseReady();
      expect(ready).toBe(true);
    });
    
    it('getDatabaseStats debe retornar conteos correctos', async () => {
      await db.dera.add(SAMPLE_DERA);
      await db.ine.add(SAMPLE_INE);
      await db.geocodingCache.add(SAMPLE_CACHE);
      await db.syncMetadata.add(SAMPLE_SYNC);
      
      const stats = await getDatabaseStats();
      
      expect(stats.dera).toBe(1);
      expect(stats.ine).toBe(1);
      expect(stats.cache).toBe(1);
      expect(stats.lastSync).toBeDefined();
    });
    
  });

  describe('Constantes', () => {
    
    it('CACHE_TTL_MS debe ser 7 días', () => {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(CACHE_TTL_MS).toBe(sevenDays);
    });
    
    it('SYNC_INTERVAL_DAYS debe ser 90', () => {
      expect(SYNC_INTERVAL_DAYS).toBe(90);
    });
    
  });

});
