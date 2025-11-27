/**
 * TypologyBadge - Badge de tipología PTEL
 * 
 * Tipologías estándar:
 * - IND: Industrial/Riesgo
 * - PAT: Patrimonio
 * - VUL: Vulnerable
 * - ALB: Albergue
 * - SAN: Sanitario
 * - EDU: Educativo
 * - SEG: Seguridad
 * - SUM: Suministros
 * - OTR: Otros
 */

import { cn } from '../lib/utils'
import {
  Factory,
  Church,
  FirstAid,
  HouseLine,
  Hospital,
  GraduationCap,
  ShieldCheck,
  Lightning,
  DotsThree
} from '@phosphor-icons/react'

export type TypologyCode = 'IND' | 'PAT' | 'VUL' | 'ALB' | 'SAN' | 'EDU' | 'SEG' | 'SUM' | 'OTR'

interface TypologyConfigItem {
  code: TypologyCode
  name: string
  icon: typeof Factory
  color: string        // Hex color for inline styles
  textClass: string    // Tailwind class
  bgClass: string
  borderClass: string
}

// Configuración exportable para uso en filtros y otros componentes
export const TYPOLOGY_CONFIG: Record<TypologyCode, TypologyConfigItem> = {
  IND: {
    code: 'IND',
    name: 'Industrial',
    icon: Factory,
    color: '#f87171',
    textClass: 'text-red-400',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30'
  },
  PAT: {
    code: 'PAT',
    name: 'Patrimonio',
    icon: Church,
    color: '#c084fc',
    textClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30'
  },
  VUL: {
    code: 'VUL',
    name: 'Vulnerable',
    icon: FirstAid,
    color: '#60a5fa',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30'
  },
  ALB: {
    code: 'ALB',
    name: 'Albergue',
    icon: HouseLine,
    color: '#4ade80',
    textClass: 'text-green-400',
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/30'
  },
  SAN: {
    code: 'SAN',
    name: 'Sanitario',
    icon: Hospital,
    color: '#f472b6',
    textClass: 'text-pink-400',
    bgClass: 'bg-pink-500/10',
    borderClass: 'border-pink-500/30'
  },
  EDU: {
    code: 'EDU',
    name: 'Educativo',
    icon: GraduationCap,
    color: '#fbbf24',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30'
  },
  SEG: {
    code: 'SEG',
    name: 'Seguridad',
    icon: ShieldCheck,
    color: '#818cf8',
    textClass: 'text-indigo-400',
    bgClass: 'bg-indigo-500/10',
    borderClass: 'border-indigo-500/30'
  },
  SUM: {
    code: 'SUM',
    name: 'Suministros',
    icon: Lightning,
    color: '#22d3ee',
    textClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/10',
    borderClass: 'border-cyan-500/30'
  },
  OTR: {
    code: 'OTR',
    name: 'Otros',
    icon: DotsThree,
    color: '#9ca3af',
    textClass: 'text-gray-400',
    bgClass: 'bg-gray-500/10',
    borderClass: 'border-gray-500/30'
  }
}

interface TypologyBadgeProps {
  code: TypologyCode
  count?: number
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  onClick?: () => void
  className?: string
}

const sizeClasses = {
  sm: {
    container: 'px-2 py-1 gap-1',
    icon: 12,
    text: 'text-[10px]',
    count: 'text-xs'
  },
  md: {
    container: 'px-2 py-1 gap-1.5',
    icon: 14,
    text: 'text-xs',
    count: 'text-sm'
  },
  lg: {
    container: 'px-3 py-1.5 gap-2',
    icon: 16,
    text: 'text-sm',
    count: 'text-base'
  }
}

export default function TypologyBadge({ 
  code, 
  count, 
  size = 'md',
  showName = false,
  onClick,
  className 
}: TypologyBadgeProps) {
  const config = TYPOLOGY_CONFIG[code]
  const sizes = sizeClasses[size]
  const Icon = config.icon
  
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border transition-colors',
        config.bgClass,
        config.borderClass,
        onClick && 'cursor-pointer hover:brightness-110',
        sizes.container,
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <Icon size={sizes.icon} weight="duotone" className={config.textClass} />
      <span className={cn('font-semibold', config.textClass, sizes.text)}>
        {config.code}
      </span>
      {showName && (
        <span className={cn('text-gray-400', sizes.text)}>
          {config.name}
        </span>
      )}
      {count !== undefined && (
        <>
          <span className="text-gray-600">:</span>
          <span className={cn('font-bold text-white', sizes.count)}>
            {count}
          </span>
        </>
      )}
    </div>
  )
}

// Grid de tipologías para el dashboard
interface TypologyGridProps {
  data: Partial<Record<TypologyCode, number>>
  size?: 'sm' | 'md' | 'lg'
  onSelect?: (code: TypologyCode) => void
}

export function TypologyGrid({ data, size = 'md', onSelect }: TypologyGridProps) {
  const entries = Object.entries(data).filter(([_, count]) => count && count > 0) as [TypologyCode, number][]
  
  if (entries.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No hay tipologías detectadas
      </div>
    )
  }
  
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([code, count]) => (
        <TypologyBadge
          key={code}
          code={code}
          count={count}
          size={size}
          onClick={onSelect ? () => onSelect(code) : undefined}
        />
      ))}
    </div>
  )
}

// Detectar tipología desde nombre de tabla o contenido
export function detectTypology(text: string): TypologyCode {
  const t = text.toLowerCase()
  
  if (/industr|riesgo|seveso|quim|gasolinera|fabrica|contam|almacen/i.test(t)) return 'IND'
  if (/patrimonio|monument|iglesia|castillo|yacimiento|bic|museo|histor/i.test(t)) return 'PAT'
  if (/vulnerable|residencia|mayores|ancian|discapac|asilo|depend|tercera.*edad/i.test(t)) return 'VUL'
  if (/albergue|refugio|evacuac|acogida|polideport|pabellon/i.test(t)) return 'ALB'
  if (/sanitar|hospital|centro.*salud|consul|clinic|ambulat|farmacia/i.test(t)) return 'SAN'
  if (/educa|colegio|instituto|escuela|guarderia|universidad|ceip|ies/i.test(t)) return 'EDU'
  if (/seguridad|policia|bombero|guardia|proteccion|emergencia|112/i.test(t)) return 'SEG'
  if (/suministr|electric|agua|gas|comunicac|telefon|infraestruc/i.test(t)) return 'SUM'
  
  return 'OTR'
}
