import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  UploadSimple, 
  FileCsv, 
  FileXls, 
  MapPin, 
  CheckCircle, 
  Warning,
  DownloadSimple,
  ArrowsClockwise,
  Globe,
  File,
  Trash,
  Stack,
  Package,
  MagnifyingGlass,
  NumberCircleOne,
  NumberCircleTwo,
  NumberCircleThree
} from '@phosphor-icons/react'
import { parseFile, generateCSV, generateExcel, generateGeoJSON, generateKML, downloadFile, getOutputFilename, type ParsedFile } from '@/lib/fileParser'
import { 
  detectCoordinateSystem, 
  convertToUTM30,
  calculateBounds,
  formatCoordinate,
  getCoordinateSystems,
  type DetectionResult,
  type CoordinateData 
} from '@/lib/coordinateUtils'
import { toast } from 'sonner'
import JSZip from 'jszip'

type Step = 1 | 2 | 3

interface ProcessingState {
  stage: 'idle' | 'uploading' | 'detecting' | 'converting' | 'complete' | 'error'
  progress: number
  message: string
}

interface ProcessedFile {
  id: string
  parsedFile: ParsedFile
  detection: DetectionResult
  convertedData: CoordinateData[]
  timestamp: number
}

function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [processing, setProcessing] = useState<ProcessingState>({
    stage: 'idle',
    progress: 0,
    message: ''
  })
  const [isDragging, setIsDragging] = useState(false)
  const [outputFormat, setOutputFormat] = useState<'csv' | 'xlsx' | 'geojson' | 'kml'>('csv')
  
  const selectedFile = processedFiles.find(f => f.id === selectedFileId)

  const handleFileUpload = async (file: File) => {
    setProcessing({ stage: 'uploading', progress: 10, message: 'Leyendo archivo...' })

    try {
      const parsed = await parseFile(file)
      setProcessing({ stage: 'detecting', progress: 40, message: 'Detectando sistema de coordenadas...' })

      setTimeout(() => {
        const detected = detectCoordinateSystem(parsed.data)
        
        if (!detected) {
          throw new Error('No se pudieron detectar columnas de coordenadas. Asegúrese de que su archivo contiene datos de coordenadas.')
        }

        setProcessing({ stage: 'converting', progress: 70, message: 'Convirtiendo a UTM30...' })

        setTimeout(() => {
          const converted = convertToUTM30(
            parsed.data,
            detected.system.code,
            detected.xColumn,
            detected.yColumn
          )

          const validCount = converted.filter(c => c.isValid).length
          const invalidCount = converted.length - validCount

          const newFile: ProcessedFile = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            parsedFile: parsed,
            detection: detected,
            convertedData: converted,
            timestamp: Date.now()
          }

          setProcessedFiles(prev => [...prev, newFile])
          setSelectedFileId(newFile.id)
          setCurrentStep(2)
          
          setProcessing({ 
            stage: 'complete', 
            progress: 100, 
            message: `¡Conversión completada! ${validCount} coordenadas convertidas${invalidCount > 0 ? `, ${invalidCount} fallidas` : ''}` 
          })

          toast.success('Conversión completada', {
            description: `${parsed.filename}: ${validCount} coordenadas a UTM30`
          })
        }, 500)
      }, 500)

    } catch (error) {
      setProcessing({ 
        stage: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'Ocurrió un error' 
      })
      toast.error('Procesamiento fallido', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }

  const handleMultipleFiles = async (files: FileList) => {
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      await handleFileUpload(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      if (files.length === 1) {
        handleFileUpload(files[0])
      } else {
        handleMultipleFiles(files)
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      if (files.length === 1) {
        handleFileUpload(files[0])
      } else {
        handleMultipleFiles(files)
      }
    }
  }

  const handleDownload = (fileId?: string) => {
    const file = fileId 
      ? processedFiles.find(f => f.id === fileId)
      : selectedFile

    if (!file) return

    const convertedCoords = file.convertedData.map(c => ({ 
      x: c.converted.x, 
      y: c.converted.y, 
      isValid: c.isValid 
    }))

    let content: string | ArrayBuffer
    
    switch (outputFormat) {
      case 'csv':
        content = generateCSV(
          file.parsedFile.data,
          file.detection.xColumn,
          file.detection.yColumn,
          convertedCoords
        )
        break
      case 'xlsx':
        content = generateExcel(
          file.parsedFile.data,
          file.detection.xColumn,
          file.detection.yColumn,
          convertedCoords
        )
        break
      case 'geojson':
        content = generateGeoJSON(
          file.parsedFile.data,
          file.detection.xColumn,
          file.detection.yColumn,
          convertedCoords
        )
        break
      case 'kml':
        content = generateKML(
          file.parsedFile.data,
          file.detection.xColumn,
          file.detection.yColumn,
          convertedCoords
        )
        break
      default:
        throw new Error(`Formato no soportado: ${outputFormat}`)
    }

    const filename = getOutputFilename(file.parsedFile.filename, outputFormat)
    downloadFile(content, filename, outputFormat)

    toast.success('Archivo descargado', {
      description: `Guardado como ${filename}`
    })
  }

  const handleDownloadAll = async () => {
    try {
      toast.info('Generando ZIP...', {
        description: 'Preparando archivos para descarga'
      })

      const zip = new JSZip()
      
      processedFiles.forEach((file) => {
        const convertedCoords = file.convertedData.map(c => ({ 
          x: c.converted.x, 
          y: c.converted.y, 
          isValid: c.isValid 
        }))
        
        let content: string | ArrayBuffer
        
        switch (outputFormat) {
          case 'csv':
            content = generateCSV(
              file.parsedFile.data,
              file.detection.xColumn,
              file.detection.yColumn,
              convertedCoords
            )
            break
          case 'xlsx':
            content = generateExcel(
              file.parsedFile.data,
              file.detection.xColumn,
              file.detection.yColumn,
              convertedCoords
            )
            break
          case 'geojson':
            content = generateGeoJSON(
              file.parsedFile.data,
              file.detection.xColumn,
              file.detection.yColumn,
              convertedCoords
            )
            break
          case 'kml':
            content = generateKML(
              file.parsedFile.data,
              file.detection.xColumn,
              file.detection.yColumn,
              convertedCoords
            )
            break
          default:
            throw new Error(`Formato no soportado: ${outputFormat}`)
        }
        
        const filename = getOutputFilename(file.parsedFile.filename, outputFormat)
        zip.file(filename, content)
      })
      
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `coordenadas_UTM30_${outputFormat}.zip`
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      
      requestAnimationFrame(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      })
      
      toast.success('Archivos descargados', {
        description: `${processedFiles.length} archivos en formato ZIP`
      })
    } catch (error) {
      toast.error('Error al crear ZIP', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }

  const handleRemoveFile = (fileId: string) => {
    setProcessedFiles(prev => {
      const remaining = prev.filter(f => f.id !== fileId)
      if (selectedFileId === fileId) {
        setSelectedFileId(remaining[0]?.id || null)
      }
      if (remaining.length === 0) {
        setProcessing({ stage: 'idle', progress: 0, message: '' })
        setCurrentStep(1)
      }
      return remaining
    })
    
    toast.success('Archivo eliminado', {
      description: 'El archivo ha sido eliminado correctamente'
    })
  }

  const handleReset = () => {
    setProcessedFiles([])
    setSelectedFileId(null)
    setProcessing({ stage: 'idle', progress: 0, message: '' })
    setCurrentStep(1)
  }

  const validCoords = selectedFile ? selectedFile.convertedData.filter(c => c.isValid) : []
  const invalidCoords = selectedFile ? selectedFile.convertedData.filter(c => !c.isValid) : []
  const originalBounds = selectedFile ? calculateBounds(selectedFile.detection.sampleCoords) : null
  const convertedBounds = validCoords.length > 0 
    ? calculateBounds(validCoords.map(c => c.converted)) 
    : null

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Conversor de coordenadas UTM30
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Conversor automático en 3 pasos sencillos
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 md:gap-6 flex-wrap">
          <div 
            className={`flex items-center gap-2 transition-all ${currentStep >= 1 ? 'opacity-100' : 'opacity-40'}`}
            onClick={() => currentStep > 1 && handleReset()}
          >
            <div className={`flex items-center gap-2 ${currentStep > 1 ? 'cursor-pointer hover:scale-105' : ''} transition-transform`}>
              <NumberCircleOne 
                size={36} 
                weight={currentStep === 1 ? 'fill' : 'regular'}
                className={currentStep === 1 ? 'text-primary' : 'text-muted-foreground'}
              />
              <span className={`text-sm md:text-base font-medium ${currentStep === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Subir
              </span>
            </div>
          </div>

          <Separator className="w-8 md:w-12" />

          <div className={`flex items-center gap-2 transition-all ${currentStep >= 2 ? 'opacity-100' : 'opacity-40'}`}>
            <NumberCircleTwo 
              size={36} 
              weight={currentStep === 2 ? 'fill' : 'regular'}
              className={currentStep === 2 ? 'text-primary' : 'text-muted-foreground'}
            />
            <span className={`text-sm md:text-base font-medium ${currentStep === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
              Analizar
            </span>
          </div>

          <Separator className="w-8 md:w-12" />

          <div 
            className={`flex items-center gap-2 transition-all ${currentStep >= 3 ? 'opacity-100' : 'opacity-40'}`}
            onClick={() => currentStep === 2 && selectedFile && setCurrentStep(3)}
          >
            <div className={`flex items-center gap-2 ${currentStep === 2 && selectedFile ? 'cursor-pointer hover:scale-105' : ''} transition-transform`}>
              <NumberCircleThree 
                size={36} 
                weight={currentStep === 3 ? 'fill' : 'regular'}
                className={currentStep === 3 ? 'text-primary' : 'text-muted-foreground'}
              />
              <span className={`text-sm md:text-base font-medium ${currentStep === 3 ? 'text-foreground' : 'text-muted-foreground'}`}>
                Descargar
              </span>
            </div>
          </div>
        </div>

        {processing.stage === 'error' && (
          <Alert variant="destructive">
            <Warning size={20} />
            <AlertDescription>{processing.message}</AlertDescription>
          </Alert>
        )}

        {['uploading', 'detecting', 'converting'].includes(processing.stage) && (
          <Card>
            <CardHeader>
              <CardTitle>Procesando archivo</CardTitle>
              <CardDescription>{processing.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={processing.progress} />
            </CardContent>
          </Card>
        )}

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <UploadSimple className="text-primary" size={28} />
                    Paso 1: Subir archivos
                  </CardTitle>
                  <CardDescription className="text-base">
                    Arrastra o selecciona los archivos con coordenadas para convertir a UTM30
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    className={`
                      border-2 border-dashed rounded-lg p-12 text-center transition-all
                      ${isDragging 
                        ? 'border-primary bg-primary/10 scale-[1.02]' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-center gap-4">
                        <FileCsv size={40} className="text-primary" weight="duotone" />
                        <FileXls size={40} className="text-primary" weight="duotone" />
                        <File size={40} className="text-primary" weight="duotone" />
                      </div>
                      <div>
                        <p className="text-xl font-semibold mb-2">
                          Arrastra archivos aquí
                        </p>
                        <p className="text-muted-foreground mb-4">
                          o haz clic en el botón para seleccionar
                        </p>
                      </div>
                      <input
                        type="file"
                        id="file-upload"
                        accept=".csv,.xlsx,.xls,.xlsb,.xlsm,.ods,.fods,.doc,.docx,.odt,.rtf,.txt"
                        onChange={handleFileInput}
                        multiple
                        className="hidden"
                      />
                      <Button asChild size="lg" className="text-lg px-8">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <UploadSimple size={20} className="mr-2" />
                          Seleccionar archivos
                        </label>
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <FileCsv size={18} className="text-primary" />
                        Formatos compatibles
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">CSV</Badge>
                        <Badge variant="secondary">Excel</Badge>
                        <Badge variant="secondary">Word</Badge>
                        <Badge variant="secondary">ODT</Badge>
                        <Badge variant="secondary">TXT</Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Globe size={18} className="text-primary" />
                        {getCoordinateSystems().length} sistemas detectados automáticamente
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        WGS84, ETRS89, ED50, UTM zones, Lambert 93, Web Mercator y más
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      ✨ Normalización automática
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      Detecta y corrige automáticamente errores de formato, decimales, caracteres especiales, 
                      y convierte coordenadas DMS a decimal. Normaliza texto para compatibilidad con QGIS.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {currentStep === 2 && selectedFile && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2 text-2xl">
                      <MagnifyingGlass className="text-primary" size={28} />
                      Paso 2: Análisis de datos
                    </div>
                    <Button onClick={handleReset} variant="outline" size="sm">
                      <ArrowsClockwise size={16} className="mr-2" />
                      Nuevo
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-base">
                    Revisa los resultados de la conversión antes de descargar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {processedFiles.length > 1 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Stack size={18} className="text-primary" />
                        Archivos procesados ({processedFiles.length})
                      </h4>
                      <div className="grid gap-2">
                        {processedFiles.map((file) => {
                          const fileValidCoords = file.convertedData.filter(c => c.isValid).length
                          const isSelected = selectedFileId === file.id
                          
                          return (
                            <div
                              key={file.id}
                              onClick={() => setSelectedFileId(file.id)}
                              className={`
                                border rounded-lg p-3 cursor-pointer transition-all
                                ${isSelected 
                                  ? 'border-primary bg-primary/5 shadow-sm' 
                                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <File size={20} className="text-primary flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-medium truncate text-sm">{file.parsedFile.filename}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      {file.detection.system.code} → UTM30 · {fileValidCoords} coordenadas
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveFile(file.id)
                                  }}
                                  size="sm"
                                  variant="ghost"
                                >
                                  <Trash size={16} />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <Separator className="my-4" />
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-3 border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                          <File size={18} />
                          Archivo Original
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700 dark:text-blue-300">Nombre:</span>
                            <span className="font-medium text-blue-900 dark:text-blue-100 truncate max-w-[200px]">
                              {selectedFile.parsedFile.filename}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700 dark:text-blue-300">Tipo:</span>
                            <Badge variant="secondary" className="text-xs">{selectedFile.parsedFile.fileType}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700 dark:text-blue-300">Filas:</span>
                            <span className="font-medium text-blue-900 dark:text-blue-100">
                              {selectedFile.parsedFile.rowCount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700 dark:text-blue-300">Sistema:</span>
                            <Badge className="text-xs bg-blue-600 hover:bg-blue-700">{selectedFile.detection.system.code}</Badge>
                          </div>
                        </div>
                      </div>

                      {originalBounds && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                          <h4 className="font-semibold text-sm">Límites de coordenadas</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div>
                              <span className="text-muted-foreground">Min X:</span>
                              <p className="font-semibold">{formatCoordinate(originalBounds.minX, 6)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max X:</span>
                              <p className="font-semibold">{formatCoordinate(originalBounds.maxX, 6)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Min Y:</span>
                              <p className="font-semibold">{formatCoordinate(originalBounds.minY, 6)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max Y:</span>
                              <p className="font-semibold">{formatCoordinate(originalBounds.maxY, 6)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-3 border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                          <CheckCircle size={18} />
                          Archivo Convertido
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-700 dark:text-green-300">Salida:</span>
                            <span className="font-medium text-green-900 dark:text-green-100 text-xs truncate max-w-[200px]">
                              {getOutputFilename(selectedFile.parsedFile.filename, outputFormat)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700 dark:text-green-300">Sistema:</span>
                            <Badge className="text-xs bg-green-600 hover:bg-green-700">UTM30N (EPSG:25830)</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700 dark:text-green-300">Válidas:</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{validCoords.length}</span>
                          </div>
                          {invalidCoords.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-green-700 dark:text-green-300">Inválidas:</span>
                              <span className="font-semibold text-destructive">{invalidCoords.length}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {convertedBounds && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                          <h4 className="font-semibold text-sm">Límites UTM30 (metros)</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div>
                              <span className="text-muted-foreground">Min X:</span>
                              <p className="font-semibold">{formatCoordinate(convertedBounds.minX, 2)} m</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max X:</span>
                              <p className="font-semibold">{formatCoordinate(convertedBounds.maxX, 2)} m</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Min Y:</span>
                              <p className="font-semibold">{formatCoordinate(convertedBounds.minY, 2)} m</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max Y:</span>
                              <p className="font-semibold">{formatCoordinate(convertedBounds.maxY, 2)} m</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <Tabs defaultValue="stats" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="stats">Resumen</TabsTrigger>
                      <TabsTrigger value="original">Originales</TabsTrigger>
                      <TabsTrigger value="converted">Convertidas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="stats" className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center p-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <CheckCircle size={32} className="text-green-600 mx-auto mb-2" weight="duotone" />
                          <p className="text-3xl font-bold text-green-600">{validCoords.length}</p>
                          <p className="text-sm text-muted-foreground mt-1">Válidas</p>
                        </div>
                        <div className="text-center p-6 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <Warning size={32} className="text-destructive mx-auto mb-2" weight="duotone" />
                          <p className="text-3xl font-bold text-destructive">{invalidCoords.length}</p>
                          <p className="text-sm text-muted-foreground mt-1">Inválidas</p>
                        </div>
                        <div className="text-center p-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <ArrowsClockwise size={32} className="text-blue-600 mx-auto mb-2" weight="duotone" />
                          <p className="text-3xl font-bold text-blue-600">{selectedFile.detection.normalizedCount}</p>
                          <p className="text-sm text-muted-foreground mt-1">Normalizadas</p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="original">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium">Fila</th>
                                <th className="px-4 py-2 text-left font-medium">{selectedFile.detection.xColumn}</th>
                                <th className="px-4 py-2 text-left font-medium">{selectedFile.detection.yColumn}</th>
                                <th className="px-4 py-2 text-left font-medium">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedFile.convertedData.slice(0, 10).map((coord, idx) => (
                                <tr key={idx} className="border-t hover:bg-muted/30">
                                  <td className="px-4 py-2">{idx + 1}</td>
                                  <td className="px-4 py-2 font-mono text-xs">
                                    {formatCoordinate(coord.original.x, 6)}
                                  </td>
                                  <td className="px-4 py-2 font-mono text-xs">
                                    {formatCoordinate(coord.original.y, 6)}
                                  </td>
                                  <td className="px-4 py-2">
                                    {coord.isValid ? (
                                      <Badge variant="outline" className="text-xs">Válida</Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs">Inválida</Badge>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {selectedFile.convertedData.length > 10 && (
                          <div className="bg-muted px-4 py-2 text-xs text-muted-foreground text-center">
                            Mostrando 10 de {selectedFile.convertedData.length} filas
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="converted">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium">Fila</th>
                                <th className="px-4 py-2 text-left font-medium">X_UTM30 (m)</th>
                                <th className="px-4 py-2 text-left font-medium">Y_UTM30 (m)</th>
                                <th className="px-4 py-2 text-left font-medium">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validCoords.slice(0, 10).map((coord, idx) => (
                                <tr key={idx} className="border-t hover:bg-muted/30">
                                  <td className="px-4 py-2">{coord.rowIndex + 1}</td>
                                  <td className="px-4 py-2 font-mono text-xs">{formatCoordinate(coord.converted.x, 2)}</td>
                                  <td className="px-4 py-2 font-mono text-xs">{formatCoordinate(coord.converted.y, 2)}</td>
                                  <td className="px-4 py-2">
                                    <Badge variant="outline" className="text-xs">Convertida</Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {validCoords.length > 10 && (
                          <div className="bg-muted px-4 py-2 text-xs text-muted-foreground text-center">
                            Mostrando 10 de {validCoords.length} coordenadas válidas
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-center pt-4">
                    <Button 
                      onClick={() => setCurrentStep(3)} 
                      size="lg"
                      className="text-lg px-8"
                    >
                      Continuar a descarga
                      <DownloadSimple size={20} className="ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {processedFiles.length === 0 && (
                <div className="text-center">
                  <input
                    type="file"
                    id="file-upload-more"
                    accept=".csv,.xlsx,.xls,.xlsb,.xlsm,.ods,.fods,.doc,.docx,.odt,.rtf,.txt"
                    onChange={handleFileInput}
                    multiple
                    className="hidden"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="file-upload-more" className="cursor-pointer">
                      <UploadSimple size={18} className="mr-2" />
                      Añadir más archivos
                    </label>
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 3 && selectedFile && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2 text-2xl">
                      <DownloadSimple className="text-primary" size={28} />
                      Paso 3: Descargar resultados
                    </div>
                    <Button onClick={() => setCurrentStep(2)} variant="outline" size="sm">
                      Volver al análisis
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-base">
                    Elige el formato y descarga tus coordenadas convertidas a UTM30
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-bold mb-2">Selecciona el formato de salida</h3>
                        <p className="text-muted-foreground">
                          {validCoords.length} coordenadas listas para descargar
                        </p>
                      </div>
                      <Select value={outputFormat} onValueChange={(value: 'csv' | 'xlsx' | 'geojson' | 'kml') => setOutputFormat(value)}>
                        <SelectTrigger className="w-full md:w-[240px] h-14 text-lg font-semibold border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv" className="text-lg">
                            <div className="flex items-center gap-2">
                              <FileCsv size={20} />
                              CSV
                            </div>
                          </SelectItem>
                          <SelectItem value="xlsx" className="text-lg">
                            <div className="flex items-center gap-2">
                              <FileXls size={20} />
                              Excel (XLSX)
                            </div>
                          </SelectItem>
                          <SelectItem value="geojson" className="text-lg">
                            <div className="flex items-center gap-2">
                              <MapPin size={20} />
                              GeoJSON
                            </div>
                          </SelectItem>
                          <SelectItem value="kml" className="text-lg">
                            <div className="flex items-center gap-2">
                              <Globe size={20} />
                              KML
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-6 space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <File size={18} className="text-primary" />
                        Archivo seleccionado
                      </h4>
                      <p className="text-sm font-medium truncate">{selectedFile.parsedFile.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedFile.detection.system.code} → UTM30N
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6 space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckCircle size={18} className="text-green-600" />
                        Resumen
                      </h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Válidas:</span>
                        <span className="font-semibold text-green-600">{validCoords.length}</span>
                      </div>
                      {invalidCoords.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Inválidas:</span>
                          <span className="font-semibold text-destructive">{invalidCoords.length}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <Button 
                      onClick={() => handleDownload()} 
                      size="lg"
                      className="text-lg px-10 w-full sm:w-auto"
                    >
                      <DownloadSimple size={22} className="mr-2" weight="bold" />
                      Descargar archivo
                    </Button>

                    {processedFiles.length > 1 && (
                      <Button 
                        onClick={handleDownloadAll} 
                        variant="outline"
                        size="lg"
                        className="text-lg px-10 w-full sm:w-auto"
                      >
                        <Package size={22} className="mr-2" />
                        Descargar todos ({processedFiles.length})
                      </Button>
                    )}
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <input
                      type="file"
                      id="file-upload-another"
                      accept=".csv,.xlsx,.xls,.xlsb,.xlsm,.ods,.fods,.doc,.docx,.odt,.rtf,.txt"
                      onChange={handleFileInput}
                      multiple
                      className="hidden"
                    />
                    <Button asChild variant="outline" size="lg">
                      <label htmlFor="file-upload-another" className="cursor-pointer">
                        <UploadSimple size={18} className="mr-2" />
                        Convertir más archivos
                      </label>
                    </Button>

                    <Button onClick={handleReset} variant="outline" size="lg">
                      <ArrowsClockwise size={18} className="mr-2" />
                      Comenzar de nuevo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
