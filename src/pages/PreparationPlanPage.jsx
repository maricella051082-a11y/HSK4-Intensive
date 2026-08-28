import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDynamicDashboardSnapshot } from '../utils/dashboardStats.js'
import moyu from '../assets/design/moyu5.png'
import './PreparationPlanPage.css'

const PHASES = [
  ['Старт', 'Диагностика и постановка цели', 'Определяем исходный уровень и рабочий темп.'],
  ['Недели 1–2', 'Слова и иероглифы', 'Активная лексика, 成语 и интервальное повторение.'],
  ['Недели 3–4', 'Грамматика и чтение', 'Конструкции HSK 4 и понимание структуры текста.'],
  ['Недели 5–7', 'Аудирование и письмо', 'Первое прослушивание, порядок слов и связный ответ.'],
  ['Недели 8–10', 'HSKK и смешанная практика', 'Повторение, описание картинки и свободная речь.'],
  ['Недели 11–12', 'Экзаменационный финиш', 'Пробники, слабые места и финальный отчёт.'],
]
const CHECKLIST = [
  ['today', 'Выполнить основной план дня', '/today'],
  ['review', 'Разобрать назначенные повторения', '/review'],
  ['vocabulary', 'Повторить активную лексику', '/vocabulary'],
  ['listening', 'Сделать короткое аудирование', '/listening'],
  ['writing', 'Написать хотя бы один ответ', '/writing'],
]
const SKILLS = { vocabulary:['词汇','Лексика','#c69238'], grammar:['语法','Грамматика','#59816a'], listening:['听力','Аудирование','#4f7da3'], reading:['阅读','Чтение','#b76845'], writing:['写作','Письмо','#76619a'] }
const storageKey = () => { const d=new Date(); return `hsk4-daily-checklist-${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}` }
const loadChecklist = () => { try { return JSON.parse(localStorage.getItem(storageKey()) || '{}') } catch { return {} } }

export default function PreparationPlanPage() {
  const snapshot = useMemo(() => getDynamicDashboardSnapshot(), [])
  const [checked,setChecked] = useState(loadChecklist)
  const week = Number(snapshot.today.lesson?.week) || 1
  const progress = Object.entries(SKILLS).map(([id,meta]) => ({ id, zh:meta[0], label:meta[1], color:meta[2], percent:snapshot.skills.find((s)=>s.id===id)?.percent ?? 0 }))
  const oral = snapshot.skills.filter((s)=>s.id.startsWith('hskk-') && Number.isFinite(s.percent))
  progress.push({id:'speaking',zh:'HSKK',label:'Устная речь',color:'#b74638',percent:oral.length?Math.round(oral.reduce((a,s)=>a+s.percent,0)/oral.length):0})
  const done = CHECKLIST.filter(([id])=>checked[id]).length
  const toggle = (id) => setChecked((current)=>{ const next={...current,[id]:!current[id]}; localStorage.setItem(storageKey(),JSON.stringify(next)); return next })

  return <main className="prep-plan-page"><div className="prep-plan-shell">
    <header className="prep-plan-topbar"><Link to="/">← Главная</Link><nav><Link to="/today">План дня</Link><Link to="/courses">Все уроки</Link><Link to="/dashboard">Подробный прогресс</Link></nav></header>
    <section className="prep-plan-hero"><div><span>我的学习计划 · МОЙ ПЛАН</span><h1>План подготовки к HSK 4</h1><p>Что делать сегодня, куда двигаться дальше и как растут навыки.</p></div><img src={moyu} alt="Сяо Мо поддерживает ученика"/><aside><small>Текущий этап</small><strong>Неделя {week} из 12</strong><span>Урок {snapshot.today.lesson?.lessonNumber ?? 1} · день {snapshot.today.day?.day ?? 1}</span></aside></section>
    <div className="prep-plan-grid">
      <section className="prep-plan-card prep-roadmap"><Title seal="靶" title="План подготовки" note="12 недель системной работы"/><div className="prep-roadmap-list">{PHASES.map((p,i)=><article key={p[0]} className={week>=Math.max(1,i*2)?'reached':''}><b>{i+1}</b><div><strong>{p[0]} · {p[1]}</strong><p>{p[2]}</p></div></article>)}</div><Link className="prep-primary-link" to="/courses">Открыть уроки курса →</Link></section>
      <section className="prep-plan-card prep-progress"><Title seal="成" title="Трекер прогресса" note="Только реальные результаты"/><div className="prep-rings">{progress.map((s)=><Link to={s.id==='speaking'?'/speaking':`/${s.id}`} key={s.id}><i style={{'--value':`${s.percent*3.6}deg`,'--ring':s.color}}><b>{s.percent}%</b></i><strong>{s.zh}</strong><span>{s.label}</span></Link>)}</div><Link className="prep-text-link" to="/dashboard">Подробная статистика →</Link></section>
      <section className="prep-plan-card prep-checklist"><Title seal="✓" title="Чек-лист дня" note={`${done} из ${CHECKLIST.length} выполнено`}/><div className="prep-checklist-progress"><i style={{width:`${done/CHECKLIST.length*100}%`}}/></div><div className="prep-checklist-items">{CHECKLIST.map(([id,label,route])=><label key={id} className={checked[id]?'checked':''}><input type="checkbox" checked={Boolean(checked[id])} onChange={()=>toggle(id)}/><span>{label}</span><Link to={route} aria-label={`Открыть: ${label}`}>→</Link></label>)}</div><p className="prep-checklist-note">每天一点点 · Маленькие шаги дают большой результат.</p></section>
    </div>
  </div></main>
}

function Title({seal,title,note}) { return <div className="prep-card-title"><span>{seal}</span><div><h2>{title}</h2><p>{note}</p></div></div> }
