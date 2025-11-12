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
  Package
} from '@phosphor-icons/react'
import { parseFile, generateCSV, downloadCSV, getOutputFilename, type ParsedFile } from '@/lib/fileParser'
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
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [processing, setProcessing] = useState<ProcessingState>({
    stage: 'idle',
    progress: 0,
    message: ''
  })
  const [isDragging, setIsDragging] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [outputFormat, setOutputFormat] = useState<'csv' | 'xlsx' | 'geojson' | 'kml'>('csv')
  
  const selectedFile = processedFiles.find(f => f.id === selectedFileId)

  useEffect(() => {
    if (showSuccessAlert) {
      const timer = setTimeout(() => {
        setShowSuccessAlert(false)
      }, 3500)
      return () => clearTimeout(timer)
    }
  }, [showSuccessAlert])

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
          
          setProcessing({ 
            stage: 'complete', 
            progress: 100, 
            message: `¡Conversión completada! ${validCount} coordenadas convertidas${invalidCount > 0 ? `, ${invalidCount} fallidas` : ''}` 
          })

          setShowSuccessAlert(true)

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

    const csvContent = generateCSV(
      file.parsedFile.data,
      file.detection.xColumn,
      file.detection.yColumn,
      file.convertedData.map(c => ({ x: c.converted.x, y: c.converted.y, isValid: c.isValid }))
    )

    const filename = getOutputFilename(file.parsedFile.filename)
    downloadCSV(csvContent, filename)

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
        const csvContent = generateCSV(
          file.parsedFile.data,
          file.detection.xColumn,
          file.detection.yColumn,
          file.convertedData.map(c => ({ x: c.converted.x, y: c.converted.y, isValid: c.isValid }))
        )
        
        const filename = getOutputFilename(file.parsedFile.filename)
        zip.file(filename, csvContent)
      })
      
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = 'coordenadas_UTM30.zip'
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
        setShowSuccessAlert(false)
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
    setShowSuccessAlert(false)
  }

  const validCoords = selectedFile ? selectedFile.convertedData.filter(c => c.isValid) : []
  const invalidCoords = selectedFile ? selectedFile.convertedData.filter(c => !c.isValid) : []
  const originalBounds = selectedFile ? calculateBounds(selectedFile.detection.sampleCoords) : null
  const convertedBounds = validCoords.length > 0 
    ? calculateBounds(validCoords.map(c => c.converted)) 
    : null

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Conversor de coordenadas UTM30
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Conversor automático de coordenadas para QGIS y aplicaciones SIG
          </p>
        </div>

        {processing.stage === 'idle' && processedFiles.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadSimple className="text-primary" size={24} />
                Cargar archivo(s)
              </CardTitle>
              <CardDescription>
                Compatible con múltiples archivos simultáneos: CSV, Excel (XLS/XLSX/XLSM/XLSB), OpenDocument (ODS), documentos de Word (DOC/DOCX), OpenDocument Text (ODT), RTF y TXT con datos tabulares
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-all
                  ${isDragging 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }
                `}
              >
                <div className="space-y-3">
                  <div className="flex justify-center gap-3">
                    <FileCsv size={28} className="text-muted-foreground" />
                    <FileXls size={28} className="text-muted-foreground" />
                    <File size={28} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-1">
                      Arrastra tus archivos aquí o haz clic para seleccionarlos
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Múltiples formatos y archivos compatibles, hasta 50 MB por archivo
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
                  <Button asChild className="mt-2">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Seleccionar archivo(s)
                    </label>
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-medium">Formatos compatibles:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">CSV</Badge>
                    <Badge variant="secondary">Excel (XLS, XLSX, XLSM, XLSB)</Badge>
                    <Badge variant="secondary">OpenDocument (ODS, FODS)</Badge>
                    <Badge variant="secondary">Word (DOC, DOCX)</Badge>
                    <Badge variant="secondary">OpenDocument Text (ODT)</Badge>
                    <Badge variant="secondary">RTF</Badge>
                    <Badge variant="secondary">TXT</Badge>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-medium">Sistemas de coordenadas compatibles ({getCoordinateSystems().length}):</h4>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {getCoordinateSystems().map(sys => (
                      <Badge key={sys.code} variant="outline" className="text-xs">
                        {sys.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900 font-semibold mb-1">✨ Normalización automática completa</p>
                  <p className="text-xs text-blue-700 leading-relaxed mb-2">
                    <strong>Coordenadas:</strong> se detecta y corrige automáticamente errores de formato, caracteres extraños, comas o puntos decimales incorrectos así como coordenadas en formato grados/minutos/segundos (DMS).
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    La conversión se hace a texto UTF-8 (ES). Todas las columnas de texto se normalizan para compatibilidad con GIS/QGIS: conversión a ASCII (elimina tildes y diacríticos), unificación de comillas y guiones, eliminación de caracteres de control y codificación UTF-8 con BOM para correcta visualización en QGIS.
                  </p>
                </div>
                <div className="bg-purple-50/80 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-lg text-purple-900 font-bold mb-1.5">📄 Formato de salida</p>
                      <p className="text-sm text-purple-700">
                        Selecciona el formato en el que deseas exportar las coordenadas convertidas
                      </p>
                    </div>
                    <Select value={outputFormat} onValueChange={(value: 'csv' | 'xlsx' | 'geojson' | 'kml') => setOutputFormat(value)}>
                      <SelectTrigger className="w-[180px] h-12 bg-white text-base font-semibold border-2 border-purple-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv" className="text-base">CSV</SelectItem>
                        <SelectItem value="xlsx" className="text-base">Excel (XLSX)</SelectItem>
                        <SelectItem value="geojson" className="text-base">GeoJSON</SelectItem>
                        <SelectItem value="kml" className="text-base">KML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {processing.stage === 'error' && (
          <Alert variant="destructive">
            <Warning size={20} />
            <AlertDescription>{processing.message}</AlertDescription>
          </Alert>
        )}

        {processedFiles.length > 0 && (
          <>
            <AnimatePresence>
              {showSuccessAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert className="bg-green-50 border-green-300">
                    <CheckCircle size={20} className="text-green-600" />
                    <AlertDescription className="text-green-800">
                      {processing.message}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Stack className="text-primary" size={24} />
                    Archivos procesados ({processedFiles.length})
                  </div>
                  <Button onClick={handleReset} variant="outline" size="sm">
                    <ArrowsClockwise size={16} className="mr-2" />
                    Reiniciar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {processedFiles.map((file) => {
                    const fileValidCoords = file.convertedData.filter(c => c.isValid).length
                    const fileInvalidCoords = file.convertedData.length - fileValidCoords
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
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <File size={20} className="text-primary" />
                              <h4 className="font-medium truncate">{file.parsedFile.filename}</h4>
                              <Badge variant="secondary" className="text-xs">{file.parsedFile.fileType}</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Sistema: </span>
                                <span className="font-medium">{file.detection.system.code}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Filas: </span>
                                <span className="font-medium">{file.parsedFile.rowCount.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Válidas: </span>
                                <span className="font-medium text-green-600">{fileValidCoords}</span>
                              </div>
                              {fileInvalidCoords > 0 && (
                                <div>
                                  <span className="text-muted-foreground">Inválidas: </span>
                                  <span className="font-medium text-destructive">{fileInvalidCoords}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(file.id)
                              }}
                              size="sm"
                              variant="outline"
                            >
                              <DownloadSimple size={16} />
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveFile(file.id)
                              }}
                              size="sm"
                              variant="outline"
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <Separator className="my-3" />

                <div className="flex justify-center items-center gap-6">
                  <input
                    type="file"
                    id="file-upload-more"
                    accept=".csv,.xlsx,.xls,.xlsb,.xlsm,.ods,.fods,.doc,.docx,.odt,.rtf,.txt"
                    onChange={handleFileInput}
                    multiple
                    className="hidden"
                  />
                  <Button asChild variant="outline" className="border-blue-300/50 bg-blue-100 hover:bg-blue-150">
                    <label htmlFor="file-upload-more" className="cursor-pointer">
                      <UploadSimple size={20} className="mr-2" />
                      Añadir más archivos
                    </label>
                  </Button>
                  
                  <Select value={outputFormat} onValueChange={(value: 'csv' | 'xlsx' | 'geojson' | 'kml') => setOutputFormat(value)}>
                    <SelectTrigger className="w-[180px] h-11 bg-white text-base font-semibold border-2 border-purple-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv" className="text-base">CSV</SelectItem>
                      <SelectItem value="xlsx" className="text-base">Excel (XLSX)</SelectItem>
                      <SelectItem value="geojson" className="text-base">GeoJSON</SelectItem>
                      <SelectItem value="kml" className="text-base">KML</SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedFile && (
                    <Button 
                      onClick={() => handleDownload()} 
                      variant="outline" 
                      className="border-purple-300/50 bg-purple-100 hover:bg-purple-150"
                    >
                      <DownloadSimple size={20} className="mr-2" />
                      Descargar
                    </Button>
                  )}
                  {processedFiles.length > 1 && (
                    <Button onClick={handleDownloadAll} variant="outline" className="border-green-300/50 bg-green-100 hover:bg-green-150">
                      <Package size={20} className="mr-2" />
                      Descargar todos (ZIP)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedFile && (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="text-primary" size={18} />
                      <span className="font-semibold">Información del archivo</span>
                      <span className="text-muted-foreground mx-2">›</span>
                      <File className="text-blue-600" size={16} />
                      <span className="text-muted-foreground">Archivo Original</span>
                      <span className="text-muted-foreground mx-2">›</span>
                      <ArrowsClockwise className="text-green-600" size={16} />
                      <span className="text-muted-foreground">Archivo Convertido</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div className="space-y-3">
                        
                        <div className="bg-blue-50/40 rounded-lg p-2.5 space-y-2 border border-blue-200/40">
                          <div className="grid grid-cols-[1fr_auto] gap-2 items-baseline">
                            <p className="text-xs text-muted-foreground">Nombre</p>
                            <p className="font-medium text-xs text-right truncate max-w-[200px]">{selectedFile.parsedFile.filename}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                              <p className="text-xs text-muted-foreground">Tipo</p>
                              <Badge variant="secondary" className="text-xs justify-self-end">{selectedFile.parsedFile.fileType}</Badge>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-baseline">
                              <p className="text-xs text-muted-foreground">Columnas</p>
                              <p className="font-medium text-xs text-right">{selectedFile.parsedFile.columnCount}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-[1fr_auto] gap-2 items-baseline">
                            <p className="text-xs text-muted-foreground">Filas totales</p>
                            <p className="font-semibold text-sm text-right">{selectedFile.parsedFile.rowCount.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Globe className="text-blue-600" size={16} />
                            <h4 className="font-medium text-xs">Sistema detectado</h4>
                          </div>
                          <div className="bg-blue-50/40 rounded-lg p-2 space-y-1 text-xs border border-blue-200/40">
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                              <span className="text-muted-foreground">Sistema</span>
                              <Badge variant="secondary" className="text-xs justify-self-end">{selectedFile.detection.system.name}</Badge>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-baseline">
                              <span className="text-muted-foreground">Código</span>
                              <span className="font-mono text-right">{selectedFile.detection.system.code}</span>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-baseline">
                              <span className="text-muted-foreground">Columna X</span>
                              <span className="font-medium text-right">{selectedFile.detection.xColumn}</span>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-baseline">
                              <span className="text-muted-foreground">Columna Y</span>
                              <span className="font-medium text-right">{selectedFile.detection.yColumn}</span>
                            </div>
                          </div>
                        </div>

                        {originalBounds && (
                          <div className="space-y-1">
                            <h4 className="font-medium text-xs">Límites de coordenadas</h4>
                            <div className="bg-blue-50/40 rounded-lg p-2 space-y-0.5 text-xs border border-blue-200/40">
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <span className="text-muted-foreground">Mín. X:</span>
                                <span className="font-mono text-right">{formatCoordinate(originalBounds.minX, 6)}</span>
                              </div>
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <span className="text-muted-foreground">Máx. X:</span>
                                <span className="font-mono text-right">{formatCoordinate(originalBounds.maxX, 6)}</span>
                              </div>
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <span className="text-muted-foreground">Mín. Y:</span>
                                <span className="font-mono text-right">{formatCoordinate(originalBounds.minY, 6)}</span>
                              </div>
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <span className="text-muted-foreground">Máx. Y:</span>
                                <span className="font-mono text-right">{formatCoordinate(originalBounds.maxY, 6)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        
                        <div className="bg-green-50/40 rounded-lg p-2.5 space-y-2 border border-green-200/40">
                          <div className="grid grid-cols-[1fr_auto] gap-2 items-baseline">
                            <p className="text-xs text-muted-foreground">Nombre de salida</p>
                            <p className="font-medium text-xs text-right truncate max-w-[200px]">{getOutputFilename(selectedFile.parsedFile.filename)}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                              <p className="text-xs text-muted-foreground">Formato</p>
                              <Badge variant="outline" className="text-xs justify-self-end">CSV</Badge>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                              <p className="text-xs text-muted-foreground">Sistema</p>
                              <Badge className="bg-green-600 text-white hover:bg-green-700 text-xs justify-self-end">UTM30N</Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-[1fr_auto] gap-2 items-baseline">
                            <p className="text-xs text-muted-foreground">Código EPSG</p>
                            <p className="font-mono font-medium text-xs text-right">EPSG:25830</p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="font-medium text-xs">Estadísticas de conversión</h4>
                          <div className="space-y-1">
                            <div className="bg-green-50/40 border border-green-200/40 rounded-lg p-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle size={16} className="text-green-600" />
                                  <span className="text-xs font-medium">Válidas</span>
                                </div>
                                <span className="text-base font-semibold text-green-600">{validCoords.length}</span>
                              </div>
                            </div>
                            
                            {invalidCoords.length > 0 && (
                              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Warning size={16} className="text-destructive" />
                                    <span className="text-xs font-medium">Inválidas</span>
                                  </div>
                                  <span className="text-base font-semibold text-destructive">{invalidCoords.length}</span>
                                </div>
                              </div>
                            )}

                            {selectedFile.detection.normalizedCount > 0 && (
                              <div className="bg-blue-50/40 border border-blue-200/40 rounded-lg p-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <ArrowsClockwise size={16} className="text-blue-600" />
                                    <span className="text-xs font-medium">Normalizadas</span>
                                  </div>
                                  <span className="text-base font-semibold text-blue-600">{selectedFile.detection.normalizedCount}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {convertedBounds && (
                          <div className="space-y-1">
                            <h4 className="font-medium text-xs">Límites UTM30 (metros)</h4>
                            <div className="bg-green-50/40 rounded-lg p-2 space-y-0.5 text-xs border border-green-200/40">
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <span className="text-muted-foreground">Mín. X:</span>
                                <span className="font-mono text-right">{formatCoordinate(convertedBounds.minX, 2)} m</span>
                              </div>
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <span className="text-muted-foreground">Máx. X:</span>
                                <span className="font-mono text-right">{formatCoordinate(convertedBounds.maxX, 2)} m</span>
                              </div>
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <span className="text-muted-foreground">Mín. Y:</span>
                                <span className="font-mono text-right">{formatCoordinate(convertedBounds.minY, 2)} m</span>
                              </div>
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <span className="text-muted-foreground">Máx. Y:</span>
                                <span className="font-mono text-right">{formatCoordinate(convertedBounds.maxY, 2)} m</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {invalidCoords.length > 0 && (
                          <Alert variant="destructive" className="py-2">
                            <Warning size={16} />
                            <AlertDescription className="text-xs">
                              {invalidCoords.length} coordenada{invalidCoords.length > 1 ? 's' : ''} excluida{invalidCoords.length > 1 ? 's' : ''} del archivo de salida
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Datos de coordenadas</CardTitle>
                    <CardDescription>Vista previa de las coordenadas originales y convertidas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="stats" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="stats">Estadísticas</TabsTrigger>
                        <TabsTrigger value="original">Originales</TabsTrigger>
                        <TabsTrigger value="converted">UTM30</TabsTrigger>
                      </TabsList>

                      <TabsContent value="stats" className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-3xl font-semibold text-green-600">{validCoords.length}</p>
                            <p className="text-sm text-muted-foreground mt-1.5">Coordenadas válidas</p>
                          </div>
                          <div className="text-center p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <p className="text-3xl font-semibold text-destructive">{invalidCoords.length}</p>
                            <p className="text-sm text-muted-foreground mt-1.5">Inválidas</p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-3xl font-semibold text-blue-600">{selectedFile.detection.normalizedCount}</p>
                            <p className="text-sm text-muted-foreground mt-1.5">Normalizadas</p>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-semibold">{selectedFile.parsedFile.rowCount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Filas procesadas</p>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-2xl font-semibold">{selectedFile.parsedFile.columnCount}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Columnas totales</p>
                          </div>
                          <div className="text-center p-3 bg-accent/10 rounded-lg border border-accent/20">
                            <p className="text-2xl font-semibold text-accent-foreground">UTM30N</p>
                            <p className="text-xs text-muted-foreground mt-0.5">EPSG:25830</p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="original">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-3 py-1.5 text-left font-medium">Fila</th>
                                  <th className="px-3 py-1.5 text-left font-medium">{selectedFile.detection.xColumn}</th>
                                  <th className="px-3 py-1.5 text-left font-medium">{selectedFile.detection.yColumn}</th>
                                  <th className="px-3 py-1.5 text-left font-medium">Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedFile.convertedData.slice(0, 10).map((coord, idx) => (
                                  <tr key={idx} className="border-t hover:bg-muted/30">
                                    <td className="px-3 py-1.5">{idx + 1}</td>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                      {formatCoordinate(coord.original.x, 6)}
                                      {coord.normalizedFrom && (
                                        <span className="ml-1 text-accent" title={coord.normalizedFrom}>✓</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                      {formatCoordinate(coord.original.y, 6)}
                                    </td>
                                    <td className="px-3 py-1.5">
                                      {coord.isValid ? (
                                        <Badge variant="outline" className="text-xs">Válida</Badge>
                                      ) : (
                                        <Badge variant="destructive" className="text-xs" title={coord.error}>
                                          Inválida
                                        </Badge>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {selectedFile.convertedData.length > 10 && (
                            <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground text-center">
                              Mostrando 10 de {selectedFile.convertedData.length} filas.
                              {selectedFile.convertedData.filter(c => c.normalizedFrom).length > 0 && (
                                <span className="ml-2 text-accent">
                                  ✓ = Coordenada normalizada automáticamente
                                </span>
                              )}
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
                                  <th className="px-3 py-1.5 text-left font-medium">Fila</th>
                                  <th className="px-3 py-1.5 text-left font-medium">X_UTM30 (m)</th>
                                  <th className="px-3 py-1.5 text-left font-medium">Y_UTM30 (m)</th>
                                  <th className="px-3 py-1.5 text-left font-medium">Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {validCoords.slice(0, 10).map((coord, idx) => (
                                  <tr key={idx} className="border-t hover:bg-muted/30">
                                    <td className="px-3 py-1.5">{coord.rowIndex + 1}</td>
                                    <td className="px-3 py-1.5 font-mono text-xs">{formatCoordinate(coord.converted.x, 2)}</td>
                                    <td className="px-3 py-1.5 font-mono text-xs">{formatCoordinate(coord.converted.y, 2)}</td>
                                    <td className="px-3 py-1.5">
                                      <Badge variant="outline" className="text-xs">Convertida</Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {validCoords.length > 10 && (
                            <div className="bg-muted px-3 py-1.5 text-xs text-muted-foreground text-center">
                              Mostrando 10 de {validCoords.length} coordenadas válidas
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
