/**
 * PTEL LocalData - Componente de carga inicial
 * 
 * Muestra indicador de progreso durante la carga de datos DERA/INE
 * en IndexedDB. Se oculta automáticamente cuando la carga completa.
 * 
 * @module components/DataLoader
 * @version 1.0.0
 * @date 2025-12-05
 * @session B.2
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  SpinnerGap, 
  CheckCircle, 
  XCircle, 
  ArrowClockwise,
  MapPin,
  Buildings
} from '@phosphor-icons/react';
import { useLocalData } from '../hooks/useLocalData';

// ============================================================================
// TIPOS
// ============================================================================

export interface DataLoaderProps {
  /** Callback cuando los datos están listos */
  onReady?: () => void;
  /** Callback cuando ocurre un error */
  onError?: (error: Error) => void;
  /** Si true, muestra overlay modal; si false, inline */
  modal?: boolean;
  /** Auto-iniciar carga si no hay datos */
  autoLoad?: boolean;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function DataLoader({
  onReady,
  onError,
  modal = true,
  autoLoad = true
}: DataLoaderProps) {
  const {
    isChecking,
    isReady,
    isLoading,
    progress,
    stats,
    error,
    loadData
  } = useLocalData();
  
  // Auto-cargar si no hay datos y autoLoad=true
  useEffect(() => {
    if (!isChecking && !isReady && !isLoading && !error && autoLoad) {
      loadData();
    }
  }, [isChecking, isReady, isLoading, error, autoLoad, loadData]);
  
  // Notificar cuando está listo
  useEffect(() => {
    if (isReady && onReady) {
      onReady();
    }
  }, [isReady, onReady]);
  
  // Notificar errores
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);
  
  // No mostrar nada si ya está listo
  if (isReady && !isLoading) {
    return null;
  }
  
  // Renderizar contenido
  const content = (
    <div className="flex flex-col items-center gap-6 p-8">
      {/* Icono principal */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl">
          <Database size={48} weight="duotone" className="text-primary" />
        </div>
        
        {/* Spinner overlay durante carga */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -bottom-1 -right-1"
            >
              <SpinnerGap 
                size={24} 
                className="animate-spin text-primary bg-background rounded-full" 
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Check cuando completo */}
        <AnimatePresence>
          {isReady && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -bottom-1 -right-1"
            >
              <CheckCircle 
                size={24} 
                weight="fill"
                className="text-green-500 bg-background rounded-full" 
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error */}
        <AnimatePresence>
          {error && !isLoading && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -bottom-1 -right-1"
            >
              <XCircle 
                size={24} 
                weight="fill"
                className="text-destructive bg-background rounded-full" 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Título y mensaje */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {isChecking ? 'Verificando datos locales...' :
           isLoading ? 'Cargando datos de referencia' :
           error ? 'Error al cargar datos' :
           'Datos de referencia'}
        </h2>
        
        <p className="text-sm text-muted-foreground">
          {progress?.message || 
           (isChecking ? 'Comprobando base de datos' : 
            error?.message || 
            'Infraestructuras y municipios de Andalucía')}
        </p>
      </div>
      
      {/* Barra de progreso */}
      {isLoading && progress && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{progress.percent}%</span>
            {progress.currentDataset && (
              <span className="flex items-center gap-1">
                {progress.currentDataset === 'dera' ? (
                  <Buildings size={12} />
                ) : (
                  <MapPin size={12} />
                )}
                {progress.currentDataset.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Estadísticas cuando está listo */}
      {isReady && stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-6 text-center"
        >
          <div className="flex flex-col items-center">
            <Buildings size={20} className="text-primary mb-1" />
            <span className="text-lg font-semibold">{stats.deraCount.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">Infraestructuras</span>
          </div>
          <div className="flex flex-col items-center">
            <MapPin size={20} className="text-primary mb-1" />
            <span className="text-lg font-semibold">{stats.ineCount}</span>
            <span className="text-xs text-muted-foreground">Municipios</span>
          </div>
        </motion.div>
      )}
      
      {/* Botón de reintentar si hay error */}
      {error && !isLoading && (
        <button
          onClick={() => loadData(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <ArrowClockwise size={18} />
          Reintentar
        </button>
      )}
    </div>
  );
  
  // Si modal, envolver en overlay
  if (modal) {
    return (
      <AnimatePresence>
        {(!isReady || isLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-xl"
            >
              {content}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
  
  // Inline
  return content;
}

export default DataLoader;
