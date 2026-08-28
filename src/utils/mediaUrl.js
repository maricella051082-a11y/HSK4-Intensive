const PUBLIC_MEDIA_VERSION = '20260828-1'

export function mediaUrl(path) {
  if (!path || typeof path !== 'string') return path

  if (/^(?:[a-z]+:|\/\/|#)/i.test(path)) return path

  const relativePath = path.replace(/^\/+/, '')
  const separator = relativePath.includes('?') ? '&' : '?'
  return `${import.meta.env.BASE_URL}${relativePath}${separator}v=${PUBLIC_MEDIA_VERSION}`
}
