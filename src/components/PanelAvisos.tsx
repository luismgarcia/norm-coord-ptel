import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Warning, Info, CaretDown, CaretUp, DownloadSimple } from '@phosphor-icons/react'
import { CoordinateData, NIVELES_CONFIANZA } from '@/lib/coordinateUtils'

interface AvisoData {
  tipo: 'ERROR' | 'ADVERTENCIA' | 'INFO'
  fila: number
  campo: 'X' | 'Y' | 'GENERAL'
  mensaje: string
  detalles?: string
  valorOriginal?: any
  valorProcesado?: any
}

interface PanelAvisosProps {
  coordenadas: CoordinateData[]
  nombreArchivo: string
}

export function PanelAvisos({ coordenadas, nombreArchivo }: PanelAvisosProps) {
  const [expandido, setExpandido] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'ERROR' | 'ADVERTENCIA' | 'INFO'>('TODOS')

  // Generar avisos basados en los datos de coordenadas
  const generarAvisos = (): AvisoData[] => {
    const avisos: AvisoData[] = []

    coordenadas.forEach((coord, index) => {
      // Avisos de error (score muy bajo o inválida)
      if (!coord.isValid) {
        avisos.push({
          tipo: 'ERROR',
          fila: index + 1,
          campo: 'GENERAL',
          mensaje: 'Coordenada inválida o fuera de rango',
          detalles: coord.error || 'No se pudo procesar la coordenada',
          valorOriginal: coord.normalizedFrom
        })
      }

      // Avisos basados en calidad
      if (coord.quality) {
        const { level, totalScore, warnings } = coord.quality

        // ERROR: Score muy bajo
        if (level === 'MUY_BAJA') {
          avisos.push({
            tipo: 'ERROR',
            fila: index + 1,
            campo: 'GENERAL',
            mensaje: `Confianza muy baja (Score: ${totalScore})`,
            detalles: warnings.join('; '),
            valorOriginal: `X: ${coord.original.x.toLocaleString()}, Y: ${coord.original.y.toLocaleString()}`
          })
        }

        // ADVERTENCIA: Score bajo o medio-bajo
        if (level === 'BAJA') {
          avisos.push({
            tipo: 'ADVERTENCIA',
            fila: index + 1,
            campo: 'GENERAL',
            mensaje: `Confianza baja (Score: ${totalScore})`,
            detalles: warnings.join('; '),
            valorOriginal: `X: ${coord.original.x.toLocaleString()}, Y: ${coord.original.y.toLocaleString()}`
          })
        }

        // ADVERTENCIA: Normalización aplicada
        if (coord.normalizedFrom && level !== 'MUY_BAJA') {
          avisos.push({
            tipo: 'ADVERTENCIA',
            fila: index + 1,
            campo: 'GENERAL',
            mensaje: 'Coordenada normalizada',
            detalles: `Valores modificados durante normalización: ${coord.normalizedFrom}`,
            valorProcesado: `X: ${coord.converted.x.toFixed(2)}, Y: ${coord.converted.y.toFixed(2)}`
          })
        }

        // INFO: Advertencias específicas de validación
        if (level === 'MEDIA' && warnings.length > 0) {
          avisos.push({
            tipo: 'INFO',
            fila: index + 1,
            campo: 'GENERAL',
            mensaje: `Confianza media (Score: ${totalScore})`,
            detalles: warnings.join('; ')
          })
        }
      }
    })

    return avisos
  }

  const avisos = generarAvisos()
  const avisosFiltrados = filtroTipo === 'TODOS' 
    ? avisos 
    : avisos.filter(a => a.tipo === filtroTipo)

  const contadores = {
    errores: avisos.filter(a => a.tipo === 'ERROR').length,
    advertencias: avisos.filter(a => a.tipo === 'ADVERTENCIA').length,
    info: avisos.filter(a => a.tipo === 'INFO').length
  }

  const descargarReporteAvisos = () => {
    const csvContent = [
      'Tipo,Fila,Campo,Mensaje,Detalles',
      ...avisos.map(a => 
        `"${a.tipo}","${a.fila}","${a.campo}","${a.mensaje}","${a.detalles || ''}"`
      )
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `avisos_${nombreArchivo}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  if (avisos.length === 0) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Info size={24} className="text-green-600" weight="duotone" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">
                Sin avisos
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Todas las coordenadas procesadas correctamente sin problemas detectados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader className="cursor-pointer" onClick={() => setExpandido(!expandido)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Warning size={24} className="text-orange-500" weight="duotone" />
            Avisos de validación ({avisos.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                descargarReporteAvisos()
              }}
            >
              <DownloadSimple size={16} className="mr-2" />
              Descargar reporte
            </Button>
            {expandido ? <CaretUp size={20} /> : <CaretDown size={20} />}
          </div>
        </div>
      </CardHeader>

      {expandido && (
        <CardContent className="space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{contadores.errores}</p>
              <p className="text-sm text-muted-foreground">Errores</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{contadores.advertencias}</p>
              <p className="text-sm text-muted-foreground">Advertencias</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{contadores.info}</p>
              <p className="text-sm text-muted-foreground">Información</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filtroTipo === 'TODOS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('TODOS')}
            >
              Todos ({avisos.length})
            </Button>
            <Button
              variant={filtroTipo === 'ERROR' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('ERROR')}
            >
              Errores ({contadores.errores})
            </Button>
            <Button
              variant={filtroTipo === 'ADVERTENCIA' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('ADVERTENCIA')}
              className={filtroTipo === 'ADVERTENCIA' ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              Advertencias ({contadores.advertencias})
            </Button>
            <Button
              variant={filtroTipo === 'INFO' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('INFO')}
              className={filtroTipo === 'INFO' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              Info ({contadores.info})
            </Button>
          </div>

          {/* Lista de avisos */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {avisosFiltrados.map((aviso, index) => (
              <Alert
                key={index}
                variant={aviso.tipo === 'ERROR' ? 'destructive' : 'default'}
                className={
                  aviso.tipo === 'ADVERTENCIA'
                    ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20'
                    : aviso.tipo === 'INFO'
                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20'
                    : ''
                }
              >
                <div className="flex items-start gap-3">
                  {aviso.tipo === 'ERROR' && <Warning size={20} className="text-destructive flex-shrink-0 mt-0.5" weight="fill" />}
                  {aviso.tipo === 'ADVERTENCIA' && <Warning size={20} className="text-orange-600 flex-shrink-0 mt-0.5" weight="fill" />}
                  {aviso.tipo === 'INFO' && <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" weight="fill" />}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        Fila {aviso.fila}
                      </Badge>
                      <p className="font-semibold text-sm">
                        {aviso.mensaje}
                      </p>
                    </div>
                    
                    {aviso.detalles && (
                      <AlertDescription className="text-xs mt-2">
                        {aviso.detalles}
                      </AlertDescription>
                    )}
                    
                    {aviso.valorOriginal && (
                      <div className="mt-2 text-xs font-mono bg-muted/50 p-2 rounded">
                        <span className="text-muted-foreground">Original: </span>
                        {aviso.valorOriginal}
                      </div>
                    )}
                    
                    {aviso.valorProcesado && (
                      <div className="mt-1 text-xs font-mono bg-muted/50 p-2 rounded">
                        <span className="text-muted-foreground">Procesado: </span>
                        {aviso.valorProcesado}
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
