/**
 * PTEL LocalData - Esquemas IndexedDB (Dexie.js)
 * 
 * Define la estructura de la base de datos local para:
 * - DERA: Datos Espaciales de Referencia de Andalucía
 * - INE: Códigos y centroides de municipios
 * - Sync: Metadatos de sincronización
 * - Cache: Resultados geocodificación cacheados
 * 
 * Capacidad estimada: ~420MB total
 * - DERA: ~50MB (10,653 features)
 * - CDAU: ~340MB (direcciones) - FUTURO
 * - INE: ~2MB (786 municipios)
 * - Boundaries: ~15MB (polígonos TopoJSON)
 * 
 * @module lib/localData/schemas
 * @version 1.0.0
 * @date 2025-12-05
 * @session A.3
 */

import Dexie, { type Table } from 'dexie';

// ============================================================================
// TIPOS: INFRAESTRUCTURAS DERA
// ============================================================================

/**
 * Tipología de infraestructura según clasificación PTEL
 */
export type InfraTipologia = 
  | 'SANITARIO'
  | 'EDUCATIVO'
  | 'SEGURIDAD'
  | 'MUNICIPAL'
  | 'EMERGENCIA'
  | 'ENERGIA'
  | 'HIDRAULICO'
  | 'PATRIMONIO'
  | 'DEPORTIVO'
  | 'TRANSPORTE'
  | 'OTRO';

/**
 * Feature de infraestructura DERA almacenada localmente
 * 
 * Campos alineados con LocalFeature de LocalDataService.ts
 * para compatibilidad con el sistema existente.
 */
export interface DERAFeature {
  /** ID único (generado: `${tipologia}_${codMun}_${index}`) */
  id: string;
  
  /** Tipología clasificada (SANITARIO, EDUCATIVO, etc.) */
  tipologia: InfraTipologia;
  
  /** Nombre oficial de la infraestructura */
  nombre: string;
  
  /** Subtipo específico (ej: "Centro de Salud", "CEIP", "Policía Local") */
  subtipo?: string;
  
  /** Dirección postal si existe */
  direccion?: string;
  
  /** Localidad o núcleo de población */
  localidad?: string;
  
  /** Código INE del municipio (5 dígitos) */
  codMun: string;
  
  /** Nombre del municipio */
  municipio: string;
  
  /** Provincia */
  provincia: string;
  
  /** Código provincia (2 dígitos) */
  codProv: string;
  
  /** Coordenada X UTM (EPSG:25830) */
  x: number;
  
  /** Coordenada Y UTM (EPSG:25830) */
  y: number;
  
  /** Capa WFS de origen (ej: "g12_04_equipamiento_sanitario") */
  capaOrigen: string;
  
  /** Metadatos adicionales del WFS */
  metadata?: Record<string, unknown>;
  
  /** Fecha de carga en la BBDD local */
  fechaCarga: string;  // ISO 8601
}

// ============================================================================
// TIPOS: MUNICIPIOS INE
// ============================================================================

/**
 * Municipio con centroide y metadatos INE
 */
export interface INEMunicipio {
  /** Código INE (5 dígitos): clave primaria */
  codMun: string;
  
  /** Nombre oficial del municipio */
  nombre: string;
  
  /** Nombre normalizado (sin acentos, mayúsculas) para búsqueda */
  nombreNorm: string;
  
  /** Provincia */
  provincia: string;
  
  /** Código provincia (2 dígitos) */
  codProv: string;
  
  /** Centroide X UTM (EPSG:25830) */
  centroideX: number;
  
  /** Centroide Y UTM (EPSG:25830) */
  centroideY: number;
  
  /** Superficie en km² */
  superficie?: number;
  
  /** Población (último dato disponible) */
  poblacion?: number;
}

// ============================================================================
// TIPOS: LÍMITES MUNICIPALES
// ============================================================================

/**
 * Límite municipal simplificado para validación point-in-polygon
 * 
 * Almacena el bounding box y geometría simplificada.
 * La geometría completa se carga bajo demanda del TopoJSON.
 */
export interface MunicipioBoundary {
  /** Código INE (5 dígitos): clave primaria */
  codMun: string;
  
  /** Bounding box: X mínima */
  bboxMinX: number;
  
  /** Bounding box: Y mínima */
  bboxMinY: number;
  
  /** Bounding box: X máxima */
  bboxMaxX: number;
  
  /** Bounding box: Y máxima */
  bboxMaxY: number;
  
  /** Geometría simplificada (GeoJSON Polygon/MultiPolygon) */
  geometry?: string;  // JSON stringified
}

// ============================================================================
// TIPOS: CACHE DE GEOCODIFICACIÓN
// ============================================================================

/**
 * Resultado de geocodificación cacheado
 * 
 * TTL: 7 días por defecto
 */
export interface GeocodingCache {
  /** Hash del query (nombre + codMun + tipología) */
  id: string;
  
  /** Query original */
  query: string;
  
  /** Código municipio del contexto */
  codMun?: string;
  
  /** Tipología buscada */
  tipologia?: InfraTipologia;
  
  /** Resultado: coordenada X */
  x: number | null;
  
  /** Resultado: coordenada Y */
  y: number | null;
  
  /** Confianza del resultado (0-100) */
  confidence: number;
  
  /** Fuente que proporcionó el resultado */
  source: string;
  
  /** Timestamp de creación */
  createdAt: string;  // ISO 8601
  
  /** Timestamp de expiración */
  expiresAt: string;  // ISO 8601
}

// ============================================================================
// TIPOS: METADATOS DE SINCRONIZACIÓN
// ============================================================================

/**
 * Estado de sincronización por fuente de datos
 */
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'error';

/**
 * Metadatos de sincronización de una fuente
 */
export interface SyncMetadata {
  /** Identificador de la fuente: 'dera', 'ine', 'boundaries', 'cdau' */
  id: string;
  
  /** Estado actual de sincronización */
  status: SyncStatus;
  
  /** Última sincronización exitosa */
  lastSync: string | null;  // ISO 8601
  
  /** Próxima sincronización programada */
  nextSync: string | null;  // ISO 8601
  
  /** Versión de los datos (fecha de publicación fuente) */
  dataVersion: string | null;
  
  /** Número de registros almacenados */
  recordCount: number;
  
  /** Tamaño aproximado en bytes */
  sizeBytes: number;
  
  /** Mensaje de error si status='error' */
  errorMessage?: string;
  
  /** Timestamp del último intento */
  lastAttempt: string;  // ISO 8601
}

// ============================================================================
// TIPOS: ÍNDICE ESPACIAL SERIALIZADO (C.2)
// ============================================================================

/**
 * Índice espacial Flatbush serializado para persistencia
 * 
 * El índice R-tree se serializa como ArrayBuffer y se almacena
 * en IndexedDB para evitar reconstrucción en cada carga.
 * 
 * @see https://github.com/mourner/flatbush#static-index
 */
export interface SpatialIndexData {
  /** Identificador del índice (ej: 'flatbush_dera') */
  id: string;
  
  /** Datos del índice Flatbush serializados (ArrayBuffer) */
  data: ArrayBuffer;
  
  /** Número de features indexados */
  featureCount: number;
  
  /** Número de items (mismo que featureCount para puntos) */
  numItems: number;
  
  /** Timestamp de creación */
  createdAt: string;  // ISO 8601
  
  /** Versión del formato de serialización */
  version: string;
}

// ============================================================================
// DEFINICIÓN DE LA BASE DE DATOS
// ============================================================================

/**
 * Base de datos local PTEL con Dexie.js
 * 
 * Tablas:
 * - dera: Infraestructuras DERA (~50MB)
 * - ine: Municipios y centroides (~2MB)
 * - boundaries: Límites municipales (~15MB)
 * - geocodingCache: Cache de resultados
 * - syncMetadata: Estado de sincronización
 * - spatialIndexes: Índices espaciales serializados (C.2)
 * 
 * Índices optimizados para:
 * - Búsqueda singleton: [tipologia+codMun]
 * - Búsqueda por municipio: codMun
 * - Búsqueda por nombre: nombre (para fuzzy)
 */
export class PTELDatabase extends Dexie {
  // Declaración de tablas
  dera!: Table<DERAFeature, string>;
  ine!: Table<INEMunicipio, string>;
  boundaries!: Table<MunicipioBoundary, string>;
  geocodingCache!: Table<GeocodingCache, string>;
  syncMetadata!: Table<SyncMetadata, string>;
  spatialIndexes!: Table<SpatialIndexData, string>;  // C.2: Flatbush serializado

  constructor() {
    super('PTELLocalData');
    
    // Versión 1: Esquema inicial
    this.version(1).stores({
      // DERA: índice compuesto para singleton detection (F023)
      // [tipologia+codMun] permite: db.dera.where({tipologia, codMun}).toArray()
      dera: 'id, tipologia, codMun, [tipologia+codMun], nombre, capaOrigen',
      
      // INE: búsqueda por código o nombre
      ine: 'codMun, nombre, nombreNorm, provincia, codProv',
      
      // Boundaries: búsqueda por código
      boundaries: 'codMun',
      
      // Cache: búsqueda por id (hash) con TTL
      geocodingCache: 'id, codMun, tipologia, expiresAt',
      
      // Sync: una entrada por fuente
      syncMetadata: 'id, status, lastSync'
    });
    
    // Versión 2: Añade tabla spatialIndexes (C.2 - Flatbush serializado)
    this.version(2).stores({
      dera: 'id, tipologia, codMun, [tipologia+codMun], nombre, capaOrigen',
      ine: 'codMun, nombre, nombreNorm, provincia, codProv',
      boundaries: 'codMun',
      geocodingCache: 'id, codMun, tipologia, expiresAt',
      syncMetadata: 'id, status, lastSync',
      // Nueva tabla para índices espaciales serializados
      spatialIndexes: 'id, featureCount, createdAt'
    });
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

/**
 * Instancia única de la base de datos
 * 
 * Uso:
 * ```typescript
 * import { db } from './schemas';
 * 
 * // Buscar infraestructuras sanitarias en un municipio
 * const sanitarios = await db.dera
 *   .where({ tipologia: 'SANITARIO', codMun: '18051' })
 *   .toArray();
 * 
 * // Contar features por tipología
 * const count = await db.dera
 *   .where({ tipologia: 'EDUCATIVO', codMun: '18051' })
 *   .count();
 * ```
 */
export const db = new PTELDatabase();

// ============================================================================
// HELPERS DE INICIALIZACIÓN
// ============================================================================

/**
 * Verifica si la base de datos tiene datos cargados
 */
export async function isDatabaseReady(): Promise<boolean> {
  try {
    const deraCount = await db.dera.count();
    const ineCount = await db.ine.count();
    return deraCount > 0 && ineCount > 0;
  } catch {
    return false;
  }
}

/**
 * Obtiene estadísticas de la base de datos
 */
export async function getDatabaseStats(): Promise<{
  dera: number;
  ine: number;
  boundaries: number;
  cache: number;
  lastSync: string | null;
}> {
  const [deraCount, ineCount, boundariesCount, cacheCount, syncMeta] = await Promise.all([
    db.dera.count(),
    db.ine.count(),
    db.boundaries.count(),
    db.geocodingCache.count(),
    db.syncMetadata.get('dera')
  ]);
  
  return {
    dera: deraCount,
    ine: ineCount,
    boundaries: boundariesCount,
    cache: cacheCount,
    lastSync: syncMeta?.lastSync ?? null
  };
}

/**
 * Limpia el cache expirado
 */
export async function cleanExpiredCache(): Promise<number> {
  const now = new Date().toISOString();
  const expired = await db.geocodingCache
    .where('expiresAt')
    .below(now)
    .toArray();
  
  if (expired.length > 0) {
    await db.geocodingCache.bulkDelete(expired.map(e => e.id));
  }
  
  return expired.length;
}

/**
 * Genera hash para cache key
 */
export function generateCacheKey(
  query: string, 
  codMun?: string, 
  tipologia?: InfraTipologia
): string {
  const normalized = query.toLowerCase().trim();
  const parts = [normalized, codMun || '', tipologia || ''];
  
  // Simple hash usando charCode
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `cache_${Math.abs(hash).toString(16)}`;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** TTL por defecto para cache de geocodificación (7 días) */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Intervalo de sincronización recomendado (90 días) */
export const SYNC_INTERVAL_DAYS = 90;

/** Versión del esquema de datos */
export const SCHEMA_VERSION = 2;

/** ID del índice Flatbush principal */
export const SPATIAL_INDEX_ID = 'flatbush_dera';
