import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import ActivityRenderer from '../engine/ActivityRenderer.jsx'
import { getLessonDay, getLessonPlan, getNextLessonPlan } from '../data/courseRegistry.js'
import { getCheckpointAfterLesson } from '../data/checkpointData.js'
import { getLearningDashboardStats } from '../utils/learningStore.js'
import {
  STUDY_MODES,
  completePlannerDay,
  getActivitiesForMode,
  getModeConfig,
  getModeDayProgress,
  getModeEstimateSeconds,
  getPlannerState,
  getStudyMode,
  setPlannerDay,
  setStudyMode,
} from '../utils/coursePlanner.js'
import { getAdaptiveRecommendation } from '../utils/adaptivePlanner.js'
import './LessonDayPage.css'

function minutes(seconds) {
  return Math.max(1, Math.round((Number(seconds) || 0) / 60))
}

export default function LessonDayPage() {
  const { lessonId, dayNumber } = useParams()
  const navigate = useNavigate()
  const lesson = getLessonPlan(lessonId)
  const day = getLessonDay(lessonId, dayNumber)
  const [mode, setMode] = useState(() => getStudyMode())
  const [refreshKey, forceRefresh] = useState(0)
  const recommendation = useMemo(() => getAdaptiveRecommendation(), [lessonId, dayNumber, refreshKey])

  const activities = useMemo(
    () => getActivitiesForMode(day, mode),
    [day, mode],
  )

  const progress = useMemo(
    () => getModeDayProgress(day, mode),
    [day, mode, refreshKey],
  )

  const dueStats = useMemo(
    () => getLearningDashboardStats(),
    [refreshKey, day, mode],
  )

  if (!lesson || !day) {
    return <Navigate to="/" replace />
  }

  const config = getModeConfig(mode)
  const estimateSeconds = getModeEstimateSeconds(day, mode)
  const previousDay = day.day > 1 ? day.day - 1 : null
  const nextDay = day.day < lesson.days.length ? day.day + 1 : null
  const nextLesson = getNextLessonPlan(lesson.lessonId)
  const checkpointAfterLesson = getCheckpointAfterLesson(lesson.lessonNumber)
  const isPlannerDay =
    getPlannerState().currentLessonId === lesson.lessonId &&
    Number(getPlannerState().currentDay) === Number(day.day)
  const reviewReady = dueStats.dueToday === 0
  const canFinish = progress.total > 0 && progress.percent === 100 && reviewReady

  function chooseMode(nextMode) {
    setStudyMode(nextMode)
    setMode(nextMode)
    forceRefresh((value) => value + 1)
  }

  function finishDay() {
    if (!canFinish) return

    setPlannerDay(lesson.lessonId, day.day)
    completePlannerDay({
      lessonId: lesson.lessonId,
      dayNumber: day.day,
      mode,
    })
    navigate('/today')
  }

  return (
    <main className="lesson-engine-page">
      <div className="lesson-engine-shell">
        <div className="lesson-engine-topbar">
          <div className="lesson-engine-topbar-links">
            <Link to="/" className="lesson-engine-back">← На главную</Link>
            <Link to="/courses" className="lesson-engine-back">
              <ChineseText pinyin="kèchéng" translation="все уроки" tooltipPosition="bottom">课程</ChineseText> · Все уроки
            </Link>
          </div>
          <span><ChineseText pinyin="jīnrì jìhuà" translation="план на сегодня" tooltipPosition="bottom">今日计划</ChineseText> · План на сегодня</span>
        </div>

        <section className="lesson-engine-hero">
          <div>
            <p className="lesson-engine-kicker">
              НЕДЕЛЯ {lesson.week} · УРОК {lesson.lessonNumber} · ДЕНЬ {day.day}
            </p>

            <h1>
              <ChineseText
                pinyin={lesson.pinyin}
                translation={lesson.translation}
              >
                {lesson.title}
              </ChineseText>
            </h1>

            <h2>
              {day.pinyin ? (
                <ChineseText pinyin={day.pinyin} translation={day.translation}>
                  {day.title}
                </ChineseText>
              ) : day.title}
            </h2>
            <p>{day.translation}</p>
          </div>

          <div className="lesson-engine-progress-card">
            <strong>{progress.completed} / {progress.total}</strong>
            <span>
              завершено в режиме{' '}
              <ChineseText pinyin={config.pinyin} translation={config.translation} tooltipPosition="bottom">
                {config.chinese}
              </ChineseText>
            </span>

            <div className="lesson-engine-progress-track">
              <div
                className="lesson-engine-progress-fill"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <small>≈ {minutes(estimateSeconds)} минут сегодня</small>
          </div>
        </section>

        <section className="lesson-adaptive-recommendation">
          <div>
            <strong>推荐模式 · Рекомендация по нагрузке</strong>
            <p>{recommendation.reason}</p>
          </div>
          <button type="button" onClick={() => chooseMode(recommendation.mode)}>
            Выбрать {STUDY_MODES[recommendation.mode].translation} →
          </button>
        </section>

        <section className="lesson-mode-section">
          <div className="lesson-mode-heading">
            <div>
              <strong>Сколько времени есть сегодня?</strong>
              <span>Выбранный вариант сохранится и останется при следующем открытии плана.</span>
            </div>
          </div>

          <div className="lesson-mode-grid">
            {Object.values(STUDY_MODES).map((item) => (
              <button
                type="button"
                key={item.id}
                className={mode === item.id ? 'active' : ''}
                onClick={() => chooseMode(item.id)}
              >
                <ChineseText
                  pinyin={item.pinyin}
                  translation={item.translation}
                  tooltipPosition="bottom"
                >
                  {item.chinese}
                </ChineseText>
                <span className="lesson-mode-russian">{item.translation}</span>
                <b>{item.target}</b>
                <small>{item.description}</small>
              </button>
            ))}
          </div>

          <div className="lesson-mode-current">
            <strong>{config.chinese}</strong>
            <span>
              План этого дня: ≈ {minutes(estimateSeconds)} мин · {progress.total} проверяемых заданий или разделов.
            </span>
          </div>
        </section>

        {dueStats.dueToday > 0 && (
          <Link to="/review" className="lesson-due-banner">
            <div>
              <strong><ChineseText pinyin="jīnrì fùxí" translation="повторение на сегодня">今日复习</ChineseText> ещё не закрыт</strong>
              <span>
                На сегодня: повторение слов — {dueStats.dueSrs} · ошибки — {dueStats.dueErrors}.
                Завершить учебный день можно после этого повторения.
              </span>
            </div>
            <b>Открыть →</b>
          </Link>
        )}

        <section className="lesson-engine-focus">
          <span><ChineseText pinyin="jīnrì zhòngdiǎn" translation="главная цель на сегодня">今日重点</ChineseText></span>
          <p>{day.focus}</p>
        </section>

        <section className="lesson-engine-schema-note">
          <strong>Как работает режим</strong>
          <p>
            «Обязательный минимум» оставляет только самое важное на каждый день:
            повторение, аудирование и устную речь. «Основная тренировка» добавляет
            главную работу по теме урока. «Усиленная тренировка» добавляет
            экзаменационные задания и дополнительную практику. Прогресс считается
            только по заданиям выбранного варианта.
          </p>
        </section>

        <div className="lesson-engine-activities">
          {activities.map((activity, index) => (
            <div className="lesson-engine-activity-wrap" key={activity.id}>
              <div className="lesson-engine-number">
                {String(index + 1).padStart(2, '0')}
              </div>

              <ActivityRenderer
                activity={activity}
                onStatusChange={() => forceRefresh((value) => value + 1)}
              />
            </div>
          ))}
        </div>

        <section className={['lesson-finish-day', canFinish ? 'ready' : ''].join(' ')}>
          <div>
            <strong>
              {canFinish ? <><ChineseText pinyin="jīnrì jìhuà wánchéng" translation="план на сегодня выполнен">今日计划完成</ChineseText> · План выполнен</> : 'Чтобы завершить день'}
            </strong>
            <p>
              {!reviewReady
                ? 'Сначала выполни повторение слов и разбор ошибок на сегодня.'
                : progress.percent < 100
                  ? `Осталось: ${progress.total - progress.completed} из ${progress.total}.`
                  : 'Все обязательные элементы выбранного режима закрыты.'}
            </p>
          </div>

          {isPlannerDay ? (
            <button type="button" disabled={!canFinish} onClick={finishDay}>
              {day.day < lesson.days.length ? 'Завершить день →' : `Завершить урок ${lesson.lessonNumber} →`}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canFinish}
              onClick={() => {
                setPlannerDay(lesson.lessonId, day.day)
                finishDay()
              }}
            >
              Сделать текущим и завершить →
            </button>
          )}
        </section>

        <section className="lesson-engine-day-nav">
          {previousDay ? (
            <Link to={`/lesson/${lesson.lessonId}/day/${previousDay}`}>
              ← Посмотреть день {previousDay}
            </Link>
          ) : (
            <span />
          )}

          {nextDay ? (
            <Link to={`/lesson/${lesson.lessonId}/day/${nextDay}`}>
              Посмотреть день {nextDay} →
            </Link>
          ) : checkpointAfterLesson ? (
            <span>После завершения дня откроется {checkpointAfterLesson.translation} →</span>
          ) : nextLesson ? (
            <span>После завершения дня откроется урок {nextLesson.lessonNumber} →</span>
          ) : lesson.lessonId === 'lesson-20' ? (
            <Link to="/final-week/day/1">После завершения откроется Week 12 · 考前冲刺 →</Link>
          ) : (
            <span>Последний доступный урок</span>
          )}
        </section>
      </div>
    </main>
  )
}
