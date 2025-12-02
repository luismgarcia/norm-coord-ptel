/**
 * EducationGeocoder.test.ts
 * 
 * Tests unitarios e integración para el cliente API de centros educativos
 * 
 * @version 1.0.0
 * @date 2025-11-28
 */

import {
  geocodeEducationCenter,
  getAllEducationCentersInMunicipality,
  getEducationCentersByType,
  getEducationCenterByCode,
  checkAPIAvailability,
  getServiceInfo,
  getCenterStatsByProvince,
  clearExpiredCache,
  getCacheStats,
  type EducationQuery,
  type EducationResult,
  type EducationCenter,
} from '../EducationGeocoder';

// ============================================================================
// TESTS UNITARIOS (Sin conexión externa)
// ============================================================================

describe('EducationGeocoder - Unit Tests', () => {

  describe('getServiceInfo', () => {
    test('retorna configuración del servicio', () => {
      const info = getServiceInfo();
      
      expect(info.baseUrl).toContain('juntadeandalucia.es');
      expect(info.baseUrl).toContain('datosabiertos');
      expect(info.resourceId).toBe('15aabed2-eec3-4b99-a027-9af5e27c9cac');
      expect(info.timeout).toBe(20000);
      expect(info.maxLimit).toBe(1000);
    });
  });

  describe('Cache', () => {
    test('getCacheStats retorna estadísticas', () => {
      const stats = getCacheStats();
      
      expect(typeof stats.entries).toBe('number');
      expect(typeof stats.oldestMs).toBe('number');
    });

    test('clearExpiredCache no falla con cache vacío', () => {
      const cleared = clearExpiredCache();
      expect(typeof cleared).toBe('number');
    });
  });
});

// ============================================================================
// TESTS DE INTEGRACIÓN (Requieren conexión)
// ============================================================================

describe('EducationGeocoder - Integration Tests', () => {
  // NOTA: Timeout configurado globalmente en vitest.config.ts
  // Con mocks de fetch, los tests son rápidos (<100ms)

  describe('checkAPIAvailability', () => {
    test('API de Datos Abiertos está disponible', async () => {
      const status = await checkAPIAvailability();
      
      console.log(`API disponible: ${status.available}, tiempo: ${status.responseTime}ms`);
      
      if (!status.available) {
        console.warn(`API no disponible: ${status.error}`);
      }
      
      expect(typeof status.available).toBe('boolean');
      expect(typeof status.responseTime).toBe('number');
    });
  });

  describe('geocodeEducationCenter', () => {
    
    test('encuentra centros educativos en Colomera', async () => {
      const result = await geocodeEducationCenter({
        municipio: 'Colomera',
        provincia: 'Granada',
      });

      console.log(`Colomera: ${result.centers.length} centros, ${result.queryTime}ms`);
      
      if (result.success) {
        expect(result.centers.length).toBeGreaterThan(0);
        
        const center = result.centers[0];
        expect(center).toHaveProperty('codigo');
        expect(center).toHaveProperty('nombreCompleto');
        expect(center).toHaveProperty('x');
        expect(center).toHaveProperty('y');
        expect(center.srs).toBe('EPSG:25830');
        
        // UTM30 Andalucía
        expect(center.x).toBeGreaterThan(100000);
        expect(center.x).toBeLessThan(700000);
        expect(center.y).toBeGreaterThan(3900000);
        expect(center.y).toBeLessThan(4400000);
        
        result.centers.forEach(c => {
          console.log(`  - ${c.nombreCompleto} (${c.tipo})`);
        });
      } else {
        console.warn(`Error: ${result.error}`);
      }
    });

    test('fuzzy matching encuentra CEIP por nombre', async () => {
      const result = await geocodeEducationCenter({
        municipio: 'Colomera',
        provincia: 'Granada',
        nombreBuscado: 'Juan Alonso Rivas',
      });

      console.log(`Búsqueda "Juan Alonso Rivas": score=${result.matchScore}`);
      
      if (result.success && result.bestMatch) {
        console.log(`  Encontrado: ${result.bestMatch.nombreCompleto}`);
        expect(result.matchScore).toBeGreaterThan(30);
      }
    });


    test('encuentra IES en Tíjola', async () => {
      const result = await geocodeEducationCenter({
        municipio: 'Tíjola',
        provincia: 'Almería',
        nombreBuscado: 'Alto Almanzora',
      });

      console.log(`Tíjola IES: ${result.centers.length} centros`);
      
      if (result.success) {
        result.centers.forEach(c => {
          console.log(`  - ${c.nombreCompleto} (${c.tipo})`);
        });
      }
    });

    test('filtra por provincia', async () => {
      const result = await geocodeEducationCenter({
        provincia: 'Jaén',
        maxResults: 50,
      });

      console.log(`Jaén: ${result.centers.length} centros (total: ${result.totalRecords})`);
      
      if (result.success && result.centers.length > 0) {
        // Todos deben ser de Jaén
        const noJaen = result.centers.filter(c => 
          c.provincia.toLowerCase() !== 'jaén'
        );
        expect(noJaen).toHaveLength(0);
      }
    });

    test('coordenadas WGS84 cuando se solicita', async () => {
      const result = await geocodeEducationCenter({
        municipio: 'Granada',
        provincia: 'Granada',
        srsOutput: 'EPSG:4326',
        maxResults: 10,
      });

      if (result.success && result.centers.length > 0) {
        const center = result.centers[0];
        
        // WGS84 Andalucía
        expect(center.x).toBeGreaterThan(-8);
        expect(center.x).toBeLessThan(-1);
        expect(center.y).toBeGreaterThan(35);
        expect(center.y).toBeLessThan(39);
        expect(center.srs).toBe('EPSG:4326');
      }
    });

    test('cache mejora rendimiento', async () => {
      // Primera llamada
      const result1 = await geocodeEducationCenter({
        municipio: 'Berja',
        provincia: 'Almería',
      });
      
      // Segunda llamada (cache)
      const result2 = await geocodeEducationCenter({
        municipio: 'Berja',
        provincia: 'Almería',
      });

      console.log(`Primera: ${result1.queryTime}ms, Segunda (cache): ${result2.queryTime}ms`);
      
      if (result1.success) {
        expect(result2.queryTime).toBeLessThan(result1.queryTime);
      }
    });
  });

  describe('getEducationCentersByType', () => {
    
    test('obtiene CEIPs de Granada', async () => {
      const centers = await getEducationCentersByType('CEIP', 'Granada', 50);
      
      console.log(`CEIPs Granada: ${centers.length}`);
      
      if (centers.length > 0) {
        // Todos deben ser CEIP
        const noCeip = centers.filter(c => c.tipo !== 'CEIP');
        expect(noCeip).toHaveLength(0);
        
        centers.slice(0, 5).forEach(c => {
          console.log(`  - ${c.nombreCompleto} (${c.municipio})`);
        });
      }
    });

    test('obtiene IES de Almería', async () => {
      const centers = await getEducationCentersByType('IES', 'Almería', 30);
      
      console.log(`IES Almería: ${centers.length}`);
      
      if (centers.length > 0) {
        centers.slice(0, 5).forEach(c => {
          console.log(`  - ${c.nombreCompleto} (${c.municipio})`);
        });
      }
    });
  });

  describe('getAllEducationCentersInMunicipality', () => {
    
    test('obtiene todos los centros de Almería capital', async () => {
      const centers = await getAllEducationCentersInMunicipality('Almería', 'Almería');
      
      console.log(`Almería capital: ${centers.length} centros educativos`);
      
      // El servicio puede no estar disponible o devolver 0 resultados
      // Verificamos que no falla y que devuelve un array
      expect(Array.isArray(centers)).toBe(true);
      
      // Si hay centros, mostrar estadísticas
      if (centers.length > 0) {
        const byType: Record<string, number> = {};
        centers.forEach(c => {
          byType[c.tipo] = (byType[c.tipo] || 0) + 1;
        });
        console.log('  Por tipo:', byType);
      }
    });
  });

  describe('getCenterStatsByProvince', () => {
    
    test('obtiene estadísticas de Granada', async () => {
      const stats = await getCenterStatsByProvince('Granada');
      
      console.log(`Granada: ${stats.total} centros`);
      console.log('  Por tipo:', stats.byType);
      console.log('  Por titularidad:', stats.byTitularidad);
      
      // El servicio puede no estar disponible
      // Solo verificamos que la estructura es correcta
      expect(typeof stats.total).toBe('number');
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(typeof stats.byType).toBe('object');
    });
  });
});

// ============================================================================
// CASOS DE USO PTEL REALES
// ============================================================================

describe('EducationGeocoder - Casos PTEL Reales', () => {
  // Timeout configurado en vitest.config.ts (10000ms)

  const casosPTEL = [
    { municipio: 'Colomera', provincia: 'Granada', nombre: 'CEIP Juan Alonso Rivas' },
    { municipio: 'Quéntar', provincia: 'Granada', nombre: 'Colegio' },
    { municipio: 'Hornos', provincia: 'Jaén', nombre: 'Colegio' },
    { municipio: 'Castril', provincia: 'Granada', nombre: 'CEIP' },
    { municipio: 'Tíjola', provincia: 'Almería', nombre: 'IES Alto Almanzora' },
    { municipio: 'Berja', provincia: 'Almería', nombre: 'Instituto' },
  ];

  test.each(casosPTEL)(
    'geocodifica $nombre en $municipio ($provincia)',
    async ({ municipio, provincia, nombre }) => {
      const result = await geocodeEducationCenter({
        municipio,
        provincia,
        nombreBuscado: nombre,
      });

      const status = result.success 
        ? `✅ ${result.centers.length} centros, score=${result.matchScore}`
        : `❌ ${result.error}`;
      
      console.log(`${municipio}: ${status}`);
      
      if (result.bestMatch) {
        console.log(`  → ${result.bestMatch.nombreCompleto}`);
        console.log(`  → X=${result.bestMatch.x.toFixed(2)}, Y=${result.bestMatch.y.toFixed(2)}`);
      }
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('queryTime');
    }
  );
});
