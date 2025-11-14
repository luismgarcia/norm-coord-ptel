import React from 'react'
import { Badge } from '@/components/ui/badge'
import { FilaProcesada } from '@/lib/coordinateProcessing'
import { NivelConfianza, NIVELES } from '@/lib/coordinateValidation'

interface TablaResultadosProps {
  resultados: FilaProcesada[]
  maxFilas?: number
}

export function TablaResultados({ resultados, maxFilas = 10 }: TablaResultadosProps) {
  const filasMostrar = resultados.slice(0, maxFilas)
  
  const getBadgeVariant = (nivel: NivelConfianza) => {
    switch (nivel) {
      case 'ALTA':
        return 'default'
      case 'MEDIA':
        return 'secondary'
      case 'BAJA':
        return 'outline'
      case 'MUY_BAJA':
        return 'destructive'
    }
  }
  
  const getBadgeColor = (nivel: NivelConfianza) => {
    return NIVELES[nivel].color
  }
  
  const getRowClass = (nivel: NivelConfianza) => {
    switch (nivel) {
      case 'ALTA':
        return 'bg-green-50 dark:bg-green-950/10'
      case 'MEDIA':
        return 'bg-amber-50 dark:bg-amber-950/10'
      case 'BAJA':
        return 'bg-orange-50 dark:bg-orange-950/10'
      case 'MUY_BAJA':
        return 'bg-red-50 dark:bg-red-950/10'
    }
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['ALTA', 'MEDIA', 'BAJA', 'MUY_BAJA'] as NivelConfianza[]).map(nivel => {
          const count = resultados.filter(r => r.NIVEL_FINAL === nivel).length
          if (count === 0) return null
          
          return (
            <div
              key={nivel}
              className="rounded-lg border-2 p-4 text-center"
              style={{ borderColor: getBadgeColor(nivel) }}
            >
              <p className="text-2xl font-bold" style={{ color: getBadgeColor(nivel) }}>
                {count}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {NIVELES[nivel].nombre}
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                ({nivel === 'ALTA' ? '≥95' : nivel === 'MEDIA' ? '70-94' : nivel === 'BAJA' ? '50-69' : '<50'})
              </p>
            </div>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fila</th>
                <th className="px-3 py-2 text-left font-medium">X Original</th>
                <th className="px-3 py-2 text-left font-medium">Y Original</th>
                <th className="px-3 py-2 text-right font-medium">X UTM30</th>
                <th className="px-3 py-2 text-right font-medium">Y UTM30</th>
                <th className="px-3 py-2 text-center font-medium">Score X</th>
                <th className="px-3 py-2 text-center font-medium">Score Y</th>
                <th className="px-3 py-2 text-center font-medium">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {filasMostrar.map((fila, idx) => (
                <tr 
                  key={idx} 
                  className={`border-t hover:bg-muted/50 transition-colors ${getRowClass(fila.NIVEL_FINAL)}`}
                >
                  <td className="px-3 py-2 font-medium">{fila.numeroFila}</td>
                  <td className="px-3 py-2 font-mono text-xs max-w-[120px] truncate">
                    {String(fila.X_ORIGINAL)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs max-w-[120px] truncate">
                    {String(fila.Y_ORIGINAL)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {fila.X !== null ? fila.X.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {fila.Y !== null ? fila.Y.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div 
                      className="inline-block px-2 py-1 rounded text-xs font-semibold"
                      style={{ 
                        backgroundColor: `${getBadgeColor(fila.X_NIVEL)}20`,
                        color: getBadgeColor(fila.X_NIVEL)
                      }}
                    >
                      {fila.X_SCORE}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div 
                      className="inline-block px-2 py-1 rounded text-xs font-semibold"
                      style={{ 
                        backgroundColor: `${getBadgeColor(fila.Y_NIVEL)}20`,
                        color: getBadgeColor(fila.Y_NIVEL)
                      }}
                    >
                      {fila.Y_SCORE}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge 
                      variant={getBadgeVariant(fila.NIVEL_FINAL)}
                      className="text-xs"
                      style={{
                        backgroundColor: `${getBadgeColor(fila.NIVEL_FINAL)}20`,
                        color: getBadgeColor(fila.NIVEL_FINAL),
                        borderColor: getBadgeColor(fila.NIVEL_FINAL)
                      }}
                    >
                      {fila.NIVEL_FINAL}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {resultados.length > maxFilas && (
          <div className="bg-muted px-4 py-2 text-xs text-muted-foreground text-center">
            Mostrando {maxFilas} de {resultados.length} filas
          </div>
        )}
      </div>
    </div>
  )
}
