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

  if (extension === 'csv') {
    data = await parseCSV(file)
  } else if (['xlsx', 'xls'].includes(extension)) {
    data = await parseExcel(file)
  } else {
    throw new Error(`Unsupported file format: ${extension}`)
  }

  if (data.length === 0) {
    throw new Error('No data found in file')
  }

  const columns = Object.keys(data[0])

  return {
    data,
    filename,
    fileType: extension.toUpperCase(),
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
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('File reading failed'))
    }

    reader.readAsArrayBuffer(file)
  })
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
