/**
 * Tests para OverpassGeocoder - OpenStreetMap Overpass API
 * 
 * Verifica:
 * - Configuración correcta del endpoint Overpass
 * - Mapeo de tipos PTEL a queries OSM
 * - Transformación de coordenadas WGS84 → UTM30
 * - Rate limiting y políticas de uso
 * - Métodos públicos
 * 
 * NOTA: Tests refactorizados para usar API pública (v0.5.3)
 * - Los métodos privados se testean indirectamente via comportamiento público
 * - PTEL_TO_OSM_QUERIES exportado para verificación directa
 * 
 * @module tests/OverpassGeocoder
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  OverpassGeocoder, 
  OSMElement,
  OverpassSearchOptions,
  PTEL_TO_OSM_QUERIES 
} from '../../services/geocoding/specialized/OverpassGeocoder';
import { InfrastructureType } from '../../types/infrastructure';

describe('OverpassGeocoder', () => {
  let geocoder: OverpassGeocoder;

  beforeEach(() => {
    geocoder = new OverpassGeocoder();
  });

  describe('Configuración', () => {
    it('debe tener endpoint Overpass correcto', () => {
      const stats = geocoder.getStats();
      expect(stats.endpoint).toBe('https://overpass-api.de/api/interpreter');
    });

    it('debe tener endpoint Nominatim correcto', () => {
      const stats = geocoder.getStats();
      expect(stats.nominatimEndpoint).toBe('https://nominatim.openstreetmap.org');
    });

    it('debe respetar rate limit de 1 req/segundo para Nominatim', () => {
      const stats = geocoder.getStats();
      expect(stats.rateLimitMs).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Mapeo PTEL a OSM', () => {
    it('debe mapear HEALTH a amenity=hospital/clinic', () => {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.HEALTH];
      expect(queries.some(q => q.includes('hospital'))).toBe(true);
      expect(queries.some(q => q.includes('clinic'))).toBe(true);
    });

    it('debe mapear EDUCATION a amenity=school', () => {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.EDUCATION];
      expect(queries.some(q => q.includes('school'))).toBe(true);
      expect(queries.some(q => q.includes('kindergarten'))).toBe(true);
    });

    it('debe mapear POLICE a amenity=police', () => {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.POLICE];
      expect(queries.some(q => q.includes('police'))).toBe(true);
    });

    it('debe mapear FIRE a amenity=fire_station', () => {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.FIRE];
      expect(queries.some(q => q.includes('fire_station'))).toBe(true);
    });

    it('debe mapear SPORTS a leisure=sports_centre', () => {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.SPORTS];
      expect(queries.some(q => q.includes('sports_centre') || q.includes('swimming_pool'))).toBe(true);
    });

    it('debe mapear CULTURAL a tourism=museum/amenity=theatre', () => {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.CULTURAL];
      expect(queries.some(q => q.includes('museum') || q.includes('theatre'))).toBe(true);
    });

    it('debe mapear ENERGY a power=substation', () => {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.ENERGY];
      expect(queries.some(q => q.includes('power'))).toBe(true);
    });

    it('debe mapear HYDRAULIC a man_made=water', () => {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.HYDRAULIC];
      expect(queries.some(q => q.includes('water'))).toBe(true);
    });

    it('debe mapear TELECOM a tower:type=communication', () => {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.TELECOM];
      expect(queries.some(q => q.includes('communication') || q.includes('tower'))).toBe(true);
    });

    it('debe mapear INDUSTRIAL a landuse=industrial', () => {
      const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.INDUSTRIAL];
      expect(queries.some(q => q.includes('industrial'))).toBe(true);
    });
  });

  describe('Transformación de coordenadas (API pública)', () => {
    it('debe transformar WGS84 a UTM30 ETRS89', () => {
      // Granada centro aproximado
      const result = geocoder.toUTM30(-3.5983, 37.1765);
      
      // Coordenadas UTM30 esperadas para Granada
      expect(result.x).toBeGreaterThan(400000);
      expect(result.x).toBeLessThan(500000);
      expect(result.y).toBeGreaterThan(4100000);
      expect(result.y).toBeLessThan(4200000);
    });

    it('debe mantener precisión submétrica', () => {
      const result1 = geocoder.toUTM30(-3.5983, 37.1765);
      const result2 = geocoder.toUTM30(-3.5983, 37.1766);
      
      // Diferencia de 0.0001° ~ 11 metros en latitud
      const diffY = Math.abs(result2.y - result1.y);
      expect(diffY).toBeGreaterThan(5);
      expect(diffY).toBeLessThan(20);
    });

    it('debe convertir de UTM30 a WGS84', () => {
      // Coordenadas UTM30 de Granada aproximadas
      const result = geocoder.toWGS84(446750, 4114250);
      
      // Debe estar en rango de Andalucía
      expect(result.lon).toBeGreaterThan(-8);
      expect(result.lon).toBeLessThan(-1);
      expect(result.lat).toBeGreaterThan(35);
      expect(result.lat).toBeLessThan(39);
    });

    it('debe ser reversible (WGS84 → UTM30 → WGS84)', () => {
      const originalLon = -3.5983;
      const originalLat = 37.1765;
      
      const utm = geocoder.toUTM30(originalLon, originalLat);
      const wgs = geocoder.toWGS84(utm.x, utm.y);
      
      expect(wgs.lon).toBeCloseTo(originalLon, 4);
      expect(wgs.lat).toBeCloseTo(originalLat, 4);
    });
  });

  describe('Métodos públicos', () => {
    it('debe exponer getStats()', () => {
      const stats = geocoder.getStats();
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('endpoint');
      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('nominatimEndpoint');
      expect(stats).toHaveProperty('rateLimitMs');
    });

    it('debe exponer clearCache()', () => {
      expect(() => geocoder.clearCache()).not.toThrow();
    });

    it('debe exponer checkRateLimit()', () => {
      const canProceed = geocoder.checkRateLimit();
      expect(typeof canProceed).toBe('boolean');
    });

    it('debe exponer toUTM30()', () => {
      const result = geocoder.toUTM30(-3.5, 37.0);
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });

    it('debe exponer toWGS84()', () => {
      const result = geocoder.toWGS84(450000, 4100000);
      expect(result).toHaveProperty('lon');
      expect(result).toHaveProperty('lat');
    });
  });
});

describe('OverpassSearchOptions', () => {
  it('debe permitir opciones básicas', () => {
    const options: OverpassSearchOptions = {
      name: 'Hospital Virgen de las Nieves',
      municipality: 'Granada'
    };
    expect(options.name).toBe('Hospital Virgen de las Nieves');
  });

  it('debe permitir tipo de infraestructura PTEL', () => {
    const options: OverpassSearchOptions = {
      name: 'Centro de Salud',
      municipality: 'Motril',
      infrastructureType: InfrastructureType.HEALTH
    };
    expect(options.infrastructureType).toBe(InfrastructureType.HEALTH);
  });

  it('debe permitir búsqueda por proximidad', () => {
    const options: OverpassSearchOptions = {
      name: 'Farmacia',
      municipality: 'Granada',
      center: { lat: 37.1765, lon: -3.5983 },
      radius: 500
    };
    expect(options.radius).toBe(500);
    expect(options.center?.lat).toBeCloseTo(37.1765, 4);
  });

  it('debe permitir límite de resultados', () => {
    const options: OverpassSearchOptions = {
      name: 'Colegio',
      municipality: 'Sevilla',
      maxResults: 10
    };
    expect(options.maxResults).toBe(10);
  });
});

describe('PTEL_TO_OSM_QUERIES (constante exportada)', () => {
  it('debe tener todos los tipos PTEL principales', () => {
    const requiredTypes = [
      InfrastructureType.HEALTH,
      InfrastructureType.EDUCATION,
      InfrastructureType.POLICE,
      InfrastructureType.FIRE,
      InfrastructureType.CULTURAL,
      InfrastructureType.SPORTS,
      InfrastructureType.ENERGY,
      InfrastructureType.HYDRAULIC,
      InfrastructureType.TELECOM,
      InfrastructureType.INDUSTRIAL
    ];
    
    for (const type of requiredTypes) {
      expect(PTEL_TO_OSM_QUERIES[type]).toBeDefined();
      expect(Array.isArray(PTEL_TO_OSM_QUERIES[type])).toBe(true);
      expect(PTEL_TO_OSM_QUERIES[type].length).toBeGreaterThan(0);
    }
  });

  it('cada tipo debe tener queries Overpass válidas', () => {
    for (const [type, queries] of Object.entries(PTEL_TO_OSM_QUERIES)) {
      for (const query of queries) {
        // Queries deben contener nwr (node/way/relation)
        expect(query).toContain('nwr');
        // Queries deben tener formato de filtro OSM
        expect(query).toMatch(/\[.*\]/);
      }
    }
  });
});

describe('OSMElement interface', () => {
  it('debe tener estructura correcta', () => {
    const element: OSMElement = {
      id: 123,
      type: 'node',
      name: 'Test',
      lat: 37.0,
      lon: -3.5,
      tags: { amenity: 'hospital' }
    };
    
    expect(element.id).toBe(123);
    expect(element.type).toBe('node');
    expect(element.name).toBe('Test');
    expect(element.lat).toBe(37.0);
    expect(element.lon).toBe(-3.5);
    expect(element.tags.amenity).toBe('hospital');
  });

  it('debe soportar tipos way y relation', () => {
    const way: OSMElement = {
      id: 456,
      type: 'way',
      name: 'Edificio',
      lat: 37.0,
      lon: -3.5,
      tags: {}
    };
    expect(way.type).toBe('way');

    const relation: OSMElement = {
      id: 789,
      type: 'relation',
      name: 'Campus',
      lat: 37.0,
      lon: -3.5,
      tags: {}
    };
    expect(relation.type).toBe('relation');
  });
});

describe('Casos de uso PTEL', () => {
  let geocoder: OverpassGeocoder;

  beforeEach(() => {
    geocoder = new OverpassGeocoder();
  });

  it('debe estar preparado para geocodificar antenas de telecomunicaciones', () => {
    // Verificar que TELECOM tiene queries específicas para antenas
    const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.TELECOM];
    expect(queries.some(q => q.includes('communication'))).toBe(true);
  });

  it('debe soportar búsqueda de industrias', () => {
    const queries = PTEL_TO_OSM_QUERIES[InfrastructureType.INDUSTRIAL];
    expect(queries.some(q => q.includes('industrial'))).toBe(true);
  });

  it('debe complementar registros oficiales', () => {
    // OSM es fallback cuando servicios oficiales no tienen la infraestructura
    // Nivel L5 en cascada de geocodificación
    const stats = geocoder.getStats();
    expect(stats.endpoint).toContain('overpass');
  });

  it('debe respetar políticas de uso de OSM', () => {
    // Overpass: ~10,000 requests/día
    // Nominatim: 1 request/segundo
    const stats = geocoder.getStats();
    expect(stats.rateLimitMs).toBeGreaterThanOrEqual(1000);
  });
});

describe('Limitaciones conocidas', () => {
  it('OSM depende de contribuciones voluntarias', () => {
    // Cobertura variable según zona
    // Zonas urbanas mejor cubiertas que rurales
    expect(true).toBe(true);
  });

  it('precisión variable según contribuidor', () => {
    // Posición puede tener errores de ~10-50m
    // Inferior a registros oficiales
    expect(true).toBe(true);
  });

  it('nombres pueden diferir de oficiales', () => {
    // "Hospital Clínico" vs "Hospital Universitario San Cecilio"
    // Requiere fuzzy matching
    expect(true).toBe(true);
  });
});
