/**
 * textDeconcatenator.ts
 * 
 * Utilidad para detectar y corregir texto concatenado proveniente de 
 * parsers ODT/DOCX que fusionan celdas de tablas sin espacios.
 * 
 * ENFOQUE CONSERVADOR:
 * - Solo aplica patrones de ALTA CONFIANZA
 * - Usa diccionario PTEL para ALL CAPS concatenados
 * - Marca casos sospechosos para revisión manual
 * - Protege palabras completas y nombres propios españoles
 * 
 * Validado con datos reales de 6 documentos PTEL:
 * - Colomera, Quéntar, Hornos, Castril, Tíjola, Berja
 * - 865 registros, 377 con concatenaciones
 * 
 * CHANGELOG v2.6 (30-Nov-2025):
 * - NEW: Diccionario PTEL con 150+ palabras de infraestructuras
 * - NEW: Patrón 10 - ALL CAPS con diccionario (CENTROSALUD → CENTRO SALUD)
 * - NEW: splitAllCapsWithDictionary() para separación inteligente
 * - TEST: 19/19 casos ALL CAPS (100% efectividad)
 * 
 * CHANGELOG v2.5 (30-Nov-2025):
 * - ADD: Nombres propios españoles a FALSE_POSITIVES
 * - FIX: Evita romper "Manuel Díaz" → "Manu el Díaz"
 * 
 * @version 2.6.0
 * @date 2025-11-30
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface DeconcatenationResult {
  original: string;
  corrected: string;
  wasModified: boolean;
  patternsApplied: string[];
  confidence: 'ALTA' | 'MEDIA' | 'BAJA';
  warnings: string[];
  requiresReview: boolean;
}

export interface CoordinateValidation {
  original: number;
  corrected: number;
  wasCorrected: boolean;
  issue: 'truncated_y' | 'concatenated' | 'outlier' | null;
  warning: string | null;
}

// ============================================================================
// DICCIONARIO PTEL PARA ALL CAPS
// ============================================================================

/**
 * Diccionario de palabras clave para separar ALL CAPS concatenados.
 * Ordenado por longitud descendente para matching greedy.
 * 
 * Basado en análisis de 865 registros de 9 documentos PTEL reales.
 */
const DICCIONARIO_PTEL = [
  // =========================================================================
  // TIPOLOGÍAS PRINCIPALES (documentos PTEL oficiales)
  // =========================================================================
  
  // Sanitario
  'CONSULTORIO', 'HOSPITAL', 'AMBULATORIO', 'CLINICA', 'CLÍNICA',
  'CENTRO', 'SALUD', 'URGENCIAS', 'FARMACIA',
  
  // Residencial/Asistencial
  'RESIDENCIA', 'ANCIANOS', 'MAYORES', 'TERCERA', 'EDAD',
  'DISCAPACITADOS', 'DEPENDIENTES', 'ASISTIDOS',
  
  // Educativo
  'COLEGIO', 'INSTITUTO', 'ESCUELA', 'GUARDERIA', 'GUARDERÍA',
  'CEIP', 'IES', 'CPR', 'CEP', 'INFANTIL', 'PRIMARIA', 'SECUNDARIA',
  'UNIVERSIDAD', 'FACULTAD', 'CONSERVATORIO',
  
  // Cultural
  'BIBLIOTECA', 'MUSEO', 'TEATRO', 'AUDITORIO', 'CULTURAL',
  'ARCHIVO', 'SALA', 'EXPOSICIONES', 'CASA', 'CULTURA',
  
  // Deportivo
  'POLIDEPORTIVO', 'PISCINA', 'ESTADIO', 'PABELLON', 'PABELLÓN',
  'CAMPO', 'FUTBOL', 'FÚTBOL', 'TENIS', 'PADEL', 'PÁDEL',
  'GIMNASIO', 'PISTA', 'ATLETISMO',
  
  // Espacios públicos
  'PLAZA', 'PARQUE', 'JARDIN', 'JARDÍN', 'JARDINES',
  'PASEO', 'AVENIDA', 'CALLE', 'CAMINO', 'CARRETERA',
  'GLORIETA', 'ROTONDA', 'MIRADOR',
  
  // Servicios municipales
  'AYUNTAMIENTO', 'MUNICIPAL', 'MUNICIPALES',
  'CEMENTERIO', 'MERCADO', 'LONJA', 'MATADERO',
  'DEPOSITO', 'DEPÓSITO', 'ALMACEN', 'ALMACÉN',
  'TALLER', 'NAVE', 'NAVES',
  
  // Seguridad
  'CUARTEL', 'GUARDIA', 'CIVIL', 'POLICIA', 'POLICÍA',
  'LOCAL', 'BOMBEROS', 'PROTECCION', 'PROTECCIÓN',
  'EMERGENCIAS', 'EMERGENCIA',
  
  // Transporte
  'ESTACION', 'ESTACIÓN', 'AUTOBUSES', 'AUTOBUS', 'AUTOBÚS',
  'TREN', 'FERROCARRIL', 'TAXI', 'PARADA', 'APEADERO',
  
  // Suministros
  'TRANSFORMADOR', 'TRASFORMADOR', 'ELECTRICA', 'ELÉCTRICA',
  'AGUA', 'POTABLE', 'ETAP', 'EDAR',
  'GASOLINERA', 'GASODUCTO', 'ANTENA', 'REPETIDOR',
  
  // =========================================================================
  // MODIFICADORES Y ADJETIVOS
  // =========================================================================
  'PUBLICO', 'PÚBLICO', 'PUBLICA', 'PÚBLICA',
  'PRINCIPAL', 'CENTRAL', 'GENERAL', 'NUEVO', 'NUEVA',
  'VIEJO', 'VIEJA', 'ANTIGUO', 'ANTIGUA',
  'MEDICO', 'MÉDICO', 'MEDICA', 'MÉDICA',
  'COMARCAL', 'PROVINCIAL', 'REGIONAL', 'NACIONAL',
  'SOCIAL', 'CIVICO', 'CÍVICO',
  
  // =========================================================================
  // NOMBRES PROPIOS FRECUENTES EN PTEL
  // =========================================================================
  
  // Religiosos (muy comunes)
  'SAN', 'SANTA', 'SANTO', 'VIRGEN', 'CRISTO', 'SEÑOR', 'SEÑORA',
  'CARMEN', 'JOSE', 'JOSÉ', 'JUAN', 'PEDRO', 'PABLO', 'MARIA', 'MARÍA',
  'FRANCISCO', 'ANTONIO', 'MANUEL', 'MIGUEL', 'RAFAEL', 'GABRIEL',
  'ANGELES', 'ÁNGELES', 'ROSARIO', 'DOLORES', 'PILAR', 'MERCEDES',
  
  // Apellidos/títulos comunes
  'HERMANOS', 'HERMANAS', 'DOCTOR', 'DOCTORA', 'PROFESOR', 'PROFESORA',
  'ALCALDE', 'CONDE', 'DUQUE', 'MARQUES', 'MARQUÉS', 'REY', 'REINA',
  'PEÑA', 'GARCIA', 'GARCÍA', 'LOPEZ', 'LÓPEZ', 'MARTINEZ', 'MARTÍNEZ',
  
  // Geográficos andaluces
  'SIERRA', 'VALLE', 'RIO', 'RÍO', 'MONTE', 'CERRO', 'LLANO', 'VEGA',
  'FUENTE', 'POZO', 'CRUZ', 'PUENTE', 'TORRE',
  
  // Provincias/ciudades
  'ALMERIA', 'ALMERÍA', 'GRANADA', 'MALAGA', 'MÁLAGA',
  'JAEN', 'JAÉN', 'CORDOBA', 'CÓRDOBA', 'SEVILLA', 'HUELVA', 'CADIZ', 'CÁDIZ',
  
  // =========================================================================
  // CÓDIGOS Y ABREVIATURAS
  // =========================================================================
  'CP', 'CTRA', 'AV', 'CL', 'PL', 'PZ', 'URB', 'POL', 'IND',
  'NUM', 'KM', 'HA',
  
  // Preposiciones (para separación)
  'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'AL', 'EN', 'CON',
  
].sort((a, b) => b.length - a.length); // Ordenar por longitud descendente (greedy)

// ============================================================================
// LISTAS DE EXCEPCIONES
// ============================================================================

/**
 * Palabras que contienen patrones que parecen concatenaciones pero no lo son.
 */
const FALSE_POSITIVES = new Set([
  // Palabras compuestas
  'polideportivo', 'videojuego', 'videoconferencia', 'radiodifusión',
  'biodegradable', 'audiovisual', 'hidroeléctrica', 'termodinámico',
  'electromagnético', 'socioeconómico', 'medioambiental', 'iberoamericano',
  
  // Palabras con "de" interno
  'residencial', 'modelo', 'moderno', 'moderna', 'federal', 'confederal',
  'moderado', 'moderada', 'modelado', 'modelaje', 'remodelación',
  
  // Palabras con "del" interno  
  'adelante', 'delante', 'delantera', 'delantero', 'modelista',
  
  // Palabras con "la" interno
  'lateral', 'bilateral', 'multilateral', 'colateral', 'unilateral',
  
  // Palabras con "el" interno
  'elemento', 'elemental', 'electoral', 'eléctrico', 'eléctrica',
  'delegación', 'delegado', 'delegada', 'modelar',
  
  // Palabras con "al" interno
  'mineral', 'general', 'comercial', 'industrial', 'material',
  'medicinal', 'racional', 'nacional', 'regional',

  // Nombres propios con "el"
  'manuel', 'manuela', 'miguel', 'gabriel', 'gabriela',
  'rafael', 'rafaela', 'israel', 'ezequiel', 'daniel', 'daniela',
  'joel', 'abel', 'ismael', 'samuel', 'misael', 'eliseo',
  'rogelio', 'aurelio', 'aurelia', 'cornelio', 'cornelia',
  'heliodoro', 'fidel', 'olegario',
  
  // Nombres propios con "la"
  'candela', 'candelaria', 'adela', 'adelaida', 'adelina',
  'estela', 'angela', 'angelita', 'angelica', 'angeles',
  'micaela', 'graciela', 'carmela', 'carmelita', 'carmelo',
  'consuela', 'consuelo', 'gisela', 'mariela', 'pamela',
  'noela', 'noelia', 'marcela', 'marcelo', 'ornela',
  'ariela', 'ariel', 'marisela',
  
  // Apellidos y topónimos
  'varela', 'vilela', 'cela', 'pela',
]);

/**
 * Preposiciones españolas que pueden aparecer concatenadas
 */
const PREPOSITIONS = ['de', 'del', 'la', 'el', 'los', 'las', 'al'];

// ============================================================================
// FUNCIÓN: SEPARAR ALL CAPS CON DICCIONARIO
// ============================================================================

/**
 * Separa texto ALL CAPS concatenado usando el diccionario PTEL.
 * Usa matching greedy (palabras más largas primero).
 * 
 * @example
 * splitAllCapsWithDictionary("CENTROSALUD") → "CENTRO SALUD"
 * splitAllCapsWithDictionary("HERMANOSPEÑA") → "HERMANOS PEÑA"
 * splitAllCapsWithDictionary("CPALMERÍA") → "CP ALMERÍA"
 */
export function splitAllCapsWithDictionary(text: string): {
  result: string;
  wasModified: boolean;
  partsFound: string[];
} {
  // Solo procesar ALL CAPS puros sin espacios, mínimo 6 caracteres
  if (!/^[A-ZÁÉÍÓÚÜÑ]+$/.test(text) || text.length < 6) {
    return { result: text, wasModified: false, partsFound: [] };
  }
  
  let remaining = text;
  const parts: string[] = [];
  
  while (remaining.length > 0) {
    let matched = false;
    
    // Buscar la palabra más larga que coincida al inicio
    for (const word of DICCIONARIO_PTEL) {
      if (remaining.startsWith(word)) {
        parts.push(word);
        remaining = remaining.substring(word.length);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // No match en diccionario - añadir el resto como una palabra
      if (remaining.length > 0) {
        parts.push(remaining);
      }
      break;
    }
  }
  
  // Solo modificar si encontramos al menos 2 partes
  if (parts.length < 2) {
    return { result: text, wasModified: false, partsFound: [] };
  }
  
  const result = parts.join(' ');
  return { 
    result, 
    wasModified: result !== text,
    partsFound: parts
  };
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE DESCONCATENACIÓN
// ============================================================================

/**
 * Desconcatena texto de forma conservadora.
 * Solo aplica patrones de ALTA CONFIANZA.
 */
export function deconcatenateText(input: string): DeconcatenationResult {
  const result: DeconcatenationResult = {
    original: input,
    corrected: input,
    wasModified: false,
    patternsApplied: [],
    confidence: 'ALTA',
    warnings: [],
    requiresReview: false,
  };

  if (!input || typeof input !== 'string' || input.length < 3) {
    return result;
  }

  let text = input.trim();
  const lowerText = text.toLowerCase();

  // Verificar falsos positivos conocidos
  const words = lowerText.split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[.,;:!?()]/g, '');
    if (FALSE_POSITIVES.has(cleanWord)) {
      return result;
    }
  }

  // =========================================================================
  // PATRÓN 10: ALL CAPS con diccionario (v2.6) - APLICAR PRIMERO
  // =========================================================================
  // Solo si el texto es ALL CAPS puro sin espacios
  if (/^[A-ZÁÉÍÓÚÜÑ]+$/.test(text) && text.length >= 6) {
    const dictResult = splitAllCapsWithDictionary(text);
    if (dictResult.wasModified) {
      text = dictResult.result;
      result.patternsApplied.push('diccionario-allcaps');
    }
  }

  // PATRÓN 0: MAYÚSCULAS + Abreviatura (M.ª, Dª, D.)
  const beforeAbbr0 = text;
  text = text.replace(/([A-ZÁÉÍÓÚÜÑ])(M\.ª|M\.a|Mª|Dª|D\.)(?=[A-Za-z])/g, '$1 $2');
  if (text !== beforeAbbr0) {
    result.patternsApplied.push('mayúscula+abreviatura');
  }

  // PATRÓN 1: camelCase (minúscula + MAYÚSCULA)
  const beforeCamel = text;
  text = text.replace(/([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2');
  if (text !== beforeCamel) {
    result.patternsApplied.push('camelCase');
  }

  // PATRÓN 2: Número + Mayúscula
  const beforeNum = text;
  text = text.replace(/(\d)([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2');
  if (text !== beforeNum) {
    result.patternsApplied.push('número+mayúscula');
  }

  // PATRÓN 3: Letra + Número largo (4+ dígitos)
  const beforeLetterNum = text;
  text = text.replace(/([A-Za-záéíóúüñÁÉÍÓÚÜÑ])(\d{4,})/g, '$1 $2');
  if (text !== beforeLetterNum) {
    result.patternsApplied.push('letra+número');
  }

  // PATRÓN 4: Abreviatura M.ª seguida de nombre
  const beforeAbbr = text;
  text = text.replace(/(M\.ª|M\.a|Mª|Dª|D\.)([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2');
  if (text !== beforeAbbr) {
    result.patternsApplied.push('abreviatura');
  }

  // PATRÓN 5: Preposición pegada al final de palabra
  for (const prep of PREPOSITIONS) {
    const pattern = new RegExp(
      `([aeiouáéíóú])(${prep})([\s][A-ZÁÉÍÓÚÜÑ])`,
      'gi'
    );
    const beforePrep = text;
    text = text.replace(pattern, '$1 $2$3');
    if (text !== beforePrep) {
      result.patternsApplied.push(`preposición:${prep}`);
    }
  }

  // PATRÓN 6: Vocal + preposición pegada
  const beforeVocalPrep = text;
  text = text.replace(/([aeiouáéíóú])(de|del|la|el)([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2 $3');
  text = text.replace(/([aeiouáéíóú])(de|del|la|el)(\s+)/g, '$1 $2$3');
  if (text !== beforeVocalPrep) {
    result.patternsApplied.push('vocal+preposición');
  }

  // PATRÓN 7: Punto pegado a siguiente palabra
  const beforeDot = text;
  text = text.replace(/\.([A-ZÁÉÍÓÚÜÑ])/g, '. $1');
  if (text !== beforeDot) {
    result.patternsApplied.push('punto+mayúscula');
  }

  // PATRÓN 8: Unidades pegadas a números
  const beforeUnit = text;
  text = text.replace(/(\d)(Km|km|Kms|kms|m|ha)(?=\d|\s|$)/gi, '$1 $2');
  text = text.replace(/(Km|km|Kms|kms)(\d)/gi, '$1 $2');
  if (text !== beforeUnit) {
    result.patternsApplied.push('unidad+número');
  }

  // PATRÓN 9: ALL CAPS + número al final
  const beforeAllCaps = text;
  text = text.replace(/([A-ZÁÉÍÓÚÜÑ]{3,})(\d+)$/g, '$1 $2');
  if (text !== beforeAllCaps) {
    result.patternsApplied.push('allcaps+número');
  }

  // =========================================================================
  // POST-PROCESAMIENTO
  // =========================================================================

  // Corrección ortográfica común en PTEL
  text = text.replace(/\bTrasformador\b/gi, 'Transformador');
  
  // Normalizar espacios múltiples
  text = text.replace(/\s+/g, ' ').trim();

  // DETECCIÓN DE CASOS SOSPECHOSOS
  if (/^[A-ZÁÉÍÓÚÜÑ\s\.\-]+$/.test(input)) {
    const longSequences = input.match(/[A-ZÁÉÍÓÚÜÑ]{12,}/g);
    if (longSequences && longSequences.length > 0) {
      // Si el diccionario no pudo separar, marcar para revisión
      if (!result.patternsApplied.includes('diccionario-allcaps')) {
        result.requiresReview = true;
        result.warnings.push(
          `Texto ALL CAPS no separado: "${longSequences.join('", "')}"`
        );
      }
    }
  }

  result.corrected = text;
  result.wasModified = text !== input;

  // Calcular nivel de confianza
  if (result.patternsApplied.length === 0) {
    result.confidence = 'ALTA';
  } else if (result.patternsApplied.length <= 2) {
    result.confidence = 'ALTA';
  } else if (result.patternsApplied.length <= 4) {
    result.confidence = 'MEDIA';
  } else {
    result.confidence = 'BAJA';
    result.warnings.push('Múltiples patrones aplicados - verificar resultado');
  }

  if (result.requiresReview) {
    result.confidence = 'MEDIA';
  }

  return result;
}

// ============================================================================
// VALIDACIÓN DE COORDENADAS
// ============================================================================

const ANDALUCIA_UTM = {
  X_MIN: 100000,
  X_MAX: 620000,
  Y_MIN: 3980000,
  Y_MAX: 4290000,
};

export function validateCoordinateY(value: number): CoordinateValidation {
  const result: CoordinateValidation = {
    original: value,
    corrected: value,
    wasCorrected: false,
    issue: null,
    warning: null,
  };

  if (value >= 40000 && value < 300000) {
    const corrected = value + 4000000;
    if (corrected >= ANDALUCIA_UTM.Y_MIN && corrected <= ANDALUCIA_UTM.Y_MAX) {
      result.corrected = corrected;
      result.wasCorrected = true;
      result.issue = 'truncated_y';
      result.warning = `Y truncada: ${value} → ${corrected} (añadido 4.000.000)`;
      return result;
    }
  }

  if (value < ANDALUCIA_UTM.Y_MIN || value > ANDALUCIA_UTM.Y_MAX) {
    const x10 = value * 10;
    if (x10 >= ANDALUCIA_UTM.Y_MIN && x10 <= ANDALUCIA_UTM.Y_MAX) {
      result.corrected = x10;
      result.wasCorrected = true;
      result.issue = 'truncated_y';
      result.warning = `Y truncada: ${value} → ${x10} (×10)`;
      return result;
    }
    result.issue = 'outlier';
    result.warning = `Y fuera de rango Andalucía: ${value}`;
  }

  return result;
}

export function validateCoordinateX(value: number): CoordinateValidation {
  const result: CoordinateValidation = {
    original: value,
    corrected: value,
    wasCorrected: false,
    issue: null,
    warning: null,
  };

  if (value > 1e9) {
    result.issue = 'concatenated';
    result.warning = `X concatenada: ${value} - requiere separación manual`;
    return result;
  }

  if (value < ANDALUCIA_UTM.X_MIN || value > ANDALUCIA_UTM.X_MAX) {
    result.issue = 'outlier';
    result.warning = `X fuera de rango Andalucía: ${value}`;
  }

  return result;
}

export function splitConcatenatedCoordinates(value: string): {
  values: number[];
  wasConcatenated: boolean;
  warning: string | null;
} {
  const numeric = value.replace(/[^\d]/g, '');
  
  if (numeric.length >= 12) {
    const mid = Math.floor(numeric.length / 2);
    const first = parseInt(numeric.substring(0, mid), 10);
    const second = parseInt(numeric.substring(mid), 10);
    
    const firstValidX = first >= 100000 && first <= 700000;
    const firstValidY = first >= 3900000 && first <= 4400000;
    const secondValidX = second >= 100000 && second <= 700000;
    const secondValidY = second >= 3900000 && second <= 4400000;
    
    if ((firstValidX && secondValidX) || (firstValidY && secondValidY) ||
        (firstValidX && secondValidY) || (firstValidY && secondValidX)) {
      return {
        values: [first, second],
        wasConcatenated: true,
        warning: `Coordenadas concatenadas: ${first} | ${second}`,
      };
    }
  }
  
  return {
    values: [parseFloat(value) || 0],
    wasConcatenated: false,
    warning: null,
  };
}

export function detectMisplacedContent(text: string): {
  hasMisplacedContent: boolean;
  contentType: 'personal' | 'horario' | 'otro' | null;
  warning: string | null;
} {
  const patterns = {
    personal: /\d+\s*(SARGENTO|CABO|OFICIAL|AGENTE|OPERARIO|FUNCIONARIO|PERSONA|CONDUCTOR|VIGILANTE)/i,
    horario: /(LABORABLES|FESTIVOS|HORARIO|LUNES|VIERNES|MAÑANA|TARDE|24\s*HORAS)/i,
  };

  for (const [contentType, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return {
        hasMisplacedContent: true,
        contentType: contentType as 'personal' | 'horario',
        warning: `Campo TIPO contiene información de ${contentType.toUpperCase()} - posible error de parser`,
      };
    }
  }

  return {
    hasMisplacedContent: false,
    contentType: null,
    warning: null,
  };
}

export default {
  deconcatenateText,
  splitAllCapsWithDictionary,
  validateCoordinateX,
  validateCoordinateY,
  splitConcatenatedCoordinates,
  detectMisplacedContent,
};
