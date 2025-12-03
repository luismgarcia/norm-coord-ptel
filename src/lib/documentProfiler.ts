/**
 * PTEL Document Profiler v1.0
 * 
 * Sistema de detección automática de perfil de documentos PTEL.
 * Analiza un documento completo para determinar:
 * - Patrones de coordenadas predominantes
 * - Formato decimal (coma/punto)
 * - Separador de miles
 * - Corrupción UTF-8
 * - Sistemas de coordenadas utilizados
 * 
 * Este análisis permite optimizar el procesamiento aplicando
 * las estrategias de normalización más apropiadas para cada documento.
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

import { 
  detectarPatron, 
  normalizarCoordenada, 
  esPlaceholder,
  type PatronDetectado,
  type ResultadoNormalizacion
} from './coordinateNormalizer';

import {
  type DocumentProfile,
  type PatronStats,
  saveDocumentProfile,
  getPatternsByMunicipio
} from './PatternLearningStore';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface AnalysisInput {
  filename: string;
  municipio: string;
  provincia: string;
  registros: RegistroCoordenas[];
}

export interface RegistroCoordenas {
  id?: string;
  xOriginal: string;
  yOriginal: string;
  nombre?: string;
  tipo?: string;
}

export interface ProfileAnalysisResult {
  profile: DocumentProfile;
  recomendaciones: ProfileRecommendation[];
  patronesAprendidos: string[];
  estadisticas: DetailedStats;
}

export interface ProfileRecommendation {
  tipo: 'info' | 'warning' | 'error';
  mensaje: string;
  accion?: string;
}

export interface DetailedStats {
  totalRegistros: number;
  registrosConX: number;
  registrosConY: number;
  registrosCompletos: number;
  registrosVacios: number;
  registrosPlaceholder: number;
  patronesDetectados: Map<PatronDetectado, number>;
  formatosDecimal: { coma: number; punto: number; ninguno: number };
  formatosMiles: { punto: number; espacio: number; ninguno: number };
  corrupcionUTF8: number;
  coordenadasDMS: number;
  coordenadasNMEA: number;
  coordenadasWKT: number;
  coordenadasGeoJSON: number;
  coordenadasConcatenadas: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

// Patrones que indican corrupción UTF-8
const UTF8_CORRUPTION_INDICATORS = [
  /Â[´º°±]/,      // Mojibake común
  /Ã[¡éíóúñ]/i,   // Caracteres mal codificados
  /â€[™œ]/,       // Comillas/apóstrofes mal codificados
  /Ã¼/,           // ü mal codificado
  /\ufffd/,       // Replacement character
];

// Patrones DMS
const DMS_PATTERNS: PatronDetectado[] = [
  'DMS_ESTANDAR', 'DMS_ESPACIOS', 'DMS_PREFIJO',
  'DMS_MINUTOS_DEC', 'DMS_ESPACIOS_EXTRA', 'DMS_SIGNO', 'DMS_DOS_PUNTOS'
];

// Patrones NMEA
const NMEA_PATTERNS: PatronDetectado[] = [
  'NMEA_ESTANDAR', 'NMEA_ENTERO', 'NMEA_SENTENCIA', 'NMEA_PAR'
];

// ============================================================================
// FUNCIÓN PRINCIPAL: ANALIZAR DOCUMENTO
// ============================================================================

/**
 * Analiza un documento PTEL completo y genera su perfil.
 * 
 * @param input - Datos del documento a analizar
 * @returns Resultado del análisis con perfil, recomendaciones y estadísticas
 */
export async function analizarDocumento(input: AnalysisInput): Promise<ProfileAnalysisResult> {
  const stats = inicializarEstadisticas();
  const recomendaciones: ProfileRecommendation[] = [];
  const patronesAprendidos: string[] = [];
  
  // Analizar cada registro
  for (const registro of input.registros) {
    analizarRegistro(registro, stats);
  }
  
  // Calcular totales
  stats.totalRegistros = input.registros.length;
  stats.registrosCompletos = calcularRegistrosCompletos(input.registros, stats);
  
  // Determinar formato predominante
  const formatoDecimal = determinarFormatoDecimal(stats);
  const formatoMiles = determinarFormatoMiles(stats);
  
  // Detectar características especiales
  const tieneCorrupcionUTF8 = stats.corrupcionUTF8 > 0;
  const tieneCoordenadasDMS = stats.coordenadasDMS > 0;
  const tieneCoordenadasNMEA = stats.coordenadasNMEA > 0;
  
  // Calcular porcentaje de éxito
  const porcentajeExito = stats.totalRegistros > 0 
    ? (stats.registrosCompletos / stats.totalRegistros) * 100 
    : 0;
  
  // Generar patrones predominantes
  const patronesPredominantes = generarPatronesStats(stats);
  
  // Determinar confianza del perfil
  const confianzaPerfil = determinarConfianzaPerfil(stats, porcentajeExito);
  
  // Generar recomendaciones
  generarRecomendaciones(stats, formatoDecimal, tieneCorrupcionUTF8, recomendaciones);
  
  // Crear perfil
  const profile: DocumentProfile = {
    id: generarIdDocumento(input.filename, input.municipio),
    filename: input.filename,
    municipio: input.municipio,
    provincia: input.provincia,
    fechaAnalisis: new Date().toISOString(),
    patronesPredominantes,
    formatoDecimal,
    formatoMiles,
    tieneCorrupcionUTF8,
    tieneCoordenadasDMS,
    tieneCoordenadasNMEA,
    porcentajeExito,
    totalRegistros: stats.totalRegistros,
    registrosConCoordenadas: stats.registrosCompletos,
    confianzaPerfil
  };
  
  // Guardar perfil en IndexedDB
  try {
    await saveDocumentProfile(profile);
  } catch (error) {
    console.warn('Error guardando perfil:', error);
  }
  
  // Intentar aprender patrones nuevos
  const patrones = await intentarAprenderPatrones(input, stats);
  patronesAprendidos.push(...patrones);
  
  return {
    profile,
    recomendaciones,
    patronesAprendidos,
    estadisticas: stats
  };
}

// ============================================================================
// FUNCIONES DE ANÁLISIS
// ============================================================================

/**
 * Inicializa las estadísticas vacías
 */
function inicializarEstadisticas(): DetailedStats {
  return {
    totalRegistros: 0,
    registrosConX: 0,
    registrosConY: 0,
    registrosCompletos: 0,
    registrosVacios: 0,
    registrosPlaceholder: 0,
    patronesDetectados: new Map(),
    formatosDecimal: { coma: 0, punto: 0, ninguno: 0 },
    formatosMiles: { punto: 0, espacio: 0, ninguno: 0 },
    corrupcionUTF8: 0,
    coordenadasDMS: 0,
    coordenadasNMEA: 0,
    coordenadasWKT: 0,
    coordenadasGeoJSON: 0,
    coordenadasConcatenadas: 0
  };
}

/**
 * Analiza un registro individual
 */
function analizarRegistro(registro: RegistroCoordenas, stats: DetailedStats): void {
  // Coerción defensiva a string (pueden llegar números, null, undefined)
  const xOriginal = registro.xOriginal != null ? String(registro.xOriginal) : '';
  const yOriginal = registro.yOriginal != null ? String(registro.yOriginal) : '';
  
  // Verificar si está vacío
  if (xOriginal.trim() === '' && yOriginal.trim() === '') {
    stats.registrosVacios++;
    return;
  }
  
  // Analizar X
  if (xOriginal.trim() !== '') {
    analizarCampo(xOriginal, stats, 'X');
    if (!esPlaceholder(xOriginal)) {
      stats.registrosConX++;
    }
  }
  
  // Analizar Y
  if (yOriginal.trim() !== '') {
    analizarCampo(yOriginal, stats, 'Y');
    if (!esPlaceholder(yOriginal)) {
      stats.registrosConY++;
    }
  }
}

/**
 * Analiza un campo de coordenada individual
 */
function analizarCampo(valor: string, stats: DetailedStats, campo: 'X' | 'Y'): void {
  // Coerción defensiva a string
  const v = (valor != null ? String(valor) : '').trim();
  
  // Detectar placeholder
  if (esPlaceholder(v)) {
    stats.registrosPlaceholder++;
    return;
  }
  
  // Detectar patrón
  const patron = detectarPatron(v);
  const countActual = stats.patronesDetectados.get(patron) || 0;
  stats.patronesDetectados.set(patron, countActual + 1);
  
  // Detectar corrupción UTF-8
  if (UTF8_CORRUPTION_INDICATORS.some(regex => regex.test(v))) {
    stats.corrupcionUTF8++;
  }
  
  // Detectar formato decimal
  if (/,\d+$/.test(v) && !/\.\d{3},/.test(v)) {
    stats.formatosDecimal.coma++;
  } else if (/\.\d+$/.test(v) && !/,\d{3}\./.test(v)) {
    stats.formatosDecimal.punto++;
  } else {
    stats.formatosDecimal.ninguno++;
  }
  
  // Detectar separador de miles
  if (/\d\.\d{3}[,\d]/.test(v)) {
    stats.formatosMiles.punto++;
  } else if (/\d\s\d{3}/.test(v)) {
    stats.formatosMiles.espacio++;
  } else {
    stats.formatosMiles.ninguno++;
  }
  
  // Detectar tipos especiales
  if (DMS_PATTERNS.includes(patron)) {
    stats.coordenadasDMS++;
  }
  if (NMEA_PATTERNS.includes(patron)) {
    stats.coordenadasNMEA++;
  }
  if (patron === 'WKT_POINT') {
    stats.coordenadasWKT++;
  }
  if (patron === 'GEOJSON_POINT') {
    stats.coordenadasGeoJSON++;
  }
  if (patron === 'CONCATENADO') {
    stats.coordenadasConcatenadas++;
  }
}

/**
 * Calcula registros completos (con X e Y válidos)
 */
function calcularRegistrosCompletos(
  registros: RegistroCoordenas[], 
  stats: DetailedStats
): number {
  let completos = 0;
  
  for (const registro of registros) {
    // Coerción defensiva a string
    const xStr = registro.xOriginal != null ? String(registro.xOriginal) : '';
    const yStr = registro.yOriginal != null ? String(registro.yOriginal) : '';
    
    const xValido = xStr.trim() !== '' && !esPlaceholder(xStr);
    const yValido = yStr.trim() !== '' && !esPlaceholder(yStr);
    
    // Caso especial: coordenadas concatenadas o WKT/GeoJSON
    if (xValido && !yValido) {
      const patron = detectarPatron(xStr);
      if (['CONCATENADO', 'WKT_POINT', 'GEOJSON_POINT'].includes(patron)) {
        completos++;
        continue;
      }
    }
    
    if (xValido && yValido) {
      completos++;
    }
  }
  
  return completos;
}

// ============================================================================
// FUNCIONES DE DETERMINACIÓN DE FORMATO
// ============================================================================

/**
 * Determina el formato decimal predominante
 */
function determinarFormatoDecimal(
  stats: DetailedStats
): 'coma' | 'punto' | 'mixto' {
  const { coma, punto } = stats.formatosDecimal;
  const total = coma + punto;
  
  if (total === 0) return 'punto'; // Default
  
  const porcentajeComa = (coma / total) * 100;
  const porcentajePunto = (punto / total) * 100;
  
  if (porcentajeComa > 80) return 'coma';
  if (porcentajePunto > 80) return 'punto';
  return 'mixto';
}

/**
 * Determina el formato de separador de miles predominante
 */
function determinarFormatoMiles(
  stats: DetailedStats
): 'punto' | 'espacio' | 'ninguno' {
  const { punto, espacio, ninguno } = stats.formatosMiles;
  const total = punto + espacio + ninguno;
  
  if (total === 0) return 'ninguno';
  
  const porcentajePunto = (punto / total) * 100;
  const porcentajeEspacio = (espacio / total) * 100;
  
  if (porcentajePunto > porcentajeEspacio && porcentajePunto > 20) return 'punto';
  if (porcentajeEspacio > porcentajePunto && porcentajeEspacio > 20) return 'espacio';
  return 'ninguno';
}

/**
 * Determina la confianza del perfil generado
 */
function determinarConfianzaPerfil(
  stats: DetailedStats,
  porcentajeExito: number
): 'alta' | 'media' | 'baja' {
  // Necesitamos suficientes muestras
  if (stats.totalRegistros < 5) return 'baja';
  
  // Verificar consistencia de patrones
  const patronesUnicos = stats.patronesDetectados.size;
  const totalPatrones = Array.from(stats.patronesDetectados.values())
    .reduce((a, b) => a + b, 0);
  
  // Si hay muchos patrones diferentes, menor confianza
  const ratioPatrones = patronesUnicos / Math.max(totalPatrones, 1);
  
  if (porcentajeExito > 80 && ratioPatrones < 0.2) return 'alta';
  if (porcentajeExito > 50 && ratioPatrones < 0.4) return 'media';
  return 'baja';
}

// ============================================================================
// GENERACIÓN DE ESTADÍSTICAS Y RECOMENDACIONES
// ============================================================================

/**
 * Genera estadísticas de patrones ordenadas por frecuencia
 */
function generarPatronesStats(stats: DetailedStats): PatronStats[] {
  const resultado: PatronStats[] = [];
  const total = Array.from(stats.patronesDetectados.values())
    .reduce((a, b) => a + b, 0);
  
  for (const [patron, frecuencia] of stats.patronesDetectados.entries()) {
    if (frecuencia > 0) {
      resultado.push({
        patron,
        frecuencia,
        porcentaje: total > 0 ? (frecuencia / total) * 100 : 0,
        exitoso: !['DESCONOCIDO', 'PLACEHOLDER'].includes(patron)
      });
    }
  }
  
  // Ordenar por frecuencia descendente
  resultado.sort((a, b) => b.frecuencia - a.frecuencia);
  
  return resultado.slice(0, 10); // Top 10
}

/**
 * Genera recomendaciones basadas en el análisis
 */
function generarRecomendaciones(
  stats: DetailedStats,
  formatoDecimal: 'coma' | 'punto' | 'mixto',
  tieneCorrupcionUTF8: boolean,
  recomendaciones: ProfileRecommendation[]
): void {
  // Recomendación por corrupción UTF-8
  if (tieneCorrupcionUTF8) {
    recomendaciones.push({
      tipo: 'warning',
      mensaje: `Detectada corrupción UTF-8 en ${stats.corrupcionUTF8} coordenadas`,
      accion: 'El normalizador aplicará corrección automática de mojibake'
    });
  }
  
  // Recomendación por formato mixto
  if (formatoDecimal === 'mixto') {
    recomendaciones.push({
      tipo: 'warning',
      mensaje: 'Documento con formatos decimales mixtos (coma y punto)',
      accion: 'Revisar coordenadas manualmente si hay errores'
    });
  }
  
  // Recomendación por coordenadas DMS
  if (stats.coordenadasDMS > 0) {
    recomendaciones.push({
      tipo: 'info',
      mensaje: `${stats.coordenadasDMS} coordenadas en formato DMS (grados sexagesimales)`,
      accion: 'Se convertirán automáticamente a UTM30'
    });
  }
  
  // Recomendación por coordenadas NMEA
  if (stats.coordenadasNMEA > 0) {
    recomendaciones.push({
      tipo: 'info',
      mensaje: `${stats.coordenadasNMEA} coordenadas en formato NMEA GPS`,
      accion: 'Se convertirán automáticamente a grados decimales'
    });
  }
  
  // Recomendación por coordenadas concatenadas
  if (stats.coordenadasConcatenadas > 0) {
    recomendaciones.push({
      tipo: 'warning',
      mensaje: `${stats.coordenadasConcatenadas} coordenadas concatenadas detectadas`,
      accion: 'Se separarán automáticamente X e Y'
    });
  }
  
  // Recomendación por bajo porcentaje de éxito
  const porcentajeConCoordenadas = stats.totalRegistros > 0
    ? ((stats.registrosConX + stats.registrosConY) / (stats.totalRegistros * 2)) * 100
    : 0;
  
  if (porcentajeConCoordenadas < 50) {
    recomendaciones.push({
      tipo: 'error',
      mensaje: `Solo ${porcentajeConCoordenadas.toFixed(1)}% de campos tienen coordenadas`,
      accion: 'Considerar geocodificación por dirección o nombre'
    });
  }
  
  // Recomendación por muchos placeholders
  if (stats.registrosPlaceholder > stats.totalRegistros * 0.3) {
    recomendaciones.push({
      tipo: 'warning',
      mensaje: `${stats.registrosPlaceholder} registros con valores placeholder`,
      accion: 'Estos registros necesitarán geocodificación'
    });
  }
}

// ============================================================================
// APRENDIZAJE DE PATRONES
// ============================================================================

/**
 * Intenta aprender nuevos patrones del documento
 */
async function intentarAprenderPatrones(
  input: AnalysisInput,
  stats: DetailedStats
): Promise<string[]> {
  const aprendidos: string[] = [];
  
  // Solo aprender si hay suficientes muestras
  if (stats.totalRegistros < 10) return aprendidos;
  
  // Buscar patrones desconocidos frecuentes
  const desconocidos = stats.patronesDetectados.get('DESCONOCIDO') || 0;
  
  if (desconocidos > stats.totalRegistros * 0.1) {
    // Hay >10% de patrones desconocidos, analizar muestras
    const muestrasDesconocidas = input.registros
      .filter(r => {
        const patronX = detectarPatron(r.xOriginal);
        const patronY = detectarPatron(r.yOriginal);
        return patronX === 'DESCONOCIDO' || patronY === 'DESCONOCIDO';
      })
      .slice(0, 5); // Analizar hasta 5 muestras
    
    if (muestrasDesconocidas.length > 0) {
      // Log para análisis posterior
      console.log('🔍 Patrones desconocidos encontrados en', input.municipio);
      muestrasDesconocidas.forEach(m => {
        console.log(`  X: "${m.xOriginal}" | Y: "${m.yOriginal}"`);
      });
      
      aprendidos.push(`${desconocidos} patrones desconocidos detectados en ${input.municipio}`);
    }
  }
  
  return aprendidos;
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Genera un ID único para el documento
 */
function generarIdDocumento(filename: string, municipio: string): string {
  const timestamp = Date.now().toString(36);
  const hash = simpleHash(filename + municipio);
  return `doc_${timestamp}_${hash}`;
}

/**
 * Hash simple para generar IDs
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

// ============================================================================
// FUNCIÓN DE ANÁLISIS RÁPIDO (SIN GUARDAR)
// ============================================================================

/**
 * Analiza un documento sin guardar el perfil
 * Útil para vista previa o análisis temporal
 */
export function analizarDocumentoRapido(input: AnalysisInput): {
  formatoDetectado: string;
  patronPredominante: PatronDetectado;
  porcentajeCompletitud: number;
  tieneProblemas: boolean;
} {
  const stats = inicializarEstadisticas();
  
  for (const registro of input.registros) {
    analizarRegistro(registro, stats);
  }
  
  stats.totalRegistros = input.registros.length;
  
  // Encontrar patrón predominante
  let patronPredominante: PatronDetectado = 'DESCONOCIDO';
  let maxFrecuencia = 0;
  
  for (const [patron, frecuencia] of stats.patronesDetectados.entries()) {
    if (frecuencia > maxFrecuencia && patron !== 'PLACEHOLDER') {
      maxFrecuencia = frecuencia;
      patronPredominante = patron;
    }
  }
  
  // Calcular completitud
  const registrosConDatos = stats.totalRegistros - stats.registrosVacios - stats.registrosPlaceholder;
  const porcentajeCompletitud = stats.totalRegistros > 0 
    ? (registrosConDatos / stats.totalRegistros) * 100 
    : 0;
  
  // Detectar problemas
  const tieneProblemas = 
    stats.corrupcionUTF8 > 0 ||
    (stats.patronesDetectados.get('DESCONOCIDO') || 0) > stats.totalRegistros * 0.2 ||
    porcentajeCompletitud < 30;
  
  // Determinar formato
  const formatoDecimal = determinarFormatoDecimal(stats);
  const formatoMiles = determinarFormatoMiles(stats);
  const formatoDetectado = `${formatoDecimal === 'coma' ? 'Europeo' : 'Internacional'}, ` +
                          `miles con ${formatoMiles}`;
  
  return {
    formatoDetectado,
    patronPredominante,
    porcentajeCompletitud,
    tieneProblemas
  };
}

// ============================================================================
// FUNCIÓN DE SUGERENCIA DE ESTRATEGIA
// ============================================================================

/**
 * Sugiere la mejor estrategia de normalización basada en el perfil
 */
export function sugerirEstrategia(profile: DocumentProfile): {
  estrategia: string;
  prioridades: string[];
  advertencias: string[];
} {
  const prioridades: string[] = [];
  const advertencias: string[] = [];
  let estrategia = 'ESTANDAR';
  
  // Analizar perfil
  if (profile.tieneCorrupcionUTF8) {
    prioridades.push('Aplicar corrección UTF-8/Mojibake primero');
    estrategia = 'DEFENSIVA';
  }
  
  if (profile.formatoDecimal === 'coma') {
    prioridades.push('Usar parser europeo (coma decimal)');
  }
  
  if (profile.formatoDecimal === 'mixto') {
    advertencias.push('Formato mixto: verificar resultados manualmente');
    estrategia = 'DEFENSIVA';
  }
  
  if (profile.tieneCoordenadasDMS) {
    prioridades.push('Convertir DMS a decimales antes de UTM');
  }
  
  if (profile.tieneCoordenadasNMEA) {
    prioridades.push('Convertir NMEA GPS a decimales');
  }
  
  if (profile.porcentajeExito < 50) {
    advertencias.push('Bajo % de coordenadas: preparar geocodificación');
    prioridades.push('Activar geocodificación por dirección');
    estrategia = 'GEOCODIFICACION_INTENSIVA';
  }
  
  if (profile.confianzaPerfil === 'baja') {
    advertencias.push('Perfil de baja confianza: revisar muestra manual');
  }
  
  return { estrategia, prioridades, advertencias };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  analizarDocumento,
  analizarDocumentoRapido,
  sugerirEstrategia
};
