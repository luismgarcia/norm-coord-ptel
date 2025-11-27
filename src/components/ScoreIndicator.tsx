/**
 * ScoreIndicator - Indicador visual de score con punto de color y número alineado
 * 
 * Sistema de colores progresivos:
 * - 95-100: Verde (#22c55e) - Confirmado
 * - 80-94: Lima (#84cc16) - Alta confianza  
 * - 60-79: Amarillo (#eab308) - Media
 * - 45-59: Naranja (#f97316) - Baja
 * - <45: Rojo (#ef4444) - Muy baja
 */

import { cn } from '../lib/utils'

interface ScoreIndicatorProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showNumber?: boolean
  className?: string
}

export function getScoreColorClass(score: number): string {
  if (score >= 95) return 'score-95-100'
  if (score >= 80) return 'score-80-94'
  if (score >= 60) return 'score-60-79'
  if (score >= 45) return 'score-45-59'
  return 'score-below-45'
}

export function getScoreColor(score: number): string {
  if (score >= 95) return '#22c55e'
  if (score >= 80) return '#84cc16'
  if (score >= 60) return '#eab308'
  if (score >= 45) return '#f97316'
  return '#ef4444'
}

export function getScoreLabel(score: number): string {
  if (score >= 95) return 'Confirmado'
  if (score >= 80) return 'Alta'
  if (score >= 60) return 'Media'
  if (score >= 45) return 'Baja'
  return 'Muy baja'
}

const sizeClasses = {
  sm: {
    dot: 'w-2 h-2',
    number: 'text-xs',
    container: 'gap-1.5'
  },
  md: {
    dot: 'w-3 h-3',
    number: 'text-sm',
    container: 'gap-2'
  },
  lg: {
    dot: 'w-4 h-4',
    number: 'text-base',
    container: 'gap-2.5'
  }
}

export default function ScoreIndicator({ 
  score, 
  size = 'md', 
  showNumber = true,
  className 
}: ScoreIndicatorProps) {
  const color = getScoreColor(score)
  const sizes = sizeClasses[size]
  
  return (
    <div className={cn('score-cell-content', sizes.container, className)}>
      <span title={`${getScoreLabel(score)} confianza`}>
        <div 
          className={cn('score-dot rounded-full flex-shrink-0', sizes.dot)}
          style={{ backgroundColor: color }}
        />
      </span>
      {showNumber && (
        <span 
          className={cn('score-number font-mono font-bold', sizes.number)}
          style={{ color }}
        >
          {score}
        </span>
      )}
    </div>
  )
}

// Versión compacta solo con el punto
export function ScoreDot({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const color = getScoreColor(score)
  const sizes = sizeClasses[size]
  
  return (
    <span title={`Score: ${score} (${getScoreLabel(score)})`}>
      <div 
        className={cn('score-dot rounded-full flex-shrink-0', sizes.dot)}
        style={{ backgroundColor: color }}
      />
    </span>
  )
}
