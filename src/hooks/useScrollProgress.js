import { useRef, useEffect } from 'react'

/**
 * Returns a ref whose `.current` is always the latest scroll progress (0→1).
 * Also returns a reactive state value for components that need to re-render.
 */
export function useScrollProgress() {
  const progress = useRef(0)

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      progress.current = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0
    }

    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])

  return progress
}
