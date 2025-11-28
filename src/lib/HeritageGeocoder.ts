/**
 * HeritageGeocoder.ts
 * 
 * Cliente WFS para geocodificación de patrimonio histórico-cultural
 * usando los servicios del Instituto Andaluz del Patrimonio Histórico (IAPH)
 * y el IDE Cultura de la Junta de Andalucía
 * 
 * FUENTES OFICIALES:
 * - IAPH Localizador Cartográfico: 5.887 sitios georreferenciados
 * - IDE Cultura GeoServer: Catálogo General Patrimonio Histórico Andaluz (CGPHA)
 * 
 * TIPOLOGÍAS CUBIERTAS:
 * - Bienes de Interés Cultural (BIC)
 * - Monumentos y edificios históricos
 * - Sitios arqueológicos (necrópolis, yacimientos, dólmenes)
 * - Arquitectura religiosa (iglesias, ermitas, conventos)
 * - Arquitectura defensiva (castillos, torres, murallas)
 * - Patrimonio civil (puentes históricos, fuentes, lavaderos)
 * - Conjuntos históricos
 * - Zonas patrimoniales
 * 
 * USO EN PTEL:
 * - Categoría CULTURAL del clasificador tipológico
 * - Categoría RELIGIOSO del clasificador tipológico
 * - Validación de elementos aislados (reduce penalización LOF)
 * 
 * @version 1.0.0
 * @date 2025-11-28
 */

import proj4 from 'proj4';

// ============================================================================
// DEFINICIÓN PROJ4
// ============================================================================

if (!proj4.defs('EPSG:25830')) {
  proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
}

// ============================================================================
// TIPOS
// ============================================================================

/** Nivel de protección patrimonial */
export type ProtectionLevel = 
  | 'BIC'                    // Bien de Interés Cultural (máxima protección)
  | 'CATALOGO_GENERAL'       // Catalogación general
  | 'INVENTARIO'             // Inventariado
  | 'SIN_PROTECCION'         // Documentado pero sin protección legal
  | 'DESCONOCIDO';

/** Tipología patrimonial */
export type HeritageType =
  | 'MONUMENTO'              // Edificios singulares
  | 'CONJUNTO_HISTORICO'     // Núcleos urbanos históricos
  | 'SITIO_HISTORICO'        // Lugares vinculados a eventos
  | 'ZONA_ARQUEOLOGICA'      // Yacimientos
  | 'ZONA_PATRIMONIAL'       // Territorios culturales
  | 'ARQUITECTURA_RELIGIOSA' // Iglesias, ermitas, conventos
  | 'ARQUITECTURA_DEFENSIVA' // Castillos, torres, murallas
  | 'ARQUITECTURA_CIVIL'     // Puentes, fuentes, edificios civiles
  | 'SITIO_ARQUEOLOGICO'     // Necrópolis, dólmenes, cuevas
  | 'PAISAJE_CULTURAL'       // Paisajes de interés
  | 'OTRO';

export interface HeritageSite {
  /** Identificador único del IAPH */
  id: string;
  /** Denominación oficial del bien */
  nombre: string;
  /** Tipología patrimonial */
  tipo: HeritageType;
  /** Nivel de protección legal */
  proteccion: ProtectionLevel;
  /** Descripción o caracterización */
  descripcion: string;
  /** Municipio */
  municipio: string;
  /** Provincia */
  provincia: string;
  /** Coordenada X (sistema solicitado) */
  x: number;
  /** Coordenada Y (sistema solicitado) */
  y: number;
  /** Sistema de referencia */
  srs: string;
  /** Coordenadas originales WGS84 */
  latitud: number;
  longitud: number;
  /** Fuente de datos */
  fuente: 'IAPH_LOCALIZADOR' | 'IDE_CULTURA_CGPHA';
  /** Época o período histórico */
  epoca?: string;
  /** Estilo artístico */
  estilo?: string;
}

export interface HeritageQuery {
  /** Municipio donde buscar */
  municipio?: string;
  /** Provincia */
  provincia?: string;
  /** Nombre del bien a buscar */
  nombreBuscado?: string;
  /** Filtrar por tipología */
  tipo?: HeritageType;
  /** Filtrar por nivel de protección */
  proteccion?: ProtectionLevel;
  /** Solo BIC (máxima protección) */
  soloBIC?: boolean;
  /** Sistema de referencia de salida */
  srsOutput?: 'EPSG:25830' | 'EPSG:4326';
  /** Límite de resultados */
  maxResults?: number;
  /** Incluir fuentes complementarias */
  incluirIDECultura?: boolean;
}

export interface HeritageResult {
  success: boolean;
  sites: HeritageSite[];
  bestMatch: HeritageSite | null;
  matchScore: number;
  totalRecords: number;
  sources: ('IAPH_LOCALIZADOR' | 'IDE_CULTURA_CGPHA')[];
  queryTime: number;
  error?: string;
}


// ============================================================================
// CONFIGURACIÓN DE SERVICIOS
// ============================================================================

const WFS_CONFIG = {
  // IAPH Localizador Cartográfico (principal)
  iaph: {
    baseUrl: 'https://www.iaph.es/ide/localizador/wfs',
    version: '2.0.0',
    typeName: 'localizador:Bien', // Ajustar según GetCapabilities real
    timeout: 20000,
  },
  // IDE Cultura GeoServer (CGPHA oficial)
  ideCultura: {
    baseUrl: 'https://ws096.juntadeandalucia.es/geoserver/bica_public/wfs',
    version: '2.0.0',
    typeName: 'bica_public:bien_inmueble', // Ajustar según GetCapabilities
    timeout: 20000,
  },
  defaultSRS: 'EPSG:25830',
};

// ============================================================================
// MAPEO DE PROVINCIAS ANDALUZAS
// ============================================================================

const PROVINCIAS: Record<string, string> = {
  'almeria': 'Almería', 'almería': 'Almería',
  'cadiz': 'Cádiz', 'cádiz': 'Cádiz',
  'cordoba': 'Córdoba', 'córdoba': 'Córdoba',
  'granada': 'Granada',
  'huelva': 'Huelva',
  'jaen': 'Jaén', 'jaén': 'Jaén',
  'malaga': 'Málaga', 'málaga': 'Málaga',
  'sevilla': 'Sevilla',
};

function normalizeProvincia(p: string): string {
  return PROVINCIAS[p.toLowerCase().trim()] || p;
}

// ============================================================================
// CLASIFICACIÓN DE TIPOLOGÍA PATRIMONIAL
// ============================================================================

/**
 * Detecta el tipo de patrimonio basándose en el nombre y descripción
 */
function detectHeritageType(nombre: string, descripcion = ''): HeritageType {
  const text = `${nombre} ${descripcion}`.toLowerCase();
  
  // Arquitectura religiosa
  if (/iglesia|ermita|parroquia|convento|monasterio|capilla|catedral|basílica|santuario/i.test(text)) {
    return 'ARQUITECTURA_RELIGIOSA';
  }
  
  // Arquitectura defensiva
  if (/castillo|fortaleza|alcazaba|torre|muralla|torreón|atalaya|alcázar/i.test(text)) {
    return 'ARQUITECTURA_DEFENSIVA';
  }
  
  // Sitios arqueológicos
  if (/necrópolis|yacimiento|dolmen|cueva|abrigo|megalit|rupestre|íbero|romano|visigod|árabe/i.test(text)) {
    return 'SITIO_ARQUEOLOGICO';
  }
  
  // Zona arqueológica (área extensa)
  if (/zona arqueológica|área arqueológica|complejo arqueológico/i.test(text)) {
    return 'ZONA_ARQUEOLOGICA';
  }
  
  // Conjunto histórico
  if (/conjunto histórico|casco histórico|centro histórico/i.test(text)) {
    return 'CONJUNTO_HISTORICO';
  }
  
  // Arquitectura civil
  if (/puente|fuente|lavadero|molino|acueducto|palacio|casa señorial|ayuntamiento histórico/i.test(text)) {
    return 'ARQUITECTURA_CIVIL';
  }
  
  // Paisaje cultural
  if (/paisaje|vega|campiña|sierra/i.test(text)) {
    return 'PAISAJE_CULTURAL';
  }
  
  // Monumento genérico
  if (/monumento|bien de interés cultural|bic/i.test(text)) {
    return 'MONUMENTO';
  }
  
  return 'OTRO';
}

/**
 * Detecta nivel de protección
 */
function detectProtectionLevel(texto: string): ProtectionLevel {
  const t = texto.toLowerCase();
  
  if (/\bbic\b|bien de interés cultural|interés cultural/i.test(t)) {
    return 'BIC';
  }
  if (/catálogo general|catalogación general/i.test(t)) {
    return 'CATALOGO_GENERAL';
  }
  if (/inventario|inventariado/i.test(t)) {
    return 'INVENTARIO';
  }
  
  return 'DESCONOCIDO';
}

// ============================================================================
// NORMALIZACIÓN DE TEXTO
// ============================================================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNombrePatrimonio(nombre: string): string {
  return normalizeText(nombre)
    .replace(/^(iglesia de|ermita de|castillo de|torre de|puente de|fuente de)\s*/i, '')
    .replace(/\s*(de|del|de la|de los|de las)\s*$/i, '')
    .trim();
}

// ============================================================================
// FUZZY MATCHING
// ============================================================================

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

function calculateMatchScore(searched: string, found: string): number {
  const s1 = normalizeNombrePatrimonio(searched);
  const s2 = normalizeNombrePatrimonio(found);
  
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 90;
  
  const distance = levenshteinDistance(s1, s2);
  return Math.max(0, Math.round((1 - distance) * 100));
}

function findBestMatch(
  sites: HeritageSite[],
  nombreBuscado: string
): { site: HeritageSite | null; score: number } {
  if (!nombreBuscado || sites.length === 0) {
    return { site: sites[0] || null, score: sites.length > 0 ? 50 : 0 };
  }
  
  let bestSite: HeritageSite | null = null;
  let bestScore = 0;
  
  for (const site of sites) {
    const score = calculateMatchScore(nombreBuscado, site.nombre);
    if (score > bestScore) {
      bestScore = score;
      bestSite = site;
    }
  }
  
  return { site: bestSite, score: bestScore };
}


// ============================================================================
// TRANSFORMACIÓN DE COORDENADAS
// ============================================================================

function transformToUTM30(lon: number, lat: number): [number, number] {
  try {
    const result = proj4('EPSG:4326', 'EPSG:25830', [lon, lat]);
    return [result[0], result[1]];
  } catch {
    console.warn(`[Heritage] Error transformando: ${lon}, ${lat}`);
    return [0, 0];
  }
}

// ============================================================================
// CACHE EN MEMORIA
// ============================================================================

interface CacheEntry {
  data: HeritageSite[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días (patrimonio cambia poco)

function getCacheKey(query: HeritageQuery, source: string): string {
  const mun = normalizeText(query.municipio || '');
  const prov = normalizeText(query.provincia || '');
  return `heritage:${source}:${mun}:${prov}:${query.tipo || ''}`;
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

function setCache(key: string, data: HeritageSite[]): void {
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
// CONSTRUCCIÓN DE CONSULTAS WFS
// ============================================================================

function buildIAPHUrl(query: HeritageQuery): string {
  const params = new URLSearchParams({
    service: 'WFS',
    version: WFS_CONFIG.iaph.version,
    request: 'GetFeature',
    typeName: WFS_CONFIG.iaph.typeName,
    outputFormat: 'application/json',
    srsName: query.srsOutput || WFS_CONFIG.defaultSRS,
  });

  // Filtro CQL
  const filters: string[] = [];
  
  if (query.municipio) {
    const mun = query.municipio.toUpperCase();
    filters.push(`municipio ILIKE '%${mun}%'`);
  }
  
  if (query.provincia) {
    const prov = normalizeProvincia(query.provincia).toUpperCase();
    filters.push(`provincia ILIKE '%${prov}%'`);
  }
  
  if (query.soloBIC) {
    filters.push(`proteccion ILIKE '%BIC%'`);
  }

  if (filters.length > 0) {
    params.append('CQL_FILTER', filters.join(' AND '));
  }

  if (query.maxResults) {
    params.append('count', String(query.maxResults));
  }

  return `${WFS_CONFIG.iaph.baseUrl}?${params.toString()}`;
}

function buildIDECulturaUrl(query: HeritageQuery): string {
  const params = new URLSearchParams({
    service: 'WFS',
    version: WFS_CONFIG.ideCultura.version,
    request: 'GetFeature',
    typeName: WFS_CONFIG.ideCultura.typeName,
    outputFormat: 'application/json',
    srsName: query.srsOutput || WFS_CONFIG.defaultSRS,
  });

  const filters: string[] = [];
  
  if (query.municipio) {
    filters.push(`municipio ILIKE '%${query.municipio.toUpperCase()}%'`);
  }
  
  if (query.provincia) {
    filters.push(`provincia ILIKE '%${normalizeProvincia(query.provincia).toUpperCase()}%'`);
  }

  if (filters.length > 0) {
    params.append('CQL_FILTER', filters.join(' AND '));
  }

  if (query.maxResults) {
    params.append('count', String(query.maxResults));
  }

  return `${WFS_CONFIG.ideCultura.baseUrl}?${params.toString()}`;
}


// ============================================================================
// PARSER DE RESPUESTAS WFS (GeoJSON)
// ============================================================================

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'Polygon' | 'MultiPolygon';
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown>;
}

interface GeoJSONResponse {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  numberMatched?: number;
}

/**
 * Extrae coordenadas del centroide de cualquier geometría
 */
function extractCentroid(geometry: GeoJSONFeature['geometry']): [number, number] | null {
  if (!geometry || !geometry.coordinates) return null;
  
  if (geometry.type === 'Point') {
    const coords = geometry.coordinates as number[];
    return [coords[0], coords[1]];
  }
  
  if (geometry.type === 'Polygon') {
    // Calcular centroide del primer anillo
    const ring = (geometry.coordinates as number[][][])[0];
    let sumX = 0, sumY = 0;
    for (const coord of ring) {
      sumX += coord[0];
      sumY += coord[1];
    }
    return [sumX / ring.length, sumY / ring.length];
  }
  
  if (geometry.type === 'MultiPolygon') {
    // Usar el primer polígono
    const firstPoly = (geometry.coordinates as number[][][][])[0];
    const ring = firstPoly[0];
    let sumX = 0, sumY = 0;
    for (const coord of ring) {
      sumX += coord[0];
      sumY += coord[1];
    }
    return [sumX / ring.length, sumY / ring.length];
  }
  
  return null;
}

/**
 * Parsea respuesta WFS del IAPH
 */
function parseIAPHResponse(
  data: GeoJSONResponse,
  srs: string
): HeritageSite[] {
  if (!data.features) return [];

  const sites: HeritageSite[] = [];

  for (const feature of data.features) {
    const coords = extractCentroid(feature.geometry);
    if (!coords) continue;

    const props = feature.properties;
    const nombre = String(props.denominacion || props.nombre || props.DENOMINACION || '');
    const descripcion = String(props.descripcion || props.caracterizacion || '');
    
    // Detectar si coordenadas son UTM o WGS84
    let x: number, y: number;
    let lat: number, lon: number;
    
    if (Math.abs(coords[0]) > 180) {
      // Probablemente UTM
      x = coords[0];
      y = coords[1];
      // Transformación inversa para lat/lon
      try {
        const wgs = proj4('EPSG:25830', 'EPSG:4326', [x, y]);
        lon = wgs[0];
        lat = wgs[1];
      } catch {
        lon = 0;
        lat = 0;
      }
    } else {
      // WGS84
      lon = coords[0];
      lat = coords[1];
      if (srs === 'EPSG:25830') {
        [x, y] = transformToUTM30(lon, lat);
      } else {
        x = lon;
        y = lat;
      }
    }

    // Validar rango Andalucía
    if (lat < 35 || lat > 39 || lon < -8 || lon > -1) {
      continue;
    }

    sites.push({
      id: String(props.id || props.cod_bien || props.ID || feature.properties._id || Math.random()),
      nombre,
      tipo: detectHeritageType(nombre, descripcion),
      proteccion: detectProtectionLevel(String(props.proteccion || props.figura || '')),
      descripcion,
      municipio: String(props.municipio || props.MUNICIPIO || ''),
      provincia: String(props.provincia || props.PROVINCIA || ''),
      x,
      y,
      srs,
      latitud: lat,
      longitud: lon,
      fuente: 'IAPH_LOCALIZADOR',
      epoca: String(props.epoca || props.periodo || ''),
      estilo: String(props.estilo || ''),
    });
  }

  return sites;
}

/**
 * Parsea respuesta WFS de IDE Cultura
 */
function parseIDECulturaResponse(
  data: GeoJSONResponse,
  srs: string
): HeritageSite[] {
  if (!data.features) return [];

  const sites: HeritageSite[] = [];

  for (const feature of data.features) {
    const coords = extractCentroid(feature.geometry);
    if (!coords) continue;

    const props = feature.properties;
    const nombre = String(props.denominacion || props.nombre || '');
    
    let x: number, y: number;
    let lat: number, lon: number;
    
    if (Math.abs(coords[0]) > 180) {
      x = coords[0];
      y = coords[1];
      try {
        const wgs = proj4('EPSG:25830', 'EPSG:4326', [x, y]);
        lon = wgs[0];
        lat = wgs[1];
      } catch {
        lon = 0;
        lat = 0;
      }
    } else {
      lon = coords[0];
      lat = coords[1];
      if (srs === 'EPSG:25830') {
        [x, y] = transformToUTM30(lon, lat);
      } else {
        x = lon;
        y = lat;
      }
    }

    if (lat < 35 || lat > 39 || lon < -8 || lon > -1) {
      continue;
    }

    sites.push({
      id: String(props.cod_bien || props.id || Math.random()),
      nombre,
      tipo: detectHeritageType(nombre, String(props.tipologia || '')),
      proteccion: 'BIC', // IDE Cultura solo tiene BIC
      descripcion: String(props.tipologia || props.caracterizacion || ''),
      municipio: String(props.municipio || ''),
      provincia: String(props.provincia || ''),
      x,
      y,
      srs,
      latitud: lat,
      longitud: lon,
      fuente: 'IDE_CULTURA_CGPHA',
    });
  }

  return sites;
}


// ============================================================================
// FUNCIÓN PRINCIPAL DE GEOCODIFICACIÓN
// ============================================================================

/**
 * Geocodifica un bien patrimonial usando los servicios IAPH e IDE Cultura
 * 
 * @example
 * // Buscar iglesia en Colomera
 * const result = await geocodeHeritageSite({
 *   municipio: 'Colomera',
 *   provincia: 'Granada',
 *   nombreBuscado: 'Iglesia Nuestra Señora de la Asunción',
 * });
 * 
 * if (result.success && result.bestMatch) {
 *   console.log(`Encontrado: ${result.bestMatch.nombre}`);
 *   console.log(`Protección: ${result.bestMatch.proteccion}`);
 *   console.log(`Coordenadas: ${result.bestMatch.x}, ${result.bestMatch.y}`);
 * }
 */
export async function geocodeHeritageSite(query: HeritageQuery): Promise<HeritageResult> {
  const startTime = performance.now();
  const srs = query.srsOutput || 'EPSG:25830';
  
  const result: HeritageResult = {
    success: false,
    sites: [],
    bestMatch: null,
    matchScore: 0,
    totalRecords: 0,
    sources: [],
    queryTime: 0,
  };

  try {
    const allSites: HeritageSite[] = [];

    // 1. Buscar en IAPH Localizador (principal)
    const iaphSites = await fetchFromIAPH(query, srs);
    if (iaphSites.length > 0) {
      allSites.push(...iaphSites);
      result.sources.push('IAPH_LOCALIZADOR');
    }

    // 2. Buscar en IDE Cultura si se solicita o si IAPH no tiene resultados
    if (query.incluirIDECultura || iaphSites.length === 0) {
      const ideSites = await fetchFromIDECultura(query, srs);
      if (ideSites.length > 0) {
        // Evitar duplicados por nombre similar
        for (const site of ideSites) {
          const isDuplicate = allSites.some(s => 
            calculateMatchScore(s.nombre, site.nombre) > 85
          );
          if (!isDuplicate) {
            allSites.push(site);
          }
        }
        if (!result.sources.includes('IDE_CULTURA_CGPHA')) {
          result.sources.push('IDE_CULTURA_CGPHA');
        }
      }
    }

    // 3. Filtrar por tipo si se especificó
    let filteredSites = allSites;
    if (query.tipo) {
      filteredSites = allSites.filter(s => s.tipo === query.tipo);
    }

    // 4. Filtrar por protección si se especificó
    if (query.proteccion) {
      filteredSites = filteredSites.filter(s => s.proteccion === query.proteccion);
    }

    result.sites = filteredSites;
    result.totalRecords = filteredSites.length;

    // 5. Encontrar mejor match
    if (filteredSites.length > 0) {
      const { site, score } = findBestMatch(filteredSites, query.nombreBuscado || '');
      result.bestMatch = site;
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
 * Fetch desde IAPH Localizador
 */
async function fetchFromIAPH(query: HeritageQuery, srs: string): Promise<HeritageSite[]> {
  const cacheKey = getCacheKey(query, 'iaph');
  const cached = getFromCache(cacheKey);
  
  if (cached) {
    console.log(`[Heritage] Cache hit IAPH para ${query.municipio || query.provincia}`);
    return cached.data;
  }

  try {
    const url = buildIAPHUrl(query);
    console.log(`[Heritage] Consultando IAPH...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WFS_CONFIG.iaph.timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Heritage] IAPH HTTP ${response.status}`);
      return [];
    }

    const data: GeoJSONResponse = await response.json();
    const sites = parseIAPHResponse(data, srs);

    setCache(cacheKey, sites);
    console.log(`[Heritage] IAPH: ${sites.length} sitios encontrados`);
    
    return sites;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Heritage] IAPH timeout');
    } else {
      console.warn('[Heritage] Error IAPH:', error);
    }
    return [];
  }
}

/**
 * Fetch desde IDE Cultura
 */
async function fetchFromIDECultura(query: HeritageQuery, srs: string): Promise<HeritageSite[]> {
  const cacheKey = getCacheKey(query, 'ide_cultura');
  const cached = getFromCache(cacheKey);
  
  if (cached) {
    console.log(`[Heritage] Cache hit IDE Cultura para ${query.municipio || query.provincia}`);
    return cached.data;
  }

  try {
    const url = buildIDECulturaUrl(query);
    console.log(`[Heritage] Consultando IDE Cultura...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WFS_CONFIG.ideCultura.timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Heritage] IDE Cultura HTTP ${response.status}`);
      return [];
    }

    const data: GeoJSONResponse = await response.json();
    const sites = parseIDECulturaResponse(data, srs);

    setCache(cacheKey, sites);
    console.log(`[Heritage] IDE Cultura: ${sites.length} sitios encontrados`);
    
    return sites;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Heritage] IDE Cultura timeout');
    } else {
      console.warn('[Heritage] Error IDE Cultura:', error);
    }
    return [];
  }
}


// ============================================================================
// FUNCIONES AUXILIARES PÚBLICAS
// ============================================================================

/**
 * Obtiene todos los bienes patrimoniales de un municipio
 */
export async function getAllHeritageSitesInMunicipality(
  municipio: string,
  provincia?: string
): Promise<HeritageSite[]> {
  const result = await geocodeHeritageSite({
    municipio,
    provincia,
    incluirIDECultura: true,
    maxResults: 500,
  });

  return result.sites;
}

/**
 * Busca solo Bienes de Interés Cultural (BIC)
 */
export async function getBICInMunicipality(
  municipio: string,
  provincia?: string
): Promise<HeritageSite[]> {
  const result = await geocodeHeritageSite({
    municipio,
    provincia,
    soloBIC: true,
    incluirIDECultura: true,
  });

  return result.sites.filter(s => s.proteccion === 'BIC');
}

/**
 * Busca patrimonio por tipología específica
 */
export async function getHeritageByType(
  tipo: HeritageType,
  provincia?: string,
  maxResults = 100
): Promise<HeritageSite[]> {
  const result = await geocodeHeritageSite({
    provincia,
    tipo,
    incluirIDECultura: true,
    maxResults,
  });

  return result.sites;
}

/**
 * Busca iglesias y ermitas (arquitectura religiosa)
 */
export async function getChurchesInMunicipality(
  municipio: string,
  provincia?: string
): Promise<HeritageSite[]> {
  const result = await geocodeHeritageSite({
    municipio,
    provincia,
    tipo: 'ARQUITECTURA_RELIGIOSA',
    incluirIDECultura: true,
  });

  return result.sites;
}

/**
 * Busca castillos y torres (arquitectura defensiva)
 */
export async function getCastlesInMunicipality(
  municipio: string,
  provincia?: string
): Promise<HeritageSite[]> {
  const result = await geocodeHeritageSite({
    municipio,
    provincia,
    tipo: 'ARQUITECTURA_DEFENSIVA',
    incluirIDECultura: true,
  });

  return result.sites;
}

/**
 * Busca yacimientos arqueológicos
 */
export async function getArchaeologicalSites(
  provincia?: string,
  maxResults = 100
): Promise<HeritageSite[]> {
  const result = await geocodeHeritageSite({
    provincia,
    tipo: 'SITIO_ARQUEOLOGICO',
    incluirIDECultura: true,
    maxResults,
  });

  return result.sites;
}

/**
 * Verifica si un nombre corresponde a patrimonio conocido
 * Útil para validación LOF (reducir penalización en elementos aislados)
 */
export async function isKnownHeritageSite(
  nombre: string,
  municipio: string,
  provincia?: string
): Promise<{ isHeritage: boolean; site: HeritageSite | null; confidence: number }> {
  const result = await geocodeHeritageSite({
    municipio,
    provincia,
    nombreBuscado: nombre,
    incluirIDECultura: true,
  });

  if (result.success && result.bestMatch && result.matchScore >= 70) {
    return {
      isHeritage: true,
      site: result.bestMatch,
      confidence: result.matchScore,
    };
  }

  return {
    isHeritage: false,
    site: null,
    confidence: result.matchScore,
  };
}

/**
 * Verifica disponibilidad de los servicios WFS
 */
export async function checkServicesAvailability(): Promise<{
  iaph: { available: boolean; responseTime: number; error?: string };
  ideCultura: { available: boolean; responseTime: number; error?: string };
}> {
  const checkService = async (name: string, baseUrl: string) => {
    const startTime = performance.now();
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('service', 'WFS');
      url.searchParams.set('request', 'GetCapabilities');

      const response = await fetch(url.toString(), {
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
        error: error instanceof Error ? error.message : 'Error',
      };
    }
  };

  const [iaph, ideCultura] = await Promise.all([
    checkService('IAPH', WFS_CONFIG.iaph.baseUrl),
    checkService('IDE Cultura', WFS_CONFIG.ideCultura.baseUrl),
  ]);

  return { iaph, ideCultura };
}

/**
 * Obtiene información de los servicios configurados
 */
export function getServiceInfo(): {
  iaph: { baseUrl: string; version: string };
  ideCultura: { baseUrl: string; version: string };
  defaultSRS: string;
  cacheTTL: number;
} {
  return {
    iaph: {
      baseUrl: WFS_CONFIG.iaph.baseUrl,
      version: WFS_CONFIG.iaph.version,
    },
    ideCultura: {
      baseUrl: WFS_CONFIG.ideCultura.baseUrl,
      version: WFS_CONFIG.ideCultura.version,
    },
    defaultSRS: WFS_CONFIG.defaultSRS,
    cacheTTL: CACHE_TTL,
  };
}

/**
 * Obtiene estadísticas de patrimonio por provincia
 */
export async function getHeritageStatsByProvince(provincia: string): Promise<{
  total: number;
  byType: Record<string, number>;
  byProtection: Record<string, number>;
}> {
  const result = await geocodeHeritageSite({
    provincia,
    incluirIDECultura: true,
    maxResults: 1000,
  });

  const byType: Record<string, number> = {};
  const byProtection: Record<string, number> = {};

  for (const site of result.sites) {
    byType[site.tipo] = (byType[site.tipo] || 0) + 1;
    byProtection[site.proteccion] = (byProtection[site.proteccion] || 0) + 1;
  }

  return {
    total: result.sites.length,
    byType,
    byProtection,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  geocodeHeritageSite,
  getAllHeritageSitesInMunicipality,
  getBICInMunicipality,
  getHeritageByType,
  getChurchesInMunicipality,
  getCastlesInMunicipality,
  getArchaeologicalSites,
  isKnownHeritageSite,
  checkServicesAvailability,
  getServiceInfo,
  getHeritageStatsByProvince,
  clearExpiredCache,
  getCacheStats,
};

export type {
  HeritageQuery,
  HeritageResult,
  HeritageSite,
  HeritageType,
  ProtectionLevel,
};
