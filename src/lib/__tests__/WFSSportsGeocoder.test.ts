/**
 * Tests para WFSSportsGeocoder - Geocodificador DERA G12 Deportes
 * 
 * Verifica:
 * - Configuración correcta del endpoint WFS
 * - Detección automática de tipos de instalación
 * - Parseo de features GeoJSON
 * - Extracción de palabras clave
 * - Cambio automático entre capas (deportes/golf)
 * 
 * @module tests/WFSSportsGeocoder
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  WFSSportsGeocoder, 
  DERASportsFacilityType,
  SportsSearchOptions 
} from '../../services/geocoding/specialized/WFSSportsGeocoder';

describe('WFSSportsGeocoder', () => {
  let geocoder: WFSSportsGeocoder;

  beforeEach(() => {
    geocoder = new WFSSportsGeocoder();
  });

  describe('Configuración', () => {
    it('debe tener endpoint DERA G12 correcto', () => {
      const stats = geocoder.getStats();
      expect(stats.endpoint).toBe('https://www.ideandalucia.es/services/DERA_g12_servicios/wfs');
    });

    it('debe usar capa 12_24_EquipamientoDeportivo por defecto', () => {
      const stats = geocoder.getStats();
      expect(stats.layer).toBe('DERA_g12_servicios:12_24_EquipamientoDeportivo');
    });
  });

  describe('Detección de tipos de instalación', () => {
    // Acceder al método privado para testing
    const detectType = (name: string): DERASportsFacilityType => {
      // @ts-ignore - Acceso a método privado para testing
      return geocoder['detectFacilityType'](name);
    };

    it('debe detectar polideportivos', () => {
      expect(detectType('Polideportivo Municipal')).toBe(DERASportsFacilityType.POLIDEPORTIVO);
      expect(detectType('POLIDEPORTIVO CUBIERTO')).toBe(DERASportsFacilityType.POLIDEPORTIVO);
    });

    it('debe detectar pabellones', () => {
      expect(detectType('Pabellón Deportivo')).toBe(DERASportsFacilityType.PABELLON);
      expect(detectType('Pabellon Municipal')).toBe(DERASportsFacilityType.PABELLON);
    });

    it('debe detectar campos de fútbol', () => {
      expect(detectType('Campo de Fútbol Municipal')).toBe(DERASportsFacilityType.CAMPO_FUTBOL);
      expect(detectType('Estadio Municipal de Futbol')).toBe(DERASportsFacilityType.CAMPO_FUTBOL);
    });

    it('debe detectar estadios grandes (sin "municipal")', () => {
      expect(detectType('Estadio Los Cármenes')).toBe(DERASportsFacilityType.ESTADIO);
      expect(detectType('Estadio Nuevo Arcángel')).toBe(DERASportsFacilityType.ESTADIO);
    });

    it('debe detectar piscinas', () => {
      expect(detectType('Piscina Municipal')).toBe(DERASportsFacilityType.PISCINA);
      expect(detectType('Piscina Cubierta Climatizada')).toBe(DERASportsFacilityType.PISCINA);
    });

    it('debe detectar pistas de tenis/pádel', () => {
      expect(detectType('Pistas de Tenis')).toBe(DERASportsFacilityType.PISTA_RAQUETA);
      expect(detectType('Club de Pádel')).toBe(DERASportsFacilityType.PISTA_RAQUETA);
      expect(detectType('Centro de Padel')).toBe(DERASportsFacilityType.PISTA_RAQUETA);
    });

    it('debe detectar frontones', () => {
      expect(detectType('Frontón Municipal')).toBe(DERASportsFacilityType.FRONTON);
      expect(detectType('Fronton Cubierto')).toBe(DERASportsFacilityType.FRONTON);
    });

    it('debe detectar campos de golf', () => {
      expect(detectType('Campo de Golf La Cala')).toBe(DERASportsFacilityType.CAMPO_GOLF);
      expect(detectType('Golf Club Marbella')).toBe(DERASportsFacilityType.CAMPO_GOLF);
    });

    it('debe detectar centros deportivos', () => {
      expect(detectType('Centro Deportivo Municipal')).toBe(DERASportsFacilityType.CENTRO_DEPORTIVO);
      expect(detectType('Complejo Deportivo')).toBe(DERASportsFacilityType.CENTRO_DEPORTIVO);
    });

    it('debe retornar GENERICO para nombres ambiguos', () => {
      expect(detectType('Instalación Municipal')).toBe(DERASportsFacilityType.GENERICO);
      expect(detectType('Zona Deportiva')).toBe(DERASportsFacilityType.GENERICO);
    });
  });

  describe('Extracción de palabras clave', () => {
    const extractKeywords = (name: string): string[] => {
      // @ts-ignore - Acceso a método privado para testing
      return geocoder['extractKeywords'](name);
    };

    it('debe extraer palabras significativas', () => {
      const keywords = extractKeywords('Polideportivo Municipal de Granada');
      expect(keywords).toContain('polideportivo');
      expect(keywords).toContain('granada');
      // 'municipal' y 'de' son stopwords
      expect(keywords).not.toContain('municipal');
      expect(keywords).not.toContain('de');
    });

    it('debe normalizar acentos', () => {
      const keywords = extractKeywords('Pabellón Olímpico');
      expect(keywords).toContain('pabellon');
      expect(keywords).toContain('olimpico');
    });

    it('debe limitar a 3 palabras clave', () => {
      const keywords = extractKeywords('Centro Deportivo Cubierto Climatizado Moderno Ampliado');
      expect(keywords.length).toBeLessThanOrEqual(3);
    });

    it('debe filtrar palabras cortas', () => {
      const keywords = extractKeywords('El Pabellón de la Ciudad');
      expect(keywords).not.toContain('el');
      expect(keywords).not.toContain('de');
      expect(keywords).not.toContain('la');
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
          OBJECTID: 1234,
          NOMBRE: 'Polideportivo Municipal',
          TIPO: 'Polideportivo',
          MUNICIPIO: 'Colomera',
          PROVINCIA: 'Granada',
          COD_MUN: '18051',
          COD_PROV: '18'
        }
      };

      const result = parseFeature(mockFeature);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Polideportivo Municipal');
      expect(result?.x).toBe(450000);
      expect(result?.y).toBe(4120000);
      expect(result?.municipality).toBe('Colomera');
      expect(result?.province).toBe('Granada');
      expect(result?.properties.tipo).toBe('Polideportivo');
      expect(result?.properties.codMun).toBe('18051');
    });

    it('debe rechazar feature sin geometría', () => {
      const mockFeature = {
        type: 'Feature',
        properties: {
          NOMBRE: 'Piscina Municipal'
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
          NOMBRE: 'Campo de Fútbol'
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
          coordinates: [500000, 5000000] // Fuera de rango UTM30 Andalucía
        },
        properties: {
          OBJECTID: 9999,
          NOMBRE: 'Instalación Falsa'
        }
      };

      const result = parseFeature(mockFeature);
      expect(result).toBeNull();
    });

    it('debe rechazar feature sin nombre', () => {
      const mockFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [450000, 4120000]
        },
        properties: {
          OBJECTID: 5678,
          TIPO: 'Piscina'
        }
      };

      const result = parseFeature(mockFeature);
      expect(result).toBeNull();
    });

    it('debe manejar campos con nombres alternativos', () => {
      const mockFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [450000, 4120000]
        },
        properties: {
          OBJECTID: 1111,
          DENOMINACION: 'Pabellón Cubierto', // Nombre alternativo
          municipio: 'Granada',  // lowercase
          provincia: 'Granada'
        }
      };

      const result = parseFeature(mockFeature);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Pabellón Cubierto');
      expect(result?.municipality).toBe('Granada');
    });
  });

  describe('Conversión de tipos a valores WFS', () => {
    const getFacilityTypeValue = (type: DERASportsFacilityType): string => {
      // @ts-ignore - Acceso a método privado para testing
      return geocoder['getFacilityTypeValue'](type);
    };

    it('debe convertir tipos correctamente', () => {
      expect(getFacilityTypeValue(DERASportsFacilityType.POLIDEPORTIVO)).toBe('Polideportivo');
      expect(getFacilityTypeValue(DERASportsFacilityType.PISCINA)).toBe('Piscina');
      expect(getFacilityTypeValue(DERASportsFacilityType.CAMPO_FUTBOL)).toBe('Fútbol');
      expect(getFacilityTypeValue(DERASportsFacilityType.CAMPO_GOLF)).toBe('Golf');
      expect(getFacilityTypeValue(DERASportsFacilityType.GENERICO)).toBe('');
    });
  });

  describe('Enum DERASportsFacilityType', () => {
    it('debe tener todos los tipos esperados', () => {
      expect(DERASportsFacilityType.POLIDEPORTIVO).toBe('POLIDEPORTIVO');
      expect(DERASportsFacilityType.PABELLON).toBe('PABELLON');
      expect(DERASportsFacilityType.CAMPO_FUTBOL).toBe('CAMPO_FUTBOL');
      expect(DERASportsFacilityType.PISTA_ATLETISMO).toBe('PISTA_ATLETISMO');
      expect(DERASportsFacilityType.PISCINA).toBe('PISCINA');
      expect(DERASportsFacilityType.PISTA_RAQUETA).toBe('PISTA_RAQUETA');
      expect(DERASportsFacilityType.FRONTON).toBe('FRONTON');
      expect(DERASportsFacilityType.ESTADIO).toBe('ESTADIO');
      expect(DERASportsFacilityType.CENTRO_DEPORTIVO).toBe('CENTRO_DEPORTIVO');
      expect(DERASportsFacilityType.CAMPO_GOLF).toBe('CAMPO_GOLF');
      expect(DERASportsFacilityType.GENERICO).toBe('GENERICO');
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

describe('SportsSearchOptions', () => {
  it('debe permitir opciones básicas', () => {
    const options: SportsSearchOptions = {
      name: 'Polideportivo',
      municipality: 'Granada',
      province: 'Granada'
    };
    expect(options.name).toBe('Polideportivo');
  });

  it('debe permitir tipo de instalación', () => {
    const options: SportsSearchOptions = {
      name: 'Piscina Municipal',
      facilityType: DERASportsFacilityType.PISCINA
    };
    expect(options.facilityType).toBe(DERASportsFacilityType.PISCINA);
  });

  it('debe permitir incluir golf', () => {
    const options: SportsSearchOptions = {
      name: 'Campo de Golf',
      includeGolf: true
    };
    expect(options.includeGolf).toBe(true);
  });
});
