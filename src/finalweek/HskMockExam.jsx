import { useMemo, useRef, useState } from 'react'
import { getFinalWeekState, saveHskDraft, saveHskResult } from '../utils/finalWeekStore.js'

const letters4 = ['A','B','C','D']
const letters6 = ['A','B','C','D','E','F']

function normalizeSentence(value='') {
  return String(value)
    .normalize('NFC')
    .replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()]/g,'')
    .toLowerCase()
}

function PageStack({pages}) {
  return (
    <div className="final-paper-stack">
      {pages.map((src)=><img key={src} src={src} alt="Экзаменационная страница HSK" loading="lazy" />)}
    </div>
  )
}

function Choice({value, current, onPick}) {
  return <button type="button" className={current===value?'selected':''} onClick={()=>onPick(value)}>{value==='T'?'√':value==='F'?'×':value}</button>
}

function ListeningAnswerSheet({answers,onPick,open,onToggle}) {
  const answered=Array.from({length:45},(_,i)=>i+1).filter((q)=>Boolean(answers[q])).length

  function renderRange(start,end){
    return Array.from({length:end-start+1},(_,i)=>i+start).map((q)=>(
      <div key={q} className={`final-answer-item ${answers[q]?'answered':''}`}>
        <b>{q}</b>
        <div>{(q<=10?['T','F']:letters4).map((v)=><Choice key={v} value={v} current={answers[q]} onPick={(x)=>onPick(q,x)}/>)}</div>
      </div>
    ))
  }

  return (
    <aside className={`final-listening-answer-panel ${open?'open':'collapsed'}`} aria-label="Бланк ответов аудирования">
      <div className="final-listening-answer-head">
        <div>
          <strong>Ответы · 1–45</strong>
          <span>{answered}/45 отмечено</span>
        </div>
        <button className="final-listening-toggle" type="button" aria-expanded={open} onClick={onToggle}>{open?'Свернуть':'Открыть ответы'}</button>
      </div>
      <div className="final-listening-sheet-body">
        <section className="final-listening-answer-group">
          <h4>1–10 · 判断</h4>
          <div className="final-listening-answer-grid">{renderRange(1,10)}</div>
        </section>
        <section className="final-listening-answer-group">
          <h4>11–45 · 选择</h4>
          <div className="final-listening-answer-grid">{renderRange(11,45)}</div>
        </section>
      </div>
    </aside>
  )
}

function SectionTimer({minutes}) {
  const [seconds,setSeconds] = useState(minutes*60)
  const [running,setRunning] = useState(false)
  const ref = useRef(null)
  function toggle(){
    if(running){ clearInterval(ref.current); ref.current=null; setRunning(false); return }
    setRunning(true)
    ref.current=setInterval(()=>setSeconds((s)=>{
      if(s<=1){ clearInterval(ref.current); ref.current=null; setRunning(false); return 0 }
      return s-1
    }),1000)
  }
  const mm=String(Math.floor(seconds/60)).padStart(2,'0')
  const ss=String(seconds%60).padStart(2,'0')
  return <div className="final-timer"><strong>{mm}:{ss}</strong><button type="button" onClick={toggle}>{running?'Пауза':'Запустить таймер'}</button></div>
}

function scoreObjective(mock, answers) {
  const wrongListening=[]; let listeningCorrect=0
  for(let q=1;q<=45;q++){
    if(answers[q]===mock.listeningAnswers[q]) listeningCorrect++
    else wrongListening.push(q)
  }
  const wrongReading=[]; let readingCorrect=0
  for(let q=46;q<=85;q++){
    const a=String(answers[q]||'').toUpperCase().replace(/\s/g,'')
    if(a===mock.readingAnswers[q]) readingCorrect++
    else wrongReading.push(q)
  }
  const wrongWriting=[]; let writingOrderCorrect=0
  for(let q=86;q<=95;q++){
    const value=normalizeSentence(answers[q])
    const accepted=(mock.writingAnswers[q]||[]).map(normalizeSentence)
    if(value && accepted.includes(value)) writingOrderCorrect++
    else wrongWriting.push(q)
  }
  return {listeningCorrect,readingCorrect,writingOrderCorrect,wrongListening,wrongReading,wrongWriting}
}

export default function HskMockExam({mock}) {
  const stored=getFinalWeekState().hsk[mock.id] || {}
  const [answers,setAnswers]=useState(()=>stored.draft?.answers || stored.answers || {})
  const [tab,setTab]=useState('listening')
  const [audioStarted,setAudioStarted]=useState(false)
  const [submitted,setSubmitted]=useState(Boolean(stored.completed || stored.draft?.provisionalResult))
  const [pictureMarks,setPictureMarks]=useState(()=>stored.result?.pictureMarks || stored.draft?.pictureMarks || {})
  const [result,setResult]=useState(()=>stored.result || stored.draft?.provisionalResult || null)
  const [listeningSheetOpen,setListeningSheetOpen]=useState(true)
  const audioRef=useRef(null)

  const pages=useMemo(()=>({
    listening:mock.pages.slice(0,5),
    reading:mock.pages.slice(5,13),
    writing:mock.pages.slice(13,15),
  }),[mock])

  function update(q,value){
    const next={...answers,[q]:value}
    setAnswers(next)
    saveHskDraft(mock.id,{answers:next,tab})
  }

  function startAudio(){
    if(audioStarted) return
    setAudioStarted(true)
    audioRef.current?.play().catch(()=>{})
  }

  function submitObjective(){
    const base=scoreObjective(mock,answers)
    const temp={
      ...base,
      pictureMarks:{},
      listeningPercent:Math.round(base.listeningCorrect/45*100),
      readingPercent:Math.round(base.readingCorrect/40*100),
      writingOrderPercent:Math.round(base.writingOrderCorrect/10*100),
      pendingPictureSelfCheck:true,
    }
    setResult(temp)
    saveHskDraft(mock.id,{answers,provisionalResult:temp,pictureMarks:{}})
    setSubmitted(true)
    window.scrollTo({top:0,behavior:'smooth'})
  }

  function finalize(){
    const pictureCorrect=Object.values(pictureMarks).filter(Boolean).length
    const writingCorrect=(result?.writingOrderCorrect||0)+pictureCorrect
    const writingPercent=Math.round(writingCorrect/15*100)
    const totalEstimate=Math.round((result.listeningCorrect/45*100)+(result.readingCorrect/40*100)+(writingCorrect/15*100))
    const final={
      ...result,
      pictureMarks,
      pictureCorrect,
      writingCorrect,
      writingPercent,
      totalEstimate,
      pendingPictureSelfCheck:false,
    }
    setResult(final)
    saveHskResult(mock.id,{answers,result:final})
  }

  if(submitted && result){
    return (
      <section className="final-mock-result">
        <div className="final-score-hero">
          <div><span>Практическая оценка</span><strong>{result.pendingPictureSelfCheck?'—':`${result.totalEstimate}/300`}</strong></div>
          <p>Это тренировочная оценка по доле правильных ответов, а не официальный шкалированный балл HSK.</p>
        </div>
        <div className="final-score-grid">
          <div><b>{result.listeningCorrect}/45</b><span>听力 · {result.listeningPercent}%</span></div>
          <div><b>{result.readingCorrect}/40</b><span>阅读 · {result.readingPercent}%</span></div>
          <div><b>{result.pendingPictureSelfCheck?`${result.writingOrderCorrect}/10`:`${result.writingCorrect}/15`}</b><span>书写 · {result.pendingPictureSelfCheck?'нужна самооценка':`${result.writingPercent}%`}</span></div>
        </div>

        {result.pendingPictureSelfCheck ? (
          <div className="final-picture-selfcheck">
            <h3>Проверь 96–100 по смыслу</h3>
            <p>Эти пять предложений допускают разные корректные формулировки, поэтому сайт не притворяется, что может надёжно оценить их точным совпадением.</p>
            {[96,97,98,99,100].map((q)=>(
              <article key={q}>
                <strong>{q}</strong>
                <p><b>Твой ответ:</b> {answers[q] || '—'}</p>
                <p><b>Один из эталонных вариантов:</b> {mock.pictureReferences[q]}</p>
                <div className="final-self-buttons">
                  <button type="button" className={pictureMarks[q]===true?'selected':''} onClick={()=>{const next={...pictureMarks,[q]:true};setPictureMarks(next);saveHskDraft(mock.id,{answers,provisionalResult:result,pictureMarks:next})}}>Засчитать</button>
                  <button type="button" className={pictureMarks[q]===false?'selected':''} onClick={()=>{const next={...pictureMarks,[q]:false};setPictureMarks(next);saveHskDraft(mock.id,{answers,provisionalResult:result,pictureMarks:next})}}>Не засчитать</button>
                </div>
              </article>
            ))}
            <button className="final-primary" type="button" disabled={[96,97,98,99,100].some((q)=>typeof pictureMarks[q]!=='boolean')} onClick={finalize}>Сохранить итог пробника</button>
          </div>
        ) : (
          <div className="final-error-summary">
            <h3>Карта ошибок</h3>
            <p><b>听力:</b> {result.wrongListening.length ? result.wrongListening.join(', ') : 'без ошибок'}</p>
            <p><b>阅读:</b> {result.wrongReading.length ? result.wrongReading.join(', ') : 'без ошибок'}</p>
            <p><b>书写 86–95:</b> {result.wrongWriting.length ? result.wrongWriting.join(', ') : 'без ошибок'}</p>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="final-hsk-mock">
      <div className="final-exam-warning">
        <strong>Экзаменационный режим</strong>
        <span>Без словаря, без подсказок, без transcript. Аудио запускается как единая экзаменационная запись.</span>
      </div>
      <div className="final-tabs">
        <button type="button" className={tab==='listening'?'active':''} onClick={()=>setTab('listening')}>听力 · 45</button>
        <button type="button" className={tab==='reading'?'active':''} onClick={()=>setTab('reading')}>阅读 · 40</button>
        <button type="button" className={tab==='writing'?'active':''} onClick={()=>setTab('writing')}>书写 · 15</button>
      </div>

      {tab==='listening' && <>
        <SectionTimer minutes={35}/>
        <audio ref={audioRef} src={mock.audio} preload="metadata" onEnded={()=>setAudioStarted(true)} />
        <button className="final-audio-start" type="button" disabled={audioStarted} onClick={startAudio}>{audioStarted?'Аудио уже запущено':'▶ Начать экзаменационное аудирование'}</button>
        <div className="final-listening-workspace">
          <div className="final-listening-paper"><PageStack pages={pages.listening}/></div>
          <ListeningAnswerSheet
            answers={answers}
            onPick={update}
            open={listeningSheetOpen}
            onToggle={()=>setListeningSheetOpen((value)=>!value)}
          />
        </div>
      </>}

      {tab==='reading' && <>
        <SectionTimer minutes={40}/>
        <PageStack pages={pages.reading}/>
        <div className="final-answer-sheet"><h3>Ответы · 46–85</h3>
          <div className="final-answer-grid">
            {Array.from({length:40},(_,i)=>i+46).map((q)=>(
              <div key={q} className="final-answer-item"><b>{q}</b>
                {q>=56 && q<=65 ? <input value={answers[q]||''} maxLength={3} placeholder="ABC" onChange={(e)=>update(q,e.target.value.toUpperCase().replace(/[^ABC]/g,''))}/> : <div>{(q<=55?letters6:letters4).map((v)=><Choice key={v} value={v} current={answers[q]} onPick={(x)=>update(q,x)}/>)}</div>}
              </div>
            ))}
          </div>
        </div>
      </>}

      {tab==='writing' && <>
        <SectionTimer minutes={25}/>
        <PageStack pages={pages.writing}/>
        <div className="final-writing-sheet">
          <h3>Ответы · 86–100</h3>
          {Array.from({length:15},(_,i)=>i+86).map((q)=><label key={q}><b>{q}</b><textarea value={answers[q]||''} onChange={(e)=>update(q,e.target.value)} placeholder={q<=95?'Собери предложение':'Напиши предложение по картинке'}/></label>)}
          <button className="final-primary" type="button" onClick={submitObjective}>Завершить пробник и проверить</button>
        </div>
      </>}
    </section>
  )
}
