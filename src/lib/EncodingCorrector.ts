/**
 * PTEL Andalucía - EncodingCorrector
 * 
 * Servicio de corrección UTF-8 con sistema de tiers en cascada.
 * Implementa early-exit para documentos limpios y corrección progresiva.
 * 
 * Pipeline:
 * 1. Early-exit si texto limpio (isSuspicious = false)
 * 2. Intenta doble encoding primero
 * 3. Aplica Tier 1 (Hot) - 80% de casos
 * 4. Si persiste mojibake → Tier 2 (Warm)
 * 5. Si aún persiste → Tier 3 (Cold)
 * 6. Normaliza con NFC
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

import {
  TIER1_HOT_PATTERNS,
  TIER2_WARM_PATTERNS,
  TIER3_COLD_PATTERNS,
  MOJIBAKE_INDICATORS,
  type MojibakePattern,
} from './mojibakePatterns';
import { isSuspicious, isCleanASCII } from './encodingDetector';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface CorrectionResult {
  /** Texto corregido (o original si no hubo cambios) */
  corrected: string;
  /** Si se modificó el texto */
  wasModified: boolean;
  /** Tiers aplicados (vacío si early-exit) */
  tiersApplied: ('TIER1' | 'TIER2' | 'TIER3' | 'DOUBLE_ENCODING' | 'NFC')[];
  /** Número de patrones que coincidieron */
  patternsMatched: number;
  /** Razón de early-exit si aplica */
  earlyExitReason?: 'CLEAN_ASCII' | 'NO_MOJIBAKE' | 'EMPTY';
  /** Duración en ms */
  durationMs: number;
}

export interface CorrectionStats {
  totalProcessed: number;
  earlyExits: number;
  tier1Only: number;
  tier2Required: number;
  tier3Required: number;
  doubleEncodingFixed: number;
  averageDurationMs: number;
}

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================

export class EncodingCorrector {
  /** Patrones Tier 1 ordenados por longitud */
  private tier1Patterns: MojibakePattern[];
  /** Patrones Tier 2 ordenados por longitud */
  private tier2Patterns: MojibakePattern[];
  /** Patrones Tier 3 ordenados por longitud */
  private tier3Patterns: MojibakePattern[];
  /** Estadísticas de uso */
  private stats: CorrectionStats;

  constructor() {
    // Pre-ordenar patrones por longitud descendente
    this.tier1Patterns = [...TIER1_HOT_PATTERNS].sort(
      (a, b) => b.corrupted.length - a.corrupted.length
    );
    this.tier2Patterns = [...TIER2_WARM_PATTERNS].sort(
      (a, b) => b.corrupted.length - a.corrupted.length
    );
    this.tier3Patterns = [...TIER3_COLD_PATTERNS].sort(
      (a, b) => b.corrupted.length - a.corrupted.length
    );
    
    this.stats = {
      totalProcessed: 0,
      earlyExits: 0,
      tier1Only: 0,
      tier2Required: 0,
      tier3Required: 0,
      doubleEncodingFixed: 0,
      averageDurationMs: 0,
    };
  }

  /**
   * Corrige mojibake en texto con sistema de tiers.
   * Early-exit para textos limpios.
   */
  correct(text: string): CorrectionResult {
    const startTime = performance.now();
    this.stats.totalProcessed++;
    
    // Early-exit: texto vacío o null
    if (!text || text.length === 0) {
      this.stats.earlyExits++;
      return this.buildResult(text, text, [], 0, 'EMPTY', startTime);
    }
    
    // Early-exit: ASCII puro (90% de coordenadas)
    if (isCleanASCII(text)) {
      this.stats.earlyExits++;
      return this.buildResult(text, text, [], 0, 'CLEAN_ASCII', startTime);
    }
    
    // Early-exit: no hay indicadores de mojibake
    if (!isSuspicious(text)) {
      this.stats.earlyExits++;
      return this.buildResult(text, text, [], 0, 'NO_MOJIBAKE', startTime);
    }
    
    // Procesamiento completo
    let current = text;
    const tiersApplied: CorrectionResult['tiersApplied'] = [];
    let totalMatches = 0;
    
    // 1. Intentar corrección de doble encoding primero
    if (MOJIBAKE_INDICATORS.DOUBLE_ENCODING.test(current)) {
      const doubleFixed = this.tryFixDoubleEncoding(current);
      if (doubleFixed !== current) {
        current = doubleFixed;
        tiersApplied.push('DOUBLE_ENCODING');
        this.stats.doubleEncodingFixed++;
      }
    }

    
    // 2. Aplicar Tier 1 (Hot) - siempre
    const { result: afterTier1, matches: matches1 } = this.applyPatterns(
      current,
      this.tier1Patterns
    );
    if (matches1 > 0) {
      current = afterTier1;
      totalMatches += matches1;
      tiersApplied.push('TIER1');
    }
    
    // 3. Aplicar Tier 2 (Warm) - solo si aún hay mojibake
    if (this.stillHasMojibake(current)) {
      const { result: afterTier2, matches: matches2 } = this.applyPatterns(
        current,
        this.tier2Patterns
      );
      if (matches2 > 0) {
        current = afterTier2;
        totalMatches += matches2;
        tiersApplied.push('TIER2');
        this.stats.tier2Required++;
      }
    }
    
    // 4. Aplicar Tier 3 (Cold) - solo si aún hay mojibake
    if (this.stillHasMojibake(current)) {
      const { result: afterTier3, matches: matches3 } = this.applyPatterns(
        current,
        this.tier3Patterns
      );
      if (matches3 > 0) {
        current = afterTier3;
        totalMatches += matches3;
        tiersApplied.push('TIER3');
        this.stats.tier3Required++;
      }
    }
    
    // 5. Normalización Unicode NFC
    const normalized = current.normalize('NFC');
    if (normalized !== current) {
      current = normalized;
      tiersApplied.push('NFC');
    }
    
    // Actualizar estadísticas
    if (tiersApplied.length === 1 && tiersApplied[0] === 'TIER1') {
      this.stats.tier1Only++;
    }
    
    return this.buildResult(text, current, tiersApplied, totalMatches, undefined, startTime);
  }

  /**
   * Aplica un array de patrones al texto.
   * Usa split().join() para máxima compatibilidad.
   */
  private applyPatterns(
    text: string,
    patterns: MojibakePattern[]
  ): { result: string; matches: number } {
    let result = text;
    let matches = 0;
    
    for (const pattern of patterns) {
      if (result.includes(pattern.corrupted)) {
        const before = result;
        result = result.split(pattern.corrupted).join(pattern.correct);
        if (result !== before) {
          matches++;
        }
      }
    }
    
    return { result, matches };
  }

  /**
   * Verifica si aún quedan indicadores de mojibake.
   */
  private stillHasMojibake(text: string): boolean {
    return (
      MOJIBAKE_INDICATORS.PRIMARY.test(text) ||
      MOJIBAKE_INDICATORS.SECONDARY.test(text)
    );
  }

  /**
   * Intenta corregir doble encoding (UTF-8 → Latin-1 → UTF-8).
   * Usa TextDecoder nativo del browser.
   */
  private tryFixDoubleEncoding(text: string): string {
    try {
      // Convertir a bytes como si fuera Latin-1
      const bytes = new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
      // Decodificar como UTF-8
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return decoded;
    } catch {
      // Si falla, retornar original
      return text;
    }
  }

  /**
   * Construye el resultado de corrección.
   */
  private buildResult(
    original: string,
    corrected: string,
    tiersApplied: CorrectionResult['tiersApplied'],
    patternsMatched: number,
    earlyExitReason: CorrectionResult['earlyExitReason'],
    startTime: number
  ): CorrectionResult {
    const durationMs = performance.now() - startTime;
    
    // Actualizar promedio de duración
    const n = this.stats.totalProcessed;
    this.stats.averageDurationMs =
      (this.stats.averageDurationMs * (n - 1) + durationMs) / n;
    
    return {
      corrected,
      wasModified: original !== corrected,
      tiersApplied,
      patternsMatched,
      earlyExitReason,
      durationMs,
    };
  }

  /**
   * Obtiene estadísticas de uso.
   */
  getStats(): CorrectionStats {
    return { ...this.stats };
  }

  /**
   * Resetea estadísticas.
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      earlyExits: 0,
      tier1Only: 0,
      tier2Required: 0,
      tier3Required: 0,
      doubleEncodingFixed: 0,
      averageDurationMs: 0,
    };
  }
}

// ============================================================================
// INSTANCIA GLOBAL (SINGLETON)
// ============================================================================

/**
 * Instancia global de EncodingCorrector para uso en toda la aplicación.
 * Reutiliza patrones pre-ordenados para máximo rendimiento.
 */
export const encodingCorrector = new EncodingCorrector();

/**
 * Función de conveniencia para corrección rápida.
 * Usa la instancia global.
 */
export function correctEncoding(text: string): CorrectionResult {
  return encodingCorrector.correct(text);
}

/**
 * Función simplificada que solo retorna el texto corregido.
 */
export function fixMojibake(text: string): string {
  return encodingCorrector.correct(text).corrected;
}
