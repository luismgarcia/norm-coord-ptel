/**
 * textDeconcatenator.test.ts
 * 
 * Tests unitarios para la utilidad de desconcatenación de texto
 * Utiliza ejemplos reales extraídos de 6 documentos PTEL analizados
 * 
 * @date 2025-11-28
 */

import { describe, test, expect } from 'vitest';
import {
  deconcatenateText,
  validateCoordinateY,
  validateCoordinateX,
  splitConcatenatedCoordinates,
  detectMisplacedContent,
} from '../textDeconcatenator';

// ============================================================================
// CASOS DE PRUEBA REALES - EXTRAÍDOS DE 6 DOCUMENTOS PTEL
// ============================================================================

describe('textDeconcatenator', () => {
  
  describe('deconcatenateText - Nombres de infraestructuras', () => {
    
    // Casos de Berja (Almería)
    test.each([
      ['Trasformador60822SevillanaEndesa', 'Transformador 60822 Sevillana Endesa'],
      ['Hnos. SánchezCarpintería', 'Hnos. Sánchez Carpintería'],
      ['M.ªCarmen López', 'M.ª Carmen López'],
    ])('Corrige "%s" → "%s"', (input, expected) => {
      const result = deconcatenateText(input);
      expect(result.corrected).toBe(expected);
      expect(result.wasModified).toBe(true);
    });

    // Casos de Castril (Granada)
    test('Corrige preposición concatenada: "PN. Sierrade Castril"', () => {
      const result = deconcatenateText('PN. Sierrade Castril');
      expect(result.corrected).toBe('PN. Sierra de Castril');
      expect(result.patternsApplied).toContain('preposición:de');
    });
  });

  describe('deconcatenateText - NO debe modificar texto correcto', () => {
    
    test.each([
      'Centro de Salud Municipal',
      'CEIP San José',
      'Polideportivo Municipal',
      'E.S. REPSOL',
      'REPSOL',
      'Hidroeléctrica del Sur',
      'Audiovisual Mediterráneo',
    ])('No modifica texto correcto: "%s"', (input) => {
      const result = deconcatenateText(input);
      expect(result.wasModified).toBe(false);
      expect(result.corrected).toBe(input);
    });
  });

  describe('deconcatenateText - Casos sospechosos ALL CAPS', () => {
    
    test('Marca texto ALL CAPS largo como requiresReview', () => {
      const result = deconcatenateText('GASREPSOLGACH - SA');
      expect(result.requiresReview).toBe(true);
    });
  });
});

// ============================================================================
// VALIDACIÓN DE COORDENADAS
// ============================================================================

describe('validateCoordinateY', () => {
  
  test.each([
    [77905, 4077905, 'Genérica truncada'],
  ])('Corrige Y truncada: %d → %d (%s)', (input, expected) => {
    const result = validateCoordinateY(input);
    expect(result.wasCorrected).toBe(true);
    expect(result.corrected).toBe(expected);
    expect(result.issue).toBe('truncated_y');
  });

  test.each([
    [4077905, 'Berja normal'],
    [4185653, 'Castril normal'],
    [4136578, 'Colomera normal'],
  ])('No modifica Y normal: %d (%s)', (input) => {
    const result = validateCoordinateY(input);
    expect(result.wasCorrected).toBe(false);
    expect(result.corrected).toBe(input);
  });
});

describe('validateCoordinateX', () => {
  
  test('Detecta X concatenada (valor muy grande)', () => {
    const result = validateCoordinateX(50435298504342);
    expect(result.issue).toBe('concatenated');
  });

  test('Detecta outlier fuera de rango', () => {
    const result = validateCoordinateX(1000000);
    expect(result.issue).toBe('outlier');
  });

  test('Acepta X válida', () => {
    const result = validateCoordinateX(504352);
    expect(result.issue).toBeNull();
  });
});

describe('splitConcatenatedCoordinates', () => {
  
  test('Separa coordenadas concatenadas (caso Berja)', () => {
    const result = splitConcatenatedCoordinates('50435298504342');
    expect(result.wasConcatenated).toBe(true);
    expect(result.values).toHaveLength(2);
  });

  test('No modifica coordenadas normales', () => {
    const result = splitConcatenatedCoordinates('504352');
    expect(result.wasConcatenated).toBe(false);
    expect(result.values).toEqual([504352]);
  });
});

describe('detectMisplacedContent', () => {
  
  test('Detecta información de personal en TIPO', () => {
    const result = detectMisplacedContent('1 SARGENTO JEFE DE PARQUE');
    expect(result.hasMisplacedContent).toBe(true);
    expect(result.contentType).toBe('personal');
  });

  test('Detecta información de horario en TIPO', () => {
    const result = detectMisplacedContent('LABORABLES DE LUNES A VIERNES');
    expect(result.hasMisplacedContent).toBe(true);
    expect(result.contentType).toBe('horario');
  });

  test('No marca tipos normales', () => {
    const result = detectMisplacedContent('SANITARIO');
    expect(result.hasMisplacedContent).toBe(false);
  });
});