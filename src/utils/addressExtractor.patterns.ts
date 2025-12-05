/**
 * F025: Address Extractor - Patrones y Constantes
 * 
 * Constantes para extracción de direcciones de texto libre en documentos PTEL.
 * Basado en análisis de 12 documentos reales (Tíjola, Colomera, Berja, etc.)
 * 
 * @created 2025-12-04
 */

// ============================================================================
// EXPANSIONES DE TIPOS DE VÍA (47 variantes)
// ============================================================================

/**
 * Mapeo de abreviaturas de tipo de vía a su forma expandida.
 * Ordenadas por longitud descendente para evitar conflictos de matching.
 */
export const STREET_TYPE_EXPANSIONS: Record<string, string> = {
  // Calle (más variantes primero)
  'CALLE': 'Calle',
  'Calle': 'Calle',
  'CL.': 'Calle',
  'Cl.': 'Calle',
  'C/': 'Calle',
  'c/': 'Calle',
  
  // Avenida
  'AVENIDA': 'Avenida',
  'Avenida': 'Avenida',
  'Avda.': 'Avenida',
  'Avda': 'Avenida',
  'Avd.': 'Avenida',
  'Avd': 'Avenida',
  'Av.': 'Avenida',
  'Av/': 'Avenida',
  'AV.': 'Avenida',
  'AV/': 'Avenida',
  
  // Plaza
  'PLAZA': 'Plaza',
  'Plaza': 'Plaza',
  'Plza.': 'Plaza',
  'Plza': 'Plaza',
  'Pza.': 'Plaza',
  'Pza': 'Plaza',
  'Pl.': 'Plaza',
  'Pl/': 'Plaza',
  'PL.': 'Plaza',
  
  // Carretera
  'CARRETERA': 'Carretera',
  'Carretera': 'Carretera',
  'Ctra.': 'Carretera',
  'Ctra': 'Carretera',
  'CTRA.': 'Carretera',
  'CTRA': 'Carretera',
  
  // Polígono
  'POLÍGONO': 'Polígono',
  'POLIGONO': 'Polígono',
  'Polígono': 'Polígono',
  'Poligono': 'Polígono',
  'Pol.': 'Polígono',
  'POL.': 'Polígono',
  
  // Camino
  'CAMINO': 'Camino',
  'Camino': 'Camino',
  'Cno.': 'Camino',
  'Cno': 'Camino',
  'CNO.': 'Camino',
  
  // Paseo
  'PASEO': 'Paseo',
  'Paseo': 'Paseo',
  'Pso.': 'Paseo',
  'Pso': 'Paseo',
  'Pº': 'Paseo',
  'P.º': 'Paseo',
  
  // Paraje
  'PARAJE': 'Paraje',
  'Paraje': 'Paraje',
  'Pje.': 'Paraje',
  'Pje': 'Paraje',
  
  // Vereda
  'VEREDA': 'Vereda',
  'Vereda': 'Vereda',
  
  // Cuesta
  'CUESTA': 'Cuesta',
  'Cuesta': 'Cuesta',
  
  // Barrio
  'BARRIO': 'Barrio',
  'Barrio': 'Barrio',
  'Bº': 'Barrio',
  'Bo.': 'Barrio',
  
  // Urbanización
  'URBANIZACIÓN': 'Urbanización',
  'URBANIZACION': 'Urbanización',
  'Urbanización': 'Urbanización',
  'Urbanizacion': 'Urbanización',
  'Urb.': 'Urbanización',
  'URB.': 'Urbanización',
  
  // Partida
  'PARTIDA': 'Partida',
  'Partida': 'Partida',
  'Ptda.': 'Partida',
  'Ptda': 'Partida',
  
  // Autovía
  'AUTOVÍA': 'Autovía',
  'AUTOVIA': 'Autovía',
  'Autovía': 'Autovía',
  'Autovia': 'Autovía',
};


// ============================================================================
// PREFIJOS DE INFRAESTRUCTURA (51) - Ordenados por longitud descendente
// ============================================================================

/**
 * Prefijos de nombres de infraestructura que deben eliminarse antes de geocodificar.
 * Ordenados por longitud descendente para evitar conflictos de matching parcial.
 */
export const INFRASTRUCTURE_PREFIXES: string[] = [
  // Sanitarios (largos primero)
  'Consultorio Centro de Salud',
  'Centro de Salud',
  'Consultorio Médico',
  'Consultorio Local',
  'Consultorio Auxiliar',
  'Consultorio',
  
  // Residencias
  'Residencia de Mayores',
  'Residencia de Tercera Edad',
  'Residencia Asistencial',
  'Residencia',
  
  // Educativos
  'Escuela Infantil',
  'Instituto de Educación Secundaria',
  'Colegio Público',
  'Colegio',
  'Guardería',
  'CEIP',
  'IES',
  
  // Administrativos
  'Casa Consistorial',
  'Ayuntamiento',
  'Juzgado de Paz',
  
  // Seguridad
  'Consorcio de Bomberos',
  'Parque de Bomberos',
  'Policía Local Municipal',
  'Policía Local',
  'Casa Cuartel',
  'Guardia Civil',
  'Bomberos',
  
  // Deportivos
  'Pabellón Municipal de Deportes',
  'Pabellón Municipal',
  'Pabellón Deportivo',
  'Polideportivo Municipal',
  'Polideportivo',
  'Piscina Municipal',
  'Piscina',
  
  // Culturales
  'Biblioteca Municipal',
  'Biblioteca',
  'Casa de la Cultura',
  'Centro Cultural',
  
  // Sociales
  'Hogar del Pensionista',
  'Centro de Día',
  'Tanatorio Municipal',
  'Tanatorio',
  
  // Otros
  'Farmacia',
  'Servicio de',
  'Jefatura:',
  '- URGENCIAS.',
  '- URGENCIAS',
  'URGENCIAS.',
  'URGENCIAS',
];


// ============================================================================
// PATRONES NO GEOCODIFICABLES (regex)
// ============================================================================

/**
 * Regex para detectar texto que NO debe geocodificarse.
 * Si alguno hace match, retornar confidence: 0.
 */
export const NON_GEOCODABLE_PATTERNS: RegExp[] = [
  // Descripciones genéricas
  /lugar\s+(más\s+)?próximo\s+donde\s+se\s+localice/i,
  /según\s+(la\s+)?emergencia/i,
  /los\s+disponibles/i,
  /los\s+asignados/i,
  /indicar\s+ubicación/i,
  /pendiente\s+de/i,
  
  // Listados de personal/cargos
  /\d+,?-\s*cargos?\s+polític/i,
  /\d+,?-\s*funcionarios?\s+de/i,
  
  // C16: Solo nombres de infraestructura (sin dirección) - con variantes de "y"
  /^consultorio\s+(médico|local|auxiliar)(\s+de\s+\w+)?(\s+y\s+(del?\s+)?consultorio[\s\w]*)?$/i,
];

/**
 * Patrón para detectar múltiples direcciones en el mismo texto.
 * Si hay más de 1 match de C/, Av/, etc., es ambiguo.
 * 
 * IMPORTANTE: Este patrón se aplica ANTES de expandir abreviaturas.
 * Usa (?:^|\s) en lugar de \b porque \b no funciona bien con caracteres especiales.
 */
export const MULTIPLE_STREET_PATTERN = /(?:^|\s)(c\/|av[d.]?\.?|calle|avenida|plaza|pza\.?)(?=\s|$)/gi;

/**
 * Patrón para detectar parcelas catastrales (no geocodificables directamente).
 * Ej: "Pol 14- P 146"
 */
export const CADASTRAL_PATTERN = /\bpol\s*\d+\s*[-–]\s*p\s*\d+/i;


// ============================================================================
// CORRECCIONES OCR / UTF-8 (16 patrones)
// ============================================================================

/**
 * Correcciones de errores comunes de OCR y corrupción UTF-8 en documentos PTEL.
 */
export const OCR_UTF8_CORRECTIONS: Array<[RegExp | string, string]> = [
  // Número corrupto
  ['NÂº', 'Nº'],
  ['N.º', 'Nº'],
  ['Nº', 'Nº'],
  [/n\.?º/gi, 'Nº'],
  
  // Caracteres UTF-8 corruptos (Ã + algo)
  ['Ã±', 'ñ'],
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Âº', 'º'],
  
  // Typos comunes
  ['s7n', 's/n'],
  ['S7N', 's/n'],
  [/diponibilidad/gi, 'disponibilidad'],
  [/ACTECAS/g, 'Aztecas'],
  ['actecas', 'Aztecas'],
  
  // Tildes omitidas (común en DBF/ODS)
  [/\bFUTBOL\b/g, 'Fútbol'],
  [/\bFutbol\b/g, 'Fútbol'],
];

// ============================================================================
// PATRONES DE SUFIJOS A ELIMINAR
// ============================================================================

/**
 * Patrones regex para sufijos que deben eliminarse de las direcciones.
 */
export const SUFFIX_PATTERNS: RegExp[] = [
  // Horarios y disponibilidad (varios formatos de separador)
  // Primero los patrones más completos
  /[.,\-–]?\s*disponibilidad\s+24\s*h(oras)?\.?/gi,
  /[.,\-–]?\s*(disponible\s+)?24\s*h(oras)?\.?/gi,
  /[.,\-–]?\s*disponibilidad\.?\s*$/gi,  // "Disponibilidad" sola al final
  /[.,\-–]?\s*horario.*$/gi,  // "horario" seguido de cualquier cosa hasta el final
  /[.,\-–]?\s*l-v\s+\d+-\d+/gi,
  
  // Teléfonos (varios formatos)
  /,?\s*tel[éef]?[.:]\s*[\d\s-]+/gi,
  /,?\s*tlf\.?\s*[\d\s-]+/gi,
  /,?\s*tfno[.:]\s*[\d\s-]+/gi,
  /,?\s*\d{9}\s*-?\s*(disponible)?/gi,
  /[.,-]?\s*teléfono\.?\s*[\d\s]+/gi,
  
  // Provincias entre paréntesis
  /\s*\((almería|granada|jaén|córdoba|sevilla|málaga|cádiz|huelva)\)/gi,
  
  // Códigos postales
  /,?\s*\b(04|18|14|29|11|21|41|23)\d{3}\b/g,
  
  // Pisos/plantas
  /,?\s*\b(bajo|alto|izq(da)?\.?|dcha\.?|derecha|izquierda|pta\.?)\b/gi,
  /,?\s*\bplanta\s+\d+/gi,
  
  // T08: Referencias relativas (frente a, junto a, detrás de)
  // Importante: usar [^,]* (greedy pero parando en coma) para no capturar el municipio final
  /,?\s*\bfrente\s+(a(l)?\s+)?[A-Za-záéíóúñÁÉÍÓÚÑ\s]+(?=,|$)/gi,
  /,?\s*\bjunto\s+(a(l)?\s+)?[A-Za-záéíóúñÁÉÍÓÚÑ\s]+(?=,|$)/gi,
  /,?\s*\bdetr[aá]s\s+de(l)?\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+(?=,|$)/gi,
  /,?\s*\bal\s+lado\s+de(l)?\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+(?=,|$)/gi,
];


// ============================================================================
// CAPITALIZACIÓN - Palabras a preservar en minúsculas
// ============================================================================

/**
 * Palabras que deben mantenerse en minúsculas en Title Case.
 */
export const LOWERCASE_WORDS: Set<string> = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'a', 'en', 'con', 'sin',
]);

// ============================================================================
// PATRONES DE NÚMERO DE VÍA
// ============================================================================

/**
 * Regex para detectar y normalizar formatos de número.
 * Captura: n/ 1, N.º 15, N4, Nº1, etc.
 */
export const NUMBER_PATTERNS: RegExp[] = [
  // n/ con espacio: "n/ 1" -> "1"
  /\bn\/\s*(\d+)/gi,
  
  // N.º o Nº: "N.º 15", "Nº1" -> "15", "1"
  /\bN\.?º\s*(\d+)/gi,
  
  // N pegado a número: "N4" -> "4"
  /\bN(\d+)\b/g,
  
  // Número pegado a texto: "2Colomera" -> "2, Colomera"
  /(\d+)([A-Z][a-záéíóúñ]+)/g,
  
  // nave N.º: "NAVE N.º 11" -> "nave 11"
  /\bnave\s+N\.?º?\s*(\d+)/gi,
  
  // Guion como separador: "- 2" -> ", 2"
  /\s+-\s*(\d+)\b/g,
];

/**
 * Regex para detectar s/n (sin número).
 */
export const SN_PATTERN = /\bs\/?n\b/gi;

// ============================================================================
// HELPERS DE TIPOS
// ============================================================================

/**
 * Lista de tipos de vía reconocidos (para validación).
 */
export const VALID_STREET_TYPES: string[] = [
  'Calle', 'Avenida', 'Plaza', 'Carretera', 'Polígono', 'Camino',
  'Paseo', 'Paraje', 'Vereda', 'Cuesta', 'Barrio', 'Urbanización',
  'Partida', 'Autovía',
];

/**
 * Regex para detectar inicio con tipo de vía válido.
 */
export const STARTS_WITH_STREET_TYPE = new RegExp(
  `^(${VALID_STREET_TYPES.join('|')})\\b`,
  'i'
);
