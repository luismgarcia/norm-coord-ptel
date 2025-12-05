/**
 * PTEL SingletonDetector - Detección de infraestructuras únicas
 * 
 * Optimización clave: El 65% de municipios andaluces tienen solo UNA
 * infraestructura de cada tipo. Este servicio detecta estos "singletons"
 * para evitar fuzzy matching innecesario.
 * 
 * Flujo:
 * 1. Consultar BBDD local (IndexedDB) por tipología + municipio
 * 2. Si count === 1: Singleton → devolver directamente
 * 3. Si count > 1: Devolver lista para fuzzy matching
 * 4. Si count === 0: No hay datos locales → fallback a WFS
 * 
 * @module lib/localData/singletonDetector
 * @version 1.0.0
 * @date 2025-12-05
 * @session B.3
 */

import { db, type DERAFeature, type InfraTipologia } from './schemas';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Resultado de detección de singleton
 */
export interface SingletonResult {
  /** Indica si hay exactamente una infraestructura */
  isSingleton: boolean;
  
  /** La infraestructura única (solo si isSingleton === true) */
  feature: DERAFeature | null;
  
  /** Lista de candidatos (si count > 1) */
  candidates: DERAFeature[];
  
  /** Número total de infraestructuras encontradas */
  count: number;
  
  /** Código de municipio consultado */
  codMun: string;
  
  /** Tipología consultada */
  tipologia: InfraTipologia;
  
  /** Tiempo de consulta en ms */
  queryTimeMs: number;
}

/**
 * Estadísticas de tipologías por municipio
 */
export interface MunicipioTypologyCounts {
  codMun: string;
  municipio: string;
  counts: Map<InfraTipologia, number>;
  totalFeatures: number;
  singletonTypes: InfraTipologia[];
  multipleTypes: InfraTipologia[];
}

/**
 * Opciones para detección
 */
export interface DetectionOptions {
  /** Incluir candidatos completos si no es singleton (default: true) */
  includeCandidates?: boolean;
  
  /** Límite de candidatos a devolver (default: 10) */
  candidateLimit?: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_CANDIDATE_LIMIT = 10;

/** Todas las tipologías disponibles */
export const ALL_TIPOLOGIAS: InfraTipologia[] = [
  'SANITARIO',
  'EDUCATIVO',
  'SEGURIDAD',
  'MUNICIPAL',
  'EMERGENCIA',
  'ENERGIA',
  'HIDRAULICO',
  'PATRIMONIO',
  'DEPORTIVO',
  'TRANSPORTE',
  'OTRO'
];


// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Detecta si un municipio tiene exactamente una infraestructura de un tipo
 * 
 * @param codMun - Código INE del municipio (5 dígitos)
 * @param tipologia - Tipo de infraestructura a buscar
 * @param options - Opciones de detección
 * @returns Resultado con singleton o lista de candidatos
 * 
 * @example
 * ```typescript
 * const result = await detectSingleton('18051', 'SANITARIO');
 * if (result.isSingleton) {
 *   console.log('Único centro de salud:', result.feature.nombre);
 *   console.log('Coordenadas:', result.feature.x, result.feature.y);
 * } else {
 *   console.log('Hay', result.count, 'centros sanitarios');
 * }
 * ```
 */
export async function detectSingleton(
  codMun: string,
  tipologia: InfraTipologia,
  options: DetectionOptions = {}
): Promise<SingletonResult> {
  const startTime = performance.now();
  const { 
    includeCandidates = true, 
    candidateLimit = DEFAULT_CANDIDATE_LIMIT 
  } = options;
  
  // Consulta optimizada usando índice compuesto [tipologia+codMun]
  const count = await db.dera
    .where({ tipologia, codMun })
    .count();
  
  const queryTimeMs = performance.now() - startTime;
  
  // Caso: No hay datos
  if (count === 0) {
    return {
      isSingleton: false,
      feature: null,
      candidates: [],
      count: 0,
      codMun,
      tipologia,
      queryTimeMs
    };
  }
  
  // Caso: Singleton
  if (count === 1) {
    const feature = await db.dera
      .where({ tipologia, codMun })
      .first();
    
    return {
      isSingleton: true,
      feature: feature || null,
      candidates: feature ? [feature] : [],
      count: 1,
      codMun,
      tipologia,
      queryTimeMs: performance.now() - startTime
    };
  }
  
  // Caso: Múltiples candidatos
  let candidates: DERAFeature[] = [];
  
  if (includeCandidates) {
    candidates = await db.dera
      .where({ tipologia, codMun })
      .limit(candidateLimit)
      .toArray();
  }
  
  return {
    isSingleton: false,
    feature: null,
    candidates,
    count,
    codMun,
    tipologia,
    queryTimeMs: performance.now() - startTime
  };
}

/**
 * Detecta singleton buscando primero el municipio por nombre
 * 
 * @param nombreMunicipio - Nombre del municipio (normalización automática)
 * @param tipologia - Tipo de infraestructura
 * @param options - Opciones de detección
 * @returns Resultado o null si no se encuentra el municipio
 */
export async function detectSingletonByNombre(
  nombreMunicipio: string,
  tipologia: InfraTipologia,
  options: DetectionOptions = {}
): Promise<SingletonResult | null> {
  // Normalizar nombre para búsqueda
  const normalized = nombreMunicipio
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  
  // Buscar municipio en tabla INE
  const municipio = await db.ine
    .where('nombreNorm')
    .equals(normalized)
    .first();
  
  if (!municipio) {
    return null;
  }
  
  return detectSingleton(municipio.codMun, tipologia, options);
}


// ============================================================================
// FUNCIONES DE ANÁLISIS
// ============================================================================

/**
 * Obtiene conteo de todas las tipologías en un municipio
 * 
 * Útil para:
 * - Mostrar resumen al usuario
 * - Identificar qué tipologías son singleton
 * - Optimizar estrategia de geocodificación
 * 
 * @param codMun - Código INE del municipio
 * @returns Estadísticas completas del municipio
 */
export async function getMunicipioTypologyCounts(
  codMun: string
): Promise<MunicipioTypologyCounts> {
  // Obtener nombre del municipio
  const municipioData = await db.ine.get(codMun);
  const municipio = municipioData?.nombre || codMun;
  
  // Contar cada tipología en paralelo
  const countPromises = ALL_TIPOLOGIAS.map(async (tipologia) => {
    const count = await db.dera
      .where({ tipologia, codMun })
      .count();
    return { tipologia, count };
  });
  
  const results = await Promise.all(countPromises);
  
  // Construir mapa y clasificar
  const counts = new Map<InfraTipologia, number>();
  const singletonTypes: InfraTipologia[] = [];
  const multipleTypes: InfraTipologia[] = [];
  let totalFeatures = 0;
  
  for (const { tipologia, count } of results) {
    counts.set(tipologia, count);
    totalFeatures += count;
    
    if (count === 1) {
      singletonTypes.push(tipologia);
    } else if (count > 1) {
      multipleTypes.push(tipologia);
    }
  }
  
  return {
    codMun,
    municipio,
    counts,
    totalFeatures,
    singletonTypes,
    multipleTypes
  };
}

/**
 * Verifica si una tipología es singleton en un municipio (versión rápida)
 * 
 * Solo hace COUNT, no carga datos. Útil para decisiones rápidas.
 * 
 * @param codMun - Código INE del municipio
 * @param tipologia - Tipología a verificar
 * @returns true si count === 1
 */
export async function isSingletonType(
  codMun: string,
  tipologia: InfraTipologia
): Promise<boolean> {
  const count = await db.dera
    .where({ tipologia, codMun })
    .count();
  
  return count === 1;
}

/**
 * Obtiene el singleton directamente si existe (versión optimizada)
 * 
 * Combina verificación y obtención en una sola operación.
 * Devuelve null si no es singleton (count !== 1).
 * 
 * @param codMun - Código INE del municipio
 * @param tipologia - Tipología a buscar
 * @returns La feature única o null
 */
export async function getSingletonFeature(
  codMun: string,
  tipologia: InfraTipologia
): Promise<DERAFeature | null> {
  const features = await db.dera
    .where({ tipologia, codMun })
    .limit(2)  // Solo necesitamos saber si hay más de 1
    .toArray();
  
  if (features.length === 1) {
    return features[0];
  }
  
  return null;
}

/**
 * Busca candidatos por nombre dentro de un municipio y tipología
 * 
 * Útil cuando no es singleton y necesitamos hacer fuzzy matching.
 * Devuelve candidatos ordenados por similitud básica con el nombre buscado.
 * 
 * @param codMun - Código INE del municipio
 * @param tipologia - Tipología a buscar
 * @param nombreBuscado - Nombre a comparar (para ordenación)
 * @param limit - Máximo de resultados
 * @returns Lista de candidatos
 */
export async function getCandidatesByNombre(
  codMun: string,
  tipologia: InfraTipologia,
  nombreBuscado: string,
  limit: number = 10
): Promise<DERAFeature[]> {
  const candidates = await db.dera
    .where({ tipologia, codMun })
    .toArray();
  
  if (candidates.length === 0) {
    return [];
  }
  
  // Normalizar nombre buscado
  const normalizedSearch = nombreBuscado
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  
  // Ordenar por similitud básica (contiene el término)
  const scored = candidates.map(feature => {
    const normalizedName = feature.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    let score = 0;
    
    // Coincidencia exacta
    if (normalizedName === normalizedSearch) {
      score = 100;
    }
    // Contiene el término
    else if (normalizedName.includes(normalizedSearch)) {
      score = 80;
    }
    // El término contiene el nombre
    else if (normalizedSearch.includes(normalizedName)) {
      score = 60;
    }
    // Comparten palabras
    else {
      const searchWords = normalizedSearch.split(/\s+/);
      const nameWords = normalizedName.split(/\s+/);
      const commonWords = searchWords.filter(w => 
        nameWords.some(nw => nw.includes(w) || w.includes(nw))
      );
      score = (commonWords.length / searchWords.length) * 40;
    }
    
    return { feature, score };
  });
  
  // Ordenar por score descendente y limitar
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.feature);
}


// ============================================================================
// ESTADÍSTICAS GLOBALES
// ============================================================================

/**
 * Calcula estadísticas globales de singletons en toda la BBDD
 * 
 * Útil para:
 * - Verificar la hipótesis del 65% de singletons
 * - Optimizar estrategia general de geocodificación
 * - Informes de cobertura
 * 
 * @returns Estadísticas globales
 */
export async function getGlobalSingletonStats(): Promise<{
  totalMunicipios: number;
  totalFeatures: number;
  singletonsByTipologia: Map<InfraTipologia, number>;
  multiplesByTipologia: Map<InfraTipologia, number>;
  avgSingletonRatio: number;
}> {
  // Obtener todos los municipios únicos con datos DERA
  const allMunicipios = await db.dera
    .orderBy('codMun')
    .uniqueKeys();
  
  const totalMunicipios = allMunicipios.length;
  const totalFeatures = await db.dera.count();
  
  const singletonsByTipologia = new Map<InfraTipologia, number>();
  const multiplesByTipologia = new Map<InfraTipologia, number>();
  
  // Analizar cada tipología
  for (const tipologia of ALL_TIPOLOGIAS) {
    let singletonCount = 0;
    let multipleCount = 0;
    
    for (const codMun of allMunicipios) {
      const count = await db.dera
        .where({ tipologia, codMun: codMun as string })
        .count();
      
      if (count === 1) {
        singletonCount++;
      } else if (count > 1) {
        multipleCount++;
      }
    }
    
    singletonsByTipologia.set(tipologia, singletonCount);
    multiplesByTipologia.set(tipologia, multipleCount);
  }
  
  // Calcular ratio promedio
  let totalSingletons = 0;
  let totalWithData = 0;
  
  for (const tipologia of ALL_TIPOLOGIAS) {
    const singletons = singletonsByTipologia.get(tipologia) || 0;
    const multiples = multiplesByTipologia.get(tipologia) || 0;
    totalSingletons += singletons;
    totalWithData += singletons + multiples;
  }
  
  const avgSingletonRatio = totalWithData > 0 
    ? totalSingletons / totalWithData 
    : 0;
  
  return {
    totalMunicipios,
    totalFeatures,
    singletonsByTipologia,
    multiplesByTipologia,
    avgSingletonRatio
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  detectSingleton,
  detectSingletonByNombre,
  getMunicipioTypologyCounts,
  isSingletonType,
  getSingletonFeature,
  getCandidatesByNombre,
  getGlobalSingletonStats,
  ALL_TIPOLOGIAS
};
