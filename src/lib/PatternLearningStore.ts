/**
 * PTEL Pattern Learning Store v1.1
 * 
 * Sistema de almacenamiento persistente con IndexedDB (Dexie.js)
 * para patrones de coordenadas aprendidos adaptativamente.
 * 
 * Características:
 * - IndexedDB para almacenamiento persistente (>50MB capacidad)
 * - Migración automática desde localStorage
 * - Cache LRU en memoria para rendimiento
 * - Estadísticas por municipio y documento
 * - Exportación/importación de patrones
 * - Carga automática de patrones semilla (v1.1)
 * 
 * CHANGELOG v1.1 (02-Dic-2025):
 * - NEW: loadSeedPatterns() - carga patrones validados empíricamente
 * - NEW: initializeWithSeeds() - inicialización con patrones semilla
 * - NEW: getSeedStats() - estadísticas de patrones semilla
 * - NEW: Integración con seedPatterns.ts
 * - FIX: Mejor manejo de booleanos en queries IndexedDB
 * 
 * @version 1.1.0
 * @date Diciembre 2025
 */

import Dexie, { type Table } from 'dexie';
import type { LearnedPattern, PatternCondition, PatternTransform } from './learnedPatterns';
import { 
  PATTERN_CATALOG, 
  MUNICIPIO_PROFILES, 
  VALIDATION_STATS,
  generateAllSeedPatterns,
  type PatternCatalogEntry,
  type MunicipioProfile
} from './seedPatterns';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Perfil de documento con patrones predominantes detectados
 */
export interface DocumentProfile {
  id: string;
  filename: string;
  municipio: string;
  provincia: string;
  fechaAnalisis: string;
  patronesPredominantes: PatronStats[];
  formatoDecimal: 'coma' | 'punto' | 'mixto';
  formatoMiles: 'punto' | 'espacio' | 'ninguno';
  tieneCorrupcionUTF8: boolean;
  tieneCoordenadasDMS: boolean;
  tieneCoordenadasNMEA: boolean;
  porcentajeExito: number;
  totalRegistros: number;
  registrosConCoordenadas: number;
  confianzaPerfil: 'alta' | 'media' | 'baja';
}

export interface PatronStats {
  patron: string;
  frecuencia: number;
  porcentaje: number;
  exitoso: boolean;
}

export interface MunicipioStats {
  codigoINE: string;
  nombre: string;
  provincia: string;
  documentosProcesados: number;
  patronesFrecuentes: { patron: string; count: number }[];
  ultimoProcesamiento: string;
  tasaExitoPromedio: number;
}

export interface LearningEvent {
  id?: number;
  timestamp: string;
  tipo: 'pattern_learned' | 'pattern_applied' | 'pattern_failed' | 'profile_created' | 'seeds_loaded';
  patternId?: string;
  municipio?: string;
  documentId?: string;
  detalles: Record<string, unknown>;
}

// ============================================================================
// BASE DE DATOS DEXIE
// ============================================================================

class PTELLearningDatabase extends Dexie {
  patterns!: Table<LearnedPattern & { id: string }>;
  profiles!: Table<DocumentProfile>;
  municipioStats!: Table<MunicipioStats>;
  events!: Table<LearningEvent>;

  constructor() {
    super('PTELLearningDB');
    
    this.version(1).stores({
      patterns: 'id, name, field, source, isStable, *municipalities',
      profiles: 'id, municipio, provincia, fechaAnalisis',
      municipioStats: 'codigoINE, nombre, provincia',
      events: '++id, timestamp, tipo, patternId, municipio'
    });
  }
}

// ============================================================================
// SINGLETON Y CACHE
// ============================================================================

let db: PTELLearningDatabase | null = null;
let memoryCache: Map<string, LearnedPattern> = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  pattern: LearnedPattern;
  timestamp: number;
}
const cacheTimestamps: Map<string, number> = new Map();

/**
 * Obtiene la instancia de la base de datos
 */
export async function getDatabase(): Promise<PTELLearningDatabase> {
  if (!db) {
    db = new PTELLearningDatabase();
    await db.open();
    await migrateFromLocalStorage();
    await loadSeedPatternsIfNeeded();
  }
  return db;
}

// ============================================================================
// PATRONES SEMILLA
// ============================================================================

const SEEDS_LOADED_FLAG = 'ptel_seeds_loaded_v1';

/**
 * Carga los patrones semilla si no se han cargado antes
 */
async function loadSeedPatternsIfNeeded(): Promise<void> {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    // Verificar si ya se cargaron los seeds
    if (localStorage.getItem(SEEDS_LOADED_FLAG) === 'true') {
      return;
    }
    
    await loadSeedPatterns();
    localStorage.setItem(SEEDS_LOADED_FLAG, 'true');
  } catch (error) {
    console.warn('Error cargando patrones semilla:', error);
  }
}

/**
 * Carga los patrones semilla desde la validación empírica
 */
export async function loadSeedPatterns(): Promise<{ loaded: number; skipped: number }> {
  const database = await getDatabase();
  const seedPatterns = generateAllSeedPatterns();
  
  let loaded = 0;
  let skipped = 0;
  
  for (const pattern of seedPatterns) {
    const existing = await database.patterns.get(pattern.id);
    if (!existing) {
      await database.patterns.put(pattern);
      loaded++;
      
      // Actualizar cache
      memoryCache.set(pattern.id, pattern);
      cacheTimestamps.set(pattern.id, Date.now());
    } else {
      skipped++;
    }
  }
  
  if (loaded > 0) {
    console.log(`✅ Cargados ${loaded} patrones semilla de validación empírica`);
    
    await logEvent({
      timestamp: new Date().toISOString(),
      tipo: 'seeds_loaded',
      detalles: {
        loaded,
        skipped,
        source: 'empirical_validation_2025-12-02',
        municipios: VALIDATION_STATS.municipios.lista
      }
    });
  }
  
  return { loaded, skipped };
}

/**
 * Obtiene estadísticas de los patrones semilla
 */
export function getSeedStats(): typeof VALIDATION_STATS {
  return VALIDATION_STATS;
}

/**
 * Obtiene el catálogo de patrones semilla
 */
export function getSeedCatalog(): PatternCatalogEntry[] {
  return PATTERN_CATALOG;
}

/**
 * Obtiene perfiles de municipio conocidos
 */
export function getMunicipioPerfil(municipio: string): MunicipioProfile | undefined {
  const normalizado = normalizarNombreMunicipio(municipio);
  return MUNICIPIO_PROFILES.find(p => 
    normalizarNombreMunicipio(p.nombre) === normalizado
  );
}

/**
 * Obtiene todos los perfiles de municipio
 */
export function getAllMunicipioPerfiles(): MunicipioProfile[] {
  return MUNICIPIO_PROFILES;
}

/**
 * Sugiere patrones probables para un municipio
 */
export function sugerirPatronesParaMunicipio(municipio: string): PatternCatalogEntry[] {
  const perfil = getMunicipioPerfil(municipio);
  
  if (perfil) {
    // Retornar patrones dominantes del municipio
    return PATTERN_CATALOG.filter(p => 
      perfil.patronesDominantes.includes(p.id)
    );
  }
  
  // Si no hay perfil, retornar los patrones más comunes
  return PATTERN_CATALOG
    .filter(p => p.confidence === 'ALTA')
    .slice(0, 5);
}

// ============================================================================
// MIGRACIÓN DESDE LOCALSTORAGE
// ============================================================================

const LEGACY_STORAGE_KEY = 'ptel_learned_patterns';
const MIGRATION_FLAG = 'ptel_indexeddb_migrated';

/**
 * Migra patrones existentes de localStorage a IndexedDB
 */
async function migrateFromLocalStorage(): Promise<void> {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') {
      return;
    }

    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(MIGRATION_FLAG, 'true');
      return;
    }

    const patterns = JSON.parse(stored) as Record<string, LearnedPattern>;
    const database = await getDatabase();

    const patternList = Object.values(patterns);
    if (patternList.length > 0) {
      await database.patterns.bulkPut(patternList.map(p => ({ ...p, id: p.id })));
      console.log(`✅ Migrados ${patternList.length} patrones de localStorage a IndexedDB`);
    }

    localStorage.setItem(MIGRATION_FLAG, 'true');
  } catch (error) {
    console.warn('Error migrando patrones:', error);
  }
}

// ============================================================================
// GESTIÓN DE PATRONES
// ============================================================================

/**
 * Guarda un patrón aprendido
 */
export async function saveLearnedPattern(pattern: LearnedPattern): Promise<void> {
  const database = await getDatabase();
  
  const updatedPattern = {
    ...pattern,
    lastUsed: new Date().toISOString()
  };
  
  await database.patterns.put(updatedPattern);
  
  memoryCache.set(pattern.id, updatedPattern);
  cacheTimestamps.set(pattern.id, Date.now());
  
  if (memoryCache.size > CACHE_MAX_SIZE) {
    evictOldestCacheEntry();
  }
  
  await logEvent({
    timestamp: new Date().toISOString(),
    tipo: 'pattern_learned',
    patternId: pattern.id,
    municipio: pattern.municipalities?.[0],
    detalles: { name: pattern.name, source: pattern.source }
  });
}

/**
 * Obtiene un patrón por ID
 */
export async function getPattern(id: string): Promise<LearnedPattern | undefined> {
  const cached = memoryCache.get(id);
  const timestamp = cacheTimestamps.get(id);
  
  if (cached && timestamp && (Date.now() - timestamp) < CACHE_TTL_MS) {
    return cached;
  }
  
  const database = await getDatabase();
  const pattern = await database.patterns.get(id);
  
  if (pattern) {
    memoryCache.set(id, pattern);
    cacheTimestamps.set(id, Date.now());
  }
  
  return pattern;
}

/**
 * Obtiene todos los patrones
 */
export async function getAllPatterns(): Promise<LearnedPattern[]> {
  const database = await getDatabase();
  return database.patterns.toArray();
}

/**
 * Obtiene patrones estables (alto éxito)
 */
export async function getStablePatterns(): Promise<LearnedPattern[]> {
  const database = await getDatabase();
  return database.patterns.filter(p => p.isStable === true).toArray();
}

/**
 * Obtiene patrones por municipio
 */
export async function getPatternsByMunicipio(municipio: string): Promise<LearnedPattern[]> {
  const database = await getDatabase();
  const normalizado = normalizarNombreMunicipio(municipio);
  
  return database.patterns
    .filter(p => p.municipalities?.some(m => 
      normalizarNombreMunicipio(m) === normalizado
    ) ?? false)
    .toArray();
}

/**
 * Actualiza estadísticas de uso de un patrón
 */
export async function updatePatternUsage(
  patternId: string,
  success: boolean,
  municipio?: string
): Promise<void> {
  const database = await getDatabase();
  const pattern = await database.patterns.get(patternId);
  
  if (!pattern) return;
  
  pattern.uses++;
  if (success) {
    pattern.successes++;
  } else {
    pattern.failures++;
  }
  pattern.lastUsed = new Date().toISOString();
  
  if (municipio) {
    if (!pattern.municipalities) {
      pattern.municipalities = [];
    }
    if (!pattern.municipalities.includes(municipio)) {
      pattern.municipalities.push(municipio);
    }
  }
  
  const successRate = pattern.uses > 0 ? pattern.successes / pattern.uses : 0;
  pattern.isStable = pattern.uses >= 10 && successRate >= 0.95;
  
  await database.patterns.put(pattern);
  
  memoryCache.set(patternId, pattern);
  cacheTimestamps.set(patternId, Date.now());
  
  await logEvent({
    timestamp: new Date().toISOString(),
    tipo: success ? 'pattern_applied' : 'pattern_failed',
    patternId,
    municipio,
    detalles: { uses: pattern.uses, successRate }
  });
}

/**
 * Elimina un patrón
 */
export async function deletePattern(id: string): Promise<void> {
  const database = await getDatabase();
  await database.patterns.delete(id);
  memoryCache.delete(id);
  cacheTimestamps.delete(id);
}

// ============================================================================
// PERFILES DE DOCUMENTO
// ============================================================================

/**
 * Guarda un perfil de documento analizado
 */
export async function saveDocumentProfile(profile: DocumentProfile): Promise<void> {
  const database = await getDatabase();
  await database.profiles.put(profile);
  
  await updateMunicipioStats(profile.municipio, profile.provincia, profile);
  
  await logEvent({
    timestamp: new Date().toISOString(),
    tipo: 'profile_created',
    documentId: profile.id,
    municipio: profile.municipio,
    detalles: { 
      filename: profile.filename,
      porcentajeExito: profile.porcentajeExito,
      totalRegistros: profile.totalRegistros
    }
  });
}

/**
 * Obtiene el perfil de un documento
 */
export async function getDocumentProfile(id: string): Promise<DocumentProfile | undefined> {
  const database = await getDatabase();
  return database.profiles.get(id);
}

/**
 * Obtiene perfiles de documentos de un municipio
 */
export async function getProfilesByMunicipio(municipio: string): Promise<DocumentProfile[]> {
  const database = await getDatabase();
  const normalizado = normalizarNombreMunicipio(municipio);
  
  return database.profiles
    .where('municipio')
    .equals(normalizado)
    .toArray();
}

// ============================================================================
// ESTADÍSTICAS DE MUNICIPIOS
// ============================================================================

/**
 * Actualiza las estadísticas de un municipio
 */
async function updateMunicipioStats(
  municipio: string,
  provincia: string,
  profile: DocumentProfile
): Promise<void> {
  const database = await getDatabase();
  const codigoINE = obtenerCodigoINE(municipio, provincia);
  
  let stats = await database.municipioStats.get(codigoINE);
  
  if (!stats) {
    stats = {
      codigoINE,
      nombre: municipio,
      provincia,
      documentosProcesados: 0,
      patronesFrecuentes: [],
      ultimoProcesamiento: '',
      tasaExitoPromedio: 0
    };
  }
  
  stats.documentosProcesados++;
  stats.ultimoProcesamiento = new Date().toISOString();
  
  const oldTotal = stats.tasaExitoPromedio * (stats.documentosProcesados - 1);
  stats.tasaExitoPromedio = (oldTotal + profile.porcentajeExito) / stats.documentosProcesados;
  
  for (const patronStat of profile.patronesPredominantes) {
    const existing = stats.patronesFrecuentes.find(p => p.patron === patronStat.patron);
    if (existing) {
      existing.count += patronStat.frecuencia;
    } else {
      stats.patronesFrecuentes.push({ 
        patron: patronStat.patron, 
        count: patronStat.frecuencia 
      });
    }
  }
  
  stats.patronesFrecuentes.sort((a, b) => b.count - a.count);
  stats.patronesFrecuentes = stats.patronesFrecuentes.slice(0, 10);
  
  await database.municipioStats.put(stats);
}

/**
 * Obtiene estadísticas de un municipio
 */
export async function getMunicipioStats(
  municipio: string,
  provincia?: string
): Promise<MunicipioStats | undefined> {
  const database = await getDatabase();
  const codigoINE = obtenerCodigoINE(municipio, provincia || '');
  return database.municipioStats.get(codigoINE);
}

/**
 * Obtiene estadísticas de todos los municipios procesados
 */
export async function getAllMunicipioStats(): Promise<MunicipioStats[]> {
  const database = await getDatabase();
  return database.municipioStats.toArray();
}

// ============================================================================
// EVENTOS Y LOG
// ============================================================================

/**
 * Registra un evento de aprendizaje
 */
async function logEvent(event: LearningEvent): Promise<void> {
  try {
    const database = await getDatabase();
    await database.events.add(event);
    
    const count = await database.events.count();
    if (count > 1000) {
      const oldest = await database.events.orderBy('id').limit(count - 1000).toArray();
      await database.events.bulkDelete(oldest.map(e => e.id!));
    }
  } catch (error) {
    console.warn('Error registrando evento:', error);
  }
}

/**
 * Obtiene eventos recientes
 */
export async function getRecentEvents(limit: number = 50): Promise<LearningEvent[]> {
  const database = await getDatabase();
  return database.events
    .orderBy('id')
    .reverse()
    .limit(limit)
    .toArray();
}

// ============================================================================
// EXPORTACIÓN E IMPORTACIÓN
// ============================================================================

export interface ExportData {
  version: string;
  exportDate: string;
  patterns: LearnedPattern[];
  profiles: DocumentProfile[];
  municipioStats: MunicipioStats[];
}

/**
 * Exporta todos los datos de aprendizaje
 */
export async function exportLearningData(): Promise<ExportData> {
  const database = await getDatabase();
  
  return {
    version: '1.1.0',
    exportDate: new Date().toISOString(),
    patterns: await database.patterns.toArray(),
    profiles: await database.profiles.toArray(),
    municipioStats: await database.municipioStats.toArray()
  };
}

/**
 * Importa datos de aprendizaje
 */
export async function importLearningData(
  data: ExportData,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ imported: number; skipped: number }> {
  const database = await getDatabase();
  let imported = 0;
  let skipped = 0;
  
  if (mode === 'replace') {
    await database.patterns.clear();
    await database.profiles.clear();
    await database.municipioStats.clear();
  }
  
  for (const pattern of data.patterns) {
    const existing = await database.patterns.get(pattern.id);
    if (!existing || mode === 'replace') {
      await database.patterns.put(pattern);
      imported++;
    } else {
      skipped++;
    }
  }
  
  for (const profile of data.profiles) {
    const existing = await database.profiles.get(profile.id);
    if (!existing || mode === 'replace') {
      await database.profiles.put(profile);
    }
  }
  
  for (const stats of data.municipioStats) {
    const existing = await database.municipioStats.get(stats.codigoINE);
    if (!existing || mode === 'replace') {
      await database.municipioStats.put(stats);
    }
  }
  
  return { imported, skipped };
}

/**
 * Exporta patrones estables para contribución comunitaria
 */
export async function exportCommunityPatterns(): Promise<string> {
  const stable = await getStablePatterns();
  
  const exportData = {
    version: '1.1.0',
    exportDate: new Date().toISOString(),
    contributor: 'anonymous',
    patterns: stable.map(p => ({
      ...p,
      source: 'community' as const
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Normaliza nombre de municipio para comparación
 */
function normalizarNombreMunicipio(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Obtiene código INE aproximado (simplificado)
 */
function obtenerCodigoINE(municipio: string, provincia: string): string {
  const normalizado = normalizarNombreMunicipio(municipio + provincia);
  let hash = 0;
  for (let i = 0; i < normalizado.length; i++) {
    const char = normalizado.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Limpia la entrada más antigua del cache LRU
 */
function evictOldestCacheEntry(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  
  for (const [key, timestamp] of cacheTimestamps.entries()) {
    if (timestamp < oldestTime) {
      oldestTime = timestamp;
      oldestKey = key;
    }
  }
  
  if (oldestKey) {
    memoryCache.delete(oldestKey);
    cacheTimestamps.delete(oldestKey);
  }
}

/**
 * Limpia el cache en memoria
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
  cacheTimestamps.clear();
}

/**
 * Obtiene estadísticas del sistema de aprendizaje
 */
export async function getLearningStats(): Promise<{
  totalPatterns: number;
  stablePatterns: number;
  seedPatterns: number;
  totalProfiles: number;
  totalMunicipios: number;
  cacheSize: number;
  dbSizeEstimate: string;
}> {
  const database = await getDatabase();
  
  const totalPatterns = await database.patterns.count();
  const stablePatterns = await database.patterns.filter(p => p.isStable === true).count();
  const seedPatterns = await database.patterns.filter(p => p.id.startsWith('SEED_')).count();
  const totalProfiles = await database.profiles.count();
  const totalMunicipios = await database.municipioStats.count();
  
  const patternsSize = totalPatterns * 500;
  const profilesSize = totalProfiles * 1000;
  const totalBytes = patternsSize + profilesSize;
  const dbSizeEstimate = totalBytes < 1024 
    ? `${totalBytes} B`
    : totalBytes < 1024 * 1024 
      ? `${(totalBytes / 1024).toFixed(1)} KB`
      : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  
  return {
    totalPatterns,
    stablePatterns,
    seedPatterns,
    totalProfiles,
    totalMunicipios,
    cacheSize: memoryCache.size,
    dbSizeEstimate
  };
}

/**
 * Fuerza la recarga de patrones semilla
 */
export async function forceReloadSeeds(): Promise<{ loaded: number; skipped: number }> {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SEEDS_LOADED_FLAG);
  }
  return loadSeedPatterns();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getDatabase,
  // Patrones semilla
  loadSeedPatterns,
  forceReloadSeeds,
  getSeedStats,
  getSeedCatalog,
  getMunicipioPerfil,
  getAllMunicipioPerfiles,
  sugerirPatronesParaMunicipio,
  // Patrones aprendidos
  saveLearnedPattern,
  getPattern,
  getAllPatterns,
  getStablePatterns,
  getPatternsByMunicipio,
  updatePatternUsage,
  deletePattern,
  // Perfiles de documento
  saveDocumentProfile,
  getDocumentProfile,
  getProfilesByMunicipio,
  // Estadísticas
  getMunicipioStats,
  getAllMunicipioStats,
  getRecentEvents,
  getLearningStats,
  // Exportación/Importación
  exportLearningData,
  importLearningData,
  exportCommunityPatterns,
  // Utilidades
  clearMemoryCache
};
