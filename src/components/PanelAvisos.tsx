import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Warning, XCircle, Info } from '@phosphor-icons/react'
import { Aviso } from '@/lib/coordinateWarnings'

interface PanelAvisosProps {
  avisos: Aviso[]
  onClose?: () => void
}

export function PanelAvisos({ avisos }: PanelAvisosProps) {
  if (avisos.length === 0) {
    return null
  }

  const errores = avisos.filter(a => a.tipo === 'ERROR')
  const advertencias = avisos.filter(a => a.tipo === 'ADVERTENCIA')
  const infos = avisos.filter(a => a.tipo === 'INFO')

  return (
    <Card className="border-2 border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Warning className="text-orange-600" size={24} weight="fill" />
          Avisos del Procesamiento
        </CardTitle>
        <CardDescription>
          Se detectaron {avisos.length} avisos durante el procesamiento de coordenadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {errores.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800 rounded-lg p-4 text-center">
              <XCircle size={28} className="text-red-600 mx-auto mb-2" weight="fill" />
              <p className="text-2xl font-bold text-red-600">{errores.length}</p>
              <p className="text-sm text-red-800 dark:text-red-300">Errores</p>
            </div>
          )}
          {advertencias.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800 rounded-lg p-4 text-center">
              <Warning size={28} className="text-amber-600 mx-auto mb-2" weight="fill" />
              <p className="text-2xl font-bold text-amber-600">{advertencias.length}</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">Advertencias</p>
            </div>
          )}
          {infos.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-300 dark:border-blue-800 rounded-lg p-4 text-center">
              <Info size={28} className="text-blue-600 mx-auto mb-2" weight="fill" />
              <p className="text-2xl font-bold text-blue-600">{infos.length}</p>
              <p className="text-sm text-blue-800 dark:text-blue-300">Información</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Lista de Avisos */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {avisos.map((aviso, i) => (
            <Alert
              key={i}
              variant={aviso.tipo === 'ERROR' ? 'destructive' : 'default'}
              className={
                aviso.tipo === 'ERROR'
                  ? 'border-red-500 dark:border-red-800'
                  : aviso.tipo === 'ADVERTENCIA'
                  ? 'border-amber-500 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20'
                  : 'border-blue-500 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20'
              }
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {aviso.tipo === 'ERROR' ? (
                    <XCircle size={20} className="text-red-600" weight="fill" />
                  ) : aviso.tipo === 'ADVERTENCIA' ? (
                    <Warning size={20} className="text-amber-600" weight="fill" />
                  ) : (
                    <Info size={20} className="text-blue-600" weight="fill" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{aviso.mensaje}</span>
                    <Badge variant="outline" className="text-xs">
                      Fila {aviso.fila}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {aviso.campo}
                    </Badge>
                  </div>
                  <AlertDescription className="space-y-1 text-sm">
                    <div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-1">
                      <span className="font-medium">Original:</span>
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {String(aviso.detalles.valorOriginal)}
                      </code>
                      
                      {aviso.detalles.valorProcesado !== undefined && (
                        <>
                          <span className="font-medium">Procesado:</span>
                          <span className="text-xs">{aviso.detalles.valorProcesado}</span>
                        </>
                      )}
                      
                      <span className="font-medium">Causa:</span>
                      <Badge variant="secondary" className="text-xs w-fit">
                        {aviso.detalles.causa}
                      </Badge>
                      
                      {aviso.detalles.errorEstimado && (
                        <>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            Error estimado:
                          </span>
                          <span className="text-red-600 dark:text-red-400 font-semibold text-xs">
                            {aviso.detalles.errorEstimado}
                          </span>
                        </>
                      )}
                      
                      {aviso.detalles.scoreTotal !== undefined && (
                        <>
                          <span className="font-medium">Score:</span>
                          <span className="text-xs">{aviso.detalles.scoreTotal}/100</span>
                        </>
                      )}
                      
                      {aviso.detalles.digitosEncontrados !== undefined && (
                        <>
                          <span className="font-medium">Dígitos:</span>
                          <span className="text-xs">
                            {aviso.detalles.digitosEncontrados} de {aviso.detalles.digitosEsperados} esperados
                          </span>
                        </>
                      )}
                    </div>
                    
                    {aviso.detalles.problemas && aviso.detalles.problemas.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="font-medium text-xs">Problemas detectados:</span>
                        <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                          {aviso.detalles.problemas.map((problema, j) => (
                            <li key={j}>{problema}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
