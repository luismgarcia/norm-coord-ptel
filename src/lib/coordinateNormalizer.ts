/**
 * PTEL Andalucía - Normalizador de Coordenadas v2.0
 * 
 * Implementa la taxonomía completa de 52 patrones de coordenadas
 * identificados en documentos municipales andaluces.
 * 
 * Sistema objetivo: EPSG:25830 (UTM Zona 30N, ETRS89)
 * 
 * @version 2.0.0
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
  if (/['']/.test(v) && /\d+['\']\d+/.test(v)) {
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
// FUNCIONES DE NORMALIZACIÓN
// ============================================================================

/**
 * Normaliza una coordenada aplicando el pipeline completo de transformaciones.
 * 
 * Pipeline:
 * 1. Limpieza inicial y detección placeholder
 * 2. Corrección mojibake UTF-8/Windows-1252
 * 3. Normalización caracteres especiales (tildes, comillas)
 * 4. Eliminación espacios entre dígitos
 * 5. Normalización formato europeo
 * 6. Parsing numérico
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
  
  // Eliminar todos los espacios entre dígitos
  // Pero primero: detectar si hay patrón "dígitos espacio dígitos punto dígitos"
  // que indica decimales implícitos: "506 527 28" → "506527.28"
  
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
  const valorAntesFase4 = valor;
  
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
  
  // ══════════════════════════════════════════════════════════════════════════
  // CHECK 1: ¿Es coordenada X válida?
  // ══════════════════════════════════════════════════════════════════════════
  if (valor >= RANGOS_ANDALUCIA.UTM.X_MIN && valor <= RANGOS_ANDALUCIA.UTM.X_MAX) {
    return {
      valido: true,
      tipo: 'X',
      confianza: 'ALTA',
      warnings,
    };
  }
  
  // ══════════════════════════════════════════════════════════════════════════
  // CHECK 2: ¿Es coordenada Y válida?
  // ══════════════════════════════════════════════════════════════════════════
  if (valor >= RANGOS_ANDALUCIA.UTM.Y_MIN && valor <= RANGOS_ANDALUCIA.UTM.Y_MAX) {
    return {
      valido: true,
      tipo: 'Y',
      confianza: 'ALTA',
      warnings,
    };
  }
  
  // ══════════════════════════════════════════════════════════════════════════
  // CHECK 3: ¿Es Y truncada (falta el "4" inicial)?
  // ══════════════════════════════════════════════════════════════════════════
  if (valor >= RANGOS_ANDALUCIA.Y_TRUNCADA.MIN && valor <= RANGOS_ANDALUCIA.Y_TRUNCADA.MAX) {
    const valorCorregido = valor + 4000000;
    
    // Verificar que el valor corregido está en rango válido
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
  
  // ══════════════════════════════════════════════════════════════════════════
  // CHECK 4: ¿Es coordenada geográfica (latitud)?
  // ══════════════════════════════════════════════════════════════════════════
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
  
  // ══════════════════════════════════════════════════════════════════════════
  // CHECK 5: ¿Es coordenada geográfica (longitud)?
  // ══════════════════════════════════════════════════════════════════════════
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
  
  // ══════════════════════════════════════════════════════════════════════════
  // FUERA DE RANGO
  // ══════════════════════════════════════════════════════════════════════════
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
  // Patrón típico de intercambio: X tiene valor de Y (>2M) y Y tiene valor de X (<1M)
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
 */
export function procesarParCoordenadas(
  xInput: string,
  yInput: string,
  opciones: {
    aplicarCorreccionP0?: boolean;
    detectarIntercambio?: boolean;
    epsgAsumido?: number;
  } = {}
): ParCoordenadas {
  const {
    aplicarCorreccionP0 = true,
    detectarIntercambio = true,
    epsgAsumido = 25830,
  } = opciones;
  
  // Normalizar ambas coordenadas
  const normX = normalizarCoordenada(xInput);
  const normY = normalizarCoordenada(yInput);
  
  let x = normX.valorNormalizado;
  let y = normY.valorNormalizado;
  let validX: ResultadoValidacion | null = null;
  let validY: ResultadoValidacion | null = null;
  let intercambioAplicado = false;
  
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
  ];
  
  console.log('\n🧪 EJECUTANDO TESTS DE NORMALIZACIÓN\n');
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
    
    if (!xOk || !yOk) {
      console.log(`  ⚠ FALLO: X ${xOk ? 'OK' : 'FAIL'}, Y ${yOk ? 'OK' : 'FAIL'}`);
    }
    
    console.log('');
  });
  
  console.log('═'.repeat(70));
  console.log(`\n📊 RESUMEN: ${pasados} pasados, ${fallidos} fallidos de ${casos.length} tests\n`);
}

// ============================================================================
// EXPORTACIÓN POR DEFECTO
// ============================================================================

export default {
  normalizarCoordenada,
  validarCoordenada,
  procesarParCoordenadas,
  detectarPatron,
  esPlaceholder,
  detectarIntercambioXY,
  formatearCoordenada,
  generarDiagnostico,
  ejecutarTests,
  RANGOS_ANDALUCIA,
};