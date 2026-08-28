const PUNCT = new Set(['，','。','、','；','：','！','？',',','.',';','!','?'])

function lessonNumberFromDay(day) {
  const id = day?.activities?.find((item) => item?.lessonId)?.lessonId || ''
  const match = id.match(/lesson-(\d+)/)
  return match ? Number(match[1]) : null
}

function transcriptFromActivity(activity) {
  const tokens = Array.isArray(activity?.revealTokens) ? activity.revealTokens.filter((item) => item?.[0]) : []
  if (!tokens.length) return null
  return { text: tokens.map((item) => item[0]).join(''), tokens }
}

function bestShadowingSource(activities) {
  const candidates = activities.filter((activity) => activity?.audio)
  return candidates.find((activity) => activity.type === 'listeningLadder' && transcriptFromActivity(activity))
    || candidates.find((activity) => ['ttsChoice', 'audioChoice'].includes(activity.type) && transcriptFromActivity(activity))
    || null
}

function addShadowing(activities, lessonNumber, dayNumber) {
  if (activities.some((activity) => activity.type === 'shadowing')) return activities
  const source = bestShadowingSource(activities)
  const transcript = transcriptFromActivity(source)
  if (!source || !transcript) return activities
  const usefulTokens = transcript.tokens.filter((item) => !PUNCT.has(item[0]))
  const activity = {
    id: `shadowing-l${lessonNumber}-d${dayNumber}`, type: 'shadowing', lessonId: `lesson-${lessonNumber}`, day: dayNumber,
    skill: 'speaking', subskill: 'shadowing', title: '影子跟读 · 5步训练', translation: 'Shadowing · 5 шагов',
    audio: source.audio, sourceTitle: source.title || '课文录音', transcript: transcript.text, transcriptTokens: transcript.tokens,
    focusTokens: usefulTokens.slice(0, 6),
    steps: [
      { id: 'listen', chinese: '听', translation: 'Слушай без текста' },
      { id: 'listen-text', chinese: '看文本听', translation: 'Слушай с текстом' },
      { id: 'repeat', chinese: '跟读', translation: 'Повторяй за диктором' },
      { id: 'shadow', chinese: 'Shadow', translation: 'Говори почти одновременно' },
      { id: 'retell', chinese: '复述', translation: 'Перескажи без текста' },
    ], estimatedSeconds: 240, priority: 'standard', errorType: 'speaking_pause', track: true,
  }
  const insertAfter = Math.max(0, activities.findIndex((item) => item === source))
  const next = [...activities]; next.splice(insertAfter + 1, 0, activity); return next
}

function addRescueForLaterLessons(activities, lessonNumber, dayNumber) {
  if (lessonNumber <= 11 || dayNumber !== 3 || activities.some((a) => a.subskill === 'rescue-strategy')) return activities
  return [...activities, {
    id:`rescue-l${lessonNumber}-d${dayNumber}`, type:'speechPrompt', lessonId:`lesson-${lessonNumber}`, day:dayNumber,
    skill:'speaking', subskill:'rescue-strategy', title:'口语急救包 · 忘了词也继续说', translation:'HSKK · компенсационные стратегии',
    instruction:'Не останавливай ответ. Объясни забытое слово через функцию, вид, сравнение или перефразирование.',
    prompt:'如果你忘了一个重要的词，请不用这个词，把意思解释清楚。', promptTranslation:'Если забыл важное слово, объясни смысл, не используя его.',
    supportWords:[
      {hanzi:'我不知道这个东西怎么说，但是……',pinyin:'wǒ bù zhīdào zhège dōngxi zěnme shuō, dànshì…',translation:'Я не знаю, как это сказать, но…'},
      {hanzi:'它是一种……',pinyin:'tā shì yì zhǒng…',translation:'Это разновидность…'},
      {hanzi:'它是用来……的',pinyin:'tā shì yònglái…de',translation:'Это используется для…'},
      {hanzi:'跟……差不多',pinyin:'gēn…chàbuduō',translation:'примерно как…'},
      {hanzi:'换句话说……',pinyin:'huàn jù huà shuō…',translation:'другими словами…'},
    ],
    categories:[{id:'comp',label:'компенсационная фраза',keywords:['不知道','一种','用来','差不多','换句话说']}],
    minCategories:1,minSeconds:15,minCharacters:15,estimatedSeconds:150,priority:'intensive',errorType:'speaking_pause',
  }]
}

export function getHskkFinishedActivities(day, baseActivities = day?.activities || []) {
  const lessonNumber = lessonNumberFromDay(day)
  if (!lessonNumber) return baseActivities
  const dayNumber = Number(day?.day || 1)
  let activities = addShadowing([...baseActivities], lessonNumber, dayNumber)
  activities = addRescueForLaterLessons(activities, lessonNumber, dayNumber)
  return activities
}

export default getHskkFinishedActivities
