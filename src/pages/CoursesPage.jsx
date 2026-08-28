import { Link } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import { getAllLessonPlans } from '../data/courseRegistry.js'
import { FINAL_WEEK_DAYS } from '../data/finalWeekData.js'
import './CoursesPage.css'

export default function CoursesPage() {
  const lessons = getAllLessonPlans()

  return (
    <main className="courses-page">
      <div className="courses-shell">
        <header className="courses-topbar">
          <Link to="/">← На главную</Link>
          <span>
            <ChineseText pinyin="kèchéng" translation="курс; уроки" tooltipPosition="bottom">
              课程
            </ChineseText>{' '}
            · режим просмотра
          </span>
        </header>

        <section className="courses-hero">
          <p>HSK 4 · Standard Course 4A/4B</p>
          <h1>
            <ChineseText pinyin="kèchéng" translation="уроки курса">课程</ChineseText>
            {' '}· Все уроки
          </h1>
          <p className="courses-lead">
            Это экран предпросмотра для учителя. Открытие Day 1 / Day 2 / Day 3 не меняет текущий учебный маршрут и не отмечает урок выполненным.
          </p>
        </section>

        <section className="courses-grid">
          {lessons.map((lesson) => (
            <article key={lesson.lessonId} className="course-card">
              <div className="course-card-number">{String(lesson.lessonNumber).padStart(2, '0')}</div>
              <div className="course-card-main">
                <span className="course-card-week">Неделя {lesson.week}</span>
                <h2>
                  <ChineseText pinyin={lesson.pinyin} translation={lesson.translation}>
                    {lesson.title}
                  </ChineseText>
                </h2>
                <p>{lesson.translation}</p>
                <div className="course-day-links">
                  {lesson.days.map((day) => (
                    <Link
                      key={day.day}
                      to={`/lesson/${lesson.lessonId}/day/${day.day}`}
                      title={`Lesson ${lesson.lessonNumber} · Day ${day.day}`}
                    >
                      День {day.day}
                    </Link>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="course-final-week">
          <div className="course-card-number">12</div>
          <div className="course-card-main">
            <span className="course-card-week">Финальная неделя</span>
            <h2><ChineseText pinyin="kǎoqián chōngcì" translation="экзаменационный рывок">考前冲刺</ChineseText></h2>
            <p>2 HSK mocks · 2 HSKK mocks · targeted repair · итоговый отчёт</p>
            <div className="course-day-links final-week-links">
              {FINAL_WEEK_DAYS.map((day) => (
                <Link key={day.day} to={`/final-week/day/${day.day}`}>День {day.day}</Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
