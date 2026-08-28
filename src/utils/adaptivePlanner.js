import { getDiagnosticResult } from './diagnosticStore.js'
import { getErrorNotebook } from './learningStore.js'
import { getActivityRecords } from './activityStore.js'

const LABELS={vocabulary:'лексика',grammar:'грамматика',listening:'аудирование',reading:'чтение',writing:'письмо',repeat:'HSKK повтор',picture:'HSKK картинка',question:'HSKK вопросы'}

function recentSkillScores() {
  const groups=new Map()
  Object.values(getActivityRecords()).forEach((r)=>{
    if (!r?.skill || r.attempts<1 || r.firstTryCorrect===null) return
    const key = r.skill==='speaking' ? (r.subskill==='repeat'?'repeat':r.subskill==='picture'?'picture':r.subskill==='question'?'question':null) : r.skill
    if (!key) return
    const g=groups.get(key)||{n:0,c:0}
    g.n+=1; g.c+=Number(r.firstTryCorrect===true); groups.set(key,g)
  })
  return Object.fromEntries([...groups].map(([k,v])=>[k,Math.round(v.c/v.n*100)]))
}

export function getAdaptiveRecommendation() {
  const diagnostic=getDiagnosticResult()
  const recent=recentSkillScores()
  const activeErrors=getErrorNotebook().filter((e)=>e.status==='active')
  const baseline=diagnostic?.skills||{}
  const keys=['vocabulary','grammar','listening','reading','writing','repeat','picture','question']
  const merged={}
  keys.forEach((k)=>{ const v=Number.isFinite(recent[k])?recent[k]:Number(baseline[k]); if(Number.isFinite(v)) merged[k]=v })
  const weak=Object.entries(merged).filter(([,v])=>v<65).sort((a,b)=>a[1]-b[1])
  const strong=Object.entries(merged).filter(([,v])=>v>=88)
  const listeningSpeakingWeak=weak.some(([k])=>['listening','repeat','picture','question'].includes(k))
  let mode='standard'
  if (listeningSpeakingWeak || weak.length>=2 || activeErrors.length>=6) mode='intensive'
  else if (Object.keys(merged).length>=5 && strong.length>=5 && weak.length===0 && activeErrors.length===0) mode='core'
  const focus=weak.slice(0,3).map(([k,v])=>({id:k,label:LABELS[k]||k,percent:v}))
  const reason = !diagnostic
    ? 'После стартовой диагностики сайт сможет рекомендовать нагрузку по реальным слабым местам.'
    : focus.length
      ? `Сейчас слабее всего: ${focus.map((x)=>`${x.label} ${x.percent}%`).join(' · ')}${activeErrors.length?` · активных ошибок ${activeErrors.length}`:''}.`
      : activeErrors.length
        ? `Явных слабых навыков нет, но в тетради ещё ${activeErrors.length} активных ошибок.`
        : 'Профиль ровный: можно сохранять стандартную нагрузку или сократить её в загруженный день.'
  return {mode,focus,reason,activeErrors:activeErrors.length,scores:merged}
}

export default getAdaptiveRecommendation
