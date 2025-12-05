/**
 * Benchmarks: LocalData (IndexedDB)
 * 
 * Mide rendimiento de operaciones IndexedDB con Dexie.js.
 * Ejecutar: npx vitest bench
 * 
 * @module benchmarks/localData
 * @version 1.0.0
 * @date 2025-12-05
 * @session A.4
 */

import { bench, describe, beforeAll, afterAll } from 'vitest';

// Mock IndexedDB para Node.js
import 'fake-indexeddb/auto';

import {
  db,
  generateCacheKey,
  type DERAFeature,
  type INEMunicipio,
} from '../../localData/schemas';

// ============================================================================
// FIXTURES
// ============================================================================

function generarDERAFeatures(n: number): DERAFeature[] {
  const tipologias = ['SANITARIO', 'EDUCATIVO', 'SEGURIDAD', 'MUNICIPAL'] as const;
  const municipios = [
    { cod: '18051', nombre: 'Colomera', prov: 'Granada' },
    { cod: '18046', nombre: 'Castril', prov: 'Granada' },
    { cod: '04019', nombre: 'Berja', prov: 'Almería' },
    { cod: '18079', nombre: 'Granada', prov: 'Granada' },
  ];
  
  const resultado: DERAFeature[] = [];
  
  for (let i = 0; i < n; i++) {
    const tip = tipologias[i % tipologias.length];
    const mun = municipios[i % municipios.length];
    
    resultado.push({
      id: `${tip}_${mun.cod}_${String(i).padStart(4, '0')}`,
      tipologia: tip,
      nombre: `Infraestructura ${tip} ${i}`,
      subtipo: `Subtipo ${i % 5}`,
      direccion: `C/ Test, ${i}`,
      localidad: mun.nombre,
      codMun: mun.cod,
      municipio: mun.nombre,
      provincia: mun.prov,
      codProv: mun.cod.substring(0, 2),
      x: 400000 + (i * 100),
      y: 4100000 + (i * 50),
      capaOrigen: 'benchmark_test',
      fechaCarga: new Date().toISOString(),
    });
  }
  
  return resultado;
}

function generarINEMunicipios(n: number): INEMunicipio[] {
  const resultado: INEMunicipio[] = [];
  
  for (let i = 0; i < n; i++) {
    const codProv = String(Math.floor(i / 100) + 1).padStart(2, '0');
    const codMun = codProv + String(i % 1000).padStart(3, '0');
    
    resultado.push({
      codMun,
      nombre: `Municipio ${i}`,
      nombreNorm: `MUNICIPIO ${i}`,
      provincia: `Provincia ${codProv}`,
      codProv,
      centroideX: 400000 + (i * 100),
      centroideY: 4100000 + (i * 50),
      superficie: 50 + (i % 200),
      poblacion: 1000 + (i * 10),
    });
  }
  
  return resultado;
}

const DERA_10 = generarDERAFeatures(10);
const DERA_100 = generarDERAFeatures(100);
const DERA_1000 = generarDERAFeatures(1000);

const INE_100 = generarINEMunicipios(100);
const INE_786 = generarINEMunicipios(786); // Todos los municipios de Andalucía

// ============================================================================
// BENCHMARKS
// ============================================================================

describe('LocalData - Cache Key Generation', () => {
  
  bench('generar cache key simple', () => {
    generateCacheKey('Centro de Salud', '18051', 'SANITARIO');
  });
  
  bench('generar 100 cache keys', () => {
    for (let i = 0; i < 100; i++) {
      generateCacheKey(`Infraestructura ${i}`, `180${String(i).padStart(2, '0')}`, 'EDUCATIVO');
    }
  });
  
});

describe('LocalData - Escritura DERA', () => {
  
  beforeAll(async () => {
    await db.dera.clear();
  });
  
  afterAll(async () => {
    await db.dera.clear();
  });
  
  bench('insertar 10 features individuales', async () => {
    await db.dera.clear();
    for (const feature of DERA_10) {
      await db.dera.add(feature);
    }
  });
  
  bench('insertar 100 features bulk', async () => {
    await db.dera.clear();
    await db.dera.bulkAdd(DERA_100);
  });
  
  bench('insertar 1000 features bulk', async () => {
    await db.dera.clear();
    await db.dera.bulkAdd(DERA_1000);
  });
  
});

describe('LocalData - Lectura DERA', () => {
  
  beforeAll(async () => {
    await db.dera.clear();
    await db.dera.bulkAdd(DERA_1000);
  });
  
  afterAll(async () => {
    await db.dera.clear();
  });
  
  bench('buscar por ID (get)', async () => {
    await db.dera.get('SANITARIO_18051_0001');
  });
  
  bench('buscar por tipología+municipio (índice compuesto)', async () => {
    await db.dera.where({ tipologia: 'SANITARIO', codMun: '18051' }).toArray();
  });
  
  bench('contar por tipología+municipio', async () => {
    await db.dera.where({ tipologia: 'SANITARIO', codMun: '18051' }).count();
  });
  
  bench('buscar por nombre (starts with)', async () => {
    await db.dera.where('nombre').startsWithIgnoreCase('Infraestructura').limit(10).toArray();
  });
  
  bench('obtener todos de un municipio', async () => {
    await db.dera.where('codMun').equals('18051').toArray();
  });
  
});

describe('LocalData - INE Municipios', () => {
  
  beforeAll(async () => {
    await db.ine.clear();
    await db.ine.bulkAdd(INE_786);
  });
  
  afterAll(async () => {
    await db.ine.clear();
  });
  
  bench('buscar municipio por código', async () => {
    await db.ine.get('18051');
  });
  
  bench('buscar municipio por nombre normalizado', async () => {
    await db.ine.where('nombreNorm').equals('MUNICIPIO 500').first();
  });
  
  bench('listar todos de una provincia', async () => {
    await db.ine.where('codProv').equals('18').toArray();
  });
  
  bench('cargar 786 municipios bulk', async () => {
    await db.ine.clear();
    await db.ine.bulkAdd(INE_786);
  });
  
});

describe('LocalData - Operaciones mixtas', () => {
  
  beforeAll(async () => {
    await db.dera.clear();
    await db.ine.clear();
    await db.dera.bulkAdd(DERA_1000);
    await db.ine.bulkAdd(INE_786);
  });
  
  afterAll(async () => {
    await db.dera.clear();
    await db.ine.clear();
  });
  
  bench('singleton detection: contar + obtener si único', async () => {
    const count = await db.dera.where({ tipologia: 'SANITARIO', codMun: '18051' }).count();
    if (count === 1) {
      await db.dera.where({ tipologia: 'SANITARIO', codMun: '18051' }).first();
    }
  });
  
  bench('búsqueda con join manual (DERA → INE)', async () => {
    const features = await db.dera.where({ tipologia: 'SANITARIO', codMun: '18051' }).toArray();
    if (features.length > 0) {
      await db.ine.get(features[0].codMun);
    }
  });
  
});
