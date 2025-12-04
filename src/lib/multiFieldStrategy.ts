/**
 * multiFieldStrategy.ts
 * 
 * Estrategia de desambiguación multi-campo para geocodificación PTEL.
 * Combina scoring de múltiples campos (nombre, dirección, localidad)
 * para seleccionar el mejor candidato cuando hay múltiples coincidencias.
 * 
 * Problema: DERA puede tener múltiples centros de salud en un municipio.
 * Solución: Scoring ponderado por similaridad de campos.
 * 
 * @version 1.0.0
 * @date 2025-12-03
 * @see F023 Fase 1.4
 */

import { calculateSimilarity } from './fuzzySearch';
import { cleanAddress } from '../utils/addressCleaner';

/** Prefijo para logs de esta fase */
const F023_1_4 = '[F023-1.4]';

// ============================================================================
// TIPOS
// ============================================================================

/** Candidato de geocodificación con datos de DERA */
export interface GeocodingCandidate {
  /** ID único del feature */
  id: string;
  /** Nombre del establecimiento */
  nombre: string;
  /** Dirección si disponible */
  direccion?: string;
  /** Municipio */
  municipio: string;
  /** Código INE del municipio */
  codMunicipio: string;
  /** Coordenadas UTM X */
  utmX: number;
  /** Coordenadas UTM Y */
  utmY: number;
  /** Tipología (HEALTH, EDUCATION, etc.) */
  tipologia: string;
  /** Subtipo si existe */
  subtipo?: string;
}

/** Registro PTEL a geocodificar */
export interface PTELRecord {
  /** Nombre del recurso en PTEL */
  nombre: string;
  /** Dirección en PTEL */
  direccion?: string;
  /** Localidad/municipio en PTEL */
  localidad?: string;
  /** Código INE si conocido */
  codMunicipio?: string;
}

/** Resultado de desambiguación */
export interface DisambiguationResult {
  /** Candidato seleccionado */
  selected: GeocodingCandidate | null;
  /** Score del seleccionado (0-100) */
  score: number;
  /** Confianza en la selección */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  /** Todos los candidatos con scores */
  candidates: ScoredCandidate[];
  /** Razón de la selección */
  reason: string;
  /** Metadata de debug */
  debug: DisambiguationDebug;
}

/** Candidato con score calculado */
export interface ScoredCandidate {
  /** Candidato original */
  candidate: GeocodingCandidate;
  /** Score total (0-100) */
  totalScore: number;
  /** Score por campo */
  fieldScores: FieldScores;
}

/** Scores individuales por campo */
export interface FieldScores {
  /** Score de nombre (0-100) */
  nombre: number;
  /** Score de dirección (0-100) */
  direccion: number;
  /** Score de localidad (0-100) */
  localidad: number;
}

/** Debug info */
interface DisambiguationDebug {
  /** Número de candidatos evaluados */
  candidateCount: number;
  /** Gap entre primero y segundo (puntos) */
  topGap: number;
  /** Pesos utilizados */
  weights: FieldWeights;
}

// ============================================================================
// PESOS POR TIPOLOGÍA
// ============================================================================

/** Pesos para cada campo según tipología */
export interface FieldWeights {
  nombre: number;
  direccion: number;
  localidad: number;
}


/**
 * Pesos por tipología.
 * 
 * - HEALTH: Nombre muy importante (centros tienen nombres oficiales únicos)
 * - EDUCATION: Nombre crucial (colegios, institutos tienen nombres propios)
 * - SECURITY: Localidad importante (Guardia Civil por pueblo)
 * - TRANSPORT: Dirección importante (gasolineras en carreteras)
 * - CULTURAL: Nombre importante (iglesias, ermitas con advocaciones)
 * - DEPORTIVO: Dirección útil (polideportivos municipales similares)
 */
export const WEIGHTS_BY_TYPOLOGY: Record<string, FieldWeights> = {
  // Sanitario: nombre es clave (Centro Salud X vs Centro Salud Y)
  HEALTH: { nombre: 0.60, direccion: 0.25, localidad: 0.15 },
  SANITARIO: { nombre: 0.60, direccion: 0.25, localidad: 0.15 },
  
  // Educativo: nombre es crucial (CEIP X, IES Y)
  EDUCATION: { nombre: 0.65, direccion: 0.20, localidad: 0.15 },
  EDUCATIVO: { nombre: 0.65, direccion: 0.20, localidad: 0.15 },
  
  // Seguridad: localidad importante (un cuartel por pueblo)
  SECURITY: { nombre: 0.40, direccion: 0.20, localidad: 0.40 },
  SEGURIDAD: { nombre: 0.40, direccion: 0.20, localidad: 0.40 },
  
  // Transporte: dirección importante (carretera km X)
  TRANSPORT: { nombre: 0.30, direccion: 0.50, localidad: 0.20 },
  TRANSPORTE: { nombre: 0.30, direccion: 0.50, localidad: 0.20 },
  
  // Cultural/religioso: nombre importante (Iglesia de San X)
  CULTURAL: { nombre: 0.55, direccion: 0.25, localidad: 0.20 },
  RELIGIOSO: { nombre: 0.55, direccion: 0.25, localidad: 0.20 },
  
  // Deportivo: dirección y localidad equilibrados
  DEPORTIVO: { nombre: 0.40, direccion: 0.35, localidad: 0.25 },
  
  // Energía: nombre técnico importante (CT-XXXX)
  ENERGIA: { nombre: 0.55, direccion: 0.30, localidad: 0.15 },
  
  // Hidráulico: localidad importante (depósito de X)
  HIDRAULICO: { nombre: 0.35, direccion: 0.25, localidad: 0.40 },
  
  // Por defecto: equilibrado
  DEFAULT: { nombre: 0.45, direccion: 0.30, localidad: 0.25 },
};

// ============================================================================
// UMBRALES DE CONFIANZA
// ============================================================================

/** Umbral para confianza HIGH (diferencia clara) */
const HIGH_CONFIDENCE_THRESHOLD = 15;

/** Umbral para confianza MEDIUM */
const MEDIUM_CONFIDENCE_THRESHOLD = 8;

/** Score mínimo para aceptar candidato */
const MIN_ACCEPTABLE_SCORE = 40;

// ============================================================================
// FUNCIONES DE SCORING
// ============================================================================

/**
 * Obtiene los pesos para una tipología.
 */
export function getWeightsForTypology(tipologia: string): FieldWeights {
  const normalized = tipologia?.toUpperCase().trim() || 'DEFAULT';
  return WEIGHTS_BY_TYPOLOGY[normalized] || WEIGHTS_BY_TYPOLOGY.DEFAULT;
}

/**
 * Calcula score de similaridad usando uFuzzy (0-100)
 * Optimizado: 10-100x más rápido que Fuse.js
 */
function calculateSimilarityScore(query: string, target: string): number {
  return calculateSimilarity(query, target);
}


/**
 * Calcula scores para un candidato contra un registro PTEL.
 */
export function scoreCandidate(
  candidate: GeocodingCandidate,
  ptelRecord: PTELRecord,
  weights: FieldWeights
): ScoredCandidate {
  // Score de nombre
  const nombreScore = calculateSimilarityScore(
    ptelRecord.nombre || '',
    candidate.nombre || ''
  );
  
  // Score de dirección (limpiar ambas antes de comparar)
  let direccionScore = 0;
  if (ptelRecord.direccion && candidate.direccion) {
    const cleanedPtel = cleanAddress(ptelRecord.direccion).cleaned;
    const cleanedCandidate = cleanAddress(candidate.direccion).cleaned;
    direccionScore = calculateSimilarityScore(cleanedPtel, cleanedCandidate);
  }
  
  // Score de localidad
  let localidadScore = 0;
  if (ptelRecord.localidad) {
    localidadScore = calculateSimilarityScore(
      ptelRecord.localidad,
      candidate.municipio
    );
  } else if (ptelRecord.codMunicipio === candidate.codMunicipio) {
    // Si tienen mismo código INE, match perfecto de localidad
    localidadScore = 100;
  }
  
  // Score total ponderado
  const totalScore = Math.round(
    (nombreScore * weights.nombre) +
    (direccionScore * weights.direccion) +
    (localidadScore * weights.localidad)
  );
  
  return {
    candidate,
    totalScore,
    fieldScores: {
      nombre: nombreScore,
      direccion: direccionScore,
      localidad: localidadScore,
    },
  };
}

/**
 * Desambigua entre múltiples candidatos para un registro PTEL.
 * 
 * @param candidates - Candidatos de DERA
 * @param ptelRecord - Registro PTEL a geocodificar
 * @param tipologia - Tipología para seleccionar pesos
 * @returns Resultado con candidato seleccionado y metadata
 */
export function disambiguate(
  candidates: GeocodingCandidate[],
  ptelRecord: PTELRecord,
  tipologia: string
): DisambiguationResult {
  // Caso sin candidatos
  if (!candidates || candidates.length === 0) {
    return {
      selected: null,
      score: 0,
      confidence: 'NONE',
      candidates: [],
      reason: 'No hay candidatos disponibles',
      debug: {
        candidateCount: 0,
        topGap: 0,
        weights: getWeightsForTypology(tipologia),
      },
    };
  }
  
  const weights = getWeightsForTypology(tipologia);
  
  // Calcular scores para todos los candidatos
  const scoredCandidates = candidates.map(c => 
    scoreCandidate(c, ptelRecord, weights)
  );
  
  // Ordenar por score descendente
  scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
  
  const best = scoredCandidates[0];
  const second = scoredCandidates[1];
  
  // Calcular gap entre primero y segundo
  const topGap = second ? best.totalScore - second.totalScore : 100;
  
  // Determinar confianza
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  let reason: string;
  
  if (best.totalScore < MIN_ACCEPTABLE_SCORE) {
    confidence = 'LOW';
    reason = `Score insuficiente (${best.totalScore} < ${MIN_ACCEPTABLE_SCORE})`;
  } else if (topGap >= HIGH_CONFIDENCE_THRESHOLD) {
    confidence = 'HIGH';
    reason = `Diferencia clara con segundo candidato (gap: ${topGap} puntos)`;
  } else if (topGap >= MEDIUM_CONFIDENCE_THRESHOLD) {
    confidence = 'MEDIUM';
    reason = `Diferencia moderada con segundo candidato (gap: ${topGap} puntos)`;
  } else {
    confidence = 'LOW';
    reason = `Candidatos muy similares (gap: ${topGap} puntos)`;
  }
  
  console.debug(
    `${F023_1_4} Desambiguación "${ptelRecord.nombre?.substring(0, 30)}": ` +
    `${candidates.length} candidatos, mejor=${best.totalScore}, gap=${topGap}, conf=${confidence}`
  );
  
  return {
    selected: best.candidate,
    score: best.totalScore,
    confidence,
    candidates: scoredCandidates,
    reason,
    debug: {
      candidateCount: candidates.length,
      topGap,
      weights,
    },
  };
}


// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Determina si un resultado de desambiguación es confiable para uso automático.
 */
export function isReliableResult(result: DisambiguationResult): boolean {
  return result.confidence === 'HIGH' || 
         (result.confidence === 'MEDIUM' && result.score >= 70);
}

/**
 * Determina si un resultado requiere revisión manual.
 */
export function requiresManualReview(result: DisambiguationResult): boolean {
  return result.confidence === 'LOW' || 
         (result.confidence === 'MEDIUM' && result.score < 60);
}

/**
 * Obtiene el mejor candidato solo si hay alta confianza.
 * Útil para flujos automáticos que no quieren falsos positivos.
 */
export function getBestIfConfident(
  candidates: GeocodingCandidate[],
  ptelRecord: PTELRecord,
  tipologia: string
): GeocodingCandidate | null {
  const result = disambiguate(candidates, ptelRecord, tipologia);
  return isReliableResult(result) ? result.selected : null;
}

/**
 * Desambigua un lote de registros PTEL contra candidatos.
 */
export function disambiguateBatch(
  items: Array<{
    ptelRecord: PTELRecord;
    candidates: GeocodingCandidate[];
    tipologia: string;
  }>
): DisambiguationResult[] {
  return items.map(({ ptelRecord, candidates, tipologia }) =>
    disambiguate(candidates, ptelRecord, tipologia)
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  disambiguate,
  disambiguateBatch,
  scoreCandidate,
  getWeightsForTypology,
  isReliableResult,
  requiresManualReview,
  getBestIfConfident,
  WEIGHTS_BY_TYPOLOGY,
};
