/**
 * Step2 - Análisis y visualización de resultados
 * 
 * Incluye:
 * - Dashboard compacto con tipologías como filtros
 * - Barra de progreso
 * - Totalizadores (Origen, Detectados, Pendientes)
 * - Tabla de resultados con paginación y línea de score
 */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  MagnifyingGlass, 
  ArrowLeft,
  ArrowRight,
  CaretLeft,
  CaretRight,
  Table as TableIcon,
  ChartBar,
  MapPin,
  FunnelSimple
} from '@phosphor-icons/react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ProcessedData } from './Step1'
import ResultsTable, { createResultRows, ResultRow } from './ResultsTable'
import { TypologyBadge, detectTypology, TypologyCode, TYPOLOGY_CONFIG } from './TypologyBadge'
import ScoreIndicator from './ScoreIndicator'

interface Step2Props {
  data: ProcessedData | null
  onComplete: (data: ProcessedData) => void
  onBack: () => void
}

// Opciones de paginación
const PAGE_SIZE_OPTIONS = [10, 25, 50, 'all'] as const
type PageSize = typeof PAGE_SIZE_OPTIONS[number]

export default function Step2({ data, onComplete, onBack }: Step2Props) {
  // Estado de filtros por tipología (múltiple selección)
  const [activeFilters, setActiveFilters] = useState<Set<TypologyCode>>(new Set())
  
  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(10)
  
  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay datos para mostrar. Vuelve al paso anterior.
      </div>
    )
  }

  const { stats, results, rows, fileName, headers } = data

  // Calcular métricas
  const totalOrigin = stats.total
  const detected = stats.valid
  const pending = stats.invalid
  const detectedPercent = totalOrigin > 0 ? ((detected / totalOrigin) * 100).toFixed(1) : '0'
  const pendingPercent = totalOrigin > 0 ? ((pending / totalOrigin) * 100).toFixed(1) : '0'
  
  // Detectar tipologías desde los datos con sus índices
  const { typologyData, rowTypologies } = useMemo(() => {
    const counts: Partial<Record<TypologyCode, number>> = {}
    const rowTypes: TypologyCode[] = []
    
    rows.forEach((row) => {
      const searchText = [
        row['Tabla'] || '',
        row['Tipo'] || '',
        row['Nombre'] || '',
        row['Tipología'] || ''
      ].join(' ')
      
      const typ = detectTypology(searchText)
      counts[typ] = (counts[typ] || 0) + 1
      rowTypes.push(typ)
    })
    
    return { typologyData: counts, rowTypologies: rowTypes }
  }, [rows])
  
  // Contar tablas únicas
  const uniqueTables = useMemo(() => {
    const tables = new Set(rows.map(r => r['Tabla']).filter(Boolean))
    return tables.size
  }, [rows])
  
  // Crear filas para la tabla con tipología asociada
  const allTableRows = useMemo(() => {
    const baseRows = createResultRows(results, rows, headers)
    return baseRows.map((row, idx) => ({
      ...row,
      typology: rowTypologies[idx] || 'OTR'
    }))
  }, [results, rows, headers, rowTypologies])
  
  // Filtrar filas por tipología activa
  const filteredRows = useMemo(() => {
    if (activeFilters.size === 0) return allTableRows
    return allTableRows.filter(row => activeFilters.has(row.typology as TypologyCode))
  }, [allTableRows, activeFilters])
  
  // Calcular paginación
  const totalFiltered = filteredRows.length
  const actualPageSize = pageSize === 'all' ? totalFiltered : pageSize
  const totalPages = Math.ceil(totalFiltered / actualPageSize)
  const startIdx = (currentPage - 1) * actualPageSize
  const endIdx = startIdx + actualPageSize
  const paginatedRows = filteredRows.slice(startIdx, endIdx)
  
  // Reset página cuando cambian filtros
  const handleFilterToggle = (code: TypologyCode) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
    setCurrentPage(1)
  }
  
  const clearFilters = () => {
    setActiveFilters(new Set())
    setCurrentPage(1)
  }

  const handleContinue = () => {
    onComplete(data)
  }

  // Ordenar tipologías por cantidad (mayor a menor)
  const sortedTypologies = useMemo(() => {
    return Object.entries(typologyData)
      .sort(([, a], [, b]) => (b || 0) - (a || 0))
      .map(([code]) => code as TypologyCode)
  }, [typologyData])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Dashboard Card */}
      <Card className="bg-card border border-border rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header compacto */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <MagnifyingGlass size={18} weight="duotone" className="text-primary" />
              </div>
              <div>
                <span className="font-semibold text-sm">Análisis completado</span>
                <span className="text-xs text-muted-foreground ml-2">{fileName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChartBar size={18} className="text-primary/60" />
              <ScoreIndicator score={Math.round(stats.avgScore)} size="md" />
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="p-4 space-y-4">
            {/* Filtros de tipología + Totalizadores en una fila */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Filtros tipología */}
              <div className="flex items-center gap-2 flex-wrap">
                <FunnelSimple size={14} className="text-gray-500" />
                {sortedTypologies.map(code => {
                  const count = typologyData[code] || 0
                  const isActive = activeFilters.has(code)
                  const config = TYPOLOGY_CONFIG[code]
                  
                  return (
                    <button
                      key={code}
                      onClick={() => handleFilterToggle(code)}
                      className={`
                        flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                        transition-all duration-200 border
                        ${isActive 
                          ? `bg-opacity-20 border-current` 
                          : 'bg-slate-800/50 border-slate-700/50 opacity-60 hover:opacity-100'
                        }
                      `}
                      style={{
                        color: isActive ? config.color : undefined,
                        backgroundColor: isActive ? `${config.color}15` : undefined,
                        borderColor: isActive ? `${config.color}50` : undefined
                      }}
                    >
                      <span>{code}</span>
                      <span className="font-bold">{count}</span>
                    </button>
                  )
                })}
                {activeFilters.size > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-gray-500 hover:text-gray-300 underline ml-1"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              
              {/* Totalizadores compactos */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">
                  <span className="font-bold text-white">{totalOrigin}</span> total
                </span>
                <span className="text-gray-400">·</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="font-bold text-green-400">{detected}</span>
                  <span className="text-gray-500">({detectedPercent}%)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span className="font-bold text-orange-400">{pending}</span>
                  <span className="text-gray-500">({pendingPercent}%)</span>
                </span>
              </div>
            </div>

            {/* Barra de progreso compacta */}
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${detectedPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            {/* Distribución de confianza inline */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Confianza:</span>
              {stats.confidenceDistribution.HIGH > 0 && (
                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded">
                  Alta: {stats.confidenceDistribution.HIGH}
                </span>
              )}
              {stats.confidenceDistribution.MEDIUM > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded">
                  Media: {stats.confidenceDistribution.MEDIUM}
                </span>
              )}
              {stats.confidenceDistribution.LOW > 0 && (
                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded">
                  Baja: {stats.confidenceDistribution.LOW}
                </span>
              )}
              {stats.confidenceDistribution.CRITICAL > 0 && (
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded">
                  Crítica: {stats.confidenceDistribution.CRITICAL}
                </span>
              )}
            </div>

            {/* Tabla de resultados */}
            <div className="border border-slate-700/50 rounded-lg overflow-hidden">
              <ResultsTable 
                rows={paginatedRows}
                showScoreBorder={true}
              />
              
              {/* Paginador */}
              <div className="px-4 py-3 bg-slate-800/30 border-t border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>Mostrando {startIdx + 1}-{Math.min(endIdx, totalFiltered)} de {totalFiltered}</span>
                  {activeFilters.size > 0 && (
                    <span className="text-primary">
                      (filtrado de {allTableRows.length})
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Selector de tamaño */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-gray-500">Mostrar:</span>
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <button
                        key={size}
                        onClick={() => {
                          setPageSize(size)
                          setCurrentPage(1)
                        }}
                        className={`px-2 py-0.5 rounded ${
                          pageSize === size 
                            ? 'bg-primary/20 text-primary' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {size === 'all' ? 'Todas' : size}
                      </button>
                    ))}
                  </div>
                  
                  {/* Navegación de páginas */}
                  {pageSize !== 'all' && totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <CaretLeft size={16} />
                      </button>
                      <span className="text-xs text-gray-400 px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <CaretRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 py-3 border-t border-border flex justify-between">
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2 text-sm h-9"
            >
              <ArrowLeft size={16} />
              Volver
            </Button>
            <Button
              onClick={handleContinue}
              className="gap-2 bg-primary hover:bg-primary/90 text-sm h-9"
            >
              Continuar a descarga
              <ArrowRight size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
