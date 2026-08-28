import { Link, Navigate } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import { getTodayPlanSnapshot, resetCoursePlanner } from '../utils/coursePlanner.js'
import './TodayPlanPage.css'

export default function TodayPlanPage() {
  const snapshot = getTodayPlanSnapshot()

  if (!snapshot.lesson || !snapshot.day) {
    return <Navigate to="/" replace />
  }

  if (snapshot.isCheckpoint && snapshot.checkpoint) {
    return <Navigate to={`/checkpoint/${snapshot.checkpoint.id}`} replace />
  }

  if (snapshot.isFinalWeek && !snapshot.courseFinished) {
    return <Navigate to={`/final-week/day/${snapshot.day.day}`} replace />
  }

  if (!snapshot.planner.lessonCompleted && !snapshot.courseFinished) {
    return (
      <Navigate
        to={`/lesson/${snapshot.lesson.lessonId}/day/${snapshot.day.day}`}
        replace
      />
    )
  }

  return (
    <main className="today-boundary-page">
      <div className="today-boundary-card">
        <div className="today-boundary-seal">✓</div>

        <p>{snapshot.courseFinished ? 'НЕДЕЛЯ 12 · КУРС ЗАВЕРШЁН' : `НЕДЕЛЯ ${snapshot.lesson.week} · УРОК ${snapshot.lesson.lessonNumber}`}</p>

        <h1>
          <ChineseText
            pinyin={snapshot.lesson.pinyin}
            translation={snapshot.lesson.translation}
          >
            {snapshot.lesson.title}
          </ChineseText>
        </h1>

        <h2>{snapshot.courseFinished ? '12 недель подготовки завершены' : '3 учебных дня завершены'}</h2>

        <p className="today-boundary-text">
          {snapshot.courseFinished
            ? 'Финальная экзаменационная неделя завершена. Все пробники, самооценка HSKK и итоговый отчёт сохранены в этом браузере.'
            : `Урок ${snapshot.lesson.lessonNumber} завершён.`}
        </p>

        <div className="today-boundary-actions">
          <Link to="/" className="today-boundary-primary">
            На главную
          </Link>

          <button
            type="button"
            onClick={() => {
              resetCoursePlanner()
              window.location.assign('/today')
            }}
          >
            Начать курс заново с урока 1
          </button>
        </div>
      </div>
    </main>
  )
}
