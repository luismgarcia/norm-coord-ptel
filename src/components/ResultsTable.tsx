/**
 * ResultsTable - Tabla de resultados con filas expandibles y cascada de geolocalización
 * 
 * Características:
 * - Altura fija de filas con overflow hidden
 * - Línea izquierda coloreada para scores < 100
 * - Filas expandibles al hacer clic
 * - Detalle de cascada de geolocalización
 * - Score con punto de color alineado
 * - Iconos de estado coherentes
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretDown, Table as TableIcon } from '@phosphor-icons/react'
import ScoreIndicator, { getScoreColor } from './ScoreIndicator'
import StatusIcon, { getStatusFromResult, CoordStatus } from './StatusIcon'
import CascadeDetail, { generateMockCascadeSteps } from './CascadeDetail'
import { cn } from '../lib/utils'
import { NormalizationResult } from '../lib/coordinateNormalizer'

export interface ResultRow {
  index: number
  result: NormalizationResult
  tableName?: string
  name?: string
  typology?: string
  address?: string
}

interface ResultsTableProps {
  rows: ResultRow[]
  showScoreBorder?: boolean
  className?: string
}

export default function ResultsTable({ 
  rows, 
  showScoreBorder = true,
  className 
}: ResultsTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  
  const toggleRow = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index)
  }
  
  return (
    <div className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700/50 flex items-center gap-2">
        <TableIcon size={16} className="text-gray-500" />
        <span className="text-xs font-medium text-gray-400">Vista previa de coordenadas normalizadas</span>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-800/30">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-gray-500 w-8">#</th>
              <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[200px]">Nombre</th>
              <th className="px-2 py-2 text-right font-medium text-gray-500 w-24">X Original</th>
              <th className="px-2 py-2 text-right font-medium text-gray-500 w-24">Y Original</th>
              <th className="px-2 py-2 text-right font-medium text-gray-500 w-24">X Norm.</th>
              <th className="px-2 py-2 text-right font-medium text-gray-500 w-24">Y Norm.</th>
              <th className="px-2 py-2 text-right font-medium text-gray-500 w-16">Score</th>
              <th className="px-2 py-2 text-center font-medium text-gray-500 w-12">Est.</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
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
                  showScoreBorder={showScoreBorder}
                  onToggle={() => toggleRow(row.index)}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Componente de fila individual
interface TableRowProps {
  row: ResultRow
  status: CoordStatus
  isExpanded: boolean
  showScoreBorder: boolean
  onToggle: () => void
}

function TableRow({ row, status, isExpanded, showScoreBorder, onToggle }: TableRowProps) {
  const { result, index, name } = row
  const cascadeSteps = generateMockCascadeSteps(result.score)
  const scoreColor = getScoreColor(result.score)
  const needsScoreBorder = showScoreBorder && result.score < 100
  
  return (
    <>
      {/* Fila principal */}
      <tr 
        className={cn(
          'border-t border-slate-700/30 cursor-pointer transition-colors',
          'hover:bg-slate-800/50',
          isExpanded && 'bg-purple-500/5'
        )}
        onClick={onToggle}
        style={{
          // Línea izquierda coloreada para scores < 100
          borderLeft: needsScoreBorder ? `3px solid ${scoreColor}` : '3px solid transparent'
        }}
      >
        {/* # */}
        <td className="px-2 py-2 align-middle">
          <span className="text-gray-500 text-xs">{index + 1}</span>
        </td>
        
        {/* Nombre - más ancho, fuente ajustada */}
        <td className="px-2 py-2 align-middle max-w-[250px]">
          <span 
            className="block truncate text-xs text-gray-200" 
            title={name || '-'}
          >
            {name || '-'}
          </span>
        </td>
        
        {/* X Original */}
        <td className="px-2 py-2 align-middle text-right">
          <span className="font-mono text-[11px] text-gray-500">
            {formatCoord(result.original.x)}
          </span>
        </td>
        
        {/* Y Original */}
        <td className="px-2 py-2 align-middle text-right">
          <span className="font-mono text-[11px] text-gray-500">
            {formatCoord(result.original.y)}
          </span>
        </td>
        
        {/* X Normalizado */}
        <td className="px-2 py-2 align-middle text-right">
          <span className="font-mono text-[11px] text-cyan-400">
            {result.x?.toFixed(2) || '-'}
          </span>
        </td>
        
        {/* Y Normalizado */}
        <td className="px-2 py-2 align-middle text-right">
          <span className="font-mono text-[11px] text-cyan-400">
            {result.y?.toFixed(2) || '-'}
          </span>
        </td>
        
        {/* Score */}
        <td className="px-2 py-2 align-middle">
          <div className="flex justify-end">
            <ScoreIndicator score={result.score} size="sm" />
          </div>
        </td>
        
        {/* Estado */}
        <td className="px-2 py-2 align-middle text-center">
          <StatusIcon status={status} size={16} />
        </td>
        
        {/* Expandir */}
        <td className="px-2 py-2 align-middle">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center"
          >
            <CaretDown 
              size={14} 
              className={cn(
                'text-gray-600 transition-colors',
                isExpanded && 'text-purple-400'
              )}
            />
          </motion.div>
        </td>
      </tr>
      
      {/* Fila expandida con detalle de cascada */}
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={9} className="p-0 border-t border-slate-700/30">
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

// Helper para formatear coordenadas
function formatCoord(value: any): string {
  if (value === null || value === undefined || value === '') return '-'
  const str = String(value)
  return str.length > 12 ? str.substring(0, 12) + '…' : str
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
