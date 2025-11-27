import { UploadSimple, MagnifyingGlass, DownloadSimple, Check } from '@phosphor-icons/react'

interface StepIndicatorProps {
  currentStep: number
  completedSteps: number[]
  onStepClick: (step: number) => void
}

const steps = [
  { number: 1, label: 'Subida', icon: UploadSimple },
  { number: 2, label: 'Análisis', icon: MagnifyingGlass },
  { number: 3, label: 'Descarga', icon: DownloadSimple },
]

export default function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
  const isStepAccessible = (stepNumber: number) => stepNumber <= Math.max(...completedSteps, 0) + 1
  const isStepCompleted = (stepNumber: number) => completedSteps.includes(stepNumber)

  return (
    <div className="flex justify-center items-center">
      {steps.map((step, index) => {
        const isActive = currentStep === step.number
        const isCompleted = isStepCompleted(step.number)
        const isAccessible = isStepAccessible(step.number)
        const Icon = step.icon

        const getNumberColor = () => {
          if (isActive) return 'text-primary'
          if (isCompleted) return 'text-green-500'
          return 'text-muted-foreground/40'
        }

        const getCircleClasses = () => {
          if (isActive) return 'bg-primary/15 border-primary shadow-[0_0_20px_rgba(6,182,212,0.35)]'
          if (isCompleted) return 'bg-green-500/15 border-green-500'
          if (isAccessible) return 'bg-muted/30 border-muted-foreground/30 hover:border-primary/50'
          return 'bg-muted/30 border-muted-foreground/30'
        }

        const getIconColor = () => {
          if (isActive) return 'text-primary'
          if (isCompleted) return 'text-green-500'
          return 'text-muted-foreground/50'
        }

        return (
          <div key={step.number} className="flex items-center">
            {/* Step button */}
            <button
              onClick={() => isAccessible && onStepClick(step.number)}
              className={`flex flex-col items-center gap-1.5 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              disabled={!isAccessible}
            >
              {/* Number */}
              <span 
                className={`text-2xl font-bold ${getNumberColor()}`}
                style={{ textShadow: isActive ? '0 0 16px rgba(6,182,212,0.4)' : 'none' }}
              >
                {step.number}
              </span>
              
              {/* Circle with icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${getCircleClasses()}`}>
                {isCompleted ? (
                  <Check size={22} weight="bold" className="text-green-500" />
                ) : (
                  <Icon size={22} weight="duotone" className={getIconColor()} />
                )}
              </div>
              
              {/* Label */}
              <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                {step.label}
              </span>
            </button>
            
            {/* Connector line - centered with circle */}
            {index < steps.length - 1 && (
              <div className="flex items-center h-12 mx-3 md:mx-5" style={{ marginTop: '-18px' }}>
                <div className="relative w-14 md:w-20 h-[3px]">
                  {/* Background line */}
                  <div className="absolute inset-0 bg-muted-foreground/20 rounded-full" />
                  {/* Progress line */}
                  <div 
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                      isCompleted ? 'w-full bg-green-500' : 'w-0'
                    }`} 
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
