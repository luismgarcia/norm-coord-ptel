/**
 * fuzzySearch.ts - F023 Fase 3.1
 * 
 * Búsqueda fuzzy optimizada usando uFuzzy.
 * Reemplaza Fuse.js con 10-100x mejor rendimiento.
 * 
 * CARACTERÍSTICAS:
 * - uFuzzy para matching ultra-rápido
 * - Normalización de texto integrada
 * - API compatible con uso previo de Fuse.js
 * - Ordenación por relevancia
 * 
 * @version 1.0.0
 * @date 2025-12-04
 * @see F023 Fase 3 - Optimizaciones
 */

import uFuzzy from '@leeoniya/ufuzzy';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/** Opciones uFuzzy optimizadas para español */
const UFUZZY_OPTIONS: uFuzzy.Options = {
  // Modo: 0 = intraMode (caracteres individuales), 1 = interMode (palabras)
  intraMode: 1,
  // Permitir separación entre términos de búsqueda
  interSplit: /[\s.,\-\/]+/,
  // Distancia máxima entre caracteres en match
  intraChars: '[a-záéíóúüñ\\d]',
  // Límite de resultados internos antes de ordenar
  intraIns: 1,
};

// ============================================================================
// TIPOS
// ============================================================================

export interface FuzzySearchOptions<T> {
  /** Campo(s) donde buscar */
  keys: (keyof T | { name: keyof T; weight?: number })[];
  /** Umbral de coincidencia (0-1, menor = más estricto) */
  threshold?: number;
  /** Límite de resultados */
  limit?: number;
}

export interface FuzzyResult<T> {
  item: T;
  score: number;
  matches?: { key: string; indices: [number, number][] }[];
}

// ============================================================================
// NORMALIZACIÓN
// ============================================================================

/**
 * Normaliza texto para búsqueda (elimina acentos, minúsculas, espacios extra)
 */
export function normalizeForSearch(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Eliminar acentos
    .replace(/[^a-z0-9\s]/g, ' ')     // Solo alfanuméricos
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// CLASE PRINCIPAL
// ============================================================================

/**
 * Buscador fuzzy optimizado con uFuzzy
 */
export class FastFuzzy<T extends Record<string, unknown>> {
  private uf: uFuzzy;
  private items: T[];
  private haystack: string[];
  private keys: { name: keyof T; weight: number }[];
  private threshold: number;
  
  constructor(items: T[], options: FuzzySearchOptions<T>) {
    this.items = items;
    this.threshold = options.threshold ?? 0.4;
    
    // Normalizar keys a formato uniforme
    this.keys = options.keys.map(k => {
      if (typeof k === 'string' || typeof k === 'number' || typeof k === 'symbol') {
        return { name: k, weight: 1 };
      }
      return { name: k.name, weight: k.weight ?? 1 };
    });
    
    // Crear haystack combinando campos relevantes
    this.haystack = items.map(item => {
      const parts: string[] = [];
      for (const key of this.keys) {
        const value = item[key.name];
        if (typeof value === 'string' && value) {
          parts.push(normalizeForSearch(value));
        }
      }
      return parts.join(' ');
    });
    
    // Crear instancia uFuzzy
    this.uf = new uFuzzy(UFUZZY_OPTIONS);
  }
  
  /**
   * Busca items que coincidan con la query
   */
  search(query: string, options?: { limit?: number }): FuzzyResult<T>[] {
    if (!query || query.trim().length === 0) {
      return [];
    }
    
    const normalizedQuery = normalizeForSearch(query);
    if (normalizedQuery.length < 2) {
      return [];
    }
    
    const limit = options?.limit ?? 10;
    
    // Búsqueda con uFuzzy
    const [idxs, info, order] = this.uf.search(this.haystack, normalizedQuery);
    
    if (!idxs || idxs.length === 0) {
      return [];
    }
    
    // Procesar resultados
    const results: FuzzyResult<T>[] = [];
    const indices = order || idxs;
    
    for (let i = 0; i < Math.min(indices.length, limit); i++) {
      const idx = order ? idxs[order[i]] : indices[i];
      
      // Calcular score basado en info
      let score = 0;
      if (info && order) {
        const infoIdx = order[i];
        // uFuzzy: menor score = mejor match
        // Normalizamos a 0-1 donde 0 = mejor
        const rawScore = info.idx?.[infoIdx] ?? 0;
        score = Math.min(1, rawScore / 100);
      } else {
        // Sin info detallada, usar posición como proxy
        score = i / indices.length * 0.5;
      }
      
      // Filtrar por threshold
      if (score > this.threshold) continue;
      
      results.push({
        item: this.items[idx],
        score,
      });
    }
    
    return results;
  }
  
  /**
   * Actualiza el conjunto de items
   */
  setItems(items: T[]): void {
    this.items = items;
    this.haystack = items.map(item => {
      const parts: string[] = [];
      for (const key of this.keys) {
        const value = item[key.name];
        if (typeof value === 'string' && value) {
          parts.push(normalizeForSearch(value));
        }
      }
      return parts.join(' ');
    });
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Búsqueda fuzzy simple en array de strings
 */
export function fuzzySearchStrings(
  haystack: string[],
  query: string,
  limit = 10
): { item: string; index: number; score: number }[] {
  if (!query || !haystack.length) return [];
  
  const uf = new uFuzzy(UFUZZY_OPTIONS);
  const normalizedQuery = normalizeForSearch(query);
  const normalizedHaystack = haystack.map(normalizeForSearch);
  
  const [idxs, info, order] = uf.search(normalizedHaystack, normalizedQuery);
  
  if (!idxs || idxs.length === 0) return [];
  
  const results: { item: string; index: number; score: number }[] = [];
  const indices = order || idxs;
  
  for (let i = 0; i < Math.min(indices.length, limit); i++) {
    const idx = order ? idxs[order[i]] : indices[i];
    const score = info && order ? (info.idx?.[order[i]] ?? 0) / 100 : i / indices.length * 0.5;
    
    results.push({
      item: haystack[idx],
      index: idx,
      score: Math.min(1, score),
    });
  }
  
  return results;
}

/**
 * Calcula score de similaridad entre dos strings (0-100)
 */
export function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  
  const normalizedA = normalizeForSearch(a);
  const normalizedB = normalizeForSearch(b);
  
  // Match exacto
  if (normalizedA === normalizedB) return 100;
  
  // Uno contiene al otro
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    const ratio = Math.min(normalizedA.length, normalizedB.length) / 
                  Math.max(normalizedA.length, normalizedB.length);
    return Math.round(70 + (ratio * 30));
  }
  
  // uFuzzy para match parcial
  const uf = new uFuzzy(UFUZZY_OPTIONS);
  const [idxs, info, order] = uf.search([normalizedB], normalizedA);
  
  if (!idxs || idxs.length === 0) return 0;
  
  // Convertir score uFuzzy a 0-100
  if (info && order && order.length > 0) {
    const rawScore = info.idx?.[order[0]] ?? 50;
    return Math.max(0, Math.min(100, 100 - rawScore));
  }
  
  return 50; // Match básico
}

// ============================================================================
// EXPORTS
// ============================================================================

export default FastFuzzy;
