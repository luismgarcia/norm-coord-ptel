/**
 * LocalDataService.test.ts - F021 Fase 2
 * 
 * Tests unitarios y de integración para el servicio de datos locales DERA
 * 
 * ESTRATEGIA DE TESTS:
 * - Tests unitarios: Usan injectTestData con fixtures pequeños
 * - Tests de integración (marcados .skip): Requieren servidor HTTP
 * 
 * @version 1.0.0
 * @date 2025-12-03
 */

import {
  loadLocalData,
  isDataLoaded,
  getLoadStats,
  searchLocal,
  searchHealthLocal,
  searchEducationLocal,
  searchSecurityLocal,
  searchMunicipalLocal,
  searchEnergyLocal,
  getFeaturesByMunicipio,
  getFeatureCountByMunicipio,
  listMunicipiosConDatos,
  toGeocodingResult,
  geocodeWithLocalFallback,
  clearLocalData,
  injectTestData,
  // F023 Fase 1.1 - Métodos Singleton
  countByType,
  getUniqueByType,
  TYPOLOGY_TO_CATEGORY,
  type LocalFeature,
  type LocalSearchResult,
  type InfrastructureCategory,
} from '../LocalDataService';

// ============================================================================
// FIXTURES DE TEST
// ============================================================================

const createTestFeature = (
  overrides: Partial<LocalFeature> = {}
): LocalFeature => ({
  id: 'test-1',
  nombre: 'Centro de Salud Test',
  tipo: 'Centro de Salud',
  direccion: 'Calle Test 1',
  localidad: 'Granada',
  codMun: '18087',
  municipio: 'Granada',
  provincia: 'Granada',
  x: 446123.45,
  y: 4114567.89,
  categoria: 'health',
  ...overrides,
});

const HEALTH_FIXTURES: LocalFeature[] = [
  createTestFeature({ id: 'h1', nombre: 'Centro de Salud Añora', codMun: '14006', municipio: 'Añora', provincia: 'Córdoba', x: 334450.01, y: 4253003.16 }),
  createTestFeature({ id: 'h2', nombre: 'Centro de Salud Antas', codMun: '04016', municipio: 'Antas', provincia: 'Almería', x: 595817.01, y: 4122452.79 }),
  createTestFeature({ id: 'h3', nombre: 'Hospital Virgen de las Nieves', tipo: 'Hospital', codMun: '18087', municipio: 'Granada', provincia: 'Granada', x: 446500.00, y: 4115000.00 }),
  createTestFeature({ id: 'h4', nombre: 'Centro de Salud Zaidín', codMun: '18087', municipio: 'Granada', provincia: 'Granada', x: 447000.00, y: 4113500.00 }),
];

const EDUCATION_FIXTURES: LocalFeature[] = [
  createTestFeature({ id: 'e1', nombre: 'CEIP Reina Isabel', tipo: 'Colegio Público', categoria: 'education', codMun: '18036', municipio: 'Cájar', provincia: 'Granada', x: 449172.06, y: 4109909.82 }),
  createTestFeature({ id: 'e2', nombre: 'IES Zaidín-Vergeles', tipo: 'Instituto', categoria: 'education', codMun: '18087', municipio: 'Granada', provincia: 'Granada', x: 447200.00, y: 4113800.00 }),
  createTestFeature({ id: 'e3', nombre: 'Colegio San José', tipo: 'Colegio Privado', categoria: 'education', codMun: '41091', municipio: 'Sevilla', provincia: 'Sevilla', x: 235500.00, y: 4142000.00 }),
];

const SECURITY_FIXTURES: LocalFeature[] = [
  createTestFeature({ id: 's1', nombre: 'Policía Local Serón', tipo: 'Policía Local', categoria: 'security', codMun: '04083', municipio: 'Serón', provincia: 'Almería', x: 543524.24, y: 4133096.40 }),
  createTestFeature({ id: 's2', nombre: 'Comisaría Granada Centro', tipo: 'Policía Nacional', categoria: 'security', codMun: '18087', municipio: 'Granada', provincia: 'Granada', x: 446800.00, y: 4114200.00 }),
];

const MUNICIPAL_FIXTURES: LocalFeature[] = [
  createTestFeature({ id: 'm1', nombre: 'Ayuntamiento de Granada', tipo: 'Ayuntamiento', categoria: 'municipal', codMun: '18087', municipio: 'Granada', provincia: 'Granada', x: 446700.00, y: 4114100.00 }),
  createTestFeature({ id: 'm2', nombre: 'Ayuntamiento de Sevilla', tipo: 'Ayuntamiento', categoria: 'municipal', codMun: '41091', municipio: 'Sevilla', provincia: 'Sevilla', x: 235400.00, y: 4141900.00 }),
];

const ENERGY_FIXTURES: LocalFeature[] = [
  createTestFeature({ id: 'en1', nombre: 'Parque Eólico Sierra Nevada', tipo: 'Parque Eólico', categoria: 'energy', codMun: '18087', municipio: 'Granada', provincia: 'Granada', x: 470000.00, y: 4100000.00 }),
];

function injectAllTestData(): void {
  const data = new Map<InfrastructureCategory, LocalFeature[]>();
  data.set('health', HEALTH_FIXTURES);
  data.set('education', EDUCATION_FIXTURES);
  data.set('security', SECURITY_FIXTURES);
  data.set('municipal', MUNICIPAL_FIXTURES);
  data.set('energy', ENERGY_FIXTURES);
  injectTestData(data);
}

// ============================================================================
// SETUP Y TEARDOWN
// ============================================================================

beforeEach(() => {
  clearLocalData();
});

afterAll(() => {
  clearLocalData();
});

// ============================================================================
// TESTS UNITARIOS - Con fixtures inyectados
// ============================================================================

describe('LocalDataService - Unit Tests', () => {
  
  describe('Estado inicial', () => {
    test('isDataLoaded retorna false inicialmente', () => {
      expect(isDataLoaded()).toBe(false);
    });

    test('getLoadStats retorna null antes de cargar', () => {
      expect(getLoadStats()).toBeNull();
    });
  });

  describe('injectTestData', () => {
    test('inyecta datos correctamente', () => {
      injectAllTestData();
      
      expect(isDataLoaded()).toBe(true);
      const stats = getLoadStats();
      expect(stats).not.toBeNull();
      expect(stats!.totalFeatures).toBe(12); // 4+3+2+2+1=12
      expect(stats!.byCategory.health).toBe(4);
      expect(stats!.byCategory.education).toBe(3);
      expect(stats!.byCategory.security).toBe(2);
      expect(stats!.byCategory.municipal).toBe(2);
      expect(stats!.byCategory.energy).toBe(1);
    });

    test('indexa municipios correctamente', () => {
      injectAllTestData();
      
      const stats = getLoadStats();
      // Granada (18087), Añora (14006), Antas (04016), Cájar (18036), Serón (04083), Sevilla (41091)
      expect(stats!.municipiosIndexados).toBe(6);
    });
  });

  describe('toGeocodingResult', () => {
    test('convierte LocalFeature a GeocodingResult correctamente', () => {
      const feature = createTestFeature();
      const result = toGeocodingResult(feature, 85);

      expect(result.x).toBe(446123.45);
      expect(result.y).toBe(4114567.89);
      expect(result.confidence).toBe(0.85);
      expect(result.source).toBe('LOCAL_DERA_HEALTH');
      expect(result.matchedName).toBe('Centro de Salud Test');
      expect(result.crs).toBe('EPSG:25830');
    });

    test('maneja score de 0 correctamente', () => {
      const result = toGeocodingResult(createTestFeature(), 0);
      expect(result.confidence).toBe(0);
    });

    test('maneja score de 100 correctamente', () => {
      const result = toGeocodingResult(createTestFeature(), 100);
      expect(result.confidence).toBe(1);
    });
  });
});

// ============================================================================
// TESTS DE BÚSQUEDA
// ============================================================================

describe('LocalDataService - Search Tests', () => {
  beforeEach(() => {
    injectAllTestData();
  });

  describe('searchLocal - Búsqueda general', () => {
    test('encuentra centro de salud por nombre exacto', async () => {
      const result = await searchLocal({
        nombre: 'Añora',
        categorias: ['health'],
      });

      expect(result.success).toBe(true);
      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch!.nombre).toContain('Añora');
      expect(result.matchScore).toBeGreaterThan(70);
    });

    test('encuentra centro educativo con fuzzy matching', async () => {
      const result = await searchLocal({
        nombre: 'Reina Isabel',
        categorias: ['education'],
      });

      expect(result.success).toBe(true);
      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch!.categoria).toBe('education');
    });

    test('filtra por código de municipio correctamente', async () => {
      const result = await searchLocal({
        nombre: 'Policía',
        codMun: '04083', // Serón
        categorias: ['security'],
      });

      expect(result.success).toBe(true);
      expect(result.bestMatch).not.toBeNull();
      expect(result.bestMatch!.codMun).toBe('04083');
    });

    test('filtra por nombre de municipio', async () => {
      const result = await searchLocal({
        nombre: 'Centro de Salud',
        municipio: 'Granada',
        categorias: ['health'],
      });

      expect(result.success).toBe(true);
      expect(result.features.every(f => 
        f.municipio.toLowerCase().includes('granada')
      )).toBe(true);
    });

    test('filtra por provincia', async () => {
      const result = await searchLocal({
        nombre: 'Colegio',
        provincia: 'Sevilla',
        categorias: ['education'],
      });

      expect(result.success).toBe(true);
      expect(result.features.every(f => 
        f.provincia.toLowerCase().includes('sevilla')
      )).toBe(true);
    });

    test('respeta maxResults', async () => {
      const result = await searchLocal({
        nombre: 'Centro',
        maxResults: 2,
      });

      expect(result.features.length).toBeLessThanOrEqual(2);
    });

    test('retorna totalSearched correcto', async () => {
      const result = await searchLocal({
        nombre: 'Test',
        codMun: '18087',
        categorias: ['health'],
      });

      // Granada tiene 2 centros de salud en fixtures
      expect(result.totalSearched).toBe(2);
    });

    test('busca en todas las categorías por defecto', async () => {
      const result = await searchLocal({
        nombre: 'Granada',
      });

      expect(result.totalSearched).toBe(12); // Todos los fixtures
    });
  });
});

// ============================================================================
// TESTS DE UTILIDADES
// ============================================================================

describe('LocalDataService - Utility Tests', () => {
  beforeEach(() => {
    injectAllTestData();
  });

  describe('getFeaturesByMunicipio', () => {
    test('obtiene todas las features de un municipio', async () => {
      const features = await getFeaturesByMunicipio('18087'); // Granada
      // Granada tiene: 2 health + 1 education + 1 security + 1 municipal + 1 energy = 6
      expect(features.length).toBe(6);
    });

    test('filtra por categorías específicas', async () => {
      const features = await getFeaturesByMunicipio('18087', ['health']);
      expect(features.length).toBe(2);
      expect(features.every(f => f.categoria === 'health')).toBe(true);
    });

    test('retorna array vacío para municipio inexistente', async () => {
      const features = await getFeaturesByMunicipio('99999');
      expect(features).toEqual([]);
    });
  });

  describe('getFeatureCountByMunicipio', () => {
    test('cuenta features por categoría', async () => {
      const counts = await getFeatureCountByMunicipio('18087');
      expect(counts.health).toBe(2);
      expect(counts.education).toBe(1);
      expect(counts.security).toBe(1);
      expect(counts.municipal).toBe(1);
      expect(counts.energy).toBe(1);
    });
  });

  describe('listMunicipiosConDatos', () => {
    test('lista todos los municipios indexados', async () => {
      const municipios = await listMunicipiosConDatos();
      expect(municipios.length).toBe(6);
      expect(municipios).toContain('18087');
      expect(municipios).toContain('41091');
    });
  });
});

// ============================================================================
// TESTS DE INTEGRACIÓN CON GEOCODING CASCADE
// ============================================================================

describe('LocalDataService - Cascade Integration', () => {
  beforeEach(() => {
    injectAllTestData();
  });

  describe('geocodeWithLocalFallback', () => {
    test('usa resultado local cuando hay match bueno', async () => {
      const result = await geocodeWithLocalFallback(
        'Hospital Virgen de las Nieves',
        ['health'],
        'Granada',
        '18087'
      );

      expect(result).not.toBeNull();
      expect(result!.source).toContain('LOCAL_DERA');
      expect(result!.crs).toBe('EPSG:25830');
    });

    test('ejecuta fallback cuando no hay match local', async () => {
      const fallbackCalled = { value: false };
      
      const result = await geocodeWithLocalFallback(
        'Infraestructura Inexistente XYZ123',
        ['health'],
        'Granada',
        '18087',
        async () => {
          fallbackCalled.value = true;
          return { x: 100, y: 200, source: 'fallback', confidence: 0.8 };
        }
      );

      expect(fallbackCalled.value).toBe(true);
    });
  });
});

// ============================================================================
// F023 FASE 1.1 - TESTS MÉTODOS SINGLETON
// ============================================================================

describe('LocalDataService - F023 Singleton Methods', () => {
  beforeEach(() => {
    injectAllTestData();
  });

  describe('TYPOLOGY_TO_CATEGORY mapping', () => {
    test('mapea HEALTH correctamente', () => {
      expect(TYPOLOGY_TO_CATEGORY['HEALTH']).toBe('health');
      expect(TYPOLOGY_TO_CATEGORY['SANITARIO']).toBe('health');
    });

    test('mapea EDUCATION correctamente', () => {
      expect(TYPOLOGY_TO_CATEGORY['EDUCATION']).toBe('education');
      expect(TYPOLOGY_TO_CATEGORY['EDUCATIVO']).toBe('education');
    });

    test('mapea SECURITY correctamente', () => {
      expect(TYPOLOGY_TO_CATEGORY['SECURITY']).toBe('security');
      expect(TYPOLOGY_TO_CATEGORY['POLICIAL']).toBe('security');
      expect(TYPOLOGY_TO_CATEGORY['BOMBEROS']).toBe('security');
    });

    test('tipologías sin datos locales retornan null', () => {
      expect(TYPOLOGY_TO_CATEGORY['CULTURAL']).toBeNull();
      expect(TYPOLOGY_TO_CATEGORY['DEPORTIVO']).toBeNull();
      expect(TYPOLOGY_TO_CATEGORY['RELIGIOSO']).toBeNull();
    });
  });

  describe('countByType', () => {
    test('cuenta centros de salud en Granada (2)', async () => {
      const count = await countByType('HEALTH', '18087');
      expect(count).toBe(2); // Hospital + Centro Salud Zaidín
    });

    test('cuenta centros de salud en Añora (1) - singleton', async () => {
      const count = await countByType('HEALTH', '14006');
      expect(count).toBe(1);
    });

    test('cuenta educación en Sevilla (1)', async () => {
      const count = await countByType('EDUCATION', '41091');
      expect(count).toBe(1);
    });

    test('retorna 0 para municipio inexistente', async () => {
      const count = await countByType('HEALTH', '99999');
      expect(count).toBe(0);
    });

    test('retorna 0 para tipología sin datos locales', async () => {
      const count = await countByType('CULTURAL', '18087');
      expect(count).toBe(0);
    });

    test('acepta tipología en minúsculas', async () => {
      const count = await countByType('health', '14006');
      expect(count).toBe(1);
    });

    test('normaliza código municipio (4 dígitos -> 5)', async () => {
      // '4016' debería normalizarse a '04016' (Antas)
      const count = await countByType('HEALTH', '4016');
      expect(count).toBe(1);
    });
  });

  describe('getUniqueByType', () => {
    test('retorna feature único para singleton (Añora health)', async () => {
      const feature = await getUniqueByType('HEALTH', '14006');
      expect(feature).not.toBeNull();
      expect(feature!.nombre).toContain('Añora');
      expect(feature!.categoria).toBe('health');
    });

    test('retorna null para múltiples (Granada health = 2)', async () => {
      const feature = await getUniqueByType('HEALTH', '18087');
      expect(feature).toBeNull(); // Tiene 2 centros
    });

    test('retorna null para cero features', async () => {
      const feature = await getUniqueByType('HEALTH', '99999');
      expect(feature).toBeNull();
    });

    test('retorna null para tipología sin datos locales', async () => {
      const feature = await getUniqueByType('CULTURAL', '18087');
      expect(feature).toBeNull();
    });

    test('retorna feature único para Sevilla municipal', async () => {
      const feature = await getUniqueByType('MUNICIPAL', '41091');
      expect(feature).not.toBeNull();
      expect(feature!.nombre).toContain('Sevilla');
    });

    test('retorna feature único para Serón seguridad', async () => {
      const feature = await getUniqueByType('SECURITY', '04083');
      expect(feature).not.toBeNull();
      expect(feature!.nombre).toContain('Serón');
    });

    test('acepta tipología en español (SANITARIO)', async () => {
      const feature = await getUniqueByType('SANITARIO', '14006');
      expect(feature).not.toBeNull();
    });
  });

  describe('Integración con estrategia singleton', () => {
    test('flujo completo: detectar singleton y obtener feature', async () => {
      const codMun = '14006'; // Añora
      const tipologia = 'HEALTH';

      // 1. Contar
      const count = await countByType(tipologia, codMun);
      expect(count).toBe(1);

      // 2. Si es singleton, obtener directamente
      if (count === 1) {
        const feature = await getUniqueByType(tipologia, codMun);
        expect(feature).not.toBeNull();
        expect(feature!.x).toBeGreaterThan(0);
        expect(feature!.y).toBeGreaterThan(0);
      }
    });

    test('flujo completo: detectar múltiples y requerir desambiguación', async () => {
      const codMun = '18087'; // Granada
      const tipologia = 'HEALTH';

      // 1. Contar
      const count = await countByType(tipologia, codMun);
      expect(count).toBe(2);

      // 2. Si hay múltiples, getUniqueByType retorna null
      if (count >= 2) {
        const feature = await getUniqueByType(tipologia, codMun);
        expect(feature).toBeNull(); // Requiere desambiguación fuzzy
      }
    });
  });
});
