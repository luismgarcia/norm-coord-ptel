import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  UploadSimple, 
  FileCsv, 
  FileXls, 
  FileDoc,
  File,
  Globe,
  SpinnerGap
} from '@phosphor-icons/react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'

interface Step1Props {
  onComplete: (data: any) => void
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

export default function Step1({ onComplete }: Step1Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [files, setFiles] = useState<File[]>([])

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

  const processFiles = async (newFiles: File[]) => {
    setFiles(newFiles)
    setIsProcessing(true)
    
    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsProcessing(false)
    onComplete({ files: newFiles })
  }

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
                border-2 border-dashed transition-all duration-300 ease-out
                ${isDragging 
                  ? 'border-primary bg-primary/5 scale-[1.01]' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/20'
                }
                ${isProcessing ? 'opacity-60 pointer-events-none' : ''}
              `}
            >
              {/* File format icons */}
              <div className="flex justify-center gap-3 mb-6">
                {fileFormats.slice(0, 4).map((format, index) => (
                  <motion.div
                    key={format.ext}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-card border border-border rounded-lg"
                  >
                    <format.icon size={28} weight="duotone" className={format.color} />
                  </motion.div>
                ))}
              </div>

              {/* Main text */}
              <div className="space-y-2 mb-6">
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
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-muted/50 border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
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
                        : 'bg-muted/30 border border-border text-muted-foreground hover:text-foreground'
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

      {/* Panel de información ELIMINADO según diseño acordado */}
    </motion.div>
  )
}
