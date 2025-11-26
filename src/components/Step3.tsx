import { motion } from 'framer-motion'
import { 
  DownloadSimple, 
  FileCsv,
  MapTrifold,
  FileArrowDown,
  CheckCircle,
  ArrowCounterClockwise
} from '@phosphor-icons/react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ProcessedData } from './Step1'

interface Step3Props {
  data: ProcessedData | null
  onReset: () => void
}

export default function Step3({ data, onReset }: Step3Props) {
  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay datos para descargar. Vuelve al paso anterior.
      </div>
    )
  }

  const { results, rows, headers, fileName, stats } = data

  // Generar nombre base del archivo
  const baseName = fileName.replace(/\.[^/.]+$/, '') + '_normalizado'

  // Descargar como CSV
  const downloadCSV = () => {
    const csvHeaders = [...headers, 'X_NORM', 'Y_NORM', 'SCORE', 'VALID', 'CONFIDENCE']
    
    const csvRows = rows.map((row, index) => {
      const result = results[index]
      return [
        ...headers.map(h => {
          const val = row[h]
          // Escapar comillas y envolver en comillas si contiene coma
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`
          }
          return val ?? ''
        }),
        result.x?.toFixed(2) ?? '',
        result.y?.toFixed(2) ?? '',
        result.score,
        result.isValid ? 'SI' : 'NO',
        result.confidence
      ].join(',')
    })

    const csv = [csvHeaders.join(','), ...csvRows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `${baseName}.csv`)
  }

  // Descargar como GeoJSON
  const downloadGeoJSON = () => {
    const features = results
      .map((result, index) => {
        if (!result.isValid || result.x === null || result.y === null) return null
        
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [result.x, result.y] // UTM30N coords
          },
          properties: {
            ...rows[index],
            _score: result.score,
            _confidence: result.confidence,
            _x_original: result.original.x,
            _y_original: result.original.y
          }
        }
      })
      .filter(Boolean)

    const geojson = {
      type: 'FeatureCollection',
      name: baseName,
      crs: {
        type: 'name',
        properties: {
          name: 'urn:ogc:def:crs:EPSG::25830'
        }
      },
      features
    }

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${baseName}.geojson`)
  }

  // Descargar como KML (convertir a WGS84 sería necesario, por ahora placeholder)
  const downloadKML = () => {
    // Nota: Para KML real necesitaríamos convertir UTM30N a WGS84 con proj4
    // Por ahora generamos un KML básico con las coordenadas UTM (no ideal)
    
    const placemarks = results
      .map((result, index) => {
        if (!result.isValid || result.x === null || result.y === null) return ''
        
        const row = rows[index]
        const name = row['DENOMINACION'] || row['NOMBRE'] || row['NAME'] || `Punto ${index + 1}`
        
        // Nota: KML requiere WGS84 (lon, lat). Aquí ponemos UTM como placeholder
        // En producción, usar proj4 para convertir
        return `
    <Placemark>
      <name>${escapeXml(String(name))}</name>
      <description>Score: ${result.score}, Confianza: ${result.confidence}</description>
      <Point>
        <coordinates>${result.x},${result.y},0</coordinates>
      </Point>
    </Placemark>`
      })
      .filter(Boolean)
      .join('')

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${baseName}</name>
    <description>Coordenadas normalizadas PTEL - EPSG:25830</description>
    ${placemarks}
  </Document>
</kml>`

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
    downloadBlob(blob, `${baseName}.kml`)
  }

  // Utilidad para descargar blob
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Escapar XML
  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Success Message */}
      <Card className="bg-green-500/10 border border-green-500/30 rounded-2xl overflow-hidden">
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
                {stats.valid} de {stats.total} coordenadas válidas ({Math.round((stats.valid / stats.total) * 100)}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card className="bg-card border border-border rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Card Header */}
          <div className="p-5 border-b border-border flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DownloadSimple size={20} weight="duotone" className="text-primary" />
            </div>
            <span className="font-semibold">Descargar resultados</span>
          </div>

          {/* Download Buttons */}
          <div className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* CSV */}
              <button
                onClick={downloadCSV}
                className="p-5 bg-muted/20 border border-border rounded-xl text-center hover:border-primary/50 transition-colors group"
              >
                <div className="p-3 bg-green-500/10 rounded-xl mx-auto w-fit mb-3">
                  <FileCsv size={32} weight="duotone" className="text-green-500" />
                </div>
                <div className="font-semibold mb-1">CSV</div>
                <div className="text-xs text-muted-foreground">Excel, LibreOffice</div>
              </button>

              {/* GeoJSON */}
              <button
                onClick={downloadGeoJSON}
                className="p-5 bg-muted/20 border border-border rounded-xl text-center hover:border-primary/50 transition-colors group"
              >
                <div className="p-3 bg-blue-500/10 rounded-xl mx-auto w-fit mb-3">
                  <MapTrifold size={32} weight="duotone" className="text-blue-500" />
                </div>
                <div className="font-semibold mb-1">GeoJSON</div>
                <div className="text-xs text-muted-foreground">QGIS, Leaflet</div>
              </button>

              {/* KML */}
              <button
                onClick={downloadKML}
                className="p-5 bg-muted/20 border border-border rounded-xl text-center hover:border-primary/50 transition-colors group"
              >
                <div className="p-3 bg-orange-500/10 rounded-xl mx-auto w-fit mb-3">
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
          <div className="p-5 border-t border-border">
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
