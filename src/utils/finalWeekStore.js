const KEY = 'hsk4-final-week-v1'
const VERSION = 1

function baseState() {
  return {
    version: VERSION,
    completedDays: [],
    hsk: {},
    hskk: {},
    repair: {},
    updatedAt: new Date().toISOString(),
  }
}

export function getFinalWeekState() {
  if (typeof window === 'undefined') return baseState()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return baseState()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== VERSION) return baseState()
    return { ...baseState(), ...parsed }
  } catch {
    return baseState()
  }
}

function write(next) {
  const payload = { ...next, version: VERSION, updatedAt: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify(payload))
  return payload
}

export function saveHskDraft(mockId, draft) {
  const state = getFinalWeekState()
  return write({
    ...state,
    hsk: {
      ...state.hsk,
      [mockId]: { ...(state.hsk[mockId] || {}), draft, lastSavedAt: new Date().toISOString() },
    },
  })
}

export function saveHskResult(mockId, result) {
  const state = getFinalWeekState()
  return write({
    ...state,
    hsk: {
      ...state.hsk,
      [mockId]: {
        ...(state.hsk[mockId] || {}),
        ...result,
        completed: true,
        completedAt: new Date().toISOString(),
      },
    },
  })
}

export function saveHskkResult(mockId, result) {
  const state = getFinalWeekState()
  return write({
    ...state,
    hskk: {
      ...state.hskk,
      [mockId]: {
        ...(state.hskk[mockId] || {}),
        ...result,
        completed: true,
        completedAt: new Date().toISOString(),
      },
    },
  })
}

export function saveRepairResult(repairId, result) {
  const state = getFinalWeekState()
  return write({
    ...state,
    repair: {
      ...state.repair,
      [repairId]: {
        ...(state.repair[repairId] || {}),
        ...result,
        completed: true,
        completedAt: new Date().toISOString(),
      },
    },
  })
}

export function markFinalDayComplete(day) {
  const state = getFinalWeekState()
  const value = Number(day)
  const completedDays = state.completedDays.includes(value)
    ? state.completedDays
    : [...state.completedDays, value].sort((a,b)=>a-b)
  return write({ ...state, completedDays })
}

export function getFinalWeekProgress() {
  const state = getFinalWeekState()
  return {
    completed: state.completedDays.length,
    total: 7,
    percent: Math.round((state.completedDays.length / 7) * 100),
  }
}

export function getFinalReadinessSnapshot() {
  const state = getFinalWeekState()
  const hsk1 = state.hsk.h41003?.result || null
  const hsk2 = state.hsk.h41004?.result || null
  const hskk1 = state.hskk.h81004 || null
  const hskk2 = state.hskk.h81107 || null

  const latestHsk = hsk2 || hsk1
  const latestHskk = hskk2 || hskk1

  let readiness = null
  if (latestHsk && Number.isFinite(latestHsk.totalEstimate)) {
    const hskPart = latestHsk.totalEstimate / 3
    const hskkPart = latestHskk?.selfPercent ?? null
    readiness = hskkPart === null
      ? Math.round(hskPart)
      : Math.round(hskPart * 0.75 + hskkPart * 0.25)
  }

  return { state, hsk1, hsk2, hskk1, hskk2, readiness }
}
