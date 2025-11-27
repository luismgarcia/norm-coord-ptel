/**
 * Step2 - Análisis y visualización de resultados
 * 
 * Incluye:
 * - Dashboard de métricas con tipologías
 * - Barra de progreso
 * - Totalizadores (Origen, Detectados, Pendientes)
 * - Tabla de resultados con cascada expandible
 */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  MagnifyingGlass, 
  ArrowLeft,
  ArrowRight,
  Table as TableIcon,
  ChartBar,
  MapPin
} from '@phosphor-icons/react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ProcessedData } from './Step1'
import ResultsTable, { createResultRows } from './ResultsTable'
import { TypologyGrid, detectTypology, TypologyCode } from './TypologyBadge'
import ScoreIndicator from './ScoreIndicator'

interface Step2Props {
  data: ProcessedData | null
  onComplete: (data: ProcessedData) => void
  onBack: () => void
}

export default function Step2({ data, onComplete, onBack }: Step2Props) {
  const [selectedTypology, setSelectedTypology] = useState<TypologyCode | null>(null)
  
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
  
  // Detectar tipologías desde los datos
  const typologyData = useMemo(() => {
    const counts: Partial<Record<TypologyCode, number>> = {}
    
    rows.forEach((row) => {
      // Intentar detectar desde varios campos
      const searchText = [
        row['Tabla'] || '',
        row['Tipo'] || '',
        row['Nombre'] || '',
        row['Tipología'] || ''
      ].join(' ')
      
      const typ = detectTypology(searchText)
      counts[typ] = (counts[typ] || 0) + 1
    })
    
    return counts
  }, [rows])
  
  // Contar tablas únicas
  const uniqueTables = useMemo(() => {
    const tables = new Set(rows.map(r => r['Tabla']).filter(Boolean))
    return tables.size
  }, [rows])
  
  // Crear filas para la tabla
  const tableRows = useMemo(() => 
    createResultRows(results, rows, headers), 
    [results, rows, headers]
  )

  const handleContinue = () => {
    onComplete(data)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Dashboard Card */}
      <Card className="bg-card border border-border rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MagnifyingGlass size={20} weight="duotone" className="text-primary" />
              </div>
              <div>
                <span className="font-semibold">Análisis completado</span>
                <div className="text-xs text-muted-foreground">{fileName}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ChartBar size={20} className="text-primary" />
              <ScoreIndicator score={Math.round(stats.avgScore)} size="lg" />
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="p-6 space-y-6">
            {/* Mapeo de tablas */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <TableIcon size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Mapeo de tablas</span>
              </div>
              
              {/* Tipologías */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2">Desglose por tipología:</div>
                <TypologyGrid 
                  data={typologyData} 
                  size="lg"
                  onSelect={(code) => setSelectedTypology(
                    selectedTypology === code ? null : code
                  )}
                />
              </div>
              
              {/* Barra de progreso */}
              <div className="mb-4">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${detectedPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
              
              {/* Totalizadores */}
              <div className="flex items-center justify-between text-sm">
                {/* Origen a la izquierda */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Origen:</span>
                  <span className="font-bold text-white">{totalOrigin}</span>
                  {uniqueTables > 0 && (
                    <span className="text-gray-500">({uniqueTables} tablas)</span>
                  )}
                </div>
                
                {/* Detectados y Pendientes a la derecha */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-gray-400">Detectados:</span>
                    <span className="font-bold text-green-400">{detected}</span>
                    <span className="text-gray-500">({detectedPercent}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-gray-400">Pendientes:</span>
                    <span className="font-bold text-orange-400">{pending}</span>
                    <span className="text-gray-500">({pendingPercent}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Distribución de confianza (compacta) */}
            <div className="grid grid-cols-4 gap-3">
              {stats.confidenceDistribution.HIGH > 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <div className="text-lg font-bold text-green-500">{stats.confidenceDistribution.HIGH}</div>
                  <div className="text-xs text-muted-foreground">Alta</div>
                </div>
              )}
              {stats.confidenceDistribution.MEDIUM > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                  <div className="text-lg font-bold text-yellow-500">{stats.confidenceDistribution.MEDIUM}</div>
                  <div className="text-xs text-muted-foreground">Media</div>
                </div>
              )}
              {stats.confidenceDistribution.LOW > 0 && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                  <div className="text-lg font-bold text-orange-500">{stats.confidenceDistribution.LOW}</div>
                  <div className="text-xs text-muted-foreground">Baja</div>
                </div>
              )}
              {stats.confidenceDistribution.CRITICAL > 0 && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                  <div className="text-lg font-bold text-red-500">{stats.confidenceDistribution.CRITICAL}</div>
                  <div className="text-xs text-muted-foreground">Crítica</div>
                </div>
              )}
            </div>

            {/* Tabla de resultados con cascada */}
            <ResultsTable 
              rows={tableRows}
              maxVisible={10}
            />
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-border flex justify-between">
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft size={18} />
              Volver
            </Button>
            <Button
              onClick={handleContinue}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <MapPin size={18} />
              Continuar a descarga
              <ArrowRight size={18} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
