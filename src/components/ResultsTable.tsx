/**
 * ResultsTable - Tabla de resultados con filas expandibles y cascada de geolocalización
 * 
 * Características:
 * - Altura fija de filas (56px) con overflow hidden
 * - Filas expandibles al hacer clic
 * - Detalle de cascada de geolocalización
 * - Score con punto de color alineado
 * - Iconos de estado coherentes
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretDown, CaretUp, Table as TableIcon } from '@phosphor-icons/react'
import ScoreIndicator, { getScoreColor } from './ScoreIndicator'
import StatusIcon, { getStatusFromResult, CoordStatus } from './StatusIcon'
import CascadeDetail, { CascadeStep, generateMockCascadeSteps } from './CascadeDetail'
import { cn } from '../lib/utils'
import { NormalizationResult } from '../lib/coordinateNormalizer'

interface ResultRow {
  index: number
  result: NormalizationResult
  tableName?: string
  name?: string
  typology?: string
  address?: string
}

interface ResultsTableProps {
  rows: ResultRow[]
  maxVisible?: number
  className?: string
}

export default function ResultsTable({ 
  rows, 
  maxVisible = 10,
  className 
}: ResultsTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const visibleRows = rows.slice(0, maxVisible)
  const hasMore = rows.length > maxVisible
  
  const toggleRow = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index)
  }
  
  return (
    <div className={cn('border border-border rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="p-3 bg-muted/30 border-b border-border flex items-center gap-2">
        <TableIcon size={18} className="text-muted-foreground" />
        <span className="text-sm font-medium">Vista previa de coordenadas normalizadas</span>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">#</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">X Original</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Y Original</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">X Normalizado</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Y Normalizado</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">Score</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-16">Estado</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => {
              const isExpanded = expandedRow === row.index
              const status = getStatusFromResult({
                isValid: row.result.isValid,
                x: row.result.x,
                y: row.result.y
              })
              
              return (
                <TableRow
                  key={row.index}
                  row={row}
                  status={status}
                  isExpanded={isExpanded}
                  onToggle={() => toggleRow(row.index)}
                />
              )
            })}
          </tbody>
        </table>
      </div>
      
      {/* Footer */}
      {hasMore && (
        <div className="p-3 bg-muted/20 border-t border-border text-center text-xs text-muted-foreground">
          Mostrando {maxVisible} de {rows.length} filas
        </div>
      )}
    </div>
  )
}

// Componente de fila individual
interface TableRowProps {
  row: ResultRow
  status: CoordStatus
  isExpanded: boolean
  onToggle: () => void
}

function TableRow({ row, status, isExpanded, onToggle }: TableRowProps) {
  const { result, index, name } = row
  const cascadeSteps = generateMockCascadeSteps(result.score)
  
  return (
    <>
      {/* Fila principal */}
      <tr 
        className={cn(
          'border-t border-border row-expandable',
          isExpanded && 'bg-purple-500/5'
        )}
        onClick={onToggle}
      >
        {/* # */}
        <td className="fixed-height-cell px-3">
          <div className="cell-content">
            <span className="text-muted-foreground">{index + 1}</span>
          </div>
        </td>
        
        {/* Nombre */}
        <td className="fixed-height-cell px-3">
          <div className="cell-content">
            <span className="truncate max-w-[200px]" title={name || '-'}>
              {name?.substring(0, 30) || '-'}
              {name && name.length > 30 && '...'}
            </span>
          </div>
        </td>
        
        {/* X Original */}
        <td className="fixed-height-cell px-3">
          <div className="cell-content">
            <span className="font-mono text-xs text-gray-400">
              {String(result.original.x || '-').substring(0, 12)}
            </span>
          </div>
        </td>
        
        {/* Y Original */}
        <td className="fixed-height-cell px-3">
          <div className="cell-content">
            <span className="font-mono text-xs text-gray-400">
              {String(result.original.y || '-').substring(0, 12)}
            </span>
          </div>
        </td>
        
        {/* X Normalizado */}
        <td className="fixed-height-cell px-3">
          <div className="cell-content">
            <span className="font-mono text-xs text-primary">
              {result.x?.toFixed(2) || '-'}
            </span>
          </div>
        </td>
        
        {/* Y Normalizado */}
        <td className="fixed-height-cell px-3">
          <div className="cell-content">
            <span className="font-mono text-xs text-primary">
              {result.y?.toFixed(2) || '-'}
            </span>
          </div>
        </td>
        
        {/* Score */}
        <td className="fixed-height-cell px-3">
          <ScoreIndicator score={result.score} size="sm" />
        </td>
        
        {/* Estado */}
        <td className="fixed-height-cell px-3">
          <div className="cell-content justify-center">
            <StatusIcon status={status} size={18} />
          </div>
        </td>
        
        {/* Expandir */}
        <td className="fixed-height-cell px-3">
          <div className="cell-content justify-center">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <CaretDown 
                size={16} 
                className={cn(
                  'text-gray-500 transition-colors',
                  isExpanded && 'text-purple-400'
                )}
              />
            </motion.div>
          </div>
        </td>
      </tr>
      
      {/* Fila expandida con detalle de cascada */}
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={9} className="p-0">
              <CascadeDetail
                steps={cascadeSteps}
                finalScore={result.score}
                onOpenMap={() => console.log('Abrir mapa para:', row)}
                onManualLocate={() => console.log('Localizar manualmente:', row)}
              />
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

// Helper para crear filas desde datos procesados
export function createResultRows(
  results: NormalizationResult[],
  rawRows: any[],
  headers: string[]
): ResultRow[] {
  // Detectar columna de nombre
  const nameCol = headers.find(h => 
    /nombre|denominacion|descripcion|titulo|infraestructura/i.test(h)
  ) || headers[0]
  
  // Detectar columna de tabla
  const tableCol = headers.find(h => /tabla/i.test(h))
  
  return results.map((result, index) => ({
    index,
    result,
    name: rawRows[index]?.[nameCol] || rawRows[index]?.['Nombre'] || '-',
    tableName: tableCol ? rawRows[index]?.[tableCol] : undefined
  }))
}
