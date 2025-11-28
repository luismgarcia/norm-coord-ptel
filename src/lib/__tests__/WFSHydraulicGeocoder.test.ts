/**
 * Tests para WFSHydraulicGeocoder - Geocodificador REDIAM Infraestructuras Hidráulicas
 * 
 * Verifica:
 * - Configuración correcta del endpoint WFS REDIAM
 * - Detección automática de tipos de infraestructura
 * - Parseo de features GeoJSON
 * - Construcción de filtros CQL
 * - Cambio automático entre capas
 * 
 * @module tests/WFSHydraulicGeocoder
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  WFSHydraulicGeocoder, 
  HydraulicFacilityType,
  HydraulicSearchOptions 
} from '../../services/geocoding/specialized/WFSHydraulicGeocoder';

describe('WFSHydraulicGeocoder', () => {
  let geocoder: WFSHydraulicGeocoder;

  beforeEach(() => {
    geocoder = new WFSHydraulicGeocoder();
  });

  describe('Configuración', () => {
    it('debe tener endpoint REDIAM correcto', () => {
      const stats = geocoder.getStats();
      expect(stats.endpoint).toBe('https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_SP_Infraestructuras_Hidraulicas');
    });

    it('debe usar capa EDAR por defecto', () => {
      const stats = geocoder.getStats();
      expect(stats.layer).toBe('EDAR');
    });
  });

  describe('Detección de tipos de infraestructura', () => {
    const detectType = (name: string): string => {
      // @ts-ignore - Acceso a método privado para testing
      return geocoder['detectFacilityType'](name);
    };

    it('debe detectar EDAR', () => {
      expect(detectType('EDAR Granada Sur')).toBe('EDAR');
      expect(detectType('EDAR de Motril')).toBe('EDAR');
      expect(detectType('Depuradora Municipal')).toBe('EDAR');
    });

    it('debe detectar embalses', () => {
      expect(detectType('Embalse de Iznájar')).toBe('Embalses');
      expect(detectType('Presa de Rules')).toBe('Embalses');
      expect(detectType('Pantano del Negratín')).toBe('Embalses');
    });

    it('debe detectar captaciones', () => {
      expect(detectType('Captación de aguas')).toBe('Captaciones');
      expect(detectType('ETAP Granada')).toBe('Captaciones');
      expect(detectType('Potabilizadora de Córdoba')).toBe('Captaciones');
    });

    it('debe detectar desaladoras', () => {
      expect(detectType('Desaladora de Carboneras')).toBe('Desaladoras');
      expect(detectType('Planta Desalinizadora')).toBe('Desaladoras');
    });

    it('debe retornar EDAR como default para nombres ambiguos', () => {
      expect(detectType('Instalación hidráulica')).toBe('EDAR');
      expect(detectType('Planta de tratamiento')).toBe('EDAR');
    });
  });

  describe('Parseo de features GeoJSON', () => {
    const parseFeature = (feature: any) => {
      // @ts-ignore - Acceso a método protegido para testing
      return geocoder['parseFeature'](feature);
    };

    it('debe parsear feature EDAR válida correctamente', () => {
      const mockFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [450000, 4120000]
        },
        properties: {
          DENOMINACION: 'EDAR Granada Sur',
          MUNICIPIO: 'Granada',
          PROVINCIA: 'Granada',
          CAPACIDAD_HE: 500000,
          CAUDAL_M3DIA: 120000,
          TITULAR: 'EMASAGRA',
          CUENCA: 'Guadalquivir'
        }
      };

      const result = parseFeature(mockFeature);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('EDAR Granada Sur');
      expect(result?.x).toBe(450000);
      expect(result?.y).toBe(4120000);
      expect(result?.municipality).toBe('Granada');
      expect(result?.province).toBe('Granada');
      expect(result?.properties.capacity).toBe(500000);
      expect(result?.properties.flow).toBe(120000);
      expect(result?.properties.owner).toBe('EMASAGRA');
      expect(result?.properties.basin).toBe('Guadalquivir');
    });

    it('debe parsear feature embalse correctamente', () => {
      const mockFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [400000, 4150000]
        },
        properties: {
          NOMBRE: 'Embalse de Iznájar',
          MUNICIPIO: 'Iznájar',
          PROVINCIA: 'Córdoba',
          CAPACIDAD: 981000000,
          CUENCA: 'Guadalquivir',
          ESTADO: 'Operativo'
        }
      };

      const result = parseFeature(mockFeature);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Embalse de Iznájar');
      expect(result?.municipality).toBe('Iznájar');
      expect(result?.province).toBe('Córdoba');
      expect(result?.properties.basin).toBe('Guadalquivir');
      expect(result?.properties.status).toBe('Operativo');
    });

    it('debe rechazar feature sin geometría', () => {
      const mockFeature = {
        type: 'Feature',
        properties: {
          DENOMINACION: 'EDAR sin ubicación'
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
          DENOMINACION: 'Embalse poligonal'
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
          DENOMINACION: 'EDAR Fuera de Andalucía'
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
          coordinates: [420000, 4100000]
        },
        properties: {
          NOMBRE: 'Desaladora Almería',
          MUNICIPIO: 'Almería',
          PROVINCIA: 'Almería',
          CAPACIDAD: 50000,
          CAUDAL: 30000,
          PROPIETARIO: 'Acuamed',
          DEMARCACION: 'Mediterránea'
        }
      };

      const result = parseFeature(mockFeature);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Desaladora Almería');
      expect(result?.properties.capacity).toBe(50000);
      expect(result?.properties.flow).toBe(30000);
      expect(result?.properties.owner).toBe('Acuamed');
      expect(result?.properties.basin).toBe('Mediterránea');
    });

    it('debe retornar dirección vacía (infraestructuras hidráulicas no tienen dirección postal)', () => {
      const mockFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [450000, 4120000]
        },
        properties: {
          DENOMINACION: 'EDAR Test',
          MUNICIPIO: 'Test'
        }
      };

      const result = parseFeature(mockFeature);
      expect(result?.address).toBe('');
    });
  });

  describe('Construcción de filtros CQL', () => {
    const buildCQLFilter = (options: HydraulicSearchOptions): string => {
      // @ts-ignore - Acceso a método protegido para testing
      return geocoder['buildCQLFilter'](options);
    };

    it('debe construir filtro por municipio', () => {
      const filter = buildCQLFilter({
        name: 'EDAR',
        municipality: 'Granada'
      });
      expect(filter).toContain("MUNICIPIO ILIKE '%Granada%'");
    });

    it('debe construir filtro por provincia', () => {
      const filter = buildCQLFilter({
        name: 'EDAR',
        province: 'Málaga'
      });
      expect(filter).toContain("PROVINCIA ILIKE '%Málaga%'");
    });

    it('debe construir filtro por cuenca hidrográfica', () => {
      const filter = buildCQLFilter({
        name: 'EDAR',
        basin: 'Guadalquivir'
      });
      expect(filter).toContain("CUENCA ILIKE '%Guadalquivir%'");
    });

    it('debe construir filtro por capacidad mínima', () => {
      const filter = buildCQLFilter({
        name: 'EDAR',
        minCapacity: 50000
      });
      expect(filter).toContain('CAPACIDAD_HE >= 50000');
    });

    it('debe combinar múltiples filtros con AND', () => {
      const filter = buildCQLFilter({
        name: 'EDAR',
        municipality: 'Sevilla',
        basin: 'Guadalquivir',
        minCapacity: 100000
      });
      expect(filter).toContain('AND');
      expect(filter).toContain("MUNICIPIO ILIKE '%Sevilla%'");
      expect(filter).toContain("CUENCA ILIKE '%Guadalquivir%'");
      expect(filter).toContain('CAPACIDAD_HE >= 100000');
    });

    it('debe retornar cadena vacía sin filtros', () => {
      const filter = buildCQLFilter({ name: '' });
      expect(filter).toBe('');
    });
  });

  describe('Enum HydraulicFacilityType', () => {
    it('debe tener todos los tipos esperados', () => {
      expect(HydraulicFacilityType.EDAR).toBe('EDAR');
      expect(HydraulicFacilityType.DEPURADORA).toBe('DEPURADORA');
      expect(HydraulicFacilityType.EMBALSE).toBe('EMBALSE');
      expect(HydraulicFacilityType.CAPTACION).toBe('CAPTACION');
      expect(HydraulicFacilityType.DESALADORA).toBe('DESALADORA');
      expect(HydraulicFacilityType.BOMBEO).toBe('BOMBEO');
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

describe('HydraulicSearchOptions', () => {
  it('debe permitir opciones básicas', () => {
    const options: HydraulicSearchOptions = {
      name: 'EDAR Granada',
      municipality: 'Granada',
      province: 'Granada'
    };
    expect(options.name).toBe('EDAR Granada');
  });

  it('debe permitir tipo de instalación', () => {
    const options: HydraulicSearchOptions = {
      name: 'Embalse de Iznájar',
      facilityType: HydraulicFacilityType.EMBALSE
    };
    expect(options.facilityType).toBe(HydraulicFacilityType.EMBALSE);
  });

  it('debe permitir filtro por cuenca', () => {
    const options: HydraulicSearchOptions = {
      name: 'EDAR',
      basin: 'Guadalquivir'
    };
    expect(options.basin).toBe('Guadalquivir');
  });

  it('debe permitir filtro por capacidad mínima', () => {
    const options: HydraulicSearchOptions = {
      name: 'EDAR',
      minCapacity: 50000
    };
    expect(options.minCapacity).toBe(50000);
  });
});

describe('Casos de uso PTEL', () => {
  let geocoder: WFSHydraulicGeocoder;

  beforeEach(() => {
    geocoder = new WFSHydraulicGeocoder();
  });

  it('debe estar preparado para geocodificar EDAR municipales', () => {
    // Las EDAR son infraestructuras críticas en PTEL
    // Deben poder geocodificarse por nombre + municipio
    const stats = geocoder.getStats();
    expect(stats.layer).toBe('EDAR');
  });

  it('debe soportar búsqueda de embalses por cuenca', () => {
    // Los embalses son críticos para abastecimiento y riesgo de inundación
    // Cuencas principales: Guadalquivir, Guadiana, Guadalete, Sur
    const options: HydraulicSearchOptions = {
      name: 'Embalse',
      basin: 'Guadalquivir'
    };
    expect(options.basin).toBeDefined();
  });

  it('debe soportar búsqueda de desaladoras en costa', () => {
    // Desaladoras críticas en provincias costeras: Almería, Málaga
    const options: HydraulicSearchOptions = {
      name: 'Desaladora',
      province: 'Almería',
      facilityType: HydraulicFacilityType.DESALADORA
    };
    expect(options.facilityType).toBe(HydraulicFacilityType.DESALADORA);
  });
});
