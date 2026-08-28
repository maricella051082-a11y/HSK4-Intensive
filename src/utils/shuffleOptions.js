function hashSeed(value) {
  let hash = 2166136261

  for (const character of String(value)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function seededRandom(seed) {
  let state = seed || 1

  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state)
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state)
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleOptions(options = [], key = '') {
  const result = [...options]
  const random = seededRandom(hashSeed(`${key}:${result.length}`))

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }

  const unchanged = result.every((option, index) => option === options[index])
  if (unchanged && result.length > 1) {
    return [...result.slice(1), result[0]]
  }

  return result
}
