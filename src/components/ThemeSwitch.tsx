import { useTheme } from '@/hooks/use-theme'

export function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <label className="relative inline-block w-[90px] h-[50px] cursor-pointer">
      <input
        type="checkbox"
        checked={isDark}
        onChange={toggleTheme}
        className="opacity-0 w-0 h-0 peer"
        aria-label="Toggle theme"
      />
      <span className="absolute inset-0 bg-[#ebebeb] dark:bg-[#242424] rounded-[25px] transition-all duration-[450ms]">
        <span className="absolute top-[5px] left-[5px] w-10 h-10 bg-[#ffce44] dark:bg-[#7983ea] rounded-full transition-all duration-[450ms] dark:translate-x-10 shadow-[0_0_2px_0_rgba(0,0,0,0.25)]">
          <span className="absolute top-[8px] left-[9px] w-[11px] h-[11px] bg-white rounded-full transition-all duration-[450ms] opacity-0 dark:opacity-100" />
          <span className="absolute top-[17px] left-[16px] w-1.5 h-1.5 bg-white rounded-full transition-all duration-[450ms] opacity-0 dark:opacity-100" />
          <span className="absolute top-[20px] left-[8px] w-1 h-1 bg-white rounded-full transition-all duration-[450ms] opacity-0 dark:opacity-100" />
        </span>
        <span className="absolute top-[18px] left-[58px] w-2 h-2 bg-[#ebebeb] dark:bg-[#242424] rounded-full transition-all duration-[450ms]" />
        <span className="absolute top-[8px] left-[70px] w-1.5 h-1.5 bg-[#ebebeb] dark:bg-[#242424] rounded-full transition-all duration-[450ms]" />
        <span className="absolute top-[27px] left-[66px] w-1 h-1 bg-[#ebebeb] dark:bg-[#242424] rounded-full transition-all duration-[450ms]" />
      </span>
    </label>
  )
}
