import { useEffect, useRef, useState } from 'react'
import HskkCloudRecording from '../firebase/HskkCloudRecording.jsx'
import { saveHskkAudio } from '../firebase/hskkAudioStore.js'
import { analyzeHskkResponse } from '../utils/hskkAutoFeedback.js'

function getRecognitionConstructor() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export default function VoiceRecorder({ onReady, compact=false, slotId='', metadata={} }) {
  const recorderRef=useRef(null)
  const recognitionRef=useRef(null)
  const transcriptRef=useRef('')
  const chunksRef=useRef([])
  const streamRef=useRef(null)
  const startedAtRef=useRef(0)
  const [state,setState]=useState('idle')
  const [url,setUrl]=useState('')
  const [saveState,setSaveState]=useState('')
  const [refreshKey,setRefreshKey]=useState(0)
  const [liveTranscript,setLiveTranscript]=useState('')
  const [feedback,setFeedback]=useState(null)

  useEffect(()=>()=>{
    if(url) URL.revokeObjectURL(url)
    if(streamRef.current) streamRef.current.getTracks().forEach((track)=>track.stop())
    try { recognitionRef.current?.stop() } catch { /* already stopped */ }
  },[url])

  async function persist(blob,durationSeconds,transcript,autoFeedback){
    if(!slotId || !blob?.size) return
    setSaveState('saving')
    const result=await saveHskkAudio(blob,{
      slotId,
      kind:metadata.kind || 'hskk-practice',
      activityId:metadata.activityId || slotId,
      lessonId:metadata.lessonId || 'final-week',
      day:metadata.day || 0,
      sourceContext:metadata.sourceContext || 'final-week-repair',
      label:metadata.label || '',
      transcript:transcript || '',
      transcriptSource:transcript ? 'browser-speech-recognition' : '',
      autoFeedback:autoFeedback || null,
      durationSeconds,
      examMode:Boolean(metadata.examMode),
    })
    setSaveState(result?.status || 'local-only')
    setRefreshKey((value)=>value+1)
  }

  async function start(){
    try{
      if(url) URL.revokeObjectURL(url)
      setUrl('')
      setSaveState('')
      setLiveTranscript('')
      setFeedback(null)
      transcriptRef.current=''
      const stream=await navigator.mediaDevices.getUserMedia({audio:true})
      streamRef.current=stream
      chunksRef.current=[]
      const recorder=new MediaRecorder(stream)
      recorderRef.current=recorder
      startedAtRef.current=Date.now()
      recorder.ondataavailable=(event)=>{ if(event.data?.size) chunksRef.current.push(event.data) }
      recorder.onstop=()=>{
        const blob=new Blob(chunksRef.current,{type:recorder.mimeType || 'audio/webm'})
        const nextUrl=URL.createObjectURL(blob)
        const durationSeconds=Math.max(1,Math.round((Date.now()-startedAtRef.current)/1000))
        setUrl(nextUrl)
        setState('done')
        stream.getTracks().forEach((track)=>track.stop())
        streamRef.current=null

        window.setTimeout(()=>{
          const transcript=transcriptRef.current.trim()
          const autoFeedback=transcript ? analyzeHskkResponse({
            kind:metadata.kind || 'question',
            transcript,
            durationSeconds,
            target:metadata.target || '',
            categories:metadata.categories || [],
            minSeconds:metadata.minSeconds || 0,
            minCharacters:metadata.minCharacters || 0,
            minCategories:metadata.minCategories || 0,
          }) : null
          setFeedback(autoFeedback)
          onReady?.({blob,url:nextUrl,durationSeconds,transcript,feedback:autoFeedback})
          void persist(blob,durationSeconds,transcript,autoFeedback)
        },300)
      }

      const Recognition=getRecognitionConstructor()
      if(Recognition){
        const recognition=new Recognition()
        recognition.lang='zh-CN'
        recognition.continuous=true
        recognition.interimResults=true
        recognition.onresult=(event)=>{
          let finalText=''
          let interimText=''
          for(let i=0;i<event.results.length;i+=1){
            const text=event.results[i][0].transcript
            if(event.results[i].isFinal) finalText+=text
            else interimText+=text
          }
          transcriptRef.current=`${finalText}${interimText}`.trim()
          setLiveTranscript(transcriptRef.current)
        }
        recognitionRef.current=recognition
        try { recognition.start() } catch { /* recording still works without transcript */ }
      } else {
        recognitionRef.current=null
      }

      recorder.start(500)
      setState('recording')
    }catch{
      setState('blocked')
    }
  }

  function stop(){
    try { recognitionRef.current?.stop() } catch { /* already stopped */ }
    if(recorderRef.current?.state==='recording') recorderRef.current.stop()
  }

  return <div className={compact?'voice-recorder compact':'voice-recorder'}>
    {state!=='recording' && <button type="button" onClick={start}>{state==='done'?'● Записать ещё раз':'● Начать запись'}</button>}
    {state==='recording' && <button type="button" className="recording" onClick={stop}>■ Остановить запись</button>}
    {state==='recording' && liveTranscript && <small className="voice-live-transcript">Распознаётся: {liveTranscript}</small>}
    {state==='blocked' && <span>Нет доступа к микрофону. Разреши микрофон в браузере.</span>}
    <HskkCloudRecording slotId={slotId} localUrl={url} saveState={saveState} refreshKey={refreshKey} compact={compact} feedback={feedback}/>
  </div>
}
