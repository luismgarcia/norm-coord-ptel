import { motion } from 'framer-motion'
import { 
  MagnifyingGlass, 
  CheckCircle, 
  Warning,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Table as TableIcon
} from '@phosphor-icons/react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'

interface Step2Props {
  data: any
  onComplete: (data: any) => void
  onBack: () => void
}

export default function Step2({ data, onComplete, onBack }: Step2Props) {
  const handleContinue = () => {
    onComplete(data)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Main Card */}
      <Card className="bg-card/80 backdrop-blur border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {/* Card Header */}
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MagnifyingGlass size={20} weight="duotone" className="text-primary" />
              </div>
              <span className="font-semibold">Analizar y validar</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Stats Grid */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-secondary/30 border border-border/50 rounded-xl text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {data?.files?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Archivos cargados</div>
              </div>
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                <div className="text-3xl font-bold text-green-500 mb-1">
                  <CheckCircle size={32} weight="fill" className="mx-auto" />
                </div>
                <div className="text-sm text-muted-foreground">Coordenadas válidas</div>
              </div>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
                <div className="text-3xl font-bold text-yellow-500 mb-1">
                  <Warning size={32} weight="fill" className="mx-auto" />
                </div>
                <div className="text-sm text-muted-foreground">Pendientes revisión</div>
              </div>
            </div>

            {/* Placeholder for data table */}
            <div className="p-8 bg-secondary/20 border border-border/50 rounded-xl text-center">
              <TableIcon size={48} weight="duotone" className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Los datos normalizados aparecerán aquí
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                Sistema de coordenadas detectado: ETRS89 / UTM30N
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-border/50 flex justify-between">
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2"
            >
              <ArrowLeft size={18} />
              Volver
            </Button>
            <Button
              onClick={handleContinue}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              Continuar
              <ArrowRight size={18} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
