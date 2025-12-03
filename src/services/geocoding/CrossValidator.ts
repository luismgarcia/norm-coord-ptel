/**
 * CrossValidator.ts - Sistema de Validación Cruzada Multi-Fuente
 * 
 * Valida resultados de geocodificación consultando múltiples fuentes
 * y calculando scores compuestos basados en concordancia geográfica.
 * 
 * OBJETIVO: Score 92-98% con detección de errores ~95%
 * 
 * ESTRATEGIA:
 * 1. Obtener resultado de fuente primaria (L0: LOCAL_DERA)
 * 2. Consultar al menos 1 fuente secundaria (L1: WFS online)
 * 3. Calcular distancia entre resultados
 * 4. Generar score compuesto ponderado
 * 5. Detectar discrepancias y flags de revisión
 * 
 * FÓRMULA SCORING:
 * Score = α * C_match + β * C_concordance + γ * C_source
 * Donde:
 *   α = 0.40 (peso mejor match individual)
 *   β = 0.35 (peso concordancia entre fuentes)
 *   γ = 0.25 (peso autoridad de fuentes)
 * 
 * @module services/geocoding/CrossValidator
 * @version 2.0.0 - Integración con algoritmos robustos (huberCentroid, outlier detection)
 * @date 2025-12-04
 */

import type { GeocodingResult } from '../../types/infrastructure';

// Algoritmos robustos de crossValidation.ts (F023 Fase 2)
import {
  huberCentroid,
  analyzeResultClusters,
  calculateCompositeScore as calculateEnhancedScore,
  detectDiscrepancy,
  generateRecommendation,
  distanceUTM,
  SOURCE_AUTHORITY_WEIGHTS as ENHANCED_AUTHORITY_WEIGHTS,
  DISCREPANCY_THRESHOLDS,
  type UTMPoint,
  type ClusterAnalysis,
  type SourceResult as EnhancedSourceResult,
  type GeocodingSourceId,
} from '../../lib/crossValidation';

// ============================================================================
// TIPOS
// ============================================================================

/** Fuentes disponibles con sus pesos de autoridad */
export type GeocodingSource = 
  | 'LOCAL_DERA'      // Datos offline pre-descargados
  | 'WFS_DERA'        // WFS online DERA
  | 'WFS_SPECIALIZED' // WFS especializados (salud, educación, etc.)
  | 'CDAU'            // Callejero Digital Andalucía
  | 'CARTOCIUDAD'     // IGN CartoCiudad
  | 'NGA'             // Nomenclátor Geográfico Andalucía
  | 'IAID'            // Instalaciones Deportivas
  | 'OSM'             // OpenStreetMap/Overpass
  | 'NOMINATIM';      // Nominatim OSM

/** Resultado de una fuente individual */
export interface SourceResult {
  source: GeocodingSource;
  x: number;
  y: number;
  confidence: number;      // 0-100
  matchedName?: string;
  responseTimeMs: number;
}

/** Estado de validación cruzada */
export type ValidationStatus = 
  | 'CONFIRMED'           // <50m entre fuentes, alta confianza
  | 'LIKELY_VALID'        // <200m, confianza media-alta
  | 'UNCERTAIN'           // <500m, requiere atención
  | 'CONFLICT'            // >500m, discrepancia detectada
  | 'SINGLE_SOURCE'       // Solo una fuente disponible
  | 'NO_RESULTS';         // Ninguna fuente encontró resultado

/** Resultado de validación cruzada */
export interface CrossValidationResult {
  /** Coordenadas finales (mejor estimación) */
  coordinates: {
    x: number;
    y: number;
  } | null;
  
  /** Score compuesto 0-100 */
  compositeScore: number;
  
  /** Estado de validación */
  status: ValidationStatus;
  
  /** Distancia entre fuentes en metros (si hay múltiples) */
  discrepancyMeters: number | null;
  
  /** Resultados de cada fuente consultada */
  sourceResults: SourceResult[];
  
  /** Fuente primaria usada para coordenadas finales */
  primarySource: GeocodingSource | null;
  
  /** Tiempo total de validación en ms */
  totalTimeMs: number;
  
  /** Requiere revisión manual */
  requiresManualReview: boolean;
  
  /** Razón si requiere revisión */
  reviewReason?: string;
  
  /** Detalles del cálculo de score */
  scoreBreakdown: {
    C_match: number;
    C_concordance: number;
    C_source: number;
    bonusApplied: number;
  };
}

/** Configuración de validación */
export interface CrossValidationConfig {
  /** Umbral distancia para CONFIRMED (metros) */
  confirmedThreshold: number;
  
  /** Umbral distancia para LIKELY_VALID (metros) */
  likelyValidThreshold: number;
  
  /** Umbral distancia para UNCERTAIN (metros) */
  uncertainThreshold: number;
  
  /** Mínimo de fuentes a consultar */
  minSources: number;
  
  /** Timeout por fuente en ms */
  sourceTimeoutMs: number;
  
  /** Aplicar bonus por concordancia perfecta */
  applyPerfectMatchBonus: boolean;
}

/** Umbrales por tipología de infraestructura */
export interface InfrastructureThresholds {
  confirmed: number;   // metros
  acceptable: number;  // metros
  review: number;      // metros
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Pesos de autoridad por fuente (0-1) */
export const SOURCE_AUTHORITY_WEIGHTS: Record<GeocodingSource, number> = {
  'CDAU': 0.95,            // Máxima para direcciones andaluzas
  'WFS_SPECIALIZED': 0.92, // Muy alta para tipologías específicas
  'WFS_DERA': 0.90,        // Alta para datos oficiales Junta
  'LOCAL_DERA': 0.88,      // Alta pero puede estar desactualizado
  'CARTOCIUDAD': 0.85,     // Alta cobertura nacional
  'NGA': 0.80,             // Buena para topónimos
  'IAID': 0.78,            // Buena para deportes
  'OSM': 0.65,             // Media (datos crowdsourced)
  'NOMINATIM': 0.50,       // Fallback, menor precisión
};

/** Pesos del scoring compuesto */
const SCORE_WEIGHTS = {
  α: 0.40,  // Mejor score individual
  β: 0.35,  // Concordancia entre fuentes
  γ: 0.25,  // Autoridad de fuentes
};

/** Configuración por defecto */
const DEFAULT_CONFIG: CrossValidationConfig = {
  confirmedThreshold: 50,      // <50m = CONFIRMED
  likelyValidThreshold: 200,   // <200m = LIKELY_VALID
  uncertainThreshold: 500,     // <500m = UNCERTAIN, >500m = CONFLICT
  minSources: 2,
  sourceTimeoutMs: 5000,
  applyPerfectMatchBonus: true,
};

/** Umbrales por tipo de infraestructura */
export const INFRASTRUCTURE_THRESHOLDS: Record<string, InfrastructureThresholds> = {
  'SANITARIO': { confirmed: 25, acceptable: 50, review: 100 },
  'EMERGENCIAS': { confirmed: 25, acceptable: 50, review: 100 },
  'SEGURIDAD': { confirmed: 25, acceptable: 75, review: 150 },
  'EDUCATIVO': { confirmed: 50, acceptable: 100, review: 200 },
  'ADMINISTRATIVO': { confirmed: 100, acceptable: 200, review: 300 },
  'CULTURAL': { confirmed: 75, acceptable: 150, review: 250 },
  'DEPORTIVO': { confirmed: 100, acceptable: 200, review: 300 },
  'ENERGIA': { confirmed: 150, acceptable: 300, review: 500 },
  'HIDRAULICO': { confirmed: 100, acceptable: 250, review: 400 },
  'DEFAULT': { confirmed: 100, acceptable: 200, review: 300 },
};

// ============================================================================
// UTILIDADES GEOGRÁFICAS
// ============================================================================

/**
 * Calcula distancia Haversine entre dos puntos en metros
 * Nota: Para coordenadas UTM, usa distancia euclidiana
 */
export function calculateDistance(
  x1: number, y1: number,
  x2: number, y2: number,
  isUTM: boolean = true
): number {
  if (isUTM) {
    // Distancia euclidiana para UTM (ya en metros)
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
  
  // Haversine para coordenadas geográficas (WGS84)
  const R = 6371000; // Radio tierra en metros
  const φ1 = y1 * Math.PI / 180;
  const φ2 = y2 * Math.PI / 180;
  const Δφ = (y2 - y1) * Math.PI / 180;
  const Δλ = (x2 - x1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Calcula el centroide ponderado de múltiples puntos
 */
export function calculateWeightedCentroid(
  results: SourceResult[]
): { x: number; y: number } | null {
  if (results.length === 0) return null;
  if (results.length === 1) return { x: results[0].x, y: results[0].y };
  
  let sumX = 0;
  let sumY = 0;
  let sumWeights = 0;
  
  for (const result of results) {
    const weight = (result.confidence / 100) * SOURCE_AUTHORITY_WEIGHTS[result.source];
    sumX += result.x * weight;
    sumY += result.y * weight;
    sumWeights += weight;
  }
  
  if (sumWeights === 0) return null;
  
  return {
    x: sumX / sumWeights,
    y: sumY / sumWeights,
  };
}

// ============================================================================
// CÁLCULO DE SCORES
// ============================================================================

/**
 * Calcula el score de concordancia basado en distancia
 */
function calculateConcordanceScore(
  distanceMeters: number,
  config: CrossValidationConfig
): number {
  if (distanceMeters <= config.confirmedThreshold) {
    return 1.0; // Concordancia perfecta
  } else if (distanceMeters <= config.likelyValidThreshold) {
    // Interpolación lineal 1.0 → 0.7
    const ratio = (distanceMeters - config.confirmedThreshold) / 
                  (config.likelyValidThreshold - config.confirmedThreshold);
    return 1.0 - (ratio * 0.3);
  } else if (distanceMeters <= config.uncertainThreshold) {
    // Interpolación lineal 0.7 → 0.3
    const ratio = (distanceMeters - config.likelyValidThreshold) / 
                  (config.uncertainThreshold - config.likelyValidThreshold);
    return 0.7 - (ratio * 0.4);
  } else {
    // >500m: penalización fuerte
    return Math.max(0.1, 0.3 - (distanceMeters - config.uncertainThreshold) / 5000);
  }
}

/**
 * Calcula el score compuesto de validación cruzada
 */
export function calculateCompositeScore(
  results: SourceResult[],
  distanceMeters: number | null,
  config: CrossValidationConfig = DEFAULT_CONFIG
): {
  score: number;
  breakdown: CrossValidationResult['scoreBreakdown'];
} {
  if (results.length === 0) {
    return {
      score: 0,
      breakdown: { C_match: 0, C_concordance: 0, C_source: 0, bonusApplied: 0 },
    };
  }
  
  // C_match: Mejor score individual normalizado
  const bestScore = Math.max(...results.map(r => r.confidence));
  const C_match = bestScore / 100;
  
  // C_concordance: Basado en distancia entre fuentes
  let C_concordance: number;
  if (results.length === 1 || distanceMeters === null) {
    C_concordance = 0.5; // Penalización por fuente única
  } else {
    C_concordance = calculateConcordanceScore(distanceMeters, config);
  }
  
  // C_source: Score ponderado por autoridad de fuentes
  let sumWeightedScores = 0;
  let sumWeights = 0;
  for (const result of results) {
    const authority = SOURCE_AUTHORITY_WEIGHTS[result.source];
    sumWeightedScores += (result.confidence / 100) * authority;
    sumWeights += authority;
  }
  const C_source = sumWeights > 0 ? sumWeightedScores / sumWeights : 0;
  
  // Score base
  let score = (SCORE_WEIGHTS.α * C_match + 
               SCORE_WEIGHTS.β * C_concordance + 
               SCORE_WEIGHTS.γ * C_source) * 100;
  
  // Bonus por concordancia perfecta (<25m)
  let bonusApplied = 0;
  if (config.applyPerfectMatchBonus && 
      distanceMeters !== null && 
      distanceMeters <= 25 &&
      results.length >= 2) {
    bonusApplied = Math.min(8, (25 - distanceMeters) / 3);
    score = Math.min(100, score + bonusApplied);
  }
  
  return {
    score: Math.round(score * 10) / 10, // 1 decimal
    breakdown: {
      C_match: Math.round(C_match * 100) / 100,
      C_concordance: Math.round(C_concordance * 100) / 100,
      C_source: Math.round(C_source * 100) / 100,
      bonusApplied: Math.round(bonusApplied * 10) / 10,
    },
  };
}

/**
 * Determina el estado de validación basado en distancia
 */
export function determineValidationStatus(
  results: SourceResult[],
  distanceMeters: number | null,
  config: CrossValidationConfig = DEFAULT_CONFIG
): ValidationStatus {
  if (results.length === 0) {
    return 'NO_RESULTS';
  }
  
  if (results.length === 1) {
    return 'SINGLE_SOURCE';
  }
  
  if (distanceMeters === null) {
    return 'UNCERTAIN';
  }
  
  if (distanceMeters <= config.confirmedThreshold) {
    return 'CONFIRMED';
  } else if (distanceMeters <= config.likelyValidThreshold) {
    return 'LIKELY_VALID';
  } else if (distanceMeters <= config.uncertainThreshold) {
    return 'UNCERTAIN';
  } else {
    return 'CONFLICT';
  }
}

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================

/**
 * Validador cruzado multi-fuente
 */
export class CrossValidator {
  private config: CrossValidationConfig;
  
  constructor(config: Partial<CrossValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Valida resultados de múltiples fuentes
   */
  public validate(
    results: SourceResult[],
    infrastructureType?: string
  ): CrossValidationResult {
    const startTime = performance.now();
    
    // Filtrar resultados válidos
    const validResults = results.filter(r => 
      r.x !== 0 && r.y !== 0 && r.confidence > 0
    );
    
    // Caso: sin resultados
    if (validResults.length === 0) {
      return this.createEmptyResult(startTime);
    }
    
    // Calcular distancia entre fuentes (si hay múltiples)
    let discrepancyMeters: number | null = null;
    if (validResults.length >= 2) {
      // Calcular distancia máxima entre cualquier par de fuentes
      discrepancyMeters = this.calculateMaxDiscrepancy(validResults);
    }
    
    // Obtener umbrales específicos por tipo (si aplica)
    const thresholds = infrastructureType 
      ? (INFRASTRUCTURE_THRESHOLDS[infrastructureType] || INFRASTRUCTURE_THRESHOLDS['DEFAULT'])
      : INFRASTRUCTURE_THRESHOLDS['DEFAULT'];
    
    // Configuración ajustada por tipo
    const adjustedConfig: CrossValidationConfig = {
      ...this.config,
      confirmedThreshold: thresholds.confirmed,
      likelyValidThreshold: thresholds.acceptable,
      uncertainThreshold: thresholds.review,
    };
    
    // Calcular score compuesto
    const { score, breakdown } = calculateCompositeScore(
      validResults, 
      discrepancyMeters,
      adjustedConfig
    );
    
    // Determinar estado
    const status = determineValidationStatus(
      validResults, 
      discrepancyMeters, 
      adjustedConfig
    );
    
    // Seleccionar coordenadas finales
    const coordinates = this.selectFinalCoordinates(validResults, status);
    
    // Determinar fuente primaria
    const primarySource = this.selectPrimarySource(validResults);
    
    // Determinar si requiere revisión manual
    const { requiresManualReview, reviewReason } = this.checkManualReviewNeeded(
      status, 
      score, 
      discrepancyMeters,
      infrastructureType
    );
    
    return {
      coordinates,
      compositeScore: score,
      status,
      discrepancyMeters,
      sourceResults: validResults,
      primarySource,
      totalTimeMs: Math.round(performance.now() - startTime),
      requiresManualReview,
      reviewReason,
      scoreBreakdown: breakdown,
    };
  }
  
  /**
   * Calcula la discrepancia máxima entre fuentes
   */
  private calculateMaxDiscrepancy(results: SourceResult[]): number {
    let maxDistance = 0;
    
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const distance = calculateDistance(
          results[i].x, results[i].y,
          results[j].x, results[j].y,
          true // UTM
        );
        maxDistance = Math.max(maxDistance, distance);
      }
    }
    
    return Math.round(maxDistance * 10) / 10; // 1 decimal
  }
  
  /**
   * Selecciona las coordenadas finales basándose en el estado
   */
  private selectFinalCoordinates(
    results: SourceResult[],
    status: ValidationStatus
  ): { x: number; y: number } | null {
    if (results.length === 0) return null;
    
    switch (status) {
      case 'CONFIRMED':
      case 'LIKELY_VALID':
        // Usar centroide ponderado
        return calculateWeightedCentroid(results);
        
      case 'UNCERTAIN':
      case 'SINGLE_SOURCE':
        // Usar fuente con mayor autoridad
        const bestResult = results.reduce((best, current) => {
          const bestAuthority = SOURCE_AUTHORITY_WEIGHTS[best.source] * best.confidence;
          const currentAuthority = SOURCE_AUTHORITY_WEIGHTS[current.source] * current.confidence;
          return currentAuthority > bestAuthority ? current : best;
        });
        return { x: bestResult.x, y: bestResult.y };
        
      case 'CONFLICT':
        // En conflicto, NO devolver coordenadas automáticamente
        // Esto fuerza revisión manual
        return null;
        
      default:
        return null;
    }
  }
  
  /**
   * Selecciona la fuente primaria para atribución
   */
  private selectPrimarySource(results: SourceResult[]): GeocodingSource | null {
    if (results.length === 0) return null;
    
    return results.reduce((best, current) => {
      const bestScore = SOURCE_AUTHORITY_WEIGHTS[best.source] * best.confidence;
      const currentScore = SOURCE_AUTHORITY_WEIGHTS[current.source] * current.confidence;
      return currentScore > bestScore ? current : best;
    }).source;
  }
  
  /**
   * Determina si se necesita revisión manual
   */
  private checkManualReviewNeeded(
    status: ValidationStatus,
    score: number,
    discrepancyMeters: number | null,
    infrastructureType?: string
  ): { requiresManualReview: boolean; reviewReason?: string } {
    
    // Conflicto siempre requiere revisión
    if (status === 'CONFLICT') {
      return {
        requiresManualReview: true,
        reviewReason: `Discrepancia de ${discrepancyMeters}m entre fuentes`,
      };
    }
    
    // Score muy bajo
    if (score < 60) {
      return {
        requiresManualReview: true,
        reviewReason: `Score bajo (${score}%)`,
      };
    }
    
    // Fuente única para tipologías críticas
    if (status === 'SINGLE_SOURCE') {
      const criticalTypes = ['SANITARIO', 'EMERGENCIAS', 'SEGURIDAD'];
      if (infrastructureType && criticalTypes.includes(infrastructureType)) {
        return {
          requiresManualReview: true,
          reviewReason: `Infraestructura crítica con fuente única`,
        };
      }
    }
    
    // Score medio-bajo en tipologías críticas
    if (score < 80 && infrastructureType) {
      const criticalTypes = ['SANITARIO', 'EMERGENCIAS'];
      if (criticalTypes.includes(infrastructureType)) {
        return {
          requiresManualReview: true,
          reviewReason: `Score ${score}% insuficiente para ${infrastructureType}`,
        };
      }
    }
    
    return { requiresManualReview: false };
  }
  
  /**
   * Crea resultado vacío
   */
  private createEmptyResult(startTime: number): CrossValidationResult {
    return {
      coordinates: null,
      compositeScore: 0,
      status: 'NO_RESULTS',
      discrepancyMeters: null,
      sourceResults: [],
      primarySource: null,
      totalTimeMs: Math.round(performance.now() - startTime),
      requiresManualReview: true,
      reviewReason: 'Ninguna fuente encontró resultados',
      scoreBreakdown: {
        C_match: 0,
        C_concordance: 0,
        C_source: 0,
        bonusApplied: 0,
      },
    };
  }
  
  // ==========================================================================
  // VALIDACIÓN MEJORADA CON ALGORITMOS ROBUSTOS (F023 Fase 2)
  // ==========================================================================
  
  /**
   * Valida resultados usando algoritmos robustos de crossValidation.ts
   * 
   * Mejoras sobre validate():
   * - huberCentroid: centroide robusto que reduce influencia de outliers
   * - analyzeResultClusters: detección automática de discordancias
   * - detectDiscrepancy: umbrales específicos por tipología
   * - generateRecommendation: USE_RESULT / MANUAL_REVIEW / REJECT
   * 
   * @param results - Resultados de fuentes
   * @param infrastructureType - Tipología PTEL
   * @returns Resultado de validación cruzada mejorado
   */
  public validateEnhanced(
    results: SourceResult[],
    infrastructureType?: string
  ): CrossValidationResult {
    const startTime = performance.now();
    
    // Filtrar resultados válidos
    const validResults = results.filter(r => 
      r.x !== 0 && r.y !== 0 && r.confidence > 0
    );
    
    // Caso: sin resultados
    if (validResults.length === 0) {
      return this.createEmptyResult(startTime);
    }
    
    // Mapear a formato EnhancedSourceResult para crossValidation.ts
    const enhancedResults: EnhancedSourceResult[] = validResults.map(r => ({
      sourceId: this.mapToEnhancedSourceId(r.source),
      sourceName: r.source,
      authorityWeight: ENHANCED_AUTHORITY_WEIGHTS[this.mapToEnhancedSourceId(r.source)] ?? 0.5,
      result: {
        coordinates: { x: r.x, y: r.y },
        matchedName: r.matchedName,
        matchScore: r.confidence,
        confidence: r.confidence,
      },
      error: undefined, // Sin error para resultados válidos
      responseTimeMs: r.responseTimeMs,
      status: 'success' as const,
    }));
    
    // Analizar cluster con algoritmo robusto (huberCentroid)
    const threshold = DISCREPANCY_THRESHOLDS[infrastructureType?.toUpperCase() ?? ''] 
      ?? DISCREPANCY_THRESHOLDS.DEFAULT;
    
    const clusterAnalysis = analyzeResultClusters(enhancedResults, {
      concordanceThreshold: threshold
    });
    
    // Si no hay análisis válido
    if (!clusterAnalysis) {
      return this.createEmptyResult(startTime);
    }
    
    // Detectar discrepancia
    const discrepancy = detectDiscrepancy(clusterAnalysis, infrastructureType);
    
    // Calcular scores
    const avgMatchScore = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length;
    const avgAuthority = enhancedResults
      .filter(r => !clusterAnalysis.outlierSources.includes(r.sourceId))
      .reduce((sum, r) => sum + r.authorityWeight, 0) / 
      Math.max(1, clusterAnalysis.concordantSources);
    
    const compositeScore = calculateEnhancedScore(
      avgMatchScore,
      clusterAnalysis.concordanceScore,
      avgAuthority
    );
    
    // Generar recomendación
    const { recommendation, reason } = generateRecommendation(
      compositeScore,
      discrepancy,
      clusterAnalysis.concordantSources
    );
    
    // Mapear a ValidationStatus
    const status = this.mapRecommendationToStatus(
      recommendation, 
      validResults.length,
      discrepancy.hasDiscrepancy
    );
    
    // Coordenadas: usar centroide robusto de clusterAnalysis
    const coordinates = clusterAnalysis.centroid;
    
    return {
      coordinates,
      compositeScore,
      status,
      discrepancyMeters: clusterAnalysis.radiusMeters,
      sourceResults: validResults,
      primarySource: this.selectPrimarySource(validResults),
      totalTimeMs: Math.round(performance.now() - startTime),
      requiresManualReview: recommendation === 'MANUAL_REVIEW' || recommendation === 'REJECT',
      reviewReason: recommendation !== 'USE_RESULT' ? reason : undefined,
      scoreBreakdown: {
        C_match: avgMatchScore,
        C_concordance: Math.round(clusterAnalysis.concordanceScore * 100),
        C_source: Math.round(avgAuthority * 100),
        bonusApplied: 0,
      },
    };
  }
  
  /**
   * Mapea fuente local a GeocodingSourceId de crossValidation.ts
   */
  private mapToEnhancedSourceId(source: GeocodingSource): GeocodingSourceId {
    const mapping: Record<GeocodingSource, GeocodingSourceId> = {
      'LOCAL_DERA': 'LOCAL',
      'WFS_DERA': 'LOCAL',
      'WFS_SPECIALIZED': 'WFS_HEALTH', // Genérico a health
      'CDAU': 'CDAU',
      'CARTOCIUDAD': 'CARTOCIUDAD',
      'NGA': 'NGA',
      'IAID': 'WFS_CULTURAL', // Mapear deportes a cultural
      'OSM': 'OVERPASS',
      'NOMINATIM': 'NOMINATIM',
    };
    return mapping[source] ?? 'NOMINATIM';
  }
  
  /**
   * Mapea recomendación a ValidationStatus
   */
  private mapRecommendationToStatus(
    recommendation: 'USE_RESULT' | 'MANUAL_REVIEW' | 'REJECT',
    sourceCount: number,
    hasDiscrepancy: boolean
  ): ValidationStatus {
    if (sourceCount === 1) return 'SINGLE_SOURCE';
    if (recommendation === 'REJECT') return 'CONFLICT';
    if (recommendation === 'MANUAL_REVIEW') {
      return hasDiscrepancy ? 'UNCERTAIN' : 'LIKELY_VALID';
    }
    // USE_RESULT
    return hasDiscrepancy ? 'LIKELY_VALID' : 'CONFIRMED';
  }
  
  /**
   * Obtiene configuración actual
   */
  public getConfig(): CrossValidationConfig {
    return { ...this.config };
  }
  
  /**
   * Actualiza configuración
   */
  public updateConfig(updates: Partial<CrossValidationConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

let crossValidatorInstance: CrossValidator | null = null;

export function getCrossValidator(): CrossValidator {
  if (!crossValidatorInstance) {
    crossValidatorInstance = new CrossValidator();
  }
  return crossValidatorInstance;
}

// ============================================================================
// EXPORT
// ============================================================================

export default CrossValidator;
