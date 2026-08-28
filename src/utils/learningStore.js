import { getChengyuStats } from './chengyuStore.js'
const ERROR_STORE_KEY = 'hsk4-error-notebook-v1'
const SRS_STORE_KEY = 'hsk4-srs-v1'

const ERROR_INTERVALS = [1, 3, 7, 14]

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function minDateKey(a, b) {
  if (!a) return b
  if (!b) return a
  return a <= b ? a : b
}

function nowIso() {
  return new Date().toISOString()
}

function errorKey(entry) {
  return (
    entry.key ||
    `${entry.lessonId || 'lesson'}:${entry.module || 'module'}:${entry.type || 'error'}:${entry.itemId || entry.prompt || 'item'}`
  )
}

export function getErrorNotebook() {
  const data = readJson(ERROR_STORE_KEY, [])
  return Array.isArray(data) ? data : []
}

export function recordLearningError(entry) {
  if (typeof window === 'undefined') return null

  const list = getErrorNotebook()
  const key = errorKey(entry)
  const today = localDateKey()
  const nextDue = addDays(today, ERROR_INTERVALS[0])
  const index = list.findIndex((item) => item.key === key)

  if (index >= 0) {
    const previous = list[index]
    const updated = {
      ...previous,
      ...entry,
      key,
      status: 'active',
      attempts: (previous.attempts || 1) + 1,
      lastSeenAt: nowIso(),
      lastUserAnswer: entry.userAnswer ?? previous.lastUserAnswer ?? '',
      dueDate:
        entry.reviewMode === 'module'
          ? null
          : minDateKey(previous.dueDate, nextDue),
    }

    list[index] = updated
    writeJson(ERROR_STORE_KEY, list)
    return updated
  }

  const created = {
    key,
    lessonId: entry.lessonId || 'lesson-1',
    module: entry.module || 'general',
    type: entry.type || 'general',
    itemId: entry.itemId || key,
    title: entry.title || '',
    prompt: entry.prompt || '',
    passage: entry.passage || '',
    mode: entry.mode || 'info',
    options: entry.options || [],
    answer: entry.answer || '',
    acceptedAnswers: entry.acceptedAnswers || [],
    userAnswer: entry.userAnswer || '',
    lastUserAnswer: entry.userAnswer || '',
    explanation: entry.explanation || '',
    pinyin: entry.pinyin || '',
    translation: entry.translation || '',
    audioPath: entry.audioPath || '',
    audioText: entry.audioText || '',
    image: entry.image || '',
    imageAlt: entry.imageAlt || '',
    route: entry.route || '',
    wordId: entry.wordId || '',
    reviewMode: entry.reviewMode || 'notebook',
    status: 'active',
    reviewStep: 0,
    attempts: 1,
    reviewFailures: 0,
    createdAt: nowIso(),
    lastSeenAt: nowIso(),
    dueDate: entry.reviewMode === 'module' ? null : nextDue,
  }

  list.push(created)
  writeJson(ERROR_STORE_KEY, list)
  return created
}

export function resolveLearningError(key) {
  if (typeof window === 'undefined') return

  const list = getErrorNotebook()
  const index = list.findIndex((item) => item.key === key)
  if (index < 0) return

  list[index] = {
    ...list[index],
    status: 'mastered',
    dueDate: null,
    resolvedAt: nowIso(),
  }

  writeJson(ERROR_STORE_KEY, list)
}

function reviewErrorEntry(entry, correct) {
  const today = localDateKey()

  if (!correct) {
    return {
      ...entry,
      status: 'active',
      reviewStep: Math.max(0, (entry.reviewStep || 0) - 1),
      reviewFailures: (entry.reviewFailures || 0) + 1,
      dueDate: addDays(today, 1),
      lastReviewedAt: nowIso(),
    }
  }

  const nextStep = (entry.reviewStep || 0) + 1

  if (nextStep >= ERROR_INTERVALS.length) {
    return {
      ...entry,
      status: 'mastered',
      reviewStep: nextStep,
      dueDate: null,
      resolvedAt: nowIso(),
      lastReviewedAt: nowIso(),
    }
  }

  return {
    ...entry,
    status: 'active',
    reviewStep: nextStep,
    dueDate: addDays(today, ERROR_INTERVALS[nextStep]),
    lastReviewedAt: nowIso(),
  }
}

export function markErrorReview(key, correct) {
  if (typeof window === 'undefined') return null

  const list = getErrorNotebook()
  const index = list.findIndex((item) => item.key === key)
  if (index < 0) return null

  list[index] = reviewErrorEntry(list[index], correct)
  writeJson(ERROR_STORE_KEY, list)
  return list[index]
}

export function getDueErrors() {
  const today = localDateKey()

  return getErrorNotebook()
    .filter(
      (item) =>
        item.status === 'active' &&
        item.reviewMode === 'notebook' &&
        item.dueDate &&
        item.dueDate <= today,
    )
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
}

function vocabularySchedule(priority) {
  if (priority === 'A') return [0, 1, 3, 7, 14, 30]
  if (priority === 'B') return [0, 3, 7, 14]
  return []
}

export function getSrsItems() {
  const data = readJson(SRS_STORE_KEY, {})
  return data && typeof data === 'object' ? data : {}
}

function srsKey(word, lessonId = 'lesson-1') {
  return `${lessonId}:${word.id}`
}

function snapshotWord(word) {
  return {
    id: word.id,
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    translation: word.translation,
    priority: word.priority,
    collocations: word.collocations || [],
    example: word.sourceContext || word.example || '',
    examplePinyin: word.examplePinyin || '',
    exampleTranslation: word.exampleTranslation || '',
    sourceTokens: word.sourceTokens || [],
  }
}

export function recordVocabularyExposure(
  word,
  success,
  { lessonId = 'lesson-1' } = {},
) {
  if (typeof window === 'undefined') return null

  const schedule = vocabularySchedule(word.priority)
  if (schedule.length === 0) return null

  const store = getSrsItems()
  const key = srsKey(word, lessonId)
  const today = localDateKey()
  const existing = store[key]

  if (!existing?.started) {
    const step = success ? Math.min(1, schedule.length - 1) : 0
    const waitDays = success ? schedule[step] : 1

    store[key] = {
      key,
      lessonId,
      word: snapshotWord(word),
      priority: word.priority,
      schedule,
      started: true,
      status: 'active',
      step,
      recovery: !success,
      dueDate: addDays(today, waitDays),
      reviews: 0,
      lapses: success ? 0 : 1,
      lastResult: success ? 'initial-correct' : 'initial-wrong',
      lastReviewedAt: nowIso(),
    }

    writeJson(SRS_STORE_KEY, store)
    return store[key]
  }

  const updated = {
    ...existing,
    word: snapshotWord(word),
    lastReviewedAt: nowIso(),
  }

  if (!success) {
    updated.status = 'active'
    updated.recovery = true
    updated.dueDate = minDateKey(existing.dueDate, addDays(today, 1))
    updated.lapses = (existing.lapses || 0) + 1
    updated.lastResult = 'lesson-wrong'
  }

  store[key] = updated
  writeJson(SRS_STORE_KEY, store)
  return updated
}

function updateRelatedVocabularyErrors(wordId, correct) {
  if (!wordId) return

  const list = getErrorNotebook()
  let changed = false

  const next = list.map((entry) => {
    if (
      entry.status !== 'active' ||
      entry.reviewMode !== 'srs' ||
      entry.wordId !== wordId
    ) {
      return entry
    }

    changed = true
    return reviewErrorEntry(entry, correct)
  })

  if (changed) writeJson(ERROR_STORE_KEY, next)
}

export function reviewVocabularySrs(key, remembered) {
  if (typeof window === 'undefined') return null

  const store = getSrsItems()
  const item = store[key]
  if (!item) return null

  const today = localDateKey()
  const schedule = item.schedule || vocabularySchedule(item.priority)
  const next = {
    ...item,
    reviews: (item.reviews || 0) + 1,
    lastReviewedAt: nowIso(),
  }

  if (!remembered) {
    next.status = 'active'
    next.recovery = true
    next.dueDate = addDays(today, 1)
    next.lapses = (item.lapses || 0) + 1
    next.lastResult = 'forgotten'
  } else if (item.recovery) {
    const recoveryStep = item.step === 0 ? Math.min(1, schedule.length - 1) : item.step
    next.step = recoveryStep
    next.recovery = false
    next.dueDate = addDays(today, schedule[recoveryStep] || 1)
    next.lastResult = 'recovered'
  } else {
    const nextStep = (item.step || 0) + 1

    if (nextStep >= schedule.length) {
      next.status = 'mastered'
      next.step = nextStep
      next.dueDate = null
      next.lastResult = 'mastered'
    } else {
      next.status = 'active'
      next.step = nextStep
      next.dueDate = addDays(today, schedule[nextStep])
      next.lastResult = 'remembered'
    }
  }

  store[key] = next
  writeJson(SRS_STORE_KEY, store)
  updateRelatedVocabularyErrors(item.word?.id, remembered)
  return next
}

export function getDueSrsItems() {
  const today = localDateKey()

  return Object.values(getSrsItems())
    .filter(
      (item) =>
        item.started &&
        item.status === 'active' &&
        item.dueDate &&
        item.dueDate <= today,
    )
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
}

export function getLearningDashboardStats() {
  const errors = getErrorNotebook()
  const srs = Object.values(getSrsItems())
  const dueErrors = getDueErrors()
  const dueSrs = getDueSrsItems()
  const chengyu = getChengyuStats()

  return {
    dueToday: dueErrors.length + dueSrs.length + chengyu.dueToday,
    dueErrors: dueErrors.length,
    dueSrs: dueSrs.length,
    dueChengyu: chengyu.dueToday,
    chengyuActive: chengyu.active,
    chengyuMastered: chengyu.mastered,
    activeErrors: errors.filter((item) => item.status === 'active').length,
    masteredErrors: errors.filter((item) => item.status === 'mastered').length,
    srsActive: srs.filter((item) => item.status === 'active').length,
    srsMastered: srs.filter((item) => item.status === 'mastered').length,
  }
}

export function resetLearningReviewData() {
  localStorage.removeItem(ERROR_STORE_KEY)
  localStorage.removeItem(SRS_STORE_KEY)
}
