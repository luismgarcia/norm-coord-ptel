/**
 * PTEL LocalData - Hook de acceso a datos locales
 * 
 * Proporciona acceso reactivo al estado de la base de datos IndexedDB.
 * Verifica si los datos están cargados y expone funciones de carga.
 * 
 * @module hooks/useLocalData
 * @version 1.0.0
 * @date 2025-12-05
 * @session B.2
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  db, 
  type DERAFeature, 
  type INEMunicipio,
  type InfraTipologia 
} from '../lib/localData/schemas';
import { 
  checkDataLoaded, 
  loadInitialData, 
  type LoadProgress,
  type LoadResult 
} from '../lib/localData/localDataService';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Estado del hook
 */
export interface UseLocalDataState {
  /** Indica si la verificación inicial está en curso */
  isChecking: boolean;
  /** Indica si los datos están cargados y listos */
  isReady: boolean;
  /** Indica si hay una carga en progreso */
  isLoading: boolean;
  /** Progreso de carga actual */
  progress: LoadProgress | null;
  /** Estadísticas de datos cargados */
  stats: {
    deraCount: number;
    ineCount: number;
    lastSync: string | null;
  } | null;
  /** Error si ocurrió alguno */
  error: Error | null;
}

/**
 * Acciones del hook
 */
export interface UseLocalDataActions {
  /** Inicia o reinicia la carga de datos */
  loadData: (forceReload?: boolean) => Promise<LoadResult>;
  /** Busca infraestructuras DERA por tipología y municipio */
  findDERAByMunicipio: (codMun: string, tipologia?: InfraTipologia) => Promise<DERAFeature[]>;
  /** Busca municipio INE por código */
  findMunicipio: (codMun: string) => Promise<INEMunicipio | undefined>;
  /** Busca municipio INE por nombre (aproximado) */
  findMunicipioByNombre: (nombre: string) => Promise<INEMunicipio | undefined>;
  /** Cuenta infraestructuras por tipología en un municipio */
  countByTipologia: (codMun: string, tipologia: InfraTipologia) => Promise<number>;
  /** Refresca el estado de la base de datos */
  refresh: () => Promise<void>;
}

/**
 * Retorno del hook
 */
export type UseLocalDataReturn = UseLocalDataState & UseLocalDataActions;

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook para gestionar el acceso a datos locales IndexedDB
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isReady, isLoading, progress, loadData, findDERAByMunicipio } = useLocalData();
 *   
 *   if (!isReady && !isLoading) {
 *     return <button onClick={() => loadData()}>Cargar datos</button>;
 *   }
 *   
 *   if (isLoading) {
 *     return <progress value={progress?.percent} max={100} />;
 *   }
 *   
 *   // Datos listos, puedo buscar
 *   const handleSearch = async () => {
 *     const results = await findDERAByMunicipio('18051', 'SANITARIO');
 *   };
 * }
 * ```
 */
export function useLocalData(): UseLocalDataReturn {
  const [state, setState] = useState<UseLocalDataState>({
    isChecking: true,
    isReady: false,
    isLoading: false,
    progress: null,
    stats: null,
    error: null
  });
  
  // Ref para evitar múltiples cargas simultáneas
  const loadingRef = useRef(false);
  
  // Verificación inicial al montar
  useEffect(() => {
    let mounted = true;
    
    const check = async () => {
      try {
        const status = await checkDataLoaded();
        
        if (mounted) {
          setState(prev => ({
            ...prev,
            isChecking: false,
            isReady: status.isLoaded,
            stats: {
              deraCount: status.deraCount,
              ineCount: status.ineCount,
              lastSync: status.lastSync
            }
          }));
        }
      } catch (error) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            isChecking: false,
            isReady: false,
            error: error instanceof Error ? error : new Error(String(error))
          }));
        }
      }
    };
    
    check();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  // Acción: Cargar datos
  const loadData = useCallback(async (forceReload = false): Promise<LoadResult> => {
    if (loadingRef.current) {
      return {
        success: false,
        deraCount: 0,
        ineCount: 0,
        durationMs: 0,
        error: new Error('Carga ya en progreso')
      };
    }
    
    loadingRef.current = true;
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: {
        phase: 'checking',
        currentDataset: null,
        percent: 0,
        processed: 0,
        total: 0,
        message: 'Iniciando...'
      }
    }));
    
    try {
      const result = await loadInitialData({
        forceReload,
        onProgress: (progress) => {
          setState(prev => ({
            ...prev,
            progress
          }));
        }
      });
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isReady: true,
          progress: null,
          stats: {
            deraCount: result.deraCount,
            ineCount: result.ineCount,
            lastSync: new Date().toISOString()
          }
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || new Error('Error desconocido')
        }));
      }
      
      return result;
      
    } finally {
      loadingRef.current = false;
    }
  }, []);
  
  // Acción: Buscar DERA por municipio
  const findDERAByMunicipio = useCallback(async (
    codMun: string, 
    tipologia?: InfraTipologia
  ): Promise<DERAFeature[]> => {
    if (tipologia) {
      return db.dera
        .where({ tipologia, codMun })
        .toArray();
    }
    return db.dera
      .where('codMun')
      .equals(codMun)
      .toArray();
  }, []);
  
  // Acción: Buscar municipio por código
  const findMunicipio = useCallback(async (codMun: string): Promise<INEMunicipio | undefined> => {
    return db.ine.get(codMun);
  }, []);
  
  // Acción: Buscar municipio por nombre (normalizado)
  const findMunicipioByNombre = useCallback(async (nombre: string): Promise<INEMunicipio | undefined> => {
    const normalized = nombre
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    
    return db.ine
      .where('nombreNorm')
      .equals(normalized)
      .first();
  }, []);
  
  // Acción: Contar por tipología
  const countByTipologia = useCallback(async (
    codMun: string, 
    tipologia: InfraTipologia
  ): Promise<number> => {
    return db.dera
      .where({ tipologia, codMun })
      .count();
  }, []);
  
  // Acción: Refrescar estado
  const refresh = useCallback(async (): Promise<void> => {
    const status = await checkDataLoaded();
    setState(prev => ({
      ...prev,
      isReady: status.isLoaded,
      stats: {
        deraCount: status.deraCount,
        ineCount: status.ineCount,
        lastSync: status.lastSync
      }
    }));
  }, []);
  
  return {
    ...state,
    loadData,
    findDERAByMunicipio,
    findMunicipio,
    findMunicipioByNombre,
    countByTipologia,
    refresh
  };
}

export default useLocalData;
