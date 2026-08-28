import { chengyuById, chengyuData } from '../data/chengyuData.js'

const STORE_KEY = 'hsk4-chengyu-progress-v1'
const META_KEY = 'hsk4-chengyu-course-v1'
export const CHENGYU_SCHEDULE = [0, 1, 3, 7, 14, 30]
export const CHENGYU_SKILLS = ['recognize', 'listen', 'choose', 'produce', 'speak', 'automatic']

const SKILL_TARGETS = {
  recognize: 2,
  listen: 2,
  choose: 2,
  produce: 1,
  speak: 1,
  automatic: 1,
}

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function nowIso() {
  return new Date().toISOString()
}

export function chengyuDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0)
  date.setDate(date.getDate() + days)
  return chengyuDateKey(date)
}

function dayDiff(fromKey, toKey) {
  const parse = (key) => {
    const [year, month, day] = key.split('-').map(Number)
    return new Date(year, month - 1, day, 12, 0, 0)
  }
  const delta = parse(toKey) - parse(fromKey)
  return Math.max(0, Math.floor(delta / 86400000))
}

function emptySkillState() {
  return Object.fromEntries(
    CHENGYU_SKILLS.map((skill) => [skill, { successes: 0, failures: 0, lastSuccessAt: '' }]),
  )
}

function freshProgress(id) {
  const today = chengyuDateKey()
  return {
    id,
    started: true,
    status: 'active',
    retentionStep: 0,
    dueDate: today,
    recovery: false,
    reviews: 0,
    lapses: 0,
    firstSeenAt: nowIso(),
    lastSeenAt: nowIso(),
    lastRetentionReviewDate: '',
    lastResult: 'introduced',
    skills: emptySkillState(),
  }
}

export function getChengyuMeta() {
  const existing = readJson(META_KEY, null)
  if (existing?.startDate) return existing

  const created = {
    version: 1,
    startDate: chengyuDateKey(),
    createdAt: nowIso(),
  }
  writeJson(META_KEY, created)
  return created
}

export function getChengyuCurrentWeek() {
  const meta = getChengyuMeta()
  const days = dayDiff(meta.startDate, chengyuDateKey())
  return Math.min(10, Math.max(1, Math.floor(days / 7) + 1))
}

export function getChengyuProgress() {
  const data = readJson(STORE_KEY, {})
  return data && typeof data === 'object' ? data : {}
}

export function ensureChengyuStarted(id) {
  const item = chengyuById[id]
  if (!item) return null
  const store = getChengyuProgress()
  if (!store[id]) {
    store[id] = freshProgress(id)
    writeJson(STORE_KEY, store)
  }
  return store[id]
}

function normalizeSkillState(progress) {
  const base = emptySkillState()
  const supplied = progress?.skills || {}
  CHENGYU_SKILLS.forEach((skill) => {
    base[skill] = {
      ...base[skill],
      ...(supplied[skill] || {}),
    }
  })
  return base
}

export function isChengyuSkillComplete(progress, skill) {
  const state = normalizeSkillState(progress)[skill]
  return (state?.successes || 0) >= (SKILL_TARGETS[skill] || 1)
}

export function completedChengyuSkills(progress) {
  return CHENGYU_SKILLS.filter((skill) => isChengyuSkillComplete(progress, skill))
}

export function isChengyuMastered(progress) {
  if (!progress?.started) return false
  const allSkills = CHENGYU_SKILLS.every((skill) => isChengyuSkillComplete(progress, skill))
  return allSkills && progress.retentionStep >= CHENGYU_SCHEDULE.length
}

function recomputeStatus(progress) {
  return {
    ...progress,
    status: isChengyuMastered(progress) ? 'mastered' : 'active',
  }
}

export function recordChengyuSkill(id, skill, correct, { fast = false } = {}) {
  if (!CHENGYU_SKILLS.includes(skill) || !chengyuById[id]) return null

  const store = getChengyuProgress()
  const previous = store[id] || freshProgress(id)
  const skills = normalizeSkillState(previous)
  const today = chengyuDateKey()
  const skillState = { ...skills[skill] }

  if (correct) {
    skillState.successes = (skillState.successes || 0) + 1
    skillState.lastSuccessAt = nowIso()
  } else {
    skillState.failures = (skillState.failures || 0) + 1
  }
  skills[skill] = skillState

  let next = {
    ...previous,
    started: true,
    skills,
    lastSeenAt: nowIso(),
    reviews: (previous.reviews || 0) + 1,
  }

  if (!correct) {
    next.recovery = true
    next.lapses = (previous.lapses || 0) + 1
    next.dueDate = addDays(today, 1)
    next.lastResult = 'wrong'
  } else if (previous.lastRetentionReviewDate !== today) {
    const nextStep = (previous.retentionStep || 0) + 1
    next.retentionStep = nextStep
    next.lastRetentionReviewDate = today
    next.recovery = false
    next.lastResult = fast ? 'fast-correct' : 'correct'

    if (nextStep >= CHENGYU_SCHEDULE.length) {
      next.dueDate = null
    } else {
      next.dueDate = addDays(today, CHENGYU_SCHEDULE[nextStep])
    }
  } else if (correct) {
    next.lastResult = fast ? 'fast-correct' : 'correct'
  }

  next = recomputeStatus(next)
  store[id] = next
  writeJson(STORE_KEY, store)
  return next
}

export function markChengyuRetention(id, remembered) {
  const store = getChengyuProgress()
  if (!store[id]) store[id] = freshProgress(id)
  const progress = store[id]
  const today = chengyuDateKey()
  let next = { ...progress, lastSeenAt: nowIso(), reviews: (progress.reviews || 0) + 1 }

  if (!remembered) {
    next.recovery = true
    next.lapses = (progress.lapses || 0) + 1
    next.dueDate = addDays(today, 1)
    next.lastRetentionReviewDate = today
    next.lastResult = 'forgotten'
  } else if (progress.lastRetentionReviewDate !== today) {
    const nextStep = (progress.retentionStep || 0) + 1
    next.retentionStep = nextStep
    next.recovery = false
    next.lastRetentionReviewDate = today
    next.lastResult = 'remembered'
    next.dueDate = nextStep >= CHENGYU_SCHEDULE.length
      ? null
      : addDays(today, CHENGYU_SCHEDULE[nextStep])
  }

  next = recomputeStatus(next)
  store[id] = next
  writeJson(STORE_KEY, store)
  return next
}

export function getDueChengyuItems() {
  const today = chengyuDateKey()
  const store = getChengyuProgress()
  return Object.values(store)
    .filter((progress) => progress.started && progress.status !== 'mastered' && progress.dueDate && progress.dueDate <= today)
    .map((progress) => ({ ...progress, item: chengyuById[progress.id] }))
    .filter((entry) => entry.item)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
}

function weaknessScore(progress) {
  if (!progress) return 999
  const skills = completedChengyuSkills(progress).length
  return skills * 100 + (progress.retentionStep || 0) * 10 - (progress.lapses || 0) * 5
}

export function getDailyChengyuQueue({ maxItems = 6, newLimit = 2 } = {}) {
  const week = getChengyuCurrentWeek()
  const store = getChengyuProgress()
  const due = getDueChengyuItems().slice(0, Math.max(0, maxItems - newLimit))
  const chosen = new Set(due.map((entry) => entry.id))

  const unseen = chengyuData
    .filter((item) => item.week <= week && !store[item.id])
    .sort((a, b) => Number(b.core) - Number(a.core) || a.week - b.week)
    .slice(0, newLimit)

  unseen.forEach((item) => chosen.add(item.id))

  if (chosen.size < maxItems) {
    Object.values(store)
      .filter((progress) => progress.status !== 'mastered' && !chosen.has(progress.id))
      .sort((a, b) => weaknessScore(a) - weaknessScore(b))
      .slice(0, maxItems - chosen.size)
      .forEach((progress) => chosen.add(progress.id))
  }

  return [...chosen]
    .map((id) => ({ item: chengyuById[id], progress: store[id] || null, isNew: !store[id] }))
    .filter((entry) => entry.item)
}

export function getChengyuStats() {
  const store = getChengyuProgress()
  const values = Object.values(store)
  const due = getDueChengyuItems()
  const mastered = values.filter(isChengyuMastered).length
  const started = values.filter((item) => item.started).length
  const coreIds = chengyuData.filter((item) => item.core).map((item) => item.id)
  const coreMastered = coreIds.filter((id) => isChengyuMastered(store[id])).length
  const courseIds = chengyuData.filter((item) => !item.extension).map((item) => item.id)
  const extensionIds = chengyuData.filter((item) => item.extension).map((item) => item.id)
  const courseMastered = courseIds.filter((id) => isChengyuMastered(store[id])).length
  const extensionMastered = extensionIds.filter((id) => isChengyuMastered(store[id])).length

  const skillStats = Object.fromEntries(
    CHENGYU_SKILLS.map((skill) => {
      const completed = values.filter((progress) => isChengyuSkillComplete(progress, skill)).length
      return [skill, {
        completed,
        percent: started ? Math.round((completed / started) * 100) : 0,
      }]
    }),
  )

  return {
    total: chengyuData.length,
    courseTotal: courseIds.length,
    extensionTotal: extensionIds.length,
    courseMastered,
    extensionMastered,
    coreTotal: coreIds.length,
    currentWeek: getChengyuCurrentWeek(),
    started,
    mastered,
    active: values.filter((item) => item.started && !isChengyuMastered(item)).length,
    dueToday: due.length,
    coreMastered,
    skillStats,
  }
}

export function getChengyuLevel(progress) {
  if (!progress?.started) return { key: 'new', label: '待学习', skillCount: 0 }
  if (isChengyuMastered(progress)) return { key: 'mastered', label: '已掌握', skillCount: 6 }
  const count = completedChengyuSkills(progress).length
  const labels = ['认识', '认识', '听懂', '会选择', '会造句', '会说', '自动使用']
  return { key: `level-${count}`, label: labels[count] || '学习中', skillCount: count }
}

export function resetChengyuProgress() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORE_KEY)
  localStorage.removeItem(META_KEY)
}
