/**
 * Hook para geocodificación de infraestructuras PTEL
 * 
 * Integra el GeocodingOrchestrator con estado React para:
 * - Geocodificar infraestructuras sin coordenadas
 * - Mostrar progreso en tiempo real
 * - Manejar errores y reintentos
 * 
 * @module hooks/useGeocoding
 */

import { useState, useCallback, useRef } from 'react';
import { GeocodingOrchestrator, OrchestrationResult } from '../services/geocoding/GeocodingOrchestrator';
import { ExtractedInfrastructure, ProcessedInfrastructure, GeocodingBatchStats } from '../types/processing';

/**
 * Estado del proceso de geocodificación
 */
export type GeocodingState = 'idle' | 'running' | 'paused' | 'completed' | 'error';

/**
 * Progreso de geocodificación
 */
export interface GeocodingProgress {
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
  estimatedTimeRemaining?: number;
}

/**
 * Resultado del hook
 */
export interface UseGeocodingReturn {
  /** Estado actual */
  state: GeocodingState;
  
  /** Progreso actual */
  progress: GeocodingProgress;
  
  /** Estadísticas del batch */
  stats: GeocodingBatchStats;
  
  /** Resultados de geocodificación */
  results: Map<string, OrchestrationResult>;
  
  /** Error si hay alguno */
  error: string | null;
  
  /** Iniciar geocodificación */
  startGeocoding: (
    infrastructures: ExtractedInfrastructure[],
    municipality: string,
    province: string
  ) => Promise<ProcessedInfrastructure[]>;
  
  /** Pausar geocodificación */
  pause: () => void;
  
  /** Reanudar geocodificación */
  resume: () => void;
  
  /** Cancelar geocodificación */
  cancel: () => void;
  
  /** Resetear estado */
  reset: () => void;
}

/**
 * Hook para gestionar geocodificación de infraestructuras
 */
export function useGeocoding(): UseGeocodingReturn {
  // Estado
  const [state, setState] = useState<GeocodingState>('idle');
  const [progress, setProgress] = useState<GeocodingProgress>({
    current: 0,
    total: 0,
    percentage: 0
  });
  const [stats, setStats] = useState<GeocodingBatchStats>({
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    bySource: {},
    totalTime: 0
  });
  const [results, setResults] = useState<Map<string, OrchestrationResult>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  // Refs para control de flujo
  const orchestratorRef = useRef<GeocodingOrchestrator | null>(null);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  
  /**
   * Inicializa el orquestador si no existe
   */
  const getOrchestrator = useCallback(() => {
    if (!orchestratorRef.current) {
      orchestratorRef.current = new GeocodingOrchestrator();
    }
    return orchestratorRef.current;
  }, []);
  
  /**
   * Calcula confianza basada en score
   */
  const calculateConfidence = (score: number): ProcessedInfrastructure['confidence'] => {
    if (score >= 90) return 'ALTA';
    if (score >= 70) return 'MEDIA';
    if (score >= 50) return 'BAJA';
    if (score > 0) return 'CRITICA';
    return 'NULA';
  };
  
  /**
   * Inicia el proceso de geocodificación
   */
  const startGeocoding = useCallback(async (
    infrastructures: ExtractedInfrastructure[],
    municipality: string,
    province: string
  ): Promise<ProcessedInfrastructure[]> => {
    // Filtrar solo las que necesitan geocodificación
    const toGeocode = infrastructures.filter(inf => !inf.hasCoordinates);
    
    if (toGeocode.length === 0) {
      // No hay nada que geocodificar, devolver tal cual
      return infrastructures.map(inf => ({
        ...inf,
        xFinal: inf.hasCoordinates ? parseFloat(inf.xOriginal) : undefined,
        yFinal: inf.hasCoordinates ? parseFloat(inf.yOriginal) : undefined,
        score: inf.hasCoordinates ? 95 : 0,
        source: inf.hasCoordinates ? 'original' : 'none',
        confidence: inf.hasCoordinates ? 'ALTA' : 'NULA'
      }));
    }
    
    // Reset estado
    isCancelledRef.current = false;
    isPausedRef.current = false;
    startTimeRef.current = Date.now();
    
    setState('running');
    setError(null);
    setProgress({
      current: 0,
      total: toGeocode.length,
      percentage: 0
    });
    setStats({
      total: toGeocode.length,
      successful: 0,
      failed: 0,
      pending: toGeocode.length,
      bySource: {},
      totalTime: 0
    });
    
    const orchestrator = getOrchestrator();
    const newResults = new Map<string, OrchestrationResult>();
    const processedInfrastructures: ProcessedInfrastructure[] = [];
    
    // Estadísticas locales
    let successful = 0;
    let failed = 0;
    const bySource: Record<string, number> = {};
    
    try {
      // Procesar una por una para mejor control y feedback
      for (let i = 0; i < infrastructures.length; i++) {
        const inf = infrastructures[i];
        
        // Verificar cancelación
        if (isCancelledRef.current) {
          setState('idle');
          break;
        }
        
        // Manejar pausa
        while (isPausedRef.current && !isCancelledRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Si ya tiene coordenadas, solo normalizar
        if (inf.hasCoordinates) {
          const xNum = parseFloat(inf.xOriginal);
          const yNum = parseFloat(inf.yOriginal);
          
          processedInfrastructures.push({
            ...inf,
            xFinal: xNum,
            yFinal: yNum,
            score: 95,
            source: 'original',
            confidence: 'ALTA'
          });
          continue;
        }
        
        // Geocodificar
        setProgress(prev => ({
          ...prev,
          current: i + 1,
          percentage: Math.round(((i + 1) / toGeocode.length) * 100),
          currentItem: inf.nombre
        }));
        
        try {
          const result = await orchestrator.geocode({
            name: inf.nombre,
            municipality: inf.municipio || municipality,
            province: inf.provincia || province,
            address: inf.direccion || undefined,
            useGenericFallback: true,
            timeout: 10000
          });
          
          newResults.set(inf.id, result);
          
          if (result.geocoding) {
            successful++;
            const source = result.geocoderUsed;
            bySource[source] = (bySource[source] || 0) + 1;
            
            processedInfrastructures.push({
              ...inf,
              xFinal: result.geocoding.x,
              yFinal: result.geocoding.y,
              status: 'geocoded',
              geocoding: result,
              score: result.geocoding.confidence,
              source: result.geocoderUsed,
              confidence: calculateConfidence(result.geocoding.confidence)
            });
          } else {
            failed++;
            processedInfrastructures.push({
              ...inf,
              status: 'failed',
              geocoding: result,
              score: 0,
              source: 'none',
              confidence: 'NULA'
            });
          }
        } catch (err) {
          failed++;
          console.error(`Error geocodificando ${inf.nombre}:`, err);
          processedInfrastructures.push({
            ...inf,
            status: 'failed',
            score: 0,
            source: 'error',
            confidence: 'NULA'
          });
        }
        
        // Actualizar estadísticas
        setStats({
          total: toGeocode.length,
          successful,
          failed,
          pending: toGeocode.length - successful - failed,
          bySource,
          totalTime: Date.now() - startTimeRef.current
        });
        
        // Pequeña pausa para no saturar APIs
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      setResults(newResults);
      setState('completed');
      
      return processedInfrastructures;
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      setState('error');
      throw err;
    }
  }, [getOrchestrator]);
  
  /**
   * Pausa la geocodificación
   */
  const pause = useCallback(() => {
    isPausedRef.current = true;
    setState('paused');
  }, []);
  
  /**
   * Reanuda la geocodificación
   */
  const resume = useCallback(() => {
    isPausedRef.current = false;
    setState('running');
  }, []);
  
  /**
   * Cancela la geocodificación
   */
  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setState('idle');
  }, []);
  
  /**
   * Resetea el estado
   */
  const reset = useCallback(() => {
    setState('idle');
    setProgress({ current: 0, total: 0, percentage: 0 });
    setStats({
      total: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      bySource: {},
      totalTime: 0
    });
    setResults(new Map());
    setError(null);
    isCancelledRef.current = false;
    isPausedRef.current = false;
  }, []);
  
  return {
    state,
    progress,
    stats,
    results,
    error,
    startGeocoding,
    pause,
    resume,
    cancel,
    reset
  };
}
