import { firebaseConfig } from './firebaseConfig.js'
import { getValidSession } from './authClient.js'

const BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`

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

  if (!response.ok) {
    let detail = `${response.status}`
    try {
      const payload = await response.json()
      detail = payload?.error?.message || detail
    } catch {
      // Keep status text.
    }
    const error = new Error(`Firestore: ${detail}`)
    error.status = response.status
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

function stringField(value) {
  return { stringValue: String(value ?? '') }
}

function timestampField(value = new Date().toISOString()) {
  return { timestampValue: value }
}

function numberField(value) {
  return { integerValue: String(Number(value) || 0) }
}

function stateDocId(key) {
  return encodeURIComponent(key)
}

export async function writeUserProfile(session) {
  const url = `${BASE}/users/${encodeURIComponent(session.uid)}?updateMask.fieldPaths=email&updateMask.fieldPaths=schemaVersion&updateMask.fieldPaths=lastSeenAt`
  return authorizedFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        email: stringField(session.email),
        schemaVersion: numberField(1),
        lastSeenAt: timestampField(),
      },
    }),
  })
}

export async function listCloudState(uid) {
  const url = `${BASE}/users/${encodeURIComponent(uid)}/state?pageSize=200`
  const payload = await authorizedFetch(url)
  return (payload?.documents || []).map((doc) => ({
    key: doc?.fields?.key?.stringValue || '',
    value: doc?.fields?.value?.stringValue ?? '',
    updatedAt: doc?.fields?.updatedAt?.timestampValue || '',
  })).filter((item) => item.key)
}

export async function putCloudState(uid, key, value) {
  const url = `${BASE}/users/${encodeURIComponent(uid)}/state/${stateDocId(key)}`
  return authorizedFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        key: stringField(key),
        value: stringField(value),
        updatedAt: timestampField(),
      },
    }),
  })
}

export async function deleteCloudState(uid, key) {
  const url = `${BASE}/users/${encodeURIComponent(uid)}/state/${stateDocId(key)}`
  try {
    return await authorizedFetch(url, { method: 'DELETE' })
  } catch (error) {
    if (error?.status === 404) return null
    throw error
  }
}
