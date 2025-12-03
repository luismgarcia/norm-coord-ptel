/**
 * crossValidation.ts - Validación Cruzada Multi-Fuente
 * 
 * F023 Fase 2 - Sesión 2A: Fundamentos
 * 
 * Este módulo implementa la validación cruzada de resultados de geocodificación
 * consultando múltiples fuentes en paralelo y analizando la concordancia.
 * 
 * Objetivo: Elevar score de 75-80% a 92-98% mediante consenso multi-fuente.
 */

import {
  GeocodingError,
  NetworkError,
  TimeoutError,
  NoResultsError,
  wrapError
} from '../services/geocoding/errors';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/** Punto en coordenadas UTM30 ETRS89 (EPSG:25830) */
export interface UTMPoint {
  x: number;  // Easting (metros)
  y: number;  // Northing (metros)
}

/** Identificadores de fuentes de geocodificación */
export type GeocodingSourceId = 
  | 'LOCAL'        // Datos DERA offline (máxima autoridad)
  | 'CARTOCIUDAD'  // IGN CartoCiudad
  | 'CDAU'         // Callejero Digital de Andalucía
  | 'WFS_HEALTH'   // SICESS/DERA Sanitario
  | 'WFS_EDUCATION'// Centros educativos
  | 'WFS_CULTURAL' // IAPH Patrimonio
  | 'WFS_SECURITY' // Emergencias
  | 'NGA'          // Nomenclátor Geográfico
  | 'NOMINATIM'    // OpenStreetMap
  | 'OVERPASS';    // OSM Overpass API

/** Configuración de una fuente de geocodificación */
export interface GeocodingSource {
  id: GeocodingSourceId;
  name: string;
  /** Peso de autoridad (0-1): LOCAL=0.95, WFS=0.85, CARTO=0.80, NOM=0.55 */
  authorityWeight: number;
  /** Timeout individual en ms (default 5000) */
  timeoutMs?: number;
  /** Función que ejecuta la geocodificación */
  geocode: (query: GeocodingQuery) => Promise<GeocodingResult | null>;
}

/** Query de geocodificación */
export interface GeocodingQuery {
  /** Nombre de la infraestructura */
  nombre: string;
  /** Código INE del municipio (5 dígitos) */
  codMun: string;
  /** Nombre del municipio */
  municipio?: string;
  /** Tipología PTEL */
  tipologia?: string;
  /** Dirección si está disponible */
  direccion?: string;
}


/** Resultado de una geocodificación individual */
export interface GeocodingResult {
  /** Coordenadas UTM30 */
  coordinates: UTMPoint;
  /** Nombre encontrado (puede diferir del query) */
  matchedName?: string;
  /** Score de match del nombre (0-100) */
  matchScore?: number;
  /** Confianza de la fuente (0-1) */
  confidence?: number;
}

/** Resultado de una fuente con metadatos */
export interface SourceResult {
  /** Identificador de la fuente */
  sourceId: GeocodingSourceId;
  /** Nombre legible de la fuente */
  sourceName: string;
  /** Peso de autoridad de la fuente */
  authorityWeight: number;
  /** Resultado si tuvo éxito */
  result: GeocodingResult | null;
  /** Error si falló */
  error: GeocodingError | null;
  /** Tiempo de respuesta en ms */
  responseTimeMs: number;
  /** Estado de la consulta */
  status: 'success' | 'error' | 'timeout' | 'no_results';
}

/** Resultado de análisis de cluster */
export interface ClusterAnalysis {
  /** Punto central calculado (centroide robusto) */
  centroid: UTMPoint;
  /** Radio del cluster en metros */
  radiusMeters: number;
  /** Número de fuentes que concuerdan */
  concordantSources: number;
  /** Fuentes outlier (discrepantes) */
  outlierSources: GeocodingSourceId[];
  /** Score de concordancia (0-1) */
  concordanceScore: number;
}

/** Resultado completo de validación cruzada */
export interface CrossValidationResult {
  /** Query original */
  query: GeocodingQuery;
  /** Resultados de todas las fuentes consultadas */
  sourceResults: SourceResult[];
  /** Análisis del cluster de resultados */
  clusterAnalysis: ClusterAnalysis | null;
  /** Score compuesto final (0-100) */
  compositeScore: number;
  /** Coordenada final recomendada */
  recommendedCoordinate: UTMPoint | null;
  /** Recomendación de acción */
  recommendation: 'USE_RESULT' | 'MANUAL_REVIEW' | 'REJECT';
  /** Razón de la recomendación */
  recommendationReason: string;
  /** Timestamp de la validación */
  timestamp: Date;
}


// ============================================================================
// FUNCIONES DE DISTANCIA
// ============================================================================

/**
 * Calcula la distancia euclidiana entre dos puntos UTM.
 * 
 * Para coordenadas UTM30 ETRS89 (EPSG:25830), la distancia euclidiana
 * es suficientemente precisa para distancias menores a ~100km.
 * 
 * @param p1 - Primer punto UTM
 * @param p2 - Segundo punto UTM
 * @returns Distancia en metros
 * 
 * @example
 * const d = distanceUTM(
 *   { x: 524538, y: 4229920 },
 *   { x: 524600, y: 4230000 }
 * );
 * // d ≈ 100.5 metros
 */
export function distanceUTM(p1: UTMPoint, p2: UTMPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Verifica si dos puntos están dentro de una tolerancia dada.
 * 
 * @param p1 - Primer punto UTM
 * @param p2 - Segundo punto UTM
 * @param toleranceMeters - Tolerancia máxima en metros
 * @returns true si están dentro de la tolerancia
 */
export function pointsWithinTolerance(
  p1: UTMPoint,
  p2: UTMPoint,
  toleranceMeters: number
): boolean {
  return distanceUTM(p1, p2) <= toleranceMeters;
}


// ============================================================================
// CONSULTA PARALELA MULTI-FUENTE
// ============================================================================

/** Timeout por defecto para cada fuente (ms) */
const DEFAULT_SOURCE_TIMEOUT_MS = 5000;

/**
 * Consulta múltiples fuentes de geocodificación en paralelo.
 * 
 * Usa Promise.allSettled para tolerancia a fallos: si una fuente falla,
 * las demás continúan. Cada fuente tiene su propio timeout.
 * 
 * @param query - Query de geocodificación
 * @param sources - Array de fuentes a consultar
 * @param globalTimeoutMs - Timeout global opcional (default: sin límite global)
 * @returns Array de resultados, uno por cada fuente
 * 
 * @example
 * const results = await queryMultipleSources(
 *   { nombre: 'Centro de Salud', codMun: '04013', tipologia: 'SANITARIO' },
 *   [localSource, cartoCiudadSource, cdauSource]
 * );
 */
export async function queryMultipleSources(
  query: GeocodingQuery,
  sources: GeocodingSource[],
  globalTimeoutMs?: number
): Promise<SourceResult[]> {
  if (sources.length === 0) {
    return [];
  }

  // Crear promesas con timeout individual para cada fuente
  const sourcePromises = sources.map(source => 
    querySourceWithTimeout(source, query)
  );

  // Si hay timeout global, envolver todo en una carrera
  let results: PromiseSettledResult<SourceResult>[];
  
  if (globalTimeoutMs) {
    const globalTimeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new TimeoutError(
        'Timeout global de validación cruzada',
        globalTimeoutMs
      )), globalTimeoutMs)
    );
    
    try {
      results = await Promise.race([
        Promise.allSettled(sourcePromises),
        globalTimeout.then(() => { throw new Error('timeout'); })
      ]) as PromiseSettledResult<SourceResult>[];
    } catch {
      // Si el timeout global dispara, devolvemos lo que tengamos
      results = await Promise.allSettled(sourcePromises);
    }
  } else {
    results = await Promise.allSettled(sourcePromises);
  }

  // Transformar resultados de allSettled a SourceResult[]
  return results.map((settled, index) => {
    if (settled.status === 'fulfilled') {
      return settled.value;
    } else {
      // Promesa rechazada - crear SourceResult de error
      const source = sources[index];
      const error = wrapError(settled.reason, {
        source: source.id,
        query: query.nombre
      });
      
      return {
        sourceId: source.id,
        sourceName: source.name,
        authorityWeight: source.authorityWeight,
        result: null,
        error,
        responseTimeMs: source.timeoutMs ?? DEFAULT_SOURCE_TIMEOUT_MS,
        status: 'error' as const
      };
    }
  });
}


/**
 * Consulta una fuente individual con timeout.
 * 
 * @internal
 */
async function querySourceWithTimeout(
  source: GeocodingSource,
  query: GeocodingQuery
): Promise<SourceResult> {
  const timeoutMs = source.timeoutMs ?? DEFAULT_SOURCE_TIMEOUT_MS;
  const startTime = performance.now();
  
  // Crear promesa de timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(
        `Timeout consultando ${source.name}`,
        timeoutMs,
        { source: source.id, query: query.nombre }
      ));
    }, timeoutMs);
  });

  try {
    // Carrera entre geocodificación y timeout
    const result = await Promise.race([
      source.geocode(query),
      timeoutPromise
    ]);
    
    const responseTimeMs = performance.now() - startTime;
    
    if (result === null) {
      return {
        sourceId: source.id,
        sourceName: source.name,
        authorityWeight: source.authorityWeight,
        result: null,
        error: new NoResultsError(
          `Sin resultados en ${source.name}`,
          [source.id],
          { source: source.id, query: query.nombre }
        ),
        responseTimeMs,
        status: 'no_results'
      };
    }
    
    return {
      sourceId: source.id,
      sourceName: source.name,
      authorityWeight: source.authorityWeight,
      result,
      error: null,
      responseTimeMs,
      status: 'success'
    };
    
  } catch (error) {
    const responseTimeMs = performance.now() - startTime;
    const wrappedError = wrapError(error, {
      source: source.id,
      query: query.nombre
    });
    
    // Determinar status basado en tipo de error
    let status: SourceResult['status'] = 'error';
    if (wrappedError instanceof TimeoutError) {
      status = 'timeout';
    } else if (wrappedError instanceof NoResultsError) {
      status = 'no_results';
    }
    
    return {
      sourceId: source.id,
      sourceName: source.name,
      authorityWeight: source.authorityWeight,
      result: null,
      error: wrappedError,
      responseTimeMs,
      status
    };
  }
}


// ============================================================================
// UTILIDADES AUXILIARES
// ============================================================================

/**
 * Filtra resultados exitosos de una validación cruzada.
 */
export function getSuccessfulResults(results: SourceResult[]): SourceResult[] {
  return results.filter(r => r.status === 'success' && r.result !== null);
}

/**
 * Extrae coordenadas de resultados exitosos.
 */
export function extractCoordinates(results: SourceResult[]): UTMPoint[] {
  return getSuccessfulResults(results)
    .map(r => r.result!.coordinates);
}

/**
 * Calcula el tiempo total de respuesta.
 */
export function getTotalResponseTime(results: SourceResult[]): number {
  return Math.max(...results.map(r => r.responseTimeMs), 0);
}
