/**
 * Benchmarks: CoordinateValidator
 * 
 * Mide rendimiento de validación de coordenadas.
 * Ejecutar: npx vitest bench
 * 
 * @module benchmarks/validation
 * @version 1.0.0
 * @date 2025-12-05
 * @session A.4
 */

import { bench, describe } from 'vitest';
import {
  validateCoordinates,
  validateCoordinatePair,
  isInAndalucia,
  isValidUTM30Range,
} from '../../CoordinateValidator';

// ============================================================================
// FIXTURES
// ============================================================================

// Coordenadas válidas dentro de Andalucía
const COORDS_ANDALUCIA_VALIDAS = [
  { x: 436972.40, y: 4137231.90 },  // Colomera (Granada)
  { x: 506320.45, y: 4077905.12 },  // Berja (Almería)
  { x: 236547.89, y: 4064123.45 },  // Huelva
  { x: 373890.12, y: 4185234.67 },  // Córdoba
  { x: 441234.56, y: 4093456.78 },  // Málaga
];

// Coordenadas fuera de Andalucía (pero en España)
const COORDS_FUERA_ANDALUCIA = [
  { x: 440000, y: 4480000 },  // Madrid
  { x: 430000, y: 4580000 },  // Castilla y León
  { x: 920000, y: 4600000 },  // Cataluña
  { x: 540000, y: 4720000 },  // País Vasco
];

// Coordenadas inválidas (fuera de rango UTM30)
const COORDS_INVALIDAS = [
  { x: 0, y: 0 },
  { x: -100000, y: 4000000 },
  { x: 500000, y: 10000000 },
  { x: 999999, y: 3000000 },
];

// Coordenadas edge cases
const COORDS_EDGE = [
  { x: 100000, y: 4000000 },     // Límite inferior
  { x: 900000, y: 4300000 },     // Límite superior
  { x: 436972.40, y: 4137231 },  // Y sin decimales
  { x: 436972, y: 4137231.90 },  // X sin decimales
];

// Generar lotes grandes
function generarCoordenadas(n: number, validas: boolean): Array<{x: number, y: number}> {
  const resultado: Array<{x: number, y: number}> = [];
  
  for (let i = 0; i < n; i++) {
    if (validas) {
      // Coordenadas válidas dentro de Andalucía
      resultado.push({
        x: 200000 + Math.random() * 500000,
        y: 4000000 + Math.random() * 300000,
      });
    } else {
      // Coordenadas aleatorias (pueden ser inválidas)
      resultado.push({
        x: Math.random() * 1000000,
        y: Math.random() * 10000000,
      });
    }
  }
  
  return resultado;
}

const LOTE_100_VALIDAS = generarCoordenadas(100, true);
const LOTE_1000_VALIDAS = generarCoordenadas(1000, true);
const LOTE_100_MIXTAS = generarCoordenadas(100, false);

// ============================================================================
// BENCHMARKS
// ============================================================================

describe('CoordinateValidator - Validación individual', () => {
  
  bench('validar par de coordenadas válidas', () => {
    for (const coord of COORDS_ANDALUCIA_VALIDAS) {
      validateCoordinatePair(coord.x, coord.y);
    }
  });
  
  bench('validar coordenadas fuera de Andalucía', () => {
    for (const coord of COORDS_FUERA_ANDALUCIA) {
      validateCoordinatePair(coord.x, coord.y);
    }
  });
  
  bench('validar coordenadas inválidas (fuera de rango)', () => {
    for (const coord of COORDS_INVALIDAS) {
      validateCoordinatePair(coord.x, coord.y);
    }
  });
  
  bench('validar coordenadas edge cases', () => {
    for (const coord of COORDS_EDGE) {
      validateCoordinatePair(coord.x, coord.y);
    }
  });
  
});

describe('CoordinateValidator - Verificación de rango', () => {
  
  bench('isValidUTM30Range - coordenadas válidas', () => {
    for (const coord of COORDS_ANDALUCIA_VALIDAS) {
      isValidUTM30Range(coord.x, coord.y);
    }
  });
  
  bench('isInAndalucia - coordenadas dentro', () => {
    for (const coord of COORDS_ANDALUCIA_VALIDAS) {
      isInAndalucia(coord.x, coord.y);
    }
  });
  
  bench('isInAndalucia - coordenadas fuera', () => {
    for (const coord of COORDS_FUERA_ANDALUCIA) {
      isInAndalucia(coord.x, coord.y);
    }
  });
  
});

describe('CoordinateValidator - Volumen', () => {
  
  bench('validar lote 100 coordenadas válidas', () => {
    for (const coord of LOTE_100_VALIDAS) {
      validateCoordinatePair(coord.x, coord.y);
    }
  });
  
  bench('validar lote 1000 coordenadas válidas', () => {
    for (const coord of LOTE_1000_VALIDAS) {
      validateCoordinatePair(coord.x, coord.y);
    }
  });
  
  bench('validar lote 100 coordenadas mixtas', () => {
    for (const coord of LOTE_100_MIXTAS) {
      validateCoordinatePair(coord.x, coord.y);
    }
  });
  
});

describe('CoordinateValidator - validateCoordinates completo', () => {
  
  bench('validateCoordinates con strings válidas', () => {
    validateCoordinates('436972.40', '4137231.90');
  });
  
  bench('validateCoordinates con formato europeo', () => {
    validateCoordinates('436.972,40', '4.137.231,90');
  });
  
  bench('validateCoordinates con espacios', () => {
    validateCoordinates('436 972', '4 137 231');
  });
  
  bench('validateCoordinates lote 100', () => {
    for (let i = 0; i < 100; i++) {
      const x = (400000 + i * 100).toString();
      const y = (4100000 + i * 50).toString();
      validateCoordinates(x, y);
    }
  });
  
});
