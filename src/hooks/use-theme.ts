import { useEffect } from 'react'

export function useTheme() {
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add('dark')
  }, [])

  return { 
    theme: 'dark' as const,
    toggleTheme: () => {}
  }
}
