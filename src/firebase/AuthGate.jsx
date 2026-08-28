import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  restoreAuthSession,
  sendPasswordReset,
  signInWithEmailPassword,
  signOutLocal,
} from './authClient.js'
import {
  flushCloudQueue,
  initializeCloudSync,
  stopCloudSync,
  subscribeCloudStatus,
} from './cloudSync.js'
import { flushPendingHskkAudioUploads } from './hskkAudioStore.js'
import { initializeContentOverrides } from './contentOverrides.js'
import { checkAdminAccess } from './adminApi.js'
import { AuthContext } from './authContext.js'
import './AuthGate.css'


function LoginScreen({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const session = await signInWithEmailPassword(email, password)
      await onSignedIn(session)
    } catch (err) {
      setError(err?.message || 'Не удалось войти.')
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      setError('Сначала введите email.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await sendPasswordReset(email)
      setNotice('Письмо для смены пароля отправлено.')
    } catch (err) {
      setError(err?.message || 'Не удалось отправить письмо.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="firebase-login-shell">
      <section className="firebase-login-card">
        <div className="firebase-login-mark">汉</div>
        <p className="firebase-login-kicker">HSK4 INTENSIVE</p>
        <h1>学习账户</h1>
        <p className="firebase-login-subtitle">Вход в учебный аккаунт</p>

        <form onSubmit={handleSubmit} className="firebase-login-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="firebase-login-message error">{error}</p>}
          {notice && <p className="firebase-login-message success">{notice}</p>}

          <button className="firebase-login-submit" type="submit" disabled={busy}>
            {busy ? 'Подключение…' : '进入课程 · Войти'}
          </button>
          <button
            className="firebase-login-reset"
            type="button"
            onClick={handleReset}
            disabled={busy}
          >
            Забыли пароль?
          </button>
        </form>

        <p className="firebase-login-note">
          Доступ закрытый. Аккаунт создаёт администратор курса.
        </p>
      </section>
    </main>
  )
}

function LoadingScreen({ text }) {
  return (
    <main className="firebase-login-shell">
      <section className="firebase-login-card firebase-loading-card">
        <div className="firebase-login-mark">汉</div>
        <div className="firebase-spinner" aria-hidden="true" />
        <p>{text}</p>
      </section>
    </main>
  )
}

function CloudBadge({ session, cloudState, isAdmin, onLogout }) {
  const labels = {
    loading: 'Загрузка облака…',
    saving: 'Сохраняю…',
    synced: 'Сохранено',
    offline: 'Локальный режим',
    stopped: 'Отключено',
  }

  return (
    <div className={`firebase-cloud-badge ${cloudState.status || 'synced'}`}>
      <span className="firebase-cloud-dot" />
      <div>
        <strong>{labels[cloudState.status] || 'Облако'}</strong>
        <small>{session.email}</small>
      </div>
      {isAdmin && <Link className="firebase-admin-link" to="/admin">Админ</Link>}
      <button type="button" onClick={onLogout}>Выйти</button>
    </div>
  )
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [booting, setBooting] = useState(true)
  const [cloudState, setCloudState] = useState({ status: 'loading' })
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => subscribeCloudStatus(setCloudState), [])

  useEffect(() => {
    if (!session || typeof window === 'undefined') return () => {}
    const retryAudioUploads = () => { void flushPendingHskkAudioUploads() }
    window.addEventListener('online', retryAudioUploads)
    return () => window.removeEventListener('online', retryAudioUploads)
  }, [session])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const restored = await restoreAuthSession()
      if (cancelled) return
      if (restored) {
        setSession(restored)
        await initializeCloudSync(restored)
        await initializeContentOverrides()
        setIsAdmin(await checkAdminAccess(restored.uid).catch(() => false))
        void flushPendingHskkAudioUploads()
      }
      if (!cancelled) setBooting(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function handleSignedIn(nextSession) {
    setSession(nextSession)
    setBooting(true)
    await initializeCloudSync(nextSession)
    await initializeContentOverrides()
    setIsAdmin(await checkAdminAccess(nextSession.uid).catch(() => false))
    void flushPendingHskkAudioUploads()
    setBooting(false)
  }

  async function handleLogout() {
    try { await flushCloudQueue() } catch { /* local data remains available */ }
    stopCloudSync()
    signOutLocal()
    setSession(null)
    setIsAdmin(false)
    setCloudState({ status: 'stopped' })
  }

  const contextValue = useMemo(() => ({ session, cloudState, isAdmin, logout: handleLogout }), [session, cloudState, isAdmin])

  if (booting) {
    return <LoadingScreen text={session ? 'Синхронизирую прогресс…' : 'Проверяю учебный аккаунт…'} />
  }

  if (!session) {
    return <LoginScreen onSignedIn={handleSignedIn} />
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <CloudBadge session={session} cloudState={cloudState} isAdmin={isAdmin} onLogout={handleLogout} />
    </AuthContext.Provider>
  )
}
