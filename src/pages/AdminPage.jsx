import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllLessonPlans, getLessonDay } from '../data/courseRegistry.js'
import { getBaseActivitiesForMode } from '../utils/coursePlanner.js'
import { useAuth } from '../firebase/authContext.js'
import {
  applyContentOverride,
  deleteContentOverride,
  getAllContentOverrides,
  getContentOverride,
  saveContentOverride,
} from '../firebase/contentOverrides.js'
import {
  checkAdminAccess,
  listHskkAttemptsForAdmin,
  listUserStateForAdmin,
  listUsersForAdmin,
  loadHskkAttemptAudioForAdmin,
  summarizeUserState,
} from '../firebase/adminApi.js'
import { parseStoredHskkFeedback } from '../utils/hskkAutoFeedback.js'
import './AdminPage.css'

const TEXT_FIELDS = [
  ['title', 'Заголовок'],
  ['translation', 'Перевод / подпись'],
  ['instruction', 'Инструкция'],
  ['description', 'Описание'],
  ['prompt', 'Вопрос / prompt'],
  ['promptPinyin', 'Pinyin вопроса'],
  ['promptTranslation', 'Перевод вопроса'],
  ['target', 'Эталон / фраза для повтора'],
  ['targetPinyin', 'Pinyin эталона'],
  ['targetTranslation', 'Перевод эталона'],
  ['answerPinyin', 'Pinyin ответа'],
  ['answerTranslation', 'Перевод ответа'],
  ['audio', 'Путь к аудио'],
  ['image', 'Путь к изображению'],
  ['imageAlt', 'Описание изображения'],
]

function primitiveArray(value) {
  return Array.isArray(value) && value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))
}

function formFromActivity(baseActivity) {
  const effective = applyContentOverride(baseActivity)
  const override = getContentOverride(baseActivity.id)?.patch || {}
  const form = {
    enabled: override.enabled !== false,
    priority: effective.priority || 'standard',
    estimatedSeconds: String(effective.estimatedSeconds ?? ''),
    difficulty: String(effective.difficulty ?? ''),
    order: override.order === undefined ? '' : String(override.order),
    answer: effective.answer === undefined ? '' : String(effective.answer),
    optionsText: primitiveArray(effective.options) ? effective.options.map(String).join('\n') : '',
    acceptedAnswersText: primitiveArray(effective.acceptedAnswers) ? effective.acceptedAnswers.map(String).join('\n') : '',
    complexOptions: Array.isArray(effective.options) && !primitiveArray(effective.options),
  }
  TEXT_FIELDS.forEach(([key]) => { form[key] = String(effective[key] ?? '') })
  return form
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function coerceLike(base, text) {
  if (typeof base === 'boolean') return String(text).toLowerCase() === 'true'
  if (typeof base === 'number') return Number(text)
  return text
}

function buildPatch(base, form) {
  const patch = {}
  const putIfChanged = (key, value) => {
    if (!sameValue(value, base[key])) patch[key] = value
  }

  TEXT_FIELDS.forEach(([key]) => {
    const value = form[key] || ''
    if (value || base[key] !== undefined) putIfChanged(key, value)
  })

  const answer = coerceLike(base.answer, form.answer)
  if (form.answer || base.answer !== undefined) putIfChanged('answer', answer)

  if (!form.complexOptions) {
    const options = form.optionsText.split('\n').map((item) => item.trim()).filter(Boolean)
    if (options.length || Array.isArray(base.options)) putIfChanged('options', options)
  }

  const acceptedAnswers = form.acceptedAnswersText.split('\n').map((item) => item.trim()).filter(Boolean)
  if (acceptedAnswers.length || Array.isArray(base.acceptedAnswers)) putIfChanged('acceptedAnswers', acceptedAnswers)

  putIfChanged('priority', form.priority)

  const seconds = Number(form.estimatedSeconds)
  if (Number.isFinite(seconds) && seconds >= 0) putIfChanged('estimatedSeconds', seconds)

  if (form.difficulty) putIfChanged('difficulty', form.difficulty)
  else if (base.difficulty !== undefined) putIfChanged('difficulty', '')

  if (!form.enabled) patch.enabled = false
  if (form.order !== '' && Number.isFinite(Number(form.order))) patch.order = Number(form.order)
  return patch
}

function formatDate(value) {
  if (!value) return '—'
  try { return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) } catch { return String(value) }
}

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AdminAudioPlayer({ uid, attempt }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  async function load() {
    setBusy(true)
    setError('')
    try {
      const result = await loadHskkAttemptAudioForAdmin(uid, attempt.id)
      if (!result?.blob) throw new Error('Аудио ещё не готово или отсутствует.')
      if (url) URL.revokeObjectURL(url)
      setUrl(URL.createObjectURL(result.blob))
    } catch (err) {
      setError(err?.message || 'Не удалось загрузить запись.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-audio-player">
      {url ? <audio controls src={url} preload="metadata" /> : (
        <button type="button" onClick={load} disabled={busy || attempt.status !== 'ready'}>
          {busy ? 'Загружаю…' : '▶ Прослушать'}
        </button>
      )}
      {error && <small className="admin-error-text">{error}</small>}
    </div>
  )
}

function AccessDenied({ session }) {
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')

  async function retry() {
    setChecking(true)
    const allowed = await checkAdminAccess(session.uid).catch(() => false)
    if (allowed) window.location.reload()
    else setMessage('Admin-документ пока не найден. Проверь его ID в Firestore.')
    setChecking(false)
  }

  return (
    <main className="admin-page">
      <section className="admin-access-card">
        <span className="admin-seal">管</span>
        <h1>Админ-панель пока закрыта</h1>
        <p>Аккаунт успешно вошёл, но защищённая роль администратора ещё не назначена.</p>
        <div className="admin-uid-box">
          <small>Твой Firebase UID</small>
          <code>{session.uid}</code>
        </div>
        <p className="admin-access-note">Создай в Firestore коллекцию <b>admins</b> и документ с этим UID. Поля документа не влияют на доступ.</p>
        <button type="button" onClick={retry} disabled={checking}>{checking ? 'Проверяю…' : 'Проверить доступ снова'}</button>
        {message && <p className="admin-error-text">{message}</p>}
        <Link to="/">← Вернуться в курс</Link>
      </section>
    </main>
  )
}


function ActivityEditor({ entry, lessonId, dayNumber }) {
  const [form, setForm] = useState(() => formFromActivity(entry.baseActivity))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function saveActivity() {
    setSaving(true)
    setMessage('')
    try {
      const patch = buildPatch(entry.baseActivity, form)
      if (Object.keys(patch).length === 0) {
        await deleteContentOverride(entry.baseActivity.id)
        setMessage('Изменений относительно базовой версии нет. Override удалён.')
      } else {
        await saveContentOverride(entry.baseActivity.id, patch)
        setMessage('Сохранено. Изменение уже применяется в курсе.')
      }
    } catch (err) {
      setMessage(err?.message || 'Не удалось сохранить изменение.')
    } finally {
      setSaving(false)
    }
  }

  async function resetActivity() {
    if (!window.confirm('Удалить все изменения этого задания и вернуть исходную версию?')) return
    setSaving(true)
    setMessage('')
    try {
      await deleteContentOverride(entry.baseActivity.id)
      setForm(formFromActivity(entry.baseActivity))
      setMessage('Базовая версия восстановлена.')
    } catch (err) {
      setMessage(err?.message || 'Не удалось сбросить изменение.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="admin-editor-head">
        <div>
          <small>{entry.baseActivity.id}</small>
          <h2>{entry.effective.title || entry.baseActivity.id}</h2>
          <span>{entry.baseActivity.type} · {entry.baseActivity.skill} / {entry.baseActivity.subskill || '—'}</span>
        </div>
        <Link to={`/lesson/${lessonId}/day/${dayNumber}`} target="_blank">Открыть день ↗</Link>
      </div>

      <div className="admin-editor-grid compact">
        <label className="admin-checkbox"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />Задание включено</label>
        <label>Режим
          <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
            <option value="core">Core · обязательный</option>
            <option value="standard">Standard · основной</option>
            <option value="intensive">Intensive · усиленный</option>
          </select>
        </label>
        <label>Время, сек.<input type="number" min="0" value={form.estimatedSeconds} onChange={(event) => setForm({ ...form, estimatedSeconds: event.target.value })} /></label>
        <label>Позиция в дне<input type="number" value={form.order} placeholder="исходная" onChange={(event) => setForm({ ...form, order: event.target.value })} /></label>
        <label>Сложность<input value={form.difficulty} placeholder="например medium" onChange={(event) => setForm({ ...form, difficulty: event.target.value })} /></label>
      </div>

      <div className="admin-editor-grid">
        {TEXT_FIELDS.map(([key, label]) => (
          <label key={key} className={['instruction', 'description', 'prompt', 'target'].includes(key) ? 'wide' : ''}>{label}
            {['instruction', 'description', 'prompt', 'target'].includes(key) ? (
              <textarea rows="3" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
            ) : (
              <input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
            )}
          </label>
        ))}

        <label className="wide">Правильный ответ
          <input value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} />
        </label>

        <label className="wide">Варианты ответа · по одному в строке
          <textarea rows="5" value={form.optionsText} disabled={form.complexOptions} onChange={(event) => setForm({ ...form, optionsText: event.target.value })} />
          {form.complexOptions && <small>У этого задания сложная структура options; простое текстовое редактирование отключено, чтобы не повредить схему.</small>}
        </label>

        <label className="wide">Допустимые ответы · по одному в строке
          <textarea rows="4" value={form.acceptedAnswersText} onChange={(event) => setForm({ ...form, acceptedAnswersText: event.target.value })} />
        </label>
      </div>

      {message && <p className="admin-save-message">{message}</p>}
      <div className="admin-editor-actions">
        <button className="primary" type="button" onClick={saveActivity} disabled={saving}>{saving ? 'Сохраняю…' : 'Сохранить override'}</button>
        <button type="button" onClick={resetActivity} disabled={saving || !entry.override}>Сбросить к базовой версии</button>
      </div>
    </>
  )
}

export default function AdminPage() {
  const auth = useAuth()
  const { session, isAdmin } = auth || {}
  const [tab, setTab] = useState('overview')
  const [overrideVersion, setOverrideVersion] = useState(0)
  const lessons = useMemo(() => getAllLessonPlans(), [])
  const [lessonId, setLessonId] = useState(lessons[0]?.lessonId || 'lesson-1')
  const [dayNumber, setDayNumber] = useState(1)
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [contentSearch, setContentSearch] = useState('')

  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUid, setSelectedUid] = useState('')
  const [userState, setUserState] = useState([])
  const [attempts, setAttempts] = useState([])
  const [studentLoading, setStudentLoading] = useState(false)
  const [studentError, setStudentError] = useState('')

  useEffect(() => {
    const handler = () => setOverrideVersion((value) => value + 1)
    window.addEventListener('hsk4-content-overrides-changed', handler)
    return () => window.removeEventListener('hsk4-content-overrides-changed', handler)
  }, [])

  const activeLesson = lessons.find((item) => item.lessonId === lessonId) || lessons[0]
  const activeDay = getLessonDay(activeLesson?.lessonId, dayNumber)
  void overrideVersion
  const baseActivities = activeDay ? getBaseActivitiesForMode(activeDay, 'intensive') : []
  const catalog = baseActivities.map((baseActivity, index) => {
    const override = getContentOverride(baseActivity.id)
    const effective = applyContentOverride(baseActivity)
    return {
      baseActivity,
      effective,
      override,
      enabled: override?.patch?.enabled !== false,
      order: override?.patch?.order ?? index,
    }
  }).sort((a, b) => Number(a.order) - Number(b.order))

  const filteredCatalog = catalog.filter(({ effective }) => {
    const haystack = `${effective.id} ${effective.title || ''} ${effective.translation || ''} ${effective.prompt || ''}`.toLowerCase()
    return haystack.includes(contentSearch.trim().toLowerCase())
  })

  const selectedEntry = catalog.find((entry) => entry.baseActivity.id === selectedActivityId) || catalog[0] || null
  const effectiveSelectedActivityId = selectedEntry?.baseActivity.id || ''

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    ;(async () => {
      setUsersLoading(true)
      try {
        const list = await listUsersForAdmin()
        if (cancelled) return
        setUsers(list)
        setSelectedUid((current) => current || list.find((item) => item.id !== session.uid)?.id || list[0]?.id || '')
      } catch (err) {
        if (!cancelled) setStudentError(err?.message || 'Не удалось загрузить пользователей.')
      } finally {
        if (!cancelled) setUsersLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isAdmin, session?.uid])

  useEffect(() => {
    if (!isAdmin || !selectedUid) return
    let cancelled = false
    ;(async () => {
      setStudentLoading(true)
      setStudentError('')
      try {
        const [state, audio] = await Promise.all([
          listUserStateForAdmin(selectedUid),
          listHskkAttemptsForAdmin(selectedUid),
        ])
        if (cancelled) return
        setUserState(state)
        setAttempts(audio)
      } catch (err) {
        if (!cancelled) setStudentError(err?.message || 'Не удалось загрузить данные ученика.')
      } finally {
        if (!cancelled) setStudentLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isAdmin, selectedUid])

  if (!session) return null
  if (!isAdmin) return <AccessDenied session={session} />

  const overrides = getAllContentOverrides()
  const summary = summarizeUserState(userState)
  const selectedUser = users.find((item) => item.id === selectedUid) || null

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <p>HSK4 INTENSIVE · 管理</p>
            <h1>Админ-панель</h1>
            <span>Контент курса, прогресс ученика и HSKK-записи</span>
          </div>
          <div className="admin-header-actions">
            <span>{session.email}</span>
            <Link to="/">Открыть курс →</Link>
          </div>
        </header>

        <nav className="admin-tabs">
          <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Обзор</button>
          <button className={tab === 'content' ? 'active' : ''} onClick={() => setTab('content')}>Контент</button>
          <button className={tab === 'student' ? 'active' : ''} onClick={() => setTab('student')}>Ученик · HSKK</button>
        </nav>

        {tab === 'overview' && (
          <section className="admin-overview">
            <div className="admin-metric"><span>Уроков</span><strong>20</strong><small>60 учебных дней + Week 12</small></div>
            <div className="admin-metric"><span>Изменённых заданий</span><strong>{Object.keys(overrides).length}</strong><small>Firestore overrides</small></div>
            <div className="admin-metric"><span>Аккаунтов</span><strong>{usersLoading ? '…' : users.length}</strong><small>в коллекции users</small></div>
            <div className="admin-metric"><span>HSKK записей</span><strong>{attempts.length}</strong><small>для выбранного пользователя</small></div>

            <article className="admin-info-card">
              <h2>Как устроено редактирование</h2>
              <p>Исходные файлы Lessons 1–20 остаются неизменными. Админка сохраняет только разницу по activityId в Firestore. Ученик получает эту разницу после входа, а при сбросе override мгновенно возвращается исходная версия задания.</p>
            </article>
            <article className="admin-info-card">
              <h2>Что уже можно менять</h2>
              <p>Текст, перевод, instruction, prompt, варианты и правильный ответ, единичный audio/image path, режим Core/Standard/Intensive, длительность, порядок в дне, сложность и включение/отключение задания.</p>
            </article>
          </section>
        )}

        {tab === 'content' && (
          <section className="admin-content-layout">
            <aside className="admin-content-nav">
              <div className="admin-select-row">
                <label>Урок
                  <select value={lessonId} onChange={(event) => { setLessonId(event.target.value); setDayNumber(1); setSelectedActivityId('') }}>
                    {lessons.map((lesson) => <option key={lesson.lessonId} value={lesson.lessonId}>{lesson.lessonNumber}. {lesson.title}</option>)}
                  </select>
                </label>
                <label>День
                  <select value={dayNumber} onChange={(event) => { setDayNumber(Number(event.target.value)); setSelectedActivityId('') }}>
                    {(activeLesson?.days || []).map((day) => <option key={day.day} value={day.day}>Day {day.day}</option>)}
                  </select>
                </label>
              </div>

              <input className="admin-search" placeholder="Найти задание…" value={contentSearch} onChange={(event) => setContentSearch(event.target.value)} />
              <div className="admin-activity-list">
                {filteredCatalog.map(({ baseActivity, effective, override, enabled }) => (
                  <button key={baseActivity.id} className={`${effectiveSelectedActivityId === baseActivity.id ? 'active' : ''} ${!enabled ? 'disabled' : ''}`} onClick={() => setSelectedActivityId(baseActivity.id)}>
                    <span>{effective.title || effective.prompt || baseActivity.id}</span>
                    <small>{effective.skill || '—'} · {effective.priority || 'standard'} {override ? '· изменено' : ''}</small>
                  </button>
                ))}
              </div>
            </aside>

            <div className="admin-editor">
              {selectedEntry ? (
                <ActivityEditor
                  key={selectedEntry.baseActivity.id}
                  entry={selectedEntry}
                  lessonId={lessonId}
                  dayNumber={dayNumber}
                />
              ) : <p>В этом дне нет заданий.</p>}
            </div>
          </section>
        )}

        {tab === 'student' && (
          <section className="admin-student-layout">
            <aside className="admin-user-list">
              <h2>Аккаунты</h2>
              {usersLoading && <p>Загрузка…</p>}
              {users.map((user) => (
                <button key={user.id} className={selectedUid === user.id ? 'active' : ''} onClick={() => setSelectedUid(user.id)}>
                  <strong>{user.email || 'Без email'}</strong>
                  <small>{user.id === session.uid ? 'текущий admin' : user.id.slice(0, 12)}</small>
                </button>
              ))}
            </aside>

            <div className="admin-student-main">
              {studentError && <p className="admin-error-text">{studentError}</p>}
              {studentLoading ? <p>Загружаю прогресс…</p> : selectedUser ? (
                <>
                  <header className="admin-student-head">
                    <div><small>Ученик / аккаунт</small><h2>{selectedUser.email || selectedUser.id}</h2></div>
                    <span>Последний вход: {formatDate(selectedUser.lastSeenAt)}</span>
                  </header>

                  <div className="admin-progress-grid">
                    <div><span>Текущий урок</span><strong>{summary.planner.currentLessonId || '—'}</strong><small>Day {summary.planner.currentDay || '—'} · {summary.planner.mode || '—'}</small></div>
                    <div><span>Завершено дней</span><strong>{summary.planner.completedDays?.length || 0}</strong><small>из основного маршрута</small></div>
                    <div><span>Заданий выполнено</span><strong>{summary.completedActivities}</strong><small>из {summary.activityCount} начатых</small></div>
                    <div><span>Checkpoints</span><strong>{summary.checkpointResults.length}/4</strong><small>промежуточные срезы</small></div>
                    <div><span>Week 12</span><strong>{summary.finalWeek.completedDays?.length || 0}/7</strong><small>финальная неделя</small></div>
                    <div><span>Активные ошибки</span><strong>{summary.activeErrors}</strong><small>SRS due: {summary.dueSrs}</small></div>
                  </div>

                  {summary.diagnostic && (
                    <article className="admin-diagnostic-card">
                      <h3>Стартовая диагностика</h3>
                      <p>Пройдена: {formatDate(summary.diagnostic.completedAt)}. Профиль сохранён и участвует в адаптивном плане.</p>
                    </article>
                  )}

                  <section className="admin-hskk-section">
                    <div className="admin-section-title"><div><h2>HSKK-записи</h2><p>{attempts.length} сохранённых попыток</p></div></div>
                    {attempts.length === 0 ? <p>Записей пока нет.</p> : (
                      <div className="admin-attempt-list">
                        {attempts.map((attempt) => {
                          const feedback = parseStoredHskkFeedback(attempt.autoFeedbackJson)
                          return (
                            <article key={attempt.id} className="admin-attempt-card">
                              <div className="admin-attempt-meta">
                                <strong>{attempt.label || attempt.activityId || attempt.kind || 'HSKK запись'}</strong>
                                <span>{formatDate(attempt.createdAt)}</span>
                                <small>{attempt.lessonId || attempt.sourceContext || '—'} {attempt.day ? `· Day ${attempt.day}` : ''}</small>
                                <small>{attempt.durationSeconds || 0} сек · {formatBytes(attempt.sizeBytes)} · {attempt.status || '—'}</small>
                              </div>
                              <AdminAudioPlayer uid={selectedUid} attempt={attempt} />
                              {(attempt.transcript || feedback) && (
                                <div className="admin-hskk-feedback">
                                  {feedback && <div className={`admin-feedback-score ${feedback.grade || ''}`}><b>{feedback.score ?? 0}%</b><span>авторазбор</span></div>}
                                  <div>
                                    {attempt.transcript && <p><b>Распознано:</b> {attempt.transcript}</p>}
                                    {feedback?.advice && <p>{feedback.advice}</p>}
                                    {Array.isArray(feedback?.metrics?.categoryResults) && (
                                      <div className="admin-feedback-tags">{feedback.metrics.categoryResults.map((item) => <span key={item.id} className={item.passed ? 'ok' : ''}>{item.passed ? '✓' : '○'} {item.label}</span>)}</div>
                                    )}
                                    {feedback?.disclaimer && <small>{feedback.disclaimer}</small>}
                                  </div>
                                </div>
                              )}
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </>
              ) : <p>Создай аккаунт ученика в Firebase Authentication — после первого входа он появится здесь автоматически.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
