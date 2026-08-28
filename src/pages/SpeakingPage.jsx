import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import speakingLesson1, {
  speakingLesson1Meta,
} from '../data/speakingLesson1.js'
import HskkCloudRecording from '../firebase/HskkCloudRecording.jsx'
import { saveHskkAudio } from '../firebase/hskkAudioStore.js'
import { analyzeHskkResponse } from '../utils/hskkAutoFeedback.js'
import { mediaUrl } from '../utils/mediaUrl.js'
import './SpeakingPage.css'
import {
  recordLearningError,
  resolveLearningError,
} from '../utils/learningStore.js'

const STORAGE_KEY = 'hsk4-speaking-lesson1-session'
const RESULT_KEY = 'hsk4-speaking-lesson1-result'
const DATA_VERSION = 3
const STAGES = ['repeat', 'retell', 'picture', 'question']

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getInitialSession() {
  const saved = readJson(STORAGE_KEY)

  if (!saved || saved.version !== DATA_VERSION) {
    return null
  }

  return saved
}

function normalizeChinese(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\s，。！？、,.!?；;：“”‘’（）()]/g, '')
    .trim()
}

function chineseCharacterCount(value) {
  return [...normalizeChinese(value)].filter((char) =>
    /[\u3400-\u9fff]/.test(char),
  ).length
}

function levenshteinDistance(a, b) {
  const left = [...a]
  const right = [...b]

  if (left.length === 0) return right.length
  if (right.length === 0) return left.length

  const matrix = Array.from(
    { length: left.length + 1 },
    () => Array(right.length + 1).fill(0),
  )

  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[left.length][right.length]
}

function similarityPercent(target, transcript) {
  const a = normalizeChinese(target)
  const b = normalizeChinese(transcript)

  if (!a || !b) return 0

  const distance = levenshteinDistance(a, b)
  const longest = Math.max([...a].length, [...b].length)

  return Math.max(0, Math.round((1 - distance / longest) * 100))
}

function getRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function evaluateOpenSpeech(task, transcript, duration) {
  const normalized = normalizeChinese(transcript)

  const categoryResults = task.categories.map((category) => {
    const hits = category.keywords.filter((keyword) =>
      normalized.includes(normalizeChinese(keyword)),
    )

    return {
      id: category.id,
      label: category.label,
      passed: hits.length > 0,
      hits,
    }
  })

  const categoriesPassed = categoryResults.filter((item) => item.passed).length
  const characterCount = chineseCharacterCount(transcript)
  const durationPassed = duration >= task.minimumSeconds
  const lengthPassed = characterCount >= task.minimumCharacters
  const structurePassed = categoriesPassed >= task.minimumCategories

  return {
    transcript,
    duration,
    characterCount,
    categoryResults,
    categoriesPassed,
    durationPassed,
    lengthPassed,
    structurePassed,
    ready: durationPassed && lengthPassed && structurePassed,
  }
}

function SpeakingPage() {
  const initial = useMemo(() => getInitialSession(), [])

  const [stage, setStage] = useState(initial?.stage ?? 'repeat')
  const [completedStages, setCompletedStages] = useState(
    Array.isArray(initial?.completedStages) ? initial.completedStages : [],
  )

  const dailyRepeats = useMemo(
    () =>
      speakingLesson1.dailyRepeatIds
        .map((id) => speakingLesson1.repeatBank.find((item) => item.id === id))
        .filter(Boolean),
    [],
  )

  const [repeatIndex, setRepeatIndex] = useState(initial?.repeatIndex ?? 0)
  const [repeatResults, setRepeatResults] = useState(initial?.repeatResults ?? {})
  const [retellResult, setRetellResult] = useState(initial?.retellResult ?? null)
  const [pictureResult, setPictureResult] = useState(initial?.pictureResult ?? null)
  const [questionResult, setQuestionResult] = useState(initial?.questionResult ?? null)
  const [finished, setFinished] = useState(initial?.finished ?? false)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [recordingUrl, setRecordingUrl] = useState(null)
  const [micError, setMicError] = useState('')
  const [audioSaveState, setAudioSaveState] = useState('')
  const [audioRefreshKey, setAudioRefreshKey] = useState(0)

  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const recognitionRef = useRef(null)
  const chunksRef = useRef([])
  const transcriptRef = useRef('')
  const startedAtRef = useRef(null)
  const timerRef = useRef(null)

  const currentRepeat = dailyRepeats[repeatIndex]
  const recognitionSupported = Boolean(getRecognitionConstructor())
  const stageIndex = STAGES.indexOf(stage)

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: DATA_VERSION,
        stage,
        completedStages,
        repeatIndex,
        repeatResults,
        retellResult,
        pictureResult,
        questionResult,
        finished,
        savedAt: new Date().toISOString(),
      }),
    )
  }, [
    stage,
    completedStages,
    repeatIndex,
    repeatResults,
    retellResult,
    pictureResult,
    questionResult,
    finished,
  ])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)

      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl)
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [recordingUrl])

  function playSource(audioPath) {
    const audio = new Audio(mediaUrl(audioPath))
    audio.play()
  }

  function clearCaptureUi() {
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl)
    }

    setRecordingUrl(null)
    setLiveTranscript('')
    setRecordingSeconds(0)
    setMicError('')
    setAudioSaveState('')
  }

  function slotForContext(context) {
    if (context?.type === 'repeat' && context?.id) return `lesson1-speaking:repeat:${context.id}`
    return `lesson1-speaking:${context?.type || 'practice'}`
  }

  function feedbackSpecForContext(context) {
    if (context?.type === 'repeat') {
      const task = dailyRepeats.find((item) => item.id === context.id)
      return { kind: 'repeat', target: task?.target || '' }
    }
    const task = context?.type === 'retell'
      ? speakingLesson1.retellTask
      : context?.type === 'picture'
        ? speakingLesson1.pictureTask
        : speakingLesson1.questionTask
    return {
      kind: context?.type === 'picture' ? 'picture' : 'question',
      categories: task?.categories || [],
      minSeconds: task?.minimumSeconds || task?.minSeconds || 0,
      minCharacters: task?.minimumCharacters || task?.minCharacters || 0,
      minCategories: task?.minimumCategories || task?.minCategories || 0,
    }
  }

  async function persistAudio(blob, context, duration, transcript, feedback) {
    const slotId = slotForContext(context)
    setAudioSaveState('saving')
    const result = await saveHskkAudio(blob, {
      slotId,
      kind: context?.type || 'speaking',
      activityId: context?.id || `lesson1-${context?.type || 'speaking'}`,
      lessonId: 'lesson-1',
      day: 1,
      sourceContext: 'speaking-page',
      label: context?.type === 'repeat' ? '听后重复' : context?.type || '口语训练',
      transcript: transcript || '',
      transcriptSource: transcript ? 'browser-speech-recognition' : '',
      autoFeedback: feedback || null,
      durationSeconds: duration,
    })
    setAudioSaveState(result?.status || 'local-only')
    setAudioRefreshKey((value) => value + 1)
  }

  async function startRecording(context) {
    setMicError('')

    const Recognition = getRecognitionConstructor()

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('В этом браузере недоступна запись с микрофона.')
      return
    }

    if (!Recognition) {
      setMicError(
        'Для проверяемого режима нужен Chrome с распознаванием китайской речи.',
      )
      return
    }

    try {
      clearCaptureUi()
      setAudioSaveState('')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      transcriptRef.current = ''
      startedAtRef.current = Date.now()

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })

        setRecordingUrl(URL.createObjectURL(blob))

        const duration = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        )
        const feedback = analyzeHskkResponse({
          ...feedbackSpecForContext(context),
          transcript: transcriptRef.current,
          durationSeconds: duration,
        })
        if (blob.size) void persistAudio(blob, context, duration, transcriptRef.current, feedback)

        window.setTimeout(() => {
          finalizeCapture(context, transcriptRef.current, duration)
        }, 350)

        stream.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }

      const recognition = new Recognition()
      recognition.lang = 'zh-CN'
      recognition.continuous = true
      recognition.interimResults = true

      recognition.onresult = (event) => {
        let finalText = ''
        let interimText = ''

        for (let i = 0; i < event.results.length; i += 1) {
          const text = event.results[i][0].transcript

          if (event.results[i].isFinal) finalText += text
          else interimText += text
        }

        transcriptRef.current = `${finalText}${interimText}`.trim()
        setLiveTranscript(transcriptRef.current)
      }

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          setMicError(`Распознавание речи: ${event.error}`)
        }
      }

      recognitionRef.current = recognition

      setIsRecording(true)
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        )
      }, 250)

      recognition.start()
      recorder.start()
    } catch (error) {
      setMicError(
        error?.name === 'NotAllowedError'
          ? 'Нужно разрешить сайту доступ к микрофону.'
          : 'Не удалось запустить запись. Проверь доступ к микрофону.',
      )
    }
  }

  function stopRecording() {
    if (!isRecording) return

    setIsRecording(false)

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    try {
      recognitionRef.current?.stop()
    } catch {
      // Recognition may already be stopped.
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  function finalizeCapture(context, transcript, duration) {
    if (context.type === 'repeat') {
      const task = dailyRepeats.find((item) => item.id === context.id)
      if (!task) return

      const similarity = similarityPercent(task.target, transcript)
      const normalizedTranscript = normalizeChinese(transcript)

      const chunks = task.chunks.map((chunk) => ({
        text: chunk,
        covered: normalizedTranscript.includes(normalizeChinese(chunk)),
      }))

      const passed = similarity >= 76

      setRepeatResults((current) => ({
        ...current,
        [task.id]: {
          transcript,
          similarity,
          chunks,
          duration,
          passed,
        },
      }))

      const errorKey = `lesson-1:speaking:speaking_pause:repeat-${task.id}`

      if (passed) {
        resolveLearningError(errorKey)
      } else {
        recordLearningError({
          lessonId: 'lesson-1',
          module: 'speaking',
          type: 'speaking_pause',
          itemId: `repeat-${task.id}`,
          title: '听后重复',
          prompt: 'Повтори фразу после прослушивания.',
          answer: task.target,
          userAnswer: transcript,
          pinyin: task.pinyin,
          translation: task.translation,
          route: '/speaking',
          reviewMode: 'module',
        })
      }

      return
    }

    if (context.type === 'retell') {
      const evaluation = evaluateOpenSpeech(
        speakingLesson1.retellTask,
        transcript,
        duration,
      )

      setRetellResult(evaluation)

      const errorKey = 'lesson-1:speaking:speaking_pause:retell-sb5'

      if (evaluation.ready) {
        resolveLearningError(errorKey)
      } else {
        recordLearningError({
          lessonId: 'lesson-1',
          module: 'speaking',
          type: 'speaking_pause',
          itemId: 'retell-sb5',
          title: '听后复述',
          prompt: 'Передай главную мысль 课文5 своими словами.',
          userAnswer: transcript,
          image: speakingLesson1.pictureTask.image,
          imageAlt: 'HSKK 看图说话',
          route: '/speaking',
          reviewMode: 'module',
        })
      }

      return
    }

    if (context.type === 'picture') {
      const evaluation = evaluateOpenSpeech(
        speakingLesson1.pictureTask,
        transcript,
        duration,
      )

      setPictureResult(evaluation)

      const errorKey = 'lesson-1:speaking:picture_no_structure:h81002-picture-11'

      if (evaluation.ready) {
        resolveLearningError(errorKey)
      } else {
        recordLearningError({
          lessonId: 'lesson-1',
          module: 'speaking',
          type: 'picture_no_structure',
          itemId: 'h81002-picture-11',
          title: '看图说话',
          prompt: 'Опиши картинку по структуре 人物 → 动作 → 地点 → 推测.',
          userAnswer: transcript,
          route: '/speaking',
          reviewMode: 'module',
        })
      }

      return
    }

    if (context.type === 'question') {
      const evaluation = evaluateOpenSpeech(
        speakingLesson1.questionTask,
        transcript,
        duration,
      )

      setQuestionResult(evaluation)

      const errorKey = 'lesson-1:speaking:speaking_pause:lesson1-question'

      if (evaluation.ready) {
        resolveLearningError(errorKey)
      } else {
        recordLearningError({
          lessonId: 'lesson-1',
          module: 'speaking',
          type: 'speaking_pause',
          itemId: 'lesson1-question',
          title: '回答问题',
          prompt: speakingLesson1.questionTask.prompt,
          userAnswer: transcript,
          pinyin: speakingLesson1.questionTask.promptPinyin,
          translation: speakingLesson1.questionTask.promptTranslation,
          route: '/speaking',
          reviewMode: 'module',
        })
      }
    }
  }

  function markStageComplete(stageId, nextStage) {
    setCompletedStages((items) =>
      items.includes(stageId) ? items : [...items, stageId],
    )
    setStage(nextStage)
    clearCaptureUi()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function nextRepeat() {
    if (!repeatResults[currentRepeat.id]?.passed) return

    if (repeatIndex < dailyRepeats.length - 1) {
      setRepeatIndex((value) => value + 1)
      clearCaptureUi()
      return
    }

    markStageComplete('repeat', 'retell')
  }

  function finishTraining() {
    if (!questionResult?.ready) return

    const nextCompleted = completedStages.includes('question')
      ? completedStages
      : [...completedStages, 'question']

    const repeatValues = Object.values(repeatResults)
    const result = {
      version: DATA_VERSION,
      lessonId: 'lesson-1',
      completed: true,
      completedStages: 4,
      totalStages: 4,
      repeatPassed: repeatValues.filter((item) => item?.passed).length,
      repeatTotal: dailyRepeats.length,
      repeatAverage: Math.round(
        repeatValues.reduce((sum, item) => sum + (item?.similarity ?? 0), 0) /
          Math.max(1, repeatValues.length),
      ),
      retell: retellResult,
      picture: pictureResult,
      question: questionResult,
      languageEvaluation: false,
      completedAt: new Date().toISOString(),
    }

    localStorage.setItem(RESULT_KEY, JSON.stringify(result))
    setCompletedStages(nextCompleted)
    setFinished(true)
  }

  function restartTraining() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(RESULT_KEY)

    setStage('repeat')
    setCompletedStages([])
    setRepeatIndex(0)
    setRepeatResults({})
    setRetellResult(null)
    setPictureResult(null)
    setQuestionResult(null)
    setFinished(false)
    clearCaptureUi()
  }

  if (finished) {
    const result = readJson(RESULT_KEY)

    return (
      <main className="speaking-page">
        <div className="speaking-shell">
          <Link to="/" className="speaking-back">← На главную</Link>

          <section className="speaking-finish-card">
            <div className="speaking-finish-icon">✓</div>

            <p className="speaking-kicker">УРОК 1 · HSKK СРЕДНИЙ УРОВЕНЬ</p>
            <h1>口语训练完成</h1>

            <div className="speaking-result-grid">
              <article>
                <strong>
                  {result?.repeatPassed ?? 0} / {result?.repeatTotal ?? 5}
                </strong>
                <span>听后重复</span>
              </article>

              <article>
                <strong>{result?.repeatAverage ?? 0}%</strong>
                <span>совпадение repeat</span>
              </article>

              <article>
                <strong>{result?.retell?.categoriesPassed ?? 0} / 4</strong>
                <span>听后复述 · смысловые опоры</span>
              </article>

              <article>
                <strong>{result?.picture?.categoriesPassed ?? 0} / 4</strong>
                <span>看图说话 · структура</span>
              </article>

              <article>
                <strong>{result?.question?.categoriesPassed ?? 0} / 4</strong>
                <span>回答问题 · структура</span>
              </article>
            </div>

            <div className="speaking-language-note">
              <strong>Что здесь действительно проверено</strong>
              <p>
                В повторении после прослушивания распознанная фраза сравнивается
                с оригиналом. В свободной речи проверяются длительность, объём и смысловая структура.
                Грамматика, естественность и произношение не объявляются
                «правильными» без отдельного teacher/AI language-check.
              </p>
            </div>

            <div className="speaking-finish-actions">
              <button
                type="button"
                className="speaking-secondary"
                onClick={restartTraining}
              >
                Пройти заново
              </button>

              <Link to="/" className="speaking-primary-link">
                Вернуться на главную
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="speaking-page">
      <div className="speaking-shell">
        <div className="speaking-topbar">
          <Link to="/" className="speaking-back">← На главную</Link>
          <span>{stageIndex + 1} / 4</span>
        </div>

        <section className="speaking-header">
          <div>
            <p className="speaking-kicker">03 · HSKK СРЕДНИЙ УРОВЕНЬ · УРОК 1</p>
            <h1>口语训练</h1>
            <p>{stageSubtitle(stage)}</p>
          </div>

          <div className="speaking-progress-wrap">
            <div className="speaking-progress-track">
              <div
                className="speaking-progress-fill"
                style={{ width: `${(completedStages.length / 4) * 100}%` }}
              />
            </div>
            <span>{completedStages.length} / 4</span>
          </div>
        </section>

        {!recognitionSupported && (
          <div className="mic-error page-error">
            Для автоматической проверки китайской речи нужен Chrome с доступом
            к микрофону.
          </div>
        )}

        {stage === 'repeat' && currentRepeat && (
          <RepeatStage
            task={currentRepeat}
            index={repeatIndex}
            total={dailyRepeats.length}
            result={repeatResults[currentRepeat.id]}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            liveTranscript={liveTranscript}
            recordingUrl={recordingUrl}
            audioSlotId={`lesson1-speaking:repeat:${currentRepeat.id}`}
            audioSaveState={audioSaveState}
            audioRefreshKey={audioRefreshKey}
            micError={micError}
            onPlay={() => playSource(currentRepeat.audio)}
            onStart={() =>
              startRecording({ type: 'repeat', id: currentRepeat.id })
            }
            onStop={stopRecording}
            onNext={nextRepeat}
          />
        )}

        {stage === 'retell' && (
          <OpenSpeechStage
            number="02"
            badge="述"
            title="听后复述"
            subtitle="Учебник HSK Standard Course 4A · 课文5 → пересказ своими словами"
            task={speakingLesson1.retellTask}
            result={retellResult}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            liveTranscript={liveTranscript}
            recordingUrl={recordingUrl}
            audioSlotId="lesson1-speaking:retell"
            audioSaveState={audioSaveState}
            audioRefreshKey={audioRefreshKey}
            micError={micError}
            audio={speakingLesson1.retellTask.audio}
            onPlay={() => playSource(speakingLesson1.retellTask.audio)}
            onStart={() => startRecording({ type: 'retell' })}
            onStop={stopRecording}
            onContinue={() => markStageComplete('retell', 'picture')}
          />
        )}

        {stage === 'picture' && (
          <PictureStage
            task={speakingLesson1.pictureTask}
            result={pictureResult}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            liveTranscript={liveTranscript}
            recordingUrl={recordingUrl}
            audioSlotId="lesson1-speaking:picture"
            audioSaveState={audioSaveState}
            audioRefreshKey={audioRefreshKey}
            micError={micError}
            onStart={() => startRecording({ type: 'picture' })}
            onStop={stopRecording}
            onContinue={() => markStageComplete('picture', 'question')}
          />
        )}

        {stage === 'question' && (
          <QuestionStage
            task={speakingLesson1.questionTask}
            result={questionResult}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            liveTranscript={liveTranscript}
            recordingUrl={recordingUrl}
            audioSlotId="lesson1-speaking:question"
            audioSaveState={audioSaveState}
            audioRefreshKey={audioRefreshKey}
            micError={micError}
            onStart={() => startRecording({ type: 'question' })}
            onStop={stopRecording}
            onFinish={finishTraining}
          />
        )}
      </div>
    </main>
  )
}

function stageSubtitle(stage) {
  return {
    repeat: '听后重复 × 5 · настоящие HSKK / 口试 материалы.',
    retell: '听 → 复述: превращаем аудирование урока 1 в активную речь.',
    picture: '看图说话: описание с полной подсказкой по структуре; позже подсказок станет меньше.',
    question: '回答问题: тематический ответ по схеме 回答 → 细节 → 例子 → 结尾.',
  }[stage]
}

function RepeatStage({
  task,
  index,
  total,
  result,
  isRecording,
  recordingSeconds,
  liveTranscript,
  recordingUrl,
  audioSlotId,
  audioSaveState,
  audioRefreshKey,
  micError,
  onPlay,
  onStart,
  onStop,
  onNext,
}) {
  return (
    <section className="speaking-card">
      <TaskCounter current={index + 1} total={total} />

      <div className="speaking-stage-title">
        <span>01</span>
        <div>
          <h2>听后重复</h2>
          <p>{task.source}</p>
        </div>
      </div>

      <div className="speaking-instruction">
        <strong>Сначала только слушай.</strong>
        <span>
          Текст скрыт до записи — иначе это уже чтение, а не HSKK repeat.
        </span>
      </div>

      <button
        type="button"
        className="source-audio-button"
        disabled={isRecording}
        onClick={onPlay}
      >
        ▶ Прослушать фразу
      </button>

      <Recorder
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        liveTranscript={liveTranscript}
        recordingUrl={recordingUrl}
        slotId={audioSlotId}
        saveState={audioSaveState}
        refreshKey={audioRefreshKey}
        micError={micError}
        startLabel="● Записать повтор"
        onStart={onStart}
        onStop={onStop}
      />

      {result && (
        <div className="speech-analysis">
          <p className="analysis-label">Распознано:</p>
          <p className="recognized-text">
            {result.transcript || 'Речь не распознана'}
          </p>

          <div className="repeat-target">
            <ChineseText pinyin={task.pinyin} translation={task.translation}>
              {task.target}
            </ChineseText>
          </div>

          <div className="similarity-row">
            <strong>Совпадение: {result.similarity}%</strong>
            <span>
              {result.passed
                ? '✓ Содержание фразы воспроизведено достаточно близко'
                : 'Нужно повторить ещё раз'}
            </span>
          </div>

          <div className="chunk-row">
            {result.chunks.map((chunk) => (
              <span
                key={chunk.text}
                className={chunk.covered ? 'chunk-ok' : 'chunk-missed'}
              >
                {chunk.covered ? '✓' : '○'} {chunk.text}
              </span>
            ))}
          </div>

          {result.passed ? (
            <button
              type="button"
              className="speaking-main-button"
              onClick={onNext}
            >
              {index < total - 1 ? 'Следующая фраза →' : 'К 复述 →'}
            </button>
          ) : (
            <button
              type="button"
              className="speaking-secondary inline"
              onClick={onStart}
            >
              Перезаписать
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function OpenSpeechStage({
  number,
  title,
  subtitle,
  task,
  result,
  isRecording,
  recordingSeconds,
  liveTranscript,
  recordingUrl,
  audioSlotId,
  audioSaveState,
  audioRefreshKey,
  micError,
  onPlay,
  onStart,
  onStop,
  onContinue,
}) {
  return (
    <section className="speaking-card">
      <div className="speaking-stage-title">
        <span>{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="retell-layout">
        <div>
          <p className="speech-goal">
            Цель: {task.targetSeconds} секунд. Прослушай 课文5 и передай
            главную мысль своими словами.
          </p>

          <button
            type="button"
            className="source-audio-button"
            disabled={isRecording}
            onClick={onPlay}
          >
            ▶ Прослушать 课文5
          </button>
        </div>

        <div className="support-box">
          <span>Можно опереться на:</span>
          <div className="support-chips">
            {task.scaffold.map((item) => (
              <ChineseText
                key={item.hanzi}
                pinyin={item.pinyin}
                translation={item.translation}
                tooltipPosition="bottom"
              >
                {item.hanzi}
              </ChineseText>
            ))}
          </div>
        </div>
      </div>

      <Recorder
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        liveTranscript={liveTranscript}
        recordingUrl={recordingUrl}
        slotId={audioSlotId}
        saveState={audioSaveState}
        refreshKey={audioRefreshKey}
        micError={micError}
        startLabel="● Записать пересказ"
        onStart={onStart}
        onStop={onStop}
      />

      <OpenSpeechAnalysis
        task={task}
        result={result}
        recordingUrl={recordingUrl}
        onRetry={onStart}
        onContinue={onContinue}
        continueLabel="К 看图说话 →"
      />
    </section>
  )
}

function PictureStage({
  task,
  result,
  isRecording,
  recordingSeconds,
  liveTranscript,
  recordingUrl,
  audioSlotId,
  audioSaveState,
  audioRefreshKey,
  micError,
  onStart,
  onStop,
  onContinue,
}) {
  return (
    <section className="speaking-card">
      <div className="speaking-stage-title">
        <span>03</span>
        <div>
          <h2>看图说话</h2>
          <p>{task.source} · {task.supportLevel}</p>
        </div>
      </div>

      <div className="picture-layout">
        <div className="picture-frame">
          <img src={mediaUrl(task.image)} alt="HSKK H81002 task 11" />
        </div>

        <div className="picture-guide">
          <p className="speech-goal">Цель: {task.targetSeconds} секунд</p>
          <h3>Структура ответа · урок 1</h3>

          <div className="support-chips vertical">
            {task.frames.map((item) => (
              <ChineseText
                key={item.hanzi}
                pinyin={item.pinyin}
                translation={item.translation}
                tooltipPosition="bottom"
              >
                {item.hanzi}
              </ChineseText>
            ))}
          </div>

          <p>
            В следующих уроках подсказок станет меньше: сначала полная опора,
            затем только ключевые слова, а потом экзаменационный режим без подсказок.
            Сейчас задача — привыкнуть к структуре ответа.
          </p>
        </div>
      </div>

      <Recorder
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        liveTranscript={liveTranscript}
        recordingUrl={recordingUrl}
        slotId={audioSlotId}
        saveState={audioSaveState}
        refreshKey={audioRefreshKey}
        micError={micError}
        startLabel="● Начать описание"
        onStart={onStart}
        onStop={onStop}
      />

      <OpenSpeechAnalysis
        task={task}
        result={result}
        recordingUrl={recordingUrl}
        onRetry={onStart}
        onContinue={onContinue}
        continueLabel="К 回答问题 →"
      />
    </section>
  )
}

function QuestionStage({
  task,
  result,
  isRecording,
  recordingSeconds,
  liveTranscript,
  recordingUrl,
  audioSlotId,
  audioSaveState,
  audioRefreshKey,
  micError,
  onStart,
  onStop,
  onFinish,
}) {
  return (
    <section className="speaking-card">
      <div className="speaking-stage-title">
        <span>04</span>
        <div>
          <h2>回答问题</h2>
          <p>HSKK · вопрос по теме урока 1</p>
        </div>
      </div>

      <div className="question-prompt">
        <ChineseText
          pinyin={task.promptPinyin}
          translation={task.promptTranslation}
        >
          {task.prompt}
        </ChineseText>
      </div>

      <div className="question-support">
        <span>回答 → 细节 → 例子 → 结尾</span>

        <div className="support-chips">
          {task.frames.map((item) => (
            <ChineseText
              key={item.hanzi}
              pinyin={item.pinyin}
              translation={item.translation}
              tooltipPosition="bottom"
            >
              {item.hanzi}
            </ChineseText>
          ))}
        </div>
      </div>

      <Recorder
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        liveTranscript={liveTranscript}
        recordingUrl={recordingUrl}
        slotId={audioSlotId}
        saveState={audioSaveState}
        refreshKey={audioRefreshKey}
        micError={micError}
        startLabel="● Записать ответ"
        onStart={onStart}
        onStop={onStop}
      />

      <OpenSpeechAnalysis
        task={task}
        result={result}
        recordingUrl={recordingUrl}
        onRetry={onStart}
        onContinue={onFinish}
        continueLabel="Завершить HSKK по уроку 1"
      />

      {result && (
        <div className="reference-expression">
          <div className="reference-head">
            <div>
              <strong>参考表达 · после своей попытки</strong>
              <span>{task.referenceSource}</span>
            </div>
          </div>

          {task.referenceExpression.map((line, index) => (
            <ChineseText
              key={`${line.hanzi}-${index}`}
              as="p"
              pinyin={line.pinyin}
              translation={line.translation}
            >
              {line.hanzi}
            </ChineseText>
          ))}
        </div>
      )}
    </section>
  )
}

function Recorder({
  isRecording,
  recordingSeconds,
  liveTranscript,
  recordingUrl,
  slotId,
  saveState,
  refreshKey,
  micError,
  startLabel,
  onStart,
  onStop,
}) {
  return (
    <div className="recorder-card">
      {!isRecording ? (
        <button type="button" className="record-button" onClick={onStart}>
          {startLabel}
        </button>
      ) : (
        <button
          type="button"
          className="record-button recording"
          onClick={onStop}
        >
          ■ Остановить · {recordingSeconds} сек
        </button>
      )}

      {isRecording && liveTranscript && (
        <p className="live-transcript">{liveTranscript}</p>
      )}

      {micError && <p className="mic-error">{micError}</p>}

      {!isRecording && (
        <HskkCloudRecording
          slotId={slotId}
          localUrl={recordingUrl || ''}
          saveState={saveState}
          refreshKey={refreshKey}
        />
      )}
    </div>
  )
}

function OpenSpeechAnalysis({
  task,
  result,
  onRetry,
  onContinue,
  continueLabel,
}) {
  if (!result) return null

  return (
    <div className="speech-analysis">
      <p className="analysis-label">Распознанный ответ:</p>
      <p className="recognized-text">
        {result.transcript || 'Речь не распознана'}
      </p>

      <div className="open-check-grid">
        <article className={result.durationPassed ? 'passed' : ''}>
          <strong>{result.duration} сек</strong>
          <span>минимум {task.minimumSeconds}</span>
        </article>

        <article className={result.lengthPassed ? 'passed' : ''}>
          <strong>{result.characterCount}</strong>
          <span>распознано иероглифов</span>
        </article>

        <article className={result.structurePassed ? 'passed' : ''}>
          <strong>{result.categoriesPassed} / {task.categories.length}</strong>
          <span>смысловых частей</span>
        </article>
      </div>

      <div className="category-checks">
        {result.categoryResults.map((item) => (
          <span
            key={item.id}
            className={item.passed ? 'category-ok' : 'category-missed'}
          >
            {item.passed ? '✓' : '○'} {item.label}
          </span>
        ))}
      </div>

      {result.ready ? (
        <div className="structure-ready">
          <strong>✓ Структура достаточна для этого этапа</strong>
          <p>
            Это не оценка грамматики или произношения. Сейчас подтверждены
            только наличие речи, объём и смысловые элементы.
          </p>

          <button
            type="button"
            className="speaking-main-button"
            onClick={onContinue}
          >
            {continueLabel}
          </button>
        </div>
      ) : (
        <div className="structure-ready needs-work">
          <strong>Ответ пока слишком короткий или неполный</strong>
          <p>Добавь недостающие смысловые части и перезапиши ответ.</p>

          <button
            type="button"
            className="speaking-secondary inline"
            onClick={onRetry}
          >
            Перезаписать
          </button>
        </div>
      )}
    </div>
  )
}

function TaskCounter({ current, total }) {
  return <div className="speaking-task-counter">{current} / {total}</div>
}

export default SpeakingPage
