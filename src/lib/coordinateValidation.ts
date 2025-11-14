// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MÓDULO 2: CONFIGURACIÓN Y CONSTANTES (CRÍTICO)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const RANGOS_UTM30 = {
  X_MIN: 166000,
  X_MAX: 833000,
  Y_MIN: 4000000,
  Y_MAX: 4900000
}

export type NivelConfianza = 'ALTA' | 'MEDIA' | 'BAJA' | 'MUY_BAJA'

export interface NivelConfig {
  min: number
  color: string
  nombre: string
}

// Niveles de confianza
export const NIVELES: Record<NivelConfianza, NivelConfig> = {
  ALTA: { min: 95, color: '#10B981', nombre: 'Alta confianza' },
  MEDIA: { min: 70, color: '#F59E0B', nombre: 'Media confianza' },
  BAJA: { min: 50, color: '#EF4444', nombre: 'Baja confianza' },
  MUY_BAJA: { min: 0, color: '#991B1B', nombre: 'Muy baja confianza' }
}

export interface ValidacionResultado {
  score: number
  problemas: string[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MÓDULO 3: VALIDACIÓN MULTI-NIVEL (IMPORTANTE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Nivel 1: Validación de Formato
 */
export function validarFormato(coordOriginal: any): ValidacionResultado {
  if (!coordOriginal) return { score: 0, problemas: ['Sin valor'] }
  
  const coordStr = String(coordOriginal)
  let score = 100
  const problemas: string[] = []
  
  // Tiene dígitos
  const digitos = (coordStr.match(/\d/g) || []).length
  if (digitos === 0) {
    score = 0
    problemas.push('No contiene dígitos')
    return { score, problemas }
  }
  
  // Longitud razonable
  if (coordStr.length < 3 || coordStr.length > 30) {
    score -= 40
    problemas.push(`Longitud inusual: ${coordStr.length} caracteres`)
  }
  
  // Proporción de dígitos
  const proporcion = digitos / coordStr.length
  if (proporcion < 0.5) {
    score -= 30
    problemas.push(`Pocos dígitos: ${(proporcion * 100).toFixed(0)}%`)
  }
  
  // Caracteres raros
  const caracteresPermitidos = /[\d\s.,´́̀]/g
  const raros = coordStr.split('').filter(c => !caracteresPermitidos.test(c))
  if (raros.length > 5) {
    score -= 20
    problemas.push(`Muchos caracteres raros: ${raros.length}`)
  }
  
  return { score: Math.max(0, score), problemas }
}

/**
 * Nivel 2: Validación de Rango
 */
export function validarRango(coord: number | null, tipo: 'X' | 'Y'): ValidacionResultado {
  if (!coord || isNaN(coord)) {
    return { score: 0, problemas: ['Valor no numérico'] }
  }
  
  let score = 100
  const problemas: string[] = []
  
  const rango = RANGOS_UTM30
  const min = tipo === 'X' ? rango.X_MIN : rango.Y_MIN
  const max = tipo === 'X' ? rango.X_MAX : rango.Y_MAX
  
  if (coord < min || coord > max) {
    score = 0
    problemas.push(`Fuera de rango UTM30: ${coord.toLocaleString()} (esperado ${min.toLocaleString()}-${max.toLocaleString()})`)
  }
  
  // Validar longitud de dígitos
  const digitosStr = String(Math.floor(coord)).length
  const esperado = tipo === 'X' ? [6, 7, 8] : [7, 8, 9, 10]
  
  if (!esperado.includes(digitosStr)) {
    score -= 30
    problemas.push(`Longitud inusual: ${digitosStr} dígitos (esperado ${esperado.join(' o ')})`)
  }
  
  return { score: Math.max(0, score), problemas }
}

/**
 * Nivel 3: Validación de Coherencia
 */
export function validarCoherencia(
  x: number | null, 
  y: number | null, 
  vecinos: Array<{ x: number; y: number }> = []
): ValidacionResultado {
  let score = 100
  const problemas: string[] = []
  
  // Proporción X/Y (para UTM30 en España, Y/X suele ser 7.5-9.0)
  if (x && y && x > 0 && y > 0) {
    const proporcion = y / x
    if (proporcion < 7.0 || proporcion > 10.0) {
      score -= 20
      problemas.push(`Proporción Y/X inusual: ${proporcion.toFixed(2)} (esperado 7.5-9.0)`)
    }
  }
  
  // Validar contra vecinos (si hay)
  if (x && y && vecinos.length >= 3) {
    const vecinosValidos = vecinos.filter(v => v.x && v.y)
    
    if (vecinosValidos.length >= 3) {
      const mediaX = vecinosValidos.reduce((sum, v) => sum + v.x, 0) / vecinosValidos.length
      const mediaY = vecinosValidos.reduce((sum, v) => sum + v.y, 0) / vecinosValidos.length
      
      const distX = Math.abs(x - mediaX)
      const distY = Math.abs(y - mediaY)
      
      // Si está muy lejos de vecinos (>5km)
      if (distX > 5000 || distY > 5000) {
        score -= 40
        problemas.push(`Muy alejada de vecinos: ${Math.max(distX, distY).toFixed(0)}m`)
      }
    }
  }
  
  return { score: Math.max(0, score), problemas }
}

/**
 * Scoring Combinado
 */
export function calcularScoreTotal(
  scoreFormato: number, 
  scoreRango: number, 
  scoreCoherencia: number
): number {
  // Pesos: Rango es más importante
  const total = (
    scoreFormato * 0.3 +
    scoreRango * 0.4 +
    scoreCoherencia * 0.3
  )
  
  return Math.round(total)
}

/**
 * Convertir score a nivel de confianza
 */
export function scoreANivel(score: number): NivelConfianza {
  if (score >= 95) return 'ALTA'
  if (score >= 70) return 'MEDIA'
  if (score >= 50) return 'BAJA'
  return 'MUY_BAJA'
}

/**
 * Determinar nivel final entre X e Y
 */
export function determinarNivelFinal(nivelX: NivelConfianza, nivelY: NivelConfianza): NivelConfianza {
  const niveles: NivelConfianza[] = ['MUY_BAJA', 'BAJA', 'MEDIA', 'ALTA']
  const indexX = niveles.indexOf(nivelX)
  const indexY = niveles.indexOf(nivelY)
  
  // Retornar el peor nivel
  return niveles[Math.min(indexX, indexY)]
}
