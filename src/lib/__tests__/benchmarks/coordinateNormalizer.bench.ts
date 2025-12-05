/**
 * Benchmarks: CoordinateNormalizer
 * 
 * Mide rendimiento de normalización de coordenadas.
 * Ejecutar: npx vitest bench
 * 
 * @module benchmarks/coordinateNormalizer
 * @version 1.0.0
 * @date 2025-12-05
 * @session A.4
 */

import { bench, describe } from 'vitest';
import { normalizarCoordenada } from '../../coordinateNormalizer';

// ============================================================================
// FIXTURES
// ============================================================================

const COORDENADAS_EUROPEO = [
  '436.780,00',
  '4.137.231,90',
  '506.320,45',
  '4.077.905,12',
];

const COORDENADAS_ESPACIOS = [
  '436 780',
  '4 137 231',
  '506 320',
  '4 077 905',
];

const COORDENADAS_ESTANDAR = [
  '436780.00',
  '4137231.90',
  '506320.45',
  '4077905.12',
];

const COORDENADAS_DMS = [
  '37°10\'30"N',
  '3°35\'45"W',
  '36°50\'20.5"N',
  '2°28\'15.3"W',
];

const COORDENADAS_CORRUPTAS = [
  '436.780Â´00',
  '4.137.231Â¬90',
  '506Â 320',
  '4077905â€™12',
];

// Generar lote grande para benchmarks de volumen
function generarLote(n: number): string[] {
  const resultado: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = 100000 + Math.floor(Math.random() * 800000);
    const y = 4000000 + Math.floor(Math.random() * 300000);
    resultado.push(`${x}.${Math.floor(Math.random() * 100)}`);
    resultado.push(`${y}.${Math.floor(Math.random() * 100)}`);
  }
  return resultado;
}

const LOTE_100 = generarLote(50);  // 100 coordenadas (50 pares X/Y)
const LOTE_1000 = generarLote(500); // 1000 coordenadas

// ============================================================================
// BENCHMARKS
// ============================================================================

describe('CoordinateNormalizer - Formatos individuales', () => {
  
  bench('formato europeo (punto miles, coma decimal)', () => {
    for (const coord of COORDENADAS_EUROPEO) {
      normalizarCoordenada(coord);
    }
  });
  
  bench('formato con espacios', () => {
    for (const coord of COORDENADAS_ESPACIOS) {
      normalizarCoordenada(coord);
    }
  });
  
  bench('formato estándar (punto decimal)', () => {
    for (const coord of COORDENADAS_ESTANDAR) {
      normalizarCoordenada(coord);
    }
  });
  
  bench('formato DMS (grados/minutos/segundos)', () => {
    for (const coord of COORDENADAS_DMS) {
      normalizarCoordenada(coord);
    }
  });
  
  bench('coordenadas con UTF-8 corrupto', () => {
    for (const coord of COORDENADAS_CORRUPTAS) {
      normalizarCoordenada(coord);
    }
  });
  
});

describe('CoordinateNormalizer - Volumen', () => {
  
  bench('lote 100 coordenadas mixtas', () => {
    for (const coord of LOTE_100) {
      normalizarCoordenada(coord);
    }
  });
  
  bench('lote 1000 coordenadas mixtas', () => {
    for (const coord of LOTE_1000) {
      normalizarCoordenada(coord);
    }
  });
  
});

describe('CoordinateNormalizer - Casos edge', () => {
  
  bench('coordenadas vacías/placeholder', () => {
    const placeholders = ['---', 'Indicar', '', 'N/A', 'Sin datos', '0'];
    for (const p of placeholders) {
      normalizarCoordenada(p);
    }
  });
  
  bench('coordenadas con caracteres especiales', () => {
    const especiales = ['436´780', '4137231`90', '506″320', '4077905\'12'];
    for (const e of especiales) {
      normalizarCoordenada(e);
    }
  });
  
});
