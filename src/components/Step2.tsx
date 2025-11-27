/**
 * Step2 - Normalización y Geocodificación
 * 
 * Procesa las infraestructuras extraídas:
 * 1. Normaliza coordenadas existentes a UTM30 ETRS89
 * 2. Geocodifica las que no tienen coordenadas
 * 3. Muestra progreso y resultados en tiempo real
 * 
 * v2: Integra GeocodingOrchestrator para geocodificación automática
 */

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  MagnifyingGlass, 
  ArrowLeft,
  ArrowRight,
  CaretLeft,
  CaretRight,
  MapPin,
  FunnelSimple,
  CheckCircle,
  XCircle,
  Clock,
  Lightning,
  Pause,
  Play,
  Warning
} from '@phosphor-icons/react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ExtractionResult } from './Step1'
import { useGeocoding } from '../hooks/useGeocoding'
import { ProcessedInfrastructure } from '../types/processing'
import { normalizeCoordinate, NormalizationResult } from '../lib/coordinateNormalizer'
import { TypologyBadge, detectTypology, TypologyCode, TYPOLOGY_CONFIG } from './TypologyBadge'
import ScoreIndicator from './ScoreIndicator'

interface Step2Props {
  data: ExtractionResult | null
  onComplete: (data: ProcessingComplete) => void
  onBack: () => void
}

/**
 * Datos procesados para Step3
 */
export interface ProcessingComplete {
  /** Infraestructuras procesadas */
  infrastructures: ProcessedInfrastructure[]
  
  /** Metadatos del documento */
  metadata: ExtractionResult['metadata']
  
  /** Estadísticas finales */
  stats: {
    total: number
    normalized: number
    geocoded: number
    failed: number
    avgScore: number
  }
}

// Paginación
const PAGE_SIZE_OPTIONS = [10, 25, 50, 'all'] as const
type PageSize = typeof PAGE_SIZE_OPTIONS[number]

export default function Step2({ data, onComplete, onBack }: Step2Props) {
  // Estados
  const [processedData, setProcessedData] = useState<ProcessedInfrastructure[]>([])
  const [isNormalizing, setIsNormalizing] = useState(false)
  const [normalizationDone, setNormalizationDone] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(10)
  
  // Hook de geocodificación
  const geocoding = useGeocoding()
  
  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay datos para procesar. Vuelve al paso anterior.
      </div>
    )
  }

  const { infrastructures, stats: extractionStats, metadata } = data

  // Paso 1: Normalizar coordenadas existentes al montar
  useEffect(() => {
    if (!normalizationDone && infrastructures.length > 0) {
      normalizeExistingCoordinates()
    }
  }, [infrastructures, normalizationDone])

  /**
   * Normaliza las coordenadas de infraestructuras que ya las tienen
   */
  const normalizeExistingCoordinates = async () => {
    setIsNormalizing(true)
    
    const processed: ProcessedInfrastructure[] = infrastructures.map(inf => {
      if (inf.hasCoordinates) {
        // Normalizar coordenadas existentes
        const normResult = normalizeCoordinate({
          x: inf.xOriginal,
          y: inf.yOriginal
        })
        
        return {
          ...inf,
          xFinal: normResult.normalized?.x,
          yFinal: normResult.normalized?.y,
          normalization: normResult,
          score: normResult.score,
          source: 'original',
          confidence: getConfidenceLevel(normResult.score)
        }
      } else {
        // Sin coordenadas - pendiente de geocodificación
        return {
          ...inf,
          score: 0,
          source: 'pending',
          confidence: 'NULA' as const
        }
      }
    })
    
    setProcessedData(processed)
    setIsNormalizing(false)
    setNormalizationDone(true)
  }

  /**
   * Inicia la geocodificación de infraestructuras sin coordenadas
   */
  const startGeocoding = async () => {
    if (!metadata.municipality) {
      alert('No se detectó el municipio. Por favor, vuelve al paso anterior.')
      return
    }
    
    const result = await geocoding.startGeocoding(
      infrastructures,
      metadata.municipality,
      metadata.province || 'Granada'
    )
    
    // Actualizar datos procesados con resultados de geocodificación
    setProcessedData(result)
  }

  /**
   * Determina nivel de confianza basado en score
   */
  const getConfidenceLevel = (score: number): ProcessedInfrastructure['confidence'] => {
    if (score >= 90) return 'ALTA'
    if (score >= 70) return 'MEDIA'
    if (score >= 50) return 'BAJA'
    if (score > 0) return 'CRITICA'
    return 'NULA'
  }

  // Calcular estadísticas
  const currentStats = useMemo(() => {
    const withCoords = processedData.filter(p => p.xFinal && p.yFinal)
    const fromOriginal = processedData.filter(p => p.source === 'original' && p.xFinal)
    const fromGeocoding = processedData.filter(p => 
      p.source && !['original', 'pending', 'none', 'error'].includes(p.source) && p.xFinal
    )
    const failed = processedData.filter(p => 
      !p.hasCoordinates && !p.xFinal && p.status !== 'pending'
    )
    const pending = processedData.filter(p => 
      !p.hasCoordinates && p.status === 'pending'
    )
    
    const avgScore = withCoords.length > 0
      ? Math.round(withCoords.reduce((sum, p) => sum + p.score, 0) / withCoords.length)
      : 0
    
    return {
      total: processedData.length,
      withCoords: withCoords.length,
      fromOriginal: fromOriginal.length,
      fromGeocoding: fromGeocoding.length,
      failed: failed.length,
      pending: pending.length,
      avgScore
    }
  }, [processedData])

  // Detectar tipologías
  const typologyData = useMemo(() => {
    const counts: Record<string, number> = {}
    processedData.forEach(inf => {
      const tipo = inf.tipo || 'OTRO'
      counts[tipo] = (counts[tipo] || 0) + 1
    })
    return counts
  }, [processedData])

  // Filtrar y paginar
  const filteredData = useMemo(() => {
    if (activeFilters.size === 0) return processedData
    return processedData.filter(inf => activeFilters.has(inf.tipo || 'OTRO'))
  }, [processedData, activeFilters])

  const totalFiltered = filteredData.length
  const actualPageSize = pageSize === 'all' ? totalFiltered : pageSize
  const totalPages = Math.ceil(totalFiltered / actualPageSize)
  const startIdx = (currentPage - 1) * actualPageSize
  const paginatedData = filteredData.slice(startIdx, startIdx + actualPageSize)

  // Handlers
  const handleFilterToggle = (tipo: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(tipo)) next.delete(tipo)
      else next.add(tipo)
      return next
    })
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setActiveFilters(new Set())
    setCurrentPage(1)
  }

  const handleContinue = () => {
    onComplete({
      infrastructures: processedData,
      metadata,
      stats: {
        total: currentStats.total,
        normalized: currentStats.fromOriginal,
        geocoded: currentStats.fromGeocoding,
        failed: currentStats.failed,
        avgScore: currentStats.avgScore
      }
    })
  }

  // Calcular porcentajes para barras
  const coveragePercent = currentStats.total > 0 
    ? Math.round((currentStats.withCoords / currentStats.total) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="bg-card border border-border rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <MagnifyingGlass size={18} weight="duotone" className="text-primary" />
              </div>
              <div>
                <span className="font-semibold text-sm">Procesamiento</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {metadata.municipality} · {metadata.fileName}
                </span>
              </div>
            </div>
            <ScoreIndicator score={currentStats.avgScore} size="md" />
          </div>

          {/* Contenido principal */}
          <div className="p-4 space-y-4">
            {/* Métricas principales */}
            <div className="grid grid-cols-5 gap-2">
              <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                <div className="text-xl font-bold text-white">{currentStats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <div className="text-xl font-bold text-green-400">{currentStats.fromOriginal}</div>
                <div className="text-xs text-green-400/80">Original</div>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-400">{currentStats.fromGeocoding}</div>
                <div className="text-xs text-blue-400/80">Geocodif.</div>
              </div>
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                <div className="text-xl font-bold text-orange-400">{currentStats.pending}</div>
                <div className="text-xs text-orange-400/80">Pendientes</div>
              </div>
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                <div className="text-xl font-bold text-red-400">{currentStats.failed}</div>
                <div className="text-xs text-red-400/80">Fallidos</div>
              </div>
            </div>

            {/* Barra de cobertura */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cobertura total</span>
                <span>{coveragePercent}%</span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${(currentStats.fromOriginal / currentStats.total) * 100}%` }}
                />
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${(currentStats.fromGeocoding / currentStats.total) * 100}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Original
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  Geocodificado
                </span>
              </div>
            </div>

            {/* Panel de geocodificación */}
            {currentStats.pending > 0 && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lightning size={18} className="text-primary" />
                    <span className="font-medium">Geocodificación automática</span>
                  </div>
                  
                  {geocoding.state === 'idle' && (
                    <Button 
                      size="sm" 
                      onClick={startGeocoding}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <MapPin size={16} className="mr-1" />
                      Iniciar ({currentStats.pending} pendientes)
                    </Button>
                  )}
                  
                  {geocoding.state === 'running' && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={geocoding.pause}>
                        <Pause size={16} />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={geocoding.cancel}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                  
                  {geocoding.state === 'paused' && (
                    <Button size="sm" onClick={geocoding.resume}>
                      <Play size={16} className="mr-1" />
                      Reanudar
                    </Button>
                  )}
                  
                  {geocoding.state === 'completed' && (
                    <span className="flex items-center gap-1 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      Completado
                    </span>
                  )}
                </div>

                {/* Progreso de geocodificación */}
                {(geocoding.state === 'running' || geocoding.state === 'paused') && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {geocoding.progress.currentItem 
                          ? `Procesando: ${geocoding.progress.currentItem.substring(0, 40)}...`
                          : 'Iniciando...'
                        }
                      </span>
                      <span>{geocoding.progress.current} / {geocoding.progress.total}</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${geocoding.progress.percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400">
                        ✓ {geocoding.stats.successful} exitosos
                      </span>
                      <span className="text-red-400">
                        ✗ {geocoding.stats.failed} fallidos
                      </span>
                    </div>
                  </div>
                )}

                {/* Resumen de fuentes usadas */}
                {geocoding.state === 'completed' && Object.keys(geocoding.stats.bySource).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <div className="text-xs text-muted-foreground mb-2">Fuentes utilizadas:</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(geocoding.stats.bySource).map(([source, count]) => (
                        <span key={source} className="px-2 py-1 bg-slate-800/50 rounded text-xs">
                          {source.replace('generic:', '').replace('specialized:', '')}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filtros por tipología */}
            <div className="flex items-center gap-2 flex-wrap">
              <FunnelSimple size={14} className="text-gray-500" />
              {Object.entries(typologyData)
                .sort(([, a], [, b]) => b - a)
                .map(([tipo, count]) => (
                  <button
                    key={tipo}
                    onClick={() => handleFilterToggle(tipo)}
                    className={`
                      flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                      transition-all duration-200 border
                      ${activeFilters.has(tipo) 
                        ? 'bg-primary/20 border-primary/50 text-primary' 
                        : 'bg-slate-800/50 border-slate-700/50 opacity-60 hover:opacity-100'
                      }
                    `}
                  >
                    <span>{tipo}</span>
                    <span className="font-bold">{count}</span>
                  </button>
                ))
              }
              {activeFilters.size > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-gray-300 underline ml-1"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Tabla de resultados */}
            <div className="border border-slate-700/50 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Nombre</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">X</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Y</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Fuente</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {paginatedData.map((inf, idx) => (
                      <tr 
                        key={inf.id}
                        className={`
                          hover:bg-slate-800/30
                          ${inf.source === 'original' ? 'bg-green-500/5' : ''}
                          ${inf.source && !['original', 'pending', 'none', 'error'].includes(inf.source) ? 'bg-blue-500/5' : ''}
                          ${inf.status === 'failed' || inf.source === 'error' ? 'bg-red-500/5' : ''}
                        `}
                      >
                        <td className="px-3 py-2">
                          <div className="max-w-[200px] truncate" title={inf.nombre}>
                            {inf.nombre}
                          </div>
                          {inf.direccion && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {inf.direccion}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 bg-slate-800/50 rounded text-xs">
                            {inf.tipo}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {inf.xFinal ? inf.xFinal.toFixed(2) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {inf.yFinal ? inf.yFinal.toFixed(2) : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {inf.source === 'original' && (
                            <span className="text-green-400 text-xs">Original</span>
                          )}
                          {inf.source === 'pending' && (
                            <span className="text-orange-400 text-xs">Pendiente</span>
                          )}
                          {inf.source && !['original', 'pending', 'none', 'error'].includes(inf.source) && (
                            <span className="text-blue-400 text-xs">
                              {inf.source.replace('generic:', '').replace('specialized:', '')}
                            </span>
                          )}
                          {(inf.source === 'none' || inf.source === 'error') && (
                            <span className="text-red-400 text-xs">Fallido</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <ScoreIndicator score={inf.score} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginador */}
              <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  Mostrando {startIdx + 1}-{Math.min(startIdx + actualPageSize, totalFiltered)} de {totalFiltered}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-500">Mostrar:</span>
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <button
                        key={size}
                        onClick={() => { setPageSize(size); setCurrentPage(1) }}
                        className={`px-2 py-0.5 rounded ${
                          pageSize === size ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {size === 'all' ? 'Todas' : size}
                      </button>
                    ))}
                  </div>
                  
                  {pageSize !== 'all' && totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded hover:bg-slate-700 disabled:opacity-30"
                      >
                        <CaretLeft size={16} />
                      </button>
                      <span className="text-xs text-gray-400 px-2">{currentPage} / {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded hover:bg-slate-700 disabled:opacity-30"
                      >
                        <CaretRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="px-4 py-3 border-t border-border flex justify-between">
            <Button variant="outline" onClick={onBack} className="gap-2 text-sm h-9">
              <ArrowLeft size={16} />
              Volver
            </Button>
            <Button
              onClick={handleContinue}
              disabled={currentStats.withCoords === 0}
              className="gap-2 bg-primary hover:bg-primary/90 text-sm h-9"
            >
              Continuar a exportación
              <ArrowRight size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
