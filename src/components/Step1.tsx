/**
 * Step1 - Carga y extracción de documentos PTEL
 * 
 * Extrae TODAS las infraestructuras del documento, incluyendo
 * las que no tienen coordenadas (para geocodificación posterior).
 * 
 * Cambios v2:
 * - Extrae infraestructuras con y sin coordenadas
 * - Detecta municipio y provincia del documento
 * - Muestra resumen de extracción antes de continuar
 */

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  UploadSimple, 
  FileCsv, 
  FileXls, 
  FileDoc,
  File,
  Globe,
  SpinnerGap,
  CheckCircle,
  Warning,
  MapPin,
  Buildings
} from '@phosphor-icons/react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { extractInfrastructures } from '../lib/documentExtractor'
import { ExtractedInfrastructure, ExtractionStats, DocumentMetadata } from '../types/processing'

interface Step1Props {
  onComplete: (data: ExtractionResult) => void
}

/**
 * Resultado de la extracción para pasar a Step2
 */
export interface ExtractionResult {
  /** Archivo original */
  file: File
  
  /** Infraestructuras extraídas */
  infrastructures: ExtractedInfrastructure[]
  
  /** Estadísticas de extracción */
  stats: ExtractionStats
  
  /** Metadatos del documento */
  metadata: DocumentMetadata
}

const fileFormats = [
  { ext: 'ODT', icon: FileDoc, color: 'text-blue-500', supported: true },
  { ext: 'XLSX', icon: FileXls, color: 'text-emerald-500', supported: true },
  { ext: 'XLS', icon: FileXls, color: 'text-emerald-600', supported: true },
  { ext: 'ODS', icon: File, color: 'text-orange-500', supported: true },
  { ext: 'CSV', icon: FileCsv, color: 'text-green-500', supported: false },
  { ext: 'DOCX', icon: FileDoc, color: 'text-blue-600', supported: false },
]

export default function Step1({ onComplete }: Step1Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  // Estado para mostrar resumen antes de continuar
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setError(null)
    setExtractionResult(null)
    setProcessingStatus('Leyendo documento...')
    
    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      
      // Verificar formato soportado
      if (!['odt', 'xlsx', 'xls', 'ods'].includes(extension || '')) {
        throw new Error(`Formato ${extension} no soportado para extracción completa. Use ODT, XLSX, XLS u ODS.`)
      }
      
      setProcessingStatus('Extrayendo infraestructuras...')
      
      const { infrastructures, stats, metadata } = await extractInfrastructures(file)
      
      if (infrastructures.length === 0) {
        throw new Error('No se encontraron infraestructuras en el documento')
      }
      
      setProcessingStatus('¡Extracción completada!')
      
      // Guardar resultado para mostrar resumen
      setExtractionResult({
        file,
        infrastructures,
        stats,
        metadata
      })
      
    } catch (err) {
      console.error('Error procesando archivo:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setProcessingStatus('')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleContinue = () => {
    if (extractionResult) {
      onComplete(extractionResult)
    }
  }

  const handleReset = () => {
    setExtractionResult(null)
    setError(null)
    setProcessingStatus('')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }, [])

  // Si hay resultado de extracción, mostrar resumen
  if (extractionResult) {
    const { stats, metadata, infrastructures } = extractionResult
    const coveragePercent = stats.total > 0 
      ? Math.round((stats.withCoordinates / stats.total) * 100) 
      : 0
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Card className="bg-card border border-border rounded-xl overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle size={22} weight="duotone" className="text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Extracción completada</h3>
                  <p className="text-xs text-muted-foreground">{metadata.fileName}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Cambiar archivo
              </Button>
            </div>
            
            {/* Resumen de extracción */}
            <div className="p-4 space-y-4">
              {/* Municipio y Provincia detectados */}
              <div className="flex items-center gap-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Buildings size={18} className="text-primary" />
                  <span className="text-sm font-medium">Municipio:</span>
                  <span className="text-sm text-primary">{metadata.municipality || 'No detectado'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  <span className="text-sm font-medium">Provincia:</span>
                  <span className="text-sm text-primary">{metadata.province || 'No detectada'}</span>
                </div>
              </div>
              
              {/* Métricas principales */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Infraestructuras</div>
                </div>
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.withCoordinates}</div>
                  <div className="text-xs text-green-400/80">Con coordenadas</div>
                </div>
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-400">{stats.withoutCoordinates}</div>
                  <div className="text-xs text-orange-400/80">Sin coordenadas</div>
                </div>
              </div>
              
              {/* Barra de cobertura */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Cobertura de coordenadas</span>
                  <span>{coveragePercent}%</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>
              </div>
              
              {/* Aviso si hay muchas sin coordenadas */}
              {stats.withoutCoordinates > 0 && (
                <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <Warning size={18} className="text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-orange-400">
                      {stats.withoutCoordinates} infraestructuras sin coordenadas
                    </span>
                    <p className="text-orange-400/80 text-xs mt-1">
                      Se intentará geocodificar automáticamente en el siguiente paso usando CartoCiudad, CDAU y servicios WFS especializados.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Distribución por tipología */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Por tipología:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byTypology)
                    .sort(([, a], [, b]) => b - a)
                    .map(([tipo, count]) => (
                      <span 
                        key={tipo}
                        className="px-2 py-1 bg-slate-800/50 border border-slate-700 rounded text-xs"
                      >
                        {tipo}: <span className="font-bold">{count}</span>
                      </span>
                    ))
                  }
                </div>
              </div>
              
              {/* Distribución por tabla */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Por tabla:</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byTable)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8) // Mostrar máximo 8
                    .map(([tabla, count]) => (
                      <span 
                        key={tabla}
                        className="px-2 py-1 bg-slate-800/50 border border-slate-700 rounded text-xs"
                      >
                        {tabla.substring(0, 20)}: <span className="font-bold">{count}</span>
                      </span>
                    ))
                  }
                  {Object.keys(stats.byTable).length > 8 && (
                    <span className="px-2 py-1 text-xs text-muted-foreground">
                      +{Object.keys(stats.byTable).length - 8} más
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Botón continuar */}
            <div className="p-4 border-t border-border">
              <Button 
                onClick={handleContinue}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Continuar a normalización y geocodificación
                <span className="ml-2">→</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Vista de carga de archivo
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-6"
    >
      <Card className="bg-card border border-border rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UploadSimple size={20} weight="duotone" className="text-primary" />
            </div>
            <div>
              <span className="font-semibold">Subir documento PTEL</span>
              <p className="text-xs text-muted-foreground">Extrae todas las infraestructuras del documento</p>
            </div>
          </div>

          <div className="p-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                relative rounded-xl p-10 text-center cursor-pointer border-2 border-dashed 
                transition-colors duration-200 
                ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'} 
                ${isProcessing ? 'opacity-60 pointer-events-none' : ''}
              `}
            >
              <div className="flex justify-center gap-3 mb-6">
                {fileFormats.filter(f => f.supported).map((format) => (
                  <div key={format.ext} className="p-3 bg-card border border-border rounded-lg">
                    <format.icon size={28} weight="duotone" className={format.color} />
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-6">
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <SpinnerGap size={20} className="animate-spin text-primary" />
                    <p className="text-lg font-semibold text-primary">{processingStatus}</p>
                  </div>
                ) : error ? (
                  <p className="text-lg font-semibold text-red-500">{error}</p>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-foreground">
                      {isDragging ? (
                        <span className="text-primary">¡Suelta el archivo aquí!</span>
                      ) : (
                        'Arrastra un documento PTEL'
                      )}
                    </p>
                    <p className="text-muted-foreground">o haz clic para seleccionar</p>
                  </>
                )}
              </div>

              <input 
                type="file" 
                accept=".odt,.xlsx,.xls,.ods" 
                onChange={handleFileSelect} 
                className="hidden" 
                id="file-upload" 
              />

              <Button 
                asChild 
                className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                disabled={isProcessing}
              >
                <label htmlFor="file-upload" className="cursor-pointer">
                  {isProcessing ? (
                    <>
                      <SpinnerGap size={20} className="mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <UploadSimple size={20} weight="bold" className="mr-2" />
                      Seleccionar archivo
                    </>
                  )}
                </label>
              </Button>
            </div>
          </div>

          {/* Info de formatos */}
          <div className="p-6 pt-0">
            <div className="p-4 bg-muted/20 border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={18} className="text-primary" />
                <span className="font-medium text-sm">Formatos soportados</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {fileFormats.map((format) => (
                  <span 
                    key={format.ext}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-md border
                      ${format.supported 
                        ? 'bg-primary/10 border-primary/30 text-primary' 
                        : 'bg-muted/30 border-border text-muted-foreground opacity-50'
                      }
                    `}
                  >
                    {format.ext}
                    {!format.supported && ' (próximamente)'}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Los documentos ODT y Excel se analizan para extraer todas las infraestructuras, 
                incluyendo las que no tienen coordenadas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
