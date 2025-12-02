/**
 * seedPatterns.ts - Catálogo de Patrones Empíricos PTEL
 * 
 * Nivel 1 del Sistema de Aprendizaje Adaptativo
 * Contiene patrones validados empíricamente con 426 pares X-Y
 * de 7 municipios andaluces (98% confianza ALTA)
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

// ============================================================================
// TIPOS
// ============================================================================

export type NivelComplejidad = 'baja' | 'media' | 'alta';
export type NivelConfianza = 'alta' | 'media' | 'baja';
export type FormatoDecimal = 'coma' | 'punto' | 'mixto' | 'ninguno';
export type SeparadorMiles = 'punto' | 'espacio' | 'ninguno';

export interface PatronSeed {
  id: string;
  nombre: string;
  descripcion: string;
  regex: RegExp;
  ejemplos: string[];
  frecuenciaGlobal: number; // Porcentaje 0-100
  complejidadAsociada: NivelComplejidad;
  fasesRequeridas: string[];
  provinciasComunes: string[];
}

export interface PerfilMunicipio {
  codigoINE: string;
  nombre: string;
  provincia: string;
  coordenadasAnalizadas: number;
  documentosAnalizados: number;
  fechaAnalisis: string;
  patronesPrincipales: Array<{
    patronId: string;
    frecuencia: number; // Porcentaje
    confianza: NivelConfianza;
  }>;
  formatoDecimalTipico: FormatoDecimal;
  separadorMilesTipico: SeparadorMiles;
  problemasFrecuentes: string[];
  nivelComplejidad: NivelComplejidad;
  requiereCorreccionP0: boolean;
}

// ============================================================================
// CATÁLOGO DE PATRONES EMPÍRICOS
// ============================================================================

/**
 * 9 patrones validados empíricamente organizados en grupos:
 * - Grupo A: Formatos limpios (estándar)
 * - Grupo B: Coma decimal (formato europeo)
 * - Grupo C: Espacios como separadores
 * - Grupo D: Errores y corrupciones
 */
export const PATTERN_CATALOG: Record<string, PatronSeed> = {
  // -------------------------------------------------------------------------
  // GRUPO A: Formatos Limpios
  // -------------------------------------------------------------------------
  LIMPIO_PUNTO: {
    id: 'LIMPIO_PUNTO',
    nombre: 'Decimal con punto (internacional)',
    descripcion: 'Formato estándar internacional: 436789.50',
    regex: /^\d{5,6}\.\d{1,3}$/,
    ejemplos: ['436789.50', '4136578.25', '512345.5'],
    frecuenciaGlobal: 35,
    complejidadAsociada: 'baja',
    fasesRequeridas: ['FASE_0_TRIM', 'FASE_5_PARSING'],
    provinciasComunes: ['Granada', 'Jaén']
  },

  LIMPIO_ENTERO: {
    id: 'LIMPIO_ENTERO',
    nombre: 'Entero sin decimales',
    descripcion: 'Coordenada entera sin parte decimal: 436789',
    regex: /^\d{5,7}$/,
    ejemplos: ['436789', '4136578', '512345'],
    frecuenciaGlobal: 15,
    complejidadAsociada: 'baja',
    fasesRequeridas: ['FASE_0_TRIM', 'FASE_5_PARSING'],
    provinciasComunes: ['Granada', 'Almería', 'Jaén']
  },

  // -------------------------------------------------------------------------
  // GRUPO B: Coma Decimal (Formato Europeo)
  // -------------------------------------------------------------------------
  COMA_DECIMAL: {
    id: 'COMA_DECIMAL',
    nombre: 'Decimal con coma (europeo simple)',
    descripcion: 'Formato europeo simple: 436789,50',
    regex: /^\d{5,6},\d{1,3}$/,
    ejemplos: ['436789,50', '4136578,25', '512345,0'],
    frecuenciaGlobal: 42,
    complejidadAsociada: 'baja',
    fasesRequeridas: ['FASE_0_TRIM', 'FASE_4_COMA_DECIMAL', 'FASE_5_PARSING'],
    provinciasComunes: ['Granada', 'Almería']
  },

  EUROPEO_COMPLETO: {
    id: 'EUROPEO_COMPLETO',
    nombre: 'Europeo con miles (punto miles, coma decimal)',
    descripcion: 'Formato europeo completo: 436.789,50',
    regex: /^\d{1,3}\.\d{3},\d{1,3}$/,
    ejemplos: ['436.789,50', '4.136.578,25', '512.345,0'],
    frecuenciaGlobal: 28,
    complejidadAsociada: 'media',
    fasesRequeridas: ['FASE_0_TRIM', 'FASE_3_SEPARADOR_MILES', 'FASE_4_COMA_DECIMAL', 'FASE_5_PARSING'],
    provinciasComunes: ['Granada', 'Almería']
  },

  // -------------------------------------------------------------------------
  // GRUPO C: Espacios como Separadores
  // -------------------------------------------------------------------------
  ESPACIO_DOBLE_TILDE: {
    id: 'ESPACIO_DOBLE_TILDE',
    nombre: 'Espacio doble con tilde (corrupción ODT)',
    descripcion: 'Formato corrupto de ODT: 436 ̃789,50 o similar',
    regex: /^\d{3}\s+[~˜̃]\s*\d{3},?\d*$/,
    ejemplos: ['436 ̃789,50', '413 ˜657', '512 ~345,0'],
    frecuenciaGlobal: 18,
    complejidadAsociada: 'alta',
    fasesRequeridas: ['FASE_0_TRIM', 'FASE_1_UTF8', 'FASE_2_ESPACIOS', 'FASE_4_COMA_DECIMAL', 'FASE_5_PARSING'],
    provinciasComunes: ['Almería']
  },

  ESPACIO_SIN_DECIMAL: {
    id: 'ESPACIO_SIN_DECIMAL',
    nombre: 'Espacio como separador de miles',
    descripcion: 'Espacio separa miles sin decimal: 436 789',
    regex: /^\d{3}\s+\d{3}$/,
    ejemplos: ['436 789', '413 657', '512 345'],
    frecuenciaGlobal: 22,
    complejidadAsociada: 'media',
    fasesRequeridas: ['FASE_0_TRIM', 'FASE_2_ESPACIOS', 'FASE_5_PARSING'],
    provinciasComunes: ['Almería']
  },

  ESPACIO_DECIMAL_IMPLICITO: {
    id: 'ESPACIO_DECIMAL_IMPLICITO',
    nombre: 'Espacio con decimal implícito',
    descripcion: 'Espacio separa miles, coma decimal: 436 789,50',
    regex: /^\d{3}\s+\d{3},\d{1,3}$/,
    ejemplos: ['436 789,50', '413 657,25', '512 345,0'],
    frecuenciaGlobal: 12,
    complejidadAsociada: 'media',
    fasesRequeridas: ['FASE_0_TRIM', 'FASE_2_ESPACIOS', 'FASE_4_COMA_DECIMAL', 'FASE_5_PARSING'],
    provinciasComunes: ['Almería', 'Granada']
  },

  // -------------------------------------------------------------------------
  // GRUPO D: Errores y Corrupciones
  // -------------------------------------------------------------------------
  Y_TRUNCADA: {
    id: 'Y_TRUNCADA',
    nombre: 'Coordenada Y truncada (falta 4 inicial)',
    descripcion: 'Y sin el dígito 4 inicial: 136578 en vez de 4136578',
    regex: /^[1-3]\d{5}$/,
    ejemplos: ['136578', '213456', '315789'],
    frecuenciaGlobal: 8,
    complejidadAsociada: 'alta',
    fasesRequeridas: ['FASE_0_TRIM', 'FASE_P0_CORRECCION_Y', 'FASE_5_PARSING'],
    provinciasComunes: ['Almería', 'Granada']
  },

  MOJIBAKE_UTF8: {
    id: 'MOJIBAKE_UTF8',
    nombre: 'Corrupción UTF-8 (mojibake)',
    descripcion: 'Caracteres corruptos por mala codificación: 436â€™789',
    regex: /\d+[â€™°ºª]+\d+/,
    ejemplos: ['436â€™789', '413°657', '512ª345'],
    frecuenciaGlobal: 5,
    complejidadAsociada: 'alta',
    fasesRequeridas: ['FASE_0_TRIM', 'FASE_1_UTF8', 'FASE_5_PARSING'],
    provinciasComunes: ['Almería']
  }
};

// ============================================================================
// PERFILES DE MUNICIPIOS CONOCIDOS
// ============================================================================

/**
 * 7 municipios analizados empíricamente con 426 coordenadas totales
 */
export const MUNICIPIO_PROFILES: Record<string, PerfilMunicipio> = {
  // ALMERÍA
  '04029': {
    codigoINE: '04029',
    nombre: 'Berja',
    provincia: 'Almería',
    coordenadasAnalizadas: 52,
    documentosAnalizados: 1,
    fechaAnalisis: '2025-12-01',
    patronesPrincipales: [
      { patronId: 'ESPACIO_DOBLE_TILDE', frecuencia: 45, confianza: 'alta' },
      { patronId: 'ESPACIO_SIN_DECIMAL', frecuencia: 30, confianza: 'alta' },
      { patronId: 'COMA_DECIMAL', frecuencia: 25, confianza: 'media' }
    ],
    formatoDecimalTipico: 'coma',
    separadorMilesTipico: 'espacio',
    problemasFrecuentes: [
      'Corrupción UTF-8 con tilde',
      'Espacios dobles como separador de miles',
      'Coordenadas Y truncadas'
    ],
    nivelComplejidad: 'alta',
    requiereCorreccionP0: true
  },

  '04092': {
    codigoINE: '04092',
    nombre: 'Tíjola',
    provincia: 'Almería',
    coordenadasAnalizadas: 45,
    documentosAnalizados: 1,
    fechaAnalisis: '2025-12-01',
    patronesPrincipales: [
      { patronId: 'ESPACIO_SIN_DECIMAL', frecuencia: 65, confianza: 'alta' },
      { patronId: 'COMA_DECIMAL', frecuencia: 35, confianza: 'media' }
    ],
    formatoDecimalTipico: 'coma',
    separadorMilesTipico: 'espacio',
    problemasFrecuentes: [
      'Espacios como separador de miles'
    ],
    nivelComplejidad: 'media',
    requiereCorreccionP0: false
  },

  // GRANADA
  '18051': {
    codigoINE: '18051',
    nombre: 'Colomera',
    provincia: 'Granada',
    coordenadasAnalizadas: 78,
    documentosAnalizados: 2,
    fechaAnalisis: '2025-12-01',
    patronesPrincipales: [
      { patronId: 'COMA_DECIMAL', frecuencia: 92, confianza: 'alta' }
    ],
    formatoDecimalTipico: 'coma',
    separadorMilesTipico: 'ninguno',
    problemasFrecuentes: [],
    nivelComplejidad: 'baja',
    requiereCorreccionP0: false
  },

  '18046': {
    codigoINE: '18046',
    nombre: 'Castril',
    provincia: 'Granada',
    coordenadasAnalizadas: 61,
    documentosAnalizados: 1,
    fechaAnalisis: '2025-12-01',
    patronesPrincipales: [
      { patronId: 'LIMPIO_PUNTO', frecuencia: 88, confianza: 'alta' },
      { patronId: 'LIMPIO_ENTERO', frecuencia: 12, confianza: 'media' }
    ],
    formatoDecimalTipico: 'punto',
    separadorMilesTipico: 'ninguno',
    problemasFrecuentes: [],
    nivelComplejidad: 'baja',
    requiereCorreccionP0: false
  },

  '18168': {
    codigoINE: '18168',
    nombre: 'Quéntar',
    provincia: 'Granada',
    coordenadasAnalizadas: 43,
    documentosAnalizados: 1,
    fechaAnalisis: '2025-12-01',
    patronesPrincipales: [
      { patronId: 'COMA_DECIMAL', frecuencia: 95, confianza: 'alta' }
    ],
    formatoDecimalTipico: 'coma',
    separadorMilesTipico: 'ninguno',
    problemasFrecuentes: [],
    nivelComplejidad: 'baja',
    requiereCorreccionP0: false
  },

  '18010': {
    codigoINE: '18010',
    nombre: 'Aldeire',
    provincia: 'Granada',
    coordenadasAnalizadas: 58,
    documentosAnalizados: 1,
    fechaAnalisis: '2025-12-01',
    patronesPrincipales: [
      { patronId: 'EUROPEO_COMPLETO', frecuencia: 55, confianza: 'alta' },
      { patronId: 'COMA_DECIMAL', frecuencia: 45, confianza: 'alta' }
    ],
    formatoDecimalTipico: 'coma',
    separadorMilesTipico: 'punto',
    problemasFrecuentes: [
      'Mezcla de formatos con y sin separador de miles'
    ],
    nivelComplejidad: 'media',
    requiereCorreccionP0: false
  },

  // JAÉN
  '23043': {
    codigoINE: '23043',
    nombre: 'Hornos',
    provincia: 'Jaén',
    coordenadasAnalizadas: 89,
    documentosAnalizados: 2,
    fechaAnalisis: '2025-12-01',
    patronesPrincipales: [
      { patronId: 'LIMPIO_PUNTO', frecuencia: 40, confianza: 'alta' },
      { patronId: 'COMA_DECIMAL', frecuencia: 35, confianza: 'alta' },
      { patronId: 'EUROPEO_COMPLETO', frecuencia: 25, confianza: 'media' }
    ],
    formatoDecimalTipico: 'mixto',
    separadorMilesTipico: 'ninguno',
    problemasFrecuentes: [
      'Mezcla de formatos punto y coma decimal'
    ],
    nivelComplejidad: 'media',
    requiereCorreccionP0: false
  }
};

// ============================================================================
// ESTADÍSTICAS GLOBALES
// ============================================================================

export const ESTADISTICAS_GLOBALES = {
  totalCoordenadas: 426,
  totalMunicipios: 7,
  totalDocumentos: 9,
  tasaExitoGlobal: 98,
  patronMasFrecuente: 'COMA_DECIMAL',
  provinciasAnalizadas: ['Almería', 'Granada', 'Jaén'],
  fechaUltimaActualizacion: '2025-12-01'
};

// ============================================================================
// FUNCIONES DE CONSULTA
// ============================================================================

/**
 * Obtiene el perfil de un municipio por su código INE
 */
export function getPerfilMunicipio(codigoINE: string): PerfilMunicipio | null {
  return MUNICIPIO_PROFILES[codigoINE] || null;
}

/**
 * Obtiene los patrones sugeridos para un municipio, ordenados por frecuencia
 */
export function getPatronesSugeridosPorMunicipio(codigoINE: string): PatronSeed[] {
  const perfil = MUNICIPIO_PROFILES[codigoINE];
  if (!perfil) return [];

  return perfil.patronesPrincipales
    .map(p => PATTERN_CATALOG[p.patronId])
    .filter((p): p is PatronSeed => p !== undefined);
}

/**
 * Obtiene un patrón por su ID
 */
export function getPatron(patronId: string): PatronSeed | null {
  return PATTERN_CATALOG[patronId] || null;
}

/**
 * Obtiene todos los patrones ordenados por frecuencia global
 */
export function getTodosPatronesOrdenados(): PatronSeed[] {
  return Object.values(PATTERN_CATALOG)
    .sort((a, b) => b.frecuenciaGlobal - a.frecuenciaGlobal);
}

/**
 * Sugiere patrones basándose en la provincia
 */
export function sugerirPatronesPorProvincia(provincia: string): PatronSeed[] {
  const provinciaLower = provincia.toLowerCase();
  
  return Object.values(PATTERN_CATALOG)
    .filter(p => p.provinciasComunes.some(
      prov => prov.toLowerCase() === provinciaLower
    ))
    .sort((a, b) => b.frecuenciaGlobal - a.frecuenciaGlobal);
}

/**
 * Calcula la complejidad esperada para un municipio o provincia
 */
export function calcularComplejidadEsperada(
  codigoINE?: string,
  provincia?: string
): NivelComplejidad {
  // Si tenemos perfil conocido, usar su complejidad
  if (codigoINE && MUNICIPIO_PROFILES[codigoINE]) {
    return MUNICIPIO_PROFILES[codigoINE].nivelComplejidad;
  }

  // Inferir por provincia
  if (provincia) {
    const provinciaLower = provincia.toLowerCase();
    
    // Almería tiende a tener más problemas
    if (provinciaLower === 'almería' || provinciaLower === 'almeria') {
      return 'alta';
    }
    
    // Granada y Jaén suelen ser más limpios
    if (provinciaLower === 'granada' || provinciaLower === 'jaén' || provinciaLower === 'jaen') {
      return 'media';
    }
  }

  // Por defecto, asumir complejidad media
  return 'media';
}

/**
 * Obtiene la lista de municipios con perfil conocido
 */
export function getMunicipiosConPerfil(): Array<{ codigoINE: string; nombre: string; provincia: string }> {
  return Object.values(MUNICIPIO_PROFILES).map(p => ({
    codigoINE: p.codigoINE,
    nombre: p.nombre,
    provincia: p.provincia
  }));
}

/**
 * Verifica si un municipio tiene perfil conocido
 */
export function tienePerfilConocido(codigoINE: string): boolean {
  return codigoINE in MUNICIPIO_PROFILES;
}
