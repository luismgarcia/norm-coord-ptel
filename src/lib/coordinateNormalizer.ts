/**
 * PTEL Andalucía - Normalizador de Coordenadas v2.2
 * 
 * Implementa la taxonomía completa de 52 patrones de coordenadas
 * identificados en documentos municipales andaluces.
 * 
 * Sistema objetivo: EPSG:25830 (UTM Zona 30N, ETRS89)
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
 * @version 2.2.0
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
  const valorLimpio = valor.trim().toLowerCase();
  
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
  const v = valor.trim();
  
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
 * 
 * Patrón típico: "5234004120000" → X=523400, Y=4120000
 * 
 * Estrategia:
 * 1. Probar división en el punto medio
 * 2. Validar que ambas partes caigan en rangos UTM válidos para Andalucía
 * 3. Identificar cuál es X y cuál es Y por sus rangos característicos
 * 
 * @example
 * separarCoordenadasConcatenadas("5234004120000")
 * // → { esConcatenado: true, valorX: 523400, valorY: 4120000, ... }
 */
export function separarCoordenadasConcatenadas(valor: string): ResultadoConcatenacion {
  const resultado: ResultadoConcatenacion = {
    esConcatenado: false,
    valorX: null,
    valorY: null,
    confianza: 'BAJA',
    warning: null,
  };
  
  // Extraer solo dígitos
  const soloDigitos = valor.replace(/[^\d]/g, '');
  
  // Necesitamos al menos 12 dígitos para tener X (6) + Y (7)
  if (soloDigitos.length < 12) {
    return resultado;
  }
  
  // Estrategia 1: División en punto medio
  const mid = Math.floor(soloDigitos.length / 2);
  
  // Probar diferentes puntos de corte alrededor del medio
  const puntosCorte = [mid, mid - 1, mid + 1, mid - 2, mid + 2];
  
  for (const corte of puntosCorte) {
    if (corte < 5 || corte > soloDigitos.length - 6) continue;
    
    const parte1 = parseInt(soloDigitos.substring(0, corte), 10);
    const parte2 = parseInt(soloDigitos.substring(corte), 10);
    
    // Verificar si parte1 es X válida y parte2 es Y válida
    const parte1EsX = parte1 >= RANGOS_ANDALUCIA.UTM.X_MIN && parte1 <= RANGOS_ANDALUCIA.UTM.X_MAX;
    const parte1EsY = parte1 >= RANGOS_ANDALUCIA.UTM.Y_MIN && parte1 <= RANGOS_ANDALUCIA.UTM.Y_MAX;
    const parte2EsX = parte2 >= RANGOS_ANDALUCIA.UTM.X_MIN && parte2 <= RANGOS_ANDALUCIA.UTM.X_MAX;
    const parte2EsY = parte2 >= RANGOS_ANDALUCIA.UTM.Y_MIN && parte2 <= RANGOS_ANDALUCIA.UTM.Y_MAX;
    
    // Caso más común: X + Y (primero X, luego Y)
    if (parte1EsX && parte2EsY) {
      resultado.esConcatenado = true;
      resultado.valorX = parte1;
      resultado.valorY = parte2;
      resultado.confianza = 'ALTA';
      resultado.warning = `Coordenadas concatenadas separadas: ${valor} → X=${parte1}, Y=${parte2}`;
      return resultado;
    }
    
    // Caso inverso: Y + X (primero Y, luego X)
    if (parte1EsY && parte2EsX) {
      resultado.esConcatenado = true;
      resultado.valorX = parte2;
      resultado.valorY = parte1;
      resultado.confianza = 'MEDIA';
      resultado.warning = `Coordenadas concatenadas (orden invertido): ${valor} → X=${parte2}, Y=${parte1}`;
      return resultado;
    }
    
    // Casos menos probables pero posibles
    if ((parte1EsX && parte2EsX) || (parte1EsY && parte2EsY)) {
      // Ambas del mismo tipo - podría ser error de datos
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

/**
 * Detecta y extrae coordenadas de formato WKT POINT
 * 
 * Soporta:
 * - POINT(X Y)
 * - POINT (X Y)  
 * - POINT(X, Y)
 * - point(x y) - case insensitive
 * 
 * @example
 * parseWKT("POINT(504750 4077905)") // → { x: 504750, y: 4077905 }
 */
export function parseWKT(valor: string): { x: number; y: number } | null {
  // Regex para POINT con variantes
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

/**
 * Detecta y extrae coordenadas de formato GeoJSON Point
 * 
 * Soporta:
 * - {"type":"Point","coordinates":[X,Y]}
 * - {"coordinates":[X,Y],"type":"Point"} (orden invertido)
 * - Variantes con espacios
 * 
 * @example
 * parseGeoJSON('{"type":"Point","coordinates":[504750,4077905]}')
 * // → { x: 504750, y: 4077905 }
 */
export function parseGeoJSON(valor: string): { x: number; y: number } | null {
  try {
    const jsonStr = valor.trim();
    
    // Verificar que parece JSON
    if (!jsonStr.startsWith('{') || !jsonStr.endsWith('}')) {
      return null;
    }
    
    const obj = JSON.parse(jsonStr);
    
    // Verificar estructura GeoJSON Point
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
    // No es JSON válido
    return null;
  }
  
  return null;
}

/**
 * Detecta si un valor es formato WKT o GeoJSON y extrae coordenadas
 * 
 * @returns ResultadoFormatoEspacial con las coordenadas extraídas o null
 */
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
  
  // Intentar WKT primero (más común en contexto QGIS)
  const wkt = parseWKT(v);
  if (wkt) {
    resultado.esEspacial = true;
    resultado.valorX = wkt.x;
    resultado.valorY = wkt.y;
    resultado.formato = 'WKT_POINT';
    resultado.warning = `WKT POINT detectado: ${v} → X=${wkt.x}, Y=${wkt.y}`;
    return resultado;
  }
  
  // Intentar GeoJSON
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
// FUNCIONES DE NORMALIZACIÓN
// ============================================================================

/**
 * Normaliza una coordenada aplicando el pipeline completo de transformaciones.
 * 
 * Pipeline:
 * 1. Limpieza inicial y detección placeholder
 * 2. Detección de coordenadas concatenadas
 * 3. Corrección mojibake UTF-8/Windows-1252
 * 4. Normalización caracteres especiales (tildes, comillas)
 * 5. Eliminación espacios entre dígitos
 * 6. Normalización formato europeo
 * 7. Parsing numérico
 */
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
  
  let valor = input;
  
  // ══════════════════════════════════════════════════════════════════════════
  // FASE 0: Limpieza inicial
  // ══════════════════════════════════════════════════════════════════════════
  valor = valor.trim();
  resultado.fasesAplicadas.push('FASE_0_TRIM');
  
  // Detectar placeholder
  if (esPlaceholder(valor)) {
    resultado.patronDetectado = 'PLACEHOLDER';
    resultado.fasesAplicadas.push('FASE_0_PLACEHOLDER');
    resultado.warnings.push('Valor placeholder detectado');
    return resultado;
  }
  
  // Detectar patrón original
  resultado.patronDetectado = detectarPatron(valor);
  
  // ══════════════════════════════════════════════════════════════════════════
  // FASE 0.5: Detección de coordenadas concatenadas
  // ══════════════════════════════════════════════════════════════════════════
  if (resultado.patronDetectado === 'CONCATENADO') {
    const separacion = separarCoordenadasConcatenadas(valor);
    if (separacion.esConcatenado && separacion.valorX !== null) {
      // Devolver solo la primera coordenada encontrada
      // La segunda se recuperará en procesarParCoordenadas
      resultado.valorNormalizado = separacion.valorX;
      resultado.exito = true;
      resultado.fasesAplicadas.push('FASE_0.5_CONCATENADO');
      resultado.warnings.push(separacion.warning || 'Coordenadas concatenadas detectadas');
      
      // Guardar Y en metadata para recuperación posterior
      (resultado as any)._yExtraida = separacion.valorY;
      (resultado as any)._confianzaConcatenacion = separacion.confianza;
      
      return resultado;
    }
  }
  
  // ══════════════════════════════════════════════════════════════════════════
  // FASE 0.6: Detección de formatos espaciales (WKT, GeoJSON)
  // ══════════════════════════════════════════════════════════════════════════
  if (resultado.patronDetectado === 'WKT_POINT' || resultado.patronDetectado === 'GEOJSON_POINT') {
    const espacial = detectarFormatoEspacial(valor);
    if (espacial.esEspacial && espacial.valorX !== null) {
      // Devolver X, guardar Y para procesarParCoordenadas
      resultado.valorNormalizado = espacial.valorX;
      resultado.exito = true;
      resultado.fasesAplicadas.push('FASE_0.6_FORMATO_ESPACIAL');
      resultado.warnings.push(espacial.warning || 'Formato espacial detectado');
      
      // Guardar Y en metadata
      (resultado as any)._yExtraida = espacial.valorY;
      (resultado as any)._formatoEspacial = espacial.formato;
      
      return resultado;
    }
  }
  
  // ══════════════════════════════════════════════════════════════════════════
  // FASE 1: Corrección Mojibake UTF-8 → Windows-1252
  // ══════════════════════════════════════════════════════════════════════════
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
  
  // ══════════════════════════════════════════════════════════════════════════
  // FASE 2: Normalización caracteres especiales como separador decimal
  // ══════════════════════════════════════════════════════════════════════════
  const valorAntesFase2 = valor;
  
  // Doble tilde → punto (CRÍTICO para patrón Berja)
  valor = valor.replace(/´´/g, '.');
  
  // Tilde simple → punto
  valor = valor.replace(/´/g, '.');
  
  // Comillas tipográficas → punto
  valor = valor.replace(/['']/g, '.');
  
  // Apóstrofe recto → punto
  valor = valor.replace(/'/g, '.');
  
  // Comillas dobles tipográficas → punto (raro pero posible)
  valor = valor.replace(/[""]/g, '.');
  
  if (valor !== valorAntesFase2) {
    resultado.fasesAplicadas.push('FASE_2_CARACTERES_ESPECIALES');
  }
  
  // ══════════════════════════════════════════════════════════════════════════
  // FASE 3: Eliminación de espacios entre dígitos
  // ══════════════════════════════════════════════════════════════════════════
  const valorAntesFase3 = valor;
  
  // Patrón: 3 dígitos + espacio + 3 dígitos + espacio + 1-2 dígitos (sin punto)
  const matchDecimalImplicito = valor.match(/^(\d{1,3}(?:\s+\d{3})*)\s+(\d{1,2})$/);
  if (matchDecimalImplicito && !valor.includes('.')) {
    const parteEntera = matchDecimalImplicito[1].replace(/\s+/g, '');
    const parteDecimal = matchDecimalImplicito[2];
    valor = `${parteEntera}.${parteDecimal}`;
    resultado.fasesAplicadas.push('FASE_3_DECIMAL_IMPLICITO');
    resultado.warnings.push(`Decimales implícitos detectados: "${valorAntesFase3}" → "${valor}"`);
  } else {
    // Eliminar espacios normalmente
    valor = valor.replace(/\s+/g, '');
    if (valor !== valorAntesFase3.replace(/\s+/g, '')) {
      resultado.fasesAplicadas.push('FASE_3_ESPACIOS');
    }
  }
  
  // ══════════════════════════════════════════════════════════════════════════
  // FASE 4: Normalización formato europeo (punto miles, coma decimal)
  // ══════════════════════════════════════════════════════════════════════════
  
  // Caso 4a: Punto miles + coma decimal: "4.077.905,68" → "4077905.68"
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(valor)) {
    valor = valor.replace(/\./g, '').replace(',', '.');
    resultado.fasesAplicadas.push('FASE_4_EUROPEO_COMPLETO');
  }
  // Caso 4b: Solo coma decimal: "436780,0" → "436780.0"
  else if (/^\d+,\d+$/.test(valor)) {
    valor = valor.replace(',', '.');
    resultado.fasesAplicadas.push('FASE_4_COMA_DECIMAL');
  }
  // Caso 4c: Solo punto miles sin decimal: "4.230.105" → "4230105"
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(valor)) {
    valor = valor.replace(/\./g, '');
    resultado.fasesAplicadas.push('FASE_4_PUNTO_MILES');
  }
  
  // ══════════════════════════════════════════════════════════════════════════
  // FASE 5: Limpieza final y parsing
  // ══════════════════════════════════════════════════════════════════════════
  
  // Eliminar puntos múltiples consecutivos (error de transcripción)
  valor = valor.replace(/\.+/g, '.');
  
  // Eliminar punto al final
  valor = valor.replace(/\.$/, '');
  
  // Eliminar punto al inicio
  valor = valor.replace(/^\./, '');
  
  // Parsing
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

/**
 * Valida una coordenada normalizada y determina su tipo (X, Y, geográfica).
 * Aplica correcciones automáticas para errores P0 (Y truncada).
 */
export function validarCoordenada(valor: number): ResultadoValidacion {
  const warnings: string[] = [];
  
  // CHECK 1: ¿Es coordenada X válida?
  if (valor >= RANGOS_ANDALUCIA.UTM.X_MIN && valor <= RANGOS_ANDALUCIA.UTM.X_MAX) {
    return {
      valido: true,
      tipo: 'X',
      confianza: 'ALTA',
      warnings,
    };
  }
  
  // CHECK 2: ¿Es coordenada Y válida?
  if (valor >= RANGOS_ANDALUCIA.UTM.Y_MIN && valor <= RANGOS_ANDALUCIA.UTM.Y_MAX) {
    return {
      valido: true,
      tipo: 'Y',
      confianza: 'ALTA',
      warnings,
    };
  }
  
  // CHECK 3: ¿Es Y truncada (falta el "4" inicial)?
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
  
  // CHECK 4: ¿Es coordenada geográfica (latitud)?
  if (valor >= RANGOS_ANDALUCIA.GEOGRAFICAS.LAT_MIN && 
      valor <= RANGOS_ANDALUCIA.GEOGRAFICAS.LAT_MAX) {
    warnings.push('Coordenada geográfica detectada (latitud). Requiere conversión a UTM.');
    return {
      valido: true,
      tipo: 'GEOGRAFICA_LAT',
      confianza: 'ALTA',
      warnings,
    };
  }
  
  // CHECK 5: ¿Es coordenada geográfica (longitud)?
  if (valor >= RANGOS_ANDALUCIA.GEOGRAFICAS.LON_MIN && 
      valor <= RANGOS_ANDALUCIA.GEOGRAFICAS.LON_MAX) {
    warnings.push('Coordenada geográfica detectada (longitud). Requiere conversión a UTM.');
    return {
      valido: true,
      tipo: 'GEOGRAFICA_LON',
      confianza: 'ALTA',
      warnings,
    };
  }
  
  // FUERA DE RANGO
  warnings.push(`Valor ${valor} fuera de rangos válidos para Andalucía`);
  return {
    valido: false,
    tipo: 'DESCONOCIDO',
    confianza: 'BAJA',
    warnings,
  };
}

/**
 * Detecta y corrige intercambio X↔Y (Error P0-2)
 */
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
  
  return {
    intercambiado: false,
    xCorregida: x,
    yCorregida: y,
  };
}

// ============================================================================
// FUNCIÓN PRINCIPAL: PROCESAR PAR DE COORDENADAS
// ============================================================================

/**
 * Procesa un par de coordenadas X,Y aplicando normalización completa,
 * validación, y corrección de errores P0.
 * 
 * v2.1: Añadida detección de coordenadas concatenadas
 */
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
  
  // Normalizar ambas coordenadas
  let normX = normalizarCoordenada(xInput);
  let normY = normalizarCoordenada(yInput);
  
  let x = normX.valorNormalizado;
  let y = normY.valorNormalizado;
  let validX: ResultadoValidacion | null = null;
  let validY: ResultadoValidacion | null = null;
  let intercambioAplicado = false;
  let concatenacionDetectada = false;
  
  // ══════════════════════════════════════════════════════════════════════════
  // NUEVO v2.1: Detectar coordenadas concatenadas
  // ══════════════════════════════════════════════════════════════════════════
  if (detectarConcatenacion) {
    // Caso 1: X contiene ambas coordenadas concatenadas, Y está vacía o placeholder
    if (normX.patronDetectado === 'CONCATENADO' && 
        (normY.patronDetectado === 'PLACEHOLDER' || yInput.trim() === '')) {
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
    
    // Caso 2: Y contiene ambas coordenadas concatenadas, X está vacía o placeholder
    if (normY.patronDetectado === 'CONCATENADO' && 
        (normX.patronDetectado === 'PLACEHOLDER' || xInput.trim() === '')) {
      const separacion = separarCoordenadasConcatenadas(yInput);
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
    
    // Caso 3: Ambos campos tienen el mismo valor concatenado (error de copia)
    if (xInput.trim() === yInput.trim() && normX.patronDetectado === 'CONCATENADO') {
      const separacion = separarCoordenadasConcatenadas(xInput);
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
  
  // ══════════════════════════════════════════════════════════════════════════
  // NUEVO v2.2: Detectar formatos espaciales (WKT, GeoJSON)
  // ══════════════════════════════════════════════════════════════════════════
  const esFormatoEspacialX = normX.patronDetectado === 'WKT_POINT' || normX.patronDetectado === 'GEOJSON_POINT';
  const esFormatoEspacialY = normY.patronDetectado === 'WKT_POINT' || normY.patronDetectado === 'GEOJSON_POINT';
  
  // Caso: Campo X contiene WKT o GeoJSON con ambas coordenadas
  if (esFormatoEspacialX && (normY.patronDetectado === 'PLACEHOLDER' || yInput.trim() === '')) {
    const yExtraida = (normX as any)._yExtraida;
    if (yExtraida !== undefined) {
      y = yExtraida;
      normY.valorNormalizado = yExtraida;
      normY.exito = true;
      normY.patronDetectado = normX.patronDetectado;
      normY.warnings.push(`Y extraída de formato ${normX.patronDetectado} en campo X`);
    }
  }
  
  // Caso: Campo Y contiene WKT o GeoJSON con ambas coordenadas
  if (esFormatoEspacialY && (normX.patronDetectado === 'PLACEHOLDER' || xInput.trim() === '')) {
    const espacial = detectarFormatoEspacial(yInput);
    if (espacial.esEspacial) {
      x = espacial.valorX;
      y = espacial.valorY;
      normX.valorNormalizado = espacial.valorX;
      normX.exito = true;
      normX.patronDetectado = espacial.formato!;
      normX.warnings.push(`X extraída de formato ${espacial.formato} en campo Y`);
    }
  }
  
  // Caso: Ambos campos tienen el mismo valor WKT/GeoJSON
  if (xInput.trim() === yInput.trim() && esFormatoEspacialX) {
    const espacial = detectarFormatoEspacial(xInput);
    if (espacial.esEspacial) {
      x = espacial.valorX;
      y = espacial.valorY;
      normX.valorNormalizado = espacial.valorX;
      normY.valorNormalizado = espacial.valorY;
      normX.warnings.push(`Campos idénticos con formato ${espacial.formato} - separados`);
    }
  }
  
  // Validar si tenemos valores numéricos
  if (x !== null) {
    validX = validarCoordenada(x);
    
    // Aplicar corrección P0-1 (Y truncada) si aplica a X
    if (aplicarCorreccionP0 && validX.valorCorregido !== undefined) {
      x = validX.valorCorregido;
    }
  }
  
  if (y !== null) {
    validY = validarCoordenada(y);
    
    // Aplicar corrección P0-1 (Y truncada)
    if (aplicarCorreccionP0 && validY.valorCorregido !== undefined) {
      y = validY.valorCorregido;
    }
  }
  
  // Detectar y corregir intercambio X↔Y (P0-2)
  if (detectarIntercambio && x !== null && y !== null) {
    const resultadoIntercambio = detectarIntercambioXY(x, y);
    if (resultadoIntercambio.intercambiado) {
      x = resultadoIntercambio.xCorregida;
      y = resultadoIntercambio.yCorregida;
      intercambioAplicado = true;
      
      // Re-validar tras intercambio
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
    confianzaGlobal = 'MEDIA'; // Siempre MEDIA si hubo separación de concatenadas
  } else if (intercambioAplicado || validX?.confianza === 'MEDIA' || validY?.confianza === 'MEDIA') {
    confianzaGlobal = 'MEDIA';
  } else if (validX?.confianza === 'BAJA' || validY?.confianza === 'BAJA') {
    confianzaGlobal = 'BAJA';
  }
  
  return {
    x,
    y,
    xOriginal: xInput,
    yOriginal: yInput,
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

/**
 * Formatea una coordenada normalizada para exportación
 */
export function formatearCoordenada(valor: number | null, decimales: number = 2): string {
  if (valor === null) {
    return '';
  }
  return valor.toFixed(decimales);
}

/**
 * Genera un resumen de diagnóstico para un par de coordenadas
 */
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
  
  // Warnings
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
  
  // Errores
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

/**
 * Ejecuta batería de tests con casos reales de municipios andaluces
 */
export function ejecutarTests(): void {
  const casos = [
    // Berja - Espacio + doble tilde
    { x: '504 750´´92', y: '4 077 153´´36', esperadoX: 504750.92, esperadoY: 4077153.36 },
    { x: '506 320´´45', y: '4 076 622´´96', esperadoX: 506320.45, esperadoY: 4076622.96 },
    
    // Berja DOCX - Espacio + decimales implícitos
    { x: '506 527 28', y: '4 076 367 83', esperadoX: 506527.28, esperadoY: 4076367.83 },
    
    // Berja - Europeo completo
    { x: '505.438,13', y: '4.078.875,09', esperadoX: 505438.13, esperadoY: 4078875.09 },
    
    // Colomera - Coma decimal
    { x: '436780,0', y: '4136578,2', esperadoX: 436780.0, esperadoY: 4136578.2 },
    { x: '437301,8', y: '4136940,5', esperadoX: 437301.8, esperadoY: 4136940.5 },
    
    // Quéntar - Mixto (coma y punto en mismo doc)
    { x: '458271,51', y: '4116357.05', esperadoX: 458271.51, esperadoY: 4116357.05 },
    
    // Hornos - Punto miles
    { x: '524.891', y: '4.230.105', esperadoX: 524891, esperadoY: 4230105 },
    
    // Castril - Limpio
    { x: '521581.88', y: '4185653.05', esperadoX: 521581.88, esperadoY: 4185653.05 },
    
    // Error P0-1: Y truncada
    { x: '504750', y: '77905', esperadoX: 504750, esperadoY: 4077905 },
    
    // Error P0-2: Intercambio X↔Y
    { x: '4077905', y: '504750', esperadoX: 504750, esperadoY: 4077905 },
    
    // Placeholders
    { x: 'Indicar', y: 'Pendiente', esperadoX: null, esperadoY: null },
    { x: 'N/A', y: '0', esperadoX: null, esperadoY: null },
    
    // Mojibake
    { x: '504750Â´25', y: '4077905Â´68', esperadoX: 504750.25, esperadoY: 4077905.68 },
    
    // NUEVO v2.1: Coordenadas concatenadas
    { x: '5234004120000', y: '', esperadoX: 523400, esperadoY: 4120000 },
    { x: '4367804136578', y: 'Pendiente', esperadoX: 436780, esperadoY: 4136578 },
    { x: '5047504077153', y: '5047504077153', esperadoX: 504750, esperadoY: 4077153 },
    
    // NUEVO v2.2: Formatos espaciales WKT
    { x: 'POINT(504750 4077905)', y: '', esperadoX: 504750, esperadoY: 4077905 },
    { x: 'POINT(504750.92 4077905.36)', y: 'Pendiente', esperadoX: 504750.92, esperadoY: 4077905.36 },
    { x: 'point(436780, 4136578)', y: '', esperadoX: 436780, esperadoY: 4136578 },
    
    // NUEVO v2.2: Formatos espaciales GeoJSON
    { x: '{"type":"Point","coordinates":[504750,4077905]}', y: '', esperadoX: 504750, esperadoY: 4077905 },
    { x: '{"type":"Point","coordinates":[505438.13,4078875.09]}', y: 'N/A', esperadoX: 505438.13, esperadoY: 4078875.09 },
  ];
  
  console.log('\n🧪 EJECUTANDO TESTS DE NORMALIZACIÓN v2.2\n');
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
    console.log(`  Patrones: X=${resultado.normalizacionX.patronDetectado}, Y=${resultado.normalizacionY.patronDetectado}`);
    
    if (resultado.concatenacionDetectada) {
      console.log(`  📎 Concatenación detectada y separada`);
    }
    
    if (!xOk || !yOk) {
      console.log(`  ⚠ FALLO: X ${xOk ? 'OK' : 'FAIL'}, Y ${yOk ? 'OK' : 'FAIL'}`);
    }
    
    console.log('');
  });
  
  console.log('═'.repeat(70));
  console.log(`\n📊 RESUMEN: ${pasados} pasados, ${fallidos} fallidos de ${casos.length} tests\n`);
}

// ============================================================================
// ALIASES PARA COMPATIBILIDAD CON IMPORTS EN INGLÉS
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
  detectarPatron,
  esPlaceholder,
  detectarIntercambioXY,
  formatearCoordenada,
  generarDiagnostico,
  ejecutarTests,
  RANGOS_ANDALUCIA,
};
