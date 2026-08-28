import { getActivityRecords, getDayProgress } from './activityStore.js'
import { buildCheckpoint, CHECKPOINTS } from '../data/checkpointData.js'

const KEY = 'hsk4-checkpoints-v1'
const VERSION = 1

function readStore() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { version: VERSION, completed: {}, updatedAt: null }
    const parsed = JSON.parse(raw)
    if (!parsed || Number(parsed.version) !== VERSION) return { version: VERSION, completed: {}, updatedAt: null }
    return { version: VERSION, completed: parsed.completed || {}, updatedAt: parsed.updatedAt || null }
  } catch {
    return { version: VERSION, completed: {}, updatedAt: null }
  }
}

function writeStore(store) {
  localStorage.setItem(KEY, JSON.stringify({ ...store, version: VERSION, updatedAt: new Date().toISOString() }))
}

function skillKey(record) {
  if (record.skill === 'speaking') {
    if (record.subskill === 'repeat') return 'repeat'
    if (record.subskill === 'picture') return 'picture'
    return 'question'
  }
  return record.skill || 'other'
}

export function getCheckpointProgress(checkpointId) {
  const checkpoint = buildCheckpoint(checkpointId)
  return checkpoint ? getDayProgress(checkpoint.activities) : { completed: 0, total: 0, percent: 0 }
}

export function getCheckpointResult(checkpointId) {
  return readStore().completed[checkpointId] || null
}

export function getCompletedCheckpointIds() {
  return Object.keys(readStore().completed)
}

export function completeCheckpointRecord(checkpointId) {
  const checkpoint = buildCheckpoint(checkpointId)
  if (!checkpoint) return null
  const progress = getDayProgress(checkpoint.activities)
  if (progress.total === 0 || progress.percent < 100) return null

  const records = getActivityRecords()
  const groups = new Map()
  checkpoint.activities.forEach((activity) => {
    const record = records[activity.id]
    if (!record || record.firstTryCorrect === null) return
    const key = skillKey(record)
    const current = groups.get(key) || { total: 0, correct: 0 }
    current.total += 1
    current.correct += Number(record.firstTryCorrect === true)
    groups.set(key, current)
  })

  const skills = Object.fromEntries([...groups].map(([key, value]) => [key, Math.round((value.correct / value.total) * 100)]))
  const scored = [...groups.values()].reduce((sum, group) => sum + group.correct, 0)
  const scoredTotal = [...groups.values()].reduce((sum, group) => sum + group.total, 0)
  const result = {
    checkpointId,
    number: checkpoint.number,
    lessons: checkpoint.lessons,
    completedAt: new Date().toISOString(),
    score: scoredTotal ? Math.round((scored / scoredTotal) * 100) : null,
    skills,
    progress,
  }

  const store = readStore()
  store.completed[checkpointId] = result
  writeStore(store)
  return result
}

export function getCheckpointSummary() {
  const store = readStore()
  return CHECKPOINTS.map((checkpoint) => ({ ...checkpoint, result: store.completed[checkpoint.id] || null }))
}

export function resetCheckpoints() {
  localStorage.removeItem(KEY)
}
