// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MÓDULO 1: LIMPIEZA DE COORDENADAS (CRÍTICO)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CoordenadasLimpias {
  valor: number
  advertencia?: 'DECIMALES_MAL_POSICIONADOS'
  original: any
}

/**
 * Limpia y normaliza una coordenada soportando 9 formatos diferentes
 * @param coord - Coordenada original en cualquier formato
 * @returns Número limpio o null si no se puede procesar
 */
export function limpiarCoordenada(coord: any): number | CoordenadasLimpias | null {
  if (!coord || coord === '' || coord === 'nan') return null
  
  let coordStr = String(coord).trim()
  
  // PASO 0: Normalizar espacios múltiples
  coordStr = coordStr.replace(/\s+/g, ' ')
  
  // CASO 1: Comillas invertidas dobles ´´
  if (coordStr.includes('´´')) {
    const digitos = coordStr.match(/\d+/g) || []
    
    if (digitos.length >= 2) {
      const decimales = digitos[digitos.length - 1]
      const parteEntera = digitos.slice(0, -1).join('')
      
      // Detectar decimales mal posicionados
      if (parteEntera.length < decimales.length && decimales.length > 2) {
        const decsReales = decimales.slice(0, 2)
        const restoEntero = decimales.slice(2)
        coordStr = `${parteEntera}${restoEntero}.${decsReales}`
        
        return {
          valor: parseFloat(coordStr),
          advertencia: 'DECIMALES_MAL_POSICIONADOS',
          original: coord
        }
      } else {
        coordStr = `${parteEntera}.${decimales}`
      }
    } else if (digitos.length === 1) {
      coordStr = digitos[0]
    } else {
      return null
    }
  }
  // CASO 2: Acento agudo U+0301 ́
  else if (coordStr.includes('́') || coordStr.includes('̀')) {
    coordStr = coordStr.replace(/\s/g, '')
    const digitos = coordStr.match(/\d+/g) || []
    
    if (digitos.length >= 2) {
      const decimales = digitos[digitos.length - 1]
      const parteEntera = digitos.slice(0, -1).join('')
      
      if (decimales.length <= 2) {
        coordStr = `${parteEntera}.${decimales}`
      } else {
        const resto = decimales.slice(0, -2)
        const decs = decimales.slice(-2)
        coordStr = `${parteEntera}${resto}.${decs}`
      }
    } else {
      coordStr = digitos.join('')
    }
  }
  // CASO 3: Formatos normales
  else {
    coordStr = coordStr.replace(/\s/g, '')
    
    const numPuntos = (coordStr.match(/\./g) || []).length
    const numComas = (coordStr.match(/,/g) || []).length
    
    if (numComas > 0 && numPuntos > 0) {
      coordStr = coordStr.replace(/\./g, '').replace(',', '.')
    } else if (numComas === 1 && numPuntos === 0) {
      coordStr = coordStr.replace(',', '.')
    } else if (numPuntos > 1) {
      coordStr = coordStr.replace(/\./g, '')
    }
  }
  
  const numero = parseFloat(coordStr)
  return isNaN(numero) ? null : numero
}
