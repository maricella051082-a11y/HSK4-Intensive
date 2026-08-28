import { getLessonDay, getLessonPlan, getNextLessonPlan } from '../data/courseRegistry.js'
import { getDayProgress } from './activityStore.js'
import { FINAL_WEEK_DAYS, FINAL_WEEK_META, getFinalWeekDay } from '../data/finalWeekData.js'
import { getFinalWeekProgress, getFinalWeekState, markFinalDayComplete } from './finalWeekStore.js'
import { getAlignedLegacyActivities } from './alignmentLayer.js'
import { getHskkFinishedActivities } from './hskkFinishingLayer.js'
import { applyContentOverrides } from '../firebase/contentOverrides.js'
import { buildCheckpoint, getCheckpointAfterLesson, getCheckpointMeta } from '../data/checkpointData.js'
import { getCheckpointProgress, getCheckpointResult, resetCheckpoints } from './checkpointStore.js'

const PLANNER_KEY = 'hsk4-course-planner-v1'
const PLANNER_VERSION = 2

export const STUDY_MODES = {
  core: {
    id: 'core',
    chinese: '今日核心',
    pinyin: 'jīnrì héxīn',
    translation: 'Обязательный минимум',
    target: '≈ 20 мин',
    description: 'Повторение слов и ошибок + аудирование + устная речь. Это обязательный минимум даже в очень загруженный день.',
    priorities: ['core'],
  },
  standard: {
    id: 'standard',
    chinese: '标准训练',
    pinyin: 'biāozhǔn xùnliàn',
    translation: 'Основная тренировка',
    target: '≈ 40–45 мин',
    description: 'Обязательный минимум + основная работа урока: лексика, грамматика, чтение и письмо по плану дня.',
    priorities: ['core', 'standard'],
  },
  intensive: {
    id: 'intensive',
    chinese: '强化训练',
    pinyin: 'qiánghuà xùnliàn',
    translation: 'Усиленная тренировка',
    target: '≈ 55–70 мин',
    description: 'Основная тренировка + экзаменационные задания, дополнительное аудирование или чтение и работа со слабыми местами.',
    priorities: ['core', 'standard', 'intensive'],
  },
}

function readPlanner() {
  try {
    const raw = localStorage.getItem(PLANNER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || ![1, PLANNER_VERSION].includes(Number(parsed.version))) return null
    return {
      ...parsed,
      version: PLANNER_VERSION,
      checkpointActive: Boolean(parsed.checkpointActive),
      currentCheckpointId: parsed.currentCheckpointId || null,
      completedCheckpoints: Array.isArray(parsed.completedCheckpoints) ? parsed.completedCheckpoints : [],
    }
  } catch {
    return null
  }
}

function defaultPlanner() {
  return {
    version: PLANNER_VERSION,
    mode: 'standard',
    currentLessonId: 'lesson-1',
    currentDay: 1,
    completedDays: [],
    lessonCompleted: false,
    checkpointActive: false,
    currentCheckpointId: null,
    completedCheckpoints: [],
    finalWeekActive: false,
    finalWeekDay: 1,
    courseFinished: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function writePlanner(state) {
  localStorage.setItem(
    PLANNER_KEY,
    JSON.stringify({
      ...state,
      version: PLANNER_VERSION,
      updatedAt: new Date().toISOString(),
    }),
  )
}

export function getPlannerState() {
  if (typeof window === 'undefined') return defaultPlanner()

  const existing = readPlanner()

  if (existing) {
    if (existing.lessonCompleted) {
      const nextLesson = getNextLessonPlan(existing.currentLessonId)

      if (nextLesson) {
        const migrated = {
          ...existing,
          currentLessonId: nextLesson.lessonId,
          currentDay: 1,
          lessonCompleted: false,
        }

        writePlanner(migrated)
        return migrated
      }
    }

    const merged = { ...defaultPlanner(), ...existing }

    if (merged.lessonCompleted && merged.currentLessonId === 'lesson-20' && !merged.courseFinished) {
      const migrated = {
        ...merged,
        lessonCompleted: false,
        finalWeekActive: true,
        finalWeekDay: Number(merged.finalWeekDay) || 1,
      }
      writePlanner(migrated)
      return migrated
    }

    return merged
  }

  const initial = defaultPlanner()
  writePlanner(initial)
  return initial
}

export function getStudyMode() {
  const state = getPlannerState()
  return STUDY_MODES[state.mode] ? state.mode : 'standard'
}

export function setStudyMode(mode) {
  if (!STUDY_MODES[mode]) return getPlannerState()

  const state = getPlannerState()
  const next = { ...state, mode }
  writePlanner(next)
  return next
}

export function getModeConfig(mode = getStudyMode()) {
  return STUDY_MODES[mode] ?? STUDY_MODES.standard
}

function getPreparedActivities(day) {
  if (!day?.activities) return []
  return getHskkFinishedActivities(day, getAlignedLegacyActivities(day))
}

export function getBaseActivitiesForMode(day, mode = getStudyMode()) {
  const allowed = new Set(getModeConfig(mode).priorities)
  return getPreparedActivities(day).filter(
    (activity) =>
      activity.alwaysVisible === true ||
      allowed.has(activity.priority || 'standard'),
  )
}

export function getActivitiesForMode(day, mode = getStudyMode()) {
  const allowed = new Set(getModeConfig(mode).priorities)
  return applyContentOverrides(getPreparedActivities(day)).filter(
    (activity) =>
      activity.alwaysVisible === true ||
      allowed.has(activity.priority || 'standard'),
  )
}

export function getModeEstimateSeconds(day, mode = getStudyMode()) {
  return getActivitiesForMode(day, mode).reduce(
    (sum, activity) => sum + (Number(activity.estimatedSeconds) || 0),
    0,
  )
}

export function getModeDayProgress(day, mode = getStudyMode()) {
  return getDayProgress(getActivitiesForMode(day, mode))
}

export function getTodayPlanSnapshot() {
  const planner = getPlannerState()
  const mode = getStudyMode()

  if (planner.checkpointActive && planner.currentCheckpointId) {
    const checkpoint = buildCheckpoint(planner.currentCheckpointId)
    const meta = getCheckpointMeta(planner.currentCheckpointId)
    if (checkpoint && meta) {
      const progress = getCheckpointProgress(meta.id)
      return {
        planner,
        lesson: {
          lessonId: meta.id,
          week: Math.ceil(meta.afterLesson / 2) + 1,
          lessonNumber: `CP${meta.number}`,
          title: meta.title,
          pinyin: meta.pinyin,
          translation: meta.translation,
          days: [{ day: meta.number }],
        },
        day: { day: meta.number, title: meta.title, translation: meta.translation },
        mode,
        modeConfig: getModeConfig(mode),
        activities: checkpoint.activities,
        estimateSeconds: checkpoint.estimatedSeconds,
        progress,
        isCheckpoint: true,
        checkpoint,
      }
    }
  }

  if (planner.finalWeekActive || planner.courseFinished) {
    const dayNumber = planner.courseFinished ? 7 : Number(planner.finalWeekDay || 1)
    const finalDay = getFinalWeekDay(dayNumber)
    const weekProgress = getFinalWeekProgress()
    const completed = getFinalWeekState().completedDays.includes(dayNumber)
    const syntheticLesson = {
      lessonId: FINAL_WEEK_META.id,
      week: 12,
      lessonNumber: 'FINAL',
      title: FINAL_WEEK_META.title,
      pinyin: FINAL_WEEK_META.pinyin,
      translation: FINAL_WEEK_META.translation,
      days: FINAL_WEEK_DAYS,
    }

    return {
      planner,
      lesson: syntheticLesson,
      day: finalDay,
      mode,
      modeConfig: getModeConfig(mode),
      activities: [],
      estimateSeconds: 0,
      progress: { completed: completed ? 1 : 0, total: 1, percent: completed ? 100 : 0 },
      isFinalWeek: true,
      finalWeekProgress: weekProgress,
      courseFinished: Boolean(planner.courseFinished),
    }
  }

  const lesson = getLessonPlan(planner.currentLessonId)
  const day = getLessonDay(planner.currentLessonId, planner.currentDay)

  if (!lesson || !day) {
    return {
      planner,
      lesson: null,
      day: null,
      mode,
      modeConfig: getModeConfig(mode),
      activities: [],
      estimateSeconds: 0,
      progress: { completed: 0, total: 0, percent: 0 },
    }
  }

  const activities = getActivitiesForMode(day, mode)

  return {
    planner,
    lesson,
    day,
    mode,
    modeConfig: getModeConfig(mode),
    activities,
    estimateSeconds: getModeEstimateSeconds(day, mode),
    progress: getDayProgress(activities),
  }
}

export function completePlannerDay({ lessonId, dayNumber, mode } = {}) {
  const state = getPlannerState()
  const currentLessonId = lessonId || state.currentLessonId
  const currentDay = Number(dayNumber || state.currentDay)
  const activeMode = STUDY_MODES[mode] ? mode : state.mode
  const lesson = getLessonPlan(currentLessonId)

  if (!lesson) return state

  const completionKey = `${currentLessonId}:day-${currentDay}:${activeMode}`
  const completedDays = state.completedDays.includes(completionKey)
    ? state.completedDays
    : [...state.completedDays, completionKey]

  const nextDay = currentDay + 1

  if (nextDay <= lesson.days.length) {
    const next = {
      ...state,
      mode: activeMode,
      currentLessonId,
      currentDay: nextDay,
      completedDays,
      lessonCompleted: false,
    }
    writePlanner(next)
    return next
  }

  const checkpoint = getCheckpointAfterLesson(lesson.lessonNumber)
  if (checkpoint && !state.completedCheckpoints.includes(checkpoint.id)) {
    const next = {
      ...state,
      mode: activeMode,
      completedDays,
      lessonCompleted: false,
      checkpointActive: true,
      currentCheckpointId: checkpoint.id,
      finalWeekActive: false,
      courseFinished: false,
    }
    writePlanner(next)
    return next
  }

  const nextLesson = getNextLessonPlan(currentLessonId)

  if (nextLesson) {
    const next = {
      ...state,
      mode: activeMode,
      currentLessonId: nextLesson.lessonId,
      currentDay: 1,
      completedDays,
      lessonCompleted: false,
      checkpointActive: false,
      currentCheckpointId: null,
    }
    writePlanner(next)
    return next
  }

  const next = {
    ...state,
    mode: activeMode,
    completedDays,
    lessonCompleted: false,
    checkpointActive: false,
    currentCheckpointId: null,
    finalWeekActive: true,
    finalWeekDay: 1,
    courseFinished: false,
  }
  writePlanner(next)
  return next
}

export function setPlannerCheckpoint(checkpointId) {
  const checkpoint = getCheckpointMeta(checkpointId)
  if (!checkpoint) return getPlannerState()
  const state = getPlannerState()
  const next = {
    ...state,
    checkpointActive: true,
    currentCheckpointId: checkpointId,
    lessonCompleted: false,
    finalWeekActive: false,
    courseFinished: false,
  }
  writePlanner(next)
  return next
}

export function completePlannerCheckpoint(checkpointId) {
  const checkpoint = getCheckpointMeta(checkpointId)
  const result = getCheckpointResult(checkpointId)
  if (!checkpoint || !result) return getPlannerState()

  const state = getPlannerState()
  const completedCheckpoints = state.completedCheckpoints.includes(checkpointId)
    ? state.completedCheckpoints
    : [...state.completedCheckpoints, checkpointId]
  const nextLesson = getNextLessonPlan(`lesson-${checkpoint.afterLesson}`)

  if (nextLesson) {
    const next = {
      ...state,
      currentLessonId: nextLesson.lessonId,
      currentDay: 1,
      lessonCompleted: false,
      checkpointActive: false,
      currentCheckpointId: null,
      completedCheckpoints,
      finalWeekActive: false,
      courseFinished: false,
    }
    writePlanner(next)
    return next
  }

  const next = {
    ...state,
    checkpointActive: false,
    currentCheckpointId: null,
    completedCheckpoints,
  }
  writePlanner(next)
  return next
}

export function setFinalWeekDay(dayNumber) {
  const day = getFinalWeekDay(dayNumber)
  if (!day) return getPlannerState()
  const state = getPlannerState()
  const next = {
    ...state,
    checkpointActive: false,
    currentCheckpointId: null,
    finalWeekActive: true,
    finalWeekDay: Number(dayNumber),
    courseFinished: false,
    lessonCompleted: false,
  }
  writePlanner(next)
  return next
}

export function completeFinalWeekDay(dayNumber) {
  const day = Number(dayNumber)
  if (!getFinalWeekDay(day)) return getPlannerState()
  markFinalDayComplete(day)
  const state = getPlannerState()
  if (day < FINAL_WEEK_META.days) {
    const next = { ...state, finalWeekActive: true, finalWeekDay: day + 1, courseFinished: false, lessonCompleted: false }
    writePlanner(next)
    return next
  }
  const next = { ...state, finalWeekActive: false, finalWeekDay: 7, courseFinished: true, lessonCompleted: true }
  writePlanner(next)
  return next
}

export function setPlannerDay(lessonId, dayNumber) {
  const lesson = getLessonPlan(lessonId)
  const day = getLessonDay(lessonId, dayNumber)
  if (!lesson || !day) return getPlannerState()

  const state = getPlannerState()
  const next = {
    ...state,
    currentLessonId: lessonId,
    currentDay: Number(dayNumber),
    lessonCompleted: false,
    checkpointActive: false,
    currentCheckpointId: null,
    finalWeekActive: false,
    courseFinished: false,
  }
  writePlanner(next)
  return next
}

export function resetCoursePlanner() {
  localStorage.removeItem(PLANNER_KEY)
  localStorage.removeItem('hsk4-final-week-v1')
  resetCheckpoints()
  return getPlannerState()
}
