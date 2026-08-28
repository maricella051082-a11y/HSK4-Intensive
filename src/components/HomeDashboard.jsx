import { Link } from 'react-router-dom'
import ChineseText from './ChineseText.jsx'
import './HomeDashboard.css'

function HomeDashboard({ snapshot }) {
  const { today, review, weaknesses, skills, lessonProgress, diagnostic, nextAction } = snapshot
  const topWeaknesses = weaknesses.slice(0, 2)
  const shownSkills = skills.filter((item) => item.percent !== null).slice(0, 4)

  return (
    <section className="home-dynamic-dashboard">
      <article className="home-dash-card">
        <div className="home-dash-head">
          <div>
            <ChineseText pinyin="jīnrì" translation="Сегодня">
              今日
            </ChineseText>
            <span>Сегодня</span>
          </div>
          <strong>{diagnostic ? `${today.progress?.percent ?? 0}%` : '起点'}</strong>
        </div>

        <p>
          {diagnostic
            ? `${today.modeConfig?.translation || 'Основная тренировка'} · ${today.progress?.completed ?? 0}/${today.progress?.total ?? 0} заданий`
            : 'Стартовая диагностика · примерно 35–40 минут'}
        </p>

        <div className="home-mini-track">
          <span style={{ width: `${diagnostic ? today.progress?.percent ?? 0 : 0}%` }} />
        </div>

        <Link to={nextAction.route}>{nextAction.label} →</Link>
      </article>

      <article className="home-dash-card">
        <div className="home-dash-head">
          <div>
            <ChineseText pinyin="ruòxiàng" translation="Слабые места">
              弱项
            </ChineseText>
            <span>Слабые места</span>
          </div>
          <strong>{review.activeErrors}</strong>
        </div>

        {topWeaknesses.length ? (
          <div className="home-weak-list">
            {topWeaknesses.map((item) => (
              <span key={item.key}>
                {item.moduleLabel}: {item.label} · {item.count}
              </span>
            ))}
          </div>
        ) : (
          <p>Пока активных ошибок нет.</p>
        )}

        <Link to="/review">Открыть тетрадь ошибок →</Link>
      </article>

      <article className="home-dash-card home-dash-progress">
        <div className="home-dash-head">
          <div>
            <ChineseText pinyin="xuéxí jìndù" translation="Учебный прогресс">
              学习进度
            </ChineseText>
            <span>Прогресс урока {today.lesson?.lessonNumber ?? 1}</span>
          </div>
          <strong>{lessonProgress}%</strong>
        </div>

        {shownSkills.length ? (
          <div className="home-skill-list">
            {shownSkills.map((skill) => (
              <div key={skill.id}>
                <span>{skill.label}</span>
                <b>{skill.percent}%</b>
              </div>
            ))}
          </div>
        ) : (
          <p>Результаты появятся после первых выполненных разделов.</p>
        )}

        <Link to="/dashboard">Посмотреть весь прогресс →</Link>
      </article>
    </section>
  )
}

export default HomeDashboard
