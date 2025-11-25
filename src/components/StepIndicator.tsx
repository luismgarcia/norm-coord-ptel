import { motion } from 'framer-motion'
import { UploadSimple, MagnifyingGlass, DownloadSimple, Check } from '@phosphor-icons/react'

interface StepIndicatorProps {
  currentStep: number
  completedSteps: number[]
  onStepClick: (step: number) => void
}

const steps = [
  { 
    number: 1, 
    label: 'Subir archivos', 
    icon: UploadSimple 
  },
  { 
    number: 2, 
    label: 'Analizar y validar', 
    icon: MagnifyingGlass 
  },
  { 
    number: 3, 
    label: 'Descarga de resultados', 
    icon: DownloadSimple 
  },
]

export default function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
  const isStepAccessible = (stepNumber: number) => {
    return stepNumber <= Math.max(...completedSteps, 0) + 1
  }

  const isStepCompleted = (stepNumber: number) => {
    return completedSteps.includes(stepNumber)
  }

  return (
    <div className="flex justify-center items-start gap-4 md:gap-6">
      {steps.map((step, index) => {
        const isActive = currentStep === step.number
        const isCompleted = isStepCompleted(step.number)
        const isAccessible = isStepAccessible(step.number)
        const Icon = step.icon

        // Determinar colores según estado
        const getNumberColor = () => {
          if (isActive) return 'text-primary'
          if (isCompleted) return 'text-green-500'
          return 'text-muted-foreground/40'
        }

        const getCircleClasses = () => {
          if (isActive) {
            return 'bg-primary/15 border-primary shadow-[0_0_24px_rgba(6,182,212,0.4)]'
          }
          if (isCompleted) {
            return 'bg-green-500/15 border-green-500'
          }
          // Inactivo - gris
          return 'bg-muted/30 border-muted-foreground/30'
        }

        const getIconColor = () => {
          if (isActive) return 'text-primary'
          if (isCompleted) return 'text-green-500'
          return 'text-muted-foreground/50'
        }

        return (
          <div key={step.number} className="flex items-start">
            {/* Step */}
            <motion.button
              onClick={() => isAccessible && onStepClick(step.number)}
              className={`
                flex flex-col items-center gap-2 transition-all duration-300
                ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
              whileHover={isAccessible ? { scale: 1.02 } : {}}
              whileTap={isAccessible ? { scale: 0.98 } : {}}
              disabled={!isAccessible}
            >
              {/* Número grande encima */}
              <motion.span
                className={`text-3xl font-extrabold transition-all duration-300 ${getNumberColor()}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  textShadow: isActive ? '0 0 20px rgba(6, 182, 212, 0.5)' : 'none'
                }}
              >
                {step.number}
              </motion.span>

              {/* Círculo con icono */}
              <motion.div
                className={`
                  relative w-14 h-14 rounded-full flex items-center justify-center
                  border-2 transition-all duration-300
                  ${getCircleClasses()}
                `}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.1 }}
              >
                {isCompleted ? (
                  <Check size={24} weight="bold" className="text-green-500" />
                ) : (
                  <Icon 
                    size={24} 
                    weight="duotone"
                    className={getIconColor()}
                  />
                )}
              </motion.div>

              {/* Label */}
              <motion.span 
                className={`
                  text-sm font-medium text-center max-w-[100px] transition-all duration-300
                  ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}
                `}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                {step.label}
              </motion.span>
            </motion.button>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div className="flex items-center" style={{ marginTop: '56px' }}>
                <div className="relative w-16 md:w-20 h-0.5 mx-2">
                  <div className="absolute inset-0 bg-muted-foreground/20 rounded-full" />
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-green-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: isCompleted ? '100%' : '0%' 
                    }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
