import { motion } from 'framer-motion'
import { 
  MagnifyingGlass, 
  CheckCircle, 
  Warning,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Table as TableIcon,
  FileText,
  TrendUp
} from '@phosphor-icons/react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ProcessedData } from './Step1'

interface Step2Props {
  data: ProcessedData | null
  onComplete: (data: ProcessedData) => void
  onBack: () => void
}

export default function Step2({ data, onComplete, onBack }: Step2Props) {
  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay datos para mostrar. Vuelve al paso anterior.
      </div>
    )
  }

  const { stats, results, rows, fileName, headers } = data

  const handleContinue = () => {
    onComplete(data)
  }

  // Calcular porcentaje de válidos
  const validPercent = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Main Card */}
      <Card className="bg-card border border-border rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Card Header */}
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
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{validPercent}%</div>
              <div className="text-xs text-muted-foreground">válidos</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Total filas */}
              <div className="p-4 bg-muted/20 border border-border rounded-xl text-center">
                <div className="flex items-center justify-center mb-2">
                  <FileText size={24} weight="duotone" className="text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total filas</div>
              </div>

              {/* Válidos */}
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle size={24} weight="fill" className="text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-500">{stats.valid}</div>
                <div className="text-xs text-muted-foreground">Válidos</div>
              </div>

              {/* Inválidos */}
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2">
                  <XCircle size={24} weight="fill" className="text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-500">{stats.invalid}</div>
                <div className="text-xs text-muted-foreground">Inválidos</div>
              </div>

              {/* Score promedio */}
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendUp size={24} weight="duotone" className="text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary">{Math.round(stats.avgScore)}</div>
                <div className="text-xs text-muted-foreground">Score medio</div>
              </div>
            </div>

            {/* Distribución de confianza */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3">Distribución de confianza</h4>
              <div className="flex gap-2">
                {stats.confidenceDistribution.HIGH > 0 && (
                  <div className="flex-1 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                    <div className="text-lg font-bold text-green-500">{stats.confidenceDistribution.HIGH}</div>
                    <div className="text-xs text-muted-foreground">Alta</div>
                  </div>
                )}
                {stats.confidenceDistribution.MEDIUM > 0 && (
                  <div className="flex-1 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                    <div className="text-lg font-bold text-yellow-500">{stats.confidenceDistribution.MEDIUM}</div>
                    <div className="text-xs text-muted-foreground">Media</div>
                  </div>
                )}
                {stats.confidenceDistribution.LOW > 0 && (
                  <div className="flex-1 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                    <div className="text-lg font-bold text-orange-500">{stats.confidenceDistribution.LOW}</div>
                    <div className="text-xs text-muted-foreground">Baja</div>
                  </div>
                )}
                {stats.confidenceDistribution.CRITICAL > 0 && (
                  <div className="flex-1 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                    <div className="text-lg font-bold text-red-500">{stats.confidenceDistribution.CRITICAL}</div>
                    <div className="text-xs text-muted-foreground">Crítica</div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview de datos */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="p-3 bg-muted/30 border-b border-border flex items-center gap-2">
                <TableIcon size={18} className="text-muted-foreground" />
                <span className="text-sm font-medium">Vista previa de coordenadas normalizadas</span>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">#</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">X Original</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Y Original</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">X Normalizado</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Y Normalizado</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Score</th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 10).map((result, index) => (
                      <tr key={index} className="border-t border-border">
                        <td className="px-4 py-2 text-muted-foreground">{index + 1}</td>
                        <td className="px-4 py-2 font-mono text-xs">{String(result.original.x).substring(0, 15)}</td>
                        <td className="px-4 py-2 font-mono text-xs">{String(result.original.y).substring(0, 15)}</td>
                        <td className="px-4 py-2 font-mono text-xs text-primary">
                          {result.x?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-primary">
                          {result.y?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`
                            px-2 py-0.5 rounded text-xs font-medium
                            ${result.score >= 76 ? 'bg-green-500/20 text-green-500' :
                              result.score >= 51 ? 'bg-yellow-500/20 text-yellow-500' :
                              result.score >= 26 ? 'bg-orange-500/20 text-orange-500' :
                              'bg-red-500/20 text-red-500'}
                          `}>
                            {result.score}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {result.isValid ? (
                            <CheckCircle size={18} weight="fill" className="text-green-500" />
                          ) : (
                            <XCircle size={18} weight="fill" className="text-red-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {results.length > 10 && (
                <div className="p-3 bg-muted/20 border-t border-border text-center text-xs text-muted-foreground">
                  Mostrando 10 de {results.length} filas
                </div>
              )}
            </div>
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
              Continuar a descarga
              <ArrowRight size={18} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
