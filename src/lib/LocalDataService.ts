/**
 * LocalDataService.ts - F021 Fase 2
 * 
 * Servicio de geocodificación offline usando datos DERA pre-descargados.
 * Primera línea de búsqueda antes de llamar APIs externas.
 * 
 * DATOS LOCALES (11,282 features total):
 * - health.geojson:     1,700 centros (CAP + hospitales)
 * - security.geojson:   1,259 (policía, bomberos, Guardia Civil)
 * - education.geojson:  6,725 centros educativos
 * - municipal.geojson:  1,414 (ayuntamientos + centros Junta)
 * - emergency.geojson:     23 centros gestión emergencias
 * - energy.geojson:       161 parques eólicos
 * 
 * CARACTERÍSTICAS:
 * - Singleton con lazy loading
 * - Índice por cod_mun para O(1) lookup
 * - Fuzzy matching con Fuse.js para nombres
 * - Coordenadas ya en EPSG:25830 (UTM30 ETRS89)
 * 
 * @version 1.1.0
 * @date 2025-12-03
 */

import Fuse from 'fuse.js';

// ============================================================================
// TIPOS
// ============================================================================

export type InfrastructureCategory = 
  | 'health' 
  | 'security' 
  | 'education' 
  | 'municipal' 
  | 'emergency'
  | 'energy';

export interface LocalFeature {
  id: string;
  nombre: string;
  tipo?: string;
  direccion?: string;
  localidad?: string;
  codMun: string;
  municipio: string;
  provincia: string;
  x: number;
  y: number;
  categoria: InfrastructureCategory;
}

export interface LocalSearchQuery {
  /** Nombre de la infraestructura a buscar */
  nombre: string;
  /** Código INE del municipio (5 dígitos) */
  codMun?: string;
  /** Nombre del municipio (alternativa a codMun) */
  municipio?: string;
  /** Provincia para desambiguación */
  provincia?: string;
  /** Categorías donde buscar (default: todas) */
  categorias?: InfrastructureCategory[];
  /** Límite de resultados (default: 5) */
  maxResults?: number;
  /** Umbral mínimo de similitud Fuse.js (default: 0.4) */
  threshold?: number;
}

export interface LocalSearchResult {
  success: boolean;
  features: LocalFeature[];
  bestMatch: LocalFeature | null;
  matchScore: number;
  source: 'LOCAL_DERA';
  searchTime: number;
  totalSearched: number;
  fromCache: boolean;
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const DATA_PATHS: Record<InfrastructureCategory, string> = {
  health: '/data/dera/health.geojson',
  security: '/data/dera/security.geojson',
  education: '/data/dera/education.geojson',
  municipal: '/data/dera/municipal.geojson',
  emergency: '/data/dera/emergency.geojson',
  energy: '/data/dera/energy.geojson',
};

const FUSE_OPTIONS: Fuse.IFuseOptions<LocalFeature> = {
  keys: [
    { name: 'nombre', weight: 0.6 },
    { name: 'direccion', weight: 0.2 },
    { name: 'localidad', weight: 0.1 },
    { name: 'tipo', weight: 0.1 },
  ],
  threshold: 0.4,           // 0 = exacto, 1 = todo
  distance: 100,            // Distancia máxima caracteres
  includeScore: true,
  ignoreLocation: true,     // No penalizar posición
  useExtendedSearch: false, // Búsqueda simple
  minMatchCharLength: 2,
};

// ============================================================================
// SINGLETON & ESTADO
// ============================================================================

/** Almacén de features por categoría */
const dataStore = new Map<InfrastructureCategory, LocalFeature[]>();

/** Índice por cod_mun para búsquedas O(1) */
const municipioIndex = new Map<string, Map<InfrastructureCategory, LocalFeature[]>>();

/** Instancias Fuse.js por categoría */
const fuseInstances = new Map<InfrastructureCategory, Fuse<LocalFeature>>();

/** Estado de carga */
let isLoaded = false;
let isLoading = false;
let loadError: Error | null = null;

/** Estadísticas */
interface LoadStats {
  totalFeatures: number;
  byCategory: Record<InfrastructureCategory, number>;
  loadTimeMs: number;
  municipiosIndexados: number;
}
let loadStats: LoadStats | null = null;

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Normaliza texto para comparación
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Eliminar acentos
    .replace(/[^a-z0-9\s]/g, ' ')     // Solo alfanuméricos
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza código de municipio a 5 dígitos
 */
function normalizeCodMun(cod: string): string {
  const cleaned = cod.replace(/\D/g, '');
  return cleaned.padStart(5, '0');
}

/**
 * Extrae coordenadas de geometría GeoJSON
 */
function extractCoordinates(geometry: unknown): { x: number; y: number } | null {
  if (!geometry || typeof geometry !== 'object') return null;
  
  const geom = geometry as { type?: string; coordinates?: unknown };
  
  if (!geom.coordinates) return null;
  
  // MultiPoint: [[x, y]] o Point: [x, y]
  let coords: number[];
  
  if (geom.type === 'MultiPoint' && Array.isArray(geom.coordinates)) {
    coords = geom.coordinates[0] as number[];
  } else if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
    coords = geom.coordinates as number[];
  } else if (Array.isArray(geom.coordinates)) {
    // Fallback: asumir primer nivel de array
    const first = geom.coordinates[0];
    coords = Array.isArray(first) ? first as number[] : geom.coordinates as number[];
  } else {
    return null;
  }
  
  if (coords.length >= 2 && typeof coords[0] === 'number') {
    return { x: coords[0], y: coords[1] };
  }
  
  return null;
}

// ============================================================================
// PARSEO DE GEOJSON
// ============================================================================

interface GeoJSONFeature {
  type: string;
  id?: string;
  geometry: unknown;
  properties: Record<string, unknown>;
}

interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

/**
 * Parsea GeoJSON y extrae features normalizados
 */
function parseGeoJSON(
  data: GeoJSONCollection,
  categoria: InfrastructureCategory
): LocalFeature[] {
  const features: LocalFeature[] = [];
  
  for (const feature of data.features) {
    const props = feature.properties || {};
    const coords = extractCoordinates(feature.geometry);
    
    if (!coords) continue;
    
    // Extraer código municipio (cod_mun o similar)
    const codMun = String(props.cod_mun || props.codigo_ine || props.ine || '');
    if (!codMun) continue;
    
    const localFeature: LocalFeature = {
      id: String(feature.id || props.id_dera || `${categoria}-${features.length}`),
      nombre: String(props.nombre || props.denominaci || props.name || 'Sin nombre'),
      tipo: props.tipo ? String(props.tipo) : undefined,
      direccion: props.direccion ? String(props.direccion) : undefined,
      localidad: props.localidad ? String(props.localidad) : undefined,
      codMun: normalizeCodMun(codMun),
      municipio: String(props.municipio || props.localidad || ''),
      provincia: String(props.provincia || ''),
      x: coords.x,
      y: coords.y,
      categoria,
    };
    
    features.push(localFeature);
  }
  
  return features;
}

// ============================================================================
// CARGA DE DATOS
// ============================================================================

/**
 * Carga todos los datos DERA locales
 * @returns Promise que se resuelve cuando todos los datos están cargados
 */
export async function loadLocalData(): Promise<LoadStats> {
  // Si ya está cargado, retornar stats
  if (isLoaded && loadStats) {
    return loadStats;
  }
  
  // Si está cargando, esperar
  if (isLoading) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (isLoaded && loadStats) {
          clearInterval(checkInterval);
          resolve(loadStats);
        } else if (loadError) {
          clearInterval(checkInterval);
          reject(loadError);
        }
      }, 100);
    });
  }
  
  isLoading = true;
  const startTime = performance.now();
  
  try {
    const categories: InfrastructureCategory[] = [
      'health', 'security', 'education', 'municipal', 'energy'
    ];
    
    const stats: LoadStats = {
      totalFeatures: 0,
      byCategory: {} as Record<InfrastructureCategory, number>,
      loadTimeMs: 0,
      municipiosIndexados: 0,
    };
    
    // Cargar cada categoría en paralelo
    const loadPromises = categories.map(async (cat) => {
      const path = DATA_PATHS[cat];
      
      try {
        const response = await fetch(path);
        
        if (!response.ok) {
          console.warn(`[LocalDataService] No se pudo cargar ${path}: ${response.status}`);
          return { cat, features: [] as LocalFeature[] };
        }
        
        const data = await response.json() as GeoJSONCollection;
        const features = parseGeoJSON(data, cat);
        
        return { cat, features };
      } catch (err) {
        console.warn(`[LocalDataService] Error cargando ${cat}:`, err);
        return { cat, features: [] as LocalFeature[] };
      }
    });
    
    const results = await Promise.all(loadPromises);
    
    // Procesar resultados
    for (const { cat, features } of results) {
      dataStore.set(cat, features);
      stats.byCategory[cat] = features.length;
      stats.totalFeatures += features.length;
      
      // Crear índice Fuse para esta categoría
      if (features.length > 0) {
        fuseInstances.set(cat, new Fuse(features, FUSE_OPTIONS));
      }
      
      // Indexar por municipio
      for (const feature of features) {
        if (!municipioIndex.has(feature.codMun)) {
          municipioIndex.set(feature.codMun, new Map());
        }
        const munMap = municipioIndex.get(feature.codMun)!;
        
        if (!munMap.has(cat)) {
          munMap.set(cat, []);
        }
        munMap.get(cat)!.push(feature);
      }
    }
    
    stats.municipiosIndexados = municipioIndex.size;
    stats.loadTimeMs = Math.round(performance.now() - startTime);
    
    loadStats = stats;
    isLoaded = true;
    isLoading = false;
    
    console.log(
      `[LocalDataService] Cargado: ${stats.totalFeatures} features ` +
      `(${stats.municipiosIndexados} municipios) en ${stats.loadTimeMs}ms`
    );
    
    return stats;
    
  } catch (err) {
    loadError = err instanceof Error ? err : new Error(String(err));
    isLoading = false;
    throw loadError;
  }
}

/**
 * Verifica si los datos están cargados
 */
export function isDataLoaded(): boolean {
  return isLoaded;
}

/**
 * Obtiene estadísticas de carga
 */
export function getLoadStats(): LoadStats | null {
  return loadStats;
}

// ============================================================================
// BÚSQUEDA LOCAL
// ============================================================================

/**
 * Busca infraestructuras en datos locales DERA
 * 
 * @param query - Parámetros de búsqueda
 * @returns Resultados de búsqueda con mejor match y score
 */
export async function searchLocal(query: LocalSearchQuery): Promise<LocalSearchResult> {
  const startTime = performance.now();
  
  // Asegurar que datos estén cargados
  if (!isLoaded) {
    await loadLocalData();
  }
  
  const {
    nombre,
    codMun,
    municipio,
    provincia,
    categorias = ['health', 'security', 'education', 'municipal', 'energy'],
    maxResults = 5,
    threshold = 0.4,
  } = query;
  
  const result: LocalSearchResult = {
    success: false,
    features: [],
    bestMatch: null,
    matchScore: 0,
    source: 'LOCAL_DERA',
    searchTime: 0,
    totalSearched: 0,
    fromCache: true,
  };
  
  // Normalizar nombre de búsqueda
  const normalizedNombre = normalizeText(nombre);
  if (!normalizedNombre) {
    result.searchTime = Math.round(performance.now() - startTime);
    return result;
  }
  
  // Determinar conjunto de features a buscar
  let featuresToSearch: LocalFeature[] = [];
  
  // Si tenemos código de municipio, usar índice
  if (codMun) {
    const normalizedCod = normalizeCodMun(codMun);
    const munData = municipioIndex.get(normalizedCod);
    
    if (munData) {
      for (const cat of categorias) {
        const catFeatures = munData.get(cat);
        if (catFeatures) {
          featuresToSearch.push(...catFeatures);
        }
      }
    }
  } else if (municipio) {
    // Buscar por nombre de municipio
    const normalizedMun = normalizeText(municipio);
    
    for (const [cod, munData] of municipioIndex) {
      // Obtener un feature para verificar nombre de municipio
      for (const catFeatures of munData.values()) {
        if (catFeatures.length > 0) {
          const munName = normalizeText(catFeatures[0].municipio);
          if (munName.includes(normalizedMun) || normalizedMun.includes(munName)) {
            for (const cat of categorias) {
              const features = munData.get(cat);
              if (features) {
                featuresToSearch.push(...features);
              }
            }
            break;
          }
        }
      }
    }
  } else {
    // Sin filtro de municipio: buscar en todas las categorías
    for (const cat of categorias) {
      const features = dataStore.get(cat);
      if (features) {
        featuresToSearch.push(...features);
      }
    }
  }
  
  // Filtrar por provincia si se especifica
  if (provincia && featuresToSearch.length > 0) {
    const normalizedProv = normalizeText(provincia);
    featuresToSearch = featuresToSearch.filter(f => {
      const featProv = normalizeText(f.provincia);
      return featProv.includes(normalizedProv) || normalizedProv.includes(featProv);
    });
  }
  
  result.totalSearched = featuresToSearch.length;
  
  if (featuresToSearch.length === 0) {
    result.searchTime = Math.round(performance.now() - startTime);
    return result;
  }
  
  // Fuzzy search con Fuse.js temporal
  const fuseOptions = { ...FUSE_OPTIONS, threshold };
  const tempFuse = new Fuse(featuresToSearch, fuseOptions);
  const fuseResults = tempFuse.search(nombre, { limit: maxResults });
  
  if (fuseResults.length > 0) {
    result.success = true;
    result.features = fuseResults.map(r => r.item);
    result.bestMatch = fuseResults[0].item;
    // Fuse score: 0 = exacto, 1 = peor. Invertimos para consistencia
    result.matchScore = Math.round((1 - (fuseResults[0].score || 0)) * 100);
  }
  
  result.searchTime = Math.round(performance.now() - startTime);
  return result;
}

// ============================================================================
// BÚSQUEDAS ESPECÍFICAS POR CATEGORÍA
// ============================================================================

/**
 * Busca centros de salud locales
 */
export async function searchHealthLocal(
  nombre: string,
  municipio?: string,
  codMun?: string
): Promise<LocalSearchResult> {
  return searchLocal({
    nombre,
    municipio,
    codMun,
    categorias: ['health'],
  });
}

/**
 * Busca centros educativos locales
 */
export async function searchEducationLocal(
  nombre: string,
  municipio?: string,
  codMun?: string
): Promise<LocalSearchResult> {
  return searchLocal({
    nombre,
    municipio,
    codMun,
    categorias: ['education'],
  });
}

/**
 * Busca infraestructuras de seguridad locales
 */
export async function searchSecurityLocal(
  nombre: string,
  municipio?: string,
  codMun?: string
): Promise<LocalSearchResult> {
  return searchLocal({
    nombre,
    municipio,
    codMun,
    categorias: ['security'],
  });
}

/**
 * Busca ayuntamientos locales
 */
export async function searchMunicipalLocal(
  nombre: string,
  municipio?: string,
  codMun?: string
): Promise<LocalSearchResult> {
  return searchLocal({
    nombre,
    municipio,
    codMun,
    categorias: ['municipal'],
  });
}

/**
 * Busca infraestructuras energéticas locales
 */
export async function searchEnergyLocal(
  nombre: string,
  municipio?: string,
  codMun?: string
): Promise<LocalSearchResult> {
  return searchLocal({
    nombre,
    municipio,
    codMun,
    categorias: ['energy'],
  });
}

// ============================================================================
// UTILIDADES DE CONSULTA
// ============================================================================

/**
 * Obtiene todas las features de un municipio
 */
export async function getFeaturesByMunicipio(
  codMun: string,
  categorias?: InfrastructureCategory[]
): Promise<LocalFeature[]> {
  if (!isLoaded) {
    await loadLocalData();
  }
  
  const normalizedCod = normalizeCodMun(codMun);
  const munData = municipioIndex.get(normalizedCod);
  
  if (!munData) {
    return [];
  }
  
  const result: LocalFeature[] = [];
  const cats = categorias || ['health', 'security', 'education', 'municipal', 'energy'];
  
  for (const cat of cats) {
    const features = munData.get(cat);
    if (features) {
      result.push(...features);
    }
  }
  
  return result;
}

/**
 * Obtiene conteo de features por municipio
 */
export async function getFeatureCountByMunicipio(
  codMun: string
): Promise<Record<InfrastructureCategory, number>> {
  if (!isLoaded) {
    await loadLocalData();
  }
  
  const normalizedCod = normalizeCodMun(codMun);
  const munData = municipioIndex.get(normalizedCod);
  
  const counts: Record<InfrastructureCategory, number> = {
    health: 0,
    security: 0,
    education: 0,
    municipal: 0,
    energy: 0,
  };
  
  if (munData) {
    for (const [cat, features] of munData) {
      counts[cat] = features.length;
    }
  }
  
  return counts;
}

/**
 * Lista todos los municipios con datos
 */
export async function listMunicipiosConDatos(): Promise<string[]> {
  if (!isLoaded) {
    await loadLocalData();
  }
  
  return Array.from(municipioIndex.keys()).sort();
}

// ============================================================================
// INTEGRACIÓN CON GEOCODING CASCADE
// ============================================================================

/**
 * Convierte LocalFeature a formato compatible con GeocodingResult
 */
export function toGeocodingResult(feature: LocalFeature, matchScore: number): {
  x: number;
  y: number;
  confidence: number;
  source: string;
  matchedName: string;
  crs: 'EPSG:25830';
} {
  return {
    x: feature.x,
    y: feature.y,
    confidence: matchScore / 100,  // 0-1
    source: `LOCAL_DERA_${feature.categoria.toUpperCase()}`,
    matchedName: feature.nombre,
    crs: 'EPSG:25830',
  };
}

/**
 * Geocodifica usando datos locales primero, con fallback opcional
 * 
 * @param nombre - Nombre de la infraestructura
 * @param categorias - Categorías donde buscar
 * @param municipio - Municipio (nombre o código)
 * @param fallbackFn - Función de fallback si no hay match local
 * @returns Resultado de geocodificación
 */
export async function geocodeWithLocalFallback<T>(
  nombre: string,
  categorias: InfrastructureCategory[],
  municipio?: string,
  codMun?: string,
  fallbackFn?: () => Promise<T>
): Promise<{ x: number; y: number; source: string; confidence: number } | T | null> {
  
  // Intentar búsqueda local primero
  const localResult = await searchLocal({
    nombre,
    codMun,
    municipio,
    categorias,
    threshold: 0.35, // Más estricto para evitar falsos positivos
  });
  
  // Si encontramos match con buena confianza, usar local
  if (localResult.success && localResult.bestMatch && localResult.matchScore >= 60) {
    return toGeocodingResult(localResult.bestMatch, localResult.matchScore);
  }
  
  // Si hay fallback, intentarlo
  if (fallbackFn) {
    try {
      return await fallbackFn();
    } catch {
      // Si el fallback falla pero tenemos resultado local con menor confianza, usarlo
      if (localResult.bestMatch && localResult.matchScore >= 40) {
        return toGeocodingResult(localResult.bestMatch, localResult.matchScore);
      }
    }
  }
  
  // Último recurso: usar resultado local aunque tenga baja confianza
  if (localResult.bestMatch) {
    return toGeocodingResult(localResult.bestMatch, localResult.matchScore);
  }
  
  return null;
}

// ============================================================================
// LIMPIEZA Y TESTING
// ============================================================================

/**
 * Libera memoria (útil para tests)
 */
export function clearLocalData(): void {
  dataStore.clear();
  municipioIndex.clear();
  fuseInstances.clear();
  isLoaded = false;
  isLoading = false;
  loadError = null;
  loadStats = null;
}

/**
 * Inyecta datos de test directamente (para tests sin servidor HTTP)
 * @param data - Mapa de categoría a array de features
 */
export function injectTestData(data: Map<InfrastructureCategory, LocalFeature[]>): LoadStats {
  clearLocalData();
  
  const startTime = performance.now();
  const stats: LoadStats = {
    totalFeatures: 0,
    byCategory: {} as Record<InfrastructureCategory, number>,
    loadTimeMs: 0,
    municipiosIndexados: 0,
  };
  
  for (const [cat, features] of data) {
    dataStore.set(cat, features);
    stats.byCategory[cat] = features.length;
    stats.totalFeatures += features.length;
    
    // Crear índice Fuse
    if (features.length > 0) {
      fuseInstances.set(cat, new Fuse(features, FUSE_OPTIONS));
    }
    
    // Indexar por municipio
    for (const feature of features) {
      if (!municipioIndex.has(feature.codMun)) {
        municipioIndex.set(feature.codMun, new Map());
      }
      const munMap = municipioIndex.get(feature.codMun)!;
      
      if (!munMap.has(cat)) {
        munMap.set(cat, []);
      }
      munMap.get(cat)!.push(feature);
    }
  }
  
  stats.municipiosIndexados = municipioIndex.size;
  stats.loadTimeMs = Math.round(performance.now() - startTime);
  
  loadStats = stats;
  isLoaded = true;
  
  return stats;
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  loadLocalData,
  isDataLoaded,
  getLoadStats,
  searchLocal,
  searchHealthLocal,
  searchEducationLocal,
  searchSecurityLocal,
  searchMunicipalLocal,
  searchEnergyLocal,
  getFeaturesByMunicipio,
  getFeatureCountByMunicipio,
  listMunicipiosConDatos,
  toGeocodingResult,
  geocodeWithLocalFallback,
  clearLocalData,
  injectTestData,
};
