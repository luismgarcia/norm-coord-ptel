/**
 * Tipos para el procesamiento de documentos PTEL
 * 
 * Incluye estructuras para infraestructuras con y sin coordenadas,
 * resultados de geocodificación y estado del procesamiento.
 * 
 * @module types/processing
 */

import { NormalizationResult } from '../lib/coordinateNormalizer';
import { OrchestrationResult } from '../services/geocoding/GeocodingOrchestrator';

/**
 * Estado de coordenadas de una infraestructura
 */
export type CoordinateStatus = 
  | 'original'      // Tenía coordenadas en el documento original
  | 'geocoded'      // Geocodificada automáticamente
  | 'pending'       // Pendiente de geocodificación
  | 'failed'        // Falló la geocodificación
  | 'manual';       // Requiere intervención manual

/**
 * Infraestructura extraída del documento
 */
export interface ExtractedInfrastructure {
  /** ID único para tracking */
  id: string;
  
  /** Tabla de origen en el documento */
  tabla: string;
  
  /** Nombre de la infraestructura */
  nombre: string;
  
  /** Tipo/categoría según documento */
  tipo: string;
  
  /** Dirección si está disponible */
  direccion: string;
  
  /** Coordenada X original (puede estar vacía) */
  xOriginal: string;
  
  /** Coordenada Y original (puede estar vacía) */
  yOriginal: string;
  
  /** ¿Tiene coordenadas válidas? */
  hasCoordinates: boolean;
  
  /** Estado actual de las coordenadas */
  status: CoordinateStatus;
  
  /** Municipio detectado */
  municipio?: string;
  
  /** Provincia detectada */
  provincia?: string;
}

/**
 * Infraestructura procesada (normalizada y/o geocodificada)
 */
export interface ProcessedInfrastructure extends ExtractedInfrastructure {
  /** Coordenada X final (normalizada o geocodificada) */
  xFinal?: number;
  
  /** Coordenada Y final (normalizada o geocodificada) */
  yFinal?: number;
  
  /** Resultado de normalización (si tenía coords originales) */
  normalization?: NormalizationResult;
  
  /** Resultado de geocodificación (si fue geocodificada) */
  geocoding?: OrchestrationResult;
  
  /** Score final 0-100 */
  score: number;
  
  /** Fuente de las coordenadas finales */
  source: string;
  
  /** Confianza en el resultado */
  confidence: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'NULA';
}

/**
 * Metadatos del documento procesado
 */
export interface DocumentMetadata {
  /** Nombre del archivo */
  fileName: string;
  
  /** Tipo de archivo (odt, xlsx, csv, etc) */
  fileType: string;
  
  /** Municipio detectado del documento */
  municipality?: string;
  
  /** Provincia detectada */
  province?: string;
  
  /** Número de tablas procesadas */
  tablesProcessed: number;
  
  /** Fecha de procesamiento */
  processedAt: Date;
}

/**
 * Estadísticas de extracción
 */
export interface ExtractionStats {
  /** Total de infraestructuras encontradas */
  total: number;
  
  /** Con coordenadas originales */
  withCoordinates: number;
  
  /** Sin coordenadas (pendientes de geocodificación) */
  withoutCoordinates: number;
  
  /** Por tipología */
  byTypology: Record<string, number>;
  
  /** Por tabla de origen */
  byTable: Record<string, number>;
}

/**
 * Estadísticas de geocodificación
 */
export interface GeocodingBatchStats {
  /** Total intentadas */
  total: number;
  
  /** Exitosas */
  successful: number;
  
  /** Fallidas */
  failed: number;
  
  /** Pendientes */
  pending: number;
  
  /** Por fuente de geocodificación */
  bySource: Record<string, number>;
  
  /** Tiempo total en ms */
  totalTime: number;
}

/**
 * Resultado completo del procesamiento de un documento
 */
export interface ProcessingResult {
  /** Metadatos del documento */
  metadata: DocumentMetadata;
  
  /** Todas las infraestructuras procesadas */
  infrastructures: ProcessedInfrastructure[];
  
  /** Estadísticas de extracción */
  extractionStats: ExtractionStats;
  
  /** Estadísticas de geocodificación (si se ejecutó) */
  geocodingStats?: GeocodingBatchStats;
  
  /** Headers originales del documento */
  originalHeaders: string[];
}
