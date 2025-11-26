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
  { ext: 'DOCX', icon: FileDoc, color: 'text-blue-600' },
]

const coordSystems = [
  'WGS84', 'ETRS89', 'ED50', 'UTM zones', 'Lambert', 'Web Mercator'
]

// ============================================================================
// UTILIDADES DE LIMPIEZA DE COORDENADAS
// ============================================================================

/**
 * Limpia y normaliza un valor de coordenada
 * Maneja: espacios, comas, comillas, separadores de miles
 */
function cleanCoordinateValue(val: string): string {
  if (!val || typeof val !== 'string') return ''
  
  let cleaned = val.trim()
  
  // Detectar placeholders
  if (/^(indicar|sin datos?|-|n\/?[ac]|\.+|_+)$/i.test(cleaned)) {
    return ''
  }
  
  // Eliminar comillas especiales (´´, '', "")
  cleaned = cleaned.replace(/[´`''""]+/g, '')
  
  // Caso especial: "504 750 92" o "4 077 153 36" (espacios como separadores)
  // Si tiene espacios y parece coordenada UTM, eliminar espacios
  if (/^\d[\d\s]+\d$/.test(cleaned) && cleaned.includes(' ')) {
    const noSpaces = cleaned.replace(/\s/g, '')
    // Verificar si es número válido después de quitar espacios
    if (/^\d+$/.test(noSpaces)) {
      // Insertar punto decimal antes de los últimos 2 dígitos si tiene más de 6
      if (noSpaces.length > 6) {
        cleaned = noSpaces.slice(0, -2) + '.' + noSpaces.slice(-2)
      } else {
        cleaned = noSpaces
      }
    }
  }
  
  // Caso: puntos como separadores de miles "524.891" cuando debería ser "524891"
  // Detectar: si tiene múltiples puntos o patrón X.XXX.XXX
  const dotCount = (cleaned.match(/\./g) || []).length
  if (dotCount > 1) {
    // Múltiples puntos = separadores de miles, eliminar todos
    cleaned = cleaned.replace(/\./g, '')
  } else if (dotCount === 1) {
    // Un solo punto: verificar si es decimal o separador de miles
    const parts = cleaned.split('.')
    if (parts[1] && parts[1].length === 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      // Patrón XXX.XXX = separador de miles (ej: 524.891 → 524891)
      // Pero también podría ser decimal. Heurística: si parte entera < 1000, es decimal
      if (parseInt(parts[0]) >= 1000) {
        cleaned = cleaned.replace('.', '')
      }
    }
  }
  
  // Reemplazar coma por punto
  cleaned = cleaned.replace(',', '.')
  
  // Limpiar espacios restantes
  cleaned = cleaned.replace(/\s/g, '')
  
  return cleaned
}

/**
 * Verifica si un valor parece una coordenada UTM válida para Andalucía
 */
function isValidUTMValue(val: string, type: 'x' | 'y'): boolean {
  const num = parseFloat(val)
  if (isNaN(num) || num === 0) return false
  
  if (type === 'x') {
    // X en Andalucía: 100,000 - 800,000
    return num >= 100000 && num <= 800000
  } else {
    // Y en Andalucía: 4,000,000 - 4,300,000
    return num >= 4000000 && num <= 4300000
  }
}

// ============================================================================
// DETECCIÓN DE COLUMNAS
// ============================================================================

function detectCoordinateColumns(headers: string[]): { xCol: string | null, yCol: string | null } {
  const xPatterns = [/^x$/i, /^x[-_\s]/i, /coord.*x/i, /utm.*x/i, /^este$/i, /^easting$/i, 
                     /longitud/i, /^lon$/i, /x.*long/i]
  const yPatterns = [/^y$/i, /^y[-_\s]/i, /coord.*y/i, /utm.*y/i, /^norte$/i, /^northing$/i, 
                     /latitud/i, /^lat$/i, /y.*lat/i]
  
  let xCol = null
  let yCol = null
  
  for (const header of headers) {
    const h = header.toLowerCase().trim()
    if (!xCol) {
      for (const pattern of xPatterns) {
        if (pattern.test(h)) { xCol = header; break }
      }
    }
    if (!yCol) {
      for (const pattern of yPatterns) {
        if (pattern.test(h)) { yCol = header; break }
      }
    }
  }
  
  return { xCol, yCol }
}

// ============================================================================
// PARSER ODT MEJORADO
// ============================================================================

function getRowCells(row: Element, ns: string): string[] {
  const cells = row.getElementsByTagNameNS(ns, 'table-cell')
  const result: string[] = []
  
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    const repeatCount = parseInt(cell.getAttribute('table:number-columns-repeated') || '1', 10)
    const text = cell.textContent?.trim() || ''
    
    // Limitar repeticiones para evitar arrays enormes por celdas vacías repetidas
    const effectiveRepeat = Math.min(repeatCount, text ? 20 : 3)
    for (let r = 0; r < effectiveRepeat; r++) {
      result.push(text)
    }
  }
  
  return result
}

/**
 * Busca la columna "Coordenadas" en el header y devuelve su índice
 */
function findCoordHeaderIndex(headerCells: string[]): number {
  for (let i = 0; i < headerCells.length; i++) {
    const h = headerCells[i].toLowerCase()
    if (h.includes('coordenada') || h.includes('utm')) {
      return i
    }
  }
  return -1
}

/**
 * Busca columnas X/Y por valores numéricos típicos UTM en una fila de datos
 */
function findCoordsByNumericValues(cells: string[]): { xIdx: number, yIdx: number } {
  let xIdx = -1
  let yIdx = -1
  
  for (let i = 0; i < cells.length; i++) {
    const cleaned = cleanCoordinateValue(cells[i])
    if (!cleaned) continue
    
    const num = parseFloat(cleaned)
    if (isNaN(num) || num === 0) continue
    
    // X típico Andalucía: 100000-800000 (6 dígitos)
    if (xIdx === -1 && num >= 100000 && num <= 800000) {
      xIdx = i
    }
    // Y típico Andalucía: 4000000-4300000 (7 dígitos empezando por 4)
    else if (yIdx === -1 && num >= 4000000 && num <= 4300000) {
      yIdx = i
    }
  }
  
  // Si encontramos X pero no Y, Y suele estar justo después
  if (xIdx !== -1 && yIdx === -1 && xIdx + 1 < cells.length) {
    const nextCleaned = cleanCoordinateValue(cells[xIdx + 1])
    const nextNum = parseFloat(nextCleaned)
    if (!isNaN(nextNum) && nextNum >= 4000000 && nextNum <= 4500000) {
      yIdx = xIdx + 1
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
  const finalHeaders = ['Tabla', 'Nombre', 'Tipo', 'Dirección', 'X_UTM', 'Y_UTM']
  
  for (let t = 0; t < tables.length; t++) {
    const table = tables[t]
    const tableName = table.getAttribute('table:name') || `Tabla${t + 1}`
    const tableRows = table.getElementsByTagNameNS(tableNS, 'table-row')
    
    if (tableRows.length < 2) continue
    
    // Obtener texto completo de la tabla para detectar si tiene coordenadas
    const allTableText = Array.from(tableRows).slice(0, 3)
      .map(r => getRowCells(r as Element, tableNS).join(' '))
      .join(' ')
      .toLowerCase()
    
    // Solo procesar tablas que mencionen coordenadas/UTM
    if (!allTableText.includes('coordenada') && !allTableText.includes('utm') && 
        !allTableText.includes('longitud') && !allTableText.includes('latitud')) {
      continue
    }
    
    // Analizar estructura de headers
    const row0 = getRowCells(tableRows[0], tableNS)
    const row1 = tableRows.length > 1 ? getRowCells(tableRows[1], tableNS) : []
    const row2 = tableRows.length > 2 ? getRowCells(tableRows[2], tableNS) : []
    
    // Detectar si fila 1 es sub-header (contiene X/Y, Longitud/Latitud)
    const row1Text = row1.join(' ').toLowerCase()
    const hasSubHeader = /longitud|latitud|^x$|^y$/i.test(row1Text) || 
                         (row1Text.includes('x') && row1Text.includes('y') && row1.length <= 4)
    
    // Determinar fila de inicio de datos
    let dataStartRow = hasSubHeader ? 2 : 1
    
    // Si row2 parece ser otro sub-header (solo X, Y), empezar en row3
    if (dataStartRow === 2 && row2.length > 0) {
      const row2Cleaned = row2.filter(c => c.trim()).map(c => c.toLowerCase().trim())
      if (row2Cleaned.length <= 3 && row2Cleaned.some(c => c === 'x' || c === 'y' || c === '-')) {
        dataStartRow = 3
      }
    }
    
    // Buscar índices de columnas X/Y
    let xColIdx = -1
    let yColIdx = -1
    
    // ESTRATEGIA 1: Buscar por posición del header "Coordenadas"
    const coordIdx = findCoordHeaderIndex(row0)
    if (coordIdx !== -1) {
      // Las coordenadas suelen estar en coordIdx y coordIdx+1
      xColIdx = coordIdx
      yColIdx = coordIdx + 1
    }
    
    // ESTRATEGIA 2: Validar con primera fila de datos usando valores numéricos
    if (dataStartRow < tableRows.length) {
      const firstDataCells = getRowCells(tableRows[dataStartRow], tableNS)
      
      // Verificar si los índices actuales tienen valores numéricos válidos
      let needsNumericDetection = true
      
      if (xColIdx !== -1 && yColIdx !== -1 && xColIdx < firstDataCells.length && yColIdx < firstDataCells.length) {
        const xVal = cleanCoordinateValue(firstDataCells[xColIdx])
        const yVal = cleanCoordinateValue(firstDataCells[yColIdx])
        
        if (isValidUTMValue(xVal, 'x') && isValidUTMValue(yVal, 'y')) {
          needsNumericDetection = false
        }
      }
      
      // Si los índices no funcionan, buscar por valores numéricos
      if (needsNumericDetection) {
        const detected = findCoordsByNumericValues(firstDataCells)
        if (detected.xIdx !== -1) xColIdx = detected.xIdx
        if (detected.yIdx !== -1) yColIdx = detected.yIdx
      }
    }
    
    // Extraer datos si encontramos coordenadas
    if (xColIdx !== -1 || yColIdx !== -1) {
      for (let r = dataStartRow; r < tableRows.length; r++) {
        const cells = getRowCells(tableRows[r], tableNS)
        
        // Saltar filas vacías o con placeholders
        const nonEmptyCells = cells.filter(c => c.trim() && !/^(indicar|sin datos?|-|\.+|_+)$/i.test(c.trim()))
        if (nonEmptyCells.length < 2) continue
        
        const rawX = xColIdx !== -1 && xColIdx < cells.length ? cells[xColIdx] : ''
        const rawY = yColIdx !== -1 && yColIdx < cells.length ? cells[yColIdx] : ''
        
        const cleanX = cleanCoordinateValue(rawX)
        const cleanY = cleanCoordinateValue(rawY)
        
        // Solo añadir si hay al menos un valor numérico válido
        const xNum = parseFloat(cleanX)
        const yNum = parseFloat(cleanY)
        
        if ((!isNaN(xNum) && xNum > 0) || (!isNaN(yNum) && yNum > 0)) {
          // Buscar campos descriptivos
          const nombre = cells[0] || ''
          const tipo = cells.find(c => /tipo|categor|residencia|sanitario|enseñanza|cultural/i.test(c)) || ''
          const direccion = cells.find(c => /calle|avda?|plaza|ctra|carretera|c\//i.test(c)) || ''
          
          allDataRows.push({
            'Tabla': tableName,
            'Nombre': nombre.substring(0, 100),
            'Tipo': tipo.substring(0, 50),
            'Dirección': direccion.substring(0, 100),
            'X_UTM': cleanX,
            'Y_UTM': cleanY
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

// ============================================================================
// PARSER DOCX
// ============================================================================

async function parseDOCX(file: File): Promise<{ rows: any[], headers: string[] }> {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  
  const documentXml = await zip.file('word/document.xml')?.async('text')
  if (!documentXml) {
    throw new Error('No se pudo leer el contenido del DOCX')
  }
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(documentXml, 'text/xml')
  
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  const tables = doc.getElementsByTagNameNS(ns, 'tbl')
  
  if (tables.length === 0) {
    throw new Error('No se encontraron tablas en el documento DOCX')
  }
  
  const allDataRows: any[] = []
  const finalHeaders = ['Tabla', 'Nombre', 'Tipo', 'Dirección', 'X_UTM', 'Y_UTM']
  
  for (let t = 0; t < tables.length; t++) {
    const table = tables[t]
    const tableText = table.textContent?.toLowerCase() || ''
    
    // Solo procesar tablas con coordenadas
    if (!tableText.includes('coordenada') && !tableText.includes('utm')) {
      continue
    }
    
    const rows = table.getElementsByTagNameNS(ns, 'tr')
    if (rows.length < 3) continue
    
    // En DOCX, típicamente:
    // R0 = Título sección
    // R1 = Headers principales
    // R2 = Sub-headers (X, Y)
    // R3+ = Datos
    
    let dataStartRow = 3
    let xColIdx = -1
    let yColIdx = -1
    
    // Buscar por valores numéricos en primera fila de datos probable
    for (let startRow = 2; startRow <= 4 && startRow < rows.length; startRow++) {
      const rowCells = Array.from(rows[startRow].getElementsByTagNameNS(ns, 'tc'))
        .map(c => c.textContent?.trim() || '')
      
      const detected = findCoordsByNumericValues(rowCells)
      if (detected.xIdx !== -1 && detected.yIdx !== -1) {
        dataStartRow = startRow
        xColIdx = detected.xIdx
        yColIdx = detected.yIdx
        break
      }
    }
    
    if (xColIdx === -1) continue
    
    // Extraer datos
    for (let r = dataStartRow; r < rows.length; r++) {
      const cells = Array.from(rows[r].getElementsByTagNameNS(ns, 'tc'))
        .map(c => c.textContent?.trim() || '')
      
      if (cells.length < Math.max(xColIdx, yColIdx) + 1) continue
      
      const rawX = cells[xColIdx] || ''
      const rawY = cells[yColIdx] || ''
      
      const cleanX = cleanCoordinateValue(rawX)
      const cleanY = cleanCoordinateValue(rawY)
      
      const xNum = parseFloat(cleanX)
      const yNum = parseFloat(cleanY)
      
      if ((!isNaN(xNum) && xNum > 0) || (!isNaN(yNum) && yNum > 0)) {
        allDataRows.push({
          'Tabla': `Tabla${t + 1}`,
          'Nombre': (cells[0] || cells[1] || '').substring(0, 100),
          'Tipo': (cells.find(c => /tipo|categor/i.test(c)) || '').substring(0, 50),
          'Dirección': (cells.find(c => /calle|avda|plaza|ctra|c\//i.test(c)) || '').substring(0, 100),
          'X_UTM': cleanX,
          'Y_UTM': cleanY
        })
      }
    }
  }
  
  if (allDataRows.length === 0) {
    throw new Error('No se encontraron coordenadas válidas en el documento DOCX')
  }
  
  return { rows: allDataRows, headers: finalHeaders }
}

// ============================================================================
// PARSER ODS MEJORADO
// ============================================================================

async function parseODS(file: File): Promise<{ rows: any[], headers: string[] }> {
  // Usar XLSX que soporta ODS
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]
  
  if (data.length === 0) {
    return { rows: [], headers: [] }
  }
  
  const headers = data[0].map(h => String(h || '').trim())
  
  // Detectar columnas X/Y
  const { xCol, yCol } = detectCoordinateColumns(headers)
  
  // Si no encontramos por nombre, buscar por índice (últimas columnas numéricas)
  let xIdx = headers.indexOf(xCol || '')
  let yIdx = headers.indexOf(yCol || '')
  
  if (xIdx === -1 || yIdx === -1) {
    // Buscar columnas que se llamen X, Y directamente
    xIdx = headers.findIndex(h => /^x$/i.test(h))
    yIdx = headers.findIndex(h => /^y$/i.test(h))
  }
  
  const rows = data.slice(1).map(row => {
    const obj: any = {}
    headers.forEach((h, i) => {
      let val = row[i]
      // Limpiar coordenadas si es columna X o Y
      if ((i === xIdx || i === yIdx) && val) {
        val = cleanCoordinateValue(String(val))
      }
      obj[h] = val
    })
    return obj
  })
  
  return { rows, headers }
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

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
            // Limpiar coordenadas en CSV
            const headers = results.meta.fields || []
            const { xCol, yCol } = detectCoordinateColumns(headers)
            
            const cleanedRows = (results.data as any[]).map(row => {
              if (xCol && row[xCol]) row[xCol] = cleanCoordinateValue(String(row[xCol]))
              if (yCol && row[yCol]) row[yCol] = cleanCoordinateValue(String(row[yCol]))
              return row
            })
            
            resolve({ rows: cleanedRows, headers })
          },
          error: reject
        })
      })
    }
    
    if (extension === 'xlsx' || extension === 'xls') {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]
      
      if (data.length === 0) return { rows: [], headers: [] }
      
      const headers = data[0].map(h => String(h || ''))
      const { xCol, yCol } = detectCoordinateColumns(headers)
      const xIdx = xCol ? headers.indexOf(xCol) : -1
      const yIdx = yCol ? headers.indexOf(yCol) : -1
      
      const rows = data.slice(1).map(row => {
        const obj: any = {}
        headers.forEach((h, i) => {
          let val = row[i]
          if ((i === xIdx || i === yIdx) && val) {
            val = cleanCoordinateValue(String(val))
          }
          obj[h] = val
        })
        return obj
      })
      
      return { rows, headers }
    }
    
    if (extension === 'ods') {
      return parseODS(file)
    }
    
    if (extension === 'odt') {
      return parseODT(file)
    }
    
    if (extension === 'docx') {
      return parseDOCX(file)
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
      
      setProcessingStatus(`Procesando ${rows.length} filas...`)
      
      const { xCol, yCol } = detectCoordinateColumns(headers)
      const finalXCol = xCol || headers.find(h => /x_?utm|^x$|longitud|este/i.test(h)) || 'X_UTM'
      const finalYCol = yCol || headers.find(h => /y_?utm|^y$|latitud|norte/i.test(h)) || 'Y_UTM'
      
      setProcessingStatus('Normalizando coordenadas...')
      
      const results: NormalizationResult[] = rows.map((row) => {
        const x = row[finalXCol] || ''
        const y = row[finalYCol] || ''
        return normalizeCoordinate({
          x: String(x),
          y: String(y)
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

              <input type="file" multiple accept=".csv,.xlsx,.xls,.ods,.odt,.docx,.dbf,.zip,.geojson,.kml" onChange={handleFileSelect} className="hidden" id="file-upload" />

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
                <div><div className="font-semibold">Formatos soportados</div><div className="text-xs text-muted-foreground">8 tipos de archivo</div></div>
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {fileFormats.map((format) => (<span key={format.ext} className="px-3 py-1.5 text-xs font-medium rounded-md bg-muted/50 border border-border text-muted-foreground hover:border-primary/50 transition-colors">{format.ext}</span>))}
              </div>
            </div>

            <div className="p-5 bg-muted/20 border border-border rounded-xl min-h-[200px] flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-primary/10 rounded-xl"><Globe size={26} weight="duotone" className="text-primary" /></div>
                <div><div className="font-semibold">Sistemas de coordenadas</div><div className="text-xs text-muted-foreground">Detección automática</div></div>
              </div>
              <div className="grid grid-cols-3 gap-2 flex-1">
                {coordSystems.slice(0, 5).map((system, index) => (
                  <div key={system} className={`text-xs px-3 py-2 rounded-lg text-center transition-colors ${index === 2 ? 'bg-primary/15 border border-primary/30 text-primary font-semibold' : 'bg-muted/30 border border-border text-muted-foreground'}`}>
                    {index === 2 ? 'UTM30N ⭐' : system}
                  </div>
                ))}
                <div className="text-xs px-3 py-2 rounded-lg text-center bg-muted/30 border border-border text-muted-foreground">+8 más</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
