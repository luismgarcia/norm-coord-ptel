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

export function generateCSV(
  data: any[],
  xColumn: string,
  yColumn: string,
  convertedCoords: Array<{ x: number; y: number; isValid: boolean }>
): string {
  const rows: string[] = []
  
  const headers = ['X_UTM30', 'Y_UTM30', `${xColumn}_original`, `${yColumn}_original`]
  rows.push(headers.join(','))

  data.forEach((row, index) => {
    const converted = convertedCoords[index]
    if (converted && converted.isValid) {
      const csvRow = [
        converted.x.toFixed(2),
        converted.y.toFixed(2),
        row[xColumn],
        row[yColumn]
      ]
      rows.push(csvRow.join(','))
    }
  })

  return rows.join('\n')
}

export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
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

export function getOutputFilename(originalFilename: string): string {
  const parts = originalFilename.split('.')
  const extension = parts.pop()
  const nameWithoutExt = parts.join('.')
  
  return `${nameWithoutExt}_UTM30.csv`
}
