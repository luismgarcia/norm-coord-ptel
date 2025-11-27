/**
 * PTEL Coordinate Normalizer v3.0
 * 
 * Sistema de normalización de coordenadas para documentos PTEL Andalucía.
 * Implementa pipeline de 8 fases con sistema de aprendizaje adaptativo.
 * 
 * NOVEDADES v3.0:
 * - Fase 5: Detección de coordenadas en kilómetros (caso Hornos)
 * - Fase 6: Detección de X truncada
 * - Fase 7: Motor de heurísticas de rescate
 * - Integración con sistema de patrones aprendidos
 * 
 * @author PTEL Development Team
 * @version 3.0.0
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
  heuristicApplied?: HeuristicResult;
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

export interface HeuristicResult {
  originalValue: string;
  correctedValue: number;
  hypothesis: string;
  confidence: number;
  field: 'x' | 'y';
  method: string;
}

export type Province = 
  | 'Almería' | 'Cádiz' | 'Córdoba' | 'Granada' 
  | 'Huelva' | 'Jaén' | 'Málaga' | 'Sevilla';

export type ConfidenceLevel = 'CRITICAL' | 'LOW' | 'MEDIUM' | 'HIGH';

export type CorrectionType = 
  | 'Y_TRUNCATED' | 'X_TRUNCATED' | 'XY_SWAPPED' | 'PLACEHOLDER_DETECTED' 
  | 'ENCODING_FIXED' | 'SEPARATOR_FIXED' | 'THOUSANDS_REMOVED' | 'DECIMAL_FIXED' 
  | 'WHITESPACE_CLEANED' | 'KM_TO_METERS' | 'HEURISTIC_RESCUE';

export type FlagType = 
  | 'OUT_OF_RANGE' | 'MISSING_DECIMALS' | 'SUSPICIOUS_VALUE' 
  | 'GEOCODING_NEEDED' | 'MANUAL_REVIEW' | 'HEURISTIC_APPLIED';

// ============================================================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================================================

/** Rangos válidos para coordenadas UTM30 en Andalucía */
export const ANDALUSIA_BOUNDS = {
  x: { min: 100_000, max: 800_000 },
  y: { min: 3_980_000, max: 4_320_000 }
};

/** Prefijos Y típicos por provincia */
export const PROVINCE_Y_PREFIXES: Record<Province, string[]> = {
  'Almería': ['40', '41'],
  'Cádiz': ['40', '41'],
  'Córdoba': ['41', '42'],
  'Granada': ['40', '41'],
  'Huelva': ['41', '42'],
  'Jaén': ['41', '42', '42'],
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
 */
const MOJIBAKE_PATTERNS: [RegExp, string][] = [
  [/Ã³/g, 'ó'], [/Ã¡/g, 'á'], [/Ã©/g, 'é'], [/Ã­/g, 'í'], [/Ãº/g, 'ú'],
  [/Ã"/g, 'Ó'], [/Ã/g, 'Á'], [/Ã‰/g, 'É'], [/Ã/g, 'Í'], [/Ãš/g, 'Ú'],
  [/Ã±/g, 'ñ'], [/Ã'/g, 'Ñ'],
  [/Ã¼/g, 'ü'], [/Ãœ/g, 'Ü'],
  [/Â¿/g, '¿'], [/Â¡/g, '¡'], [/â‚¬/g, '€'],
  [/â€œ/g, '"'], [/â€/g, '"'], [/â€™/g, "'"], [/â€"/g, '–'], [/â€"/g, '—'],
  [/Â/g, ''], [/\u00A0/g, ' ']
];

/**
 * Patrones de separadores numéricos corruptos
 */
const SEPARATOR_PATTERNS: [RegExp, string, string][] = [
  [/(\d+)\s*´´\s*(\d+)/g, '$1.$2', 'DOUBLE_TILDE'],
  [/(\d+)\s*´\s*(\d+)/g, '$1.$2', 'SINGLE_TILDE'],
  [/(\d{1,3})\s+(\d{3})\s*[,.]?\s*(\d*)$/g, '$1$2.$3', 'SPACE_THOUSANDS'],
  [/(\d{1,3})\.(\d{3})\.(\d{3})[,.]?(\d*)/g, '$1$2$3.$4', 'DOT_THOUSANDS_3'],
  [/(\d{1,3})\.(\d{3})[,.](\d+)/g, '$1$2.$3', 'DOT_THOUSANDS_2'],
  [/(\d+),(\d+)/g, '$1.$2', 'COMMA_DECIMAL'],
];

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN PRINCIPAL
// ============================================================================

/**
 * Normaliza una coordenada aplicando el pipeline completo de 8 fases.
 */
export function normalizeCoordinate(input: CoordinateInput): NormalizationResult {
  const corrections: Correction[] = [];
  const flags: Flag[] = [];
  const original = { x: input.x, y: input.y };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 1: Detectar placeholders
  // ═══════════════════════════════════════════════════════════════════════════
  const xPlaceholder = isPlaceholder(input.x);
  const yPlaceholder = isPlaceholder(input.y);
  
  if (xPlaceholder || yPlaceholder) {
    if (xPlaceholder) {
      corrections.push({
        type: 'PLACEHOLDER_DETECTED', field: 'x',
        from: String(input.x), to: 'null',
        pattern: 'PLACEHOLDER', priority: 'P0'
      });
    }
    if (yPlaceholder) {
      corrections.push({
        type: 'PLACEHOLDER_DETECTED', field: 'y',
        from: String(input.y), to: 'null',
        pattern: 'PLACEHOLDER', priority: 'P0'
      });
    }
    
    flags.push({
      type: 'GEOCODING_NEEDED', severity: 'warning',
      message: 'Coordenadas vacías o placeholder detectado'
    });
    
    return {
      x: null, y: null, original, corrections, flags,
      score: 0, confidence: 'CRITICAL', isValid: false
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 2: Normalizar formato numérico (separadores)
  // ═══════════════════════════════════════════════════════════════════════════
  let x = normalizeNumber(input.x, corrections, 'x');
  let y = normalizeNumber(input.y, corrections, 'y');
  
  if (x === null || y === null) {
    flags.push({
      type: 'SUSPICIOUS_VALUE', severity: 'error',
      message: 'No se pudo parsear la coordenada como número'
    });
    return {
      x, y, original, corrections, flags,
      score: 0, confidence: 'CRITICAL', isValid: false
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 3: Detectar intercambio X↔Y
  // ═══════════════════════════════════════════════════════════════════════════
  if (detectXYSwap(x, y)) {
    const temp = x;
    x = y;
    y = temp;
    corrections.push({
      type: 'XY_SWAPPED', field: 'both',
      from: `X=${original.x}, Y=${original.y}`,
      to: `X=${x}, Y=${y}`,
      pattern: 'XY_SWAP', priority: 'P0'
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 4: Detectar Y truncada
  // ═══════════════════════════════════════════════════════════════════════════
  const yTruncResult = detectAndFixYTruncation(y, input.province);
  if (yTruncResult.wasFixed) {
    corrections.push({
      type: 'Y_TRUNCATED', field: 'y',
      from: String(y), to: String(yTruncResult.fixed),
      pattern: `Y_TRUNC_${yTruncResult.method}`, priority: 'P0'
    });
    y = yTruncResult.fixed;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 5: Detectar coordenadas en kilómetros (NUEVO - caso Hornos)
  // ═══════════════════════════════════════════════════════════════════════════
  const xKmResult = detectAndFixKilometers(x, 'x', String(input.x));
  if (xKmResult.wasFixed) {
    corrections.push({
      type: 'KM_TO_METERS', field: 'x',
      from: String(x), to: String(xKmResult.fixed),
      pattern: `KM_${xKmResult.method}`, priority: 'P0'
    });
    x = xKmResult.fixed;
  }
  
  const yKmResult = detectAndFixKilometers(y, 'y', String(input.y));
  if (yKmResult.wasFixed) {
    corrections.push({
      type: 'KM_TO_METERS', field: 'y',
      from: String(y), to: String(yKmResult.fixed),
      pattern: `KM_${yKmResult.method}`, priority: 'P0'
    });
    y = yKmResult.fixed;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 6: Detectar X truncada (NUEVO)
  // ═══════════════════════════════════════════════════════════════════════════
  const xTruncResult = detectAndFixXTruncation(x);
  if (xTruncResult.wasFixed) {
    corrections.push({
      type: 'X_TRUNCATED', field: 'x',
      from: String(x), to: String(xTruncResult.fixed),
      pattern: `X_TRUNC_${xTruncResult.method}`, priority: 'P0'
    });
    x = xTruncResult.fixed;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 7: Motor de heurísticas de rescate (si aún fuera de rango)
  // ═══════════════════════════════════════════════════════════════════════════
  let heuristicApplied: HeuristicResult | undefined;
  
  if (!isInRange(x, 'x') || !isInRange(y, 'y')) {
    // Intentar rescate heurístico para X
    if (!isInRange(x, 'x')) {
      const rescue = runHeuristicRescue(String(input.x), x, 'x');
      if (rescue) {
        corrections.push({
          type: 'HEURISTIC_RESCUE', field: 'x',
          from: String(x), to: String(rescue.correctedValue),
          pattern: rescue.method, priority: 'P1'
        });
        x = rescue.correctedValue;
        heuristicApplied = rescue;
        flags.push({
          type: 'HEURISTIC_APPLIED', severity: 'info',
          message: `Heurística aplicada: ${rescue.hypothesis}`
        });
      }
    }
    
    // Intentar rescate heurístico para Y
    if (!isInRange(y, 'y')) {
      const rescue = runHeuristicRescue(String(input.y), y, 'y');
      if (rescue) {
        corrections.push({
          type: 'HEURISTIC_RESCUE', field: 'y',
          from: String(y), to: String(rescue.correctedValue),
          pattern: rescue.method, priority: 'P1'
        });
        y = rescue.correctedValue;
        heuristicApplied = rescue;
        flags.push({
          type: 'HEURISTIC_APPLIED', severity: 'info',
          message: `Heurística aplicada: ${rescue.hypothesis}`
        });
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FASE 8: Validar rangos finales y calcular score
  // ═══════════════════════════════════════════════════════════════════════════
  const rangeValid = validateRange(x, y, flags);
  const score = calculateScore(x, y, corrections, flags);
  const confidence = scoreToConfidence(score);
  
  return {
    x, y, original, corrections, flags, score, confidence,
    isValid: rangeValid && score >= 50,
    heuristicApplied
  };
}

// ============================================================================
// FUNCIONES DE DETECCIÓN Y CORRECCIÓN
// ============================================================================

/**
 * Normaliza un valor numérico, limpiando separadores.
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
  
  // Aplicar patrones de corrección de separadores
  for (const [pattern, replacement, patternName] of SEPARATOR_PATTERNS) {
    const newStr = str.replace(pattern, replacement);
    if (newStr !== str) {
      corrections.push({
        type: 'SEPARATOR_FIXED', field,
        from: str, to: newStr,
        pattern: patternName, priority: 'P1'
      });
      str = newStr;
    }
  }
  
  // Limpiar caracteres no numéricos
  str = str.replace(/[^\d.-]/g, '');
  
  // Manejar múltiples puntos
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
 * Detecta si un valor es un placeholder.
 */
function isPlaceholder(value: string | number): boolean {
  if (typeof value === 'number') {
    return value === 0 || isNaN(value);
  }
  const str = String(value).trim();
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Detecta si X e Y están intercambiadas.
 */
function detectXYSwap(x: number, y: number): boolean {
  const xInYRange = x >= 1_000_000 && x <= 5_000_000;
  const yInXRange = y >= 100_000 && y <= 900_000;
  return xInYRange && yInXRange;
}

/**
 * Detecta y corrige coordenadas Y truncadas.
 * 
 * Patrones detectados:
 * - 6 dígitos sin 4 inicial (ej: 133364) → añadir 4 al inicio → 4133364
 * - 6 dígitos con 4 inicial pero fuera de rango (ej: 413364) → ×10 → 4133640 (caso Tijola)
 * - 5 dígitos (ej: 33364) → añadir prefijo provincial (40/41)
 */
function detectAndFixYTruncation(
  y: number, 
  province?: Province
): { wasFixed: boolean; fixed: number; method: string } {
  const yStr = Math.floor(Math.abs(y)).toString();
  
  // Y completa: 7 dígitos empezando con 4
  if (yStr.length >= 7 && yStr.startsWith('4')) {
    return { wasFixed: false, fixed: y, method: 'NONE' };
  }
  
  // CASO 1: 6 dígitos sin 4 inicial → falta el 4
  if (yStr.length === 6 && !yStr.startsWith('4')) {
    if (/^[0-3]/.test(yStr)) {
      const fixed = parseFloat('4' + yStr);
      if (isInRange(fixed, 'y')) {
        return { wasFixed: true, fixed, method: 'ADD_4_PREFIX' };
      }
    }
  }
  
  // CASO 2: 6 dígitos CON 4 inicial pero fuera de rango → falta dígito al final (caso Tijola)
  // Ejemplo: 413364 → debería ser 4133640 → multiplicar por 10
  if (yStr.length === 6 && yStr.startsWith('4')) {
    // Verificar que no está en rango (confirma que está truncado)
    if (!isInRange(y, 'y')) {
      const fixed = y * 10;
      if (isInRange(fixed, 'y')) {
        return { wasFixed: true, fixed, method: 'MULTIPLY_10_Y' };
      }
    }
  }
  
  // CASO 3: 5 dígitos → faltan 2 dígitos (40 o 41)
  if (yStr.length === 5) {
    let prefix = '40';
    if (province && PROVINCE_Y_PREFIXES[province]) {
      prefix = PROVINCE_Y_PREFIXES[province][0];
    }
    const fixed = parseFloat(prefix + yStr);
    if (isInRange(fixed, 'y')) {
      return { wasFixed: true, fixed, method: 'ADD_40_PREFIX' };
    }
  }
  
  return { wasFixed: false, fixed: y, method: 'NONE' };
}

/**
 * NUEVO: Detecta y corrige coordenadas en kilómetros (caso Hornos).
 * 
 * Patrones detectados:
 * - X < 1000 con decimales: 524.643 → 524643 (km con decimales)
 * - X entre 100-999 sin decimales: 524 → 524000 (km enteros)
 * - Y < 10000: 4230 → 4230000 (km)
 */
function detectAndFixKilometers(
  value: number,
  field: 'x' | 'y',
  originalStr: string
): { wasFixed: boolean; fixed: number; method: string; confidence: number } {
  
  // PATRÓN 1: X en kilómetros con decimales (ej: 524.643 → 524643)
  // Este es el patrón de Hornos
  if (field === 'x' && value > 0 && value < 1000) {
    // Verificar si tiene decimales en el valor original
    const hasDecimals = originalStr.includes('.') || originalStr.includes(',');
    
    if (hasDecimals) {
      // El punto decimal está MAL POSICIONADO, no es decimal real
      // 524.643 debería ser 524643
      const fixed = Math.round(value * 1000);
      if (isInRange(fixed, 'x')) {
        return { wasFixed: true, fixed, method: 'KM_DECIMAL_TO_M', confidence: 95 };
      }
    } else {
      // Sin decimales: 524 → 524000
      const fixed = value * 1000;
      if (isInRange(fixed, 'x')) {
        return { wasFixed: true, fixed, method: 'KM_INT_TO_M', confidence: 85 };
      }
    }
  }
  
  // PATRÓN 2: Y en kilómetros (muy raro pero posible)
  if (field === 'y' && value > 3900 && value < 4400) {
    const fixed = value * 1000;
    if (isInRange(fixed, 'y')) {
      return { wasFixed: true, fixed, method: 'Y_KM_TO_M', confidence: 90 };
    }
  }
  
  return { wasFixed: false, fixed: value, method: 'NONE', confidence: 100 };
}

/**
 * NUEVO: Detecta y corrige coordenadas X truncadas.
 * 
 * Patrones:
 * - 5 dígitos: 44785 → 447850 (falta 1 dígito al final)
 * - 4 dígitos: 4478 → 447800 (faltan 2 dígitos)
 */
function detectAndFixXTruncation(
  x: number
): { wasFixed: boolean; fixed: number; method: string } {
  const xStr = Math.floor(Math.abs(x)).toString();
  
  // X normal tiene 6 dígitos (ej: 447850)
  if (xStr.length >= 6) {
    return { wasFixed: false, fixed: x, method: 'NONE' };
  }
  
  // 5 dígitos → falta 1 dígito (×10)
  if (xStr.length === 5) {
    const fixed = x * 10;
    if (isInRange(fixed, 'x')) {
      return { wasFixed: true, fixed, method: 'MULTIPLY_10' };
    }
  }
  
  // 4 dígitos → faltan 2 dígitos (×100)
  if (xStr.length === 4) {
    const fixed = x * 100;
    if (isInRange(fixed, 'x')) {
      return { wasFixed: true, fixed, method: 'MULTIPLY_100' };
    }
  }
  
  return { wasFixed: false, fixed: x, method: 'NONE' };
}

/**
 * NUEVO: Motor de heurísticas de rescate.
 * Se ejecuta cuando las correcciones estándar fallan.
 */
function runHeuristicRescue(
  originalValue: string,
  parsedValue: number,
  field: 'x' | 'y'
): HeuristicResult | null {
  
  const heuristics = [
    // H1: Valor muy pequeño con decimales → probablemente km
    {
      condition: (v: number, f: 'x' | 'y') => 
        f === 'x' && v > 0 && v < 1000,
      transform: (v: number) => Math.round(v * 1000),
      hypothesis: 'Coordenada X parece estar en kilómetros',
      method: 'HEUR_KM_X',
      confidence: 90
    },
    // H2: Coma como separador de miles (524,891 → 524891)
    {
      condition: (_v: number, _f: 'x' | 'y', orig: string) => 
        /^\d{3},\d{3}/.test(orig),
      transform: (_v: number, orig: string) => 
        parseFloat(orig.replace(/,/g, '')),
      hypothesis: 'Coma usada como separador de miles',
      method: 'HEUR_COMMA_THOUSANDS',
      confidence: 88
    },
    // H3: X con 5 dígitos → truncada
    {
      condition: (v: number, f: 'x' | 'y') => 
        f === 'x' && v >= 10000 && v < 100000,
      transform: (v: number) => v * 10,
      hypothesis: 'Coordenada X truncada (falta 1 dígito)',
      method: 'HEUR_X_TRUNC',
      confidence: 85
    },
    // H4: Y con 6 dígitos sin 4 inicial
    {
      condition: (v: number, f: 'x' | 'y') => 
        f === 'y' && v >= 100000 && v < 1000000 && !String(Math.floor(v)).startsWith('4'),
      transform: (v: number) => v + 4000000,
      hypothesis: 'Coordenada Y truncada (falta "4" inicial)',
      method: 'HEUR_Y_ADD_4M',
      confidence: 90
    },
    // H5: Punto como separador de miles (447.850 → 447850)
    {
      condition: (_v: number, _f: 'x' | 'y', orig: string) => 
        /^\d{3}\.\d{3}$/.test(orig.trim()),
      transform: (_v: number, orig: string) => 
        parseFloat(orig.replace(/\./g, '')),
      hypothesis: 'Punto usado como separador de miles',
      method: 'HEUR_DOT_THOUSANDS',
      confidence: 87
    }
  ];

  for (const h of heuristics) {
    if (h.condition(parsedValue, field, originalValue)) {
      const corrected = h.transform(parsedValue, originalValue);
      
      if (isInRange(corrected, field)) {
        return {
          originalValue,
          correctedValue: corrected,
          hypothesis: h.hypothesis,
          confidence: h.confidence,
          field,
          method: h.method
        };
      }
    }
  }
  
  return null;
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Verifica si un valor está en el rango válido para Andalucía.
 */
function isInRange(value: number, field: 'x' | 'y'): boolean {
  const bounds = field === 'x' ? ANDALUSIA_BOUNDS.x : ANDALUSIA_BOUNDS.y;
  return value >= bounds.min && value <= bounds.max;
}

/**
 * Valida rangos y añade flags si hay errores.
 */
function validateRange(x: number, y: number, flags: Flag[]): boolean {
  let valid = true;
  
  if (!isInRange(x, 'x')) {
    flags.push({
      type: 'OUT_OF_RANGE', severity: 'error',
      message: `X=${x.toFixed(2)} fuera de rango (${ANDALUSIA_BOUNDS.x.min}-${ANDALUSIA_BOUNDS.x.max})`
    });
    valid = false;
  }
  
  if (!isInRange(y, 'y')) {
    flags.push({
      type: 'OUT_OF_RANGE', severity: 'error',
      message: `Y=${y.toFixed(2)} fuera de rango (${ANDALUSIA_BOUNDS.y.min}-${ANDALUSIA_BOUNDS.y.max})`
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
  
  // Penalizar por correcciones
  const p0Corrections = corrections.filter(c => c.priority === 'P0').length;
  const p1Corrections = corrections.filter(c => c.priority === 'P1').length;
  
  score -= p0Corrections * 10;
  score -= p1Corrections * 5;
  
  // Penalizar por flags
  const errors = flags.filter(f => f.severity === 'error').length;
  const warnings = flags.filter(f => f.severity === 'warning').length;
  
  score -= errors * 25;
  score -= warnings * 10;
  
  // Bonificar por decimales (mayor precisión)
  if (x % 1 === 0) score -= 3;
  if (y % 1 === 0) score -= 3;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Convierte score a nivel de confianza.
 */
function scoreToConfidence(score: number): ConfidenceLevel {
  if (score >= 76) return 'HIGH';
  if (score >= 51) return 'MEDIUM';
  if (score >= 26) return 'LOW';
  return 'CRITICAL';
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Normaliza texto con problemas de encoding UTF-8.
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
 * Genera estadísticas de un lote.
 */
export function getBatchStats(results: NormalizationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  avgScore: number;
  correctionsByType: Record<string, number>;
  confidenceDistribution: Record<ConfidenceLevel, number>;
  heuristicsApplied: number;
} {
  const correctionsByType: Record<string, number> = {};
  const confidenceDistribution: Record<ConfidenceLevel, number> = {
    CRITICAL: 0, LOW: 0, MEDIUM: 0, HIGH: 0
  };
  
  let totalScore = 0;
  let validCount = 0;
  let heuristicsCount = 0;
  
  for (const result of results) {
    totalScore += result.score;
    if (result.isValid) validCount++;
    if (result.heuristicApplied) heuristicsCount++;
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
    correctionsByType,
    confidenceDistribution,
    heuristicsApplied: heuristicsCount
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  normalizeCoordinate,
  normalizeCoordinateBatch,
  normalizeEncoding,
  getBatchStats,
  ANDALUSIA_BOUNDS,
  PROVINCE_Y_PREFIXES
};
