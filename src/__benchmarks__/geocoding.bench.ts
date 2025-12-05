/**
 * Suite de Benchmarks - Geocodificación PTEL
 * 
 * Sesión S1.3 - Medición de rendimiento operaciones críticas
 * 
 * Baselines objetivo:
 * - Singleton detection: < 50ms
 * - Address extraction: < 5ms  
 * - Coordinate normalization: < 1ms
 * 
 * Ejecutar: npx vitest bench --config vitest.bench.config.ts
 * 
 * @created 2025-12-05
 * @session S1.3
 */

import { bench, describe, beforeAll } from 'vitest';
import { extractStreetAddress } from '@/utils/addressExtractor';
import { 
  normalizarCoordenada,
  procesarParCoordenadas,
  detectarPatron,
  parseDMS,
  parseNMEA
} from '@/lib/coordinateNormalizer';
import { loadLocalData, searchLocal, isDataLoaded } from '@/lib/LocalDataService';
import { 
  disambiguate, 
  type PTELRecord, 
  type GeocodingCandidate 
} from '@/lib/multiFieldStrategy';

// ============================================================================
// SETUP: Cargar datos locales si están disponibles
// ============================================================================

// Datos de prueba para benchmarks
const SAMPLE_ADDRESSES = [
  'Centro de Salud Tíjola, Plaza Luis Gonzaga, n/ 1, disponible 24 horas',
  'CEIP San José, Avda. de la Paz 15, Berja',
  'C/ Mayor, 15, Colomera',
  'Polígono Industrial Los Llanos, s/n, Hornos',
  'Ayuntamiento de Quéntar, Plaza de la Constitución, 1',
  'Consultorio Médico, C/ Real 23, Tíjola',
  'IES Federico García Lorca, Ctra. Granada km 2, Berja',
  'Casa de la Cultura, Pza. Mayor 5, Colomera',
];

const SAMPLE_COORDINATES = {
  // Formato limpio
  clean: ['524538.45', '4229920.12'],
  // Formato europeo (punto miles, coma decimal)
  european: ['524.538,45', '4.229.920,12'],
  // Formato con coma decimal
  comma: ['524538,45', '4229920,12'],
  // Formato espacio + tilde doble (Berja)
  spaceTilde: ['506 320´´45', '4 076 470´´89'],
  // DMS (sexagesimales)
  dms: ['37°26\'46.5"N', '2°56\'12.3"W'],
  // NMEA GPS
  nmea: ['3726.775N', '00256.205W'],
};

const SAMPLE_PTEL_RECORD: PTELRecord = {
  nombre: 'Centro de Salud',
  direccion: 'Plaza Luis Gonzaga, 1',
  localidad: 'Tíjola',
  codMunicipio: '04091',
};

// ============================================================================
// BENCHMARK: Address Extraction (F025)
// ============================================================================

describe('F025: Address Extraction', () => {
  bench('extractStreetAddress - simple address', () => {
    extractStreetAddress('C/ Mayor, 15', 'Colomera');
  }, { iterations: 1000 });

  bench('extractStreetAddress - complex with infrastructure prefix', () => {
    extractStreetAddress(
      'Centro de Salud Tíjola, Plaza Luis Gonzaga, n/ 1, disponible 24 horas',
      'Tíjola'
    );
  }, { iterations: 1000 });

  bench('extractStreetAddress - batch 8 addresses', () => {
    for (const addr of SAMPLE_ADDRESSES) {
      extractStreetAddress(addr, 'Tíjola');
    }
  }, { iterations: 100 });

  bench('extractStreetAddress - OCR/UTF-8 corrections', () => {
    extractStreetAddress('AVDA. DE LA PAZï¿½, Nï¿½ 5', 'Berja');
  }, { iterations: 1000 });
});

// ============================================================================
// BENCHMARK: Coordinate Normalization
// ============================================================================

describe('Coordinate Normalization', () => {
  bench('normalizarCoordenada - clean format', () => {
    normalizarCoordenada(SAMPLE_COORDINATES.clean[0]);
  }, { iterations: 1000 });

  bench('normalizarCoordenada - european format', () => {
    normalizarCoordenada(SAMPLE_COORDINATES.european[0]);
  }, { iterations: 1000 });

  bench('normalizarCoordenada - space+tilde (Berja)', () => {
    normalizarCoordenada(SAMPLE_COORDINATES.spaceTilde[0]);
  }, { iterations: 1000 });

  bench('procesarParCoordenadas - UTM pair', () => {
    procesarParCoordenadas(
      SAMPLE_COORDINATES.clean[0],
      SAMPLE_COORDINATES.clean[1]
    );
  }, { iterations: 500 });

  bench('detectarPatron - various formats', () => {
    detectarPatron('524538.45');
    detectarPatron('524.538,45');
    detectarPatron('506 320´´45');
    detectarPatron('37°26\'46.5"N');
    detectarPatron('3726.775N');
  }, { iterations: 500 });
});

// ============================================================================
// BENCHMARK: DMS & NMEA Parsing
// ============================================================================

describe('DMS & NMEA Parsing', () => {
  bench('parseDMS - standard format', () => {
    parseDMS('37°26\'46.5"N');
  }, { iterations: 1000 });

  bench('parseDMS - spaces format', () => {
    parseDMS('37 26 46.5 N');
  }, { iterations: 1000 });

  bench('parseNMEA - GPS format', () => {
    parseNMEA('3726.775N');
  }, { iterations: 1000 });

  bench('parseNMEA - longitude', () => {
    parseNMEA('00256.205W');
  }, { iterations: 1000 });
});

// ============================================================================
// BENCHMARK: LocalDataService (offline search)
// ============================================================================

describe('LocalDataService - Offline Search', () => {
  // Nota: Estos benchmarks requieren datos cargados
  // Si no están disponibles, saltarán silenciosamente
  
  bench('searchLocal - health center', async () => {
    if (!isDataLoaded()) return;
    await searchLocal('Centro de Salud', 'SANITARIO', 'Tíjola');
  }, { iterations: 50 });

  bench('searchLocal - education center', async () => {
    if (!isDataLoaded()) return;
    await searchLocal('CEIP', 'EDUCATIVO', 'Berja');
  }, { iterations: 50 });
});

// ============================================================================
// BENCHMARK: Multi-field Disambiguation (F023)
// ============================================================================

describe('F023: Multi-field Disambiguation', () => {
  // Mock candidates for disambiguation (tipo GeocodingCandidate)
  const mockCandidates: GeocodingCandidate[] = [
    { 
      id: 'dera-001',
      nombre: 'Centro de Salud Tíjola', 
      direccion: 'Plaza Luis Gonzaga, 1',
      municipio: 'Tíjola',
      codMunicipio: '04091',
      utmX: 524538,
      utmY: 4229920,
      tipologia: 'HEALTH',
    },
    { 
      id: 'dera-002',
      nombre: 'Consultorio Médico Tíjola', 
      direccion: 'C/ Real, 15',
      municipio: 'Tíjola',
      codMunicipio: '04091',
      utmX: 524540,
      utmY: 4229918,
      tipologia: 'HEALTH',
    },
  ];

  bench('disambiguate - single candidate (singleton)', () => {
    disambiguate([mockCandidates[0]], SAMPLE_PTEL_RECORD, 'HEALTH');
  }, { iterations: 200 });

  bench('disambiguate - two candidates', () => {
    disambiguate(mockCandidates, SAMPLE_PTEL_RECORD, 'HEALTH');
  }, { iterations: 200 });

  bench('disambiguate - empty candidates', () => {
    disambiguate([], SAMPLE_PTEL_RECORD, 'HEALTH');
  }, { iterations: 500 });
});

// ============================================================================
// BENCHMARK: Combined Pipeline (E2E micro)
// ============================================================================

describe('Combined Pipeline', () => {
  bench('full pipeline - extract + normalize', () => {
    // 1. Extract address
    const addrResult = extractStreetAddress(
      'Centro de Salud Tíjola, Plaza Luis Gonzaga, n/ 1',
      'Tíjola'
    );
    
    // 2. Normalize coordinates (simulated)
    const xResult = normalizarCoordenada('524.538,45');
    const yResult = normalizarCoordenada('4.229.920,12');
    
    // 3. Process pair
    if (xResult.exito && yResult.exito) {
      procesarParCoordenadas('524.538,45', '4.229.920,12');
    }
  }, { iterations: 200 });

  bench('batch processing - 8 records simulation', () => {
    for (let i = 0; i < 8; i++) {
      extractStreetAddress(SAMPLE_ADDRESSES[i % SAMPLE_ADDRESSES.length], 'Tíjola');
      normalizarCoordenada(SAMPLE_COORDINATES.european[0]);
      normalizarCoordenada(SAMPLE_COORDINATES.european[1]);
    }
  }, { iterations: 50 });
});
