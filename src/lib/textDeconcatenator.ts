/**
 * textDeconcatenator.ts
 * 
 * Utilidad para detectar y corregir texto concatenado proveniente de 
 * parsers ODT/DOCX que fusionan celdas de tablas sin espacios.
 * 
 * ENFOQUE CONSERVADOR:
 * - Solo aplica patrones de ALTA CONFIANZA
 * - NO modifica texto ALL CAPS que podría ser correcto
 * - Marca casos sospechosos para revisión manual
 * 
 * Validado con datos reales de 6 documentos PTEL:
 * - Colomera, Quéntar, Hornos, Castril, Tíjola, Berja
 * - 103 registros afectados
 * 
 * @version 2.0.0
 * @date 2025-11-28
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
// LISTAS DE EXCEPCIONES
// ============================================================================

/**
 * Palabras que contienen patrones que parecen concatenaciones pero no lo son
 */
const FALSE_POSITIVES = new Set([
  'polideportivo', 'videojuego', 'videoconferencia', 'radiodifusión',
  'biodegradable', 'audiovisual', 'hidroeléctrica', 'termodinámico',
  'electromagnético', 'socioeconómico', 'medioambiental', 'iberoamericano',
]);

/**
 * Preposiciones españolas que pueden aparecer concatenadas
 */
const PREPOSITIONS = ['de', 'del', 'la', 'el', 'los', 'las', 'al'];

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
  for (const fp of FALSE_POSITIVES) {
    if (lowerText.includes(fp)) {
      return result;
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
      `([aeiouáéíóú])(${prep})([\\s][A-ZÁÉÍÓÚÜÑ])`,
      'gi'
    );
    const beforePrep = text;
    text = text.replace(pattern, '$1 $2$3');
    if (text !== beforePrep) {
      result.patternsApplied.push(`preposición:${prep}`);
    }
  }

  // POST-PROCESAMIENTO PTEL
  text = text.replace(/\bTrasformador\b/gi, 'Transformador');
  text = text.replace(/\s+/g, ' ').trim();

  // DETECCIÓN DE CASOS SOSPECHOSOS (ALL CAPS concatenados)
  if (/^[A-ZÁÉÍÓÚÜÑ\s\.\-]+$/.test(input)) {
    const longSequences = input.match(/[A-ZÁÉÍÓÚÜÑ]{12,}/g);
    if (longSequences && longSequences.length > 0) {
      result.requiresReview = true;
      result.warnings.push(
        `Texto ALL CAPS con secuencias largas: "${longSequences.join('", "')}"`
      );
    }
  }

  result.corrected = text;
  result.wasModified = text !== input;

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
  validateCoordinateX,
  validateCoordinateY,
  splitConcatenatedCoordinates,
  detectMisplacedContent,
};
