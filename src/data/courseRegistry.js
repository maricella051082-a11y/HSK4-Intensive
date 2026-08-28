import lesson1DailyPlan from './lesson1DailyPlan.js'
import lesson2DailyPlan from './lesson2DailyPlan.js'
import lesson3DailyPlan from './lesson3DailyPlan.js'
import lesson4DailyPlan from './lesson4DailyPlan.js'
import lesson5DailyPlan from './lesson5DailyPlan.js'
import lesson6DailyPlan from './lesson6DailyPlan.js'
import lesson7DailyPlan from './lesson7DailyPlan.js'
import lesson8DailyPlan from './lesson8DailyPlan.js'
import lesson9DailyPlan from './lesson9DailyPlan.js'
import lesson10DailyPlan from './lesson10DailyPlan.js'
import lesson11DailyPlan from './lesson11DailyPlan.js'
import lesson12DailyPlan from './lesson12DailyPlan.js'
import lesson13DailyPlan from './lesson13DailyPlan.js'
import lesson14DailyPlan from './lesson14DailyPlan.js'
import lesson15DailyPlan from './lesson15DailyPlan.js'
import lesson16DailyPlan from './lesson16DailyPlan.js'
import lesson17DailyPlan from './lesson17DailyPlan.js'
import lesson18DailyPlan from './lesson18DailyPlan.js'
import lesson19DailyPlan from './lesson19DailyPlan.js'
import lesson20DailyPlan from './lesson20DailyPlan.js'

const orderedLessons = [
  lesson1DailyPlan,
  lesson2DailyPlan,
  lesson3DailyPlan,
  lesson4DailyPlan,
  lesson5DailyPlan,
  lesson6DailyPlan,
  lesson7DailyPlan,
  lesson8DailyPlan,
  lesson9DailyPlan,
  lesson10DailyPlan,
  lesson11DailyPlan,
  lesson12DailyPlan,
  lesson13DailyPlan,
  lesson14DailyPlan,
  lesson15DailyPlan,
  lesson16DailyPlan,
  lesson17DailyPlan,
  lesson18DailyPlan,
  lesson19DailyPlan,
  lesson20DailyPlan,
]

const lessons = Object.fromEntries(
  orderedLessons.map((lesson) => [lesson.lessonId, lesson]),
)

export function getLessonPlan(lessonId) {
  return lessons[lessonId] ?? null
}

export function getLessonDay(lessonId, dayNumber) {
  const lesson = getLessonPlan(lessonId)
  if (!lesson) return null

  const day = Number(dayNumber)
  return lesson.days.find((item) => item.day === day) ?? null
}

export function getAllLessonPlans() {
  return orderedLessons
}

export function getNextLessonPlan(lessonId) {
  const index = orderedLessons.findIndex((lesson) => lesson.lessonId === lessonId)
  if (index < 0) return null
  return orderedLessons[index + 1] ?? null
}

export default lessons
