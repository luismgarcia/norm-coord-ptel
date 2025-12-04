/**
 * addressCleaner.ts
 * 
 * Limpieza y normalización de direcciones PTEL para mejorar geocodificación.
 * 
 * Problemas detectados en documentos reales:
 * - Abreviaturas: "C/", "Avd", "Ctra."
 * - Espacios faltantes: "2Colomera" → "2, Colomera"
 * - Teléfonos embebidos: "Tel: 950123456"
 * - Horarios embebidos: "24h", "L-V 8:00-15:00"
 * - Equipamiento: "1 mesa, 2 sillas"
 * - Capitalización inconsistente: "c/ sol" → "Calle Sol"
 * 
 * @version 1.0.0
 * @date 2025-12-03
 * @see F023 Fase 1.3
 */

/** Prefijo para logs de esta fase */
const F023_1_3 = '[F023-1.3]';

// ============================================================================
// TIPOS
// ============================================================================

export interface CleanedAddress {
  /** Dirección limpia y normalizada */
  cleaned: string;
  /** Dirección original */
  original: string;
  /** Indica si hubo modificaciones */
  wasModified: boolean;
  /** Lista de modificaciones aplicadas */
  modifications: string[];
  /** Calidad estimada de la dirección (0-100) */
  quality: number;
  /** Componentes extraídos */
  components: AddressComponents;
  /** Elementos eliminados (teléfonos, horarios, etc.) */
  removed: RemovedElements;
}

export interface AddressComponents {
  /** Tipo de vía (Calle, Avenida, Plaza...) */
  viaType: string | null;
  /** Nombre de la vía */
  viaName: string | null;
  /** Número */
  number: string | null;
  /** Municipio/localidad detectada */
  locality: string | null;
  /** Código postal si presente */
  postalCode: string | null;
}

export interface RemovedElements {
  /** Teléfonos encontrados y eliminados */
  phones: string[];
  /** Horarios encontrados y eliminados */
  schedules: string[];
  /** Equipamiento/inventario eliminado */
  equipment: string[];
  /** Otros elementos eliminados */
  other: string[];
}

// ============================================================================
// DICCIONARIOS DE ABREVIATURAS
// ============================================================================

/**
 * Abreviaturas de tipos de vía españolas.
 * Formato: abreviatura (lowercase) → forma expandida
 */
const VIA_ABBREVIATIONS: Record<string, string> = {
  // Calle y variantes
  'c/': 'Calle',
  'c.': 'Calle',
  'cl/': 'Calle',
  'cl.': 'Calle',
  'calle': 'Calle',
  // Avenida
  'av/': 'Avenida',
  'av.': 'Avenida',
  'avd': 'Avenida',
  'avd.': 'Avenida',
  'avda': 'Avenida',
  'avda.': 'Avenida',
  'avenida': 'Avenida',
  // Plaza
  'pl/': 'Plaza',
  'pl.': 'Plaza',
  'pza': 'Plaza',
  'pza.': 'Plaza',
  'plza': 'Plaza',
  'plza.': 'Plaza',
  'plaza': 'Plaza',
  // Carretera
  'ctra': 'Carretera',
  'ctra.': 'Carretera',
  'crta': 'Carretera',
  'crta.': 'Carretera',
  'carretera': 'Carretera',
  // Paseo
  'pº': 'Paseo',
  'p.º': 'Paseo',
  'pso': 'Paseo',
  'pso.': 'Paseo',
  'paseo': 'Paseo',
  // Camino
  'cno': 'Camino',
  'cno.': 'Camino',
  'cmno': 'Camino',
  'camino': 'Camino',
  // Travesía
  'trav': 'Travesía',
  'trav.': 'Travesía',
  'trva': 'Travesía',
  'travesía': 'Travesía',
  'travesia': 'Travesía',
  // Glorieta
  'gta': 'Glorieta',
  'gta.': 'Glorieta',
  'glta': 'Glorieta',
  'glorieta': 'Glorieta',
  // Ronda
  'rda': 'Ronda',
  'rda.': 'Ronda',
  'ronda': 'Ronda',
  // Urbanización
  'urb': 'Urbanización',
  'urb.': 'Urbanización',
  'urbanización': 'Urbanización',
  'urbanizacion': 'Urbanización',
  // Polígono
  'pol': 'Polígono',
  'pol.': 'Polígono',
  'polígono': 'Polígono',
  'poligono': 'Polígono',
  // Partida
  'pda': 'Partida',
  'pda.': 'Partida',
  'partida': 'Partida',
  // Barrio
  'bº': 'Barrio',
  'bo': 'Barrio',
  'bo.': 'Barrio',
  'barrio': 'Barrio',
};

/**
 * Otras abreviaturas comunes en direcciones españolas
 */
const OTHER_ABBREVIATIONS: Record<string, string> = {
  // Número
  'nº': 'número',
  'n.º': 'número',
  'num': 'número',
  'num.': 'número',
  'n/': '',  // Solo eliminar, no expandir
  // Piso/planta
  'piso': 'piso',
  'pta': 'puerta',
  'pta.': 'puerta',
  // Bajo/entresuelo
  'bjo': 'bajo',
  'bjo.': 'bajo',
  'entlo': 'entresuelo',
  'entlo.': 'entresuelo',
  // Derecha/Izquierda
  'dcha': 'derecha',
  'dcha.': 'derecha',
  'izq': 'izquierda',
  'izq.': 'izquierda',
  'izda': 'izquierda',
  'izda.': 'izquierda',
  // Sin número
  's/n': 's/n',
  'sn': 's/n',
};

// ============================================================================
// NORMALIZACIÓN DE NOMBRES DE INFRAESTRUCTURAS (F023 Fase 3)
// ============================================================================

/**
 * Sinónimos de nombres de infraestructuras PTEL.
 * Normaliza variantes a forma canónica para mejor matching.
 * 
 * Formato: forma variante (lowercase) → forma canónica
 * 
 * @see F023 Fase 3 - Optimizaciones
 */
export const INFRASTRUCTURE_SYNONYMS: Record<string, string> = {
  // Centros de Salud
  'c.s.': 'Centro de Salud',
  'c.s': 'Centro de Salud',
  'cs': 'Centro de Salud',
  'cs.': 'Centro de Salud',
  'centro salud': 'Centro de Salud',
  'consultorio': 'Consultorio',
  'consultorio local': 'Consultorio Local',
  'cons.': 'Consultorio',
  'cons. local': 'Consultorio Local',
  
  // Hospitales
  'hosp.': 'Hospital',
  'hosp': 'Hospital',
  'h.': 'Hospital',
  'h. comarcal': 'Hospital Comarcal',
  'h. regional': 'Hospital Regional',
  'h. general': 'Hospital General',
  
  // Educación - Colegios
  'c.p.': 'Colegio Público',
  'c.p': 'Colegio Público',
  'cp': 'Colegio Público',
  'cp.': 'Colegio Público',
  'ceip': 'CEIP',
  'c.e.i.p.': 'CEIP',
  'c.e.i.p': 'CEIP',
  'col.': 'Colegio',
  'col': 'Colegio',
  'colegio publico': 'Colegio Público',
  
  // Educación - Institutos
  'i.e.s.': 'IES',
  'i.e.s': 'IES',
  'ies': 'IES',
  'instituto': 'Instituto',
  'inst.': 'Instituto',
  
  // Educación - Infantil
  'e.i.': 'Escuela Infantil',
  'e.i': 'Escuela Infantil',
  'ei': 'Escuela Infantil',
  'guarderia': 'Guardería',
  'guardería': 'Guardería',
  
  // Seguridad - Policía
  'comisaria': 'Comisaría',
  'comisaría': 'Comisaría',
  'com.': 'Comisaría',
  'policia local': 'Policía Local',
  'policía local': 'Policía Local',
  'pol. local': 'Policía Local',
  'pol.local': 'Policía Local',
  'p.l.': 'Policía Local',
  'p.l': 'Policía Local',
  'pl': 'Policía Local',
  
  // Seguridad - Guardia Civil
  'g.c.': 'Guardia Civil',
  'g.c': 'Guardia Civil',
  'gc': 'Guardia Civil',
  'guardia civil': 'Guardia Civil',
  'cuartel gc': 'Cuartel Guardia Civil',
  'cuartel g.c.': 'Cuartel Guardia Civil',
  'casa cuartel': 'Casa Cuartel',
  
  // Bomberos
  'parque bomberos': 'Parque de Bomberos',
  'parque de bomberos': 'Parque de Bomberos',
  'p. bomberos': 'Parque de Bomberos',
  'p.bomberos': 'Parque de Bomberos',
  
  // Municipal
  'ayto.': 'Ayuntamiento',
  'ayto': 'Ayuntamiento',
  'ayunt.': 'Ayuntamiento',
  'ayunt': 'Ayuntamiento',
  'ayuntamiento': 'Ayuntamiento',
  'casa consistorial': 'Casa Consistorial',
  
  // Deportivo
  'pabellon': 'Pabellón',
  'pabellón': 'Pabellón',
  'pab.': 'Pabellón',
  'polideportivo': 'Polideportivo',
  'polidep.': 'Polideportivo',
  'piscina municipal': 'Piscina Municipal',
  'pisc. mpal.': 'Piscina Municipal',
  'campo futbol': 'Campo de Fútbol',
  'campo de futbol': 'Campo de Fútbol',
  'campo de fútbol': 'Campo de Fútbol',
  
  // Cultural/Religioso
  'igl.': 'Iglesia',
  'iglesia': 'Iglesia',
  'ermita': 'Ermita',
  'biblioteca': 'Biblioteca',
  'bibl.': 'Biblioteca',
  'bib.': 'Biblioteca',
  'casa cultura': 'Casa de la Cultura',
  'casa de cultura': 'Casa de la Cultura',
  'c. cultura': 'Casa de la Cultura',
  
  // Hidráulico
  'dep.': 'Depósito',
  'deposito': 'Depósito',
  'depósito': 'Depósito',
  'etap': 'ETAP',
  'e.t.a.p.': 'ETAP',
  'edar': 'EDAR',
  'e.d.a.r.': 'EDAR',
  'depuradora': 'Depuradora',
  
  // Energía
  'c.t.': 'Centro de Transformación',
  'ct': 'Centro de Transformación',
  'subestacion': 'Subestación',
  'subestación': 'Subestación',
  's.e.': 'Subestación Eléctrica',
  'parque eolico': 'Parque Eólico',
  'parque eólico': 'Parque Eólico',
};

// ============================================================================
// CORRECCIÓN DE ERRORES COMUNES
// ============================================================================

/**
 * Errores tipográficos comunes en nombres de calles españolas.
 * Formato: forma incorrecta (lowercase) → forma correcta
 * 
 * Detectados en documentos PTEL reales:
 * - Separaciones incorrectas: "Garci laso" → "Garcilaso"
 * - Errores de OCR/transcripción
 */
const STREET_NAME_CORRECTIONS: Record<string, string> = {
  // Nombres propios mal separados (muy común en OCR)
  'garci laso': 'Garcilaso',
  'garci-laso': 'Garcilaso',
  'villa nueva': 'Villanueva',
  'villa-nueva': 'Villanueva',
  'casa blanca': 'Casablanca',
  'monte mayor': 'Montemayor',
  'fuente ovejuna': 'Fuenteovejuna',
  'fuente-ovejuna': 'Fuenteovejuna',
  'torre molinos': 'Torremolinos',
  'villa carrillo': 'Villacarrillo',
  'torre del campo': 'Torredelcampo',
  'villa nueva del arzobispo': 'Villanueva del Arzobispo',
  'alcala la real': 'Alcalá la Real',
  'sanlu car': 'Sanlúcar',
  'san lucar': 'Sanlúcar',
  // Nombres santos mal separados
  'san jose': 'San José',
  'san juan': 'San Juan',
  'santa maria': 'Santa María',
  'santo tomas': 'Santo Tomás',
  // Artículos mal pegados o separados
  'dela': 'de la',
  'delas': 'de las',
  'delos': 'de los',
  'dellos': 'de los',
  // Errores de acentuación en nombres comunes
  'jose': 'José',
  'maria': 'María',
  'garcia': 'García',
  'gonzalez': 'González',
  'hernandez': 'Hernández',
  'martinez': 'Martínez',
  'rodriguez': 'Rodríguez',
  'fernandez': 'Fernández',
  'andalucia': 'Andalucía',
  'constitucion': 'Constitución',
  // Calles famosas con errores frecuentes
  'gran via': 'Gran Vía',
  'via crucis': 'Vía Crucis',
};

// ============================================================================
// PATRONES DE ELIMINACIÓN
// ============================================================================

/**
 * Patrones para detectar teléfonos (españoles)
 */
const PHONE_PATTERNS: RegExp[] = [
  // +34 950 123 456 (con espacios variables)
  /\+34\s*\d{3}\s*\d{3}\s*\d{3}/g,
  // Tel: 950123456, Tlf. 950 12 34 56
  /\b(?:tel[éeÉE]?f?(?:ono)?|tlf|tfno?)[\s.:]*[\d\s]{9,15}/gi,
  // (950) 123 456
  /\(\d{2,3}\)\s*\d{3}\s*\d{3}/g,
  // 950-123-456, 950.123.456
  /\b\d{3}[-.\s]\d{3}[-.\s]\d{3}\b/g,
  // 950 123456, 950123456 (9 dígitos seguidos o separados)
  /\b[69]\d{2}\s?\d{3}\s?\d{3}\b/g,
];

/**
 * Patrones para detectar horarios
 */
const SCHEDULE_PATTERNS: RegExp[] = [
  // 24h, 24 horas
  /\b24\s*(?:h(?:oras?)?|hrs?)\b/gi,
  // L-V 8:00-15:00, L-V de 8 a 15
  /\b[LMXJVSD][-–][LMXJVSD]\s*(?:de\s*)?\d{1,2}[:.h]?\d{0,2}\s*[-–aA]\s*\d{1,2}[:.h]?\d{0,2}/gi,
  // de 9:00 a 14:00, de 9 a 14h
  /\bde\s*\d{1,2}[:.h]?\d{0,2}\s*[-–aA]\s*\d{1,2}[:.h]?\d{0,2}\s*h?\b/gi,
  // 8:00-15:00, 8h-15h
  /\b\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}\b/g,
  // Lunes a Viernes, Lunes-Viernes
  /\b(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s*[-–aA]\s*(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)/gi,
  // horario: X, horario de X
  /\bhorario\s*(?:de\s*)?:?\s*[^,.\n]{3,30}/gi,
];

/**
 * Patrones para detectar equipamiento/inventario
 */
const EQUIPMENT_PATTERNS: RegExp[] = [
  // 1 mesa, 2 sillas, 3 ordenadores
  /\b\d+\s*(?:mesa|silla|ordenador|equipo|cama|vehículo|camilla|desfibrilador|extintor|botiquín)e?s?\b/gi,
  // equipamiento: X, dotación: X
  /\b(?:equipamiento|dotación|dotacion|material|recursos?)\s*:?\s*[^,.\n]{3,50}/gi,
  // capacidad: X personas
  /\bcapacidad\s*:?\s*\d+\s*(?:persona|plaza|asiento|cama)s?\b/gi,
];

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Limpia y normaliza una dirección PTEL.
 * 
 * @param address - Dirección original
 * @returns Objeto con dirección limpia y metadatos
 * 
 * @example
 * cleanAddress("C/ erillas, 2Colomera")
 * // → { cleaned: "Calle Erillas, 2, Colomera", quality: 85, ... }
 * 
 * @example
 * cleanAddress("Avd Virgen de la Cabeza, 9. Tel: 958123456")
 * // → { cleaned: "Avenida Virgen de la Cabeza, 9", removed: { phones: ["958123456"] }, ... }
 */
export function cleanAddress(address: string): CleanedAddress {
  if (!address || typeof address !== 'string') {
    return {
      cleaned: '',
      original: address || '',
      wasModified: false,
      modifications: [],
      quality: 0,
      components: { viaType: null, viaName: null, number: null, locality: null, postalCode: null },
      removed: { phones: [], schedules: [], equipment: [], other: [] },
    };
  }

  const original = address;
  let cleaned = address.trim();
  const modifications: string[] = [];
  const removed: RemovedElements = { phones: [], schedules: [], equipment: [], other: [] };

  // 1. Eliminar teléfonos
  for (const pattern of PHONE_PATTERNS) {
    const matches = cleaned.match(pattern);
    if (matches) {
      matches.forEach(m => {
        const digits = m.replace(/\D/g, '');
        if (digits.length >= 9) {
          removed.phones.push(digits);
        }
      });
      cleaned = cleaned.replace(pattern, ' ');
      modifications.push('teléfono eliminado');
    }
  }

  // 2. Eliminar horarios
  for (const pattern of SCHEDULE_PATTERNS) {
    const matches = cleaned.match(pattern);
    if (matches) {
      matches.forEach(m => removed.schedules.push(m.trim()));
      cleaned = cleaned.replace(pattern, ' ');
      modifications.push('horario eliminado');
    }
  }

  // 3. Eliminar equipamiento
  for (const pattern of EQUIPMENT_PATTERNS) {
    const matches = cleaned.match(pattern);
    if (matches) {
      matches.forEach(m => removed.equipment.push(m.trim()));
      cleaned = cleaned.replace(pattern, ' ');
      modifications.push('equipamiento eliminado');
    }
  }

  // 4. Expandir abreviaturas de vía
  cleaned = expandViaAbbreviations(cleaned, modifications);

  // 5. Normalizar puntuación y espacios
  cleaned = normalizePunctuation(cleaned, modifications);

  // 6. Separar número pegado a municipio (ej: "2Colomera" → "2, Colomera")
  cleaned = separateNumberFromLocality(cleaned, modifications);

  // 7. Corregir errores comunes de nombres
  cleaned = correctCommonErrors(cleaned, modifications);

  // 8. Capitalizar correctamente
  cleaned = capitalizeAddress(cleaned, modifications);

  // 9. Limpiar espacios finales
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 10. Extraer componentes
  const components = extractComponents(cleaned);

  // 11. Calcular calidad
  const quality = calculateAddressQuality(cleaned, components);

  const wasModified = modifications.length > 0;

  if (wasModified) {
    console.debug(
      `${F023_1_3} Limpieza: "${original.substring(0, 40)}${original.length > 40 ? '...' : ''}" → ` +
      `"${cleaned.substring(0, 40)}${cleaned.length > 40 ? '...' : ''}" [${modifications.join(', ')}]`
    );
  }

  return {
    cleaned,
    original,
    wasModified,
    modifications,
    quality,
    components,
    removed,
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Expande abreviaturas de tipo de vía
 */
function expandViaAbbreviations(text: string, modifications: string[]): string {
  let result = text;
  
  // Buscar al inicio de la cadena o después de coma/punto
  for (const [abbrev, expanded] of Object.entries(VIA_ABBREVIATIONS)) {
    // Patrón para capturar la abreviatura al inicio o después de separador
    const escapedAbbrev = abbrev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[,;.\\s])${escapedAbbrev}\\s*`, 'gi');
    
    if (pattern.test(result)) {
      result = result.replace(pattern, `$1${expanded} `);
      if (!modifications.includes('abreviatura expandida')) {
        modifications.push('abreviatura expandida');
      }
    }
  }
  
  return result;
}

/**
 * Normaliza puntuación inconsistente
 */
function normalizePunctuation(text: string, modifications: string[]): string {
  let result = text;
  const original = text;
  
  // Reemplazar ". " por ", " antes de municipio (ej: "9. Colomera" → "9, Colomera")
  result = result.replace(/(\d)\s*\.\s+([A-ZÁÉÍÓÚÑ])/g, '$1, $2');
  
  // Eliminar puntos finales múltiples
  result = result.replace(/\.{2,}/g, '.');
  
  // Normalizar comas múltiples
  result = result.replace(/,{2,}/g, ',');
  
  // Asegurar espacio después de coma
  result = result.replace(/,([^\s])/g, ', $1');
  
  if (result !== original && !modifications.includes('puntuación normalizada')) {
    modifications.push('puntuación normalizada');
  }
  
  return result;
}

/**
 * Separa número pegado a nombre de localidad
 * Ej: "2Colomera" → "2, Colomera"
 * Ej: "5granada" → "5, granada" (también minúsculas)
 */
function separateNumberFromLocality(text: string, modifications: string[]): string {
  const original = text;
  
  // Patrón: número seguido directamente de letra (mayúscula O minúscula)
  // Capturamos cuando hay un número pegado a una palabra que parece localidad
  const result = text.replace(/(\d)([A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñ]+)/g, '$1, $2');
  
  if (result !== original && !modifications.includes('número separado de localidad')) {
    modifications.push('número separado de localidad');
  }
  
  return result;
}

/**
 * Corrige errores comunes en nombres de calles
 */
function correctCommonErrors(text: string, modifications: string[]): string {
  let result = text;
  const lower = text.toLowerCase();
  
  for (const [incorrect, correct] of Object.entries(STREET_NAME_CORRECTIONS)) {
    if (lower.includes(incorrect)) {
      // Buscar con regex para mantener posición y respetar límites de palabra
      const escapedIncorrect = incorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\b${escapedIncorrect}\\b`, 'gi');
      
      if (pattern.test(result)) {
        result = result.replace(pattern, correct);
        if (!modifications.includes('error corregido')) {
          modifications.push('error corregido');
        }
      }
    }
  }
  
  return result;
}

/**
 * Capitaliza correctamente la dirección
 */
function capitalizeAddress(text: string, modifications: string[]): string {
  const original = text;
  
  // Lista de palabras que no se capitalizan (excepto al inicio)
  const lowercaseWords = ['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'a', 'en', 'con'];
  
  const words = text.split(/\s+/);
  const capitalized = words.map((word, index) => {
    // Preservar s/n en minúsculas (puede tener coma u otro carácter después)
    if (word.match(/^s\/n[,.]?$/i)) {
      return word.toLowerCase();
    }
    
    // Preservar otras abreviaturas con barra en minúsculas
    if (word.match(/^[a-z]\/[a-z][,.]?$/i)) {
      return word.toLowerCase();
    }
    
    // Primera palabra siempre capitalizada
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    
    // Palabras pequeñas en minúscula (excepto después de coma)
    const prevWord = words[index - 1];
    if (lowercaseWords.includes(word.toLowerCase()) && !prevWord?.endsWith(',')) {
      return word.toLowerCase();
    }
    
    // Resto capitalizado
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  const result = capitalized.join(' ');
  
  if (result !== original && !modifications.includes('capitalización corregida')) {
    modifications.push('capitalización corregida');
  }
  
  return result;
}

/**
 * Extrae componentes estructurados de la dirección
 */
function extractComponents(address: string): AddressComponents {
  const components: AddressComponents = {
    viaType: null,
    viaName: null,
    number: null,
    locality: null,
    postalCode: null,
  };
  
  // Detectar tipo de vía
  const viaTypes = ['Calle', 'Avenida', 'Plaza', 'Paseo', 'Carretera', 'Camino', 'Travesía', 'Glorieta', 'Ronda', 'Urbanización', 'Polígono', 'Partida', 'Barrio'];
  for (const viaType of viaTypes) {
    if (address.startsWith(viaType + ' ')) {
      components.viaType = viaType;
      break;
    }
  }
  
  // Detectar número
  const numberMatch = address.match(/,?\s*(\d+)\s*(?:,|$)/);
  if (numberMatch) {
    components.number = numberMatch[1];
  }
  
  // Detectar código postal (5 dígitos)
  const cpMatch = address.match(/\b(\d{5})\b/);
  if (cpMatch) {
    components.postalCode = cpMatch[1];
  }
  
  // Detectar localidad (última parte después de número o coma final)
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    // Si no es un número ni código postal, es localidad
    if (!/^\d+$/.test(lastPart) && !/^\d{5}$/.test(lastPart)) {
      components.locality = lastPart;
    }
  }
  
  // Extraer nombre de vía
  if (components.viaType) {
    const afterViaType = address.substring(components.viaType.length + 1);
    const viaNameMatch = afterViaType.match(/^([^,\d]+)/);
    if (viaNameMatch) {
      components.viaName = viaNameMatch[1].trim();
    }
  }
  
  return components;
}

/**
 * Calcula la calidad de una dirección para geocodificación (0-100)
 */
function calculateAddressQuality(address: string, components: AddressComponents): number {
  let score = 0;
  
  // Longitud mínima razonable
  if (address.length < 5) return 0;
  if (address.length >= 10) score += 10;
  if (address.length >= 20) score += 10;
  
  // Tiene tipo de vía (+20)
  if (components.viaType) score += 20;
  
  // Tiene nombre de vía (+20)
  if (components.viaName && components.viaName.length > 2) score += 20;
  
  // Tiene número (+15)
  if (components.number) score += 15;
  
  // Tiene localidad (+20)
  if (components.locality) score += 20;
  
  // Tiene código postal (+5)
  if (components.postalCode) score += 5;
  
  // Penalizaciones
  // Muy corta
  if (address.length < 15) score -= 10;
  
  // Sin tipo de vía ni número (difícil geocodificar)
  if (!components.viaType && !components.number) score -= 20;
  
  // Solo tiene localidad
  if (!components.viaType && !components.viaName && !components.number && components.locality) {
    score = Math.min(score, 30);
  }
  
  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Evalúa si una dirección es geocodificable
 */
export function isGeocodable(address: string): { geocodable: boolean; reason: string; quality: number } {
  const result = cleanAddress(address);
  
  if (result.quality >= 70) {
    return { geocodable: true, reason: 'Dirección completa con vía y número', quality: result.quality };
  }
  
  if (result.quality >= 50 && result.components.locality) {
    return { geocodable: true, reason: 'Dirección parcial con localidad', quality: result.quality };
  }
  
  if (result.quality >= 30) {
    return { geocodable: false, reason: 'Dirección incompleta, solo localidad', quality: result.quality };
  }
  
  return { geocodable: false, reason: 'Dirección no válida para geocodificación', quality: result.quality };
}

/**
 * Limpia múltiples direcciones en lote
 */
export function cleanAddressBatch(addresses: string[]): CleanedAddress[] {
  return addresses.map(cleanAddress);
}

/**
 * Normaliza nombre de infraestructura usando diccionario de sinónimos.
 * Expande abreviaturas y unifica variantes para mejor matching.
 * 
 * @param name - Nombre original de la infraestructura
 * @returns Nombre normalizado
 * 
 * @example
 * normalizeInfrastructureName("C.S. Virgen de la Cabeza")
 * // → "Centro de Salud Virgen de la Cabeza"
 * 
 * @example
 * normalizeInfrastructureName("CEIP San José")
 * // → "CEIP San José" (ya normalizado)
 * 
 * @see F023 Fase 3 - Optimizaciones
 */
export function normalizeInfrastructureName(name: string): string {
  if (!name) return '';
  
  let normalized = name.trim();
  
  // Ordenar sinónimos por longitud descendente para evitar reemplazos parciales
  const sortedSynonyms = Object.entries(INFRASTRUCTURE_SYNONYMS)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [variant, canonical] of sortedSynonyms) {
    // Crear patrón que respete límites de palabra
    const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedVariant}\\b`, 'gi');
    
    if (pattern.test(normalized)) {
      normalized = normalized.replace(pattern, canonical);
    }
  }
  
  // Limpiar espacios múltiples
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Normaliza texto para comparación fuzzy (elimina acentos, minúsculas)
 * 
 * @param text - Texto a normalizar
 * @returns Texto normalizado para comparación
 */
export function normalizeForComparison(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Eliminar acentos
    .replace(/[^a-z0-9\s]/g, ' ')     // Solo alfanuméricos
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  cleanAddress,
  cleanAddressBatch,
  isGeocodable,
  normalizeInfrastructureName,
  normalizeForComparison,
  INFRASTRUCTURE_SYNONYMS,
};
