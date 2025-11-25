import { useState } from 'react'
import { MapPin } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import StepIndicator from './components/StepIndicator'
import Step1 from './components/Step1'
import Step2 from './components/Step2'
import Step3 from './components/Step3'

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [processedData, setProcessedData] = useState<any>(null)

  const handleStepComplete = (step: number, data?: any) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step])
    }
    if (data) {
      setProcessedData(data)
    }
    if (step < 3) {
      setCurrentStep(step + 1)
    }
  }

  const handleStepClick = (step: number) => {
    if (step <= Math.max(...completedSteps, 0) + 1) {
      setCurrentStep(step)
    }
  }

  const handleReset = () => {
    setCurrentStep(1)
    setCompletedSteps([])
    setProcessedData(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="text-center mb-12">
          {/* Logo con glow */}
          <div className="flex justify-center mb-6">
            <motion.div 
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full scale-150" />
              <div className="relative p-4 bg-card border border-border rounded-2xl glow-primary">
                <MapPin size={40} weight="duotone" className="text-primary" />
              </div>
            </motion.div>
          </div>

          {/* Título */}
          <motion.h1 
            className="text-4xl font-bold mb-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-gradient">Normalizador-Geolocalizador</span>
            <span className="text-foreground"> PTEL</span>
          </motion.h1>

          <motion.p 
            className="text-muted-foreground text-lg mb-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Planes Territoriales de Emergencias Locales — Andalucía
          </motion.p>

          {/* Badges con separación 24px */}
          <motion.div 
            className="flex flex-wrap justify-center gap-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-sm">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                <rect x="7" y="7" width="10" height="10" rx="1"/>
              </svg>
              <span className="text-muted-foreground">Detección automática</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-sm">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
              <span className="text-muted-foreground">785 municipios</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full text-sm">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="text-muted-foreground">ETRS89 / UTM30N</span>
            </div>
          </motion.div>
        </header>

        {/* Step Indicator */}
        <StepIndicator 
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />

        {/* Content */}
        <main className="mt-8">
          {currentStep === 1 && (
            <Step1 onComplete={(data) => handleStepComplete(1, data)} />
          )}
          {currentStep === 2 && (
            <Step2 
              data={processedData} 
              onComplete={(data) => handleStepComplete(2, data)} 
              onBack={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 3 && (
            <Step3 
              data={processedData} 
              onReset={handleReset}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="text-center mt-12 text-sm text-muted-foreground">
          <p>
            Compatible con{' '}
            <a href="https://qgis.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              QGIS
            </a>
            {' '}· Salida en formato ETRS89 / UTM30N
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
