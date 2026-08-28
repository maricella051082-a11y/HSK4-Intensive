import {
  deleteCloudState,
  listCloudState,
  putCloudState,
  writeUserProfile,
} from './firestoreRest.js'

const PREFIX = 'hsk4-'
const CLOUD_META_KEY = 'firebase-cloud-sync-meta-v1'
const FLUSH_DELAY_MS = 180

const nativeSetItem = Storage.prototype.setItem
const nativeRemoveItem = Storage.prototype.removeItem

let activeSession = null
let suppressSync = false
let patched = false
let flushTimer = null
let flushing = false
const pending = new Map()
const listeners = new Set()

function nowIso() {
  return new Date().toISOString()
}

function emit(status, extra = {}) {
  const payload = { status, ...extra }
  listeners.forEach((listener) => {
    try { listener(payload) } catch { /* ignore UI listener errors */ }
  })
}

export function subscribeCloudStatus(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function shouldSyncKey(key) {
  return typeof key === 'string' && key.startsWith(PREFIX)
}


function rawMeta() {
  try {
    const raw = localStorage.getItem(CLOUD_META_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearTrackedLocalState() {
  const keys = [...localSnapshot().keys()]
  suppressSync = true
  try {
    keys.forEach((key) => nativeRemoveItem.call(localStorage, key))
  } finally {
    suppressSync = false
  }
}

function prepareLocalStateForUser(uid) {
  const previous = rawMeta()
  const previousUid = previous?.uid || ''

  if (previousUid && previousUid !== uid) {
    // The browser is changing accounts. Never upload one user's local progress
    // into another user's empty cloud account.
    clearTrackedLocalState()
    writeMeta({ uid, lastSyncAt: '', keyUpdates: {}, deletions: {} })
    return { switchedUser: true }
  }

  if (!previousUid) {
    writeMeta({ uid, lastSyncAt: '', keyUpdates: {}, deletions: {} })
  }

  return { switchedUser: false }
}

function readMeta(uid = activeSession?.uid) {
  try {
    const raw = localStorage.getItem(CLOUD_META_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (!parsed || (uid && parsed.uid && parsed.uid !== uid)) {
      return { uid: uid || '', keyUpdates: {}, deletions: {} }
    }
    return {
      uid: uid || parsed.uid || '',
      lastSyncAt: parsed.lastSyncAt || '',
      keyUpdates: parsed.keyUpdates && typeof parsed.keyUpdates === 'object' ? parsed.keyUpdates : {},
      deletions: parsed.deletions && typeof parsed.deletions === 'object' ? parsed.deletions : {},
    }
  } catch {
    return { uid: uid || '', keyUpdates: {}, deletions: {} }
  }
}

function writeMeta(meta) {
  try {
    nativeSetItem.call(localStorage, CLOUD_META_KEY, JSON.stringify(meta))
  } catch {
    // Metadata is optional; local course state remains intact.
  }
}

function markLocalChange(key, deleted = false) {
  const uid = activeSession?.uid
  if (!uid) return
  const meta = readMeta(uid)
  const stamp = nowIso()

  if (deleted) {
    delete meta.keyUpdates[key]
    meta.deletions[key] = stamp
  } else {
    delete meta.deletions[key]
    meta.keyUpdates[key] = stamp
  }

  writeMeta(meta)
}

function clearSyncedMetaKeys(uid, keys) {
  const meta = readMeta(uid)
  keys.forEach((key) => {
    delete meta.keyUpdates[key]
    delete meta.deletions[key]
  })
  meta.lastSyncAt = nowIso()
  writeMeta(meta)
}

function localSnapshot() {
  const result = new Map()
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!shouldSyncKey(key)) continue
    result.set(key, localStorage.getItem(key) ?? '')
  }
  return result
}

function installStorageInterceptor() {
  if (patched || typeof window === 'undefined') return
  patched = true

  Storage.prototype.setItem = function patchedSetItem(key, value) {
    nativeSetItem.call(this, key, value)
    if (
      this === window.localStorage &&
      activeSession?.uid &&
      !suppressSync &&
      shouldSyncKey(key)
    ) {
      markLocalChange(key, false)
      queueWrite(key, String(value))
    }
  }

  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    nativeRemoveItem.call(this, key)
    if (
      this === window.localStorage &&
      activeSession?.uid &&
      !suppressSync &&
      shouldSyncKey(key)
    ) {
      markLocalChange(key, true)
      queueDelete(key)
    }
  }
}

function queueWrite(key, value) {
  pending.set(key, { type: 'write', value })
  scheduleFlush()
}

function queueDelete(key) {
  pending.set(key, { type: 'delete' })
  scheduleFlush()
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushCloudQueue()
  }, FLUSH_DELAY_MS)
}

export async function flushCloudQueue() {
  if (flushing || !activeSession?.uid || pending.size === 0) return
  flushing = true
  const uid = activeSession.uid
  const batch = [...pending.entries()]
  batch.forEach(([key]) => pending.delete(key))
  emit('saving', { pending: batch.length })

  try {
    const syncedKeys = []
    for (const [key, operation] of batch) {
      if (!activeSession || activeSession.uid !== uid) break
      if (operation.type === 'delete') {
        await deleteCloudState(uid, key)
      } else {
        await putCloudState(uid, key, operation.value)
      }
      syncedKeys.push(key)
    }
    clearSyncedMetaKeys(uid, syncedKeys)
    emit('synced')
  } catch (error) {
    batch.forEach(([key, operation]) => {
      if (!pending.has(key)) pending.set(key, operation)
    })
    emit('offline', { error: error?.message || 'Cloud sync failed' })
  } finally {
    flushing = false
    if (pending.size > 0 && activeSession?.uid) scheduleFlush()
  }
}

function isNewer(localStamp, cloudStamp) {
  if (!localStamp) return false
  if (!cloudStamp) return true
  return String(localStamp) > String(cloudStamp)
}

export async function initializeCloudSync(session) {
  if (!session?.uid) throw new Error('AUTH_REQUIRED')
  prepareLocalStateForUser(session.uid)
  activeSession = session
  installStorageInterceptor()
  emit('loading')

  try {
    await writeUserProfile(session)
    const cloudEntries = await listCloudState(session.uid)
    const localEntries = localSnapshot()
    const meta = readMeta(session.uid)

    if (cloudEntries.length === 0) {
      const syncedKeys = []
      for (const [key, value] of localEntries.entries()) {
        await putCloudState(session.uid, key, value)
        syncedKeys.push(key)
      }
      clearSyncedMetaKeys(session.uid, syncedKeys)
      emit('synced', { migrated: localEntries.size })
      return { source: 'local', migrated: localEntries.size }
    }

    const cloudByKey = new Map(cloudEntries.map((entry) => [entry.key, entry]))
    const allKeys = new Set([
      ...localEntries.keys(),
      ...cloudByKey.keys(),
      ...Object.keys(meta.keyUpdates),
      ...Object.keys(meta.deletions),
    ])

    const syncedKeys = []
    let restored = 0
    let uploaded = 0
    let deleted = 0

    suppressSync = true
    try {
      for (const key of allKeys) {
        const cloud = cloudByKey.get(key)
        const localValue = localEntries.get(key)
        const localUpdateAt = meta.keyUpdates[key]
        const localDeleteAt = meta.deletions[key]
        const cloudUpdatedAt = cloud?.updatedAt || ''

        if (localDeleteAt && isNewer(localDeleteAt, cloudUpdatedAt)) {
          await deleteCloudState(session.uid, key)
          nativeRemoveItem.call(localStorage, key)
          syncedKeys.push(key)
          deleted += 1
          continue
        }

        if (localValue !== undefined && isNewer(localUpdateAt, cloudUpdatedAt)) {
          await putCloudState(session.uid, key, localValue)
          syncedKeys.push(key)
          uploaded += 1
          continue
        }

        if (cloud) {
          nativeSetItem.call(localStorage, key, cloud.value)
          syncedKeys.push(key)
          restored += 1
          continue
        }

        if (localValue !== undefined) {
          await putCloudState(session.uid, key, localValue)
          syncedKeys.push(key)
          uploaded += 1
        }
      }
    } finally {
      suppressSync = false
    }

    clearSyncedMetaKeys(session.uid, syncedKeys)
    emit('synced', { restored, uploaded, deleted })
    return { source: 'merged', restored, uploaded, deleted }
  } catch (error) {
    // Keep the local course usable if Firestore is temporarily unavailable.
    emit('offline', { error: error?.message || 'Cloud sync unavailable' })
    return { source: 'local-fallback', error }
  }
}

export function stopCloudSync() {
  activeSession = null
  pending.clear()
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  emit('stopped')
}
