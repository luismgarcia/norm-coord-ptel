/**
 * encodingDetector.test.ts - Tests para F027 UTF8-2
 * 
 * Verifica detección temprana de mojibake para early-exit.
 * 
 * @version 1.0.0
 * @date 2025-12-07
 */

import { describe, it, expect } from 'vitest';
import { 
  isSuspicious, 
  isCleanASCII, 
  detectEncodingIssue,
  analyzeTexts 
} from '../lib/encodingDetector';

// ============================================================================
// isCleanASCII
// ============================================================================

describe('isCleanASCII', () => {
  describe('Textos ASCII puros (deben retornar true)', () => {
    it('coordenada numérica simple', () => {
      expect(isCleanASCII('504750.92')).toBe(true);
    });
    
    it('coordenada con espacios', () => {
      expect(isCleanASCII('504 750')).toBe(true);
    });
    
    it('texto inglés básico', () => {
      expect(isCleanASCII('Hello World')).toBe(true);
    });
    
    it('string vacío', () => {
      expect(isCleanASCII('')).toBe(true);
    });
    
    it('solo números', () => {
      expect(isCleanASCII('1234567890')).toBe(true);
    });
    
    it('caracteres especiales ASCII', () => {
      expect(isCleanASCII('37°26\'46.5"N')).toBe(false); // ° no es ASCII
    });
    
    it('puntuación ASCII', () => {
      expect(isCleanASCII('test-case_1.txt')).toBe(true);
    });
  });
  
  describe('Textos con caracteres extendidos (deben retornar false)', () => {
    it('vocal acentuada española', () => {
      expect(isCleanASCII('Almería')).toBe(false);
    });
    
    it('eñe', () => {
      expect(isCleanASCII('España')).toBe(false);
    });
    
    it('mojibake Ã', () => {
      expect(isCleanASCII('AlmerÃ­a')).toBe(false);
    });
    
    it('símbolo grado', () => {
      expect(isCleanASCII('37°')).toBe(false);
    });
  });
});

// ============================================================================
// isSuspicious
// ============================================================================

describe('isSuspicious', () => {
  describe('Textos limpios (NO sospechosos)', () => {
    it('coordenada numérica', () => {
      expect(isSuspicious('504750.92')).toBe(false);
    });
    
    it('texto ASCII', () => {
      expect(isSuspicious('Calle Mayor 5')).toBe(false);
    });
    
    it('string vacío', () => {
      expect(isSuspicious('')).toBe(false);
    });
    
    it('null coercionado', () => {
      expect(isSuspicious(null as unknown as string)).toBe(false);
    });
    
    it('español válido - Almería', () => {
      expect(isSuspicious('Almería')).toBe(false);
    });
    
    it('español válido - Cádiz', () => {
      expect(isSuspicious('Cádiz')).toBe(false);
    });
    
    it('español válido - Málaga', () => {
      expect(isSuspicious('Málaga')).toBe(false);
    });
    
    it('español válido - Jaén', () => {
      expect(isSuspicious('Jaén')).toBe(false);
    });
    
    it('español válido - con eñe', () => {
      expect(isSuspicious('Peñarroya-Pueblonuevo')).toBe(false);
    });
    
    it('español válido - con diéresis', () => {
      expect(isSuspicious('Güéjar Sierra')).toBe(false);
    });
  });
  
  describe('Textos con mojibake (SÍ sospechosos)', () => {
    it('Almería corrupta', () => {
      expect(isSuspicious('AlmerÃ­a')).toBe(true);
    });
    
    it('Málaga corrupta', () => {
      expect(isSuspicious('MÃ¡laga')).toBe(true);
    });
    
    it('Cádiz corrupta', () => {
      expect(isSuspicious('CÃ¡diz')).toBe(true);
    });
    
    it('Jaén corrupta', () => {
      expect(isSuspicious('JaÃ©n')).toBe(true);
    });
    
    it('eñe corrupta', () => {
      expect(isSuspicious('NiÃ±os')).toBe(true);
    });
    
    it('símbolo grado corrupto', () => {
      expect(isSuspicious('37Âº26\'N')).toBe(true);
    });
    
    it('tilde corrupta en coordenadas', () => {
      expect(isSuspicious('504 750Â´92')).toBe(true);
    });
    
    it('comillas tipográficas corruptas', () => {
      expect(isSuspicious('texto â€œentre comillasâ€')).toBe(true);
    });
  });
  
  describe('Casos límite', () => {
    it('solo Ã aislada', () => {
      expect(isSuspicious('Ã')).toBe(true);
    });
    
    it('solo Â aislada', () => {
      expect(isSuspicious('Â')).toBe(true);
    });
    
    it('número con Â', () => {
      expect(isSuspicious('100Â€')).toBe(true);
    });
  });
});

// ============================================================================
// detectEncodingIssue
// ============================================================================

describe('detectEncodingIssue', () => {
  it('texto vacío → empty', () => {
    const result = detectEncodingIssue('');
    expect(result.suspicious).toBe(false);
    expect(result.reason).toBe('empty');
  });
  
  it('ASCII puro → ascii_clean', () => {
    const result = detectEncodingIssue('504750.92');
    expect(result.suspicious).toBe(false);
    expect(result.reason).toBe('ascii_clean');
  });
  
  it('español válido → clean_extended', () => {
    const result = detectEncodingIssue('Almería');
    expect(result.suspicious).toBe(false);
    expect(result.reason).toBe('clean_extended');
  });
  
  it('mojibake con Ã → mojibake_primary', () => {
    const result = detectEncodingIssue('AlmerÃ­a');
    expect(result.suspicious).toBe(true);
    expect(result.reason).toBe('mojibake_primary');
    expect(result.indicators).toContain('Ã');
  });
  
  it('mojibake con Â → mojibake_primary', () => {
    const result = detectEncodingIssue('37Âº');
    expect(result.suspicious).toBe(true);
    expect(result.reason).toBe('mojibake_primary');
    expect(result.indicators).toContain('Â');
  });
});

// ============================================================================
// analyzeTexts
// ============================================================================

describe('analyzeTexts', () => {
  it('analiza array mixto correctamente', () => {
    const texts = [
      '504750.92',      // ASCII
      'Almería',        // clean extended
      'AlmerÃ­a',       // suspicious
      'Hello',          // ASCII
      'MÃ¡laga',        // suspicious
    ];
    
    const result = analyzeTexts(texts);
    
    expect(result.total).toBe(5);
    expect(result.ascii).toBe(2);
    expect(result.cleanExtended).toBe(1);
    expect(result.suspicious).toBe(2);
    expect(result.suspiciousTexts).toContain('AlmerÃ­a');
    expect(result.suspiciousTexts).toContain('MÃ¡laga');
  });
  
  it('array vacío', () => {
    const result = analyzeTexts([]);
    expect(result.total).toBe(0);
    expect(result.suspicious).toBe(0);
  });
  
  it('todos limpios', () => {
    const result = analyzeTexts(['504750', '123', 'test']);
    expect(result.suspicious).toBe(0);
    expect(result.ascii).toBe(3);
  });
});

// ============================================================================
// Casos reales PTEL Andalucía
// ============================================================================

describe('Casos reales PTEL Andalucía', () => {
  describe('Topónimos limpios (no deben ser sospechosos)', () => {
    const toponimosLimpios = [
      'Alcalá la Real',
      'Vélez-Málaga', 
      'Úbeda',
      'Sanlúcar de Barrameda',
      'Peñarroya-Pueblonuevo',
      'Güéjar Sierra',
      'Almuñécar',
      'Córdoba',
      'Sevilla',
      'Granada',
    ];
    
    toponimosLimpios.forEach(toponimo => {
      it(`"${toponimo}" no es sospechoso`, () => {
        expect(isSuspicious(toponimo)).toBe(false);
      });
    });
  });
  
  describe('Topónimos corruptos (deben ser sospechosos)', () => {
    const toponimosCorruptos = [
      { corrupto: 'AlcalÃ¡ la Real', original: 'Alcalá la Real' },
      { corrupto: 'VÃ©lez-MÃ¡laga', original: 'Vélez-Málaga' },
      { corrupto: 'Ãšbeda', original: 'Úbeda' },
      { corrupto: 'SanlÃºcar de Barrameda', original: 'Sanlúcar de Barrameda' },
      { corrupto: 'PeÃ±arroya-Pueblonuevo', original: 'Peñarroya-Pueblonuevo' },
    ];
    
    toponimosCorruptos.forEach(({ corrupto, original }) => {
      it(`"${corrupto}" (de ${original}) es sospechoso`, () => {
        expect(isSuspicious(corrupto)).toBe(true);
      });
    });
  });
  
  describe('Coordenadas', () => {
    it('coordenada limpia numérica', () => {
      expect(isSuspicious('504750.92')).toBe(false);
    });
    
    it('coordenada con espacio', () => {
      expect(isSuspicious('4 229 868')).toBe(false);
    });
    
    it('coordenada con mojibake en separador', () => {
      expect(isSuspicious('504 750Â´92')).toBe(true);
    });
    
    it('coordenada DMS limpia', () => {
      // El símbolo ° no es mojibake, es válido
      expect(isSuspicious('37°26\'46"N')).toBe(false);
    });
    
    it('coordenada DMS con mojibake', () => {
      expect(isSuspicious('37Âº26\'46"N')).toBe(true);
    });
  });
});
