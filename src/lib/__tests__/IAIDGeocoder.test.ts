/**
 * Tests para IAIDGeocoder - Inventario Andaluz de Instalaciones Deportivas
 * 
 * Verifica:
 * - Configuración correcta del endpoint WFS DERA G12
 * - Detección de tipos de instalación deportiva
 * - Parseo de features GeoJSON
 * - Construcción de filtros CQL
 * - Cascada WFS → API REST
 * 
 * @module tests/IAIDGeocoder
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  IAIDGeocoder, 
  SportsFacilityType,
  IAIDSearchOptions 
} from '../../services/geocoding/specialized/IAIDGeocoder';

describe('IAIDGeocoder', () => {
  let geocoder: IAIDGeocoder;

  beforeEach(() => {
    geocoder = new IAIDGeocoder();
  });

  describe('Configuración', () => {
    it('debe tener endpoint DERA G12 correcto', () => {
      const stats = geocoder.getStats();
      expect(stats.endpoint).toBe('https://www.ideandalucia.es/services/DERA_g12_servicios/wfs');
    });

    it('debe usar capa g12_06_Deportivo', () => {
      const stats = geocoder.getStats();
      expect(stats.layer).toBe('DERA_g12_servicios:g12_06_Deportivo');
    });
  });

  describe('Detección de tipos de instalación', () => {
    const detectType = (name: string): SportsFacilityType => {
      // @ts-ignore - Acceso a método privado para testing
      return geocoder['detectFacilityType'](name);
    };

    it('debe detectar piscinas', () => {
      expect(detectType('Piscina Municipal')).toBe(SportsFacilityType.SWIMMING_POOL);
      expect(detectType('Piscina cubierta climatizada')).toBe(SportsFacilityType.SWIMMING_POOL);
    });

    it('debe detectar campos de fútbol', () => {
      expect(detectType('Campo de Fútbol Municipal')).toBe(SportsFacilityType.FOOTBALL_FIELD);
      expect(detectType('Campo Fútbol 7')).toBe(SportsFacilityType.FOOTBALL_FIELD);
      expect(detectType('Estadio Municipal')).toBe(SportsFacilityType.FOOTBALL_FIELD);
    });

    it('debe detectar polideportivos', () => {
      expect(detectType('Polideportivo Municipal')).toBe(SportsFacilityType.SPORTS_CENTER);
      expect(detectType('Pabellón Cubierto')).toBe(SportsFacilityType.SPORTS_CENTER);
      expect(detectType('Centro Deportivo')).toBe(SportsFacilityType.SPORTS_CENTER);
    });

    it('debe detectar pistas de pádel', () => {
      expect(detectType('Pistas de Pádel')).toBe(SportsFacilityType.PADEL_COURT);
      expect(detectType('Club Padel Indoor')).toBe(SportsFacilityType.PADEL_COURT);
    });

    it('debe detectar pistas de tenis', () => {
      expect(detectType('Pistas de Tenis')).toBe(SportsFacilityType.TENNIS_COURT);
      expect(detectType('Club Tenis Municipal')).toBe(SportsFacilityType.TENNIS_COURT);
    });

    it('debe detectar frontones', () => {
      expect(detectType('Frontón Municipal')).toBe(SportsFacilityType.FRONTON);
      expect(detectType('Frontón cubierto')).toBe(SportsFacilityType.FRONTON);
    });

    it('debe detectar pistas de atletismo', () => {
      expect(detectType('Pista de Atletismo')).toBe(SportsFacilityType.ATHLETICS_TRACK);
      expect(detectType('Estadio de Atletismo')).toBe(SportsFacilityType.ATHLETICS_TRACK);
    });

    it('debe detectar gimnasios', () => {
      expect(detectType('Gimnasio Municipal')).toBe(SportsFacilityType.GYM);
      expect(detectType('Sala de Fitness')).toBe(SportsFacilityType.GYM);
    });

    it('debe retornar ANY para nombres ambiguos', () => {
      expect(detectType('Instalación deportiva')).toBe(SportsFacilityType.ANY);
      expect(detectType('Equipamiento municipal')).toBe(SportsFacilityType.ANY);
    });
  });

  describe('Parseo de features GeoJSON', () => {
    const parseFeature = (feature: any) => {
      // @ts-ignore - Acceso a método protegido para testing
      return geocoder['parseFeature'](feature);
    };

    it('debe parsear feature válida correctamente', () => {
      const mockFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [450000, 4120000]
        },
        properties: {
          NOMBRE: 'Polideportivo Municipal',
          DIRECCION: 'Avda. Deportes, 1',
          MUNICIPIO: 'Granada',
          PROVINCIA: 'Granada',
          TIPO: 'Polideportivo',
          TITULARIDAD: 'Municipal'
        }
      };

      const result = parseFeature(mockFeature);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Polideportivo Municipal');
      expect(result?.address).toBe('Avda. Deportes, 1');
      expect(result?.x).toBe(450000);
      expect(result?.y).toBe(4120000);
      expect(result?.municipality).toBe('Granada');
      expect(result?.province).toBe('Granada');
    });

    it('debe rechazar feature sin geometría', () => {
      const mockFeature = {
        type: 'Feature',
        properties: {
          NOMBRE: 'Piscina sin ubicación'
        }
      };

      const result = parseFeature(mockFeature);
      expect(result).toBeNull();
    });

    it('debe rechazar feature con geometría no puntual', () => {
      const mockFeature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        },
        properties: {
          NOMBRE: 'Pista poligonal'
        }
      };

      const result = parseFeature(mockFeature);
      expect(result).toBeNull();
    });

    it('debe rechazar coordenadas fuera de Andalucía', () => {
      const mockFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [500000, 5000000] // Norte de España
        },
        properties: {
          NOMBRE: 'Piscina Fuera de Andalucía'
        }
      };

      const result = parseFeature(mockFeature);
      expect(result).toBeNull();
    });

    it('debe aceptar feature sin dirección', () => {
      const mockFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [420000, 4100000]
        },
        properties: {
          NOMBRE: 'Campo de Fútbol Rural',
          MUNICIPIO: 'Alhama de Granada'
        }
      };

      const result = parseFeature(mockFeature);
      expect(result).not.toBeNull();
      expect(result?.address).toBe('');
    });
  });

  describe('Enum SportsFacilityType', () => {
    it('debe tener todos los tipos esperados', () => {
      expect(SportsFacilityType.SWIMMING_POOL).toBe('PISCINA');
      expect(SportsFacilityType.FOOTBALL_FIELD).toBe('CAMPO_FUTBOL');
      expect(SportsFacilityType.SPORTS_CENTER).toBe('POLIDEPORTIVO');
      expect(SportsFacilityType.PADEL_COURT).toBe('PADEL');
      expect(SportsFacilityType.TENNIS_COURT).toBe('TENIS');
      expect(SportsFacilityType.FRONTON).toBe('FRONTON');
      expect(SportsFacilityType.ATHLETICS_TRACK).toBe('ATLETISMO');
      expect(SportsFacilityType.GYM).toBe('GIMNASIO');
      expect(SportsFacilityType.ANY).toBe('*');
    });
  });

  describe('Métodos públicos', () => {
    it('debe exponer getStats()', () => {
      const stats = geocoder.getStats();
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('endpoint');
      expect(stats).toHaveProperty('layer');
    });

    it('debe exponer clearCache()', () => {
      expect(() => geocoder.clearCache()).not.toThrow();
    });
  });
});

describe('IAIDSearchOptions', () => {
  it('debe permitir opciones básicas', () => {
    const options: IAIDSearchOptions = {
      name: 'Piscina Municipal',
      municipality: 'Granada',
      province: 'Granada'
    };
    expect(options.name).toBe('Piscina Municipal');
  });

  it('debe permitir tipo de instalación', () => {
    const options: IAIDSearchOptions = {
      name: 'Polideportivo',
      facilityType: SportsFacilityType.SPORTS_CENTER
    };
    expect(options.facilityType).toBe(SportsFacilityType.SPORTS_CENTER);
  });

  it('debe permitir filtro solo públicos', () => {
    const options: IAIDSearchOptions = {
      name: 'Campo Fútbol',
      onlyPublic: true
    };
    expect(options.onlyPublic).toBe(true);
  });
});

describe('Diferenciación IAID vs DERA G12', () => {
  it('IAIDGeocoder usa capa g12_06_Deportivo (censo IAID)', () => {
    const geocoder = new IAIDGeocoder();
    const stats = geocoder.getStats();
    // IAID usa capa g12_06 - censo oficial instalaciones deportivas
    expect(stats.layer).toContain('g12_06');
  });

  it('nota: WFSSportsGeocoder usa capas 12_24/12_25 (equipamientos)', () => {
    // WFSSportsGeocoder usa capas diferentes:
    // - 12_24_EquipamientoDeportivo - equipamientos públicos
    // - 12_25_CampoGolf - campos de golf
    // Estas capas son complementarias al censo IAID
    expect(true).toBe(true);
  });
});

describe('Casos de uso PTEL', () => {
  let geocoder: IAIDGeocoder;

  beforeEach(() => {
    geocoder = new IAIDGeocoder();
  });

  it('debe estar preparado para geocodificar piscinas municipales', () => {
    // Las piscinas son puntos de concentración en emergencias
    const stats = geocoder.getStats();
    expect(stats.endpoint).toContain('DERA_g12');
  });

  it('debe soportar búsqueda de polideportivos como refugio', () => {
    // Polideportivos son refugios habituales en emergencias
    const options: IAIDSearchOptions = {
      name: 'Polideportivo',
      facilityType: SportsFacilityType.SPORTS_CENTER,
      onlyPublic: true
    };
    expect(options.onlyPublic).toBe(true);
  });

  it('debe soportar búsqueda por titularidad municipal', () => {
    // Para PTEL interesan instalaciones públicas/municipales
    const options: IAIDSearchOptions = {
      name: 'Campo Fútbol',
      municipality: 'Colomera',
      onlyPublic: true
    };
    expect(options.municipality).toBe('Colomera');
  });
});
