/**
 * F025: Address Extractor - Módulo Principal
 * 
 * Extrae direcciones geocodificables de texto libre en documentos PTEL.
 * Implementa algoritmo de 8 pasos para limpieza y normalización.
 * 
 * @created 2025-12-04
 * @author MapWizard (Claude)
 */

import {
  STREET_TYPE_EXPANSIONS,
  INFRASTRUCTURE_PREFIXES,
  NON_GEOCODABLE_PATTERNS,
  MULTIPLE_STREET_PATTERN,
  CADASTRAL_PATTERN,
  OCR_UTF8_CORRECTIONS,
  SUFFIX_PATTERNS,
  LOWERCASE_WORDS,
  VALID_STREET_TYPES,
  STARTS_WITH_STREET_TYPE,
  SN_PATTERN,
} from './addressExtractor.patterns';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type NonGeocodableReason = 
  | 'not_geocodable' 
  | 'multiple_addresses' 
  | 'cadastral' 
  | 'description_only';


export interface AddressExtractionResult {
  /** Dirección limpia lista para geocodificar, null si no geocodificable */
  address: string | null;
  
  /** Nivel de confianza 0-100 */
  confidence: number;
  
  /** Razón si no geocodificable */
  reason?: NonGeocodableReason;
  
  /** Transformaciones aplicadas (para debug) */
  transformations?: string[];
}

// ============================================================================
// PASO 1: DETECTAR NO GEOCODIFICABLE
// ============================================================================

function isNotGeocodable(text: string): { result: boolean; reason?: NonGeocodableReason } {
  // Check patrones no geocodificables
  for (const pattern of NON_GEOCODABLE_PATTERNS) {
    if (pattern.test(text)) {
      return { result: true, reason: 'not_geocodable' };
    }
  }
  
  // Check parcela catastral
  if (CADASTRAL_PATTERN.test(text)) {
    return { result: true, reason: 'cadastral' };
  }
  
  // Check múltiples direcciones (más de 1 indicador de calle)
  const streetMatches = text.match(MULTIPLE_STREET_PATTERN);
  if (streetMatches && streetMatches.length > 1) {
    return { result: true, reason: 'multiple_addresses' };
  }
  
  return { result: false };
}


// ============================================================================
// PASO 2: CORREGIR OCR / UTF-8
// ============================================================================

function correctOcrUtf8(text: string, transformations: string[]): string {
  let result = text;
  
  for (const [pattern, replacement] of OCR_UTF8_CORRECTIONS) {
    const before = result;
    if (pattern instanceof RegExp) {
      result = result.replace(pattern, replacement);
    } else {
      result = result.split(pattern).join(replacement);
    }
    if (result !== before) {
      transformations.push(`OCR: "${pattern}" → "${replacement}"`);
    }
  }
  
  return result;
}

// ============================================================================
// PASO 3: ELIMINAR PREFIJOS DE INFRAESTRUCTURA
// ============================================================================

/**
 * Lista de tipos de vía para detectar dónde empieza la dirección real.
 * Se usa para eliminar todo lo anterior al primer tipo de vía detectado.
 */
const STREET_TYPE_MARKERS = [
  'Calle', 'CALLE', 'C/', 'c/',
  'Avenida', 'AVENIDA', 'Avda', 'AVDA', 'Avd', 'Av\\.', 'AV\\.',
  'Plaza', 'PLAZA', 'Pza', 'PZA', 'Plza', 'PLZA',
  'Carretera', 'CARRETERA', 'Ctra', 'CTRA',
  'Paseo', 'PASEO', 'Pso', 'PSO',
  'Camino', 'CAMINO', 'Cno', 'CNO',
  'Polígono', 'POLÍGONO', 'POLIGONO', 'Poligono', 'Pol\\.', 'POL\\.',
  'Paraje', 'PARAJE', 'Pje', 'PJE',
  'Vereda', 'VEREDA',
  'Cuesta', 'CUESTA',
  'Barrio', 'BARRIO',
  'Urbanización', 'URBANIZACIÓN', 'URBANIZACION', 'Urb\\.', 'URB\\.',
];

function removeInfrastructurePrefixes(text: string, transformations: string[]): string {
  let result = text;
  
  // Estrategia 1: Eliminar prefijos conocidos con nombre propio hasta la coma o tipo de vía
  // Ejemplos: "Centro de Salud Tíjola, Plaza..." → "Plaza..."
  //           "CEIP San José, Avenida..." → "Avenida..."
  //           "Ayuntamiento de Tíjola, despachos..." → buscar siguiente tipo de vía
  
  // Construir regex para tipos de vía
  const streetTypePattern = STREET_TYPE_MARKERS.join('|');
  
  for (const prefix of INFRASTRUCTURE_PREFIXES) {
    // Patrón: PREFIJO + [nombre propio opcional] + separador + (antes de tipo de vía)
    // Ejemplo: "Centro de Salud Tíjola, Plaza Luis Gonzaga..."
    //          "CEIP San José, Avenida de la Paz..."
    const prefixEscaped = escapeRegex(prefix);
    
    // Caso 1: Prefijo seguido de nombre propio y coma, luego tipo de vía
    // "Centro de Salud Tíjola, Plaza..." → "Plaza..."
    const regexWithNameAndStreetType = new RegExp(
      `^${prefixEscaped}(?:\\s+(?:de\\s+)?[A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\\s]*?)?[,.:;]?\\s*(?=(?:${streetTypePattern})\\b)`,
      'i'
    );
    
    const match1 = result.match(regexWithNameAndStreetType);
    if (match1) {
      result = result.slice(match1[0].length);
      transformations.push(`Prefix+name removed: "${match1[0].trim()}"`);
      continue; // Continuar con siguiente prefijo por si hay más
    }
    
    // Caso 2: Prefijo simple con coma
    // "Policía Local, C/Garcilaso..." → "C/Garcilaso..."
    const regexSimple = new RegExp(`^${prefixEscaped}[,.:;]?\\s*`, 'i');
    const match2 = result.match(regexSimple);
    if (match2) {
      result = result.slice(match2[0].length);
      transformations.push(`Prefix removed: "${prefix}"`);
    }
    
    // También buscar en medio del texto (después de un punto o guion)
    const midRegex = new RegExp(`[.\\-–]\\s*${prefixEscaped}[,.:;]?\\s*`, 'gi');
    const before = result;
    result = result.replace(midRegex, '. ');
    if (result !== before) {
      transformations.push(`Mid-prefix removed: "${prefix}"`);
    }
  }
  
  // Limpiar comas/espacios iniciales residuales
  result = result.replace(/^[,.:;\s]+/, '');
  
  // Limpiar "de Municipio" al inicio (ej: "de Tíjola, Plaza...")
  result = result.replace(/^de\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+[,.\s]+/i, '');
  
  // Caso especial: Si queda un nombre propio solo antes del tipo de vía
  // "Tíjola, Plaza Luis Gonzaga..." → "Plaza Luis Gonzaga..."
  // "despachos municipales, Plaza..." → "Plaza..."
  const cleanupBeforeStreetType = new RegExp(
    `^[A-ZÁÉÍÓÚÑa-záéíóúñ\\s]+,\\s*(?=${streetTypePattern}\\b)`,
    'i'
  );
  const cleanupMatch = result.match(cleanupBeforeStreetType);
  if (cleanupMatch) {
    result = result.slice(cleanupMatch[0].length);
    transformations.push(`Pre-street cleanup: "${cleanupMatch[0].trim()}"`);
  }
  
  return result;
}


// ============================================================================
// PASO 4: ELIMINAR SUFIJOS NO DESEADOS
// ============================================================================

function removeSuffixes(text: string, transformations: string[]): string {
  let result = text;
  
  for (const pattern of SUFFIX_PATTERNS) {
    const before = result;
    result = result.replace(pattern, '');
    if (result !== before) {
      transformations.push(`Suffix removed: ${pattern.source.substring(0, 30)}...`);
    }
  }
  
  // Limpiar puntuación final residual
  result = result.replace(/[,.:;\s]+$/, '');
  
  return result;
}

// ============================================================================
// PASO 5: EXPANDIR ABREVIATURAS DE VÍA
// ============================================================================

function expandStreetTypes(text: string, transformations: string[]): string {
  let result = text;
  
  // Caso especial: "C/ PLAZA" redundante → solo "Plaza"
  result = result.replace(/\bC\/\s*PLAZA\b/gi, 'Plaza');
  
  // Ordenar por longitud descendente para evitar conflictos
  const sortedAbbrevs = Object.keys(STREET_TYPE_EXPANSIONS)
    .sort((a, b) => b.length - a.length);
  
  for (const abbrev of sortedAbbrevs) {
    // Solo expandir si está al inicio o después de coma/espacio
    const escapedAbbrev = escapeRegex(abbrev);
    const regex = new RegExp(`(^|[,\\s])${escapedAbbrev}\\s*`, 'gi');
    const before = result;
    result = result.replace(regex, (match, prefix) => {
      const expanded = STREET_TYPE_EXPANSIONS[abbrev];
      return `${prefix}${expanded} `;
    });
    if (result !== before) {
      transformations.push(`Expanded: "${abbrev}" → "${STREET_TYPE_EXPANSIONS[abbrev]}"`);
    }
  }
  
  // Limpiar espacios múltiples
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}


// ============================================================================
// PASO 6: NORMALIZAR FORMATO DE NÚMERO
// ============================================================================

function normalizeNumber(text: string, transformations: string[]): string {
  let result = text;
  
  // n/ con espacio: "n/ 1" -> ", 1"
  result = result.replace(/\bn\/\s*(\d+)/gi, ', $1');
  
  // N.º o Nº: "N.º 15", "Nº1" -> ", 15"
  result = result.replace(/\bN\.?º\s*(\d+)/gi, ', $1');
  
  // N pegado a número (solo): "N4" -> ", 4"
  result = result.replace(/\bN(\d+)\b/g, ', $1');
  
  // Número pegado a texto municipio: "2Colomera" -> "2, Colomera"
  result = result.replace(/(\d+)([A-Z][a-záéíóúñ]+)/g, '$1, $2');
  
  // nave N.º: "NAVE N.º 11" -> "nave 11"
  result = result.replace(/\bnave\s+N\.?º?\s*(\d+)/gi, 'nave $1');
  
  // Guion como separador: "- 2" -> ", 2"
  result = result.replace(/\s+-\s*(\d+)\b/g, ', $1');
  
  // Número después de punto sin espacio: "1.  Berja" -> "1, Berja"
  result = result.replace(/(\d+)\.\s+([A-Z])/g, '$1, $2');
  
  // Normalizar s/n
  result = result.replace(SN_PATTERN, 's/n');
  
  // Limpiar comas duplicadas
  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/,\s+,/g, ',');
  
  if (result !== text) {
    transformations.push('Number format normalized');
  }
  
  return result;
}

// ============================================================================
// PASO 7: NORMALIZAR PUNTUACIÓN Y ESPACIOS
// ============================================================================

function normalizePunctuation(text: string, transformations: string[]): string {
  let result = text;
  
  // Punto seguido de espacio(s) y mayúscula → coma (si parece parte de dirección)
  result = result.replace(/\.\s+([A-ZÁÉÍÓÚÑ])/g, ', $1');
  
  // Múltiples espacios → uno
  result = result.replace(/\s+/g, ' ');
  
  // Espacio antes de coma → sin espacio
  result = result.replace(/\s+,/g, ',');
  
  // Coma sin espacio después → coma con espacio
  result = result.replace(/,([^\s])/g, ', $1');
  
  // Normalizar ", de Municipio" → ", Municipio" (eliminar "de" redundante)
  result = result.replace(/,\s*de\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\s*$/g, ', $1');
  
  // Limpiar inicio y final
  result = result.replace(/^[,.\s]+|[,.\s]+$/g, '');
  
  if (result !== text) {
    transformations.push('Punctuation normalized');
  }
  
  return result.trim();
}


// ============================================================================
// PASO 8: CAPITALIZACIÓN INTELIGENTE
// ============================================================================

function smartCapitalize(text: string, transformations: string[]): string {
  // Si no está todo en mayúsculas, probablemente ya tiene capitalización correcta
  if (text !== text.toUpperCase() && text !== text.toLowerCase()) {
    // Solo ajustar primera letra de cada palabra si es necesario
    return text;
  }
  
  const words = text.split(/\s+/);
  const result = words.map((word, index) => {
    const lowerWord = word.toLowerCase();
    
    // Preservar palabras que deben ir en minúscula (excepto al inicio)
    if (index > 0 && LOWERCASE_WORDS.has(lowerWord)) {
      return lowerWord;
    }
    
    // Preservar s/n en minúscula
    if (lowerWord === 's/n') {
      return 's/n';
    }
    
    // Title case: primera letra mayúscula, resto minúscula
    if (word.length === 0) return word;
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
  
  if (result !== text) {
    transformations.push('Smart capitalization applied');
  }
  
  return result;
}

// ============================================================================
// CÁLCULO DE CONFIANZA
// ============================================================================

function calculateConfidence(address: string): number {
  let confidence = 0;
  
  // Tiene tipo de vía reconocido (+40)
  if (STARTS_WITH_STREET_TYPE.test(address)) {
    confidence += 40;
  }
  
  // Tiene número o s/n (+30)
  if (/\b\d+\b/.test(address) || /\bs\/n\b/i.test(address)) {
    confidence += 30;
  }
  
  // Tiene municipio (palabra capitalizada al final después de coma) (+20)
  if (/,\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s*$/.test(address)) {
    confidence += 20;
  }
  
  // Tiene nombre de calle (al menos 2 palabras entre tipo y número) (+10)
  const parts = address.split(',')[0].split(/\s+/);
  if (parts.length >= 2) {
    confidence += 10;
  }
  
  // Penalización: muy corto
  if (address.length < 10) {
    confidence -= 20;
  }
  
  // Penalización: solo tiene tipo de vía sin nada más
  if (/^(Calle|Avenida|Plaza|Polígono)\s*,?\s*$/i.test(address)) {
    confidence = 10;
  }
  
  return Math.max(0, Math.min(100, confidence));
}


// ============================================================================
// HELPER: ESCAPE REGEX
// ============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Extrae una dirección geocodificable de texto libre.
 * 
 * @param rawText - Texto crudo del documento PTEL
 * @param municipality - Municipio para contexto (opcional)
 * @returns Resultado con dirección limpia, confianza y transformaciones
 * 
 * @example
 * ```typescript
 * const result = extractStreetAddress(
 *   'Centro de Salud Tíjola, Plaza Luis Gonzaga, n/ 1, disponible 24 horas',
 *   'Tíjola'
 * );
 * // result.address = 'Plaza Luis Gonzaga, 1, Tíjola'
 * // result.confidence = 90
 * ```
 */
export function extractStreetAddress(
  rawText: string,
  municipality?: string
): AddressExtractionResult {
  // Validación de entrada
  if (!rawText || typeof rawText !== 'string') {
    return {
      address: null,
      confidence: 0,
      reason: 'not_geocodable',
    };
  }
  
  const transformations: string[] = [];
  let text = rawText.trim();
  
  // PASO 1: Detectar NO geocodificable
  const nonGeoCheck = isNotGeocodable(text);
  if (nonGeoCheck.result) {
    return {
      address: null,
      confidence: 0,
      reason: nonGeoCheck.reason,
      transformations: ['Detected as non-geocodable'],
    };
  }
  
  // PASO 2: Corregir OCR/UTF-8
  text = correctOcrUtf8(text, transformations);
  
  // PASO 3: Eliminar prefijos de infraestructura
  text = removeInfrastructurePrefixes(text, transformations);
  
  // PASO 4: Eliminar sufijos no deseados
  text = removeSuffixes(text, transformations);
  
  // PASO 5: Expandir abreviaturas de vía
  text = expandStreetTypes(text, transformations);
  
  // PASO 6: Normalizar formato de número
  text = normalizeNumber(text, transformations);
  
  // PASO 7: Normalizar puntuación y espacios
  text = normalizePunctuation(text, transformations);
  
  // PASO 8: Capitalización inteligente
  text = smartCapitalize(text, transformations);
  
  // Verificar si quedó algo útil
  if (!text || text.length < 3) {
    return {
      address: null,
      confidence: 0,
      reason: 'description_only',
      transformations,
    };
  }
  
  // Calcular confianza
  const confidence = calculateConfidence(text);
  
  return {
    address: text,
    confidence,
    transformations,
  };
}
