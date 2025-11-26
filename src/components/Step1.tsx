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
        if (pattern.test(header)) {
          xCol = header
          break
        }
      }
    }
    if (!yCol) {
      for (const pattern of yPatterns) {
        if (pattern.test(header)) {
          yCol = header
          break
        }
      }
    }
  }
  
  return { xCol, yCol }
}

function getRowText(row: Element, ns: string): string[] {
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
  const finalHeaders = ['Tabla', 'Nombre', 'Dirección', 'Tipo', 'X_UTM', 'Y_UTM']
  
  for (let t = 0; t < tables.length; t++) {
    const table = tables[t]
    const tableName = table.getAttribute('table:name') || `Tabla${t + 1}`
    const tableRows = table.getElementsByTagNameNS(tableNS, 'table-row')
    
    if (tableRows.length < 3) continue
    
    const firstRowText = getRowText(tableRows[0], tableNS).join(' ').toLowerCase()
    
    if (!firstRowText.includes('coordenada') && !firstRowText.includes('utm') && 
        !firstRowText.includes('longitud') && !firstRowText.includes('latitud')) {
      continue
    }
    
    const headerRow0 = getRowText(tableRows[0], tableNS)
    const headerRow1 = tableRows.length > 1 ? getRowText(tableRows[1], tableNS) : []
    
    const row1Text = headerRow1.join(' ').toLowerCase()
    const hasSubHeader = row1Text.includes('longitud') || row1Text.includes('latitud') || 
                         row1Text.includes('x') || row1Text.includes('y')
    
    const dataStartRow = hasSubHeader ? 2 : 1
    
    let xColIdx = -1
    let yColIdx = -1
    
    const combinedHeaders = headerRow0.map((h, i) => {
      const sub = headerRow1[i] || ''
      return `${h} ${sub}`.trim()
    })
    
    for (let i = 0; i < combinedHeaders.length; i++) {
      const h = combinedHeaders[i].toLowerCase()
      if (xColIdx === -1 && (h.includes('longitud') || (h.includes('x') && !h.includes('y')))) {
        xColIdx = i
      }
      if (yColIdx === -1 && (h.includes('latitud') || (h.includes('y') && !h.includes('x')))) {
        yColIdx = i
      }
    }
    
    if (xColIdx === -1 || yColIdx === -1) {
      for (let r = dataStartRow; r < Math.min(dataStartRow + 3, tableRows.length); r++) {
        const cells = getRowText(tableRows[r], tableNS)
        for (let c = 0; c < cells.length; c++) {
          const val = cells[c].replace(',', '.')
          const num = parseFloat(val)
          if (!isNaN(num)) {
            if (xColIdx === -1 && num >= 100000 && num <= 800000) {
              xColIdx = c
            }
            if (yColIdx === -1 && num >= 4000000 && num <= 4300000) {
              yColIdx = c
            }
          }
        }
        if (xColIdx !== -1 && yColIdx !== -1) break
      }
    }
    
    if (xColIdx !== -1 || yColIdx !== -1) {
      for (let r = dataStartRow; r < tableRows.length; r++) {
        const cells = getRowText(tableRows[r], tableNS)
        
        if (cells.every(c => !c.trim())) continue
        
        const x = xColIdx !== -1 ? cells[xColIdx] || '' : ''
        const y = yColIdx !== -1 ? cells[yColIdx] || '' : ''
        
        if (x || y) {
          allDataRows.push({
            'Tabla': tableName,
            'Nombre': cells[0] || cells[1] || '',
            'Dirección': cells.find(c => /direcci|ubicaci/i.test(c)) || '',
            'Tipo': cells.find(c => /tipo|categor/i.test(c)) || '',
            'X_UTM': x,
            'Y_UTM': y
          })
        }
      }
    }
  }
  
  if (allDataRows.length === 0) {
    throw new Error('No se encontraron coordenadas en las tablas del documento')
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
