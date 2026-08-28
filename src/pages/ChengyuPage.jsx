import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { shuffleOptions } from '../utils/shuffleOptions.js'
import { mediaUrl } from '../utils/mediaUrl.js'
import ChineseText from '../components/ChineseText.jsx'
import { chengyuById, chengyuData, chengyuThemes } from '../data/chengyuData.js'
import { getChengyuExerciseHint } from '../data/chengyuExerciseHints.js'
import {
  chengyuPictureTasks,
  chengyuQuestionTasks,
  chengyuStorySets,
} from '../data/chengyuSpeaking.js'
import {
  CHENGYU_SKILLS,
  completedChengyuSkills,
  getChengyuCurrentWeek,
  getChengyuLevel,
  getChengyuProgress,
  getChengyuStats,
  getDailyChengyuQueue,
  isChengyuSkillComplete,
  recordChengyuSkill,
} from '../utils/chengyuStore.js'
import { recordLearningError, resolveLearningError } from '../utils/learningStore.js'
import './ChengyuPage.css'
import './ChengyuSafetyPatch.css'
import './ChengyuExerciseHints.css'

const SKILL_LABELS = {
  recognize: ['看得懂', 'узнаю'],
  listen: ['听得懂', 'понимаю на слух'],
  choose: ['会选择', 'выбираю по ситуации'],
  produce: ['会造句', 'сам употребляю'],
  speak: ['会说', 'использую в речи'],
  automatic: ['自动使用', 'вспоминаю автоматически'],
}

const MUST_HAVE = [
  'jianchi', 'shuneng', 'bantu', 'yijuliangde', 'yinren', 'fengfuduocai',
  'renshan', 'dachiyijing', 'jujing', 'shoumang', 'luanqibazao', 'ruxiang',
]

function neutralHintTranslation(translation) {
  if (typeof translation !== 'string') return ''

  return translation
    .replace(/\s*\(Неправильное употребление\.\)\s*$/iu, '')
    .trim()
}

function HintedChinese({ text, showPinyin = false, showTranslation = false, className = '' }) {
  const hint = getChengyuExerciseHint(text)
  const pinyin = typeof hint?.pinyin === 'string' ? hint.pinyin.normalize('NFC') : ''
  const translation = neutralHintTranslation(hint?.translation)
  return (
    <span className={`chengyu-hinted-text ${className}`.trim()}>
      <span className="hint-zh">{text}</span>
      {showPinyin && pinyin ? <span className="hint-pinyin">{pinyin}</span> : null}
      {showTranslation && translation ? <span className="hint-translation">{translation}</span> : null}
    </span>
  )
}

function ChineseWithTooltip({ text, className = '' }) {
  const hint = getChengyuExerciseHint(text)
  if (!hint?.pinyin && !hint?.translation) return text

  return (
    <ChineseText
      className={className}
      pinyin={hint.pinyin || ''}
      translation={neutralHintTranslation(hint.translation)}
      tooltipPosition="bottom"
    >
      {text}
    </ChineseText>
  )
}

function HintControls({ showPinyin, showTranslation, onTogglePinyin, onToggleTranslation }) {
  return (
    <div className="chengyu-hint-controls">
      <button type="button" className={showPinyin ? 'active' : ''} onClick={onTogglePinyin}>拼音</button>
      <button type="button" className={showTranslation ? 'active' : ''} onClick={onToggleTranslation}>Перевод</button>
    </div>
  )
}

function normalizeChinese(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\s，。！？、,.!?；;：“”‘’（）()]/g, '')
    .trim()
}

function chineseCount(value) {
  return [...normalizeChinese(value)].filter((char) => /[\u3400-\u9fff]/.test(char)).length
}

function hash(value) {
  return [...String(value)].reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 2166136261)
}

function stableShuffle(list, seed) {
  return [...list].sort((a, b) => {
    const av = hash(`${seed}:${typeof a === 'string' ? a : a.id || JSON.stringify(a)}`)
    const bv = hash(`${seed}:${typeof b === 'string' ? b : b.id || JSON.stringify(b)}`)
    return av - bv
  })
}

function distractorsFor(item, count = 3) {
  const pool = item.extension ? chengyuData : chengyuData.filter((candidate) => !candidate.extension)
  const sameTheme = pool.filter((candidate) => candidate.id !== item.id && candidate.theme === item.theme)
  const others = pool.filter((candidate) => candidate.id !== item.id && candidate.theme !== item.theme)
  return stableShuffle([...sameTheme, ...others], item.id).slice(0, count)
}

function speakChinese(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.82
  const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang?.toLowerCase().startsWith('zh'))
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
  return true
}

function recognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function exerciseErrorKey(item, type) {
  return `chengyu:${item.id}:${type}`
}

function recordExerciseResult(item, type, skill, correct, options = {}) {
  const key = exerciseErrorKey(item, type)
  recordChengyuSkill(item.id, skill, correct, options)

  if (correct) {
    resolveLearningError(key)
    return
  }

  recordLearningError({
    key,
    lessonId: 'chengyu',
    module: 'chengyu',
    type: 'chengyu_recall',
    itemId: `${item.id}:${type}`,
    title: item.hanzi,
    prompt: item.scenario,
    answer: item.hanzi,
    pinyin: item.pinyin,
    translation: item.translation,
    explanation: item.explanation,
    route: '/chengyu',
    reviewMode: 'module',
  })
}

function exerciseTypesFor(progress, intensive = false) {
  if (intensive) {
    return ['meaning', 'scenario', 'reverse', 'audio', 'collocation', 'natural', 'unscramble', 'missing', 'upgrade', 'sentence', 'speed', 'speak']
  }

  if (!progress) return ['meaning', 'scenario']

  const missing = CHENGYU_SKILLS.filter((skill) => !isChengyuSkillComplete(progress, skill))
  const first = missing[0] || 'automatic'
  const second = missing[1] || first
  const mapping = {
    recognize: ['reverse', 'meaning'],
    listen: ['audio', 'missing'],
    choose: ['scenario', 'natural'],
    produce: ['upgrade', 'unscramble'],
    speak: ['sentence', 'speak'],
    automatic: ['speed', 'scenario'],
  }

  const chosen = [mapping[first]?.[0] || 'scenario', mapping[second]?.[1] || 'natural']
  if (chosen[0] === chosen[1]) chosen[1] = 'natural'
  return chosen
}

function buildDeck(entries, intensive = false) {
  const store = getChengyuProgress()
  const deck = []
  entries.forEach((entry) => {
    const item = entry.item || entry
    const progress = store[item.id] || entry.progress || null
    if (!progress) deck.push({ id: `${item.id}:learn`, item, type: 'learn' })
    exerciseTypesFor(progress, intensive).forEach((type) => {
      deck.push({ id: `${item.id}:${type}`, item, type })
    })
  })
  return deck
}

function SkillDots({ progress, compact = false }) {
  return (
    <div className={`chengyu-skill-dots ${compact ? 'compact' : ''}`}>
      {CHENGYU_SKILLS.map((skill) => (
        <span
          key={skill}
          className={isChengyuSkillComplete(progress, skill) ? 'done' : ''}
          title={`${SKILL_LABELS[skill][0]} · ${SKILL_LABELS[skill][1]}`}
        >
          {compact ? '' : SKILL_LABELS[skill][0]}
        </span>
      ))}
    </div>
  )
}


function StoryQuickAccess({ item, compact = false }) {
  const [open, setOpen] = useState(false)
  const [showPinyin, setShowPinyin] = useState(true)
  const [showTranslation, setShowTranslation] = useState(true)

  if (!item?.storyRich) return null

  return (
    <>
      <div className={`chengyu-story-quick ${compact ? 'compact' : ''}`}>
        <div>
          <strong>📖 У этой idiомы есть история</strong>
          <span>Картинки, HSK4-история, современный пример, HSKK и источники</span>
        </div>
        <button type="button" className="chengyu-secondary" onClick={() => setOpen(true)}>
          Посмотреть
        </button>
      </div>

      {open && (
        <div className="chengyu-detail-overlay chengyu-story-quick-overlay" onClick={() => setOpen(false)}>
          <div className="chengyu-detail chengyu-story-quick-detail" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="chengyu-close" onClick={() => setOpen(false)}>×</button>
            <div className="chengyu-detail-hanzi">{item.hanzi}</div>
            <div className="chengyu-helper-toggles">
              <button type="button" className={showPinyin ? 'active' : ''} onClick={() => setShowPinyin((value) => !value)}>拼音</button>
              <button type="button" className={showTranslation ? 'active' : ''} onClick={() => setShowTranslation((value) => !value)}>Перевод</button>
              <span className="chengyu-story-badge">📖 有故事</span>
            </div>
            {showPinyin && <div className="chengyu-detail-pinyin">{item.pinyin}</div>}
            {showTranslation && <p className="chengyu-translation">{item.translation}</p>}
            <RichStoryDetails item={item} showPinyin={showPinyin} showTranslation={showTranslation} />
          </div>
        </div>
      )}
    </>
  )
}

function IdiomLearningCard({ item, onContinue }) {
  const meaning = item.storyRich?.shortMeaningRu || item.translation
  const [showPinyin, setShowPinyin] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

  return (
    <div className="chengyu-learn-card">
      <div className="chengyu-task-guide">
        <strong>Что делать на этом шаге</strong>
        <ol>
          <li>Прочитай идиому и её значение.</li>
          <li>Посмотри, как она используется в естественном примере.</li>
          <li>Нажми кнопку внизу — дальше будет короткое задание без готового ответа.</li>
        </ol>
        <small>Нажми «拼音» или «Перевод» под идиомой, чтобы раскрыть подсказки к объяснению и примеру.</small>
      </div>

      <div className="chengyu-big-hanzi">
        <ChineseWithTooltip text={item.hanzi} />
      </div>
      <div className="chengyu-big-pinyin">{item.pinyin}</div>
      <p className="chengyu-translation chengyu-meaning-ru">{meaning}</p>

      <HintControls
        showPinyin={showPinyin}
        showTranslation={showTranslation}
        onTogglePinyin={() => setShowPinyin((value) => !value)}
        onToggleTranslation={() => setShowTranslation((value) => !value)}
      />

      <p className="chengyu-zh-explain">
        <HintedChinese
          text={item.explanation}
          showPinyin={showPinyin}
          showTranslation={showTranslation}
        />
      </p>
      <div className="chengyu-example-box">
        <span>自然表达 · естественный пример</span>
        <strong>
          <HintedChinese
            text={item.example}
            showPinyin={showPinyin}
            showTranslation={showTranslation}
          />
        </strong>
      </div>
      <p className="chengyu-collocation-label">Часто употребляется рядом со словами:</p>
      <div className="chengyu-context-row">
        {item.collocations.map((word) => (
          <span key={word}><ChineseWithTooltip text={word} /></span>
        ))}
      </div>
      <StoryQuickAccess item={item} />
      <button type="button" className="chengyu-main" onClick={onContinue}>
        Я прочитала — перейти к проверке →
      </button>
    </div>
  )
}

function ChoiceExercise({ item, type, onDone }) {
  const distractors = distractorsFor(item)
  let prompt = ''
  let sub = ''
  let options = []
  let answer = ''
  let skill = 'choose'
  let audioOnly = false

  if (type === 'meaning') {
    prompt = item.hanzi
    sub = 'Выбери точное значение'
    options = [item.translation, ...distractors.map((candidate) => candidate.translation)]
    answer = item.translation
    skill = 'recognize'
  } else if (type === 'scenario') {
    prompt = item.scenario
    sub = 'Какое 成语 лучше всего описывает ситуацию?'
    options = [item.hanzi, ...distractors.map((candidate) => candidate.hanzi)]
    answer = item.hanzi
    skill = 'choose'
  } else if (type === 'reverse') {
    prompt = item.hanzi
    sub = 'Какая ситуация соответствует этой идиоме?'
    options = [item.scenario, ...distractors.map((candidate) => candidate.scenario)]
    answer = item.scenario
    skill = 'recognize'
  } else if (type === 'audio') {
    prompt = '🎧'
    sub = 'Прослушай и выбери услышанное 成语'
    options = [item.hanzi, ...distractors.map((candidate) => candidate.hanzi)]
    answer = item.hanzi
    skill = 'listen'
    audioOnly = true
  } else if (type === 'collocation') {
    prompt = item.hanzi
    sub = 'Какое слово естественнее всего встретить рядом с этой идиомой?'
    options = [item.collocations[0], '公斤', '星期三', '蓝色']
    answer = item.collocations[0]
    skill = 'choose'
  } else if (type === 'natural') {
    prompt = item.hanzi
    sub = 'Какое предложение употребляет 成语 естественно?'
    options = [item.example, item.wrongUse]
    answer = item.example
    skill = 'choose'
  }

  const shown = stableShuffle(options, `${item.id}:${type}`)
  const [selected, setSelected] = useState('')
  const [checked, setChecked] = useState(false)
  const [showPinyin, setShowPinyin] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const correct = selected === answer

  function check() {
    if (!selected) return
    const result = selected === answer
    recordExerciseResult(item, type, skill, result)
    setChecked(true)
  }

  return (
    <div className="chengyu-exercise-card">
      <div className={`chengyu-exercise-prompt ${audioOnly ? 'audio-only' : ''}`}><HintedChinese text={prompt} showPinyin={showPinyin} showTranslation={showTranslation} /></div>
      <p className="chengyu-exercise-sub">{sub}</p>
      <HintControls
        showPinyin={showPinyin}
        showTranslation={showTranslation}
        onTogglePinyin={() => setShowPinyin((value) => !value)}
        onToggleTranslation={() => setShowTranslation((value) => !value)}
      />
      {audioOnly && (
        <button type="button" className="chengyu-audio" onClick={() => speakChinese(item.hanzi)}>🔊 Прослушать ещё раз</button>
      )}
      <div className="chengyu-options">
        {shown.map((option) => (
          <button
            type="button"
            key={option}
            disabled={checked}
            onClick={() => setSelected(option)}
            className={`${selected === option ? 'selected' : ''} ${checked && option === answer ? 'correct' : ''} ${checked && selected === option && option !== answer ? 'wrong' : ''}`}
          >
            <HintedChinese text={option} showPinyin={showPinyin} showTranslation={showTranslation} />
          </button>
        ))}
      </div>
      {!checked ? (
        <button type="button" className="chengyu-main" disabled={!selected} onClick={check}>Проверить</button>
      ) : (
        <ExerciseFeedback item={item} correct={correct} onNext={onDone} />
      )}
    </div>
  )
}

function UnscrambleExercise({ item, type, onDone }) {
  const targetChars = [...item.hanzi]
  const shuffled = stableShuffle(targetChars.map((char, index) => ({ char, key: `${char}-${index}` })), `${item.id}:chars`)
  const [picked, setPicked] = useState([])
  const [checked, setChecked] = useState(false)
  const [showPinyin, setShowPinyin] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)

  function pick(token) {
    if (picked.some((entry) => entry.key === token.key)) return
    setPicked((current) => [...current, token])
  }

  const built = picked.map((entry) => entry.char).join('')
  const correct = built === item.hanzi

  function check() {
    if (picked.length !== targetChars.length) return
    recordExerciseResult(item, type, 'produce', correct)
    setChecked(true)
  }

  return (
    <div className="chengyu-exercise-card">
      <div className="chengyu-exercise-prompt">把成语拼回来</div>
      <p className="chengyu-exercise-sub">Собери 成语 из иероглифов. Подсказки можно открыть, если они нужны.</p>
      <HintControls showPinyin={showPinyin} showTranslation={showTranslation} onTogglePinyin={() => setShowPinyin((value) => !value)} onToggleTranslation={() => setShowTranslation((value) => !value)} />
      {(showPinyin || showTranslation) ? <div className="chengyu-inline-hint-box"><HintedChinese text={item.hanzi} showPinyin={showPinyin} showTranslation={showTranslation} /></div> : null}
      <div className="chengyu-build-line">{built || '____'}</div>
      <div className="chengyu-char-bank">
        {shuffled.map((token) => (
          <button type="button" key={token.key} disabled={checked || picked.some((entry) => entry.key === token.key)} onClick={() => pick(token)}>{token.char}</button>
        ))}
      </div>
      {!checked ? (
        <div className="chengyu-inline-actions">
          <button type="button" className="chengyu-secondary" onClick={() => setPicked([])}>Сбросить</button>
          <button type="button" className="chengyu-main" disabled={picked.length !== targetChars.length} onClick={check}>Проверить</button>
        </div>
      ) : <ExerciseFeedback item={item} correct={correct} onNext={onDone} />}
    </div>
  )
}

function MissingExercise({ item, type, onDone }) {
  const chars = [...item.hanzi]
  const blankIndex = hash(item.id) % chars.length
  const answer = chars[blankIndex]
  const charPool = item.extension ? chengyuData : chengyuData.filter((candidate) => !candidate.extension)
  const distractorChars = stableShuffle(
    [...new Set(charPool.flatMap((candidate) => [...candidate.hanzi]).filter((char) => char !== answer))],
    `${item.id}:missing`,
  ).slice(0, 3)
  const options = stableShuffle([answer, ...distractorChars], `${item.id}:missing-options`)
  const [selected, setSelected] = useState('')
  const [checked, setChecked] = useState(false)
  const [showPinyin, setShowPinyin] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const display = chars.map((char, index) => index === blankIndex ? '□' : char).join('')
  const correct = selected === answer

  function check() {
    if (!selected) return
    recordExerciseResult(item, type, 'produce', correct)
    setChecked(true)
  }

  return (
    <div className="chengyu-exercise-card">
      <div className="chengyu-exercise-prompt">{display}</div>
      <p className="chengyu-exercise-sub">Восстанови пропущенный иероглиф.</p>
      <HintControls showPinyin={showPinyin} showTranslation={showTranslation} onTogglePinyin={() => setShowPinyin((value) => !value)} onToggleTranslation={() => setShowTranslation((value) => !value)} />
      {(showPinyin || showTranslation) ? <div className="chengyu-inline-hint-box"><HintedChinese text={item.hanzi} showPinyin={showPinyin} showTranslation={showTranslation} /></div> : null}
      <div className="chengyu-char-bank">
        {options.map((char) => <button type="button" className={selected === char ? 'selected' : ''} disabled={checked} key={char} onClick={() => setSelected(char)}>{char}</button>)}
      </div>
      {!checked ? <button type="button" className="chengyu-main" disabled={!selected} onClick={check}>Проверить</button> : <ExerciseFeedback item={item} correct={correct} onNext={onDone} />}
    </div>
  )
}

function TextExercise({ item, type, onDone }) {
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [result, setResult] = useState({ correct: false, fast: false })
  const [showPinyin, setShowPinyin] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const startedAt = useRef(0)
  let prompt = item.simpleSentence
  let sub = 'Замени простое выражение подходящим 成语. Напиши только 成语.'
  let skill = 'produce'

  if (type === 'sentence') {
    prompt = item.hanzi
    sub = 'Напиши своё естественное китайское предложение с этой идиомой (не меньше 8 иероглифов).'
    skill = 'produce'
  } else if (type === 'speed') {
    prompt = item.scenario
    sub = 'Вспомни 成语 без вариантов. Для 自动使用 цель — точный ответ за 6 секунд.'
    skill = 'automatic'
  }

  function check() {
    if (!value.trim()) return
    const elapsedSeconds = (Date.now() - startedAt.current) / 1000
    let isCorrect
    let fast = false
    if (type === 'sentence') {
      isCorrect = normalizeChinese(value).includes(item.hanzi) && chineseCount(value) >= 8
    } else {
      isCorrect = normalizeChinese(value) === item.hanzi
      fast = type === 'speed' && isCorrect && elapsedSeconds <= 6
      if (type === 'speed') isCorrect = fast
    }
    setResult({ correct: isCorrect, fast })
    recordExerciseResult(item, type, skill, isCorrect, { fast })
    setChecked(true)
  }

  return (
    <div className="chengyu-exercise-card">
      <div className="chengyu-text-prompt"><HintedChinese text={prompt} showPinyin={showPinyin} showTranslation={showTranslation} /></div>
      <p className="chengyu-exercise-sub">{sub}</p>
      <HintControls showPinyin={showPinyin} showTranslation={showTranslation} onTogglePinyin={() => setShowPinyin((value) => !value)} onToggleTranslation={() => setShowTranslation((value) => !value)} />
      <textarea value={value} disabled={checked} onChange={(event) => { if (!startedAt.current) startedAt.current = Date.now(); setValue(event.target.value) }} placeholder={type === 'sentence' ? '例如：……' : '输入成语'} />
      {!checked ? <button type="button" className="chengyu-main" disabled={!value.trim()} onClick={check}>Проверить</button> : (
        <>
          {type === 'speed' && normalizeChinese(value) === item.hanzi && !result.fast && (
            <div className="chengyu-soft-note">Ответ верный, но пока не автоматический. Цель — вспомнить за 6 секунд.</div>
          )}
          <ExerciseFeedback item={item} correct={result.correct} onNext={onDone} />
        </>
      )}
    </div>
  )
}

function SpeechExercise({ item, type, onDone }) {
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')
  const [showPinyin, setShowPinyin] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const recognitionRef = useRef(null)
  const Recognition = recognitionConstructor()
  const correct = normalizeChinese(transcript).includes(item.hanzi) && chineseCount(transcript) >= 10

  function start() {
    if (!Recognition) {
      setError('Автоматическое распознавание китайской речи доступно в Chrome/браузерах с Web Speech API. Этот навык не будет отмечен автоматически.')
      return
    }
    setError('')
    setTranscript('')
    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let text = ''
      for (let index = 0; index < event.results.length; index += 1) text += event.results[index][0]?.transcript || ''
      setTranscript(text)
    }
    recognition.onerror = () => {
      setListening(false)
      setError('Не удалось распознать речь. Проверь доступ к микрофону и попробуй снова.')
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stop() {
    try { recognitionRef.current?.stop() } catch { /* browser already stopped */ }
    setListening(false)
  }

  function check() {
    if (!transcript.trim()) return
    recordExerciseResult(item, type, 'speak', correct)
    setChecked(true)
  }

  return (
    <div className="chengyu-exercise-card">
      <div className="chengyu-exercise-prompt"><HintedChinese text={item.hanzi} showPinyin={showPinyin} showTranslation={showTranslation} /></div>
      <p className="chengyu-exercise-sub">Скажи 1–2 естественные фразы с этой идиомой. Текст 成语 должен появиться в распознанной речи.</p>
      <HintControls showPinyin={showPinyin} showTranslation={showTranslation} onTogglePinyin={() => setShowPinyin((value) => !value)} onToggleTranslation={() => setShowTranslation((value) => !value)} />
      <div className="chengyu-speech-box">{transcript || 'Распознанный текст появится здесь…'}</div>
      {error && <div className="chengyu-warning">{error}</div>}
      <div className="chengyu-inline-actions">
        {!listening ? <button type="button" className="chengyu-secondary" onClick={start}>🎙 Начать говорить</button> : <button type="button" className="chengyu-secondary danger" onClick={stop}>■ Остановить</button>}
        <button type="button" className="chengyu-main" disabled={!transcript.trim() || checked} onClick={check}>Проверить речь</button>
      </div>
      {checked && <ExerciseFeedback item={item} correct={correct} onNext={onDone} />}
    </div>
  )
}

function ExerciseFeedback({ item, correct, onNext }) {
  return (
    <div className={`chengyu-feedback ${correct ? 'ok' : 'retry'}`}>
      <strong>{correct ? '✓ Верно' : 'Нужно вернуть ещё раз'}</strong>
      <div className="chengyu-feedback-answer">
        <b>{item.hanzi}</b> <span>{item.pinyin}</span>
      </div>
      <p>{item.explanation} · {item.translation}</p>
      <small>{item.example}</small>
      <StoryQuickAccess item={item} compact />
      <button type="button" className="chengyu-main" onClick={onNext}>Дальше →</button>
    </div>
  )
}

function ExerciseRenderer({ exercise, onDone }) {
  if (exercise.type === 'learn') return <IdiomLearningCard item={exercise.item} onContinue={onDone} />
  if (['meaning', 'scenario', 'reverse', 'audio', 'collocation', 'natural'].includes(exercise.type)) {
    return <ChoiceExercise key={exercise.id} item={exercise.item} type={exercise.type} onDone={onDone} />
  }
  if (exercise.type === 'unscramble') return <UnscrambleExercise key={exercise.id} item={exercise.item} type={exercise.type} onDone={onDone} />
  if (exercise.type === 'missing') return <MissingExercise key={exercise.id} item={exercise.item} type={exercise.type} onDone={onDone} />
  if (['upgrade', 'sentence', 'speed'].includes(exercise.type)) return <TextExercise key={exercise.id} item={exercise.item} type={exercise.type} onDone={onDone} />
  if (exercise.type === 'speak') return <SpeechExercise key={exercise.id} item={exercise.item} type={exercise.type} onDone={onDone} />
  return null
}

function TrainingSession({ intensiveId, onFinish }) {
  const initialDeck = useMemo(() => {
    if (intensiveId) return buildDeck([chengyuById[intensiveId]], true)
    return buildDeck(getDailyChengyuQueue())
  }, [intensiveId])
  const [index, setIndex] = useState(0)
  const exercise = initialDeck[index]

  if (!initialDeck.length) {
    return <div className="chengyu-empty">На сегодня очередь пуста. Можно открыть 成语库 и выбрать专项强化.</div>
  }

  if (!exercise) {
    return (
      <div className="chengyu-session-finish">
        <span>✓</span>
        <h2>{intensiveId ? '专项强化完成' : '今日成语训练完成'}</h2>
        <p>Следующее повторение будет назначено автоматически по SRS.</p>
        <button type="button" className="chengyu-main" onClick={onFinish}>Вернуться к обзору</button>
      </div>
    )
  }

  return (
    <section className="chengyu-session">
      <div className="chengyu-session-top">
        <button type="button" className="chengyu-text-button" onClick={onFinish}>← Выйти</button>
        <span>{index + 1} / {initialDeck.length}</span>
      </div>
      <div className="chengyu-session-track"><span style={{ width: `${Math.round((index / initialDeck.length) * 100)}%` }} /></div>
      <ExerciseRenderer exercise={exercise} onDone={() => setIndex((value) => value + 1)} />
    </section>
  )
}

function TodayTab({ stats, onStart, onIntensive }) {
  const queue = getDailyChengyuQueue()
  const must = MUST_HAVE.map((id) => chengyuById[id])
  return (
    <div className="chengyu-today-grid">
      <section className="chengyu-today-main">
        <div className="chengyu-kicker">今日训练 · 7–10 分钟</div>
        <h2>Сегодня: извлечь из памяти, а не перечитать</h2>
        <p>Система сама смешивает новые 成语, просроченные повторы и слабые навыки. Одно и то же выражение возвращается в другой форме задания.</p>
        <div className="chengyu-today-numbers">
          <div><strong>{queue.filter((entry) => entry.isNew).length}</strong><span>новых</span></div>
          <div><strong>{stats.dueToday}</strong><span>на повтор</span></div>
          <div><strong>{stats.mastered}</strong><span>已掌握</span></div>
        </div>
        <button type="button" className="chengyu-main large" onClick={onStart}>开始训练 · Начать</button>
      </section>
      <aside className="chengyu-must-card">
        <div className="chengyu-kicker">HSKK 必会 12</div>
        <h3>救命成语</h3>
        <p>Эти 12 должны вспоминаться без перевода и вариантов.</p>
        <div className="chengyu-must-list">
          {must.map((item) => (
            <button type="button" key={item.id} onClick={() => onIntensive(item.id)}>{item.hanzi}</button>
          ))}
        </div>
      </aside>
    </div>
  )
}


function StoryMiniQuiz({ exercise }) {
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState(false)
  const correct = selected === exercise.answer
  const options = shuffleOptions(
    exercise.options.map((option, index) => ({ option, index })),
    exercise.id ?? exercise.prompt,
  )

  return (
    <div className="chengyu-story-quiz">
      <strong>{exercise.prompt}</strong>
      <div className="chengyu-story-quiz-options">
        {options.map(({ option, index }) => (
          <button
            type="button"
            key={option}
            disabled={checked}
            className={[
              selected === index ? 'selected' : '',
              checked && index === exercise.answer ? 'correct' : '',
              checked && selected === index && index !== exercise.answer ? 'wrong' : '',
            ].join(' ').trim()}
            onClick={() => setSelected(index)}
          >
            {option}
          </button>
        ))}
      </div>
      {!checked ? (
        <button type="button" className="chengyu-secondary" disabled={selected === null} onClick={() => setChecked(true)}>Проверить</button>
      ) : (
        <div className={`chengyu-story-quiz-result ${correct ? 'good' : 'bad'}`}>
          {correct ? '✓ 正确' : `正确答案：${exercise.options[exercise.answer]}`}
        </div>
      )}
    </div>
  )
}

function RichStoryDetails({ item, showPinyin, showTranslation }) {
  const [showSample, setShowSample] = useState(false)
  const rich = item.storyRich
  if (!rich) return null

  const storyText = rich.storyZh.join(' ')

  return (
    <div className="chengyu-story-rich">
      <div className="chengyu-story-divider"><span>📖 故事 · дополнительный слой</span></div>

      <div className="chengyu-story-image-grid">
        <figure>
          <img src={mediaUrl(rich.images.main)} alt={`${item.hanzi} основная иллюстрация`} />
          <figcaption>主图 · основной образ</figcaption>
        </figure>
        <figure>
          <img src={mediaUrl(rich.images.comic)} alt={`${item.hanzi} мини-комикс`} />
          <figcaption>迷你漫画 · мини-комикс</figcaption>
        </figure>
        <figure>
          <img src={mediaUrl(rich.images.modern)} alt={`${item.hanzi} современная ситуация`} />
          <figcaption>现代场景 · сегодня</figcaption>
        </figure>
      </div>

      <section className="chengyu-story-box">
        <div className="chengyu-story-box-head">
          <div>
            <span>故事 · HSK4-friendly</span>
            <h3>{item.hanzi} 的故事</h3>
          </div>
          <button type="button" className="chengyu-audio" onClick={() => speakChinese(storyText)}>🔊 听故事</button>
        </div>
        <div className="chengyu-story-lines">
          {rich.storyZh.map((line, index) => (
            <div className="chengyu-story-line" key={`${item.id}-story-${index}`}>
              <p>{line}</p>
              {showPinyin && <small className="chengyu-story-pinyin">{rich.storyPinyin[index]}</small>}
              {showTranslation && <small className="chengyu-story-ru">{rich.storyRu[index]}</small>}
            </div>
          ))}
        </div>
      </section>

      <section className="chengyu-story-box modern">
        <div className="chengyu-story-box-head">
          <div>
            <span>今天怎么用？</span>
            <h3>Современная ситуация</h3>
          </div>
          <button type="button" className="chengyu-audio" onClick={() => speakChinese(rich.modernZh)}>🔊 听一听</button>
        </div>
        <p className="chengyu-story-modern-zh">{rich.modernZh}</p>
        {showPinyin && <p className="chengyu-story-pinyin">{rich.modernPinyin}</p>}
        {showTranslation && <p className="chengyu-story-ru">{rich.modernRu}</p>}
      </section>

      <section className="chengyu-story-box">
        <span className="chengyu-story-label">自然例句 · реальные фразы</span>
        <div className="chengyu-story-examples">
          {rich.examples.map(([zh, pinyin, ru]) => (
            <div key={zh}>
              <p>{zh}</p>
              {showPinyin && <small className="chengyu-story-pinyin">{pinyin}</small>}
              {showTranslation && <small className="chengyu-story-ru">{ru}</small>}
            </div>
          ))}
        </div>
      </section>

      <section className="chengyu-story-box">
        <span className="chengyu-story-label">记忆方法 · выбери свой способ</span>
        <div className="chengyu-memory-grid">
          {rich.memoryTips.map(([title, zh, ru]) => (
            <div key={title}>
              <strong>{title}</strong>
              <p>{zh}</p>
              {showTranslation && <small>{ru}</small>}
            </div>
          ))}
        </div>
      </section>

      <section className="chengyu-story-box">
        <span className="chengyu-story-label">故事理解 · мини-проверка</span>
        <div className="chengyu-story-quiz-grid">
          {rich.storyExercises.map((exercise, index) => (
            <StoryMiniQuiz key={`${item.id}-quiz-${index}`} exercise={exercise} />
          ))}
        </div>
      </section>

      <section className="chengyu-story-box hskk">
        <span className="chengyu-story-label">HSKK · 说一说</span>
        <p className="chengyu-story-hskk-prompt">{rich.hskkPrompt}</p>
        <button type="button" className="chengyu-secondary" onClick={() => setShowSample((value) => !value)}>
          {showSample ? 'Скрыть опору' : 'Показать пример ответа'}
        </button>
        {showSample && <div className="chengyu-story-sample">{rich.hskkSample}</div>}
      </section>

      <section className="chengyu-story-box deep">
        <span className="chengyu-story-label">深入了解 · если интересно глубже</span>
        <p><b>典源：</b>{rich.sourceBook}</p>
        <p>{rich.sourceNoteZh}</p>
        {showTranslation && <p className="chengyu-story-ru">{rich.sourceNoteRu}</p>}
        <div className="chengyu-classical-excerpt">
          <b>原文一小句：</b>{rich.classicalExcerpt}
          {showTranslation && <small>{rich.classicalRu}</small>}
        </div>
      </section>

      <div className="chengyu-story-resource-grid">
        <section className="chengyu-story-box">
          <span className="chengyu-story-label">🎬 视频 · послушать историю</span>
          <div className="chengyu-story-links">
            {rich.videos.map(([title, url]) => (
              <a href={url} target="_blank" rel="noreferrer" key={url}>↗ {title}</a>
            ))}
          </div>
        </section>
        <section className="chengyu-story-box">
          <span className="chengyu-story-label">📚 资料 · проверить происхождение</span>
          <div className="chengyu-story-links">
            {rich.sources.map(([title, url]) => (
              <a href={url} target="_blank" rel="noreferrer" key={url}>↗ {title}</a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function LibraryTab({ onIntensive }) {
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState('all')
  const [status, setStatus] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [showPinyin, setShowPinyin] = useState(true)
  const [showTranslation, setShowTranslation] = useState(true)
  const store = getChengyuProgress()

  const filtered = chengyuData.filter((item) => {
    const text = `${item.hanzi} ${item.pinyin} ${item.translation} ${item.explanation}`.toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (theme === 'extension' && !item.extension) return false
    if (theme !== 'all' && theme !== 'extension' && item.theme !== theme) return false
    const level = getChengyuLevel(store[item.id])
    if (status === 'core' && !item.core) return false
    if (status === 'mastered' && level.key !== 'mastered') return false
    if (status === 'learning' && (!store[item.id] || level.key === 'mastered')) return false
    if (status === 'new' && store[item.id]) return false
    return true
  })

  const selected = selectedId ? chengyuById[selectedId] : null
  const selectedProgress = selected ? store[selected.id] : null

  return (
    <div>
      <div className="chengyu-library-tools">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 · 成语 / pinyin / перевод" />
        <select value={theme} onChange={(event) => setTheme(event.target.value)}>
          <option value="all">Все темы</option>
          {chengyuThemes.map((item) => <option key={item.week} value={item.label}>W{item.week} · {item.label}</option>)}
          <option value="extension">故事扩展 · +4</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Все {chengyuData.length}</option>
          <option value="core">★ Активное ядро</option>
          <option value="learning">学习中</option>
          <option value="mastered">已掌握</option>
          <option value="new">待学习</option>
        </select>
      </div>
      <div className="chengyu-library-grid">
        {filtered.map((item) => {
          const progress = store[item.id]
          const level = getChengyuLevel(progress)
          return (
            <button type="button" className="chengyu-library-card" key={item.id} onClick={() => setSelectedId(item.id)}>
              <div className="chengyu-card-top"><span>{item.extension ? '故事' : item.core ? '★' : `W${item.week}`}</span><em className={level.key}>{level.label}</em></div>
              <strong>{item.hanzi}</strong>
              <small>{item.pinyin}</small>
              <p>{item.translation}</p>
              <SkillDots progress={progress} compact />
            </button>
          )
        })}
      </div>
      {selected && (
        <div className="chengyu-detail-overlay" onClick={() => setSelectedId(null)}>
          <div className="chengyu-detail" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="chengyu-close" onClick={() => setSelectedId(null)}>×</button>
            <div className="chengyu-detail-hanzi">{selected.hanzi}</div>
            <div className="chengyu-helper-toggles">
              <button type="button" className={showPinyin ? 'active' : ''} onClick={() => setShowPinyin((value) => !value)}>拼音</button>
              <button type="button" className={showTranslation ? 'active' : ''} onClick={() => setShowTranslation((value) => !value)}>Перевод</button>
              {selected.storyRich && <span className="chengyu-story-badge">📖 有故事</span>}
            </div>
            {showPinyin && <div className="chengyu-detail-pinyin">{selected.pinyin}</div>}
            <p className="chengyu-zh-explain">{selected.explanation}</p>
            {showTranslation && <p>{selected.translation}</p>}
            <SkillDots progress={selectedProgress} />
            <div className="chengyu-detail-section"><span>典型语境</span><div>{selected.collocations.map((value) => <b key={value}>{value}</b>)}</div></div>
            <div className="chengyu-detail-section"><span>自然表达</span><p>{selected.example}</p></div>
            <div className="chengyu-detail-section wrong"><span>不要这样说</span><p>{selected.wrongUse}</p></div>
            <div className="chengyu-detail-section"><span>情境</span><p>{selected.scenario}</p></div>
            {selected.storyRich && <RichStoryDetails item={selected} showPinyin={showPinyin} showTranslation={showTranslation} />}
            <button type="button" className="chengyu-main" onClick={() => onIntensive(selected.id)}>12 заданий · 专项强化</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SpeechCoach({ prompt, targetIds, sample, image, onUsed }) {
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const Recognition = recognitionConstructor()
  const targets = targetIds.map((id) => chengyuById[id]).filter(Boolean)
  const used = targets.filter((item) => normalizeChinese(transcript).includes(item.hanzi))

  function start() {
    if (!Recognition) {
      setError('Для автоматического распознавания китайского открой сайт в Chrome и разреши микрофон.')
      return
    }
    setTranscript('')
    setRevealed(false)
    setError('')
    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let text = ''
      for (let index = 0; index < event.results.length; index += 1) text += event.results[index][0]?.transcript || ''
      setTranscript(text)
    }
    recognition.onerror = () => { setListening(false); setError('Речь не распознана. Попробуй ещё раз.') }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stop() {
    try { recognitionRef.current?.stop() } catch { /* already stopped */ }
    setListening(false)
  }

  function analyze() {
    setRevealed(true)
    used.forEach((item) => {
      recordChengyuSkill(item.id, 'speak', true)
      if (chineseCount(transcript) >= 25) recordChengyuSkill(item.id, 'automatic', true, { fast: true })
    })
    onUsed?.(used.map((item) => item.id))
  }

  return (
    <div className="chengyu-speech-coach">
      {image && <div className="chengyu-hskk-image"><img src={mediaUrl(image)} alt="HSKK 看图说话" /></div>}
      <h3>{prompt}</h3>
      <p className="chengyu-first-rule">Первая попытка — без подсказок. 成语 появятся только после ответа.</p>
      <div className="chengyu-speech-box tall">{transcript || '🎙 Сначала дай полный ответ своими словами…'}</div>
      {error && <div className="chengyu-warning">{error}</div>}
      <div className="chengyu-inline-actions">
        {!listening ? <button type="button" className="chengyu-secondary" onClick={start}>🎙 Начать ответ</button> : <button type="button" className="chengyu-secondary danger" onClick={stop}>■ Остановить</button>}
        <button type="button" className="chengyu-main" disabled={!transcript.trim()} onClick={analyze}>Разобрать ответ</button>
      </div>
      {revealed && (
        <div className="chengyu-after-speech">
          <div className="chengyu-targets">
            <span>Можно было естественно использовать:</span>
            <div>{targets.map((item) => <b className={used.some((candidate) => candidate.id === item.id) ? 'used' : ''} key={item.id}>{item.hanzi}</b>)}</div>
          </div>
          <p className="chengyu-used-count">В твоём ответе: {used.length ? used.map((item) => item.hanzi).join('、') : 'пока ни одной целевой 成语'}</p>
          <details><summary>参考表达 · показать образец</summary><p>{sample}</p></details>
          <button type="button" className="chengyu-main" onClick={start}>再说一次 · Перезаписать лучше</button>
        </div>
      )}
    </div>
  )
}

function HskkTab() {
  const [mode, setMode] = useState('picture')
  const [index, setIndex] = useState(0)
  const source = mode === 'picture' ? chengyuPictureTasks : mode === 'question' ? chengyuQuestionTasks : chengyuStorySets
  const task = source[index % source.length]

  const storyTargets = mode === 'story' ? task.ids.map((id) => chengyuById[id]).filter(Boolean) : []
  const storyPrompt = mode === 'story' ? `用这三个成语讲一个40秒左右的小故事：${storyTargets.map((item) => item.hanzi).join(' · ')}` : ''
  const storySample = mode === 'story'
    ? `没有固定答案。目标：故事有开始、变化和结果，并自然使用至少两个成语：${storyTargets.map((item) => item.hanzi).join('、')}。`
    : ''

  return (
    <div className="chengyu-hskk-wrap">
      <div className="chengyu-hskk-modes">
        <button className={mode === 'picture' ? 'active' : ''} type="button" onClick={() => { setMode('picture'); setIndex(0) }}>看图说话 · 6</button>
        <button className={mode === 'question' ? 'active' : ''} type="button" onClick={() => { setMode('question'); setIndex(0) }}>回答问题 · 10</button>
        <button className={mode === 'story' ? 'active' : ''} type="button" onClick={() => { setMode('story'); setIndex(0) }}>三词故事 · 6</button>
      </div>
      <div className="chengyu-hskk-counter">{index + 1} / {source.length}</div>
      <SpeechCoach
        key={`${mode}:${task.id}:${index}`}
        image={mode === 'picture' ? task.image : null}
        prompt={mode === 'picture' ? `看图说话 · ${task.title}` : mode === 'question' ? task.question : storyPrompt}
        targetIds={mode === 'story' ? task.ids : task.targetIds}
        sample={mode === 'story' ? storySample : task.sample}
      />
      <button type="button" className="chengyu-next-task" onClick={() => setIndex((value) => (value + 1) % source.length)}>Следующее задание →</button>
    </div>
  )
}

function PlanTab() {
  const store = getChengyuProgress()
  const currentWeek = getChengyuCurrentWeek()
  return (
    <div className="chengyu-plan-grid">
      {chengyuThemes.map((theme) => {
        const items = chengyuData.filter((item) => item.week === theme.week)
        const learned = items.filter((item) => completedChengyuSkills(store[item.id]).length >= 3).length
        return (
          <section className={`chengyu-week-card ${theme.week === currentWeek ? 'current' : ''}`} key={theme.week}>
            <div><span>WEEK {theme.week}</span>{theme.week === currentWeek && <b>本周</b>}</div>
            <h3>{theme.label}</h3>
            <p>{items.map((item, index) => <span key={item.id}>{item.hanzi}{index < items.length - 1 ? ' · ' : ''}</span>)}</p>
            <div className="chengyu-week-progress"><span style={{ width: `${learned * 20}%` }} /></div>
            <small>{learned} / 5 минимум на уровне 会选择</small>
          </section>
        )
      })}
    </div>
  )
}

function ChengyuPage() {
  const [tab, setTab] = useState('today')
  const [training, setTraining] = useState(false)
  const [intensiveId, setIntensiveId] = useState(null)
  const [revision, setRevision] = useState(0)
  void revision
  const stats = getChengyuStats()

  function startDaily() {
    setIntensiveId(null)
    setTraining(true)
  }

  function startIntensive(id) {
    setIntensiveId(id)
    setTraining(true)
    setTab('today')
  }

  function finishTraining() {
    setTraining(false)
    setIntensiveId(null)
    setRevision((value) => value + 1)
  }

  return (
    <main className="chengyu-page">
      <div className="chengyu-shell">
        <header className="chengyu-header">
          <div className="chengyu-header-top">
            <Link to="/">← На главную</Link>
            <span>HSK 4 + HSKK 中级</span>
          </div>
          <div className="chengyu-header-main">
            <div>
              <div className="chengyu-seal">成</div>
              <div>
                <p>表达升级 · ACTIVE LANGUAGE</p>
                <h1>成语加速器</h1>
                <span>Не выучить список, а научиться узнавать → слышать → выбирать → говорить → автоматически использовать.</span>
              </div>
            </div>
            <div className="chengyu-header-stats">
              <article><strong>{stats.courseMastered}</strong><span>/ {stats.courseTotal} курс</span></article>
              <article><strong>{stats.extensionMastered}</strong><span>/ {stats.extensionTotal} 故事扩展</span></article>
              <article><strong>{stats.dueToday}</strong><span>сегодня</span></article>
              <article><strong>W{stats.currentWeek}</strong><span>из 10</span></article>
            </div>
          </div>
          <div className="chengyu-core-track">
            <span style={{ width: `${Math.round((stats.coreMastered / stats.coreTotal) * 100)}%` }} />
            <small>Активное ядро ★ {stats.coreMastered} / {stats.coreTotal}</small>
          </div>
        </header>

        {!training && (
          <nav className="chengyu-tabs">
            <button type="button" className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>今日训练</button>
            <button type="button" className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>成语库 · {stats.total}</button>
            <button type="button" className={tab === 'hskk' ? 'active' : ''} onClick={() => setTab('hskk')}>HSKK 实战</button>
            <button type="button" className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>10 周计划</button>
          </nav>
        )}

        {training ? (
          <TrainingSession intensiveId={intensiveId} onFinish={finishTraining} />
        ) : tab === 'today' ? (
          <>
            <TodayTab stats={stats} onStart={startDaily} onIntensive={startIntensive} />
            <section className="chengyu-skill-overview">
              {CHENGYU_SKILLS.map((skill) => (
                <article key={skill}>
                  <strong>{SKILL_LABELS[skill][0]}</strong>
                  <span>{SKILL_LABELS[skill][1]}</span>
                  <b>{stats.skillStats[skill].percent}%</b>
                  <div><i style={{ width: `${stats.skillStats[skill].percent}%` }} /></div>
                </article>
              ))}
            </section>
          </>
        ) : tab === 'library' ? (
          <LibraryTab onIntensive={startIntensive} />
        ) : tab === 'hskk' ? (
          <HskkTab />
        ) : (
          <PlanTab />
        )}

        <footer className="chengyu-footer-note">
          <ChineseText pinyin="shú néng shēng qiǎo" translation="мастерство приходит с практикой">熟能生巧</ChineseText>
          <span>·</span>
          <ChineseText pinyin="jiān chí bù xiè" translation="неустанно продолжать">坚持不懈</ChineseText>
        </footer>
      </div>
    </main>
  )
}

export default ChengyuPage
