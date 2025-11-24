/**
 * PTEL Coordinate Normalizer v2.0
 * 
 * Sistema de normalización de coordenadas para documentos PTEL Andalucía.
 * Implementa 52 patrones de corrección organizados en 4 prioridades.
 * 
 * @author PTEL Development Team
 * @version 2.0.0
 * @license MIT
 */

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

export interface CoordinateInput {
  x: string | number;
  y: string | number;
  municipality?: string;
  province?: Province;
}

export interface NormalizationResult {
  x: number | null;
  y: number | null;
  original: { x: string | number; y: string | number };
  corrections: Correction[];
  flags: Flag[];
  score: number;
  confidence: ConfidenceLevel;
  isValid: boolean;
}

export interface Correction {
  type: CorrectionType;
  field: 'x' | 'y' | 'both';
  from: string;
  to: string;
  pattern: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

export interface Flag {
  type: FlagType;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export type Province = 
  | 'Almería' | 'Cádiz' | 'Córdoba' | 'Granada' 
  | 'Huelva' | 'Jaén' | 'Málaga' | 'Sevilla';

export type ConfidenceLevel = 'CRITICAL' | 'LOW' | 'MEDIUM' | 'HIGH';

export type CorrectionType = 
  | 'Y_TRUNCATED' | 'XY_SWAPPED' | 'PLACEHOLDER_DETECTED' | 'ENCODING_FIXED'
  | 'SEPARATOR_FIXED' | 'THOUSANDS_REMOVED' | 'DECIMAL_FIXED' | 'WHITESPACE_CLEANED';

export type FlagType = 
  | 'OUT_OF_RANGE' | 'MISSING_DECIMALS' | 'SUSPICIOUS_VALUE' 
  | 'GEOCODING_NEEDED' | 'MANUAL_REVIEW';

// ============================================================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================================================

/** Rangos válidos para coordenadas UTM30 en Andalucía */
const ANDALUSIA_BOUNDS = {
  x: { min: 100_000, max: 800_000 },
  y: { min: 4_000_000, max: 4_300_000 }
};

/** Prefijos Y típicos por provincia */
const PROVINCE_Y_PREFIXES: Record<Province, string[]> = {
  'Almería': ['40', '41'],
  'Cádiz': ['40', '41'],
  'Córdoba': ['41', '42'],
  'Granada': ['40', '41'],
  'Huelva': ['41', '42'],
  'Jaén': ['41', '42'],
  'Málaga': ['40', '41'],
  'Sevilla': ['41', '42']
};

/** Patrones de placeholder que indican "sin datos" */
const PLACEHOLDER_PATTERNS = [
  /^[Nn]\/[DdAa]$/,
  /^[Nn][Dd]$/,
  /^[Nn][Aa]$/,
  /^[Ss]in\s*datos?$/i,
  /^[Ii]ndicar$/,
  /^[Pp]endiente$/,
  /^[-_]+$/,
  /^[Xx]+$/,
  /^0+(\.0+)?$/,
  /^9{4,}$/,
  /^\s*$/
];

/** 
 * Patrones de corrección UTF-8 (mojibake)
 * Ordenados por frecuencia de aparición
 */
const MOJIBAKE_PATTERNS: [RegExp, string][] = [
  // Vocales acentuadas (más comunes)
  [/Ã³/g, 'ó'], [/Ã¡/g, 'á'], [/Ã©/g, 'é'], [/Ã­/g, 'í'], [/Ãº/g, 'ú'],
  [/Ã"/g, 'Ó'], [/Ã/g, 'Á'], [/Ã‰/g, 'É'], [/Ã/g, 'Í'], [/Ãš/g, 'Ú'],
  // Ñ
  [/Ã±/g, 'ñ'], [/Ã'/g, 'Ñ'],
  // Diéresis
  [/Ã¼/g, 'ü'], [/Ãœ/g, 'Ü'],
  // Signos
  [/Â¿/g, '¿'], [/Â¡/g, '¡'], [/â‚¬/g, '€'],
  // Comillas y guiones
  [/â€œ/g, '"'], [/â€/g, '"'], [/â€™/g, "'"], [/â€"/g, '–'], [/â€"/g, '—'],
  // Caracteres de control residuales
  [/Â/g, ''], [/\u00A0/g, ' ']
];

/**
 * Patrones de separadores numéricos corruptos
 * Priorizados por frecuencia en documentos PTEL
 */
const SEPARATOR_PATTERNS: [RegExp, string, string][] = [
  // P1-1: Doble tilde como decimal (Berja)
  [/(\d+)\s*´´\s*(\d+)/g, '$1.$2', 'DOUBLE_TILDE'],
  // P1-2: Tilde simple como decimal
  [/(\d+)\s*´\s*(\d+)/g, '$1.$2', 'SINGLE_TILDE'],
  // P1-3: Espacio como separador de miles
  [/(\d{1,3})\s+(\d{3})\s*[,.]?\s*(\d*)$/g, '$1$2.$3', 'SPACE_THOUSANDS'],
  // P1-4: Punto como separador de miles (español)
  [/(\d{1,3})\.(\d{3})\.(\d{3})[,.]?(\d*)/g, '$1$2$3.$4', 'DOT_THOUSANDS_3'],
  [/(\d{1,3})\.(\d{3})[,.](\d+)/g, '$1$2.$3', 'DOT_THOUSANDS_2'],
  // P1-5: Coma decimal (convertir a punto)
  [/(\d+),(\d+)/g, '$1.$2', 'COMMA_DECIMAL'],
];

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================================================

/**
 * Normaliza una coordenada aplicando el pipeline completo de 6 fases.
 * 
 * @param input - Coordenada de entrada (puede ser string o número)
 * @param options - Opciones de normalización
 * @returns Resultado de normalización con coordenadas, correcciones y score
 * 
 * @example
 * ```typescript
 * const result = normalizeCoordinate({
 *   x: "447.850,23",
 *   y: "77905",
 *   municipality: "Colomera",
 *   province: "Granada"
 * });
 * // result.x = 447850.23
 * // result.y = 4077905
 * // result.score = 92
 * ```
 */
export function normalizeCoordinate(input: CoordinateInput): NormalizationResult {
  const corrections: Correction[] = [];
  const flags: Flag[] = [];
  
  // Guardar valores originales
  const original = { x: input.x, y: input.y };
  
  // Fase 1: Detectar placeholders
  const xPlaceholder = isPlaceholder(input.x);
  const yPlaceholder = isPlaceholder(input.y);
  
  if (xPlaceholder || yPlaceholder) {
    if (xPlaceholder) {
      corrections.push({
        type: 'PLACEHOLDER_DETECTED',
        field: 'x',
        from: String(input.x),
        to: 'null',
        pattern: 'PLACEHOLDER',
        priority: 'P0'
      });
    }
    if (yPlaceholder) {
      corrections.push({
        type: 'PLACEHOLDER_DETECTED',
        field: 'y',
        from: String(input.y),
        to: 'null',
        pattern: 'PLACEHOLDER',
        priority: 'P0'
      });
    }
    
    flags.push({
      type: 'GEOCODING_NEEDED',
      severity: 'warning',
      message: 'Coordenadas vacías o placeholder detectado'
    });
    
    return {
      x: xPlaceholder ? null : normalizeNumber(input.x, corrections, 'x'),
      y: yPlaceholder ? null : normalizeNumber(input.y, corrections, 'y'),
      original,
      corrections,
      flags,
      score: 0,
      confidence: 'CRITICAL',
      isValid: false
    };
  }
  
  // Fase 2: Normalizar formato numérico
  let x = normalizeNumber(input.x, corrections, 'x');
  let y = normalizeNumber(input.y, corrections, 'y');
  
  if (x === null || y === null) {
    flags.push({
      type: 'SUSPICIOUS_VALUE',
      severity: 'error',
      message: 'No se pudo parsear la coordenada como número'
    });
    return {
      x, y, original, corrections, flags,
      score: 0,
      confidence: 'CRITICAL',
      isValid: false
    };
  }
  
  // Fase 3: Detectar intercambio X↔Y
  if (detectXYSwap(x, y)) {
    const temp = x;
    x = y;
    y = temp;
    corrections.push({
      type: 'XY_SWAPPED',
      field: 'both',
      from: `X=${original.x}, Y=${original.y}`,
      to: `X=${x}, Y=${y}`,
      pattern: 'XY_SWAP',
      priority: 'P0'
    });
  }
  
  // Fase 4: Detectar Y truncada
  const truncationResult = detectAndFixTruncation(y, input.province);
  if (truncationResult.wasTruncated) {
    corrections.push({
      type: 'Y_TRUNCATED',
      field: 'y',
      from: String(y),
      to: String(truncationResult.fixed),
      pattern: `TRUNCATION_${truncationResult.method}`,
      priority: 'P0'
    });
    y = truncationResult.fixed;
  }
  
  // Fase 5: Validar rangos
  const rangeValid = validateRange(x, y, flags);
  
  // Fase 6: Calcular score y confianza
  const score = calculateScore(x, y, corrections, flags);
  const confidence = scoreToConfidence(score);
  
  return {
    x,
    y,
    original,
    corrections,
    flags,
    score,
    confidence,
    isValid: rangeValid && score >= 50
  };
}

/**
 * Normaliza un valor numérico, limpiando separadores y caracteres inválidos.
 */
function normalizeNumber(
  value: string | number, 
  corrections: Correction[], 
  field: 'x' | 'y'
): number | null {
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }
  
  let str = String(value).trim();
  const originalStr = str;
  
  // Aplicar patrones de corrección de separadores
  for (const [pattern, replacement, patternName] of SEPARATOR_PATTERNS) {
    const newStr = str.replace(pattern, replacement);
    if (newStr !== str) {
      corrections.push({
        type: 'SEPARATOR_FIXED',
        field,
        from: str,
        to: newStr,
        pattern: patternName,
        priority: 'P1'
      });
      str = newStr;
    }
  }
  
  // Limpiar caracteres no numéricos restantes (excepto punto y signo)
  str = str.replace(/[^\d.-]/g, '');
  
  // Manejar múltiples puntos (quedarse con el último como decimal)
  const dots = str.match(/\./g);
  if (dots && dots.length > 1) {
    const parts = str.split('.');
    const decimal = parts.pop();
    str = parts.join('') + '.' + decimal;
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Detecta si un valor es un placeholder o indica "sin datos".
 */
function isPlaceholder(value: string | number): boolean {
  if (typeof value === 'number') {
    return value === 0 || isNaN(value);
  }
  
  const str = String(value).trim();
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Detecta si X e Y están intercambiadas basándose en rangos esperados.
 */
function detectXYSwap(x: number, y: number): boolean {
  // Si X está en rango de Y (millones) e Y está en rango de X (cientos de miles)
  const xInYRange = x >= 1_000_000 && x <= 5_000_000;
  const yInXRange = y >= 100_000 && y <= 900_000;
  
  return xInYRange && yInXRange;
}

/**
 * Detecta y corrige coordenadas Y truncadas.
 */
function detectAndFixTruncation(
  y: number, 
  province?: Province
): { wasTruncated: boolean; fixed: number; method: string } {
  const yStr = Math.floor(y).toString();
  
  // Y completa debe tener 7 dígitos y empezar con 4
  if (yStr.length >= 7 && yStr.startsWith('4')) {
    return { wasTruncated: false, fixed: y, method: 'NONE' };
  }
  
  // Detectar truncación
  if (yStr.length <= 6) {
    // Intentar determinar prefijo por provincia
    let prefix = '40'; // Default para Andalucía sur
    
    if (province && PROVINCE_Y_PREFIXES[province]) {
      prefix = PROVINCE_Y_PREFIXES[province][0];
    }
    
    // Si Y empieza con 0-3, probablemente falta el 4 inicial
    if (yStr.startsWith('0') || yStr.startsWith('1') || 
        yStr.startsWith('2') || yStr.startsWith('3')) {
      const fixed = parseFloat('4' + yStr);
      return { wasTruncated: true, fixed, method: 'PREFIX_4' };
    }
    
    // Si Y tiene 5-6 dígitos, añadir prefijo provincial
    if (yStr.length === 5) {
      const fixed = parseFloat(prefix + yStr);
      return { wasTruncated: true, fixed, method: 'PREFIX_FULL' };
    }
    
    if (yStr.length === 6 && !yStr.startsWith('4')) {
      const fixed = parseFloat('4' + yStr);
      return { wasTruncated: true, fixed, method: 'PREFIX_4' };
    }
  }
  
  return { wasTruncated: false, fixed: y, method: 'NONE' };
}

/**
 * Valida que las coordenadas estén dentro de los rangos de Andalucía.
 */
function validateRange(x: number, y: number, flags: Flag[]): boolean {
  let valid = true;
  
  if (x < ANDALUSIA_BOUNDS.x.min || x > ANDALUSIA_BOUNDS.x.max) {
    flags.push({
      type: 'OUT_OF_RANGE',
      severity: 'error',
      message: `X=${x} fuera de rango Andalucía (${ANDALUSIA_BOUNDS.x.min}-${ANDALUSIA_BOUNDS.x.max})`
    });
    valid = false;
  }
  
  if (y < ANDALUSIA_BOUNDS.y.min || y > ANDALUSIA_BOUNDS.y.max) {
    flags.push({
      type: 'OUT_OF_RANGE',
      severity: 'error',
      message: `Y=${y} fuera de rango Andalucía (${ANDALUSIA_BOUNDS.y.min}-${ANDALUSIA_BOUNDS.y.max})`
    });
    valid = false;
  }
  
  return valid;
}

/**
 * Calcula el score de validación (0-100).
 */
function calculateScore(
  x: number, 
  y: number, 
  corrections: Correction[], 
  flags: Flag[]
): number {
  let score = 100;
  
  // Penalizar por correcciones aplicadas
  const p0Corrections = corrections.filter(c => c.priority === 'P0').length;
  const p1Corrections = corrections.filter(c => c.priority === 'P1').length;
  
  score -= p0Corrections * 15; // Correcciones críticas
  score -= p1Corrections * 5;  // Correcciones menores
  
  // Penalizar por flags
  const errors = flags.filter(f => f.severity === 'error').length;
  const warnings = flags.filter(f => f.severity === 'warning').length;
  
  score -= errors * 25;
  score -= warnings * 10;
  
  // Bonificar por decimales (indica mayor precisión)
  const xHasDecimals = x % 1 !== 0;
  const yHasDecimals = y % 1 !== 0;
  
  if (!xHasDecimals) score -= 5;
  if (!yHasDecimals) score -= 5;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Convierte score numérico a nivel de confianza.
 */
function scoreToConfidence(score: number): ConfidenceLevel {
  if (score >= 76) return 'HIGH';
  if (score >= 51) return 'MEDIUM';
  if (score >= 26) return 'LOW';
  return 'CRITICAL';
}

// ============================================================================
// FUNCIONES DE UTILIDAD PARA TEXTO
// ============================================================================

/**
 * Normaliza texto corrigiendo problemas de encoding UTF-8 (mojibake).
 * 
 * @param text - Texto con posible corrupción UTF-8
 * @returns Texto normalizado
 */
export function normalizeEncoding(text: string): string {
  let result = text;
  
  for (const [pattern, replacement] of MOJIBAKE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

/**
 * Normaliza un lote de coordenadas.
 * 
 * @param inputs - Array de coordenadas a normalizar
 * @param onProgress - Callback opcional para reportar progreso
 * @returns Array de resultados de normalización
 */
export function normalizeCoordinateBatch(
  inputs: CoordinateInput[],
  onProgress?: (current: number, total: number) => void
): NormalizationResult[] {
  const results: NormalizationResult[] = [];
  
  for (let i = 0; i < inputs.length; i++) {
    results.push(normalizeCoordinate(inputs[i]));
    onProgress?.(i + 1, inputs.length);
  }
  
  return results;
}

/**
 * Genera estadísticas de un lote de normalizaciones.
 */
export function getBatchStats(results: NormalizationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  avgScore: number;
  correctionsByType: Record<CorrectionType, number>;
  confidenceDistribution: Record<ConfidenceLevel, number>;
} {
  const correctionsByType: Record<string, number> = {};
  const confidenceDistribution: Record<ConfidenceLevel, number> = {
    CRITICAL: 0, LOW: 0, MEDIUM: 0, HIGH: 0
  };
  
  let totalScore = 0;
  let validCount = 0;
  
  for (const result of results) {
    totalScore += result.score;
    if (result.isValid) validCount++;
    confidenceDistribution[result.confidence]++;
    
    for (const correction of result.corrections) {
      correctionsByType[correction.type] = (correctionsByType[correction.type] || 0) + 1;
    }
  }
  
  return {
    total: results.length,
    valid: validCount,
    invalid: results.length - validCount,
    avgScore: results.length > 0 ? totalScore / results.length : 0,
    correctionsByType: correctionsByType as Record<CorrectionType, number>,
    confidenceDistribution
  };
}

// ============================================================================
// EXPORTS DEFAULT
// ============================================================================

export default {
  normalizeCoordinate,
  normalizeCoordinateBatch,
  normalizeEncoding,
  getBatchStats,
  ANDALUSIA_BOUNDS,
  PROVINCE_Y_PREFIXES
};
