/**
 * PTEL LocalData - Servicio de carga y sincronización
 * 
 * Gestiona la carga inicial de datos DERA/INE en IndexedDB (Dexie.js).
 * Descarga JSON desde /public/data/ e inserta en bulk.
 * 
 * @module lib/localData/localDataService
 * @version 1.0.0
 * @date 2025-12-05
 * @session B.2
 */

import { db, type DERAFeature, type INEMunicipio, type SyncMetadata } from './schemas';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Estado de progreso de la carga
 */
export interface LoadProgress {
  /** Fase actual: 'checking' | 'downloading' | 'inserting' | 'complete' | 'error' */
  phase: 'checking' | 'downloading' | 'inserting' | 'complete' | 'error';
  /** Dataset actual siendo procesado */
  currentDataset: 'dera' | 'ine' | null;
  /** Porcentaje total (0-100) */
  percent: number;
  /** Registros procesados */
  processed: number;
  /** Total de registros a procesar */
  total: number;
  /** Mensaje descriptivo */
  message: string;
  /** Error si phase='error' */
  error?: Error;
}

/**
 * Opciones de configuración del servicio
 */
export interface LoadOptions {
  /** Forzar recarga aunque existan datos */
  forceReload?: boolean;
  /** Callback de progreso */
  onProgress?: (progress: LoadProgress) => void;
  /** Timeout para fetch en ms (default: 30000) */
  fetchTimeout?: number;
}

/**
 * Resultado de la carga
 */
export interface LoadResult {
  success: boolean;
  deraCount: number;
  ineCount: number;
  durationMs: number;
  error?: Error;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const BASE_PATH = '/data';
const DERA_FILE = 'dera-dexie/all-dera.json';
const INE_FILE = 'ine/municipios.json';
const DEFAULT_TIMEOUT = 30000;

// Tamaño de batch para inserciones (evita bloquear UI)
const BATCH_SIZE = 500;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fetch con timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout después de ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Inserta registros en batches para no bloquear la UI
 */
async function bulkInsertInBatches<T>(
  table: Dexie.Table<T, string>,
  records: T[],
  onBatch?: (processed: number) => void
): Promise<void> {
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await table.bulkPut(batch as T[]);
    onBatch?.(Math.min(i + BATCH_SIZE, records.length));
    // Pequeña pausa para permitir actualizar UI
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================

/**
 * Verifica si la base de datos ya tiene datos cargados
 */
export async function checkDataLoaded(): Promise<{
  isLoaded: boolean;
  deraCount: number;
  ineCount: number;
  lastSync: string | null;
}> {
  try {
    const [deraCount, ineCount, syncMeta] = await Promise.all([
      db.dera.count(),
      db.ine.count(),
      db.syncMetadata.get('dera')
    ]);
    
    return {
      isLoaded: deraCount > 0 && ineCount > 0,
      deraCount,
      ineCount,
      lastSync: syncMeta?.lastSync ?? null
    };
  } catch (error) {
    console.error('[LocalData] Error checking data:', error);
    return {
      isLoaded: false,
      deraCount: 0,
      ineCount: 0,
      lastSync: null
    };
  }
}

/**
 * Carga inicial de datos DERA e INE en IndexedDB
 * 
 * Flujo:
 * 1. Verificar si ya hay datos (skip si forceReload=false)
 * 2. Descargar JSON de DERA
 * 3. Insertar DERA en batches
 * 4. Descargar JSON de INE
 * 5. Insertar INE
 * 6. Actualizar SyncMetadata
 */
export async function loadInitialData(options: LoadOptions = {}): Promise<LoadResult> {
  const {
    forceReload = false,
    onProgress,
    fetchTimeout = DEFAULT_TIMEOUT
  } = options;
  
  const startTime = Date.now();
  let deraCount = 0;
  let ineCount = 0;
  
  const report = (progress: Partial<LoadProgress>) => {
    onProgress?.({
      phase: 'checking',
      currentDataset: null,
      percent: 0,
      processed: 0,
      total: 0,
      message: '',
      ...progress
    } as LoadProgress);
  };
  
  try {
    // Fase 1: Verificar estado actual
    report({
      phase: 'checking',
      message: 'Verificando base de datos local...'
    });
    
    const status = await checkDataLoaded();
    
    if (status.isLoaded && !forceReload) {
      report({
        phase: 'complete',
        percent: 100,
        processed: status.deraCount + status.ineCount,
        total: status.deraCount + status.ineCount,
        message: 'Datos ya cargados'
      });
      
      return {
        success: true,
        deraCount: status.deraCount,
        ineCount: status.ineCount,
        durationMs: Date.now() - startTime
      };
    }
    
    // Si forceReload, limpiar tablas primero
    if (forceReload && status.isLoaded) {
      report({
        phase: 'checking',
        message: 'Limpiando datos anteriores...'
      });
      await Promise.all([
        db.dera.clear(),
        db.ine.clear()
      ]);
    }
    
    // Fase 2: Descargar DERA
    report({
      phase: 'downloading',
      currentDataset: 'dera',
      percent: 5,
      message: 'Descargando datos DERA...'
    });
    
    const deraUrl = `${BASE_PATH}/${DERA_FILE}`;
    const deraResponse = await fetchWithTimeout(deraUrl, fetchTimeout);
    const deraData: DERAFeature[] = await deraResponse.json();
    
    report({
      phase: 'downloading',
      currentDataset: 'dera',
      percent: 25,
      total: deraData.length,
      message: `DERA: ${deraData.length.toLocaleString()} infraestructuras`
    });
    
    // Fase 3: Insertar DERA
    report({
      phase: 'inserting',
      currentDataset: 'dera',
      percent: 30,
      total: deraData.length,
      message: 'Insertando datos DERA...'
    });
    
    await bulkInsertInBatches(db.dera, deraData, (processed) => {
      const percentDera = 30 + Math.floor((processed / deraData.length) * 30);
      report({
        phase: 'inserting',
        currentDataset: 'dera',
        percent: percentDera,
        processed,
        total: deraData.length,
        message: `DERA: ${processed.toLocaleString()} / ${deraData.length.toLocaleString()}`
      });
    });
    
    deraCount = deraData.length;
    
    // Fase 4: Descargar INE
    report({
      phase: 'downloading',
      currentDataset: 'ine',
      percent: 65,
      message: 'Descargando datos INE...'
    });
    
    const ineUrl = `${BASE_PATH}/${INE_FILE}`;
    const ineResponse = await fetchWithTimeout(ineUrl, fetchTimeout);
    const ineData: INEMunicipio[] = await ineResponse.json();
    
    report({
      phase: 'downloading',
      currentDataset: 'ine',
      percent: 75,
      total: ineData.length,
      message: `INE: ${ineData.length} municipios`
    });
    
    // Fase 5: Insertar INE
    report({
      phase: 'inserting',
      currentDataset: 'ine',
      percent: 80,
      total: ineData.length,
      message: 'Insertando datos INE...'
    });
    
    await db.ine.bulkPut(ineData);
    ineCount = ineData.length;
    
    report({
      phase: 'inserting',
      currentDataset: 'ine',
      percent: 90,
      processed: ineCount,
      total: ineCount,
      message: `INE: ${ineCount} municipios insertados`
    });
    
    // Fase 6: Actualizar SyncMetadata
    const now = new Date().toISOString();
    const syncMetaDera: SyncMetadata = {
      id: 'dera',
      status: 'completed',
      lastSync: now,
      nextSync: null,
      dataVersion: '2025-12-05',
      recordCount: deraCount,
      sizeBytes: JSON.stringify(deraData).length,
      lastAttempt: now
    };
    
    const syncMetaIne: SyncMetadata = {
      id: 'ine',
      status: 'completed',
      lastSync: now,
      nextSync: null,
      dataVersion: '2025-12-05',
      recordCount: ineCount,
      sizeBytes: JSON.stringify(ineData).length,
      lastAttempt: now
    };
    
    await db.syncMetadata.bulkPut([syncMetaDera, syncMetaIne]);
    
    // Completo
    report({
      phase: 'complete',
      currentDataset: null,
      percent: 100,
      processed: deraCount + ineCount,
      total: deraCount + ineCount,
      message: `Carga completada: ${deraCount.toLocaleString()} DERA + ${ineCount} INE`
    });
    
    return {
      success: true,
      deraCount,
      ineCount,
      durationMs: Date.now() - startTime
    };
    
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    report({
      phase: 'error',
      message: `Error: ${errorObj.message}`,
      error: errorObj
    });
    
    // Registrar error en SyncMetadata
    try {
      await db.syncMetadata.put({
        id: 'dera',
        status: 'error',
        lastSync: null,
        nextSync: null,
        dataVersion: null,
        recordCount: 0,
        sizeBytes: 0,
        errorMessage: errorObj.message,
        lastAttempt: new Date().toISOString()
      });
    } catch {
      // Ignorar errores al guardar metadata
    }
    
    return {
      success: false,
      deraCount,
      ineCount,
      durationMs: Date.now() - startTime,
      error: errorObj
    };
  }
}

/**
 * Limpia todos los datos locales
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.dera.clear(),
    db.ine.clear(),
    db.boundaries.clear(),
    db.geocodingCache.clear(),
    db.syncMetadata.clear()
  ]);
}
