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
  Warning
} from '@phosphor-icons/react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { normalizeCoordinate, getBatchStats, NormalizationResult } from '../lib/coordinateNormalizer'

interface Step1Props {
  onComplete: (data: ProcessedData) => void
}

export interface ProcessedData {
  files: File[]
  rows: any[]
  results: NormalizationResult[]
  stats: ReturnType<typeof getBatchStats>
  headers: string[]
  fileName: string
}

const fileFormats = [
  { ext: 'CSV', icon: FileCsv, color: 'text-green-500' },
  { ext: 'XLSX', icon: FileXls, color: 'text-emerald-500' },
  { ext: 'XLS', icon: FileXls, color: 'text-emerald-600' },
  { ext: 'ODS', icon: File, color: 'text-orange-500' },
  { ext: 'ODT', icon: FileDoc, color: 'text-blue-500' },
  { ext: 'DBF', icon: File, color: 'text-purple-500' },
  { ext: 'ZIP', icon: File, color: 'text-gray-500' },
]

const coordSystems = [
  'WGS84', 'ETRS89', 'ED50', 'UTM zones', 'Lambert', 'Web Mercator'
]

// Detectar columnas de coordenadas
function detectCoordinateColumns(headers: string[]): { xCol: string | null, yCol: string | null } {
  const xPatterns = [/^x$/i, /coord.*x/i, /utm.*x/i, /^este$/i, /^easting$/i, /^lon/i]
  const yPatterns = [/^y$/i, /coord.*y/i, /utm.*y/i, /^norte$/i, /^northing$/i, /^lat/i]
  
  let xCol = null
  let yCol = null
  
  for (const header of headers) {
    for (const pattern of xPatterns) {
      if (pattern.test(header)) {
        xCol = header
        break
      }
    }
    for (const pattern of yPatterns) {
      if (pattern.test(header)) {
        yCol = header
        break
      }
    }
  }
  
  return { xCol, yCol }
}

export default function Step1({ onComplete }: Step1Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')

  const parseFile = async (file: File): Promise<{ rows: any[], headers: string[] }> => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    
    if (extension === 'csv') {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            resolve({
              rows: results.data as any[],
              headers: results.meta.fields || []
            })
          },
          error: reject
        })
      })
    }
    
    if (['xlsx', 'xls', 'ods'].includes(extension || '')) {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]
      
      if (data.length === 0) {
        return { rows: [], headers: [] }
      }
      
      const headers = data[0].map(String)
      const rows = data.slice(1).map(row => {
        const obj: any = {}
        headers.forEach((h, i) => {
          obj[h] = row[i]
        })
        return obj
      })
      
      return { rows, headers }
    }
    
    throw new Error(`Formato no soportado: ${extension}`)
  }

  const processFiles = async (newFiles: File[]) => {
    if (newFiles.length === 0) return
    
    setIsProcessing(true)
    setProcessingStatus('Leyendo archivo...')
    
    try {
      const file = newFiles[0] // Procesar primer archivo
      const { rows, headers } = await parseFile(file)
      
      setProcessingStatus(`Detectando coordenadas (${rows.length} filas)...`)
      
      // Detectar columnas de coordenadas
      const { xCol, yCol } = detectCoordinateColumns(headers)
      
      if (!xCol || !yCol) {
        // Intentar buscar por posición (columnas típicas)
        const possibleX = headers.find(h => /x|este|easting|lon/i.test(h)) || headers[0]
        const possibleY = headers.find(h => /y|norte|northing|lat/i.test(h)) || headers[1]
        console.warn('Columnas detectadas por heurística:', possibleX, possibleY)
      }
      
      setProcessingStatus('Normalizando coordenadas...')
      
      // Normalizar cada fila
      const results: NormalizationResult[] = rows.map((row, index) => {
        const x = row[xCol || headers.find(h => /x|este|lon/i.test(h)) || ''] || ''
        const y = row[yCol || headers.find(h => /y|norte|lat/i.test(h)) || ''] || ''
        
        return normalizeCoordinate({
          x: String(x),
          y: String(y)
        })
      })
      
      // Generar estadísticas
      const stats = getBatchStats(results)
      
      setProcessingStatus('¡Completado!')
      
      // Pasar datos al siguiente paso
      onComplete({
        files: newFiles,
        rows,
        results,
        stats,
        headers,
        fileName: file.name
      })
      
    } catch (error) {
      console.error('Error procesando archivo:', error)
      setProcessingStatus(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
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
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      processFiles(selectedFiles)
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Main Upload Card */}
      <Card className="bg-card border border-border rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Card Header */}
          <div className="p-5 border-b border-border flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UploadSimple size={20} weight="duotone" className="text-primary" />
            </div>
            <span className="font-semibold">Subir archivos</span>
          </div>

          {/* Dropzone */}
          <div className="p-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                relative rounded-xl p-10 text-center cursor-pointer
                border-2 border-dashed transition-colors duration-200
                ${isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
                }
                ${isProcessing ? 'opacity-60 pointer-events-none' : ''}
              `}
            >
              {/* File format icons */}
              <div className="flex justify-center gap-3 mb-6">
                {fileFormats.slice(0, 4).map((format, index) => (
                  <div
                    key={format.ext}
                    className="p-3 bg-card border border-border rounded-lg"
                  >
                    <format.icon size={28} weight="duotone" className={format.color} />
                  </div>
                ))}
              </div>

              {/* Main text */}
              <div className="space-y-2 mb-6">
                {isProcessing ? (
                  <p className="text-xl font-semibold text-primary">{processingStatus}</p>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-foreground">
                      {isDragging ? (
                        <span className="text-primary">¡Suelta los archivos aquí!</span>
                      ) : (
                        'Arrastra archivos aquí'
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      o haz clic para seleccionar
                    </p>
                  </>
                )}
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.ods,.odt,.dbf,.zip,.geojson,.kml"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />

              {/* Button */}
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
                      Seleccionar archivos
                    </>
                  )}
                </label>
              </Button>
            </div>
          </div>

          {/* Info cards - MISMA ALTURA */}
          <div className="grid md:grid-cols-2 gap-5 p-6 pt-0">
            {/* Formatos soportados */}
            <div className="p-5 bg-muted/20 border border-border rounded-xl min-h-[200px] flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <FileCsv size={26} weight="duotone" className="text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Formatos soportados</div>
                  <div className="text-xs text-muted-foreground">7 tipos de archivo</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {fileFormats.map((format) => (
                  <span 
                    key={format.ext} 
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-muted/50 border border-border text-muted-foreground hover:border-primary/50 transition-colors"
                  >
                    {format.ext}
                  </span>
                ))}
              </div>
            </div>

            {/* Sistemas de coordenadas */}
            <div className="p-5 bg-muted/20 border border-border rounded-xl min-h-[200px] flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Globe size={26} weight="duotone" className="text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Sistemas de coordenadas</div>
                  <div className="text-xs text-muted-foreground">14 detectados automáticamente</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 flex-1">
                {coordSystems.slice(0, 5).map((system, index) => (
                  <div 
                    key={system} 
                    className={`
                      text-xs px-3 py-2 rounded-lg text-center transition-colors
                      ${index === 2 
                        ? 'bg-primary/15 border border-primary/30 text-primary font-semibold' 
                        : 'bg-muted/30 border border-border text-muted-foreground'
                      }
                    `}
                  >
                    {index === 2 ? 'UTM30N ⭐' : system}
                  </div>
                ))}
                <div className="text-xs px-3 py-2 rounded-lg text-center bg-muted/30 border border-border text-muted-foreground">
                  +8 más
                </div>
              </div>
              <div className="mt-3 text-xs text-primary cursor-pointer hover:underline">
                ▸ Ver todos los sistemas →
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
