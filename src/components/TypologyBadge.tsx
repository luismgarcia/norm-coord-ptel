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

interface TypologyConfig {
  code: TypologyCode
  name: string
  icon: typeof Factory
  color: string
  bgColor: string
  borderColor: string
}

const typologyConfigs: Record<TypologyCode, TypologyConfig> = {
  IND: {
    code: 'IND',
    name: 'Industrial',
    icon: Factory,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30'
  },
  PAT: {
    code: 'PAT',
    name: 'Patrimonio',
    icon: Church,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
  VUL: {
    code: 'VUL',
    name: 'Vulnerable',
    icon: FirstAid,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  ALB: {
    code: 'ALB',
    name: 'Albergue',
    icon: HouseLine,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  SAN: {
    code: 'SAN',
    name: 'Sanitario',
    icon: Hospital,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30'
  },
  EDU: {
    code: 'EDU',
    name: 'Educativo',
    icon: GraduationCap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30'
  },
  SEG: {
    code: 'SEG',
    name: 'Seguridad',
    icon: ShieldCheck,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30'
  },
  SUM: {
    code: 'SUM',
    name: 'Suministros',
    icon: Lightning,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30'
  },
  OTR: {
    code: 'OTR',
    name: 'Otros',
    icon: DotsThree,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30'
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
    container: 'px-2 py-1 gap-1.5',
    icon: 14,
    text: 'text-xs',
    count: 'text-sm'
  },
  md: {
    container: 'px-3 py-2 gap-2',
    icon: 16,
    text: 'text-sm',
    count: 'text-lg'
  },
  lg: {
    container: 'px-4 py-3 gap-2.5',
    icon: 18,
    text: 'text-base',
    count: 'text-xl'
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
  const config = typologyConfigs[code]
  const sizes = sizeClasses[size]
  const Icon = config.icon
  
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border transition-colors',
        config.bgColor,
        config.borderColor,
        onClick && 'cursor-pointer hover:brightness-110',
        sizes.container,
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <Icon size={sizes.icon} weight="duotone" className={config.color} />
      <span className={cn('font-semibold', config.color, sizes.text)}>
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
  
  if (/industr|riesgo|seveso|quim|gasolinera|fabrica|contam/i.test(t)) return 'IND'
  if (/patrimonio|monument|iglesia|castillo|yacimiento|bic|museo|histor/i.test(t)) return 'PAT'
  if (/vulnerable|residencia|mayores|ancian|discapac|asilo|depend/i.test(t)) return 'VUL'
  if (/albergue|refugio|evacuac|acogida|polideport|pabellon/i.test(t)) return 'ALB'
  if (/sanitar|hospital|centro.*salud|consul|clinic|ambulat|farmacia/i.test(t)) return 'SAN'
  if (/educa|colegio|instituto|escuela|guarderia|universidad|ceip|ies/i.test(t)) return 'EDU'
  if (/seguridad|policia|bombero|guardia|proteccion|emergencia|112/i.test(t)) return 'SEG'
  if (/suministr|electric|agua|gas|comunicac|telefon|infraestruc/i.test(t)) return 'SUM'
  
  return 'OTR'
}
