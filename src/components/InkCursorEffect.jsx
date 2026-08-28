import { useEffect, useRef } from 'react'
import inkSplash from '../assets/design/klaksa.png'
import brushCursor from '../assets/design/brush-quality-cursor.png'
import './InkCursorEffect.css'

export default function InkCursorEffect() {
  const cursorRef = useRef(null)

  useEffect(() => {
    const onPointerMove = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return
      const cursor = cursorRef.current
      if (!cursor) return
      document.documentElement.classList.add('brush-cursor-active')
      cursor.style.left = `${event.clientX}px`
      cursor.style.top = `${event.clientY}px`
      cursor.classList.add('is-visible')
    }

    const hideCursor = () => cursorRef.current?.classList.remove('is-visible')

    const onPointerDown = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return

      const splash = document.createElement('img')
      splash.className = 'ink-click-splash'
      splash.src = inkSplash
      splash.alt = ''
      splash.style.left = `${event.clientX}px`
      splash.style.top = `${event.clientY}px`

      document.body.appendChild(splash)
      splash.addEventListener('animationend', () => splash.remove(), { once: true })
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerdown', onPointerDown)
    document.documentElement.addEventListener('mouseleave', hideCursor)
    window.addEventListener('blur', hideCursor)
    return () => {
      document.documentElement.classList.remove('brush-cursor-active')
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      document.documentElement.removeEventListener('mouseleave', hideCursor)
      window.removeEventListener('blur', hideCursor)
    }
  }, [])

  return <img ref={cursorRef} className="brush-follow-cursor" src={brushCursor} alt="" aria-hidden="true" />
}
