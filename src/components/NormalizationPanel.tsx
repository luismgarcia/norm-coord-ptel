/**
 * Panel de Normalización - Visualización de resultados v2.0
 * 
 * Muestra scores, confianza y correcciones aplicadas por el normalizador.
 * Basado en diseño PROMPT_SPARK_NORMALIZADOR_PTEL.md
 */

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  Warning, 
  XCircle, 
  Info,
  ArrowsLeftRight,
  TextAa,
  Hash,
  Ruler
} from '@phosphor-icons/react'
import type { 
  NormalizationResult, 
  ConfidenceLevel, 
  Correction,
  CorrectionType 
} from '@/lib/coordinateNormalizer'

// ============================================================================
// CONFIGURACIÓN DE COLORES Y ESTILOS
// ============================================================================

/** Colores por nivel de confianza - Sistema Spark */
export const CONFIDENCE_COLORS: Record<ConfidenceLevel, {
  bg: string;
  text: string;
  border: string;
  badge: string;
}> = {
  HIGH: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-500 hover:bg-green-600'
  },
  MEDIUM: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
    badge: 'bg-yellow-500 hover:bg-yellow-600'
  },
  LOW: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-500 hover:bg-orange-600'
  },
  CRITICAL: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-500 hover:bg-red-600'
  }
}

/** Iconos y etiquetas por tipo de corrección */
const CORRECTION_CONFIG: Record<CorrectionType, {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  description: string;
}> = {
  Y_TRUNCATED: {
    icon: Ruler,
    label: 'Y Truncada',
    description: 'Coordenada Y incompleta, añadido prefijo provincial'
  },
  XY_SWAPPED: {
    icon: ArrowsLeftRight,
    label: 'X↔Y Intercambiados',
    description: 'Coordenadas X e Y estaban invertidas'
  },
  PLACEHOLDER_DETECTED: {
    icon: XCircle,
    label: 'Placeholder',
    description: 'Valor "N/D" o similar detectado'
  },
  ENCODING_FIXED: {
    icon: TextAa,
    label: 'Encoding UTF-8',
    description: 'Corrupción de caracteres corregida'
  },
  SEPARATOR_FIXED: {
    icon: Hash,
    label: 'Separador',
    description: 'Separador decimal/miles corregido'
  },
  THOUSANDS_REMOVED: {
    icon: Hash,
    label: 'Miles',
    description: 'Separador de miles eliminado'
  },
  DECIMAL_FIXED: {
    icon: Hash,
    label: 'Decimal',
    description: 'Punto decimal corregido'
  },
  WHITESPACE_CLEANED: {
    icon: TextAa,
    label: 'Espacios',
    description: 'Espacios en blanco eliminados'
  }
}

// ============================================================================
// COMPONENTES
// ============================================================================

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  size?: 'sm' | 'md' | 'lg';
}

/** Badge de confianza con color semántico */
export function ConfidenceBadge({ confidence, size = 'md' }: ConfidenceBadgeProps) {
  const colors = CONFIDENCE_COLORS[confidence]
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  }
  
  return (
    <Badge className={`${colors.badge} text-white ${sizeClasses[size]}`}>
      {confidence}
    </Badge>
  )
}

interface ScoreDisplayProps {
  score: number;
  confidence: ConfidenceLevel;
  showBar?: boolean;
}

/** Visualización de score con barra de progreso */
export function ScoreDisplay({ score, confidence, showBar = true }: ScoreDisplayProps) {
  const colors = CONFIDENCE_COLORS[confidence]
  
  const barColor = 
    confidence === 'HIGH' ? 'bg-green-500' :
    confidence === 'MEDIUM' ? 'bg-yellow-500' :
    confidence === 'LOW' ? 'bg-orange-500' :
    'bg-red-500'
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${colors.text}`}>
          Score: {score}
        </span>
        <ConfidenceBadge confidence={confidence} size="sm" />
      </div>
      {showBar && (
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  )
}

interface CorrectionItemProps {
  correction: Correction;
}

/** Item individual de corrección aplicada */
export function CorrectionItem({ correction }: CorrectionItemProps) {
  const config = CORRECTION_CONFIG[correction.type]
  const Icon = config.icon
  
  const priorityColors = {
    P0: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    P1: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    P2: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    P3: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }
  
  return (
    <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
      <Icon size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-blue-900 dark:text-blue-100">
            {config.label}
          </span>
          <Badge variant="outline" className={`text-xs ${priorityColors[correction.priority]}`}>
            {correction.priority}
          </Badge>
          <span className="text-xs text-gray-500">
            ({correction.field.toUpperCase()})
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1 text-xs">
          <span className="line-through text-red-500 font-mono truncate max-w-[100px]">
            {correction.from}
          </span>
          <span className="text-gray-400">→</span>
          <span className="text-green-600 dark:text-green-400 font-mono truncate max-w-[100px]">
            {correction.to}
          </span>
        </div>
      </div>
    </div>
  )
}

interface CorrectionsPanelProps {
  corrections: Correction[];
  expanded?: boolean;
}

/** Panel expandible de correcciones */
export function CorrectionsPanel({ corrections, expanded = false }: CorrectionsPanelProps) {
  if (corrections.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic">
        Sin correcciones necesarias
      </div>
    )
  }
  
  if (!expanded && corrections.length > 2) {
    return (
      <div className="space-y-1">
        {corrections.slice(0, 2).map((c, i) => (
          <CorrectionItem key={i} correction={c} />
        ))}
        <div className="text-xs text-blue-600 dark:text-blue-400">
          +{corrections.length - 2} correcciones más...
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-1">
      {corrections.map((c, i) => (
        <CorrectionItem key={i} correction={c} />
      ))}
    </div>
  )
}

interface NormalizationResultRowProps {
  result: NormalizationResult;
  index: number;
  showDetails?: boolean;
}

/** Fila de resultado individual en tabla */
export function NormalizationResultRow({ result, index, showDetails = false }: NormalizationResultRowProps) {
  const colors = CONFIDENCE_COLORS[result.confidence]
  
  return (
    <tr className={`border-t hover:bg-muted/30 ${!result.isValid ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}>
      <td className="px-4 py-2 text-center">{index + 1}</td>
      <td className="px-4 py-2">
        <ScoreDisplay score={result.score} confidence={result.confidence} showBar={false} />
      </td>
      <td className="px-4 py-2 font-mono text-xs">
        {result.x !== null ? result.x.toFixed(2) : 
          <span className="text-red-500">N/D</span>}
      </td>
      <td className="px-4 py-2 font-mono text-xs">
        {result.y !== null ? result.y.toFixed(2) : 
          <span className="text-red-500">N/D</span>}
      </td>
      <td className="px-4 py-2">
        {result.isValid ? (
          <CheckCircle size={18} className="text-green-500" weight="fill" />
        ) : (
          <XCircle size={18} className="text-red-500" weight="fill" />
        )}
      </td>
      <td className="px-4 py-2">
        {result.corrections.length > 0 ? (
          <Badge variant="outline" className="text-xs">
            {result.corrections.length} fix
          </Badge>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      {showDetails && (
        <td className="px-4 py-2">
          <CorrectionsPanel corrections={result.corrections} />
        </td>
      )}
    </tr>
  )
}

interface BatchStatsCardProps {
  stats: {
    total: number;
    valid: number;
    invalid: number;
    avgScore: number;
    confidenceDistribution: Record<ConfidenceLevel, number>;
  };
}

/** Tarjeta de estadísticas del lote */
export function BatchStatsCard({ stats }: BatchStatsCardProps) {
  const validPercent = stats.total > 0 ? (stats.valid / stats.total) * 100 : 0
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Info size={20} className="text-blue-500" />
          Resumen de Normalización v2.0
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estadísticas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            <div className="text-xs text-green-700 dark:text-green-300">Válidas</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
            <div className="text-xs text-red-700 dark:text-red-300">Inválidas</div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.avgScore.toFixed(0)}</div>
            <div className="text-xs text-blue-700 dark:text-blue-300">Score Promedio</div>
          </div>
        </div>
        
        {/* Barra de progreso de validez */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Tasa de validez</span>
            <span className="font-medium">{validPercent.toFixed(1)}%</span>
          </div>
          <Progress value={validPercent} className="h-2" />
        </div>
        
        {/* Distribución por confianza */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Distribución por Confianza</div>
          <div className="flex gap-2 flex-wrap">
            {(['HIGH', 'MEDIUM', 'LOW', 'CRITICAL'] as ConfidenceLevel[]).map(level => {
              const count = stats.confidenceDistribution[level] || 0
              const colors = CONFIDENCE_COLORS[level]
              return (
                <div 
                  key={level}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bg} ${colors.border} border`}
                >
                  <ConfidenceBadge confidence={level} size="sm" />
                  <span className={`font-medium ${colors.text}`}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default {
  ConfidenceBadge,
  ScoreDisplay,
  CorrectionItem,
  CorrectionsPanel,
  NormalizationResultRow,
  BatchStatsCard,
  CONFIDENCE_COLORS
}
