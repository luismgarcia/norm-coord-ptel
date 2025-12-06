/**
 * useTextDeconcatenation.ts
 * 
 * Hook de React para integrar la desconcatenación de texto
 * en el flujo de procesamiento de documentos PTEL
 * 
 * @date 2025-11-28
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  deconcatenateText, 
  validateCoordinateY, 
  splitConcatenatedCoordinates,
  type DeconcatenationResult 
} from '../lib/textDeconcatenator';

// ============================================================================
// TIPOS
// ============================================================================

interface ProcessingStats {
  totalRecords: number;
  modifiedNames: number;
  modifiedTypes: number;
  truncatedY: number;
  concatenatedCoords: number;
  outliers: number;
}

interface PTELRecord {
  nombre: string;
  tipo: string;
  direccion?: string;
  x?: string | number;
  y?: string | number;
  [key: string]: unknown;
}

interface ProcessedRecord extends PTELRecord {
  _deconcatenation: {
    nombreOriginal: string;
    tipoOriginal: string;
    nombreModificado: boolean;
    tipoModificado: boolean;
    warnings: string[];
  };
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useTextDeconcatenation() {
  const [stats, setStats] = useState<ProcessingStats>({
    totalRecords: 0,
    modifiedNames: 0,
    modifiedTypes: 0,
    truncatedY: 0,
    concatenatedCoords: 0,
    outliers: 0,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);

  /**
   * Procesa un registro individual
   */
  const processRecord = useCallback((record: PTELRecord): ProcessedRecord => {
    const warnings: string[] = [];

    // Desconcatenar nombre
    const nombreResult = deconcatenateText(record.nombre || '');
    if (nombreResult.wasModified) {
      warnings.push(`Nombre corregido: "${record.nombre}" → "${nombreResult.corrected}"`);
    }

    // Desconcatenar tipo
    const tipoResult = deconcatenateText(record.tipo || '');
    if (tipoResult.wasModified) {
      warnings.push(`Tipo corregido: "${record.tipo}" → "${tipoResult.corrected}"`);
    }

    // Detectar tipo con información de personal (error de parser)
    const personalPatterns = [
      /\d+\s*(SARGENTO|CABO|OFICIAL|AGENTE|OPERARIO|FUNCIONARIO|PERSONA)/i,
      /(LABORABLES|HORARIO|LUNES|VIERNES)/i,
    ];
    for (const pattern of personalPatterns) {
      if (pattern.test(tipoResult.corrected)) {
        warnings.push('⚠️ TIPO contiene información de PERSONAL/HORARIO - posible error de parser');
      }
    }

    return {
      ...record,
      nombre: nombreResult.corrected,
      tipo: tipoResult.corrected,
      _deconcatenation: {
        nombreOriginal: record.nombre,
        tipoOriginal: record.tipo,
        nombreModificado: nombreResult.wasModified,
        tipoModificado: tipoResult.wasModified,
        warnings,
      },
    };
  }, []);

  /**
   * Procesa un lote de registros
   */
  const processBatch = useCallback((records: PTELRecord[]): ProcessedRecord[] => {
    setIsProcessing(true);

    const newStats: ProcessingStats = {
      totalRecords: records.length,
      modifiedNames: 0,
      modifiedTypes: 0,
      truncatedY: 0,
      concatenatedCoords: 0,
      outliers: 0,
    };

    const processed = records.map((record) => {
      const result = processRecord(record);

      if (result._deconcatenation.nombreModificado) {
        newStats.modifiedNames++;
      }
      if (result._deconcatenation.tipoModificado) {
        newStats.modifiedTypes++;
      }

      // Verificar coordenadas
      if (record.y) {
        const yNum = typeof record.y === 'number' ? record.y : parseFloat(String(record.y));
        if (!isNaN(yNum)) {
          const truncCheck = validateCoordinateY(yNum);
          if (truncCheck.wasCorrected) {
            newStats.truncatedY++;
          }
        }
      }

      if (record.x) {
        const xStr = String(record.x);
        const concatCheck = splitConcatenatedCoordinates(xStr);
        if (concatCheck.wasConcatenated) {
          newStats.concatenatedCoords++;
        }
      }

      return result;
    });

    setStats(newStats);
    setIsProcessing(false);
    setLastProcessedAt(new Date());

    return processed;
  }, [processRecord]);

  /**
   * Resumen de estadísticas formateado
   */
  const statsSummary = useMemo(() => {
    if (stats.totalRecords === 0) return null;

    const modifiedTotal = stats.modifiedNames + stats.modifiedTypes;
    const modifiedPct = ((modifiedTotal / stats.totalRecords) * 100).toFixed(1);

    return {
      total: stats.totalRecords,
      modified: modifiedTotal,
      modifiedPct,
      details: {
        nombres: stats.modifiedNames,
        tipos: stats.modifiedTypes,
        coordYTruncadas: stats.truncatedY,
        coordConcatenadas: stats.concatenatedCoords,
      },
    };
  }, [stats]);

  return {
    processRecord,
    processBatch,
    stats,
    statsSummary,
    isProcessing,
    lastProcessedAt,
    // Re-exportar funciones para uso directo
    deconcatenateText,
    validateCoordinateY,
    splitConcatenatedCoordinates,
  };
}

export default useTextDeconcatenation;