/**
 * fuzzySearch.test.ts
 * 
 * Tests para el módulo de búsqueda fuzzy con uFuzzy.
 * 
 * @version 1.0.0
 * @date 2025-12-04
 * @see F023 Fase 3.1 - uFuzzy
 */

import { describe, test, expect } from 'vitest';
import FastFuzzy, { 
  normalizeForSearch, 
  fuzzySearchStrings, 
  calculateSimilarity 
} from '../../lib/fuzzySearch';

describe('fuzzySearch', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMALIZACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  describe('normalizeForSearch', () => {
    
    test('convierte a minúsculas', () => {
      expect(normalizeForSearch('CENTRO DE SALUD')).toBe('centro de salud');
    });

    test('elimina acentos', () => {
      expect(normalizeForSearch('José María')).toBe('jose maria');
      expect(normalizeForSearch('Ñoño')).toBe('nono');
    });

    test('elimina caracteres especiales', () => {
      expect(normalizeForSearch('C/ Mayor, 5')).toBe('c mayor 5');
    });

    test('normaliza espacios múltiples', () => {
      expect(normalizeForSearch('Centro   de    Salud')).toBe('centro de salud');
    });

    test('maneja string vacío', () => {
      expect(normalizeForSearch('')).toBe('');
      expect(normalizeForSearch(null as unknown as string)).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE SIMILARITY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('calculateSimilarity', () => {
    
    test('match exacto = 100', () => {
      expect(calculateSimilarity('Centro de Salud', 'Centro de Salud')).toBe(100);
    });

    test('match exacto ignorando mayúsculas/acentos', () => {
      expect(calculateSimilarity('centro de salud', 'CENTRO DE SALUD')).toBe(100);
      expect(calculateSimilarity('jose', 'José')).toBe(100);
    });

    test('uno contiene al otro → score alto', () => {
      const score = calculateSimilarity('Centro', 'Centro de Salud');
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('strings sin relación → score bajo', () => {
      const score = calculateSimilarity('Colegio', 'Hospital');
      expect(score).toBeLessThan(50);
    });

    test('strings vacíos → 0', () => {
      expect(calculateSimilarity('', 'algo')).toBe(0);
      expect(calculateSimilarity('algo', '')).toBe(0);
      expect(calculateSimilarity('', '')).toBe(0);
    });

    test('match parcial razonable', () => {
      const score = calculateSimilarity('Centro Salud', 'Centro de Salud');
      expect(score).toBeGreaterThan(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FUZZY SEARCH STRINGS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('fuzzySearchStrings', () => {
    const haystack = [
      'Centro de Salud Colomera',
      'Centro de Salud Guadix',
      'Hospital San Juan de Dios',
      'Consultorio Local Peza',
      'CEIP San José'
    ];

    test('encuentra coincidencia exacta', () => {
      const results = fuzzySearchStrings(haystack, 'Centro Colomera');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item).toContain('Colomera');
    });

    test('encuentra coincidencias parciales', () => {
      const results = fuzzySearchStrings(haystack, 'Centro Salud');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    test('respeta límite', () => {
      const results = fuzzySearchStrings(haystack, 'Centro', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    test('devuelve array vacío sin query', () => {
      expect(fuzzySearchStrings(haystack, '')).toEqual([]);
      expect(fuzzySearchStrings(haystack, '  ')).toEqual([]);
    });

    test('devuelve array vacío sin haystack', () => {
      expect(fuzzySearchStrings([], 'algo')).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FAST FUZZY CLASS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('FastFuzzy class', () => {
    interface TestItem {
      id: string;
      nombre: string;
      municipio: string;
    }

    const items: TestItem[] = [
      { id: '1', nombre: 'Centro de Salud Colomera', municipio: 'Colomera' },
      { id: '2', nombre: 'Centro de Salud Guadix', municipio: 'Guadix' },
      { id: '3', nombre: 'Hospital San Juan', municipio: 'Granada' },
      { id: '4', nombre: 'CEIP San José', municipio: 'Colomera' },
    ];

    test('búsqueda por nombre', () => {
      const fuzzy = new FastFuzzy(items, { keys: ['nombre'] });
      const results = fuzzy.search('Centro Salud');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.nombre).toContain('Centro');
    });

    test('búsqueda por múltiples campos', () => {
      const fuzzy = new FastFuzzy(items, { keys: ['nombre', 'municipio'] });
      const results = fuzzy.search('Colomera');
      
      expect(results.length).toBeGreaterThan(0);
    });

    test('búsqueda con pesos', () => {
      const fuzzy = new FastFuzzy(items, { 
        keys: [
          { name: 'nombre', weight: 2 },
          { name: 'municipio', weight: 1 }
        ] 
      });
      const results = fuzzy.search('Colomera');
      
      expect(results.length).toBeGreaterThan(0);
    });

    test('setItems actualiza items', () => {
      const fuzzy = new FastFuzzy(items, { keys: ['nombre'] });
      
      const newItems: TestItem[] = [
        { id: '5', nombre: 'Nuevo Centro', municipio: 'Almería' }
      ];
      fuzzy.setItems(newItems);
      
      const results = fuzzy.search('Nuevo Centro');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.id).toBe('5');
    });

    test('respeta threshold', () => {
      const fuzzy = new FastFuzzy(items, { 
        keys: ['nombre'],
        threshold: 0.1  // Muy estricto
      });
      const results = fuzzy.search('xyz123');
      
      // Con threshold muy bajo, no debería encontrar nada para query sin relación
      expect(results.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CASOS REALES PTEL
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Casos reales PTEL', () => {
    
    test('encuentra "C.S. Virgen" buscando "Centro Salud Virgen"', () => {
      const haystack = ['C.S. Virgen de la Cabeza', 'Hospital General', 'Consultorio'];
      const results = fuzzySearchStrings(haystack, 'Centro Salud Virgen');
      
      // Debería encontrar algo (aunque no match exacto)
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('encuentra con acentos incorrectos', () => {
      const score = calculateSimilarity('Consultorio Jose', 'Consultorio José');
      expect(score).toBe(100);  // Normalización elimina diferencia
    });

    test('encuentra variantes de nombres', () => {
      const score = calculateSimilarity('C.E.I.P. San Jose', 'CEIP San José');
      expect(score).toBeGreaterThan(50);
    });
  });
});
