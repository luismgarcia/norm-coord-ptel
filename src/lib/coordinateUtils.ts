import proj4 from 'proj4'

proj4.defs('EPSG:25830', '+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs')
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs +type=crs')
proj4.defs('EPSG:4258', '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs')
proj4.defs('EPSG:23030', '+proj=utm +zone=30 +ellps=intl +units=m +no_defs +type=crs')
proj4.defs('EPSG:25829', '+proj=utm +zone=29 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs')
proj4.defs('EPSG:25831', '+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs')
proj4.defs('EPSG:23029', '+proj=utm +zone=29 +ellps=intl +units=m +no_defs +type=crs')
proj4.defs('EPSG:23031', '+proj=utm +zone=31 +ellps=intl +units=m +no_defs +type=crs')
proj4.defs('EPSG:32630', '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs +type=crs')
proj4.defs('EPSG:32629', '+proj=utm +zone=29 +datum=WGS84 +units=m +no_defs +type=crs')
proj4.defs('EPSG:32631', '+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs +type=crs')
proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs')
proj4.defs('EPSG:2154', '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs')
proj4.defs('EPSG:27700', '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs +type=crs')
proj4.defs('EPSG:2062', '+proj=tmerc +lat_0=0 +lon_0=-73.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=aust_SA +units=m +no_defs +type=crs')

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIPOS E INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CoordinateSystem {
  name: string
  code: string
  description: string
  zone?: string
}

export interface NormalizationResult {
  value: number
  warning?: string
  original: any
}

export interface ValidationScore {
  score: number
  problems: string[]
}

export interface CoordinateQuality {
  formatScore: number
  rangeScore: number
  coherenceScore: number
  totalScore: number
  level: 'ALTA' | 'MEDIA' | 'BAJA' | 'MUY_BAJA'
  warnings: string[]
}

export interface CoordinateData {
  original: { x: number; y: number }
  converted: { x: number; y: number }
  rowIndex: number
  isValid: boolean
  error?: string
  normalizedFrom?: string
  quality?: CoordinateQuality
}

export interface DetectionResult {
  system: CoordinateSystem
  confidence: number
  xColumn: string
  yColumn: string
  sampleCoords: Array<{ x: number; y: number }>
  normalizedCount: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTES DE VALIDACIÓN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const RANGOS_UTM30 = {
  X_MIN: 166000,
  X_MAX: 833000,
  Y_MIN: 4000000,
  Y_MAX: 4900000
}

export const NIVELES_CONFIANZA = {
  ALTA: { min: 95, color: '#10B981', nombre: 'Alta confianza' },
  MEDIA: { min: 70, color: '#F59E0B', nombre: 'Media confianza' },
  BAJA: { min: 50, color: '#EF4444', nombre: 'Baja confianza' },
  MUY_BAJA: { min: 0, color: '#991B1B', nombre: 'Muy baja confianza' }
}

const COORDINATE_SYSTEMS: CoordinateSystem[] = [
  { name: 'WGS84 Geographic', code: 'EPSG:4326', description: 'Lat/Lon (WGS84) - GPS estándar' },
  { name: 'ETRS89 Geographic', code: 'EPSG:4258', description: 'Lat/Lon (ETRS89) - Oficial Europa' },
  { name: 'ED50 UTM Zone 29N', code: 'EPSG:23029', description: 'UTM Zona 29 (ED50) - Galicia', zone: '29' },
  { name: 'ED50 UTM Zone 30N', code: 'EPSG:23030', description: 'UTM Zona 30 (ED50) - España Central', zone: '30' },
  { name: 'ED50 UTM Zone 31N', code: 'EPSG:23031', description: 'UTM Zona 31 (ED50) - Cataluña', zone: '31' },
  { name: 'ETRS89 UTM Zone 29N', code: 'EPSG:25829', description: 'UTM Zona 29 (ETRS89) - Galicia', zone: '29' },
  { name: 'ETRS89 UTM Zone 30N', code: 'EPSG:25830', description: 'UTM Zona 30 (ETRS89) - España Central', zone: '30' },
  { name: 'ETRS89 UTM Zone 31N', code: 'EPSG:25831', description: 'UTM Zona 31 (ETRS89) - Cataluña', zone: '31' },
  { name: 'WGS84 UTM Zone 29N', code: 'EPSG:32629', description: 'UTM Zona 29 (WGS84)', zone: '29' },
  { name: 'WGS84 UTM Zone 30N', code: 'EPSG:32630', description: 'UTM Zona 30 (WGS84)', zone: '30' },
  { name: 'WGS84 UTM Zone 31N', code: 'EPSG:32631', description: 'UTM Zona 31 (WGS84)', zone: '31' },
  { name: 'Web Mercator', code: 'EPSG:3857', description: 'Proyección Web (Google/OSM)' },
  { name: 'Lambert 93 (France)', code: 'EPSG:2154', description: 'Lambert Conforme Francia' },
  { name: 'British National Grid', code: 'EPSG:27700', description: 'OSGB36 Reino Unido' },
  { name: 'Colombia Bogota', code: 'EPSG:2062', description: 'Transversal Mercator Colombia' }
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NORMALIZACIÓN AVANZADA DE COORDENADAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function normalizeCoordinateValue(value: any): number | NormalizationResult | null {
  if (typeof value === 'number' && isFinite(value)) {
    return value
  }

  if (value === null || value === undefined || value === '' || value === 'nan') {
    return null
  }

  let strValue = String(value).trim()
  const originalValue = strValue
  
  // PASO 0: Normalizar espacios múltiples
  strValue = strValue.replace(/\s+/g, ' ')

  // CASO 1: Comillas invertidas dobles ´´
  if (strValue.includes('´´')) {
    const digitos = strValue.match(/\d+/g) || []
    
    if (digitos.length >= 2) {
      const decimales = digitos[digitos.length - 1]
      const parteEntera = digitos.slice(0, -1).join('')
      
      // Detectar decimales mal posicionados
      if (parteEntera.length < decimales.length && decimales.length > 2) {
        const decsReales = decimales.slice(0, 2)
        const restoEntero = decimales.slice(2)
        const coordStr = `${parteEntera}${restoEntero}.${decsReales}`
        
        return {
          value: parseFloat(coordStr),
          warning: 'DECIMALES_MAL_POSICIONADOS',
          original: originalValue
        }
      } else {
        strValue = `${parteEntera}.${decimales}`
      }
    } else if (digitos.length === 1) {
      strValue = digitos[0]
    } else {
      return null
    }
  }
  // CASO 2: Acento agudo U+0301 ́ o grave ̀
  else if (strValue.includes('\u0301') || strValue.includes('\u0300')) {
    strValue = strValue.replace(/\s/g, '')
    const digitos = strValue.match(/\d+/g) || []
    
    if (digitos.length >= 2) {
      const decimales = digitos[digitos.length - 1]
      const parteEntera = digitos.slice(0, -1).join('')
      
      if (decimales.length <= 2) {
        strValue = `${parteEntera}.${decimales}`
      } else {
        const resto = decimales.slice(0, -2)
        const decs = decimales.slice(-2)
        strValue = `${parteEntera}${resto}.${decs}`
      }
    } else {
      strValue = digitos.join('')
    }
  }
  // CASO 3: Formato DMS (grados, minutos, segundos)
  else {
    const dmsPattern = /^([+-]?\d+)[°\s]+(\d+)[′'\s]+(\d+(?:\.\d+)?)[″"]?\s*([NSEW]?)$/i
    const dmsMatch = strValue.match(dmsPattern)
    if (dmsMatch) {
      const degrees = parseFloat(dmsMatch[1])
      const minutes = parseFloat(dmsMatch[2])
      const seconds = parseFloat(dmsMatch[3])
      const direction = dmsMatch[4].toUpperCase()
      
      let decimal = degrees + minutes / 60 + seconds / 3600
      
      if (direction === 'S' || direction === 'W') {
        decimal = -decimal
      }
      
      return decimal
    }

    // CASO 4: Formato DM (grados, minutos decimales)
    const dmPattern = /^([+-]?\d+)[°\s]+(\d+(?:\.\d+)?)[′']?\s*([NSEW]?)$/i
    const dmMatch = strValue.match(dmPattern)
    if (dmMatch) {
      const degrees = parseFloat(dmMatch[1])
      const minutes = parseFloat(dmMatch[2])
      const direction = dmMatch[3].toUpperCase()
      
      let decimal = degrees + minutes / 60
      
      if (direction === 'S' || direction === 'W') {
        decimal = -decimal
      }
      
      return decimal
    }

    // CASO 5: Eliminar caracteres no numéricos (excepto separadores)
    strValue = strValue.replace(/[^\d.,\-+eE\s]/g, '')
    
    // CASO 6: Procesar espacios como separadores de miles
    // Ejemplo: "506 527" → "506527" o "4 076 367" → "4076367"
    const espaciosPattern = /^[\d\s]+$/
    if (espaciosPattern.test(strValue) && !strValue.includes('.') && !strValue.includes(',')) {
      strValue = strValue.replace(/\s/g, '')
    }
    
    // CASO 7: Separadores decimales mixtos
    const numPuntos = (strValue.match(/\./g) || []).length
    const numComas = (strValue.match(/,/g) || []).length
    
    if (numComas > 0 && numPuntos > 0) {
      // Formato europeo: puntos como miles, coma como decimal
      // Ejemplo: "4.076.556,75" → "4076556.75"
      strValue = strValue.replace(/\./g, '').replace(',', '.')
    } else if (numComas === 1 && numPuntos === 0) {
      // Solo coma: es decimal
      // Ejemplo: "506527,45" → "506527.45"
      strValue = strValue.replace(',', '.')
    } else if (numPuntos > 1) {
      // Múltiples puntos: son separadores de miles
      // Ejemplo: "4.076.556" → "4076556"
      strValue = strValue.replace(/\./g, '')
    }
    
    // Eliminar espacios restantes
    strValue = strValue.replace(/\s/g, '')
  }

  const parsed = parseFloat(strValue)
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return null
  }

  return parsed
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SISTEMA DE VALIDACIÓN MULTI-NIVEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Nivel 1: Validación de Formato
export function validarFormato(coordOriginal: any): ValidationScore {
  if (!coordOriginal) return { score: 0, problems: ['Sin valor'] }
  
  const coordStr = String(coordOriginal)
  let score = 100
  const problems: string[] = []
  
  // Verificar presencia de dígitos
  const digitos = (coordStr.match(/\d/g) || []).length
  if (digitos === 0) {
    return { score: 0, problems: ['No contiene dígitos'] }
  }
  
  // Validar longitud razonable
  if (coordStr.length < 3 || coordStr.length > 30) {
    score -= 40
    problems.push(`Longitud inusual: ${coordStr.length} caracteres`)
  }
  
  // Validar proporción de dígitos
  const proporcion = digitos / coordStr.length
  if (proporcion < 0.5) {
    score -= 30
    problems.push(`Pocos dígitos: ${(proporcion * 100).toFixed(0)}%`)
  }
  
  // Detectar caracteres raros
  const caracteresPermitidos = /[\d\s.,´́̀°′″'"]/g
  const raros = coordStr.split('').filter(c => !caracteresPermitidos.test(c))
  if (raros.length > 5) {
    score -= 20
    problems.push(`Muchos caracteres raros: ${raros.length}`)
  }
  
  return { score: Math.max(0, score), problems }
}

// Nivel 2: Validación de Rango
export function validarRango(coord: number, tipo: 'X' | 'Y'): ValidationScore {
  if (!coord || isNaN(coord)) {
    return { score: 0, problems: ['Valor no numérico'] }
  }
  
  let score = 100
  const problems: string[] = []
  
  const min = tipo === 'X' ? RANGOS_UTM30.X_MIN : RANGOS_UTM30.Y_MIN
  const max = tipo === 'X' ? RANGOS_UTM30.X_MAX : RANGOS_UTM30.Y_MAX
  
  // Validar rango UTM30
  if (coord < min || coord > max) {
    score = 0
    problems.push(`Fuera de rango UTM30: ${coord.toLocaleString()} (esperado ${min.toLocaleString()}-${max.toLocaleString()})`)
  }
  
  // Validar longitud de dígitos
  const digitosStr = String(Math.floor(coord)).length
  const esperado = tipo === 'X' ? [6, 7] : [7]
  
  if (!esperado.includes(digitosStr)) {
    score -= 30
    problems.push(`Longitud inusual: ${digitosStr} dígitos (esperado ${esperado.join(' o ')})`)
  }
  
  return { score: Math.max(0, score), problems }
}

// Nivel 3: Validación de Coherencia
export function validarCoherencia(x: number, y: number, vecinos: Array<{ x: number; y: number }> = []): ValidationScore {
  let score = 100
  const problems: string[] = []
  
  // Validar proporción Y/X (para UTM30 en España, Y/X suele estar entre 7.5-9.0)
  if (x && y && x > 0 && y > 0) {
    const proporcion = y / x
    if (proporcion < 7.0 || proporcion > 10.0) {
      score -= 20
      problems.push(`Proporción Y/X inusual: ${proporcion.toFixed(2)} (esperado 7.5-9.0)`)
    }
  }
  
  // Validar contra vecinos (si hay suficientes)
  if (vecinos.length >= 3) {
    const vecinosValidos = vecinos.filter(v => v.x && v.y && isFinite(v.x) && isFinite(v.y))
    
    if (vecinosValidos.length >= 3) {
      const mediaX = vecinosValidos.reduce((sum, v) => sum + v.x, 0) / vecinosValidos.length
      const mediaY = vecinosValidos.reduce((sum, v) => sum + v.y, 0) / vecinosValidos.length
      
      const distX = Math.abs(x - mediaX)
      const distY = Math.abs(y - mediaY)
      
      // Si está muy lejos de vecinos (>20km)
      const distancia = Math.sqrt(distX * distX + distY * distY)
      if (distancia > 20000) {
        score -= 40
        problems.push(`Muy alejada de vecinos: ${(distancia / 1000).toFixed(1)}km`)
      }
    }
  }
  
  return { score: Math.max(0, score), problems }
}

// Scoring Combinado
export function calcularScoreTotal(scoreFormato: number, scoreRango: number, scoreCoherencia: number): number {
  // Pesos: Rango es más importante (40%), Formato 30%, Coherencia 30%
  const total = (
    scoreFormato * 0.3 +
    scoreRango * 0.4 +
    scoreCoherencia * 0.3
  )
  
  return Math.round(total)
}

export function scoreANivel(score: number): 'ALTA' | 'MEDIA' | 'BAJA' | 'MUY_BAJA' {
  if (score >= 95) return 'ALTA'
  if (score >= 70) return 'MEDIA'
  if (score >= 50) return 'BAJA'
  return 'MUY_BAJA'
}

// Función para calcular calidad de coordenada completa
export function calcularCalidadCoordenada(
  valorOriginalX: any,
  valorOriginalY: any,
  xNormalizado: number,
  yNormalizado: number,
  vecinos: Array<{ x: number; y: number }> = []
): CoordinateQuality {
  const formatoX = validarFormato(valorOriginalX)
  const formatoY = validarFormato(valorOriginalY)
  const rangoX = validarRango(xNormalizado, 'X')
  const rangoY = validarRango(yNormalizado, 'Y')
  const coherencia = validarCoherencia(xNormalizado, yNormalizado, vecinos)
  
  // Usar el score mínimo entre X e Y para cada categoría
  const formatoScore = Math.min(formatoX.score, formatoY.score)
  const rangoScore = Math.min(rangoX.score, rangoY.score)
  const coherenciaScore = coherencia.score
  
  const totalScore = calcularScoreTotal(formatoScore, rangoScore, coherenciaScore)
  const level = scoreANivel(totalScore)
  
  const warnings = [
    ...formatoX.problems,
    ...formatoY.problems,
    ...rangoX.problems,
    ...rangoY.problems,
    ...coherencia.problems
  ]
  
  return {
    formatScore: formatoScore,
    rangeScore: rangoScore,
    coherenceScore: coherenciaScore,
    totalScore,
    level,
    warnings
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FUNCIONES PRINCIPALES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function detectCoordinateSystem(data: any[]): DetectionResult | null {
  if (!data || data.length === 0) return null

  const headers = Object.keys(data[0])
  const coordPairs = findCoordinateColumns(headers, data)

  if (coordPairs.length === 0) return null

  const bestPair = coordPairs[0]
  let normalizedCount = 0
  
  const samples = data.slice(0, Math.min(20, data.length))
    .map(row => {
      const rawX = row[bestPair.xCol]
      const rawY = row[bestPair.yCol]
      
      const resultX = normalizeCoordinateValue(rawX)
      const resultY = normalizeCoordinateValue(rawY)
      
      const x = typeof resultX === 'object' && resultX !== null ? resultX.value : resultX
      const y = typeof resultY === 'object' && resultY !== null ? resultY.value : resultY
      
      if (x !== null && y !== null) {
        if (rawX !== x || rawY !== y) {
          normalizedCount++
        }
        return { x, y }
      }
      return null
    })
    .filter((coord): coord is { x: number; y: number } => coord !== null)

  if (samples.length === 0) return null

  const detectedSystem = identifyCoordinateSystem(samples)

  return {
    system: detectedSystem,
    confidence: 0.95,
    xColumn: bestPair.xCol,
    yColumn: bestPair.yCol,
    sampleCoords: samples,
    normalizedCount
  }
}

function findCoordinateColumns(headers: string[], data: any[]): Array<{ xCol: string; yCol: string; score: number }> {
  const pairs: Array<{ xCol: string; yCol: string; score: number }> = []

  const xPatterns = /^(x|lon|long|longitude|longitud|este|easting|coord_?x|east)$/i
  const yPatterns = /^(y|lat|latitude|latitud|norte|northing|coord_?y|north)$/i

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
  const samples = data.slice(0, 20)
  let validCount = 0

  for (const row of samples) {
    const resultX = normalizeCoordinateValue(row[xCol])
    const resultY = normalizeCoordinateValue(row[yCol])
    
    const x = typeof resultX === 'object' && resultX !== null ? resultX.value : resultX
    const y = typeof resultY === 'object' && resultY !== null ? resultY.value : resultY
    
    if (x !== null && y !== null) {
      validCount++
    }
  }

  return validCount / samples.length
}

function identifyCoordinateSystem(samples: Array<{ x: number; y: number }>): CoordinateSystem {
  const avgX = samples.reduce((sum, s) => sum + Math.abs(s.x), 0) / samples.length
  const avgY = samples.reduce((sum, s) => sum + Math.abs(s.y), 0) / samples.length
  const first = samples[0]

  if (Math.abs(first.x) <= 180 && Math.abs(first.y) <= 90) {
    const inSpain = first.y > 27 && first.y < 44 && first.x > -18 && first.x < 5
    return inSpain ? COORDINATE_SYSTEMS[1] : COORDINATE_SYSTEMS[0]
  }

  if (avgX > 100000 && avgX < 900000 && avgY > 3000000 && avgY < 6000000) {
    const utmZone29 = avgX >= 150000 && avgX <= 350000
    const utmZone30 = avgX >= 350000 && avgX <= 650000
    const utmZone31 = avgX >= 650000 && avgX <= 850000

    if (utmZone29) {
      return COORDINATE_SYSTEMS.find(s => s.code === 'EPSG:25829') || COORDINATE_SYSTEMS[6]
    } else if (utmZone31) {
      return COORDINATE_SYSTEMS.find(s => s.code === 'EPSG:25831') || COORDINATE_SYSTEMS[7]
    } else if (utmZone30) {
      return COORDINATE_SYSTEMS.find(s => s.code === 'EPSG:25830') || COORDINATE_SYSTEMS[6]
    }
    
    return COORDINATE_SYSTEMS[6]
  }

  if (avgX > 2000000 && avgX < 4000000 && avgY > 2000000 && avgY < 12000000) {
    return COORDINATE_SYSTEMS.find(s => s.code === 'EPSG:3857') || COORDINATE_SYSTEMS[11]
  }

  return COORDINATE_SYSTEMS[0]
}

export function convertToUTM30(
  data: any[],
  sourceSystem: string,
  xColumn: string,
  yColumn: string,
  enableQualityScoring: boolean = true
): CoordinateData[] {
  const results: CoordinateData[] = []
  
  // Primera pasada: normalizar y convertir todas las coordenadas
  const normalizedCoords: Array<{ x: number; y: number; rawX: any; rawY: any }> = []
  
  data.forEach((row) => {
    const rawX = row[xColumn]
    const rawY = row[yColumn]
    
    const resultX = normalizeCoordinateValue(rawX)
    const resultY = normalizeCoordinateValue(rawY)
    
    const x = typeof resultX === 'object' && resultX !== null ? resultX.value : resultX
    const y = typeof resultY === 'object' && resultY !== null ? resultY.value : resultY
    
    if (x !== null && y !== null) {
      normalizedCoords.push({ x, y, rawX, rawY })
    }
  })

  // Segunda pasada: procesar con scoring de calidad
  data.forEach((row, index) => {
    const rawX = row[xColumn]
    const rawY = row[yColumn]
    
    const resultX = normalizeCoordinateValue(rawX)
    const resultY = normalizeCoordinateValue(rawY)
    
    let normalizationWarnings: string[] = []
    
    const x = typeof resultX === 'object' && resultX !== null ? resultX.value : resultX
    const y = typeof resultY === 'object' && resultY !== null ? resultY.value : resultY
    
    if (typeof resultX === 'object' && resultX !== null && resultX.warning) {
      normalizationWarnings.push(`X: ${resultX.warning}`)
    }
    if (typeof resultY === 'object' && resultY !== null && resultY.warning) {
      normalizationWarnings.push(`Y: ${resultY.warning}`)
    }

    if (x === null || y === null) {
      results.push({
        original: { x: 0, y: 0 },
        converted: { x: 0, y: 0 },
        rowIndex: index,
        isValid: false,
        error: 'Valor de coordenada inválido o no normalizable',
        normalizedFrom: `X: "${rawX}", Y: "${rawY}"`
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

      if (!isFinite(converted[0]) || !isFinite(converted[1])) {
        throw new Error('Conversión resultó en valores no finitos')
      }

      const isValidResult = validateUTM30Coordinate(converted[0], converted[1])
      
      // Calcular calidad si está habilitado
      let quality: CoordinateQuality | undefined
      if (enableQualityScoring) {
        const vecinos = normalizedCoords
          .filter((_, i) => i !== index)
          .map(c => ({ x: c.x, y: c.y }))
        
        quality = calcularCalidadCoordenada(rawX, rawY, converted[0], converted[1], vecinos)
        
        // Añadir advertencias de normalización a la calidad
        if (normalizationWarnings.length > 0) {
          quality.warnings = [...quality.warnings, ...normalizationWarnings]
        }
      }

      results.push({
        original: { x, y },
        converted: { x: converted[0], y: converted[1] },
        rowIndex: index,
        isValid: isValidResult,
        error: isValidResult ? undefined : 'Coordenada fuera de rango válido UTM30',
        normalizedFrom: (rawX !== x || rawY !== y) ? `X: "${rawX}" → ${x}, Y: "${rawY}" → ${y}` : undefined,
        quality
      })
    } catch (error) {
      results.push({
        original: { x, y },
        converted: { x: 0, y: 0 },
        rowIndex: index,
        isValid: false,
        error: `Error de conversión: ${error instanceof Error ? error.message : 'Desconocido'}`,
        normalizedFrom: (rawX !== x || rawY !== y) ? `X: "${rawX}" → ${x}, Y: "${rawY}" → ${y}` : undefined
      })
    }
  })

  return results
}

function validateUTM30Coordinate(x: number, y: number): boolean {
  return x >= RANGOS_UTM30.X_MIN && 
         x <= RANGOS_UTM30.X_MAX && 
         y >= RANGOS_UTM30.Y_MIN && 
         y <= RANGOS_UTM30.Y_MAX
}

export function validateCoordinate(x: number, y: number, system: string): boolean {
  if (!isFinite(x) || !isFinite(y)) return false

  if (system === 'EPSG:4326' || system === 'EPSG:4258') {
    return Math.abs(x) <= 180 && Math.abs(y) <= 90
  }

  if (system.includes('25830') || system.includes('23030') || system.includes('32630')) {
    return validateUTM30Coordinate(x, y)
  }

  if (system.includes('UTM') || system.includes('258') || system.includes('230') || system.includes('326')) {
    return x > 100000 && x < 1000000 && y > 1000000 && y < 10000000
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

export function getCoordinateSystems(): CoordinateSystem[] {
  return COORDINATE_SYSTEMS
}
