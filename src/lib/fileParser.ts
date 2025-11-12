import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export interface ParsedFile {
  data: any[]
  filename: string
  fileType: string
  rowCount: number
  columnCount: number
  columns: string[]
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const filename = file.name
  const extension = filename.split('.').pop()?.toLowerCase() || ''

  let data: any[] = []
  let fileType = extension.toUpperCase()

  if (extension === 'csv') {
    data = await parseCSV(file)
  } else if (['xlsx', 'xls', 'xlsb', 'xlsm', 'ods', 'fods'].includes(extension)) {
    data = await parseExcel(file)
  } else if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(extension)) {
    data = await parseDocument(file)
    fileType = `${extension.toUpperCase()} (Tabular)`
  } else {
    throw new Error(`Formato no soportado: .${extension}. Use CSV, Excel (XLS/XLSX/XLSM/XLSB), OpenDocument (ODS), o documentos con tablas (DOC/DOCX/ODT/RTF)`)
  }

  if (data.length === 0) {
    throw new Error('No se encontraron datos en el archivo. Asegúrese de que contiene una tabla con coordenadas.')
  }

  const columns = Object.keys(data[0])

  return {
    data,
    filename,
    fileType,
    rowCount: data.length,
    columnCount: columns.length,
    columns
  }
}

async function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error('CSV parsing failed'))
        } else {
          resolve(results.data as any[])
        }
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

async function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        })
        
        if (workbook.SheetNames.length === 0) {
          reject(new Error('El archivo no contiene hojas de cálculo'))
          return
        }
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
          defval: '',
          raw: false,
          dateNF: 'yyyy-mm-dd'
        })
        
        if (jsonData.length === 0) {
          reject(new Error('La primera hoja está vacía. Asegúrese de que contiene datos.'))
          return
        }
        
        resolve(jsonData)
      } catch (error) {
        reject(new Error(`Error al leer el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'))
    }

    reader.readAsArrayBuffer(file)
  })
}

async function parseDocument(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const extension = file.name.split('.').pop()?.toLowerCase() || ''

    reader.onload = async (e) => {
      try {
        const data = e.target?.result

        if (extension === 'txt') {
          const text = new TextDecoder().decode(data as ArrayBuffer)
          const parsed = parseTextTable(text)
          resolve(parsed)
          return
        }

        if (['doc', 'docx', 'odt', 'rtf'].includes(extension)) {
          try {
            const workbook = XLSX.read(data, { 
              type: 'array',
              cellDates: true,
              raw: false
            })
            
            if (workbook.SheetNames.length > 0) {
              const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
              const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
                defval: '',
                raw: false
              })
              
              if (jsonData.length > 0) {
                resolve(jsonData)
                return
              }
            }
          } catch (xlsxError) {
            console.warn('XLSX parsing failed, trying text extraction:', xlsxError)
          }

          const text = new TextDecoder().decode(data as ArrayBuffer)
          const parsed = parseTextTable(text)
          
          if (parsed.length === 0) {
            reject(new Error('No se pudo extraer una tabla del documento. Intente exportar a CSV o Excel primero.'))
            return
          }
          
          resolve(parsed)
          return
        }

        reject(new Error(`Formato de documento no soportado: ${extension}`))
      } catch (error) {
        reject(new Error(`Error al procesar el documento: ${error instanceof Error ? error.message : 'Error desconocido'}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Error al leer el documento'))
    }

    reader.readAsArrayBuffer(file)
  })
}

function parseTextTable(text: string): any[] {
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  
  if (lines.length < 2) {
    return []
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = lines[0].split(delimiter).map(h => h.trim()).filter(h => h.length > 0)
  
  if (headers.length === 0) {
    return []
  }

  const data: any[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim())
    const row: any = {}
    
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    data.push(row)
  }

  return data
}

function detectDelimiter(line: string): string {
  const delimiters = ['\t', ',', ';', '|', ' ']
  let maxCount = 0
  let bestDelimiter = ','

  for (const delimiter of delimiters) {
    const count = line.split(delimiter).length
    if (count > maxCount) {
      maxCount = count
      bestDelimiter = delimiter
    }
  }

  return bestDelimiter
}

export function normalizeTextForGIS(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  let text = String(value).trim()

  text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  text = text.replace(/[""]/g, '"')
  text = text.replace(/['']/g, "'")
  text = text.replace(/[–—]/g, '-')
  text = text.replace(/…/g, '...')
  text = text.replace(/[\u2022\u2023\u2043]/g, '*')

  text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')

  text = text.replace(/\s+/g, ' ')

  text = text.replace(/"/g, '""')

  return text.trim()
}

export function generateCSV(
  data: any[],
  xColumn: string,
  yColumn: string,
  convertedCoords: Array<{ x: number; y: number; isValid: boolean }>
): string {
  const rows: string[] = []
  
  if (data.length === 0) {
    return ''
  }

  const allColumns = Object.keys(data[0])
  const otherColumns = allColumns.filter(col => col !== xColumn && col !== yColumn)
  
  const headers = ['X_UTM30', 'Y_UTM30', ...otherColumns.map(col => normalizeTextForGIS(col))]
  rows.push(headers.map(h => `"${h}"`).join(','))

  data.forEach((row, index) => {
    const converted = convertedCoords[index]
    if (converted && converted.isValid) {
      const csvRow = [
        converted.x.toFixed(2),
        converted.y.toFixed(2),
        ...otherColumns.map(col => {
          const value = row[col]
          const normalized = normalizeTextForGIS(value)
          return `"${normalized}"`
        })
      ]
      rows.push(csvRow.join(','))
    }
  })

  return '\ufeff' + rows.join('\n')
}

export function generateExcel(
  data: any[],
  xColumn: string,
  yColumn: string,
  convertedCoords: Array<{ x: number; y: number; isValid: boolean }>
): ArrayBuffer {
  if (data.length === 0) {
    throw new Error('No hay datos para exportar')
  }

  const allColumns = Object.keys(data[0])
  const otherColumns = allColumns.filter(col => col !== xColumn && col !== yColumn)
  
  const exportData: any[] = []
  
  data.forEach((row, index) => {
    const converted = convertedCoords[index]
    if (converted && converted.isValid) {
      const exportRow: any = {
        'X_UTM30': converted.x,
        'Y_UTM30': converted.y
      }
      
      otherColumns.forEach(col => {
        exportRow[normalizeTextForGIS(col)] = normalizeTextForGIS(row[col])
      })
      
      exportData.push(exportRow)
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'UTM30')
  
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

export function generateGeoJSON(
  data: any[],
  xColumn: string,
  yColumn: string,
  convertedCoords: Array<{ x: number; y: number; isValid: boolean }>
): string {
  if (data.length === 0) {
    return JSON.stringify({ type: 'FeatureCollection', features: [] })
  }

  const allColumns = Object.keys(data[0])
  const otherColumns = allColumns.filter(col => col !== xColumn && col !== yColumn)
  
  const features: any[] = []
  
  data.forEach((row, index) => {
    const converted = convertedCoords[index]
    if (converted && converted.isValid) {
      const properties: any = {}
      
      otherColumns.forEach(col => {
        properties[normalizeTextForGIS(col)] = normalizeTextForGIS(row[col])
      })
      
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [converted.x, converted.y]
        },
        properties
      })
    }
  })

  const geojson = {
    type: 'FeatureCollection',
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:EPSG::25830'
      }
    },
    features
  }

  return JSON.stringify(geojson, null, 2)
}

export function generateKML(
  data: any[],
  xColumn: string,
  yColumn: string,
  convertedCoords: Array<{ x: number; y: number; isValid: boolean }>
): string {
  if (data.length === 0) {
    return '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document></Document></kml>'
  }

  const allColumns = Object.keys(data[0])
  const otherColumns = allColumns.filter(col => col !== xColumn && col !== yColumn)
  
  let kml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
  kml += '  <Document>\n'
  kml += '    <name>UTM30 Coordinates</name>\n'
  
  data.forEach((row, index) => {
    const converted = convertedCoords[index]
    if (converted && converted.isValid) {
      kml += '    <Placemark>\n'
      
      const nameCol = otherColumns[0]
      if (nameCol) {
        kml += `      <name>${escapeXML(normalizeTextForGIS(row[nameCol]))}</name>\n`
      }
      
      kml += '      <ExtendedData>\n'
      otherColumns.forEach(col => {
        kml += `        <Data name="${escapeXML(normalizeTextForGIS(col))}">\n`
        kml += `          <value>${escapeXML(normalizeTextForGIS(row[col]))}</value>\n`
        kml += '        </Data>\n'
      })
      kml += '      </ExtendedData>\n'
      
      kml += '      <Point>\n'
      kml += `        <coordinates>${converted.x},${converted.y},0</coordinates>\n`
      kml += '      </Point>\n'
      kml += '    </Placemark>\n'
    }
  })
  
  kml += '  </Document>\n'
  kml += '</kml>'
  
  return kml
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function downloadFile(content: string | ArrayBuffer, filename: string, format: 'csv' | 'xlsx' | 'geojson' | 'kml') {
  let blob: Blob
  
  switch (format) {
    case 'csv':
      blob = new Blob([content as string], { type: 'text/csv;charset=utf-8;' })
      break
    case 'xlsx':
      blob = new Blob([content as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      break
    case 'geojson':
      blob = new Blob([content as string], { type: 'application/geo+json;charset=utf-8;' })
      break
    case 'kml':
      blob = new Blob([content as string], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8;' })
      break
    default:
      throw new Error(`Formato no soportado: ${format}`)
  }
  
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

export function getOutputFilename(originalFilename: string, format: 'csv' | 'xlsx' | 'geojson' | 'kml'): string {
  const parts = originalFilename.split('.')
  parts.pop()
  const nameWithoutExt = parts.join('.')
  
  return `${nameWithoutExt}_UTM30.${format}`
}
