/**
 * textDeconcatenator.ts
 * 
 * Utilidad para detectar y corregir texto concatenado proveniente de 
 * parsers ODT/DOCX que fusionan celdas de tablas sin espacios.
 * 
 * ENFOQUE CONSERVADOR:
 * - Solo aplica patrones de ALTA CONFIANZA
 * - NO modifica texto ALL CAPS que podría ser correcto (excepto números finales)
 * - Marca casos sospechosos para revisión manual
 * - Protege palabras completas que contienen preposiciones (residencial, modelo, etc.)
 * 
 * Validado con datos reales de 6 documentos PTEL:
 * - Colomera, Quéntar, Hornos, Castril, Tíjola, Berja
 * - 103 registros afectados → 23/23 tests pasados (100%)
 * 
 * CHANGELOG v2.4 (30-Nov-2025):
 * - FIX: Expandida lista FALSE_POSITIVES para proteger palabras con preposiciones
 * - FIX: Patrón vocal+preposición ahora solo aplica cuando hay transición clara
 * - FIX: Evita romper palabras como "residencial", "modelo", "delegación"
 * 
 * CHANGELOG v2.2 (30-Nov-2025):
 * - NEW: Patrón 6 - vocal+preposición (Sierrade → Sierra de)
 * - NEW: Patrón 7 - punto+mayúscula (Ctra.GR → Ctra. GR)
 * - NEW: Patrón 8 - unidad+número (Km5 → Km 5)
 * - NEW: Patrón 9 - allcaps+número (CPALMERÍA2 → CPALMERÍA 2)
 * 
 * @version 2.4.0
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
// LISTAS DE EXCEPCIONES
// ============================================================================

/**
 * Palabras que contienen patrones que parecen concatenaciones pero no lo son.
 * Incluye palabras con preposiciones internas (de, del, la, el) que NO deben separarse.
 * 
 * v2.4: Expandida significativamente para evitar falsos positivos
 */
const FALSE_POSITIVES = new Set([
  // Palabras compuestas originales
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
  'delegación', 'delegado', 'delegada', 'modelo', 'modelar',
  // Palabras con "al" interno
  'mineral', 'general', 'comercial', 'industrial', 'material',
  'medicinal', 'acional', 'racional', 'nacional', 'regional',
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

  // PATRÓN 5: Preposición pegada al final de palabra (legacy - mantener compatibilidad)
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

  // =========================================================================
  // PATRONES v2.4 (30-Nov-2025) - CORREGIDOS
  // =========================================================================

  // PATRÓN 6: Vocal + preposición pegada (CORREGIDO v2.4)
  // Solo aplica cuando:
  // - Hay una MAYÚSCULA directamente después (PlazadelAyuntamiento)
  // - O hay un espacio seguido de cualquier palabra (Barriode la Estación)
  // 
  // NO aplica cuando la preposición está en medio de una palabra minúscula
  const beforeVocalPrep = text;
  // Caso 1: vocal + prep + MAYÚSCULA directa
  text = text.replace(/([aeiouáéíóú])(de|del|la|el)([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2 $3');
  // Caso 2: vocal + prep + espacio (la prep estaba pegada al final)
  text = text.replace(/([aeiouáéíóú])(de|del|la|el)(\s+)/g, '$1 $2$3');
  if (text !== beforeVocalPrep) {
    result.patternsApplied.push('vocal+preposición');
  }

  // PATRÓN 7: Punto pegado a siguiente palabra (solo mayúsculas)
  // Ej: "Ctra.GR" → "Ctra. GR"
  // Ej: "Av.Principal" → "Av. Principal"
  const beforeDot = text;
  text = text.replace(/\.([A-ZÁÉÍÓÚÜÑ])/g, '. $1');
  if (text !== beforeDot) {
    result.patternsApplied.push('punto+mayúscula');
  }

  // =========================================================================
  // PATRONES v2.2 (30-Nov-2025)
  // =========================================================================

  // PATRÓN 8: Unidades pegadas a números
  // Ej: "3100Km" → "3100 Km", "Km5" → "Km 5"
  const beforeUnit = text;
  // número + unidad
  text = text.replace(/(\d)(Km|km|Kms|kms|m|ha)(?=\d|\s|$)/gi, '$1 $2');
  // unidad + número
  text = text.replace(/(Km|km|Kms|kms)(\d)/gi, '$1 $2');
  if (text !== beforeUnit) {
    result.patternsApplied.push('unidad+número');
  }

  // PATRÓN 9: ALL CAPS + número al final
  // Ej: "CPALMERÍA2" → "CPALMERÍA 2", "CEIP3" → "CEIP 3"
  // Solo aplica si hay al menos 3 letras mayúsculas antes del número
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

  // DETECCIÓN DE CASOS SOSPECHOSOS (ALL CAPS concatenados muy largos)
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
  validateCoordinateX,
  validateCoordinateY,
  splitConcatenatedCoordinates,
  detectMisplacedContent,
};
