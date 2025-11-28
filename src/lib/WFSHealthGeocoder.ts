/**
 * WFSHealthGeocoder.ts
 * 
 * Cliente WFS para geocodificación de infraestructuras sanitarias
 * usando el servicio DERA G12 del IECA (Instituto de Estadística y Cartografía de Andalucía)
 * 
 * FUENTE OFICIAL: SICESS (Sistema de Información de Centros, Establecimientos y Servicios Sanitarios)
 * del Servicio Andaluz de Salud (SAS)
 * 
 * CAPAS DISPONIBLES:
 * - g12_01_CentroSalud: Centros de atención primaria (~1,500 centros)
 *   → Consultorios médicos, Centros de Salud (CAP), Consultorios auxiliares
 * - g12_02_CentroAtencionEspecializada: Hospitales (~100 centros)
 *   → Hospitales públicos/privados, Centros periféricos de especialidades
 * 
 * PRECISIÓN: Coordenadas con calidad cartográfica 1:2.000
 * ACTUALIZACIÓN: Semestral (ciclo SICESS)
 * 
 * @version 1.0.0
 * @date 2025-11-28
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface HealthCenter {
  /** Código NICA - Identificador oficial único */
  nica: string;
  /** Denominación oficial del centro */
  nombre: string;
  /** Tipo de centro (Consultorio, Centro de Salud, Hospital...) */
  tipo: string;
  /** Dirección postal completa */
  direccion: string;
  /** Código postal */
  codigoPostal: string;
  /** Nombre del municipio */
  municipio: string;
  /** Código INE del municipio (5 dígitos) */
  codigoMunicipio: string;
  /** Provincia */
  provincia: string;
  /** Coordenada X en sistema solicitado */
  x: number;
  /** Coordenada Y en sistema solicitado */
  y: number;
  /** Sistema de referencia de las coordenadas */
  srs: string;
  /** Distancia al punto buscado (si aplica) */
  distancia?: number;
}

export interface WFSHealthQuery {
  /** Municipio donde buscar */
  municipio: string;
  /** Provincia (opcional, para desambiguación) */
  provincia?: string;
  /** Nombre del centro a buscar (para fuzzy matching) */
  nombreBuscado?: string;
  /** Buscar en hospitales además de atención primaria */
  incluirHospitales?: boolean;
  /** Sistema de referencia deseado */
  srsOutput?: 'EPSG:25830' | 'EPSG:4326' | 'EPSG:4258';
  /** Límite de resultados */
  maxResults?: number;
}

export interface WFSHealthResult {
  success: boolean;
  centers: HealthCenter[];
  bestMatch: HealthCenter | null;
  matchScore: number;
  source: 'SICESS_PRIMARIA' | 'SICESS_HOSPITALARIA';
  queryTime: number;
  error?: string;
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const WFS_CONFIG = {
  baseUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wfs',
  version: '2.0.0',
  layers: {
    primaria: 'DERA_g12_servicios:g12_01_CentroSalud',
    hospitalaria: 'DERA_g12_servicios:g12_02_CentroAtencionEspecializada',
  },
  // Mapeo de campos GML a nuestro modelo
  fieldMapping: {
    nica: 'nica',
    nombre: 'denominaci',  // denominación truncada en WFS
    tipo: 'tipo_centr',
    direccion: 'direccion',
    codigoPostal: 'cod_postal',
    municipio: 'municipio',
    codigoMunicipio: 'cod_mun',
    provincia: 'provincia',
  },
  timeout: 15000, // 15 segundos
  defaultSRS: 'EPSG:25830', // UTM30 ETRS89 (óptimo para QGIS Andalucía)
};


// ============================================================================
// NORMALIZACIÓN DE NOMBRES DE MUNICIPIOS
// ============================================================================

/**
 * Normaliza nombre de municipio para comparación WFS
 * Los datos SICESS usan mayúsculas y sin acentos en algunos campos
 */
function normalizeMunicipio(nombre: string): string {
  return nombre
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^A-Z0-9\s]/g, '')     // Solo alfanuméricos
    .trim();
}

/**
 * Normaliza nombre de centro para fuzzy matching
 */
function normalizeNombreCentro(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(centro de salud|consultorio|hospital|c\.s\.|c\.salud)\s*/i, '')
    .trim();
}

// ============================================================================
// CONSTRUCCIÓN DE CONSULTAS WFS
// ============================================================================

/**
 * Construye URL de consulta WFS GetFeature con filtro CQL
 */
function buildWFSUrl(layer: string, query: WFSHealthQuery): string {
  const params = new URLSearchParams({
    service: 'WFS',
    version: WFS_CONFIG.version,
    request: 'GetFeature',
    typeName: layer,
    outputFormat: 'application/json', // GeoJSON es más fácil de parsear
    srsName: query.srsOutput || WFS_CONFIG.defaultSRS,
  });

  // Construir filtro CQL
  const filters: string[] = [];
  
  // Filtro por municipio (obligatorio para reducir resultados)
  const municipioNorm = normalizeMunicipio(query.municipio);
  filters.push(`municipio ILIKE '%${municipioNorm}%'`);
  
  // Filtro por provincia (opcional, para desambiguación)
  if (query.provincia) {
    const provinciaNorm = normalizeMunicipio(query.provincia);
    filters.push(`provincia ILIKE '%${provinciaNorm}%'`);
  }

  if (filters.length > 0) {
    params.append('CQL_FILTER', filters.join(' AND '));
  }

  // Límite de resultados
  if (query.maxResults) {
    params.append('count', String(query.maxResults));
  }

  return `${WFS_CONFIG.baseUrl}?${params.toString()}`;
}

// ============================================================================
// PARSER DE RESPUESTA GEOJSON
// ============================================================================

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, string | number | null>;
}

interface GeoJSONResponse {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  numberMatched?: number;
  numberReturned?: number;
}

/**
 * Parsea respuesta GeoJSON del WFS a nuestro modelo
 */
function parseGeoJSONResponse(
  data: GeoJSONResponse, 
  srs: string,
  source: 'SICESS_PRIMARIA' | 'SICESS_HOSPITALARIA'
): HealthCenter[] {
  if (!data.features || !Array.isArray(data.features)) {
    return [];
  }

  return data.features
    .filter(f => f.geometry?.type === 'Point' && f.geometry?.coordinates)
    .map(feature => {
      const props = feature.properties || {};
      const coords = feature.geometry.coordinates;
      
      return {
        nica: String(props[WFS_CONFIG.fieldMapping.nica] || ''),
        nombre: String(props[WFS_CONFIG.fieldMapping.nombre] || ''),
        tipo: String(props[WFS_CONFIG.fieldMapping.tipo] || ''),
        direccion: String(props[WFS_CONFIG.fieldMapping.direccion] || ''),
        codigoPostal: String(props[WFS_CONFIG.fieldMapping.codigoPostal] || ''),
        municipio: String(props[WFS_CONFIG.fieldMapping.municipio] || ''),
        codigoMunicipio: String(props[WFS_CONFIG.fieldMapping.codigoMunicipio] || ''),
        provincia: String(props[WFS_CONFIG.fieldMapping.provincia] || ''),
        x: coords[0],
        y: coords[1],
        srs,
      };
    });
}


// ============================================================================
// FUZZY MATCHING (Sin dependencias externas - browser-compatible)
// ============================================================================

/**
 * Calcula distancia de Levenshtein normalizada (0-1)
 * 0 = idénticos, 1 = completamente diferentes
 */
function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // eliminación
        matrix[i][j - 1] + 1,      // inserción
        matrix[i - 1][j - 1] + cost // sustitución
      );
    }
  }
  
  return matrix[len1][len2] / Math.max(len1, len2);
}

/**
 * Calcula score de similitud (0-100)
 * 100 = match exacto, 0 = sin similitud
 */
function calculateMatchScore(searched: string, found: string): number {
  const s1 = normalizeNombreCentro(searched);
  const s2 = normalizeNombreCentro(found);
  
  // Match exacto
  if (s1 === s2) return 100;
  
  // Uno contiene al otro
  if (s1.includes(s2) || s2.includes(s1)) {
    return 90;
  }
  
  // Levenshtein
  const distance = levenshteinDistance(s1, s2);
  const score = Math.round((1 - distance) * 100);
  
  return Math.max(0, score);
}

/**
 * Encuentra el mejor match entre los centros encontrados
 */
function findBestMatch(
  centers: HealthCenter[], 
  nombreBuscado: string
): { center: HealthCenter | null; score: number } {
  if (!nombreBuscado || centers.length === 0) {
    return { center: centers[0] || null, score: centers.length > 0 ? 50 : 0 };
  }
  
  let bestCenter: HealthCenter | null = null;
  let bestScore = 0;
  
  for (const center of centers) {
    const score = calculateMatchScore(nombreBuscado, center.nombre);
    if (score > bestScore) {
      bestScore = score;
      bestCenter = center;
    }
  }
  
  return { center: bestCenter, score: bestScore };
}

// ============================================================================
// CACHE EN MEMORIA (Browser-compatible)
// ============================================================================

interface CacheEntry {
  data: HealthCenter[];
  timestamp: number;
  source: 'SICESS_PRIMARIA' | 'SICESS_HOSPITALARIA';
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

function getCacheKey(layer: string, municipio: string, provincia?: string): string {
  return `${layer}:${normalizeMunicipio(municipio)}:${provincia ? normalizeMunicipio(provincia) : ''}`;
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

function setCache(key: string, data: HealthCenter[], source: CacheEntry['source']): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    source,
  });
}

/**
 * Limpia entradas expiradas del cache
 */
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

/**
 * Obtiene estadísticas del cache
 */
export function getCacheStats(): { entries: number; oldestMs: number } {
  let oldest = Date.now();
  
  for (const entry of cache.values()) {
    if (entry.timestamp < oldest) {
      oldest = entry.timestamp;
    }
  }
  
  return {
    entries: cache.size,
    oldestMs: cache.size > 0 ? Date.now() - oldest : 0,
  };
}


// ============================================================================
// FUNCIÓN PRINCIPAL DE GEOCODIFICACIÓN
// ============================================================================

/**
 * Geocodifica un centro sanitario usando el servicio WFS DERA G12 (SICESS)
 * 
 * @example
 * // Buscar consultorio en Colomera
 * const result = await geocodeHealthCenter({
 *   municipio: 'Colomera',
 *   provincia: 'Granada',
 *   nombreBuscado: 'Consultorio Médico',
 * });
 * 
 * if (result.success && result.bestMatch) {
 *   console.log(`Encontrado: ${result.bestMatch.nombre}`);
 *   console.log(`Coordenadas: ${result.bestMatch.x}, ${result.bestMatch.y}`);
 *   console.log(`Score: ${result.matchScore}`);
 * }
 */
export async function geocodeHealthCenter(query: WFSHealthQuery): Promise<WFSHealthResult> {
  const startTime = performance.now();
  const srs = query.srsOutput || WFS_CONFIG.defaultSRS;
  
  // Resultado inicial
  const result: WFSHealthResult = {
    success: false,
    centers: [],
    bestMatch: null,
    matchScore: 0,
    source: 'SICESS_PRIMARIA',
    queryTime: 0,
  };

  try {
    // 1. Buscar primero en atención primaria (más probable para PTEL)
    const primaryCenters = await fetchCentersFromLayer(
      WFS_CONFIG.layers.primaria,
      query,
      srs,
      'SICESS_PRIMARIA'
    );
    
    result.centers = primaryCenters;
    result.source = 'SICESS_PRIMARIA';

    // 2. Si no hay resultados y se solicita, buscar en hospitales
    if (primaryCenters.length === 0 && query.incluirHospitales) {
      const hospitalCenters = await fetchCentersFromLayer(
        WFS_CONFIG.layers.hospitalaria,
        query,
        srs,
        'SICESS_HOSPITALARIA'
      );
      
      result.centers = hospitalCenters;
      result.source = 'SICESS_HOSPITALARIA';
    }

    // 3. Encontrar mejor match si hay nombre buscado
    if (result.centers.length > 0) {
      const { center, score } = findBestMatch(result.centers, query.nombreBuscado || '');
      result.bestMatch = center;
      result.matchScore = score;
      result.success = true;
    }

  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Error desconocido';
  }

  result.queryTime = Math.round(performance.now() - startTime);
  return result;
}

/**
 * Fetch centros desde una capa específica del WFS
 */
async function fetchCentersFromLayer(
  layer: string,
  query: WFSHealthQuery,
  srs: string,
  source: 'SICESS_PRIMARIA' | 'SICESS_HOSPITALARIA'
): Promise<HealthCenter[]> {
  // Verificar cache
  const cacheKey = getCacheKey(layer, query.municipio, query.provincia);
  const cached = getFromCache(cacheKey);
  
  if (cached) {
    console.log(`[WFSHealth] Cache hit para ${query.municipio}`);
    return cached.data;
  }

  // Construir URL
  const url = buildWFSUrl(layer, query);
  console.log(`[WFSHealth] Consultando: ${url}`);

  // Fetch con timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WFS_CONFIG.timeout);

  try {
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

    const data: GeoJSONResponse = await response.json();
    const centers = parseGeoJSONResponse(data, srs, source);

    // Guardar en cache
    setCache(cacheKey, centers, source);

    console.log(`[WFSHealth] Encontrados ${centers.length} centros en ${query.municipio}`);
    return centers;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout después de ${WFS_CONFIG.timeout}ms`);
    }
    
    throw error;
  }
}


// ============================================================================
// FUNCIONES AUXILIARES PÚBLICAS
// ============================================================================

/**
 * Obtiene todos los centros sanitarios de un municipio (sin filtrar por nombre)
 * Útil para pre-cargar datos y mostrar listas
 */
export async function getAllHealthCentersInMunicipality(
  municipio: string,
  provincia?: string,
  incluirHospitales = true
): Promise<HealthCenter[]> {
  const query: WFSHealthQuery = {
    municipio,
    provincia,
    incluirHospitales,
    maxResults: 100,
  };

  // Buscar en primaria
  const primaryCenters = await fetchCentersFromLayer(
    WFS_CONFIG.layers.primaria,
    query,
    WFS_CONFIG.defaultSRS,
    'SICESS_PRIMARIA'
  );

  // Buscar en hospitales si se solicita
  let hospitalCenters: HealthCenter[] = [];
  if (incluirHospitales) {
    hospitalCenters = await fetchCentersFromLayer(
      WFS_CONFIG.layers.hospitalaria,
      query,
      WFS_CONFIG.defaultSRS,
      'SICESS_HOSPITALARIA'
    );
  }

  return [...primaryCenters, ...hospitalCenters];
}

/**
 * Busca centros sanitarios por nombre en toda Andalucía
 * PRECAUCIÓN: Operación costosa, usar con moderación
 */
export async function searchHealthCenterByName(
  nombre: string,
  provincia?: string
): Promise<WFSHealthResult> {
  // Para búsqueda por nombre sin municipio, necesitamos estrategia diferente
  // Por ahora, retornamos error indicando que se necesita municipio
  return {
    success: false,
    centers: [],
    bestMatch: null,
    matchScore: 0,
    source: 'SICESS_PRIMARIA',
    queryTime: 0,
    error: 'Búsqueda por nombre requiere especificar municipio para eficiencia',
  };
}

/**
 * Verifica disponibilidad del servicio WFS
 */
export async function checkWFSAvailability(): Promise<{
  available: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = performance.now();
  
  try {
    const testUrl = new URL(WFS_CONFIG.baseUrl);
    testUrl.searchParams.set('service', 'WFS');
    testUrl.searchParams.set('request', 'GetCapabilities');

    const response = await fetch(testUrl.toString(), {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    return {
      available: response.ok,
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
 * Obtiene información del servicio WFS (capas disponibles, etc.)
 */
export function getServiceInfo(): {
  baseUrl: string;
  layers: typeof WFS_CONFIG.layers;
  version: string;
  defaultSRS: string;
} {
  return {
    baseUrl: WFS_CONFIG.baseUrl,
    layers: { ...WFS_CONFIG.layers },
    version: WFS_CONFIG.version,
    defaultSRS: WFS_CONFIG.defaultSRS,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  geocodeHealthCenter,
  getAllHealthCentersInMunicipality,
  searchHealthCenterByName,
  checkWFSAvailability,
  getServiceInfo,
  clearExpiredCache,
  getCacheStats,
};

// Re-export tipos
export type {
  WFSHealthQuery,
  WFSHealthResult,
  HealthCenter,
};
