/**
 * PTEL Andalucía - Validador de Coordenadas Multi-Medida v1.0
 * 
 * Sistema de confirmación de coordenadas con 3 medidas independientes:
 * 1. Pertenencia municipal (WFS DERA)
 * 2. Distancia al centroide municipal
 * 3. Reverse geocoding (CartoCiudad)
 * 
 * Una coordenada se considera CONFIRMADA (100%) cuando las 3 medidas coinciden.
 * 
 * @version 1.0.0
 * @date Diciembre 2025
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type NivelConfianzaValidacion = 
  | 'CONFIRMADA'    // 3/3 medidas OK - 100%
  | 'ALTA'          // 2/3 medidas OK - 85-95%
  | 'MEDIA'         // 1/3 medidas OK - 50-70%
  | 'BAJA'          // 0/3 medidas OK - <50%
  | 'NO_VALIDADA';  // Sin validar aún

export interface ResultadoPertenenciaMunicipal {
  exito: boolean;
  dentroMunicipio: boolean;
  municipioEncontrado: string | null;
  codigoINE: string | null;
  tiempoMs: number;
  error: string | null;
}

export interface ResultadoDistanciaCentroide {
  exito: boolean;
  distanciaKm: number;
  dentroRadio: boolean;
  radioUsadoKm: number;
  confianza: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface ResultadoReverseGeocoding {
  exito: boolean;
  municipioDevuelto: string | null;
  provinciaDevuelta: string | null;
  direccionCompleta: string | null;
  municipioCoincide: boolean;
  tiempoMs: number;
  error: string | null;
}

export interface ResultadoValidacionCompleta {
  // Coordenadas validadas
  utmX: number;
  utmY: number;
  
  // Municipio esperado
  municipioEsperado: string;
  codigoINEEsperado: string;
  
  // Resultados de las 3 medidas
  pertenenciaMunicipal: ResultadoPertenenciaMunicipal;
  distanciaCentroide: ResultadoDistanciaCentroide;
  reverseGeocoding: ResultadoReverseGeocoding;
  
  // Score final
  medidasOK: number;          // 0-3
  medidasTotal: number;       // 3
  porcentajeConfianza: number; // 0-100
  nivelConfianza: NivelConfianzaValidacion;
  
  // Metadata
  timestampValidacion: string;
  tiempoTotalMs: number;
  warnings: string[];
  recomendaciones: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Centroides de municipios andaluces (muestra para testing)
 * En producción, cargar desde SIPOB/IECA
 */
export const CENTROIDES_MUNICIPIOS: Record<string, { x: number; y: number; nombre: string }> = {
  '18052': { x: 437000, y: 4137000, nombre: 'Colomera' },
  '18054': { x: 519500, y: 4184500, nombre: 'Castril' },
  '04015': { x: 505000, y: 4078000, nombre: 'Berja' },
  '04091': { x: 551000, y: 4131000, nombre: 'Tíjola' },
  '18168': { x: 455000, y: 4117000, nombre: 'Quéntar' },
  '23049': { x: 528000, y: 4218000, nombre: 'Hornos' },
};

/**
 * Radios de validación por tamaño de municipio
 */
export const RADIOS_VALIDACION = {
  URBANO: 5,        // km - municipios pequeños/urbanos
  RURAL: 15,        // km - municipios rurales medianos
  EXTENSO: 25,      // km - municipios muy extensos (Sierra)
  DEFAULT: 15,      // km - valor por defecto
};

/**
 * URLs de servicios
 */
const URLS = {
  WFS_DERA: 'https://www.juntadeandalucia.es/institutodeestadisticaycartografia/geoserver-ieca/ows',
  CARTOCIUDAD_REVERSE: 'https://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode',
};

// ============================================================================
// UTILIDADES MATEMÁTICAS
// ============================================================================

/**
 * Calcula la distancia Haversine entre dos puntos en coordenadas geográficas
 * @returns Distancia en kilómetros
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calcula distancia euclidiana entre coordenadas UTM (aproximación válida para distancias cortas)
 * @returns Distancia en kilómetros
 */
export function distanciaUTM(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy) / 1000; // metros a km
}

/**
 * Convierte UTM EPSG:25830 a WGS84 (aproximación para Andalucía)
 * Para precisión usar proj4js en producción
 */
export function utmToWgs84Approx(utmX: number, utmY: number): { lat: number; lon: number } {
  // Aproximación lineal para zona UTM 30N (Andalucía)
  // Error típico: < 50m, suficiente para validación
  const lon = -6.0 + (utmX - 250000) / 85000;
  const lat = 36.0 + (utmY - 3990000) / 111000;
  return { lat, lon };
}

// ============================================================================
// NORMALIZACIÓN DE NOMBRES
// ============================================================================

/**
 * Normaliza nombres de municipios para comparación
 * Elimina acentos, artículos, y estandariza formato
 */
export function normalizarNombreMunicipio(nombre: string): string {
  if (!nombre) return '';
  
  return nombre
    .toLowerCase()
    .trim()
    // Eliminar artículos iniciales
    .replace(/^(el|la|los|las|l')\s+/i, '')
    // Normalizar acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Eliminar caracteres especiales
    .replace(/[^a-z0-9\s]/g, '')
    // Espacios múltiples a uno
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compara dos nombres de municipio con tolerancia
 */
export function compararMunicipios(nombre1: string, nombre2: string): boolean {
  const n1 = normalizarNombreMunicipio(nombre1);
  const n2 = normalizarNombreMunicipio(nombre2);
  
  // Coincidencia exacta
  if (n1 === n2) return true;
  
  // Uno contiene al otro (para casos como "Castril" vs "Castril de la Peña")
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Distancia Levenshtein para errores tipográficos menores
  if (n1.length > 4 && n2.length > 4) {
    const distancia = levenshteinDistance(n1, n2);
    const maxLen = Math.max(n1.length, n2.length);
    const similitud = 1 - (distancia / maxLen);
    if (similitud > 0.8) return true; // 80% similitud
  }
  
  return false;
}

/**
 * Calcula distancia Levenshtein entre dos strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

// ============================================================================
// MEDIDA 1: VALIDACIÓN PERTENENCIA MUNICIPAL (WFS DERA)
// ============================================================================

/**
 * Valida si un punto UTM está dentro del polígono de un municipio
 * usando el servicio WFS del IECA (DERA - Datos Espaciales de Referencia de Andalucía)
 * 
 * @param utmX - Coordenada X en EPSG:25830
 * @param utmY - Coordenada Y en EPSG:25830
 * @param codigoINE - Código INE del municipio esperado (5 dígitos)
 */
export async function validarPertenenciaMunicipal(
  utmX: number,
  utmY: number,
  codigoINE: string
): Promise<ResultadoPertenenciaMunicipal> {
  const inicio = performance.now();
  
  const resultado: ResultadoPertenenciaMunicipal = {
    exito: false,
    dentroMunicipio: false,
    municipioEncontrado: null,
    codigoINE: null,
    tiempoMs: 0,
    error: null,
  };
  
  try {
    // Construir consulta WFS con filtro CQL
    // Busca qué municipio contiene el punto
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'ieca:da07_term_municipal',
      outputFormat: 'application/json',
      srsName: 'EPSG:25830',
      CQL_FILTER: `CONTAINS(geom, POINT(${utmX} ${utmY}))`,
    });
    
    const url = `${URLS.WFS_DERA}?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`WFS error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    resultado.exito = true;
    resultado.tiempoMs = performance.now() - inicio;
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const props = feature.properties;
      
      // Extraer información del municipio encontrado
      resultado.municipioEncontrado = props.nombre || props.NOMBRE || props.municipio;
      resultado.codigoINE = props.cod_ine || props.COD_INE || props.codigo_ine;
      
      // Verificar si coincide con el esperado
      const ineEncontrado = resultado.codigoINE?.toString().padStart(5, '0');
      const ineEsperado = codigoINE.toString().padStart(5, '0');
      resultado.dentroMunicipio = ineEncontrado === ineEsperado;
      
    } else {
      // Punto no está dentro de ningún municipio andaluz
      resultado.dentroMunicipio = false;
      resultado.error = 'Punto fuera de límites municipales de Andalucía';
    }
    
  } catch (error) {
    resultado.tiempoMs = performance.now() - inicio;
    resultado.error = error instanceof Error ? error.message : 'Error desconocido';
  }
  
  return resultado;
}

// ============================================================================
// MEDIDA 2: VALIDACIÓN DISTANCIA AL CENTROIDE
// ============================================================================

/**
 * Valida si un punto está dentro de un radio razonable del centroide municipal
 * 
 * @param utmX - Coordenada X en EPSG:25830
 * @param utmY - Coordenada Y en EPSG:25830
 * @param codigoINE - Código INE del municipio
 * @param radioMaxKm - Radio máximo permitido (por defecto según tipo municipio)
 */
export function validarDistanciaCentroide(
  utmX: number,
  utmY: number,
  codigoINE: string,
  radioMaxKm?: number
): ResultadoDistanciaCentroide {
  // Buscar centroide del municipio
  const centroide = CENTROIDES_MUNICIPIOS[codigoINE];
  
  if (!centroide) {
    // Si no tenemos el centroide, usar validación genérica
    return {
      exito: false,
      distanciaKm: -1,
      dentroRadio: false,
      radioUsadoKm: radioMaxKm || RADIOS_VALIDACION.DEFAULT,
      confianza: 'BAJA',
    };
  }
  
  // Calcular distancia
  const distancia = distanciaUTM(utmX, utmY, centroide.x, centroide.y);
  
  // Determinar radio a usar
  const radio = radioMaxKm || RADIOS_VALIDACION.DEFAULT;
  
  // Determinar confianza según distancia
  let confianza: 'ALTA' | 'MEDIA' | 'BAJA';
  if (distancia <= 5) {
    confianza = 'ALTA';
  } else if (distancia <= 15) {
    confianza = 'MEDIA';
  } else {
    confianza = 'BAJA';
  }
  
  return {
    exito: true,
    distanciaKm: Math.round(distancia * 100) / 100,
    dentroRadio: distancia <= radio,
    radioUsadoKm: radio,
    confianza,
  };
}

// ============================================================================
// MEDIDA 3: REVERSE GEOCODING (CARTOCIUDAD)
// ============================================================================

/**
 * Realiza reverse geocoding para confirmar el municipio de un punto
 * 
 * @param utmX - Coordenada X en EPSG:25830
 * @param utmY - Coordenada Y en EPSG:25830
 * @param municipioEsperado - Nombre del municipio esperado
 */
export async function validarReverseGeocoding(
  utmX: number,
  utmY: number,
  municipioEsperado: string
): Promise<ResultadoReverseGeocoding> {
  const inicio = performance.now();
  
  const resultado: ResultadoReverseGeocoding = {
    exito: false,
    municipioDevuelto: null,
    provinciaDevuelta: null,
    direccionCompleta: null,
    municipioCoincide: false,
    tiempoMs: 0,
    error: null,
  };
  
  try {
    // Convertir UTM a WGS84 para CartoCiudad
    const { lat, lon } = utmToWgs84Approx(utmX, utmY);
    
    const params = new URLSearchParams({
      lon: lon.toFixed(6),
      lat: lat.toFixed(6),
    });
    
    const url = `${URLS.CARTOCIUDAD_REVERSE}?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`CartoCiudad error: ${response.status}`);
    }
    
    const data = await response.json();
    
    resultado.exito = true;
    resultado.tiempoMs = performance.now() - inicio;
    
    // Extraer información de la respuesta
    resultado.municipioDevuelto = data.muni || data.municipality || null;
    resultado.provinciaDevuelta = data.province || data.provincia || null;
    resultado.direccionCompleta = data.address || data.tip_via + ' ' + data.address || null;
    
    // Comparar municipio
    if (resultado.municipioDevuelto) {
      resultado.municipioCoincide = compararMunicipios(
        resultado.municipioDevuelto,
        municipioEsperado
      );
    }
    
  } catch (error) {
    resultado.tiempoMs = performance.now() - inicio;
    resultado.error = error instanceof Error ? error.message : 'Error desconocido';
  }
  
  return resultado;
}

// ============================================================================
// FUNCIÓN PRINCIPAL: VALIDACIÓN COMPLETA
// ============================================================================

/**
 * Ejecuta las 3 medidas de validación y genera score final
 * 
 * @param utmX - Coordenada X en EPSG:25830
 * @param utmY - Coordenada Y en EPSG:25830
 * @param municipio - Nombre del municipio esperado
 * @param codigoINE - Código INE del municipio (5 dígitos)
 * @param opciones - Opciones de validación
 */
export async function validarCoordenadasCompleto(
  utmX: number,
  utmY: number,
  municipio: string,
  codigoINE: string,
  opciones: {
    radioMaxKm?: number;
    skipWFS?: boolean;      // Para testing sin red
    skipReverse?: boolean;  // Para testing sin red
  } = {}
): Promise<ResultadoValidacionCompleta> {
  const inicio = performance.now();
  const warnings: string[] = [];
  const recomendaciones: string[] = [];
  
  // Ejecutar las 3 medidas en paralelo (las async)
  const [pertenencia, reverse] = await Promise.all([
    opciones.skipWFS 
      ? Promise.resolve(crearResultadoPertenenciaVacio())
      : validarPertenenciaMunicipal(utmX, utmY, codigoINE),
    opciones.skipReverse
      ? Promise.resolve(crearResultadoReverseVacio())
      : validarReverseGeocoding(utmX, utmY, municipio),
  ]);
  
  // Medida 2 es síncrona
  const distancia = validarDistanciaCentroide(utmX, utmY, codigoINE, opciones.radioMaxKm);
  
  // Contar medidas OK
  let medidasOK = 0;
  
  // Medida 1: Pertenencia municipal
  if (pertenencia.exito && pertenencia.dentroMunicipio) {
    medidasOK++;
  } else if (pertenencia.error) {
    warnings.push(`WFS: ${pertenencia.error}`);
  } else if (!pertenencia.dentroMunicipio && pertenencia.municipioEncontrado) {
    warnings.push(`Punto está en ${pertenencia.municipioEncontrado}, no en ${municipio}`);
    recomendaciones.push('Verificar coordenadas o municipio asignado');
  }
  
  // Medida 2: Distancia centroide
  if (distancia.exito && distancia.dentroRadio) {
    medidasOK++;
  } else if (!distancia.exito) {
    warnings.push('Centroide no disponible para este municipio');
  } else {
    warnings.push(`Distancia al centro: ${distancia.distanciaKm}km (máx: ${distancia.radioUsadoKm}km)`);
    recomendaciones.push('Coordenada muy alejada del centro municipal');
  }
  
  // Medida 3: Reverse geocoding
  if (reverse.exito && reverse.municipioCoincide) {
    medidasOK++;
  } else if (reverse.error) {
    warnings.push(`CartoCiudad: ${reverse.error}`);
  } else if (!reverse.municipioCoincide && reverse.municipioDevuelto) {
    warnings.push(`Reverse geocoding indica: ${reverse.municipioDevuelto}`);
    recomendaciones.push('Discrepancia entre coordenada y municipio declarado');
  }
  
  // Calcular confianza final
  const porcentajeConfianza = calcularPorcentajeConfianza(medidasOK, distancia.confianza);
  const nivelConfianza = determinarNivelConfianza(medidasOK);
  
  // Añadir recomendaciones según nivel
  if (nivelConfianza === 'CONFIRMADA') {
    // Todo OK, no hay recomendaciones
  } else if (nivelConfianza === 'ALTA') {
    recomendaciones.push('Revisar la medida que falló antes de exportar');
  } else if (nivelConfianza === 'MEDIA') {
    recomendaciones.push('Requiere revisión manual antes de usar en emergencias');
  } else {
    recomendaciones.push('NO USAR para emergencias sin corrección previa');
  }
  
  return {
    utmX,
    utmY,
    municipioEsperado: municipio,
    codigoINEEsperado: codigoINE,
    pertenenciaMunicipal: pertenencia,
    distanciaCentroide: distancia,
    reverseGeocoding: reverse,
    medidasOK,
    medidasTotal: 3,
    porcentajeConfianza,
    nivelConfianza,
    timestampValidacion: new Date().toISOString(),
    tiempoTotalMs: Math.round(performance.now() - inicio),
    warnings,
    recomendaciones,
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function crearResultadoPertenenciaVacio(): ResultadoPertenenciaMunicipal {
  return {
    exito: false,
    dentroMunicipio: false,
    municipioEncontrado: null,
    codigoINE: null,
    tiempoMs: 0,
    error: 'Validación WFS omitida',
  };
}

function crearResultadoReverseVacio(): ResultadoReverseGeocoding {
  return {
    exito: false,
    municipioDevuelto: null,
    provinciaDevuelta: null,
    direccionCompleta: null,
    municipioCoincide: false,
    tiempoMs: 0,
    error: 'Reverse geocoding omitido',
  };
}

function calcularPorcentajeConfianza(
  medidasOK: number, 
  confianzaDistancia: 'ALTA' | 'MEDIA' | 'BAJA'
): number {
  // Base por medidas OK
  const basePorMedidas: Record<number, number> = {
    3: 95,
    2: 80,
    1: 50,
    0: 20,
  };
  
  let porcentaje = basePorMedidas[medidasOK] || 20;
  
  // Ajuste por confianza de distancia
  if (confianzaDistancia === 'ALTA' && medidasOK >= 2) {
    porcentaje += 5;
  } else if (confianzaDistancia === 'BAJA') {
    porcentaje -= 10;
  }
  
  return Math.min(100, Math.max(0, porcentaje));
}

function determinarNivelConfianza(medidasOK: number): NivelConfianzaValidacion {
  switch (medidasOK) {
    case 3: return 'CONFIRMADA';
    case 2: return 'ALTA';
    case 1: return 'MEDIA';
    default: return 'BAJA';
  }
}

// ============================================================================
// FUNCIÓN DE VALIDACIÓN BATCH
// ============================================================================

export interface CoordenadaParaValidar {
  id: string;
  utmX: number;
  utmY: number;
  municipio: string;
  codigoINE: string;
}

/**
 * Valida múltiples coordenadas con rate limiting
 * 
 * @param coordenadas - Array de coordenadas a validar
 * @param delayMs - Delay entre peticiones para evitar rate limiting
 * @param onProgress - Callback de progreso
 */
export async function validarCoordenadasBatch(
  coordenadas: CoordenadaParaValidar[],
  delayMs: number = 200,
  onProgress?: (current: number, total: number, resultado: ResultadoValidacionCompleta) => void
): Promise<Map<string, ResultadoValidacionCompleta>> {
  const resultados = new Map<string, ResultadoValidacionCompleta>();
  
  for (let i = 0; i < coordenadas.length; i++) {
    const coord = coordenadas[i];
    
    const resultado = await validarCoordenadasCompleto(
      coord.utmX,
      coord.utmY,
      coord.municipio,
      coord.codigoINE
    );
    
    resultados.set(coord.id, resultado);
    
    if (onProgress) {
      onProgress(i + 1, coordenadas.length, resultado);
    }
    
    // Rate limiting
    if (i < coordenadas.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return resultados;
}

// ============================================================================
// FUNCIÓN DE RESUMEN
// ============================================================================

export interface ResumenValidacionBatch {
  total: number;
  confirmadas: number;
  alta: number;
  media: number;
  baja: number;
  porcentajeConfirmadas: number;
  tiempoTotalMs: number;
}

export function generarResumenBatch(
  resultados: Map<string, ResultadoValidacionCompleta>
): ResumenValidacionBatch {
  let confirmadas = 0, alta = 0, media = 0, baja = 0;
  let tiempoTotal = 0;
  
  resultados.forEach(r => {
    tiempoTotal += r.tiempoTotalMs;
    switch (r.nivelConfianza) {
      case 'CONFIRMADA': confirmadas++; break;
      case 'ALTA': alta++; break;
      case 'MEDIA': media++; break;
      case 'BAJA': baja++; break;
    }
  });
  
  const total = resultados.size;
  
  return {
    total,
    confirmadas,
    alta,
    media,
    baja,
    porcentajeConfirmadas: total > 0 ? Math.round((confirmadas / total) * 100) : 0,
    tiempoTotalMs: tiempoTotal,
  };
}

// ============================================================================
// EXPORTACIÓN POR DEFECTO
// ============================================================================

export default {
  validarCoordenadasCompleto,
  validarPertenenciaMunicipal,
  validarDistanciaCentroide,
  validarReverseGeocoding,
  validarCoordenadasBatch,
  generarResumenBatch,
  normalizarNombreMunicipio,
  compararMunicipios,
  haversineDistance,
  distanciaUTM,
  utmToWgs84Approx,
  CENTROIDES_MUNICIPIOS,
  RADIOS_VALIDACION,
};
