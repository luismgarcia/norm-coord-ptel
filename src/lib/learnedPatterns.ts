/**
 * PTEL Learned Patterns System v1.0
 * 
 * Sistema de aprendizaje adaptativo para patrones de coordenadas.
 * Almacena patrones descubiertos en localStorage y los combina con
 * patrones comunitarios del archivo patterns.json.
 * 
 * ARQUITECTURA:
 * - Capa 1 (Core): Patrones en código (coordinateNormalizer.ts)
 * - Capa 2 (Local): Patrones aprendidos (localStorage)
 * - Capa 3 (Comunitario): patterns.json (GitHub)
 * 
 * @author PTEL Development Team
 * @version 1.0.0
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface LearnedPattern {
  id: string;
  name: string;
  description: string;
  field: 'x' | 'y' | 'both';
  condition: PatternCondition;
  transform: PatternTransform;
  confidence: number;
  uses: number;
  successes: number;
  failures: number;
  source: 'auto' | 'user' | 'community';
  firstSeen: string;
  lastUsed: string;
  municipalities: string[];
  isStable: boolean;
  version: string;
}

export interface PatternCondition {
  type: 'range' | 'regex' | 'digits' | 'custom';
  // Para type='range'
  minValue?: number;
  maxValue?: number;
  // Para type='regex'
  pattern?: string;
  // Para type='digits'
  digitCount?: number;
  // Para type='custom'
  customCode?: string;
}

export interface PatternTransform {
  type: 'multiply' | 'add' | 'replace' | 'custom';
  // Para type='multiply'
  factor?: number;
  // Para type='add'
  addend?: number;
  // Para type='replace'
  pattern?: string;
  replacement?: string;
  // Para type='custom'
  customCode?: string;
}

export interface PatternSuggestion {
  pattern: Partial<LearnedPattern>;
  originalValue: string;
  suggestedValue: number;
  hypothesis: string;
  confidence: number;
}

export interface CommunityPatterns {
  version: string;
  lastUpdate: string;
  patterns: LearnedPattern[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const STORAGE_KEY = 'ptel_learned_patterns';
const STATS_KEY = 'ptel_pattern_stats';
const COMMUNITY_PATTERNS_URL = '/patterns.json';

// Umbral para considerar un patrón como "estable"
const STABILITY_THRESHOLD = {
  minUses: 10,
  minSuccessRate: 0.95
};

// ============================================================================
// ALMACENAMIENTO LOCAL
// ============================================================================

/**
 * Obtiene todos los patrones almacenados localmente.
 */
export function getStoredPatterns(): Record<string, LearnedPattern> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Error leyendo patrones de localStorage:', error);
    return {};
  }
}

/**
 * Guarda un patrón en localStorage.
 */
export function savePattern(pattern: LearnedPattern): void {
  try {
    const existing = getStoredPatterns();
    existing[pattern.id] = {
      ...pattern,
      lastUsed: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('Error guardando patrón en localStorage:', error);
  }
}

/**
 * Elimina un patrón de localStorage.
 */
export function removePattern(patternId: string): void {
  try {
    const existing = getStoredPatterns();
    delete existing[patternId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('Error eliminando patrón:', error);
  }
}

/**
 * Actualiza estadísticas de uso de un patrón.
 */
export function updatePatternStats(
  patternId: string, 
  success: boolean,
  municipality?: string
): void {
  try {
    const existing = getStoredPatterns();
    const pattern = existing[patternId];
    
    if (pattern) {
      pattern.uses++;
      if (success) {
        pattern.successes++;
      } else {
        pattern.failures++;
      }
      pattern.lastUsed = new Date().toISOString();
      
      // Añadir municipio si es nuevo
      if (municipality && !pattern.municipalities.includes(municipality)) {
        pattern.municipalities.push(municipality);
      }
      
      // Verificar si alcanzó estabilidad
      const successRate = pattern.successes / pattern.uses;
      pattern.isStable = 
        pattern.uses >= STABILITY_THRESHOLD.minUses && 
        successRate >= STABILITY_THRESHOLD.minSuccessRate;
      
      savePattern(pattern);
    }
  } catch (error) {
    console.warn('Error actualizando estadísticas:', error);
  }
}

// ============================================================================
// PATRONES COMUNITARIOS
// ============================================================================

let cachedCommunityPatterns: LearnedPattern[] | null = null;

/**
 * Carga patrones comunitarios desde el archivo JSON.
 */
export async function loadCommunityPatterns(): Promise<LearnedPattern[]> {
  if (cachedCommunityPatterns) {
    return cachedCommunityPatterns;
  }
  
  try {
    const response = await fetch(COMMUNITY_PATTERNS_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data: CommunityPatterns = await response.json();
    cachedCommunityPatterns = data.patterns;
    return cachedCommunityPatterns;
  } catch (error) {
    console.warn('Error cargando patrones comunitarios:', error);
    return [];
  }
}

/**
 * Obtiene todos los patrones (locales + comunitarios).
 */
export async function getAllPatterns(): Promise<LearnedPattern[]> {
  const local = Object.values(getStoredPatterns());
  const community = await loadCommunityPatterns();
  
  // Combinar, priorizando locales sobre comunitarios con mismo ID
  const localIds = new Set(local.map(p => p.id));
  const uniqueCommunity = community.filter(p => !localIds.has(p.id));
  
  return [...local, ...uniqueCommunity];
}

// ============================================================================
// CREACIÓN DE PATRONES
// ============================================================================

/**
 * Genera un ID único para un patrón.
 */
function generatePatternId(): string {
  return `pat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Crea un nuevo patrón a partir de una corrección del usuario.
 */
export function createPatternFromCorrection(
  field: 'x' | 'y',
  originalValue: string,
  correctedValue: number,
  hypothesis: string,
  municipality?: string
): LearnedPattern {
  const original = parseFloat(originalValue.replace(/[^\d.-]/g, ''));
  
  // Detectar tipo de transformación
  let transform: PatternTransform;
  let condition: PatternCondition;
  
  if (!isNaN(original)) {
    const ratio = correctedValue / original;
    
    if (Math.abs(ratio - 1000) < 1) {
      // Multiplicación por 1000 (km → m)
      transform = { type: 'multiply', factor: 1000 };
      condition = { 
        type: 'range', 
        minValue: 0, 
        maxValue: 1000 
      };
    } else if (Math.abs(ratio - 10) < 0.1) {
      // Multiplicación por 10 (truncado)
      transform = { type: 'multiply', factor: 10 };
      condition = { 
        type: 'digits', 
        digitCount: 5 
      };
    } else if (Math.abs(correctedValue - original - 4000000) < 1000) {
      // Suma de 4000000 (Y truncada)
      transform = { type: 'add', addend: 4000000 };
      condition = { 
        type: 'range', 
        minValue: 100000, 
        maxValue: 999999 
      };
    } else {
      // Transformación genérica
      transform = { type: 'multiply', factor: ratio };
      condition = { type: 'custom', customCode: `value === ${original}` };
    }
  } else {
    // Si no pudimos parsear, usar regex
    transform = { type: 'replace', pattern: originalValue, replacement: String(correctedValue) };
    condition = { type: 'regex', pattern: originalValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') };
  }
  
  const now = new Date().toISOString();
  
  return {
    id: generatePatternId(),
    name: hypothesis,
    description: `Patrón detectado: ${originalValue} → ${correctedValue}`,
    field,
    condition,
    transform,
    confidence: 80, // Confianza inicial
    uses: 1,
    successes: 1,
    failures: 0,
    source: 'user',
    firstSeen: now,
    lastUsed: now,
    municipalities: municipality ? [municipality] : [],
    isStable: false,
    version: '1.0.0'
  };
}

/**
 * Crea un patrón a partir de una sugerencia heurística aceptada.
 */
export function createPatternFromHeuristic(
  suggestion: PatternSuggestion,
  municipality?: string
): LearnedPattern {
  return createPatternFromCorrection(
    suggestion.pattern.field || 'x',
    suggestion.originalValue,
    suggestion.suggestedValue,
    suggestion.hypothesis,
    municipality
  );
}

// ============================================================================
// APLICACIÓN DE PATRONES
// ============================================================================

/**
 * Intenta aplicar patrones aprendidos a un valor.
 */
export function applyLearnedPatterns(
  value: number,
  originalStr: string,
  field: 'x' | 'y',
  patterns: LearnedPattern[]
): { applied: boolean; result: number; pattern?: LearnedPattern } {
  
  for (const pattern of patterns) {
    if (pattern.field !== field && pattern.field !== 'both') continue;
    
    // Verificar condición
    if (!matchesCondition(value, originalStr, pattern.condition)) continue;
    
    // Aplicar transformación
    const result = applyTransform(value, originalStr, pattern.transform);
    
    if (result !== null) {
      return { applied: true, result, pattern };
    }
  }
  
  return { applied: false, result: value };
}

/**
 * Verifica si un valor cumple la condición de un patrón.
 */
function matchesCondition(
  value: number, 
  originalStr: string, 
  condition: PatternCondition
): boolean {
  switch (condition.type) {
    case 'range':
      return (
        (condition.minValue === undefined || value >= condition.minValue) &&
        (condition.maxValue === undefined || value <= condition.maxValue)
      );
    
    case 'regex':
      if (!condition.pattern) return false;
      return new RegExp(condition.pattern).test(originalStr);
    
    case 'digits':
      const digitCount = Math.floor(Math.abs(value)).toString().length;
      return digitCount === condition.digitCount;
    
    case 'custom':
      // Por seguridad, no ejecutamos código arbitrario
      // Los patrones custom se manejan caso por caso
      return false;
    
    default:
      return false;
  }
}

/**
 * Aplica una transformación a un valor.
 */
function applyTransform(
  value: number, 
  originalStr: string, 
  transform: PatternTransform
): number | null {
  switch (transform.type) {
    case 'multiply':
      return transform.factor ? value * transform.factor : null;
    
    case 'add':
      return transform.addend ? value + transform.addend : null;
    
    case 'replace':
      if (!transform.pattern || !transform.replacement) return null;
      const replaced = originalStr.replace(
        new RegExp(transform.pattern, 'g'), 
        transform.replacement
      );
      const parsed = parseFloat(replaced.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? null : parsed;
    
    case 'custom':
      return null;
    
    default:
      return null;
  }
}

// ============================================================================
// ESTADÍSTICAS GLOBALES
// ============================================================================

export interface PatternStats {
  totalPatterns: number;
  localPatterns: number;
  communityPatterns: number;
  stablePatterns: number;
  totalUses: number;
  avgSuccessRate: number;
  topPatterns: { id: string; name: string; uses: number; successRate: number }[];
}

/**
 * Obtiene estadísticas globales del sistema de patrones.
 */
export async function getPatternStats(): Promise<PatternStats> {
  const all = await getAllPatterns();
  const local = Object.values(getStoredPatterns());
  
  let totalUses = 0;
  let totalSuccesses = 0;
  
  const patternsWithStats = all.map(p => {
    totalUses += p.uses;
    totalSuccesses += p.successes;
    return {
      id: p.id,
      name: p.name,
      uses: p.uses,
      successRate: p.uses > 0 ? p.successes / p.uses : 0
    };
  });
  
  // Top 5 patrones por uso
  const topPatterns = patternsWithStats
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 5);
  
  return {
    totalPatterns: all.length,
    localPatterns: local.length,
    communityPatterns: all.length - local.length,
    stablePatterns: all.filter(p => p.isStable).length,
    totalUses,
    avgSuccessRate: totalUses > 0 ? totalSuccesses / totalUses : 0,
    topPatterns
  };
}

// ============================================================================
// EXPORTACIÓN DE PATRONES
// ============================================================================

/**
 * Exporta patrones locales estables para contribuir al repositorio comunitario.
 */
export function exportStablePatterns(): LearnedPattern[] {
  const local = Object.values(getStoredPatterns());
  return local.filter(p => p.isStable);
}

/**
 * Genera JSON formateado para contribución a patterns.json.
 */
export function exportPatternsAsJSON(): string {
  const stable = exportStablePatterns();
  const exportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    patterns: stable.map(p => ({
      ...p,
      source: 'community' // Cambiar source al exportar
    }))
  };
  return JSON.stringify(exportData, null, 2);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getStoredPatterns,
  savePattern,
  removePattern,
  updatePatternStats,
  loadCommunityPatterns,
  getAllPatterns,
  createPatternFromCorrection,
  createPatternFromHeuristic,
  applyLearnedPatterns,
  getPatternStats,
  exportStablePatterns,
  exportPatternsAsJSON
};
