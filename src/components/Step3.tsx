/**
 * Step3 - Descarga de resultados
 * 
 * Incluye:
 * - Resumen de tipologías y métricas (igual que Step2)
 * - 4 botones de descarga: CSV, Excel, GeoJSON, KML
 * - Excel con 3 pestañas: Resumen, Por Tipología, No Geolocalizados
 * - CSV compatible con Excel y LibreOffice (separador ;)
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
  FunnelSimple
} from '@phosphor-icons/react'
import * as XLSX from 'xlsx'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { ProcessedData } from './Step1'
import { detectTypology, TypologyCode, TYPOLOGY_CONFIG } from './TypologyBadge'

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

  // Calcular métricas
  const totalOrigin = stats.total
  const detected = stats.valid
  const pending = stats.invalid
  const detectedPercent = totalOrigin > 0 ? ((detected / totalOrigin) * 100).toFixed(1) : '0'
  const pendingPercent = totalOrigin > 0 ? ((pending / totalOrigin) * 100).toFixed(1) : '0'

  // Detectar tipologías
  const { typologyData, rowTypologies } = useMemo(() => {
    const counts: Partial<Record<TypologyCode, number>> = {}
    const rowTypes: TypologyCode[] = []
    
    rows.forEach((row) => {
      const searchText = [
        row['Tabla'] || '',
        row['Tipo'] || '',
        row['Nombre'] || '',
        row['Tipología'] || ''
      ].join(' ')
      
      const typ = detectTypology(searchText)
      counts[typ] = (counts[typ] || 0) + 1
      rowTypes.push(typ)
    })
    
    return { typologyData: counts, rowTypologies: rowTypes }
  }, [rows])

  // Ordenar tipologías por cantidad
  const sortedTypologies = useMemo(() => {
    return Object.entries(typologyData)
      .sort(([, a], [, b]) => (b || 0) - (a || 0))
      .map(([code]) => code as TypologyCode)
  }, [typologyData])

  // Preparar datos con tipología
  const enrichedRows = useMemo(() => {
    return rows.map((row, index) => ({
      ...row,
      _tipologia: rowTypologies[index],
      _x_norm: results[index].x?.toFixed(2) ?? '',
      _y_norm: results[index].y?.toFixed(2) ?? '',
      _score: results[index].score,
      _valido: results[index].isValid ? 'SI' : 'NO',
      _confianza: results[index].confidence,
      _x_original: results[index].original.x,
      _y_original: results[index].original.y
    }))
  }, [rows, results, rowTypologies])

  // ===== DESCARGAS =====

  // Descargar como CSV (separador ; para Excel/LibreOffice)
  const downloadCSV = () => {
    const csvHeaders = [...headers, 'TIPOLOGIA', 'X_NORM', 'Y_NORM', 'SCORE', 'VALIDO', 'CONFIANZA']
    
    const csvRows = enrichedRows.map((row, index) => {
      return [
        ...headers.map(h => escapeCSV(row[h])),
        row._tipologia,
        row._x_norm,
        row._y_norm,
        row._score,
        row._valido,
        row._confianza
      ].join(';')
    })

    const csv = [csvHeaders.join(';'), ...csvRows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `${baseName}.csv`)
  }

  // Descargar como Excel con 3 pestañas
  const downloadExcel = () => {
    const wb = XLSX.utils.book_new()
    
    // Pestaña 1: Resumen - Todos los datos con filtros
    const allData = enrichedRows.map((row, index) => ({
      '#': index + 1,
      ...Object.fromEntries(headers.map(h => [h, row[h]])),
      'TIPOLOGÍA': row._tipologia,
      'X_NORMALIZADO': row._x_norm,
      'Y_NORMALIZADO': row._y_norm,
      'SCORE': row._score,
      'VÁLIDO': row._valido,
      'CONFIANZA': row._confianza
    }))
    
    const ws1 = XLSX.utils.json_to_sheet(allData)
    // Establecer anchos de columna
    ws1['!cols'] = [
      { wch: 5 }, // #
      ...headers.map(() => ({ wch: 20 })),
      { wch: 10 }, // TIPOLOGÍA
      { wch: 12 }, // X_NORM
      { wch: 12 }, // Y_NORM
      { wch: 8 },  // SCORE
      { wch: 8 },  // VÁLIDO
      { wch: 10 }  // CONFIANZA
    ]
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')
    
    // Pestaña 2: Por Tipología - Una sección por tipo
    const byTypologyData: any[] = []
    sortedTypologies.forEach(code => {
      const config = TYPOLOGY_CONFIG[code]
      const typeRows = enrichedRows.filter((_, idx) => rowTypologies[idx] === code)
      
      if (typeRows.length > 0) {
        // Encabezado de sección
        byTypologyData.push({ 'TIPOLOGÍA': `=== ${config.name} (${code}) - ${typeRows.length} elementos ===` })
        
        typeRows.forEach((row, idx) => {
          byTypologyData.push({
            '#': idx + 1,
            ...Object.fromEntries(headers.map(h => [h, row[h]])),
            'X_NORMALIZADO': row._x_norm,
            'Y_NORMALIZADO': row._y_norm,
            'SCORE': row._score,
            'VÁLIDO': row._valido
          })
        })
        
        // Línea vacía entre secciones
        byTypologyData.push({})
      }
    })
    
    const ws2 = XLSX.utils.json_to_sheet(byTypologyData)
    XLSX.utils.book_append_sheet(wb, ws2, 'Por Tipología')
    
    // Pestaña 3: No Geolocalizados
    const notGeolocated = enrichedRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row._valido === 'NO')
      .map(({ row, index }) => ({
        '#': index + 1,
        ...Object.fromEntries(headers.map(h => [h, row[h]])),
        'TIPOLOGÍA': row._tipologia,
        'X_ORIGINAL': row._x_original,
        'Y_ORIGINAL': row._y_original,
        'SCORE': row._score,
        'CONFIANZA': row._confianza,
        'MOTIVO': results[index].errors?.join(', ') || 'Sin coordenadas válidas'
      }))
    
    if (notGeolocated.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(notGeolocated)
      XLSX.utils.book_append_sheet(wb, ws3, 'No Geolocalizados')
    } else {
      const ws3 = XLSX.utils.json_to_sheet([{ 'RESULTADO': 'Todos los elementos fueron geolocalizados correctamente' }])
      XLSX.utils.book_append_sheet(wb, ws3, 'No Geolocalizados')
    }
    
    // Generar y descargar
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    downloadBlob(blob, `${baseName}.xlsx`)
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
            coordinates: [result.x, result.y]
          },
          properties: {
            ...rows[index],
            _tipologia: rowTypologies[index],
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
        properties: { name: 'urn:ogc:def:crs:EPSG::25830' }
      },
      features
    }

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${baseName}.geojson`)
  }

  // Descargar como KML
  const downloadKML = () => {
    const placemarks = results
      .map((result, index) => {
        if (!result.isValid || result.x === null || result.y === null) return ''
        
        const row = rows[index]
        const name = row['DENOMINACION'] || row['NOMBRE'] || row['NAME'] || `Punto ${index + 1}`
        const tipologia = rowTypologies[index]
        
        return `
    <Placemark>
      <name>${escapeXml(String(name))}</name>
      <description>Tipología: ${tipologia}, Score: ${result.score}</description>
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
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Resumen Card */}
      <Card className="bg-card border border-border rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header con check */}
          <div className="px-4 py-3 bg-green-500/10 border-b border-green-500/20 flex items-center gap-3">
            <CheckCircle size={24} weight="fill" className="text-green-500" />
            <div>
              <span className="font-semibold text-green-400">Normalización completada</span>
              <span className="text-xs text-gray-400 ml-2">{fileName}</span>
            </div>
          </div>

          {/* Métricas */}
          <div className="p-4 space-y-3">
            {/* Tipologías como badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <FunnelSimple size={14} className="text-gray-500" />
              {sortedTypologies.map(code => {
                const count = typologyData[code] || 0
                const config = TYPOLOGY_CONFIG[code]
                
                return (
                  <span
                    key={code}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      color: config.color,
                      backgroundColor: `${config.color}15`,
                      border: `1px solid ${config.color}30`
                    }}
                  >
                    {code}: {count}
                  </span>
                )
              })}
            </div>

            {/* Barra de progreso */}
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                style={{ width: `${detectedPercent}%` }}
              />
            </div>

            {/* Totalizadores */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">
                Total: <span className="font-bold text-white">{totalOrigin}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-green-400 font-bold">{detected}</span>
                  <span className="text-gray-500">válidos ({detectedPercent}%)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span className="text-orange-400 font-bold">{pending}</span>
                  <span className="text-gray-500">pendientes ({pendingPercent}%)</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Card */}
      <Card className="bg-card border border-border rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <DownloadSimple size={18} weight="duotone" className="text-primary" />
            <span className="font-semibold text-sm">Descargar resultados</span>
          </div>

          {/* 4 botones de descarga */}
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
                className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                <MapTrifold size={28} weight="duotone" className="text-blue-400 mx-auto mb-2" />
                <div className="font-semibold text-sm">GeoJSON</div>
                <div className="text-[10px] text-gray-500">QGIS, Leaflet</div>
              </button>

              {/* KML */}
              <button
                onClick={downloadKML}
                className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg text-center hover:border-orange-500/50 hover:bg-orange-500/5 transition-all"
              >
                <FileArrowDown size={28} weight="duotone" className="text-orange-400 mx-auto mb-2" />
                <div className="font-semibold text-sm">KML</div>
                <div className="text-[10px] text-gray-500">Google Earth</div>
              </button>
            </div>

            {/* Info formato */}
            <div className="mt-4 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-gray-400">
              <strong className="text-gray-300">Formato:</strong> EPSG:25830 (ETRS89 / UTM zona 30N) — Compatible con QGIS
            </div>
          </div>

          {/* Botón procesar nuevo */}
          <div className="px-4 py-3 border-t border-border">
            <Button
              onClick={onReset}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
            >
              Procesar nuevo archivo
              <ArrowRight size={16} />
              Paso 1
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
