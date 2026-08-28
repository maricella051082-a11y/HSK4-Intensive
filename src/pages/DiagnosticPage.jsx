import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import diagnosticData from '../data/diagnosticData.js'
import {
  clearDiagnostic,
  getDiagnosticResult,
  getDiagnosticSession,
  saveDiagnosticResult,
  saveDiagnosticSession,
} from '../utils/diagnosticStore.js'
import {
  recordLearningError,
  recordVocabularyExposure,
} from '../utils/learningStore.js'
import { setPlannerDay, setStudyMode } from '../utils/coursePlanner.js'
import { saveHskkAudio } from '../firebase/hskkAudioStore.js'
import { analyzeHskkResponse } from '../utils/hskkAutoFeedback.js'
import { shuffleOptions } from '../utils/shuffleOptions.js'
import { mediaUrl } from '../utils/mediaUrl.js'
import './DiagnosticPage.css'

const STAGES = [
  'intro',
  'vocabulary',
  'grammar',
  'listening',
  'reading',
  'writing',
  'speaking',
  'result',
]

function normalize(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\s，。！？、,.!?；;：“”‘’（）()]/g, '')
    .trim()
}

function chineseCount(value) {
  return [...normalize(value)].filter((char) => /[\u3400-\u9fff]/.test(char)).length
}

function scoreItems(items, answers) {
  const correct = items.filter(
    (item) => normalize(answers[item.id]) === normalize(item.answer),
  ).length

  return {
    correct,
    total: items.length,
    percent: Math.round((correct / Math.max(1, items.length)) * 100),
  }
}

function flattenListening() {
  return diagnosticData.listeningBlocks.flatMap((block) => block.items)
}

function getRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function levenshteinDistance(a, b) {
  const left = [...a]
  const right = [...b]
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
  const a = normalize(target)
  const b = normalize(transcript)
  if (!a || !b) return 0

  const longest = Math.max([...a].length, [...b].length)

  return Math.max(
    0,
    Math.round((1 - levenshteinDistance(a, b) / longest) * 100),
  )
}

function evaluateOpenSpeech(task, transcript, duration) {
  const text = normalize(transcript)

  const categoryResults = task.categories.map((category) => ({
    ...category,
    passed: category.keywords.some((keyword) =>
      text.includes(normalize(keyword)),
    ),
  }))

  const categoriesPassed = categoryResults.filter((item) => item.passed).length
  const durationPassed = duration >= task.minSeconds
  const lengthPassed = chineseCount(transcript) >= task.minCharacters

  const structurePercent = Math.round(
    Number(durationPassed) * 25 +
      Number(lengthPassed) * 25 +
      (categoriesPassed / task.categories.length) * 50,
  )

  return {
    transcript,
    duration,
    characters: chineseCount(transcript),
    durationPassed,
    lengthPassed,
    categoriesPassed,
    categoryResults,
    structurePercent,
  }
}

function DiagnosticPage() {
  const navigate = useNavigate()
  const existingResult = useMemo(() => getDiagnosticResult(), [])
  const saved = useMemo(() => getDiagnosticSession(), [])

  const [stage, setStage] = useState(
    existingResult ? 'result' : saved?.stage || 'intro',
  )
  const [answers, setAnswers] = useState(saved?.answers || {})
  const [playedBlocks, setPlayedBlocks] = useState(saved?.playedBlocks || {})
  const [orderAnswers, setOrderAnswers] = useState(saved?.orderAnswers || {})
  const [pictureWriting, setPictureWriting] = useState(saved?.pictureWriting || {})
  const [speakingResults, setSpeakingResults] = useState(saved?.speakingResults || {})
  const [speakingSkipped, setSpeakingSkipped] = useState(saved?.speakingSkipped || false)
  const [result, setResult] = useState(existingResult)

  const [recordingContext, setRecordingContext] = useState(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [micError, setMicError] = useState('')
  const [audioError, setAudioError] = useState('')

  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const recognitionRef = useRef(null)
  const chunksRef = useRef([])
  const transcriptRef = useRef('')
  const startedAtRef = useRef(null)
  const timerRef = useRef(null)
  const audioRefs = useRef({})

  const stageIndex = STAGES.indexOf(stage)
  const recognitionSupported = Boolean(getRecognitionConstructor())

  useEffect(() => {
    if (stage === 'result') return

    saveDiagnosticSession({
      stage,
      answers,
      playedBlocks,
      orderAnswers,
      pictureWriting,
      speakingResults,
      speakingSkipped,
    })
  }, [
    stage,
    answers,
    playedBlocks,
    orderAnswers,
    pictureWriting,
    speakingResults,
    speakingSkipped,
  ])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  function go(nextStage) {
    setStage(nextStage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function choose(id, value) {
    setAnswers((current) => ({ ...current, [id]: value }))
  }

  async function playBlock(block) {
    if (playedBlocks[block.id]) return

    const audio = audioRefs.current[block.id]
    if (!audio) return

    setAudioError('')
    audio.currentTime = 0
    try {
      await audio.play()
      setPlayedBlocks((current) => ({ ...current, [block.id]: true }))
    } catch {
      setAudioError('Не удалось запустить аудио. Обновите страницу и попробуйте ещё раз.')
    }
  }

  async function startRecording(context) {
    setMicError('')

    const Recognition = getRecognitionConstructor()

    if (!navigator.mediaDevices?.getUserMedia || !Recognition) {
      setMicError(
        'Для устной диагностики открой сайт в Chrome и разреши доступ к микрофону.',
      )
      return
    }

    if (speakingResults[context.id]) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      transcriptRef.current = ''

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data)
      }
      startedAtRef.current = Date.now()

      recorder.onstop = () => {
        const duration = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        )
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        if (blob.size) {
          const task = context.type === 'repeat'
            ? diagnosticData.speaking.repeat.find((item) => item.id === context.id)
            : context.type === 'picture'
              ? diagnosticData.speaking.picture
              : diagnosticData.speaking.question
          const feedback = analyzeHskkResponse({
            kind: context.type,
            transcript: transcriptRef.current,
            durationSeconds: duration,
            target: task?.target || '',
            categories: task?.categories || [],
            minSeconds: task?.minSeconds || 0,
            minCharacters: task?.minCharacters || 0,
          })
          void saveHskkAudio(blob, {
            slotId: `diagnostic:${context.id}`,
            kind: context.type || 'diagnostic-speaking',
            activityId: context.id,
            lessonId: 'diagnostic',
            sourceContext: 'diagnostic',
            label: context.type || 'HSKK diagnostic',
            transcript: transcriptRef.current,
            transcriptSource: transcriptRef.current ? 'browser-speech-recognition' : '',
            autoFeedback: feedback,
            durationSeconds: duration,
            examMode: true,
          })
        }

        window.setTimeout(() => {
          finalizeSpeech(context, transcriptRef.current, duration)
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
          setMicError(`Не удалось распознать речь: ${event.error}`)
        }
      }

      recognitionRef.current = recognition
      setRecordingContext(context)
      setRecordingSeconds(0)
      setLiveTranscript('')

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        )
      }, 250)

      recognition.start()
      recorder.start(500)
    } catch (error) {
      setMicError(
        error?.name === 'NotAllowedError'
          ? 'Нужно разрешить сайту доступ к микрофону.'
          : 'Не удалось запустить запись с микрофона.',
      )
    }
  }

  function stopRecording() {
    if (!recordingContext) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    try {
      recognitionRef.current?.stop()
    } catch {
      // Browser may already have stopped speech recognition.
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    setRecordingContext(null)
  }

  function finalizeSpeech(context, transcript, duration) {
    if (context.type === 'repeat') {
      const task = diagnosticData.speaking.repeat.find(
        (item) => item.id === context.id,
      )

      if (!task) return

      setSpeakingResults((current) => ({
        ...current,
        [context.id]: {
          transcript,
          duration,
          similarity: similarityPercent(task.target, transcript),
        },
      }))
      return
    }

    if (context.type === 'picture') {
      setSpeakingResults((current) => ({
        ...current,
        [context.id]: evaluateOpenSpeech(
          diagnosticData.speaking.picture,
          transcript,
          duration,
        ),
      }))
      return
    }

    if (context.type === 'question') {
      setSpeakingResults((current) => ({
        ...current,
        [context.id]: evaluateOpenSpeech(
          diagnosticData.speaking.question,
          transcript,
          duration,
        ),
      }))
    }
  }

  function seedErrorsAndReviews() {
    diagnosticData.vocabulary.forEach((item) => {
      const correct = normalize(answers[item.id]) === normalize(item.answer)

      if (!correct) {
        recordVocabularyExposure(item.word, false, { lessonId: 'diagnostic' })

        recordLearningError({
          key: `diagnostic:vocabulary:${item.id}`,
          lessonId: 'diagnostic',
          module: 'vocabulary',
          type: 'word_unknown',
          itemId: item.id,
          title: item.word.hanzi,
          prompt: item.prompt,
          mode: 'choice',
          options: item.options,
          answer: item.answer,
          userAnswer: answers[item.id] || '',
          pinyin: item.word.pinyin,
          translation: item.word.translation,
          route: '/diagnostic',
        })
      }
    })

    diagnosticData.grammar.forEach((item) => {
      if (normalize(answers[item.id]) !== normalize(item.answer)) {
        recordLearningError({
          key: `diagnostic:grammar:${item.id}`,
          lessonId: 'diagnostic',
          module: 'grammar',
          type: 'grammar',
          itemId: item.id,
          title: item.topic,
          prompt: item.prompt,
          mode: 'choice',
          options: item.options,
          answer: item.answer,
          userAnswer: answers[item.id] || '',
          explanation: `Повтори конструкцию ${item.topic}.`,
          route: '/diagnostic',
        })
      }
    })

    flattenListening().forEach((item) => {
      if (normalize(answers[item.id]) !== normalize(item.answer)) {
        recordLearningError({
          key: `diagnostic:listening:${item.id}`,
          lessonId: 'diagnostic',
          module: 'listening',
          type: 'listening_memory',
          itemId: item.id,
          title: `HSK 听力 · ${item.number}`,
          prompt: item.prompt,
          mode: 'choice',
          options: item.options,
          answer: item.answer,
          userAnswer: answers[item.id] || '',
          audioPath: item.audio,
          explanation: `Тип задания: ${item.category}.`,
          route: '/diagnostic',
        })
      }
    })

    diagnosticData.reading.forEach((item) => {
      if (normalize(answers[item.id]) !== normalize(item.answer)) {
        recordLearningError({
          key: `diagnostic:reading:${item.id}`,
          lessonId: 'diagnostic',
          module: 'reading',
          type: 'reading_inference',
          itemId: item.id,
          title: `HSK 阅读 · ${item.number}`,
          passage: item.passage,
          prompt: item.prompt,
          mode: 'choice',
          options: item.options,
          answer: item.answer,
          userAnswer: answers[item.id] || '',
          explanation: `Навык: ${item.category}.`,
          route: '/diagnostic',
        })
      }
    })

    diagnosticData.writingOrder.forEach((item) => {
      if (normalize(orderAnswers[item.id]) !== normalize(item.answer)) {
        recordLearningError({
          key: `diagnostic:writing:${item.id}`,
          lessonId: 'diagnostic',
          module: 'writing',
          type: 'word_order',
          itemId: item.id,
          title: `HSK 写作 · ${item.number}`,
          prompt: item.tokens.join(' / '),
          mode: 'input',
          answer: item.answer,
          userAnswer: orderAnswers[item.id] || '',
          route: '/diagnostic',
        })
      }
    })
  }

  function finishDiagnostic() {
    const vocabulary = scoreItems(diagnosticData.vocabulary, answers)
    const grammar = scoreItems(diagnosticData.grammar, answers)
    const listening = scoreItems(flattenListening(), answers)
    const reading = scoreItems(diagnosticData.reading, answers)
    const writing = scoreItems(diagnosticData.writingOrder, orderAnswers)

    const repeatScores = diagnosticData.speaking.repeat
      .map((item) => speakingResults[item.id]?.similarity)
      .filter((value) => Number.isFinite(value))

    const repeat =
      repeatScores.length === diagnosticData.speaking.repeat.length
        ? Math.round(
            repeatScores.reduce((sum, value) => sum + value, 0) /
              repeatScores.length,
          )
        : null

    const picture = speakingResults.speakingPicture?.structurePercent ?? null
    const question = speakingResults.speakingQuestion?.structurePercent ?? null

    const hskProfile = Math.round(
      (
        vocabulary.percent +
        grammar.percent +
        listening.percent +
        reading.percent +
        writing.percent
      ) / 5,
    )

    const hskkValues = [repeat, picture, question].filter(
      (value) => Number.isFinite(value),
    )

    const hskkProfile =
      hskkValues.length === 3
        ? Math.round(
            hskkValues.reduce((sum, value) => sum + value, 0) /
              hskkValues.length,
          )
        : null

    const profile = {
      version: 1,
      completed: true,
      hskProfile,
      hskkProfile,
      skills: {
        vocabulary: vocabulary.percent,
        grammar: grammar.percent,
        listening: listening.percent,
        reading: reading.percent,
        writing: writing.percent,
        repeat,
        picture,
        question,
      },
      raw: {
        vocabulary,
        grammar,
        listening,
        reading,
        writing,
      },
      pictureWritingSamples: diagnosticData.writingPictures.map((item) => ({
        id: item.id,
        number: item.number,
        keyword: item.keyword,
        text: pictureWriting[item.id] || '',
        keywordUsed: normalize(pictureWriting[item.id]).includes(item.keyword),
        characters: chineseCount(pictureWriting[item.id] || ''),
      })),
      speakingSkipped,
      speakingResults,
    }

    seedErrorsAndReviews()
    saveDiagnosticResult(profile)
    setStudyMode('standard')
    setPlannerDay('lesson-1', 1)
    setResult(profile)
    go('result')
  }

  const totalStage = 6
  const visibleStep =
    stage === 'intro'
      ? 0
      : stage === 'result'
        ? totalStage
        : Math.max(1, stageIndex)

  return (
    <main className="diagnostic-page">
      <div className="diagnostic-shell">
        <div className="diagnostic-topbar">
          <Link to="/" className="diagnostic-back">← На главную</Link>
          <span>{visibleStep} / {totalStage}</span>
        </div>

        <div className="diagnostic-progress">
          <span
            style={{
              width: `${(visibleStep / totalStage) * 100}%`,
            }}
          />
        </div>

        {stage === 'intro' && (
          <IntroStage onStart={() => go('vocabulary')} />
        )}

        {stage === 'vocabulary' && (
          <ObjectiveSection
            kicker="01 · 词汇"
            title="Лексика"
            intro="30 коротких заданий: значение, обратное вспоминание, пиньинь и слово в контексте. Подсказок нет."
            items={diagnosticData.vocabulary}
            answers={answers}
            choose={choose}
            onContinue={() => go('grammar')}
          />
        )}

        {stage === 'grammar' && (
          <ObjectiveSection
            kicker="02 · 语法"
            title="Грамматика"
            intro="15 конструкций уровня HSK 4. Выбери вариант, который делает предложение грамматически правильным."
            items={diagnosticData.grammar}
            answers={answers}
            choose={choose}
            onContinue={() => go('listening')}
          />
        )}

        {stage === 'listening' && (
          <ListeningStage
            answers={answers}
            choose={choose}
            playedBlocks={playedBlocks}
            playBlock={playBlock}
            audioRefs={audioRefs}
            onContinue={() => go('reading')}
          />
        )}

        {stage === 'reading' && (
          <ReadingStage
            answers={answers}
            choose={choose}
            onContinue={() => go('writing')}
          />
        )}

        {stage === 'writing' && (
          <WritingStage
            orderAnswers={orderAnswers}
            setOrderAnswers={setOrderAnswers}
            pictureWriting={pictureWriting}
            setPictureWriting={setPictureWriting}
            onContinue={() => go('speaking')}
          />
        )}

        {stage === 'speaking' && (
          <SpeakingStage
            results={speakingResults}
            skipped={speakingSkipped}
            setSkipped={setSpeakingSkipped}
            recognitionSupported={recognitionSupported}
            recordingContext={recordingContext}
            recordingSeconds={recordingSeconds}
            liveTranscript={liveTranscript}
            micError={micError}
            startRecording={startRecording}
            stopRecording={stopRecording}
            onFinish={finishDiagnostic}
          />
        )}

        {stage === 'result' && result && (
          <ResultStage
            result={result}
            onStartCourse={() => navigate('/today')}
            onRestart={() => {
              clearDiagnostic()
              window.location.reload()
            }}
          />
        )}
      </div>
    </main>
  )
}

function IntroStage({ onStart }) {
  return (
    <section className="diagnostic-card diagnostic-intro">
      <p className="diagnostic-kicker"><ChineseText pinyin="dì yī zhōu · qǐdiǎn zhěnduàn" translation="Неделя 1 · Стартовая диагностика" tooltipPosition="bottom">第1周 · 起点诊断</ChineseText></p>
      <h1>Сначала выясним, что уже хорошо, а что нужно вернуть</h1>

      <p className="diagnostic-lead">
        Это не экзамен и не урок. Диагностика нужна, чтобы не тратить следующие
        недели на то, что уже знаешь, и сразу усилить слабые места.
      </p>

      <div className="diagnostic-overview">
        <article><strong><ChineseText pinyin="cíhuì" translation="лексика" tooltipPosition="bottom">词汇</ChineseText></strong><span>30 слов</span></article>
        <article><strong><ChineseText pinyin="yǔfǎ" translation="грамматика" tooltipPosition="bottom">语法</ChineseText></strong><span>15 заданий</span></article>
        <article><strong><ChineseText pinyin="tīnglì" translation="аудирование" tooltipPosition="bottom">听力</ChineseText></strong><span>15 настоящих HSK-заданий</span></article>
        <article><strong><ChineseText pinyin="yuèdú" translation="чтение" tooltipPosition="bottom">阅读</ChineseText></strong><span>10 настоящих HSK-заданий</span></article>
        <article><strong><ChineseText pinyin="xiězuò" translation="письмо" tooltipPosition="bottom">写作</ChineseText></strong><span>5 + 2 задания</span></article>
        <article><strong>HSKK</strong><span>3 повтора + картинка + вопрос</span></article>
      </div>

      <div className="diagnostic-rules">
        <strong>≈ {diagnosticData.estimatedMinutes} минут</strong>
        <span>Не пользуйся словарём, переводчиком и учебником.</span>
        <span>В аудировании каждая запись запускается один раз.</span>
        <span>Ошибки после диагностики автоматически попадут в повторение.</span>
      </div>

      <button type="button" className="diagnostic-main-button" onClick={onStart}>
        Начать диагностику
      </button>
    </section>
  )
}

function ObjectiveSection({
  kicker,
  title,
  intro,
  items,
  answers,
  choose,
  onContinue,
}) {
  const complete = items.every((item) => answers[item.id])

  return (
    <section className="diagnostic-card">
      <p className="diagnostic-kicker">{kicker}</p>
      <h1>{title}</h1>
      <p className="diagnostic-lead">{intro}</p>

      <div className="diagnostic-question-stack">
        {items.map((item, index) => (
          <article key={item.id} className="diagnostic-question">
            <div className="diagnostic-number">{index + 1}</div>

            <div className="diagnostic-prompt">
              {item.type === 'reverse' ? (
                <span className="diagnostic-russian-prompt">{item.prompt}</span>
              ) : item.type === 'context' || item.id.startsWith('g') ? (
                <span className="diagnostic-context-prompt">{item.prompt}</span>
              ) : (
                <span className="diagnostic-chinese-prompt">{item.prompt}</span>
              )}
            </div>

            <div className="diagnostic-options">
              {shuffleOptions(item.options, item.id).map((option) => (
                <button
                  type="button"
                  key={option}
                  className={answers[item.id] === option ? 'selected' : ''}
                  onClick={() => choose(item.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <SectionContinue
        ready={complete}
        onContinue={onContinue}
        text={complete ? 'Продолжить →' : 'Ответь на все задания'}
      />
    </section>
  )
}

function ListeningStage({
  answers,
  choose,
  playedBlocks,
  playBlock,
  audioRefs,
  onContinue,
}) {
  const allItems = flattenListening()

  const complete =
    diagnosticData.listeningBlocks.every((block) => playedBlocks[block.id]) &&
    allItems.every((item) => answers[item.id])

  return (
    <section className="diagnostic-card">
      <p className="diagnostic-kicker">03 · <ChineseText pinyin="tīnglì" translation="аудирование" tooltipPosition="bottom">听力</ChineseText></p>
      <h1>Аудирование</h1>

      <p className="diagnostic-lead">
        Три коротких блока из настоящего варианта H41005. Каждый блок можно
        запустить только один раз.
      </p>

      <div className="diagnostic-listening-stack">
        {diagnosticData.listeningBlocks.map((block) => (
          <article key={block.id} className="diagnostic-listening-block">
            <audio
              ref={(element) => {
                audioRefs.current[block.id] = element
              }}
              src={mediaUrl(block.audio)}
              preload="auto"
            />

            <div className="diagnostic-listening-head">
              <div>
                <strong>{block.title}</strong>
                <span>{block.instruction}</span>
              </div>

              <button
                type="button"
                disabled={playedBlocks[block.id]}
                onClick={() => playBlock(block)}
              >
                {playedBlocks[block.id]
                  ? 'Прослушивание запущено'
                  : '▶ Прослушать один раз'}
              </button>
            </div>

            <div className="diagnostic-question-stack compact">
              {block.items.map((item) => (
                <article key={item.id} className="diagnostic-question">
                  <div className="diagnostic-number">{item.number}</div>

                  <div className="diagnostic-prompt diagnostic-context-prompt">
                    {item.prompt}
                  </div>

                  <div className="diagnostic-options">
                    {shuffleOptions(item.options, item.id).map((option) => (
                      <button
                        type="button"
                        key={option}
                        className={answers[item.id] === option ? 'selected' : ''}
                        onClick={() => choose(item.id, option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>

      {audioError && <p className="diagnostic-error">{audioError}</p>}

      <SectionContinue
        ready={complete}
        onContinue={onContinue}
        text={
          complete
            ? 'Продолжить →'
            : 'Прослушай все 3 блока и ответь на 15 вопросов'
        }
      />
    </section>
  )
}

function ReadingStage({ answers, choose, onContinue }) {
  const complete = diagnosticData.reading.every((item) => answers[item.id])

  return (
    <section className="diagnostic-card">
      <p className="diagnostic-kicker">04 · <ChineseText pinyin="yuèdú" translation="чтение" tooltipPosition="bottom">阅读</ChineseText></p>
      <h1>Чтение</h1>

      <p className="diagnostic-lead">
        10 заданий H41005. В диагностике нет перевода, пиньиня и подсказок.
      </p>

      <div className="diagnostic-question-stack">
        {diagnosticData.reading.map((item) => (
          <article key={item.id} className="diagnostic-question reading">
            <div className="diagnostic-number">{item.number}</div>
            <p className="diagnostic-passage">{item.passage}</p>
            <strong className="diagnostic-reading-question">{item.prompt}</strong>

            <div className="diagnostic-options">
              {shuffleOptions(item.options, item.id).map((option) => (
                <button
                  type="button"
                  key={option}
                  className={answers[item.id] === option ? 'selected' : ''}
                  onClick={() => choose(item.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <SectionContinue
        ready={complete}
        onContinue={onContinue}
        text={complete ? 'Продолжить →' : 'Ответь на все 10 вопросов'}
      />
    </section>
  )
}

function WritingStage({
  orderAnswers,
  setOrderAnswers,
  pictureWriting,
  setPictureWriting,
  onContinue,
}) {
  const orderComplete = diagnosticData.writingOrder.every(
    (item) => normalize(orderAnswers[item.id]),
  )

  const pictureComplete = diagnosticData.writingPictures.every(
    (item) => normalize(pictureWriting[item.id]),
  )

  const complete = orderComplete && pictureComplete

  return (
    <section className="diagnostic-card">
      <p className="diagnostic-kicker">05 · <ChineseText pinyin="xiězuò" translation="письмо" tooltipPosition="bottom">写作</ChineseText></p>
      <h1>Письмо</h1>

      <p className="diagnostic-lead">
        Сначала собери 5 предложений из H41005. Затем напиши 2 предложения по
        настоящим экзаменационным картинкам.
      </p>

      <h2 className="diagnostic-subtitle">第一部分 · Собери предложение</h2>

      <div className="diagnostic-question-stack">
        {diagnosticData.writingOrder.map((item) => (
          <SentenceOrderDiagnostic
            key={item.id}
            item={item}
            value={orderAnswers[item.id] || ''}
            onChange={(value) =>
              setOrderAnswers((current) => ({
                ...current,
                [item.id]: value,
              }))
            }
          />
        ))}
      </div>

      <h2 className="diagnostic-subtitle">第二部分 · 看图写句子</h2>

      <p className="diagnostic-note">
        Здесь сайт сохраняет твою фразу, но не будет притворяться, что полностью
        проверил грамматику автоматически. Для стартового процента письма
        используются пять объективных заданий выше.
      </p>

      <div className="diagnostic-picture-writing">
        {diagnosticData.writingPictures.map((item) => (
          <article key={item.id}>
            <div className="diagnostic-picture-number">{item.number}</div>
            <img src={mediaUrl(item.image)} alt={`HSK writing ${item.number}`} />
            <strong>{item.keyword}</strong>

            <textarea
              value={pictureWriting[item.id] || ''}
              placeholder={`Напиши одно предложение с «${item.keyword}»`}
              onChange={(event) =>
                setPictureWriting((current) => ({
                  ...current,
                  [item.id]: event.target.value,
                }))
              }
            />
          </article>
        ))}
      </div>

      <SectionContinue
        ready={complete}
        onContinue={onContinue}
        text={complete ? 'Продолжить →' : 'Выполни все 7 заданий'}
      />
    </section>
  )
}

function SentenceOrderDiagnostic({ item, value, onChange }) {
  const [chosen, setChosen] = useState([])

  const remaining = item.tokens
    .map((token, index) => ({ token, key: `${token}-${index}` }))
    .filter(
      (entry) =>
        !chosen.some((selected) => selected.key === entry.key),
    )

  function sync(next) {
    setChosen(next)
    onChange(next.map((entry) => entry.token).join(''))
  }

  return (
    <article className="diagnostic-question writing-order">
      <div className="diagnostic-number">{item.number}</div>

      <div className="diagnostic-order-answer">
        {chosen.length ? (
          chosen.map((entry) => (
            <button
              type="button"
              key={entry.key}
              onClick={() =>
                sync(
                  chosen.filter(
                    (itemChosen) => itemChosen.key !== entry.key,
                  ),
                )
              }
            >
              {entry.token}
            </button>
          ))
        ) : (
          <span>
            {value
              ? 'Ответ уже сохранён. Можно оставить его или собрать заново.'
              : 'Нажимай части в правильном порядке'}
          </span>
        )}
      </div>

      <div className="diagnostic-order-tokens">
        {remaining.map((entry) => (
          <button
            type="button"
            key={entry.key}
            onClick={() => sync([...chosen, entry])}
          >
            {entry.token}
          </button>
        ))}
      </div>

      {chosen.length > 0 && (
        <button
          type="button"
          className="diagnostic-clear-order"
          onClick={() => sync([])}
        >
          Очистить
        </button>
      )}
    </article>
  )
}

function SpeakingStage({
  results,
  skipped,
  setSkipped,
  recognitionSupported,
  recordingContext,
  recordingSeconds,
  liveTranscript,
  micError,
  startRecording,
  stopRecording,
  onFinish,
}) {
  const [played, setPlayed] = useState({})

  const repeatReady = diagnosticData.speaking.repeat.every(
    (item) => results[item.id],
  )
  const pictureReady = Boolean(results.speakingPicture)
  const questionReady = Boolean(results.speakingQuestion)
  const ready = skipped || (repeatReady && pictureReady && questionReady)

  function playRepeat(task) {
    if (played[task.id]) return
    setPlayed((current) => ({ ...current, [task.id]: true }))
    new Audio(mediaUrl(task.audio)).play()
  }

  return (
    <section className="diagnostic-card">
      <p className="diagnostic-kicker">06 · HSKK</p>
      <h1>Устная часть</h1>

      <p className="diagnostic-lead">
        Короткая проба HSKK: 3 повтора, 1 картинка и 1 вопрос. Это стартовая
        диагностика, поэтому подсказок по содержанию нет.
      </p>

      {!recognitionSupported && (
        <div className="diagnostic-warning">
          Для автоматической фиксации китайской речи нужен Chrome с доступом к
          микрофону. Если сейчас это невозможно, устную часть можно пропустить,
          но HSKK-профиль останется непроверенным.
        </div>
      )}

      <h2 className="diagnostic-subtitle">听后重复 · Повтори после прослушивания</h2>

      <div className="diagnostic-speaking-stack">
        {diagnosticData.speaking.repeat.map((task, index) => (
          <article key={task.id} className="diagnostic-speaking-card">
            <div>
              <strong>{index + 1}. {task.source}</strong>
              <span>
                Сначала прослушай. Текст во время диагностики не показывается.
              </span>
            </div>

            <div className="diagnostic-speaking-actions">
              <button
                type="button"
                disabled={played[task.id] || Boolean(results[task.id])}
                onClick={() => playRepeat(task)}
              >
                {played[task.id] ? 'Аудио прослушано' : '▶ Прослушать'}
              </button>

              {!results[task.id] ? (
                recordingContext?.id === task.id ? (
                  <button
                    type="button"
                    className="recording"
                    onClick={stopRecording}
                  >
                    ■ Остановить · {recordingSeconds} сек
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!played[task.id] || Boolean(recordingContext)}
                    onClick={() =>
                      startRecording({
                        type: 'repeat',
                        id: task.id,
                      })
                    }
                  >
                    ● Записать повтор
                  </button>
                )
              ) : (
                <b>✓ Записано</b>
              )}
            </div>
          </article>
        ))}
      </div>

      <h2 className="diagnostic-subtitle">看图说话 · Опиши картинку</h2>

      <div className="diagnostic-speaking-picture">
        <img
          src={mediaUrl(diagnosticData.speaking.picture.image)}
          alt="HSKK H81002 task 11"
        />

        <div>
          <p>
            Говори примерно 20–40 секунд. Опиши, что видишь, без готового
            каркаса.
          </p>

          {!results.speakingPicture ? (
            recordingContext?.id === 'speakingPicture' ? (
              <button
                type="button"
                className="recording"
                onClick={stopRecording}
              >
                ■ Остановить · {recordingSeconds} сек
              </button>
            ) : (
              <button
                type="button"
                disabled={Boolean(recordingContext)}
                onClick={() =>
                  startRecording({
                    type: 'picture',
                    id: 'speakingPicture',
                  })
                }
              >
                ● Начать описание
              </button>
            )
          ) : (
            <b>✓ Записано</b>
          )}
        </div>
      </div>

      <h2 className="diagnostic-subtitle">回答问题 · Ответь на вопрос</h2>

      <div className="diagnostic-speaking-question">
        <strong>{diagnosticData.speaking.question.prompt}</strong>
        <small>{diagnosticData.speaking.question.pinyin}</small>
        <p>Говори примерно 30–60 секунд.</p>

        {!results.speakingQuestion ? (
          recordingContext?.id === 'speakingQuestion' ? (
            <button
              type="button"
              className="recording"
              onClick={stopRecording}
            >
              ■ Остановить · {recordingSeconds} сек
            </button>
          ) : (
            <button
              type="button"
              disabled={Boolean(recordingContext)}
              onClick={() =>
                startRecording({
                  type: 'question',
                  id: 'speakingQuestion',
                })
              }
            >
              ● Записать ответ
            </button>
          )
        ) : (
          <b>✓ Записано</b>
        )}
      </div>

      {recordingContext && liveTranscript && (
        <p className="diagnostic-live-transcript">
          Распознавание: {liveTranscript}
        </p>
      )}

      {micError && <div className="diagnostic-warning">{micError}</div>}

      {!ready && (
        <button
          type="button"
          className="diagnostic-skip-speaking"
          onClick={() => setSkipped(true)}
        >
          Сейчас не могу записать — пропустить устную часть
        </button>
      )}

      {skipped && (
        <div className="diagnostic-warning">
          Устная часть пропущена. Её можно будет пройти отдельно позже.
        </div>
      )}

      <SectionContinue
        ready={ready}
        onContinue={onFinish}
        text={
          ready
            ? 'Получить стартовый профиль →'
            : 'Заверши устную часть'
        }
      />
    </section>
  )
}

function ResultStage({ result, onStartCourse, onRestart }) {
  const skillRows = [
    ['词汇', 'Лексика', result.skills.vocabulary],
    ['语法', 'Грамматика', result.skills.grammar],
    ['听力', 'Аудирование', result.skills.listening],
    ['阅读', 'Чтение', result.skills.reading],
    ['写作', 'Письмо', result.skills.writing],
    ['听后重复', 'HSKK · повторение', result.skills.repeat],
    ['看图说话', 'HSKK · картинка', result.skills.picture],
    ['回答问题', 'HSKK · вопрос', result.skills.question],
  ]

  const weak = skillRows.filter(
    ([, , value]) => Number.isFinite(value) && value < 65,
  )

  return (
    <section className="diagnostic-card diagnostic-result">
      <p className="diagnostic-kicker"><ChineseText pinyin="zhěnduàn wánchéng" translation="диагностика завершена" tooltipPosition="bottom">诊断完成</ChineseText> · ГОТОВО</p>
      <h1>Стартовый профиль создан</h1>

      <p className="diagnostic-lead">
        Это не официальный экзаменационный балл. Профиль нужен, чтобы курс
        сразу усиливал слабые места и не заставлял заново учить всё подряд.
      </p>

      <div className="diagnostic-result-summary">
        <article>
          <strong>{result.hskProfile}%</strong>
          <span>стартовый профиль HSK</span>
        </article>

        <article>
          <strong>
            {Number.isFinite(result.hskkProfile)
              ? `${result.hskkProfile}%`
              : '—'}
          </strong>
          <span>стартовый профиль HSKK</span>
        </article>
      </div>

      <div className="diagnostic-skill-results">
        {skillRows.map(([chinese, label, value]) => (
          <article
            key={label}
            className={
              !Number.isFinite(value)
                ? 'not-checked'
                : value >= 85
                  ? 'strong'
                  : value >= 65
                    ? 'stable'
                    : 'weak'
            }
          >
            <div>
              <strong>{chinese}</strong>
              <span>{label}</span>
            </div>

            <b>
              {Number.isFinite(value) ? `${value}%` : 'не проверено'}
            </b>
          </article>
        ))}
      </div>

      <div className="diagnostic-result-note">
        <strong>Что произойдёт дальше</strong>

        <p>
          Ошибочные слова и задания уже добавлены в персональное повторение.
          Основной режим на старте — около 40–45 минут в день. Аудирование и
          устная речь останутся ежедневными.
        </p>

        {weak.length > 0 && (
          <p>
            Первые слабые зоны:{' '}
            <b>{weak.map(([, label]) => label).join(', ')}</b>.
          </p>
        )}
      </div>

      <div className="diagnostic-result-actions">
        <button
          type="button"
          className="diagnostic-main-button"
          onClick={onStartCourse}
        >
          Перейти к первому дню подготовки →
        </button>

        <button
          type="button"
          className="diagnostic-secondary-button"
          onClick={onRestart}
        >
          Пройти диагностику заново
        </button>
      </div>
    </section>
  )
}

function SectionContinue({ ready, onContinue, text }) {
  return (
    <button
      type="button"
      className="diagnostic-main-button"
      disabled={!ready}
      onClick={onContinue}
    >
      {text}
    </button>
  )
}

export default DiagnosticPage
