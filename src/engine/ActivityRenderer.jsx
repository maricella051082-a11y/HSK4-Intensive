import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import ChineseTitle from '../components/ChineseTitle.jsx'
import { recordVocabularyExposure } from '../utils/learningStore.js'
import {
  getActivityRecord,
  moduleCompletionMatches,
  recordActivityAttempt,
  recordListeningLadderResult,
} from '../utils/activityStore.js'
import HskkCloudRecording from '../firebase/HskkCloudRecording.jsx'
import { saveHskkAudio } from '../firebase/hskkAudioStore.js'
import { analyzeHskkResponse } from '../utils/hskkAutoFeedback.js'
import { shuffleOptions } from '../utils/shuffleOptions.js'
import { mediaUrl } from '../utils/mediaUrl.js'
import './ActivityRenderer.css'

function normalize(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[，,。.!！?？；;：:、]/g, '')
    .trim()
}

function chineseCount(value) {
  return [...normalize(value)].filter((char) => /[\u3400-\u9fff]/.test(char)).length
}

function formatMinutes(seconds) {
  const minutes = Math.max(1, Math.round((Number(seconds) || 60) / 60))
  return `${minutes} мин`
}

const skillMeta = {
  vocabulary: ['词汇', 'cíhuì', 'лексика'],
  listening: ['听力', 'tīnglì', 'аудирование'],
  speaking: ['口语', 'kǒuyǔ', 'устная речь'],
  grammar: ['语法', 'yǔfǎ', 'грамматика'],
  reading: ['阅读', 'yuèdú', 'чтение'],
  writing: ['写作', 'xiězuò', 'письмо'],
  exam: ['考试', 'kǎoshì', 'экзамен'],
  review: ['复习', 'fùxí', 'повторение'],
}

function activityModeMeta(activity) {
  if (activity.examMode) return ['考试', 'kǎoshì', 'экзаменационный режим']
  if (activity.priority === 'core') return ['核心', 'héxīn', 'обязательный минимум']
  if (activity.priority === 'intensive') return ['强化', 'qiánghuà', 'усиленная тренировка']
  return ['标准', 'biāozhǔn', 'основная тренировка']
}

function getSkillMeta(skill) {
  return skillMeta[skill] ?? [skill ?? '学习', 'xuéxí', 'обучение']
}

function getRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function levenshteinDistance(a, b) {
  const left = [...normalize(a)]
  const right = [...normalize(b)]

  if (!left.length) return right.length
  if (!right.length) return left.length

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

export default function ActivityRenderer({ activity, onStatusChange }) {
  if (!activity) return null

  const renderers = {
    moduleLink: ModuleLinkActivity,
    info: InfoActivity,
    audioBank: AudioBankActivity,
    wordActivation: WordActivationActivity,
    wordBank: WordBankActivity,
    grammarGuide: GrammarGuideActivity,
    listeningLadder: ListeningLadderActivity,
    ttsChoice: TtsChoiceActivity,
    speechRepeat: SpeechActivity,
    speechPrompt: SpeechActivity,
    shadowing: ShadowingActivity,
    freeWriting: FreeWritingActivity,
    multipleChoice: ChoiceActivity,
    readingChoice: ChoiceActivity,
    audioChoice: ChoiceActivity,
    trueFalse: TrueFalseActivity,
    gapFill: GapFillActivity,
    typeChinese: GapFillActivity,
    sentenceOrder: SentenceOrderActivity,
    dragOrder: SentenceOrderActivity,
  }

  const Renderer = renderers[activity.type] ?? UnsupportedActivity

  return (
    <Renderer
      activity={activity}
      onStatusChange={onStatusChange}
    />
  )
}

function ActivityShell({ activity, children, record }) {
  return (
    <article className={`engine-activity engine-skill-${activity.skill || 'general'}`}>
      <div className="engine-activity-meta">
        <span className="engine-skill-chip">
          <ChineseText
            pinyin={getSkillMeta(activity.skill)[1]}
            translation={getSkillMeta(activity.skill)[2]}
            tooltipPosition="bottom"
          >
            {getSkillMeta(activity.skill)[0]}
          </ChineseText>
        </span>
        <span>
          <ChineseText
            pinyin={activityModeMeta(activity)[1]}
            translation={activityModeMeta(activity)[2]}
            tooltipPosition="bottom"
          >
            {activityModeMeta(activity)[0]}
          </ChineseText>
        </span>
        <span>{formatMinutes(activity.estimatedSeconds)}</span>
        {record?.completed && <span className="engine-done-chip">✓ 已完成</span>}
      </div>

      <div className="engine-activity-title-row">
        <div>
          <h3><ChineseTitle text={activity.title || activity.prompt} /></h3>
          {activity.translation && <p>{activity.translation}</p>}
        </div>
      </div>

      {children}
    </article>
  )
}

function ModuleLinkActivity({ activity }) {
  const completedFromModule = useMemo(
    () => activity.track !== false && moduleCompletionMatches(activity),
    [activity],
  )

  const record = getActivityRecord(activity.id)
  const completed = Boolean(record?.completed || completedFromModule)
  const destination = useMemo(() => {
    const params = new URLSearchParams()
    if (activity.moduleReturnTo) params.set('returnTo', activity.moduleReturnTo)
    if (activity.moduleNextRoute) params.set('next', activity.moduleNextRoute)
    const query = params.toString()
    if (!query) return activity.route
    return `${activity.route}${activity.route.includes('?') ? '&' : '?'}${query}`
  }, [activity])

  return (
    <ActivityShell
      activity={activity}
      record={completed ? { ...record, completed: true } : record}
    >
      {activity.description && (
        <p className="engine-description">{activity.description}</p>
      )}

      <div className="engine-module-actions">
        <Link to={destination} className="engine-primary-link">
          {completed ? 'Открыть снова' : 'Открыть раздел'} →
        </Link>
      </div>

      {activity.track !== false && (
        <p className="engine-module-note">
          Раздел засчитается автоматически после выполнения заданий внутри него.
          Отмечать его вручную не нужно.
        </p>
      )}
    </ActivityShell>
  )
}

function InfoActivity({ activity }) {
  return (
    <ActivityShell activity={activity}>
      {activity.instruction && (
        <p className="engine-description">{activity.instruction}</p>
      )}
      {activity.content && (
        <div className="engine-info-content">{activity.content}</div>
      )}
    </ActivityShell>
  )
}

function AudioBankActivity({ activity }) {
  return (
    <ActivityShell activity={activity}>
      {(activity.instruction || activity.description) && (
        <p className="engine-description">
          {activity.instruction || activity.description}
        </p>
      )}

      <div className="engine-audio-bank">
        {(activity.tracks || []).map((track) => (
          <article key={track.audio}>
            <div>
              <strong>{track.title || track.label}</strong>
              {track.description && <span>{track.description}</span>}
            </div>
            <audio controls preload="metadata" src={mediaUrl(track.audio)} />
          </article>
        ))}
      </div>

      {activity.note && (
        <p className="engine-module-note">{activity.note}</p>
      )}
    </ActivityShell>
  )
}

function WordTokens({ tokens, className = '' }) {
  if (!Array.isArray(tokens)) return null

  return (
    <span className={`engine-token-line ${className}`}>
      {tokens.map(([hanzi, pinyin, translation], index) => {
        if (!hanzi) return null

        if (/^[，。！？、；：,.!?;:]$/.test(hanzi)) {
          return <span key={`${hanzi}-${index}`} className="engine-token-punctuation">{hanzi}</span>
        }

        return (
          <ChineseText
            key={`${hanzi}-${index}`}
            pinyin={pinyin || ''}
            translation={translation || ''}
            tooltipPosition="top"
          >
            {hanzi}
          </ChineseText>
        )
      })}
    </span>
  )
}

function speakChinese(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.86
  window.speechSynthesis.speak(utterance)
}

function WordActivationActivity({ activity, onStatusChange }) {
  const words = (activity.words || []).filter((word) => word.priority === 'A')
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [known, setKnown] = useState(0)
  const [record, setRecord] = useState(() => getActivityRecord(activity.id))

  const current = words[index]

  function rate(remembered) {
    if (!current || !revealed) return

    recordVocabularyExposure(
      current,
      remembered,
      { lessonId: activity.lessonId || 'lesson-2' },
    )

    const nextKnown = known + Number(remembered)
    setKnown(nextKnown)

    if (index >= words.length - 1) {
      const next = recordActivityAttempt(activity, {
        correct: true,
        userAnswer: `${nextKnown}/${words.length}`,
      })
      setRecord(next)
      onStatusChange?.(next)
      return
    }

    setIndex((value) => value + 1)
    setRevealed(false)
  }

  if (!current || record?.completed) {
    return (
      <ActivityShell activity={activity} record={record}>
        <div className="engine-activation-finish">
          <strong>✓ Активная лексика пройдена</strong>
          <p>
            Все ключевые слова получили дату следующего повторения. Те, которые
            не вспомнились, вернутся раньше.
          </p>
        </div>
      </ActivityShell>
    )
  }

  return (
    <ActivityShell activity={activity} record={record}>
      <div className="engine-activation-counter">
        {index + 1} / {words.length}
      </div>

      <div className="engine-activation-word">
        <strong>{current.hanzi}</strong>

        {!revealed ? (
          <>
            <p>Сначала попробуй вспомнить значение и произношение.</p>
            <button
              type="button"
              className="engine-check-button"
              onClick={() => setRevealed(true)}
            >
              Показать ответ
            </button>
          </>
        ) : (
          <>
            <span>{current.pinyin}</span>
            <b>{current.translation}</b>

            <button
              type="button"
              className="engine-audio-play-button"
              onClick={() => speakChinese(current.hanzi)}
            >
              🔊 Озвучить слово
            </button>

            {current.example && (
              <div className="engine-activation-example">
                <WordTokens tokens={current.example} />
              </div>
            )}

            <div className="engine-activation-actions">
              <button type="button" onClick={() => rate(false)}>
                Нужно повторить
              </button>
              <button type="button" className="remembered" onClick={() => rate(true)}>
                Вспомнила до подсказки
              </button>
            </div>
          </>
        )}
      </div>
    </ActivityShell>
  )
}

function WordBankActivity({ activity }) {
  const groups = [
    {
      id: 'A',
      title: '重点词 · Нужно активно употреблять',
      words: (activity.words || []).filter((word) => word.priority === 'A'),
    },
    {
      id: 'B',
      title: '识别词 · Нужно быстро узнавать',
      words: (activity.words || []).filter((word) => word.priority !== 'A'),
    },
  ]

  return (
    <ActivityShell activity={activity}>
      <p className="engine-description">
        Нажимай на китайские слова в примерах: подсказка показывает пиньинь и перевод
        именно этого слова, а не всего предложения.
      </p>

      {groups.map((group) => (
        <section key={group.id} className="engine-word-group">
          <h4>{group.title}</h4>

          <div className="engine-word-grid">
            {group.words.map((word) => (
              <article className="engine-word-card" key={word.id}>
                <div className="engine-word-head">
                  <div>
                    <strong>{word.hanzi}</strong>
                    <span>{word.pinyin}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakChinese(word.hanzi)}
                    aria-label={`Озвучить ${word.hanzi}`}
                  >
                    🔊
                  </button>
                </div>

                <p>{word.translation}</p>
                <small>{word.source}</small>

                {word.example && (
                  <div className="engine-word-example">
                    <WordTokens tokens={word.example} />
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </ActivityShell>
  )
}

function GrammarGuideActivity({ activity }) {
  return (
    <ActivityShell activity={activity}>
      <p className="engine-description">
        Короткое правило → пример. В примерах каждое слово имеет отдельную подсказку.
      </p>

      <div className="engine-grammar-guide">
        {(activity.items || []).map((item) => (
          <article key={item.id}>
            <div className="engine-grammar-head">
              <div>
                <ChineseText
                  pinyin={item.pinyin}
                  translation={item.translation}
                >
                  {item.title}
                </ChineseText>
                <span>{item.translation}</span>
              </div>
            </div>

            <p>{item.explanation}</p>

            {(item.examples || []).map((tokens, index) => (
              <div className="engine-grammar-example" key={`${item.id}-${index}`}>
                <WordTokens tokens={tokens} />
                <button
                  type="button"
                  onClick={() =>
                    speakChinese(tokens.map((token) => token[0]).join(''))
                  }
                >
                  🔊 Озвучить
                </button>
              </div>
            ))}
          </article>
        ))}
      </div>
    </ActivityShell>
  )
}

function ChoiceActivity({ activity, onStatusChange }) {
  const options = useMemo(
    () => shuffleOptions(activity.options, activity.id),
    [activity.id, activity.options],
  )
  const [selected, setSelected] = useState('')
  const [checked, setChecked] = useState(false)
  const [record, setRecord] = useState(() => getActivityRecord(activity.id))
  const startedAt = useRef(Date.now())

  const correct =
    checked && normalize(selected) === normalize(activity.answer)

  function check() {
    if (!selected) return

    const isCorrect = normalize(selected) === normalize(activity.answer)
    const next = recordActivityAttempt(activity, {
      correct: isCorrect,
      userAnswer: selected,
      responseTimeMs: Date.now() - startedAt.current,
    })

    setChecked(true)
    setRecord(next)
    onStatusChange?.(next)
  }

  function retry() {
    setSelected('')
    setChecked(false)
    startedAt.current = Date.now()
  }

  return (
    <ActivityShell activity={activity} record={record}>
      {activity.audio && (
        <audio className="engine-audio" controls src={mediaUrl(activity.audio)} />
      )}

      {activity.passage && (
        <p className="engine-passage">{activity.passage}</p>
      )}

      {activity.instruction && (
        <p className="engine-description">{activity.instruction}</p>
      )}

      <p className="engine-prompt">{activity.prompt}</p>

      <div className="engine-choice-grid">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            disabled={checked}
            className={[
              selected === option ? 'selected' : '',
              checked && normalize(option) === normalize(activity.answer)
                ? 'correct'
                : '',
              checked &&
              selected === option &&
              normalize(option) !== normalize(activity.answer)
                ? 'wrong'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setSelected(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {!checked ? (
        <button
          type="button"
          className="engine-check-button"
          disabled={!selected}
          onClick={check}
        >
          Проверить
        </button>
      ) : (
        <Feedback
          activity={activity}
          correct={correct}
          onRetry={retry}
        />
      )}
    </ActivityShell>
  )
}

function TtsChoiceActivity({ activity, onStatusChange }) {
  const options = useMemo(
    () => shuffleOptions(activity.options, activity.id),
    [activity.id, activity.options],
  )
  const [selected, setSelected] = useState('')
  const [checked, setChecked] = useState(false)
  const [plays, setPlays] = useState(0)
  const [record, setRecord] = useState(() => getActivityRecord(activity.id))
  const startedAt = useRef(Date.now())

  const correct =
    checked && normalize(selected) === normalize(activity.answer)

  function play() {
    if (plays >= (activity.maxPlays || 2)) return

    if (activity.audio) {
      const source = new Audio(mediaUrl(activity.audio))
      source.play()
    } else {
      speakChinese(activity.ttsText)
    }

    setPlays((value) => value + 1)
  }

  function check() {
    if (!selected) return

    const isCorrect = normalize(selected) === normalize(activity.answer)
    const next = recordActivityAttempt(activity, {
      correct: isCorrect,
      userAnswer: selected,
      responseTimeMs: Date.now() - startedAt.current,
    })

    setChecked(true)
    setRecord(next)
    onStatusChange?.(next)
  }

  function retry() {
    setSelected('')
    setChecked(false)
    startedAt.current = Date.now()
  }

  return (
    <ActivityShell activity={activity} record={record}>
      <div className={`engine-tts-notice ${activity.audio ? 'authentic' : ''}`}>
        <strong>
          {activity.audio ? '🎧 Оригинальное аудио учебника' : '🎧 Учебное прослушивание'}
        </strong>
        <span>
          {activity.audio
            ? activity.sourceLabel || 'Запись из оригинального аудиокомплекта Standard Course 4.'
            : 'Здесь используется китайский голос браузера. Оригинальной записи этого текста пока нет в материалах сайта.'}
        </span>
      </div>

      {activity.instruction && (
        <p className="engine-description">{activity.instruction}</p>
      )}

      <button
        type="button"
        className="engine-audio-play-button"
        onClick={play}
        disabled={plays >= (activity.maxPlays || 2) || checked}
      >
        🔊 Прослушать {plays > 0 ? `ещё раз (${plays}/${activity.maxPlays || 2})` : ''}
      </button>

      <p className="engine-prompt">{activity.prompt}</p>

      <div className="engine-choice-grid">
        {options.map((option) => (
          <button
            type="button"
            key={option}
            disabled={checked}
            className={[
              selected === option ? 'selected' : '',
              checked && normalize(option) === normalize(activity.answer)
                ? 'correct'
                : '',
              checked &&
              selected === option &&
              normalize(option) !== normalize(activity.answer)
                ? 'wrong'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setSelected(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {!checked ? (
        <button
          type="button"
          className="engine-check-button"
          disabled={!selected || plays === 0}
          onClick={check}
        >
          Проверить
        </button>
      ) : (
        <>
          <Feedback activity={activity} correct={correct} onRetry={retry} />
          {activity.revealTokens && (
            <div className="engine-transcript-reveal">
              <strong>Ключевая фраза после проверки:</strong>
              <WordTokens tokens={activity.revealTokens} />
              <button
                type="button"
                onClick={() =>
                  speakChinese(activity.revealTokens.map((token) => token[0]).join(''))
                }
              >
                🔊
              </button>
            </div>
          )}
        </>
      )}
    </ActivityShell>
  )
}


function ListeningLadderActivity({ activity, onStatusChange }) {
  const options = useMemo(
    () => shuffleOptions(activity.options, activity.id),
    [activity.id, activity.options],
  )
  const [stage, setStage] = useState('exam')
  const [firstAnswer, setFirstAnswer] = useState('')
  const [secondAnswer, setSecondAnswer] = useState('')
  const [firstPlayed, setFirstPlayed] = useState(false)
  const [secondPlayed, setSecondPlayed] = useState(false)
  const [heardSelected, setHeardSelected] = useState([])
  const [heardChecked, setHeardChecked] = useState(false)
  const [dictation, setDictation] = useState('')
  const [dictationPlayed, setDictationPlayed] = useState(false)
  const [dictationChecked, setDictationChecked] = useState(false)
  const [record, setRecord] = useState(() => getActivityRecord(activity.id))

  const firstCorrect = normalize(firstAnswer) === normalize(activity.answer)
  const secondCorrect =
    secondAnswer
      ? normalize(secondAnswer) === normalize(activity.answer)
      : null

  const heardExpected = (activity.heardItems || [])
    .filter((item) => item.correct)
    .map((item) => item.id)

  const heardCorrect = heardChecked
    ? heardExpected.filter((id) => heardSelected.includes(id)).length +
      (activity.heardItems || []).filter(
        (item) => !item.correct && !heardSelected.includes(item.id),
      ).length
    : 0

  const heardTotal = (activity.heardItems || []).length
  const dictationCorrect =
    dictationChecked &&
    normalize(dictation) === normalize(activity.dictationAnswer)

  function playAudio(kind) {
    const path =
      kind === 'dictation'
        ? activity.dictationAudio || activity.audio
        : activity.audio

    if (!path) return
    const source = new Audio(mediaUrl(path))
    source.play()

    if (kind === 'first') setFirstPlayed(true)
    if (kind === 'second') setSecondPlayed(true)
    if (kind === 'dictation') setDictationPlayed(true)
  }

  function submitFirst() {
    if (!firstPlayed || !firstAnswer) return
    if (firstCorrect) {
      setStage('heard')
    } else {
      setStage('second')
    }
  }

  function submitSecond() {
    if (!secondPlayed || !secondAnswer) return
    setStage('heard')
  }

  function toggleHeard(id) {
    if (heardChecked) return
    setHeardSelected((items) =>
      items.includes(id)
        ? items.filter((item) => item !== id)
        : [...items, id],
    )
  }

  function finish() {
    const next = recordListeningLadderResult(activity, {
      firstAnswer,
      secondAnswer,
      firstListenCorrect: firstCorrect,
      secondListenCorrect: firstCorrect ? null : Boolean(secondCorrect),
      answerChanged: Boolean(secondAnswer && secondAnswer !== firstAnswer),
      heardCorrect,
      heardTotal,
      dictationCorrect,
      transcriptNeeded:
        !firstCorrect || !dictationCorrect || heardCorrect < heardTotal,
    })

    setRecord(next)
    setStage('done')
    onStatusChange?.(next)
  }

  if (record?.completed || stage === 'done') {
    return (
      <ActivityShell activity={activity} record={record}>
        <div className="engine-ladder-summary">
          <strong>✓ Лестница аудирования завершена</strong>
          <p>
            Первый ответ: {record?.firstListenCorrect ? 'верно' : 'нужно было уточнить'}
            {record?.secondListenCorrect === true ? ' · после второго прослушивания — верно' : ''}
          </p>
          {record?.listeningCategory && (
            <small>Категория: {record.listeningCategory}</small>
          )}
        </div>
      </ActivityShell>
    )
  }

  return (
    <ActivityShell activity={activity} record={record}>
      <div className="engine-ladder-steps" aria-label="Этапы аудирования">
        {[
          ['exam', '1', 'Первое прослушивание'],
          ['second', '2', 'Второй шанс'],
          ['heard', '3', 'Что было в записи?'],
          ['dictation', '4', 'Микродиктант'],
          ['transcript', '5', 'Разбор'],
        ].map(([id, number, label]) => (
          <span
            key={id}
            className={[
              stage === id ? 'active' : '',
              (stage === 'heard' && id === 'second' && firstCorrect) ? 'skipped' : '',
            ].filter(Boolean).join(' ')}
          >
            <b>{number}</b>{label}
          </span>
        ))}
      </div>

      {stage === 'exam' && (
        <div className="engine-ladder-panel">
          <p className="engine-description">
            Экзаменационный режим: запись звучит один раз. Сначала выбери ответ без текста и подсказок.
          </p>
          <button
            type="button"
            className="engine-audio-play-button"
            disabled={firstPlayed}
            onClick={() => playAudio('first')}
          >
            🔊 第1次 · Первое прослушивание
          </button>
          <p className="engine-prompt">{activity.prompt}</p>
          <div className="engine-choice-grid">
            {options.map((option) => (
              <button
                type="button"
                key={option}
                className={firstAnswer === option ? 'selected' : ''}
                onClick={() => setFirstAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="engine-check-button"
            disabled={!firstPlayed || !firstAnswer}
            onClick={submitFirst}
          >
            Зафиксировать ответ
          </button>
        </div>
      )}

      {stage === 'second' && (
        <div className="engine-ladder-panel">
          <p className="engine-description">
            Первый ответ пока не разбираем. Прослушай ещё раз и реши, хочешь ли изменить выбор.
          </p>
          <button
            type="button"
            className="engine-audio-play-button"
            disabled={secondPlayed}
            onClick={() => playAudio('second')}
          >
            🔊 再听一次 · Второе прослушивание
          </button>
          <p className="engine-prompt">{activity.prompt}</p>
          <div className="engine-choice-grid">
            {options.map((option) => (
              <button
                type="button"
                key={option}
                className={secondAnswer === option ? 'selected' : ''}
                onClick={() => setSecondAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="engine-check-button"
            disabled={!secondPlayed || !secondAnswer}
            onClick={submitSecond}
          >
            Продолжить разбор
          </button>
        </div>
      )}

      {stage === 'heard' && (
        <div className="engine-ladder-panel">
          <p className="engine-description">
            Отметь только то, что действительно помнишь из записи. Это проверяет распознавание ключевых слов, а не общий перевод.
          </p>
          <div className="engine-heard-grid">
            {(activity.heardItems || []).map((item) => {
              const selected = heardSelected.includes(item.id)
              const state = heardChecked
                ? item.correct === selected
                  ? 'correct'
                  : 'wrong'
                : selected
                  ? 'selected'
                  : ''
              return (
                <button
                  type="button"
                  key={item.id}
                  className={state}
                  onClick={() => toggleHeard(item.id)}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
          {!heardChecked ? (
            <button
              type="button"
              className="engine-check-button"
              onClick={() => setHeardChecked(true)}
            >
              Проверить услышанное
            </button>
          ) : (
            <button
              type="button"
              className="engine-check-button"
              onClick={() => setStage('dictation')}
            >
              К микродиктанту →
            </button>
          )}
        </div>
      )}

      {stage === 'dictation' && (
        <div className="engine-ladder-panel">
          <p className="engine-description">
            Ещё одно учебное прослушивание. Запиши только ключевой фрагмент, а не весь текст.
          </p>
          <button
            type="button"
            className="engine-audio-play-button"
            disabled={dictationPlayed}
            onClick={() => playAudio('dictation')}
          >
            🔊 Прослушать для микродиктанта
          </button>
          <p className="engine-prompt">{activity.dictationPrompt}</p>
          <input
            className="engine-text-input"
            value={dictation}
            disabled={dictationChecked}
            onChange={(event) => setDictation(event.target.value)}
            placeholder="Введите пропущенный фрагмент"
          />
          {!dictationChecked ? (
            <button
              type="button"
              className="engine-check-button"
              disabled={!dictationPlayed || !dictation.trim()}
              onClick={() => setDictationChecked(true)}
            >
              Проверить
            </button>
          ) : (
            <>
              <p className={dictationCorrect ? 'engine-ladder-ok' : 'engine-ladder-warn'}>
                {dictationCorrect
                  ? '✓ Верно'
                  : `Правильный фрагмент: ${activity.dictationAnswer}`}
              </p>
              <button
                type="button"
                className="engine-check-button"
                onClick={() => setStage('transcript')}
              >
                Открыть разбор →
              </button>
            </>
          )}
        </div>
      )}

      {stage === 'transcript' && (
        <div className="engine-ladder-panel">
          <div className="engine-ladder-result-grid">
            <article>
              <span>第1次</span>
              <strong>{firstCorrect ? '✓ верно' : '✕ ошибка'}</strong>
            </article>
            {!firstCorrect && (
              <article>
                <span>第2次</span>
                <strong>{secondCorrect ? '✓ верно' : '✕ ошибка'}</strong>
              </article>
            )}
            <article>
              <span>听到的词</span>
              <strong>{heardCorrect}/{heardTotal}</strong>
            </article>
            <article>
              <span>微听写</span>
              <strong>{dictationCorrect ? '✓' : 'повторить'}</strong>
            </article>
          </div>

          {activity.revealTokens && (
            <div className="engine-transcript-reveal">
              <strong>Ключ к ответу:</strong>
              <WordTokens tokens={activity.revealTokens} />
            </div>
          )}

          {activity.trapExplanation && (
            <div className="engine-ladder-trap">
              <strong>为什么？ · Где была ловушка</strong>
              <p>{activity.trapExplanation}</p>
            </div>
          )}

          <button
            type="button"
            className="engine-check-button"
            onClick={finish}
          >
            Завершить разбор
          </button>
        </div>
      )}
    </ActivityShell>
  )
}

function TrueFalseActivity({ activity, onStatusChange }) {
  return (
    <ChoiceActivity
      activity={{
        ...activity,
        options: activity.options || ['对', '错'],
      }}
      onStatusChange={onStatusChange}
    />
  )
}

function GapFillActivity({ activity, onStatusChange }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [record, setRecord] = useState(() => getActivityRecord(activity.id))
  const startedAt = useRef(Date.now())

  const accepted = useMemo(
    () => [activity.answer, ...(activity.acceptedAnswers || [])].filter(Boolean),
    [activity.answer, activity.acceptedAnswers],
  )

  const correct =
    checked && accepted.some((answer) => normalize(answer) === normalize(value))

  function check() {
    if (!value.trim()) return

    const isCorrect = accepted.some(
      (answer) => normalize(answer) === normalize(value),
    )

    const next = recordActivityAttempt(activity, {
      correct: isCorrect,
      userAnswer: value,
      responseTimeMs: Date.now() - startedAt.current,
    })

    setChecked(true)
    setRecord(next)
    onStatusChange?.(next)
  }

  function retry() {
    setValue('')
    setChecked(false)
    startedAt.current = Date.now()
  }

  return (
    <ActivityShell activity={activity} record={record}>
      {activity.audio && (
        <audio className="engine-audio" controls src={mediaUrl(activity.audio)} />
      )}

      {activity.instruction && (
        <p className="engine-description">{activity.instruction}</p>
      )}

      <p className="engine-prompt">{activity.prompt}</p>

      <input
        className="engine-text-input"
        value={value}
        disabled={checked}
        onChange={(event) => setValue(event.target.value)}
        placeholder={activity.placeholder || 'Введите ответ'}
      />

      {!checked ? (
        <button
          type="button"
          className="engine-check-button"
          disabled={!value.trim()}
          onClick={check}
        >
          Проверить
        </button>
      ) : (
        <Feedback
          activity={activity}
          correct={correct}
          onRetry={retry}
        />
      )}
    </ActivityShell>
  )
}

function SentenceOrderActivity({ activity, onStatusChange }) {
  const shuffled = useMemo(() => shuffle(activity.pieces || []), [activity.id])
  const [selected, setSelected] = useState([])
  const [checked, setChecked] = useState(false)
  const [record, setRecord] = useState(() => getActivityRecord(activity.id))
  const startedAt = useRef(Date.now())

  const built = selected.map((item) => item.text).join('')
  const allUsed = selected.length === shuffled.length
  const acceptedAnswers = [activity.answer, ...(activity.acceptedAnswers || [])].filter(Boolean)
  const isAccepted = acceptedAnswers.some((answer) => normalize(built) === normalize(answer))
  const correct = checked && isAccepted

  function addPiece(piece) {
    if (checked || selected.some((item) => item.key === piece.key)) return
    setSelected((items) => [...items, piece])
  }

  function removePiece(index) {
    if (checked) return
    setSelected((items) => items.filter((_, itemIndex) => itemIndex !== index))
  }

  function check() {
    if (!allUsed) return

    const isCorrect = acceptedAnswers.some((answer) => normalize(built) === normalize(answer))
    const next = recordActivityAttempt(activity, {
      correct: isCorrect,
      userAnswer: built,
      responseTimeMs: Date.now() - startedAt.current,
    })

    setChecked(true)
    setRecord(next)
    onStatusChange?.(next)
  }

  function retry() {
    setSelected([])
    setChecked(false)
    startedAt.current = Date.now()
  }

  return (
    <ActivityShell activity={activity} record={record}>
      {activity.instruction && (
        <p className="engine-description">{activity.instruction}</p>
      )}

      <div className="engine-order-answer">
        {selected.length === 0 ? (
          <span>Нажимай части в нужном порядке</span>
        ) : (
          selected.map((piece, index) => (
            <button
              type="button"
              key={`${piece.key}-selected-${index}`}
              disabled={checked}
              onClick={() => removePiece(index)}
            >
              {piece.text}
            </button>
          ))
        )}
      </div>

      <div className="engine-order-bank">
        {shuffled.map((piece) => {
          const used = selected.some((item) => item.key === piece.key)
          return (
            <button
              type="button"
              key={piece.key}
              disabled={checked || used}
              onClick={() => addPiece(piece)}
            >
              {piece.text}
            </button>
          )
        })}
      </div>

      {!checked ? (
        <button
          type="button"
          className="engine-check-button"
          disabled={!allUsed}
          onClick={check}
        >
          Проверить
        </button>
      ) : (
        <Feedback
          activity={activity}
          correct={correct}
          onRetry={retry}
        />
      )}
    </ActivityShell>
  )
}

function ShadowingActivity({ activity, onStatusChange }) {
  const [record, setRecord] = useState(() => getActivityRecord(activity.id))
  const [step, setStep] = useState(() => (getActivityRecord(activity.id)?.completed ? 5 : 0))
  const [plays, setPlays] = useState(0)
  const [retraining, setRetraining] = useState(false)
  const steps = activity.steps || []
  const current = steps[Math.min(step, steps.length - 1)]
  const showText = step === 1 || step === 2

  function play() {
    if (!activity.audio) return
    const audio = new Audio(mediaUrl(activity.audio))
    audio.play()
    setPlays((value) => value + 1)
  }

  function next() {
    if (step < steps.length - 1) {
      setStep((value) => value + 1)
      return
    }
    const nextRecord = recordActivityAttempt(activity, {
      correct: true,
      userAnswer: `shadowing-5-steps; plays=${plays}`,
    })
    setRecord(nextRecord)
    setRetraining(false)
    setStep(5)
    onStatusChange?.(nextRecord)
  }

  function restart() {
    setRetraining(true)
    setStep(0)
    setPlays(0)
  }

  return (
    <ActivityShell activity={activity} record={record}>
      <p className="engine-description">
        Один короткий фрагмент проходится пять раз: сначала только слух, затем с текстом,
        после этого синхронная речь и короткий пересказ без опоры.
      </p>
      <div className="engine-shadowing-steps">
        {steps.map((item, index) => (
          <span key={item.id} className={index < step || record?.completed ? 'done' : index === step ? 'active' : ''}>
            <b>{index + 1}</b><em>{item.chinese}</em><small>{item.translation}</small>
          </span>
        ))}
      </div>
      {(!record?.completed || retraining) ? (
        <div className="engine-shadowing-stage">
          <div className="engine-shadowing-stage-head">
            <strong>{step + 1}. {current?.chinese} · {current?.translation}</strong>
            <span>Прослушиваний: {plays}</span>
          </div>
          {step <= 3 && (
            <button type="button" className="engine-audio-play-button" onClick={play}>
              ▶ {step === 0 ? 'Слушать без текста' : step === 1 ? 'Слушать с текстом' : step === 2 ? 'Включить и повторять с паузой' : 'Включить для shadowing'}
            </button>
          )}
          {showText && activity.transcriptTokens?.length > 0 && (
            <div className="engine-shadowing-text"><WordTokens tokens={activity.transcriptTokens} /></div>
          )}
          {step === 0 && <p>Не открывай текст. Поймай тему, ударные слова и границы фраз.</p>}
          {step === 2 && <p>Повтори фрагмент по смысловым кускам. Сначала точность, затем скорость.</p>}
          {step === 3 && <p>Говори вслед за диктором с задержкой примерно в одно короткое слово. Текст скрыт.</p>}
          {step === 4 && <p>Не включай запись. Перескажи главную мысль своими словами в 2–4 фразах.</p>}
          <button type="button" className="engine-check-button" onClick={next}>
            {step === steps.length - 1 ? 'Завершить Shadowing ✓' : 'Шаг выполнен →'}
          </button>
        </div>
      ) : (
        <div className="engine-feedback correct">
          <strong>✓ 5 шагов завершены</strong>
          <p>Можно повторить тренировку без сброса учебного прогресса.</p>
          <button type="button" className="engine-retry-button" onClick={restart}>Пройти ещё раз</button>
        </div>
      )}
    </ActivityShell>
  )
}

function SpeechActivity({ activity, onStatusChange }) {
  const [record, setRecord] = useState(() => getActivityRecord(activity.id))
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [recordingUrl, setRecordingUrl] = useState('')
  const [audioSaveState, setAudioSaveState] = useState('')
  const [audioRefreshKey, setAudioRefreshKey] = useState(0)
  const [autoFeedback, setAutoFeedback] = useState(null)

  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const chunksRef = useRef([])
  const transcriptRef = useRef('')
  const startedAtRef = useRef(0)
  const timerRef = useRef(null)

  useEffect(() => () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
  }, [recordingUrl])

  async function persistAudio(blob, duration, text, feedback) {
    setAudioSaveState('saving')
    const result = await saveHskkAudio(blob, {
      slotId: `activity:${activity.id}`,
      kind: activity.type || 'speaking',
      activityId: activity.id,
      lessonId: activity.lessonId || '',
      day: activity.day || 0,
      sourceContext: 'activity-engine',
      label: activity.title || activity.prompt || activity.target || '',
      transcript: text || '',
      transcriptSource: text ? 'browser-speech-recognition' : '',
      autoFeedback: feedback || null,
      durationSeconds: duration,
      examMode: Boolean(activity.examMode),
    })
    setAudioSaveState(result?.status || 'local-only')
    setAudioRefreshKey((value) => value + 1)
  }

  async function start() {
    const Recognition = getRecognitionConstructor()

    if (!navigator.mediaDevices?.getUserMedia || !Recognition) {
      setError('Для записи и распознавания китайской речи нужен Chrome с доступом к микрофону.')
      return
    }

    try {
      setError('')
      setTranscript('')
      setAnalysis(null)
      setAutoFeedback(null)
      transcriptRef.current = ''

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data)
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
        setTranscript(transcriptRef.current)
      }

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          setError(`Распознавание речи: ${event.error}`)
        }
      }

      recorder.onstop = () => {
        const duration = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        )
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        const feedback = analyzeHskkResponse({
          kind: activity.type,
          transcript: transcriptRef.current,
          durationSeconds: duration,
          target: activity.target || '',
          categories: activity.categories || [],
          minSeconds: activity.minSeconds || 0,
          minCharacters: activity.minCharacters || 0,
          minCategories: activity.minCategories || 0,
        })
        setAutoFeedback(feedback)

        if (blob.size) {
          setRecordingUrl(URL.createObjectURL(blob))
          void persistAudio(blob, duration, transcriptRef.current, feedback)
        }

        window.setTimeout(() => {
          evaluate(transcriptRef.current, duration)
        }, 300)

        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      recognitionRef.current = recognition
      startedAtRef.current = Date.now()
      setSeconds(0)
      setIsRecording(true)

      timerRef.current = window.setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000))
      }, 250)

      recognition.start()
      recorder.start(500)
    } catch (captureError) {
      setError(
        captureError?.name === 'NotAllowedError'
          ? 'Разреши сайту доступ к микрофону.'
          : 'Не удалось начать запись.',
      )
    }
  }

  function stop() {
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

    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }

  function evaluate(text, duration) {
    if (activity.type === 'speechRepeat') {
      const similarity = similarityPercent(activity.target, text)
      const passed = similarity >= (activity.passPercent || 72)
      const result = { transcript: text, duration, similarity, passed }

      const next = recordActivityAttempt(activity, {
        correct: passed,
        userAnswer: text,
        responseTimeMs: duration * 1000,
      })

      setAnalysis(result)
      setRecord(next)
      onStatusChange?.(next)
      return
    }

    const normalizedText = normalize(text)
    const categoryResults = (activity.categories || []).map((category) => ({
      ...category,
      passed: (category.keywords || []).some((keyword) =>
        normalizedText.includes(normalize(keyword)),
      ),
    }))

    const categoriesPassed = categoryResults.filter((item) => item.passed).length
    const durationPassed = duration >= (activity.minSeconds || 15)
    const characters = chineseCount(text)
    const lengthPassed = characters >= (activity.minCharacters || 18)
    const structurePassed =
      categoriesPassed >= (activity.minCategories || Math.min(3, categoryResults.length))
    const passed = durationPassed && lengthPassed && structurePassed

    const result = {
      transcript: text,
      duration,
      characters,
      durationPassed,
      lengthPassed,
      structurePassed,
      categoriesPassed,
      categoryResults,
      passed,
    }

    const next = recordActivityAttempt(activity, {
      correct: passed,
      userAnswer: text,
      responseTimeMs: duration * 1000,
    })

    setAnalysis(result)
    setRecord(next)
    onStatusChange?.(next)
  }

  return (
    <ActivityShell activity={activity} record={record}>
      {activity.instruction && (
        <p className="engine-description">{activity.instruction}</p>
      )}

      {activity.image && (
        <img
          className="engine-speaking-image"
          src={mediaUrl(activity.image)}
          alt={activity.imageAlt || 'HSKK'}
        />
      )}

      {activity.type === 'speechPrompt' && activity.prompt && (
        <div className="engine-speaking-prompt">
          {activity.examMode ? (
            <span>{activity.prompt}</span>
          ) : (
            <ChineseText
              pinyin={activity.promptPinyin || ''}
              translation={activity.promptTranslation || ''}
            >
              {activity.prompt}
            </ChineseText>
          )}
        </div>
      )}

      {!activity.examMode && activity.supportWords?.length > 0 && (
        <div className="engine-speaking-support">
          <span>Можно опереться на:</span>
          <div>
            {activity.supportWords.map((item) => (
              <ChineseText
                key={item.hanzi}
                pinyin={item.pinyin}
                translation={item.translation}
              >
                {item.hanzi}
              </ChineseText>
            ))}
          </div>
        </div>
      )}

      {activity.audio && (
        <button
          type="button"
          className="engine-audio-play-button"
          disabled={isRecording}
          onClick={() => new Audio(mediaUrl(activity.audio)).play()}
        >
          ▶ Прослушать
        </button>
      )}

      <div className="engine-recorder">
        {!isRecording ? (
          <button type="button" onClick={start}>
            ● {analysis ? 'Записать ещё раз' : 'Начать запись'}
          </button>
        ) : (
          <button type="button" className="recording" onClick={stop}>
            ■ Остановить · {seconds} сек
          </button>
        )}
      </div>

      <HskkCloudRecording
        slotId={`activity:${activity.id}`}
        localUrl={recordingUrl}
        saveState={audioSaveState}
        refreshKey={audioRefreshKey}
        feedback={autoFeedback}
      />

      {isRecording && transcript && (
        <p className="engine-live-transcript">{transcript}</p>
      )}

      {error && <p className="engine-speech-error">{error}</p>}

      {analysis && activity.type === 'speechRepeat' && (
        <div className={`engine-speech-analysis ${analysis.passed ? 'passed' : 'needs-work'}`}>
          <strong>
            {analysis.passed
              ? `✓ Фраза воспроизведена достаточно близко · ${analysis.similarity}%`
              : `Нужно повторить ещё раз · ${analysis.similarity}%`}
          </strong>

          <p>Распознано: {analysis.transcript || 'речь не распознана'}</p>

          <div className="engine-repeat-target">
            <ChineseText
              pinyin={activity.targetPinyin || ''}
              translation={activity.targetTranslation || ''}
            >
              {activity.target}
            </ChineseText>
          </div>

          <small>
            Процент сравнивает распознанный текст с исходной фразой. Это не полноценная
            оценка произношения.
          </small>
        </div>
      )}

      {analysis && activity.type === 'speechPrompt' && (
        <div className={`engine-speech-analysis ${analysis.passed ? 'passed' : 'needs-work'}`}>
          <strong>
            {analysis.passed
              ? '✓ Структуры ответа достаточно для этого этапа'
              : 'Ответ пока слишком короткий или неполный'}
          </strong>

          <p>Распознано: {analysis.transcript || 'речь не распознана'}</p>

          <div className="engine-speaking-checks">
            <span className={analysis.durationPassed ? 'ok' : ''}>
              {analysis.duration} сек
            </span>
            <span className={analysis.lengthPassed ? 'ok' : ''}>
              {analysis.characters} иероглифов
            </span>
            <span className={analysis.structurePassed ? 'ok' : ''}>
              {analysis.categoriesPassed}/{activity.categories?.length || 0} смысловых частей
            </span>
          </div>

          <div className="engine-speaking-categories">
            {analysis.categoryResults.map((item) => (
              <span key={item.id} className={item.passed ? 'ok' : ''}>
                {item.passed ? '✓' : '○'} {item.label}
              </span>
            ))}
          </div>

          <small>
            Здесь проверяется только наличие речи и смысловая структура. Грамматика,
            естественность и произношение не получают фиктивный автоматический балл.
          </small>
        </div>
      )}
      {Array.isArray(record?.history) && record.history.length > 1 && (
        <details className="engine-speaking-history">
          <summary>История попыток · {record.history.length}</summary>
          <div>
            {[...record.history].reverse().slice(0, 5).map((item, index) => (
              <article key={`${item.at}-${index}`}>
                <strong>{item.correct ? '✓ зачтено' : '○ ещё тренировать'}</strong>
                <span>{item.responseTimeMs ? `${Math.round(item.responseTimeMs / 1000)} сек` : 'без времени'}</span>
                <p>{item.userAnswer || 'речь не распознана'}</p>
              </article>
            ))}
          </div>
        </details>
      )}
    </ActivityShell>
  )
}

function FreeWritingActivity({ activity, onStatusChange }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [record, setRecord] = useState(() => getActivityRecord(activity.id))

  const characters = chineseCount(value)
  const hasKeyword = activity.requiredKeyword
    ? normalize(value).includes(normalize(activity.requiredKeyword))
    : true
  const enough = characters >= (activity.minCharacters || 8)
  const ready = enough && hasKeyword

  function save() {
    if (!ready) return

    const next = recordActivityAttempt(activity, {
      correct: true,
      userAnswer: value,
    })

    setChecked(true)
    setRecord(next)
    onStatusChange?.(next)
  }

  return (
    <ActivityShell activity={activity} record={record}>
      {activity.image && (
        <img
          className="engine-writing-image"
          src={mediaUrl(activity.image)}
          alt={activity.imageAlt || 'Задание по картинке'}
        />
      )}

      <p className="engine-prompt">{activity.prompt}</p>

      <textarea
        className="engine-writing-textarea"
        value={value}
        disabled={checked}
        onChange={(event) => setValue(event.target.value)}
        placeholder={activity.placeholder || 'Напиши предложение по-китайски'}
      />

      <div className="engine-writing-checks">
        <span className={enough ? 'ok' : ''}>
          {characters}/{activity.minCharacters || 8} иероглифов
        </span>
        {activity.requiredKeyword && (
          <span className={hasKeyword ? 'ok' : ''}>
            слово «{activity.requiredKeyword}»
          </span>
        )}
      </div>

      {!checked ? (
        <button
          type="button"
          className="engine-check-button"
          disabled={!ready}
          onClick={save}
        >
          Сохранить ответ
        </button>
      ) : (
        <div className="engine-feedback correct">
          <strong>✓ Ответ сохранён</strong>
          <p>
            Сайт проверил только выполнение условия задания. Грамматика и естественность
            свободного предложения автоматически не оцениваются.
          </p>

          {activity.referenceTokens && (
            <div className="engine-reference-answer">
              <span>Один естественный вариант:</span>
              <WordTokens tokens={activity.referenceTokens} />
              <button
                type="button"
                onClick={() =>
                  speakChinese(activity.referenceTokens.map((token) => token[0]).join(''))
                }
              >
                🔊
              </button>
            </div>
          )}
        </div>
      )}
    </ActivityShell>
  )
}

function Feedback({ activity, correct, onRetry }) {
  return (
    <div className={`engine-feedback ${correct ? 'correct' : 'wrong'}`}>
      <strong>{correct ? '✓ Верно' : '✕ Нужно исправить'}</strong>

      {(!correct || activity.answerTokens) && (
        <div className="engine-correct-answer">
          <span>{correct ? 'Разбор ответа:' : 'Правильный ответ:'}</span>
          {activity.answerTokens ? (
            <>
              <WordTokens tokens={activity.answerTokens} />
              {activity.answer && /[\u3400-\u9fff]/.test(activity.answer) && (
                <button
                  type="button"
                  className="engine-audio-play-button"
                  onClick={() => speakChinese(activity.answer)}
                >
                  🔊 Озвучить ответ
                </button>
              )}
            </>
          ) : activity.answerPinyin || activity.answerTranslation ? (
            <ChineseText
              pinyin={activity.answerPinyin || ''}
              translation={activity.answerTranslation || ''}
            >
              {activity.answer}
            </ChineseText>
          ) : (
            <b>{activity.answer}</b>
          )}
        </div>
      )}

      {activity.explanation && !activity.examMode && (
        <p>{activity.explanation}</p>
      )}

      {!correct && (
        <button
          type="button"
          className="engine-retry-button"
          onClick={onRetry}
        >
          Исправить →
        </button>
      )}
    </div>
  )
}

function UnsupportedActivity({ activity }) {
  return (
    <ActivityShell activity={activity}>
      <p className="engine-description">
        Это упражнение пока недоступно. Вернись к нему позже.
      </p>
    </ActivityShell>
  )
}

function shuffle(items) {
  const result = items.map((item, index) => {
    if (item && typeof item === 'object' && 'text' in item) {
      return {
        text: item.text,
        key: item.key || `${index}-${item.text}`,
      }
    }

    return {
      text: item,
      key: `${index}-${item}`,
    }
  })

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }

  return result
}
