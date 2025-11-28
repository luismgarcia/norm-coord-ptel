/**
 * Tests para documentExtractor.ts v3.2
 * 
 * Cobertura:
 * - Patrones de detección de columnas (coordX, coordY, coordCombined)
 * - Limpieza de valores de coordenadas
 * - Validación de coordenadas UTM
 * - Detección de sub-headers
 * - Casos reales de documentos PTEL (Hornos, Colomera, etc.)
 * 
 * @module lib/__tests__/documentExtractor.test
 */

import { describe, it, expect } from 'vitest';
import { cleanCoordinateValue, isValidUTMValue } from '../documentExtractor';

// =============================================================================
// PATRONES DE COLUMNAS (reproduccidos para testing independiente)
// =============================================================================

const COLUMN_PATTERNS = {
  name: /\b(nombre|denominaci[oó]n|descripci[oó]n|elemento|infraestructura|instalaci[oó]n)\b/i,
  address: /\b(direcci[oó]n|ubicaci[oó]n|localizaci[oó]n|domicilio|emplazamiento)\b/i,
  type: /\b(tipo|tipolog[ií]a|categor[ií]a|clase|naturaleza)\b/i,
  // v3.2: Sin falso positivo de "y" española
  coordX: /\b(longitud|este|easting)\b|coord[^y]*x|^x\s*[-_]|^x$/i,
  coordY: /\b(latitud|norte|northing)\b|coord[^x]*y|^y\s*[-_]|^y$/i,
  coordCombined: /coordenadas?/i,
};

// =============================================================================
// TESTS: PATRONES DE COORDENADA X
// =============================================================================

describe('Patrón coordX', () => {
  const pattern = COLUMN_PATTERNS.coordX;

  describe('✅ Debe detectar correctamente', () => {
    it.each([
      ['x', 'celda con solo "x"'],
      ['X', 'celda con solo "X" mayúscula'],
      ['x-', 'x con guión'],
      ['x -', 'x con espacio y guión'],
      ['X - Longitud', 'formato Hornos patrimonio'],
      ['x_', 'x con guión bajo'],
      ['X_UTM', 'formato técnico'],
      ['Longitud', 'palabra completa'],
      ['longitud', 'minúsculas'],
      ['Este', 'dirección cardinal'],
      ['EASTING', 'término técnico'],
      ['Coord X', 'coordenada con espacio'],
      ['coord-x', 'coordenada con guión'],
      ['Coordenada X', 'texto completo'],
    ])('"%s" (%s)', (input) => {
      expect(pattern.test(input)).toBe(true);
    });
  });

  describe('❌ NO debe detectar', () => {
    it.each([
      ['y', 'coordenada Y'],
      ['Latitud', 'coordenada Y'],
      ['Cantidad y tipo', 'conjunción española'],
      ['Dirección', 'campo de dirección'],
      ['Nombre', 'campo de nombre'],
      ['Observaciones', 'campo genérico'],
      ['Superficie', 'campo numérico'],
      ['Texto con x en medio', 'x dentro de palabra'],
    ])('"%s" (%s)', (input) => {
      expect(pattern.test(input)).toBe(false);
    });
  });
});

// =============================================================================
// TESTS: PATRONES DE COORDENADA Y
// =============================================================================

describe('Patrón coordY', () => {
  const pattern = COLUMN_PATTERNS.coordY;

  describe('✅ Debe detectar correctamente', () => {
    it.each([
      ['y', 'celda con solo "y"'],
      ['Y', 'celda con solo "Y" mayúscula'],
      ['y-', 'y con guión'],
      ['y -', 'y con espacio y guión'],
      ['y- Latitud', 'formato Hornos patrimonio'],
      ['Y - Latitud', 'formato con espacios'],
      ['y_', 'y con guión bajo'],
      ['Y_UTM', 'formato técnico'],
      ['Latitud', 'palabra completa'],
      ['latitud', 'minúsculas'],
      ['Norte', 'dirección cardinal'],
      ['NORTHING', 'término técnico'],
      ['Coord Y', 'coordenada con espacio'],
      ['coord-y', 'coordenada con guión'],
      ['Coordenada Y', 'texto completo'],
    ])('"%s" (%s)', (input) => {
      expect(pattern.test(input)).toBe(true);
    });
  });

  describe('❌ NO debe detectar (FIX v3.2 - falso positivo "y" española)', () => {
    it.each([
      ['Cantidad y tipo', 'conjunción "y" en texto'],
      ['Lugar y afección', 'conjunción "y" típica PTEL'],
      ['Medios humanos Cantidad y tipo', 'header completo de recursos'],
      ['Responsable y suplente', 'campos de personal'],
      ['Nombre y apellidos', 'datos personales'],
      ['Dirección y teléfono', 'datos de contacto'],
      ['Tipo y categoría', 'clasificación'],
      ['x', 'coordenada X'],
      ['Longitud', 'coordenada X'],
      ['Dirección', 'campo de dirección'],
      ['Nombre', 'campo de nombre'],
    ])('"%s" (%s)', (input) => {
      expect(pattern.test(input)).toBe(false);
    });
  });
});

// =============================================================================
// TESTS: PATRÓN COORDENADAS COMBINADAS
// =============================================================================

describe('Patrón coordCombined', () => {
  const pattern = COLUMN_PATTERNS.coordCombined;

  describe('✅ Debe detectar correctamente', () => {
    it.each([
      ['Coordenadas', 'simple'],
      ['Coordenada', 'singular'],
      ['COORDENADAS', 'mayúsculas'],
      ['Coordenadas (UTM- Geográficas)', 'formato Hornos industrial'],
      ['Coordenadas (UTM - Geográficas)', 'con espacios'],
      ['Coordenadas (UTM o geográficas)', 'formato alternativo'],
      ['Coordenadas UTM', 'sin paréntesis'],
      ['coordenadas geográficas', 'minúsculas'],
    ])('"%s" (%s)', (input) => {
      expect(pattern.test(input)).toBe(true);
    });
  });
});

// =============================================================================
// TESTS: LIMPIEZA DE VALORES DE COORDENADAS
// =============================================================================

describe('cleanCoordinateValue', () => {
  describe('Separadores de miles con punto (formato Hornos)', () => {
    it.each([
      ['524.538', '524538', 'X típica Jaén'],
      ['4.229.920', '4229920', 'Y típica con dos puntos'],
      ['524.891', '524891', 'X industrial Hornos'],
      ['4.230.105', '4230105', 'Y industrial Hornos'],
      ['437.686', '437686', 'X zona oeste Andalucía'],
    ])('"%s" → "%s" (%s)', (input, expected) => {
      expect(cleanCoordinateValue(input)).toBe(expected);
    });
  });

  describe('Separadores de miles con espacio', () => {
    it.each([
      ['506 527', '506527', 'X con espacio'],
      ['4 076 367', '4076367', 'Y con espacios múltiples'],
      ['524 538', '524538', 'X simple'],
    ])('"%s" → "%s" (%s)', (input, expected) => {
      expect(cleanCoordinateValue(input)).toBe(expected);
    });
  });

  describe('Placeholders que deben retornar vacío', () => {
    it.each([
      ['Indicar', '', 'placeholder típico PTEL'],
      ['indicar', '', 'minúsculas'],
      ['INDICAR', '', 'mayúsculas'],
      ['Sin datos', '', 'sin datos'],
      ['---', '', 'guiones'],
      ['...', '', 'puntos'],
      ['___', '', 'guiones bajos'],
      ['N/A', '', 'no aplica'],
      ['n/a', '', 'minúsculas'],
      ['xxx', '', 'placeholder x'],
      ['Completar', '', 'instrucción'],
    ])('"%s" → "%s" (%s)', (input, expected) => {
      expect(cleanCoordinateValue(input)).toBe(expected);
    });
  });

  describe('Valores decimales legítimos (NO deben alterarse)', () => {
    it.each([
      ['437301.8', '437301.8', 'decimal con 1 dígito'],
      ['437301.85', '437301.85', 'decimal con 2 dígitos'],
      ['4230105.5', '4230105.5', 'Y con decimal'],
    ])('"%s" → "%s" (%s)', (input, expected) => {
      expect(cleanCoordinateValue(input)).toBe(expected);
    });
  });

  describe('Coma decimal (formato europeo)', () => {
    it.each([
      ['524538,5', '524538.5', 'coma a punto'],
      ['4230105,25', '4230105.25', 'Y con coma'],
    ])('"%s" → "%s" (%s)', (input, expected) => {
      expect(cleanCoordinateValue(input)).toBe(expected);
    });
  });
});

// =============================================================================
// TESTS: VALIDACIÓN UTM ANDALUCÍA
// =============================================================================

describe('isValidUTMValue', () => {
  describe('Coordenada X (Este) - Rango válido: 100.000 - 800.000', () => {
    it.each([
      ['100000', true, 'límite inferior'],
      ['524538', true, 'Hornos típica'],
      ['437686', true, 'Granada oeste'],
      ['800000', true, 'límite superior'],
      ['99999', false, 'bajo límite'],
      ['800001', false, 'sobre límite'],
      ['0', false, 'cero'],
      ['abc', false, 'no numérico'],
    ])('"%s" → %s (%s)', (input, expected, desc) => {
      expect(isValidUTMValue(input, 'x')).toBe(expected);
    });
  });

  describe('Coordenada Y (Norte) - Rango válido: 4.000.000 - 4.350.000', () => {
    it.each([
      ['4000000', true, 'límite inferior'],
      ['4229920', true, 'Hornos típica'],
      ['4076367', true, 'Almería zona'],
      ['4350000', true, 'límite superior'],
      ['3999999', false, 'bajo límite'],
      ['4350001', false, 'sobre límite'],
      ['0', false, 'cero'],
      ['abc', false, 'no numérico'],
    ])('"%s" → %s (%s)', (input, expected, desc) => {
      expect(isValidUTMValue(input, 'y')).toBe(expected);
    });
  });
});

// =============================================================================
// TESTS: CASOS REALES DOCUMENTOS PTEL
// =============================================================================

describe('Casos reales PTEL', () => {
  describe('Headers de Hornos.odt', () => {
    it('Tabla [1] Actividad Industrial - headers coordinadas', () => {
      const headers = ['x -', 'y- Latitud'];
      expect(COLUMN_PATTERNS.coordX.test(headers[0])).toBe(true);
      expect(COLUMN_PATTERNS.coordY.test(headers[1])).toBe(true);
    });

    it('Tabla [2] Patrimonio - headers coordenadas', () => {
      const headers = ['X - Longitud', 'y- Latitud'];
      expect(COLUMN_PATTERNS.coordX.test(headers[0])).toBe(true);
      expect(COLUMN_PATTERNS.coordY.test(headers[1])).toBe(true);
    });

    it('Tabla recursos - NO debe detectar "y" como coordenada', () => {
      const header = 'Medios humanos Cantidad y tipo';
      expect(COLUMN_PATTERNS.coordY.test(header)).toBe(false);
    });

    it('Coordenadas combinadas formato Hornos', () => {
      const header = 'Coordenadas (UTM- Geográficas)';
      expect(COLUMN_PATTERNS.coordCombined.test(header)).toBe(true);
    });
  });

  describe('Datos reales de infraestructuras', () => {
    it('Castillo de Hornos - limpieza coordenadas', () => {
      expect(cleanCoordinateValue('524.643')).toBe('524643');
      expect(cleanCoordinateValue('4.229.868')).toBe('4229868');
    });

    it('Pedro Fuentes S.L. - limpieza coordenadas', () => {
      expect(cleanCoordinateValue('524.891')).toBe('524891');
      expect(cleanCoordinateValue('4.230.105')).toBe('4230105');
    });

    it('Validación coordenadas reales', () => {
      // Castillo de Hornos
      expect(isValidUTMValue('524643', 'x')).toBe(true);
      expect(isValidUTMValue('4229868', 'y')).toBe(true);
      
      // Conjunto Histórico
      expect(isValidUTMValue('524538', 'x')).toBe(true);
      expect(isValidUTMValue('4229920', 'y')).toBe(true);
    });
  });
});
