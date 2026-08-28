export const DIAGNOSTIC_SESSION_KEY = 'hsk4-quick-diagnostic-session-v1'
export const DIAGNOSTIC_RESULT_KEY = 'hsk4-quick-diagnostic-result-v1'
export const DIAGNOSTIC_VERSION = 1

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getDiagnosticSession() {
  const value = readJson(DIAGNOSTIC_SESSION_KEY)
  return value?.version === DIAGNOSTIC_VERSION ? value : null
}

export function saveDiagnosticSession(value) {
  localStorage.setItem(
    DIAGNOSTIC_SESSION_KEY,
    JSON.stringify({
      ...value,
      version: DIAGNOSTIC_VERSION,
      updatedAt: new Date().toISOString(),
    }),
  )
}

export function getDiagnosticResult() {
  const value = readJson(DIAGNOSTIC_RESULT_KEY)
  return value?.version === DIAGNOSTIC_VERSION && value?.completed
    ? value
    : null
}

export function saveDiagnosticResult(value) {
  localStorage.setItem(
    DIAGNOSTIC_RESULT_KEY,
    JSON.stringify({
      ...value,
      version: DIAGNOSTIC_VERSION,
      completed: true,
      completedAt: new Date().toISOString(),
    }),
  )
}

export function hasCompletedDiagnostic() {
  return Boolean(getDiagnosticResult())
}

export function clearDiagnostic() {
  localStorage.removeItem(DIAGNOSTIC_SESSION_KEY)
  localStorage.removeItem(DIAGNOSTIC_RESULT_KEY)
}
