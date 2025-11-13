import { useTheme } from '@/hooks/use-theme'

export function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <label className="relative flex items-center justify-center w-20 h-20 cursor-pointer">
      <input
        type="checkbox"
        checked={isDark}
        onChange={toggleTheme}
        className="sr-only peer"
        aria-label="Toggle theme"
      />
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <circle 
          cx="12" 
          cy="12" 
          r="5" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          className="text-foreground transition-all duration-500 peer-checked:stroke-dasharray-[1,3] peer-checked:stroke-dashoffset-[8] peer-checked:r-[9]"
        />
        <path 
          d="M12 2V4" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          className="text-foreground transition-all duration-500 origin-center peer-checked:rotate-90 peer-checked:opacity-0"
        />
        <path 
          d="M12 20V22" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          className="text-foreground transition-all duration-500 origin-center peer-checked:rotate-90 peer-checked:opacity-0"
        />
        <path 
          d="M4 12H2" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          className="text-foreground transition-all duration-500 origin-center peer-checked:-rotate-90 peer-checked:opacity-0"
        />
        <path 
          d="M22 12H20" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          className="text-foreground transition-all duration-500 origin-center peer-checked:-rotate-90 peer-checked:opacity-0"
        />
        <path 
          d="M19.7778 4.22217L17.5558 6.25424" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          className="text-foreground transition-all duration-500 origin-center peer-checked:rotate-45 peer-checked:opacity-0"
        />
        <path 
          d="M4.22217 4.22217L6.44418 6.44418" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          className="text-foreground transition-all duration-500 origin-center peer-checked:-rotate-45 peer-checked:opacity-0"
        />
        <path 
          d="M6.44434 17.5557L4.22211 19.7779" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          className="text-foreground transition-all duration-500 origin-center peer-checked:rotate-45 peer-checked:opacity-0"
        />
        <path 
          d="M19.7778 19.7778L17.5558 17.5558" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          className="text-foreground transition-all duration-500 origin-center peer-checked:-rotate-45 peer-checked:opacity-0"
        />
      </svg>
    </label>
  )
}
