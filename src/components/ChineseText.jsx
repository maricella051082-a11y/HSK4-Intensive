import { useRef, useState } from 'react'
import './ChineseText.css'

function normalizePinyin(text) {
  if (typeof text !== 'string') return text
  return text.normalize('NFC')
}

function ChineseText({
  children,
  pinyin,
  translation,
  className = '',
  tooltipPosition = 'top',
  as: Tag = 'span',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [resolvedPosition, setResolvedPosition] = useState(tooltipPosition)
  const [shiftX, setShiftX] = useState(0)
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)

  const fitTooltip = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    let nextPosition = tooltipPosition
    if (tooltipPosition === 'top' && rect.top < 125) nextPosition = 'bottom'
    if (tooltipPosition === 'bottom' && window.innerHeight - rect.bottom < 125) nextPosition = 'top'
    setResolvedPosition(nextPosition)

    requestAnimationFrame(() => {
      const tooltip = tooltipRef.current
      if (!tooltip) return
      const tooltipRect = tooltip.getBoundingClientRect()
      const safeGap = 10
      let nextShift = 0
      if (tooltipRect.left < safeGap) nextShift = safeGap - tooltipRect.left
      if (tooltipRect.right > window.innerWidth - safeGap) nextShift = window.innerWidth - safeGap - tooltipRect.right
      setShiftX(Math.round(nextShift))
    })
  }

  return (
    <Tag
      ref={triggerRef}
      className={`chinese-text ${className} tooltip-${resolvedPosition}`}
      tabIndex={0}
      onMouseEnter={fitTooltip}
      onFocus={fitTooltip}
      onClick={() => {
        fitTooltip()
        setIsOpen((current) => !current)
      }}
      onBlur={() => setIsOpen(false)}
      style={{ '--tooltip-shift-x': `${shiftX}px` }}
    >
      {children}
      <span
        ref={tooltipRef}
        className={`chinese-tooltip ${isOpen ? 'is-open' : ''}`}
        role="tooltip"
      >
        <span className="tooltip-pinyin">
          {normalizePinyin(pinyin)}
        </span>
        <span className="tooltip-translation">
          {translation}
        </span>
      </span>
    </Tag>
  )
}

export default ChineseText
