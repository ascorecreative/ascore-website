import { useRef, useEffect } from 'react'

/**
 * Track normalised mouse position {x, y} in [-1, 1] range.
 * Returns a ref so it's always current without causing re-renders.
 */
export function useMouse() {
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMove = (e) => {
      mouse.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      }
    }

    const handleTouch = (e) => {
      if (e.touches[0]) {
        mouse.current = {
          x: (e.touches[0].clientX / window.innerWidth) * 2 - 1,
          y: -(e.touches[0].clientY / window.innerHeight) * 2 + 1,
        }
      }
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('touchmove', handleTouch, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchmove', handleTouch)
    }
  }, [])

  return mouse
}
