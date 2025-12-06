/**
 * PTEL Andalucía - Patrones de Corrección UTF-8
 * 
 * Sistema de 3 tiers para corrección de mojibake en documentos municipales.
 * Ordenados por frecuencia de aparición en corpus andaluz.
 * 
 * Tier 1 (Hot): ~17 patrones más frecuentes - siempre evaluar
 * Tier 2 (Warm): ~25 patrones medios - evaluar si hay indicadores
 * Tier 3 (Cold): ~20 patrones raros - evaluar si Tier 1+2 no resuelven
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface MojibakePattern {
  corrupted: string;
  correct: string;
  description: string;
}

export type PatternTier = 'hot' | 'warm' | 'cold';

export interface TieredPatterns {
  hot: MojibakePattern[];
  warm: MojibakePattern[];
  cold: MojibakePattern[];
}

// ============================================================================
// TIER 1 - HOT: Patrones más frecuentes (~80% de correcciones)
// ============================================================================

/**
 * Patrones más comunes en documentos municipales andaluces.
 * Vocales acentuadas + ñ + símbolos de coordenadas.
 */
export const TIER1_HOT_PATTERNS: MojibakePattern[] = [
  // Vocales acentuadas minúsculas (muy frecuentes en topónimos)
  { corrupted: 'Ã¡', correct: 'á', description: 'á minúscula acentuada' },
  { corrupted: 'Ã©', correct: 'é', description: 'é minúscula acentuada' },
  { corrupted: 'Ã­', correct: 'í', description: 'í minúscula acentuada' },
  { corrupted: 'Ã³', correct: 'ó', description: 'ó minúscula acentuada' },
  { corrupted: 'Ãº', correct: 'ú', description: 'ú minúscula acentuada' },
  { corrupted: 'Ã±', correct: 'ñ', description: 'ñ eñe - MUY común en topónimos' },
  { corrupted: 'Ã¼', correct: 'ü', description: 'ü diéresis (Güéjar, Agüero)' },
  
  // Vocales acentuadas mayúsculas (usando hex escape)
  { corrupted: 'Ã\x81', correct: 'Á', description: 'Á mayúscula (Ávila, Álvarez)' },
  { corrupted: 'Ã\x89', correct: 'É', description: 'É mayúscula' },
  { corrupted: 'Ã\x8D', correct: 'Í', description: 'Í mayúscula' },
  { corrupted: 'Ã\x93', correct: 'Ó', description: 'Ó mayúscula' },
  { corrupted: 'Ã\x9A', correct: 'Ú', description: 'Ú mayúscula (Úbeda)' },
  { corrupted: 'Ã\x91', correct: 'Ñ', description: 'Ñ mayúscula' },
  
  // Símbolos de coordenadas (críticos para PTEL)
  { corrupted: 'Â´', correct: '´', description: 'tilde/acento agudo' },
  { corrupted: 'Âº', correct: 'º', description: 'símbolo ordinal/grado' },
  { corrupted: 'Â°', correct: '°', description: 'símbolo grado' },
  { corrupted: 'Â±', correct: '±', description: 'más/menos' },
];

// ============================================================================
// TIER 2 - WARM: Patrones de frecuencia media (~15% de correcciones)
// ============================================================================

/**
 * Patrones de frecuencia media: comillas tipográficas, símbolos especiales,
 * caracteres adicionales del español, y algunos casos de doble encoding.
 */
export const TIER2_WARM_PATTERNS: MojibakePattern[] = [
  // Comillas tipográficas (muy comunes en documentos Word/ODT)
  { corrupted: 'â€œ', correct: '"', description: 'comilla izquierda tipográfica' },
  { corrupted: 'â€', correct: '"', description: 'comilla derecha tipográfica' },
  { corrupted: 'â€™', correct: "'", description: 'apóstrofo tipográfico' },
  { corrupted: 'â€˜', correct: "'", description: 'comilla simple izquierda' },
  { corrupted: 'â€"', correct: '–', description: 'guión largo (en-dash)' },
  { corrupted: 'â€"', correct: '—', description: 'guión extra largo (em-dash)' },
  { corrupted: 'â€¦', correct: '…', description: 'puntos suspensivos' },
  
  // Espacio no-rompible y caracteres invisibles
  { corrupted: 'Â ', correct: ' ', description: 'espacio no-rompible (NBSP)' },
  { corrupted: 'Â\xA0', correct: ' ', description: 'NBSP alternativo' },
  
  // Símbolos adicionales frecuentes
  { corrupted: 'Â©', correct: '©', description: 'copyright' },
  { corrupted: 'Â®', correct: '®', description: 'marca registrada' },
  { corrupted: 'â„¢', correct: '™', description: 'trademark' },
  { corrupted: 'â‚¬', correct: '€', description: 'euro' },
  { corrupted: 'Â£', correct: '£', description: 'libra esterlina' },
  { corrupted: 'Â¥', correct: '¥', description: 'yen' },
  
  // Vocales con diéresis adicionales
  { corrupted: 'Ã¤', correct: 'ä', description: 'a diéresis' },
  { corrupted: 'Ã«', correct: 'ë', description: 'e diéresis' },
  { corrupted: 'Ã¯', correct: 'ï', description: 'i diéresis' },
  { corrupted: 'Ã¶', correct: 'ö', description: 'o diéresis' },
  
  // Caracteres especiales del español
  { corrupted: 'Â¿', correct: '¿', description: 'interrogación invertida' },
  { corrupted: 'Â¡', correct: '¡', description: 'exclamación invertida' },
  
  // Superíndices/subíndices (coordenadas)
  { corrupted: 'Â²', correct: '²', description: 'superíndice 2 (m²)' },
  { corrupted: 'Â³', correct: '³', description: 'superíndice 3 (m³)' },
  { corrupted: 'Â¹', correct: '¹', description: 'superíndice 1' },
  
  // Fracciones comunes
  { corrupted: 'Â½', correct: '½', description: 'fracción 1/2' },
  { corrupted: 'Â¼', correct: '¼', description: 'fracción 1/4' },
  { corrupted: 'Â¾', correct: '¾', description: 'fracción 3/4' },
];

// ============================================================================
// TIER 3 - COLD: Patrones raros (~5% de correcciones)
// ============================================================================

/**
 * Patrones raros: doble encoding, caracteres C1 de Windows-1252,
 * símbolos matemáticos, y casos especiales.
 */
export const TIER3_COLD_PATTERNS: MojibakePattern[] = [
  // Doble encoding (UTF-8 → Latin-1 → UTF-8)
  { corrupted: 'Ãƒâ€°', correct: 'É', description: 'É doble encoding' },
  { corrupted: 'Ãƒâ€"', correct: 'Ó', description: 'Ó doble encoding' },
  { corrupted: 'Ãƒâ€˜', correct: 'Ñ', description: 'Ñ doble encoding' },
  { corrupted: 'Ã¢â‚¬â„¢', correct: "'", description: 'apóstrofo doble encoding' },
  { corrupted: 'Ã¢â‚¬Å"', correct: '"', description: 'comilla doble encoding' },
  
  // Símbolos matemáticos/técnicos
  { corrupted: 'Â·', correct: '·', description: 'punto medio' },
  { corrupted: 'Â¶', correct: '¶', description: 'pilcrow/párrafo' },
  { corrupted: 'Â§', correct: '§', description: 'sección' },
  { corrupted: 'Âª', correct: 'ª', description: 'ordinal femenino' },
  { corrupted: 'Â¬', correct: '¬', description: 'negación lógica' },
  { corrupted: 'Â\xAD', correct: '\u00AD', description: 'guión suave (soft hyphen)' },
  
  // Vocales graves (menos comunes en español)
  { corrupted: 'Ã ', correct: 'à', description: 'a grave' },
  { corrupted: 'Ã¨', correct: 'è', description: 'e grave' },
  { corrupted: 'Ã¬', correct: 'ì', description: 'i grave' },
  { corrupted: 'Ã²', correct: 'ò', description: 'o grave' },
  { corrupted: 'Ã¹', correct: 'ù', description: 'u grave' },
];

// ============================================================================
// UTILIDADES DE AGREGACIÓN
// ============================================================================

/**
 * Todos los patrones organizados por tier
 */
export const TIERED_PATTERNS: TieredPatterns = {
  hot: TIER1_HOT_PATTERNS,
  warm: TIER2_WARM_PATTERNS,
  cold: TIER3_COLD_PATTERNS,
};

/**
 * Todos los patrones combinados (62 total)
 */
export const ALL_PATTERNS: MojibakePattern[] = [
  ...TIER1_HOT_PATTERNS,
  ...TIER2_WARM_PATTERNS,
  ...TIER3_COLD_PATTERNS,
];

/**
 * Indicadores de mojibake para detección rápida
 */
export const MOJIBAKE_INDICATORS = {
  primary: /[ÃÂ]/,
  secondary: /â€|Ã±|Ã¡|Ã©|Ã­|Ã³|Ãº/,
  doubleEncoding: /Ãƒ|â‚¬/,
};

/**
 * Cuenta total de patrones por tier
 */
export const PATTERN_COUNTS = {
  hot: TIER1_HOT_PATTERNS.length,
  warm: TIER2_WARM_PATTERNS.length,
  cold: TIER3_COLD_PATTERNS.length,
  total: ALL_PATTERNS.length,
} as const;
