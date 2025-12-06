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
 * - Fuzzy matching con uFuzzy para nombres (10-100x más rápido que Fuse.js)
 * - Coordenadas ya en EPSG:25830 (UTM30 ETRS89)
 * 
 * @version 1.1.0
 * @date 2025-12-03
 */

import { FastFuzzy, normalizeForSearch } from './fuzzySearch';
import Flatbush from 'flatbush';
import { InfrastructureType } from '../types/infrastructure';

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

/**
 * Mapeo de InfrastructureType (clasificador) → InfrastructureCategory (datos locales)
 */
export const TYPOLOGY_TO_CATEGORY: Record<string, InfrastructureCategory | InfrastructureCategory[] | null> = {
  [InfrastructureType.HEALTH]: 'health',
  'SANITARIO': 'health',
  'HEALTH': 'health',
  [InfrastructureType.EDUCATION]: 'education',
  'EDUCATIVO': 'education',
  'EDUCATION': 'education',
  [InfrastructureType.POLICE]: 'security',
  [InfrastructureType.FIRE]: 'security',
  'POLICIAL': 'security',
  'BOMBEROS': 'security',
  'POLICE': 'security',
  'FIRE': 'security',
  'SECURITY': 'security',
  [InfrastructureType.MUNICIPAL]: 'municipal',
  'MUNICIPAL': 'municipal',
  'ADMIN': 'municipal',
  [InfrastructureType.EMERGENCY]: 'emergency',
  'EMERGENCIAS': 'emergency',
  'EMERGENCY': 'emergency',
  [InfrastructureType.ENERGY]: 'energy',
  'ENERGIA': 'energy',
  'ENERGY': 'energy',
  [InfrastructureType.CULTURAL]: null,
  [InfrastructureType.RELIGIOUS]: null,
  [InfrastructureType.SPORTS]: null,
  [InfrastructureType.SOCIAL]: null,
  [InfrastructureType.FUEL]: null,
  [InfrastructureType.HYDRAULIC]: null,
  [InfrastructureType.TELECOM]: null,
  [InfrastructureType.VIAL]: null,
  [InfrastructureType.INDUSTRIAL]: null,
  [InfrastructureType.GENERIC]: null,
  'CULTURAL': null,
  'RELIGIOSO': null,
  'DEPORTIVO': null,
  'SOCIAL': null,
  'COMBUSTIBLE': null,
  'HIDRAULICO': null,
  'TELECOM': null,
  'VIAL': null,
  'INDUSTRIAL': null,
  'GENERICO': null,
};

/** Opciones para FastFuzzy (uFuzzy) */
const FUZZY_OPTIONS = {
  keys: ['nombre', 'direccion', 'localidad', 'tipo'] as const,
  threshold: 0.4,
};

// ============================================================================
// SINGLETON & ESTADO
// ============================================================================

const dataStore = new Map<InfrastructureCategory, LocalFeature[]>();
const municipioIndex = new Map<string, Map<InfrastructureCategory, LocalFeature[]>>();
const fastFuzzyInstances = new Map<InfrastructureCategory, FastFuzzy<LocalFeature>>();
let spatialIndex: Flatbush | null = null;
let spatialFeatures: LocalFeature[] = [];
let isLoaded = false;
let isLoading = false;
let loadError: Error | null = null;

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

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeCodMun(cod: string): string {
  return cod.replace(/\D/g, '').padStart(5, '0');
}

function extractCoordinates(geometry: unknown): { x: number; y: number } | null {
  if (!geometry || typeof geometry !== 'object') return null;
  const geom = geometry as { type?: string; coordinates?: unknown };
  if (!geom.coordinates) return null;
  let coords: number[];
  if (geom.type === 'MultiPoint' && Array.isArray(geom.coordinates)) {
    coords = geom.coordinates[0] as number[];
  } else if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
    coords = geom.coordinates as number[];
  } else if (Array.isArray(geom.coordinates)) {
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

function parseGeoJSON(data: GeoJSONCollection, categoria: InfrastructureCategory): LocalFeature[] {
  const features: LocalFeature[] = [];
  for (const feature of data.features) {
    const props = feature.properties || {};
    const coords = extractCoordinates(feature.geometry);
    if (!coords) continue;
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

export async function loadLocalData(): Promise<LoadStats> {
  if (isLoaded && loadStats) return loadStats;
  if (isLoading) {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (isLoaded && loadStats) { clearInterval(checkInterval); resolve(loadStats); }
        else if (loadError) { clearInterval(checkInterval); reject(loadError); }
      }, 100);
    });
  }
  isLoading = true;
  const startTime = performance.now();
  try {
    const categories: InfrastructureCategory[] = ['health', 'security', 'education', 'municipal', 'energy'];
    const stats: LoadStats = { totalFeatures: 0, byCategory: {} as Record<InfrastructureCategory, number>, loadTimeMs: 0, municipiosIndexados: 0 };
    const loadPromises = categories.map(async (cat) => {
      const path = DATA_PATHS[cat];
      try {
        const response = await fetch(path);
        if (!response.ok) { console.warn(`[LocalDataService] No se pudo cargar ${path}: ${response.status}`); return { cat, features: [] as LocalFeature[] }; }
        const data = await response.json() as GeoJSONCollection;
        return { cat, features: parseGeoJSON(data, cat) };
      } catch (err) { console.warn(`[LocalDataService] Error cargando ${cat}:`, err); return { cat, features: [] as LocalFeature[] }; }
    });
    const results = await Promise.all(loadPromises);
    for (const { cat, features } of results) {
      dataStore.set(cat, features);
      stats.byCategory[cat] = features.length;
      stats.totalFeatures += features.length;
      if (features.length > 0) {
        fastFuzzyInstances.set(cat, new FastFuzzy(features, { keys: FUZZY_OPTIONS.keys as unknown as (keyof LocalFeature)[], threshold: FUZZY_OPTIONS.threshold }));
      }
      for (const feature of features) {
        if (!municipioIndex.has(feature.codMun)) municipioIndex.set(feature.codMun, new Map());
        const munMap = municipioIndex.get(feature.codMun)!;
        if (!munMap.has(cat)) munMap.set(cat, []);
        munMap.get(cat)!.push(feature);
      }
    }
    stats.municipiosIndexados = municipioIndex.size;
    stats.loadTimeMs = Math.round(performance.now() - startTime);
    const allFeatures = Array.from(dataStore.values()).flat();
    if (allFeatures.length > 0) {
      spatialFeatures = allFeatures;
      spatialIndex = new Flatbush(allFeatures.length);
      for (const f of allFeatures) spatialIndex.add(f.x, f.y, f.x, f.y);
      spatialIndex.finish();
      console.log(`[LocalDataService] Índice espacial Flatbush creado: ${allFeatures.length} puntos`);
    }
    loadStats = stats;
    isLoaded = true;
    isLoading = false;
    console.log(`[LocalDataService] Cargado: ${stats.totalFeatures} features (${stats.municipiosIndexados} municipios) en ${stats.loadTimeMs}ms`);
    return stats;
  } catch (err) {
    loadError = err instanceof Error ? err : new Error(String(err));
    isLoading = false;
    throw loadError;
  }
}

export function isDataLoaded(): boolean { return isLoaded; }
export function getLoadStats(): LoadStats | null { return loadStats; }

// ============================================================================
// BÚSQUEDA LOCAL
// ============================================================================

export async function searchLocal(query: LocalSearchQuery): Promise<LocalSearchResult> {
  const startTime = performance.now();
  if (!isLoaded) await loadLocalData();
  const { nombre, codMun, municipio, provincia, categorias = ['health', 'security', 'education', 'municipal', 'energy'], maxResults = 5, threshold = 0.4 } = query;
  const result: LocalSearchResult = { success: false, features: [], bestMatch: null, matchScore: 0, source: 'LOCAL_DERA', searchTime: 0, totalSearched: 0, fromCache: true };
  const normalizedNombre = normalizeText(nombre);
  if (!normalizedNombre) { result.searchTime = Math.round(performance.now() - startTime); return result; }
  let featuresToSearch: LocalFeature[] = [];
  if (codMun) {
    const normalizedCod = normalizeCodMun(codMun);
    const munData = municipioIndex.get(normalizedCod);
    if (munData) for (const cat of categorias) { const catFeatures = munData.get(cat); if (catFeatures) featuresToSearch.push(...catFeatures); }
  } else if (municipio) {
    const normalizedMun = normalizeText(municipio);
    for (const [cod, munData] of municipioIndex) {
      for (const catFeatures of munData.values()) {
        if (catFeatures.length > 0) {
          const munName = normalizeText(catFeatures[0].municipio);
          if (munName.includes(normalizedMun) || normalizedMun.includes(munName)) {
            for (const cat of categorias) { const features = munData.get(cat); if (features) featuresToSearch.push(...features); }
            break;
          }
        }
      }
    }
  } else {
    for (const cat of categorias) { const features = dataStore.get(cat); if (features) featuresToSearch.push(...features); }
  }
  if (provincia && featuresToSearch.length > 0) {
    const normalizedProv = normalizeText(provincia);
    featuresToSearch = featuresToSearch.filter(f => { const featProv = normalizeText(f.provincia); return featProv.includes(normalizedProv) || normalizedProv.includes(featProv); });
  }
  result.totalSearched = featuresToSearch.length;
  if (featuresToSearch.length === 0) { result.searchTime = Math.round(performance.now() - startTime); return result; }
  const tempFuzzy = new FastFuzzy(featuresToSearch, { keys: FUZZY_OPTIONS.keys as unknown as (keyof LocalFeature)[], threshold });
  const fuzzyResults = tempFuzzy.search(nombre, { limit: maxResults });
  if (fuzzyResults.length > 0) {
    result.success = true;
    result.features = fuzzyResults.map(r => r.item);
    result.bestMatch = fuzzyResults[0].item;
    result.matchScore = Math.round((1 - (fuzzyResults[0].score || 0)) * 100);
  }
  result.searchTime = Math.round(performance.now() - startTime);
  return result;
}

// ============================================================================
// BÚSQUEDAS ESPECÍFICAS POR CATEGORÍA
// ============================================================================

export async function searchHealthLocal(nombre: string, municipio?: string, codMun?: string): Promise<LocalSearchResult> {
  return searchLocal({ nombre, municipio, codMun, categorias: ['health'] });
}
export async function searchEducationLocal(nombre: string, municipio?: string, codMun?: string): Promise<LocalSearchResult> {
  return searchLocal({ nombre, municipio, codMun, categorias: ['education'] });
}
export async function searchSecurityLocal(nombre: string, municipio?: string, codMun?: string): Promise<LocalSearchResult> {
  return searchLocal({ nombre, municipio, codMun, categorias: ['security'] });
}
export async function searchMunicipalLocal(nombre: string, municipio?: string, codMun?: string): Promise<LocalSearchResult> {
  return searchLocal({ nombre, municipio, codMun, categorias: ['municipal'] });
}
export async function searchEnergyLocal(nombre: string, municipio?: string, codMun?: string): Promise<LocalSearchResult> {
  return searchLocal({ nombre, municipio, codMun, categorias: ['energy'] });
}

// ============================================================================
// UTILIDADES DE CONSULTA
// ============================================================================

export async function getFeaturesByMunicipio(codMun: string, categorias?: InfrastructureCategory[]): Promise<LocalFeature[]> {
  if (!isLoaded) await loadLocalData();
  const normalizedCod = normalizeCodMun(codMun);
  const munData = municipioIndex.get(normalizedCod);
  if (!munData) return [];
  const result: LocalFeature[] = [];
  const cats = categorias || ['health', 'security', 'education', 'municipal', 'energy'];
  for (const cat of cats) { const features = munData.get(cat); if (features) result.push(...features); }
  return result;
}

export async function getFeatureCountByMunicipio(codMun: string): Promise<Record<InfrastructureCategory, number>> {
  if (!isLoaded) await loadLocalData();
  const normalizedCod = normalizeCodMun(codMun);
  const munData = municipioIndex.get(normalizedCod);
  const counts: Record<InfrastructureCategory, number> = { health: 0, security: 0, education: 0, municipal: 0, energy: 0 };
  if (munData) for (const [cat, features] of munData) counts[cat] = features.length;
  return counts;
}

// ============================================================================
// F023 FASE 1.1 - MÉTODOS SINGLETON
// ============================================================================

const F023_1_1 = '[F023-1.1]';

function resolveTypologyToCategories(tipologia: string): InfrastructureCategory[] {
  const mapping = TYPOLOGY_TO_CATEGORY[tipologia.toUpperCase()];
  if (mapping === null || mapping === undefined) return [];
  if (Array.isArray(mapping)) return mapping;
  return [mapping];
}

export async function countByType(tipologia: string, codMunicipio: string): Promise<number> {
  if (!isLoaded) await loadLocalData();
  const normalizedCod = normalizeCodMun(codMunicipio);
  const categories = resolveTypologyToCategories(tipologia);
  if (categories.length === 0) { console.debug(`${F023_1_1} Tipología '${tipologia}' sin datos locales disponibles`); return 0; }
  const munData = municipioIndex.get(normalizedCod);
  if (!munData) { console.debug(`${F023_1_1} Municipio ${normalizedCod} no encontrado en índice local`); return 0; }
  let count = 0;
  for (const cat of categories) { const features = munData.get(cat); if (features) count += features.length; }
  if (count === 1) console.debug(`${F023_1_1} SINGLETON detectado: ${tipologia} en ${normalizedCod}`);
  else if (count >= 2) console.debug(`${F023_1_1} Múltiples (${count}): ${tipologia} en ${normalizedCod} - requiere desambiguación`);
  return count;
}

export async function getUniqueByType(tipologia: string, codMunicipio: string): Promise<LocalFeature | null> {
  if (!isLoaded) await loadLocalData();
  const normalizedCod = normalizeCodMun(codMunicipio);
  const categories = resolveTypologyToCategories(tipologia);
  if (categories.length === 0) { console.debug(`${F023_1_1} getUnique: Tipología '${tipologia}' sin categoría local`); return null; }
  const munData = municipioIndex.get(normalizedCod);
  if (!munData) { console.debug(`${F023_1_1} getUnique: Municipio ${normalizedCod} sin datos`); return null; }
  const allFeatures: LocalFeature[] = [];
  for (const cat of categories) { const features = munData.get(cat); if (features) allFeatures.push(...features); }
  if (allFeatures.length === 1) {
    console.debug(`${F023_1_1} ✅ Match directo singleton: '${allFeatures[0].nombre}' (${tipologia}, ${normalizedCod}) - 95% confianza`);
    return allFeatures[0];
  }
  if (allFeatures.length === 0) console.debug(`${F023_1_1} getUnique: 0 features para ${tipologia} en ${normalizedCod}`);
  else console.debug(`${F023_1_1} getUnique: ${allFeatures.length} features para ${tipologia} en ${normalizedCod} - singleton no aplicable`);
  return null;
}

export async function listMunicipiosConDatos(): Promise<string[]> {
  if (!isLoaded) await loadLocalData();
  return Array.from(municipioIndex.keys()).sort();
}

// ============================================================================
// INTEGRACIÓN CON GEOCODING CASCADE
// ============================================================================

export function toGeocodingResult(feature: LocalFeature, matchScore: number): { x: number; y: number; confidence: number; source: string; matchedName: string; crs: 'EPSG:25830' } {
  return { x: feature.x, y: feature.y, confidence: matchScore / 100, source: `LOCAL_DERA_${feature.categoria.toUpperCase()}`, matchedName: feature.nombre, crs: 'EPSG:25830' };
}

export async function geocodeWithLocalFallback<T>(nombre: string, categorias: InfrastructureCategory[], municipio?: string, codMun?: string, fallbackFn?: () => Promise<T>): Promise<{ x: number; y: number; source: string; confidence: number } | T | null> {
  const localResult = await searchLocal({ nombre, codMun, municipio, categorias, threshold: 0.35 });
  if (localResult.success && localResult.bestMatch && localResult.matchScore >= 60) return toGeocodingResult(localResult.bestMatch, localResult.matchScore);
  if (fallbackFn) {
    try { return await fallbackFn(); }
    catch { if (localResult.bestMatch && localResult.matchScore >= 40) return toGeocodingResult(localResult.bestMatch, localResult.matchScore); }
  }
  if (localResult.bestMatch) return toGeocodingResult(localResult.bestMatch, localResult.matchScore);
  return null;
}

// ============================================================================
// LIMPIEZA Y TESTING
// ============================================================================

export function clearLocalData(): void {
  dataStore.clear();
  municipioIndex.clear();
  fastFuzzyInstances.clear();
  isLoaded = false;
  isLoading = false;
  loadError = null;
  loadStats = null;
}

export function injectTestData(data: Map<InfrastructureCategory, LocalFeature[]>): LoadStats {
  clearLocalData();
  const startTime = performance.now();
  const stats: LoadStats = { totalFeatures: 0, byCategory: {} as Record<InfrastructureCategory, number>, loadTimeMs: 0, municipiosIndexados: 0 };
  for (const [cat, features] of data) {
    dataStore.set(cat, features);
    stats.byCategory[cat] = features.length;
    stats.totalFeatures += features.length;
    if (features.length > 0) fastFuzzyInstances.set(cat, new FastFuzzy(features, FUZZY_OPTIONS));
    for (const feature of features) {
      if (!municipioIndex.has(feature.codMun)) municipioIndex.set(feature.codMun, new Map());
      const munMap = municipioIndex.get(feature.codMun)!;
      if (!munMap.has(cat)) munMap.set(cat, []);
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
// F023 FASE 3 - BÚSQUEDA ESPACIAL CON FLATBUSH
// ============================================================================

export interface NearbyResult { feature: LocalFeature; distance: number; }

export async function findNearby(x: number, y: number, radiusMeters: number = 1000, categoria?: InfrastructureCategory): Promise<NearbyResult[]> {
  if (!isLoaded) await loadLocalData();
  if (!spatialIndex || spatialFeatures.length === 0) { console.warn('[LocalDataService] Índice espacial no disponible'); return []; }
  const minX = x - radiusMeters, minY = y - radiusMeters, maxX = x + radiusMeters, maxY = y + radiusMeters;
  const candidateIndices = spatialIndex.search(minX, minY, maxX, maxY);
  const results: NearbyResult[] = [];
  for (const idx of candidateIndices) {
    const feature = spatialFeatures[idx];
    if (!feature) continue;
    if (categoria && feature.categoria !== categoria) continue;
    const dx = feature.x - x, dy = feature.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= radiusMeters) results.push({ feature, distance });
  }
  results.sort((a, b) => a.distance - b.distance);
  return results;
}

export async function findNearest(x: number, y: number, categoria?: InfrastructureCategory): Promise<NearbyResult | null> {
  const searchRadii = [100, 500, 1000, 5000, 10000];
  for (const radius of searchRadii) {
    const results = await findNearby(x, y, radius, categoria);
    if (results.length > 0) return results[0];
  }
  return null;
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  loadLocalData, isDataLoaded, getLoadStats, searchLocal,
  searchHealthLocal, searchEducationLocal, searchSecurityLocal, searchMunicipalLocal, searchEnergyLocal,
  getFeaturesByMunicipio, getFeatureCountByMunicipio, listMunicipiosConDatos,
  countByType, getUniqueByType, TYPOLOGY_TO_CATEGORY,
  findNearby, findNearest,
  toGeocodingResult, geocodeWithLocalFallback, clearLocalData, injectTestData,
};