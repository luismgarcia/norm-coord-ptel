import { useTheme } from '@/hooks/use-theme'

export function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <label className="relative inline-block w-[60px] h-[34px] cursor-pointer">
      <input
        type="checkbox"
        checked={isDark}
        onChange={toggleTheme}
        className="opacity-0 w-0 h-0"
        aria-label="Toggle theme"
      />
      <span
        className={`
          absolute inset-0 rounded-[34px] transition-all duration-400
          ${isDark ? 'bg-[#2c3e50]' : 'bg-[#ccc]'}
        `}
      >
        <span
          className={`
            absolute top-[4px] left-[4px] w-[26px] h-[26px] rounded-full
            bg-white transition-transform duration-400
            ${isDark ? 'translate-x-[26px]' : 'translate-x-0'}
          `}
        >
          <svg
            className={`
              absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-[16px] h-[16px] transition-opacity duration-400
              ${isDark ? 'opacity-0' : 'opacity-100'}
            `}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <circle cx="10" cy="10" r="5" fill="#f39c12" />
            <g fill="#f39c12">
              <rect x="9" y="0" width="2" height="4" rx="1" />
              <rect x="9" y="16" width="2" height="4" rx="1" />
              <rect x="0" y="9" width="4" height="2" rx="1" />
              <rect x="16" y="9" width="4" height="2" rx="1" />
              <rect x="3.5" y="3.5" width="2" height="4" rx="1" transform="rotate(45 4.5 5.5)" />
              <rect x="14.5" y="14.5" width="2" height="4" rx="1" transform="rotate(45 15.5 16.5)" />
              <rect x="3.5" y="12.5" width="2" height="4" rx="1" transform="rotate(-45 4.5 14.5)" />
              <rect x="14.5" y="1.5" width="2" height="4" rx="1" transform="rotate(-45 15.5 3.5)" />
            </g>
          </svg>
          <svg
            className={`
              absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              w-[16px] h-[16px] transition-opacity duration-400
              ${isDark ? 'opacity-100' : 'opacity-0'}
            `}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
              fill="#f39c12"
            />
          </svg>
        </span>
      </span>
    </label>
  )
}
