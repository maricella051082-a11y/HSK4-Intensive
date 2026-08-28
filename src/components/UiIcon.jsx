export default function UiIcon({ name, className = '', size = 24 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className: `ui-icon ${className}`,
  }

  if (name === 'headphones') return <svg {...common}><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="13" width="4" height="7" rx="2"/><rect x="17" y="13" width="4" height="7" rx="2"/></svg>
  if (name === 'mic') return <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>
  if (name === 'book') return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>
  if (name === 'pencil') return <svg {...common}><path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16z"/><path d="m14.7 6.5 2.8 2.8M4 20l1.2-4 2.8 2.8z"/></svg>
  if (name === 'target') return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m15 9 5-5M17 4h3v3"/></svg>
  if (name === 'music') return <svg {...common}><path d="M9 18V5l10-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>
  if (name === 'bell') return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
  if (name === 'brush') return <svg {...common}><path d="M15.5 3.5 20.5 8.5 10 19H5v-5z"/><path d="M4 20c2.5-1 3.5-3.2 3.5-5.5"/></svg>
  if (name === 'calendar') return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
  if (name === 'chart') return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
  return <svg {...common}><circle cx="12" cy="12" r="8"/></svg>
}
