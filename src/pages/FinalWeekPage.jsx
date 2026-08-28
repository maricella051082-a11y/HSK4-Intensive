import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import ChineseText from '../components/ChineseText.jsx'
import HskMockExam from '../finalweek/HskMockExam.jsx'
import HskkMockExam from '../finalweek/HskkMockExam.jsx'
import RepairDay from '../finalweek/RepairDay.jsx'
import FinalReport from '../finalweek/FinalReport.jsx'
import { FINAL_WEEK_DAYS, FINAL_WEEK_META, HSK_MOCKS, HSK_REPAIR_BANKS, HSKK_MOCKS, HSKK_TRAINING, getFinalWeekDay } from '../data/finalWeekData.js'
import { getFinalWeekProgress, getFinalWeekState } from '../utils/finalWeekStore.js'
import { completeFinalWeekDay, getPlannerState, setFinalWeekDay } from '../utils/coursePlanner.js'
import './FinalWeekPage.css'

function canFinishDay(day){
  const state=getFinalWeekState()
  if(day.kind==='hsk-mock') return Boolean(state.hsk[day.mockId]?.completed)
  if(day.kind==='hskk-mock') return Boolean(state.hskk[day.mockId]?.completed)
  if(day.kind==='repair') return Boolean(state.repair[HSK_REPAIR_BANKS[day.repairId].label]?.completed)
  if(day.kind==='report') return true
  return false
}

export default function FinalWeekPage(){
  const {dayNumber}=useParams()
  const day=getFinalWeekDay(dayNumber)
  const navigate=useNavigate()
  const progress=getFinalWeekProgress()
  if(!day) return <Navigate to="/courses" replace/>

  const planner=getPlannerState()
  const isCurrent=planner.finalWeekActive && Number(planner.finalWeekDay)===day.day
  const ready=canFinishDay(day)

  function finish(){
    if(!ready) return
    setFinalWeekDay(day.day)
    completeFinalWeekDay(day.day)
    if(day.day<7) navigate(`/final-week/day/${day.day+1}`)
    else navigate('/today')
  }

  return <main className="final-week-page">
    <div className="final-week-shell">
      <header className="final-week-topbar"><div><Link to="/">← На главную</Link><Link to="/courses">课程 · Все уроки</Link></div><span>第12周 · 考前冲刺</span></header>

      <section className="final-week-hero">
        <div>
          <p>НЕДЕЛЯ 12 · ДЕНЬ {day.day} · ФИНАЛЬНЫЙ ЭТАП</p>
          <h1><ChineseText pinyin={FINAL_WEEK_META.pinyin} translation={FINAL_WEEK_META.translation}>{FINAL_WEEK_META.title}</ChineseText></h1>
          <h2><ChineseText pinyin={day.pinyin} translation={day.translation}>{day.title}</ChineseText></h2>
          <p>{day.translation}</p>
        </div>
        <div className="final-week-progress"><strong>{progress.completed}/7</strong><span>дней завершено</span><div><i style={{width:`${progress.percent}%`}}/></div></div>
      </section>

      <section className="final-week-focus"><b><ChineseText pinyin="jīnrì zhòngdiǎn" translation="главная цель на сегодня">今日重点</ChineseText></b><p>{day.focus}</p></section>

      {day.kind==='hsk-mock' && <HskMockExam mock={HSK_MOCKS[day.mockId]}/>} 
      {day.kind==='hskk-mock' && <HskkMockExam mock={HSKK_MOCKS[day.mockId]}/>} 
      {day.kind==='repair' && <RepairDay bank={HSK_REPAIR_BANKS[day.repairId]} trainingSet={HSKK_TRAINING[day.hskkId]}/>} 
      {day.kind==='report' && <FinalReport/>}

      <section className={`final-day-finish ${ready?'ready':''}`}>
        <div><strong>{ready?'День можно завершить':'Сначала закончи основную задачу дня'}</strong><p>{day.kind==='report'?'После этого курс будет отмечен как завершённый.':'Результат сохраняется локально в браузере и попадёт в итоговый отчёт.'}</p></div>
        <button type="button" disabled={!ready} onClick={finish}>{day.day<7?(isCurrent?'Завершить день →':'Сделать текущим и завершить →'):'Завершить курс →'}</button>
      </section>

      <nav className="final-week-nav">
        {day.day>1?<Link to={`/final-week/day/${day.day-1}`}>← День {day.day-1}</Link>:<span/>}
        {day.day<7?<Link to={`/final-week/day/${day.day+1}`}>Посмотреть день {day.day+1} →</Link>:<span>Финальный день курса</span>}
      </nav>

      <section className="final-week-map"><h3>План Week 12</h3><div>{FINAL_WEEK_DAYS.map((item)=><Link key={item.day} className={item.day===day.day?'active':''} to={`/final-week/day/${item.day}`}><b>{item.day}</b><span>{item.translation}</span></Link>)}</div></section>
    </div>
  </main>
}
