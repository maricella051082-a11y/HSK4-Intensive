import { getLearningDashboardStats, getErrorNotebook } from './learningStore.js'
import { getTodayPlanSnapshot } from './coursePlanner.js'
import { getActivityRecords, getDayProgress } from './activityStore.js'
import { getLessonPlan } from '../data/courseRegistry.js'
import { getDiagnosticResult } from './diagnosticStore.js'
import { getFinalReadinessSnapshot } from './finalWeekStore.js'

function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return null
  return Math.max(0, Math.min(100, Math.round(value)))
}

function percent(part, total) {
  const p = Number(part)
  const t = Number(total)
  if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return null
  return clampPercent((p / t) * 100)
}

function arrayLength(value) {
  return Array.isArray(value) ? value.length : Number(value) || 0
}

function resultScore(key, version, calculator) {
  const data = readJson(key)
  if (!data || Number(data.version) !== Number(version) || !data.completed) {
    return null
  }

  const score = calculator(data)
  return clampPercent(score)
}

function moduleSessionProgress(sessionKey, version, completedField, total) {
  const data = readJson(sessionKey)
  if (!data || Number(data.version) !== Number(version)) return null

  let completed = 0

  if (Array.isArray(data[completedField])) {
    completed = data[completedField].length
  } else {
    completed = Number(data[completedField]) || 0
  }

  return {
    completed: Math.min(total, completed),
    total,
    percent: percent(Math.min(total, completed), total) ?? 0,
  }
}

function skillStatus({
  id,
  label,
  chinese,
  pinyin,
  resultKey,
  resultVersion,
  score,
  sessionKey,
  sessionVersion,
  sessionField,
  sessionTotal,
  route,
  note,
  fallbackPercent = null,
}) {
  const value = resultScore(resultKey, resultVersion, score)

  if (value !== null) {
    return {
      id,
      label,
      chinese,
      pinyin,
      percent: value,
      checked: true,
      state: value >= 85 ? 'strong' : value >= 65 ? 'stable' : 'weak',
      route,
      note,
      progressText: `${value}%`,
    }
  }

  if (Number.isFinite(fallbackPercent)) {
    const baseline = clampPercent(fallbackPercent)

    return {
      id,
      label,
      chinese,
      pinyin,
      percent: baseline,
      checked: true,
      state: baseline >= 85 ? 'strong' : baseline >= 65 ? 'stable' : 'weak',
      route,
      note: 'Стартовая диагностика',
      progressText: `${baseline}% · старт`,
    }
  }

  const progress = sessionKey
    ? moduleSessionProgress(
        sessionKey,
        sessionVersion,
        sessionField,
        sessionTotal,
      )
    : null

  return {
    id,
    label,
    chinese,
    pinyin,
    percent: null,
    checked: false,
    state: progress?.completed ? 'in-progress' : 'not-checked',
    route,
    note,
    progressText: progress?.completed
      ? `в процессе · ${progress.completed}/${progress.total}`
      : 'ещё не проверено',
  }
}

const ERROR_LABELS = {
  word_unknown: 'слово не узнаётся или не вспоминается',
  word_sound: 'слово трудно узнать на слух',
  grammar: 'грамматическая конструкция',
  listening_keyword_trap: 'ошибка из-за ключевого слова в аудировании',
  listening_memory: 'трудно удержать услышанное',
  reading_inference: 'вывод по прочитанному тексту',
  word_order: 'порядок слов',
  speaking_pause: 'длинные паузы в речи',
  speaking_grammar: 'грамматика в устной речи',
  picture_no_structure: 'нет структуры в описании картинки',
  general: 'ошибка для повторения',
}

const MODULE_LABELS = {
  vocabulary: 'Лексика',
  grammar: 'Грамматика',
  listening: 'Аудирование',
  reading: 'Чтение',
  writing: 'Письмо',
  speaking: 'Устная речь',
  exam: 'Экзаменационные задания',
  general: 'Общее повторение',
}

function buildWeaknesses() {
  const active = getErrorNotebook().filter((item) => item.status === 'active')
  const grouped = new Map()

  active.forEach((item) => {
    const key = `${item.module || 'general'}:${item.type || 'general'}`
    const current = grouped.get(key) || {
      key,
      module: item.module || 'general',
      type: item.type || 'general',
      count: 0,
      route: item.route || '/review',
    }

    current.count += 1
    if (!current.route && item.route) current.route = item.route
    grouped.set(key, current)
  })

  return [...grouped.values()]
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      ...item,
      moduleLabel: MODULE_LABELS[item.module] || 'Учебный материал',
      label: ERROR_LABELS[item.type] || 'ошибка для повторения',
    }))
}


function buildListeningCategoryStats() {
  const grouped = new Map()
  Object.values(getActivityRecords()).forEach((record) => {
    const category = String(record.listeningCategory || '').trim()
    if (!category || record.attempts < 1) return
    const current = grouped.get(category) || { category, total: 0, firstCorrect: 0, secondRecovered: 0, dictationCorrect: 0 }
    current.total += 1
    current.firstCorrect += Number(record.firstListenCorrect === true)
    current.secondRecovered += Number(record.firstListenCorrect === false && record.secondListenCorrect === true)
    current.dictationCorrect += Number(record.dictationCorrect === true)
    grouped.set(category, current)
  })
  return [...grouped.values()].map((item) => ({
    ...item,
    percent: percent(item.firstCorrect, item.total) ?? 0,
    recoveryPercent: percent(item.firstCorrect + item.secondRecovered, item.total) ?? 0,
    dictationPercent: percent(item.dictationCorrect, item.total) ?? 0,
  })).sort((a,b)=>a.percent-b.percent || b.total-a.total)
}

function countLessonProgress(lesson) {
  if (!lesson?.days?.length) return 0

  const allTrackable = lesson.days.flatMap((day) =>
    (day.activities || []).filter((activity) => activity.track !== false),
  )

  return getDayProgress(allTrackable).percent
}

function engineSkillPercent(lessonId, skill, subskills = null) {
  if (!lessonId || lessonId === 'lesson-1') return null

  const records = Object.values(getActivityRecords()).filter((record) => {
    if (record.lessonId !== lessonId || record.skill !== skill || record.attempts < 1) {
      return false
    }

    if (!subskills) return true
    return subskills.includes(record.subskill)
  })

  if (!records.length) return null

  const firstTryCorrect = records.filter(
    (record) => record.firstTryCorrect === true,
  ).length

  return percent(firstTryCorrect, records.length)
}

function applyCurrentLessonEngineScore(skill, value, lessonNumber) {
  if (!Number.isFinite(value)) return skill

  const score = clampPercent(value)

  return {
    ...skill,
    percent: score,
    checked: true,
    state: score >= 85 ? 'strong' : score >= 65 ? 'stable' : 'weak',
    route: '/today',
    note: `Урок ${lessonNumber} · результат с первой попытки`,
    progressText: `${score}% · урок ${lessonNumber}`,
  }
}

function getSpeakingResult() {
  const data = readJson('hsk4-speaking-lesson1-result')
  if (!data || Number(data.version) !== 2 || !data.completed) return null
  return data
}

function speakingPart(part) {
  const result = getSpeakingResult()
  if (!result) return null

  if (part === 'repeat') {
    return clampPercent(Number(result.repeatAverage))
  }

  const item = result[part]
  if (!item) return null

  const total = Array.isArray(item.categoryResults)
    ? item.categoryResults.length
    : 4

  return percent(item.categoriesPassed, total)
}

export function getDynamicDashboardSnapshot() {
  const review = getLearningDashboardStats()
  const today = getTodayPlanSnapshot()
  const lesson = today.lesson || getLessonPlan('lesson-1')
  const diagnostic = getDiagnosticResult()
  const finalReadiness = getFinalReadinessSnapshot()

  let skills = [
    skillStatus({
      id: 'vocabulary',
      label: 'Лексика',
      chinese: '词汇',
      pinyin: 'cíhuì',
      resultKey: 'hsk4-vocabulary-lesson1-result',
      resultVersion: 3,
      score: (data) => percent(data.mastered, data.coreTotal) ?? 0,
      sessionKey: 'hsk4-vocabulary-lesson1-session',
      sessionVersion: 3,
      sessionField: 'completedStages',
      sessionTotal: 7,
      route: '/vocabulary',
      note: 'Активные слова урока 1',
      fallbackPercent: diagnostic?.skills?.vocabulary,
    }),
    skillStatus({
      id: 'listening',
      label: 'Аудирование',
      chinese: '听力',
      pinyin: 'tīnglì',
      resultKey: 'hsk4-listening-lesson1-result',
      resultVersion: 2,
      score: (data) => {
        const correct =
          Number(data.textbookFirstCorrect || 0) +
          Number(data.workbookFirstCorrect || 0) +
          Number(data.transferFirstCorrect || 0)
        const total =
          Number(data.textbookTotal || 0) +
          Number(data.workbookTotal || 0) +
          Number(data.transferTotal || 0)
        return percent(correct, total) ?? 0
      },
      sessionKey: 'hsk4-listening-lesson1-session',
      sessionVersion: 2,
      sessionField: 'completedStages',
      sessionTotal: 4,
      route: '/listening',
      note: 'Правильность с первой попытки',
      fallbackPercent: diagnostic?.skills?.listening,
    }),
    skillStatus({
      id: 'grammar',
      label: 'Грамматика',
      chinese: '语法',
      pinyin: 'yǔfǎ',
      resultKey: 'hsk4-grammar-lesson1-result',
      resultVersion: 2,
      score: (data) => percent(arrayLength(data.firstCorrect), data.totalTasks) ?? 0,
      sessionKey: 'hsk4-grammar-lesson1-session',
      sessionVersion: 2,
      sessionField: 'completedSections',
      sessionTotal: 5,
      route: '/grammar',
      note: 'Задания, выполненные правильно с первой попытки',
      fallbackPercent: diagnostic?.skills?.grammar,
    }),
    skillStatus({
      id: 'reading',
      label: 'Чтение',
      chinese: '阅读',
      pinyin: 'yuèdú',
      resultKey: 'hsk4-reading-lesson1-result',
      resultVersion: 2,
      score: (data) => percent(data.firstCorrect, data.totalTasks) ?? 0,
      sessionKey: 'hsk4-reading-lesson1-session',
      sessionVersion: 2,
      sessionField: 'completedStages',
      sessionTotal: 3,
      route: '/reading',
      note: 'Правильность с первой попытки',
      fallbackPercent: diagnostic?.skills?.reading,
    }),
    skillStatus({
      id: 'writing',
      label: 'Письмо',
      chinese: '写作',
      pinyin: 'xiězuò',
      resultKey: 'hsk4-writing-lesson1-result',
      resultVersion: 2,
      score: (data) => percent(data.objectiveCorrectFirst, data.objectiveTotal) ?? 0,
      sessionKey: 'hsk4-writing-lesson1-session',
      sessionVersion: 2,
      sessionField: 'completedStages',
      sessionTotal: 3,
      route: '/writing',
      note: 'Автоматически проверяемые задания',
      fallbackPercent: diagnostic?.skills?.writing,
    }),
  ]

  const repeat = speakingPart('repeat') ?? diagnostic?.skills?.repeat ?? null
  const picture = speakingPart('picture') ?? diagnostic?.skills?.picture ?? null
  const question = speakingPart('question') ?? diagnostic?.skills?.question ?? null

  if (lesson?.lessonId && lesson.lessonId !== 'lesson-1') {
    const lessonNumber = lesson.lessonNumber

    skills = skills.map((skill) => {
      const subskills =
        skill.id === 'writing'
          ? ['word-order']
          : skill.id === 'vocabulary'
            ? ['meaning', 'recall', 'context', 'collocation']
            : null

      return applyCurrentLessonEngineScore(
        skill,
        engineSkillPercent(lesson.lessonId, skill.id, subskills),
        lessonNumber,
      )
    })
  }

  skills.push(
    {
      id: 'hskk-repeat',
      label: 'HSKK · повторение',
      chinese: '听后重复',
      pinyin: 'tīng hòu chóngfù',
      percent: repeat,
      checked: repeat !== null,
      state: repeat === null ? 'not-checked' : repeat >= 85 ? 'strong' : repeat >= 65 ? 'stable' : 'weak',
      route: '/speaking',
      note: 'Насколько точно воспроизводится услышанная фраза',
      progressText: repeat === null ? 'ещё не проверено' : `${repeat}%`,
    },
    {
      id: 'hskk-picture',
      label: 'HSKK · картинка',
      chinese: '看图说话',
      pinyin: 'kàn tú shuōhuà',
      percent: picture,
      checked: picture !== null,
      state: picture === null ? 'not-checked' : picture >= 75 ? 'strong' : picture >= 50 ? 'stable' : 'weak',
      route: '/speaking',
      note: 'Структура ответа по картинке',
      progressText: picture === null ? 'ещё не проверено' : `${picture}%`,
    },
    {
      id: 'hskk-question',
      label: 'HSKK · ответ на вопрос',
      chinese: '回答问题',
      pinyin: 'huídá wèntí',
      percent: question,
      checked: question !== null,
      state: question === null ? 'not-checked' : question >= 75 ? 'strong' : question >= 50 ? 'stable' : 'weak',
      route: '/speaking',
      note: 'Структура свободного ответа',
      progressText: question === null ? 'ещё не проверено' : `${question}%`,
    },
  )

  if (lesson?.lessonId && lesson.lessonId !== 'lesson-1') {
    const lessonNumber = lesson.lessonNumber

    skills = skills.map((skill) => {
      const map = {
        'hskk-repeat': ['repeat'],
        'hskk-picture': ['picture'],
        'hskk-question': ['question'],
      }

      if (!map[skill.id]) return skill

      return applyCurrentLessonEngineScore(
        skill,
        engineSkillPercent(lesson.lessonId, 'speaking', map[skill.id]),
        lessonNumber,
      )
    })
  }

  const miniExam = resultScore(
    'hsk4-exam-training-lesson1-result',
    2,
    (data) => Number(data.percent),
  )

  const checkedSkills = skills.filter((item) => item.percent !== null)
  const lessonSkillAverage =
    checkedSkills.length > 0
      ? Math.round(
          checkedSkills.reduce((sum, item) => sum + item.percent, 0) /
            checkedSkills.length,
        )
      : null

  const weaknesses = buildWeaknesses()

  let nextAction = {
    label: 'Открыть план на сегодня',
    route: '/today',
    reason: 'Продолжи задания выбранного учебного дня.',
  }

  if (!diagnostic) {
    nextAction = {
      label: 'Начать стартовую диагностику',
      route: '/diagnostic',
      reason: 'Сначала определим сильные и слабые навыки, затем начнём урок 1.',
    }
  } else if (review.dueToday > 0) {
    nextAction = {
      label: 'Начать повторение',
      route: '/review',
      reason: `На сегодня назначено ${review.dueToday} повторений.`,
    }
  } else if (today.courseFinished) {
    nextAction = {
      label: 'Посмотреть итоговый отчёт',
      route: '/final-week/day/7',
      reason: 'Курс завершён. Итоги HSK и HSKK сохранены в финальном отчёте.',
    }
  } else if (today.isFinalWeek && !today.courseFinished) {
    nextAction = {
      label: `Week 12 · день ${today.day?.day ?? 1}`,
      route: '/today',
      reason: today.day?.translation || 'Продолжить финальную экзаменационную неделю.',
    }
  } else if (today.isCheckpoint && today.checkpoint) {
    nextAction = {
      label: `${today.checkpoint.translation} · продолжить`,
      route: `/checkpoint/${today.checkpoint.id}`,
      reason: `Промежуточный срез по урокам ${today.checkpoint.lessons[0]}–${today.checkpoint.lessons.at(-1)}: выполнено ${today.progress?.completed ?? 0} из ${today.progress?.total ?? 0}.`,
    }
  } else if (today.progress?.total && today.progress.completed < today.progress.total) {
    nextAction = {
      label: 'Продолжить план на сегодня',
      route: '/today',
      reason: `Выполнено ${today.progress.completed} из ${today.progress.total} заданий выбранного режима.`,
    }
  } else if (today.planner?.lessonCompleted) {
    nextAction = {
      label: 'Посмотреть прогресс',
      route: '/dashboard',
      reason: `Урок ${lesson?.lessonNumber ?? ''} завершён. Следующий урок пока не подключён.`,
    }
  }

  return {
    today,
    review,
    diagnostic,
    skills,
    weaknesses,
    listeningCategories: buildListeningCategoryStats(),
    miniExam,
    lessonProgress: today.isFinalWeek ? (today.finalWeekProgress?.percent ?? 0) : today.isCheckpoint ? (today.progress?.percent ?? 0) : countLessonProgress(lesson),
    lessonSkillAverage,
    nextAction,
    examReadiness: Number.isFinite(finalReadiness.readiness) ? finalReadiness.readiness : null,
    examReadinessReason: Number.isFinite(finalReadiness.readiness)
      ? 'Расчёт основан на последних полноценных HSK и HSKK пробниках Week 12; это учебный индекс, а не официальный балл.'
      : diagnostic
        ? `Стартовая диагностика: ${diagnostic.hskProfile}%. Это исходный профиль, а не прогноз экзамена. Настоящая готовность появится после финальных пробников.`
        : 'Готовность к HSK 4 пока не рассчитывается: сначала нужна стартовая диагностика и контрольные тесты.',
  }
}

export default getDynamicDashboardSnapshot
