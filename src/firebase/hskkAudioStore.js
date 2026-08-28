import { firebaseConfig } from './firebaseConfig.js'
import { getValidSession } from './authClient.js'

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`
const AUDIO_DB_NAME = 'hsk4-audio-local-v1'
const AUDIO_DB_VERSION = 1
const PENDING_STORE = 'pendingUploads'
const CHUNK_BYTES = 448 * 1024
const MAX_CHUNKS = 200

function nowIso() {
  return new Date().toISOString()
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function safeDocId(value) {
  const source = String(value || 'recording')
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  const prefix = source.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120) || 'recording'
  return `${prefix}-${(hash >>> 0).toString(36)}`
}

function stringField(value) {
  return { stringValue: String(value ?? '') }
}

function integerField(value) {
  return { integerValue: String(Math.max(0, Math.round(Number(value) || 0))) }
}

function timestampField(value = nowIso()) {
  return { timestampValue: value }
}

function boolField(value) {
  return { booleanValue: Boolean(value) }
}

function decodeField(field) {
  if (!field) return null
  if ('stringValue' in field) return field.stringValue
  if ('integerValue' in field) return Number(field.integerValue)
  if ('doubleValue' in field) return Number(field.doubleValue)
  if ('booleanValue' in field) return Boolean(field.booleanValue)
  if ('timestampValue' in field) return field.timestampValue
  return null
}

function decodeDocument(doc) {
  const fields = doc?.fields || {}
  const result = {}
  Object.entries(fields).forEach(([key, value]) => {
    result[key] = decodeField(value)
  })
  return result
}

async function parseError(response, label = 'Firestore audio') {
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
  if (!session?.idToken || !session?.uid) throw new Error('AUTH_REQUIRED')

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

async function patchDocument(path, fields) {
  return authorizedFetch(`${FIRESTORE_BASE}/${path}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })
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
  const payload = await authorizedFetch(`${FIRESTORE_BASE}/${path}?pageSize=${Math.min(200, Math.max(1, pageSize))}`)
  return payload?.documents || []
}

function openAudioDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('INDEXED_DB_UNAVAILABLE'))
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUDIO_DB_NAME, AUDIO_DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        const store = db.createObjectStore(PENDING_STORE, { keyPath: 'attemptId' })
        store.createIndex('slotId', 'slotId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('INDEXED_DB_OPEN_FAILED'))
  })
}

async function putPending(record) {
  const db = await openAudioDb()
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(PENDING_STORE, 'readwrite')
      transaction.objectStore(PENDING_STORE).put(record)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error || new Error('INDEXED_DB_WRITE_FAILED'))
    })
  } finally {
    db.close()
  }
}

async function deletePending(attemptId) {
  try {
    const db = await openAudioDb()
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(PENDING_STORE, 'readwrite')
        transaction.objectStore(PENDING_STORE).delete(attemptId)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error || new Error('INDEXED_DB_DELETE_FAILED'))
      })
    } finally {
      db.close()
    }
  } catch {
    // Pending cleanup is best-effort after a successful cloud upload.
  }
}

async function getAllPending() {
  try {
    const db = await openAudioDb()
    try {
      return await new Promise((resolve, reject) => {
        const request = db.transaction(PENDING_STORE, 'readonly').objectStore(PENDING_STORE).getAll()
        request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : [])
        request.onerror = () => reject(request.error || new Error('INDEXED_DB_READ_FAILED'))
      })
    } finally {
      db.close()
    }
  } catch {
    return []
  }
}

async function getLatestPendingForSlot(slotId, ownerUid) {
  const records = await getAllPending()
  return records
    .filter((item) => item?.ownerUid === ownerUid && item?.slotId === slotId && item?.blob instanceof Blob)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null
}

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const block = 0x8000
  for (let offset = 0; offset < bytes.length; offset += block) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + block, bytes.length)))
  }
  return btoa(binary)
}

function base64ToBytes(value) {
  const binary = atob(value || '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function attemptFields(record, status, chunkCount) {
  const meta = record.meta || {}
  return {
    slotId: stringField(record.slotId),
    kind: stringField(meta.kind || 'hskk'),
    activityId: stringField(meta.activityId || ''),
    lessonId: stringField(meta.lessonId || ''),
    day: integerField(meta.day || 0),
    sourceContext: stringField(meta.sourceContext || ''),
    label: stringField(meta.label || ''),
    transcript: stringField(meta.transcript || ''),
    transcriptSource: stringField(meta.transcriptSource || ''),
    autoFeedbackJson: stringField(meta.autoFeedback ? JSON.stringify(meta.autoFeedback) : ''),
    autoScore: integerField(meta.autoFeedback?.score || 0),
    autoGrade: stringField(meta.autoFeedback?.grade || ''),
    feedbackVersion: integerField(meta.autoFeedback?.version || 0),
    mimeType: stringField(record.blob?.type || meta.mimeType || 'audio/webm'),
    durationSeconds: integerField(meta.durationSeconds || 0),
    sizeBytes: integerField(record.blob?.size || 0),
    chunkCount: integerField(chunkCount),
    status: stringField(status),
    createdAt: timestampField(record.createdAt),
    updatedAt: timestampField(),
    schemaVersion: integerField(1),
    examMode: boolField(Boolean(meta.examMode)),
  }
}

async function uploadRecord(record) {
  const session = await getValidSession()
  if (!session?.uid) throw new Error('AUTH_REQUIRED')
  if (record?.ownerUid && record.ownerUid !== session.uid) throw new Error('AUDIO_OWNER_MISMATCH')
  if (!(record?.blob instanceof Blob) || !record.blob.size) throw new Error('EMPTY_AUDIO')

  const chunkCount = Math.max(1, Math.ceil(record.blob.size / CHUNK_BYTES))
  if (chunkCount > MAX_CHUNKS) throw new Error('AUDIO_TOO_LARGE')

  const uid = encodeURIComponent(session.uid)
  const attemptId = String(record.attemptId)
  const attemptPath = `users/${uid}/hskkAttempts/${attemptId}`

  await patchDocument(attemptPath, attemptFields(record, 'uploading', chunkCount))

  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * CHUNK_BYTES
    const end = Math.min(record.blob.size, start + CHUNK_BYTES)
    const slice = record.blob.slice(start, end, record.blob.type)
    const data = await blobToBase64(slice)
    const chunkId = String(index).padStart(4, '0')
    await patchDocument(`${attemptPath}/audioChunks/${chunkId}`, {
      index: integerField(index),
      sizeBytes: integerField(slice.size),
      data: { bytesValue: data },
    })
  }

  await patchDocument(attemptPath, attemptFields(record, 'ready', chunkCount))

  const slotDocId = safeDocId(record.slotId)
  await patchDocument(`users/${uid}/hskkAudioSlots/${slotDocId}`, {
    slotId: stringField(record.slotId),
    latestAttemptId: stringField(attemptId),
    mimeType: stringField(record.blob.type || 'audio/webm'),
    sizeBytes: integerField(record.blob.size),
    durationSeconds: integerField(record.meta?.durationSeconds || 0),
    createdAt: timestampField(record.createdAt),
    updatedAt: timestampField(),
  })

  return {
    status: 'saved',
    attemptId,
    slotId: record.slotId,
    createdAt: record.createdAt,
    sizeBytes: record.blob.size,
  }
}

export async function saveHskkAudio(blob, metadata = {}) {
  if (!(blob instanceof Blob) || !blob.size) {
    return { status: 'skipped', reason: 'empty-audio' }
  }

  let session = null
  try { session = await getValidSession() } catch { /* local fallback below */ }

  const record = {
    attemptId: safeDocId(metadata.attemptId || randomId()),
    ownerUid: session?.uid || '',
    slotId: String(metadata.slotId || metadata.activityId || randomId()),
    createdAt: metadata.createdAt || nowIso(),
    blob,
    meta: { ...metadata },
  }

  if (!record.ownerUid) {
    return { status: 'local-only', attemptId: record.attemptId, slotId: record.slotId, error: 'AUTH_REQUIRED' }
  }

  let queued = false
  try {
    await putPending(record)
    queued = true
  } catch {
    // IndexedDB may be unavailable in a restricted browser. Try cloud directly.
  }

  try {
    const saved = await uploadRecord(record)
    if (queued) await deletePending(record.attemptId)
    return saved
  } catch (error) {
    if (queued) {
      return {
        status: 'pending',
        attemptId: record.attemptId,
        slotId: record.slotId,
        createdAt: record.createdAt,
        error: error?.message || 'Cloud upload deferred',
      }
    }
    return {
      status: 'local-only',
      attemptId: record.attemptId,
      slotId: record.slotId,
      createdAt: record.createdAt,
      error: error?.message || 'Cloud upload failed',
    }
  }
}

export async function flushPendingHskkAudioUploads() {
  const session = await getValidSession()
  if (!session?.uid) return { total: 0, uploaded: 0, failed: 0 }
  const pending = (await getAllPending()).filter((record) => record?.ownerUid === session.uid)
  let uploaded = 0
  let failed = 0

  for (const record of pending.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))) {
    try {
      await uploadRecord(record)
      await deletePending(record.attemptId)
      uploaded += 1
    } catch {
      failed += 1
    }
  }

  return { total: pending.length, uploaded, failed }
}

export async function getLatestHskkAudioMeta(slotId) {
  const session = await getValidSession()
  if (!session?.uid) return null
  const pending = await getLatestPendingForSlot(slotId, session.uid)
  if (pending) {
    return {
      source: 'local-pending',
      status: 'pending',
      attemptId: pending.attemptId,
      slotId,
      createdAt: pending.createdAt,
      sizeBytes: pending.blob?.size || 0,
      transcript: pending.meta?.transcript || '',
      transcriptSource: pending.meta?.transcriptSource || '',
      autoFeedbackJson: pending.meta?.autoFeedback ? JSON.stringify(pending.meta.autoFeedback) : '',
      autoScore: pending.meta?.autoFeedback?.score || 0,
      autoGrade: pending.meta?.autoFeedback?.grade || '',
    }
  }

  const uid = encodeURIComponent(session.uid)
  const slotDoc = await getDocument(`users/${uid}/hskkAudioSlots/${safeDocId(slotId)}`)
  if (!slotDoc) return null
  const meta = decodeDocument(slotDoc)
  if (!meta.latestAttemptId) return null
  const attemptDoc = await getDocument(`users/${uid}/hskkAttempts/${encodeURIComponent(meta.latestAttemptId)}`)
  const attemptMeta = attemptDoc ? decodeDocument(attemptDoc) : {}
  return { source: 'cloud', status: 'saved', ...meta, ...attemptMeta, latestAttemptId: meta.latestAttemptId }
}

async function loadCloudAttempt(attemptId) {
  const session = await getValidSession()
  if (!session?.uid) throw new Error('AUTH_REQUIRED')
  const uid = encodeURIComponent(session.uid)
  const safeAttemptId = String(attemptId)
  const attemptPath = `users/${uid}/hskkAttempts/${safeAttemptId}`
  const attemptDoc = await getDocument(attemptPath)
  if (!attemptDoc) return null
  const meta = decodeDocument(attemptDoc)
  if (meta.status !== 'ready') return null

  const docs = await listDocuments(`${attemptPath}/audioChunks`, Math.max(1, Number(meta.chunkCount) || 1))
  const chunks = docs.map((doc) => {
    const index = Number(doc?.fields?.index?.integerValue || 0)
    const bytes = base64ToBytes(doc?.fields?.data?.bytesValue || '')
    return { index, bytes }
  }).sort((a, b) => a.index - b.index)

  if (!chunks.length) return null
  const blob = new Blob(chunks.map((item) => item.bytes), { type: meta.mimeType || 'audio/webm' })
  return { blob, meta: { ...meta, attemptId: safeAttemptId, source: 'cloud' } }
}

export async function loadLatestHskkAudio(slotId) {
  const session = await getValidSession()
  if (!session?.uid) return null
  const pending = await getLatestPendingForSlot(slotId, session.uid)
  if (pending) {
    return {
      blob: pending.blob,
      meta: {
        attemptId: pending.attemptId,
        slotId,
        createdAt: pending.createdAt,
        status: 'pending',
        source: 'local-pending',
      },
    }
  }

  const latest = await getLatestHskkAudioMeta(slotId)
  if (!latest?.latestAttemptId) return null
  return loadCloudAttempt(latest.latestAttemptId)
}

export function createAudioObjectUrl(blob) {
  return blob instanceof Blob ? URL.createObjectURL(blob) : ''
}
