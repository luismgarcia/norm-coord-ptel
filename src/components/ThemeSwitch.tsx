import { useTheme } from '@/hooks/use-theme'

export function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className="relative w-12 h-12 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label="Toggle theme"
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        className={`transition-transform duration-500 ${isDark ? 'rotate-180' : 'rotate-0'}`}
      >
        <clipPath id="theme-switch-cutout">
          <path d="M0-5h30a1 1 0 0 0 9 13v24H0z" />
        </clipPath>
        
        <g clipPath="url(#theme-switch-cutout)">
          <circle
            cx="16"
            cy="16"
            r="9"
            className={`transition-all duration-500 ${
              isDark 
                ? 'fill-slate-700 dark:fill-slate-200' 
                : 'fill-amber-400'
            }`}
          />
          
          <g
            className={`transition-opacity duration-500 ${
              isDark ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <line x1="16" y1="3" x2="16" y2="0" className="stroke-amber-400 stroke-[3] stroke-linecap-round" />
            <line x1="16" y1="32" x2="16" y2="29" className="stroke-amber-400 stroke-[3] stroke-linecap-round" />
            <line x1="29" y1="16" x2="32" y2="16" className="stroke-amber-400 stroke-[3] stroke-linecap-round" />
            <line x1="3" y1="16" x2="0" y2="16" className="stroke-amber-400 stroke-[3] stroke-linecap-round" />
            <line x1="25.364" y1="6.636" x2="27.486" y2="4.514" className="stroke-amber-400 stroke-[3] stroke-linecap-round" />
            <line x1="6.636" y1="25.364" x2="4.514" y2="27.486" className="stroke-amber-400 stroke-[3] stroke-linecap-round" />
            <line x1="25.364" y1="25.364" x2="27.486" y2="27.486" className="stroke-amber-400 stroke-[3] stroke-linecap-round" />
            <line x1="6.636" y1="6.636" x2="4.514" y2="4.514" className="stroke-amber-400 stroke-[3] stroke-linecap-round" />
          </g>
        </g>
      </svg>
    </button>
  )
}
