import { motion } from 'framer-motion'
import { Sun, Moon } from '@phosphor-icons/react'
import { useTheme } from '@/hooks/use-theme'

export function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className="relative w-16 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 dark:from-indigo-600 dark:to-purple-800 shadow-lg transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label="Toggle theme"
    >
      <motion.div
        className="absolute top-1 left-1 w-6 h-6 bg-white dark:bg-slate-800 rounded-full shadow-md flex items-center justify-center"
        animate={{
          x: isDark ? 32 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        {isDark ? (
          <Moon size={16} weight="fill" className="text-indigo-400" />
        ) : (
          <Sun size={16} weight="fill" className="text-amber-500" />
        )}
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <Sun
          size={14}
          weight="fill"
          className={`transition-opacity duration-300 ${
            isDark ? 'opacity-50' : 'opacity-0'
          } text-white`}
        />
        <Moon
          size={14}
          weight="fill"
          className={`transition-opacity duration-300 ${
            isDark ? 'opacity-0' : 'opacity-50'
          } text-white`}
        />
      </div>
    </button>
  )
}
