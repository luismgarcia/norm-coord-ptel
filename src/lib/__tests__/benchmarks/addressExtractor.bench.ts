/**
 * Benchmarks: AddressExtractor (F025)
 * 
 * Mide rendimiento de extracción y normalización de direcciones.
 * Ejecutar: npx vitest bench
 * 
 * @module benchmarks/addressExtractor
 * @version 1.0.0
 * @date 2025-12-05
 * @session A.4
 */

import { bench, describe } from 'vitest';
import { extractStreetAddress } from '../../../utils/addressExtractor';

// ============================================================================
// FIXTURES
// ============================================================================

const DIRECCIONES_SIMPLES = [
  'C/ Mayor, 1',
  'Plaza España, 5',
  'Avda. Constitución, 23',
  'Calle Real, 15',
];

const DIRECCIONES_CON_RUIDO = [
  'Centro de Salud Colomera, C/ Doctor Fleming n/ 2, horario 8-15h',
  'CEIP San José, Plaza de la Iglesia, 1, teléfono 958123456',
  'Consultorio Auxiliar Limones, Carretera de Jaén km 5, abierto lunes',
  'Casa Consistorial, Plaza Porticada, N.º 1, atención 9-14h',
];

const DIRECCIONES_CARRETERA = [
  'Ctra. Nacional 340, km 15',
  'Carretera A-92 km 125,5',
  'N-432 a la altura del km 200',
  'Autovía A-44, salida 118',
];

const DIRECCIONES_CON_FORMATO_Nº = [
  'C/ Mayor N.º 5',
  'Plaza España, nº 10',
  'Avda. Constitución Nº. 23',
  'Calle Real, n.º 15',
];

const DIRECCIONES_UTF8_CORRUPTO = [
  'C/ JosÃ© MarÃ­a, 5',
  'Plaza EspaÃ±a, 10',
  'Avda. AndalucÃ­a, 23',
  'Calle SeÃ±or de los Anillos, 1',
];

// Generar lote variado para benchmarks de volumen
function generarLoteDirecciones(n: number): string[] {
  const tipos = ['C/', 'Calle', 'Plaza', 'Avda.', 'Paseo', 'Camino'];
  const nombres = ['Mayor', 'Real', 'España', 'Constitución', 'Andalucía', 'Nueva'];
  const resultado: string[] = [];
  
  for (let i = 0; i < n; i++) {
    const tipo = tipos[i % tipos.length];
    const nombre = nombres[i % nombres.length];
    const numero = (i % 100) + 1;
    resultado.push(`${tipo} ${nombre}, ${numero}`);
  }
  
  return resultado;
}

const LOTE_100 = generarLoteDirecciones(100);
const LOTE_500 = generarLoteDirecciones(500);

// ============================================================================
// BENCHMARKS
// ============================================================================

describe('AddressExtractor - Formatos individuales', () => {
  
  bench('direcciones simples', () => {
    for (const dir of DIRECCIONES_SIMPLES) {
      extractStreetAddress(dir);
    }
  });
  
  bench('direcciones con ruido (infraestructura + horario)', () => {
    for (const dir of DIRECCIONES_CON_RUIDO) {
      extractStreetAddress(dir);
    }
  });
  
  bench('direcciones de carretera', () => {
    for (const dir of DIRECCIONES_CARRETERA) {
      extractStreetAddress(dir);
    }
  });
  
  bench('normalización N.º → Nº', () => {
    for (const dir of DIRECCIONES_CON_FORMATO_Nº) {
      extractStreetAddress(dir);
    }
  });
  
  bench('direcciones con UTF-8 corrupto', () => {
    for (const dir of DIRECCIONES_UTF8_CORRUPTO) {
      extractStreetAddress(dir);
    }
  });
  
});

describe('AddressExtractor - Con contexto municipal', () => {
  
  bench('extracción con municipio conocido', () => {
    for (const dir of DIRECCIONES_CON_RUIDO) {
      extractStreetAddress(dir, 'Colomera');
    }
  });
  
  bench('extracción con municipio y provincia', () => {
    for (const dir of DIRECCIONES_CON_RUIDO) {
      extractStreetAddress(dir, 'Colomera');
    }
  });
  
});

describe('AddressExtractor - Volumen', () => {
  
  bench('lote 100 direcciones', () => {
    for (const dir of LOTE_100) {
      extractStreetAddress(dir);
    }
  });
  
  bench('lote 500 direcciones', () => {
    for (const dir of LOTE_500) {
      extractStreetAddress(dir);
    }
  });
  
});

describe('AddressExtractor - Casos edge', () => {
  
  bench('direcciones vacías/placeholder', () => {
    const placeholders = ['---', 'Indicar', '', 'N/A', 'Sin dirección', 'Pendiente'];
    for (const p of placeholders) {
      extractStreetAddress(p);
    }
  });
  
  bench('direcciones solo con nombre de infraestructura', () => {
    const soloNombres = [
      'Centro de Salud',
      'CEIP San José',
      'Consultorio',
      'Ayuntamiento',
    ];
    for (const n of soloNombres) {
      extractStreetAddress(n);
    }
  });
  
});
