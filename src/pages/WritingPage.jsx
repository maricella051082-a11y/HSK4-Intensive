import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import MoyuCompanion from '../components/MoyuCompanion.jsx'
import writingLesson1, {
  writingLesson1Meta,
} from '../data/writingLesson1.js'
import './WritingPage.css'
import { recordLearningError } from '../utils/learningStore.js'
import { mediaUrl } from '../utils/mediaUrl.js'

const STORAGE_KEY = 'hsk4-writing-lesson1-session'
const RESULT_KEY = 'hsk4-writing-lesson1-result'
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

function makeShuffledPieces(task) {
  const original = task.pieces.map((text, sourceIndex) => ({
    text,
    sourceIndex,
  }))

  let shuffled = shuffle(original)

  const originalOrder = shuffled.every(
    (item, index) => item.sourceIndex === index,
  )

  if (originalOrder && shuffled.length > 1) {
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

function speakChinese(text) {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window)
  ) {
    return
  }

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.88

  const voices = window.speechSynthesis.getVoices()
  const chineseVoice = voices.find((voice) =>
    voice.lang?.toLowerCase().startsWith('zh'),
  )

  if (chineseVoice) {
    utterance.voice = chineseVoice
  }

  window.speechSynthesis.speak(utterance)
}

function SentenceWithWordHints({
  tokens = [],
  sentence,
  label = 'Правильное предложение',
}) {
  return (
    <div className="writing-answer-support">
      <div className="writing-answer-support-head">
        <span>{label}</span>

        <button
          type="button"
          className="writing-audio-button"
          onClick={() => speakChinese(sentence)}
        >
          🔊 Озвучить
        </button>
      </div>

      <p className="writing-hinted-sentence">
        {tokens.map((token, index) => (
          <ChineseText
            key={`${token.hanzi}-${index}`}
            pinyin={token.pinyin}
            translation={token.translation}
          >
            {token.hanzi}
          </ChineseText>
        ))}
        <span aria-hidden="true">。</span>
      </p>

      <small>Наведи на отдельное слово: pinyin + русский перевод.</small>
    </div>
  )
}

function WritingPage() {
  const initial = useMemo(() => getInitialSession(), [])

  const [stage, setStage] = useState(
    initial?.stage ?? 'order',
  )

  const [taskIndex, setTaskIndex] = useState(
    initial?.taskIndex ?? 0,
  )

  const [completedStages, setCompletedStages] = useState(
    Array.isArray(initial?.completedStages)
      ? initial.completedStages
      : [],
  )

  const [wrongByStage, setWrongByStage] = useState(
    initial?.wrongByStage ?? {},
  )

  const [everWrong, setEverWrong] = useState(
    Array.isArray(initial?.everWrong)
      ? initial.everWrong
      : [],
  )

  const [firstCorrect, setFirstCorrect] = useState(
    Array.isArray(initial?.firstCorrect)
      ? initial.firstCorrect
      : [],
  )

  const [retryMode, setRetryMode] = useState(
    initial?.retryMode ?? false,
  )

  const [builtPieces, setBuiltPieces] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [checked, setChecked] = useState(false)

  const [pictureResponses, setPictureResponses] = useState(
    initial?.pictureResponses ?? {},
  )

  const [pictureSubmitted, setPictureSubmitted] = useState(false)

  const [finished, setFinished] = useState(
    initial?.finished ?? false,
  )

  const baseTasks = useMemo(() => {
    if (stage === 'order') {
      return writingLesson1.orderTasks
    }

    if (stage === 'typing') {
      return writingLesson1.typingTasks
    }

    return writingLesson1.pictureTasks
  }, [stage])

  const activeTasks = useMemo(() => {
    if (stage === 'picture' || !retryMode) {
      return baseTasks
    }

    const wrongIds = wrongByStage[stage] ?? []

    return baseTasks.filter((task) =>
      wrongIds.includes(task.id),
    )
  }, [
    stage,
    baseTasks,
    retryMode,
    wrongByStage,
  ])

  const currentTask =
    activeTasks[
      Math.min(
        taskIndex,
        Math.max(0, activeTasks.length - 1),
      )
    ]

  const orderBank = useMemo(
    () =>
      currentTask?.pieces
        ? makeShuffledPieces(currentTask)
        : [],
    [currentTask?.id, retryMode],
  )

  const builtText = builtPieces
    .map((item) => item.text)
    .join('')

  const answerValue =
    stage === 'order' ? builtText : inputValue

  const taskCorrect =
    checked && stage !== 'picture'
      ? (
          currentTask.accepted ??
          [currentTask.answer]
        ).some(
          (answer) =>
            normalize(answer) ===
            normalize(answerValue),
        )
      : false

  const keywordPresent =
    stage === 'picture' &&
    currentTask &&
    inputValue.includes(currentTask.keyword)

  const chineseCharacterCount = (
    inputValue.match(/[\u3400-\u9fff]/g) ?? []
  ).length

  const pictureReady =
    keywordPresent && chineseCharacterCount >= 6

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
        pictureResponses,
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
    pictureResponses,
    finished,
  ])

  useEffect(() => {
    setBuiltPieces([])
    setInputValue(
      stage === 'picture'
        ? pictureResponses[currentTask?.id] ?? ''
        : '',
    )
    setChecked(false)
    setPictureSubmitted(false)
  }, [
    stage,
    taskIndex,
    retryMode,
    currentTask?.id,
  ])

  function choosePiece(piece, index) {
    if (checked) return

    setBuiltPieces((current) => [
      ...current,
      {
        text: piece,
        sourceIndex: index,
      },
    ])
  }

  function removePiece(index) {
    if (checked) return

    setBuiltPieces((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    )
  }

  function isCurrentCorrect() {
    const accepted =
      currentTask.accepted ??
      [currentTask.answer]

    return accepted.some(
      (answer) =>
        normalize(answer) ===
        normalize(answerValue),
    )
  }

  function checkObjectiveTask() {
    if (!currentTask || !answerValue.trim()) {
      return
    }

    const correct = isCurrentCorrect()

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
        module: 'writing',
        type: 'word_order',
        itemId: `${stage}-${currentTask.id}`,
        title: currentTask.source || '写作练习',
        prompt:
          currentTask.prompt ||
          currentTask.instruction ||
          (currentTask.pieces ? `Собери: ${currentTask.pieces.join(' / ')}` : 'Восстанови предложение'),
        mode: 'input',
        answer: currentTask.answer,
        acceptedAnswers: currentTask.accepted || [currentTask.answer],
        userAnswer: answerValue,
        explanation: currentTask.explanation || '',
        route: '/writing',
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
          [stage]: wrong.includes(
            currentTask.id,
          )
            ? wrong
            : [...wrong, currentTask.id],
        }
      })
    }
  }

  function completeObjectiveStage() {
    const nextCompleted =
      completedStages.includes(stage)
        ? completedStages
        : [...completedStages, stage]

    setCompletedStages(nextCompleted)
    setStage(
      stage === 'order'
        ? 'typing'
        : 'picture',
    )
    setTaskIndex(0)
    setRetryMode(false)
  }

  function goNextObjective() {
    if (!checked || !currentTask) {
      return
    }

    const correct = isCurrentCorrect()
    const currentWrong =
      wrongByStage[stage] ?? []

    const nextWrong = correct
      ? currentWrong.filter(
          (id) => id !== currentTask.id,
        )
      : currentWrong.includes(
            currentTask.id,
          )
        ? currentWrong
        : [...currentWrong, currentTask.id]

    if (retryMode) {
      if (!correct) {
        setWrongByStage((current) => ({
          ...current,
          [stage]: nextWrong,
        }))
        setBuiltPieces([])
        setInputValue('')
        setChecked(false)
        return
      }

      setWrongByStage((current) => ({
        ...current,
        [stage]: nextWrong,
      }))

      if (nextWrong.length > 0) {
        setTaskIndex(0)
        setBuiltPieces([])
        setInputValue('')
        setChecked(false)
        return
      }

      completeObjectiveStage()
      return
    }

    const lastTask =
      taskIndex >= activeTasks.length - 1

    if (!lastTask) {
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

    completeObjectiveStage()
  }

  function submitPicture() {
    if (!currentTask || !pictureReady) {
      return
    }

    const nextResponses = {
      ...pictureResponses,
      [currentTask.id]: inputValue.trim(),
    }

    setPictureResponses(nextResponses)
    setPictureSubmitted(true)
  }

  function finishModule(finalResponses) {
    const nextCompleted =
      completedStages.includes('picture')
        ? completedStages
        : [...completedStages, 'picture']

    const result = {
      version: DATA_VERSION,
      lessonId: 'lesson-1',
      completed: true,
      completedStages:
        writingLesson1Meta.totalStages,
      totalStages:
        writingLesson1Meta.totalStages,
      objectiveCorrectFirst:
        firstCorrect.length,
      objectiveTotal:
        writingLesson1Meta.objectiveTotal,
      pictureSubmitted:
        Object.keys(finalResponses).length,
      pictureTotal:
        writingLesson1Meta.pictureTotal,
      pictureResponses: finalResponses,
      weakTasks: everWrong,
      pictureLanguageEvaluated: false,
      completedAt: new Date().toISOString(),
    }

    localStorage.setItem(
      RESULT_KEY,
      JSON.stringify(result),
    )

    setCompletedStages(nextCompleted)
    setFinished(true)
  }

  function nextPicture() {
    if (!pictureSubmitted || !currentTask) {
      return
    }

    const finalResponses = {
      ...pictureResponses,
      [currentTask.id]: inputValue.trim(),
    }

    const lastPicture =
      taskIndex >= activeTasks.length - 1

    if (lastPicture) {
      finishModule(finalResponses)
      return
    }

    setTaskIndex((current) => current + 1)
  }

  function restart() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(RESULT_KEY)

    setStage('order')
    setTaskIndex(0)
    setCompletedStages([])
    setWrongByStage({})
    setEverWrong([])
    setFirstCorrect([])
    setRetryMode(false)
    setBuiltPieces([])
    setInputValue('')
    setChecked(false)
    setPictureResponses({})
    setPictureSubmitted(false)
    setFinished(false)
  }

  if (finished) {
    const result = readJson(RESULT_KEY)

    return (
      <main className="writing-page">
        <div className="writing-shell">
          <Link
            to="/"
            className="writing-back"
          >
            ← На главную
          </Link>

          <section className="writing-finish">
            <div className="writing-finish-mark">
              ✓
            </div>

            <p className="writing-kicker">
              УРОК 1 · 写作练习
            </p>

            <h1>写作训练完成</h1>

            <p>
              句子排序 и controlled writing
              проверены автоматически. 看图造句
              сохранены отдельно: сайт не выдаёт
              фиктивную оценку грамматики свободного
              ответа.
            </p>

            <div className="writing-result-grid">
              <article>
                <strong>
                  {result?.objectiveCorrectFirst ??
                    firstCorrect.length}{' '}
                  /{' '}
                  {writingLesson1Meta.objectiveTotal}
                </strong>
                <span>
                  объективных заданий верно
                  с первой попытки
                </span>
              </article>

              <article>
                <strong>
                  {result?.pictureSubmitted ?? 2}{' '}
                  /{' '}
                  {writingLesson1Meta.pictureTotal}
                </strong>
                <span>
                  看图造句 отправлено на
                  языковую проверку
                </span>
              </article>
            </div>

            <p className="writing-review-note">
              В будущем эти 2 свободных ответа
              должны идти в teacher/AI-check слой:
              грамматика, естественность и
              уместность лексики.
            </p>

            <div className="writing-finish-actions">
              <button
                type="button"
                className="writing-secondary"
                onClick={restart}
              >
                Пройти ещё раз
              </button>

              <Link
                to="/"
                className="writing-primary-link"
              >
                Вернуться на главную
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  const stageNumber =
    stage === 'order'
      ? 1
      : stage === 'typing'
        ? 2
        : 3

  const stageTitle =
    stage === 'order'
      ? '句子排序 · Собери предложение'
      : stage === 'typing'
        ? '再写一遍 · Напиши без карточек'
        : '看图造句 · Картинка + слово'

  const progress =
    (completedStages.length /
      writingLesson1Meta.totalStages) *
    100

  const usedIndices = builtPieces.map(
    (item) => item.sourceIndex,
  )

  return (
    <main className="writing-page">
      <div className="writing-shell">
        <div className="writing-topbar">
          <Link
            to="/"
            className="writing-back"
          >
            ← На главную
          </Link>

          <span>{stageNumber} / 3</span>
        </div>

        <section className="writing-header">
          <div>
            <p className="writing-kicker">
              УРОК 1 · 简单的爱情
            </p>

            <h1>写作练习</h1>
            <p>{stageTitle}</p>
          </div>

          <div className="writing-progress-wrap">
            <div className="writing-progress-track">
              <div
                className="writing-progress-fill"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <span>
              {completedStages.length} / 3
            </span>
          </div>
        </section>

        <MoyuCompanion variant="writing" compact />

        {retryMode && (
          <div className="writing-retry">
            错题复习 · Ошибка остаётся
            в повторе до правильного ответа.
          </div>
        )}

        {currentTask && stage === 'order' && (
          <section className="writing-card">
            <div className="writing-step">
              <span>排</span>
              <div>
                <strong>
                  第{currentTask.number}题
                </strong>
                <small>
                  {currentTask.source}
                </small>
              </div>
            </div>

            <p className="writing-instruction">
              Собери предложение. Карточки
              специально перемешаны.
            </p>

            <div className="writing-answer-bank">
              {builtPieces.length === 0
                ? 'Нажимай карточки в нужном порядке'
                : builtPieces.map(
                    (item, index) => (
                      <button
                        type="button"
                        key={`${item.sourceIndex}-${index}`}
                        disabled={checked}
                        onClick={() =>
                          removePiece(index)
                        }
                      >
                        {item.text}
                      </button>
                    ),
                  )}
            </div>

            <div className="writing-piece-bank">
              {orderBank.map((item) => (
                <button
                  type="button"
                  key={`${item.text}-${item.sourceIndex}`}
                  disabled={
                    checked ||
                    usedIndices.includes(
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

            {!checked ? (
              <button
                type="button"
                className="writing-main-button"
                disabled={
                  builtPieces.length !==
                  currentTask.pieces.length
                }
                onClick={checkObjectiveTask}
              >
                Проверить
              </button>
            ) : (
              <ObjectiveFeedback
                correct={taskCorrect}
                task={currentTask}
                retryMode={retryMode}
                onNext={goNextObjective}
              />
            )}
          </section>
        )}

        {currentTask && stage === 'typing' && (
          <section className="writing-card">
            <div className="writing-step">
              <span>写</span>
              <div>
                <strong>
                  Напиши предложение целиком
                </strong>
                <small>
                  Новое задание по образцу рабочей тетради 第
                  {currentTask.sourceNumber}题
                </small>
              </div>
            </div>

            <div className="writing-russian-prompt">
              {currentTask.prompt}
            </div>

            <div className="writing-support">
              {currentTask.support.map(
                (item) => (
                  <span key={item}>{item}</span>
                ),
              )}
            </div>

            <textarea
              value={inputValue}
              disabled={checked}
              onChange={(event) =>
                setInputValue(
                  event.target.value,
                )
              }
              placeholder="Введите предложение по-китайски"
              rows={3}
            />

            {!checked ? (
              <button
                type="button"
                className="writing-main-button"
                disabled={!inputValue.trim()}
                onClick={checkObjectiveTask}
              >
                Проверить
              </button>
            ) : (
              <ObjectiveFeedback
                correct={taskCorrect}
                task={currentTask}
                retryMode={retryMode}
                onNext={goNextObjective}
              />
            )}
          </section>
        )}

        {currentTask && stage === 'picture' && (
          <section className="writing-card">
            <div className="writing-step">
              <span>图</span>
              <div>
                <strong>
                  第{currentTask.number}题 ·
                  看图，用词造句
                </strong>
                <small>
                  {currentTask.source}
                </small>
              </div>
            </div>

            <div className="writing-picture-layout">
              <img
                src={mediaUrl(currentTask.image)}
                alt={`рабочая тетрадь writing task ${currentTask.number}`}
              />

              <div className="writing-keyword">
                <span>必须使用 · обязательно:</span>

                <ChineseText
                  pinyin={
                    currentTask.keywordPinyin
                  }
                  translation={
                    currentTask.keywordTranslation
                  }
                >
                  {currentTask.keyword}
                </ChineseText>
              </div>
            </div>

            <p className="writing-exam-warning">
              Это свободное HSK-задание. Напиши
              одно естественное предложение по
              картинке и обязательно используй
              данное слово.
            </p>

            <textarea
              value={inputValue}
              disabled={pictureSubmitted}
              onChange={(event) =>
                setInputValue(
                  event.target.value,
                )
              }
              placeholder="Напишите одно предложение по-китайски"
              rows={4}
            />

            {!pictureSubmitted && (
              <div className="writing-structural-check">
                <span
                  className={
                    keywordPresent ? 'ok' : ''
                  }
                >
                  {keywordPresent ? '✓' : '○'} слово{' '}
                  {currentTask.keyword}
                </span>

                <span
                  className={
                    chineseCharacterCount >= 6
                      ? 'ok'
                      : ''
                  }
                >
                  {chineseCharacterCount >= 6
                    ? '✓'
                    : '○'}{' '}
                  полноценное предложение
                </span>
              </div>
            )}

            {!pictureSubmitted ? (
              <button
                type="button"
                className="writing-main-button"
                disabled={!pictureReady}
                onClick={submitPicture}
              >
                Отправить ответ
              </button>
            ) : (
              <div className="writing-picture-feedback">
                <strong>
                  Ответ сохранён — но не
                  объявлен «правильным»
                </strong>

                <p>
                  Автоматически проверено только
                  наличие обязательного слова и
                  достаточная длина. Грамматика и
                  естественность требуют отдельной
                  языковой проверки.
                </p>

                <div className="writing-reference">
                  <span>
                    参考表达 · пример после
                    своей попытки:
                  </span>

                  <SentenceWithWordHints
                    tokens={currentTask.sourceReferenceTokens}
                    sentence={currentTask.sourceReference}
                    label="参考表达"
                  />
                </div>

                <div className="writing-reference preferred">
                  <span>
                    另一种表达 · ещё один
                    естественный вариант:
                  </span>

                  <SentenceWithWordHints
                    tokens={currentTask.naturalVariantTokens}
                    sentence={currentTask.naturalVariant}
                    label="更自然"
                  />
                </div>

                <button
                  type="button"
                  className="writing-main-button"
                  onClick={nextPicture}
                >
                  {taskIndex >=
                  activeTasks.length - 1
                    ? 'Завершить 写作 →'
                    : 'Следующая картинка →'}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

function ObjectiveFeedback({
  correct,
  task,
  retryMode,
  onNext,
}) {
  return (
    <div
      className={[
        'writing-feedback',
        correct ? 'correct' : 'wrong',
      ].join(' ')}
    >
      <strong>
        {correct
          ? '✓ Верно'
          : '✕ Нужно исправить'}
      </strong>

      <SentenceWithWordHints
        tokens={task.tokens}
        sentence={task.answer}
        label={
          correct
            ? 'Правильное предложение'
            : 'Правильный ответ'
        }
      />

      <p>{task.explanation}</p>

      <button
        type="button"
        className="writing-main-button"
        onClick={onNext}
      >
        {retryMode
          ? correct
            ? 'Ошибка исправлена →'
            : 'Повторить это задание →'
          : 'Следующее →'}
      </button>
    </div>
  )
}

export default WritingPage
