import { useState } from 'react'
import './App.css'
import { Link, Route, Routes } from 'react-router-dom'
import ChineseText from './components/ChineseText.jsx'
import ChineseTitle from './components/ChineseTitle.jsx'
import VocabularyPage from './pages/VocabularyPage.jsx'
import ListeningPage from './pages/ListeningPage.jsx'
import SpeakingPage from './pages/SpeakingPage.jsx'
import GrammarPage from './pages/GrammarPage.jsx'
import ReadingPage from './pages/ReadingPage.jsx'
import WritingPage from './pages/WritingPage.jsx'
import ExamTrainingPage from './pages/ExamTrainingPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import LessonDayPage from './pages/LessonDayPage.jsx'
import TodayPlanPage from './pages/TodayPlanPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import DiagnosticPage from './pages/DiagnosticPage.jsx'
import CoursesPage from './pages/CoursesPage.jsx'
import FinalWeekPage from './pages/FinalWeekPage.jsx'
import CheckpointPage from './pages/CheckpointPage.jsx'
import ExamStrategiesPage from './pages/ExamStrategiesPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import ChengyuPage from './pages/ChengyuPage.jsx'
import PreparationPlanPage from './pages/PreparationPlanPage.jsx'
import HomeDashboard from './components/HomeDashboard.jsx'
import MoyuMotivator from './components/MoyuMotivator.jsx'
import UiIcon from './components/UiIcon.jsx'
import InkCursorEffect from './components/InkCursorEffect.jsx'
import { getLearningDashboardStats } from './utils/learningStore.js'
import { getDynamicDashboardSnapshot } from './utils/dashboardStats.js'
import { getDiagnosticResult } from './utils/diagnosticStore.js'
import './visual-polish.css'
import './design-phase7.css'
import './design-phase8.css'
import './home-v11.css'


const VOCAB_SESSION_KEY = 'hsk4-vocabulary-lesson1-session'
const VOCAB_RESULT_KEY = 'hsk4-vocabulary-lesson1-result'
const VOCAB_DATA_VERSION = 3
const VOCAB_CORE_TOTAL = 16

function readJsonFromStorage(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getVocabularyProgress() {
  const result = readJsonFromStorage(VOCAB_RESULT_KEY)

  if (
    result?.version === VOCAB_DATA_VERSION &&
    result?.completed
  ) {
    return {
      value: Math.min(
        VOCAB_CORE_TOTAL,
        Number(result.mastered) || 0,
      ),
      total: VOCAB_CORE_TOTAL,
      completed: true,
      started: true,
    }
  }

  const session = readJsonFromStorage(VOCAB_SESSION_KEY)

  if (!session || session.version !== VOCAB_DATA_VERSION) {
    return {
      value: 0,
      total: VOCAB_CORE_TOTAL,
      completed: false,
      started: false,
    }
  }

  let processed = 0

  if (session.stage === 'meaning') {
    processed = Math.min(
      VOCAB_CORE_TOTAL,
      Math.max(0, Number(session.index) || 0),
    )
  } else {
    processed = VOCAB_CORE_TOTAL
  }

  return {
    value: processed,
    total: VOCAB_CORE_TOTAL,
    completed: false,
    started: processed > 0 || session.stage !== 'meaning',
  }
}

const LISTENING_SESSION_KEY = 'hsk4-listening-lesson1-session'
const LISTENING_RESULT_KEY = 'hsk4-listening-lesson1-result'
const LISTENING_DATA_VERSION = 2

function getListeningProgress() {
  const result = readJsonFromStorage(LISTENING_RESULT_KEY)

  if (
    result?.version === LISTENING_DATA_VERSION &&
    result?.completed
  ) {
    return {
      value: 4,
      total: 4,
      completed: true,
      started: true,
    }
  }

  const session = readJsonFromStorage(LISTENING_SESSION_KEY)

  if (!session || session.version !== LISTENING_DATA_VERSION) {
    return {
      value: 0,
      total: 4,
      completed: false,
      started: false,
    }
  }

  const value = Array.isArray(session.completedStages)
    ? Math.min(4, session.completedStages.length)
    : 0

  return {
    value,
    total: 4,
    completed: false,
    started:
      value > 0 ||
      session.stage !== 'texts' ||
      Number(session.textIndex) > 0,
  }
}

const SPEAKING_SESSION_KEY = 'hsk4-speaking-lesson1-session'
const SPEAKING_RESULT_KEY = 'hsk4-speaking-lesson1-result'
const SPEAKING_DATA_VERSION = 3

function getSpeakingProgress() {
  const result = readJsonFromStorage(SPEAKING_RESULT_KEY)

  if (
    result?.version === SPEAKING_DATA_VERSION &&
    result?.completed
  ) {
    return { value: 4, total: 4, completed: true, started: true }
  }

  const session = readJsonFromStorage(SPEAKING_SESSION_KEY)

  if (!session || session.version !== SPEAKING_DATA_VERSION) {
    return { value: 0, total: 4, completed: false, started: false }
  }

  const value = Array.isArray(session.completedStages)
    ? Math.min(4, session.completedStages.length)
    : 0

  return {
    value,
    total: 4,
    completed: false,
    started:
      value > 0 ||
      session.stage !== 'repeat' ||
      Number(session.repeatIndex) > 0,
  }
}

const GRAMMAR_SESSION_KEY = 'hsk4-grammar-lesson1-session'
const GRAMMAR_RESULT_KEY = 'hsk4-grammar-lesson1-result'
const GRAMMAR_DATA_VERSION = 2

function getGrammarProgress() {
  const result = readJsonFromStorage(GRAMMAR_RESULT_KEY)

  if (
    result?.version === GRAMMAR_DATA_VERSION &&
    result?.completed
  ) {
    return { value: 5, total: 5, completed: true, started: true }
  }

  const session = readJsonFromStorage(GRAMMAR_SESSION_KEY)

  if (!session || session.version !== GRAMMAR_DATA_VERSION) {
    return { value: 0, total: 5, completed: false, started: false }
  }

  const value = Array.isArray(session.completedSections)
    ? Math.min(5, session.completedSections.length)
    : 0

  return {
    value,
    total: 5,
    completed: false,
    started:
      value > 0 ||
      Number(session.sectionIndex) > 0 ||
      session.showIntro === false,
  }
}


const READING_SESSION_KEY = 'hsk4-reading-lesson1-session'
const READING_RESULT_KEY = 'hsk4-reading-lesson1-result'
const READING_DATA_VERSION = 2

function getReadingProgress() {
  const result = readJsonFromStorage(READING_RESULT_KEY)

  if (
    result?.version === READING_DATA_VERSION &&
    result?.completed
  ) {
    return { value: 3, total: 3, completed: true, started: true }
  }

  const session = readJsonFromStorage(READING_SESSION_KEY)

  if (!session || session.version !== READING_DATA_VERSION) {
    return { value: 0, total: 3, completed: false, started: false }
  }

  const value = Array.isArray(session.completedStages)
    ? Math.min(3, session.completedStages.length)
    : 0

  return {
    value,
    total: 3,
    completed: false,
    started:
      value > 0 ||
      session.stage !== 'intensive' ||
      Number(session.taskIndex) > 0,
  }
}


const WRITING_SESSION_KEY = 'hsk4-writing-lesson1-session'
const WRITING_RESULT_KEY = 'hsk4-writing-lesson1-result'
const WRITING_DATA_VERSION = 2

function getWritingProgress() {
  const result = readJsonFromStorage(WRITING_RESULT_KEY)

  if (
    result?.version === WRITING_DATA_VERSION &&
    result?.completed
  ) {
    return {
      value: 3,
      total: 3,
      completed: true,
      started: true,
    }
  }

  const session = readJsonFromStorage(WRITING_SESSION_KEY)

  if (
    !session ||
    session.version !== WRITING_DATA_VERSION
  ) {
    return {
      value: 0,
      total: 3,
      completed: false,
      started: false,
    }
  }

  const value = Array.isArray(session.completedStages)
    ? Math.min(3, session.completedStages.length)
    : 0

  return {
    value,
    total: 3,
    completed: false,
    started:
      value > 0 ||
      session.stage !== 'order' ||
      Number(session.taskIndex) > 0,
  }
}


const EXAM_TRAINING_SESSION_KEY =
  'hsk4-exam-training-lesson1-session'
const EXAM_TRAINING_RESULT_KEY =
  'hsk4-exam-training-lesson1-result'
const EXAM_TRAINING_DATA_VERSION = 2

function getExamTrainingProgress() {
  const result = readJsonFromStorage(
    EXAM_TRAINING_RESULT_KEY,
  )

  if (
    result?.version ===
      EXAM_TRAINING_DATA_VERSION &&
    result?.completed
  ) {
    return {
      value: 3,
      total: 3,
      completed: true,
      started: true,
    }
  }

  const session = readJsonFromStorage(
    EXAM_TRAINING_SESSION_KEY,
  )

  if (
    !session ||
    session.version !==
      EXAM_TRAINING_DATA_VERSION
  ) {
    return {
      value: 0,
      total: 3,
      completed: false,
      started: false,
    }
  }

  const value = session.submitted
    ? 3
    : Math.min(
        2,
        Math.max(
          0,
          Number(session.sectionIndex) || 0,
        ),
      )

  return {
    value,
    total: 3,
    completed: Boolean(session.submitted),
    started: Boolean(session.started),
  }
}

function HomePage() {
  const [vocabProgress] = useState(() => getVocabularyProgress())
  const [listeningProgress] = useState(() => getListeningProgress())
  const [speakingProgress] = useState(() => getSpeakingProgress())
  const [grammarProgress] = useState(() => getGrammarProgress())
  const [readingProgress] = useState(() => getReadingProgress())
  const [writingProgress] = useState(() => getWritingProgress())
  const [examTrainingProgress] = useState(() => getExamTrainingProgress())
  const [learningStats] = useState(() => getLearningDashboardStats())
  const [dashboard] = useState(() => getDynamicDashboardSnapshot())
  const [diagnostic] = useState(() => getDiagnosticResult())
  const needsDiagnostic = !diagnostic
  const currentLessonId = dashboard.today.lesson?.lessonId || 'lesson-1'

  const skillCards = [
    {
      key: 'vocabulary',
      tone: 'gold',
      icon: <ChineseText pinyin="cí" translation="слово">词</ChineseText>,
      title: <ChineseText pinyin="cíhuì jīhuó" translation="Активация лексики">词汇激活</ChineseText>,
      subtitle: <>16 <ChineseText pinyin="ge héxīn cí" translation="ключевых слов">个核心词</ChineseText> · 32 词库</>,
      progress: vocabProgress,
      to: '/vocabulary',
    },
    {
      key: 'grammar',
      tone: 'jade',
      icon: <ChineseText pinyin="yǔ" translation="язык; речь">语</ChineseText>,
      title: <ChineseText pinyin="yǔfǎ fùxí" translation="Повторение грамматики">语法复习</ChineseText>,
      subtitle: <>10 <ChineseText pinyin="fēnzhōng" translation="минут">分钟</ChineseText> · 5 题</>,
      progress: grammarProgress,
      to: '/grammar',
    },
    {
      key: 'listening',
      tone: 'blue',
      icon: <UiIcon name="headphones" size={34} />,
      title: <ChineseText pinyin="tīnglì xùnliàn" translation="Тренировка аудирования">听力训练</ChineseText>,
      subtitle: <>5 <ChineseText pinyin="kèwén" translation="текстов урока">课文</ChineseText> · 22 <ChineseText pinyin="tí" translation="задания">题</ChineseText> · HSK</>,
      progress: listeningProgress,
      to: '/listening',
    },
    {
      key: 'reading',
      tone: 'terracotta',
      icon: <UiIcon name="book" size={33} />,
      title: <ChineseText pinyin="yuèdú xùnliàn" translation="Тренировка чтения">阅读训练</ChineseText>,
      subtitle: <>10 <ChineseText pinyin="fēnzhōng" translation="минут">分钟</ChineseText> · HSK</>,
      progress: readingProgress,
      to: '/reading',
    },
    {
      key: 'writing',
      tone: 'violet',
      icon: <UiIcon name="pencil" size={33} />,
      title: <ChineseText pinyin="xiězuò liànxí" translation="Письменная тренировка">写作练习</ChineseText>,
      subtitle: <>10 <ChineseText pinyin="fēnzhōng" translation="минут">分钟</ChineseText> · 5 + 2</>,
      progress: writingProgress,
      to: '/writing',
    },
    {
      key: 'speaking',
      tone: 'cinnabar',
      icon: <UiIcon name="mic" size={34} />,
      title: <><ChineseText pinyin="kǒuyǔ xùnliàn" translation="Тренировка устной речи">口语训练</ChineseText> · HSKK</>,
      subtitle: <><ChineseText pinyin="tīng hòu chóngfù" translation="повторение после прослушивания">听后重复</ChineseText> · <ChineseText pinyin="kàn tú shuōhuà" translation="говорение по картинке">看图说话</ChineseText></>,
      progress: speakingProgress,
      to: '/speaking',
    },
  ]

  return (
    <main className="page-shell home-v11">
      <header className="home-v11-topbar">
        <div className="home-v11-brand">
          <div className="home-v11-brand-seal"><ChineseText pinyin="jì" translation="навык; техника">技</ChineseText></div>
          <div>
            <h1>HSK 4 · <ChineseText pinyin="chōngcì jìhuà" translation="план интенсивной подготовки">冲刺计划</ChineseText></h1>
            <p>Экспресс-подготовка HSK 4 · HSKK</p>
          </div>
        </div>
        <nav className="home-v11-nav" aria-label="Навигация курса">
          <Link to="/courses" className="home-v11-nav-pill"><ChineseText pinyin="kèchéng" translation="все уроки" tooltipPosition="bottom">课程</ChineseText><small>Все уроки</small></Link>
          <Link to="/exam-strategies" className="home-v11-nav-pill"><ChineseText pinyin="yìngshì jìqiǎo" translation="экзаменационные стратегии" tooltipPosition="bottom">应试技巧</ChineseText><small>Стратегии</small></Link>
          <Link to="/plan" className="home-v11-nav-pill"><ChineseText pinyin="shí'èr zhōu jìhuà" translation="план на 12 недель" tooltipPosition="bottom">12 周计划</ChineseText><small>Мой план</small></Link>
          <button className="home-v11-icon-btn" aria-label="Музыка"><UiIcon name="music" size={21} /></button>
          <button className="home-v11-icon-btn" aria-label="Уведомления"><UiIcon name="bell" size={21} /></button>
          <button className="home-v11-icon-btn" aria-label="Профиль"><UiIcon name="user" size={20} /></button>
        </nav>
      </header>

      <section className="home-v11-hero">
        <div className="home-v11-hero-copy">
          <div className="home-v11-week-pill">
            {needsDiagnostic ? (
              <ChineseText pinyin="dì yī zhōu · qǐdiǎn zhěnduàn" translation="Неделя 1 · Стартовая диагностика" tooltipPosition="bottom">第 1 周 · 起点诊断</ChineseText>
            ) : (
              <><ChineseText pinyin="dì" translation="порядковый показатель">第</ChineseText> {dashboard.today.lesson?.week ?? 2} <ChineseText pinyin="zhōu" translation="неделя">周</ChineseText> · <ChineseText pinyin="dì" translation="порядковый показатель">第</ChineseText> {dashboard.today.day?.day ?? 1} <ChineseText pinyin="tiān" translation="день">天</ChineseText></>
            )}
          </div>

          <h2 className="home-v11-slogan">
            <span>
              <ChineseText pinyin="xiān" translation="сначала" tooltipPosition="bottom">先</ChineseText>
              <ChineseText pinyin="nòng qīngchu" translation="выяснить; разобраться" tooltipPosition="bottom">弄清楚</ChineseText>
              <ChineseText pinyin="yǐjīng" translation="уже" tooltipPosition="bottom">已经</ChineseText>
              <ChineseText pinyin="huì" translation="уметь" tooltipPosition="bottom">会</ChineseText>
              <ChineseText pinyin="de" translation="то, что…" tooltipPosition="bottom">的</ChineseText>，
            </span>
            <span>
              <ChineseText pinyin="zài" translation="затем" tooltipPosition="bottom">再</ChineseText>
              <ChineseText pinyin="gèng kuài" translation="ещё быстрее" tooltipPosition="bottom">更快</ChineseText>
              <ChineseText pinyin="biàn qiáng" translation="стать сильнее" tooltipPosition="bottom">变强</ChineseText>。
            </span>
          </h2>
          <p className="home-v11-slogan-ru">Сначала выясним, что уже получается, а затем точечно усилим слабые места.</p>

          <div className="home-v11-today-meta">
            <strong>
              {needsDiagnostic ? <ChineseText pinyin="qǐdiǎn zhěnduàn" translation="стартовая диагностика">起点诊断</ChineseText> : <ChineseText pinyin={dashboard.today.lesson?.pinyin || 'jiǎndān de àiqíng'} translation={dashboard.today.lesson?.translation || 'Простая любовь'}>{dashboard.today.lesson?.title || '简单的爱情'}</ChineseText>}
            </strong>
            <span>{needsDiagnostic ? '词汇 · 语法 · 听力 · 阅读 · 写作 · HSKK' : `Урок ${dashboard.today.lesson?.lessonNumber ?? 1} · День ${dashboard.today.day?.day ?? 1}`}</span>
            <span>{needsDiagnostic ? '≈ 35–40 минут' : `${Math.max(1, Math.round((dashboard.today.estimateSeconds || 0) / 60))} минут · прогресс ${dashboard.lessonProgress}%`}</span>
          </div>

          <Link to={needsDiagnostic ? '/diagnostic' : '/today'} className="home-v11-cta">
            {needsDiagnostic ? <><ChineseText pinyin="kāishǐ zhěnduàn" translation="начать диагностику">开始诊断</ChineseText><span>Начать диагностику</span></> : <><ChineseText pinyin="jīnrì jìhuà" translation="план на сегодня">今日计划</ChineseText><span>Открыть план дня</span></>}
            <b>→</b>
          </Link>
        </div>

        <div className="home-v11-hero-side">
        <aside className="home-v11-focus-card">
          <div className="home-v11-quote">“</div>
          <h3><ChineseText pinyin="jīnrì zhòngdiǎn" translation="Главный фокус дня">今日重点</ChineseText></h3>
          <p>{needsDiagnostic ? <ChineseText pinyin="xiān zhǎochū ruòxiàng, zài kāishǐ chōngcì" translation="Сначала найдём слабые места, затем начнём интенсивную подготовку">先找出弱项，再开始冲刺。</ChineseText> : <ChineseText pinyin="měitiān zuò duì yìdiǎn, jìnbù jiù huì kàn de jiàn" translation="Каждый день делай немного правильной работы — и прогресс станет заметен">每天做对一点，进步就会看得见。</ChineseText>}</p>
          <div className="home-v11-quote end">”</div>
        </aside>
        <div className="home-v11-mascot-zone">
          <MoyuMotivator compact />
        </div>
        </div>
      </section>

      {(needsDiagnostic || currentLessonId === 'lesson-1') && (
        <section className={`home-v11-skills ${needsDiagnostic ? 'locked' : ''}`} aria-label="Основные тренировки">
          {skillCards.map((card) => (
            <Link key={card.key} to={card.to} className={`home-v11-skill ${card.tone}`}>
              <div className="home-v11-skill-icon">{card.icon}</div>
              <div className="home-v11-skill-copy"><h3>{card.title}</h3><p>{card.subtitle}</p></div>
              <div className="home-v11-card-art" aria-hidden="true" />
              <div className="home-v11-skill-progress"><i style={{ width: `${card.progress.total ? Math.round((card.progress.value / card.progress.total) * 100) : 0}%` }} /><span>{card.progress.value}/{card.progress.total}</span></div>
              <span className="home-v11-card-arrow">→</span>
            </Link>
          ))}
        </section>
      )}

      {!needsDiagnostic && currentLessonId !== 'lesson-1' && (
        <section className="home-v11-current">
          <div><small>УРОК {dashboard.today.lesson?.lessonNumber} · ДЕНЬ {dashboard.today.day?.day}</small><h3>{dashboard.today.day?.title}</h3><p>{dashboard.today.day?.translation}</p></div>
          <Link to="/today">Продолжить задания →</Link>
        </section>
      )}

      <section className="home-v11-quick-row">
        <Link to="/review" className="home-v11-quick review">
          <span className="home-v11-quick-seal">复</span>
          <div><strong><ChineseTitle text="今日复习" /></strong><small><ChineseTitle text="错题本" /> · интервальное повторение</small></div>
          <div className="home-v11-quick-count"><strong>{learningStats.dueToday}</strong><span>сегодня · <ChineseTitle text={`错题 ${learningStats.activeErrors}`} /></span></div>
          <span className="home-v11-quick-arrow">→</span>
        </Link>
        <Link to="/chengyu" className="home-v11-quick chengyu">
          <span className="home-v11-quick-seal">成</span>
          <div><strong><ChineseTitle text="成语加速器" /></strong><small>HSKK · <ChineseTitle text="50 成语" /></small></div>
          <div className="home-v11-quick-count"><strong>{learningStats.chengyuMastered}/50</strong><span>освоено · сегодня {learningStats.dueChengyu}</span></div>
          <span className="home-v11-quick-arrow">→</span>
        </Link>
      </section>

      <section className="home-v11-info">
        <div><span className="home-v11-info-icon"><UiIcon name="calendar" size={25} /></span><p><strong>≈ 35–40 минут</strong><small>спокойный рабочий темп</small></p></div>
        <div><span className="home-v11-info-icon"><UiIcon name="headphones" size={25} /></span><p><strong>Listening Ladder</strong><small>первое и второе прослушивание</small></p></div>
        <div><span className="home-v11-info-icon"><UiIcon name="target" size={25} /></span><p><strong><ChineseTitle text="错题自动收集" /></strong><small>реальные слабые места</small></p></div>
        <div><span className="home-v11-info-icon">芽</span><p><strong><ChineseTitle text="每天坚持" /></strong><small>понемногу, но регулярно</small></p></div>
      </section>

      <section className="home-v11-shortcuts">
        <Link to="/plan"><UiIcon name="calendar" size={20} /> <ChineseText pinyin="xuéxí jìhuà" translation="учебный план">学习计划</ChineseText></Link>
        <Link to="/exam-training"><UiIcon name="target" size={20} /> <ChineseText pinyin="tíxíng xùnliàn" translation="тренировка типов заданий">题型训练</ChineseText> · {examTrainingProgress.value}/{examTrainingProgress.total}</Link>
        <Link to="/dashboard"><UiIcon name="chart" size={20} /> <ChineseText pinyin="xuéxí jìlù" translation="история обучения">学习记录</ChineseText></Link>
      </section>

      <section className="home-v11-dashboard"><HomeDashboard snapshot={dashboard} /></section>
      <div className="home-v11-motto"><span /><ChineseText pinyin="měitiān jìnbù yìdiǎndiǎn, kǎoshì gèng jìn yíbù" translation="Каждый день немного вперёд — ещё на шаг ближе к экзамену!">每天进步一点点，考试更进一步！</ChineseText><span /></div>
    </main>
  )
}

function App() {
  return (
    <>
    <InkCursorEffect />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/vocabulary" element={<VocabularyPage />} />
      <Route path="/listening" element={<ListeningPage />} />
      <Route path="/speaking" element={<SpeakingPage />} />
      <Route path="/grammar" element={<GrammarPage />} />
      <Route path="/reading" element={<ReadingPage />} />
      <Route path="/writing" element={<WritingPage />} />
      <Route path="/exam-training" element={<ExamTrainingPage />} />
      <Route path="/review" element={<ReviewPage />} />
      <Route path="/chengyu" element={<ChengyuPage />} />
      <Route path="/today" element={<TodayPlanPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/diagnostic" element={<DiagnosticPage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/plan" element={<PreparationPlanPage />} />
      <Route path="/lesson/:lessonId/day/:dayNumber" element={<LessonDayPage />} />
      <Route path="/final-week/day/:dayNumber" element={<FinalWeekPage />} />
      <Route path="/checkpoint/:checkpointId" element={<CheckpointPage />} />
      <Route path="/exam-strategies" element={<ExamStrategiesPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
    </>
  )
}

export default App
