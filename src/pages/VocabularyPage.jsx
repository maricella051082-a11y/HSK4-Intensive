import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import {
  vocabularyLesson1 as coreWords,
  vocabularyLesson1All,
  vocabularyLesson1Meta,
  vocabularyLesson1NonCore,
  vocabularyLesson1Tasks,
} from '../data/vocabularyLesson1.js'
import './VocabularyPage.css'
import {
  recordLearningError,
  recordVocabularyExposure,
} from '../utils/learningStore.js'
import { shuffleOptions } from '../utils/shuffleOptions.js'

const STORAGE_KEY = 'hsk4-vocabulary-lesson1-session'
const RESULT_KEY = 'hsk4-vocabulary-lesson1-result'
const DATA_VERSION = 3

const STAGES = [
  'meaning',
  'sound',
  'reverse',
  'collocations',
  'context',
  'contrasts',
  'recognition',
]

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function shuffle(items) {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

function normalize(text) {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[，,。.!！?？；;：:、]/g, '')
    .trim()
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
  utterance.rate = 0.84

  const voices = window.speechSynthesis.getVoices()
  const chineseVoice = voices.find((voice) =>
    voice.lang?.toLowerCase().startsWith('zh'),
  )

  if (chineseVoice) {
    utterance.voice = chineseVoice
  }

  window.speechSynthesis.speak(utterance)
}

function getInitial() {
  const saved = readJson(STORAGE_KEY)

  if (!saved || saved.version !== DATA_VERSION) {
    return null
  }

  return saved
}

function findWord(id) {
  return vocabularyLesson1All.find((word) => word.id === id)
}

const supplementalVocabularyHints = [
  ['我', 'wǒ', 'я'], ['很', 'hěn', 'очень'], ['你', 'nǐ', 'ты'],
  ['你们', 'nǐmen', 'вы'], ['的', 'de', 'определительная частица'],
  ['从来', 'cónglái', 'никогда; когда-либо'], ['不', 'bù', 'не'],
  ['没', 'méi', 'не; не было'], ['迟到', 'chídào', 'опаздывать'],
  ['每天', 'měitiān', 'каждый день'], ['去过', 'qùguo', 'бывать; посещать'],
  ['日本', 'Rìběn', 'Япония'], ['这件', 'zhè jiàn', 'эта (для одежды)'],
  ['衣服', 'yīfu', 'одежда'], ['适合', 'shìhé', 'подходить'],
  ['嫉妒', 'jídù', 'завидовать; ревновать (негативно)'],
  ['过', 'guo', 'показатель прошлого опыта'], ['事物', 'shìwù', 'предмет; вещь'],
  ['人', 'rén', 'человек'],
]

const vocabularyHintEntries = (() => {
  const hints = new Map()

  vocabularyLesson1All.forEach((word) => {
    hints.set(word.hanzi, {
      pinyin: word.pinyin,
      translation: word.translation,
    })
    word.sourceTokens?.forEach((token) => {
      if (!hints.has(token.hanzi)) hints.set(token.hanzi, token)
    })
  })

  supplementalVocabularyHints.forEach(([hanzi, pinyin, translation]) => {
    if (!hints.has(hanzi)) hints.set(hanzi, { pinyin, translation })
  })

  return [...hints.entries()].sort(([left], [right]) => right.length - left.length)
})()

function VocabularyTextWithHints({ text }) {
  const remainingParts = []
  let remaining = String(text ?? '')

  while (remaining) {
    const match = vocabularyHintEntries.find(([hanzi]) => remaining.startsWith(hanzi))

    if (match) {
      const [hanzi, hint] = match
      remainingParts.push({ hanzi, hint })
      remaining = remaining.slice(hanzi.length)
    } else {
      remainingParts.push({ hanzi: remaining[0], hint: null })
      remaining = remaining.slice(1)
    }
  }

  return remainingParts.map(({ hanzi, hint }, index) => (
    hint ? (
      <ChineseText
        key={`${hanzi}-${index}`}
        pinyin={hint.pinyin}
        translation={hint.translation}
        tooltipPosition="bottom"
      >
        {hanzi}
      </ChineseText>
    ) : <span key={`${hanzi}-${index}`}>{hanzi}</span>
  ))
}

function makeWordOptions(word, count = 4) {
  const distractors = shuffle(
    coreWords.filter((item) => item.id !== word.id),
  ).slice(0, count - 1)

  return shuffle([word, ...distractors])
}


function WordByWordExample({ tokens = [], sentence, onSpeak }) {
  return (
    <div className="word-by-word-example">
      <div className="word-by-word-head">
        <span>例句 · пример</span>

        <button
          type="button"
          className="example-audio-button"
          onClick={() => onSpeak(sentence)}
        >
          🔊 Озвучить
        </button>
      </div>

      <p className="word-by-word-line">
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

      <small>
        Наведи на отдельное слово: pinyin + русский перевод.
      </small>
    </div>
  )
}

function VocabularyPage() {
  const initial = useMemo(() => getInitial(), [])

  const [stage, setStage] = useState(
    initial?.stage ?? 'meaning',
  )
  const [index, setIndex] = useState(
    initial?.index ?? 0,
  )
  const [completedStages, setCompletedStages] = useState(
    Array.isArray(initial?.completedStages)
      ? initial.completedStages
      : [],
  )
  const [meaningKnown, setMeaningKnown] = useState(
    Array.isArray(initial?.meaningKnown)
      ? initial.meaningKnown
      : [],
  )
  const [meaningWeak, setMeaningWeak] = useState(
    Array.isArray(initial?.meaningWeak)
      ? initial.meaningWeak
      : [],
  )
  const [firstCorrect, setFirstCorrect] = useState(
    Array.isArray(initial?.firstCorrect)
      ? initial.firstCorrect
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
  const [retryMode, setRetryMode] = useState(
    initial?.retryMode ?? false,
  )
  const [revealed, setRevealed] = useState(false)
  const [selected, setSelected] = useState('')
  const [checked, setChecked] = useState(false)
  const [showBank, setShowBank] = useState(false)
  const [finished, setFinished] = useState(
    initial?.finished ?? false,
  )

  const stageIndex = STAGES.indexOf(stage)

  const soundWords = useMemo(
    () =>
      vocabularyLesson1Tasks.sound
        .map(findWord)
        .filter(Boolean),
    [],
  )

  const reverseWords = useMemo(
    () =>
      vocabularyLesson1Tasks.reverse
        .map(findWord)
        .filter(Boolean),
    [],
  )

  const baseItems = useMemo(() => {
    if (stage === 'meaning') return coreWords
    if (stage === 'sound') return soundWords
    if (stage === 'reverse') return reverseWords
    if (stage === 'collocations')
      return vocabularyLesson1Tasks.collocations
    if (stage === 'context')
      return vocabularyLesson1Tasks.context
    if (stage === 'contrasts')
      return vocabularyLesson1Tasks.contrasts
    return vocabularyLesson1Tasks.recognition
  }, [stage, soundWords, reverseWords])

  const activeItems = useMemo(() => {
    if (!retryMode || stage === 'meaning') {
      return baseItems
    }

    const wrongIds = wrongByStage[stage] ?? []

    return baseItems.filter((item) =>
      wrongIds.includes(item.id),
    )
  }, [baseItems, retryMode, wrongByStage, stage])

  const current =
    activeItems[
      Math.min(
        index,
        Math.max(0, activeItems.length - 1),
      )
    ]

  const currentCorrect = checked && current
    ? ['sound', 'reverse'].includes(stage)
      ? selected === current.id
      : normalize(selected) === normalize(current.answer)
    : false

  const completedInStage = Math.min(
    baseItems.length,
    retryMode
      ? baseItems.length - activeItems.length + Number(currentCorrect)
      : index + Number(currentCorrect),
  )

  const taskProgress = {
    current: index + 1,
    queueTotal: activeItems.length,
    completed: completedInStage,
    total: baseItems.length,
    retryMode,
  }

  const wordOptions = useMemo(() => {
    if (
      !current ||
      !['sound', 'reverse'].includes(stage)
    ) {
      return []
    }

    return makeWordOptions(current)
  }, [current?.id, stage, retryMode])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: DATA_VERSION,
        stage,
        index,
        completedStages,
        meaningKnown,
        meaningWeak,
        firstCorrect,
        wrongByStage,
        everWrong,
        retryMode,
        finished,
        savedAt: new Date().toISOString(),
      }),
    )
  }, [
    stage,
    index,
    completedStages,
    meaningKnown,
    meaningWeak,
    firstCorrect,
    wrongByStage,
    everWrong,
    retryMode,
    finished,
  ])

  useEffect(() => {
    setRevealed(false)
    setSelected('')
    setChecked(false)
  }, [stage, index, retryMode, current?.id])

  function completeStage() {
    const nextCompleted = completedStages.includes(stage)
      ? completedStages
      : [...completedStages, stage]

    if (stageIndex >= STAGES.length - 1) {
      const result = {
        version: DATA_VERSION,
        lessonId: 'lesson-1',
        completed: true,
        mastered: meaningKnown.length,
        coreTotal: vocabularyLesson1Meta.activeTotal,
        lessonBankTotal: vocabularyLesson1Meta.totalWords,
        firstCorrect: firstCorrect.length,
        weakCore: meaningWeak,
        weakTasks: everWrong,
        completedStages: STAGES.length,
        completedAt: new Date().toISOString(),
      }

      localStorage.setItem(
        RESULT_KEY,
        JSON.stringify(result),
      )
      setCompletedStages(nextCompleted)
      setFinished(true)
      return
    }

    setCompletedStages(nextCompleted)
    setStage(STAGES[stageIndex + 1])
    setIndex(0)
    setRetryMode(false)
  }

  function handleMeaning(known) {
    if (!current) return

    recordVocabularyExposure(current, known)

    if (!known) {
      recordLearningError({
        lessonId: 'lesson-1',
        module: 'vocabulary',
        type: 'word_unknown',
        itemId: `meaning-${current.id}`,
        title: current.hanzi,
        prompt: `Вспомнить значение: ${current.hanzi}`,
        answer: current.translation,
        pinyin: current.pinyin,
        translation: current.translation,
        route: '/vocabulary',
        wordId: current.id,
        reviewMode: 'srs',
      })
    }

    if (known) {
      setMeaningKnown((items) =>
        items.includes(current.id)
          ? items
          : [...items, current.id],
      )
      setMeaningWeak((items) =>
        items.filter((id) => id !== current.id),
      )
    } else {
      setMeaningWeak((items) =>
        items.includes(current.id)
          ? items
          : [...items, current.id],
      )
      setMeaningKnown((items) =>
        items.filter((id) => id !== current.id),
      )
    }

    const last = index >= activeItems.length - 1

    if (last) {
      completeStage()
    } else {
      setIndex((value) => value + 1)
    }
  }

  function getAnswerValue() {
    if (['sound', 'reverse'].includes(stage)) {
      return selected
    }

    return selected
  }

  function expectedValue() {
    if (stage === 'sound' || stage === 'reverse') {
      return current.id
    }

    return current.answer
  }

  function checkTask() {
    if (!current || !selected) return

    const correct =
      normalize(getAnswerValue()) ===
      normalize(expectedValue())

    setChecked(true)

    if (stage === 'recognition') {
      const recognitionWord = vocabularyLesson1All.find(
        (word) => word.hanzi === current.answer,
      )

      if (recognitionWord) {
        recordVocabularyExposure(recognitionWord, correct)
      }
    }

    if (!correct && ['sound', 'reverse'].includes(stage)) {
      recordVocabularyExposure(current, false)
    }

    if (!retryMode && correct) {
      setFirstCorrect((items) =>
        items.includes(current.id)
          ? items
          : [...items, current.id],
      )
    }

    if (!correct) {
      const answerWord =
        stage === 'recognition'
          ? vocabularyLesson1All.find((word) => word.hanzi === current.answer)
          : ['sound', 'reverse'].includes(stage)
            ? current
            : null

      const isDirectWordError = Boolean(answerWord)

      recordLearningError({
        lessonId: 'lesson-1',
        module: 'vocabulary',
        type: stage === 'sound' ? 'word_sound' : 'word_unknown',
        itemId: `${stage}-${current.id}`,
        title: stageTitle(stage),
        prompt:
          stage === 'sound'
            ? 'Прослушай слово и выбери иероглиф.'
            : stage === 'reverse'
              ? current.translation
              : current.sentence ?? current.prompt ?? 'Лексическое задание',
        mode: isDirectWordError ? 'info' : 'choice',
        options: isDirectWordError ? [] : current.options ?? [],
        answer: isDirectWordError ? answerWord.hanzi : current.answer,
        pinyin: answerWord?.pinyin ?? '',
        translation: answerWord?.translation ?? '',
        audioText: stage === 'sound' ? current.hanzi : '',
        userAnswer: selected,
        explanation: current.explanation ?? '',
        route: '/vocabulary',
        wordId: answerWord?.id ?? '',
        reviewMode:
          isDirectWordError && answerWord?.priority !== 'C'
            ? 'srs'
            : 'notebook',
      })

      setEverWrong((items) =>
        items.includes(current.id)
          ? items
          : [...items, current.id],
      )

      setWrongByStage((state) => {
        const wrong = state[stage] ?? []

        return {
          ...state,
          [stage]: wrong.includes(current.id)
            ? wrong
            : [...wrong, current.id],
        }
      })
    }
  }

  function goNext() {
    if (!checked || !current) return

    const correct =
      normalize(getAnswerValue()) ===
      normalize(expectedValue())

    const wrong = wrongByStage[stage] ?? []

    const nextWrong = correct
      ? wrong.filter((id) => id !== current.id)
      : wrong.includes(current.id)
        ? wrong
        : [...wrong, current.id]

    if (retryMode) {
      if (!correct) {
        setWrongByStage((state) => ({
          ...state,
          [stage]: nextWrong,
        }))
        setSelected('')
        setChecked(false)
        return
      }

      setWrongByStage((state) => ({
        ...state,
        [stage]: nextWrong,
      }))

      if (nextWrong.length > 0) {
        setIndex(0)
        setSelected('')
        setChecked(false)
        return
      }

      completeStage()
      return
    }

    const last = index >= activeItems.length - 1

    if (!last) {
      setIndex((value) => value + 1)
      return
    }

    if (nextWrong.length > 0) {
      setWrongByStage((state) => ({
        ...state,
        [stage]: nextWrong,
      }))
      setRetryMode(true)
      setIndex(0)
      return
    }

    completeStage()
  }

  function restart() {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(RESULT_KEY)
    setStage('meaning')
    setIndex(0)
    setCompletedStages([])
    setMeaningKnown([])
    setMeaningWeak([])
    setFirstCorrect([])
    setWrongByStage({})
    setEverWrong([])
    setRetryMode(false)
    setRevealed(false)
    setSelected('')
    setChecked(false)
    setShowBank(false)
    setFinished(false)
  }

  if (finished) {
    const result = readJson(RESULT_KEY)

    return (
      <main className="vocab-page">
        <div className="vocab-shell">
          <Link to="/" className="vocab-back">
            ← На главную
          </Link>

          <section className="vocab-finish">
            <div className="vocab-finish-mark">✓</div>
            <p className="vocab-kicker">УРОК 1 · 词汇激活</p>
            <h1>词汇训练完成</h1>

            <p>
              Активное ядро проверено, а полный словарь урока
              сохранён в базе: 32 / 32 слова.
            </p>

            <div className="vocab-result-grid">
              <article>
                <strong>
                  {result?.mastered ?? meaningKnown.length} / 16
                </strong>
                <span>ядро вспомнено при первом просмотре</span>
              </article>

              <article>
                <strong>32 / 32</strong>
                <span>слова урока 1 присутствуют в полном словаре</span>
              </article>

              <article>
                <strong>
                  {result?.firstCorrect ?? firstCorrect.length}
                </strong>
                <span>проверяемых задач с первой попытки</span>
              </article>
            </div>

            <p className="vocab-srs-note">
              Повторение: важные активные слова возвращаются сегодня, завтра,
              затем примерно через 3, 7, 14 и 30 дней; слова на узнавание — реже.. C остаются контекстными.
            </p>

            <div className="vocab-finish-actions">
              <button
                type="button"
                className="vocab-secondary"
                onClick={restart}
              >
                Пройти ещё раз
              </button>

              <button
                type="button"
                className="vocab-secondary"
                onClick={() => setShowBank(true)}
              >
                Посмотреть 32 слова
              </button>

              <Link to="/" className="vocab-primary-link">
                Вернуться на главную
              </Link>
            </div>
          </section>

          {showBank && <LessonWordBank onClose={() => setShowBank(false)} />}
        </div>
      </main>
    )
  }

  return (
    <main className="vocab-page">
      <div className="vocab-shell">
        <div className="vocab-topbar">
          <Link to="/" className="vocab-back">
            ← На главную
          </Link>

          <button
            type="button"
            className="vocab-bank-button"
            onClick={() => setShowBank((value) => !value)}
          >
            词库 32 / 32
          </button>
        </div>

        {showBank && <LessonWordBank onClose={() => setShowBank(false)} />}

        <section className="vocab-header">
          <div>
            <p className="vocab-kicker">УРОК 1 · 简单的爱情</p>

            <h1>
              {stageTitle(stage)}
            </h1>

            <p>{stageSubtitle(stage)}</p>
          </div>

          <div className="vocab-stage-progress">
            <div className="vocab-progress-track">
              <div
                className="vocab-progress-fill"
                style={{
                  width: `${
                    (completedStages.length / STAGES.length) * 100
                  }%`,
                }}
              />
            </div>

            <span>
              {stageIndex + 1} / {STAGES.length}
            </span>
          </div>
        </section>

        {retryMode && (
          <div className="vocab-retry">
            错题复习 · Ошибка остаётся в повторе до правильного ответа.
          </div>
        )}

        {current && stage === 'meaning' && (
          <MeaningCard
            word={current}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onKnown={() => handleMeaning(true)}
            onWeak={() => handleMeaning(false)}
            progress={taskProgress}
          />
        )}

        {current && stage === 'sound' && (
          <SoundTask
            word={current}
            options={wordOptions}
            selected={selected}
            checked={checked}
            onSelect={setSelected}
            onCheck={checkTask}
            onNext={goNext}
            correct={checked && selected === current.id}
            retryMode={retryMode}
            progress={taskProgress}
          />
        )}

        {current && stage === 'reverse' && (
          <ReverseTask
            word={current}
            options={wordOptions}
            selected={selected}
            checked={checked}
            onSelect={setSelected}
            onCheck={checkTask}
            onNext={goNext}
            correct={checked && selected === current.id}
            retryMode={retryMode}
            progress={taskProgress}
          />
        )}

        {current &&
          ['collocations', 'context', 'contrasts', 'recognition'].includes(
            stage,
          ) && (
            <GenericChoiceTask
              task={current}
              stage={stage}
              selected={selected}
              checked={checked}
              onSelect={setSelected}
              onCheck={checkTask}
              onNext={goNext}
              correct={
                checked &&
                normalize(selected) === normalize(current.answer)
              }
              retryMode={retryMode}
              progress={taskProgress}
            />
          )}
      </div>
    </main>
  )
}

function stageTitle(stage) {
  const map = {
    meaning: '01 词义激活',
    sound: '02 听音辨词',
    reverse: '03 看义选词',
    collocations: '04 词语搭配',
    context: '05 语境运用',
    contrasts: '06 易混词',
    recognition: '07 词库识别',
  }

  return map[stage]
}

function stageSubtitle(stage) {
  const map = {
    meaning:
      '16 active core: сначала вспомни значение, только потом открывай ответ.',
    sound:
      '8 слов ядра: услышать слово → узнать иероглиф.',
    reverse:
      '8 слов ядра: русский смысл → выбрать иероглиф.',
    collocations:
      '6 частотных сочетаний из урока 1.',
    context:
      '6 предложений на лексику в контексте урока.',
    contrasts:
      '4 потенциально смешиваемых случая.',
    recognition:
      '8 контрольных заданий на B/C-лексику, чтобы остальные слова урока не исчезали.',
  }

  return map[stage]
}

function MeaningCard({
  word,
  revealed,
  onReveal,
  onKnown,
  onWeak,
  progress,
}) {
  return (
    <section className="vocab-card meaning-card">
      <TaskCounter {...progress} />

      <div className="meaning-hanzi">{word.hanzi}</div>

      {!revealed ? (
        <>
          <p className="meaning-instruction">
            Вспомни значение до открытия подсказки.
          </p>

          <button
            type="button"
            className="vocab-main-button"
            onClick={onReveal}
          >
            Показать значение
          </button>
        </>
      ) : (
        <div className="meaning-reveal">
          <button
            type="button"
            className="vocab-audio-button"
            onClick={() => speakChinese(word.hanzi)}
          >
            🔊 {word.hanzi}
          </button>

          <strong className="meaning-pinyin">{word.pinyin}</strong>
          <span className="meaning-translation">{word.translation}</span>

          <div className="source-context">
            <span>
              {word.source} · 原文
            </span>

            <WordByWordExample
              tokens={word.sourceTokens}
              sentence={word.sourceContext}
              onSpeak={speakChinese}
            />
          </div>

          <div className="collocation-row">
            {word.collocations.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          {word.contrast && (
            <div className="contrast-note">
              <b>Не перепутай: {word.contrast.with}</b>
              <span>{word.contrast.note}</span>
            </div>
          )}

          <p className="self-rate">
            Ты вспомнила значение до открытия?
          </p>

          <div className="meaning-actions">
            <button
              type="button"
              className="vocab-secondary"
              onClick={onWeak}
            >
              Повторить
            </button>

            <button
              type="button"
              className="vocab-main-button compact"
              onClick={onKnown}
            >
              Знаю
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function SoundTask({
  word,
  options,
  selected,
  checked,
  onSelect,
  onCheck,
  onNext,
  correct,
  retryMode,
  progress,
}) {
  return (
    <section className="vocab-card">
      <TaskCounter {...progress} />

      <div className="task-label">
        <span>听</span>
        <strong>Прослушай слово и выбери иероглиф.</strong>
      </div>

      <button
        type="button"
        className="big-audio-button"
        onClick={() => speakChinese(word.hanzi)}
      >
        🔊 播放
      </button>

      <div className="word-choice-grid">
        {options.map((option) => (
          <button
            type="button"
            key={option.id}
            disabled={checked}
            className={[
              selected === option.id ? 'selected' : '',
              checked && option.id === word.id ? 'correct' : '',
              checked &&
              selected === option.id &&
              option.id !== word.id
                ? 'wrong'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(option.id)}
          >
            {option.hanzi}
          </button>
        ))}
      </div>

      <TaskButtons
        checked={checked}
        disabled={!selected}
        correct={correct}
        retryMode={retryMode}
        onCheck={onCheck}
        onNext={onNext}
        answerWord={word}
        selectedWord={options.find((option) => option.id === selected)}
      />
    </section>
  )
}

function ReverseTask({
  word,
  options,
  selected,
  checked,
  onSelect,
  onCheck,
  onNext,
  correct,
  retryMode,
  progress,
}) {
  return (
    <section className="vocab-card">
      <TaskCounter {...progress} />

      <div className="task-label">
        <span>义</span>
        <strong>Выбери слово по русскому значению.</strong>
      </div>

      <div className="reverse-prompt">{word.translation}</div>

      <div className="word-choice-grid">
        {options.map((option) => (
          <button
            type="button"
            key={option.id}
            disabled={checked}
            className={[
              selected === option.id ? 'selected' : '',
              checked && option.id === word.id ? 'correct' : '',
              checked &&
              selected === option.id &&
              option.id !== word.id
                ? 'wrong'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(option.id)}
          >
            {option.hanzi}
          </button>
        ))}
      </div>

      <TaskButtons
        checked={checked}
        disabled={!selected}
        correct={correct}
        retryMode={retryMode}
        onCheck={onCheck}
        onNext={onNext}
        answerWord={word}
        selectedWord={options.find((option) => option.id === selected)}
      />
    </section>
  )
}

function GenericChoiceTask({
  task,
  stage,
  selected,
  checked,
  onSelect,
  onCheck,
  onNext,
  correct,
  retryMode,
  progress,
}) {
  const prompt =
    stage === 'context' || stage === 'recognition'
      ? task.sentence ?? task.prompt
      : task.prompt
  const [explanationChinese = '', ...explanationTranslationParts] =
    String(task.explanation ?? '').split(/\s+—\s+/)
  const explanationTranslation = explanationTranslationParts.join(' — ')

  return (
    <section className="vocab-card">
      <TaskCounter {...progress} />

      <div className="task-label">
        <span>
          {stage === 'collocations'
            ? '搭'
            : stage === 'context'
              ? '境'
              : stage === 'contrasts'
                ? '辨'
                : '识'}
        </span>

        <strong>
          {stage === 'collocations'
            ? 'Выбери естественное сочетание.'
            : stage === 'context'
              ? 'Заполни пропуск по смыслу.'
              : stage === 'contrasts'
                ? 'Выбери более правильный вариант.'
                : 'Узнай слово из полного словаря урока 1.'}
        </strong>
      </div>

      <div className="generic-prompt">{prompt}</div>

      <div className="generic-options">
        {shuffleOptions(task.options, task.id).map((option) => (
          <button
            type="button"
            key={option}
            disabled={checked}
            className={[
              selected === option ? 'selected' : '',
              checked &&
              normalize(option) === normalize(task.answer)
                ? 'correct'
                : '',
              checked &&
              selected === option &&
              normalize(option) !== normalize(task.answer)
                ? 'wrong'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {!checked ? (
        <button
          type="button"
          className="vocab-main-button"
          disabled={!selected}
          onClick={onCheck}
        >
          Проверить
        </button>
      ) : (
        <div
          className={[
            'vocab-feedback',
            correct ? 'correct' : 'wrong',
          ].join(' ')}
        >
          <strong>{correct ? '✓ Верно' : '✕ Нужно исправить'}</strong>

          <p>
            Ваш ответ:{' '}
            <b><VocabularyTextWithHints text={selected} /></b>
          </p>

          {!correct && (
            <p>
              Правильный ответ:{' '}
              <b><VocabularyTextWithHints text={task.answer} /></b>
            </p>
          )}

          {task.explanation && (
            <p className="vocab-answer-explanation">
              <VocabularyTextWithHints text={explanationChinese} />
              {explanationTranslation ? ` — ${explanationTranslation}` : null}
            </p>
          )}

          <button
            type="button"
            className="vocab-main-button compact"
            onClick={onNext}
          >
            {retryMode && !correct
              ? 'Повторить это задание →'
              : 'Следующее →'}
          </button>
        </div>
      )}
    </section>
  )
}

function TaskButtons({
  checked,
  disabled,
  correct,
  retryMode,
  onCheck,
  onNext,
  answerWord,
  selectedWord,
}) {
  if (!checked) {
    return (
      <button
        type="button"
        className="vocab-main-button"
        disabled={disabled}
        onClick={onCheck}
      >
        Проверить
      </button>
    )
  }

  return (
    <div
      className={[
        'vocab-feedback',
        correct ? 'correct' : 'wrong',
      ].join(' ')}
    >
      <strong>{correct ? '✓ Верно' : '✕ Нужно исправить'}</strong>

      <p>
        Ваш ответ:{' '}
        <b>
          <ChineseText
            pinyin={selectedWord?.pinyin || ''}
            translation={selectedWord?.translation || ''}
          >
            {selectedWord?.hanzi || '—'}
          </ChineseText>
        </b>
      </p>

      {!correct && (
        <p>
          Правильный ответ:{' '}
          <b>
            <ChineseText
              pinyin={answerWord.pinyin}
              translation={answerWord.translation}
            >
              {answerWord.hanzi}
            </ChineseText>
          </b>
        </p>
      )}

      <div className="answer-word">
        <ChineseText
          pinyin={answerWord.pinyin}
          translation={answerWord.translation}
        >
          {answerWord.hanzi}
        </ChineseText>

        <button
          type="button"
          className="mini-audio"
          onClick={() => speakChinese(answerWord.hanzi)}
        >
          🔊
        </button>
      </div>

      <WordByWordExample
        tokens={answerWord.sourceTokens}
        sentence={answerWord.sourceContext}
        onSpeak={speakChinese}
      />

      <p className="vocab-example-translation">
        {answerWord.exampleTranslation}
      </p>

      <button
        type="button"
        className="vocab-main-button compact"
        onClick={onNext}
      >
        {retryMode && !correct
          ? 'Повторить это задание →'
          : 'Следующее →'}
      </button>
    </div>
  )
}

function TaskCounter({ current, queueTotal, completed, total, retryMode }) {
  const remaining = Math.max(0, total - completed)

  return (
    <div className="task-counter">
      <strong>
        {retryMode ? `Повтор ошибки ${current} / ${queueTotal}` : `Карточка ${current} / ${total}`}
      </strong>
      <span>Выполнено: {completed} · Осталось: {remaining}</span>
    </div>
  )
}

function LessonWordBank({ onClose }) {
  return (
    <section className="lesson-bank">
      <div className="lesson-bank-head">
        <div>
          <p className="vocab-kicker">УРОК 1 · ПОЛНЫЙ СЛОВАРЬ</p>
          <h2>32 / 32 слова урока</h2>
          <p>
            A = нужно уметь активно употреблять · B = быстро узнавать · C = понимать в контексте.
          </p>
        </div>

        <button
          type="button"
          className="bank-close"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="bank-groups">
        {['A', 'B', 'C'].map((priority) => (
          <div className="bank-group" key={priority}>
            <h3>
              {priority === 'A'
                ? 'A · Active 16'
                : priority === 'B'
                  ? 'B · Recognition 12'
                  : 'C · Context 4'}
            </h3>

            <div className="bank-grid">
              {vocabularyLesson1All
                .filter((word) => word.priority === priority)
                .map((word) => (
                  <article key={word.id}>
                    <div className="bank-word-head">
                      <ChineseText
                        pinyin={word.pinyin}
                        translation={word.translation}
                      >
                        {word.hanzi}
                      </ChineseText>

                      <button
                        type="button"
                        onClick={() => speakChinese(word.hanzi)}
                      >
                        🔊
                      </button>
                    </div>

                    <span>{word.pinyin}</span>
                    <small>{word.translation}</small>

                    <WordByWordExample
                      tokens={word.sourceTokens}
                      sentence={word.sourceContext}
                      onSpeak={speakChinese}
                    />

                    <em>{word.source}</em>
                  </article>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default VocabularyPage
