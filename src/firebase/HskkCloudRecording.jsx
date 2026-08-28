import { useEffect, useState } from 'react'
import {
  createAudioObjectUrl,
  getLatestHskkAudioMeta,
  loadLatestHskkAudio,
} from './hskkAudioStore.js'
import { parseStoredHskkFeedback } from '../utils/hskkAutoFeedback.js'
import './HskkCloudRecording.css'

export default function HskkCloudRecording({
  slotId,
  localUrl = '',
  saveState = '',
  refreshKey = 0,
  compact = false,
  feedback = null,
}) {
  const [meta, setMeta] = useState(null)
  const [cloudUrl, setCloudUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!slotId) return () => {}

    getLatestHskkAudioMeta(slotId)
      .then((value) => { if (!cancelled) setMeta(value) })
      .catch(() => { if (!cancelled) setMeta(null) })

    return () => { cancelled = true }
  }, [slotId, refreshKey])

  useEffect(() => () => {
    if (cloudUrl) URL.revokeObjectURL(cloudUrl)
  }, [cloudUrl])

  async function loadSaved() {
    setLoading(true)
    setError('')
    try {
      const result = await loadLatestHskkAudio(slotId)
      if (!result?.blob) throw new Error('Запись не найдена.')
      setCloudUrl(createAudioObjectUrl(result.blob))
      setMeta(result.meta || meta)
    } catch {
      setError('Не удалось загрузить сохранённую запись. Попробуй ещё раз при подключении к интернету.')
    } finally {
      setLoading(false)
    }
  }

  const playbackUrl = localUrl || cloudUrl
  const stateLabel = saveState === 'saving'
    ? 'Сохраняю запись…'
    : saveState === 'saved'
      ? 'Сохранено в облаке'
      : saveState === 'pending'
        ? 'Сохранено на устройстве · загрузится в облако позже'
        : saveState === 'local-only'
          ? 'Запись доступна на этом устройстве'
          : meta?.status === 'pending'
            ? 'Есть локальная запись, ожидающая синхронизации'
            : meta
              ? 'Есть сохранённая запись'
              : ''


  const storedFeedback = feedback || parseStoredHskkFeedback(meta?.autoFeedbackJson)
  const transcript = storedFeedback?.transcript || meta?.transcript || ''

  if (!playbackUrl && !meta && !saveState) return null

  return (
    <div className={`hskk-cloud-recording ${compact ? 'compact' : ''}`}>
      {playbackUrl ? (
        <audio controls src={playbackUrl} preload="metadata" />
      ) : (
        <button type="button" className="hskk-cloud-load" onClick={loadSaved} disabled={loading}>
          {loading ? 'Загружаю…' : '▶ Прослушать последнюю сохранённую запись'}
        </button>
      )}
      {stateLabel && <small>{stateLabel}</small>}
      {storedFeedback && (
        <details className="hskk-auto-feedback" open={!compact}>
          <summary>Автоматический разбор · {storedFeedback.score ?? 0}%</summary>
          <div className={`hskk-auto-feedback-body ${storedFeedback.grade || ''}`}>
            {transcript && <p><b>Распознано:</b> {transcript}</p>}
            <p>{storedFeedback.advice}</p>
            {storedFeedback.kind !== 'repeat' && Array.isArray(storedFeedback.metrics?.categoryResults) && (
              <div className="hskk-feedback-tags">
                {storedFeedback.metrics.categoryResults.map((item) => (
                  <span key={item.id} className={item.passed ? 'ok' : ''}>{item.passed ? '✓' : '○'} {item.label}</span>
                ))}
              </div>
            )}
            {storedFeedback.kind === 'repeat' && (
              <div className="hskk-feedback-tags"><span className="ok">Совпадение {storedFeedback.metrics?.similarity ?? 0}%</span></div>
            )}
            <small>{storedFeedback.disclaimer}</small>
          </div>
        </details>
      )}
      {error && <small className="error">{error}</small>}
    </div>
  )
}
