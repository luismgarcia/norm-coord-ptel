/**
 * SecurityGeocoder.ts
 * 
 * Cliente híbrido de geocodificación para infraestructuras de seguridad en Andalucía.
 * Combina dos fuentes:
 * 
 * 1. WFS ISE (Inventario Sedes y Equipamientos) - Junta de Andalucía
 *    - Juzgados y tribunales (~574)
 *    - Infraestructura INFOCA: torres vigilancia, hangares, bases (~404)
 *    - Unidades Policía Adscrita (~8)
 *    - Emergencias: GEA, IESPLA
 *    
 * 2. Overpass API (OpenStreetMap) - Complementario
 *    - Comisarías Policía Nacional
 *    - Cuarteles Guardia Civil
 *    - Parques de Bomberos municipales
 *    - Policía Local
 * 
 * Arquitectura browser-compatible, sin dependencias externas excepto proj4.
 * 
 * @author PTEL Normalizador
 * @version 1.0.0
 * @license MIT
 */

import proj4 from 'proj4';

// Definir proyección UTM30 ETRS89
proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');

// ============================================================================
// TIPOS Y ENUMS
// ============================================================================

/**
 * Tipos de instalaciones de seguridad
 */
export enum SecurityType {
  // Policía
  POLICIA_NACIONAL = 'POLICIA_NACIONAL',
  GUARDIA_CIVIL = 'GUARDIA_CIVIL',
  POLICIA_LOCAL = 'POLICIA_LOCAL',
  POLICIA_ADSCRITA = 'POLICIA_ADSCRITA',
  POLICIA_OTRO = 'POLICIA_OTRO',
  
  // Bomberos y Emergencias
  PARQUE_BOMBEROS = 'PARQUE_BOMBEROS',
  TORRE_VIGILANCIA = 'TORRE_VIGILANCIA',
  CENTRO_INFOCA = 'CENTRO_INFOCA',
  BASE_HELICOPTEROS = 'BASE_HELICOPTEROS',
  HANGAR_VEHICULOS = 'HANGAR_VEHICULOS',
  CENTRO_EMERGENCIAS = 'CENTRO_EMERGENCIAS',
  GEA = 'GEA', // Grupo Emergencias Andalucía
  
  // Justicia
  JUZGADO = 'JUZGADO',
  AUDIENCIA = 'AUDIENCIA',
  FISCALIA = 'FISCALIA',
  MEDICINA_LEGAL = 'MEDICINA_LEGAL',
  
  // Genérico
  OTRO = 'OTRO'
}

/**
 * Fuente de datos
 */
export type SecurityDataSource = 'ISE_WFS' | 'OSM_OVERPASS';

/**
 * Instalación de seguridad geocodificada
 */
export interface SecurityFacility {
  id: string;
  nombre: string;
  tipo: SecurityType;
  subtipo?: string;
  direccion?: string;
  municipio: string;
  provincia: string;
  telefono?: string;
  email?: string;
  web?: string;
  x: number;
  y: number;
  srs: string;
  latitud?: number;
  longitud?: number;
  fuente: SecurityDataSource;
  confianza: number; // 0-100
}


/**
 * Resultado de búsqueda de geocodificación
 */
export interface SecurityGeocodeResult {
  encontrado: boolean;
  instalacion?: SecurityFacility;
  coincidencia: number; // Score 0-100
  alternativas?: SecurityFacility[];
  tiempoBusqueda: number; // ms
}

/**
 * Opciones de configuración del geocodificador
 */
export interface SecurityGeocoderOptions {
  timeout?: number;
  usarOSM?: boolean; // Complementar con OSM
  soloISE?: boolean; // Solo fuente oficial
  srs?: 'EPSG:25830' | 'EPSG:4326';
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const WFS_ISE_ENDPOINT = 'https://www.ideandalucia.es/services/ise/wfs';
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

const DEFAULT_TIMEOUT = 15000; // 15 segundos
const CACHE_TTL_ISE = 24 * 60 * 60 * 1000; // 24 horas (datos oficiales)
const CACHE_TTL_OSM = 7 * 24 * 60 * 60 * 1000; // 7 días (OSM cambia poco)

// Provincias andaluzas normalizadas
const PROVINCIAS_ANDALUCIA: Record<string, string> = {
  'almeria': 'Almería',
  'cadiz': 'Cádiz',
  'cordoba': 'Córdoba',
  'granada': 'Granada',
  'huelva': 'Huelva',
  'jaen': 'Jaén',
  'malaga': 'Málaga',
  'sevilla': 'Sevilla'
};

// Mapeo de tipos ISE a SecurityType
const ISE_TIPO_MAP: Record<string, SecurityType> = {
  'Torre de Vigilancia contra incendios forestales': SecurityType.TORRE_VIGILANCIA,
  'Hangar para vehículos contra incendios forestales': SecurityType.HANGAR_VEHICULOS,
  'Centro de Plan Infoca y Centro de Defensa Forestal': SecurityType.CENTRO_INFOCA,
  'Base para los helicópteros contra incendios forestales': SecurityType.BASE_HELICOPTEROS,
  'Pista de Aterrizaje': SecurityType.BASE_HELICOPTEROS,
  'Centro Operativo Provincial': SecurityType.CENTRO_EMERGENCIAS,
  'Centro Operativo Regional': SecurityType.CENTRO_EMERGENCIAS,
  'Unidad de Policía Adscrita (CNP)': SecurityType.POLICIA_ADSCRITA,
  'Grupo de Emergencias de Andalucía': SecurityType.GEA,
  'Instituto de Emergencias y Seguridad Pública de Andalucía': SecurityType.CENTRO_EMERGENCIAS,
  'Brigada Especializada en Incendios Forestales de la Comunidad Andaluza': SecurityType.CENTRO_INFOCA,
  // Juzgados
  'Juzgado de Primera Instancia e Instrucción': SecurityType.JUZGADO,
  'Juzgado de Instrucción': SecurityType.JUZGADO,
  'Juzgado de Guardia': SecurityType.JUZGADO,
  'Juzgado de Menores': SecurityType.JUZGADO,
  'Audiencia Provincial': SecurityType.AUDIENCIA,
  'Fiscalía': SecurityType.FISCALIA,
  'Instituto de Medicina Legal': SecurityType.MEDICINA_LEGAL
};

// Patrones para detectar tipo de policía desde OSM
const POLICIA_PATTERNS = {
  NACIONAL: /polic[ií]a\s*nacional|comisaría|cnp/i,
  GUARDIA_CIVIL: /guardia\s*civil|cuartel|gc|benemérita/i,
  LOCAL: /polic[ií]a\s*local|municipal/i
};

// ============================================================================
// CACHE EN MEMORIA
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const iseCache = new Map<string, CacheEntry<SecurityFacility[]>>();
const osmCache = new Map<string, CacheEntry<SecurityFacility[]>>();


// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Normaliza texto para comparación
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza nombre de municipio para consultas WFS
 */
function normalizeMunicipio(municipio: string): string {
  return municipio
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Normaliza provincia
 */
function normalizeProvincia(provincia: string): string {
  const normalized = normalizeText(provincia);
  return PROVINCIAS_ANDALUCIA[normalized] || provincia;
}

/**
 * Calcula distancia Levenshtein normalizada
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  
  return dp[m][n] / Math.max(m, n);
}

/**
 * Calcula puntuación de coincidencia entre textos
 */
function calculateMatchScore(searched: string, found: string): number {
  const s1 = normalizeText(searched);
  const s2 = normalizeText(found);
  
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 90;
  
  // Verificar palabras clave
  const words1 = s1.split(' ').filter(w => w.length > 2);
  const words2 = s2.split(' ').filter(w => w.length > 2);
  const commonWords = words1.filter(w => words2.includes(w));
  
  if (commonWords.length > 0 && commonWords.length >= words1.length * 0.5) {
    return 80 + (commonWords.length / words1.length) * 10;
  }
  
  const distance = levenshteinDistance(s1, s2);
  return Math.max(0, Math.round((1 - distance) * 100));
}

/**
 * Transforma coordenadas WGS84 a UTM30
 */
function transformToUTM30(lon: number, lat: number): [number, number] {
  const result = proj4('EPSG:4326', 'EPSG:25830', [lon, lat]);
  return [result[0], result[1]];
}

/**
 * Transforma coordenadas UTM30 a WGS84
 */
function transformToWGS84(x: number, y: number): [number, number] {
  const result = proj4('EPSG:25830', 'EPSG:4326', [x, y]);
  return [result[0], result[1]];
}

/**
 * Valida coordenadas UTM30 en Andalucía
 */
function isValidUTM30Andalucia(x: number, y: number): boolean {
  return x >= 100000 && x <= 700000 && y >= 3900000 && y <= 4400000;
}

/**
 * Valida coordenadas WGS84 en Andalucía
 */
function isValidWGS84Andalucia(lon: number, lat: number): boolean {
  return lon >= -8 && lon <= -1 && lat >= 35 && lat <= 39;
}


/**
 * Detecta tipo de policía desde texto OSM
 */
function detectPoliciaType(name: string, tags: Record<string, string>): SecurityType {
  const text = `${name} ${tags['description'] || ''} ${tags['operator'] || ''}`;
  
  if (POLICIA_PATTERNS.NACIONAL.test(text)) return SecurityType.POLICIA_NACIONAL;
  if (POLICIA_PATTERNS.GUARDIA_CIVIL.test(text)) return SecurityType.GUARDIA_CIVIL;
  if (POLICIA_PATTERNS.LOCAL.test(text)) return SecurityType.POLICIA_LOCAL;
  
  // Si tiene "police" pero no podemos determinar tipo
  return SecurityType.POLICIA_OTRO;
}

/**
 * Obtiene entrada de cache si es válida
 */
function getFromCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Guarda en cache
 */
function saveToCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  data: T,
  ttl: number
): void {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

// ============================================================================
// CLIENTE WFS ISE
// ============================================================================

/**
 * Construye URL de petición WFS para ISE
 */
function buildISEWFSUrl(
  municipio: string,
  provincia?: string,
  tipo?: SecurityType
): string {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: 'ise:justicia_seguridad_emergencias',
    outputFormat: 'application/json',
    srsName: 'EPSG:25830'
  });
  
  // Construir filtro CQL
  const filters: string[] = [];
  
  if (municipio) {
    const normalizedMun = normalizeMunicipio(municipio);
    filters.push(`Municipio ILIKE '%${normalizedMun}%'`);
  }
  
  if (provincia) {
    const normalizedProv = normalizeProvincia(provincia);
    filters.push(`Provincia = '${normalizedProv}'`);
  }
  
  if (filters.length > 0) {
    params.set('CQL_FILTER', filters.join(' AND '));
  }
  
  return `${WFS_ISE_ENDPOINT}?${params.toString()}`;
}

/**
 * Parsea respuesta GeoJSON del ISE
 */
function parseISEResponse(geojson: any): SecurityFacility[] {
  if (!geojson.features || !Array.isArray(geojson.features)) {
    return [];
  }
  
  return geojson.features
    .filter((f: any) => f.geometry && f.properties)
    .map((feature: any) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      
      // Determinar tipo
      const tipoISE = props.Tipo || '';
      const tipo = ISE_TIPO_MAP[tipoISE] || SecurityType.OTRO;
      
      // Calcular coordenadas WGS84
      let latitud: number | undefined;
      let longitud: number | undefined;
      
      if (isValidUTM30Andalucia(coords[0], coords[1])) {
        const [lon, lat] = transformToWGS84(coords[0], coords[1]);
        if (isValidWGS84Andalucia(lon, lat)) {
          longitud = lon;
          latitud = lat;
        }
      }
      
      return {
        id: `ISE-${props.id_ise}`,
        nombre: props.Nombre || '',
        tipo,
        subtipo: tipoISE,
        direccion: props.Direccion,
        municipio: props.Municipio || '',
        provincia: props.Provincia || '',
        telefono: props.Telefono !== 'No disponible' ? props.Telefono : undefined,
        email: props.Correo_electronico !== 'No disponible' ? props.Correo_electronico : undefined,
        web: props.web,
        x: coords[0],
        y: coords[1],
        srs: 'EPSG:25830',
        latitud,
        longitud,
        fuente: 'ISE_WFS' as SecurityDataSource,
        confianza: 95 // Fuente oficial
      } as SecurityFacility;
    });
}


/**
 * Consulta el WFS ISE para instalaciones de seguridad
 */
async function queryISEWFS(
  municipio: string,
  provincia?: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<SecurityFacility[]> {
  // Verificar cache
  const cacheKey = `ise:${municipio}:${provincia || 'all'}`;
  const cached = getFromCache(iseCache, cacheKey);
  if (cached) return cached;
  
  const url = buildISEWFSUrl(municipio, provincia);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const geojson = await response.json();
    const facilities = parseISEResponse(geojson);
    
    // Guardar en cache
    saveToCache(iseCache, cacheKey, facilities, CACHE_TTL_ISE);
    
    return facilities;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout consultando ISE WFS (${timeout}ms)`);
    }
    throw error;
  }
}

// ============================================================================
// CLIENTE OVERPASS (OSM)
// ============================================================================

/**
 * Construye query Overpass para una zona
 */
function buildOverpassQuery(
  municipio: string,
  provincia: string,
  amenityTypes: string[]
): string {
  // Usar búsqueda por nombre de municipio en Andalucía
  const amenityFilter = amenityTypes.map(t => `["amenity"="${t}"]`).join('');
  
  return `
    [out:json][timeout:30];
    area["ISO3166-2"="ES-AN"]->.andalucia;
    area["name"~"${municipio}",i]["admin_level"~"8|7"](area.andalucia)->.municipio;
    (
      node${amenityFilter}(area.municipio);
      way${amenityFilter}(area.municipio);
    );
    out center;
  `.trim();
}

/**
 * Parsea respuesta de Overpass
 */
function parseOverpassResponse(
  data: any,
  municipio: string,
  provincia: string
): SecurityFacility[] {
  if (!data.elements || !Array.isArray(data.elements)) {
    return [];
  }
  
  return data.elements
    .filter((el: any) => {
      // Debe tener coordenadas
      if (el.type === 'node') return el.lat && el.lon;
      if (el.type === 'way') return el.center?.lat && el.center?.lon;
      return false;
    })
    .map((el: any) => {
      const tags = el.tags || {};
      const lat = el.type === 'node' ? el.lat : el.center.lat;
      const lon = el.type === 'node' ? el.lon : el.center.lon;
      
      // Determinar tipo
      let tipo: SecurityType;
      let subtipo = '';
      
      if (tags.amenity === 'police') {
        tipo = detectPoliciaType(tags.name || '', tags);
        subtipo = tags['police:FR'] || tags.operator || '';
      } else if (tags.amenity === 'fire_station') {
        tipo = SecurityType.PARQUE_BOMBEROS;
        subtipo = tags.operator || 'Bomberos';
      } else {
        tipo = SecurityType.OTRO;
      }
      
      // Transformar a UTM30
      const [x, y] = transformToUTM30(lon, lat);
      
      return {
        id: `OSM-${el.type}-${el.id}`,
        nombre: tags.name || tags['official_name'] || `${tipo} ${municipio}`,
        tipo,
        subtipo,
        direccion: tags['addr:street'] ? 
          `${tags['addr:street']}${tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''}` : 
          undefined,
        municipio,
        provincia,
        telefono: tags.phone || tags['contact:phone'],
        email: tags.email || tags['contact:email'],
        web: tags.website || tags['contact:website'],
        x,
        y,
        srs: 'EPSG:25830',
        latitud: lat,
        longitud: lon,
        fuente: 'OSM_OVERPASS' as SecurityDataSource,
        confianza: 75 // OSM es colaborativo, menor confianza
      } as SecurityFacility;
    });
}


/**
 * Consulta Overpass API para policía y bomberos
 */
async function queryOverpass(
  municipio: string,
  provincia: string,
  tipos: ('police' | 'fire_station')[] = ['police', 'fire_station'],
  timeout: number = DEFAULT_TIMEOUT
): Promise<SecurityFacility[]> {
  // Verificar cache
  const cacheKey = `osm:${municipio}:${provincia}:${tipos.join(',')}`;
  const cached = getFromCache(osmCache, cacheKey);
  if (cached) return cached;
  
  const query = buildOverpassQuery(municipio, provincia, tipos);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout * 2); // Overpass es más lento
  
  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Overpass HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const facilities = parseOverpassResponse(data, municipio, provincia);
    
    // Guardar en cache
    saveToCache(osmCache, cacheKey, facilities, CACHE_TTL_OSM);
    
    return facilities;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Timeout consultando Overpass (${timeout * 2}ms)`);
      return [];
    }
    console.warn('Error Overpass:', error);
    return [];
  }
}

// ============================================================================
// CLASE PRINCIPAL: SecurityGeocoder
// ============================================================================

/**
 * Geocodificador de infraestructuras de seguridad para Andalucía
 */
export class SecurityGeocoder {
  private options: Required<SecurityGeocoderOptions>;
  
  constructor(options: SecurityGeocoderOptions = {}) {
    this.options = {
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      usarOSM: options.usarOSM ?? true,
      soloISE: options.soloISE ?? false,
      srs: options.srs ?? 'EPSG:25830',
      cacheEnabled: options.cacheEnabled ?? true,
      cacheTTL: options.cacheTTL ?? CACHE_TTL_ISE
    };
  }
  
  /**
   * Geocodifica una instalación de seguridad por nombre y municipio
   */
  async geocode(
    query: string,
    municipio: string,
    provincia?: string
  ): Promise<SecurityGeocodeResult> {
    const startTime = Date.now();
    
    try {
      // 1. Buscar en ISE (fuente oficial)
      const iseFacilities = await queryISEWFS(
        municipio,
        provincia,
        this.options.timeout
      );
      
      // 2. Buscar en OSM si está habilitado
      let osmFacilities: SecurityFacility[] = [];
      if (this.options.usarOSM && !this.options.soloISE && provincia) {
        osmFacilities = await queryOverpass(
          municipio,
          provincia,
          ['police', 'fire_station'],
          this.options.timeout
        );
      }
      
      // 3. Combinar resultados
      const allFacilities = [...iseFacilities, ...osmFacilities];
      
      if (allFacilities.length === 0) {
        return {
          encontrado: false,
          coincidencia: 0,
          tiempoBusqueda: Date.now() - startTime
        };
      }
      
      // 4. Buscar mejor coincidencia
      const scoredFacilities = allFacilities.map(f => ({
        facility: f,
        score: calculateMatchScore(query, f.nombre)
      }));
      
      scoredFacilities.sort((a, b) => b.score - a.score);
      
      const best = scoredFacilities[0];
      const alternativas = scoredFacilities
        .slice(1, 4)
        .filter(s => s.score >= 50)
        .map(s => s.facility);
      
      // 5. Transformar coordenadas si es necesario
      let resultado = best.facility;
      if (this.options.srs === 'EPSG:4326' && resultado.latitud && resultado.longitud) {
        resultado = {
          ...resultado,
          x: resultado.longitud,
          y: resultado.latitud,
          srs: 'EPSG:4326'
        };
      }
      
      return {
        encontrado: best.score >= 60,
        instalacion: resultado,
        coincidencia: best.score,
        alternativas: alternativas.length > 0 ? alternativas : undefined,
        tiempoBusqueda: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('Error en geocodificación seguridad:', error);
      return {
        encontrado: false,
        coincidencia: 0,
        tiempoBusqueda: Date.now() - startTime
      };
    }
  }

  
  /**
   * Obtiene todas las instalaciones de seguridad de un municipio
   */
  async getAllInMunicipality(
    municipio: string,
    provincia: string
  ): Promise<SecurityFacility[]> {
    // Consultar ISE
    const iseFacilities = await queryISEWFS(
      municipio,
      provincia,
      this.options.timeout
    );
    
    // Consultar OSM si está habilitado
    let osmFacilities: SecurityFacility[] = [];
    if (this.options.usarOSM && !this.options.soloISE) {
      osmFacilities = await queryOverpass(
        municipio,
        provincia,
        ['police', 'fire_station'],
        this.options.timeout
      );
    }
    
    return [...iseFacilities, ...osmFacilities];
  }
  
  /**
   * Obtiene instalaciones por tipo
   */
  async getByType(
    tipo: SecurityType,
    municipio: string,
    provincia: string
  ): Promise<SecurityFacility[]> {
    const all = await this.getAllInMunicipality(municipio, provincia);
    return all.filter(f => f.tipo === tipo);
  }
  
  /**
   * Obtiene comisarías y cuarteles (policía)
   */
  async getPoliceStations(
    municipio: string,
    provincia: string
  ): Promise<SecurityFacility[]> {
    const policiaTypes = [
      SecurityType.POLICIA_NACIONAL,
      SecurityType.GUARDIA_CIVIL,
      SecurityType.POLICIA_LOCAL,
      SecurityType.POLICIA_ADSCRITA,
      SecurityType.POLICIA_OTRO
    ];
    
    const all = await this.getAllInMunicipality(municipio, provincia);
    return all.filter(f => policiaTypes.includes(f.tipo));
  }
  
  /**
   * Obtiene parques de bomberos e infraestructura INFOCA
   */
  async getFireStations(
    municipio: string,
    provincia: string
  ): Promise<SecurityFacility[]> {
    const bomberosTypes = [
      SecurityType.PARQUE_BOMBEROS,
      SecurityType.TORRE_VIGILANCIA,
      SecurityType.CENTRO_INFOCA,
      SecurityType.BASE_HELICOPTEROS,
      SecurityType.HANGAR_VEHICULOS
    ];
    
    const all = await this.getAllInMunicipality(municipio, provincia);
    return all.filter(f => bomberosTypes.includes(f.tipo));
  }
  
  /**
   * Obtiene juzgados y edificios judiciales
   */
  async getCourthouses(
    municipio: string,
    provincia: string
  ): Promise<SecurityFacility[]> {
    const justiceTypes = [
      SecurityType.JUZGADO,
      SecurityType.AUDIENCIA,
      SecurityType.FISCALIA,
      SecurityType.MEDICINA_LEGAL
    ];
    
    const all = await this.getAllInMunicipality(municipio, provincia);
    return all.filter(f => justiceTypes.includes(f.tipo));
  }
  
  /**
   * Obtiene centros de emergencias
   */
  async getEmergencyCenters(
    municipio: string,
    provincia: string
  ): Promise<SecurityFacility[]> {
    const emergencyTypes = [
      SecurityType.CENTRO_EMERGENCIAS,
      SecurityType.GEA
    ];
    
    const all = await this.getAllInMunicipality(municipio, provincia);
    return all.filter(f => emergencyTypes.includes(f.tipo));
  }
  
  /**
   * Verifica si una instalación es conocida (para validación LOF)
   * 
   * Uso: Verificar si un punto aislado corresponde a instalación de seguridad
   * legítimamente alejada del núcleo urbano (ej: torre vigilancia, cuartel rural)
   */
  async isKnownSecurityFacility(
    nombre: string,
    municipio: string,
    provincia: string
  ): Promise<{ isKnown: boolean; facility?: SecurityFacility; confidence: number }> {
    const result = await this.geocode(nombre, municipio, provincia);
    
    if (result.encontrado && result.instalacion && result.coincidencia >= 70) {
      return {
        isKnown: true,
        facility: result.instalacion,
        confidence: result.coincidencia
      };
    }
    
    return {
      isKnown: false,
      confidence: result.coincidencia
    };
  }

  
  /**
   * Verifica disponibilidad de los servicios
   */
  async checkAvailability(): Promise<{
    ise: boolean;
    osm: boolean;
    iseLatency?: number;
    osmLatency?: number;
  }> {
    const results = { ise: false, osm: false } as any;
    
    // Test ISE
    try {
      const start = Date.now();
      const url = `${WFS_ISE_ENDPOINT}?service=WFS&version=2.0.0&request=GetCapabilities`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      results.ise = response.ok;
      results.iseLatency = Date.now() - start;
    } catch {
      results.ise = false;
    }
    
    // Test Overpass
    if (this.options.usarOSM) {
      try {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${OVERPASS_ENDPOINT}?data=[out:json][timeout:5];node(1);out;`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        results.osm = response.ok;
        results.osmLatency = Date.now() - start;
      } catch {
        results.osm = false;
      }
    }
    
    return results;
  }
  
  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats(): {
    ise: { entries: number; oldestEntry?: Date };
    osm: { entries: number; oldestEntry?: Date };
  } {
    const getOldest = (cache: Map<string, CacheEntry<any>>) => {
      let oldest: number | undefined;
      cache.forEach(entry => {
        if (!oldest || entry.timestamp < oldest) {
          oldest = entry.timestamp;
        }
      });
      return oldest ? new Date(oldest) : undefined;
    };
    
    return {
      ise: {
        entries: iseCache.size,
        oldestEntry: getOldest(iseCache)
      },
      osm: {
        entries: osmCache.size,
        oldestEntry: getOldest(osmCache)
      }
    };
  }
  
  /**
   * Limpia el cache
   */
  clearCache(source?: 'ise' | 'osm'): void {
    if (!source || source === 'ise') {
      iseCache.clear();
    }
    if (!source || source === 'osm') {
      osmCache.clear();
    }
  }
}

// ============================================================================
// FUNCIONES DE CONVENIENCIA EXPORTADAS
// ============================================================================

// Instancia singleton por defecto
let defaultGeocoder: SecurityGeocoder | null = null;

/**
 * Obtiene geocodificador por defecto
 */
export function getSecurityGeocoder(options?: SecurityGeocoderOptions): SecurityGeocoder {
  if (!defaultGeocoder || options) {
    defaultGeocoder = new SecurityGeocoder(options);
  }
  return defaultGeocoder;
}

/**
 * Geocodifica instalación de seguridad (función de conveniencia)
 */
export async function geocodeSecurityFacility(
  query: string,
  municipio: string,
  provincia?: string,
  options?: SecurityGeocoderOptions
): Promise<SecurityGeocodeResult> {
  const geocoder = getSecurityGeocoder(options);
  return geocoder.geocode(query, municipio, provincia);
}

/**
 * Obtiene todas las instalaciones de seguridad de un municipio
 */
export async function getAllSecurityInMunicipality(
  municipio: string,
  provincia: string,
  options?: SecurityGeocoderOptions
): Promise<SecurityFacility[]> {
  const geocoder = getSecurityGeocoder(options);
  return geocoder.getAllInMunicipality(municipio, provincia);
}

/**
 * Verifica si una ubicación corresponde a instalación de seguridad conocida
 */
export async function isKnownSecurityLocation(
  nombre: string,
  municipio: string,
  provincia: string,
  options?: SecurityGeocoderOptions
): Promise<{ isKnown: boolean; facility?: SecurityFacility; confidence: number }> {
  const geocoder = getSecurityGeocoder(options);
  return geocoder.isKnownSecurityFacility(nombre, municipio, provincia);
}

// Export por defecto
export default SecurityGeocoder;
