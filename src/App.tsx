import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
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
    setProcessedFiles(prev => prev.filter(f => f.id !== fileId))
    if (selectedFileId === fileId) {
      setSelectedFileId(processedFiles[0]?.id || null)
    }
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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
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
                  border-2 border-dashed rounded-lg p-12 text-center transition-all
                  ${isDragging 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }
                `}
              >
                <div className="space-y-4">
                  <div className="flex justify-center gap-3">
                    <FileCsv size={32} className="text-muted-foreground" />
                    <FileXls size={32} className="text-muted-foreground" />
                    <File size={32} className="text-muted-foreground" />
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
                  <Button asChild className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Seleccionar archivo(s)
                    </label>
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Sistemas de coordenadas compatibles ({getCoordinateSystems().length}):</h4>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {getCoordinateSystems().map(sys => (
                      <Badge key={sys.code} variant="outline" className="text-xs">
                        {sys.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mt-4">
                  <p className="text-sm text-accent-foreground font-medium mb-1">✨ Normalización automática</p>
                  <p className="text-xs text-muted-foreground">
                    El sistema detecta y corrige automáticamente coordenadas con errores de formato, 
                    caracteres extraños, comas o puntos decimales incorrectos, y coordenadas en formato 
                    grados/minutos/segundos (DMS).
                  </p>
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
            <CardContent className="space-y-4">
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
                <div className="space-y-3">
                  {processedFiles.map((file) => {
                    const fileValidCoords = file.convertedData.filter(c => c.isValid).length
                    const fileInvalidCoords = file.convertedData.length - fileValidCoords
                    const isSelected = selectedFileId === file.id
                    
                    return (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFileId(file.id)}
                        className={`
                          border rounded-lg p-4 cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-border hover:border-primary/50 hover:bg-muted/30'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
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

                <Separator className="my-4" />

                <div className="flex justify-center gap-3">
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
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="text-primary" size={24} />
                      Información del archivo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Nombre del archivo</p>
                        <p className="font-medium truncate">{selectedFile.parsedFile.filename}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Tipo de archivo</p>
                        <Badge>{selectedFile.parsedFile.fileType}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Filas totales</p>
                        <p className="font-medium">{selectedFile.parsedFile.rowCount.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Columnas</p>
                        <p className="font-medium">{selectedFile.parsedFile.columnCount}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Globe className="text-primary" size={20} />
                        <h4 className="font-medium">Sistema de coordenadas detectado</h4>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Sistema</span>
                          <Badge variant="secondary">{selectedFile.detection.system.name}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Código</span>
                          <span className="font-mono text-sm">{selectedFile.detection.system.code}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Columna X</span>
                          <span className="font-medium text-sm">{selectedFile.detection.xColumn}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Columna Y</span>
                          <span className="font-medium text-sm">{selectedFile.detection.yColumn}</span>
                        </div>
                        {selectedFile.detection.normalizedCount > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <span className="text-sm text-muted-foreground">Coordenadas normalizadas</span>
                            <Badge variant="default" className="bg-green-600 text-white">
                              {selectedFile.detection.normalizedCount}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {invalidCoords.length > 0 && (
                      <>
                        <Separator />
                        <Alert variant="destructive">
                          <Warning size={20} />
                          <AlertDescription>
                            {invalidCoords.length} coordenada{invalidCoords.length > 1 ? 's' : ''} no {invalidCoords.length > 1 ? 'pasaron' : 'pasó'} la validación y será{invalidCoords.length > 1 ? 'n' : ''} excluida{invalidCoords.length > 1 ? 's' : ''} del archivo de salida
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
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

                      <TabsContent value="stats" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Coordenadas originales</h4>
                            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                              {originalBounds ? (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Mín. X:</span>
                                    <span className="font-mono">{formatCoordinate(originalBounds.minX, 6)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Máx. X:</span>
                                    <span className="font-mono">{formatCoordinate(originalBounds.maxX, 6)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Mín. Y:</span>
                                    <span className="font-mono">{formatCoordinate(originalBounds.minY, 6)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Máx. Y:</span>
                                    <span className="font-mono">{formatCoordinate(originalBounds.maxY, 6)}</span>
                                  </div>
                                </>
                              ) : (
                                <p className="text-muted-foreground">No hay coordenadas válidas</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Convertidas a UTM30</h4>
                            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                              {convertedBounds ? (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Mín. X:</span>
                                    <span className="font-mono">{formatCoordinate(convertedBounds.minX, 2)} m</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Máx. X:</span>
                                    <span className="font-mono">{formatCoordinate(convertedBounds.maxX, 2)} m</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Mín. Y:</span>
                                    <span className="font-mono">{formatCoordinate(convertedBounds.minY, 2)} m</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Máx. Y:</span>
                                    <span className="font-mono">{formatCoordinate(convertedBounds.maxY, 2)} m</span>
                                  </div>
                                </>
                              ) : (
                                <p className="text-muted-foreground">No hay coordenadas válidas</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-2xl font-semibold text-green-600">{validCoords.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">Coordenadas válidas</p>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-2xl font-semibold">{invalidCoords.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">Inválidas</p>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <p className="text-2xl font-semibold">{selectedFile.parsedFile.columnCount}</p>
                            <p className="text-xs text-muted-foreground mt-1">Columnas totales</p>
                          </div>
                          <div className="text-center p-4 bg-accent/10 rounded-lg">
                            <p className="text-2xl font-semibold text-accent-foreground">UTM30N</p>
                            <p className="text-xs text-muted-foreground mt-1">EPSG:25830</p>
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
                                      {coord.normalizedFrom && (
                                        <span className="ml-1 text-accent" title={coord.normalizedFrom}>✓</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">
                                      {formatCoordinate(coord.original.y, 6)}
                                    </td>
                                    <td className="px-4 py-2">
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
                            <div className="bg-muted px-4 py-2 text-xs text-muted-foreground text-center">
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
                  </CardContent>
                </Card>

                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p>
                    <strong>Archivo de salida:</strong> {getOutputFilename(selectedFile.parsedFile.filename)}
                  </p>
                  <p className="mt-1">
                    Formato: CSV con coordenadas UTM30 (EPSG:25830), optimizado para importar en QGIS
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
