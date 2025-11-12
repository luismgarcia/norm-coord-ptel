import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  UploadSimple, 
  FileCsv, 
  FileXls, 
  MapPin, 
  CheckCircle, 
  Warning,
  DownloadSimple,
  ArrowsClockwise,
  Globe
} from '@phosphor-icons/react'
import { parseFile, generateCSV, downloadCSV, getOutputFilename, type ParsedFile } from '@/lib/fileParser'
import { 
  detectCoordinateSystem, 
  convertToUTM30,
  calculateBounds,
  formatCoordinate,
  type DetectionResult,
  type CoordinateData 
} from '@/lib/coordinateUtils'
import { toast } from 'sonner'

interface ProcessingState {
  stage: 'idle' | 'uploading' | 'detecting' | 'converting' | 'complete' | 'error'
  progress: number
  message: string
}

function App() {
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [detection, setDetection] = useState<DetectionResult | null>(null)
  const [convertedData, setConvertedData] = useState<CoordinateData[]>([])
  const [processing, setProcessing] = useState<ProcessingState>({
    stage: 'idle',
    progress: 0,
    message: ''
  })
  const [isDragging, setIsDragging] = useState(false)

  const handleFileUpload = async (file: File) => {
    setProcessing({ stage: 'uploading', progress: 10, message: 'Reading file...' })

    try {
      const parsed = await parseFile(file)
      setParsedFile(parsed)
      setProcessing({ stage: 'detecting', progress: 40, message: 'Detecting coordinate system...' })

      setTimeout(() => {
        const detected = detectCoordinateSystem(parsed.data)
        
        if (!detected) {
          throw new Error('Could not detect coordinate columns. Please ensure your file contains coordinate data.')
        }

        setDetection(detected)
        setProcessing({ stage: 'converting', progress: 70, message: 'Converting to UTM30...' })

        setTimeout(() => {
          const converted = convertToUTM30(
            parsed.data,
            detected.system.code,
            detected.xColumn,
            detected.yColumn
          )

          setConvertedData(converted)
          
          const validCount = converted.filter(c => c.isValid).length
          const invalidCount = converted.length - validCount

          setProcessing({ 
            stage: 'complete', 
            progress: 100, 
            message: `Conversion complete! ${validCount} coordinates converted${invalidCount > 0 ? `, ${invalidCount} failed` : ''}` 
          })

          toast.success('Conversion complete', {
            description: `Successfully converted ${validCount} coordinates to UTM30`
          })
        }, 500)
      }, 500)

    } catch (error) {
      setProcessing({ 
        stage: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'An error occurred' 
      })
      toast.error('Processing failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDownload = () => {
    if (!parsedFile || !detection || convertedData.length === 0) return

    const csvContent = generateCSV(
      parsedFile.data,
      detection.xColumn,
      detection.yColumn,
      convertedData.map(c => ({ x: c.converted.x, y: c.converted.y, isValid: c.isValid }))
    )

    const filename = getOutputFilename(parsedFile.filename)
    downloadCSV(csvContent, filename)

    toast.success('File downloaded', {
      description: `Saved as ${filename}`
    })
  }

  const handleReset = () => {
    setParsedFile(null)
    setDetection(null)
    setConvertedData([])
    setProcessing({ stage: 'idle', progress: 0, message: '' })
  }

  const validCoords = convertedData.filter(c => c.isValid)
  const invalidCoords = convertedData.filter(c => !c.isValid)
  const originalBounds = detection ? calculateBounds(detection.sampleCoords) : null
  const convertedBounds = validCoords.length > 0 
    ? calculateBounds(validCoords.map(c => c.converted)) 
    : null

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            UTM30 Coordinate Converter
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Professional coordinate transformation for QGIS and GIS applications
          </p>
        </div>

        {processing.stage === 'idle' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadSimple className="text-primary" size={24} />
                Upload File
              </CardTitle>
              <CardDescription>
                Supports CSV, Excel (.xlsx, .xls) formats with coordinate data
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
                  </div>
                  <div>
                    <p className="text-lg font-medium mb-1">
                      Drop your file here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      CSV, XLSX, or XLS files up to 50MB
                    </p>
                  </div>
                  <input
                    type="file"
                    id="file-upload"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <Button asChild className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Select File
                    </label>
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-medium">Supported Coordinate Systems:</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">WGS84</Badge>
                  <Badge variant="outline">ETRS89</Badge>
                  <Badge variant="outline">ED50 UTM30</Badge>
                  <Badge variant="outline">Geographic (Lat/Lon)</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {['uploading', 'detecting', 'converting'].includes(processing.stage) && (
          <Card>
            <CardHeader>
              <CardTitle>Processing File</CardTitle>
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

        {processing.stage === 'complete' && parsedFile && detection && (
          <>
            <Alert className="bg-accent/10 border-accent">
              <CheckCircle size={20} className="text-accent-foreground" />
              <AlertDescription className="text-accent-foreground">
                {processing.message}
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="text-primary" size={24} />
                  File Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Filename</p>
                    <p className="font-medium truncate">{parsedFile.filename}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">File Type</p>
                    <Badge>{parsedFile.fileType}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                    <p className="font-medium">{parsedFile.rowCount.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Columns</p>
                    <p className="font-medium">{parsedFile.columnCount}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="text-primary" size={20} />
                    <h4 className="font-medium">Detected Coordinate System</h4>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">System</span>
                      <Badge variant="secondary">{detection.system.name}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Code</span>
                      <span className="font-mono text-sm">{detection.system.code}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">X Column</span>
                      <span className="font-medium text-sm">{detection.xColumn}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Y Column</span>
                      <span className="font-medium text-sm">{detection.yColumn}</span>
                    </div>
                  </div>
                </div>

                {invalidCoords.length > 0 && (
                  <>
                    <Separator />
                    <Alert variant="destructive">
                      <Warning size={20} />
                      <AlertDescription>
                        {invalidCoords.length} coordinate{invalidCoords.length > 1 ? 's' : ''} failed validation and will be excluded from the output
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coordinate Data</CardTitle>
                <CardDescription>Preview of original and converted coordinates</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="stats" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="stats">Statistics</TabsTrigger>
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="converted">UTM30</TabsTrigger>
                  </TabsList>

                  <TabsContent value="stats" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Original Coordinates</h4>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                          {originalBounds ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Min X:</span>
                                <span className="font-mono">{formatCoordinate(originalBounds.minX, 6)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Max X:</span>
                                <span className="font-mono">{formatCoordinate(originalBounds.maxX, 6)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Min Y:</span>
                                <span className="font-mono">{formatCoordinate(originalBounds.minY, 6)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Max Y:</span>
                                <span className="font-mono">{formatCoordinate(originalBounds.maxY, 6)}</span>
                              </div>
                            </>
                          ) : (
                            <p className="text-muted-foreground">No valid coordinates</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Converted to UTM30</h4>
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                          {convertedBounds ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Min X:</span>
                                <span className="font-mono">{formatCoordinate(convertedBounds.minX, 2)} m</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Max X:</span>
                                <span className="font-mono">{formatCoordinate(convertedBounds.maxX, 2)} m</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Min Y:</span>
                                <span className="font-mono">{formatCoordinate(convertedBounds.minY, 2)} m</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Max Y:</span>
                                <span className="font-mono">{formatCoordinate(convertedBounds.maxY, 2)} m</span>
                              </div>
                            </>
                          ) : (
                            <p className="text-muted-foreground">No valid coordinates</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-primary/5 rounded-lg">
                        <p className="text-2xl font-semibold text-primary">{validCoords.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Valid Coordinates</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-semibold">{invalidCoords.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Invalid</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <p className="text-2xl font-semibold">{parsedFile.columnCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total Columns</p>
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
                              <th className="px-4 py-2 text-left font-medium">Row</th>
                              <th className="px-4 py-2 text-left font-medium">{detection.xColumn}</th>
                              <th className="px-4 py-2 text-left font-medium">{detection.yColumn}</th>
                              <th className="px-4 py-2 text-left font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {convertedData.slice(0, 10).map((coord, idx) => (
                              <tr key={idx} className="border-t hover:bg-muted/30">
                                <td className="px-4 py-2">{idx + 1}</td>
                                <td className="px-4 py-2 font-mono text-xs">{formatCoordinate(coord.original.x, 6)}</td>
                                <td className="px-4 py-2 font-mono text-xs">{formatCoordinate(coord.original.y, 6)}</td>
                                <td className="px-4 py-2">
                                  {coord.isValid ? (
                                    <Badge variant="outline" className="text-xs">Valid</Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">Invalid</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {convertedData.length > 10 && (
                        <div className="bg-muted px-4 py-2 text-xs text-muted-foreground text-center">
                          Showing 10 of {convertedData.length} rows
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
                              <th className="px-4 py-2 text-left font-medium">Row</th>
                              <th className="px-4 py-2 text-left font-medium">X_UTM30 (m)</th>
                              <th className="px-4 py-2 text-left font-medium">Y_UTM30 (m)</th>
                              <th className="px-4 py-2 text-left font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validCoords.slice(0, 10).map((coord, idx) => (
                              <tr key={idx} className="border-t hover:bg-muted/30">
                                <td className="px-4 py-2">{coord.rowIndex + 1}</td>
                                <td className="px-4 py-2 font-mono text-xs">{formatCoordinate(coord.converted.x, 2)}</td>
                                <td className="px-4 py-2 font-mono text-xs">{formatCoordinate(coord.converted.y, 2)}</td>
                                <td className="px-4 py-2">
                                  <Badge variant="outline" className="text-xs">Converted</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {validCoords.length > 10 && (
                        <div className="bg-muted px-4 py-2 text-xs text-muted-foreground text-center">
                          Showing 10 of {validCoords.length} valid coordinates
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleDownload} 
                className="flex-1 sm:flex-none"
                size="lg"
              >
                <DownloadSimple size={20} className="mr-2" />
                Download CSV
              </Button>
              <Button 
                onClick={handleReset} 
                variant="outline"
                size="lg"
              >
                <ArrowsClockwise size={20} className="mr-2" />
                New Conversion
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p>
                <strong>Output file:</strong> {getOutputFilename(parsedFile.filename)}
              </p>
              <p className="mt-1">
                Format: CSV with UTM30 coordinates (EPSG:25830) optimized for QGIS import
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
