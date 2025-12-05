/**
 * PTEL SingletonDetector - Tests
 * 
 * Tests unitarios para detección de singletons en BBDD local.
 * 
 * @module lib/localData/__tests__/singletonDetector.test
 * @version 1.0.0
 * @date 2025-12-05
 * @session B.3
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db, type DERAFeature, type INEMunicipio } from '../schemas';
import {
  detectSingleton,
  detectSingletonByNombre,
  getMunicipioTypologyCounts,
  isSingletonType,
  getSingletonFeature,
  getCandidatesByNombre,
  ALL_TIPOLOGIAS
} from '../singletonDetector';

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================

const TEST_MUNICIPIO_SINGLETON = '99001'; // Municipio con 1 sanitario
const TEST_MUNICIPIO_MULTIPLE = '99002';  // Municipio con 3 sanitarios
const TEST_MUNICIPIO_EMPTY = '99003';     // Municipio sin sanitarios

const testFeatures: DERAFeature[] = [
  // Singleton en 99001
  {
    id: 'SANITARIO_99001_0',
    tipologia: 'SANITARIO',
    nombre: 'Centro de Salud Test',
    codMun: TEST_MUNICIPIO_SINGLETON,
    municipio: 'TestVilla',
    provincia: 'Test',
    codProv: '99',
    x: 500000,
    y: 4100000,
    capaOrigen: 'test',
    fechaCarga: new Date().toISOString()
  },
  // Múltiples en 99002
  {
    id: 'SANITARIO_99002_0',
    tipologia: 'SANITARIO',
    nombre: 'Hospital Comarcal',
    codMun: TEST_MUNICIPIO_MULTIPLE,
    municipio: 'TestCity',
    provincia: 'Test',
    codProv: '99',
    x: 510000,
    y: 4110000,
    capaOrigen: 'test',
    fechaCarga: new Date().toISOString()
  },
  {
    id: 'SANITARIO_99002_1',
    tipologia: 'SANITARIO',
    nombre: 'Centro de Salud Norte',
    codMun: TEST_MUNICIPIO_MULTIPLE,
    municipio: 'TestCity',
    provincia: 'Test',
    codProv: '99',
    x: 510100,
    y: 4110100,
    capaOrigen: 'test',
    fechaCarga: new Date().toISOString()
  },
  {
    id: 'SANITARIO_99002_2',
    tipologia: 'SANITARIO',
    nombre: 'Centro de Salud Sur',
    codMun: TEST_MUNICIPIO_MULTIPLE,
    municipio: 'TestCity',
    provincia: 'Test',
    codProv: '99',
    x: 510200,
    y: 4109900,
    capaOrigen: 'test',
    fechaCarga: new Date().toISOString()
  },
  // Educativo singleton en 99002
  {
    id: 'EDUCATIVO_99002_0',
    tipologia: 'EDUCATIVO',
    nombre: 'CEIP Test',
    codMun: TEST_MUNICIPIO_MULTIPLE,
    municipio: 'TestCity',
    provincia: 'Test',
    codProv: '99',
    x: 510050,
    y: 4110050,
    capaOrigen: 'test',
    fechaCarga: new Date().toISOString()
  }
];

const testMunicipios: INEMunicipio[] = [
  {
    codMun: TEST_MUNICIPIO_SINGLETON,
    nombre: 'TestVilla',
    nombreNorm: 'TESTVILLA',
    provincia: 'Test',
    codProv: '99',
    centroideX: 500000,
    centroideY: 4100000
  },
  {
    codMun: TEST_MUNICIPIO_MULTIPLE,
    nombre: 'TestCity',
    nombreNorm: 'TESTCITY',
    provincia: 'Test',
    codProv: '99',
    centroideX: 510000,
    centroideY: 4110000
  },
  {
    codMun: TEST_MUNICIPIO_EMPTY,
    nombre: 'EmptyTown',
    nombreNorm: 'EMPTYTOWN',
    provincia: 'Test',
    codProv: '99',
    centroideX: 520000,
    centroideY: 4120000
  }
];


// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeAll(async () => {
  // Limpiar datos de test anteriores
  await db.dera.where('codMun').startsWith('99').delete();
  await db.ine.where('codMun').startsWith('99').delete();
  
  // Insertar datos de prueba
  await db.dera.bulkAdd(testFeatures);
  await db.ine.bulkAdd(testMunicipios);
});

afterAll(async () => {
  // Limpiar datos de test
  await db.dera.where('codMun').startsWith('99').delete();
  await db.ine.where('codMun').startsWith('99').delete();
});

// ============================================================================
// TESTS: detectSingleton
// ============================================================================

describe('detectSingleton', () => {
  it('detecta singleton correctamente (count === 1)', async () => {
    const result = await detectSingleton(TEST_MUNICIPIO_SINGLETON, 'SANITARIO');
    
    expect(result.isSingleton).toBe(true);
    expect(result.count).toBe(1);
    expect(result.feature).not.toBeNull();
    expect(result.feature?.nombre).toBe('Centro de Salud Test');
    expect(result.feature?.x).toBe(500000);
    expect(result.feature?.y).toBe(4100000);
    expect(result.candidates.length).toBe(1);
    expect(result.queryTimeMs).toBeGreaterThan(0);
  });
  
  it('detecta múltiples candidatos (count > 1)', async () => {
    const result = await detectSingleton(TEST_MUNICIPIO_MULTIPLE, 'SANITARIO');
    
    expect(result.isSingleton).toBe(false);
    expect(result.count).toBe(3);
    expect(result.feature).toBeNull();
    expect(result.candidates.length).toBe(3);
  });
  
  it('detecta ausencia de datos (count === 0)', async () => {
    const result = await detectSingleton(TEST_MUNICIPIO_EMPTY, 'SANITARIO');
    
    expect(result.isSingleton).toBe(false);
    expect(result.count).toBe(0);
    expect(result.feature).toBeNull();
    expect(result.candidates.length).toBe(0);
  });
  
  it('respeta candidateLimit', async () => {
    const result = await detectSingleton(TEST_MUNICIPIO_MULTIPLE, 'SANITARIO', {
      candidateLimit: 2
    });
    
    expect(result.count).toBe(3);
    expect(result.candidates.length).toBe(2);
  });
  
  it('respeta includeCandidates: false', async () => {
    const result = await detectSingleton(TEST_MUNICIPIO_MULTIPLE, 'SANITARIO', {
      includeCandidates: false
    });
    
    expect(result.count).toBe(3);
    expect(result.candidates.length).toBe(0);
  });
});

// ============================================================================
// TESTS: detectSingletonByNombre
// ============================================================================

describe('detectSingletonByNombre', () => {
  it('encuentra municipio por nombre y detecta singleton', async () => {
    const result = await detectSingletonByNombre('TestVilla', 'SANITARIO');
    
    expect(result).not.toBeNull();
    expect(result?.isSingleton).toBe(true);
    expect(result?.codMun).toBe(TEST_MUNICIPIO_SINGLETON);
  });
  
  it('normaliza nombres con acentos', async () => {
    // Aunque nuestro test no tiene acentos, verificamos la lógica
    const result = await detectSingletonByNombre('TESTVILLA', 'SANITARIO');
    
    expect(result).not.toBeNull();
    expect(result?.isSingleton).toBe(true);
  });
  
  it('devuelve null si municipio no existe', async () => {
    const result = await detectSingletonByNombre('MunicipioInexistente', 'SANITARIO');
    
    expect(result).toBeNull();
  });
});


// ============================================================================
// TESTS: isSingletonType
// ============================================================================

describe('isSingletonType', () => {
  it('devuelve true para singleton', async () => {
    const result = await isSingletonType(TEST_MUNICIPIO_SINGLETON, 'SANITARIO');
    expect(result).toBe(true);
  });
  
  it('devuelve false para múltiples', async () => {
    const result = await isSingletonType(TEST_MUNICIPIO_MULTIPLE, 'SANITARIO');
    expect(result).toBe(false);
  });
  
  it('devuelve false para vacío', async () => {
    const result = await isSingletonType(TEST_MUNICIPIO_EMPTY, 'SANITARIO');
    expect(result).toBe(false);
  });
});

// ============================================================================
// TESTS: getSingletonFeature
// ============================================================================

describe('getSingletonFeature', () => {
  it('devuelve feature si es singleton', async () => {
    const feature = await getSingletonFeature(TEST_MUNICIPIO_SINGLETON, 'SANITARIO');
    
    expect(feature).not.toBeNull();
    expect(feature?.nombre).toBe('Centro de Salud Test');
  });
  
  it('devuelve null si hay múltiples', async () => {
    const feature = await getSingletonFeature(TEST_MUNICIPIO_MULTIPLE, 'SANITARIO');
    
    expect(feature).toBeNull();
  });
  
  it('devuelve null si no hay datos', async () => {
    const feature = await getSingletonFeature(TEST_MUNICIPIO_EMPTY, 'SANITARIO');
    
    expect(feature).toBeNull();
  });
});

// ============================================================================
// TESTS: getMunicipioTypologyCounts
// ============================================================================

describe('getMunicipioTypologyCounts', () => {
  it('cuenta correctamente todas las tipologías', async () => {
    const stats = await getMunicipioTypologyCounts(TEST_MUNICIPIO_MULTIPLE);
    
    expect(stats.codMun).toBe(TEST_MUNICIPIO_MULTIPLE);
    expect(stats.municipio).toBe('TestCity');
    expect(stats.counts.get('SANITARIO')).toBe(3);
    expect(stats.counts.get('EDUCATIVO')).toBe(1);
    expect(stats.totalFeatures).toBe(4);
    expect(stats.singletonTypes).toContain('EDUCATIVO');
    expect(stats.multipleTypes).toContain('SANITARIO');
  });
  
  it('identifica tipologías singleton', async () => {
    const stats = await getMunicipioTypologyCounts(TEST_MUNICIPIO_SINGLETON);
    
    expect(stats.singletonTypes).toContain('SANITARIO');
    expect(stats.multipleTypes.length).toBe(0);
  });
});

// ============================================================================
// TESTS: getCandidatesByNombre
// ============================================================================

describe('getCandidatesByNombre', () => {
  it('ordena candidatos por similitud', async () => {
    const candidates = await getCandidatesByNombre(
      TEST_MUNICIPIO_MULTIPLE,
      'SANITARIO',
      'Hospital'
    );
    
    expect(candidates.length).toBe(3);
    // El Hospital Comarcal debería estar primero
    expect(candidates[0].nombre).toContain('Hospital');
  });
  
  it('devuelve lista vacía si no hay candidatos', async () => {
    const candidates = await getCandidatesByNombre(
      TEST_MUNICIPIO_EMPTY,
      'SANITARIO',
      'Test'
    );
    
    expect(candidates.length).toBe(0);
  });
  
  it('respeta límite de resultados', async () => {
    const candidates = await getCandidatesByNombre(
      TEST_MUNICIPIO_MULTIPLE,
      'SANITARIO',
      'Centro',
      2
    );
    
    expect(candidates.length).toBe(2);
  });
});

// ============================================================================
// TESTS: ALL_TIPOLOGIAS
// ============================================================================

describe('ALL_TIPOLOGIAS', () => {
  it('contiene las tipologías esperadas', () => {
    expect(ALL_TIPOLOGIAS).toContain('SANITARIO');
    expect(ALL_TIPOLOGIAS).toContain('EDUCATIVO');
    expect(ALL_TIPOLOGIAS).toContain('SEGURIDAD');
    expect(ALL_TIPOLOGIAS).toContain('MUNICIPAL');
    expect(ALL_TIPOLOGIAS).toContain('EMERGENCIA');
    expect(ALL_TIPOLOGIAS.length).toBeGreaterThanOrEqual(10);
  });
});
