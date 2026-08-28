import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import ChineseWordText from '../components/ChineseWordText.jsx'
import MoyuCompanion from '../components/MoyuCompanion.jsx'
import readingLesson1 from '../data/readingLesson1.js'
import './ReadingPage.css'
import { recordLearningError } from '../utils/learningStore.js'
import { shuffleOptions } from '../utils/shuffleOptions.js'

const STORAGE_KEY = 'hsk4-reading-lesson1-session'
const RESULT_KEY = 'hsk4-reading-lesson1-result'
const DATA_VERSION = 2

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[，,。.!！?？；;：:、]/g, '')
    .trim()
}

function getInitialSession() {
  const saved = readJson(STORAGE_KEY)
  if (!saved || saved.version !== DATA_VERSION) {
    return null
  }
  return saved
}

function findBankItem(ref) {
  const bank = readingLesson1.workbookBank[ref.bank] ?? []
  return bank.find((item) => item.number === ref.number)
}

function makeStageTasks(stage) {
  if (stage === 'intensive') {
    return readingLesson1.intensiveTasks
  }

  const refs =
    stage === 'skill'
      ? readingLesson1.dailyPlan.skill
      : readingLesson1.dailyPlan.exam

  return refs.map((ref) => {
    const source = findBankItem(ref)

    if (ref.bank === 'fill') {
      return {
        id: `wb-${source.number}`,
        type: 'choice',
        source: `рабочая тетрадь · 第${source.number}题`,
        instruction: 'Выбери слово для пропуска.',
        prompt: source.text,
        options: source.options,
        answer: source.answer,
        explanation:
          'Это задание из HSK Standard Course 4A рабочая тетрадь, урок 1.',
      }
    }

    if (ref.bank === 'order') {
      return {
        id: `wb-${source.number}`,
        type: 'orderABC',
        source: `рабочая тетрадь · 第${source.number}题`,
        instruction: 'Восстанови логический порядок трёх частей.',
        parts: source.parts,
        answer: source.answer,
        explanation:
          'Сначала найди фразу, которая может начать мысль, затем связь по местоимению/союзу и только потом заключение.',
      }
    }

    return {
      id: `wb-${source.number}`,
      type: 'choice',
      source: `рабочая тетрадь · 第${source.number}题`,
      instruction: 'Прочитай и выбери правильный ответ.',
      passage: source.passage,
      prompt: source.question,
      options: source.options,
      answer: source.answer,
      explanation:
        'Ответ должен подтверждаться самим текстом, а не общими знаниями.',
    }
  })
}

function shuffle(items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function ReadingPage() {
  const initial = useMemo(() => getInitialSession(), [])

  const [stage, setStage] = useState(initial?.stage ?? 'intensive')
  const [taskIndex, setTaskIndex] = useState(initial?.taskIndex ?? 0)
  const [completedStages, setCompletedStages] = useState(
    Array.isArray(initial?.completedStages) ? initial.completedStages : [],
  )
  const [wrongByStage, setWrongByStage] = useState(
    initial?.wrongByStage ?? {},
  )
  const [everWrong, setEverWrong] = useState(
    Array.isArray(initial?.everWrong) ? initial.everWrong : [],
  )
  const [firstCorrect, setFirstCorrect] = useState(
    Array.isArray(initial?.firstCorrect) ? initial.firstCorrect : [],
  )
  const [retryMode, setRetryMode] = useState(initial?.retryMode ?? false)
  const [selected, setSelected] = useState('')
  const [orderValue, setOrderValue] = useState([])
  const [checked, setChecked] = useState(false)
  const [finished, setFinished] = useState(initial?.finished ?? false)

  const baseTasks = useMemo(() => makeStageTasks(stage), [stage])

  const activeTasks = useMemo(() => {
    if (!retryMode) return baseTasks
    const wrongIds = wrongByStage[stage] ?? []
    return baseTasks.filter((task) => wrongIds.includes(task.id))
  }, [baseTasks, retryMode, wrongByStage, stage])

  const currentTask =
    activeTasks[Math.min(taskIndex, Math.max(0, activeTasks.length - 1))]

  const shuffledOrderParts = useMemo(() => {
    if (currentTask?.type !== 'orderABC') return []
    return shuffle(Object.entries(currentTask.parts))
  }, [currentTask?.id, retryMode])

  const answerValue =
    currentTask?.type === 'orderABC'
      ? orderValue.map(([key]) => key).join('')
      : selected

  const taskCorrect =
    checked && currentTask
      ? normalize(answerValue) === normalize(currentTask.answer)
      : false

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: DATA_VERSION,
        stage,
        taskIndex,
        completedStages,
        wrongByStage,
        everWrong,
        firstCorrect,
        retryMode,
        finished,
        savedAt: new Date().toISOString(),
      }),
    )
  }, [
    stage,
    taskIndex,
    completedStages,
    wrongByStage,
    everWrong,
    firstCorrect,
    retryMode,
    finished,
  ])

  useEffect(() => {
    setSelected('')
    setOrderValue([])
    setChecked(false)
  }, [stage, taskIndex, retryMode, currentTask?.id])

  function checkTask() {
    if (!currentTask || !answerValue) return

    const correct = normalize(answerValue) === normalize(currentTask.answer)
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
        module: 'reading',
        type: currentTask.type === 'orderABC' ? 'word_order' : 'reading_inference',
        itemId: `${stage}-${currentTask.id}`,
        title: currentTask.source || 'HSK 阅读',
        passage: currentTask.passage || '',
        prompt:
          currentTask.prompt ||
          (currentTask.type === 'orderABC'
            ? Object.entries(currentTask.parts)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' · ')
            : currentTask.instruction),
        mode: currentTask.type === 'choice' ? 'choice' : 'input',
        options: currentTask.options || [],
        answer: currentTask.answer,
        userAnswer: answerValue,
        explanation: currentTask.explanation || '',
        route: '/reading',
      })

      setEverWrong((current) =>
        current.includes(currentTask.id)
          ? current
          : [...current, currentTask.id],
      )

      setWrongByStage((current) => {
        const wrong = current[stage] ?? []
        return {
          ...current,
          [stage]: wrong.includes(currentTask.id)
            ? wrong
            : [...wrong, currentTask.id],
        }
      })
    }
  }

  function finishStage() {
    const nextCompleted = completedStages.includes(stage)
      ? completedStages
      : [...completedStages, stage]

    if (stage === 'exam') {
      const result = {
        version: DATA_VERSION,
        lessonId: 'lesson-1',
        completed: true,
        completedStages: 3,
        totalStages: 3,
        firstCorrect: firstCorrect.length,
        totalTasks:
          readingLesson1.intensiveTasks.length +
          readingLesson1.dailyPlan.skill.length +
          readingLesson1.dailyPlan.exam.length,
        weakTasks: everWrong,
        completedAt: new Date().toISOString(),
      }

      localStorage.setItem(RESULT_KEY, JSON.stringify(result))
      setCompletedStages(nextCompleted)
      setFinished(true)
      return
    }

    setCompletedStages(nextCompleted)
    setStage(stage === 'intensive' ? 'skill' : 'exam')
    setTaskIndex(0)
    setRetryMode(false)
  }

  function goNext() {
    if (!currentTask || !checked) return

    const correct =
      normalize(answerValue) === normalize(currentTask.answer)

    const currentWrong = wrongByStage[stage] ?? []
    const nextWrong = correct
      ? currentWrong.filter((id) => id !== currentTask.id)
      : currentWrong.includes(currentTask.id)
        ? currentWrong
        : [...currentWrong, currentTask.id]

    if (retryMode) {
      if (!correct) {
        setWrongByStage((current) => ({
          ...current,
          [stage]: nextWrong,
        }))
        setSelected('')
        setOrderValue([])
        setChecked(false)
        return
      }

      setWrongByStage((current) => ({
        ...current,
        [stage]: nextWrong,
      }))

      if (nextWrong.length > 0) {
        setTaskIndex(0)
        setSelected('')
        setOrderValue([])
        setChecked(false)
        return
      }

      finishStage()
      return
    }

    const isLast = taskIndex >= activeTasks.length - 1

    if (!isLast) {
      setTaskIndex((current) => current + 1)
      return
    }

    if (nextWrong.length > 0) {
      setWrongByStage((current) => ({
        ...current,
        [stage]: nextWrong,
      }))
      setRetryMode(true)
      setTaskIndex(0)
      return
    }

    finishStage()
  }

  function addOrderPart(entry) {
    if (checked) return
    if (orderValue.some(([key]) => key === entry[0])) return
    setOrderValue((current) => [...current, entry])
  }

  function removeOrderPart(index) {
    if (checked) return
    setOrderValue((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  function restart() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(RESULT_KEY)
    setStage('intensive')
    setTaskIndex(0)
    setCompletedStages([])
    setWrongByStage({})
    setEverWrong([])
    setFirstCorrect([])
    setRetryMode(false)
    setSelected('')
    setOrderValue([])
    setChecked(false)
    setFinished(false)
  }

  if (finished) {
    const result = readJson(RESULT_KEY)

    return (
      <main className="reading-page">
        <div className="reading-shell">
          <Link to="/" className="reading-back">
            ← На главную
          </Link>

          <section className="reading-finish">
            <div className="reading-finish-mark">✓</div>
            <p className="reading-kicker">УРОК 1 · HSK 阅读</p>
            <h1>阅读训练完成</h1>
            <p>
              Ты прошла 精读, тренировку навыка и HSK-режим. Ошибки
              возвращались до правильного ответа.
            </p>

            <div className="reading-result-grid">
              <article>
                <strong>3 / 3</strong>
                <span>этапа</span>
              </article>
              <article>
                <strong>
                  {result?.firstCorrect ?? firstCorrect.length} /{' '}
                  {result?.totalTasks ?? 11}
                </strong>
                <span>с первой попытки</span>
              </article>
            </div>

            <div className="reading-finish-actions">
              <button type="button" className="reading-secondary" onClick={restart}>
                Пройти ещё раз
              </button>
              <Link to="/" className="reading-primary-link">
                Вернуться на главную
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  const stageNumber =
    stage === 'intensive' ? 1 : stage === 'skill' ? 2 : 3

  const stageTitle =
    stage === 'intensive'
      ? '精读 · Разбираем текст'
      : stage === 'skill'
        ? '阅读技能 · Тренируем навык'
        : 'HSK 模式 · Без подсказок'

  const progress = (completedStages.length / 3) * 100

  return (
    <main className="reading-page">
      <div className="reading-shell">
        <div className="reading-topbar">
          <Link to="/" className="reading-back">
            ← На главную
          </Link>
          <span>{stageNumber} / 3</span>
        </div>

        <section className="reading-header">
          <div>
            <p className="reading-kicker">УРОК 1 · 简单的爱情</p>
            <h1>HSK 阅读</h1>
            <p>{stageTitle}</p>
          </div>

          <div className="reading-progress-wrap">
            <div className="reading-progress-track">
              <div
                className="reading-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>{completedStages.length} / 3</span>
          </div>
        </section>

        <MoyuCompanion variant="reading" compact />

        {stage === 'intensive' && (
          <section className="reading-text-card">
            <div className="reading-text-head">
              <span>文</span>
              <div>
                <strong>{readingLesson1.intensiveText.title}</strong>
                <small>{readingLesson1.intensiveText.source}</small>
              </div>
            </div>

            <ChineseWordText
              as="p"
              className="reading-main-text"
              tokens={readingLesson1.intensiveText.tokens}
            />

            <p className="reading-hint">
              Здесь подсказка разрешена: наведи на отдельное слово, чтобы увидеть
              pinyin и перевод. В HSK 模式 подсказок уже не будет.
            </p>
          </section>
        )}

        {retryMode && (
          <div className="reading-retry">
            错题复习 · Ошибка остаётся в повторе до правильного ответа.
          </div>
        )}

        {currentTask && (
          <section className="reading-task-card">
            <div className="reading-step">
              <span>
                {currentTask.type === 'orderABC' ? '排' : '选'}
              </span>
              <strong>{currentTask.instruction}</strong>
            </div>

            {currentTask.source && (
              <p className="reading-source">{currentTask.source}</p>
            )}

            {currentTask.passage && (
              <div className="reading-passage">
                {currentTask.passage}
              </div>
            )}

            {currentTask.prompt && (
              <div className="reading-prompt">
                {stage !== 'exam' &&
                currentTask.promptPinyin &&
                currentTask.promptTranslation ? (
                  <ChineseText
                    pinyin={currentTask.promptPinyin}
                    translation={currentTask.promptTranslation}
                  >
                    {currentTask.prompt}
                  </ChineseText>
                ) : (
                  currentTask.prompt
                )}
              </div>
            )}

            {currentTask.type === 'choice' && (
              <div className="reading-options">
                {shuffleOptions(currentTask.options, currentTask.id).map((option) => {
                  const isSelected = selected === option
                  const isCorrect =
                    checked &&
                    normalize(option) === normalize(currentTask.answer)
                  const isWrong = checked && isSelected && !isCorrect

                  return (
                    <button
                      type="button"
                      key={option}
                      disabled={checked}
                      className={[
                        'reading-option',
                        isSelected ? 'selected' : '',
                        isCorrect ? 'correct' : '',
                        isWrong ? 'wrong' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setSelected(option)}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {currentTask.type === 'orderABC' && (
              <>
                <div className="reading-order-answer">
                  {orderValue.length === 0
                    ? 'Нажимай A / B / C в логическом порядке'
                    : orderValue.map(([key, text], index) => (
                        <button
                          type="button"
                          key={`${key}-${index}`}
                          disabled={checked}
                          onClick={() => removeOrderPart(index)}
                        >
                          <b>{key}</b> {text}
                        </button>
                      ))}
                </div>

                <div className="reading-order-bank">
                  {shuffledOrderParts.map(([key, text]) => (
                    <button
                      type="button"
                      key={key}
                      disabled={
                        checked ||
                        orderValue.some(([used]) => used === key)
                      }
                      onClick={() => addOrderPart([key, text])}
                    >
                      <b>{key}</b> {text}
                    </button>
                  ))}
                </div>
              </>
            )}

            {!checked ? (
              <button
                type="button"
                className="reading-main-button"
                disabled={
                  currentTask.type === 'orderABC'
                    ? orderValue.length !== 3
                    : !selected
                }
                onClick={checkTask}
              >
                Проверить
              </button>
            ) : (
              <div
                className={[
                  'reading-feedback',
                  taskCorrect ? 'correct' : 'wrong',
                ].join(' ')}
              >
                <strong>
                  {taskCorrect ? '✓ Верно' : '✕ Нужно исправить'}
                </strong>

                {!taskCorrect && (
                  <p className="reading-correct-answer">
                    Правильный ответ: {currentTask.answer}
                  </p>
                )}

                <p>{currentTask.explanation}</p>

                <button
                  type="button"
                  className="reading-main-button"
                  onClick={goNext}
                >
                  {retryMode
                    ? taskCorrect
                      ? 'Ошибка исправлена →'
                      : 'Повторить это задание →'
                    : taskIndex >= activeTasks.length - 1
                      ? 'Завершить этап →'
                      : 'Следующее →'}
                </button>
              </div>
            )}
          </section>
        )}

        {stage === 'exam' && (
          <p className="reading-exam-note">
            HSK 模式: во время задания нет pinyin, перевода и подсказок.
          </p>
        )}
      </div>
    </main>
  )
}

export default ReadingPage
