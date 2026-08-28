import { firebaseConfig } from './firebaseConfig.js'
import { getValidSession } from './authClient.js'

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`

async function parseError(response, label = 'Firestore admin') {
  let detail = `${response.status}`
  try {
    const payload = await response.json()
    detail = payload?.error?.message || detail
  } catch {
    // Keep HTTP status.
  }
  const error = new Error(`${label}: ${detail}`)
  error.status = response.status
  throw error
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
  if (!response.ok) return parseError(response)
  if (response.status === 204) return null
  return response.json()
}

function decodeValue(field) {
  if (!field) return null
  if ('stringValue' in field) return field.stringValue
  if ('integerValue' in field) return Number(field.integerValue)
  if ('doubleValue' in field) return Number(field.doubleValue)
  if ('booleanValue' in field) return Boolean(field.booleanValue)
  if ('timestampValue' in field) return field.timestampValue
  if ('bytesValue' in field) return field.bytesValue
  return null
}

function documentId(doc) {
  const name = String(doc?.name || '')
  return decodeURIComponent(name.split('/').pop() || '')
}

function decodeDocument(doc) {
  const result = { id: documentId(doc) }
  Object.entries(doc?.fields || {}).forEach(([key, field]) => {
    result[key] = decodeValue(field)
  })
  return result
}

async function getDocument(path) {
  try {
    return await authorizedFetch(`${FIRESTORE_BASE}/${path}`)
  } catch (error) {
    if (error?.status === 404) return null
    throw error
  }
}

async function listDocuments(path, pageSize = 200) {
  const result = []
  let pageToken = ''
  do {
    const params = new URLSearchParams({ pageSize: String(Math.min(300, Math.max(1, pageSize))) })
    if (pageToken) params.set('pageToken', pageToken)
    const payload = await authorizedFetch(`${FIRESTORE_BASE}/${path}?${params.toString()}`)
    result.push(...(payload?.documents || []))
    pageToken = payload?.nextPageToken || ''
  } while (pageToken)
  return result
}

export async function checkAdminAccess(uid) {
  if (!uid) return false
  const doc = await getDocument(`admins/${encodeURIComponent(uid)}`)
  return Boolean(doc)
}

export async function listUsersForAdmin() {
  const docs = await listDocuments('users', 200)
  return docs.map(decodeDocument).sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')))
}

export async function listUserStateForAdmin(uid) {
  const docs = await listDocuments(`users/${encodeURIComponent(uid)}/state`, 300)
  return docs.map(decodeDocument).map((item) => ({
    key: item.key || '',
    value: item.value ?? '',
    updatedAt: item.updatedAt || '',
  })).filter((item) => item.key)
}

export async function listHskkAttemptsForAdmin(uid) {
  const docs = await listDocuments(`users/${encodeURIComponent(uid)}/hskkAttempts`, 300)
  return docs.map(decodeDocument).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

function base64ToBytes(value) {
  const binary = atob(value || '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export async function loadHskkAttemptAudioForAdmin(uid, attemptId) {
  const safeUid = encodeURIComponent(uid)
  const safeAttemptId = encodeURIComponent(attemptId)
  const attemptDoc = await getDocument(`users/${safeUid}/hskkAttempts/${safeAttemptId}`)
  if (!attemptDoc) return null
  const meta = decodeDocument(attemptDoc)
  if (meta.status !== 'ready') return { meta, blob: null }

  const docs = await listDocuments(`users/${safeUid}/hskkAttempts/${safeAttemptId}/audioChunks`, Math.max(1, Number(meta.chunkCount) || 1))
  const chunks = docs.map((doc) => ({
    index: Number(doc?.fields?.index?.integerValue || 0),
    bytes: base64ToBytes(doc?.fields?.data?.bytesValue || ''),
  })).sort((a, b) => a.index - b.index)

  if (!chunks.length) return { meta, blob: null }
  return {
    meta,
    blob: new Blob(chunks.map((item) => item.bytes), { type: meta.mimeType || 'audio/webm' }),
  }
}

function parseJson(value, fallback = null) {
  try { return value ? JSON.parse(value) : fallback } catch { return fallback }
}

export function summarizeUserState(entries = []) {
  const map = new Map(entries.map((entry) => [entry.key, entry.value]))
  const planner = parseJson(map.get('hsk4-course-planner-v1'), {}) || {}
  const diagnostic = parseJson(map.get('hsk4-quick-diagnostic-result-v1'), null)
  const checkpoints = parseJson(map.get('hsk4-checkpoints-v1'), {}) || {}
  const finalWeek = parseJson(map.get('hsk4-final-week-v1'), {}) || {}
  const activities = parseJson(map.get('hsk4-activity-engine-v1'), {}) || {}
  const errors = parseJson(map.get('hsk4-error-notebook-v1'), {}) || {}
  const srs = parseJson(map.get('hsk4-srs-v1'), {}) || {}

  const activityValues = Object.values(activities.activities || {})
  const completedActivities = activityValues.filter((item) => item?.completed).length
  const checkpointResults = Object.values(checkpoints.completed || {})
  const errorValues = Array.isArray(errors) ? errors : []
  const activeErrors = errorValues.filter((item) => item?.status === 'active').length
  const today = new Date().toISOString().slice(0, 10)
  const dueSrs = Object.values(srs || {}).filter(
    (item) => item?.status === 'active' && item?.dueDate && String(item.dueDate) <= today,
  ).length

  return {
    planner,
    diagnostic,
    checkpointResults,
    finalWeek,
    completedActivities,
    activityCount: activityValues.length,
    activeErrors,
    dueSrs,
    rawEntryCount: entries.length,
  }
}
