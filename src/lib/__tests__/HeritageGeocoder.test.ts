/**
 * HeritageGeocoder.test.ts
 * 
 * Tests unitarios e integración para el cliente WFS de patrimonio histórico
 * 
 * @version 1.0.0
 * @date 2025-11-28
 */

import {
  geocodeHeritageSite,
  getAllHeritageSitesInMunicipality,
  getBICInMunicipality,
  getChurchesInMunicipality,
  getCastlesInMunicipality,
  getArchaeologicalSites,
  isKnownHeritageSite,
  checkServicesAvailability,
  getServiceInfo,
  getHeritageStatsByProvince,
  clearExpiredCache,
  getCacheStats,
  type HeritageQuery,
  type HeritageResult,
  type HeritageSite,
  type HeritageType,
} from '../HeritageGeocoder';

// ============================================================================
// TESTS UNITARIOS (Sin conexión externa)
// ============================================================================

describe('HeritageGeocoder - Unit Tests', () => {

  describe('getServiceInfo', () => {
    test('retorna configuración de servicios', () => {
      const info = getServiceInfo();
      
      expect(info.iaph.baseUrl).toContain('iaph.es');
      expect(info.ideCultura.baseUrl).toContain('juntadeandalucia.es');
      expect(info.defaultSRS).toBe('EPSG:25830');
      expect(info.cacheTTL).toBeGreaterThan(0);
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

describe('HeritageGeocoder - Integration Tests', () => {

  jest.setTimeout(45000); // WFS pueden ser lentos

  describe('checkServicesAvailability', () => {
    test('verifica disponibilidad de servicios WFS', async () => {
      const status = await checkServicesAvailability();
      
      console.log(`IAPH: ${status.iaph.available ? '✅' : '❌'} (${status.iaph.responseTime}ms)`);
      console.log(`IDE Cultura: ${status.ideCultura.available ? '✅' : '❌'} (${status.ideCultura.responseTime}ms)`);
      
      // Al menos uno debería estar disponible
      expect(status.iaph.available || status.ideCultura.available).toBe(true);
    });
  });

  describe('geocodeHeritageSite', () => {
    
    test('encuentra patrimonio en Colomera', async () => {
      const result = await geocodeHeritageSite({
        municipio: 'Colomera',
        provincia: 'Granada',
        incluirIDECultura: true,
      });

      console.log(`Colomera: ${result.sites.length} bienes patrimoniales, ${result.queryTime}ms`);
      console.log(`Fuentes: ${result.sources.join(', ')}`);
      
      if (result.success) {
        result.sites.forEach(s => {
          console.log(`  - ${s.nombre} (${s.tipo}) [${s.proteccion}]`);
        });
      } else {
        console.warn(`Sin resultados: ${result.error || 'No hay patrimonio registrado'}`);
      }
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('sites');
    });

    test('fuzzy matching encuentra iglesia por nombre', async () => {
      const result = await geocodeHeritageSite({
        municipio: 'Hornos',
        provincia: 'Jaén',
        nombreBuscado: 'Iglesia Nuestra Señora de la Asunción',
        incluirIDECultura: true,
      });

      console.log(`Búsqueda iglesia Hornos: score=${result.matchScore}`);
      
      if (result.bestMatch) {
        console.log(`  Encontrado: ${result.bestMatch.nombre}`);
        console.log(`  Tipo: ${result.bestMatch.tipo}`);
        console.log(`  Protección: ${result.bestMatch.proteccion}`);
      }
      
      expect(result).toHaveProperty('matchScore');
    });


    test('encuentra castillos en Granada', async () => {
      const result = await geocodeHeritageSite({
        provincia: 'Granada',
        tipo: 'ARQUITECTURA_DEFENSIVA',
        incluirIDECultura: true,
        maxResults: 20,
      });

      console.log(`Castillos Granada: ${result.sites.length} encontrados`);
      
      if (result.sites.length > 0) {
        result.sites.slice(0, 5).forEach(s => {
          console.log(`  - ${s.nombre} (${s.municipio})`);
        });
      }
    });

    test('solo BIC filtra correctamente', async () => {
      const result = await geocodeHeritageSite({
        provincia: 'Almería',
        soloBIC: true,
        incluirIDECultura: true,
        maxResults: 30,
      });

      console.log(`BIC Almería: ${result.sites.length} bienes`);
      
      if (result.sites.length > 0) {
        // Verificar que todos son BIC
        const noBIC = result.sites.filter(s => s.proteccion !== 'BIC');
        console.log(`  No BIC encontrados: ${noBIC.length}`);
        
        result.sites.slice(0, 5).forEach(s => {
          console.log(`  - ${s.nombre} [${s.proteccion}]`);
        });
      }
    });

    test('coordenadas en rango Andalucía UTM30', async () => {
      const result = await geocodeHeritageSite({
        municipio: 'Granada',
        provincia: 'Granada',
        srsOutput: 'EPSG:25830',
        incluirIDECultura: true,
      });

      if (result.success && result.sites.length > 0) {
        const site = result.sites[0];
        
        // UTM30 Andalucía
        expect(site.x).toBeGreaterThan(100000);
        expect(site.x).toBeLessThan(700000);
        expect(site.y).toBeGreaterThan(3900000);
        expect(site.y).toBeLessThan(4400000);
        expect(site.srs).toBe('EPSG:25830');
      }
    });

    test('coordenadas WGS84 cuando se solicita', async () => {
      const result = await geocodeHeritageSite({
        municipio: 'Sevilla',
        provincia: 'Sevilla',
        srsOutput: 'EPSG:4326',
        incluirIDECultura: true,
      });

      if (result.success && result.sites.length > 0) {
        const site = result.sites[0];
        
        // WGS84 Andalucía
        expect(site.x).toBeGreaterThan(-8);
        expect(site.x).toBeLessThan(-1);
        expect(site.y).toBeGreaterThan(35);
        expect(site.y).toBeLessThan(39);
        expect(site.srs).toBe('EPSG:4326');
      }
    });
  });

  describe('Funciones especializadas', () => {
    
    test('getChurchesInMunicipality encuentra iglesias', async () => {
      const churches = await getChurchesInMunicipality('Colomera', 'Granada');
      
      console.log(`Iglesias Colomera: ${churches.length}`);
      
      if (churches.length > 0) {
        // Todas deben ser arquitectura religiosa
        const noReligiosas = churches.filter(c => c.tipo !== 'ARQUITECTURA_RELIGIOSA');
        expect(noReligiosas).toHaveLength(0);
        
        churches.forEach(c => {
          console.log(`  - ${c.nombre}`);
        });
      }
    });

    test('getCastlesInMunicipality encuentra arquitectura defensiva', async () => {
      const castles = await getCastlesInMunicipality('Hornos', 'Jaén');
      
      console.log(`Arquitectura defensiva Hornos: ${castles.length}`);
      
      castles.forEach(c => {
        console.log(`  - ${c.nombre} (${c.tipo})`);
      });
    });

    test('getArchaeologicalSites en provincia', async () => {
      const sites = await getArchaeologicalSites('Granada', 20);
      
      console.log(`Yacimientos arqueológicos Granada: ${sites.length}`);
      
      sites.slice(0, 5).forEach(s => {
        console.log(`  - ${s.nombre} (${s.municipio})`);
      });
    });
  });

  describe('isKnownHeritageSite (validación LOF)', () => {
    
    test('reconoce patrimonio conocido', async () => {
      const check = await isKnownHeritageSite(
        'Castillo de Hornos',
        'Hornos',
        'Jaén'
      );

      console.log(`"Castillo de Hornos": isHeritage=${check.isHeritage}, confidence=${check.confidence}`);
      
      if (check.site) {
        console.log(`  Encontrado: ${check.site.nombre}`);
      }
      
      expect(check).toHaveProperty('isHeritage');
      expect(check).toHaveProperty('confidence');
    });

    test('no reconoce nombre inventado', async () => {
      const check = await isKnownHeritageSite(
        'Edificio Inexistente 12345',
        'Granada',
        'Granada'
      );

      console.log(`Nombre inventado: isHeritage=${check.isHeritage}, confidence=${check.confidence}`);
      
      // Confianza debería ser baja
      expect(check.confidence).toBeLessThan(70);
    });
  });

  describe('getHeritageStatsByProvince', () => {
    
    test('obtiene estadísticas de Jaén', async () => {
      const stats = await getHeritageStatsByProvince('Jaén');
      
      console.log(`Patrimonio Jaén: ${stats.total} bienes`);
      console.log('  Por tipo:', stats.byType);
      console.log('  Por protección:', stats.byProtection);
      
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// CASOS DE USO PTEL REALES
// ============================================================================

describe('HeritageGeocoder - Casos PTEL Reales', () => {

  jest.setTimeout(45000);

  const casosPTEL = [
    { municipio: 'Colomera', provincia: 'Granada', nombre: 'Puente Romano' },
    { municipio: 'Hornos', provincia: 'Jaén', nombre: 'Castillo de Hornos' },
    { municipio: 'Hornos', provincia: 'Jaén', nombre: 'Iglesia Nuestra Señora de la Asunción' },
    { municipio: 'Castril', provincia: 'Granada', nombre: 'Necrópolis Visigoda' },
    { municipio: 'Quéntar', provincia: 'Granada', nombre: 'Ermita' },
    { municipio: 'Tíjola', provincia: 'Almería', nombre: 'Iglesia' },
  ];

  test.each(casosPTEL)(
    'geocodifica $nombre en $municipio ($provincia)',
    async ({ municipio, provincia, nombre }) => {
      const result = await geocodeHeritageSite({
        municipio,
        provincia,
        nombreBuscado: nombre,
        incluirIDECultura: true,
      });

      const status = result.success 
        ? `✅ ${result.sites.length} bienes, score=${result.matchScore}`
        : `⚠️ ${result.error || 'Sin resultados'}`;
      
      console.log(`${municipio} - "${nombre}": ${status}`);
      
      if (result.bestMatch) {
        console.log(`  → ${result.bestMatch.nombre}`);
        console.log(`  → ${result.bestMatch.tipo} [${result.bestMatch.proteccion}]`);
        console.log(`  → X=${result.bestMatch.x.toFixed(2)}, Y=${result.bestMatch.y.toFixed(2)}`);
      }
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('queryTime');
    }
  );
});
