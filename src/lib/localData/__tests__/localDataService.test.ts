/**
 * Tests para localDataService
 * 
 * @session B.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  checkDataLoaded, 
  loadInitialData,
  clearAllData,
  type LoadProgress 
} from '../localDataService';
import { db } from '../schemas';

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('localDataService', () => {
  beforeEach(async () => {
    // Limpiar la base de datos antes de cada test
    await clearAllData();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await clearAllData();
  });

  describe('checkDataLoaded', () => {
    it('retorna isLoaded=false cuando no hay datos', async () => {
      const result = await checkDataLoaded();
      
      expect(result.isLoaded).toBe(false);
      expect(result.deraCount).toBe(0);
      expect(result.ineCount).toBe(0);
      expect(result.lastSync).toBeNull();
    });

    it('retorna isLoaded=true cuando hay datos DERA e INE', async () => {
      // Insertar datos de prueba
      await db.dera.bulkAdd([
        {
          id: 'SANITARIO_18051_1',
          tipologia: 'SANITARIO',
          nombre: 'Centro de Salud Test',
          codMun: '18051',
          municipio: 'Granada',
          provincia: 'Granada',
          codProv: '18',
          x: 446000,
          y: 4114000,
          capaOrigen: 'test',
          fechaCarga: new Date().toISOString()
        }
      ]);
      
      await db.ine.bulkAdd([
        {
          codMun: '18051',
          nombre: 'Granada',
          nombreNorm: 'GRANADA',
          provincia: 'Granada',
          codProv: '18',
          centroideX: 446000,
          centroideY: 4114000
        }
      ]);

      const result = await checkDataLoaded();
      
      expect(result.isLoaded).toBe(true);
      expect(result.deraCount).toBe(1);
      expect(result.ineCount).toBe(1);
    });
  });

  describe('loadInitialData', () => {
    it('salta carga si ya hay datos y forceReload=false', async () => {
      // Insertar datos existentes
      await db.dera.add({
        id: 'TEST_1',
        tipologia: 'SANITARIO',
        nombre: 'Test',
        codMun: '18051',
        municipio: 'Granada',
        provincia: 'Granada',
        codProv: '18',
        x: 446000,
        y: 4114000,
        capaOrigen: 'test',
        fechaCarga: new Date().toISOString()
      });
      
      await db.ine.add({
        codMun: '18051',
        nombre: 'Granada',
        nombreNorm: 'GRANADA',
        provincia: 'Granada',
        codProv: '18',
        centroideX: 446000,
        centroideY: 4114000
      });

      const result = await loadInitialData({ forceReload: false });

      expect(result.success).toBe(true);
      expect(result.deraCount).toBe(1);
      expect(result.ineCount).toBe(1);
      // No debería llamar a fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('reporta progreso durante la carga', async () => {
      const progressUpdates: LoadProgress[] = [];
      
      // Mock de respuestas
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('all-dera.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                id: 'SANITARIO_18051_1',
                tipologia: 'SANITARIO',
                nombre: 'Centro Test',
                codMun: '18051',
                municipio: 'Granada',
                provincia: 'Granada',
                codProv: '18',
                x: 446000,
                y: 4114000,
                capaOrigen: 'test',
                fechaCarga: new Date().toISOString()
              }
            ])
          });
        }
        if (url.includes('municipios.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                codMun: '18051',
                nombre: 'Granada',
                nombreNorm: 'GRANADA',
                provincia: 'Granada',
                codProv: '18',
                centroideX: 446000,
                centroideY: 4114000
              }
            ])
          });
        }
        return Promise.reject(new Error('URL no encontrada'));
      });

      const result = await loadInitialData({
        forceReload: true,
        onProgress: (p) => progressUpdates.push({ ...p })
      });

      expect(result.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Verificar que hay fases de progreso
      const phases = progressUpdates.map(p => p.phase);
      expect(phases).toContain('checking');
      expect(phases).toContain('downloading');
      expect(phases).toContain('inserting');
      expect(phases).toContain('complete');
    });

    it('maneja errores de red correctamente', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await loadInitialData({ forceReload: true });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Network error');
    });

    it('maneja errores HTTP correctamente', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await loadInitialData({ forceReload: true });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('404');
    });
  });

  describe('clearAllData', () => {
    it('limpia todas las tablas', async () => {
      // Insertar datos
      await db.dera.add({
        id: 'TEST_1',
        tipologia: 'SANITARIO',
        nombre: 'Test',
        codMun: '18051',
        municipio: 'Granada',
        provincia: 'Granada',
        codProv: '18',
        x: 446000,
        y: 4114000,
        capaOrigen: 'test',
        fechaCarga: new Date().toISOString()
      });

      // Verificar que hay datos
      expect(await db.dera.count()).toBe(1);

      // Limpiar
      await clearAllData();

      // Verificar que está vacío
      expect(await db.dera.count()).toBe(0);
      expect(await db.ine.count()).toBe(0);
      expect(await db.boundaries.count()).toBe(0);
      expect(await db.geocodingCache.count()).toBe(0);
      expect(await db.syncMetadata.count()).toBe(0);
    });
  });
});
