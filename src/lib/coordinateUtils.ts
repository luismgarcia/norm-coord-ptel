import proj4 from 'proj4'

proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs')
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs')
proj4.defs('EPSG:4258', '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs')
proj4.defs('EPSG:23030', '+proj=utm +zone=30 +ellps=intl +units=m +no_defs +type=crs')

export interface CoordinateSystem {
  name: string
  code: string
  description: string
}

export interface CoordinateData {
  original: { x: number; y: number }
  converted: { x: number; y: number }
  rowIndex: number
  isValid: boolean
  error?: string
}

export interface DetectionResult {
  system: CoordinateSystem
  confidence: number
  xColumn: string
  yColumn: string
  sampleCoords: Array<{ x: number; y: number }>
}

const COORDINATE_SYSTEMS: CoordinateSystem[] = [
  { name: 'WGS84 Geographic', code: 'EPSG:4326', description: 'Latitude/Longitude (WGS84)' },
  { name: 'ETRS89 Geographic', code: 'EPSG:4258', description: 'Latitude/Longitude (ETRS89)' },
  { name: 'ED50 UTM Zone 30N', code: 'EPSG:23030', description: 'UTM Zone 30 (ED50)' },
  { name: 'ETRS89 UTM Zone 30N', code: 'EPSG:25830', description: 'UTM Zone 30 (ETRS89)' }
]

export function detectCoordinateSystem(data: any[]): DetectionResult | null {
  if (!data || data.length === 0) return null

  const headers = Object.keys(data[0])
  const coordPairs = findCoordinateColumns(headers, data)

  if (coordPairs.length === 0) return null

  const bestPair = coordPairs[0]
  const samples = data.slice(0, Math.min(10, data.length)).map(row => ({
    x: parseFloat(row[bestPair.xCol]),
    y: parseFloat(row[bestPair.yCol])
  })).filter(coord => !isNaN(coord.x) && !isNaN(coord.y))

  if (samples.length === 0) return null

  const detectedSystem = identifyCoordinateSystem(samples)

  return {
    system: detectedSystem,
    confidence: 0.95,
    xColumn: bestPair.xCol,
    yColumn: bestPair.yCol,
    sampleCoords: samples
  }
}

function findCoordinateColumns(headers: string[], data: any[]): Array<{ xCol: string; yCol: string; score: number }> {
  const pairs: Array<{ xCol: string; yCol: string; score: number }> = []

  const xPatterns = /^(x|lon|long|longitude|este|easting|coord_?x)$/i
  const yPatterns = /^(y|lat|latitude|norte|northing|coord_?y)$/i

  const xCandidates = headers.filter(h => xPatterns.test(h.trim()))
  const yCandidates = headers.filter(h => yPatterns.test(h.trim()))

  for (const xCol of xCandidates) {
    for (const yCol of yCandidates) {
      const score = calculatePairScore(xCol, yCol, data)
      if (score > 0) {
        pairs.push({ xCol, yCol, score })
      }
    }
  }

  if (pairs.length === 0) {
    for (let i = 0; i < headers.length; i++) {
      for (let j = i + 1; j < headers.length; j++) {
        const score = calculatePairScore(headers[i], headers[j], data)
        if (score > 0.5) {
          pairs.push({ xCol: headers[i], yCol: headers[j], score })
        }
      }
    }
  }

  return pairs.sort((a, b) => b.score - a.score)
}

function calculatePairScore(xCol: string, yCol: string, data: any[]): number {
  const samples = data.slice(0, 10)
  let validCount = 0

  for (const row of samples) {
    const x = parseFloat(row[xCol])
    const y = parseFloat(row[yCol])
    if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
      validCount++
    }
  }

  return validCount / samples.length
}

function identifyCoordinateSystem(samples: Array<{ x: number; y: number }>): CoordinateSystem {
  const first = samples[0]

  if (Math.abs(first.x) <= 180 && Math.abs(first.y) <= 90) {
    return COORDINATE_SYSTEMS[0]
  }

  if (first.x > 100000 && first.x < 900000 && first.y > 3000000 && first.y < 6000000) {
    return COORDINATE_SYSTEMS[3]
  }

  return COORDINATE_SYSTEMS[0]
}

export function convertToUTM30(
  data: any[],
  sourceSystem: string,
  xColumn: string,
  yColumn: string
): CoordinateData[] {
  const results: CoordinateData[] = []

  data.forEach((row, index) => {
    const x = parseFloat(row[xColumn])
    const y = parseFloat(row[yColumn])

    if (isNaN(x) || isNaN(y)) {
      results.push({
        original: { x: 0, y: 0 },
        converted: { x: 0, y: 0 },
        rowIndex: index,
        isValid: false,
        error: 'Invalid coordinate values'
      })
      return
    }

    try {
      let converted: [number, number]
      
      if (sourceSystem === 'EPSG:25830') {
        converted = [x, y]
      } else {
        converted = proj4(sourceSystem, 'EPSG:25830', [x, y])
      }

      results.push({
        original: { x, y },
        converted: { x: converted[0], y: converted[1] },
        rowIndex: index,
        isValid: true
      })
    } catch (error) {
      results.push({
        original: { x, y },
        converted: { x: 0, y: 0 },
        rowIndex: index,
        isValid: false,
        error: 'Conversion failed'
      })
    }
  })

  return results
}

export function validateCoordinate(x: number, y: number, system: string): boolean {
  if (!isFinite(x) || !isFinite(y)) return false

  if (system === 'EPSG:4326' || system === 'EPSG:4258') {
    return Math.abs(x) <= 180 && Math.abs(y) <= 90
  }

  if (system === 'EPSG:25830' || system === 'EPSG:23030') {
    return x > 100000 && x < 900000 && y > 3000000 && y < 6000000
  }

  return true
}

export function calculateBounds(coords: Array<{ x: number; y: number }>) {
  if (coords.length === 0) return null

  const validCoords = coords.filter(c => isFinite(c.x) && isFinite(c.y))
  if (validCoords.length === 0) return null

  return {
    minX: Math.min(...validCoords.map(c => c.x)),
    maxX: Math.max(...validCoords.map(c => c.x)),
    minY: Math.min(...validCoords.map(c => c.y)),
    maxY: Math.max(...validCoords.map(c => c.y))
  }
}

export function formatCoordinate(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}
