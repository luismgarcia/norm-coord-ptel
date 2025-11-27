import { useState, lazy, Suspense } from 'react'
import { MapPin, SpinnerGap } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import StepIndicator from './components/StepIndicator'
import Step1, { ExtractionResult } from './components/Step1'

// Lazy loading de Step2 y Step3
const Step2 = lazy(() => import('./components/Step2'))
const Step3 = lazy(() => import('./components/Step3'))

// Componente de carga
function StepLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <SpinnerGap size={28} className="animate-spin text-primary" />
      <span className="ml-3 text-muted-foreground text-sm">Cargando...</span>
    </div>
  )
}

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [extractionData, setExtractionData] = useState<ExtractionResult | null>(null)
  const [processedData, setProcessedData] = useState<any>(null)

  const handleStep1Complete = (data: ExtractionResult) => {
    setExtractionData(data)
    if (!completedSteps.includes(1)) {
      setCompletedSteps([...completedSteps, 1])
    }
    setCurrentStep(2)
  }

  const handleStep2Complete = (data: any) => {
    setProcessedData(data)
    if (!completedSteps.includes(2)) {
      setCompletedSteps([...completedSteps, 2])
    }
    setCurrentStep(3)
  }

  const handleStepClick = (step: number) => {
    if (step <= Math.max(...completedSteps, 0) + 1) {
      setCurrentStep(step)
    }
  }

  const handleReset = () => {
    setCurrentStep(1)
    setCompletedSteps([])
    setExtractionData(null)
    setProcessedData(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header compacto */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <motion.div 
              className="p-2.5 bg-primary/10 border border-primary/30 rounded-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <MapPin size={28} weight="duotone" className="text-primary" />
            </motion.div>
            <motion.h1 
              className="text-2xl md:text-3xl font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-primary">Normalizador-Geolocalizador</span>
              <span className="text-foreground"> PTEL</span>
            </motion.h1>
          </div>

          <motion.p 
            className="text-muted-foreground text-sm mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Planes Territoriales de Emergencias Locales — Andalucía
          </motion.p>

          {/* Badges de características */}
          <motion.div 
            className="flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border rounded-full text-xs text-muted-foreground">
              <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                <rect x="7" y="7" width="10" height="10" rx="1"/>
              </svg>
              Extracción completa
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border rounded-full text-xs text-muted-foreground">
              <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Geocodificación automática
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border rounded-full text-xs text-muted-foreground">
              <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              ETRS89 / UTM30N
            </span>
          </motion.div>
        </header>

        {/* Step Indicator */}
        <StepIndicator 
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />

        {/* Content */}
        <main className="mt-6">
          {currentStep === 1 && (
            <Step1 onComplete={handleStep1Complete} />
          )}
          {currentStep === 2 && (
            <Suspense fallback={<StepLoading />}>
              <Step2 
                data={extractionData}
                onComplete={handleStep2Complete}
                onBack={() => setCurrentStep(1)}
              />
            </Suspense>
          )}
          {currentStep === 3 && (
            <Suspense fallback={<StepLoading />}>
              <Step3 
                data={processedData}
                onReset={handleReset}
              />
            </Suspense>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center mt-8 text-xs text-muted-foreground">
          Compatible con{' '}
          <a href="https://qgis.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            QGIS
          </a>
          {' '}· Salida ETRS89 / UTM30N · v2.0 con geocodificación
        </footer>
      </div>
    </div>
  )
}

export default App
