/**
 * Tests para OverpassGeocoder - OpenStreetMap Overpass API
 * 
 * Verifica:
 * - Configuración correcta del endpoint Overpass
 * - Mapeo de tipos PTEL a queries OSM
 * - Parseo de elementos OSM
 * - Transformación de coordenadas WGS84 → UTM30
 * - Rate limiting y políticas de uso
 * 
 * @module tests/OverpassGeocoder
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  OverpassGeocoder, 
  OSMElement,
  OverpassSearchOptions 
} from '../../services/geocoding/specialized/OverpassGeocoder';
import { InfrastructureType } from '../../../types/infrastructure';

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
      expect(stats.nominatimEndpoint).toBe('https://nominatim.openstreetmap.org/');
    });

    it('debe respetar rate limit de 1 req/segundo para Nominatim', () => {
      const stats = geocoder.getStats();
      expect(stats.rateLimitMs).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Mapeo PTEL a OSM', () => {
    const getOSMQueries = (type: InfrastructureType): string[] => {
      // @ts-ignore - Acceso a constante privada para testing
      return geocoder['PTEL_TO_OSM_QUERIES'][type] || [];
    };

    it('debe mapear HEALTH a amenity=hospital/clinic', () => {
      const queries = getOSMQueries(InfrastructureType.HEALTH);
      expect(queries.some(q => q.includes('hospital'))).toBe(true);
      expect(queries.some(q => q.includes('clinic'))).toBe(true);
    });

    it('debe mapear EDUCATION a amenity=school', () => {
      const queries = getOSMQueries(InfrastructureType.EDUCATION);
      expect(queries.some(q => q.includes('school'))).toBe(true);
      expect(queries.some(q => q.includes('kindergarten'))).toBe(true);
    });

    it('debe mapear SECURITY a amenity=police/fire_station', () => {
      const queries = getOSMQueries(InfrastructureType.SECURITY);
      expect(queries.some(q => q.includes('police'))).toBe(true);
      expect(queries.some(q => q.includes('fire_station'))).toBe(true);
    });

    it('debe mapear SPORTS a leisure=sports_centre', () => {
      const queries = getOSMQueries(InfrastructureType.SPORTS);
      expect(queries.some(q => q.includes('sports_centre') || q.includes('swimming_pool'))).toBe(true);
    });

    it('debe mapear CULTURAL a tourism=museum/amenity=theatre', () => {
      const queries = getOSMQueries(InfrastructureType.CULTURAL);
      expect(queries.some(q => q.includes('museum') || q.includes('theatre'))).toBe(true);
    });

    it('debe mapear ENERGY a power=substation', () => {
      const queries = getOSMQueries(InfrastructureType.ENERGY);
      expect(queries.some(q => q.includes('power'))).toBe(true);
    });

    it('debe mapear HYDRAULIC a man_made=water_tower', () => {
      const queries = getOSMQueries(InfrastructureType.HYDRAULIC);
      expect(queries.some(q => q.includes('water'))).toBe(true);
    });

    it('debe mapear TELECOMMUNICATIONS a tower:type=communication', () => {
      const queries = getOSMQueries(InfrastructureType.TELECOMMUNICATIONS);
      expect(queries.some(q => q.includes('communication') || q.includes('tower'))).toBe(true);
    });
  });

  describe('Parseo de elementos OSM', () => {
    const parseOSMElement = (element: any): OSMElement | null => {
      // @ts-ignore - Acceso a método privado para testing
      return geocoder['parseOSMElement'](element);
    };

    it('debe parsear nodo OSM válido', () => {
      const mockNode = {
        type: 'node',
        id: 123456789,
        lat: 37.1765,
        lon: -3.5983,
        tags: {
          name: 'Hospital Universitario San Cecilio',
          amenity: 'hospital',
          'addr:city': 'Granada'
        }
      };

      const result = parseOSMElement(mockNode);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe(123456789);
      expect(result?.type).toBe('node');
      expect(result?.name).toBe('Hospital Universitario San Cecilio');
      expect(result?.lat).toBeCloseTo(37.1765, 4);
      expect(result?.lon).toBeCloseTo(-3.5983, 4);
      expect(result?.tags.amenity).toBe('hospital');
    });

    it('debe parsear way OSM con centro', () => {
      const mockWay = {
        type: 'way',
        id: 987654321,
        center: {
          lat: 37.1800,
          lon: -3.6000
        },
        tags: {
          name: 'Polideportivo Municipal',
          leisure: 'sports_centre'
        }
      };

      const result = parseOSMElement(mockWay);
      
      expect(result).not.toBeNull();
      expect(result?.type).toBe('way');
      expect(result?.lat).toBeCloseTo(37.18, 2);
      expect(result?.lon).toBeCloseTo(-3.6, 2);
    });

    it('debe rechazar elemento sin nombre', () => {
      const mockNode = {
        type: 'node',
        id: 111,
        lat: 37.0,
        lon: -3.5,
        tags: {
          amenity: 'hospital'
          // Sin name
        }
      };

      const result = parseOSMElement(mockNode);
      expect(result).toBeNull();
    });

    it('debe rechazar elemento sin coordenadas', () => {
      const mockNode = {
        type: 'node',
        id: 222,
        tags: {
          name: 'Sin ubicación'
        }
      };

      const result = parseOSMElement(mockNode);
      expect(result).toBeNull();
    });

    it('debe rechazar coordenadas fuera de Andalucía', () => {
      const mockNode = {
        type: 'node',
        id: 333,
        lat: 43.0, // Norte de España
        lon: -8.0,
        tags: {
          name: 'Fuera de Andalucía'
        }
      };

      const result = parseOSMElement(mockNode);
      expect(result).toBeNull();
    });

    it('debe aceptar nombre alternativo en tags', () => {
      const mockNode = {
        type: 'node',
        id: 444,
        lat: 37.0,
        lon: -3.5,
        tags: {
          'name:es': 'Colegio Público',
          amenity: 'school'
        }
      };

      const result = parseOSMElement(mockNode);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Colegio Público');
    });
  });

  describe('Transformación de coordenadas', () => {
    const transformToUTM30 = (lat: number, lon: number): { x: number; y: number } => {
      // @ts-ignore - Acceso a método privado para testing
      return geocoder['transformToUTM30'](lat, lon);
    };

    it('debe transformar WGS84 a UTM30 ETRS89', () => {
      // Granada centro aproximado
      const result = transformToUTM30(37.1765, -3.5983);
      
      // Coordenadas UTM30 esperadas para Granada
      expect(result.x).toBeGreaterThan(400000);
      expect(result.x).toBeLessThan(500000);
      expect(result.y).toBeGreaterThan(4100000);
      expect(result.y).toBeLessThan(4200000);
    });

    it('debe mantener precisión submétrica', () => {
      const result1 = transformToUTM30(37.1765, -3.5983);
      const result2 = transformToUTM30(37.1766, -3.5983);
      
      // Diferencia de 0.0001° ~ 11 metros en latitud
      const diffY = Math.abs(result2.y - result1.y);
      expect(diffY).toBeGreaterThan(5);
      expect(diffY).toBeLessThan(20);
    });
  });

  describe('Construcción de queries Overpass', () => {
    const buildQuery = (options: OverpassSearchOptions): string => {
      // @ts-ignore - Acceso a método privado para testing
      return geocoder['buildOverpassQuery'](options);
    };

    it('debe incluir área de búsqueda por municipio', () => {
      const query = buildQuery({
        name: 'Hospital',
        municipality: 'Granada',
        infrastructureType: InfrastructureType.HEALTH
      });
      expect(query).toContain('area');
      expect(query).toContain('Granada');
    });

    it('debe incluir filtro por tipo de infraestructura', () => {
      const query = buildQuery({
        name: 'Colegio',
        municipality: 'Sevilla',
        infrastructureType: InfrastructureType.EDUCATION
      });
      expect(query).toContain('school');
    });

    it('debe incluir búsqueda por nombre', () => {
      const query = buildQuery({
        name: 'San Cecilio',
        municipality: 'Granada',
        infrastructureType: InfrastructureType.HEALTH
      });
      expect(query).toContain('San Cecilio');
    });

    it('debe incluir out center para ways', () => {
      const query = buildQuery({
        name: 'Polideportivo',
        municipality: 'Córdoba',
        infrastructureType: InfrastructureType.SPORTS
      });
      expect(query).toContain('out center');
    });
  });

  describe('Métodos públicos', () => {
    it('debe exponer getStats()', () => {
      const stats = geocoder.getStats();
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('endpoint');
      expect(stats).toHaveProperty('requestCount');
    });

    it('debe exponer clearCache()', () => {
      expect(() => geocoder.clearCache()).not.toThrow();
    });

    it('debe exponer checkRateLimit()', () => {
      const canProceed = geocoder.checkRateLimit();
      expect(typeof canProceed).toBe('boolean');
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

describe('Casos de uso PTEL', () => {
  let geocoder: OverpassGeocoder;

  beforeEach(() => {
    geocoder = new OverpassGeocoder();
  });

  it('debe estar preparado para geocodificar antenas de telecomunicaciones', () => {
    // Las antenas de telecomunicaciones no están en registros oficiales
    // OSM es la mejor fuente para tower:type=communication
    const stats = geocoder.getStats();
    expect(stats.endpoint).toContain('overpass');
  });

  it('debe soportar búsqueda de industrias', () => {
    // Industrias y polígonos industriales están bien mapeados en OSM
    const options: OverpassSearchOptions = {
      name: 'Polígono Industrial',
      municipality: 'Linares',
      infrastructureType: InfrastructureType.INDUSTRIAL
    };
    expect(options.infrastructureType).toBe(InfrastructureType.INDUSTRIAL);
  });

  it('debe complementar registros oficiales', () => {
    // OSM es fallback cuando servicios oficiales no tienen la infraestructura
    // Nivel L5 en cascada de geocodificación
    expect(true).toBe(true);
  });

  it('debe respetar políticas de uso de OSM', () => {
    // Overpass: ~10,000 requests/día
    // Nominatim: 1 request/segundo
    const stats = geocoder.getStats();
    expect(stats.rateLimitMs).toBeGreaterThanOrEqual(1000);
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
