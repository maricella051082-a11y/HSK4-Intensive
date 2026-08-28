export function mediaUrl(path) {
  if (!path || typeof path !== 'string') return path

  if (/^(?:[a-z]+:|\/\/|#)/i.test(path)) return path

  const relativePath = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${relativePath}`
}
