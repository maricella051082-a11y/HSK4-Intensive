import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import ActivityRenderer from '../engine/ActivityRenderer.jsx'
import { buildCheckpoint } from '../data/checkpointData.js'
import { completeCheckpointRecord, getCheckpointProgress, getCheckpointResult } from '../utils/checkpointStore.js'
import { completePlannerCheckpoint, getPlannerState, setPlannerCheckpoint } from '../utils/coursePlanner.js'
import './CheckpointPage.css'

function minutes(seconds) {
  return Math.max(1, Math.round((Number(seconds) || 0) / 60))
}

export default function CheckpointPage() {
  const { checkpointId } = useParams()
  const navigate = useNavigate()
  const checkpoint = useMemo(() => buildCheckpoint(checkpointId), [checkpointId])
  const [, refresh] = useState(0)
  const progress = getCheckpointProgress(checkpointId)
  const savedResult = getCheckpointResult(checkpointId)

  if (!checkpoint) return <Navigate to="/" replace />
  const planner = getPlannerState()
  const isCurrent = planner.checkpointActive && planner.currentCheckpointId === checkpointId
  const canFinish = progress.total > 0 && progress.percent === 100

  function finish() {
    if (!canFinish) return
    if (!isCurrent) setPlannerCheckpoint(checkpointId)
    const result = completeCheckpointRecord(checkpointId)
    if (!result) return
    completePlannerCheckpoint(checkpointId)
    refresh((value) => value + 1)
    navigate('/today')
  }

  return (
    <main className="checkpoint-page">
      <div className="checkpoint-shell">
        <div className="checkpoint-topbar">
          <Link to="/">← На главную</Link>
          <Link to="/dashboard">Мой прогресс →</Link>
        </div>

        <section className="checkpoint-hero">
          <div>
            <p className="checkpoint-kicker">CHECKPOINT {checkpoint.number} · УРОКИ {checkpoint.lessons[0]}–{checkpoint.lessons.at(-1)}</p>
            <h1><ChineseText pinyin={checkpoint.pinyin} translation={checkpoint.translation}>{checkpoint.title}</ChineseText></h1>
            <p>Промежуточный срез без подсказок до ответа. Результат войдёт в адаптивную рекомендацию следующих уроков.</p>
          </div>
          <div className="checkpoint-progress-card">
            <strong>{progress.percent}%</strong>
            <span>{progress.completed} / {progress.total} заданий</span>
            <div><i style={{ width: `${progress.percent}%` }} /></div>
            <small>≈ {minutes(checkpoint.estimatedSeconds)} минут</small>
          </div>
        </section>

        <section className="checkpoint-rules">
          <strong>考试模式 · Контрольный режим</strong>
          <p>Listening: 10 · Reading: 8 · Writing: 4 · 听后重复: 5 · 看图说话: 1 · 回答问题: 1. Правильный ответ и разбор открываются только после проверки конкретного задания.</p>
        </section>

        {savedResult && (
          <section className="checkpoint-result-banner">
            <strong>Последний результат: {savedResult.score ?? '—'}%</strong>
            <span>{new Date(savedResult.completedAt).toLocaleString()}</span>
          </section>
        )}

        {checkpoint.sections.map((section) => (
          <section className="checkpoint-section" key={section.id}>
            <div className="checkpoint-section-heading">
              <div>
                <h2><ChineseText pinyin={section.pinyin} translation={section.translation}>{section.label}</ChineseText></h2>
                <span>{section.translation}</span>
              </div>
              <b>{section.activities.length}</b>
            </div>
            <div className="checkpoint-activities">
              {section.activities.map((activity, index) => (
                <div className="checkpoint-activity-wrap" key={activity.id}>
                  <div className="checkpoint-number">{String(index + 1).padStart(2, '0')}</div>
                  <ActivityRenderer activity={activity} onStatusChange={() => refresh((value) => value + 1)} />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className={`checkpoint-finish ${canFinish ? 'ready' : ''}`}>
          <div>
            <strong>{canFinish ? '阶段检查完成 · Контрольная точка завершена' : 'Закрой все задания контрольной точки'}</strong>
            <p>{canFinish ? 'Можно сохранить срез и перейти к следующему уроку.' : `Осталось ${Math.max(0, progress.total - progress.completed)} из ${progress.total}.`}</p>
          </div>
          <button type="button" disabled={!canFinish} onClick={finish}>Сохранить результат и продолжить →</button>
        </section>
      </div>
    </main>
  )
}
