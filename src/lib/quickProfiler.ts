/**
 * quickProfiler.ts - Perfilador Rápido de Documentos PTEL
 * 
 * Nivel 1 del Sistema de Aprendizaje Adaptativo
 * Detecta automáticamente el municipio, sugiere patrones probables,
 * y optimiza el procesamiento saltando fases innecesarias.
 * 
 * @version 1.0.0
 * @date 2025-12-02
 */

import { detectarMunicipio, DeteccionMunicipio } from './municipioDetector';
import {
  PatronSeed,
  PerfilMunicipio,
  NivelComplejidad,
  NivelConfianza,
  FormatoDecimal,
  PATTERN_CATALOG,
  MUNICIPIO_PROFILES,
  getPerfilMunicipio,
  getPatronesSugeridosPorMunicipio,
  sugerirPatronesPorProvincia,
  calcularComplejidadEsperada,
  getTodosPatronesOrdenados
} from './seedPatterns';

// ============================================================================
// TIPOS
// ============================================================================

export interface OpcionesPerfilador {
  /** Muestra de coordenadas para análisis */
  muestraCoordenadas?: string[];
  /** Máximo de coordenadas a analizar de la muestra */
  maxMuestra?: number;
  /** Umbral de confianza mínimo (0-100) */
  umbralConfianza?: number;
  /** Forzar un municipio específico (código INE) */
  forzarMunicipio?: string;
  /** Forzar análisis de muestra aunque haya perfil conocido */
  forzarAnalisisMuestra?: boolean;
  /** Modo verbose para debugging */
  verbose?: boolean;
}

export interface PerfilDocumento {
  /** Nombre del municipio detectado */
  municipio: string | null;
  /** Código INE del municipio */
  codigoINE: string | null;
  /** Provincia del municipio */
  provincia: string | null;
  /** Patrones sugeridos ordenados por probabilidad */
  patronesSugeridos: PatronSeed[];
  /** Patrón principal (más probable) */
  patronPrincipal: PatronSeed | null;
  /** Formato decimal detectado */
  formatoDecimalDetectado: FormatoDecimal;
  /** Nivel de complejidad esperado */
  complejidad: NivelComplejidad;
  /** Nivel de confianza del perfil */
  confianza: NivelConfianza;
  /** Puntuación de confianza (0-100) */
  puntuacion: number;
  /** Indica si requiere corrección P0 (Y truncada) */
  requiereCorreccionP0: boolean;
  /** Fases optimizadas a ejecutar */
  fasesOptimizadas: string[];
  /** Fases que se pueden omitir */
  fasesOmitidas: string[];
  /** Fuente del perfil */
  fuentePerfil: 'conocido' | 'provincia' | 'muestra' | 'generico';
  /** Indica si el municipio tiene perfil conocido */
  perfilConocido: boolean;
  /** Tiempo de análisis en ms */
  tiempoAnalisis: number;
  /** Número de coordenadas analizadas de la muestra */
  muestraAnalizada: number;
}

interface ResultadoAnalisisMuestra {
  patronesDetectados: Array<{ patronId: string; frecuencia: number }>;
  formatoDecimal: FormatoDecimal;
  complejidad: NivelComplejidad;
  confianza: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Fases obligatorias que siempre se ejecutan */
const FASES_OBLIGATORIAS = ['FASE_0_TRIM', 'FASE_5_PARSING'];

/** Todas las fases disponibles en orden de ejecución */
const TODAS_LAS_FASES = [
  'FASE_0_TRIM',
  'FASE_P0_CORRECCION_Y',
  'FASE_1_UTF8',
  'FASE_2_ESPACIOS',
  'FASE_3_SEPARADOR_MILES',
  'FASE_4_COMA_DECIMAL',
  'FASE_5_PARSING',
  'FASE_6_DMS',
  'FASE_7_NMEA',
  'FASE_8_WKT',
  'FASE_9_GEOJSON',
  'FASE_10_VALIDACION_RANGO',
  'FASE_11_REPROYECCION',
  'FASE_12_PRECISION'
];

/** Mapeo de patrones a fases requeridas */
const PATRON_A_FASES: Record<string, string[]> = {
  'LIMPIO_PUNTO': ['FASE_0_TRIM', 'FASE_5_PARSING'],
  'LIMPIO_ENTERO': ['FASE_0_TRIM', 'FASE_5_PARSING'],
  'COMA_DECIMAL': ['FASE_0_TRIM', 'FASE_4_COMA_DECIMAL', 'FASE_5_PARSING'],
  'EUROPEO_COMPLETO': ['FASE_0_TRIM', 'FASE_3_SEPARADOR_MILES', 'FASE_4_COMA_DECIMAL', 'FASE_5_PARSING'],
  'ESPACIO_DOBLE_TILDE': ['FASE_0_TRIM', 'FASE_1_UTF8', 'FASE_2_ESPACIOS', 'FASE_4_COMA_DECIMAL', 'FASE_5_PARSING'],
  'ESPACIO_SIN_DECIMAL': ['FASE_0_TRIM', 'FASE_2_ESPACIOS', 'FASE_5_PARSING'],
  'ESPACIO_DECIMAL_IMPLICITO': ['FASE_0_TRIM', 'FASE_2_ESPACIOS', 'FASE_4_COMA_DECIMAL', 'FASE_5_PARSING'],
  'Y_TRUNCADA': ['FASE_0_TRIM', 'FASE_P0_CORRECCION_Y', 'FASE_5_PARSING'],
  'MOJIBAKE_UTF8': ['FASE_0_TRIM', 'FASE_1_UTF8', 'FASE_5_PARSING']
};

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Perfila un documento rápidamente para optimizar su procesamiento
 * 
 * @param nombreArchivo - Nombre del archivo para detectar municipio
 * @param contenidoTexto - Texto inicial del documento (cabecera/título)
 * @param opciones - Opciones de configuración
 * @returns Perfil del documento con patrones sugeridos y fases optimizadas
 * 
 * @example
 * ```typescript
 * const perfil = await perfilarDocumentoRapido(
 *   'PTEL_Colomera_2024.odt',
 *   'Plan Territorial de Emergencias Local de Colomera',
 *   { muestraCoordenadas: ['436780,0', '4136578,2'] }
 * );
 * // perfil.patronPrincipal = COMA_DECIMAL
 * // perfil.fasesOptimizadas = ['FASE_0_TRIM', 'FASE_4_COMA_DECIMAL', 'FASE_5_PARSING']
 * ```
 */
export async function perfilarDocumentoRapido(
  nombreArchivo: string,
  contenidoTexto: string,
  opciones: OpcionesPerfilador = {}
): Promise<PerfilDocumento> {
  const inicio = performance.now();
  
  const {
    muestraCoordenadas = [],
    maxMuestra = 20,
    umbralConfianza = 60,
    forzarMunicipio,
    forzarAnalisisMuestra = false,
    verbose = false
  } = opciones;

  // Paso 1: Detectar municipio
  let deteccion: DeteccionMunicipio | null = null;
  let codigoINE: string | null = null;
  let municipio: string | null = null;
  let provincia: string | null = null;

  if (forzarMunicipio) {
    codigoINE = forzarMunicipio;
    const perfil = getPerfilMunicipio(forzarMunicipio);
    if (perfil) {
      municipio = perfil.nombre;
      provincia = perfil.provincia;
    }
  } else {
    deteccion = detectarMunicipio(nombreArchivo, contenidoTexto);
    if (deteccion && deteccion.puntuacion >= umbralConfianza) {
      codigoINE = deteccion.codigoINE;
      municipio = deteccion.municipio;
      provincia = deteccion.provincia;
    }
  }

  if (verbose) {
    console.log(`[QuickProfiler] Municipio detectado: ${municipio} (${codigoINE})`);
  }

  // Paso 2: Buscar perfil conocido
  let perfil: PerfilMunicipio | null = null;
  let fuentePerfil: 'conocido' | 'provincia' | 'muestra' | 'generico' = 'generico';
  let patronesSugeridos: PatronSeed[] = [];
  let formatoDecimal: FormatoDecimal = 'desconocido';
  let complejidad: NivelComplejidad = 'media';
  let requiereCorreccionP0 = false;
  let puntuacion = 50;

  if (codigoINE) {
    perfil = getPerfilMunicipio(codigoINE);
    
    if (perfil) {
      // Tenemos perfil conocido
      fuentePerfil = 'conocido';
      patronesSugeridos = getPatronesSugeridosPorMunicipio(codigoINE);
      formatoDecimal = perfil.formatoDecimalTipico;
      complejidad = perfil.nivelComplejidad;
      requiereCorreccionP0 = perfil.requiereCorreccionP0;
      puntuacion = 95;
      
      if (verbose) {
        console.log(`[QuickProfiler] Perfil conocido encontrado: ${perfil.nombre}`);
      }
    } else if (provincia) {
      // Inferir por provincia
      fuentePerfil = 'provincia';
      patronesSugeridos = sugerirPatronesPorProvincia(provincia);
      complejidad = calcularComplejidadEsperada(undefined, provincia);
      puntuacion = 70;
      
      // Almería suele tener más problemas de UTF-8
      if (provincia.toLowerCase().includes('almer')) {
        requiereCorreccionP0 = true;
      }
      
      if (verbose) {
        console.log(`[QuickProfiler] Inferido por provincia: ${provincia}`);
      }
    }
  }

  // Paso 3: Analizar muestra si está disponible y es necesario
  let muestraAnalizada = 0;
  
  if (muestraCoordenadas.length > 0 && (fuentePerfil === 'generico' || forzarAnalisisMuestra)) {
    const muestra = muestraCoordenadas.slice(0, maxMuestra);
    const analisis = analizarMuestraCoordenadas(muestra);
    
    muestraAnalizada = muestra.length;
    
    if (analisis.confianza > puntuacion) {
      fuentePerfil = 'muestra';
      formatoDecimal = analisis.formatoDecimal;
      complejidad = analisis.complejidad;
      puntuacion = analisis.confianza;
      
      // Convertir patrones detectados a PatronSeed
      patronesSugeridos = analisis.patronesDetectados
        .map(p => PATTERN_CATALOG[p.patronId])
        .filter((p): p is PatronSeed => p !== undefined);
    }
    
    if (verbose) {
      console.log(`[QuickProfiler] Muestra analizada: ${muestra.length} coordenadas`);
    }
  }

  // Paso 4: Si no hay patrones, usar genéricos
  if (patronesSugeridos.length === 0) {
    patronesSugeridos = getTodosPatronesOrdenados().slice(0, 3);
    fuentePerfil = 'generico';
    puntuacion = 40;
    
    if (verbose) {
      console.log('[QuickProfiler] Usando patrones genéricos');
    }
  }

  // Paso 5: Calcular fases optimizadas
  const { fasesOptimizadas, fasesOmitidas } = calcularFasesNecesarias(patronesSugeridos);

  // Paso 6: Determinar nivel de confianza
  let confianza: NivelConfianza = 'baja';
  if (puntuacion >= 80) confianza = 'alta';
  else if (puntuacion >= 60) confianza = 'media';

  const tiempoAnalisis = performance.now() - inicio;

  return {
    municipio,
    codigoINE,
    provincia,
    patronesSugeridos,
    patronPrincipal: patronesSugeridos[0] || null,
    formatoDecimalDetectado: formatoDecimal,
    complejidad,
    confianza,
    puntuacion,
    requiereCorreccionP0,
    fasesOptimizadas,
    fasesOmitidas,
    fuentePerfil,
    perfilConocido: perfil !== null,
    tiempoAnalisis,
    muestraAnalizada
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Analiza una muestra de coordenadas para detectar patrones
 */
function analizarMuestraCoordenadas(muestra: string[]): ResultadoAnalisisMuestra {
  const conteoPatrones: Record<string, number> = {};
  let comasDecimales = 0;
  let puntosDecimales = 0;
  let tieneEspacios = false;
  let tieneCorrupcion = false;

  for (const coord of muestra) {
    const trimmed = coord.trim();
    
    // Detectar formato decimal
    if (/,\d{1,3}$/.test(trimmed)) comasDecimales++;
    if (/\.\d{1,3}$/.test(trimmed)) puntosDecimales++;
    
    // Detectar espacios
    if (/\s+/.test(trimmed)) tieneEspacios = true;
    
    // Detectar corrupción UTF-8
    if (/[â€™°ºª~˜̃]/.test(trimmed)) tieneCorrupcion = true;
    
    // Intentar clasificar con patrones conocidos
    for (const [id, patron] of Object.entries(PATTERN_CATALOG)) {
      if (patron.regex.test(trimmed)) {
        conteoPatrones[id] = (conteoPatrones[id] || 0) + 1;
        break; // Solo contar el primer patrón que coincida
      }
    }
  }

  // Ordenar patrones por frecuencia
  const patronesDetectados = Object.entries(conteoPatrones)
    .map(([patronId, count]) => ({
      patronId,
      frecuencia: Math.round((count / muestra.length) * 100)
    }))
    .sort((a, b) => b.frecuencia - a.frecuencia);

  // Determinar formato decimal
  let formatoDecimal: FormatoDecimal = 'desconocido';
  if (comasDecimales > puntosDecimales * 2) {
    formatoDecimal = 'coma';
  } else if (puntosDecimales > comasDecimales * 2) {
    formatoDecimal = 'punto';
  } else if (comasDecimales > 0 && puntosDecimales > 0) {
    formatoDecimal = 'mixto';
  } else if (comasDecimales === 0 && puntosDecimales === 0) {
    formatoDecimal = 'ninguno';
  }

  // Determinar complejidad
  let complejidad: NivelComplejidad = 'baja';
  if (tieneCorrupcion) {
    complejidad = 'alta';
  } else if (tieneEspacios || formatoDecimal === 'mixto') {
    complejidad = 'media';
  }

  // Calcular confianza basada en consistencia
  const confianza = patronesDetectados.length > 0
    ? Math.min(95, patronesDetectados[0].frecuencia + 20)
    : 30;

  return {
    patronesDetectados,
    formatoDecimal,
    complejidad,
    confianza
  };
}

/**
 * Calcula las fases necesarias basándose en los patrones sugeridos
 */
function calcularFasesNecesarias(patrones: PatronSeed[]): {
  fasesOptimizadas: string[];
  fasesOmitidas: string[];
} {
  // Recopilar todas las fases requeridas por los patrones
  const fasesNecesarias = new Set<string>(FASES_OBLIGATORIAS);
  
  for (const patron of patrones) {
    const fasesPatron = PATRON_A_FASES[patron.id] || [];
    for (const fase of fasesPatron) {
      fasesNecesarias.add(fase);
    }
  }

  // Ordenar fases según el orden de ejecución
  const fasesOptimizadas = TODAS_LAS_FASES.filter(f => fasesNecesarias.has(f));
  const fasesOmitidas = TODAS_LAS_FASES.filter(f => !fasesNecesarias.has(f));

  return { fasesOptimizadas, fasesOmitidas };
}

// ============================================================================
// FUNCIONES DE UTILIDAD EXPORTADAS
// ============================================================================

/**
 * Verifica si un municipio tiene perfil conocido
 */
export function tienePerfilConocido(codigoINE: string): boolean {
  return codigoINE in MUNICIPIO_PROFILES;
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
 * Sugiere patrones para un municipio o provincia
 */
export function sugerirPatronesParaMunicipio(
  codigoINE?: string,
  provincia?: string
): PatronSeed[] {
  // Primero intentar con código INE
  if (codigoINE) {
    const patrones = getPatronesSugeridosPorMunicipio(codigoINE);
    if (patrones.length > 0) return patrones;
  }

  // Luego intentar con provincia
  if (provincia) {
    return sugerirPatronesPorProvincia(provincia);
  }

  // Por defecto, retornar los más frecuentes globalmente
  return getTodosPatronesOrdenados().slice(0, 3);
}

/**
 * Re-exportar tipos y funciones de seedPatterns para conveniencia
 */
export type { PatronSeed, PerfilMunicipio, NivelComplejidad, NivelConfianza, FormatoDecimal };
export { PATTERN_CATALOG, MUNICIPIO_PROFILES, ESTADISTICAS_GLOBALES } from './seedPatterns';
