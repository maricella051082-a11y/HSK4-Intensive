import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { shuffleOptions } from '../utils/shuffleOptions.js'
import ChineseText from '../components/ChineseText.jsx'
import ChineseTitle from '../components/ChineseTitle.jsx'
import {
  getDueErrors,
  getDueSrsItems,
  getErrorNotebook,
  getLearningDashboardStats,
  getSrsItems,
  localDateKey,
  markErrorReview,
  reviewVocabularySrs,
} from '../utils/learningStore.js'
import { getDueChengyuItems } from '../utils/chengyuStore.js'
import './ReviewPage.css'

function normalize(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[，,。.!！?？；;：:、]/g, '')
    .trim()
}

function speakChinese(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.86

  const chineseVoice = window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang?.toLowerCase().startsWith('zh'))

  if (chineseVoice) utterance.voice = chineseVoice
  window.speechSynthesis.speak(utterance)
}

function moduleLabel(module) {
  return {
    vocabulary: '词汇',
    grammar: '语法',
    listening: '听力',
    reading: '阅读',
    writing: '写作',
    speaking: '口语',
    exam: '题型',
    chengyu: '成语',
  }[module] || module
}

function errorTypeLabel(type) {
  return {
    word_unknown: 'слово не вспомнилось',
    word_sound: 'слово не узнано на слух',
    grammar: 'грамматика',
    listening_memory: 'аудирование / удержание смысла',
    listening_keyword_trap: 'ловушка ключевого слова',
    reading_inference: 'понимание / вывод из текста',
    word_order: 'порядок слов',
    speaking_pause: 'устная речь',
    speaking_grammar: 'устная грамматика',
    picture_no_structure: 'структура 看图说话',
    chengyu_recall: '成语: не вспомнилось / употреблено не по ситуации',
  }[type] || type
}

function WordByWordExample({ tokens = [], fallback, pinyin, translation }) {
  if (!tokens.length) {
    return (
      <ChineseText as="p" pinyin={pinyin} translation={translation}>
        {fallback}
      </ChineseText>
    )
  }

  return (
    <p className="review-token-line">
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
  )
}

function ReviewPage() {
  const [tab, setTab] = useState('today')
  const [revision, setRevision] = useState(0)

  const data = useMemo(() => {
    const stats = getLearningDashboardStats()
    const dueSrs = getDueSrsItems()
    const dueErrors = getDueErrors()
    const dueChengyu = getDueChengyuItems()
    const allErrors = getErrorNotebook()
    const allSrs = Object.values(getSrsItems())

    return { stats, dueSrs, dueErrors, dueChengyu, allErrors, allSrs }
  }, [revision])

  function refresh() {
    setRevision((value) => value + 1)
  }

  return (
    <main className="review-page">
      <div className="review-shell">
        <div className="review-topbar">
          <Link to="/" className="review-back">← На главную</Link>
          <span>{localDateKey()}</span>
        </div>

        <section className="review-header">
          <div>
            <p className="review-kicker"><ChineseTitle text="复习系统 · УРОК 1" /></p>
            <h1><ChineseTitle text="今日复习 · 错题本" /></h1>
            <p>
              Слова возвращаются на повторение через увеличивающиеся интервалы,
              а ошибки появляются снова, пока ответ не станет устойчивым.
            </p>
          </div>

          <div className="review-summary">
            <article>
              <strong>{data.stats.dueToday}</strong>
              <span>сегодня</span>
            </article>
            <article>
              <strong>{data.stats.activeErrors}</strong>
              <span>активных ошибок</span>
            </article>
            <article>
              <strong>{data.stats.srsActive}</strong>
              <span>слов в повторении</span>
            </article>
          </div>
        </section>

        <div className="review-tabs">
          <button
            type="button"
            className={tab === 'today' ? 'active' : ''}
            onClick={() => setTab('today')}
          >
            <ChineseTitle text={`今日复习 · ${data.stats.dueToday}`} />
          </button>

          <button
            type="button"
            className={tab === 'errors' ? 'active' : ''}
            onClick={() => setTab('errors')}
          >
            <ChineseTitle text={`错题本 · ${data.stats.activeErrors}`} />
          </button>
        </div>

        {tab === 'today' ? (
          <TodayReview
            dueSrs={data.dueSrs}
            dueErrors={data.dueErrors}
            dueChengyu={data.dueChengyu}
            onChanged={refresh}
          />
        ) : (
          <ErrorNotebook
            errors={data.allErrors}
            srsItems={data.allSrs}
          />
        )}
      </div>
    </main>
  )
}

function TodayReview({ dueSrs, dueErrors, dueChengyu, onChanged }) {
  return (
    <div className="review-today-stack">
      <section className="review-section-card">
        <div className="review-section-head">
          <div>
            <span className="review-section-seal">词</span>
            <div>
              <h2><ChineseTitle text="词汇 · Повторение слов" /></h2>
              <p>Если слово вспомнилось, следующий повтор будет позже. Если забылось — оно вернётся раньше.</p>
            </div>
          </div>
          <strong>{dueSrs.length}</strong>
        </div>

        {dueSrs.length ? (
          <SrsQueue items={dueSrs} onChanged={onChanged} />
        ) : (
          <EmptyState text="На сегодня слов для повторения нет." />
        )}
      </section>

      <section className="review-section-card chengyu-review-section">
        <div className="review-section-head">
          <div>
            <span className="review-section-seal chengyu">成</span>
            <div>
              <h2><ChineseTitle text="成语 · 情境复习" /></h2>
              <p>D0 → D1 → D3 → D7 → D14 → D30. На каждом возврате меняется способ извлечения из памяти.</p>
            </div>
          </div>
          <strong>{dueChengyu.length}</strong>
        </div>
        {dueChengyu.length ? (
          <>
            <div className="review-chengyu-chips">
              {dueChengyu.slice(0, 8).map((entry) => <span key={entry.id}><ChineseText pinyin={entry.item.pinyin} translation={entry.item.translation}>{entry.item.hanzi}</ChineseText></span>)}
            </div>
            <Link to="/chengyu" className="review-main-button review-link-button">Открыть <ChineseTitle text="成语训练" /> →</Link>
          </>
        ) : (
          <div className="review-chengyu-empty">
            <span>На сегодня интервальных повторов <ChineseTitle text="成语" /> нет.</span>
            <Link to="/chengyu">Открыть курс <ChineseTitle text="成语" /> →</Link>
          </div>
        )}
      </section>

      <section className="review-section-card">
        <div className="review-section-head">
          <div>
            <span className="review-section-seal error">错</span>
            <div>
              <h2><ChineseTitle text="错题 · 再练" /></h2>
              <p>Ошибка возвращается через 1 → 3 → 7 → 14 дней.</p>
            </div>
          </div>
          <strong>{dueErrors.length}</strong>
        </div>

        {dueErrors.length ? (
          <ErrorQueue items={dueErrors} onChanged={onChanged} />
        ) : (
          <EmptyState text="На сегодня дополнительных ошибок для повтора нет." />
        )}
      </section>
    </div>
  )
}

function SrsQueue({ items, onChanged }) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const item = items[Math.min(index, Math.max(0, items.length - 1))]

  if (!item) {
    return <EmptyState text="Повторение слов на сегодня завершено." />
  }

  const word = item.word

  function grade(remembered) {
    reviewVocabularySrs(item.key, remembered)
    setRevealed(false)

    if (index >= items.length - 1) onChanged()
    else setIndex((value) => value + 1)
  }

  return (
    <div className="srs-card">
      <div className="review-card-counter">{index + 1} / {items.length}</div>

      <div className="srs-word">{word.hanzi}</div>

      {!revealed ? (
        <>
          <p>Сначала вспомни чтение и значение.</p>
          <div className="review-inline-actions">
            <button type="button" className="review-audio" onClick={() => speakChinese(word.hanzi)}>
              🔊 Прослушать
            </button>
            <button type="button" className="review-main-button" onClick={() => setRevealed(true)}>
              Показать ответ
            </button>
          </div>
        </>
      ) : (
        <div className="srs-reveal">
          <strong>{word.pinyin}</strong>
          <span>{word.translation}</span>

          {word.collocations?.length > 0 && (
            <div className="review-chip-row">
              {word.collocations.map((itemText) => (
                <span key={itemText}><ChineseTitle text={itemText} /></span>
              ))}
            </div>
          )}

          {word.example && (
            <div className="review-example">
              <WordByWordExample
                tokens={word.sourceTokens}
                fallback={word.example}
                pinyin={word.examplePinyin}
                translation={word.exampleTranslation}
              />
            </div>
          )}

          <div className="srs-grade-row">
            <button type="button" className="review-forgot" onClick={() => grade(false)}>
              Не помню · <ChineseTitle text="明天再来" />
            </button>
            <button type="button" className="review-remember" onClick={() => grade(true)}>
              Помню · <ChineseTitle text="记得" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ErrorQueue({ items, onChanged }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState(false)

  const item = items[Math.min(index, Math.max(0, items.length - 1))]

  if (!item) {
    return <EmptyState text="Ошибки на сегодня разобраны." />
  }

  const answerValue = item.mode === 'choice' ? selected : inputValue

  function accepted(value) {
    const list = item.acceptedAnswers?.length
      ? item.acceptedAnswers
      : [item.answer]

    return list.some((answer) => normalize(answer) === normalize(value))
  }

  function check() {
    if (!answerValue) return
    const isCorrect = accepted(answerValue)
    setCorrect(isCorrect)
    setChecked(true)
    markErrorReview(item.key, isCorrect)
  }

  function next() {
    setSelected('')
    setInputValue('')
    setChecked(false)
    setCorrect(false)

    if (index >= items.length - 1) onChanged()
    else setIndex((value) => value + 1)
  }

  return (
    <div className="error-review-card">
      <div className="review-card-counter">{index + 1} / {items.length}</div>

      <div className="error-meta-row">
        <span><ChineseTitle text={moduleLabel(item.module)} /></span>
        <span><ChineseTitle text={errorTypeLabel(item.type)} /></span>
      </div>

      {item.audioPath && (
        <audio className="review-source-audio" src={item.audioPath} controls preload="metadata" />
      )}

      {item.audioText && (
        <button type="button" className="review-audio" onClick={() => speakChinese(item.audioText)}>
          🔊 Прослушать
        </button>
      )}

      {item.passage && <p className="error-passage">{item.passage}</p>}
      <h3>{item.prompt || item.title}</h3>

      {item.mode === 'choice' ? (
        <div className="error-choice-grid">
          {shuffleOptions(item.options, item.key).map((option) => (
            <button
              type="button"
              key={option}
              disabled={checked}
              className={selected === option ? 'selected' : ''}
              onClick={() => setSelected(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input
          className="error-review-input"
          value={inputValue}
          disabled={checked}
          placeholder="Введи ответ"
          onChange={(event) => setInputValue(event.target.value)}
        />
      )}

      {!checked ? (
        <button
          type="button"
          className="review-main-button"
          disabled={!answerValue}
          onClick={check}
        >
          Проверить
        </button>
      ) : (
        <div className={`error-feedback ${correct ? 'correct' : 'wrong'}`}>
          <strong>{correct ? '✓ Верно' : '✕ Пока неверно'}</strong>

          <p>
            Правильный ответ:{' '}
            <ChineseText pinyin={item.pinyin} translation={item.translation}>
              {item.answer}
            </ChineseText>
          </p>

          {item.explanation && <span>{item.explanation}</span>}

          <p className="review-schedule-note">
            {correct
              ? 'Если ответ устойчивый, следующий возврат станет реже.'
              : 'Ошибка вернётся завтра, а интервал сократится.'}
          </p>

          <button type="button" className="review-main-button compact" onClick={next}>
            Следующее →
          </button>
        </div>
      )}
    </div>
  )
}

function ErrorNotebook({ errors, srsItems }) {
  const active = errors.filter((item) => item.status === 'active')
  const mastered = errors.filter((item) => item.status === 'mastered')
  const srsActive = srsItems.filter((item) => item.status === 'active')

  return (
    <div className="notebook-stack">
      <section className="review-section-card">
        <div className="review-section-head">
          <div>
            <span className="review-section-seal error">错</span>
            <div>
              <h2>Активные ошибки</h2>
              <p>Здесь видна причина ошибки, срок возврата и источник.</p>
            </div>
          </div>
          <strong>{active.length}</strong>
        </div>

        {active.length ? (
          <div className="notebook-list">
            {active.map((item) => (
              <article key={item.key}>
                <div className="notebook-item-head">
                  <div>
                    <span><ChineseTitle text={moduleLabel(item.module)} /></span>
                    <b><ChineseTitle text={errorTypeLabel(item.type)} /></b>
                  </div>
                  <time>{item.dueDate ? `↻ ${item.dueDate}` : 'в модуле'}</time>
                </div>

                <p>{item.prompt || item.title || item.answer}</p>

                <div className="notebook-item-foot">
                  <span>ошибок: {item.attempts || 1}</span>
                  {item.route && <Link to={item.route}>Открыть тренировку →</Link>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="Активных ошибок пока нет." />
        )}
      </section>

      <section className="review-section-card compact-section">
        <div className="review-section-head">
          <div>
            <span className="review-section-seal">词</span>
            <div>
              <h2>Очередь повторения слов</h2>
              <p>Слова, которые уже вошли в интервальное повторение.</p>
            </div>
          </div>
          <strong>{srsActive.length}</strong>
        </div>

        <div className="mini-srs-list">
          {srsActive.slice(0, 24).map((item) => (
            <span key={item.key}>
              {item.word.hanzi} · {item.dueDate}
            </span>
          ))}
        </div>
      </section>

      {mastered.length > 0 && (
        <section className="review-section-card compact-section">
          <div className="review-section-head">
            <div>
              <span className="review-section-seal mastered">✓</span>
              <div>
                <h2>Исправлено устойчиво</h2>
                <p>Ошибки, прошедшие интервальные возвраты.</p>
              </div>
            </div>
            <strong>{mastered.length}</strong>
          </div>
        </section>
      )}
    </div>
  )
}

function EmptyState({ text }) {
  return <div className="review-empty">✓ {text}</div>
}

export default ReviewPage
