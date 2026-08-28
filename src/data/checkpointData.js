import { getAllLessonPlans } from './courseRegistry.js'
import { getAlignedLegacyActivities } from '../utils/alignmentLayer.js'

export const CHECKPOINTS = [
  { id: 'checkpoint-1', number: 1, afterLesson: 4, lessons: [1, 2, 3, 4], title: '阶段检查一', pinyin: 'jiēduàn jiǎnchá yī', translation: 'Контрольная точка 1' },
  { id: 'checkpoint-2', number: 2, afterLesson: 8, lessons: [5, 6, 7, 8], title: '阶段检查二', pinyin: 'jiēduàn jiǎnchá èr', translation: 'Контрольная точка 2' },
  { id: 'checkpoint-3', number: 3, afterLesson: 12, lessons: [9, 10, 11, 12], title: '阶段检查三', pinyin: 'jiēduàn jiǎnchá sān', translation: 'Контрольная точка 3' },
  { id: 'checkpoint-4', number: 4, afterLesson: 16, lessons: [13, 14, 15, 16], title: '阶段检查四', pinyin: 'jiēduàn jiǎnchá sì', translation: 'Контрольная точка 4' },
]

const PUNCT = /[，。！？、；：,.!?;:]/

function checkpointEstimate(activity) {
  if (activity.type === 'speechRepeat') return 60
  if (activity.type === 'speechPrompt') return 120
  if (activity.skill === 'listening') return 60
  if (activity.skill === 'reading') return 75
  if (activity.skill === 'writing') return 90
  return 75
}

function cloneActivity(activity, checkpoint, index) {
  const category = activity.listeningCategory || inferListeningCategory(activity)
  return {
    ...activity,
    id: `${checkpoint.id}-${String(index + 1).padStart(2, '0')}-${activity.id}`,
    lessonId: checkpoint.id,
    day: checkpoint.number,
    checkpointId: checkpoint.id,
    checkpointSourceLessonId: activity.lessonId,
    checkpointSourceActivityId: activity.id,
    estimatedSeconds: checkpointEstimate(activity),
    priority: 'core',
    alwaysVisible: true,
    examMode: true,
    ...(category ? { listeningCategory: category } : {}),
  }
}

function inferListeningCategory(activity) {
  if (activity.skill !== 'listening') return ''
  const text = `${activity.subskill || ''} ${activity.title || ''} ${activity.prompt || ''}`.toLowerCase()
  if (/time|时间|几点|什么时候/.test(text)) return '时间'
  if (/reason|cause|原因|为什么/.test(text)) return '原因'
  if (/place|location|地点|哪里|哪儿/.test(text)) return '地点'
  if (/attitude|态度/.test(text)) return '态度'
  if (/infer|推断|说明/.test(text)) return '推断'
  if (/detail|细节/.test(text)) return '细节'
  if (/main|idea|gist|主要|中心/.test(text)) return '主要意思'
  return '课文理解'
}

function allActivitiesForLesson(lessonNumber) {
  const lesson = getAllLessonPlans().find((item) => Number(item.lessonNumber) === Number(lessonNumber))
  if (!lesson) return []
  return lesson.days.flatMap((day) => getAlignedLegacyActivities(day))
}

function isListening(activity) {
  return activity.skill === 'listening' && ['listeningLadder', 'ttsChoice', 'audioChoice'].includes(activity.type) && activity.audio
}

function isReading(activity) {
  return activity.skill === 'reading' && ['readingChoice', 'multipleChoice', 'trueFalse'].includes(activity.type)
}

function isWriting(activity) {
  return activity.skill === 'writing' && ['sentenceOrder', 'dragOrder', 'freeWriting', 'gapFill', 'typeChinese'].includes(activity.type)
}

function isRepeat(activity) {
  return activity.type === 'speechRepeat' && activity.audio && activity.target
}

function isPicture(activity) {
  return activity.type === 'speechPrompt' && Boolean(activity.image)
}

function isQuestion(activity) {
  return activity.type === 'speechPrompt' && !activity.image && !String(activity.subskill || '').includes('rescue')
}

function balancedPick(lessonNumbers, predicate, total) {
  const buckets = lessonNumbers.map((lessonNumber) => ({
    lessonNumber,
    items: allActivitiesForLesson(lessonNumber).filter(predicate),
    cursor: 0,
  }))
  const chosen = []
  let guard = 0

  while (chosen.length < total && guard < 100) {
    let added = false
    for (const bucket of buckets) {
      if (chosen.length >= total) break
      const item = bucket.items[bucket.cursor]
      if (!item) continue
      bucket.cursor += 1
      if (chosen.some((existing) => existing.id === item.id)) continue
      chosen.push(item)
      added = true
    }
    if (!added) break
    guard += 1
  }

  return chosen
}

function chooseSpeaking(lessonNumbers, predicate, preferredIndex = 0) {
  for (let offset = 0; offset < lessonNumbers.length; offset += 1) {
    const lessonNumber = lessonNumbers[(preferredIndex + offset) % lessonNumbers.length]
    const match = allActivitiesForLesson(lessonNumber).find(predicate)
    if (match) return match
  }
  return null
}

export function getCheckpointMeta(checkpointId) {
  return CHECKPOINTS.find((item) => item.id === checkpointId) || null
}

export function getCheckpointAfterLesson(lessonNumber) {
  return CHECKPOINTS.find((item) => item.afterLesson === Number(lessonNumber)) || null
}

export function buildCheckpoint(checkpointId) {
  const checkpoint = getCheckpointMeta(checkpointId)
  if (!checkpoint) return null

  const sections = [
    { id: 'listening', label: '听力', pinyin: 'tīnglì', translation: 'Аудирование', target: 10, activities: balancedPick(checkpoint.lessons, isListening, 10) },
    { id: 'reading', label: '阅读', pinyin: 'yuèdú', translation: 'Чтение', target: 8, activities: balancedPick(checkpoint.lessons, isReading, 8) },
    { id: 'writing', label: '写作', pinyin: 'xiězuò', translation: 'Письмо', target: 4, activities: balancedPick(checkpoint.lessons, isWriting, 4) },
    { id: 'repeat', label: '听后重复', pinyin: 'tīng hòu chóngfù', translation: 'Повтор после прослушивания', target: 5, activities: balancedPick(checkpoint.lessons, isRepeat, 5) },
  ]

  const picture = chooseSpeaking(checkpoint.lessons, isPicture, 1)
  const question = chooseSpeaking(checkpoint.lessons, isQuestion, 0)
  if (picture) sections.push({ id: 'picture', label: '看图说话', pinyin: 'kàn tú shuōhuà', translation: 'Описание картинки', target: 1, activities: [picture] })
  if (question) sections.push({ id: 'question', label: '回答问题', pinyin: 'huídá wèntí', translation: 'Ответ на вопрос', target: 1, activities: [question] })

  let index = 0
  const normalizedSections = sections.map((section) => ({
    ...section,
    activities: section.activities.map((activity) => cloneActivity(activity, checkpoint, index++)),
  }))

  const activities = normalizedSections.flatMap((section) => section.activities)
  const sourceLessonCounts = Object.fromEntries(checkpoint.lessons.map((lesson) => [lesson, 0]))
  activities.forEach((activity) => {
    const match = String(activity.checkpointSourceLessonId || '').match(/lesson-(\d+)/)
    if (match) sourceLessonCounts[Number(match[1])] = (sourceLessonCounts[Number(match[1])] || 0) + 1
  })

  return {
    ...checkpoint,
    sections: normalizedSections,
    activities,
    estimatedSeconds: activities.reduce((sum, activity) => sum + (Number(activity.estimatedSeconds) || 75), 0),
    sourceLessonCounts,
  }
}

export function validateCheckpointComposition(checkpointId) {
  const checkpoint = buildCheckpoint(checkpointId)
  if (!checkpoint) return { valid: false, errors: ['checkpoint not found'] }
  const expected = { listening: 10, reading: 8, writing: 4, repeat: 5, picture: 1, question: 1 }
  const counts = Object.fromEntries(checkpoint.sections.map((section) => [section.id, section.activities.length]))
  const errors = Object.entries(expected)
    .filter(([key, value]) => counts[key] !== value)
    .map(([key, value]) => `${key}: expected ${value}, got ${counts[key] || 0}`)
  const lessonCoverage = checkpoint.lessons.filter((lesson) => (checkpoint.sourceLessonCounts[lesson] || 0) > 0)
  if (lessonCoverage.length !== 4) errors.push(`lesson coverage: ${lessonCoverage.join(', ')}`)
  if (checkpoint.activities.some((activity) => !activity.id || PUNCT.test(activity.id))) errors.push('invalid activity id')
  return { valid: errors.length === 0, counts, sourceLessonCounts: checkpoint.sourceLessonCounts, errors }
}
