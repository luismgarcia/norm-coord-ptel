// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MÓDULO 5: PROCESAMIENTO INTEGRADO (CRÍTICO)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { limpiarCoordenada, CoordenadasLimpias } from './coordinateCleaning'
import {
  validarFormato,
  validarRango,
  validarCoherencia,
  calcularScoreTotal,
  scoreANivel,
  determinarNivelFinal,
  NivelConfianza
} from './coordinateValidation'
import { agregarAviso, limpiarAvisos } from './coordinateWarnings'

export interface ResultadoCoordenada {
  valor: number | null
  original: any
  score: number
  nivel: NivelConfianza
  metodo: 'PROCESADA' | 'RECHAZADA' | 'ERROR_PARSING'
  validaciones?: {
    formato: { score: number; problemas: string[] }
    rango: { score: number; problemas: string[] }
    coherencia: { score: number; problemas: string[] }
  }
}

export interface FilaProcesada {
  numeroFila: number
  X_ORIGINAL: any
  Y_ORIGINAL: any
  X: number | null
  Y: number | null
  X_SCORE: number
  Y_SCORE: number
  X_NIVEL: NivelConfianza
  Y_NIVEL: NivelConfianza
  NIVEL_FINAL: NivelConfianza
  VALIDA: 'SI' | 'NO'
  SISTEMA: string
  [key: string]: any // Para campos adicionales
}

/**
 * Procesa una coordenada individual con todo el sistema de validación
 */
export function procesarCoordenada(
  coord: any,
  tipo: 'X' | 'Y',
  fila: number,
  nombreArchivo: string,
  vecinos: Array<{ x: number; y: number }> = []
): ResultadoCoordenada {
  // PASO 1: Validación de formato
  const valFormato = validarFormato(coord)
  
  // PASO 2: Limpieza
  const resultado = limpiarCoordenada(coord)
  
  // Manejar null
  if (resultado === null) {
    agregarAviso(
      'ERROR',
      fila,
      tipo,
      'No se pudo interpretar la coordenada',
      {
        valorOriginal: coord,
        causa: 'ERROR_PARSING',
        scoreTotal: valFormato.score,
        problemas: valFormato.problemas
      }
    )
    
    return {
      valor: null,
      original: coord,
      score: 0,
      nivel: 'MUY_BAJA',
      metodo: 'ERROR_PARSING'
    }
  }
  
  // Manejar advertencia de decimales mal posicionados
  let coordLimpia: number
  let tieneAdvertencia = false
  
  if (typeof resultado === 'object' && 'advertencia' in resultado) {
    const res = resultado as CoordenadasLimpias
    coordLimpia = res.valor
    tieneAdvertencia = true
    
    agregarAviso(
      'ADVERTENCIA',
      fila,
      tipo,
      'Decimales reorganizados - posición incorrecta',
      {
        valorOriginal: res.original,
        valorProcesado: coordLimpia,
        causa: 'DECIMALES_MAL_POSICIONADOS',
        errorEstimado: '±291 metros'
      }
    )
  } else {
    coordLimpia = resultado as number
  }
  
  // PASO 3: Redondear
  const coordRedondeada = Math.round(coordLimpia)
  
  // PASO 4: Validación de rango
  const valRango = validarRango(coordRedondeada, tipo)
  
  // PASO 5: Validación de coherencia (básica - se refinará con ambas coordenadas)
  const valCoherencia = { score: 95, problemas: [] }
  
  // PASO 6: Calcular score total
  const scoreTotal = calcularScoreTotal(
    valFormato.score,
    valRango.score,
    valCoherencia.score
  )
  
  const nivel = scoreANivel(scoreTotal)
  
  // PASO 7: Generar aviso si es necesario
  if (nivel === 'MUY_BAJA' || valRango.score === 0) {
    // Detectar tipo de error
    const digitos = String(coord).replace(/[^\d]/g, '')
    const longitudEsperada = tipo === 'X' ? 6 : 7
    
    if (digitos.length < longitudEsperada) {
      agregarAviso(
        'ERROR',
        fila,
        tipo,
        'Coordenada fuera de rango - posible dígito faltante',
        {
          valorOriginal: coord,
          valorProcesado: coordRedondeada,
          causa: 'DIGITO_FALTANTE',
          digitosEncontrados: digitos.length,
          digitosEsperados: longitudEsperada,
          scoreTotal: scoreTotal
        }
      )
    } else {
      agregarAviso(
        'ERROR',
        fila,
        tipo,
        'Coordenada fuera de rango válido',
        {
          valorOriginal: coord,
          valorProcesado: coordRedondeada,
          causa: 'FUERA_RANGO',
          scoreTotal: scoreTotal
        }
      )
    }
  } else if (nivel === 'BAJA') {
    agregarAviso(
      'ADVERTENCIA',
      fila,
      tipo,
      'Coordenada con baja confianza - requiere revisión',
      {
        valorOriginal: coord,
        valorProcesado: coordRedondeada,
        causa: 'SCORE_BAJO',
        scoreTotal: scoreTotal,
        problemas: [
          ...valFormato.problemas,
          ...valRango.problemas,
          ...valCoherencia.problemas
        ]
      }
    )
  }
  
  return {
    valor: coordRedondeada,
    original: coord,
    score: scoreTotal,
    nivel: nivel,
    metodo: nivel === 'MUY_BAJA' ? 'RECHAZADA' : 'PROCESADA',
    validaciones: {
      formato: valFormato,
      rango: valRango,
      coherencia: valCoherencia
    }
  }
}

/**
 * Obtiene coordenadas vecinas para validación de coherencia
 */
export function obtenerVecinos(
  filas: any[],
  index: number,
  xColumn: string,
  yColumn: string
): Array<{ x: number; y: number }> {
  const vecinos: Array<{ x: number; y: number }> = []
  const rango = 5 // 5 filas antes y después
  
  for (let i = Math.max(0, index - rango); i < Math.min(filas.length, index + rango + 1); i++) {
    if (i !== index && filas[i][xColumn] && filas[i][yColumn]) {
      // Limpiar coordenadas de vecinos
      const xLimpio = limpiarCoordenada(filas[i][xColumn])
      const yLimpio = limpiarCoordenada(filas[i][yColumn])
      
      const x = typeof xLimpio === 'object' && 'valor' in xLimpio ? xLimpio.valor : xLimpio
      const y = typeof yLimpio === 'object' && 'valor' in yLimpio ? yLimpio.valor : yLimpio
      
      if (typeof x === 'number' && typeof y === 'number') {
        vecinos.push({ x: Math.round(x), y: Math.round(y) })
      }
    }
  }
  
  return vecinos
}

/**
 * Procesa un archivo completo con el sistema integrado
 */
export function procesarArchivoConValidacion(
  filas: any[],
  nombreArchivo: string,
  xColumn: string,
  yColumn: string
): FilaProcesada[] {
  limpiarAvisos()
  const resultados: FilaProcesada[] = []
  
  filas.forEach((fila, index) => {
    const numeroFila = index + 2 // +2: header + índice base 0
    
    // Obtener vecinos para validación de coherencia
    const vecinos = obtenerVecinos(filas, index, xColumn, yColumn)
    
    const resultadoX = procesarCoordenada(
      fila[xColumn],
      'X',
      numeroFila,
      nombreArchivo,
      vecinos
    )
    
    const resultadoY = procesarCoordenada(
      fila[yColumn],
      'Y',
      numeroFila,
      nombreArchivo,
      vecinos
    )
    
    // Validar coherencia con ambas coordenadas
    if (resultadoX.valor && resultadoY.valor) {
      const valCoherencia = validarCoherencia(
        resultadoX.valor,
        resultadoY.valor,
        vecinos
      )
      
      // Actualizar scores si hay problemas de coherencia
      if (valCoherencia.score < 80) {
        const nuevoScore = Math.min(resultadoX.score, valCoherencia.score)
        resultadoX.score = nuevoScore
        resultadoY.score = nuevoScore
        resultadoX.nivel = scoreANivel(nuevoScore)
        resultadoY.nivel = scoreANivel(nuevoScore)
        
        if (valCoherencia.problemas.length > 0) {
          agregarAviso(
            'ADVERTENCIA',
            numeroFila,
            'X',
            'Problema de coherencia detectado',
            {
              valorOriginal: fila[xColumn],
              valorProcesado: resultadoX.valor,
              causa: 'COHERENCIA_BAJA',
              scoreTotal: nuevoScore,
              problemas: valCoherencia.problemas
            }
          )
        }
      }
    }
    
    const nivelFinal = determinarNivelFinal(resultadoX.nivel, resultadoY.nivel)
    const esValida = nivelFinal !== 'MUY_BAJA'
    
    // Copiar todos los campos de la fila original
    const filaProcesada: FilaProcesada = {
      ...fila,
      numeroFila,
      X_ORIGINAL: fila[xColumn],
      Y_ORIGINAL: fila[yColumn],
      X: resultadoX.valor,
      Y: resultadoY.valor,
      X_SCORE: resultadoX.score,
      Y_SCORE: resultadoY.score,
      X_NIVEL: resultadoX.nivel,
      Y_NIVEL: resultadoY.nivel,
      NIVEL_FINAL: nivelFinal,
      VALIDA: esValida ? 'SI' : 'NO',
      SISTEMA: esValida ? 'EPSG:25830' : 'INVALIDA'
    }
    
    resultados.push(filaProcesada)
  })
  
  return resultados
}
