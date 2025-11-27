/**
 * CascadeDetail - Detalle de los pasos de la cascada de geolocalización
 * 
 * Muestra cada paso intentado con:
 * - Número de paso
 * - Nombre del servicio
 * - Estado (éxito/fallo/saltado)
 * - Score acumulado
 * - Detalles del resultado
 */

import { motion } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  ProhibitInset,
  MapTrifold,
  ArrowSquareOut
} from '@phosphor-icons/react'
import { getScoreColor, getScoreColorClass } from './ScoreIndicator'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

export interface CascadeStep {
  level: number
  service: string
  status: 'success' | 'failed' | 'skipped' | 'partial'
  score: number
  scoreIncrement: number
  details?: string
  coordinates?: { x: number; y: number }
  confidence?: number
}

interface CascadeDetailProps {
  steps: CascadeStep[]
  finalScore: number
  onOpenMap?: () => void
  onManualLocate?: () => void
  className?: string
}

const serviceNames: Record<string, string> = {
  'normalization': 'Normalización UTF-8',
  'cartociudad': 'CartoCiudad (IGN)',
  'cdau': 'CDAU (Andalucía)',
  'reverse': 'Geocodificación inversa',
  'specialized': 'Bases especializadas',
  'nominatim': 'Nominatim (OSM)',
  'iaph': 'IAPH (Patrimonio)',
  'sas': 'SAS (Sanitario)',
  'education': 'Educación',
}

const statusIcons = {
  success: { icon: CheckCircle, label: '✓ ÉXITO', weight: 'fill' as const },
  failed: { icon: XCircle, label: '✗ FALLO', weight: 'fill' as const },
  skipped: { icon: ProhibitInset, label: '⊘ SALTADO', weight: 'regular' as const },
  partial: { icon: CheckCircle, label: '⚠ PARCIAL', weight: 'duotone' as const },
}

export default function CascadeDetail({ 
  steps, 
  finalScore,
  onOpenMap,
  onManualLocate,
  className 
}: CascadeDetailProps) {
  const colorClass = getScoreColorClass(finalScore)
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('bg-slate-900/50 p-4 border-t border-purple-500/20', className)}
    >
      {/* Header del panel */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: getScoreColor(finalScore) }} />
          <span className="text-sm font-medium text-gray-300">
            Cascada de geolocalización
          </span>
        </div>
        <div className={cn('text-sm font-bold', colorClass)} style={{ color: getScoreColor(finalScore) }}>
          Score final: {finalScore}
        </div>
      </div>
      
      {/* Pasos de la cascada */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const stepColorClass = getScoreColorClass(step.score)
          const stepColor = getScoreColor(step.score)
          const StatusIcon = statusIcons[step.status].icon
          const isLast = index === steps.length - 1
          
          return (
            <div key={step.level} className="flex gap-3">
              {/* Línea vertical y número */}
              <div className="flex flex-col items-center">
                <div 
                  className={cn('cascade-step-ring', stepColorClass)}
                  style={{ 
                    borderColor: stepColor,
                    color: stepColor 
                  }}
                >
                  {step.level}
                </div>
                {!isLast && (
                  <div 
                    className="cascade-connector"
                    style={{ backgroundColor: stepColor }}
                  />
                )}
              </div>
              
              {/* Tarjeta del paso */}
              <div 
                className={cn(
                  'flex-1 cascade-step-card',
                  stepColorClass,
                  step.status === 'skipped' && 'opacity-50'
                )}
                style={{ borderColor: stepColor }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span 
                    className="text-xs font-medium"
                    style={{ color: stepColor }}
                  >
                    {serviceNames[step.service] || step.service}
                  </span>
                  <span 
                    className={cn('cascade-step-badge', stepColorClass)}
                    style={{ color: stepColor }}
                  >
                    {statusIcons[step.status].label}
                  </span>
                </div>
                
                <div className="text-[11px] text-gray-400 space-y-0.5">
                  {step.details && (
                    <div>{step.details}</div>
                  )}
                  {step.coordinates && (
                    <div className="font-mono">
                      Coords: {step.coordinates.x.toFixed(2)}, {step.coordinates.y.toFixed(2)}
                    </div>
                  )}
                  {step.confidence !== undefined && (
                    <div>Confianza: {step.confidence}%</div>
                  )}
                  <div className="flex items-center gap-2">
                    <span>Score: {step.score}</span>
                    {step.scoreIncrement > 0 && (
                      <span className="text-green-400">(+{step.scoreIncrement})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Acciones */}
      {finalScore < 95 && (
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-700/50">
          {onOpenMap && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onOpenMap}
              className="text-xs gap-1.5"
            >
              <MapTrifold size={14} />
              Ver en mapa
            </Button>
          )}
          {onManualLocate && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onManualLocate}
              className="text-xs gap-1.5 text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
            >
              <ArrowSquareOut size={14} />
              Localizar manualmente
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Generar pasos de ejemplo basados en score
export function generateMockCascadeSteps(finalScore: number): CascadeStep[] {
  if (finalScore >= 95) {
    return [
      { level: 0, service: 'normalization', status: 'success', score: 15, scoreIncrement: 15, details: 'UTF-8 normalizado' },
      { level: 1, service: 'cartociudad', status: 'success', score: 85, scoreIncrement: 70, details: 'state=1 (exacto)', coordinates: { x: 549428.52, y: 4133815.29 } },
      { level: 2, service: 'cdau', status: 'success', score: 92, scoreIncrement: 7, details: 'Confirmado por CDAU' },
      { level: 3, service: 'reverse', status: 'success', score: finalScore, scoreIncrement: finalScore - 92, details: 'Validación espacial OK', confidence: 98 },
    ]
  }
  
  if (finalScore >= 60) {
    return [
      { level: 0, service: 'normalization', status: 'success', score: 15, scoreIncrement: 15, details: 'UTF-8 normalizado' },
      { level: 1, service: 'cartociudad', status: 'partial', score: 45, scoreIncrement: 30, details: 'state=3 (aproximado)' },
      { level: 2, service: 'cdau', status: 'failed', score: 45, scoreIncrement: 0, details: 'Vía no encontrada' },
      { level: 3, service: 'reverse', status: 'skipped', score: 45, scoreIncrement: 0, details: 'Sin coords previas' },
      { level: 4, service: 'nominatim', status: 'partial', score: finalScore, scoreIncrement: finalScore - 45, details: 'Match parcial 72%', confidence: 72 },
    ]
  }
  
  // Score bajo
  return [
    { level: 0, service: 'normalization', status: 'success', score: 15, scoreIncrement: 15, details: 'UTF-8 normalizado' },
    { level: 1, service: 'cartociudad', status: 'failed', score: 15, scoreIncrement: 0, details: 'Sin resultados' },
    { level: 2, service: 'cdau', status: 'failed', score: 15, scoreIncrement: 0, details: 'Vía no existe' },
    { level: 3, service: 'reverse', status: 'skipped', score: 15, scoreIncrement: 0, details: 'Sin coords previas' },
    { level: 4, service: 'specialized', status: 'partial', score: finalScore, scoreIncrement: finalScore - 15, details: 'Match parcial 58%', confidence: 58 },
    { level: 5, service: 'nominatim', status: 'failed', score: finalScore, scoreIncrement: 0, details: 'Sin resultados' },
  ]
}
