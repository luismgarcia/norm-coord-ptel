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
  // IMPORTANTE: Se hace ANTES de expandir abreviaturas para detectar "C/ X ... C/ Y"
  const streetMatches = text.match(MULTIPLE_STREET_PATTERN);
  if (streetMatches && streetMatches.length > 1) {
    // EXCEPCIÓN: "Polígono + Calle" es válido (dirección dentro de polígono)
    // Ej: "POLIGONO C/ QUINTA AVENIDA S/N"
    const hasPoligono = /\bpol[ií]gono?\b/i.test(text);
    if (hasPoligono && streetMatches.length === 2) {
      // Permitir: Polígono + 1 tipo de calle
      return { result: false };
    }
    
    // EXCEPCIÓN: "C/ PLAZA" redundante es válido (una sola dirección)
    // Ej: "C/ PLAZA DE LA CONSTITUCIÓN"
    const hasPlazaRedundante = /\bc\/\s*plaza\b/i.test(text);
    if (hasPlazaRedundante && streetMatches.length === 2) {
      return { result: false };
    }
    
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
  
  // PRIMERO: nave N.º: "NAVE N.º 11" -> "nave 11" (antes de procesar N.º genérico)
  result = result.replace(/\bnave\s+N\.?º?\s*(\d+)/gi, 'nave $1');
  
  // n/ con espacio: "n/ 1" -> ", 1"
  result = result.replace(/\bn\/\s*(\d+)/gi, ', $1');
  
  // N.º o Nº: "N.º 15", "Nº1" -> ", 15"
  result = result.replace(/\bN\.?º\s*(\d+)/gi, ', $1');
  
  // N pegado a número (solo): "N4" -> ", 4"
  result = result.replace(/\bN(\d+)\b/g, ', $1');
  
  // Número pegado a texto municipio: "2Colomera" -> "2, Colomera"
  result = result.replace(/(\d+)([A-Z][a-záéíóúñ]+)/g, '$1, $2');
  
  // Guion como separador: "- 2" -> ", 2"
  result = result.replace(/\s+-\s*(\d+)\b/g, ', $1');
  
  // Número después de punto sin espacio: "1.  Berja" -> "1, Berja"
  result = result.replace(/(\d+)\.\s+([A-Z])/g, '$1, $2');
  
  // Normalizar s/n a formato estándar
  result = result.replace(SN_PATTERN, 's/n');
  
  // NUEVO: Añadir coma antes de s/n si falta (palabra + espacio + s/n)
  result = result.replace(/([a-záéíóúñA-ZÁÉÍÓÚÑ])\s+(s\/n)\b/gi, '$1, $2');
  
  // NUEVO: Añadir coma antes de número final si falta (palabra + espacio + número)
  // EXCEPCIÓN: NO para "Carretera 334" o "Autovía A-92" donde el número es parte del nombre
  if (!/\b(carretera|autov[ií]a|ctra\.?)\s+\w*\d+$/i.test(result)) {
    result = result.replace(/([a-záéíóúñA-ZÁÉÍÓÚÑ])\s+(\d+)$/gi, '$1, $2');
  }
  
  // NUEVO: Añadir coma antes de nave si falta (palabra + espacio + Nave)
  result = result.replace(/([a-záéíóúñA-ZÁÉÍÓÚÑ])\s+(nave,?\s*\d+)/gi, '$1, $2');
  
  // NUEVO: "nave, 11" o "Nave, 11" -> "nave 11" (quitar coma después de nave)
  result = result.replace(/\bnave,\s*(\d+)/gi, 'nave $1');
  
  // T07: Manejar "Polígono Industrial [Municipio]" como caso especial
  // NO añadir coma entre "Polígono" e "Industrial"
  // Pero SÍ añadir coma después de "Polígono" cuando va seguido de tipo de calle
  // Patrón: "Polígono Calle X" → "Polígono, Calle X"
  // EXCEPCIÓN: "Polígono Industrial" se mantiene junto
  if (!/\bPol[ií]gono\s+Industrial\b/i.test(result)) {
    result = result.replace(/\b(Pol[ií]gono)\s+(Calle|Avenida|Plaza|C\/)/gi, '$1, $2');
  }
  
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

function normalizePunctuation(text: string, transformations: string[], municipality?: string): string {
  let result = text;
  
  // T07: Manejar "Polígono Industrial [Municipio]" como caso especial
  // Patrón: "Polígono Industrial Tíjola, s/n" → "Polígono Industrial, s/n, Tíjola"
  if (municipality) {
    const poligonoMunicipioPattern = new RegExp(
      `^(Pol[ií]gono\\s+Industrial)\\s+${escapeRegex(municipality)}\\b(.*)`,
      'i'
    );
    const poligonoMatch = result.match(poligonoMunicipioPattern);
    if (poligonoMatch) {
      // poligonoMatch[1] = "Polígono Industrial"
      // poligonoMatch[2] = ", s/n" (el resto)
      result = `${poligonoMatch[1]}${poligonoMatch[2]}, ${municipality}`;
      transformations.push(`T07: Polígono Industrial + municipality separated`);
    }
  }
  
  // S44: Punto seguido de número → coma (ej: "Mayor. 15" → "Mayor, 15")
  result = result.replace(/\.\s*(\d)/g, ', $1');
  
  // Punto seguido de espacio(s) y mayúscula → coma (si parece parte de dirección)
  result = result.replace(/\.\s+([A-ZÁÉÍÓÚÑ])/g, ', $1');
  
  // D35: "DIRECCION" o "Direccion" → ", dirección" (normalizar con coma antes y minúscula)
  // Este regex captura cualquier variante y la normaliza a minúscula
  result = result.replace(/\s+(DIRECCI[OÓ]N|Direcci[oó]n|direcci[oó]n)\b/gi, ', dirección');
  
  // Asegurar que "Dirección" al final o antes de palabra quede en minúscula
  result = result.replace(/\bDirecci[oó]n\b/g, 'dirección');
  
  // B24/B29: Añadir coma antes de número si sigue a una palabra (no tipo de vía abreviado)
  // Patrón: "Constitución 1," → "Constitución, 1,"
  // EXCEPCIÓN: "Carretera 334," donde el número es identificador de vía
  if (!/\b(carretera|autov[ií]a|ctra\.?)\s+[\w-]*\d+/i.test(result)) {
    result = result.replace(/([a-záéíóúñ])\s+(\d+)\s*,/gi, '$1, $2,');
  }
  
  // B25/B30: Añadir coma después de s/n si sigue una palabra con mayúscula (municipio)
  result = result.replace(/\b(s\/n)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ])/gi, '$1, $2');
  
  // S43: Si el municipio está al principio (seguido de coma), moverlo al final
  let municipioMovido = false;
  if (municipality) {
    const municipioPattern = new RegExp(`^${escapeRegex(municipality)}\\s*,\\s*`, 'i');
    if (municipioPattern.test(result)) {
      result = result.replace(municipioPattern, '');
      municipioMovido = true;
      transformations.push(`Municipality moved: ${municipality} to end`);
    }
  }
  
  // S41: Detectar patrón "Tipo Nombre Número Municipio" sin comas y añadirlas
  // Patrón: "Calle Mayor 15 Granada" → detectar número sin coma antes
  result = result.replace(/([a-záéíóúñA-ZÁÉÍÓÚÑ])\s+(\d+(?:\s*[-\/]\s*\d+)?)\s+([A-ZÁÉÍÓÚÑ])/g, '$1, $2, $3');
  
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
  
  // S43: Añadir municipio al final si fue movido y no está ya presente
  if (municipioMovido && municipality) {
    const resultLower = result.toLowerCase().trim();
    const municipioLower = municipality.toLowerCase();
    if (!resultLower.endsWith(municipioLower)) {
      result = `${result.trim()}, ${municipality}`;
    }
  }
  
  if (result !== text) {
    transformations.push('Punctuation normalized');
  }
  
  return result.trim();
}


// ============================================================================
// PASO 8: CAPITALIZACIÓN INTELIGENTE
// ============================================================================

function smartCapitalize(text: string, transformations: string[]): string {
  // Dividir en palabras
  const words = text.split(/\s+/);
  let changed = false;
  
  const result = words.map((word, index) => {
    // Si la palabra contiene coma u otro separador, procesarla por partes
    if (word.includes(',')) {
      const parts = word.split(',');
      return parts.map((part, partIndex) => {
        if (part.length === 0) return '';
        const prevWord = partIndex === 0 && index > 0 ? words[index - 1].toLowerCase() : '';
        return capitalizeWord(part, index === 0 && partIndex === 0, prevWord);
      }).join(',');
    }
    
    const prevWord = index > 0 ? words[index - 1].toLowerCase() : '';
    return capitalizeWord(word, index === 0, prevWord);
  }).join(' ');
  
  if (result !== text) {
    transformations.push('Smart capitalization applied');
  }
  
  return result;
}

/**
 * Capitaliza una palabra individual aplicando reglas inteligentes.
 */
function capitalizeWord(word: string, isFirst: boolean, prevWord: string = ''): string {
  if (word.length === 0) return word;
  
  const lowerWord = word.toLowerCase();
  
  // Preservar s/n en minúscula
  if (lowerWord === 's/n') {
    return 's/n';
  }
  
  // Artículos/preposiciones siempre en minúscula
  const alwaysLower = new Set(['de', 'del', 'y', 'e', 'a', 'en', 'con', 'sin', 'nave', 'dirección']);
  if (!isFirst && alwaysLower.has(lowerWord)) {
    return lowerWord;
  }
  
  // "la", "el", "los", "las" en minúscula SOLO después de "de" o "del"
  const articlesAfterDe = new Set(['la', 'el', 'los', 'las']);
  if (!isFirst && articlesAfterDe.has(lowerWord) && (prevWord === 'de' || prevWord === 'del')) {
    return lowerWord;
  }
  
  // Si la palabra está toda en mayúsculas (más de 1 letra), convertir a Title Case
  if (word.length > 1 && word === word.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(word)) {
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }
  
  // Si la palabra está toda en minúsculas, convertir a Title Case
  if (word === word.toLowerCase() && /[a-záéíóúñ]/.test(word[0])) {
    return word[0].toUpperCase() + word.slice(1);
  }
  
  // Devolver sin cambios
  return word;
}

// ============================================================================
// CÁLCULO DE CONFIANZA
// ============================================================================

function calculateConfidence(address: string): number {
  let confidence = 0;
  
  // Tiene tipo de vía reconocido (+40)
  if (STARTS_WITH_STREET_TYPE.test(address)) {
    confidence += 40;
  } else {
    // D36: Sin tipo de vía pero con formato "nombre, número" (+30)
    // Patrón: palabra capitalizada seguida de coma y número
    if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+,\s*\d+/.test(address)) {
      confidence += 30;
    }
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
  
  // C20: Bonus formato perfecto "Tipo Nombre, número" (+10)
  // Patrón: empieza con tipo, tiene coma antes del número
  if (STARTS_WITH_STREET_TYPE.test(address) && /,\s*\d+/.test(address)) {
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
  
  // S43 FIX: Detectar si el texto comienza con municipio seguido de tipo de vía
  // (antes de cualquier procesamiento)
  let municipioAlInicio = false;
  if (municipality) {
    const municipioInicioPattern = new RegExp(
      `^${escapeRegex(municipality)}\\s*,\\s*(?=(?:Calle|C\\/|Avenida|Avda|Plaza|Pza|Paseo|Camino|Carretera)\\b)`,
      'i'
    );
    if (municipioInicioPattern.test(text)) {
      municipioAlInicio = true;
      transformations.push(`Municipality detected at start: ${municipality}`);
    }
  }
  
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
  text = normalizePunctuation(text, transformations, municipality);
  
  // PASO 8: Capitalización inteligente
  text = smartCapitalize(text, transformations);
  
  // S43 FIX: Añadir municipio al final si estaba al inicio y ya no está
  if (municipioAlInicio && municipality) {
    const textLower = text.toLowerCase().trim();
    const municipioLower = municipality.toLowerCase();
    if (!textLower.endsWith(municipioLower)) {
      text = `${text.trim()}, ${municipality}`;
      transformations.push(`Municipality added at end: ${municipality}`);
    }
  }
  
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
