import { firebaseConfig } from './firebaseConfig.js'

const SESSION_KEY = 'firebase-auth-session-v1'
const REFRESH_MARGIN_MS = 90_000

function authUrl(path) {
  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${firebaseConfig.apiKey}`
}

function nowMs() {
  return Date.now()
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.uid && parsed?.refreshToken ? parsed : null
  } catch {
    return null
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

function normalizeSession(payload) {
  const expiresInSeconds = Number(payload.expiresIn ?? payload.expires_in ?? 3600)
  return {
    uid: payload.localId ?? payload.user_id,
    email: payload.email ?? '',
    idToken: payload.idToken ?? payload.id_token,
    refreshToken: payload.refreshToken ?? payload.refresh_token,
    expiresAt: nowMs() + Math.max(60, expiresInSeconds) * 1000,
  }
}

async function parseFirebaseError(response) {
  let code = 'UNKNOWN_ERROR'
  try {
    const body = await response.json()
    code = body?.error?.message || code
  } catch {
    // Keep fallback code.
  }

  const messages = {
    INVALID_LOGIN_CREDENTIALS: 'Неверный email или пароль.',
    EMAIL_NOT_FOUND: 'Пользователь с таким email не найден.',
    INVALID_PASSWORD: 'Неверный пароль.',
    USER_DISABLED: 'Этот аккаунт отключён.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Слишком много попыток. Попробуйте позже.',
    INVALID_EMAIL: 'Проверьте адрес электронной почты.',
    MISSING_PASSWORD: 'Введите пароль.',
  }

  const error = new Error(messages[code] || `Firebase Auth: ${code}`)
  error.code = code
  return error
}

export async function signInWithEmailPassword(email, password) {
  const response = await fetch(authUrl('accounts:signInWithPassword'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: String(email || '').trim(),
      password: String(password || ''),
      returnSecureToken: true,
    }),
  })

  if (!response.ok) throw await parseFirebaseError(response)
  return saveSession(normalizeSession(await response.json()))
}

export async function sendPasswordReset(email) {
  const response = await fetch(authUrl('accounts:sendOobCode'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestType: 'PASSWORD_RESET',
      email: String(email || '').trim(),
    }),
  })

  if (!response.ok) throw await parseFirebaseError(response)
  return true
}

export function signOutLocal() {
  localStorage.removeItem(SESSION_KEY)
}

async function refreshSession(session) {
  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      }),
    },
  )

  if (!response.ok) {
    signOutLocal()
    throw new Error('Сессия истекла. Войдите снова.')
  }

  const refreshed = normalizeSession(await response.json())
  refreshed.email = session.email || refreshed.email
  return saveSession(refreshed)
}

export async function getValidSession() {
  const session = readSession()
  if (!session) return null

  if (session.idToken && session.expiresAt - nowMs() > REFRESH_MARGIN_MS) {
    return session
  }

  return refreshSession(session)
}

export async function restoreAuthSession() {
  try {
    return await getValidSession()
  } catch {
    return null
  }
}
