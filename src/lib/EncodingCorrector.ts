/**
 * PTEL Andalucía - EncodingCorrector
 * 
 * Servicio reutilizable para corrección de mojibake UTF-8 con sistema de tiers.
 * Implementa estrategia longest-match-first y early-exit para documentos limpios.
 * 
 * Características:
 * - Sistema de 3 tiers (hot/warm/cold) para optimización
 * - Early-exit para textos ASCII puros (~90% de coordenadas)
 * - Ordenación longest-match-first para evitar conflictos
 * - Explicación detallada de correcciones (audit log)
 * - Intento de fix de doble encoding con TextDecoder nativo
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

import {
  MojibakePattern,
  PatternTier,
  TIER1_HOT_PATTERNS,
  TIER2_WARM_PATTERNS,
  TIER3_COLD_PATTERNS,
  ALL_PATTERNS,
  MOJIBAKE_INDICATORS,
  PATTERN_COUNTS,
} from './mojibakePatterns';

import { isSuspicious, isCleanASCII } from './encodingDetector';

// ============================================================================
// TIPOS
// ============================================================================

export interface CorrectionResult {
  original: string;
  corrected: string;
  wasModified: boolean;
  tiersApplied: PatternTier[];
  patternsMatched: string[];
  confidence: number;
}

export interface CorrectionExplanation extends CorrectionResult {
  operations: CorrectionOperation[];
  processingTimeMs: number;
  skippedReason?: 'clean_ascii' | 'no_indicators' | 'empty';
}

export interface CorrectionOperation {
  tier: PatternTier;
  pattern: string;
  replacement: string;
  description: string;
  occurrences: number;
}

export interface CorrectorStats {
  textsProcessed: number;
  textsModified: number;
  earlyExitCount: number;
  tierUsage: Record<PatternTier, number>;
  averageProcessingMs: number;
}

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================

export class EncodingCorrector {
  private sortedPatterns: {
    hot: MojibakePattern[];
    warm: MojibakePattern[];
    cold: MojibakePattern[];
  };
  
  private stats: CorrectorStats = {
    textsProcessed: 0,
    textsModified: 0,
    earlyExitCount: 0,
    tierUsage: { hot: 0, warm: 0, cold: 0 },
    averageProcessingMs: 0,
  };
  
  private totalProcessingMs = 0;

  constructor() {
    // Pre-ordenar patrones por longitud descendente (longest-match-first)
    this.sortedPatterns = {
      hot: this.sortByLength(TIER1_HOT_PATTERNS),
      warm: this.sortByLength(TIER2_WARM_PATTERNS),
      cold: this.sortByLength(TIER3_COLD_PATTERNS),
    };
  }

  /**
   * Ordena patrones por longitud descendente
   */
  private sortByLength(patterns: MojibakePattern[]): MojibakePattern[] {
    return [...patterns].sort(
      (a, b) => b.corrupted.length - a.corrupted.length
    );
  }

  /**
   * Corrección básica - retorna resultado simple
   */
  correct(text: string): CorrectionResult {
    const explanation = this.correctWithExplanation(text);
    return {
      original: explanation.original,
      corrected: explanation.corrected,
      wasModified: explanation.wasModified,
      tiersApplied: explanation.tiersApplied,
      patternsMatched: explanation.patternsMatched,
      confidence: explanation.confidence,
    };
  }

  /**
   * Corrección con explicación detallada (para auditoría)
   */
  correctWithExplanation(text: string): CorrectionExplanation {
    const startTime = performance.now();
    this.stats.textsProcessed++;

    // Early-exit: texto vacío/null
    if (!text || text.length === 0) {
      return this.createSkippedResult(text, 'empty', startTime);
    }

    // Early-exit: ASCII puro (fast-path)
    if (isCleanASCII(text)) {
      this.stats.earlyExitCount++;
      return this.createSkippedResult(text, 'clean_ascii', startTime);
    }

    // Early-exit: sin indicadores de mojibake
    if (!isSuspicious(text)) {
      this.stats.earlyExitCount++;
      return this.createSkippedResult(text, 'no_indicators', startTime);
    }

    // Procesar con tiers
    const operations: CorrectionOperation[] = [];
    const tiersApplied: PatternTier[] = [];
    let corrected = text;

    // Intentar fix de doble encoding primero
    const doubleFixed = this.tryFixDoubleEncoding(corrected);
    if (doubleFixed !== corrected) {
      operations.push({
        tier: 'cold',
        pattern: '[double-encoding]',
        replacement: '[decoded]',
        description: 'Doble encoding corregido con TextDecoder',
        occurrences: 1,
      });
      corrected = doubleFixed;
    }

    // Tier 1: Hot (siempre evaluar)
    const tier1Result = this.applyTier(corrected, 'hot');
    if (tier1Result.modified) {
      corrected = tier1Result.text;
      tiersApplied.push('hot');
      operations.push(...tier1Result.operations);
      this.stats.tierUsage.hot++;
    }

    // Tier 2: Warm (solo si aún hay indicadores)
    if (this.hasIndicators(corrected, 'warm')) {
      const tier2Result = this.applyTier(corrected, 'warm');
      if (tier2Result.modified) {
        corrected = tier2Result.text;
        tiersApplied.push('warm');
        operations.push(...tier2Result.operations);
        this.stats.tierUsage.warm++;
      }
    }

    // Tier 3: Cold (solo si Tier 1+2 no resolvieron)
    if (this.hasIndicators(corrected, 'cold')) {
      const tier3Result = this.applyTier(corrected, 'cold');
      if (tier3Result.modified) {
        corrected = tier3Result.text;
        tiersApplied.push('cold');
        operations.push(...tier3Result.operations);
        this.stats.tierUsage.cold++;
      }
    }

    // Normalización NFC final
    corrected = corrected.normalize('NFC');

    const wasModified = text !== corrected;
    if (wasModified) {
      this.stats.textsModified++;
    }

    const endTime = performance.now();
    const processingTimeMs = endTime - startTime;
    this.totalProcessingMs += processingTimeMs;
    this.stats.averageProcessingMs = 
      this.totalProcessingMs / this.stats.textsProcessed;

    return {
      original: text,
      corrected,
      wasModified,
      tiersApplied,
      patternsMatched: operations.map(op => op.pattern),
      confidence: this.calculateConfidence(operations, corrected),
      operations,
      processingTimeMs,
    };
  }

  /**
   * Aplica patrones de un tier específico
   */
  private applyTier(
    text: string,
    tier: PatternTier
  ): { text: string; modified: boolean; operations: CorrectionOperation[] } {
    const patterns = this.sortedPatterns[tier];
    const operations: CorrectionOperation[] = [];
    let result = text;
    let modified = false;

    for (const pattern of patterns) {
      const before = result;
      result = result.split(pattern.corrupted).join(pattern.correct);
      
      if (result !== before) {
        modified = true;
        const occurrences = (before.length - result.length) / 
          (pattern.corrupted.length - pattern.correct.length) || 1;
        
        operations.push({
          tier,
          pattern: pattern.corrupted,
          replacement: pattern.correct,
          description: pattern.description,
          occurrences: Math.round(occurrences),
        });
      }
    }

    return { text: result, modified, operations };
  }

  /**
   * Verifica si hay indicadores para un tier específico
   */
  private hasIndicators(text: string, tier: PatternTier): boolean {
    switch (tier) {
      case 'warm':
        return MOJIBAKE_INDICATORS.secondary.test(text) ||
               text.includes('â€');
      case 'cold':
        return MOJIBAKE_INDICATORS.doubleEncoding.test(text) ||
               isSuspicious(text);
      default:
        return MOJIBAKE_INDICATORS.primary.test(text);
    }
  }

  /**
   * Intenta corregir doble encoding usando TextDecoder nativo
   */
  tryFixDoubleEncoding(text: string): string {
    // Solo intentar si hay indicadores de doble encoding
    if (!MOJIBAKE_INDICATORS.doubleEncoding.test(text)) {
      return text;
    }

    try {
      // Convertir a bytes interpretando como Latin-1
      const bytes = new Uint8Array(
        text.split('').map(c => c.charCodeAt(0))
      );
      
      // Intentar decodificar como UTF-8
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const decoded = decoder.decode(bytes);
      
      // Verificar que el resultado es mejor
      if (decoded.length > 0 && !isSuspicious(decoded)) {
        return decoded;
      }
    } catch {
      // Si falla, retornar original
    }
    
    return text;
  }

  /**
   * Calcula confianza basada en operaciones realizadas
   */
  private calculateConfidence(
    operations: CorrectionOperation[],
    result: string
  ): number {
    if (operations.length === 0) return 1.0;

    // Base: 1.0
    let confidence = 1.0;

    // Penalizar por número de operaciones (más operaciones = menos certeza)
    confidence -= operations.length * 0.01;

    // Penalizar por doble encoding (menos predecible)
    if (operations.some(op => op.pattern === '[double-encoding]')) {
      confidence -= 0.05;
    }

    // Penalizar si aún hay indicadores en el resultado
    if (isSuspicious(result)) {
      confidence -= 0.1;
    }

    // Bonus por usar solo Tier 1 (patrones muy confiables)
    if (operations.every(op => op.tier === 'hot')) {
      confidence += 0.02;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Crea resultado para casos de early-exit
   */
  private createSkippedResult(
    text: string,
    reason: 'clean_ascii' | 'no_indicators' | 'empty',
    startTime: number
  ): CorrectionExplanation {
    const endTime = performance.now();
    return {
      original: text,
      corrected: text,
      wasModified: false,
      tiersApplied: [],
      patternsMatched: [],
      confidence: 1.0,
      operations: [],
      processingTimeMs: endTime - startTime,
      skippedReason: reason,
    };
  }

  /**
   * Obtiene estadísticas de uso
   */
  getStats(): CorrectorStats {
    return { ...this.stats };
  }

  /**
   * Resetea estadísticas
   */
  resetStats(): void {
    this.stats = {
      textsProcessed: 0,
      textsModified: 0,
      earlyExitCount: 0,
      tierUsage: { hot: 0, warm: 0, cold: 0 },
      averageProcessingMs: 0,
    };
    this.totalProcessingMs = 0;
  }

  /**
   * Información sobre patrones disponibles
   */
  static getPatternInfo(): typeof PATTERN_COUNTS {
    return PATTERN_COUNTS;
  }
}

// ============================================================================
// INSTANCIA SINGLETON PARA USO GLOBAL
// ============================================================================

/**
 * Instancia global del corrector para uso en toda la aplicación
 */
export const encodingCorrector = new EncodingCorrector();

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Corrección rápida sin crear nueva instancia
 */
export function correctEncoding(text: string): string {
  return encodingCorrector.correct(text).corrected;
}

/**
 * Corrección con explicación usando instancia global
 */
export function correctEncodingWithExplanation(
  text: string
): CorrectionExplanation {
  return encodingCorrector.correctWithExplanation(text);
}
