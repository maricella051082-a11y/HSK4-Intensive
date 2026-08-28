import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import grammarLesson1, {
  grammarLesson1Meta,
} from '../data/grammarLesson1.js'
import './GrammarPage.css'
import { getGrammarLesson1Tokens } from '../data/grammarLesson1TokenMap.js'
import { recordLearningError } from '../utils/learningStore.js'

const STORAGE_KEY = 'hsk4-grammar-lesson1-session'
const RESULT_KEY = 'hsk4-grammar-lesson1-result'
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

function speakChinese(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(String(text).replace(/\s+\/\s+/g, '。'))
  utterance.lang = 'zh-CN'
  utterance.rate = 0.86
  window.speechSynthesis.speak(utterance)
}

function makeShuffledOrderPieces(task) {
  if (!task || task.type !== 'order') {
    return []
  }

  const original = task.pieces.map((text, sourceIndex) => ({
    text,
    sourceIndex,
  }))

  let shuffled = shuffle(original)

  const stayedInOriginalOrder = shuffled.every(
    (item, index) => item.sourceIndex === index,
  )

  if (stayedInOriginalOrder && shuffled.length > 1) {
    shuffled = [...shuffled.slice(1), shuffled[0]]
  }

  return shuffled
}

function getInitialSession() {
  const saved = readJson(STORAGE_KEY)

  if (!saved || saved.version !== DATA_VERSION) {
    return null
  }

  return saved
}

function isTaskCorrect(task, value) {
  if (task.type === 'input') {
    const accepted = task.answers ?? [task.answer]

    return accepted.some(
      (answer) => normalize(answer) === normalize(value),
    )
  }

  return normalize(task.answer) === normalize(value)
}

function GrammarPrompt({ task }) {
  if (!task.prompt) {
    return null
  }

  if (task.promptPinyin && task.promptTranslation) {
    return (
      <div className="grammar-prompt">
        <ChineseText
          pinyin={task.promptPinyin}
          translation={task.promptTranslation}
        >
          {task.prompt}
        </ChineseText>
      </div>
    )
  }

  return (
    <div className="grammar-prompt">
      {task.prompt}
    </div>
  )
}


function WordByWordGrammarExample({ sentence, onSpeak }) {
  const tokens = getGrammarLesson1Tokens(sentence)

  if (!tokens.length) {
    return <span>{sentence}</span>
  }

  return (
    <div className="grammar-word-example">
      <p className="grammar-word-line">
        {tokens.map(([hanzi, pinyin, translation], index) => {
          if (!hanzi) return null

          if (/^[，。！？、；：,.!?;:]$/.test(hanzi) || hanzi.trim() === '/') {
            return (
              <span
                key={`${hanzi}-${index}`}
                className="grammar-word-punctuation"
                aria-hidden="true"
              >
                {hanzi}
              </span>
            )
          }

          return (
            <ChineseText
              key={`${hanzi}-${index}`}
              pinyin={pinyin}
              translation={translation}
              tooltipPosition="top"
            >
              {hanzi}
            </ChineseText>
          )
        })}
      </p>

      {onSpeak && (
        <button
          type="button"
          className="grammar-example-audio"
          onClick={() => onSpeak(sentence)}
        >
          🔊 Озвучить
        </button>
      )}
    </div>
  )
}

function GrammarPage() {
  const initial = useMemo(() => getInitialSession(), [])

  const [sectionIndex, setSectionIndex] = useState(
    initial?.sectionIndex ?? 0,
  )

  const [taskIndex, setTaskIndex] = useState(
    initial?.taskIndex ?? 0,
  )

  const [showIntro, setShowIntro] = useState(
    initial?.showIntro ?? true,
  )

  const [detailsOpen, setDetailsOpen] = useState(false)

  const [retryMode, setRetryMode] = useState(
    initial?.retryMode ?? false,
  )

  const [sectionWrong, setSectionWrong] = useState(
    initial?.sectionWrong ?? {},
  )

  const [everWrong, setEverWrong] = useState(
    Array.isArray(initial?.everWrong)
      ? initial.everWrong
      : [],
  )

  const [completedSections, setCompletedSections] = useState(
    Array.isArray(initial?.completedSections)
      ? initial.completedSections
      : [],
  )

  const [firstCorrect, setFirstCorrect] = useState(
    Array.isArray(initial?.firstCorrect)
      ? initial.firstCorrect
      : [],
  )

  const [selected, setSelected] = useState('')
  const [checked, setChecked] = useState(false)
  const [builtPieces, setBuiltPieces] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [finished, setFinished] = useState(
    initial?.finished ?? false,
  )

  const section = grammarLesson1[sectionIndex]

  const activeTasks = useMemo(() => {
    if (!section) {
      return []
    }

    if (!retryMode) {
      return section.tasks
    }

    const wrongIds = sectionWrong[section.id] ?? []

    return section.tasks.filter(
      (task) => wrongIds.includes(task.id),
    )
  }, [section, retryMode, sectionWrong])

  const currentTask =
    activeTasks[
      Math.min(
        taskIndex,
        Math.max(0, activeTasks.length - 1),
      )
    ]

  const orderBankPieces = useMemo(
    () => makeShuffledOrderPieces(currentTask),
    [currentTask?.id, retryMode],
  )

  const builtText = builtPieces
    .map((item) => item.text)
    .join('')

  const answerValue =
    currentTask?.type === 'order'
      ? builtText
      : currentTask?.type === 'input'
        ? inputValue
        : selected

  const taskCorrect =
    checked && currentTask
      ? isTaskCorrect(currentTask, answerValue)
      : false

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: DATA_VERSION,
        sectionIndex,
        taskIndex,
        showIntro,
        retryMode,
        sectionWrong,
        everWrong,
        completedSections,
        firstCorrect,
        finished,
        savedAt: new Date().toISOString(),
      }),
    )
  }, [
    sectionIndex,
    taskIndex,
    showIntro,
    retryMode,
    sectionWrong,
    everWrong,
    completedSections,
    firstCorrect,
    finished,
  ])

  useEffect(() => {
    setSelected('')
    setChecked(false)
    setBuiltPieces([])
    setInputValue('')
  }, [
    sectionIndex,
    taskIndex,
    retryMode,
    showIntro,
    currentTask?.id,
  ])

  useEffect(() => {
    setDetailsOpen(false)
  }, [sectionIndex])

  function choosePiece(piece, index) {
    if (checked) {
      return
    }

    setBuiltPieces((current) => [
      ...current,
      { text: piece, sourceIndex: index },
    ])
  }

  function removeBuiltPiece(index) {
    if (checked) {
      return
    }

    setBuiltPieces((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    )
  }

  function resetTaskAnswer() {
    setSelected('')
    setChecked(false)
    setBuiltPieces([])
    setInputValue('')
  }

  function checkTask() {
    if (!currentTask || !answerValue) {
      return
    }

    const correct = isTaskCorrect(
      currentTask,
      answerValue,
    )

    setChecked(true)

    if (!retryMode && correct) {
      setFirstCorrect((current) =>
        current.includes(currentTask.id)
          ? current
          : [...current, currentTask.id],
      )
    }

    if (!correct) {
      recordLearningError({
        lessonId: 'lesson-1',
        module: 'grammar',
        type: currentTask.type === 'order' ? 'word_order' : 'grammar',
        itemId: currentTask.id,
        title: section.title,
        prompt:
          currentTask.prompt ||
          (currentTask.type === 'order'
            ? `Собери: ${currentTask.pieces.join(' / ')}`
            : currentTask.instruction),
        mode: currentTask.type === 'choice' ? 'choice' : 'input',
        options: currentTask.options || [],
        answer: currentTask.answer,
        acceptedAnswers: currentTask.answers || [currentTask.answer],
        userAnswer: answerValue,
        explanation: currentTask.explanation || '',
        route: '/grammar',
      })

      setEverWrong((current) =>
        current.includes(currentTask.id)
          ? current
          : [...current, currentTask.id],
      )

      setSectionWrong((current) => {
        const wrong = current[section.id] ?? []

        return {
          ...current,
          [section.id]: wrong.includes(currentTask.id)
            ? wrong
            : [...wrong, currentTask.id],
        }
      })
    }
  }

  function saveFinishedResult(
    nextCompletedSections,
    finalFirstCorrect,
  ) {
    const result = {
      version: DATA_VERSION,
      lessonId: grammarLesson1Meta.lessonId,
      completed: true,
      completedSections:
        grammarLesson1Meta.totalSections,
      totalSections:
        grammarLesson1Meta.totalSections,
      firstCorrect: finalFirstCorrect,
      totalTasks: grammarLesson1Meta.totalTasks,
      weakTasks: everWrong,
      completedAt: new Date().toISOString(),
    }

    localStorage.setItem(
      RESULT_KEY,
      JSON.stringify(result),
    )

    setCompletedSections(nextCompletedSections)
    setFinished(true)
  }

  function completeCurrentSection() {
    const nextCompleted = completedSections.includes(
      section.id,
    )
      ? completedSections
      : [...completedSections, section.id]

    if (
      sectionIndex >=
      grammarLesson1.length - 1
    ) {
      const finalFirstCorrect =
        firstCorrect.length

      saveFinishedResult(
        nextCompleted,
        finalFirstCorrect,
      )

      return
    }

    setCompletedSections(nextCompleted)
    setSectionIndex((current) => current + 1)
    setTaskIndex(0)
    setRetryMode(false)
    setShowIntro(true)
  }

  function goNext() {
    if (!currentTask || !checked) {
      return
    }

    const currentCorrect = isTaskCorrect(
      currentTask,
      answerValue,
    )

    const currentWrong =
      sectionWrong[section.id] ?? []

    const nextWrong = currentCorrect
      ? currentWrong.filter(
          (id) => id !== currentTask.id,
        )
      : currentWrong.includes(currentTask.id)
        ? currentWrong
        : [...currentWrong, currentTask.id]

    if (retryMode) {
      if (!currentCorrect) {
        setSectionWrong((current) => ({
          ...current,
          [section.id]: nextWrong,
        }))

        resetTaskAnswer()
        return
      }

      setSectionWrong((current) => ({
        ...current,
        [section.id]: nextWrong,
      }))

      if (nextWrong.length > 0) {
        setTaskIndex(0)
        resetTaskAnswer()
        return
      }

      completeCurrentSection()
      return
    }

    const lastTask =
      taskIndex >= activeTasks.length - 1

    if (!lastTask) {
      setTaskIndex((current) => current + 1)
      return
    }

    if (nextWrong.length > 0) {
      setSectionWrong((current) => ({
        ...current,
        [section.id]: nextWrong,
      }))

      setRetryMode(true)
      setTaskIndex(0)
      resetTaskAnswer()
      return
    }

    completeCurrentSection()
  }

  function restartTraining() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(RESULT_KEY)

    setSectionIndex(0)
    setTaskIndex(0)
    setShowIntro(true)
    setDetailsOpen(false)
    setRetryMode(false)
    setSectionWrong({})
    setEverWrong([])
    setCompletedSections([])
    setFirstCorrect([])
    setSelected('')
    setChecked(false)
    setBuiltPieces([])
    setInputValue('')
    setFinished(false)
  }

  if (finished) {
    const result = readJson(RESULT_KEY)

    return (
      <main className="grammar-page">
        <div className="grammar-shell">
          <Link to="/" className="grammar-back">
            ← На главную
          </Link>

          <section className="grammar-finish">
            <div className="grammar-finish-mark">
              ✓
            </div>

            <p className="grammar-kicker">
              УРОК 1 · 语法复习
            </p>

            <h1>
              <ChineseText
                pinyin="yǔfǎ fùxí wánchéng"
                translation="Повторение грамматики завершено"
              >
                语法复习完成
              </ChineseText>
            </h1>

            <p>
              Все пять официальных грамматических
              пунктов урок 1 пройдены. Ошибочное
              задание не выпускает из блока, пока не
              будет выполнено правильно.
            </p>

            <div className="grammar-result-grid">
              <article>
                <strong>
                  {grammarLesson1Meta.totalSections} /{' '}
                  {grammarLesson1Meta.totalSections}
                </strong>

                <span>
                  грамматических блоков
                </span>
              </article>

              <article>
                <strong>
                  {result?.firstCorrect ??
                    firstCorrect.length}{' '}
                  / {grammarLesson1Meta.totalTasks}
                </strong>

                <span>
                  верно с первой попытки
                </span>
              </article>
            </div>

            {everWrong.length > 0 && (
              <p className="grammar-finish-note">
                Ошибок для будущего 错题本:{' '}
                <strong>{everWrong.length}</strong>
              </p>
            )}

            <div className="grammar-finish-actions">
              <button
                type="button"
                className="grammar-secondary"
                onClick={restartTraining}
              >
                Пройти ещё раз
              </button>

              <Link
                to="/"
                className="grammar-primary-link"
              >
                Вернуться на главную
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  const totalSections =
    grammarLesson1Meta.totalSections

  const progress =
    (completedSections.length / totalSections) *
    100

  if (showIntro) {
    return (
      <main className="grammar-page">
        <div className="grammar-shell">
          <div className="grammar-topbar">
            <Link
              to="/"
              className="grammar-back"
            >
              ← На главную
            </Link>

            <span>
              {sectionIndex + 1} / {totalSections}
            </span>
          </div>

          <section className="grammar-header">
            <div>
              <p className="grammar-kicker">
                УРОК 1 · 语法复习
              </p>

              <h1>
                <ChineseText
                  pinyin={section.pinyin}
                  translation={section.translation}
                >
                  {section.title}
                </ChineseText>
              </h1>

              <p>{section.translation}</p>
            </div>

            <div className="grammar-progress-wrap">
              <div className="grammar-progress-track">
                <div
                  className="grammar-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <span>
                {completedSections.length} /{' '}
                {totalSections}
              </span>
            </div>
          </section>

          <section className="grammar-card intro-card">
            <div className="grammar-step">
              <span>看</span>
              <strong>
                Правило перед тренировкой
              </strong>
            </div>

            <p className="grammar-summary">
              {section.summary}
            </p>

            <div className="grammar-rule-grid">
              <article className="grammar-rule-box">
                <span className="grammar-rule-label">
                  公式 · Формула
                </span>

                <strong>{section.formula}</strong>
              </article>

              <article className="grammar-warning-box">
                <span className="grammar-rule-label">
                  ⚠ 别混淆 · Не перепутай
                </span>

                <p>{section.warning}</p>
              </article>
            </div>

            <div className="grammar-examples">
              {section.examples.map((example) => (
                <article key={example.hanzi}>
                  <WordByWordGrammarExample
                    sentence={example.hanzi}
                    onSpeak={speakChinese}
                  />

                  <small className="grammar-word-hint">
                    Наведи на отдельное слово: pinyin + русский перевод.
                  </small>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="grammar-detail-toggle"
              onClick={() =>
                setDetailsOpen((current) => !current)
              }
            >
              {detailsOpen
                ? 'Скрыть подробное объяснение ↑'
                : '展开详细说明 · Подробнее ↓'}
            </button>

            {detailsOpen && (
              <div className="grammar-details">
                {section.details.map((detail) => (
                  <article key={detail.title}>
                    <h3>{detail.title}</h3>
                    <p>{detail.text}</p>

                    <div className="grammar-detail-example">
                      <WordByWordGrammarExample
                        sentence={detail.example}
                        onSpeak={speakChinese}
                      />
                    </div>

                    <small className="grammar-word-hint">
                      Наведи на отдельное слово: pinyin + русский перевод.
                    </small>
                  </article>
                ))}

                <p className="grammar-source">
                  Источник правила: {section.source}
                </p>
              </div>
            )}

            <button
              type="button"
              className="grammar-main-button"
              onClick={() => {
                setShowIntro(false)
                setTaskIndex(0)
              }}
            >
              К заданиям · 4 →
            </button>
          </section>
        </div>
      </main>
    )
  }

  if (!currentTask) {
    return null
  }

  const usedSourceIndices = builtPieces.map(
    (item) => item.sourceIndex,
  )

  return (
    <main className="grammar-page">
      <div className="grammar-shell">
        <div className="grammar-topbar">
          <Link
            to="/"
            className="grammar-back"
          >
            ← На главную
          </Link>

          <span>
            {sectionIndex + 1} / {totalSections}
          </span>
        </div>

        <section className="grammar-header compact">
          <div>
            <p className="grammar-kicker">
              {retryMode
                ? '错题复习 · ОБЯЗАТЕЛЬНЫЙ ПОВТОР'
                : `语法 ${sectionIndex + 1}`}
            </p>

            <h1>
              <ChineseText
                pinyin={section.pinyin}
                translation={section.translation}
              >
                {section.title}
              </ChineseText>
            </h1>
          </div>

          <div className="grammar-progress-wrap">
            <div className="grammar-progress-track">
              <div
                className="grammar-progress-fill"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <span>
              {taskIndex + 1} /{' '}
              {activeTasks.length}
            </span>
          </div>
        </section>

        <section className="grammar-card task-card">
          {retryMode && (
            <div className="retry-notice">
              Ошибка остаётся в повторе до
              правильного ответа.
            </div>
          )}

          <div className="grammar-step">
            <span>
              {currentTask.type === 'choice'
                ? '选'
                : currentTask.type === 'order'
                  ? '排'
                  : '用'}
            </span>

            <strong>
              {currentTask.instruction}
            </strong>
          </div>

          <GrammarPrompt task={currentTask} />

          {currentTask.type === 'choice' && (
            <div className="grammar-options">
              {currentTask.options.map((option) => {
                const isSelected =
                  selected === option

                const isCorrect =
                  checked &&
                  normalize(option) ===
                    normalize(currentTask.answer)

                const isWrong =
                  checked &&
                  isSelected &&
                  !isCorrect

                return (
                  <button
                    type="button"
                    key={option}
                    disabled={checked}
                    className={[
                      'grammar-option',
                      isSelected
                        ? 'selected'
                        : '',
                      isCorrect
                        ? 'correct'
                        : '',
                      isWrong ? 'wrong' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() =>
                      setSelected(option)
                    }
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          )}

          {currentTask.type === 'order' && (
            <>
              <div className="order-answer">
                {builtPieces.length === 0
                  ? 'Нажимай карточки в нужном порядке'
                  : builtPieces.map(
                      (item, index) => (
                        <button
                          type="button"
                          key={`${item.sourceIndex}-${index}`}
                          disabled={checked}
                          onClick={() =>
                            removeBuiltPiece(index)
                          }
                        >
                          {item.text}
                        </button>
                      ),
                    )}
              </div>

              <div className="order-bank">
                {orderBankPieces.map((item) => (
                  <button
                    type="button"
                    key={`${item.text}-${item.sourceIndex}`}
                    disabled={
                      checked ||
                      usedSourceIndices.includes(
                        item.sourceIndex,
                      )
                    }
                    onClick={() =>
                      choosePiece(
                        item.text,
                        item.sourceIndex,
                      )
                    }
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </>
          )}

          {currentTask.type === 'input' && (
            <div className="grammar-input-wrap">
              <input
                value={inputValue}
                disabled={checked}
                onChange={(event) =>
                  setInputValue(
                    event.target.value,
                  )
                }
                placeholder="Введите предложение по-китайски"
              />
            </div>
          )}

          {!checked ? (
            <button
              type="button"
              className="grammar-main-button"
              disabled={
                currentTask.type === 'choice'
                  ? !selected
                  : currentTask.type ===
                      'order'
                    ? builtPieces.length !==
                      currentTask.pieces.length
                    : !inputValue.trim()
              }
              onClick={checkTask}
            >
              Проверить
            </button>
          ) : (
            <div
              className={[
                'grammar-feedback',
                taskCorrect
                  ? 'correct'
                  : 'wrong',
              ].join(' ')}
            >
              <strong>
                {taskCorrect
                  ? '✓ Верно'
                  : '✕ Нужно исправить'}
              </strong>

              {!taskCorrect && (
                <p className="correct-answer">
                  Правильный ответ:{' '}
                  {currentTask.answer}
                </p>
              )}

              <p>
                {currentTask.explanation}
              </p>

              <button
                type="button"
                className="grammar-main-button"
                onClick={goNext}
              >
                {retryMode
                  ? taskCorrect
                    ? 'Ошибка исправлена →'
                    : 'Повторить это задание →'
                  : taskIndex >=
                      activeTasks.length - 1
                    ? 'Завершить блок →'
                    : 'Следующее →'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default GrammarPage
