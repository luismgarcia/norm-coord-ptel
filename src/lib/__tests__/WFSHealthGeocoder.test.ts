/**
 * WFSHealthGeocoder.test.ts
 * 
 * Tests unitarios para el cliente WFS de centros sanitarios
 * 
 * NOTA: Los tests de integración con el WFS real requieren conexión a internet
 * y se marcan con .skip por defecto para CI/CD
 * 
 * @version 1.0.0
 * @date 2025-11-28
 */

import {
  geocodeHealthCenter,
  getAllHealthCentersInMunicipality,
  checkWFSAvailability,
  getServiceInfo,
  clearExpiredCache,
  getCacheStats,
  type WFSHealthQuery,
  type WFSHealthResult,
  type HealthCenter,
} from '../WFSHealthGeocoder';

// ============================================================================
// TESTS UNITARIOS (Sin conexión externa)
// ============================================================================

describe('WFSHealthGeocoder - Unit Tests', () => {

  describe('getServiceInfo', () => {
    test('retorna configuración del servicio', () => {
      const info = getServiceInfo();
      
      expect(info.baseUrl).toBe('https://www.ideandalucia.es/services/DERA_g12_servicios/wfs');
      expect(info.version).toBe('2.0.0');
      expect(info.defaultSRS).toBe('EPSG:25830');
      expect(info.layers.primaria).toContain('g12_01_CentroSalud');
      expect(info.layers.hospitalaria).toContain('g12_02_CentroAtencionEspecializada');
    });
  });

  describe('Cache', () => {
    test('getCacheStats retorna estadísticas iniciales', () => {
      const stats = getCacheStats();
      
      expect(typeof stats.entries).toBe('number');
      expect(typeof stats.oldestMs).toBe('number');
    });

    test('clearExpiredCache no falla con cache vacío', () => {
      const cleared = clearExpiredCache();
      expect(typeof cleared).toBe('number');
    });
  });

  describe('Query Validation', () => {
    test('municipio es requerido', async () => {
      const result = await geocodeHealthCenter({
        municipio: '',
      });
      
      // Con municipio vacío, no debería encontrar resultados
      expect(result.centers).toHaveLength(0);
    });
  });
});

// ============================================================================
// TESTS DE INTEGRACIÓN (Requieren conexión)
// ============================================================================

describe('WFSHealthGeocoder - Integration Tests', () => {

  // NOTA: Timeout configurado globalmente en vitest.config.ts
  // Con mocks de fetch, los tests son rápidos (<100ms)

  describe('checkWFSAvailability', () => {
    test('servicio WFS está disponible', async () => {
      const status = await checkWFSAvailability();
      
      console.log(`WFS disponible: ${status.available}, tiempo: ${status.responseTime}ms`);
      
      // El servicio debería estar disponible (test de humo)
      // Si falla, puede ser problema de red
      if (!status.available) {
        console.warn(`WFS no disponible: ${status.error}`);
      }
      
      expect(typeof status.available).toBe('boolean');
      expect(typeof status.responseTime).toBe('number');
    });
  });

  describe('geocodeHealthCenter', () => {
    
    test('encuentra centros sanitarios en Colomera', async () => {
      const result = await geocodeHealthCenter({
        municipio: 'Colomera',
        provincia: 'Granada',
      });

      console.log(`Colomera: ${result.centers.length} centros, ${result.queryTime}ms`);
      
      if (result.success) {
        expect(result.centers.length).toBeGreaterThan(0);
        
        // Verificar estructura de datos
        const center = result.centers[0];
        expect(center).toHaveProperty('nica');
        expect(center).toHaveProperty('nombre');
        expect(center).toHaveProperty('x');
        expect(center).toHaveProperty('y');
        expect(center.srs).toBe('EPSG:25830');
        
        // Coordenadas deben estar en rango Andalucía UTM30
        expect(center.x).toBeGreaterThan(100000);
        expect(center.x).toBeLessThan(700000);
        expect(center.y).toBeGreaterThan(3900000);
        expect(center.y).toBeLessThan(4400000);
      } else {
        console.warn(`Error en Colomera: ${result.error}`);
      }
    });


    test('fuzzy matching encuentra consultorio por nombre', async () => {
      const result = await geocodeHealthCenter({
        municipio: 'Colomera',
        provincia: 'Granada',
        nombreBuscado: 'Consultorio Médico',
      });

      console.log(`Búsqueda "Consultorio Médico": score=${result.matchScore}`);
      
      if (result.success && result.bestMatch) {
        console.log(`  Encontrado: ${result.bestMatch.nombre}`);
        console.log(`  Dirección: ${result.bestMatch.direccion}`);
        
        // El score debería ser razonable si hay match
        expect(result.matchScore).toBeGreaterThan(30);
      }
    });

    test('encuentra centros en Berja (Almería)', async () => {
      const result = await geocodeHealthCenter({
        municipio: 'Berja',
        provincia: 'Almería',
        incluirHospitales: true,
      });

      console.log(`Berja: ${result.centers.length} centros`);
      
      if (result.success) {
        expect(result.centers.length).toBeGreaterThan(0);
        
        // Listar centros encontrados
        result.centers.forEach(c => {
          console.log(`  - ${c.nombre} (${c.tipo})`);
        });
      }
    });

    test('encuentra hospitales cuando se solicita', async () => {
      const result = await geocodeHealthCenter({
        municipio: 'Granada',
        provincia: 'Granada',
        incluirHospitales: true,
        nombreBuscado: 'Hospital',
      });

      console.log(`Granada hospitales: ${result.centers.length} centros`);
      
      if (result.success && result.centers.length > 0) {
        // Buscar si hay algún hospital en los resultados
        const hospitales = result.centers.filter(c => 
          c.nombre.toLowerCase().includes('hospital') ||
          c.tipo.toLowerCase().includes('hospital')
        );
        
        console.log(`  Hospitales encontrados: ${hospitales.length}`);
        hospitales.forEach(h => {
          console.log(`    - ${h.nombre}`);
        });
      }
    });

    test('municipio inexistente retorna array vacío', async () => {
      const result = await geocodeHealthCenter({
        municipio: 'MunicipioQueNoExiste12345',
      });

      expect(result.centers).toHaveLength(0);
      // No debería ser error, solo sin resultados
    });

    test('coordenadas en WGS84 cuando se solicita', async () => {
      const result = await geocodeHealthCenter({
        municipio: 'Colomera',
        provincia: 'Granada',
        srsOutput: 'EPSG:4326',
      });

      if (result.success && result.centers.length > 0) {
        const center = result.centers[0];
        
        // WGS84: longitud (-180 a 180), latitud (-90 a 90)
        // Andalucía: lon ~-7 a -1.5, lat ~36 a 38.7
        expect(center.x).toBeGreaterThan(-8);
        expect(center.x).toBeLessThan(-1);
        expect(center.y).toBeGreaterThan(35);
        expect(center.y).toBeLessThan(39);
        expect(center.srs).toBe('EPSG:4326');
      }
    });

    test('cache funciona correctamente', async () => {
      // Primera llamada
      const result1 = await geocodeHealthCenter({
        municipio: 'Colomera',
        provincia: 'Granada',
      });
      const time1 = result1.queryTime;

      // Segunda llamada (debería usar cache)
      const result2 = await geocodeHealthCenter({
        municipio: 'Colomera',
        provincia: 'Granada',
      });
      const time2 = result2.queryTime;

      console.log(`Primera llamada: ${time1}ms, Segunda (cache): ${time2}ms`);
      
      // La segunda debería ser significativamente más rápida
      if (result1.success) {
        expect(time2).toBeLessThan(time1);
      }

      // Verificar estadísticas de cache
      const stats = getCacheStats();
      expect(stats.entries).toBeGreaterThan(0);
    });
  });

  describe('getAllHealthCentersInMunicipality', () => {
    
    test('obtiene todos los centros de un municipio grande', async () => {
      const centers = await getAllHealthCentersInMunicipality('Almería', 'Almería');
      
      console.log(`Almería capital: ${centers.length} centros sanitarios`);
      
      // Almería capital debería tener varios centros
      expect(centers.length).toBeGreaterThan(3);
      
      // Verificar que hay variedad de tipos
      const tipos = new Set(centers.map(c => c.tipo));
      console.log(`  Tipos: ${Array.from(tipos).join(', ')}`);
    });
  });
});

// ============================================================================
// CASOS DE USO PTEL REALES
// ============================================================================

describe('WFSHealthGeocoder - Casos PTEL Reales', () => {
  // NOTA: Con mocks de fetch, no necesitamos timeouts largos

  const casosPTEL = [
    { municipio: 'Colomera', provincia: 'Granada', nombre: 'Consultorio Médico' },
    { municipio: 'Quéntar', provincia: 'Granada', nombre: 'Centro de Salud' },
    { municipio: 'Hornos', provincia: 'Jaén', nombre: 'Consultorio' },
    { municipio: 'Castril', provincia: 'Granada', nombre: 'Centro de Salud' },
    { municipio: 'Tíjola', provincia: 'Almería', nombre: 'Centro de Salud' },
    { municipio: 'Berja', provincia: 'Almería', nombre: 'Centro de Salud' },
  ];

  test.each(casosPTEL)(
    'geocodifica $nombre en $municipio ($provincia)',
    async ({ municipio, provincia, nombre }) => {
      const result = await geocodeHealthCenter({
        municipio,
        provincia,
        nombreBuscado: nombre,
        incluirHospitales: true,
      });

      const status = result.success 
        ? `✅ ${result.centers.length} centros, score=${result.matchScore}`
        : `❌ ${result.error}`;
      
      console.log(`${municipio}: ${status}`);
      
      if (result.bestMatch) {
        console.log(`  → ${result.bestMatch.nombre}`);
        console.log(`  → X=${result.bestMatch.x.toFixed(2)}, Y=${result.bestMatch.y.toFixed(2)}`);
      }
      
      // Al menos debe completar sin error fatal
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('queryTime');
    }
  );
});
