import { Link } from 'react-router-dom'
import { getFinalReadinessSnapshot } from '../utils/finalWeekStore.js'
import { getErrorNotebook, getLearningDashboardStats } from '../utils/learningStore.js'

function delta(a,b){
  if(!Number.isFinite(a)||!Number.isFinite(b)) return null
  const d=b-a
  return `${d>0?'+':''}${d}`
}

export default function FinalReport(){
  const {hsk1,hsk2,hskk1,hskk2,readiness}=getFinalReadinessSnapshot()
  const review=getLearningDashboardStats()
  const errors=getErrorNotebook().filter((x)=>x.status==='active').slice(0,8)
  const latest=hsk2 || hsk1

  const rec=[]
  if(latest){
    if(latest.listeningPercent<80) rec.push('听力: ещё 10–15 минут в день на распознавание речи без текста + разбор ловушек.')
    if(latest.readingPercent<80) rec.push('阅读: держать темп и сначала искать главную мысль, а не переводить каждое слово.')
    if(latest.writingPercent<80) rec.push('书写: повторить порядок слов, 把/被/以/由 и короткие предложения по картинке.')
  }
  if(hskk2?.selfPercent<75) rec.push('HSKK: каждый день 5 听后重复 + один ответ 60–90 секунд без подготовки.')
  if(!rec.length) rec.push('Ничего нового не учить. Поддерживать форму короткими повторами и высыпаться перед экзаменом.')

  return <section className="final-report">
    <div className="final-score-hero"><div><span>考前准备度 · итоговая готовность</span><strong>{Number.isFinite(readiness)?`${readiness}%`:'—'}</strong></div><p>Индекс собирается из последнего HSK practice score и самооценки HSKK. Это ориентир для подготовки, не официальный экзаменационный балл.</p></div>

    <div className="final-report-grid">
      <article><h3>HSK Mock 1</h3><b>{hsk1?.totalEstimate ?? '—'}/300</b><span>H41003</span></article>
      <article><h3>HSK Mock 2</h3><b>{hsk2?.totalEstimate ?? '—'}/300</b><span>{hsk1&&hsk2?`динамика ${delta(hsk1.totalEstimate,hsk2.totalEstimate)}`:'H41004'}</span></article>
      <article><h3>HSKK Mock 1</h3><b>{hskk1?.selfPercent ?? '—'}%</b><span>H81004</span></article>
      <article><h3>HSKK Mock 2</h3><b>{hskk2?.selfPercent ?? '—'}%</b><span>{hskk1&&hskk2?`динамика ${delta(hskk1.selfPercent,hskk2.selfPercent)}`:'H81107'}</span></article>
    </div>

    {hsk1&&hsk2 && <div className="final-section-compare">
      <h3>Что изменилось между двумя HSK</h3>
      <div><span>听力</span><b>{hsk1.listeningPercent}% → {hsk2.listeningPercent}%</b><em>{delta(hsk1.listeningPercent,hsk2.listeningPercent)}</em></div>
      <div><span>阅读</span><b>{hsk1.readingPercent}% → {hsk2.readingPercent}%</b><em>{delta(hsk1.readingPercent,hsk2.readingPercent)}</em></div>
      <div><span>书写</span><b>{hsk1.writingPercent}% → {hsk2.writingPercent}%</b><em>{delta(hsk1.writingPercent,hsk2.writingPercent)}</em></div>
    </div>}

    <div className="final-light-review">
      <h3>Последний день — только лёгкая настройка</h3>
      <p>На сегодня в системе повторения: <b>{review.dueToday}</b> элементов ({review.dueSrs} слов + {review.dueErrors} ошибок).</p>
      <Link to="/review">Открыть 今日复习 →</Link>
    </div>

    <div className="final-recommendations"><h3>Что делать прямо перед экзаменом</h3><ul>{rec.map((x)=><li key={x}>{x}</li>)}</ul></div>

    {errors.length>0 && <div className="final-active-errors"><h3>Ошибки, которые ещё остаются активными</h3>{errors.map((x)=><p key={x.id||x.itemId}>{x.title || x.prompt || x.type}</p>)}</div>}
  </section>
}
