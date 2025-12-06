/**
 * encodingDetector.ts - F027 UTF8-2
 * 
 * Detección temprana de texto corrupto (mojibake) para early-exit.
 * Evita procesamiento innecesario en textos limpios.
 * 
 * ESTRATEGIA:
 * 1. Si el texto es ASCII puro → NO procesar (fast-path)
 * 2. Si contiene indicadores de mojibake → SÍ procesar
 * 3. Si tiene caracteres españoles válidos sin mojibake → NO procesar
 * 
 * RENDIMIENTO ESPERADO:
 * - ~90% de textos limpios detectados en <0.1ms
 * - Reducción 60-70% tiempo total procesamiento
 * 
 * @version 1.0.0
 * @date 2025-12-07
 * @see Plan UTF8 Cascada - Sesión UTF8-2
 */

// ============================================================================
// INDICADORES DE MOJIBAKE (UTF-8 → Latin1 → UTF-8)
// ============================================================================

/**
 * Indicadores primarios de mojibake en español.
 * Estos caracteres aparecen cuando texto UTF-8 se interpreta como Latin1.
 * 
 * Ejemplos:
 * - "Ã" aparece en: Ã¡(á), Ã©(é), Ã­(í), Ã³(ó), Ãº(ú), Ã±(ñ)
 * - "Â" aparece en: Â´(´), Âº(º), Â°(°)
 * - "â€" aparece en comillas tipográficas corruptas
 */
const MOJIBAKE_PRIMARY = /[ÃÂ]/;

/**
 * Indicadores secundarios de mojibake (menos comunes pero definitivos).
 * 
 * Patrones específicos que confirman corrupción:
 * - â€ : Inicio de comillas tipográficas corruptas
 * - Ã± : ñ corrupta
 * - Ã¡ : á corrupta
 */
const MOJIBAKE_SECONDARY = /â€|Ã±|Ã¡|Ã©|Ã­|Ã³|Ãº/;

/**
 * Regex combinado para detección rápida.
 * Prioriza los indicadores más frecuentes en documentos PTEL andaluces.
 */
const MOJIBAKE_INDICATORS = /[ÃÂ]|â€/;

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Detecta si un texto es ASCII puro (sin caracteres extendidos).
 * 
 * ASCII puro significa códigos 0x00-0x7F únicamente.
 * Esto es el fast-path más rápido: si es ASCII, no hay mojibake posible.
 * 
 * @param text - Texto a analizar
 * @returns true si es ASCII puro, false si contiene caracteres extendidos
 * 
 * @example
 * isCleanASCII("Hello World") // true
 * isCleanASCII("504750.92")   // true
 * isCleanASCII("Almería")     // false (tiene í)
 * isCleanASCII("AlmerÃ­a")    // false (tiene Ã)
 */
export function isCleanASCII(text: string): boolean {
  if (!text || text.length === 0) return true;
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(text);
}

/**
 * Detecta si un texto puede contener mojibake y requiere corrección.
 * 
 * LÓGICA:
 * 1. Texto vacío o null → false (no sospechoso)
 * 2. ASCII puro → false (fast-path, ~90% de coordenadas)
 * 3. Contiene indicadores mojibake → true (requiere corrección)
 * 4. Solo caracteres españoles válidos → false (no corrupto)
 * 
 * @param text - Texto a analizar
 * @returns true si el texto parece corrupto y debe procesarse
 * 
 * @example
 * isSuspicious("504750.92")     // false - ASCII puro
 * isSuspicious("Almería")       // false - español válido
 * isSuspicious("AlmerÃ­a")      // true - mojibake detectado
 * isSuspicious("37Âº26'N")      // true - mojibake en coordenadas
 */
export function isSuspicious(text: string): boolean {
  // Caso 1: Vacío o null
  if (!text || text.length === 0) return false;
  
  // Caso 2: ASCII puro (fast-path)
  if (isCleanASCII(text)) return false;
  
  // Caso 3: Indicadores de mojibake
  if (MOJIBAKE_INDICATORS.test(text)) return true;
  
  // Caso 4: Tiene caracteres extendidos pero no son mojibake
  // (ej: "Almería" tiene í pero no Ã)
  return false;
}

/**
 * Versión extendida que devuelve el tipo de detección.
 * Útil para métricas y debugging.
 * 
 * @param text - Texto a analizar
 * @returns Objeto con resultado y razón
 */
export function detectEncodingIssue(text: string): {
  suspicious: boolean;
  reason: 'empty' | 'ascii_clean' | 'mojibake_primary' | 'mojibake_secondary' | 'clean_extended';
  indicators?: string[];
} {
  if (!text || text.length === 0) {
    return { suspicious: false, reason: 'empty' };
  }
  
  if (isCleanASCII(text)) {
    return { suspicious: false, reason: 'ascii_clean' };
  }
  
  // Buscar indicadores primarios
  if (MOJIBAKE_PRIMARY.test(text)) {
    const indicators: string[] = [];
    if (text.includes('Ã')) indicators.push('Ã');
    if (text.includes('Â')) indicators.push('Â');
    return { suspicious: true, reason: 'mojibake_primary', indicators };
  }
  
  // Buscar indicadores secundarios
  if (MOJIBAKE_SECONDARY.test(text)) {
    const match = text.match(MOJIBAKE_SECONDARY);
    return { 
      suspicious: true, 
      reason: 'mojibake_secondary', 
      indicators: match ? [match[0]] : [] 
    };
  }
  
  // Caracteres extendidos válidos (español limpio)
  return { suspicious: false, reason: 'clean_extended' };
}

/**
 * Analiza un array de textos y devuelve estadísticas.
 * Útil para evaluar un documento completo.
 * 
 * @param texts - Array de textos a analizar
 * @returns Estadísticas de detección
 */
export function analyzeTexts(texts: string[]): {
  total: number;
  ascii: number;
  cleanExtended: number;
  suspicious: number;
  suspiciousTexts: string[];
} {
  const result = {
    total: texts.length,
    ascii: 0,
    cleanExtended: 0,
    suspicious: 0,
    suspiciousTexts: [] as string[],
  };
  
  for (const text of texts) {
    const detection = detectEncodingIssue(text);
    
    if (detection.reason === 'ascii_clean' || detection.reason === 'empty') {
      result.ascii++;
    } else if (detection.reason === 'clean_extended') {
      result.cleanExtended++;
    } else {
      result.suspicious++;
      result.suspiciousTexts.push(text);
    }
  }
  
  return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  isSuspicious,
  isCleanASCII,
  detectEncodingIssue,
  analyzeTexts,
};
