import { UploadSimple, MagnifyingGlass, DownloadSimple, Check } from '@phosphor-icons/react'

interface StepIndicatorProps {
  currentStep: number
  completedSteps: number[]
  onStepClick: (step: number) => void
}

const steps = [
  { number: 1, label: 'Subir archivos', icon: UploadSimple },
  { number: 2, label: 'Analizar y validar', icon: MagnifyingGlass },
  { number: 3, label: 'Descarga de resultados', icon: DownloadSimple },
]

export default function StepIndicator({ currentStep, completedSteps, onStepClick }: StepIndicatorProps) {
  const isStepAccessible = (stepNumber: number) => stepNumber <= Math.max(...completedSteps, 0) + 1
  const isStepCompleted = (stepNumber: number) => completedSteps.includes(stepNumber)

  return (
    <div className="flex justify-center items-start gap-4 md:gap-6">
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
          if (isActive) return 'bg-primary/15 border-primary shadow-[0_0_24px_rgba(6,182,212,0.4)]'
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
          <div key={step.number} className="flex items-start">
            <button
              onClick={() => isAccessible && onStepClick(step.number)}
              className={`flex flex-col items-center gap-2 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              disabled={!isAccessible}
            >
              <span className={`text-3xl font-extrabold ${getNumberColor()}`}
                style={{ textShadow: isActive ? '0 0 20px rgba(6,182,212,0.5)' : 'none' }}>
                {step.number}
              </span>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-colors ${getCircleClasses()}`}>
                {isCompleted ? <Check size={24} weight="bold" className="text-green-500" /> : <Icon size={24} weight="duotone" className={getIconColor()} />}
              </div>
              <span className={`text-sm font-medium text-center max-w-[100px] ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                {step.label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div className="flex items-center" style={{ marginTop: '56px' }}>
                <div className="relative w-16 md:w-20 h-0.5 mx-2">
                  <div className="absolute inset-0 bg-muted-foreground/20 rounded-full" />
                  <div className={`absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-500 ${isCompleted ? 'w-full' : 'w-0'}`} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
