import { firebaseConfig } from './firebaseConfig.js'
import { getValidSession } from './authClient.js'

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`
const CACHE_KEY = 'firebase-content-overrides-cache-v1'
const COLLECTION = 'contentOverrides'

const EDITABLE_FIELDS = new Set([
  'title',
  'translation',
  'instruction',
  'description',
  'prompt',
  'promptPinyin',
  'promptTranslation',
  'target',
  'targetPinyin',
  'targetTranslation',
  'answer',
  'answerPinyin',
  'answerTranslation',
  'acceptedAnswers',
  'options',
  'audio',
  'image',
  'imageAlt',
  'priority',
  'estimatedSeconds',
  'difficulty',
  'enabled',
  'order',
])

let cache = readCache()

function readCache() {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCache(next) {
  cache = next && typeof next === 'object' ? next : {}
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch { /* cache is optional */ }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hsk4-content-overrides-changed'))
  }
}

function stringField(value) {
  return { stringValue: String(value ?? '') }
}

function timestampField(value = new Date().toISOString()) {
  return { timestampValue: value }
}

async function parseError(response, label = 'Firestore content') {
  let detail = `${response.status}`
  try {
    const payload = await response.json()
    detail = payload?.error?.message || detail
  } catch {
    // Keep HTTP status.
  }
  const error = new Error(`${label}: ${detail}`)
  error.status = response.status
  return error
}

async function authorizedFetch(url, options = {}) {
  const session = await getValidSession()
  if (!session?.idToken) throw new Error('AUTH_REQUIRED')

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${session.idToken}`,
    },
  })

  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return null
  return response.json()
}

function decodeOverrideDocument(doc) {
  const fields = doc?.fields || {}
  const activityId = fields.activityId?.stringValue || ''
  const patchJson = fields.patchJson?.stringValue || '{}'
  if (!activityId) return null
  try {
    const patch = JSON.parse(patchJson)
    return {
      activityId,
      patch: sanitizePatch(patch),
      updatedAt: fields.updatedAt?.timestampValue || '',
      updatedBy: fields.updatedBy?.stringValue || '',
    }
  } catch {
    return null
  }
}

async function listOverrideDocuments() {
  const documents = []
  let pageToken = ''
  do {
    const params = new URLSearchParams({ pageSize: '300' })
    if (pageToken) params.set('pageToken', pageToken)
    const payload = await authorizedFetch(`${FIRESTORE_BASE}/${COLLECTION}?${params.toString()}`)
    documents.push(...(payload?.documents || []))
    pageToken = payload?.nextPageToken || ''
  } while (pageToken)
  return documents
}

export function sanitizePatch(input = {}) {
  const patch = {}
  Object.entries(input || {}).forEach(([key, value]) => {
    if (!EDITABLE_FIELDS.has(key) || value === undefined) return
    patch[key] = value
  })
  return patch
}

export async function initializeContentOverrides() {
  try {
    const docs = await listOverrideDocuments()
    const next = {}
    docs.forEach((doc) => {
      const decoded = decodeOverrideDocument(doc)
      if (decoded) next[decoded.activityId] = decoded
    })
    writeCache(next)
    return next
  } catch {
    // A stale cache is safer than breaking the course while offline.
    cache = readCache()
    return cache
  }
}

export function getContentOverride(activityId) {
  return cache?.[activityId] || null
}

export function getAllContentOverrides() {
  return { ...cache }
}

export function applyContentOverride(activity) {
  if (!activity?.id) return activity
  const override = getContentOverride(activity.id)
  if (!override?.patch) return activity
  return { ...activity, ...override.patch }
}

export function applyContentOverrides(activities = []) {
  return activities
    .map((activity, index) => {
      const override = getContentOverride(activity?.id)
      const patch = override?.patch || {}
      return {
        activity: { ...activity, ...patch },
        enabled: patch.enabled !== false,
        order: Number.isFinite(Number(patch.order)) ? Number(patch.order) : index,
        index,
      }
    })
    .filter((entry) => entry.enabled)
    .sort((a, b) => (a.order - b.order) || (a.index - b.index))
    .map((entry) => entry.activity)
}

export async function saveContentOverride(activityId, rawPatch) {
  const session = await getValidSession()
  if (!session?.uid) throw new Error('AUTH_REQUIRED')
  const patch = sanitizePatch(rawPatch)
  const docId = encodeURIComponent(String(activityId))
  const url = `${FIRESTORE_BASE}/${COLLECTION}/${docId}`
  await authorizedFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        activityId: stringField(activityId),
        patchJson: stringField(JSON.stringify(patch)),
        updatedAt: timestampField(),
        updatedBy: stringField(session.uid),
      },
    }),
  })

  const next = {
    ...cache,
    [activityId]: {
      activityId,
      patch,
      updatedAt: new Date().toISOString(),
      updatedBy: session.uid,
    },
  }
  writeCache(next)
  return next[activityId]
}

export async function deleteContentOverride(activityId) {
  const docId = encodeURIComponent(String(activityId))
  try {
    await authorizedFetch(`${FIRESTORE_BASE}/${COLLECTION}/${docId}`, { method: 'DELETE' })
  } catch (error) {
    if (error?.status !== 404) throw error
  }

  const next = { ...cache }
  delete next[activityId]
  writeCache(next)
  return true
}
