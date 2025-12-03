/**
 * Servicio de Geocodificación Automática PTEL v3.4
 * 
 * CORRECCIONES APLICADAS:
 * 1. Nombres de capas WFS IECA actualizados
 * 2. Filtrado en cliente en lugar de CQL_FILTER
 * 3. Cache de capas para evitar múltiples descargas
 * 4. Fallback mejorado cuando servicios están caídos
 * 5. [v3.4] INTEGRACIÓN LocalDataService - F021 Fase 2
 *    → Búsqueda offline primero (L0) con 10.653 features DERA
 *    → Solo llama APIs externas si no hay match local ≥60%
 * 
 * @module services/AutoGeocodingService
 */

import Fuse from 'fuse.js';
import {
  loadLocalData,
  isDataLoaded,
  searchLocal,
  getLoadStats,
  type InfrastructureCategory,
  type LocalSearchResult,
} from './LocalDataService';

// ============================================================================
// TIPOS
// ============================================================================

export interface InfrastructureToGeocode {
  id: string;
  nombre: string;
  direccion?: string;
  tipo?: string;
  municipio?: string;
  provincia?: string;
}

export interface GeocodingResult {
  x: number;
  y: number;
  confidence: number;
  source: string;
  matchedName?: string;
  crs: 'EPSG:25830' | 'EPSG:4326';
}

export interface AutoGeocodingResult {
  infrastructure: InfrastructureToGeocode;
  result: GeocodingResult | null;
  attempts: string[];
  error?: string;
}

// ============================================================================
// CONFIGURACIÓN WFS IECA - ACTUALIZADA NOV 2025
// ============================================================================

const WFS_CONFIG = {
  baseUrl: 'https://www.ideandalucia.es/services/DERA_g12_servicios/wfs',
  layers: {
    // Sanitarios
    HEALTH_CENTER: 'DERA_g12_servicios:g12_01_CentroSalud',
    HOSPITAL: 'DERA_g12_servicios:g12_02_Hospital_CAE',
    PHARMACY: 'DERA_g12_servicios:g12_04_Farmacia',
    
    // Educación (dentro de G12)
    EDUCATION: 'DERA_g12_servicios:g12_05_CentroEducativo',
    UNIVERSITY: 'DERA_g12_servicios:g12_06_Universidad',
    
    // Otros servicios
    ARCHIVE_LIBRARY: 'DERA_g12_servicios:g12_09_ArchivoBiblioteca',
    COURTHOUSE: 'DERA_g12_servicios:g12_10_Juzgado'
  },
  timeout: 20000,
  crs: 'EPSG:25830'
};

const CARTOCIUDAD_CONFIG = {
  baseUrl: 'https://www.cartociudad.es/geocoder/api/geocoder/findJsonp',
  timeout: 10000
};

const OVERPASS_CONFIG = {
  baseUrl: 'https://overpass-api.de/api/interpreter',
  timeout: 30000
};

// ============================================================================
// CACHE DE CAPAS WFS
// ============================================================================

interface WFSFeature {
  nombre: string;
  direccion: string;
  municipio: string;
  provincia: string;
  x: number;
  y: number;
}

const wfsCache: Map<string, WFSFeature[]> = new Map();

/**
 * Descarga y cachea una capa WFS completa
 */
async function loadWFSLayer(layerName: string): Promise<WFSFeature[]> {
  const cacheKey = layerName;
  
  if (wfsCache.has(cacheKey)) {
    return wfsCache.get(cacheKey)!;
  }
  
  try {
    const url = `${WFS_CONFIG.baseUrl}?service=WFS&version=2.0.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(WFS_CONFIG.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const features: WFSFeature[] = [];
    
    for (const f of data.features || []) {
      const props = f.properties || {};
      const coords = f.geometry?.coordinates?.[0] || f.geometry?.coordinates || [];
      
      if (coords.length >= 2) {
        features.push({
          nombre: props.nombre || props.NOMBRE || props.denominacion || '',
          direccion: props.direccion || props.DIRECCION || '',
          municipio: props.municipio || props.MUNICIPIO || '',
          provincia: props.provincia || props.PROVINCIA || '',
          x: coords[0],
          y: coords[1]
        });
      }
    }
    
    wfsCache.set(cacheKey, features);
    console.log(`[WFS] Cargada capa ${layerName}: ${features.length} elementos`);
    
    return features;
    
  } catch (error) {
    console.error(`[WFS] Error cargando ${layerName}:`, error);
    return [];
  }
}

// ============================================================================
// GEOCODIFICADORES
// ============================================================================

/**
 * Geocodifica usando WFS IECA con fuzzy matching
 */
async function geocodeWithWFS(
  infra: InfrastructureToGeocode,
  layerName: string
): Promise<GeocodingResult | null> {
  
  const features = await loadWFSLayer(layerName);
  
  if (features.length === 0) {
    return null;
  }
  
  // Filtrar por municipio primero
  const municipio = (infra.municipio || '').toLowerCase();
  const inMunicipio = features.filter(f => 
    f.municipio.toLowerCase() === municipio ||
    f.municipio.toLowerCase().includes(municipio) ||
    municipio.includes(f.municipio.toLowerCase())
  );
  
  if (inMunicipio.length === 0) {
    return null;
  }
  
  // Fuzzy search por nombre
  const fuse = new Fuse(inMunicipio, {
    keys: ['nombre', 'direccion'],
    threshold: 0.4,
    includeScore: true
  });
  
  const searchTerm = infra.nombre + ' ' + (infra.direccion || '');
  const results = fuse.search(searchTerm);
  
  if (results.length > 0 && results[0].score! < 0.5) {
    const match = results[0].item;
    const confidence = Math.round((1 - results[0].score!) * 100);
    
    return {
      x: match.x,
      y: match.y,
      confidence: Math.min(95, confidence),
      source: `wfs:${layerName.split(':')[1]}`,
      matchedName: match.nombre,
      crs: 'EPSG:25830'
    };
  }
  
  // Si solo hay uno en el municipio, usarlo con menor confianza
  if (inMunicipio.length === 1) {
    return {
      x: inMunicipio[0].x,
      y: inMunicipio[0].y,
      confidence: 65,
      source: `wfs:${layerName.split(':')[1]}:unico`,
      matchedName: inMunicipio[0].nombre,
      crs: 'EPSG:25830'
    };
  }
  
  return null;
}

/**
 * Geocodifica usando CartoCiudad (IGN)
 */
async function geocodeWithCartoCiudad(
  address: string,
  municipality: string
): Promise<GeocodingResult | null> {
  
  try {
    const query = `${address}, ${municipality}`;
    const url = `${CARTOCIUDAD_CONFIG.baseUrl}?q=${encodeURIComponent(query)}&autocancel=true`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(CARTOCIUDAD_CONFIG.timeout)
    });
    
    if (!response.ok) {
      return null;
    }
    
    let text = await response.text();
    
    // Extraer JSON del JSONP
    if (text.startsWith('callback(')) {
      text = text.slice(9, -1);
    }
    
    const data = JSON.parse(text);
    
    if (!data.lat || !data.lng) {
      return null;
    }
    
    // Calcular confianza según state
    const confidenceMap: Record<number, number> = {
      1: 92, // Portal exacto
      2: 85, // Portal aproximado
      3: 78, // Calle
      4: 70, // Municipio
      5: 60  // Provincia
    };
    
    const confidence = confidenceMap[data.state] || 55;
    
    // CartoCiudad devuelve WGS84, hay que convertir a UTM30
    // Por ahora devolvemos WGS84 y marcamos el CRS
    return {
      x: data.lng,
      y: data.lat,
      confidence,
      source: 'cartociudad',
      matchedName: data.address || '',
      crs: 'EPSG:4326'
    };
    
  } catch (error) {
    console.error('[CartoCiudad] Error:', error);
    return null;
  }
}

/**
 * Geocodifica antenas de telecomunicaciones con Overpass/OSM
 */
async function geocodeTelecomWithOverpass(
  name: string,
  municipality: string
): Promise<GeocodingResult | null> {
  
  try {
    const query = `
      [out:json][timeout:25];
      area["name"="${municipality}"]["admin_level"="8"]->.searchArea;
      (
        node["tower:type"="communication"](area.searchArea);
        node["man_made"="mast"](area.searchArea);
        node["man_made"="tower"]["tower:type"="communication"](area.searchArea);
      );
      out body;
    `;
    
    const response = await fetch(OVERPASS_CONFIG.baseUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(OVERPASS_CONFIG.timeout)
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const elements = data.elements || [];
    
    if (elements.length === 0) {
      return null;
    }
    
    // Buscar por operador si está en el nombre
    const nameLower = name.toLowerCase();
    const operators = ['movistar', 'vodafone', 'orange', 'yoigo', 'telefonica'];
    const targetOp = operators.find(op => nameLower.includes(op));
    
    for (const elem of elements) {
      const op = (elem.tags?.operator || '').toLowerCase();
      
      if (targetOp && op.includes(targetOp)) {
        return {
          x: elem.lon,
          y: elem.lat,
          confidence: 80,
          source: 'overpass:telecom:operator',
          matchedName: `${elem.tags?.name || 'Torre'} (${elem.tags?.operator})`,
          crs: 'EPSG:4326'
        };
      }
    }
    
    // Si no hay match, devolver la primera
    const elem = elements[0];
    return {
      x: elem.lon,
      y: elem.lat,
      confidence: 60,
      source: 'overpass:telecom',
      matchedName: `Torre telecomunicaciones (${elements.length} en municipio)`,
      crs: 'EPSG:4326'
    };
    
  } catch (error) {
    console.error('[Overpass] Error:', error);
    return null;
  }
}

// ============================================================================
// CLASIFICADOR DE TIPOLOGÍA
// ============================================================================

type InfraType = 'HEALTH' | 'EDUCATION' | 'CULTURAL' | 'TELECOM' | 'SPORTS' | 'ADMIN' | 'GENERIC';

/**
 * Mapea tipo de infraestructura a categorías de LocalDataService
 */
function mapTypeToLocalCategories(tipo: InfraType): InfrastructureCategory[] {
  switch (tipo) {
    case 'HEALTH':
      return ['health'];
    case 'EDUCATION':
      return ['education'];
    case 'ADMIN':
      return ['municipal', 'security'];
    case 'TELECOM':
      return ['energy']; // Parques eólicos pueden tener infraestructura telecom
    case 'SPORTS':
    case 'CULTURAL':
    case 'GENERIC':
    default:
      return ['health', 'security', 'education', 'municipal', 'energy'];
  }
}

/**
 * Geocodifica usando LocalDataService (datos offline DERA)
 * NIVEL 0: Primera línea de búsqueda antes de APIs externas
 */
async function geocodeWithLocalData(
  infra: InfrastructureToGeocode,
  tipo: InfraType
): Promise<GeocodingResult | null> {
  // Asegurar que datos estén cargados
  if (!isDataLoaded()) {
    try {
      await loadLocalData();
    } catch (err) {
      console.warn('[L0:Local] Error cargando datos:', err);
      return null;
    }
  }
  
  const categorias = mapTypeToLocalCategories(tipo);
  
  const localResult: LocalSearchResult = await searchLocal({
    nombre: infra.nombre,
    municipio: infra.municipio,
    categorias,
    threshold: 0.35, // Más estricto para evitar falsos positivos
    maxResults: 3,
  });
  
  if (localResult.success && localResult.bestMatch && localResult.matchScore >= 55) {
    return {
      x: localResult.bestMatch.x,
      y: localResult.bestMatch.y,
      confidence: Math.min(95, localResult.matchScore), // Cap en 95%
      source: `local:${localResult.bestMatch.categoria}`,
      matchedName: localResult.bestMatch.nombre,
      crs: 'EPSG:25830',
    };
  }
  
  return null;
}

function classifyInfrastructure(nombre: string): InfraType {
  const n = nombre.toLowerCase();
  
  if (/\b(consultorio|centro\s*(de\s*)?salud|hospital|ambulatorio|urgencias)\b/.test(n)) {
    return 'HEALTH';
  }
  
  if (/\b(colegio|escuela|ceip|instituto|guardería|educación|formación)\b/.test(n)) {
    return 'EDUCATION';
  }
  
  if (/\b(iglesia|ermita|puente|romano|lavaderos|patrimonio|museo|biblioteca)\b/.test(n)) {
    return 'CULTURAL';
  }
  
  if (/\b(antena|torre|movistar|vodafone|orange|telecomunicación)\b/.test(n)) {
    return 'TELECOM';
  }
  
  if (/\b(piscina|polideportivo|campo\s*(de\s*)?(fútbol|deporte)|pabellón)\b/.test(n)) {
    return 'SPORTS';
  }
  
  if (/\b(ayuntamiento|policía|guardia\s*civil|bomberos|juzgado)\b/.test(n)) {
    return 'ADMIN';
  }
  
  return 'GENERIC';
}

// ============================================================================
// ORQUESTADOR DE CASCADA AUTOMÁTICA
// ============================================================================

/**
 * Geocodifica una infraestructura usando la cascada completa
 * 
 * CASCADA DE GEOCODIFICACIÓN:
 * L0: LocalDataService (offline, 10.653 features DERA)
 * L1: WFS Especializado (online, cuando L0 no tiene match ≥60%)
 * L2: Overpass para telecom
 * L3: CartoCiudad con dirección
 * L4: CartoCiudad con nombre
 */
export async function geocodeInfrastructure(
  infra: InfrastructureToGeocode
): Promise<AutoGeocodingResult> {
  
  const attempts: string[] = [];
  let result: GeocodingResult | null = null;
  
  const tipo = classifyInfrastructure(infra.nombre);
  const municipio = infra.municipio || '';
  const direccion = infra.direccion || '';
  
  try {
    // ================================================================
    // NIVEL 0: LocalDataService (OFFLINE) - F021 Fase 2
    // Busca en datos DERA pre-descargados antes de llamar APIs
    // ================================================================
    attempts.push('L0:Local_DERA');
    result = await geocodeWithLocalData(infra, tipo);
    if (result && result.confidence >= 60) {
      return { infrastructure: infra, result, attempts };
    }
    
    // ================================================================
    // NIVEL 1: WFS Especializado según tipo (ONLINE)
    // Solo si L0 no encontró match con ≥60% confianza
    // ================================================================
    if (tipo === 'HEALTH') {
      attempts.push('L1:WFS_Health');
      result = await geocodeWithWFS(infra, WFS_CONFIG.layers.HEALTH_CENTER);
      if (result && result.confidence >= 60) {
        return { infrastructure: infra, result, attempts };
      }
    }
    
    if (tipo === 'EDUCATION') {
      attempts.push('L1:WFS_Education');
      result = await geocodeWithWFS(infra, WFS_CONFIG.layers.EDUCATION);
      if (result && result.confidence >= 60) {
        return { infrastructure: infra, result, attempts };
      }
    }
    
    // NIVEL 2: Overpass para telecomunicaciones
    if (tipo === 'TELECOM' && municipio) {
      attempts.push('L2:Overpass_Telecom');
      result = await geocodeTelecomWithOverpass(infra.nombre, municipio);
      if (result && result.confidence >= 55) {
        return { infrastructure: infra, result, attempts };
      }
    }
    
    // NIVEL 3: CartoCiudad (si hay dirección)
    if (direccion && municipio) {
      attempts.push('L3:CartoCiudad');
      result = await geocodeWithCartoCiudad(direccion, municipio);
      if (result && result.confidence >= 55) {
        return { infrastructure: infra, result, attempts };
      }
    }
    
    // NIVEL 4: CartoCiudad con nombre (último recurso)
    if (municipio) {
      attempts.push('L4:CartoCiudad_Nombre');
      result = await geocodeWithCartoCiudad(infra.nombre, municipio);
      if (result && result.confidence >= 50) {
        return { infrastructure: infra, result, attempts };
      }
    }
    
    // ================================================================
    // FALLBACK: Si L0 tiene resultado con menor confianza, usarlo
    // ================================================================
    const localFallback = await geocodeWithLocalData(infra, tipo);
    if (localFallback) {
      attempts.push('L5:Local_Fallback');
      return { infrastructure: infra, result: localFallback, attempts };
    }
    
    // Sin resultado
    return {
      infrastructure: infra,
      result: null,
      attempts,
      error: 'No se encontraron coordenadas en ningún servicio'
    };
    
  } catch (error) {
    return {
      infrastructure: infra,
      result: null,
      attempts,
      error: `Error: ${error}`
    };
  }
}

/**
 * Geocodifica múltiples infraestructuras con progreso
 */
export async function geocodeBatch(
  infrastructures: InfrastructureToGeocode[],
  onProgress?: (current: number, total: number) => void
): Promise<AutoGeocodingResult[]> {
  
  const results: AutoGeocodingResult[] = [];
  const total = infrastructures.length;
  
  // Pre-cargar datos locales DERA (L0 - prioridad máxima)
  console.log('[Batch] Pre-cargando datos locales DERA...');
  try {
    const localStats = await loadLocalData();
    console.log(`[Batch] Datos locales listos: ${localStats.totalFeatures} features`);
  } catch (err) {
    console.warn('[Batch] Datos locales no disponibles, usando solo APIs:', err);
  }
  
  // Pre-cargar capas WFS comunes (fallback)
  console.log('[Batch] Pre-cargando capas WFS (fallback)...');
  await Promise.all([
    loadWFSLayer(WFS_CONFIG.layers.HEALTH_CENTER),
    loadWFSLayer(WFS_CONFIG.layers.EDUCATION)
  ]);
  
  for (let i = 0; i < total; i++) {
    const infra = infrastructures[i];
    
    const result = await geocodeInfrastructure(infra);
    results.push(result);
    
    if (onProgress) {
      onProgress(i + 1, total);
    }
    
    // Pequeña pausa para no saturar APIs
    await new Promise(r => setTimeout(r, 100));
  }
  
  return results;
}

/**
 * Limpia la caché de capas WFS
 */
export function clearWFSCache(): void {
  wfsCache.clear();
  console.log('[WFS] Cache limpiada');
}

/**
 * Obtiene estadísticas de la caché (WFS + Local)
 */
export function getCacheStats(): {
  wfs: { layers: string[]; totalFeatures: number };
  local: { loaded: boolean; totalFeatures: number; byCategory: Record<string, number> | null };
} {
  const wfsLayers = Array.from(wfsCache.keys());
  const wfsTotalFeatures = Array.from(wfsCache.values())
    .reduce((sum, features) => sum + features.length, 0);
  
  const localStats = getLoadStats();
  
  return {
    wfs: {
      layers: wfsLayers,
      totalFeatures: wfsTotalFeatures,
    },
    local: {
      loaded: isDataLoaded(),
      totalFeatures: localStats?.totalFeatures || 0,
      byCategory: localStats?.byCategory || null,
    },
  };
}
