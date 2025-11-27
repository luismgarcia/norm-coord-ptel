/**
 * Step3 - Exportación de resultados
 * 
 * Genera archivos de salida en múltiples formatos:
 * - CSV (separador ; para Excel/LibreOffice)
 * - Excel con 3 pestañas (Resumen, Por Tipología, No Geolocalizados)
 * - GeoJSON (EPSG:25830 para QGIS)
 * - KML (Google Earth)
 * 
 * v2: Integrado con nueva estructura de ProcessedInfrastructure
 */

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  DownloadSimple, 
  FileCsv,
  FileXls,
  MapTrifold,
  FileArrowDown,
  CheckCircle,
  ArrowRight,
  FunnelSimple,
  MapPin,
  Buildings
} from '@phosphor-icons/react'
import * as XLSX from 'xlsx'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ProcessingComplete } from './Step2'
import ScoreIndicator from './ScoreIndicator'

interface Step3Props {
  data: ProcessingComplete | null
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

  const { infrastructures, metadata, stats } = data

  // Nombre base del archivo
  const baseName = metadata.fileName.replace(/\.[^/.]+$/, '') + '_geocodificado'

  // Calcular métricas
  const withCoords = infrastructures.filter(inf => inf.xFinal && inf.yFinal)
  const coveragePercent = infrastructures.length > 0 
    ? Math.round((withCoords.length / infrastructures.length) * 100)
    : 0

  // Agrupar por tipología
  const typologyData = useMemo(() => {
    const counts: Record<string, number> = {}
    infrastructures.forEach(inf => {
      const tipo = inf.tipo || 'OTRO'
      counts[tipo] = (counts[tipo] || 0) + 1
    })
    return counts
  }, [infrastructures])

  // Ordenar tipologías
  const sortedTypologies = useMemo(() => {
    return Object.entries(typologyData)
      .sort(([, a], [, b]) => b - a)
  }, [typologyData])

  // ===== FUNCIONES DE DESCARGA =====

  // Descargar como CSV
  const downloadCSV = () => {
    const headers = [
      'ID', 'NOMBRE', 'TIPO', 'DIRECCION', 'TABLA',
      'X_ORIGINAL', 'Y_ORIGINAL', 'X_UTM30', 'Y_UTM30',
      'FUENTE', 'SCORE', 'CONFIANZA', 'STATUS',
      'MUNICIPIO', 'PROVINCIA'
    ]
    
    const csvRows = infrastructures.map(inf => [
      inf.id,
      escapeCSV(inf.nombre),
      inf.tipo,
      escapeCSV(inf.direccion),
      inf.tabla,
      inf.xOriginal || '',
      inf.yOriginal || '',
      inf.xFinal?.toFixed(2) || '',
      inf.yFinal?.toFixed(2) || '',
      inf.source,
      inf.score,
      inf.confidence,
      inf.status,
      inf.municipio || metadata.municipality || '',
      inf.provincia || metadata.province || ''
    ].join(';'))

    const csv = [headers.join(';'), ...csvRows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `${baseName}.csv`)
  }

  // Descargar como Excel con 3 pestañas
  const downloadExcel = () => {
    const wb = XLSX.utils.book_new()
    
    // Pestaña 1: Resumen - Todos los datos
    const allData = infrastructures.map((inf, idx) => ({
      '#': idx + 1,
      'NOMBRE': inf.nombre,
      'TIPO': inf.tipo,
      'DIRECCIÓN': inf.direccion,
      'TABLA': inf.tabla,
      'X_ORIGINAL': inf.xOriginal || '',
      'Y_ORIGINAL': inf.yOriginal || '',
      'X_UTM30': inf.xFinal?.toFixed(2) || '',
      'Y_UTM30': inf.yFinal?.toFixed(2) || '',
      'FUENTE': inf.source,
      'SCORE': inf.score,
      'CONFIANZA': inf.confidence,
      'STATUS': inf.status,
      'MUNICIPIO': inf.municipio || metadata.municipality || '',
      'PROVINCIA': inf.provincia || metadata.province || ''
    }))
    
    const ws1 = XLSX.utils.json_to_sheet(allData)
    ws1['!cols'] = [
      { wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
      { wch: 15 }, { wch: 12 }
    ]
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')
    
    // Pestaña 2: Por Tipología
    const byTypologyData: any[] = []
    sortedTypologies.forEach(([tipo, count]) => {
      const typeInfs = infrastructures.filter(inf => inf.tipo === tipo)
      
      byTypologyData.push({ 'TIPOLOGÍA': `=== ${tipo} (${count} elementos) ===` })
      
      typeInfs.forEach((inf, idx) => {
        byTypologyData.push({
          '#': idx + 1,
          'NOMBRE': inf.nombre,
          'DIRECCIÓN': inf.direccion,
          'X_UTM30': inf.xFinal?.toFixed(2) || '',
          'Y_UTM30': inf.yFinal?.toFixed(2) || '',
          'FUENTE': inf.source,
          'SCORE': inf.score
        })
      })
      
      byTypologyData.push({})
    })
    
    const ws2 = XLSX.utils.json_to_sheet(byTypologyData)
    XLSX.utils.book_append_sheet(wb, ws2, 'Por Tipología')
    
    // Pestaña 3: No Geolocalizados
    const notGeolocated = infrastructures
      .filter(inf => !inf.xFinal || !inf.yFinal)
      .map((inf, idx) => ({
        '#': idx + 1,
        'NOMBRE': inf.nombre,
        'TIPO': inf.tipo,
        'DIRECCIÓN': inf.direccion || 'Sin dirección',
        'X_ORIGINAL': inf.xOriginal || '',
        'Y_ORIGINAL': inf.yOriginal || '',
        'STATUS': inf.status,
        'MOTIVO': inf.status === 'failed' ? 'Geocodificación fallida' : 
                  inf.status === 'pending' ? 'Pendiente de geocodificación' :
                  'Sin coordenadas originales',
        'MUNICIPIO': inf.municipio || metadata.municipality || ''
      }))
    
    if (notGeolocated.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(notGeolocated)
      XLSX.utils.book_append_sheet(wb, ws3, 'No Geolocalizados')
    } else {
      const ws3 = XLSX.utils.json_to_sheet([{ 
        'RESULTADO': '✅ Todos los elementos fueron geolocalizados correctamente' 
      }])
      XLSX.utils.book_append_sheet(wb, ws3, 'No Geolocalizados')
    }
    
    // Generar y descargar
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    downloadBlob(blob, `${baseName}.xlsx`)
  }

  // Descargar como GeoJSON
  const downloadGeoJSON = () => {
    const features = infrastructures
      .filter(inf => inf.xFinal && inf.yFinal)
      .map(inf => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [inf.xFinal!, inf.yFinal!]
        },
        properties: {
          id: inf.id,
          nombre: inf.nombre,
          tipo: inf.tipo,
          direccion: inf.direccion,
          tabla: inf.tabla,
          fuente: inf.source,
          score: inf.score,
          confianza: inf.confidence,
          status: inf.status,
          municipio: inf.municipio || metadata.municipality,
          provincia: inf.provincia || metadata.province,
          x_original: inf.xOriginal,
          y_original: inf.yOriginal
        }
      }))

    const geojson = {
      type: 'FeatureCollection',
      name: baseName,
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:EPSG::25830' }
      },
      features
    }

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${baseName}.geojson`)
  }

  // Descargar como KML
  const downloadKML = () => {
    const placemarks = infrastructures
      .filter(inf => inf.xFinal && inf.yFinal)
      .map(inf => `
    <Placemark>
      <name>${escapeXml(inf.nombre)}</name>
      <description>
        Tipo: ${inf.tipo}
        Fuente: ${inf.source}
        Score: ${inf.score}
        ${inf.direccion ? `Dirección: ${escapeXml(inf.direccion)}` : ''}
      </description>
      <Point>
        <coordinates>${inf.xFinal},${inf.yFinal},0</coordinates>
      </Point>
    </Placemark>`)
      .join('')

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${baseName}</name>
    <description>
      Infraestructuras PTEL geocodificadas
      Municipio: ${metadata.municipality || 'N/A'}
      Sistema: EPSG:25830 (ETRS89 / UTM30N)
      Fecha: ${new Date().toISOString().split('T')[0]}
    </description>
    ${placemarks}
  </Document>
</kml>`

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
    downloadBlob(blob, `${baseName}.kml`)
  }

  // Utilidades
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

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Resumen Card */}
      <Card className="bg-card border border-border rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="px-4 py-3 bg-green-500/10 border-b border-green-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} weight="fill" className="text-green-500" />
              <div>
                <span className="font-semibold text-green-400">Procesamiento completado</span>
                <span className="text-xs text-gray-400 ml-2">{metadata.fileName}</span>
              </div>
            </div>
            <ScoreIndicator score={stats.avgScore} size="md" />
          </div>

          {/* Info municipio */}
          <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Buildings size={16} className="text-primary" />
              <span className="text-muted-foreground">Municipio:</span>
              <span className="text-primary font-medium">{metadata.municipality || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin size={16} className="text-primary" />
              <span className="text-muted-foreground">Provincia:</span>
              <span className="text-primary font-medium">{metadata.province || 'N/A'}</span>
            </div>
          </div>

          {/* Métricas */}
          <div className="p-4 space-y-3">
            {/* Métricas principales */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                <div className="text-xl font-bold text-white">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <div className="text-xl font-bold text-green-400">{stats.normalized}</div>
                <div className="text-xs text-green-400/80">Originales</div>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-400">{stats.geocoded}</div>
                <div className="text-xs text-blue-400/80">Geocodificados</div>
              </div>
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                <div className="text-xl font-bold text-red-400">{stats.failed}</div>
                <div className="text-xs text-red-400/80">Fallidos</div>
              </div>
            </div>

            {/* Barra de cobertura */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cobertura final</span>
                <span>{coveragePercent}%</span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${(stats.normalized / stats.total) * 100}%` }}
                />
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${(stats.geocoded / stats.total) * 100}%` }}
                />
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Originales ({stats.normalized})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  Geocodificados ({stats.geocoded})
                </span>
              </div>
            </div>

            {/* Tipologías */}
            <div className="flex items-center gap-2 flex-wrap">
              <FunnelSimple size={14} className="text-gray-500" />
              {sortedTypologies.map(([tipo, count]) => (
                <span
                  key={tipo}
                  className="px-2 py-0.5 bg-slate-800/50 border border-slate-700 rounded text-xs"
                >
                  {tipo}: <span className="font-bold">{count}</span>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Card */}
      <Card className="bg-card border border-border rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <DownloadSimple size={18} weight="duotone" className="text-primary" />
            <span className="font-semibold text-sm">Descargar resultados</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {withCoords.length} elementos con coordenadas
            </span>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* CSV */}
              <button
                onClick={downloadCSV}
                className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center hover:border-green-500/50 hover:bg-green-500/5 transition-all"
              >
                <FileCsv size={28} weight="duotone" className="text-green-400 mx-auto mb-2" />
                <div className="font-semibold text-sm">CSV</div>
                <div className="text-[10px] text-gray-500">Excel, LibreOffice</div>
              </button>

              {/* Excel */}
              <button
                onClick={downloadExcel}
                className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
              >
                <FileXls size={28} weight="duotone" className="text-emerald-400 mx-auto mb-2" />
                <div className="font-semibold text-sm">Excel</div>
                <div className="text-[10px] text-gray-500">3 pestañas</div>
              </button>

              {/* GeoJSON */}
              <button
                onClick={downloadGeoJSON}
                disabled={withCoords.length === 0}
                className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MapTrifold size={28} weight="duotone" className="text-blue-400 mx-auto mb-2" />
                <div className="font-semibold text-sm">GeoJSON</div>
                <div className="text-[10px] text-gray-500">QGIS, Leaflet</div>
              </button>

              {/* KML */}
              <button
                onClick={downloadKML}
                disabled={withCoords.length === 0}
                className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center hover:border-orange-500/50 hover:bg-orange-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileArrowDown size={28} weight="duotone" className="text-orange-400 mx-auto mb-2" />
                <div className="font-semibold text-sm">KML</div>
                <div className="text-[10px] text-gray-500">Google Earth</div>
              </button>
            </div>

            {/* Info formato */}
            <div className="mt-4 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-gray-400">
              <strong className="text-gray-300">Formato de salida:</strong> EPSG:25830 (ETRS89 / UTM zona 30N) — Compatible con QGIS y sistemas GIS españoles
            </div>
          </div>

          {/* Botón nuevo proceso */}
          <div className="px-4 py-3 border-t border-border">
            <Button
              onClick={onReset}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
            >
              Procesar nuevo documento
              <ArrowRight size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
