import { recordLearningError, recordVocabularyExposure } from './learningStore.js'

const ACTIVITY_STORE_KEY = 'hsk4-activity-engine-v1'
const ENGINE_VERSION = 1

function readStore() {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORE_KEY)
    if (!raw) return { version: ENGINE_VERSION, activities: {} }

    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== ENGINE_VERSION) {
      return { version: ENGINE_VERSION, activities: {} }
    }

    return {
      version: ENGINE_VERSION,
      activities:
        parsed.activities && typeof parsed.activities === 'object'
          ? parsed.activities
          : {},
    }
  } catch {
    return { version: ENGINE_VERSION, activities: {} }
  }
}

function writeStore(store) {
  localStorage.setItem(ACTIVITY_STORE_KEY, JSON.stringify(store))
}

function nowIso() {
  return new Date().toISOString()
}

export function getActivityRecord(activityId) {
  return readStore().activities[activityId] ?? null
}

export function getActivityRecords() {
  return readStore().activities
}

export function recordActivityAttempt(activity, {
  correct,
  userAnswer = '',
  responseTimeMs = null,
  hintUsed = false,
} = {}) {
  if (typeof window === 'undefined' || !activity?.id) return null

  const store = readStore()
  const previous = store.activities[activity.id] ?? {
    activityId: activity.id,
    lessonId: activity.lessonId || '',
    day: activity.day || null,
    skill: activity.skill || '',
    subskill: activity.subskill || '',
    attempts: 0,
    correct: 0,
    incorrect: 0,
    firstTryCorrect: null,
    completed: false,
    hintUsed: false,
    totalResponseTimeMs: 0,
  }

  const attempts = previous.attempts + 1
  const next = {
    ...previous,
    lessonId: activity.lessonId || previous.lessonId,
    day: activity.day || previous.day,
    skill: activity.skill || previous.skill,
    subskill: activity.subskill || previous.subskill,
    listeningCategory: activity.listeningCategory || previous.listeningCategory || '',
    attempts,
    correct: previous.correct + Number(Boolean(correct)),
    incorrect: previous.incorrect + Number(!correct),
    firstTryCorrect:
      previous.firstTryCorrect === null
        ? Boolean(correct)
        : previous.firstTryCorrect,
    lastUserAnswer: userAnswer,
    lastResult: correct ? 'correct' : 'incorrect',
    lastSeen: nowIso(),
    hintUsed: previous.hintUsed || Boolean(hintUsed),
    totalResponseTimeMs:
      previous.totalResponseTimeMs +
      (Number.isFinite(responseTimeMs) ? responseTimeMs : 0),
    completed: correct ? true : previous.completed,
    history: activity.skill === 'speaking'
      ? [...(Array.isArray(previous.history) ? previous.history : []), { at: nowIso(), correct: Boolean(correct), userAnswer, responseTimeMs: Number.isFinite(responseTimeMs) ? responseTimeMs : null }].slice(-12)
      : previous.history,
  }

  store.activities[activity.id] = next
  writeStore(store)

  if (activity.srsWord) {
    recordVocabularyExposure(
      activity.srsWord,
      Boolean(correct),
      { lessonId: activity.lessonId || 'lesson-1' },
    )
  }

  if (!correct && activity.errorType) {
    recordLearningError({
      lessonId: activity.lessonId || 'lesson-1',
      module: activity.skill || 'activity',
      type: activity.errorType,
      itemId: activity.id,
      title: activity.title || activity.prompt || '',
      prompt: activity.prompt || '',
      passage: activity.passage || '',
      mode: activity.type || 'activity',
      options: activity.options || [],
      answer: activity.answer || '',
      acceptedAnswers: activity.acceptedAnswers || [],
      userAnswer,
      explanation: activity.explanation || '',
      pinyin: activity.answerPinyin || '',
      translation: activity.answerTranslation || '',
      audioPath: activity.audio || '',
      image: activity.image || '',
      imageAlt: activity.imageAlt || '',
      route: activity.route || (activity.skill === 'speaking' ? '/today' : ''),
      reviewMode: activity.reviewMode || 'notebook',
    })
  }

  return next
}


export function recordListeningLadderResult(activity, {
  firstAnswer = '',
  secondAnswer = '',
  firstListenCorrect = false,
  secondListenCorrect = null,
  answerChanged = false,
  heardCorrect = 0,
  heardTotal = 0,
  dictationCorrect = false,
  transcriptNeeded = false,
  responseTimeMs = null,
} = {}) {
  if (typeof window === 'undefined' || !activity?.id) return null

  const store = readStore()
  const previous = store.activities[activity.id] ?? {
    activityId: activity.id,
    lessonId: activity.lessonId || '',
    day: activity.day || null,
    skill: activity.skill || 'listening',
    subskill: activity.subskill || 'listening-ladder',
    attempts: 0,
    correct: 0,
    incorrect: 0,
    firstTryCorrect: null,
    completed: false,
    hintUsed: false,
    totalResponseTimeMs: 0,
  }

  const attempts = previous.attempts + 1
  const finalCorrect = firstListenCorrect || Boolean(secondListenCorrect)
  const next = {
    ...previous,
    lessonId: activity.lessonId || previous.lessonId,
    day: activity.day || previous.day,
    skill: activity.skill || previous.skill || 'listening',
    subskill: activity.subskill || previous.subskill || 'listening-ladder',
    attempts,
    correct: previous.correct + Number(Boolean(finalCorrect)),
    incorrect: previous.incorrect + Number(!firstListenCorrect),
    firstTryCorrect:
      previous.firstTryCorrect === null
        ? Boolean(firstListenCorrect)
        : previous.firstTryCorrect,
    lastUserAnswer: secondAnswer || firstAnswer,
    lastResult: firstListenCorrect ? 'correct' : 'incorrect',
    lastSeen: nowIso(),
    totalResponseTimeMs:
      previous.totalResponseTimeMs +
      (Number.isFinite(responseTimeMs) ? responseTimeMs : 0),
    completed: true,
    completedAt: nowIso(),
    firstListenCorrect: Boolean(firstListenCorrect),
    secondListenCorrect:
      secondListenCorrect === null ? null : Boolean(secondListenCorrect),
    answerChanged: Boolean(answerChanged),
    heardCorrect: Number(heardCorrect) || 0,
    heardTotal: Number(heardTotal) || 0,
    dictationCorrect: Boolean(dictationCorrect),
    transcriptNeeded: Boolean(transcriptNeeded),
    listeningCategory: activity.listeningCategory || '',
  }

  store.activities[activity.id] = next
  writeStore(store)

  if (!firstListenCorrect && activity.errorType) {
    recordLearningError({
      lessonId: activity.lessonId || 'lesson-1',
      module: 'listening',
      type: activity.errorType,
      itemId: activity.id,
      title: activity.title || activity.prompt || '',
      prompt: activity.prompt || '',
      passage: '',
      mode: activity.type || 'listeningLadder',
      options: activity.options || [],
      answer: activity.answer || '',
      acceptedAnswers: [],
      userAnswer: firstAnswer,
      explanation: activity.trapExplanation || activity.explanation || '',
      pinyin: '',
      translation: '',
      audioPath: activity.audio || '',
      route: '/today',
      reviewMode: 'notebook',
    })
  }

  return next
}

export function markModuleActivityComplete(activity) {
  if (typeof window === 'undefined' || !activity?.id) return null

  const store = readStore()
  const previous = store.activities[activity.id] ?? {
    activityId: activity.id,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    firstTryCorrect: null,
    hintUsed: false,
    totalResponseTimeMs: 0,
  }

  const next = {
    ...previous,
    lessonId: activity.lessonId || previous.lessonId || '',
    day: activity.day || previous.day || null,
    skill: activity.skill || previous.skill || '',
    subskill: activity.subskill || previous.subskill || '',
    completed: true,
    completedAt: nowIso(),
    lastSeen: nowIso(),
  }

  store.activities[activity.id] = next
  writeStore(store)
  return next
}

export function moduleCompletionMatches(activity) {
  const source = activity?.completionSource
  if (!source) return false

  try {
    if (source.resultKey) {
      const resultRaw = localStorage.getItem(source.resultKey)
      if (resultRaw) {
        const result = JSON.parse(resultRaw)
        if (
          result?.completed === true &&
          Number(result?.version) === Number(source.version)
        ) {
          return true
        }
      }
    }

    const raw = localStorage.getItem(source.key)
    if (!raw) return false

    const data = JSON.parse(raw)
    if (Number(data?.version) !== Number(source.version)) return false

    if (source.completedStage) {
      return Array.isArray(data?.completedStages) &&
        data.completedStages.includes(source.completedStage)
    }

    return data?.completed === true
  } catch {
    return false
  }
}

export function getDayProgress(activities = []) {
  const records = getActivityRecords()
  const trackable = activities.filter((activity) => activity.track !== false)
  const completed = trackable.filter(
    (activity) =>
      records[activity.id]?.completed || moduleCompletionMatches(activity),
  ).length

  return {
    completed,
    total: trackable.length,
    percent:
      trackable.length > 0
        ? Math.round((completed / trackable.length) * 100)
        : 0,
  }
}

export function resetActivityEngine() {
  localStorage.removeItem(ACTIVITY_STORE_KEY)
}
