import { useEffect, useRef, useState } from 'react'
import HskkCloudRecording from '../firebase/HskkCloudRecording.jsx'
import { saveHskkAudio } from '../firebase/hskkAudioStore.js'
import { getFinalWeekState, saveHskkResult } from '../utils/finalWeekStore.js'

export default function HskkMockExam({mock}) {
  const stored=getFinalWeekState().hskk[mock.id] || {}
  const [stage,setStage]=useState(stored.completed?'result':'ready')
  const [recordingUrl,setRecordingUrl]=useState('')
  const [audioSaveState,setAudioSaveState]=useState('')
  const [audioRefreshKey,setAudioRefreshKey]=useState(0)
  const [rubric,setRubric]=useState(()=>stored.rubric || {repeat:0,picture1:0,picture2:0,answer1:0,answer2:0,fluency:3,pronunciation:3})
  const audioRef=useRef(null)
  const recorderRef=useRef(null)
  const chunksRef=useRef([])
  const streamRef=useRef(null)
  const startedAtRef=useRef(0)
  const slotId=`final-week:hskk-mock:${mock.id}`

  useEffect(()=>()=>{
    if(recordingUrl) URL.revokeObjectURL(recordingUrl)
    if(streamRef.current) streamRef.current.getTracks().forEach((track)=>track.stop())
  },[recordingUrl])

  async function persistAudio(blob,durationSeconds){
    setAudioSaveState('saving')
    const result=await saveHskkAudio(blob,{
      slotId,
      kind:'hskk-mock',
      activityId:mock.id,
      lessonId:'final-week',
      sourceContext:'final-week-hskk-mock',
      label:mock.label || mock.id,
      durationSeconds,
      examMode:true,
    })
    setAudioSaveState(result?.status || 'local-only')
    setAudioRefreshKey((value)=>value+1)
  }

  async function startExam(){
    try{
      if(recordingUrl) URL.revokeObjectURL(recordingUrl)
      setRecordingUrl('')
      setAudioSaveState('')
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      streamRef.current=stream
      chunksRef.current=[]
      const rec=new MediaRecorder(stream)
      recorderRef.current=rec
      startedAtRef.current=Date.now()
      rec.ondataavailable=(event)=>{if(event.data?.size) chunksRef.current.push(event.data)}
      rec.onstop=()=>{
        const blob=new Blob(chunksRef.current,{type:rec.mimeType || 'audio/webm'})
        const durationSeconds=Math.max(1,Math.round((Date.now()-startedAtRef.current)/1000))
        setRecordingUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t)=>t.stop())
        streamRef.current=null
        if(blob.size) void persistAudio(blob,durationSeconds)
        setStage('review')
      }
      rec.start(500)
      setStage('exam')
      await audioRef.current?.play()
    }catch{
      alert('Нужно разрешить доступ к микрофону, чтобы пройти HSKK mock.')
    }
  }

  function finishAudio(){
    if(recorderRef.current?.state==='recording') recorderRef.current.stop()
    else setStage('review')
  }

  function save(){
    const repeatPercent=(Number(rubric.repeat)||0)/10*40
    const picturePercent=((Number(rubric.picture1)||0)+(Number(rubric.picture2)||0))/10*30
    const answerPercent=((Number(rubric.answer1)||0)+(Number(rubric.answer2)||0))/10*30
    const selfPercent=Math.round(repeatPercent+picturePercent+answerPercent)
    saveHskkResult(mock.id,{rubric,selfPercent,audioSlotId:slotId})
    setStage('result')
  }

  if(stage==='result'){
    const result=getFinalWeekState().hskk[mock.id]
    return <section className="final-mock-result">
      <div className="final-score-hero"><div><span>Самооценка HSKK</span><strong>{result?.selfPercent ?? '—'}%</strong></div><p>Это структурированная самооценка тренировочного ответа, не официальный балл и не автоматическая оценка произношения.</p></div>
      <p className="hskk-auto-note">Автоматическая расшифровка полного mock отключена: официальный аудиотрек звучит одновременно с записью микрофона и искажал бы transcript. Для полного mock остаются запись + самооценка + проверка в админке.</p>
      <div className="final-score-grid">
        <div><b>{result?.rubric?.repeat ?? 0}/10</b><span>听后重复</span></div>
        <div><b>{(result?.rubric?.picture1||0)+(result?.rubric?.picture2||0)}/10</b><span>看图说话</span></div>
        <div><b>{(result?.rubric?.answer1||0)+(result?.rubric?.answer2||0)}/10</b><span>回答问题</span></div>
      </div>
      <HskkCloudRecording slotId={slotId} localUrl={recordingUrl} saveState={audioSaveState} refreshKey={audioRefreshKey}/>
    </section>
  }

  return <section className="final-hskk-mock">
    <div className="final-exam-warning"><strong>HSKK 中级 · полный режим</strong><span>Запускай один раз. Сначала идут 10 听后重复, затем сама экзаменационная запись даст 10 минут на подготовку 11–14 и по 2 минуты на каждый ответ. Микрофон пишет весь mock непрерывно.</span></div>
    <div className="hskk-paper-grid">{mock.paperPages.map((src)=><img key={src} src={src} alt="HSKK экзаменационный лист" />)}</div>
    <audio ref={audioRef} src={mock.audio} preload="metadata" onEnded={finishAudio} />

    {stage==='ready' && <div className="hskk-prep-panel">
      <strong>Готов к полному HSKK?</strong>
      <p>Экзаменационный лист уже перед тобой. Не готовь картинки заранее: 10 минут подготовки начнутся внутри официальной записи после 听后重复.</p>
      <button className="final-primary" type="button" onClick={startExam}>▶ Начать HSKK и запись микрофона</button>
      <HskkCloudRecording slotId={slotId}/>
    </div>}

    {stage==='exam' && <div className="hskk-live-panel"><span className="live-dot"/> <strong>Идёт экзамен и запись микрофона</strong><p>Следуй аудио. Не останавливай его и не возвращайся назад.</p></div>}

    {stage==='review' && <div className="hskk-review-panel">
      <h3>Сначала прослушай свою запись</h3>
      <HskkCloudRecording slotId={slotId} localUrl={recordingUrl} saveState={audioSaveState} refreshKey={audioRefreshKey}/>
      <details><summary>После прослушивания открыть тексты 1–10</summary><ol>{mock.repeats.map((text)=><li key={text}>{text}</li>)}</ol></details>
      <div className="hskk-rubric-grid">
        <label>听后重复 · сколько из 10 передано точно<input type="number" min="0" max="10" value={rubric.repeat} onChange={(e)=>setRubric({...rubric,repeat:e.target.value})}/></label>
        <label>看图说话 11 · 0–5<input type="number" min="0" max="5" value={rubric.picture1} onChange={(e)=>setRubric({...rubric,picture1:e.target.value})}/></label>
        <label>看图说话 12 · 0–5<input type="number" min="0" max="5" value={rubric.picture2} onChange={(e)=>setRubric({...rubric,picture2:e.target.value})}/></label>
        <label>回答问题 13 · 0–5<input type="number" min="0" max="5" value={rubric.answer1} onChange={(e)=>setRubric({...rubric,answer1:e.target.value})}/></label>
        <label>回答问题 14 · 0–5<input type="number" min="0" max="5" value={rubric.answer2} onChange={(e)=>setRubric({...rubric,answer2:e.target.value})}/></label>
      </div>
      <div className="hskk-question-review"><p><b>13.</b> {mock.questions[0]}</p><p><b>14.</b> {mock.questions[1]}</p></div>
      <button className="final-primary" type="button" onClick={save}>Сохранить самооценку</button>
    </div>}
  </section>
}
