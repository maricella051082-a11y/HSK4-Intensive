import { Link } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import { getDynamicDashboardSnapshot } from '../utils/dashboardStats.js'
import './DashboardPage.css'

function DashboardPage() {
  const snapshot = getDynamicDashboardSnapshot()
  const { today, review, skills, weaknesses, listeningCategories, miniExam, nextAction, diagnostic } = snapshot

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <div className="dashboard-topbar">
          <Link to="/" className="dashboard-back">← На главную</Link>
          <Link to="/today" className="dashboard-today-link">План на сегодня →</Link>
        </div>

        <section className="dashboard-hero">
          <div>
            <p className="dashboard-kicker">学习进度 · МОЙ ПРОГРЕСС</p>
            <h1>Что уже получается и что нужно повторить</h1>
            <p>
              Здесь показываются только реальные результаты выполненных заданий.
              Если навык ещё не проверялся, сайт не придумывает процент.
            </p>
          </div>

          <div className="dashboard-lesson-progress">
            <strong>{snapshot.lessonProgress}%</strong>
            <span>{today.isFinalWeek ? 'завершено в Week 12' : today.isCheckpoint ? 'выполнено в контрольной точке' : `выполнено в уроке ${today.lesson?.lessonNumber ?? 1}`}</span>
          </div>
        </section>

        <section className="dashboard-action-card">
          <div>
            <span className="dashboard-action-seal">今</span>
            <div>
              <strong>{nextAction.label}</strong>
              <p>{nextAction.reason}</p>
            </div>
          </div>
          <Link to={nextAction.route}>Открыть →</Link>
        </section>

        <section className="dashboard-readiness">
          <div>
            <ChineseText pinyin="kǎoshì zhǔnbèidù" translation="Готовность к экзамену">
              考试准备度
            </ChineseText>
            <span>Готовность к HSK 4</span>
          </div>

          <strong>{Number.isFinite(snapshot.examReadiness) ? `${snapshot.examReadiness}%` : '—'}</strong>
          <p>{snapshot.examReadinessReason}</p>
        </section>

        {diagnostic && (
          <section className="dashboard-diagnostic-profile">
            <div>
              <strong>起点诊断 · Стартовый профиль</strong>
              <span>
                HSK {diagnostic.hskProfile}% · HSKK{' '}
                {Number.isFinite(diagnostic.hskkProfile)
                  ? `${diagnostic.hskkProfile}%`
                  : 'не проверено'}
              </span>
            </div>

            <Link to="/diagnostic">Посмотреть диагностику →</Link>
          </section>
        )}

        <section className="dashboard-section">
          <div className="dashboard-section-title">
            <div>
              <h2>Последние проверенные результаты по навыкам</h2>
              <p>Сайт показывает последний реальный результат: диагностику или более свежую тренировку.</p>
            </div>
          </div>

          <div className="dashboard-skill-grid">
            {skills.map((skill) => (
              <Link key={skill.id} to={skill.route} className={`dashboard-skill-card ${skill.state}`}>
                <div className="dashboard-skill-title">
                  <div>
                    <ChineseText pinyin={skill.pinyin} translation={skill.label}>
                      {skill.chinese}
                    </ChineseText>
                    <span>{skill.label}</span>
                  </div>

                  <strong>{skill.progressText}</strong>
                </div>

                <p>{skill.note}</p>

                <div className="dashboard-skill-track">
                  <span
                    style={{
                      width: `${skill.percent ?? 0}%`,
                    }}
                  />
                </div>

                <small>
                  {skill.state === 'strong'
                    ? 'Уверенно'
                    : skill.state === 'stable'
                      ? 'Нужно закреплять'
                      : skill.state === 'weak'
                        ? 'Слабое место'
                        : skill.state === 'in-progress'
                          ? 'Тренировка начата'
                          : 'Результата пока нет'}
                </small>
              </Link>
            ))}
          </div>
        </section>

        {listeningCategories?.length > 0 && (
          <section className="dashboard-section">
            <div className="dashboard-section-title">
              <div>
                <h2>听力 · Где именно теряется аудирование</h2>
                <p>Первое прослушивание считается отдельно от восстановления после второго шанса.</p>
              </div>
            </div>
            <div className="dashboard-listening-category-grid">
              {listeningCategories.slice(0, 8).map((item) => (
                <article key={item.category} className={item.percent < 60 ? 'weak' : item.percent < 80 ? 'stable' : 'strong'}>
                  <div><strong>{item.category}</strong><b>{item.percent}%</b></div>
                  <span>с первого раза · {item.firstCorrect}/{item.total}</span>
                  <small>после второго: {item.recoveryPercent}% · микродиктант: {item.dictationPercent}%</small>
                  <i><em style={{ width: `${item.percent}%` }} /></i>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="dashboard-two-column">
          <article className="dashboard-panel">
            <div className="dashboard-panel-head">
              <div>
                <ChineseText pinyin="fùxí" translation="Повторение">
                  复习
                </ChineseText>
                <span>Что нужно вернуть</span>
              </div>
              <strong>{review.dueToday}</strong>
            </div>

            <div className="dashboard-review-stats">
              <div>
                <b>{review.dueSrs}</b>
                <span>слов на сегодня</span>
              </div>
              <div>
                <b>{review.dueErrors}</b>
                <span>ошибок на сегодня</span>
              </div>
              <div>
                <b>{review.activeErrors}</b>
                <span>активных ошибок всего</span>
              </div>
            </div>

            <Link to="/review">Перейти к повторению →</Link>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-head">
              <div>
                <ChineseText pinyin="jīnrì" translation="Сегодня">
                  今日
                </ChineseText>
                <span>Текущий учебный день</span>
              </div>
              <strong>{today.progress?.percent ?? 0}%</strong>
            </div>

            <p>
              {today.isFinalWeek ? `Week 12 · день ${today.day?.day ?? 1}` : today.isCheckpoint ? `${today.checkpoint?.translation || 'Checkpoint'} · уроки ${today.checkpoint?.lessons?.[0] ?? ''}–${today.checkpoint?.lessons?.at(-1) ?? ''}` : `Урок ${today.lesson?.lessonNumber ?? 1} · день ${today.day?.day ?? 1}`}<br />
              {today.modeConfig?.translation || 'Основная тренировка'}<br />
              Выполнено {today.progress?.completed ?? 0} из {today.progress?.total ?? 0}
            </p>

            <Link to="/today">Открыть план →</Link>
          </article>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-title">
            <div>
              <h2>Слабые места</h2>
              <p>Они собираются автоматически из реальных ошибок.</p>
            </div>
          </div>

          {weaknesses.length ? (
            <div className="dashboard-weakness-list">
              {weaknesses.map((item) => (
                <article key={item.key}>
                  <div>
                    <strong>{item.moduleLabel}</strong>
                    <span>{item.label}</span>
                  </div>
                  <b>{item.count}</b>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              Пока активных ошибок нет. Они появятся здесь после реальных попыток.
            </div>
          )}
        </section>

        <section className="dashboard-exam-card">
          <div>
            <ChineseText pinyin="tíxí xùnliàn" translation="Экзаменационные задания">
              题型训练
            </ChineseText>
            <span>Мини-тест HSK урока 1</span>
          </div>

          <strong>{miniExam === null ? 'ещё не выполнен' : `${miniExam}%`}</strong>

          <Link to="/exam-training">
            {miniExam === null ? 'Открыть мини-тест →' : 'Посмотреть или повторить →'}
          </Link>
        </section>
      </div>
    </main>
  )
}

export default DashboardPage
