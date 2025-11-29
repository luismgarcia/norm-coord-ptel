/**
 * PTEL Andalucía - Tests del Normalizador de Coordenadas v2.0
 * 
 * Batería de tests basada en datos reales de municipios andaluces:
 * - Berja (Almería)
 * - Hornos (Jaén)
 * - Colomera (Granada)
 * - Quéntar (Granada)
 * - Castril (Granada)
 * 
 * @version 2.0.0
 */

import {
  normalizarCoordenada,
  validarCoordenada,
  procesarParCoordenadas,
  detectarPatron,
  esPlaceholder,
  RANGOS_ANDALUCIA,
  type PatronDetectado,
} from '../lib/coordinateNormalizer';

// ============================================================================
// TIPOS PARA TESTS
// ============================================================================

interface TestCase {
  id: string;
  descripcion: string;
  input: string;
  esperado: number | null;
  patronEsperado?: PatronDetectado;
  municipio?: string;
}

interface TestPar {
  id: string;
  descripcion: string;
  xInput: string;
  yInput: string;
  xEsperado: number | null;
  yEsperado: number | null;
  intercambioEsperado?: boolean;
  municipio?: string;
}

// ============================================================================
// CASOS DE TEST: NORMALIZACIÓN INDIVIDUAL
// ============================================================================

const TESTS_NORMALIZACION: TestCase[] = [
  // PATRÓN P1-1: Espacio + Doble Tilde (Berja)
  {
    id: 'P1-1-01',
    descripcion: 'Espacio + doble tilde - X 6 dígitos',
    input: '504 750´´92',
    esperado: 504750.92,
    patronEsperado: 'ESPACIO_DOBLE_TILDE',
    municipio: 'Berja',
  },
  {
    id: 'P1-1-02',
    descripcion: 'Espacio + doble tilde - Y 7 dígitos',
    input: '4 077 153´´36',
    esperado: 4077153.36,
    patronEsperado: 'ESPACIO_DOBLE_TILDE',
    municipio: 'Berja',
  },
  
  // PATRÓN P1-6: Solo coma decimal (Colomera, Quéntar)
  {
    id: 'P1-6-01',
    descripcion: 'Coma decimal - X Colomera',
    input: '436780,0',
    esperado: 436780.0,
    patronEsperado: 'COMA_DECIMAL',
    municipio: 'Colomera',
  },
  {
    id: 'P1-6-02',
    descripcion: 'Coma decimal - Y Colomera',
    input: '4136578,2',
    esperado: 4136578.2,
    patronEsperado: 'COMA_DECIMAL',
    municipio: 'Colomera',
  },
  
  // PATRÓN P1-7: Solo punto miles (Hornos)
  {
    id: 'P1-7-01',
    descripcion: 'Punto miles - X Hornos',
    input: '524.891',
    esperado: 524891,
    patronEsperado: 'PUNTO_MILES',
    municipio: 'Hornos',
  },
  {
    id: 'P1-7-02',
    descripcion: 'Punto miles - Y Hornos',
    input: '4.230.105',
    esperado: 4230105,
    patronEsperado: 'PUNTO_MILES',
    municipio: 'Hornos',
  },
  
  // FORMATO LIMPIO (Castril)
  {
    id: 'LIMPIO-01',
    descripcion: 'Formato limpio - X con decimales',
    input: '521581.88',
    esperado: 521581.88,
    patronEsperado: 'LIMPIO',
    municipio: 'Castril',
  },
  {
    id: 'LIMPIO-02',
    descripcion: 'Formato limpio - Y con decimales',
    input: '4185653.05',
    esperado: 4185653.05,
    patronEsperado: 'LIMPIO',
    municipio: 'Castril',
  },
  
  // PLACEHOLDERS
  {
    id: 'P3-01',
    descripcion: 'Placeholder - Indicar',
    input: 'Indicar',
    esperado: null,
    patronEsperado: 'PLACEHOLDER',
  },
  {
    id: 'P3-02',
    descripcion: 'Placeholder - N/A',
    input: 'N/A',
    esperado: null,
    patronEsperado: 'PLACEHOLDER',
  },
];

// ============================================================================
// CASOS DE TEST: PARES DE COORDENADAS
// ============================================================================

const TESTS_PARES: TestPar[] = [
  {
    id: 'PAR-BERJA-01',
    descripcion: 'Berja - Espacio + doble tilde',
    xInput: '504 750´´92',
    yInput: '4 077 153´´36',
    xEsperado: 504750.92,
    yEsperado: 4077153.36,
    municipio: 'Berja',
  },
  {
    id: 'PAR-COLOMERA-01',
    descripcion: 'Colomera - Coma decimal',
    xInput: '436780,0',
    yInput: '4136578,2',
    xEsperado: 436780.0,
    yEsperado: 4136578.2,
    municipio: 'Colomera',
  },
  {
    id: 'PAR-CASTRIL-01',
    descripcion: 'Castril - Limpio',
    xInput: '521581.88',
    yInput: '4185653.05',
    xEsperado: 521581.88,
    yEsperado: 4185653.05,
    municipio: 'Castril',
  },
  
  // Error P0-1: Y truncada
  {
    id: 'PAR-P0-1-01',
    descripcion: 'Error P0-1: Y truncada (falta 4)',
    xInput: '504750',
    yInput: '77905',
    xEsperado: 504750,
    yEsperado: 4077905,
  },
  
  // Error P0-2: Intercambio X↔Y
  {
    id: 'PAR-P0-2-01',
    descripcion: 'Error P0-2: Intercambio X↔Y',
    xInput: '4077905',
    yInput: '504750',
    xEsperado: 504750,
    yEsperado: 4077905,
    intercambioEsperado: true,
  },
  
  // Placeholders
  {
    id: 'PAR-NULL-01',
    descripcion: 'Ambos placeholder texto',
    xInput: 'Indicar',
    yInput: 'Pendiente',
    xEsperado: null,
    yEsperado: null,
  },
];

// ============================================================================
// TESTS CON VITEST
// ============================================================================

describe('Normalizador de Coordenadas PTEL', () => {
  
  describe('Normalización individual', () => {
    TESTS_NORMALIZACION.forEach((test) => {
      it(`${test.id}: ${test.descripcion}`, () => {
        const resultado = normalizarCoordenada(test.input);
        
        if (test.esperado === null) {
          expect(resultado.valorNormalizado).toBeNull();
        } else {
          expect(resultado.valorNormalizado).toBeCloseTo(test.esperado, 2);
        }
        
        if (test.patronEsperado) {
          expect(resultado.patronDetectado).toBe(test.patronEsperado);
        }
      });
    });
  });
  
  describe('Pares de coordenadas', () => {
    TESTS_PARES.forEach((test) => {
      it(`${test.id}: ${test.descripcion}`, () => {
        const resultado = procesarParCoordenadas(test.xInput, test.yInput);
        
        if (test.xEsperado === null) {
          expect(resultado.x).toBeNull();
        } else {
          expect(resultado.x).toBeCloseTo(test.xEsperado, 2);
        }
        
        if (test.yEsperado === null) {
          expect(resultado.y).toBeNull();
        } else {
          expect(resultado.y).toBeCloseTo(test.yEsperado, 2);
        }
        
        if (test.intercambioEsperado !== undefined) {
          expect(resultado.intercambioAplicado).toBe(test.intercambioEsperado);
        }
      });
    });
  });
  
  describe('Validación de rangos', () => {
    it('Detecta X UTM válida', () => {
      const resultado = validarCoordenada(450000);
      expect(resultado.valido).toBe(true);
      expect(resultado.tipo).toBe('X');
    });
    
    it('Detecta Y UTM válida', () => {
      const resultado = validarCoordenada(4100000);
      expect(resultado.valido).toBe(true);
      expect(resultado.tipo).toBe('Y');
    });
    
    it('Corrige Y truncada', () => {
      const resultado = validarCoordenada(77905);
      expect(resultado.valido).toBe(true);
      expect(resultado.tipo).toBe('Y');
      expect(resultado.correccionAplicada).toBe(4077905);
    });
    
    it('Rechaza valor fuera de rango', () => {
      const resultado = validarCoordenada(1000);
      expect(resultado.valido).toBe(false);
    });
  });
  
  describe('Detección de placeholders', () => {
    it('Detecta placeholder texto', () => {
      expect(esPlaceholder('Indicar')).toBe(true);
      expect(esPlaceholder('N/A')).toBe(true);
      expect(esPlaceholder('Sin datos')).toBe(true);
    });
    
    it('Detecta placeholder numérico', () => {
      expect(esPlaceholder('0')).toBe(true);
      expect(esPlaceholder('99999')).toBe(true);
    });
    
    it('No marca valores válidos como placeholder', () => {
      expect(esPlaceholder('504750')).toBe(false);
      expect(esPlaceholder('4077905.68')).toBe(false);
    });
  });
});
