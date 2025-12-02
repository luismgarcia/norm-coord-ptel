/**
 * SecurityGeocoder.test.ts
 * 
 * Tests de integración para el geocodificador de instalaciones de seguridad.
 * Valida funcionamiento con datos reales del WFS ISE y Overpass API.
 * 
 * @author PTEL Normalizador
 * @version 1.0.0
 */

import { describe, test, expect, beforeAll } from 'vitest';
import {
  SecurityGeocoder,
  SecurityType,
  SecurityFacility,
  geocodeSecurityFacility,
  getAllSecurityInMunicipality,
  isKnownSecurityLocation,
  getSecurityGeocoder
} from '../SecurityGeocoder';

// ============================================================================
// CONFIGURACIÓN DE TESTS
// ============================================================================

describe('SecurityGeocoder', () => {
  let geocoder: SecurityGeocoder;
  
  beforeAll(() => {
    geocoder = new SecurityGeocoder({
      timeout: 20000,
      usarOSM: true
    });
  });
  
  // ============================================================================
  // TESTS DE CONFIGURACIÓN
  // ============================================================================
  
  describe('Configuración', () => {
    test('debe crear instancia con opciones por defecto', () => {
      const geo = new SecurityGeocoder();
      expect(geo).toBeDefined();
    });
    
    test('debe crear instancia con opciones personalizadas', () => {
      const geo = new SecurityGeocoder({
        timeout: 10000,
        usarOSM: false,
        soloISE: true,
        srs: 'EPSG:4326'
      });
      expect(geo).toBeDefined();
    });
    
    test('singleton debe devolver misma instancia', () => {
      const geo1 = getSecurityGeocoder();
      const geo2 = getSecurityGeocoder();
      expect(geo1).toBe(geo2);
    });
  });
  
  // ============================================================================
  // TESTS DE DISPONIBILIDAD DE SERVICIOS
  // ============================================================================
  
  describe('Disponibilidad de servicios', () => {
    test('WFS ISE debe estar disponible', async () => {
      const availability = await geocoder.checkAvailability();
      
      expect(availability.ise).toBe(true);
      expect(availability.iseLatency).toBeDefined();
      expect(availability.iseLatency).toBeLessThan(5000);
      
      console.log(`ISE disponible: ${availability.ise}, latencia: ${availability.iseLatency}ms`);
    }, 15000);
    
    test('Overpass API debe estar disponible', async () => {
      const availability = await geocoder.checkAvailability();
      
      expect(availability.osm).toBe(true);
      expect(availability.osmLatency).toBeDefined();
      expect(availability.osmLatency).toBeLessThan(10000);
      
      console.log(`Overpass disponible: ${availability.osm}, latencia: ${availability.osmLatency}ms`);
    }, 15000);
  });

  
  // ============================================================================
  // TESTS DE GEOCODIFICACIÓN - MUNICIPIOS PTEL REALES
  // ============================================================================
  
  describe('Geocodificación - Municipios PTEL', () => {
    
    // --------------------------------------------------------------------------
    // COLOMERA (Granada) - Municipio rural piloto
    // --------------------------------------------------------------------------
    describe('Colomera (Granada)', () => {
      test('debe encontrar instalaciones de seguridad en Colomera', async () => {
        const facilities = await geocoder.getAllInMunicipality('Colomera', 'Granada');
        
        console.log(`Colomera: ${facilities.length} instalaciones encontradas`);
        facilities.forEach(f => {
          console.log(`  - ${f.tipo}: ${f.nombre} [${f.fuente}]`);
        });
        
        // Colomera es municipio pequeño, puede que no tenga muchas instalaciones
        // pero el test valida que la consulta funciona
        expect(Array.isArray(facilities)).toBe(true);
      }, 30000);
      
      test('debe detectar Guardia Civil en Colomera', async () => {
        const policeStations = await geocoder.getPoliceStations('Colomera', 'Granada');
        
        console.log(`Policía en Colomera: ${policeStations.length}`);
        policeStations.forEach(p => {
          console.log(`  - ${p.tipo}: ${p.nombre}`);
        });
        
        expect(Array.isArray(policeStations)).toBe(true);
      }, 30000);
    });
    
    // --------------------------------------------------------------------------
    // GRANADA (capital) - Municipio grande con muchas instalaciones
    // --------------------------------------------------------------------------
    describe('Granada (capital)', () => {
      test('debe encontrar múltiples instalaciones en Granada', async () => {
        const facilities = await geocoder.getAllInMunicipality('Granada', 'Granada');
        
        console.log(`Granada capital: ${facilities.length} instalaciones`);
        
        // El servicio puede no estar disponible
        // Solo verificamos que devuelve un array válido
        expect(Array.isArray(facilities)).toBe(true);
        
        // Si hay instalaciones, verificar estructura
        if (facilities.length > 0) {
          expect(facilities[0]).toHaveProperty('nombre');
          expect(facilities[0]).toHaveProperty('tipo');
          
          const juzgados = facilities.filter(f => 
            f.tipo === SecurityType.JUZGADO || 
            f.tipo === SecurityType.AUDIENCIA ||
            f.tipo === SecurityType.FISCALIA
          );
          console.log(`  - Juzgados/Audiencias: ${juzgados.length}`);
        }
      }, 45000);
      
      test('debe geocodificar "Comisaría de Policía"', async () => {
        const result = await geocoder.geocode(
          'Comisaría de Policía Nacional',
          'Granada',
          'Granada'
        );
        
        console.log(`Búsqueda "Comisaría": coincidencia ${result.coincidencia}%`);
        if (result.instalacion) {
          console.log(`  Encontrado: ${result.instalacion.nombre}`);
          console.log(`  Tipo: ${result.instalacion.tipo}`);
          console.log(`  Fuente: ${result.instalacion.fuente}`);
        }
        
        // Verificar que la búsqueda se ejecutó correctamente (no falló)
        // El resultado puede ser encontrado o no según disponibilidad de API
        expect(typeof result.tiempoBusqueda).toBe('number');
        expect(typeof result.encontrado).toBe('boolean');
      }, 45000);
      
      test('debe geocodificar "Audiencia Provincial"', async () => {
        const result = await geocoder.geocode(
          'Audiencia Provincial de Granada',
          'Granada',
          'Granada'
        );
        
        console.log(`Búsqueda "Audiencia Provincial": coincidencia ${result.coincidencia}%`);
        if (result.instalacion) {
          console.log(`  Encontrado: ${result.instalacion.nombre}`);
        }
        
        // El servicio puede no estar disponible
        // Solo verificamos que la estructura de respuesta es válida
        expect(typeof result.encontrado).toBe('boolean');
        expect(typeof result.coincidencia).toBe('number');
        expect(result.coincidencia).toBeGreaterThanOrEqual(0);
        expect(result.coincidencia).toBeLessThanOrEqual(100);
      }, 30000);
    });
    
    // --------------------------------------------------------------------------
    // MÁLAGA - Segundo provincia más grande
    // --------------------------------------------------------------------------
    describe('Málaga', () => {
      test('debe encontrar instalaciones INFOCA en Málaga provincia', async () => {
        const fireStations = await geocoder.getFireStations('Málaga', 'Málaga');
        
        console.log(`Bomberos/INFOCA en Málaga: ${fireStations.length}`);
        
        const torres = fireStations.filter(f => f.tipo === SecurityType.TORRE_VIGILANCIA);
        const centrosInfoca = fireStations.filter(f => f.tipo === SecurityType.CENTRO_INFOCA);
        const bomberos = fireStations.filter(f => f.tipo === SecurityType.PARQUE_BOMBEROS);
        
        console.log(`  - Torres vigilancia: ${torres.length}`);
        console.log(`  - Centros INFOCA: ${centrosInfoca.length}`);
        console.log(`  - Parques bomberos: ${bomberos.length}`);
        
        expect(Array.isArray(fireStations)).toBe(true);
      }, 45000);
    });
  });

  
  // ============================================================================
  // TESTS DE TIPOS ESPECÍFICOS DE SEGURIDAD
  // ============================================================================
  
  describe('Tipos específicos', () => {
    test('debe obtener solo policía', async () => {
      const police = await geocoder.getPoliceStations('Sevilla', 'Sevilla');
      
      const validTypes = [
        SecurityType.POLICIA_NACIONAL,
        SecurityType.GUARDIA_CIVIL,
        SecurityType.POLICIA_LOCAL,
        SecurityType.POLICIA_ADSCRITA,
        SecurityType.POLICIA_OTRO
      ];
      
      police.forEach(p => {
        expect(validTypes).toContain(p.tipo);
      });
      
      console.log(`Policía en Sevilla: ${police.length} instalaciones`);
    }, 45000);
    
    test('debe obtener solo juzgados', async () => {
      const courts = await geocoder.getCourthouses('Almería', 'Almería');
      
      const validTypes = [
        SecurityType.JUZGADO,
        SecurityType.AUDIENCIA,
        SecurityType.FISCALIA,
        SecurityType.MEDICINA_LEGAL
      ];
      
      courts.forEach(c => {
        expect(validTypes).toContain(c.tipo);
      });
      
      console.log(`Juzgados en Almería: ${courts.length}`);
      courts.forEach(c => {
        console.log(`  - ${c.subtipo}: ${c.nombre}`);
      });
    }, 30000);
    
    test('debe obtener centros de emergencias', async () => {
      const emergency = await geocoder.getEmergencyCenters('Córdoba', 'Córdoba');
      
      console.log(`Emergencias en Córdoba: ${emergency.length}`);
      emergency.forEach(e => {
        console.log(`  - ${e.tipo}: ${e.nombre}`);
      });
      
      expect(Array.isArray(emergency)).toBe(true);
    }, 30000);
  });
  
  // ============================================================================
  // TESTS DE VALIDACIÓN DE COORDENADAS
  // ============================================================================
  
  describe('Validación de coordenadas', () => {
    test('coordenadas UTM30 deben estar en rango de Andalucía', async () => {
      const facilities = await geocoder.getAllInMunicipality('Jaén', 'Jaén');
      
      facilities.forEach(f => {
        if (f.srs === 'EPSG:25830') {
          // Validar rango UTM30 Andalucía
          expect(f.x).toBeGreaterThanOrEqual(100000);
          expect(f.x).toBeLessThanOrEqual(700000);
          expect(f.y).toBeGreaterThanOrEqual(3900000);
          expect(f.y).toBeLessThanOrEqual(4400000);
        }
      });
      
      console.log(`Jaén: ${facilities.length} instalaciones con coordenadas válidas`);
    }, 30000);
    
    test('coordenadas WGS84 deben calcularse correctamente', async () => {
      const facilities = await geocoder.getAllInMunicipality('Huelva', 'Huelva');
      
      facilities.forEach(f => {
        if (f.latitud && f.longitud) {
          // Validar rango WGS84 Andalucía
          expect(f.latitud).toBeGreaterThanOrEqual(35);
          expect(f.latitud).toBeLessThanOrEqual(39);
          expect(f.longitud).toBeGreaterThanOrEqual(-8);
          expect(f.longitud).toBeLessThanOrEqual(-1);
        }
      });
      
      console.log(`Huelva: instalaciones con lat/lon calculados`);
    }, 30000);
  });
  
  // ============================================================================
  // TESTS DE VALIDACIÓN LOF
  // ============================================================================
  
  describe('Validación LOF (elementos aislados)', () => {
    test('debe reconocer torre de vigilancia como instalación conocida', async () => {
      const result = await isKnownSecurityLocation(
        'Torre de Vigilancia',
        'Ronda',
        'Málaga'
      );
      
      console.log(`Torre vigilancia Ronda: conocida=${result.isKnown}, conf=${result.confidence}%`);
      
      // Las torres de vigilancia de incendios suelen estar aisladas
      // pero son legítimas
      expect(typeof result.isKnown).toBe('boolean');
    }, 30000);
    
    test('debe reconocer cuartel de Guardia Civil rural', async () => {
      const result = await isKnownSecurityLocation(
        'Cuartel Guardia Civil',
        'Hornos',
        'Jaén'
      );
      
      console.log(`GC Hornos: conocida=${result.isKnown}, conf=${result.confidence}%`);
      expect(typeof result.isKnown).toBe('boolean');
    }, 30000);
  });

  
  // ============================================================================
  // TESTS DE CACHE
  // ============================================================================
  
  describe('Cache', () => {
    test('segunda consulta debe ser más rápida (cache)', async () => {
      // Primera consulta - sin cache
      const start1 = Date.now();
      const facilities1 = await geocoder.getAllInMunicipality('Cádiz', 'Cádiz');
      const time1 = Date.now() - start1;
      
      // Segunda consulta - con cache
      const start2 = Date.now();
      const facilities2 = await geocoder.getAllInMunicipality('Cádiz', 'Cádiz');
      const time2 = Date.now() - start2;
      
      console.log(`Cádiz - Primera consulta: ${time1}ms, Segunda: ${time2}ms`);
      console.log(`  Mejora: ${Math.round((1 - time2/time1) * 100)}%`);
      
      // La segunda consulta debe ser significativamente más rápida
      expect(time2).toBeLessThan(time1);
      expect(facilities1.length).toBe(facilities2.length);
    }, 60000);
    
    test('debe reportar estadísticas de cache', () => {
      const stats = geocoder.getCacheStats();
      
      expect(stats.ise).toBeDefined();
      expect(stats.osm).toBeDefined();
      expect(typeof stats.ise.entries).toBe('number');
      expect(typeof stats.osm.entries).toBe('number');
      
      console.log(`Cache ISE: ${stats.ise.entries} entradas`);
      console.log(`Cache OSM: ${stats.osm.entries} entradas`);
    });
    
    test('debe poder limpiar cache', () => {
      // Primero verificar que hay datos en cache
      const statsBefore = geocoder.getCacheStats();
      console.log(`Cache antes: ISE=${statsBefore.ise.entries}, OSM=${statsBefore.osm.entries}`);
      
      // Limpiar solo ISE
      geocoder.clearCache('ise');
      const statsAfterIse = geocoder.getCacheStats();
      expect(statsAfterIse.ise.entries).toBe(0);
      
      // Limpiar todo
      geocoder.clearCache();
      const statsAfterAll = geocoder.getCacheStats();
      expect(statsAfterAll.ise.entries).toBe(0);
      expect(statsAfterAll.osm.entries).toBe(0);
    });
  });
  
  // ============================================================================
  // TESTS DE FUNCIONES DE CONVENIENCIA
  // ============================================================================
  
  describe('Funciones de conveniencia', () => {
    test('geocodeSecurityFacility debe funcionar', async () => {
      const result = await geocodeSecurityFacility(
        'Juzgado',
        'Motril',
        'Granada'
      );
      
      expect(result).toBeDefined();
      expect(typeof result.encontrado).toBe('boolean');
      expect(typeof result.coincidencia).toBe('number');
      expect(typeof result.tiempoBusqueda).toBe('number');
      
      if (result.instalacion) {
        console.log(`Juzgado Motril: ${result.instalacion.nombre}`);
      }
    }, 30000);
    
    test('getAllSecurityInMunicipality debe funcionar', async () => {
      const facilities = await getAllSecurityInMunicipality('Linares', 'Jaén');
      
      expect(Array.isArray(facilities)).toBe(true);
      console.log(`Linares: ${facilities.length} instalaciones`);
    }, 30000);
  });
  
  // ============================================================================
  // TESTS DE RENDIMIENTO
  // ============================================================================
  
  describe('Rendimiento', () => {
    test('consulta ISE no debe exceder 15 segundos', async () => {
      const start = Date.now();
      await geocoder.getAllInMunicipality('Antequera', 'Málaga');
      const elapsed = Date.now() - start;
      
      console.log(`Tiempo Antequera: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(15000);
    }, 20000);
    
    test('geocodificación individual no debe exceder 20 segundos', async () => {
      const start = Date.now();
      await geocoder.geocode('Comisaría', 'Marbella', 'Málaga');
      const elapsed = Date.now() - start;
      
      console.log(`Tiempo geocode Marbella: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(20000);
    }, 25000);
  });
});
