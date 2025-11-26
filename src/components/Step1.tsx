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
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import JSZip from 'jszip'
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

function detectCoordinateColumns(headers: string[]): { xCol: string | null, yCol: string | null } {
  const xPatterns = [/^x$/i, /coord.*x/i, /utm.*x/i, /^este$/i, /^easting$/i, /^lon/i, /x.*long/i, /long/i]
  const yPatterns = [/^y$/i, /coord.*y/i, /utm.*y/i, /^norte$/i, /^northing$/i, /^lat/i, /y.*lat/i, /latitud/i]
  
  let xCol = null
  let yCol = null
  
  for (const header of headers) {
    if (!xCol) {
      for (const pattern of xPatterns) {
        if (pattern.test(header)) { xCol = header; break }
      }
    }
    if (!yCol) {
      for (const pattern of yPatterns) {
        if (pattern.test(header)) { yCol = header; break }
      }
    }
  }
  
  return { xCol, yCol }
}

function getRowCells(row: Element, ns: string): string[] {
  const cells = row.getElementsByTagNameNS(ns, 'table-cell')
  const result: string[] = []
  
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    const repeatCount = parseInt(cell.getAttribute('table:number-columns-repeated') || '1', 10)
    const text = cell.textContent?.trim() || ''
    
    for (let r = 0; r < Math.min(repeatCount, 20); r++) {
      result.push(text)
    }
  }
  
  return result
}

// Detectar índice de columna de coordenadas basándose en el header "Coordenadas" o "UTM"
function findCoordColumnIndex(headerCells: string[]): number {
  for (let i = 0; i < headerCells.length; i++) {
    const h = headerCells[i].toLowerCase()
    if (h.includes('coordenada') || h.includes('utm')) {
      return i
    }
  }
  return -1
}

// Buscar columnas X/Y por valores numéricos típicos de UTM en Andalucía
function findCoordsByValues(cells: string[]): { xIdx: number, yIdx: number } {
  let xIdx = -1
  let yIdx = -1
  
  for (let i = 0; i < cells.length; i++) {
    const val = cells[i].replace(',', '.').replace(/\s/g, '')
    const num = parseFloat(val)
    
    if (!isNaN(num)) {
      // X típico Andalucía: 100000-800000 (6 dígitos)
      if (xIdx === -1 && num >= 100000 && num <= 800000) {
        xIdx = i
      }
      // Y típico Andalucía: 4000000-4300000 (7 dígitos empezando por 4)
      if (yIdx === -1 && num >= 4000000 && num <= 4300000) {
        yIdx = i
      }
    }
  }
  
  return { xIdx, yIdx }
}

async function parseODT(file: File): Promise<{ rows: any[], headers: string[] }> {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  
  const contentXml = await zip.file('content.xml')?.async('text')
  if (!contentXml) {
    throw new Error('No se pudo leer el contenido del ODT')
  }
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(contentXml, 'text/xml')
  
  const tableNS = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0'
  const tables = doc.getElementsByTagNameNS(tableNS, 'table')
  
  if (tables.length === 0) {
    throw new Error('No se encontraron tablas en el documento ODT')
  }
  
  const allDataRows: any[] = []
  const finalHeaders = ['Tabla', 'Nombre', 'Tipo', 'X_UTM', 'Y_UTM']
  
  for (let t = 0; t < tables.length; t++) {
    const table = tables[t]
    const tableName = table.getAttribute('table:name') || `Tabla${t + 1}`
    const tableRows = table.getElementsByTagNameNS(tableNS, 'table-row')
    
    if (tableRows.length < 3) continue
    
    const headerCells = getRowCells(tableRows[0], tableNS)
    const firstRowText = headerCells.join(' ').toLowerCase()
    
    // Solo procesar tablas que mencionen coordenadas/UTM
    if (!firstRowText.includes('coordenada') && !firstRowText.includes('utm')) {
      continue
    }
    
    // Detectar si hay sub-header (fila 1 con X/Y, Longitud/Latitud)
    const row1Cells = getRowCells(tableRows[1], tableNS)
    const row1Text = row1Cells.join(' ').toLowerCase()
    const hasSubHeader = row1Text.includes('longitud') || row1Text.includes('latitud') || 
                         (row1Text.includes('x') && row1Text.includes('y'))
    
    const dataStartRow = hasSubHeader ? 2 : 1
    
    // MÉTODO 1: Buscar columna "Coordenadas" o "UTM" en header
    const coordColIdx = findCoordColumnIndex(headerCells)
    
    // MÉTODO 2: Si no funciona, buscar por valores numéricos en primera fila de datos
    let xColIdx = coordColIdx
    let yColIdx = coordColIdx !== -1 ? coordColIdx + 1 : -1
    
    // Validar con primera fila de datos
    if (dataStartRow < tableRows.length) {
      const firstDataRow = getRowCells(tableRows[dataStartRow], tableNS)
      
      // Si el índice de coordenadas parece incorrecto, buscar por valores
      if (xColIdx === -1 || yColIdx >= firstDataRow.length) {
        const detected = findCoordsByValues(firstDataRow)
        if (detected.xIdx !== -1) xColIdx = detected.xIdx
        if (detected.yIdx !== -1) yColIdx = detected.yIdx
      } else {
        // Verificar que los valores en coordColIdx son numéricos
        const xVal = firstDataRow[xColIdx]?.replace(',', '.') || ''
        const yVal = firstDataRow[yColIdx]?.replace(',', '.') || ''
        
        if (isNaN(parseFloat(xVal)) || isNaN(parseFloat(yVal))) {
          // No son números, buscar por valores
          const detected = findCoordsByValues(firstDataRow)
          if (detected.xIdx !== -1) xColIdx = detected.xIdx
          if (detected.yIdx !== -1) yColIdx = detected.yIdx
        }
      }
    }
    
    // Extraer datos
    if (xColIdx !== -1 || yColIdx !== -1) {
      for (let r = dataStartRow; r < tableRows.length; r++) {
        const cells = getRowCells(tableRows[r], tableNS)
        
        if (cells.every(c => !c.trim())) continue
        
        const x = xColIdx !== -1 && xColIdx < cells.length ? cells[xColIdx] : ''
        const y = yColIdx !== -1 && yColIdx < cells.length ? cells[yColIdx] : ''
        
        // Solo añadir si hay al menos un valor numérico
        const xNum = parseFloat(x.replace(',', '.'))
        const yNum = parseFloat(y.replace(',', '.'))
        
        if (!isNaN(xNum) || !isNaN(yNum)) {
          allDataRows.push({
            'Tabla': tableName,
            'Nombre': cells[0] || '',
            'Tipo': cells.find(c => /tipo|categor|cultural|residencia|educati/i.test(c)) || cells[2] || '',
            'X_UTM': x,
            'Y_UTM': y
          })
        }
      }
    }
  }
  
  if (allDataRows.length === 0) {
    throw new Error('No se encontraron coordenadas válidas en las tablas del documento')
  }
  
  return { rows: allDataRows, headers: finalHeaders }
}

export default function Step1({ onComplete }: Step1Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)

  const parseFile = async (file: File): Promise<{ rows: any[], headers: string[] }> => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    
    if (extension === 'csv') {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            resolve({ rows: results.data as any[], headers: results.meta.fields || [] })
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
      
      if (data.length === 0) return { rows: [], headers: [] }
      
      const headers = data[0].map(String)
      const rows = data.slice(1).map(row => {
        const obj: any = {}
        headers.forEach((h, i) => { obj[h] = row[i] })
        return obj
      })
      
      return { rows, headers }
    }
    
    if (extension === 'odt') {
      return parseODT(file)
    }
    
    throw new Error(`Formato no soportado: ${extension}`)
  }

  const processFiles = async (newFiles: File[]) => {
    if (newFiles.length === 0) return
    
    setIsProcessing(true)
    setError(null)
    setProcessingStatus('Leyendo archivo...')
    
    try {
      const file = newFiles[0]
      const { rows, headers } = await parseFile(file)
      
      if (rows.length === 0) throw new Error('El archivo no contiene datos')
      
      setProcessingStatus(`Detectando coordenadas (${rows.length} filas)...`)
      
      const { xCol, yCol } = detectCoordinateColumns(headers)
      const finalXCol = xCol || headers.find(h => /x_utm|x|longitud|este/i.test(h)) || 'X_UTM'
      const finalYCol = yCol || headers.find(h => /y_utm|y|latitud|norte/i.test(h)) || 'Y_UTM'
      
      setProcessingStatus('Normalizando coordenadas...')
      
      const results: NormalizationResult[] = rows.map((row) => {
        const x = row[finalXCol] || ''
        const y = row[finalYCol] || ''
        return normalizeCoordinate({
          x: String(x).replace(',', '.'),
          y: String(y).replace(',', '.')
        })
      })
      
      const stats = getBatchStats(results)
      setProcessingStatus('¡Completado!')
      
      onComplete({ files: newFiles, rows, results, stats, headers, fileName: file.name })
      
    } catch (err) {
      console.error('Error procesando archivo:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setProcessingStatus('')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
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
    if (e.target.files) processFiles(Array.from(e.target.files))
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <Card className="bg-card border border-border rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UploadSimple size={20} weight="duotone" className="text-primary" />
            </div>
            <span className="font-semibold">Subir archivos</span>
          </div>

          <div className="p-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-xl p-10 text-center cursor-pointer border-2 border-dashed transition-colors duration-200 ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'} ${isProcessing ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <div className="flex justify-center gap-3 mb-6">
                {fileFormats.slice(0, 4).map((format) => (
                  <div key={format.ext} className="p-3 bg-card border border-border rounded-lg">
                    <format.icon size={28} weight="duotone" className={format.color} />
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-6">
                {isProcessing ? (
                  <p className="text-xl font-semibold text-primary">{processingStatus}</p>
                ) : error ? (
                  <p className="text-xl font-semibold text-red-500">{error}</p>
                ) : (
                  <>
                    <p className="text-2xl font-semibold text-foreground">
                      {isDragging ? <span className="text-primary">¡Suelta los archivos aquí!</span> : 'Arrastra archivos aquí'}
                    </p>
                    <p className="text-muted-foreground">o haz clic para seleccionar</p>
                  </>
                )}
              </div>

              <input type="file" multiple accept=".csv,.xlsx,.xls,.ods,.odt,.dbf,.zip,.geojson,.kml" onChange={handleFileSelect} className="hidden" id="file-upload" />

              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isProcessing}>
                <label htmlFor="file-upload" className="cursor-pointer">
                  {isProcessing ? (<><SpinnerGap size={20} className="mr-2 animate-spin" />Procesando...</>) : (<><UploadSimple size={20} weight="bold" className="mr-2" />Seleccionar archivos</>)}
                </label>
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 p-6 pt-0">
            <div className="p-5 bg-muted/20 border border-border rounded-xl min-h-[200px] flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-primary/10 rounded-xl"><FileCsv size={26} weight="duotone" className="text-primary" /></div>
                <div><div className="font-semibold">Formatos soportados</div><div className="text-xs text-muted-foreground">7 tipos de archivo</div></div>
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {fileFormats.map((format) => (<span key={format.ext} className="px-3 py-1.5 text-xs font-medium rounded-md bg-muted/50 border border-border text-muted-foreground hover:border-primary/50 transition-colors">{format.ext}</span>))}
              </div>
            </div>

            <div className="p-5 bg-muted/20 border border-border rounded-xl min-h-[200px] flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-primary/10 rounded-xl"><Globe size={26} weight="duotone" className="text-primary" /></div>
                <div><div className="font-semibold">Sistemas de coordenadas</div><div className="text-xs text-muted-foreground">14 detectados automáticamente</div></div>
              </div>
              <div className="grid grid-cols-3 gap-2 flex-1">
                {coordSystems.slice(0, 5).map((system, index) => (
                  <div key={system} className={`text-xs px-3 py-2 rounded-lg text-center transition-colors ${index === 2 ? 'bg-primary/15 border border-primary/30 text-primary font-semibold' : 'bg-muted/30 border border-border text-muted-foreground'}`}>
                    {index === 2 ? 'UTM30N ⭐' : system}
                  </div>
                ))}
                <div className="text-xs px-3 py-2 rounded-lg text-center bg-muted/30 border border-border text-muted-foreground">+8 más</div>
              </div>
              <div className="mt-3 text-xs text-primary cursor-pointer hover:underline">▸ Ver todos los sistemas →</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
