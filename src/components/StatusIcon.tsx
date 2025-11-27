/**
 * StatusIcon - Iconos de estado para coordenadas
 * 
 * Estados:
 * - valid: ✓ Verde - Coordenadas originales válidas
 * - corrected: ⚠ Amarillo - Formato corregido
 * - geolocated: ⚙ Púrpura - Geolocalizado por cascada
 * - empty: ○ Gris - Sin coordenadas
 * - error: ✗ Rojo - Error de procesamiento
 */

import { 
  CheckCircle, 
  Warning, 
  Gear, 
  Circle, 
  XCircle 
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'

export type CoordStatus = 'valid' | 'corrected' | 'geolocated' | 'empty' | 'error'

interface StatusIconProps {
  status: CoordStatus
  size?: number
  className?: string
  showLabel?: boolean
}

const statusConfig: Record<CoordStatus, {
  icon: typeof CheckCircle
  color: string
  bgColor: string
  label: string
  weight: 'fill' | 'duotone' | 'regular'
}> = {
  valid: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Válido',
    weight: 'fill'
  },
  corrected: {
    icon: Warning,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    label: 'Corregido',
    weight: 'fill'
  },
  geolocated: {
    icon: Gear,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    label: 'Geolocalizado',
    weight: 'duotone'
  },
  empty: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    label: 'Sin coordenadas',
    weight: 'regular'
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Error',
    weight: 'fill'
  }
}

export default function StatusIcon({ 
  status, 
  size = 18, 
  className,
  showLabel = false 
}: StatusIconProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  
  if (showLabel) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Icon size={size} weight={config.weight} className={config.color} />
        <span className={cn('text-xs font-medium', config.color)}>
          {config.label}
        </span>
      </div>
    )
  }
  
  return (
    <span title={config.label}>
      <Icon 
        size={size} 
        weight={config.weight} 
        className={cn(config.color, className)}
      />
    </span>
  )
}

// Badge con icono y fondo
export function StatusBadge({ 
  status, 
  size = 16 
}: { 
  status: CoordStatus
  size?: number 
}) {
  const config = statusConfig[status]
  const Icon = config.icon
  
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
      config.bgColor
    )}>
      <Icon size={size} weight={config.weight} className={config.color} />
      <span className={cn('text-xs font-medium', config.color)}>
        {config.label}
      </span>
    </div>
  )
}

// Determinar estado desde resultado de normalización
export function getStatusFromResult(result: {
  isValid: boolean
  wasGeocoded?: boolean
  wasCorrected?: boolean
  x?: number | null
  y?: number | null
}): CoordStatus {
  if (!result.x && !result.y) return 'empty'
  if (!result.isValid) return 'error'
  if (result.wasGeocoded) return 'geolocated'
  if (result.wasCorrected) return 'corrected'
  return 'valid'
}
