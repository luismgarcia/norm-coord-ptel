/**
 * PTEL Andalucía - Patrones de Corrección Mojibake UTF-8
 * 
 * Sistema de 62 patrones organizados en 3 tiers por frecuencia:
 * - Tier 1 (Hot): 17 patrones frecuentes en español andaluz
 * - Tier 2 (Warm): 25 patrones medios (símbolos, doble encoding)
 * - Tier 3 (Cold): 20 patrones raros (C1, casos especiales)
 * 
 * Basado en análisis de documentos PTEL municipales reales
 * y mejores prácticas de ftfy, ICU, y GDAL.
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

export interface MojibakePattern {
  corrupted: string;
  correct: string;
  description: string;
}

// ============================================================================
// TIER 1 (HOT): Patrones más frecuentes en español andaluz
// ~80% de las correcciones en documentos PTEL
// ============================================================================
export const TIER1_HOT_PATTERNS: MojibakePattern[] = [
  // Vocales acentuadas minúsculas (muy frecuentes)
  { corrupted: 'Ã¡', correct: 'á', description: 'á UTF-8 como Latin-1' },
  { corrupted: 'Ã©', correct: 'é', description: 'é UTF-8 como Latin-1' },
  { corrupted: 'Ã­', correct: 'í', description: 'í UTF-8 como Latin-1' },
  { corrupted: 'Ã³', correct: 'ó', description: 'ó UTF-8 como Latin-1' },
  { corrupted: 'Ãº', correct: 'ú', description: 'ú UTF-8 como Latin-1' },
  { corrupted: 'Ã±', correct: 'ñ', description: 'ñ UTF-8 como Latin-1 (crítico en español)' },
  { corrupted: 'Ã¼', correct: 'ü', description: 'ü UTF-8 como Latin-1 (Güéjar, Agüero)' },
  
  // Vocales acentuadas mayúsculas (usando hex escape)
  { corrupted: 'Ã\x81', correct: 'Á', description: 'Á mayúscula (Ávila, Álvarez)' },
  { corrupted: 'Ã\x89', correct: 'É', description: 'É mayúscula' },
  { corrupted: 'Ã\x8D', correct: 'Í', description: 'Í mayúscula' },
  { corrupted: 'Ã\x93', correct: 'Ó', description: 'Ó mayúscula' },
  { corrupted: 'Ã\x9A', correct: 'Ú', description: 'Ú mayúscula (Úbeda)' },
  { corrupted: 'Ã\x91', correct: 'Ñ', description: 'Ñ mayúscula' },
  
  // Símbolos de coordenadas (muy frecuentes en PTEL)
  { corrupted: 'Â´', correct: '´', description: 'Acento agudo aislado' },
  { corrupted: 'Âº', correct: 'º', description: 'Símbolo ordinal/grado' },
  { corrupted: 'Â°', correct: '°', description: 'Símbolo grado' },
  { corrupted: 'Â±', correct: '±', description: 'Símbolo más/menos' },
];

// ============================================================================
// TIER 2 (WARM): Patrones medios - símbolos y comillas tipográficas
// ~15% de las correcciones
// ============================================================================
export const TIER2_WARM_PATTERNS: MojibakePattern[] = [
  // Comillas tipográficas (frecuentes en documentos Word)
  { corrupted: 'â€œ', correct: '\u201C', description: 'Comilla izquierda tipográfica' },
  { corrupted: 'â€', correct: '\u201D', description: 'Comilla derecha tipográfica' },
  { corrupted: 'â€™', correct: '\u2019', description: 'Apostrofo tipografico' },
  { corrupted: 'â€˜', correct: '\u2018', description: 'Comilla simple izquierda' },
  { corrupted: 'â€"', correct: '\u2013', description: 'Guion medio (en-dash)' },
  { corrupted: 'â€"', correct: '\u2014', description: 'Guion largo (em-dash)' },
  { corrupted: 'â€¦', correct: '\u2026', description: 'Puntos suspensivos' },
  
  // Símbolos especiales
  { corrupted: 'â‚¬', correct: '€', description: 'Símbolo Euro' },
  { corrupted: 'Â©', correct: '©', description: 'Copyright' },
  { corrupted: 'Â®', correct: '®', description: 'Marca registrada' },
  { corrupted: 'â„¢', correct: '™', description: 'Trademark' },
  { corrupted: 'Â§', correct: '§', description: 'Sección (artículos legales)' },
  { corrupted: 'Â¶', correct: '¶', description: 'Párrafo (pilcrow)' },
  { corrupted: 'Â·', correct: '·', description: 'Punto medio (interpunct)' },
  { corrupted: 'Â¿', correct: '¿', description: 'Interrogación apertura' },
  { corrupted: 'Â¡', correct: '¡', description: 'Exclamación apertura' },
  
  // Espacios especiales
  { corrupted: 'Â ', correct: ' ', description: 'Espacio no rompible (NBSP)' },
  
  // Fracciones
  { corrupted: 'Â½', correct: '½', description: 'Un medio' },
  { corrupted: 'Â¼', correct: '¼', description: 'Un cuarto' },
  { corrupted: 'Â¾', correct: '¾', description: 'Tres cuartos' },
  
  // Superíndices
  { corrupted: 'Â²', correct: '²', description: 'Superíndice 2 (m²)' },
  { corrupted: 'Â³', correct: '³', description: 'Superíndice 3 (m³)' },
  { corrupted: 'Â¹', correct: '¹', description: 'Superíndice 1' },
  
  // Acentos adicionales
  { corrupted: 'Ã ', correct: 'à', description: 'a con grave' },
  { corrupted: 'Ã¨', correct: 'è', description: 'e con grave' },
];

// ============================================================================
// TIER 3 (COLD): Patrones raros - doble encoding, C1, casos especiales
// ~5% de las correcciones
// ============================================================================
export const TIER3_COLD_PATTERNS: MojibakePattern[] = [
  // Doble encoding (UTF-8 → Latin-1 → UTF-8)
  { corrupted: 'Ãƒâ€°', correct: 'É', description: 'É doble encoding' },
  { corrupted: 'ÃƒÂ¡', correct: 'á', description: 'á doble encoding' },
  { corrupted: 'ÃƒÂ©', correct: 'é', description: 'é doble encoding' },
  { corrupted: 'ÃƒÂ­', correct: 'í', description: 'í doble encoding' },
  { corrupted: 'ÃƒÂ³', correct: 'ó', description: 'ó doble encoding' },
  { corrupted: 'ÃƒÂº', correct: 'ú', description: 'ú doble encoding' },
  { corrupted: 'ÃƒÂ±', correct: 'ñ', description: 'ñ doble encoding' },
  
  // Caracteres C1 (Windows-1252 0x80-0x9F)
  { corrupted: '\x80', correct: '\u20AC', description: 'Euro C1' },
  { corrupted: '\x85', correct: '\u2026', description: 'Ellipsis C1' },
  { corrupted: '\x91', correct: '\u2018', description: 'Left single quote C1' },
  { corrupted: '\x92', correct: '\u2019', description: 'Right single quote C1' },
  { corrupted: '\x93', correct: '\u201C', description: 'Left double quote C1' },
  { corrupted: '\x94', correct: '\u201D', description: 'Right double quote C1' },
  { corrupted: '\x96', correct: '\u2013', description: 'En-dash C1' },
  { corrupted: '\x97', correct: '\u2014', description: 'Em-dash C1' },
  
  // Otros caracteres latinos
  { corrupted: 'Ã§', correct: 'ç', description: 'c cedilla (catalán)' },
  { corrupted: 'Ã‡', correct: 'Ç', description: 'C cedilla mayúscula' },
  { corrupted: 'Ã¤', correct: 'ä', description: 'a con diéresis' },
  { corrupted: 'Ã¶', correct: 'ö', description: 'o con diéresis' },
];

// ============================================================================
// EXPORTACIONES COMBINADAS
// ============================================================================

/**
 * Todos los patrones ordenados por longitud descendente (longest-match-first)
 */
export const ALL_PATTERNS: MojibakePattern[] = [
  ...TIER1_HOT_PATTERNS,
  ...TIER2_WARM_PATTERNS,
  ...TIER3_COLD_PATTERNS,
].sort((a, b) => b.corrupted.length - a.corrupted.length);

/**
 * Indicadores rápidos de mojibake para early-exit
 */
export const MOJIBAKE_INDICATORS = {
  /** Indicador primario: 0xC3 interpretado como Latin-1 */
  PRIMARY: /[ÃÂ]/,
  /** Indicador secundario: secuencias "â€" de comillas tipográficas */
  SECONDARY: /â€/,
  /** Indicador de doble encoding */
  DOUBLE_ENCODING: /Ãƒ/,
};

/**
 * Estadísticas de patrones
 */
export const PATTERN_STATS = {
  tier1Count: TIER1_HOT_PATTERNS.length,
  tier2Count: TIER2_WARM_PATTERNS.length,
  tier3Count: TIER3_COLD_PATTERNS.length,
  totalCount: ALL_PATTERNS.length,
};
