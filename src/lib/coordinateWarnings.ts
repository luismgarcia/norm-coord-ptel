// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MÓDULO 4: SISTEMA DE AVISOS (IMPORTANTE)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type TipoAviso = 'ERROR' | 'ADVERTENCIA' | 'INFO'

export interface DetallesAviso {
  valorOriginal: any
  valorProcesado?: number
  causa: string
  scoreTotal?: number
  problemas?: string[]
  errorEstimado?: string
  digitosEncontrados?: number
  digitosEsperados?: number
}

export interface Aviso {
  tipo: TipoAviso
  fila: number
  campo: 'X' | 'Y'
  mensaje: string
  detalles: DetallesAviso
  timestamp: string
}

class SistemaAvisos {
  private avisos: Aviso[] = []

  agregarAviso(
    tipo: TipoAviso, 
    fila: number, 
    campo: 'X' | 'Y', 
    mensaje: string, 
    detalles: DetallesAviso
  ): void {
    this.avisos.push({
      tipo,
      fila,
      campo,
      mensaje,
      detalles,
      timestamp: new Date().toISOString()
    })
  }

  obtenerAvisos(): Aviso[] {
    return [...this.avisos]
  }

  obtenerPorTipo(tipo: TipoAviso): Aviso[] {
    return this.avisos.filter(a => a.tipo === tipo)
  }

  contarPorTipo(tipo: TipoAviso): number {
    return this.avisos.filter(a => a.tipo === tipo).length
  }

  limpiar(): void {
    this.avisos.length = 0
  }

  obtenerResumen() {
    return {
      total: this.avisos.length,
      errores: this.contarPorTipo('ERROR'),
      advertencias: this.contarPorTipo('ADVERTENCIA'),
      info: this.contarPorTipo('INFO')
    }
  }

  generarReporteTexto(): string {
    const resumen = this.obtenerResumen()
    let reporte = `REPORTE DE AVISOS - ${new Date().toLocaleString()}\n`
    reporte += `=${'='.repeat(60)}\n\n`
    reporte += `RESUMEN:\n`
    reporte += `- Total de avisos: ${resumen.total}\n`
    reporte += `- Errores: ${resumen.errores}\n`
    reporte += `- Advertencias: ${resumen.advertencias}\n`
    reporte += `- Información: ${resumen.info}\n\n`
    
    if (this.avisos.length === 0) {
      reporte += `No hay avisos que reportar.\n`
      return reporte
    }

    reporte += `DETALLES:\n`
    reporte += `${'='.repeat(60)}\n\n`
    
    this.avisos.forEach((aviso, i) => {
      reporte += `[${i + 1}] ${aviso.tipo} - Fila ${aviso.fila} - Campo ${aviso.campo}\n`
      reporte += `    ${aviso.mensaje}\n`
      reporte += `    Original: ${aviso.detalles.valorOriginal}\n`
      if (aviso.detalles.valorProcesado) {
        reporte += `    Procesado: ${aviso.detalles.valorProcesado}\n`
      }
      reporte += `    Causa: ${aviso.detalles.causa}\n`
      if (aviso.detalles.errorEstimado) {
        reporte += `    Error estimado: ${aviso.detalles.errorEstimado}\n`
      }
      if (aviso.detalles.scoreTotal !== undefined) {
        reporte += `    Score: ${aviso.detalles.scoreTotal}/100\n`
      }
      if (aviso.detalles.problemas && aviso.detalles.problemas.length > 0) {
        reporte += `    Problemas:\n`
        aviso.detalles.problemas.forEach(p => {
          reporte += `      - ${p}\n`
        })
      }
      reporte += `\n`
    })
    
    return reporte
  }

  generarReporteCSV(): string {
    const headers = ['Tipo', 'Fila', 'Campo', 'Mensaje', 'Valor Original', 'Valor Procesado', 'Causa', 'Score', 'Error Estimado']
    const rows = [headers.join(',')]
    
    this.avisos.forEach(aviso => {
      const row = [
        aviso.tipo,
        aviso.fila.toString(),
        aviso.campo,
        `"${aviso.mensaje.replace(/"/g, '""')}"`,
        `"${String(aviso.detalles.valorOriginal).replace(/"/g, '""')}"`,
        aviso.detalles.valorProcesado?.toString() || '',
        aviso.detalles.causa,
        aviso.detalles.scoreTotal?.toString() || '',
        aviso.detalles.errorEstimado || ''
      ]
      rows.push(row.join(','))
    })
    
    return '\ufeff' + rows.join('\n')
  }
}

// Singleton para uso global
export const sistemaAvisos = new SistemaAvisos()

// Función helper para agregar avisos
export function agregarAviso(
  tipo: TipoAviso, 
  fila: number, 
  campo: 'X' | 'Y', 
  mensaje: string, 
  detalles: DetallesAviso
): void {
  sistemaAvisos.agregarAviso(tipo, fila, campo, mensaje, detalles)
}

// Función helper para limpiar avisos
export function limpiarAvisos(): void {
  sistemaAvisos.limpiar()
}
