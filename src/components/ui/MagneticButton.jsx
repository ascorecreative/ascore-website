import { useRef, useEffect } from 'react'

/**
 * A button that magnetically follows the cursor.
 * Wraps children — pass any content as children.
 */
export default function MagneticButton({ children, className = '', style = {}, onClick, href, as: Tag = 'button', ...props }) {
  const btnRef = useRef()
  const boundRef = useRef(null)

  useEffect(() => {
    const btn = btnRef.current
    if (!btn) return

    const handleMouseEnter = () => {
      boundRef.current = btn.getBoundingClientRect()
    }

    const handleMouseMove = (e) => {
      if (!boundRef.current) return
      const { left, top, width, height } = boundRef.current
      const x = e.clientX - left - width / 2
      const y = e.clientY - top - height / 2
      btn.style.transform = `translate(${x * 0.35}px, ${y * 0.35}px) scale(1.04)`
    }

    const handleMouseLeave = () => {
      btn.style.transform = 'translate(0, 0) scale(1)'
      boundRef.current = null
    }

    btn.addEventListener('mouseenter', handleMouseEnter)
    btn.addEventListener('mousemove', handleMouseMove)
    btn.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      btn.removeEventListener('mouseenter', handleMouseEnter)
      btn.removeEventListener('mousemove', handleMouseMove)
      btn.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const baseStyle = {
    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    ...style,
  }

  if (href) {
    return (
      <a ref={btnRef} href={href} className={className} style={baseStyle} onClick={onClick} {...props}>
        {children}
      </a>
    )
  }

  return (
    <button ref={btnRef} className={className} style={baseStyle} onClick={onClick} {...props}>
      {children}
    </button>
  )
}
