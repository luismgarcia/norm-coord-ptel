/**
 * EducationGeocoder.ts
 * 
 * Cliente API para geocodificación de centros educativos
 * usando el portal de Datos Abiertos de la Junta de Andalucía (CKAN)
 * 
 * FUENTE OFICIAL: Consejería de Desarrollo Educativo y Formación Profesional
 * Directorio de centros docentes no universitarios de Andalucía
 * 
 * COBERTURA:
 * - ~3,800 centros educativos en Andalucía
 * - CEIP: Colegios de Educación Infantil y Primaria
 * - IES: Institutos de Educación Secundaria
 * - CPR: Colegios Públicos Rurales
 * - Guarderías y Escuelas Infantiles (0-3 años)
 * - Centros concertados y privados
 * - Centros de Educación Especial (CEEE)
 * - Centros de Formación Profesional
 * - EOI: Escuelas Oficiales de Idiomas
 * - Conservatorios de Música
 * 
 * DATOS INCLUIDOS:
 * - Código oficial de 8 dígitos
 * - Denominación genérica y específica
 * - Tipo de centro y titularidad
 * - Dirección postal completa
 * - Coordenadas lat/lon (WGS84)
 * 
 * ACTUALIZACIÓN: Anual (curso escolar)
 * ÚLTIMA: Enero 2025 (curso 2023/2024)
 * 
 * @version 1.0.0
 * @date 2025-11-28
 */

import proj4 from 'proj4';

// ============================================================================
// DEFINICIÓN PROJ4 PARA TRANSFORMACIÓN DE COORDENADAS
// ============================================================================

// Definir proyección UTM30 ETRS89 si no está registrada
if (!proj4.defs('EPSG:25830')) {
  proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
}

// ============================================================================
// TIPOS
// ============================================================================

export interface EducationCenter {
  /** Código oficial del centro (8 dígitos) */
  codigo: string;
  /** Denominación genérica (CEIP, IES, etc.) */
  denominacionGenerica: string;
  /** Denominación específica (nombre del centro) */
  denominacionEspecifica: string;
  /** Nombre completo (genérica + específica) */
  nombreCompleto: string;
  /** Tipo de centro */
  tipo: string;
  /** Titularidad (Público, Privado, Concertado) */
  titularidad: string;
  /** Dirección postal */
  direccion: string;
  /** Código postal */
  codigoPostal: string;
  /** Localidad */
  localidad: string;
  /** Municipio */
  municipio: string;
  /** Provincia */
  provincia: string;
  /** Teléfono */
  telefono: string;
  /** Coordenada X (en sistema solicitado) */
  x: number;
  /** Coordenada Y (en sistema solicitado) */
  y: number;
  /** Sistema de referencia de las coordenadas */
  srs: string;
  /** Latitud original WGS84 */
  latitud: number;
  /** Longitud original WGS84 */
  longitud: number;
}

export interface EducationQuery {
  /** Municipio donde buscar */
  municipio?: string;
  /** Provincia (código o nombre) */
  provincia?: string;
  /** Nombre del centro a buscar */
  nombreBuscado?: string;
  /** Tipo de centro (CEIP, IES, etc.) */
  tipoCentro?: string;
  /** Titularidad (Público, Privado, Concertado) */
  titularidad?: 'Público' | 'Privado' | 'Concertado';
  /** Sistema de referencia deseado para output */
  srsOutput?: 'EPSG:25830' | 'EPSG:4326';
  /** Límite de resultados (max 1000 por página) */
  maxResults?: number;
}

export interface EducationResult {
  success: boolean;
  centers: EducationCenter[];
  bestMatch: EducationCenter | null;
  matchScore: number;
  totalRecords: number;
  source: 'JUNTA_ANDALUCIA_EDUCACION';
  queryTime: number;
  error?: string;
}

// ============================================================================
// CONFIGURACIÓN API
// ============================================================================

const API_CONFIG = {
  // Endpoint CKAN de Datos Abiertos Junta de Andalucía
  baseUrl: 'https://www.juntadeandalucia.es/datosabiertos/portal/api/3/action/datastore_search',
  // Resource ID del directorio de centros educativos
  resourceId: '15aabed2-eec3-4b99-a027-9af5e27c9cac',
  timeout: 20000, // 20 segundos (API puede ser lenta)
  defaultLimit: 500,
  maxLimit: 1000,
};


// ============================================================================
// MAPEO DE PROVINCIAS
// ============================================================================

const PROVINCIAS_ANDALUCIA: Record<string, string> = {
  'almeria': 'Almería',
  'almería': 'Almería',
  'cadiz': 'Cádiz',
  'cádiz': 'Cádiz',
  'cordoba': 'Córdoba',
  'córdoba': 'Córdoba',
  'granada': 'Granada',
  'huelva': 'Huelva',
  'jaen': 'Jaén',
  'jaén': 'Jaén',
  'malaga': 'Málaga',
  'málaga': 'Málaga',
  'sevilla': 'Sevilla',
};

function normalizeProvincia(provincia: string): string {
  const key = provincia.toLowerCase().trim();
  return PROVINCIAS_ANDALUCIA[key] || provincia;
}

// ============================================================================
// NORMALIZACIÓN DE TEXTO
// ============================================================================

/**
 * Normaliza texto para comparación
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza nombre de centro educativo para fuzzy matching
 * Elimina prefijos comunes (CEIP, IES, etc.)
 */
function normalizeNombreCentro(nombre: string): string {
  return normalizeText(nombre)
    .replace(/^(c\.e\.i\.p\.|ceip|c\.p\.|cp|i\.e\.s\.|ies|c\.p\.r\.|cpr|e\.o\.i\.|eoi|c\.e\.e\.e\.|ceee|c\.e\.p\.e\.r\.|ceper|colegio|instituto|escuela|centro)\s*/i, '')
    .trim();
}

/**
 * Extrae tipo de centro del nombre
 */
function extractTipoCentro(denominacion: string): string {
  const upper = denominacion.toUpperCase();
  
  if (upper.includes('C.E.I.P.') || upper.includes('CEIP')) return 'CEIP';
  if (upper.includes('I.E.S.') || upper.includes('IES')) return 'IES';
  if (upper.includes('C.P.R.') || upper.includes('CPR')) return 'CPR';
  if (upper.includes('E.O.I.') || upper.includes('EOI')) return 'EOI';
  if (upper.includes('C.E.E.E.') || upper.includes('CEEE')) return 'CEEE';
  if (upper.includes('CONSERVATORIO')) return 'CONSERVATORIO';
  if (upper.includes('GUARDERIA') || upper.includes('GUARDERÍA')) return 'GUARDERIA';
  if (upper.includes('ESCUELA INFANTIL')) return 'ESCUELA_INFANTIL';
  
  return 'OTRO';
}

// ============================================================================
// FUZZY MATCHING
// ============================================================================

/**
 * Distancia de Levenshtein normalizada
 */
function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return len2 === 0 ? 0 : 1;
  if (len2 === 0) return 1;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  return matrix[len1][len2] / Math.max(len1, len2);
}

/**
 * Calcula score de similitud (0-100)
 */
function calculateMatchScore(searched: string, found: string): number {
  const s1 = normalizeNombreCentro(searched);
  const s2 = normalizeNombreCentro(found);
  
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 90;
  
  const distance = levenshteinDistance(s1, s2);
  return Math.max(0, Math.round((1 - distance) * 100));
}

/**
 * Encuentra mejor match
 */
function findBestMatch(
  centers: EducationCenter[],
  nombreBuscado: string
): { center: EducationCenter | null; score: number } {
  if (!nombreBuscado || centers.length === 0) {
    return { center: centers[0] || null, score: centers.length > 0 ? 50 : 0 };
  }
  
  let bestCenter: EducationCenter | null = null;
  let bestScore = 0;
  
  for (const center of centers) {
    // Comparar con nombre completo y específico
    const scoreCompleto = calculateMatchScore(nombreBuscado, center.nombreCompleto);
    const scoreEspecifico = calculateMatchScore(nombreBuscado, center.denominacionEspecifica);
    const score = Math.max(scoreCompleto, scoreEspecifico);
    
    if (score > bestScore) {
      bestScore = score;
      bestCenter = center;
    }
  }
  
  return { center: bestCenter, score: bestScore };
}


// ============================================================================
// TRANSFORMACIÓN DE COORDENADAS
// ============================================================================

/**
 * Transforma coordenadas de WGS84 a UTM30 ETRS89
 */
function transformToUTM30(lon: number, lat: number): [number, number] {
  try {
    const result = proj4('EPSG:4326', 'EPSG:25830', [lon, lat]);
    return [result[0], result[1]];
  } catch {
    console.warn(`[Education] Error transformando coordenadas: ${lon}, ${lat}`);
    return [0, 0];
  }
}

// ============================================================================
// CACHE EN MEMORIA
// ============================================================================

interface CacheEntry {
  data: EducationCenter[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

function getCacheKey(query: EducationQuery): string {
  return `edu:${query.municipio || ''}:${query.provincia || ''}:${query.tipoCentro || ''}`;
}

function getFromCache(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return entry;
}

function setCache(key: string, data: EducationCenter[]): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearExpiredCache(): number {
  let cleared = 0;
  const now = Date.now();
  
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
      cleared++;
    }
  }
  
  return cleared;
}

export function getCacheStats(): { entries: number; oldestMs: number } {
  let oldest = Date.now();
  
  for (const entry of cache.values()) {
    if (entry.timestamp < oldest) oldest = entry.timestamp;
  }
  
  return {
    entries: cache.size,
    oldestMs: cache.size > 0 ? Date.now() - oldest : 0,
  };
}

// ============================================================================
// CONSTRUCCIÓN DE CONSULTA
// ============================================================================

/**
 * Construye URL para la API CKAN
 */
function buildQueryUrl(query: EducationQuery): string {
  const params = new URLSearchParams({
    resource_id: API_CONFIG.resourceId,
    limit: String(query.maxResults || API_CONFIG.defaultLimit),
  });

  // Construir filtros
  const filters: Record<string, string> = {};
  
  if (query.provincia) {
    filters['Provincia'] = normalizeProvincia(query.provincia);
  }
  
  if (query.titularidad) {
    filters['Régimen'] = query.titularidad;
  }

  if (Object.keys(filters).length > 0) {
    params.append('filters', JSON.stringify(filters));
  }

  // Búsqueda textual (municipio + nombre)
  const searchTerms: string[] = [];
  if (query.municipio) {
    searchTerms.push(query.municipio);
  }
  if (query.nombreBuscado) {
    searchTerms.push(query.nombreBuscado);
  }
  if (query.tipoCentro) {
    searchTerms.push(query.tipoCentro);
  }
  
  if (searchTerms.length > 0) {
    params.append('q', searchTerms.join(' '));
  }

  return `${API_CONFIG.baseUrl}?${params.toString()}`;
}


// ============================================================================
// PARSER DE RESPUESTA API CKAN
// ============================================================================

interface CKANRecord {
  _id: number;
  Código: string;
  'Denominación Genérica': string;
  'Denominación Específica': string;
  Tipo: string;
  Régimen: string;
  Dirección: string;
  'Código Postal': string;
  Localidad: string;
  Municipio: string;
  Provincia: string;
  Teléfono: string;
  Latitud: number | string;
  Longitud: number | string;
  [key: string]: unknown;
}

interface CKANResponse {
  success: boolean;
  result: {
    records: CKANRecord[];
    total: number;
    _links?: {
      next?: string;
    };
  };
}

/**
 * Parsea respuesta CKAN a nuestro modelo
 */
function parseCKANResponse(
  data: CKANResponse,
  srsOutput: 'EPSG:25830' | 'EPSG:4326'
): { centers: EducationCenter[]; total: number } {
  if (!data.success || !data.result?.records) {
    return { centers: [], total: 0 };
  }

  const centers: EducationCenter[] = [];

  for (const record of data.result.records) {
    // Parsear coordenadas
    const lat = typeof record.Latitud === 'string' 
      ? parseFloat(record.Latitud) 
      : record.Latitud;
    const lon = typeof record.Longitud === 'string' 
      ? parseFloat(record.Longitud) 
      : record.Longitud;

    // Saltar registros sin coordenadas válidas
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      continue;
    }

    // Validar que están en rango Andalucía
    if (lat < 35 || lat > 39 || lon < -8 || lon > -1) {
      continue;
    }

    // Calcular coordenadas en sistema solicitado
    let x: number, y: number;
    if (srsOutput === 'EPSG:25830') {
      [x, y] = transformToUTM30(lon, lat);
    } else {
      x = lon;
      y = lat;
    }

    const denominacionGenerica = record['Denominación Genérica'] || '';
    const denominacionEspecifica = record['Denominación Específica'] || '';
    
    centers.push({
      codigo: record.Código || '',
      denominacionGenerica,
      denominacionEspecifica,
      nombreCompleto: `${denominacionGenerica} ${denominacionEspecifica}`.trim(),
      tipo: extractTipoCentro(denominacionGenerica),
      titularidad: record.Régimen || '',
      direccion: record.Dirección || '',
      codigoPostal: record['Código Postal'] || '',
      localidad: record.Localidad || '',
      municipio: record.Municipio || '',
      provincia: record.Provincia || '',
      telefono: record.Teléfono || '',
      x,
      y,
      srs: srsOutput,
      latitud: lat,
      longitud: lon,
    });
  }

  return { centers, total: data.result.total };
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE GEOCODIFICACIÓN
// ============================================================================

/**
 * Geocodifica un centro educativo usando la API de Datos Abiertos
 * 
 * @example
 * // Buscar CEIP en Colomera
 * const result = await geocodeEducationCenter({
 *   municipio: 'Colomera',
 *   provincia: 'Granada',
 *   nombreBuscado: 'Juan Alonso Rivas',
 * });
 * 
 * if (result.success && result.bestMatch) {
 *   console.log(`Encontrado: ${result.bestMatch.nombreCompleto}`);
 *   console.log(`Coordenadas: ${result.bestMatch.x}, ${result.bestMatch.y}`);
 * }
 */
export async function geocodeEducationCenter(query: EducationQuery): Promise<EducationResult> {
  const startTime = performance.now();
  const srs = query.srsOutput || 'EPSG:25830';
  
  const result: EducationResult = {
    success: false,
    centers: [],
    bestMatch: null,
    matchScore: 0,
    totalRecords: 0,
    source: 'JUNTA_ANDALUCIA_EDUCACION',
    queryTime: 0,
  };

  try {
    // Verificar cache
    const cacheKey = getCacheKey(query);
    const cached = getFromCache(cacheKey);
    
    let centers: EducationCenter[];
    let total: number;
    
    if (cached) {
      console.log(`[Education] Cache hit para ${query.municipio || query.provincia}`);
      centers = cached.data;
      total = centers.length;
    } else {
      // Construir y ejecutar query
      const url = buildQueryUrl(query);
      console.log(`[Education] Consultando API...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CKANResponse = await response.json();
      const parsed = parseCKANResponse(data, srs);
      
      centers = parsed.centers;
      total = parsed.total;

      // Guardar en cache
      setCache(cacheKey, centers);
      
      console.log(`[Education] Encontrados ${centers.length} centros (total API: ${total})`);
    }

    // Filtrar por municipio si se especificó (búsqueda textual puede traer otros)
    if (query.municipio) {
      const munNorm = normalizeText(query.municipio);
      centers = centers.filter(c => 
        normalizeText(c.municipio).includes(munNorm) ||
        normalizeText(c.localidad).includes(munNorm)
      );
    }

    result.centers = centers;
    result.totalRecords = total;

    // Encontrar mejor match
    if (centers.length > 0) {
      const { center, score } = findBestMatch(centers, query.nombreBuscado || '');
      result.bestMatch = center;
      result.matchScore = score;
      result.success = true;
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      result.error = `Timeout después de ${API_CONFIG.timeout}ms`;
    } else {
      result.error = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  result.queryTime = Math.round(performance.now() - startTime);
  return result;
}


// ============================================================================
// FUNCIONES AUXILIARES PÚBLICAS
// ============================================================================

/**
 * Obtiene todos los centros educativos de un municipio
 */
export async function getAllEducationCentersInMunicipality(
  municipio: string,
  provincia?: string
): Promise<EducationCenter[]> {
  const result = await geocodeEducationCenter({
    municipio,
    provincia,
    maxResults: API_CONFIG.maxLimit,
  });

  return result.centers;
}

/**
 * Obtiene centros educativos por tipo
 */
export async function getEducationCentersByType(
  tipo: 'CEIP' | 'IES' | 'CPR' | 'EOI' | 'GUARDERIA' | 'CONSERVATORIO',
  provincia?: string,
  maxResults = 100
): Promise<EducationCenter[]> {
  const result = await geocodeEducationCenter({
    provincia,
    tipoCentro: tipo,
    maxResults,
  });

  // Filtrar por tipo exacto (la API hace búsqueda textual)
  return result.centers.filter(c => c.tipo === tipo);
}

/**
 * Busca centros educativos por código oficial
 */
export async function getEducationCenterByCode(codigo: string): Promise<EducationCenter | null> {
  // El código es único, buscamos directamente
  const url = new URL(API_CONFIG.baseUrl);
  url.searchParams.set('resource_id', API_CONFIG.resourceId);
  url.searchParams.set('filters', JSON.stringify({ 'Código': codigo }));
  url.searchParams.set('limit', '1');

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data: CKANResponse = await response.json();
    const { centers } = parseCKANResponse(data, 'EPSG:25830');
    
    return centers[0] || null;
  } catch {
    return null;
  }
}

/**
 * Verifica disponibilidad de la API
 */
export async function checkAPIAvailability(): Promise<{
  available: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = performance.now();
  
  try {
    const url = new URL(API_CONFIG.baseUrl);
    url.searchParams.set('resource_id', API_CONFIG.resourceId);
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();

    return {
      available: data.success === true,
      responseTime: Math.round(performance.now() - startTime),
    };
  } catch (error) {
    return {
      available: false,
      responseTime: Math.round(performance.now() - startTime),
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene información del servicio
 */
export function getServiceInfo(): {
  baseUrl: string;
  resourceId: string;
  timeout: number;
  maxLimit: number;
} {
  return {
    baseUrl: API_CONFIG.baseUrl,
    resourceId: API_CONFIG.resourceId,
    timeout: API_CONFIG.timeout,
    maxLimit: API_CONFIG.maxLimit,
  };
}

/**
 * Obtiene estadísticas de tipos de centro por provincia
 */
export async function getCenterStatsByProvince(provincia: string): Promise<{
  total: number;
  byType: Record<string, number>;
  byTitularidad: Record<string, number>;
}> {
  const result = await geocodeEducationCenter({
    provincia,
    maxResults: API_CONFIG.maxLimit,
  });

  const byType: Record<string, number> = {};
  const byTitularidad: Record<string, number> = {};

  for (const center of result.centers) {
    byType[center.tipo] = (byType[center.tipo] || 0) + 1;
    byTitularidad[center.titularidad] = (byTitularidad[center.titularidad] || 0) + 1;
  }

  return {
    total: result.centers.length,
    byType,
    byTitularidad,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  geocodeEducationCenter,
  getAllEducationCentersInMunicipality,
  getEducationCentersByType,
  getEducationCenterByCode,
  checkAPIAvailability,
  getServiceInfo,
  getCenterStatsByProvince,
  clearExpiredCache,
  getCacheStats,
};

export type {
  EducationQuery,
  EducationResult,
  EducationCenter,
};
