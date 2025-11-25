import { motion } from 'framer-motion'
import { 
  DownloadSimple, 
  FileArrowDown,
  FileCsv,
  MapTrifold,
  CheckCircle,
  ArrowCounterClockwise
} from '@phosphor-icons/react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'

interface Step3Props {
  data: any
  onReset: () => void
}

export default function Step3({ data, onReset }: Step3Props) {
  const handleDownload = (format: string) => {
    // Placeholder para descarga
    console.log(`Descargando en formato: ${format}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Success Message */}
      <Card className="bg-green-500/10 border-green-500/30 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-full">
              <CheckCircle size={32} weight="fill" className="text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-500">
                ¡Normalización completada!
              </h3>
              <p className="text-sm text-muted-foreground">
                Tus coordenadas han sido convertidas a ETRS89 / UTM30N
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card className="bg-card/80 backdrop-blur border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {/* Card Header */}
          <div className="p-5 border-b border-border/50 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DownloadSimple size={20} weight="duotone" className="text-primary" />
            </div>
            <span className="font-semibold">Descarga de resultados</span>
          </div>

          {/* Download Buttons */}
          <div className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* CSV */}
              <button
                onClick={() => handleDownload('csv')}
                className="p-5 bg-secondary/30 border border-border/50 rounded-xl text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
              >
                <div className="p-3 bg-green-500/10 rounded-xl mx-auto w-fit mb-3 group-hover:scale-110 transition-transform">
                  <FileCsv size={32} weight="duotone" className="text-green-500" />
                </div>
                <div className="font-semibold mb-1">CSV</div>
                <div className="text-xs text-muted-foreground">Excel, LibreOffice</div>
              </button>

              {/* GeoJSON */}
              <button
                onClick={() => handleDownload('geojson')}
                className="p-5 bg-secondary/30 border border-border/50 rounded-xl text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
              >
                <div className="p-3 bg-blue-500/10 rounded-xl mx-auto w-fit mb-3 group-hover:scale-110 transition-transform">
                  <MapTrifold size={32} weight="duotone" className="text-blue-500" />
                </div>
                <div className="font-semibold mb-1">GeoJSON</div>
                <div className="text-xs text-muted-foreground">QGIS, Leaflet</div>
              </button>

              {/* KML */}
              <button
                onClick={() => handleDownload('kml')}
                className="p-5 bg-secondary/30 border border-border/50 rounded-xl text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
              >
                <div className="p-3 bg-orange-500/10 rounded-xl mx-auto w-fit mb-3 group-hover:scale-110 transition-transform">
                  <FileArrowDown size={32} weight="duotone" className="text-orange-500" />
                </div>
                <div className="font-semibold mb-1">KML</div>
                <div className="text-xs text-muted-foreground">Google Earth</div>
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Formato de salida:</strong> EPSG:25830 (ETRS89 / UTM zona 30N)
                <br />
                <span className="text-xs">Compatible con QGIS y sistemas GIS de la Junta de Andalucía</span>
              </p>
            </div>
          </div>

          {/* Reset */}
          <div className="p-5 border-t border-border/50">
            <Button
              variant="outline"
              onClick={onReset}
              className="w-full gap-2"
            >
              <ArrowCounterClockwise size={18} />
              Procesar nuevos archivos
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
