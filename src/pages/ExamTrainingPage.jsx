import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { shuffleOptions } from '../utils/shuffleOptions.js'
import ChineseText from '../components/ChineseText.jsx'
import examTrainingLesson1, {
  examTrainingLesson1Meta,
} from '../data/examTrainingLesson1.js'
import './ExamTrainingPage.css'
import { recordLearningError } from '../utils/learningStore.js'

const STORAGE_KEY = 'hsk4-exam-training-lesson1-session'
const RESULT_KEY = 'hsk4-exam-training-lesson1-result'
const DATA_VERSION = 2

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function normalize(text) {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[，,。.!！?？；;：:、]/g, '')
    .trim()
}

function shuffle(items) {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

function getInitial() {
  const saved = readJson(STORAGE_KEY)

  if (!saved || saved.version !== DATA_VERSION) {
    return null
  }

  return saved
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60

  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function ExamTrainingPage() {
  const initial = useMemo(() => getInitial(), [])
  const audioRef = useRef(null)

  const [started, setStarted] = useState(
    initial?.started ?? false,
  )

  const [startedAt, setStartedAt] = useState(
    initial?.startedAt ?? null,
  )

  const [sectionIndex, setSectionIndex] = useState(
    initial?.sectionIndex ?? 0,
  )

  const [answers, setAnswers] = useState(
    initial?.answers ?? {},
  )

  const answersRef = useRef(initial?.answers ?? {})

  const [audioStarted, setAudioStarted] = useState(
    initial?.audioStarted ?? false,
  )

  const [submitted, setSubmitted] = useState(
    initial?.submitted ?? false,
  )

  const [timeLeft, setTimeLeft] = useState(() => {
    if (!initial?.startedAt || initial?.submitted) {
      return examTrainingLesson1.durationSeconds
    }

    const elapsed = Math.floor(
      (Date.now() - initial.startedAt) / 1000,
    )

    return Math.max(
      0,
      examTrainingLesson1.durationSeconds - elapsed,
    )
  })

  const section =
    examTrainingLesson1.sections[sectionIndex]

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: DATA_VERSION,
        started,
        startedAt,
        sectionIndex,
        answers,
        audioStarted,
        submitted,
        savedAt: new Date().toISOString(),
      }),
    )
  }, [
    started,
    startedAt,
    sectionIndex,
    answers,
    audioStarted,
    submitted,
  ])

  useEffect(() => {
    if (!started || submitted || !startedAt) {
      return undefined
    }

    const timer = window.setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - startedAt) / 1000,
      )

      const next = Math.max(
        0,
        examTrainingLesson1.durationSeconds -
          elapsed,
      )

      setTimeLeft(next)

      if (next === 0) {
        window.clearInterval(timer)
        finishExam(true, answersRef.current)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [started, submitted, startedAt])

  function startExam() {
    const now = Date.now()

    setStarted(true)
    setStartedAt(now)
    setSectionIndex(0)
    setAnswers({})
    setAudioStarted(false)
    setSubmitted(false)
    setTimeLeft(
      examTrainingLesson1.durationSeconds,
    )
  }

  function setAnswer(itemId, value) {
    if (submitted) return

    setAnswers((current) => {
      const next = {
        ...current,
        [itemId]: value,
      }

      answersRef.current = next
      return next
    })
  }

  function startListeningOnce() {
    if (
      audioStarted ||
      !audioRef.current
    ) {
      return
    }

    setAudioStarted(true)

    audioRef.current.currentTime = 0
    audioRef.current.play()
  }

  function itemAnswered(item, rawValue) {
    if (typeof rawValue !== 'string' || rawValue.length === 0) {
      return false
    }

    if (item.type !== 'wordOrder') {
      return true
    }

    try {
      const pieces = JSON.parse(rawValue)

      return (
        Array.isArray(pieces) &&
        pieces.length === item.pieces.length
      )
    } catch {
      return false
    }
  }

  function sectionAnswered(sectionToCheck) {
    return sectionToCheck.items.every((item) =>
      itemAnswered(item, answers[item.id]),
    )
  }

  function goNextSection() {
    if (!sectionAnswered(section)) {
      return
    }

    if (
      sectionIndex <
      examTrainingLesson1.sections.length - 1
    ) {
      setSectionIndex(
        (current) => current + 1,
      )
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
      return
    }

    finishExam(false, answersRef.current)
  }

  function calculateResult(finalAnswers) {
    const bySkill = {}
    const mistakes = []
    let correct = 0

    examTrainingLesson1.sections.forEach(
      (sectionItem) => {
        let skillCorrect = 0

        sectionItem.items.forEach((item) => {
          const rawAnswer =
            finalAnswers[item.id] ?? ''

          const userAnswer =
            item.type === 'wordOrder' && rawAnswer
              ? displayAnswer(item, rawAnswer)
              : rawAnswer

          const isCorrect =
            normalize(userAnswer) ===
            normalize(item.answer)

          if (isCorrect) {
            correct += 1
            skillCorrect += 1
          } else {
            mistakes.push({
              sectionId: sectionItem.id,
              sectionTitle: sectionItem.title,
              itemId: item.id,
              number: item.number,
              userAnswer,
              correctAnswer: item.answer,
            })
          }
        })

        bySkill[sectionItem.id] = {
          correct: skillCorrect,
          total: sectionItem.items.length,
        }
      },
    )

    return {
      version: DATA_VERSION,
      lessonId: 'lesson-1',
      completed: true,
      correct,
      total:
        examTrainingLesson1Meta.totalItems,
      percent: Math.round(
        (correct /
          examTrainingLesson1Meta.totalItems) *
          100,
      ),
      bySkill,
      mistakes,
      completedAt: new Date().toISOString(),
    }
  }

  function finishExam(
    autoSubmitted,
    finalAnswers = answersRef.current,
  ) {
    if (submitted) return

    const result = calculateResult(finalAnswers)

    result.mistakes.forEach((mistake) => {
      const sectionItem = examTrainingLesson1.sections.find(
        (item) => item.id === mistake.sectionId,
      )
      const task = sectionItem?.items.find((item) => item.id === mistake.itemId)

      if (!task) return

      const type =
        mistake.sectionId === 'listening'
          ? 'listening_memory'
          : mistake.sectionId === 'reading'
            ? 'reading_inference'
            : 'word_order'

      recordLearningError({
        lessonId: 'lesson-1',
        module: 'exam',
        type,
        itemId: task.id,
        title: `Мини-тест HSK · ${mistake.sectionTitle}`,
        passage: task.passage || '',
        prompt:
          task.question ||
          task.statement ||
          (task.pieces ? `Собери: ${task.pieces.join(' / ')}` : 'Экзаменационное задание'),
        mode: task.type === 'wordOrder' ? 'input' : 'choice',
        options:
          task.type === 'trueFalse'
            ? ['对', '错']
            : task.options || [],
        answer: task.answer,
        userAnswer: mistake.userAnswer,
        explanation: task.explanation || '',
        pinyin: task.answerPinyin || task.correctPinyin || '',
        translation: task.answerTranslation || task.correctTranslation || '',
        audioPath:
          mistake.sectionId === 'listening'
            ? examTrainingLesson1.sections[0].audio
            : '',
        route: '/exam-training',
      })
    })

    result.autoSubmitted = autoSubmitted

    localStorage.setItem(
      RESULT_KEY,
      JSON.stringify(result),
    )

    setSubmitted(true)

    if (audioRef.current) {
      audioRef.current.pause()
    }
  }

  function restart() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(RESULT_KEY)

    setStarted(false)
    setStartedAt(null)
    setSectionIndex(0)
    setAnswers({})
    setAudioStarted(false)
    setSubmitted(false)
    setTimeLeft(
      examTrainingLesson1.durationSeconds,
    )
  }

  if (!started) {
    return (
      <main className="exam-page">
        <div className="exam-shell">
          <Link
            to="/"
            className="exam-back"
          >
            ← На главную
          </Link>

          <section className="exam-start-card">
            <div className="exam-seal">考</div>

            <p className="exam-kicker">
              УРОК 1 · 题型训练
            </p>

            <h1>Мини-тест HSK</h1>

            <p className="exam-start-text">
              10 минут · 11 заданий ·
              听力 + 阅读 + 书写
            </p>

            <div className="exam-rules">
              <article>
                <strong>听力</strong>
                <span>
                  5 判断对错 · оригинальное
                  аудио WB · 1 прослушивание
                </span>
              </article>

              <article>
                <strong>阅读</strong>
                <span>
                  3 новых задания из
                  настоящего H41005
                </span>
              </article>

              <article>
                <strong>书写</strong>
                <span>
                  3 настоящих H41005
                  句子排序
                </span>
              </article>
            </div>

            <p className="exam-no-help">
              Во время мини-теста нет pinyin,
              перевода, подсказок и мгновенной
              проверки. Разбор появится только
              после завершения.
            </p>

            <button
              type="button"
              className="exam-main-button"
              onClick={startExam}
            >
              开始考试 · Начать
            </button>
          </section>
        </div>
      </main>
    )
  }

  if (submitted) {
    const result =
      readJson(RESULT_KEY) ??
      calculateResult(answers)

    return (
      <ExamResult
        result={result}
        onRestart={restart}
      />
    )
  }

  return (
    <main className="exam-page exam-active">
      <audio
        ref={audioRef}
        src={
          examTrainingLesson1.sections[0].audio
        }
        preload="auto"
      />

      <div className="exam-shell">
        <div className="exam-topbar">
          <Link
            to="/"
            className="exam-back"
          >
            ← На главную
          </Link>

          <div className="exam-timer">
            <span>剩余时间</span>
            <strong>
              {formatTime(timeLeft)}
            </strong>
          </div>
        </div>

        <section className="exam-header">
          <div>
            <p className="exam-kicker">
              МИНИ-ТЕСТ HSK · УРОК 1
            </p>
            <h1>{section.title}</h1>
            <p>{section.instruction}</p>
          </div>

          <div className="exam-section-counter">
            {sectionIndex + 1} /{' '}
            {examTrainingLesson1Meta.totalSections}
          </div>
        </section>

        {section.id === 'listening' && (
          <section className="exam-audio-panel">
            <strong>
              原版录音 · 第1–5题
            </strong>

            <button
              type="button"
              className="exam-audio-button"
              disabled={audioStarted}
              onClick={startListeningOnce}
            >
              {audioStarted
                ? '▶ Аудио уже запущено'
                : '▶ Включить аудио один раз'}
            </button>

            <small>
              После запуска кнопка повторного
              воспроизведения блокируется.
            </small>
          </section>
        )}

        <section className="exam-items">
          {section.items.map((item) => (
            <ExamItem
              key={item.id}
              item={item}
              value={answers[item.id] ?? ''}
              onChange={(value) =>
                setAnswer(item.id, value)
              }
            />
          ))}
        </section>

        <div className="exam-nav">
          <span>
            Отвечено:{' '}
            {
              section.items.filter(
                (item) =>
                  answers[item.id]?.length > 0,
              ).length
            }{' '}
            / {section.items.length}
          </span>

          <button
            type="button"
            className="exam-main-button"
            disabled={
              !sectionAnswered(section)
            }
            onClick={goNextSection}
          >
            {sectionIndex >=
            examTrainingLesson1.sections.length -
              1
              ? '提交 · Завершить'
              : '下一部分 · Дальше'}
          </button>
        </div>
      </div>
    </main>
  )
}

function ExamItem({
  item,
  value,
  onChange,
}) {
  const shuffledPieces = useMemo(
    () =>
      item.type === 'wordOrder'
        ? shuffle(
            item.pieces.map(
              (text, sourceIndex) => ({
                text,
                sourceIndex,
              }),
            ),
          )
        : [],
    [item.id],
  )

  const selectedPieces =
    item.type === 'wordOrder' && value
      ? JSON.parse(value)
      : []

  const used = selectedPieces.map(
    (itemPiece) => itemPiece.sourceIndex,
  )

  function addPiece(piece) {
    const next = [
      ...selectedPieces,
      piece,
    ]

    onChange(JSON.stringify(next))
  }

  function removePiece(index) {
    const next = selectedPieces.filter(
      (_, itemIndex) => itemIndex !== index,
    )

    onChange(
      next.length
        ? JSON.stringify(next)
        : '',
    )
  }

  if (item.type === 'trueFalse') {
    return (
      <article className="exam-item-card">
        <div className="exam-item-number">
          {item.number}
        </div>

        <p className="exam-statement">
          {item.statement}
        </p>

        <div className="exam-binary">
          {['对', '错'].map((option) => (
            <button
              type="button"
              key={option}
              className={
                value === option
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                onChange(option)
              }
            >
              {option}
            </button>
          ))}
        </div>
      </article>
    )
  }

  if (item.type === 'choice') {
    return (
      <article className="exam-item-card">
        <div className="exam-item-number">
          {item.number}
        </div>

        <p className="exam-passage">
          {item.passage}
        </p>

        <p className="exam-question">
          {item.question}
        </p>

        <div className="exam-options">
          {shuffleOptions(item.options, item.id ?? item.number).map(
            (option, index) => (
              <button
                type="button"
                key={option}
                className={
                  value === option
                    ? 'selected'
                    : ''
                }
                onClick={() =>
                  onChange(option)
                }
              >
                <b>
                  {
                    ['A', 'B', 'C', 'D'][
                      index
                    ]
                  }
                </b>
                {option}
              </button>
            ),
          )}
        </div>
      </article>
    )
  }

  const builtText = selectedPieces
    .map((piece) => piece.text)
    .join('')

  return (
    <article className="exam-item-card">
      <div className="exam-item-number">
        {item.number}
      </div>

      <div className="exam-order-answer">
        {selectedPieces.length === 0
          ? 'Нажимай слова в нужном порядке'
          : selectedPieces.map(
              (piece, index) => (
                <button
                  type="button"
                  key={`${piece.sourceIndex}-${index}`}
                  onClick={() =>
                    removePiece(index)
                  }
                >
                  {piece.text}
                </button>
              ),
            )}
      </div>

      <div className="exam-order-bank">
        {shuffledPieces.map((piece) => (
          <button
            type="button"
            key={`${piece.text}-${piece.sourceIndex}`}
            disabled={used.includes(
              piece.sourceIndex,
            )}
            onClick={() =>
              addPiece(piece)
            }
          >
            {piece.text}
          </button>
        ))}
      </div>

      <input
        className="exam-hidden-value"
        readOnly
        value={builtText}
        aria-hidden="true"
        tabIndex={-1}
      />
    </article>
  )
}

function ExamResult({
  result,
  onRestart,
}) {
  const flatItems =
    examTrainingLesson1.sections.flatMap(
      (section) =>
        section.items.map((item) => ({
          ...item,
          sectionId: section.id,
          sectionTitle: section.title,
        })),
    )

  const mistakes = flatItems.filter(
    (item) => {
      const userMistake =
        result.mistakes?.find(
          (mistake) =>
            mistake.itemId === item.id,
        )

      return Boolean(userMistake)
    },
  )

  return (
    <main className="exam-page">
      <div className="exam-shell">
        <Link
          to="/"
          className="exam-back"
        >
          ← На главную
        </Link>

        <section className="exam-result-card">
          <div className="exam-result-score">
            <strong>
              {result.percent}%
            </strong>
            <span>
              {result.correct} / {result.total}
            </span>
          </div>

          <p className="exam-kicker">
            УРОК 1 · 题型训练
          </p>

          <h1>Мини-тест HSK 完成</h1>

          {result.autoSubmitted && (
            <p className="exam-timeout">
              Время закончилось, тест был
              завершён автоматически.
            </p>
          )}

          <div className="exam-skill-grid">
            {examTrainingLesson1.sections.map(
              (section) => {
                const skill =
                  result.bySkill?.[section.id]

                return (
                  <article key={section.id}>
                    <strong>
                      {section.title}
                    </strong>
                    <span>
                      {skill?.correct ?? 0} /{' '}
                      {skill?.total ??
                        section.items.length}
                    </span>
                  </article>
                )
              },
            )}
          </div>

          {mistakes.length > 0 ? (
            <div className="exam-review">
              <h2>错题 · Разбор ошибок</h2>

              {mistakes.map((item) => {
                const mistake =
                  result.mistakes.find(
                    (entry) =>
                      entry.itemId === item.id,
                  )

                return (
                  <article
                    key={item.id}
                    className="exam-review-item"
                  >
                    <div>
                      <b>
                        {item.sectionTitle}{' '}
                        · {item.number}
                      </b>
                    </div>

                    <p>
                      Твой ответ:{' '}
                      <strong>
                        {displayAnswer(
                          item,
                          mistake.userAnswer,
                        ) || '—'}
                      </strong>
                    </p>

                    <div className="exam-correct-box">
                      <span>
                        Правильный ответ
                      </span>

                      <ChineseText
                        pinyin={
                          item.answerPinyin ??
                          item.correctPinyin
                        }
                        translation={
                          item.answerTranslation ??
                          item.correctTranslation
                        }
                      >
                        {item.answer}
                      </ChineseText>
                    </div>

                    <p className="exam-explanation">
                      {item.explanation}
                    </p>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="exam-perfect">
              ✓ Все задания выполнены правильно.
            </div>
          )}

          <div className="exam-result-actions">
            <button
              type="button"
              className="exam-secondary"
              onClick={onRestart}
            >
              Пройти ещё раз
            </button>

            <Link
              to="/"
              className="exam-primary-link"
            >
              Вернуться на главную
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

function displayAnswer(item, rawValue) {
  if (
    item.type !== 'wordOrder' ||
    !rawValue
  ) {
    return rawValue
  }

  try {
    return JSON.parse(rawValue)
      .map((piece) => piece.text)
      .join('')
  } catch {
    return rawValue
  }
}

export default ExamTrainingPage
