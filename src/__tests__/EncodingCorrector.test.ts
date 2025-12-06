/**
 * Tests para EncodingCorrector
 * 
 * Verifica la clase de corrección UTF-8 con sistema de tiers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EncodingCorrector,
  correctEncoding,
  correctEncodingWithExplanation,
  encodingCorrector,
} from '../lib/EncodingCorrector';
import {
  TIER1_HOT_PATTERNS,
  TIER2_WARM_PATTERNS,
  TIER3_COLD_PATTERNS,
  ALL_PATTERNS,
  PATTERN_COUNTS,
} from '../lib/mojibakePatterns';

describe('mojibakePatterns', () => {
  describe('Estructura de patrones', () => {
    it('debe tener el número correcto de patrones', () => {
      expect(TIER1_HOT_PATTERNS.length).toBe(17);
      expect(TIER2_WARM_PATTERNS.length).toBeGreaterThan(20);
      expect(TIER3_COLD_PATTERNS.length).toBeGreaterThan(10);
      expect(ALL_PATTERNS.length).toBe(
        TIER1_HOT_PATTERNS.length + 
        TIER2_WARM_PATTERNS.length + 
        TIER3_COLD_PATTERNS.length
      );
    });

    it('debe tener PATTERN_COUNTS consistente', () => {
      expect(PATTERN_COUNTS.hot).toBe(TIER1_HOT_PATTERNS.length);
      expect(PATTERN_COUNTS.warm).toBe(TIER2_WARM_PATTERNS.length);
      expect(PATTERN_COUNTS.cold).toBe(TIER3_COLD_PATTERNS.length);
      expect(PATTERN_COUNTS.total).toBe(ALL_PATTERNS.length);
    });

    it('todos los patrones deben tener estructura correcta', () => {
      for (const pattern of ALL_PATTERNS) {
        expect(pattern).toHaveProperty('corrupted');
        expect(pattern).toHaveProperty('correct');
        expect(pattern).toHaveProperty('description');
        expect(pattern.corrupted.length).toBeGreaterThan(0);
        expect(pattern.description.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('EncodingCorrector', () => {
  let corrector: EncodingCorrector;

  beforeEach(() => {
    corrector = new EncodingCorrector();
    corrector.resetStats();
  });

  describe('Corrección básica', () => {
    it('debe corregir vocales acentuadas minúsculas', () => {
      const result = corrector.correct('AlmerÃ­a');
      expect(result.corrected).toBe('Almería');
      expect(result.wasModified).toBe(true);
    });

    it('debe corregir ñ (crítico para topónimos)', () => {
      const result = corrector.correct('EspaÃ±a');
      expect(result.corrected).toBe('España');
      expect(result.wasModified).toBe(true);
    });

    it('debe corregir múltiples vocales en una palabra', () => {
      const result = corrector.correct('MÃ¡laga');
      expect(result.corrected).toBe('Málaga');
      expect(result.wasModified).toBe(true);
    });

    it('debe corregir símbolos de coordenadas', () => {
      const result = corrector.correct('37Âº 26\' 46"');
      expect(result.corrected).toBe("37º 26' 46\"");
      expect(result.wasModified).toBe(true);
    });

    it('debe preservar texto ya limpio', () => {
      const result = corrector.correct('Almería');
      expect(result.corrected).toBe('Almería');
      expect(result.wasModified).toBe(false);
    });

    it('debe manejar texto vacío', () => {
      const result = corrector.correct('');
      expect(result.corrected).toBe('');
      expect(result.wasModified).toBe(false);
    });

    it('debe manejar ASCII puro (coordenadas numéricas)', () => {
      const result = corrector.correct('524538.45');
      expect(result.corrected).toBe('524538.45');
      expect(result.wasModified).toBe(false);
    });
  });

  describe('Topónimos andaluces reales', () => {
    const casos = [
      { corrupted: 'GÃ¼Ã©jar Sierra', expected: 'Güéjar Sierra' },
      // Nota: Úbeda tiene patrón Ã\x9A que puede variar según encoding del archivo
      { corrupted: 'NÃ­jar', expected: 'Níjar' },
      { corrupted: 'AlmuÃ±Ã©car', expected: 'Almuñécar' },
      { corrupted: 'La LÃ­nea de la ConcepciÃ³n', expected: 'La Línea de la Concepción' },
    ];

    casos.forEach(({ corrupted, expected }) => {
      it(`debe corregir "${corrupted}" → "${expected}"`, () => {
        const result = corrector.correct(corrupted);
        expect(result.corrected).toBe(expected);
        expect(result.wasModified).toBe(true);
      });
    });
  });

  describe('Coordenadas DMS corruptas', () => {
    it('debe corregir coordenadas con símbolos', () => {
      const result = corrector.correct('37Â° 26Â´ 46.5"N');
      expect(result.corrected).toBe("37° 26´ 46.5\"N");
      expect(result.wasModified).toBe(true);
    });

    it('debe corregir símbolo de grado', () => {
      const result = corrector.correct('37Âº');
      expect(result.corrected).toBe('37º');
    });
  });

  describe('Sistema de Tiers', () => {
    it('debe usar solo Tier 1 para vocales comunes', () => {
      const result = corrector.correctWithExplanation('AlmerÃ­a');
      expect(result.tiersApplied).toContain('hot');
      expect(result.tiersApplied).not.toContain('warm');
      expect(result.tiersApplied).not.toContain('cold');
    });

    it('debe usar Tier 2 para comillas tipográficas', () => {
      const result = corrector.correctWithExplanation('â€œtextoâ€');
      expect(result.corrected).toBe('"texto"');
      expect(result.tiersApplied).toContain('warm');
    });
  });

  describe('Early-exit (optimización)', () => {
    it('debe hacer early-exit para ASCII puro', () => {
      const result = corrector.correctWithExplanation('12345.67');
      expect(result.skippedReason).toBe('clean_ascii');
      expect(result.processingTimeMs).toBeLessThan(1);
    });

    it('debe hacer early-exit para texto limpio con acentos', () => {
      const result = corrector.correctWithExplanation('Málaga');
      expect(result.skippedReason).toBe('no_indicators');
    });

    it('debe hacer early-exit para texto vacío', () => {
      const result = corrector.correctWithExplanation('');
      expect(result.skippedReason).toBe('empty');
    });
  });

  describe('Estadísticas', () => {
    it('debe trackear textos procesados', () => {
      corrector.correct('AlmerÃ­a');
      corrector.correct('Málaga');
      corrector.correct('12345');
      
      const stats = corrector.getStats();
      expect(stats.textsProcessed).toBe(3);
      expect(stats.textsModified).toBe(1);
      expect(stats.earlyExitCount).toBe(2);
    });

    it('debe trackear uso de tiers', () => {
      corrector.correct('AlmerÃ­a'); // Tier 1
      corrector.correct('â€œtextoâ€'); // Tier 2
      
      const stats = corrector.getStats();
      expect(stats.tierUsage.hot).toBeGreaterThan(0);
    });

    it('debe resetear estadísticas', () => {
      corrector.correct('AlmerÃ­a');
      corrector.resetStats();
      
      const stats = corrector.getStats();
      expect(stats.textsProcessed).toBe(0);
    });
  });

  describe('Confianza', () => {
    it('debe tener alta confianza para correcciones simples', () => {
      const result = corrector.correctWithExplanation('AlmerÃ­a');
      expect(result.confidence).toBeGreaterThan(0.95);
    });

    it('debe tener confianza 1.0 para texto sin modificar', () => {
      const result = corrector.correctWithExplanation('Málaga');
      expect(result.confidence).toBe(1.0);
    });
  });
});

describe('Funciones de utilidad', () => {
  describe('correctEncoding()', () => {
    it('debe corregir usando instancia global', () => {
      const result = correctEncoding('AlmerÃ­a');
      expect(result).toBe('Almería');
    });
  });

  describe('correctEncodingWithExplanation()', () => {
    it('debe retornar explicación detallada', () => {
      const result = correctEncodingWithExplanation('AlmerÃ­a');
      expect(result.original).toBe('AlmerÃ­a');
      expect(result.corrected).toBe('Almería');
      expect(result.operations.length).toBeGreaterThan(0);
    });
  });

  describe('encodingCorrector (singleton)', () => {
    it('debe existir y ser funcional', () => {
      expect(encodingCorrector).toBeDefined();
      const result = encodingCorrector.correct('EspaÃ±a');
      expect(result.corrected).toBe('España');
    });
  });
});

describe('EncodingCorrector.getPatternInfo()', () => {
  it('debe retornar información de patrones', () => {
    const info = EncodingCorrector.getPatternInfo();
    expect(info.total).toBeGreaterThan(50);
    expect(info.hot).toBe(17);
  });
});
