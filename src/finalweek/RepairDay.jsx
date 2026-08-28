import { useMemo, useRef, useState } from 'react'
import VoiceRecorder from './VoiceRecorder.jsx'
import { getFinalWeekState, saveRepairResult } from '../utils/finalWeekStore.js'

const LETTERS=['A','B','C','D']

function HskkTraining({set, onChange}){
  const [repeatMarks,setRepeatMarks]=useState({})
  const [productive,setProductive]=useState({})
  const [revealed,setRevealed]=useState({})
  const [attempted,setAttempted]=useState({})

  function markRepeat(id,value){
    const next={...repeatMarks,[id]:value}; setRepeatMarks(next); onChange?.({repeatMarks:next,productive})
  }
  function markProductive(id){
    const next={...productive,[id]:true}; setProductive(next); onChange?.({repeatMarks,productive:next})
  }

  return <div className="repair-hskk-block">
    <h3>{set.label}</h3>
    <p>Сначала слушай без текста и повторяй. Текст открывай только после своей попытки.</p>
    <div className="repair-repeat-list">
      {set.repeats.map((item,index)=><article key={item.id}>
        <div className="repair-repeat-head"><b>{index+1}</b><audio controls preload="none" src={item.audio}/></div>
        <VoiceRecorder compact slotId={`final-repair:${set.id}:repeat:${item.id}`} metadata={{kind:'repeat',activityId:item.id,label:'听后重复',day:set.day || 0,target:item.text,minSeconds:4,minCharacters:Math.max(4,item.text.length-2)}} onReady={()=>setAttempted({...attempted,[item.id]:true})} />
        {!revealed[item.id] ? <button type="button" className="final-ghost" disabled={!attempted[item.id]} onClick={()=>setRevealed({...revealed,[item.id]:true})}>{attempted[item.id]?'Показать текст после попытки':'Сначала запиши свой повтор'}</button> : <p className="repair-transcript">{item.text}</p>}
        {revealed[item.id] && <div className="final-self-buttons">
          <button type="button" className={repeatMarks[item.id]==='good'?'selected':''} onClick={()=>markRepeat(item.id,'good')}>Точно</button>
          <button type="button" className={repeatMarks[item.id]==='partial'?'selected':''} onClick={()=>markRepeat(item.id,'partial')}>Частично</button>
          <button type="button" className={repeatMarks[item.id]==='retry'?'selected':''} onClick={()=>markRepeat(item.id,'retry')}>Нужно повторить</button>
        </div>}
      </article>)}
    </div>

    <h4>看图说话 · ещё 2 картинки</h4>
    <div className="repair-picture-grid">
      {set.pictures.map((item)=><article key={item.id}><img src={item.image} alt="HSKK 看图说话"/><p>Говори 1,5–2 минуты: сцена → человек → действие → детали → предположение.</p><VoiceRecorder compact slotId={`final-repair:${set.id}:picture:${item.id}`} metadata={{kind:'picture',activityId:item.id,label:'看图说话',day:set.day || 0,minSeconds:45,minCharacters:55,minCategories:3}} onReady={()=>markProductive(item.id)} />{productive[item.id] && <span className="repair-done">✓ записано</span>}</article>)}
    </div>

    <h4>回答问题 · ещё 2 темы</h4>
    <div className="repair-question-grid">
      {set.questions.map((q,index)=>{const id=`${set.id}-q${index+13}`; return <article key={id}><strong>{q}</strong><p>Ответ 60–90 секунд: позиция → причина → пример → вывод.</p><VoiceRecorder compact slotId={`final-repair:${set.id}:question:${id}`} metadata={{kind:'question',activityId:id,label:'回答问题',day:set.day || 0,prompt:q,minSeconds:45,minCharacters:55,minCategories:3}} onReady={()=>markProductive(id)} />{productive[id] && <span className="repair-done">✓ записано</span>}</article>})}
    </div>
  </div>
}

export default function RepairDay({bank, trainingSet}){
  const stored=getFinalWeekState().repair[bank.label] || {}
  const prior=getFinalWeekState().hsk.h41003?.result || null
  const [listeningAnswers,setListeningAnswers]=useState({})
  const [listeningStarted,setListeningStarted]=useState(false)
  const [listeningChecked,setListeningChecked]=useState(false)
  const [readingAnswers,setReadingAnswers]=useState({})
  const [orderAnswers,setOrderAnswers]=useState({})
  const [hskkProgress,setHskkProgress]=useState({repeatMarks:{},productive:{}})
  const [saved,setSaved]=useState(Boolean(stored.completed))
  const audioRef=useRef(null)

  const priorities=useMemo(()=>{
    if(!prior) return ['听力','阅读','书写']
    const list=[]
    if(prior.listeningPercent<80) list.push('听力')
    if(prior.readingPercent<80) list.push('阅读')
    if((prior.writingPercent ?? prior.writingOrderPercent)<80) list.push('书写')
    return list.length?list:['稳定度']
  },[prior])

  const listeningScore=bank.listening.reduce((sum,item,i)=>sum+Number(listeningAnswers[i+1]===item[1]),0)
  const readingScore=bank.reading.reduce((sum,item)=>sum+Number(readingAnswers[item.id]===item.answer),0)
  const orderScore=bank.order.reduce((sum,item)=>sum+Number((orderAnswers[item.id]||'').toUpperCase()===item.answer),0)
  const repeatDone=Object.keys(hskkProgress.repeatMarks||{}).length
  const productiveDone=Object.keys(hskkProgress.productive||{}).length
  const repairReady = listeningChecked && Object.keys(readingAnswers).length >= 5 && Object.keys(orderAnswers).length >= 5 && repeatDone >= 5 && productiveDone >= 2

  function startListening(){
    if(listeningStarted) return
    setListeningStarted(true)
    audioRef.current?.play().catch(()=>{})
  }

  function saveDay(){
    saveRepairResult(bank.label,{listeningScore,readingScore,orderScore,repeatDone,productiveDone})
    setSaved(true)
  }

  return <section className="final-repair-day">
    <div className="repair-priority"><strong>Приоритет по первому HSK mock:</strong><span>{prior ? priorities.join(' · ') : 'Пробник ещё не завершён — выполняй весь набор как диагностический ремонт.'}</span></div>

    <article className="repair-section">
      <h3>听力修复 · 10 новых заданий</h3>
      <p>Это новый блок HSK 4, которого не было в Lessons 1–20. Запись содержит задания 1–10 подряд.</p>
      <audio ref={audioRef} src={bank.audio} preload="metadata" onEnded={()=>setListeningChecked(true)}/>
      <button type="button" className="final-audio-start" disabled={listeningStarted} onClick={startListening}>{listeningStarted?'Аудио уже запущено':'▶ Начать блок 1–10'}</button>
      <div className="repair-tf-grid">{bank.listening.map((item,i)=><div key={i}><b>{i+1}</b><span>{item[0]}</span><button type="button" className={listeningAnswers[i+1]==='T'?'selected':''} onClick={()=>setListeningAnswers({...listeningAnswers,[i+1]:'T'})}>√</button><button type="button" className={listeningAnswers[i+1]==='F'?'selected':''} onClick={()=>setListeningAnswers({...listeningAnswers,[i+1]:'F'})}>×</button></div>)}</div>
      {listeningChecked && <p className="repair-result-line">Результат: <b>{listeningScore}/10</b>. Ошибки здесь важнее балла: отметь, где подвело слово, скорость, память или ловушка.</p>}
    </article>

    <article className="repair-section">
      <h3>阅读修复 · 5 коротких текстов</h3>
      <div className="repair-reading-list">{bank.reading.map((item)=><div key={item.id}><p>{item.text}</p><strong>{item.q}</strong><div>{item.options.map((opt,i)=>{const l=LETTERS[i]; return <button type="button" key={l} className={readingAnswers[item.id]===l?'selected':''} onClick={()=>setReadingAnswers({...readingAnswers,[item.id]:l})}>{l} · {opt}</button>})}</div></div>)}</div>
      <p className="repair-result-line">Текущий результат: <b>{readingScore}/5</b></p>
    </article>

    <article className="repair-section">
      <h3>句子排序 · 5 заданий</h3>
      <div className="repair-order-list">{bank.order.map((item)=><div key={item.id}><b>{item.id}</b>{item.parts.map((p,i)=><p key={p}>{LETTERS[i]}. {p}</p>)}<input value={orderAnswers[item.id]||''} placeholder="ABC" maxLength={3} onChange={(e)=>setOrderAnswers({...orderAnswers,[item.id]:e.target.value.toUpperCase().replace(/[^ABC]/g,'')})}/></div>)}</div>
      <p className="repair-result-line">Текущий результат: <b>{orderScore}/5</b></p>
    </article>

    <article className="repair-section"><HskkTraining set={trainingSet} onChange={setHskkProgress}/></article>

    <div className="repair-save-panel"><div><strong>{saved?'Тренировочный день сохранён':'Когда закончишь основной объём — сохрани день'}</strong><p>HSK: {listeningScore}/10 · {readingScore}/5 · {orderScore}/5. HSKK: повторов оценено {repeatDone}/10 · продуктивных записей {productiveDone}/4. Минимум для завершения: весь listening + 5 reading + 5 word order + 5 повторов + 2 устные записи.</p></div><button className="final-primary" type="button" disabled={!repairReady} onClick={saveDay}>Сохранить результаты дня</button></div>
  </section>
}
