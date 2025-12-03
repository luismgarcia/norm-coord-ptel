/**
 * PTEL Andalucía - Normalizador de Coordenadas v2.4
 * 
 * Implementa la taxonomía completa de 52 patrones de coordenadas
 * identificados en documentos municipales andaluces.
 * 
 * Sistema objetivo: EPSG:25830 (UTM Zona 30N, ETRS89)
 * 
 * CHANGELOG v2.4 (01-Dic-2025):
 * - NEW: Parser NMEA GPS - 4 formatos D1-D4
 * - NEW: parseNMEA() - convierte NMEA a grados decimales
 * - NEW: parseNMEASentence() - extrae coords de $GPGGA, $GPRMC, $GPGLL
 * - NEW: parseParNMEA() - procesa pares NMEA lat/lon
 * - NEW: esNMEA() - detecta si un string es formato NMEA
 * - NEW: Fase 0.8 en pipeline de normalización
 * - NEW: Tipos NMEA_ESTANDAR, NMEA_ENTERO, NMEA_SENTENCIA, NMEA_PAR
 * - NEW: Interfaz ResultadoNMEA con metadata de conversión
 * - TEST: Casos adicionales para formatos NMEA GPS
 * 
 * CHANGELOG v2.3 (30-Nov-2025):
 * - NEW: Parser DMS (Grados Sexagesimales) - 8 formatos C1-C8
 * - NEW: parseDMS() - convierte DMS a grados decimales
 * - NEW: esDMS() - detecta si un string es formato DMS
 * - NEW: Fase 0.7 en pipeline de normalización
 * - NEW: Tipos DMS_ESTANDAR, DMS_ESPACIOS, DMS_PREFIJO, etc.
 * - NEW: Interfaz ResultadoDMS con metadata de conversión
 * - TEST: 26 casos adicionales para formatos DMS
 * 
 * CHANGELOG v2.2 (30-Nov-2025):
 * - NEW: Parser WKT POINT - detecta POINT(X Y) desde QGIS/PostGIS
 * - NEW: Parser GeoJSON Point - detecta {"type":"Point","coordinates":[X,Y]}
 * - NEW: Integración en pipeline normalización (Fase 0.6)
 * - NEW: Manejo en procesarParCoordenadas() para campos WKT/GeoJSON
 * - TEST: 5 casos adicionales para formatos espaciales
 * 
 * CHANGELOG v2.1 (30-Nov-2025):
 * - NEW: Detección de coordenadas concatenadas (X+Y fusionadas)
 * - NEW: Separación automática usando validación de rangos UTM
 * - NEW: Integración en procesarParCoordenadas()
 * - TEST: Casos adicionales para coordenadas concatenadas
 * 
 * @version 2.3.0
 * @date Noviembre 2025
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type TipoCoordenda = 'X' | 'Y' | 'GEOGRAFICA_LAT' | 'GEOGRAFICA_LON' | 'DESCONOCIDO';
export type NivelConfianza = 'ALTA' | 'MEDIA' | 'BAJA' | 'CRITICA';
export type PatronDetectado = 
  | 'LIMPIO'
  | 'COMA_DECIMAL'
  | 'EUROPEO_COMPLETO'
  | 'PUNTO_MILES'
  | 'ESPACIO_DOBLE_TILDE'
  | 'ESPACIO_SIN_DECIMAL'
  | 'ESPACIO_DECIMAL_IMPLICITO'
  | 'TILDE_SIMPLE'
  | 'MOJIBAKE'
  | 'COMILLAS_TIPOGRAFICAS'
  | 'PLACEHOLDER'
  | 'CONCATENADO'
  | 'WKT_POINT'
  | 'GEOJSON_POINT'
  | 'DMS_ESTANDAR'      // C1: 37°26'46.5"N
  | 'DMS_ESPACIOS'      // C3: 37 26 46.5 N
  | 'DMS_PREFIJO'       // C4: N37°26'46.5"
  | 'DMS_MINUTOS_DEC'   // C5: 37°26.775'N
  | 'DMS_ESPACIOS_EXTRA'// C6: 37° 26' 46.5" N
  | 'DMS_SIGNO'         // C7: +37°26'46.5"
  | 'DMS_DOS_PUNTOS'    // C8: 37:26:46.5 N
  | 'NMEA_ESTANDAR'     // D1: 3726.775N (ddmm.mmmm)
  | 'NMEA_ENTERO'       // D2: 3726N (sin decimales)
  | 'NMEA_SENTENCIA'    // D3: $GPGGA,... $GPRMC,... $GPGLL,...
  | 'NMEA_PAR'          // D4: Par lat/lon NMEA
  | 'DESCONOCIDO';

export interface ResultadoNormalizacion {
  valorOriginal: string;
  valorNormalizado: number | null;
  exito: boolean;
  patronDetectado: PatronDetectado;
  fasesAplicadas: string[];
  warnings: string[];
  errores: string[];
}

export interface ResultadoValidacion {
  valido: boolean;
  tipo: TipoCoordenda;
  confianza: NivelConfianza;
  warnings: string[];
  correccionAplicada?: string;
  valorCorregido?: number;
}

export interface ResultadoConcatenacion {
  esConcatenado: boolean;
  valorX: number | null;
  valorY: number | null;
  confianza: NivelConfianza;
  warning: string | null;
}

export interface ResultadoFormatoEspacial {
  esEspacial: boolean;
  valorX: number | null;
  valorY: number | null;
  formato: 'WKT_POINT' | 'GEOJSON_POINT' | null;
  warning: string | null;
}

export interface ResultadoDMS {
  esValido: boolean;
  valorDecimal: number | null;
  grados: number | null;
  minutos: number | null;
  segundos: number | null;
  direccion: string | null;      // N, S, E, W
  esLatitud: boolean | null;     // true = lat, false = lon, null = desconocido
  formatoDetectado: PatronDetectado | null;
  warning: string | null;
}

/**
 * Resultado del parseo de coordenadas NMEA GPS (D1-D4)
 */
export interface ResultadoNMEA {
  esValido: boolean;
  valorDecimal: number | null;
  hemisferio: 'N' | 'S' | 'E' | 'W' | null;
  esLatitud: boolean | null;     // true = lat, false = lon, null = desconocido
  formatoDetectado: PatronDetectado | null;
  tipoSentencia: string | null;  // GGA, RMC, GLL para sentencias NMEA
  warning: string | null;
}

/**
 * Resultado del parseo de un par de coordenadas NMEA
 */
export interface ResultadoParNMEA {
  latitud: number | null;
  longitud: number | null;
  exito: boolean;
  patrones: PatronDetectado[];
  tipoSentencia: string | null;
}

export interface ParCoordenadas {
  x: number | null;
  y: number | null;
  xOriginal: string;
  yOriginal: string;
  normalizacionX: ResultadoNormalizacion;
  normalizacionY: ResultadoNormalizacion;
  validacionX: ResultadoValidacion | null;
  validacionY: ResultadoValidacion | null;
  intercambioAplicado: boolean;
  concatenacionDetectada: boolean;
  confianzaGlobal: NivelConfianza;
  epsg: number;
}

// ============================================================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================================================

/**
 * Rangos válidos para coordenadas UTM en Andalucía (EPSG:25830)
 */
export const RANGOS_ANDALUCIA = {
  UTM: {
    X_MIN: 100000,
    X_MAX: 620000,
    Y_MIN: 3980000,
    Y_MAX: 4290000,
  },
  GEOGRAFICAS: {
    LAT_MIN: 36.0,
    LAT_MAX: 38.75,
    LON_MIN: -7.55,
    LON_MAX: -1.60,
  },
  // Rangos para detectar Y truncada (sin el "4" inicial)
  Y_TRUNCADA: {
    MIN: 40000,
    MAX: 300000,
  },
} as const;

/**
 * Placeholders textuales que indican ausencia de datos
 */
const PLACEHOLDERS_TEXTO = new Set([
  'indicar',
  'pendiente',
  'sin datos',
  'sin data',
  'n/a',
  'na',
  'n.a.',
  'n.d.',
  'nd',
  'por definir',
  'desconocido',
  'ninguno',
  'xxx',
  'tbd',
  'todo',
  'ver plano',
  'consultar',
  'a determinar',
  'sin información',
  'sin informacion',
  'no especificada',
  'no especificado',
  'inexistente',
  'inexistentes',
  '-',
  '--',
  '---',
]);

/**
 * Placeholders numéricos que indican ausencia de datos
 */
const PLACEHOLDERS_NUMERICOS = new Set([
  0,
  1,
  -1,
  99999,
  999999,
  9999999,
  -9999,
  -99999,
  -999999,
  12345,
  123456,
]);

// ============================================================================
// FUNCIONES DE DETECCIÓN DE PATRONES
// ============================================================================

/**
 * Detecta si el valor es un placeholder (texto o numérico)
 */
export function esPlaceholder(valor: string): boolean {
  // Coerción defensiva a string
  const valorStr = valor != null ? String(valor) : '';
  const valorLimpio = valorStr.trim().toLowerCase();
  
  // Placeholder texto
  if (PLACEHOLDERS_TEXTO.has(valorLimpio)) {
    return true;
  }
  
  // Vacío
  if (valorLimpio === '' || valorLimpio === 'null' || valorLimpio === 'undefined') {
    return true;
  }
  
  // Placeholder numérico
  const numero = parseFloat(valorLimpio);
  if (!isNaN(numero) && PLACEHOLDERS_NUMERICOS.has(numero)) {
    return true;
  }
  
  return false;
}

/**
 * Detecta el patrón de formato de la coordenada
 */
export function detectarPatron(valor: string): PatronDetectado {
  // Coerción defensiva a string
  const valorStr = valor != null ? String(valor) : '';
  const v = valorStr.trim();
  
  if (esPlaceholder(v)) {
    return 'PLACEHOLDER';
  }
  
  // G2: WKT POINT format
  if (/^\s*POINT\s*\(/i.test(v)) {
    return 'WKT_POINT';
  }
  
  // G3: GeoJSON Point format
  if (v.startsWith('{') && v.includes('"type"') && v.includes('"Point"')) {
    return 'GEOJSON_POINT';
  }
  
  // C1-C8: Formatos DMS (Grados Sexagesimales)
  // Detectar antes de otros patrones porque contienen símbolos especiales
  
  // C7: Signo explícito: +37°26'46.5" o -3°45'12.3"
  if (/^[+-]\d+[°º]/.test(v)) {
    return 'DMS_SIGNO';
  }
  
  // C4: Prefijo cardinal: N37°26'46.5" o W3°45'12.3"
  if (/^[NSEWO]\s*\d+[°º]/i.test(v)) {
    return 'DMS_PREFIJO';
  }
  
  // C8: Dos puntos: 37:26:46.5 N o 37:26:46.5N
  if (/^\d+:\d+:\d+\.?\d*\s*[NSEWO]?$/i.test(v)) {
    return 'DMS_DOS_PUNTOS';
  }
  
  // C5: Minutos decimales: 37°26.775'N (sin segundos)
  if (/^\d+\s*[°º]\s*\d+\.?\d*\s*['′]\s*[NSEWO]?$/i.test(v)) {
    return 'DMS_MINUTOS_DEC';
  }
  
  // C1/C6: Estándar ISO: 37°26'46.5"N o 37° 26' 46.5" N
  if (/^\d+\s*[°º]\s*\d+\s*['′]\s*\d+\.?\d*\s*["″]?\s*[NSEWO]?$/i.test(v)) {
    // C6 tiene más espacios
    const espacios = (v.match(/\s/g) || []).length;
    return espacios > 2 ? 'DMS_ESPACIOS_EXTRA' : 'DMS_ESTANDAR';
  }
  
  // C3: Espacios como separadores: 37 26 46.5 N
  if (/^\d+\s+\d+\s+\d+\.?\d*\s*[NSEWO]$/i.test(v)) {
    return 'DMS_ESPACIOS';
  }
  
  // D1-D4: Formatos NMEA GPS
  // D3: Sentencia NMEA completa ($GPGGA, $GPRMC, $GPGLL)
  if (/^\$G[PN](GGA|RMC|GLL)/i.test(v)) {
    return 'NMEA_SENTENCIA';
  }
  
  // D1: NMEA estándar con decimales: 3726.775N o 00345.204W
  if (/^\d{4,5}\.\d+\s*,?\s*[NSEWO]$/i.test(v)) {
    return 'NMEA_ESTANDAR';
  }
  
  // D2: NMEA entero sin decimales: 3726N
  if (/^\d{4,5}\s*[NSEWO]$/i.test(v)) {
    return 'NMEA_ENTERO';
  }
  
  // D4: Par NMEA: 3726.775N, 00345.204W o similar
  if (/\d{4,5}\.?\d*\s*,?\s*[NS]\s*[,\/\s]+\s*\d{4,5}\.?\d*\s*,?\s*[EWO]/i.test(v)) {
    return 'NMEA_PAR';
  }
  
  // Detectar coordenadas concatenadas (12+ dígitos sin separadores)
  const soloDigitos = v.replace(/[^\d]/g, '');
  if (soloDigitos.length >= 12 && /^\d+$/.test(v)) {
    return 'CONCATENADO';
  }
  
  // P2-1: Mojibake (Â´, Âº)
  if (/Â[´º]/.test(v)) {
    return 'MOJIBAKE';
  }
  
  // P1-1: Espacio + Doble tilde: "504 750´´92"
  if (/^\d{1,3}\s+\d{3}´´\d{1,2}$/.test(v) || /^\d\s+\d{3}\s+\d{3}´´\d{1,2}$/.test(v)) {
    return 'ESPACIO_DOBLE_TILDE';
  }
  
  // P1-3: Espacio + decimales implícitos: "506 527 28"
  if (/^\d{3}\s+\d{3}\s+\d{1,2}$/.test(v) || /^\d\s+\d{3}\s+\d{3}\s+\d{1,2}$/.test(v)) {
    return 'ESPACIO_DECIMAL_IMPLICITO';
  }
  
  // P1-2: Espacio separador sin decimal: "504 489" o "4 076 367"
  if (/^\d{1,3}(\s+\d{3})+$/.test(v)) {
    return 'ESPACIO_SIN_DECIMAL';
  }
  
  // P1-4: Tilde simple como decimal: "503693´77"
  if (/^\d+´\d+$/.test(v)) {
    return 'TILDE_SIMPLE';
  }
  
  // P2-3/P2-4: Comillas tipográficas o apóstrofe
  if (/['']/.test(v) && /\d+['\']d+/.test(v)) {
    return 'COMILLAS_TIPOGRAFICAS';
  }
  
  // P1-5: Formato europeo completo: "4.077.905,68"
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(v)) {
    return 'EUROPEO_COMPLETO';
  }
  
  // P1-6: Solo coma decimal: "436780,0"
  if (/^\d+,\d+$/.test(v)) {
    return 'COMA_DECIMAL';
  }
  
  // P1-7: Solo punto miles sin decimal: "4.230.105"
  if (/^\d{1,3}(?:\.\d{3})+$/.test(v)) {
    return 'PUNTO_MILES';
  }
  
  // Formato limpio: "521581.88" o "504750"
  if (/^-?\d+\.?\d*$/.test(v)) {
    return 'LIMPIO';
  }
  
  return 'DESCONOCIDO';
}

// ============================================================================
// FUNCIÓN: SEPARAR COORDENADAS CONCATENADAS
// ============================================================================

/**
 * Detecta y separa coordenadas X+Y concatenadas en un solo valor.
 */
export function separarCoordenadasConcatenadas(valor: string): ResultadoConcatenacion {
  const resultado: ResultadoConcatenacion = {
    esConcatenado: false,
    valorX: null,
    valorY: null,
    confianza: 'BAJA',
    warning: null,
  };
  
  const soloDigitos = valor.replace(/[^\d]/g, '');
  
  if (soloDigitos.length < 12) {
    return resultado;
  }
  
  const mid = Math.floor(soloDigitos.length / 2);
  const puntosCorte = [mid, mid - 1, mid + 1, mid - 2, mid + 2];
  
  for (const corte of puntosCorte) {
    if (corte < 5 || corte > soloDigitos.length - 6) continue;
    
    const parte1 = parseInt(soloDigitos.substring(0, corte), 10);
    const parte2 = parseInt(soloDigitos.substring(corte), 10);
    
    const parte1EsX = parte1 >= RANGOS_ANDALUCIA.UTM.X_MIN && parte1 <= RANGOS_ANDALUCIA.UTM.X_MAX;
    const parte1EsY = parte1 >= RANGOS_ANDALUCIA.UTM.Y_MIN && parte1 <= RANGOS_ANDALUCIA.UTM.Y_MAX;
    const parte2EsX = parte2 >= RANGOS_ANDALUCIA.UTM.X_MIN && parte2 <= RANGOS_ANDALUCIA.UTM.X_MAX;
    const parte2EsY = parte2 >= RANGOS_ANDALUCIA.UTM.Y_MIN && parte2 <= RANGOS_ANDALUCIA.UTM.Y_MAX;
    
    if (parte1EsX && parte2EsY) {
      resultado.esConcatenado = true;
      resultado.valorX = parte1;
      resultado.valorY = parte2;
      resultado.confianza = 'ALTA';
      resultado.warning = `Coordenadas concatenadas separadas: ${valor} → X=${parte1}, Y=${parte2}`;
      return resultado;
    }
    
    if (parte1EsY && parte2EsX) {
      resultado.esConcatenado = true;
      resultado.valorX = parte2;
      resultado.valorY = parte1;
      resultado.confianza = 'MEDIA';
      resultado.warning = `Coordenadas concatenadas (orden invertido): ${valor} → X=${parte2}, Y=${parte1}`;
      return resultado;
    }
    
    if ((parte1EsX && parte2EsX) || (parte1EsY && parte2EsY)) {
      resultado.esConcatenado = true;
      resultado.valorX = parte1EsX ? parte1 : parte2;
      resultado.valorY = parte1EsY ? parte1 : parte2;
      resultado.confianza = 'BAJA';
      resultado.warning = `Coordenadas concatenadas (tipo ambiguo): ${valor} → ${parte1}, ${parte2}`;
      return resultado;
    }
  }
  
  return resultado;
}

// ============================================================================
// FUNCIONES: PARSERS WKT Y GEOJSON (G2-G3)
// ============================================================================

export function parseWKT(valor: string): { x: number; y: number } | null {
  const wktRegex = /^\s*POINT\s*\(\s*(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)\s*\)\s*$/i;
  const match = valor.match(wktRegex);
  
  if (match) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    if (!isNaN(x) && !isNaN(y)) {
      return { x, y };
    }
  }
  return null;
}

export function parseGeoJSON(valor: string): { x: number; y: number } | null {
  try {
    const jsonStr = valor.trim();
    if (!jsonStr.startsWith('{') || !jsonStr.endsWith('}')) {
      return null;
    }
    const obj = JSON.parse(jsonStr);
    if (obj.type?.toLowerCase() === 'point' && 
        Array.isArray(obj.coordinates) && 
        obj.coordinates.length >= 2) {
      const x = parseFloat(obj.coordinates[0]);
      const y = parseFloat(obj.coordinates[1]);
      if (!isNaN(x) && !isNaN(y)) {
        return { x, y };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function detectarFormatoEspacial(valor: string): ResultadoFormatoEspacial {
  const resultado: ResultadoFormatoEspacial = {
    esEspacial: false,
    valorX: null,
    valorY: null,
    formato: null,
    warning: null,
  };
  
  if (typeof valor !== 'string') return resultado;
  
  const v = valor.trim();
  
  const wkt = parseWKT(v);
  if (wkt) {
    resultado.esEspacial = true;
    resultado.valorX = wkt.x;
    resultado.valorY = wkt.y;
    resultado.formato = 'WKT_POINT';
    resultado.warning = `WKT POINT detectado: ${v} → X=${wkt.x}, Y=${wkt.y}`;
    return resultado;
  }
  
  const geojson = parseGeoJSON(v);
  if (geojson) {
    resultado.esEspacial = true;
    resultado.valorX = geojson.x;
    resultado.valorY = geojson.y;
    resultado.formato = 'GEOJSON_POINT';
    resultado.warning = `GeoJSON Point detectado → X=${geojson.x}, Y=${geojson.y}`;
    return resultado;
  }
  
  return resultado;
}

// ============================================================================
// FUNCIONES DMS (GRADOS SEXAGESIMALES) - C1-C8
// ============================================================================

function normalizarSimboloGrados(str: string): string {
  return str
    .replace(/[º˚⁰]/g, '°')
    .replace(/[´`'']/g, "'")
    .replace(/["„‟]/g, '"');
}

function dmsADecimal(grados: number, minutos: number, segundos: number, esNegativo: boolean): number {
  const decimal = Math.abs(grados) + (minutos / 60) + (segundos / 3600);
  return esNegativo ? -decimal : decimal;
}

function direccionEsNegativa(direccion: string | null, signo: string | null): boolean {
  if (signo === '-') return true;
  if (!direccion) return false;
  const dir = direccion.toUpperCase();
  return dir === 'W' || dir === 'O' || dir === 'S';
}

function direccionEsLatitud(direccion: string | null): boolean | null {
  if (!direccion) return null;
  const dir = direccion.toUpperCase();
  if (dir === 'N' || dir === 'S') return true;
  if (dir === 'E' || dir === 'W' || dir === 'O') return false;
  return null;
}

/**
 * Parser principal DMS - detecta y convierte formatos C1-C8
 * 
 * Formatos soportados:
 * - C1: 37°26'46.5"N (estándar ISO)
 * - C2: 37º26'46,5"N (español con º y coma)
 * - C3: 37 26 46.5 N (espacios como separadores)
 * - C4: N37°26'46.5" (prefijo cardinal)
 * - C5: 37°26.775'N (minutos decimales)
 * - C6: 37° 26' 46.5" N (espacios extra)
 * - C7: +37°26'46.5" (signo explícito)
 * - C8: 37:26:46.5 N (dos puntos)
 */
export function parseDMS(valor: string): ResultadoDMS {
  const resultado: ResultadoDMS = {
    esValido: false,
    valorDecimal: null,
    grados: null,
    minutos: null,
    segundos: null,
    direccion: null,
    esLatitud: null,
    formatoDetectado: null,
    warning: null
  };
  
  if (!valor || typeof valor !== 'string') {
    return resultado;
  }
  
  let v = valor.trim();
  v = normalizarSimboloGrados(v);
  v = v.replace(/,/g, '.');
  
  let signoExplicito: string | null = null;
  if (v.startsWith('+') || v.startsWith('-')) {
    signoExplicito = v[0];
    v = v.substring(1).trim();
  }
  
  let direccionPrefijo: string | null = null;
  const matchPrefijo = v.match(/^([NSEW]|[NSEOnseo])\s*/i);
  if (matchPrefijo) {
    direccionPrefijo = matchPrefijo[1].toUpperCase();
    if (direccionPrefijo === 'O') direccionPrefijo = 'W';
    v = v.substring(matchPrefijo[0].length);
  }
  
  const regexC1C6 = /^(\d+)\s*°\s*(\d+)\s*['′]\s*(\d+\.?\d*)\s*["″]?\s*([NSEWO])?$/i;
  const regexC3 = /^(\d+)\s+(\d+)\s+(\d+\.?\d*)\s*([NSEWO])?$/i;
  const regexC5 = /^(\d+)\s*°\s*(\d+\.?\d*)\s*['′]\s*([NSEWO])?$/i;
  const regexC8 = /^(\d+):(\d+):(\d+\.?\d*)\s*([NSEWO])?$/i;
  const regexC8b = /^(\d+):(\d+):(\d+\.?\d*)([NSEWO])$/i;
  
  let match: RegExpMatchArray | null = null;
  let grados: number = 0, minutos: number = 0, segundos: number = 0;
  let direccion: string | null = direccionPrefijo;
  let formatoBase: PatronDetectado = 'DESCONOCIDO';
  
  match = v.match(regexC1C6);
  if (match) {
    grados = parseFloat(match[1]);
    minutos = parseFloat(match[2]);
    segundos = parseFloat(match[3]);
    direccion = direccion || (match[4] ? match[4].toUpperCase() : null);
    formatoBase = (v.match(/\s/g) || []).length > 2 ? 'DMS_ESPACIOS_EXTRA' : 'DMS_ESTANDAR';
  }
  
  if (!match) {
    match = v.match(regexC3);
    if (match) {
      grados = parseFloat(match[1]);
      minutos = parseFloat(match[2]);
      segundos = parseFloat(match[3]);
      direccion = direccion || (match[4] ? match[4].toUpperCase() : null);
      formatoBase = 'DMS_ESPACIOS';
    }
  }
  
  if (!match) {
    match = v.match(regexC5);
    if (match) {
      grados = parseFloat(match[1]);
      minutos = parseFloat(match[2]);
      segundos = 0;
      direccion = direccion || (match[3] ? match[3].toUpperCase() : null);
      formatoBase = 'DMS_MINUTOS_DEC';
    }
  }
  
  if (!match) {
    match = v.match(regexC8) || v.match(regexC8b);
    if (match) {
      grados = parseFloat(match[1]);
      minutos = parseFloat(match[2]);
      segundos = parseFloat(match[3]);
      direccion = direccion || (match[4] ? match[4].toUpperCase() : null);
      formatoBase = 'DMS_DOS_PUNTOS';
    }
  }
  
  if (!match) {
    return resultado;
  }
  
  if (direccionPrefijo) {
    formatoBase = 'DMS_PREFIJO';
  }
  
  if (signoExplicito) {
    formatoBase = 'DMS_SIGNO';
  }
  
  if (direccion === 'O') direccion = 'W';
  
  if (grados > 180 || minutos >= 60 || segundos >= 60) {
    resultado.warning = `Valores fuera de rango: ${grados}° ${minutos}' ${segundos}"`;
    return resultado;
  }
  
  const esNeg = direccionEsNegativa(direccion, signoExplicito);
  const decimal = dmsADecimal(grados, minutos, segundos, esNeg);
  
  resultado.esValido = true;
  resultado.valorDecimal = decimal;
  resultado.grados = grados;
  resultado.minutos = minutos;
  resultado.segundos = segundos;
  resultado.direccion = direccion;
  resultado.esLatitud = direccionEsLatitud(direccion);
  resultado.formatoDetectado = formatoBase;
  
  if (resultado.esLatitud === true) {
    if (decimal < 36 || decimal > 38.5) {
      resultado.warning = `Latitud ${decimal.toFixed(4)}° fuera de Andalucía (36-38.5)`;
    }
  } else if (resultado.esLatitud === false) {
    if (decimal > -1 || decimal < -7.5) {
      resultado.warning = `Longitud ${decimal.toFixed(4)}° fuera de Andalucía (-7.5 a -1)`;
    }
  }
  
  return resultado;
}

export function esDMS(valor: string): boolean {
  return parseDMS(valor).esValido;
}

// ============================================================================
// FUNCIONES NMEA GPS - Patrones D1-D4
// ============================================================================

/**
 * Parser NMEA GPS - detecta y convierte formatos D1-D4
 * 
 * Formato NMEA:
 * - Latitud: ddmm.mmmm[N/S] donde dd=grados, mm.mmmm=minutos decimales
 * - Longitud: dddmm.mmmm[E/W] donde ddd=grados, mm.mmmm=minutos decimales
 * 
 * @param valor - Coordenada en formato NMEA
 * @returns Objeto ResultadoNMEA con valor decimal y metadata
 * 
 * @example
 * parseNMEA("3726.775N")   // { valorDecimal: 37.44625, hemisferio: 'N', esLatitud: true }
 * parseNMEA("00345.204W")  // { valorDecimal: 3.7534, hemisferio: 'W', esLatitud: false }
 */
export function parseNMEA(valor: string): ResultadoNMEA {
  const resultado: ResultadoNMEA = {
    esValido: false,
    valorDecimal: null,
    hemisferio: null,
    esLatitud: null,
    formatoDetectado: null,
    tipoSentencia: null,
    warning: null
  };
  
  if (!valor || typeof valor !== 'string') {
    return resultado;
  }

  let s = valor.trim().toUpperCase();
  if (s.length === 0) return resultado;
  
  // Normalizar: quitar espacios internos y comas antes de hemisferio
  s = s.replace(/[\s,]+([NSEWON])$/i, '$1');
  s = s.replace(/,/g, '.');
  
  // Detectar hemisferio
  let hemisferio: 'N' | 'S' | 'E' | 'W' | null = null;
  const hemMatch = s.match(/[NSEWON]$/i);
  if (hemMatch) {
    const hem = hemMatch[0].toUpperCase();
    hemisferio = (hem === 'O' ? 'W' : hem) as 'N' | 'S' | 'E' | 'W';
    s = s.slice(0, -1).trim();
  }

  // Determinar tipo según hemisferio
  let esLatitud: boolean | null = null;
  if (hemisferio === 'N' || hemisferio === 'S') {
    esLatitud = true;
  } else if (hemisferio === 'E' || hemisferio === 'W') {
    esLatitud = false;
  }

  // PATRÓN NMEA estándar: ddmm.mmmm o dddmm.mmmm
  const nmeaPattern = /^(\d+)\.(\d+)$/;
  const match = s.match(nmeaPattern);
  
  if (match) {
    const intPart = match[1];
    const decPart = match[2];
    
    let grados: number, minutos: number;
    
    if (esLatitud === true || (esLatitud === null && intPart.length <= 4)) {
      // Latitud: ddmm.mmmm
      if (intPart.length >= 3) {
        grados = parseInt(intPart.slice(0, -2), 10);
        minutos = parseFloat(intPart.slice(-2) + '.' + decPart);
      } else if (intPart.length === 2) {
        grados = 0;
        minutos = parseFloat(intPart + '.' + decPart);
      } else {
        return resultado;
      }
    } else {
      // Longitud: dddmm.mmmm
      if (intPart.length >= 4) {
        grados = parseInt(intPart.slice(0, -2), 10);
        minutos = parseFloat(intPart.slice(-2) + '.' + decPart);
      } else if (intPart.length === 3) {
        grados = parseInt(intPart.slice(0, 1), 10);
        minutos = parseFloat(intPart.slice(1) + '.' + decPart);
      } else {
        return resultado;
      }
    }
    
    if (minutos >= 60) {
      resultado.warning = `Minutos fuera de rango: ${minutos}`;
      return resultado;
    }
    
    const decimal = grados + minutos / 60;
    resultado.esValido = true;
    resultado.valorDecimal = decimal;
    resultado.hemisferio = hemisferio;
    resultado.esLatitud = esLatitud;
    resultado.formatoDetectado = 'NMEA_ESTANDAR';
    return resultado;
  }
  
  // Patrón entero sin decimales: 3726N
  const intOnlyPattern = /^(\d{4,5})$/;
  const intMatch = s.match(intOnlyPattern);
  
  if (intMatch) {
    const intPart = intMatch[1];
    let grados: number, minutos: number;
    
    if (intPart.length === 4) {
      grados = parseInt(intPart.slice(0, 2), 10);
      minutos = parseInt(intPart.slice(2), 10);
    } else if (intPart.length === 5) {
      grados = parseInt(intPart.slice(0, 3), 10);
      minutos = parseInt(intPart.slice(3), 10);
    } else {
      return resultado;
    }
    
    if (minutos >= 60) {
      resultado.warning = `Minutos fuera de rango: ${minutos}`;
      return resultado;
    }
    
    const decimal = grados + minutos / 60;
    resultado.esValido = true;
    resultado.valorDecimal = decimal;
    resultado.hemisferio = hemisferio;
    resultado.esLatitud = esLatitud;
    resultado.formatoDetectado = 'NMEA_ENTERO';
    return resultado;
  }
  
  return resultado;
}

/**
 * Extrae coordenadas de una sentencia NMEA completa ($GPGGA, $GPRMC, $GPGLL).
 * 
 * @param sentencia - Sentencia NMEA completa
 * @returns Objeto ResultadoParNMEA con latitud, longitud y metadata
 * 
 * @example
 * parseNMEASentence("$GPGGA,123519,3726.775,N,00345.204,W,1,08,0.9,545.4,M,...")
 * // { latitud: 37.44625, longitud: -3.7534, exito: true, tipoSentencia: 'GGA' }
 */
export function parseNMEASentence(sentencia: string): ResultadoParNMEA {
  const nullResult: ResultadoParNMEA = { 
    latitud: null, longitud: null, exito: false, patrones: [], tipoSentencia: null 
  };
  
  if (!sentencia || typeof sentencia !== 'string') return nullResult;
  
  const s = sentencia.trim().toUpperCase();
  
  // Detectar tipo de sentencia
  let tipoSentencia: string | null = null;
  if (s.startsWith('$GPGGA') || s.startsWith('$GNGGA')) {
    tipoSentencia = 'GGA';
  } else if (s.startsWith('$GPRMC') || s.startsWith('$GNRMC')) {
    tipoSentencia = 'RMC';
  } else if (s.startsWith('$GPGLL') || s.startsWith('$GNGLL')) {
    tipoSentencia = 'GLL';
  }
  
  if (!tipoSentencia) return nullResult;
  
  const mainPart = s.split('*')[0];
  const fields = mainPart.split(',');
  
  let latField: string, latHem: string, lonField: string, lonHem: string;
  
  if (tipoSentencia === 'GGA' && fields.length >= 6) {
    latField = fields[2]; latHem = fields[3];
    lonField = fields[4]; lonHem = fields[5];
  } else if (tipoSentencia === 'RMC' && fields.length >= 7) {
    latField = fields[3]; latHem = fields[4];
    lonField = fields[5]; lonHem = fields[6];
  } else if (tipoSentencia === 'GLL' && fields.length >= 5) {
    latField = fields[1]; latHem = fields[2];
    lonField = fields[3]; lonHem = fields[4];
  } else {
    return nullResult;
  }
  
  const latParsed = parseNMEA(latField + latHem);
  const lonParsed = parseNMEA(lonField + lonHem);
  
  if (!latParsed.esValido || !lonParsed.esValido) return nullResult;
  if (latParsed.valorDecimal === null || lonParsed.valorDecimal === null) return nullResult;
  
  let latitud = latParsed.valorDecimal;
  let longitud = lonParsed.valorDecimal;
  
  if (latHem === 'S') latitud = -latitud;
  if (lonHem === 'W' || lonHem === 'O') longitud = -longitud;
  
  return { 
    latitud, 
    longitud, 
    exito: true, 
    patrones: ['NMEA_SENTENCIA'], 
    tipoSentencia 
  };
}

/**
 * Parsea un par de coordenadas NMEA (o sentencia completa).
 * 
 * @param input - Par de coordenadas NMEA o sentencia completa
 * @returns Objeto ResultadoParNMEA con latitud y longitud en decimales
 * 
 * @example
 * parseParNMEA("3726.775N, 00345.204W")
 * // { latitud: 37.44625, longitud: -3.7534, exito: true }
 */
export function parseParNMEA(input: string): ResultadoParNMEA {
  const nullResult: ResultadoParNMEA = { 
    latitud: null, longitud: null, exito: false, patrones: [], tipoSentencia: null 
  };
  
  if (!input || typeof input !== 'string') return nullResult;
  
  const s = input.trim();
  
  // Si es sentencia NMEA completa
  if (s.toUpperCase().startsWith('$GP') || s.toUpperCase().startsWith('$GN')) {
    return parseNMEASentence(s);
  }
  
  // Buscar par NMEA: ddmm.mmmmN dddmm.mmmmW
  const nmeaPairPattern = /(\d+\.?\d*)\s*,?\s*([NS])\s*[,\/\s]+\s*(\d+\.?\d*)\s*,?\s*([EWO])/i;
  const match = s.match(nmeaPairPattern);
  
  if (match) {
    const lat = parseNMEA(match[1] + match[2]);
    const lon = parseNMEA(match[3] + match[4]);
    
    if (lat.esValido && lon.esValido && lat.valorDecimal !== null && lon.valorDecimal !== null) {
      let latitud = lat.valorDecimal;
      let longitud = lon.valorDecimal;
      
      if (match[2].toUpperCase() === 'S') latitud = -latitud;
      if (match[4].toUpperCase() === 'W' || match[4].toUpperCase() === 'O') {
        longitud = -longitud;
      }
      
      return { latitud, longitud, exito: true, patrones: ['NMEA_PAR'], tipoSentencia: null };
    }
  }
  
  // Intentar separar por coma/espacio
  const parts = s.split(/[,;\/ ]\s*/).filter(p => p.length > 0);
  if (parts.length >= 2) {
    const parsed1 = parseNMEA(parts[0]);
    const parsed2 = parseNMEA(parts[1]);
    
    if (parsed1.esValido && parsed2.esValido && 
        parsed1.valorDecimal !== null && parsed2.valorDecimal !== null) {
      let latitud: number | null = null;
      let longitud: number | null = null;
      const patrones: PatronDetectado[] = [];
      
      if (parsed1.formatoDetectado) patrones.push(parsed1.formatoDetectado);
      if (parsed2.formatoDetectado) patrones.push(parsed2.formatoDetectado);
      
      if (parsed1.esLatitud === true) {
        latitud = parsed1.hemisferio === 'S' ? -parsed1.valorDecimal : parsed1.valorDecimal;
      } else if (parsed1.esLatitud === false) {
        longitud = parsed1.hemisferio === 'W' ? -parsed1.valorDecimal : parsed1.valorDecimal;
      }
      
      if (parsed2.esLatitud === true) {
        latitud = parsed2.hemisferio === 'S' ? -parsed2.valorDecimal : parsed2.valorDecimal;
      } else if (parsed2.esLatitud === false) {
        longitud = parsed2.hemisferio === 'W' ? -parsed2.valorDecimal : parsed2.valorDecimal;
      }
      
      if (latitud !== null && longitud !== null) {
        return { latitud, longitud, exito: true, patrones, tipoSentencia: null };
      }
    }
  }
  
  return nullResult;
}

/**
 * Detecta si un valor está en formato NMEA GPS.
 * 
 * @param valor - Valor a analizar
 * @returns true si parece ser formato NMEA
 */
export function esNMEA(valor: string): boolean {
  if (!valor || typeof valor !== 'string') return false;
  
  const s = valor.trim().toUpperCase();
  
  const nmeaIndicators = [
    /^\$GP[A-Z]{3}/,                    // Sentencia NMEA GPS
    /^\$GN[A-Z]{3}/,                    // Sentencia NMEA multi-constelación
    /^\d{4,5}\.\d+[NSEWON]$/i,          // ddmm.mmmmN o dddmm.mmmmW
    /^\d{4,5}\.\d+\s*,?\s*[NSEWON]$/i,  // Con espacio/coma antes de hemisferio
    /^\d{4,5}[NSEWON]$/i,               // Entero sin decimales
  ];
  
  return nmeaIndicators.some(pattern => pattern.test(s));
}

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN
// ============================================================================

export function normalizarCoordenada(input: string): ResultadoNormalizacion {
  const resultado: ResultadoNormalizacion = {
    valorOriginal: input,
    valorNormalizado: null,
    exito: false,
    patronDetectado: 'DESCONOCIDO',
    fasesAplicadas: [],
    warnings: [],
    errores: [],
  };
  
  // Coerción defensiva a string (pueden llegar números, null, undefined)
  let valor = input != null ? String(input) : '';
  
  valor = valor.trim();
  resultado.fasesAplicadas.push('FASE_0_TRIM');
  
  if (esPlaceholder(valor)) {
    resultado.patronDetectado = 'PLACEHOLDER';
    resultado.fasesAplicadas.push('FASE_0_PLACEHOLDER');
    resultado.warnings.push('Valor placeholder detectado');
    return resultado;
  }
  
  resultado.patronDetectado = detectarPatron(valor);
  
  // FASE 0.5: Coordenadas concatenadas
  if (resultado.patronDetectado === 'CONCATENADO') {
    const separacion = separarCoordenadasConcatenadas(valor);
    if (separacion.esConcatenado && separacion.valorX !== null) {
      resultado.valorNormalizado = separacion.valorX;
      resultado.exito = true;
      resultado.fasesAplicadas.push('FASE_0.5_CONCATENADO');
      resultado.warnings.push(separacion.warning || 'Coordenadas concatenadas detectadas');
      (resultado as any)._yExtraida = separacion.valorY;
      (resultado as any)._confianzaConcatenacion = separacion.confianza;
      return resultado;
    }
  }
  
  // FASE 0.6: Formatos espaciales (WKT, GeoJSON)
  if (resultado.patronDetectado === 'WKT_POINT' || resultado.patronDetectado === 'GEOJSON_POINT') {
    const espacial = detectarFormatoEspacial(valor);
    if (espacial.esEspacial && espacial.valorX !== null) {
      resultado.valorNormalizado = espacial.valorX;
      resultado.exito = true;
      resultado.fasesAplicadas.push('FASE_0.6_FORMATO_ESPACIAL');
      resultado.warnings.push(espacial.warning || 'Formato espacial detectado');
      (resultado as any)._yExtraida = espacial.valorY;
      (resultado as any)._formatoEspacial = espacial.formato;
      return resultado;
    }
  }
  
  // FASE 0.7: Formatos DMS (Grados Sexagesimales)
  const patronesDMS: PatronDetectado[] = [
    'DMS_ESTANDAR', 'DMS_ESPACIOS', 'DMS_PREFIJO', 
    'DMS_MINUTOS_DEC', 'DMS_ESPACIOS_EXTRA', 'DMS_SIGNO', 'DMS_DOS_PUNTOS'
  ];
  
  if (patronesDMS.includes(resultado.patronDetectado)) {
    const dms = parseDMS(valor);
    if (dms.esValido && dms.valorDecimal !== null) {
      resultado.valorNormalizado = dms.valorDecimal;
      resultado.exito = true;
      resultado.fasesAplicadas.push('FASE_0.7_DMS');
      if (dms.warning) {
        resultado.warnings.push(dms.warning);
      }
      resultado.warnings.push(
        `DMS convertido: ${dms.grados}°${dms.minutos}'${dms.segundos}"${dms.direccion || ''} → ${dms.valorDecimal.toFixed(6)}°`
      );
      (resultado as any)._dmsOriginal = {
        grados: dms.grados,
        minutos: dms.minutos,
        segundos: dms.segundos,
        direccion: dms.direccion
      };
      (resultado as any)._esLatitud = dms.esLatitud;
      (resultado as any)._esGeografica = true;
      return resultado;
    }
  }
  
  // FASE 0.8: Formatos NMEA GPS (D1-D4)
  const patronesNMEA: PatronDetectado[] = [
    'NMEA_ESTANDAR', 'NMEA_ENTERO', 'NMEA_SENTENCIA', 'NMEA_PAR'
  ];
  
  if (patronesNMEA.includes(resultado.patronDetectado)) {
    // Intentar parsear como NMEA individual
    const nmea = parseNMEA(valor);
    if (nmea.esValido && nmea.valorDecimal !== null) {
      resultado.valorNormalizado = nmea.valorDecimal;
      resultado.exito = true;
      resultado.fasesAplicadas.push('FASE_0.8_NMEA');
      if (nmea.warning) {
        resultado.warnings.push(nmea.warning);
      }
      resultado.warnings.push(
        `NMEA convertido: ${valor} → ${nmea.valorDecimal.toFixed(6)}° (${nmea.hemisferio || 'sin hemisferio'})`
      );
      (resultado as any)._esLatitud = nmea.esLatitud;
      (resultado as any)._esGeografica = true;
      (resultado as any)._hemisferio = nmea.hemisferio;
      return resultado;
    }
    
    // Intentar como par NMEA o sentencia
    const parNmea = parseParNMEA(valor);
    if (parNmea.exito && parNmea.latitud !== null) {
      resultado.valorNormalizado = parNmea.latitud;
      resultado.exito = true;
      resultado.fasesAplicadas.push('FASE_0.8_NMEA_PAR');
      resultado.warnings.push(
        `NMEA par detectado: lat=${parNmea.latitud.toFixed(6)}°, lon=${parNmea.longitud?.toFixed(6)}°`
      );
      (resultado as any)._yExtraida = parNmea.longitud;
      (resultado as any)._esLatitud = true;
      (resultado as any)._esGeografica = true;
      (resultado as any)._tipoSentencia = parNmea.tipoSentencia;
      return resultado;
    }
  }
  
  // FASE 1: Corrección Mojibake
  if (/Â/.test(valor)) {
    const valorAntes = valor;
    valor = valor
      .replace(/Â´/g, '´')
      .replace(/Âº/g, 'º')
      .replace(/Â°/g, '°')
      .replace(/Â±/g, '±')
      .replace(/Ã±/g, 'ñ')
      .replace(/Ã¡/g, 'á')
      .replace(/Ã©/g, 'é')
      .replace(/Ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/Ãº/g, 'ú');
    
    if (valor !== valorAntes) {
      resultado.fasesAplicadas.push('FASE_1_MOJIBAKE');
      resultado.warnings.push(`Mojibake corregido: "${valorAntes}" → "${valor}"`);
    }
  }
  
  // FASE 2: Normalización caracteres especiales
  const valorAntesFase2 = valor;
  valor = valor.replace(/´´/g, '.');
  valor = valor.replace(/´/g, '.');
  valor = valor.replace(/['']/g, '.');
  valor = valor.replace(/'/g, '.');
  valor = valor.replace(/[""]/g, '.');
  
  if (valor !== valorAntesFase2) {
    resultado.fasesAplicadas.push('FASE_2_CARACTERES_ESPECIALES');
  }
  
  // FASE 3: Eliminación de espacios
  const valorAntesFase3 = valor;
  const matchDecimalImplicito = valor.match(/^(\d{1,3}(?:\s+\d{3})*)\s+(\d{1,2})$/);
  if (matchDecimalImplicito && !valor.includes('.')) {
    const parteEntera = matchDecimalImplicito[1].replace(/\s+/g, '');
    const parteDecimal = matchDecimalImplicito[2];
    valor = `${parteEntera}.${parteDecimal}`;
    resultado.fasesAplicadas.push('FASE_3_DECIMAL_IMPLICITO');
    resultado.warnings.push(`Decimales implícitos detectados: "${valorAntesFase3}" → "${valor}"`);
  } else {
    valor = valor.replace(/\s+/g, '');
    if (valor !== valorAntesFase3.replace(/\s+/g, '')) {
      resultado.fasesAplicadas.push('FASE_3_ESPACIOS');
    }
  }
  
  // FASE 4: Normalización formato europeo
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(valor)) {
    valor = valor.replace(/\./g, '').replace(',', '.');
    resultado.fasesAplicadas.push('FASE_4_EUROPEO_COMPLETO');
  } else if (/^\d+,\d+$/.test(valor)) {
    valor = valor.replace(',', '.');
    resultado.fasesAplicadas.push('FASE_4_COMA_DECIMAL');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(valor)) {
    valor = valor.replace(/\./g, '');
    resultado.fasesAplicadas.push('FASE_4_PUNTO_MILES');
  }
  
  // FASE 5: Limpieza final y parsing
  valor = valor.replace(/\.+/g, '.');
  valor = valor.replace(/\.$/, '');
  valor = valor.replace(/^\./, '');
  
  const numero = parseFloat(valor);
  
  if (isNaN(numero)) {
    resultado.errores.push(`No se pudo convertir a número: "${valor}"`);
    return resultado;
  }
  
  resultado.valorNormalizado = numero;
  resultado.exito = true;
  resultado.fasesAplicadas.push('FASE_5_PARSING');
  
  return resultado;
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

export function validarCoordenada(valor: number): ResultadoValidacion {
  const warnings: string[] = [];
  
  if (valor >= RANGOS_ANDALUCIA.UTM.X_MIN && valor <= RANGOS_ANDALUCIA.UTM.X_MAX) {
    return { valido: true, tipo: 'X', confianza: 'ALTA', warnings };
  }
  
  if (valor >= RANGOS_ANDALUCIA.UTM.Y_MIN && valor <= RANGOS_ANDALUCIA.UTM.Y_MAX) {
    return { valido: true, tipo: 'Y', confianza: 'ALTA', warnings };
  }
  
  if (valor >= RANGOS_ANDALUCIA.Y_TRUNCADA.MIN && valor <= RANGOS_ANDALUCIA.Y_TRUNCADA.MAX) {
    const valorCorregido = valor + 4000000;
    if (valorCorregido >= RANGOS_ANDALUCIA.UTM.Y_MIN && 
        valorCorregido <= RANGOS_ANDALUCIA.UTM.Y_MAX) {
      warnings.push(`ERROR P0-1: Y truncada detectada. Valor ${valor} → ${valorCorregido}`);
      return {
        valido: true,
        tipo: 'Y',
        confianza: 'MEDIA',
        warnings,
        correccionAplicada: '+4000000',
        valorCorregido,
      };
    }
  }
  
  if (valor >= RANGOS_ANDALUCIA.GEOGRAFICAS.LAT_MIN && 
      valor <= RANGOS_ANDALUCIA.GEOGRAFICAS.LAT_MAX) {
    warnings.push('Coordenada geográfica detectada (latitud). Requiere conversión a UTM.');
    return { valido: true, tipo: 'GEOGRAFICA_LAT', confianza: 'ALTA', warnings };
  }
  
  if (valor >= RANGOS_ANDALUCIA.GEOGRAFICAS.LON_MIN && 
      valor <= RANGOS_ANDALUCIA.GEOGRAFICAS.LON_MAX) {
    warnings.push('Coordenada geográfica detectada (longitud). Requiere conversión a UTM.');
    return { valido: true, tipo: 'GEOGRAFICA_LON', confianza: 'ALTA', warnings };
  }
  
  warnings.push(`Valor ${valor} fuera de rangos válidos para Andalucía`);
  return { valido: false, tipo: 'DESCONOCIDO', confianza: 'BAJA', warnings };
}

export function detectarIntercambioXY(x: number, y: number): {
  intercambiado: boolean;
  xCorregida: number;
  yCorregida: number;
  mensaje?: string;
} {
  const xPareceSiendoY = x >= 2000000 && x <= 5000000;
  const yPareceSiendoX = y >= 100000 && y <= 700000;
  
  if (xPareceSiendoY && yPareceSiendoX) {
    return {
      intercambiado: true,
      xCorregida: y,
      yCorregida: x,
      mensaje: `ERROR P0-2: Intercambio X↔Y detectado. (${x}, ${y}) → (${y}, ${x})`,
    };
  }
  
  return { intercambiado: false, xCorregida: x, yCorregida: y };
}

// ============================================================================
// FUNCIÓN PRINCIPAL: PROCESAR PAR DE COORDENADAS
// ============================================================================

export function procesarParCoordenadas(
  xInput: string,
  yInput: string,
  opciones: {
    aplicarCorreccionP0?: boolean;
    detectarIntercambio?: boolean;
    detectarConcatenacion?: boolean;
    epsgAsumido?: number;
  } = {}
): ParCoordenadas {
  const {
    aplicarCorreccionP0 = true,
    detectarIntercambio = true,
    detectarConcatenacion = true,
    epsgAsumido = 25830,
  } = opciones;
  
  // Coerción defensiva a string
  const xStr = xInput != null ? String(xInput) : '';
  const yStr = yInput != null ? String(yInput) : '';
  
  let normX = normalizarCoordenada(xStr);
  let normY = normalizarCoordenada(yStr);
  
  let x = normX.valorNormalizado;
  let y = normY.valorNormalizado;
  let validX: ResultadoValidacion | null = null;
  let validY: ResultadoValidacion | null = null;
  let intercambioAplicado = false;
  let concatenacionDetectada = false;
  
  // Detectar coordenadas concatenadas
  if (detectarConcatenacion) {
    if (normX.patronDetectado === 'CONCATENADO' && 
        (normY.patronDetectado === 'PLACEHOLDER' || yStr.trim() === '')) {
      const yExtraida = (normX as any)._yExtraida;
      if (yExtraida !== undefined) {
        y = yExtraida;
        concatenacionDetectada = true;
        normY.valorNormalizado = yExtraida;
        normY.exito = true;
        normY.patronDetectado = 'CONCATENADO';
        normY.warnings.push('Y extraída de coordenadas concatenadas en campo X');
      }
    }
    
    if (normY.patronDetectado === 'CONCATENADO' && 
        (normX.patronDetectado === 'PLACEHOLDER' || xStr.trim() === '')) {
      const separacion = separarCoordenadasConcatenadas(yStr);
      if (separacion.esConcatenado) {
        x = separacion.valorX;
        y = separacion.valorY;
        concatenacionDetectada = true;
        normX.valorNormalizado = separacion.valorX;
        normX.exito = true;
        normX.patronDetectado = 'CONCATENADO';
        normX.warnings.push('X extraída de coordenadas concatenadas en campo Y');
      }
    }
    
    if (xStr.trim() === yStr.trim() && normX.patronDetectado === 'CONCATENADO') {
      const separacion = separarCoordenadasConcatenadas(xStr);
      if (separacion.esConcatenado) {
        x = separacion.valorX;
        y = separacion.valorY;
        concatenacionDetectada = true;
        normX.valorNormalizado = separacion.valorX;
        normY.valorNormalizado = separacion.valorY;
        normX.warnings.push('Campos X e Y idénticos con valor concatenado - separados');
        normY.warnings.push('Campos X e Y idénticos con valor concatenado - separados');
      }
    }
  }
  
  // Detectar formatos espaciales (WKT, GeoJSON)
  const esFormatoEspacialX = normX.patronDetectado === 'WKT_POINT' || normX.patronDetectado === 'GEOJSON_POINT';
  const esFormatoEspacialY = normY.patronDetectado === 'WKT_POINT' || normY.patronDetectado === 'GEOJSON_POINT';
  
  if (esFormatoEspacialX && (normY.patronDetectado === 'PLACEHOLDER' || yStr.trim() === '')) {
    const yExtraida = (normX as any)._yExtraida;
    if (yExtraida !== undefined) {
      y = yExtraida;
      normY.valorNormalizado = yExtraida;
      normY.exito = true;
      normY.patronDetectado = normX.patronDetectado;
      normY.warnings.push(`Y extraída de formato ${normX.patronDetectado} en campo X`);
    }
  }
  
  if (esFormatoEspacialY && (normX.patronDetectado === 'PLACEHOLDER' || xStr.trim() === '')) {
    const espacial = detectarFormatoEspacial(yStr);
    if (espacial.esEspacial) {
      x = espacial.valorX;
      y = espacial.valorY;
      normX.valorNormalizado = espacial.valorX;
      normX.exito = true;
      normX.patronDetectado = espacial.formato!;
      normX.warnings.push(`X extraída de formato ${espacial.formato} en campo Y`);
    }
  }
  
  if (xStr.trim() === yStr.trim() && esFormatoEspacialX) {
    const espacial = detectarFormatoEspacial(xStr);
    if (espacial.esEspacial) {
      x = espacial.valorX;
      y = espacial.valorY;
      normX.valorNormalizado = espacial.valorX;
      normY.valorNormalizado = espacial.valorY;
      normX.warnings.push(`Campos idénticos con formato ${espacial.formato} - separados`);
    }
  }
  
  // Validar
  if (x !== null) {
    validX = validarCoordenada(x);
    if (aplicarCorreccionP0 && validX.valorCorregido !== undefined) {
      x = validX.valorCorregido;
    }
  }
  
  if (y !== null) {
    validY = validarCoordenada(y);
    if (aplicarCorreccionP0 && validY.valorCorregido !== undefined) {
      y = validY.valorCorregido;
    }
  }
  
  // Detectar intercambio X↔Y
  if (detectarIntercambio && x !== null && y !== null) {
    const resultadoIntercambio = detectarIntercambioXY(x, y);
    if (resultadoIntercambio.intercambiado) {
      x = resultadoIntercambio.xCorregida;
      y = resultadoIntercambio.yCorregida;
      intercambioAplicado = true;
      validX = validarCoordenada(x);
      validY = validarCoordenada(y);
      if (validX) validX.warnings.push(resultadoIntercambio.mensaje!);
    }
  }
  
  // Determinar confianza global
  let confianzaGlobal: NivelConfianza = 'ALTA';
  if (x === null || y === null) {
    confianzaGlobal = 'CRITICA';
  } else if (concatenacionDetectada) {
    confianzaGlobal = 'MEDIA';
  } else if (intercambioAplicado || validX?.confianza === 'MEDIA' || validY?.confianza === 'MEDIA') {
    confianzaGlobal = 'MEDIA';
  } else if (validX?.confianza === 'BAJA' || validY?.confianza === 'BAJA') {
    confianzaGlobal = 'BAJA';
  }
  
  return {
    x,
    y,
    xOriginal: xStr,
    yOriginal: yStr,
    normalizacionX: normX,
    normalizacionY: normY,
    validacionX: validX,
    validacionY: validY,
    intercambioAplicado,
    concatenacionDetectada,
    confianzaGlobal,
    epsg: epsgAsumido,
  };
}

// ============================================================================
// UTILIDADES DE EXPORTACIÓN
// ============================================================================

export function formatearCoordenada(valor: number | null, decimales: number = 2): string {
  if (valor === null) {
    return '';
  }
  return valor.toFixed(decimales);
}

export function generarDiagnostico(par: ParCoordenadas): string {
  const lineas: string[] = [
    `═══════════════════════════════════════════════════════`,
    `DIAGNÓSTICO DE COORDENADAS`,
    `═══════════════════════════════════════════════════════`,
    ``,
    `ENTRADA:`,
    `  X original: "${par.xOriginal}"`,
    `  Y original: "${par.yOriginal}"`,
    ``,
    `PATRONES DETECTADOS:`,
    `  X: ${par.normalizacionX.patronDetectado}`,
    `  Y: ${par.normalizacionY.patronDetectado}`,
    ``,
    `NORMALIZACIÓN:`,
    `  X: ${par.x !== null ? par.x.toFixed(2) : 'NULL'} (${par.normalizacionX.exito ? '✓' : '✗'})`,
    `  Y: ${par.y !== null ? par.y.toFixed(2) : 'NULL'} (${par.normalizacionY.exito ? '✓' : '✗'})`,
    ``,
    `FASES APLICADAS:`,
    `  X: ${par.normalizacionX.fasesAplicadas.join(' → ')}`,
    `  Y: ${par.normalizacionY.fasesAplicadas.join(' → ')}`,
  ];
  
  if (par.concatenacionDetectada) {
    lineas.push(``, `⚠️  CORRECCIÓN P0-3: Coordenadas concatenadas separadas`);
  }
  
  if (par.intercambioAplicado) {
    lineas.push(``, `⚠️  CORRECCIÓN P0-2: Intercambio X↔Y aplicado`);
  }
  
  if (par.validacionY?.correccionAplicada) {
    lineas.push(``, `⚠️  CORRECCIÓN P0-1: ${par.validacionY.correccionAplicada}`);
  }
  
  lineas.push(
    ``,
    `VALIDACIÓN:`,
    `  X: ${par.validacionX?.tipo || 'N/A'} - ${par.validacionX?.confianza || 'N/A'}`,
    `  Y: ${par.validacionY?.tipo || 'N/A'} - ${par.validacionY?.confianza || 'N/A'}`,
    ``,
    `CONFIANZA GLOBAL: ${par.confianzaGlobal}`,
    `EPSG: ${par.epsg}`,
  );
  
  const allWarnings = [
    ...par.normalizacionX.warnings,
    ...par.normalizacionY.warnings,
    ...(par.validacionX?.warnings || []),
    ...(par.validacionY?.warnings || []),
  ];
  
  if (allWarnings.length > 0) {
    lineas.push(``, `WARNINGS:`);
    allWarnings.forEach(w => lineas.push(`  ⚠ ${w}`));
  }
  
  const allErrores = [
    ...par.normalizacionX.errores,
    ...par.normalizacionY.errores,
  ];
  
  if (allErrores.length > 0) {
    lineas.push(``, `ERRORES:`);
    allErrores.forEach(e => lineas.push(`  ✗ ${e}`));
  }
  
  lineas.push(`═══════════════════════════════════════════════════════`);
  
  return lineas.join('\n');
}

// ============================================================================
// TESTS INTEGRADOS
// ============================================================================

export function ejecutarTests(): void {
  const casos = [
    // Berja - Espacio + doble tilde
    { x: '504 750´´92', y: '4 077 153´´36', esperadoX: 504750.92, esperadoY: 4077153.36 },
    // Berja - Europeo completo
    { x: '505.438,13', y: '4.078.875,09', esperadoX: 505438.13, esperadoY: 4078875.09 },
    // Colomera - Coma decimal
    { x: '436780,0', y: '4136578,2', esperadoX: 436780.0, esperadoY: 4136578.2 },
    // Castril - Limpio
    { x: '521581.88', y: '4185653.05', esperadoX: 521581.88, esperadoY: 4185653.05 },
    // Error P0-1: Y truncada
    { x: '504750', y: '77905', esperadoX: 504750, esperadoY: 4077905 },
    // Error P0-2: Intercambio X↔Y
    { x: '4077905', y: '504750', esperadoX: 504750, esperadoY: 4077905 },
    // Placeholders
    { x: 'Indicar', y: 'Pendiente', esperadoX: null, esperadoY: null },
    // WKT
    { x: 'POINT(504750 4077905)', y: '', esperadoX: 504750, esperadoY: 4077905 },
    // GeoJSON
    { x: '{"type":"Point","coordinates":[504750,4077905]}', y: '', esperadoX: 504750, esperadoY: 4077905 },
    // DMS C1
    { x: '37°26\'46.5"N', y: '3°45\'12.3"W', esperadoX: 37.44625, esperadoY: -3.753417 },
    // DMS C3 espacios
    { x: '37 26 46.5 N', y: '3 45 12.3 W', esperadoX: 37.44625, esperadoY: -3.753417 },
    // DMS C8 dos puntos
    { x: '37:26:46.5 N', y: '3:45:12.3 W', esperadoX: 37.44625, esperadoY: -3.753417 },
    // NMEA D1 estándar
    { x: '3726.775N', y: '00345.204W', esperadoX: 37.44625, esperadoY: -3.7534 },
    // NMEA D2 entero
    { x: '3726N', y: '00345W', esperadoX: 37.4333, esperadoY: -3.75 },
  ];
  
  console.log('\n🧪 EJECUTANDO TESTS DE NORMALIZACIÓN v2.3\n');
  console.log('═'.repeat(70));
  
  let pasados = 0;
  let fallidos = 0;
  
  casos.forEach((caso, i) => {
    const resultado = procesarParCoordenadas(caso.x, caso.y);
    
    const xOk = resultado.x === caso.esperadoX || 
                (resultado.x !== null && caso.esperadoX !== null && 
                 Math.abs(resultado.x - caso.esperadoX) < 0.01);
    const yOk = resultado.y === caso.esperadoY || 
                (resultado.y !== null && caso.esperadoY !== null && 
                 Math.abs(resultado.y - caso.esperadoY) < 0.01);
    
    const estado = xOk && yOk ? '✓' : '✗';
    
    if (xOk && yOk) {
      pasados++;
    } else {
      fallidos++;
    }
    
    console.log(`${estado} Test ${i + 1}: "${caso.x}", "${caso.y}"`);
    console.log(`  Esperado: X=${caso.esperadoX}, Y=${caso.esperadoY}`);
    console.log(`  Obtenido: X=${resultado.x}, Y=${resultado.y}`);
    console.log('');
  });
  
  console.log('═'.repeat(70));
  console.log(`\n📊 RESUMEN: ${pasados} pasados, ${fallidos} fallidos de ${casos.length} tests\n`);
}

// ============================================================================
// ALIASES PARA COMPATIBILIDAD
// ============================================================================

export { normalizarCoordenada as normalizeCoordinate };
export { ResultadoNormalizacion as NormalizationResult };
export { separarCoordenadasConcatenadas as splitConcatenatedCoordinates };
export { parseWKT as parseWKTPoint };
export { parseGeoJSON as parseGeoJSONPoint };

// ============================================================================
// EXPORTACIÓN POR DEFECTO
// ============================================================================

export default {
  normalizarCoordenada,
  validarCoordenada,
  procesarParCoordenadas,
  separarCoordenadasConcatenadas,
  parseWKT,
  parseGeoJSON,
  detectarFormatoEspacial,
  parseDMS,
  esDMS,
  parseNMEA,
  parseNMEASentence,
  parseParNMEA,
  esNMEA,
  detectarPatron,
  esPlaceholder,
  detectarIntercambioXY,
  formatearCoordenada,
  generarDiagnostico,
  ejecutarTests,
  RANGOS_ANDALUCIA,
};
