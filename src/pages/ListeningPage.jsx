import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import ChineseWordText from '../components/ChineseWordText.jsx'
import MoyuCompanion from '../components/MoyuCompanion.jsx'
import listeningLesson1, {
  listeningLesson1Meta,
} from '../data/listeningLesson1.js'
import './ListeningPage.css'
import { recordLearningError } from '../utils/learningStore.js'
import { shuffleOptions } from '../utils/shuffleOptions.js'
import { mediaUrl } from '../utils/mediaUrl.js'

const STORAGE_KEY = 'hsk4-listening-lesson1-session'
const RESULT_KEY = 'hsk4-listening-lesson1-result'
const DATA_VERSION = 2

const STAGES = ['texts', 'intensive', 'workbook', 'transfer']

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

function getInitial() {
  const saved = readJson(STORAGE_KEY)
  if (!saved || saved.version !== DATA_VERSION) return null
  return saved
}

function ListeningPage() {
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/lesson/lesson-1/day/1'
  const nextRoute = searchParams.get('next') || '/lesson/lesson-1/day/1?activity=lesson1-day1-speaking'
  const initial = useMemo(() => getInitial(), [])

  const [stage, setStage] = useState(initial?.stage ?? 'texts')
  const [completedStages, setCompletedStages] = useState(
    Array.isArray(initial?.completedStages) ? initial.completedStages : [],
  )
  const [weakItems, setWeakItems] = useState(
    Array.isArray(initial?.weakItems) ? initial.weakItems : [],
  )
  const [showLibrary, setShowLibrary] = useState(false)
  const [finished, setFinished] = useState(initial?.finished ?? false)

  const [textIndex, setTextIndex] = useState(initial?.textIndex ?? 0)
  const [textAnswers, setTextAnswers] = useState(initial?.textAnswers ?? {})
  const [textFirstCorrect, setTextFirstCorrect] = useState(
    initial?.textFirstCorrect ?? [],
  )

  const [dictIndex, setDictIndex] = useState(initial?.dictIndex ?? 0)
  const [dictInputs, setDictInputs] = useState([])
  const [dictChecked, setDictChecked] = useState(false)
  const [dictWrong, setDictWrong] = useState(initial?.dictWrong ?? [])
  const [dictRetry, setDictRetry] = useState(initial?.dictRetry ?? false)

  const [workbookAnswers, setWorkbookAnswers] = useState(
    initial?.workbookAnswers ?? {},
  )
  const [workbookChecked, setWorkbookChecked] = useState(false)
  const [workbookFirstCorrect, setWorkbookFirstCorrect] = useState(
    initial?.workbookFirstCorrect ?? null,
  )
  const [workbookRetry, setWorkbookRetry] = useState(false)

  const [transferAnswers, setTransferAnswers] = useState(
    initial?.transferAnswers ?? {},
  )
  const [transferAttempt, setTransferAttempt] = useState(
    initial?.transferAttempt ?? 1,
  )
  const [transferFirstCorrect, setTransferFirstCorrect] = useState(
    initial?.transferFirstCorrect ?? null,
  )
  const [transferChecked, setTransferChecked] = useState(false)
  const [transferReveal, setTransferReveal] = useState(false)

  const stageIndex = STAGES.indexOf(stage)

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: DATA_VERSION,
        stage,
        completedStages,
        weakItems,
        finished,
        textIndex,
        textAnswers,
        textFirstCorrect,
        dictIndex,
        dictWrong,
        dictRetry,
        workbookAnswers,
        workbookFirstCorrect,
        transferAnswers,
        transferAttempt,
        transferFirstCorrect,
        savedAt: new Date().toISOString(),
      }),
    )
  }, [
    stage,
    completedStages,
    weakItems,
    finished,
    textIndex,
    textAnswers,
    textFirstCorrect,
    dictIndex,
    dictWrong,
    dictRetry,
    workbookAnswers,
    workbookFirstCorrect,
    transferAnswers,
    transferAttempt,
    transferFirstCorrect,
  ])

  function addWeak(id) {
    setWeakItems((items) => (items.includes(id) ? items : [...items, id]))
  }

  function completeStage(stageId = stage) {
    const nextCompleted = completedStages.includes(stageId)
      ? completedStages
      : [...completedStages, stageId]

    if (stageId === 'transfer') {
      const result = {
        version: DATA_VERSION,
        lessonId: 'lesson-1',
        completed: true,
        completedStages: 4,
        totalStages: 4,
        textbookFirstCorrect: textFirstCorrect.length,
        textbookTotal: 5,
        workbookFirstCorrect: workbookFirstCorrect ?? 0,
        workbookTotal: 7,
        transferFirstCorrect: transferFirstCorrect ?? 0,
        transferTotal: 2,
        weakItems,
        sourceCoverage: {
          textbookAudio: '5/5',
          workbookBank: '22/22',
          hskTransfer: 'H41005 36–37',
        },
        completedAt: new Date().toISOString(),
      }

      localStorage.setItem(RESULT_KEY, JSON.stringify(result))
      setCompletedStages(nextCompleted)
      setFinished(true)
      return
    }

    setCompletedStages(nextCompleted)
    setStage(STAGES[STAGES.indexOf(stageId) + 1])
  }

  function restart() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(RESULT_KEY)

    setStage('texts')
    setCompletedStages([])
    setWeakItems([])
    setShowLibrary(false)
    setFinished(false)

    setTextIndex(0)
    setTextAnswers({})
    setTextFirstCorrect([])

    setDictIndex(0)
    setDictInputs([])
    setDictChecked(false)
    setDictWrong([])
    setDictRetry(false)

    setWorkbookAnswers({})
    setWorkbookChecked(false)
    setWorkbookFirstCorrect(null)
    setWorkbookRetry(false)

    setTransferAnswers({})
    setTransferAttempt(1)
    setTransferFirstCorrect(null)
    setTransferChecked(false)
    setTransferReveal(false)
  }

  if (finished) {
    const result = readJson(RESULT_KEY)

    return (
      <main className="listening-page">
        <div className="listening-shell">
          <Link to="/" className="listening-back">← На главную</Link>

          <section className="listening-finish">
            <div className="listening-finish-mark">✓</div>
            <p className="listening-kicker">УРОК 1 · 听力训练</p>
            <h1>听力训练完成</h1>

            <p>
              Аудирование урока 1 включает пять оригинальных текстов,
              задания 1–22 из рабочей тетради и отдельную тренировку на настоящем HSK-задании.
            </p>

            <div className="listening-result-grid">
              <article>
                <strong>{result?.textbookFirstCorrect ?? textFirstCorrect.length} / 5</strong>
                <span>课文 — с первой попытки</span>
              </article>

              <article>
                <strong>{result?.workbookFirstCorrect ?? workbookFirstCorrect ?? 0} / 7</strong>
                <span>Рабочая тетрадь 6–12 · с первой попытки</span>
              </article>

              <article>
                <strong>{result?.transferFirstCorrect ?? transferFirstCorrect ?? 0} / 2</strong>
                <span>H41005 — первое прослушивание</span>
              </article>
            </div>

            <div className="coverage-card">
              <strong>Источник закрыт полностью</strong>
              <span>Тексты учебника 5 / 5 · рабочая тетрадь 22 / 22 · настоящее HSK-задание</span>
            </div>

            <div className="listening-finish-actions">
              <Link to={nextRoute} className="listening-primary-link">
                Перейти к следующему заданию →
              </Link>

              <Link to={returnTo} className="listening-plan-link">
                Вернуться к плану дня
              </Link>

              <button type="button" className="listening-secondary" onClick={restart}>
                Пройти ещё раз
              </button>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="listening-page">
      <div className="listening-shell">
        <div className="listening-topbar">
          <Link to="/" className="listening-back">← На главную</Link>

          <button
            type="button"
            className="audio-library-button"
            onClick={() => setShowLibrary((value) => !value)}
          >
            🎧 音频库 · 5课文 + 22题
          </button>
        </div>

        {showLibrary && <AudioLibrary />}

        <section className="listening-header">
          <div>
            <p className="listening-kicker">УРОК 1 · 简单的爱情</p>
            <h1>{stageTitle(stage)}</h1>
            <p>{stageSubtitle(stage)}</p>
          </div>

          <div className="listening-progress-wrap">
            <div className="listening-progress-track">
              <div
                className="listening-progress-fill"
                style={{ width: `${(completedStages.length / 4) * 100}%` }}
              />
            </div>
            <span>{stageIndex + 1} / 4</span>
          </div>
        </section>

        <MoyuCompanion variant="listening" compact />

        {stage === 'texts' && (
          <TextbookStage
            index={textIndex}
            answers={textAnswers}
            setAnswers={setTextAnswers}
            firstCorrect={textFirstCorrect}
            setFirstCorrect={setTextFirstCorrect}
            onWeak={addWeak}
            onNext={() => {
              if (textIndex >= listeningLesson1.textbookTracks.length - 1) {
                completeStage('texts')
              } else {
                setTextIndex((value) => value + 1)
              }
            }}
          />
        )}

        {stage === 'intensive' && (
          <IntensiveStage
            index={dictIndex}
            setIndex={setDictIndex}
            inputs={dictInputs}
            setInputs={setDictInputs}
            checked={dictChecked}
            setChecked={setDictChecked}
            wrong={dictWrong}
            setWrong={setDictWrong}
            retry={dictRetry}
            setRetry={setDictRetry}
            onWeak={addWeak}
            onComplete={() => completeStage('intensive')}
          />
        )}

        {stage === 'workbook' && (
          <WorkbookStage
            answers={workbookAnswers}
            setAnswers={setWorkbookAnswers}
            checked={workbookChecked}
            setChecked={setWorkbookChecked}
            firstCorrect={workbookFirstCorrect}
            setFirstCorrect={setWorkbookFirstCorrect}
            retry={workbookRetry}
            setRetry={setWorkbookRetry}
            onWeak={addWeak}
            onComplete={() => completeStage('workbook')}
          />
        )}

        {stage === 'transfer' && (
          <TransferStage
            answers={transferAnswers}
            setAnswers={setTransferAnswers}
            attempt={transferAttempt}
            setAttempt={setTransferAttempt}
            firstCorrect={transferFirstCorrect}
            setFirstCorrect={setTransferFirstCorrect}
            checked={transferChecked}
            setChecked={setTransferChecked}
            reveal={transferReveal}
            setReveal={setTransferReveal}
            onWeak={addWeak}
            onComplete={() => completeStage('transfer')}
          />
        )}
      </div>
    </main>
  )
}

function stageTitle(stage) {
  return {
    texts: '01 课文听力',
    intensive: '02 精听 · 微听写',
    workbook: '03 练习册 · HSK题型',
    transfer: '04 真题迁移',
  }[stage]
}

function stageSubtitle(stage) {
  return {
    texts: 'Все пять оригинальных аудиотекстов учебника HSK Standard Course 4A, урок 1.',
    intensive: 'Слушаем знакомый текст глубже и восстанавливаем ключевые фразы.',
    workbook: 'Оригинальная запись рабочей тетради: задания 6–12, короткие диалоги.',
    transfer: 'Настоящее HSK-задание: проверяем понимание нового текста без подсказок.',
  }[stage]
}

function TextbookStage({
  index,
  answers,
  setAnswers,
  firstCorrect,
  setFirstCorrect,
  onWeak,
  onNext,
}) {
  const track = listeningLesson1.textbookTracks[index]
  const [checked, setChecked] = useState(false)
  const [played, setPlayed] = useState(false)

  useEffect(() => {
    setChecked(false)
    setPlayed(false)
  }, [track.id])

  const selected = answers[track.id] ?? ''
  const correct = checked && normalize(selected) === normalize(track.answer)

  function check() {
    if (!selected || !played) return

    setChecked(true)

    if (normalize(selected) === normalize(track.answer)) {
      setFirstCorrect((items) =>
        items.includes(track.id) ? items : [...items, track.id],
      )
    } else {
      onWeak(`textbook-${track.id}`)
      recordLearningError({
        lessonId: 'lesson-1',
        module: 'listening',
        type: 'listening_memory',
        itemId: `textbook-${track.id}`,
        title: `课文${track.number} · ${track.title}`,
        prompt: track.question,
        mode: 'choice',
        options: track.options,
        answer: track.answer,
        userAnswer: selected,
        explanation: track.explanation,
        pinyin: track.answerPinyin,
        translation: track.answerTranslation,
        audioPath: track.audio,
        route: '/listening',
      })
    }
  }

  return (
    <section className="listening-card">
      <TaskCounter current={index + 1} total={5} />

      <div className="listening-step">
        <span>听</span>
        <div>
          <strong>课文{track.number} · {track.title}</strong>
          <small>Сначала только аудио и вопрос. Текст откроется после проверки.</small>
        </div>
      </div>

      <audio
        className="main-audio"
        src={mediaUrl(track.audio)}
        controls
        preload="metadata"
        onPlay={() => setPlayed(true)}
      />

      <div className="listen-question">{track.question}</div>

      <div className="listen-options">
        {shuffleOptions(track.options, track.id).map((option) => (
          <button
            type="button"
            key={option}
            disabled={checked}
            className={[
              selected === option ? 'selected' : '',
              checked && normalize(option) === normalize(track.answer) ? 'correct' : '',
              checked &&
              selected === option &&
              normalize(option) !== normalize(track.answer)
                ? 'wrong'
                : '',
            ].filter(Boolean).join(' ')}
            onClick={() =>
              setAnswers((current) => ({ ...current, [track.id]: option }))
            }
          >
            {option}
          </button>
        ))}
      </div>

      {!checked ? (
        <button
          type="button"
          className="listening-main-button"
          disabled={!selected || !played}
          onClick={check}
        >
          Проверить
        </button>
      ) : (
        <div className={['listen-feedback', correct ? 'correct' : 'wrong'].join(' ')}>
          <strong>{correct ? '✓ Верно' : '✕ Нужно обратить внимание'}</strong>

          <div className="correct-listen-answer">
            <span>Ответ:</span>
            <ChineseText
              pinyin={track.answerPinyin}
              translation={track.answerTranslation}
            >
              {track.answer}
            </ChineseText>
          </div>

          <p>{track.explanation}</p>

          <TranscriptBlock lines={track.transcript} />

          <button
            type="button"
            className="listening-main-button compact"
            onClick={onNext}
          >
            {index >= 4 ? 'К 精听 →' : 'Следующий 课文 →'}
          </button>
        </div>
      )}
    </section>
  )
}

function TranscriptBlock({ lines }) {
  return (
    <div className="transcript-block">
      <div className="transcript-head">
        <strong>文本 · После прослушивания</strong>
        <span>Наведи на предложение: pinyin + перевод.</span>
      </div>

      {lines.map((line, index) => (
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
  )
}

function IntensiveStage({
  index,
  setIndex,
  inputs,
  setInputs,
  checked,
  setChecked,
  wrong,
  setWrong,
  retry,
  setRetry,
  onWeak,
  onComplete,
}) {
  const base = listeningLesson1.intensiveTasks
  const active = retry
    ? base.filter((task) => wrong.includes(task.id))
    : base

  const task = active[Math.min(index, Math.max(0, active.length - 1))]

  useEffect(() => {
    setInputs(Array(task?.answers.length ?? 1).fill(''))
    setChecked(false)
  }, [task?.id, retry])

  if (!task) return null

  const correct =
    checked &&
    task.answers.every(
      (answer, answerIndex) =>
        normalize(inputs[answerIndex]) === normalize(answer),
    )

  function check() {
    if (inputs.some((value) => !value.trim())) return

    const isCorrect = task.answers.every(
      (answer, answerIndex) =>
        normalize(inputs[answerIndex]) === normalize(answer),
    )

    setChecked(true)

    if (!isCorrect) {
      setWrong((items) => (items.includes(task.id) ? items : [...items, task.id]))
      onWeak(`dictation-${task.id}`)
      recordLearningError({
        lessonId: 'lesson-1',
        module: 'listening',
        type: 'listening_memory',
        itemId: `dictation-${task.id}`,
        title: `精听 · ${task.trackLabel}`,
        prompt: `${task.promptBefore} ___ ${task.promptMiddle || ''} ___ ${task.promptAfter}`.replace(/___\s+___/, '___'),
        mode: 'input',
        answer: task.answers.join(' / '),
        acceptedAnswers: [task.answers.join(' / '), task.answers.join(' ')],
        userAnswer: inputs.join(' / '),
        pinyin: task.pinyin,
        translation: task.translation,
        audioPath: task.audio,
        route: '/listening',
      })
    }
  }

  function next() {
    const isCorrect = task.answers.every(
      (answer, answerIndex) =>
        normalize(inputs[answerIndex]) === normalize(answer),
    )

    const nextWrong = isCorrect
      ? wrong.filter((id) => id !== task.id)
      : wrong.includes(task.id)
        ? wrong
        : [...wrong, task.id]

    setWrong(nextWrong)

    if (retry && !isCorrect) {
      setInputs(Array(task.answers.length).fill(''))
      setChecked(false)
      return
    }

    if (index < active.length - 1) {
      setIndex((value) => value + 1)
      return
    }

    if (!retry && nextWrong.length > 0) {
      setRetry(true)
      setIndex(0)
      return
    }

    if (retry && nextWrong.length > 0) {
      setIndex(0)
      return
    }

    onComplete()
  }

  return (
    <section className="listening-card">
      <TaskCounter current={index + 1} total={active.length} />

      {retry && (
        <div className="listening-retry">
          错题复习 · Неверная микродиктовка возвращается до правильного ответа.
        </div>
      )}

      <div className="listening-step">
        <span>写</span>
        <div>
          <strong>{task.trackLabel}</strong>
          <small>Прослушай оригинальный текст и восстанови пропуски.</small>
        </div>
      </div>

      <audio className="main-audio" src={mediaUrl(task.audio)} controls preload="metadata" />

      <div className="dictation-line">
        <span>{task.promptBefore}</span>

        {task.answers.map((answer, answerIndex) => (
          <span key={`${task.id}-${answerIndex}`} className="dictation-slot">
            {answerIndex > 0 && task.promptMiddle && (
              <span className="dictation-middle">{task.promptMiddle}</span>
            )}

            <input
              value={inputs[answerIndex] ?? ''}
              disabled={checked}
              onChange={(event) =>
                setInputs((current) => {
                  const next = [...current]
                  next[answerIndex] = event.target.value
                  return next
                })
              }
              aria-label={`Пропуск ${answerIndex + 1}`}
            />
          </span>
        ))}

        <span>{task.promptAfter}</span>
      </div>

      {!checked ? (
        <button
          type="button"
          className="listening-main-button"
          disabled={inputs.some((value) => !value.trim())}
          onClick={check}
        >
          Проверить
        </button>
      ) : (
        <div className={['listen-feedback', correct ? 'correct' : 'wrong'].join(' ')}>
          <strong>{correct ? '✓ Верно' : '✕ Нужно исправить'}</strong>

          <ChineseText
            as="p"
            className="dictation-answer"
            pinyin={task.pinyin}
            translation={task.translation}
          >
            {task.full}
          </ChineseText>

          <button
            type="button"
            className="listening-main-button compact"
            onClick={next}
          >
            {retry && !correct ? 'Повторить →' : 'Следующее →'}
          </button>
        </div>
      )}
    </section>
  )
}

function WorkbookStage({
  answers,
  setAnswers,
  checked,
  setChecked,
  firstCorrect,
  setFirstCorrect,
  retry,
  setRetry,
  onWeak,
  onComplete,
}) {
  const allItems = listeningLesson1.workbookDailyNumbers.map((number) =>
    listeningLesson1.workbookBank.find((item) => item.number === number),
  )

  const wrongNumbers = checked
    ? allItems
        .filter((item) => normalize(answers[item.number]) !== normalize(item.answer))
        .map((item) => item.number)
    : []

  const visibleItems =
    retry && firstCorrect !== null
      ? allItems.filter((item) =>
          normalize(answers[`first-${item.number}`]) !== normalize(item.answer),
        )
      : allItems

  function submit() {
    const score = allItems.filter(
      (item) => normalize(answers[item.number]) === normalize(item.answer),
    ).length

    if (firstCorrect === null) {
      setFirstCorrect(score)

      setAnswers((current) => {
        const next = { ...current }
        allItems.forEach((item) => {
          next[`first-${item.number}`] = current[item.number] ?? ''
        })
        return next
      })
    }

    allItems.forEach((item) => {
      if (normalize(answers[item.number]) !== normalize(item.answer)) {
        onWeak(`workbook-${item.number}`)
        recordLearningError({
          lessonId: 'lesson-1',
          module: 'listening',
          type: 'listening_memory',
          itemId: `workbook-${item.number}`,
          title: `练习册 · 第${item.number}题`,
          prompt: item.question,
          mode: 'choice',
          options: item.options,
          answer: item.answer,
          userAnswer: answers[item.number] || '',
          explanation: item.explanation || '',
          pinyin: item.answerPinyin || '',
          translation: item.answerTranslation || '',
          audioPath: '/audio/listening/lesson1/wb-01-2-q06-12.mp3',
          route: '/listening',
        })
      }
    })

    setChecked(true)
  }

  function next() {
    if (wrongNumbers.length > 0) {
      setRetry(true)
      setChecked(false)

      setAnswers((current) => {
        const next = { ...current }
        wrongNumbers.forEach((number) => {
          next[number] = ''
        })
        return next
      })
      return
    }

    onComplete()
  }

  return (
    <section className="listening-card workbook-card">
      {retry && (
        <div className="listening-retry">
          错题复习 · Повторяем только вопросы, которые были неверными.
        </div>
      )}

      <div className="listening-step">
        <span>卷</span>
        <div>
          <strong>练习册 第6–12题</strong>
          <small>Оригинальная запись. В полном наборе сохранены все 22 задания урока 1.</small>
        </div>
      </div>

      <audio
        className="main-audio"
        src={mediaUrl('/audio/listening/lesson1/wb-01-2-q06-12.mp3')}
        controls
        preload="metadata"
      />

      <div className="workbook-question-list">
        {visibleItems.map((item) => {
          const selected = answers[item.number] ?? ''
          const isCorrect =
            checked && normalize(selected) === normalize(item.answer)
          const isWrong = checked && selected && !isCorrect

          return (
            <article key={item.number} className="workbook-question">
              <div className="workbook-number">{item.number}</div>
              <strong>{item.question}</strong>

              <div className="workbook-options">
                {shuffleOptions(item.options, item.number).map((option, optionIndex) => (
                  <button
                    type="button"
                    key={option}
                    disabled={checked}
                    className={[
                      selected === option ? 'selected' : '',
                      checked && normalize(option) === normalize(item.answer)
                        ? 'correct'
                        : '',
                      isWrong && selected === option ? 'wrong' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() =>
                      setAnswers((current) => ({
                        ...current,
                        [item.number]: option,
                      }))
                    }
                  >
                    <b>{['A', 'B', 'C', 'D'][optionIndex]}</b>
                    {option}
                  </button>
                ))}
              </div>

              {checked && (
                <div className="workbook-review">
                  <ChineseText
                    pinyin={item.answerPinyin}
                    translation={item.answerTranslation}
                  >
                    {item.answer}
                  </ChineseText>
                  <span>{item.explanation}</span>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {!checked ? (
        <button
          type="button"
          className="listening-main-button"
          disabled={visibleItems.some((item) => !answers[item.number])}
          onClick={submit}
        >
          Проверить блок
        </button>
      ) : (
        <div className="workbook-summary">
          <strong>
            {visibleItems.length - wrongNumbers.length} / {visibleItems.length}
          </strong>
          <span>{wrongNumbers.length ? 'Есть ошибки для повтора.' : 'Блок выполнен.'}</span>

          <button
            type="button"
            className="listening-main-button compact"
            onClick={next}
          >
            {wrongNumbers.length ? 'Повторить ошибки →' : 'К 真题 →'}
          </button>
        </div>
      )}
    </section>
  )
}

function TransferStage({
  answers,
  setAnswers,
  attempt,
  setAttempt,
  firstCorrect,
  setFirstCorrect,
  checked,
  setChecked,
  reveal,
  setReveal,
  onWeak,
  onComplete,
}) {
  const transfer = listeningLesson1.transfer
  const audioRef = useRef(null)
  const [playedThisAttempt, setPlayedThisAttempt] = useState(false)

  const score = transfer.questions.filter(
    (item) => normalize(answers[item.id]) === normalize(item.answer),
  ).length

  function playOnce() {
    if (playedThisAttempt || !audioRef.current) return

    setPlayedThisAttempt(true)
    audioRef.current.currentTime = 0
    audioRef.current.play()
  }

  function check() {
    if (
      !playedThisAttempt ||
      transfer.questions.some((item) => !answers[item.id])
    ) {
      return
    }

    if (firstCorrect === null) {
      setFirstCorrect(score)
    }

    transfer.questions.forEach((item) => {
      if (normalize(answers[item.id]) !== normalize(item.answer)) {
        onWeak(`h41005-${item.id}`)
        recordLearningError({
          lessonId: 'lesson-1',
          module: 'listening',
          type: 'listening_memory',
          itemId: `h41005-${item.id}`,
          title: `H41005 · 第${item.number}题`,
          prompt: item.question,
          mode: 'choice',
          options: item.options,
          answer: item.answer,
          userAnswer: answers[item.id] || '',
          pinyin: item.answerPinyin || '',
          translation: item.answerTranslation || '',
          audioPath: transfer.audio,
          route: '/listening',
        })
      }
    })

    setChecked(true)
  }

  function next() {
    if (score === transfer.questions.length) {
      setReveal(true)
      return
    }

    if (attempt === 1) {
      const wrongIds = transfer.questions
        .filter((item) => normalize(answers[item.id]) !== normalize(item.answer))
        .map((item) => item.id)

      setAnswers((current) => {
        const next = { ...current }
        wrongIds.forEach((id) => {
          next[id] = ''
        })
        return next
      })

      setAttempt(2)
      setChecked(false)
      setPlayedThisAttempt(false)
      return
    }

    setReveal(true)
  }

  if (reveal) {
    return (
      <section className="listening-card">
        <div className="listening-step">
          <span>析</span>
          <div>
            <strong>真题复盘 · H41005 36–37</strong>
            <small>Экзаменационное задание выполнено; теперь можно открыть текст и разобрать ответ.</small>
          </div>
        </div>

        <div className="transfer-score">
          Первое прослушивание: <strong>{firstCorrect ?? 0} / 2</strong>
        </div>

        <ChineseWordText
          as="p"
          className="transfer-transcript"
          tokens={transfer.transcriptTokens}
        />

        <div className="transfer-answer-grid">
          {transfer.questions.map((item) => (
            <article key={item.id}>
              <b>{item.number}. {item.question}</b>
              <ChineseText
                pinyin={item.answerPinyin}
                translation={item.answerTranslation}
              >
                {item.answer}
              </ChineseText>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="listening-main-button"
          onClick={onComplete}
        >
          Завершить 听力训练
        </button>
      </section>
    )
  }

  return (
    <section className="listening-card">
      <audio ref={audioRef} src={mediaUrl(transfer.audio)} preload="auto" />

      <div className="listening-step">
        <span>真</span>
        <div>
          <strong>H41005 · 第36–37题</strong>
          <small>
            {attempt === 1
              ? 'Первое прослушивание: без текста и подсказок.'
              : 'Второе прослушивание: исправь только то, что не услышала с первого раза.'}
          </small>
        </div>
      </div>

      <button
        type="button"
        className="transfer-play-button"
        disabled={playedThisAttempt}
        onClick={playOnce}
      >
        {playedThisAttempt ? '▶ Прослушивание использовано' : `▶ 听第${attempt === 1 ? '一' : '二'}遍`}
      </button>

      <div className="transfer-questions">
        {transfer.questions.map((item) => (
          <article key={item.id}>
            <strong>{item.number}. {item.question}</strong>

            <div className="listen-options">
              {shuffleOptions(item.options, item.id).map((option) => (
                <button
                  type="button"
                  key={option}
                  disabled={checked}
                  className={[
                    answers[item.id] === option ? 'selected' : '',
                    checked && normalize(option) === normalize(item.answer)
                      ? 'correct'
                      : '',
                    checked &&
                    answers[item.id] === option &&
                    normalize(option) !== normalize(item.answer)
                      ? 'wrong'
                      : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() =>
                    setAnswers((current) => ({
                      ...current,
                      [item.id]: option,
                    }))
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {!checked ? (
        <button
          type="button"
          className="listening-main-button"
          disabled={
            !playedThisAttempt ||
            transfer.questions.some((item) => !answers[item.id])
          }
          onClick={check}
        >
          Проверить
        </button>
      ) : (
        <div className={['listen-feedback', score === 2 ? 'correct' : 'wrong'].join(' ')}>
          <strong>{score} / 2</strong>
          <p>
            {score === 2
              ? 'Смысл перенесён в незнакомый HSK-контекст.'
              : attempt === 1
                ? 'Есть ошибка. Получишь второе прослушивание без показа текста.'
                : 'После второго прослушивания откроем разбор.'}
          </p>

          <button
            type="button"
            className="listening-main-button compact"
            onClick={next}
          >
            {score === 2
              ? 'Открыть разбор →'
              : attempt === 1
                ? '听第二遍 →'
                : 'Открыть разбор →'}
          </button>
        </div>
      )}
    </section>
  )
}

function AudioLibrary() {
  return (
    <section className="audio-library">
      <div className="audio-library-head">
        <div>
          <p className="listening-kicker">АУДИО УРОКА 1</p>
          <h2>Все оригинальные записи</h2>
        </div>

        <div className="audio-library-counts">
          <span>课文 5 / 5</span>
          <span>练习册 22 / 22</span>
        </div>
      </div>

      <div className="audio-library-section">
        <h3>Standard Course 4A · 课文1–5</h3>

        <div className="audio-library-grid">
          {listeningLesson1.sourceAudioLibrary.textbook.map((item) => (
            <article key={item.id}>
              <strong>{item.label}</strong>
              <small>{item.duration} · {item.source}</small>
              <audio src={mediaUrl(item.audio)} controls preload="metadata" />
            </article>
          ))}
        </div>
      </div>

      <div className="audio-library-section">
        <h3>Рабочая тетрадь · 听力 1–22</h3>

        <div className="audio-library-grid workbook">
          {listeningLesson1.sourceAudioLibrary.workbook.map((item) => (
            <article key={item.id}>
              <strong>{item.label}</strong>
              <small>{item.duration} · {item.source}</small>
              <audio src={mediaUrl(item.audio)} controls preload="metadata" />
            </article>
          ))}
        </div>

        <p className="bank-note">
          Все 22 вопроса и правильные ответы также сохранены в data-банке.
          В сегодняшнем маршруте используются задания 6–12. Задания 1–5 входят
          в мини-тест HSK, а 13–22 будут возвращаться в дальнейших тренировках.
        </p>
      </div>
    </section>
  )
}

function TaskCounter({ current, total }) {
  return <div className="listening-task-counter">{current} / {total}</div>
}

export default ListeningPage
