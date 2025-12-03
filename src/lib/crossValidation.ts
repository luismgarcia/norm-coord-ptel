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


// ============================================================================
// SESIÓN 2B: ALGORITMOS DE CLUSTERING
// ============================================================================

/** Umbral por defecto para considerar puntos concordantes (metros) */
const DEFAULT_CONCORDANCE_THRESHOLD_METERS = 100;

/** Constante k para el estimador de Huber (típicamente 1.345 para 95% eficiencia) */
const HUBER_K = 1.345;

/** Máximo de iteraciones para convergencia del centroide */
const MAX_HUBER_ITERATIONS = 20;

/** Tolerancia para convergencia (metros) */
const CONVERGENCE_TOLERANCE = 0.1;

/** Escala mínima para considerar outliers (metros). 
 * Si la MAD es menor, todos los puntos se consideran concordantes. */
const MIN_SCALE_FOR_OUTLIERS = 10;

/**
 * Calcula el centroide simple (media aritmética) de un conjunto de puntos.
 * 
 * @param points - Array de puntos UTM
 * @returns Centroide simple
 */
export function simpleCentroid(points: UTMPoint[]): UTMPoint {
  if (points.length === 0) {
    throw new Error('No se puede calcular centroide de array vacío');
  }
  
  if (points.length === 1) {
    return { ...points[0] };
  }
  
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  
  return {
    x: sumX / points.length,
    y: sumY / points.length
  };
}

/**
 * Calcula la mediana de un array de números.
 * 
 * @param values - Array de valores numéricos
 * @returns Mediana
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calcula la MAD (Median Absolute Deviation) como estimador robusto de escala.
 * 
 * @param values - Array de valores
 * @param center - Valor central (típicamente la mediana)
 * @returns MAD escalada (multiplicada por 1.4826 para consistencia con desviación estándar)
 */
function mad(values: number[], center: number): number {
  if (values.length === 0) return 0;
  
  const deviations = values.map(v => Math.abs(v - center));
  // Factor 1.4826 para que MAD sea consistente con desviación estándar en distribución normal
  return median(deviations) * 1.4826;
}


/**
 * Calcula el centroide robusto usando el estimador de Huber.
 * 
 * El estimador de Huber reduce la influencia de outliers:
 * - Puntos cercanos al centro contribuyen normalmente
 * - Puntos lejanos (outliers) tienen peso reducido
 * 
 * Algoritmo iterativo:
 * 1. Inicializar con centroide simple
 * 2. Calcular distancias y MAD como escala robusta
 * 3. Aplicar pesos de Huber según distancia
 * 4. Recalcular centroide ponderado
 * 5. Repetir hasta convergencia
 * 
 * @param points - Array de puntos UTM (mínimo 1)
 * @returns Centroide robusto y pesos finales de cada punto
 * 
 * @example
 * const { centroid, weights } = huberCentroid([
 *   { x: 524538, y: 4229920 },  // Punto normal
 *   { x: 524540, y: 4229925 },  // Punto normal
 *   { x: 525000, y: 4230500 }   // Outlier - tendrá peso bajo
 * ]);
 */
export function huberCentroid(
  points: UTMPoint[]
): { centroid: UTMPoint; weights: number[] } {
  if (points.length === 0) {
    throw new Error('No se puede calcular centroide de array vacío');
  }
  
  if (points.length === 1) {
    return { centroid: { ...points[0] }, weights: [1] };
  }
  
  if (points.length === 2) {
    // Con 2 puntos, el centroide simple es óptimo
    return { 
      centroid: simpleCentroid(points), 
      weights: [1, 1] 
    };
  }
  
  // Inicializar con centroide simple
  let currentCentroid = simpleCentroid(points);
  let weights = new Array(points.length).fill(1);
  
  for (let iteration = 0; iteration < MAX_HUBER_ITERATIONS; iteration++) {
    // Calcular distancias al centroide actual
    const distances = points.map(p => distanceUTM(p, currentCentroid));
    
    // Calcular escala robusta (MAD de las distancias)
    const medianDist = median(distances);
    const scale = mad(distances, medianDist);
    
    // Si la escala es muy pequeña, verificar si TODOS los puntos están cercanos
    // Si el radio máximo es pequeño, considerar todos concordantes
    if (scale < MIN_SCALE_FOR_OUTLIERS) {
      const maxDist = Math.max(...distances);
      if (maxDist < MIN_SCALE_FOR_OUTLIERS) {
        // Todos los puntos están muy cercanos - considerarlos concordantes
        weights = new Array(points.length).fill(1);
        break;
      }
      // Hay outliers pero la escala es pequeña - usar una escala mínima
      // y CONTINUAR iterando para que el centroide converja
      const effectiveScale = Math.max(scale, MIN_SCALE_FOR_OUTLIERS);
      weights = distances.map(d => {
        if (d === 0) return 1;
        const u = d / effectiveScale;
        if (u <= HUBER_K) {
          return 1;
        }
        return HUBER_K / u;
      });
      // NO hacer break - continuar iterando para convergencia
    } else {
      // Calcular pesos de Huber normalmente
      weights = distances.map(d => {
        if (d === 0) return 1;
        const u = d / scale;
        if (u <= HUBER_K) {
          return 1; // Dentro del umbral: peso completo
        }
        return HUBER_K / u; // Fuera: peso reducido proporcionalmente
      });
    }
    
    // Calcular nuevo centroide ponderado
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const newCentroid: UTMPoint = {
      x: points.reduce((sum, p, i) => sum + p.x * weights[i], 0) / totalWeight,
      y: points.reduce((sum, p, i) => sum + p.y * weights[i], 0) / totalWeight
    };
    
    // Verificar convergencia
    const shift = distanceUTM(currentCentroid, newCentroid);
    currentCentroid = newCentroid;
    
    if (shift < CONVERGENCE_TOLERANCE) {
      break;
    }
  }
  
  return { centroid: currentCentroid, weights };
}


/**
 * Identifica qué fuentes son outliers (discrepantes) del cluster principal.
 * 
 * Un punto es outlier si:
 * - Su peso de Huber es menor a 0.5 (contribuyó poco al centroide)
 * - O su distancia al centroide excede el umbral de concordancia
 * 
 * @param results - Resultados exitosos con coordenadas
 * @param centroid - Centroide calculado
 * @param weights - Pesos de Huber
 * @param thresholdMeters - Umbral de distancia para concordancia
 * @returns Array de IDs de fuentes outlier
 */
export function identifyOutliers(
  results: SourceResult[],
  centroid: UTMPoint,
  weights: number[],
  thresholdMeters: number = DEFAULT_CONCORDANCE_THRESHOLD_METERS
): GeocodingSourceId[] {
  const outliers: GeocodingSourceId[] = [];
  
  results.forEach((r, i) => {
    if (r.result) {
      const distance = distanceUTM(r.result.coordinates, centroid);
      const weight = weights[i] ?? 1;
      
      // Outlier si peso bajo O distancia alta
      if (weight < 0.5 || distance > thresholdMeters) {
        outliers.push(r.sourceId);
      }
    }
  });
  
  return outliers;
}

/**
 * Calcula el radio del cluster como la distancia máxima al centroide
 * de los puntos concordantes (no outliers).
 * 
 * @param points - Puntos del cluster
 * @param centroid - Centroide
 * @param weights - Pesos de Huber (opcional, para excluir outliers)
 * @returns Radio en metros
 */
export function calculateClusterRadius(
  points: UTMPoint[],
  centroid: UTMPoint,
  weights?: number[]
): number {
  if (points.length === 0) return 0;
  
  const distances = points.map((p, i) => {
    // Si hay pesos y el punto es outlier (peso < 0.5), excluirlo
    if (weights && weights[i] < 0.5) {
      return 0;
    }
    return distanceUTM(p, centroid);
  });
  
  return Math.max(...distances, 0);
}


/**
 * Calcula el score de concordancia basado en:
 * - Proporción de fuentes concordantes vs total
 * - Ponderado por autoridad de las fuentes
 * 
 * @param results - Todos los resultados
 * @param outlierIds - IDs de fuentes outlier
 * @returns Score de concordancia (0-1)
 */
export function calculateConcordanceScore(
  results: SourceResult[],
  outlierIds: GeocodingSourceId[]
): number {
  const successful = getSuccessfulResults(results);
  
  if (successful.length === 0) return 0;
  if (successful.length === 1) return 1; // Un solo resultado = concordancia perfecta consigo mismo
  
  // Calcular peso total de concordantes vs total
  let concordantWeight = 0;
  let totalWeight = 0;
  
  for (const r of successful) {
    totalWeight += r.authorityWeight;
    if (!outlierIds.includes(r.sourceId)) {
      concordantWeight += r.authorityWeight;
    }
  }
  
  return totalWeight > 0 ? concordantWeight / totalWeight : 0;
}

/**
 * Analiza el cluster de resultados de geocodificación.
 * 
 * Esta es la función principal de la sesión 2B que:
 * 1. Extrae coordenadas de resultados exitosos
 * 2. Calcula centroide robusto (Huber)
 * 3. Identifica outliers
 * 4. Calcula radio del cluster
 * 5. Calcula score de concordancia
 * 
 * @param results - Array de resultados de múltiples fuentes
 * @param options - Opciones de configuración
 * @returns Análisis del cluster o null si no hay suficientes datos
 * 
 * @example
 * const analysis = analyzeResultClusters(sourceResults);
 * if (analysis && analysis.concordanceScore > 0.8) {
 *   // Alta concordancia - usar el centroide
 *   console.log('Coordenada confiable:', analysis.centroid);
 * }
 */
export function analyzeResultClusters(
  results: SourceResult[],
  options: {
    /** Umbral de distancia para concordancia (metros) */
    concordanceThreshold?: number;
  } = {}
): ClusterAnalysis | null {
  const { 
    concordanceThreshold = DEFAULT_CONCORDANCE_THRESHOLD_METERS 
  } = options;
  
  // Filtrar resultados exitosos
  const successful = getSuccessfulResults(results);
  
  if (successful.length === 0) {
    return null;
  }
  
  // Extraer coordenadas
  const coordinates = successful.map(r => r.result!.coordinates);
  
  // Caso especial: un solo resultado
  if (coordinates.length === 1) {
    return {
      centroid: { ...coordinates[0] },
      radiusMeters: 0,
      concordantSources: 1,
      outlierSources: [],
      concordanceScore: 1 // Concordancia perfecta consigo mismo
    };
  }
  
  // Calcular centroide robusto
  const { centroid, weights } = huberCentroid(coordinates);
  
  // Identificar outliers
  const outlierSources = identifyOutliers(
    successful, 
    centroid, 
    weights, 
    concordanceThreshold
  );
  
  // Calcular radio del cluster (excluyendo outliers)
  const radiusMeters = calculateClusterRadius(coordinates, centroid, weights);
  
  // Calcular score de concordancia
  const concordanceScore = calculateConcordanceScore(successful, outlierSources);
  
  // Contar fuentes concordantes
  const concordantSources = successful.length - outlierSources.length;
  
  return {
    centroid,
    radiusMeters,
    concordantSources,
    outlierSources,
    concordanceScore
  };
}


// ============================================================================
// SESIÓN 2C: INTEGRACIÓN - SCORE COMPUESTO Y RECOMENDACIONES
// ============================================================================

/** Pesos de autoridad por fuente */
export const SOURCE_AUTHORITY_WEIGHTS: Record<GeocodingSourceId, number> = {
  LOCAL: 0.95,        // Datos DERA offline - máxima autoridad
  WFS_HEALTH: 0.90,   // WFS especializado sanitario
  WFS_EDUCATION: 0.90,
  WFS_CULTURAL: 0.85,
  WFS_SECURITY: 0.85,
  CARTOCIUDAD: 0.80,  // IGN CartoCiudad
  CDAU: 0.80,         // Callejero Andalucía
  NGA: 0.75,          // Nomenclátor Geográfico
  OVERPASS: 0.60,     // OpenStreetMap Overpass
  NOMINATIM: 0.55     // OpenStreetMap Nominatim
};

/** Umbrales de distancia (metros) por tipología para detectar discrepancias */
export const DISCREPANCY_THRESHOLDS: Record<string, number> = {
  // Infraestructuras puntuales - umbral bajo
  SANITARIO: 50,
  EDUCATIVO: 50,
  SEGURIDAD: 50,
  SERVICIOS_BASICOS: 75,
  
  // Infraestructuras de área - umbral medio
  DEPORTIVO: 100,
  CULTURAL: 100,
  ADMINISTRATIVO: 75,
  
  // Infraestructuras lineales/extensas - umbral alto
  TRANSPORTE: 150,
  HIDRAULICO: 200,
  ENERGIA: 200,
  
  // Default para tipologías no especificadas
  DEFAULT: 100
};

/** Pesos para el score compuesto */
const COMPOSITE_WEIGHTS = {
  /** Peso del match de nombre (0-1) */
  matchScore: 0.35,
  /** Peso de la concordancia entre fuentes (0-1) */
  concordanceScore: 0.40,
  /** Peso de la autoridad de la fuente principal (0-1) */
  authorityScore: 0.25
};


/**
 * Calcula el score compuesto de validación cruzada.
 * 
 * Fórmula: α×matchScore + β×concordanceScore + γ×authorityScore
 * donde α=0.35, β=0.40, γ=0.25
 * 
 * @param matchScore - Score de coincidencia de nombre (0-100)
 * @param concordanceScore - Score de concordancia entre fuentes (0-1)
 * @param authorityScore - Peso de autoridad promedio de fuentes concordantes (0-1)
 * @returns Score compuesto (0-100)
 */
export function calculateCompositeScore(
  matchScore: number,
  concordanceScore: number,
  authorityScore: number
): number {
  // Normalizar matchScore a 0-1 si viene en escala 0-100
  const normalizedMatch = matchScore > 1 ? matchScore / 100 : matchScore;
  
  const composite = 
    COMPOSITE_WEIGHTS.matchScore * normalizedMatch +
    COMPOSITE_WEIGHTS.concordanceScore * concordanceScore +
    COMPOSITE_WEIGHTS.authorityScore * authorityScore;
  
  // Devolver en escala 0-100
  return Math.round(composite * 100);
}

/**
 * Obtiene el umbral de discrepancia para una tipología.
 * 
 * @param tipologia - Tipología PTEL
 * @returns Umbral en metros
 */
export function getDiscrepancyThreshold(tipologia?: string): number {
  if (!tipologia) return DISCREPANCY_THRESHOLDS.DEFAULT;
  
  const upper = tipologia.toUpperCase();
  return DISCREPANCY_THRESHOLDS[upper] ?? DISCREPANCY_THRESHOLDS.DEFAULT;
}

/**
 * Detecta si hay discrepancia significativa entre fuentes.
 * 
 * Una discrepancia existe cuando:
 * - El radio del cluster excede el umbral para la tipología
 * - O hay outliers con peso alto (fuentes autoritativas discrepantes)
 * 
 * @param clusterAnalysis - Análisis del cluster
 * @param tipologia - Tipología de la infraestructura
 * @returns Objeto con detección y razón
 */
export function detectDiscrepancy(
  clusterAnalysis: ClusterAnalysis,
  tipologia?: string
): { hasDiscrepancy: boolean; reason: string; severity: 'low' | 'medium' | 'high' } {
  const threshold = getDiscrepancyThreshold(tipologia);
  
  // Verificar radio del cluster
  if (clusterAnalysis.radiusMeters > threshold * 2) {
    return {
      hasDiscrepancy: true,
      reason: `Radio del cluster (${Math.round(clusterAnalysis.radiusMeters)}m) excede umbral crítico (${threshold * 2}m)`,
      severity: 'high'
    };
  }
  
  if (clusterAnalysis.radiusMeters > threshold) {
    return {
      hasDiscrepancy: true,
      reason: `Radio del cluster (${Math.round(clusterAnalysis.radiusMeters)}m) excede umbral (${threshold}m)`,
      severity: 'medium'
    };
  }
  
  // Verificar outliers de fuentes autoritativas
  const authoritativeOutliers = clusterAnalysis.outlierSources.filter(
    id => SOURCE_AUTHORITY_WEIGHTS[id] >= 0.80
  );
  
  if (authoritativeOutliers.length > 0) {
    return {
      hasDiscrepancy: true,
      reason: `Fuentes autoritativas discrepantes: ${authoritativeOutliers.join(', ')}`,
      severity: 'medium'
    };
  }
  
  // Verificar concordancia baja
  if (clusterAnalysis.concordanceScore < 0.6) {
    return {
      hasDiscrepancy: true,
      reason: `Concordancia baja entre fuentes (${Math.round(clusterAnalysis.concordanceScore * 100)}%)`,
      severity: 'low'
    };
  }
  
  return {
    hasDiscrepancy: false,
    reason: 'Todas las fuentes concuerdan dentro del umbral',
    severity: 'low'
  };
}


/**
 * Genera una recomendación basada en el análisis de validación cruzada.
 * 
 * @param compositeScore - Score compuesto (0-100)
 * @param discrepancy - Resultado de detección de discrepancia
 * @param concordantSources - Número de fuentes que concuerdan
 * @returns Recomendación y razón
 */
export function generateRecommendation(
  compositeScore: number,
  discrepancy: { hasDiscrepancy: boolean; severity: 'low' | 'medium' | 'high' },
  concordantSources: number
): { recommendation: CrossValidationResult['recommendation']; reason: string } {
  
  // REJECT: Score muy bajo o discrepancia severa
  if (compositeScore < 40) {
    return {
      recommendation: 'REJECT',
      reason: `Score muy bajo (${compositeScore}%) - datos insuficientes o conflictivos`
    };
  }
  
  if (discrepancy.hasDiscrepancy && discrepancy.severity === 'high') {
    return {
      recommendation: 'REJECT',
      reason: 'Discrepancia severa entre fuentes - requiere verificación manual antes de uso'
    };
  }
  
  // MANUAL_REVIEW: Score medio o discrepancia moderada
  if (compositeScore < 70) {
    return {
      recommendation: 'MANUAL_REVIEW',
      reason: `Score moderado (${compositeScore}%) - revisar coordenadas manualmente`
    };
  }
  
  if (discrepancy.hasDiscrepancy && discrepancy.severity === 'medium') {
    return {
      recommendation: 'MANUAL_REVIEW',
      reason: 'Discrepancia moderada - verificar ubicación en mapa'
    };
  }
  
  if (concordantSources < 2) {
    return {
      recommendation: 'MANUAL_REVIEW',
      reason: 'Solo una fuente disponible - confirmar con otra fuente si es posible'
    };
  }
  
  // USE_RESULT: Score alto y sin discrepancias significativas
  if (compositeScore >= 85 && !discrepancy.hasDiscrepancy) {
    return {
      recommendation: 'USE_RESULT',
      reason: `Alta confianza (${compositeScore}%) - ${concordantSources} fuentes concuerdan`
    };
  }
  
  // Caso intermedio: score bueno pero con alguna incertidumbre
  if (compositeScore >= 70) {
    if (discrepancy.hasDiscrepancy && discrepancy.severity === 'low') {
      return {
        recommendation: 'USE_RESULT',
        reason: `Confianza aceptable (${compositeScore}%) con discrepancia menor`
      };
    }
    return {
      recommendation: 'USE_RESULT',
      reason: `Confianza buena (${compositeScore}%) - ${concordantSources} fuentes concuerdan`
    };
  }
  
  // Default: revisar manualmente
  return {
    recommendation: 'MANUAL_REVIEW',
    reason: 'Revisar coordenadas manualmente por precaución'
  };
}


/**
 * Realiza la validación cruzada completa de una geocodificación.
 * 
 * Esta es la función principal que:
 * 1. Consulta múltiples fuentes en paralelo
 * 2. Analiza el cluster de resultados
 * 3. Calcula score compuesto
 * 4. Detecta discrepancias
 * 5. Genera recomendación
 * 
 * @param query - Query de geocodificación
 * @param sources - Fuentes a consultar
 * @param options - Opciones de configuración
 * @returns Resultado completo de validación cruzada
 * 
 * @example
 * const result = await performCrossValidation(
 *   { nombre: 'Centro de Salud', codMun: '04013', tipologia: 'SANITARIO' },
 *   [localSource, cartoCiudadSource, cdauSource]
 * );
 * 
 * if (result.recommendation === 'USE_RESULT') {
 *   console.log('Coordenada confiable:', result.recommendedCoordinate);
 * }
 */
export async function performCrossValidation(
  query: GeocodingQuery,
  sources: GeocodingSource[],
  options: {
    /** Timeout global en ms */
    timeoutMs?: number;
    /** Umbral de concordancia personalizado */
    concordanceThreshold?: number;
  } = {}
): Promise<CrossValidationResult> {
  const timestamp = new Date();
  
  // 1. Consultar múltiples fuentes en paralelo
  const sourceResults = await queryMultipleSources(query, sources, options.timeoutMs);
  
  // 2. Analizar cluster de resultados
  const clusterAnalysis = analyzeResultClusters(sourceResults, {
    concordanceThreshold: options.concordanceThreshold ?? getDiscrepancyThreshold(query.tipologia)
  });
  
  // Si no hay resultados exitosos
  if (!clusterAnalysis) {
    return {
      query,
      sourceResults,
      clusterAnalysis: null,
      compositeScore: 0,
      recommendedCoordinate: null,
      recommendation: 'REJECT',
      recommendationReason: 'Ninguna fuente devolvió resultados válidos',
      timestamp
    };
  }
  
  // 3. Calcular scores
  const successful = getSuccessfulResults(sourceResults);
  
  // Calcular matchScore promedio ponderado
  let totalMatchScore = 0;
  let totalWeight = 0;
  for (const r of successful) {
    const matchScore = r.result?.matchScore ?? 70; // Default 70 si no hay score
    totalMatchScore += matchScore * r.authorityWeight;
    totalWeight += r.authorityWeight;
  }
  const avgMatchScore = totalWeight > 0 ? totalMatchScore / totalWeight : 0;
  
  // Calcular authorityScore de fuentes concordantes
  const concordantResults = successful.filter(
    r => !clusterAnalysis.outlierSources.includes(r.sourceId)
  );
  const avgAuthority = concordantResults.length > 0
    ? concordantResults.reduce((sum, r) => sum + r.authorityWeight, 0) / concordantResults.length
    : 0;
  
  const compositeScore = calculateCompositeScore(
    avgMatchScore,
    clusterAnalysis.concordanceScore,
    avgAuthority
  );
  
  // 4. Detectar discrepancias
  const discrepancy = detectDiscrepancy(clusterAnalysis, query.tipologia);
  
  // 5. Generar recomendación
  const { recommendation, reason } = generateRecommendation(
    compositeScore,
    discrepancy,
    clusterAnalysis.concordantSources
  );
  
  return {
    query,
    sourceResults,
    clusterAnalysis,
    compositeScore,
    recommendedCoordinate: clusterAnalysis.centroid,
    recommendation,
    recommendationReason: reason,
    timestamp
  };
}
