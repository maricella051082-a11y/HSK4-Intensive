const LINKERS = [
  '因为', '所以', '但是', '可是', '而且', '然后', '首先', '其次', '最后', '比如', '例如',
  '如果', '虽然', '因此', '其实', '另外', '总之', '我觉得', '我认为', '可能', '好像', '看起来',
]

const GENERIC_PICTURE_CATEGORIES = [
  { id: 'people', label: '人物', keywords: ['人', '男人', '女人', '男的', '女的', '孩子', '朋友', '同学', '他们', '她们', '他', '她'] },
  { id: 'action', label: '动作', keywords: ['正在', '在', '做', '看', '说', '拿', '吃', '喝', '走', '坐', '站', '笑', '工作', '学习', '聊天'] },
  { id: 'place', label: '地点', keywords: ['房间', '家里', '学校', '公司', '公园', '商店', '医院', '路上', '外面', '里面', '旁边'] },
  { id: 'inference', label: '推测 / 感受', keywords: ['可能', '好像', '看起来', '觉得', '也许', '应该', '高兴', '开心', '紧张', '累'] },
]

const GENERIC_QUESTION_CATEGORIES = [
  { id: 'position', label: '观点 / 回答', keywords: ['我觉得', '我认为', '对我来说', '我喜欢', '我不喜欢', '我想', '我会', '我觉得应该'] },
  { id: 'reason', label: '原因', keywords: ['因为', '原因', '所以'] },
  { id: 'example', label: '例子', keywords: ['比如', '例如', '有一次', '以前', '去年', '上次'] },
  { id: 'conclusion', label: '结尾', keywords: ['所以', '总之', '最后', '因此', '我觉得'] },
]

export function normalizeChinese(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()\-—…]/g, '')
    .toLowerCase()
}

function levenshtein(left, right) {
  const a = [...left]
  const b = [...right]
  if (!a.length) return b.length
  if (!b.length) return a.length

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = new Array(b.length + 1)

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      )
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j]
  }

  return previous[b.length]
}

export function similarityPercent(target, transcript) {
  const a = normalizeChinese(target)
  const b = normalizeChinese(transcript)
  if (!a || !b) return 0
  const distance = levenshtein(a, b)
  return Math.max(0, Math.min(100, Math.round((1 - distance / Math.max(a.length, b.length)) * 100)))
}

function chineseCount(value) {
  return (String(value || '').match(/[\u3400-\u9fff]/g) || []).length
}

function keywordCoverage(transcript, categories = []) {
  const normalized = normalizeChinese(transcript)
  return categories.map((category) => ({
    id: category.id || category.label || 'category',
    label: category.label || category.id || 'Смысловой блок',
    matched: (category.keywords || []).filter((keyword) => normalized.includes(normalizeChinese(keyword))),
    passed: (category.keywords || []).some((keyword) => normalized.includes(normalizeChinese(keyword))),
  }))
}

function linkerMatches(transcript) {
  const normalized = normalizeChinese(transcript)
  return LINKERS.filter((item) => normalized.includes(normalizeChinese(item)))
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)))
}

function gradeForScore(score) {
  if (score >= 85) return 'strong'
  if (score >= 68) return 'stable'
  if (score >= 50) return 'developing'
  return 'retry'
}

function feedbackText(grade, kind, details = {}) {
  if (kind === 'repeat') {
    if (grade === 'strong') return 'Фраза передана очень близко к эталону. Повтори ещё раз без текста, сохранив тот же темп.'
    if (grade === 'stable') return 'Смысл и большая часть фразы сохранены. Проверь пропущенные слова и повтори ещё один раз целиком.'
    if (grade === 'developing') return 'Фраза передана частично. Разбей её на 2–3 смысловых куска, повтори по кускам и снова целиком.'
    return details.transcript ? 'Распознано слишком мало совпадений с эталоном. Сначала прослушай ещё раз, затем повторяй короткими кусками.' : 'Речь не распознана. Проверь микрофон и повтори фразу ещё раз.'
  }

  if (grade === 'strong') return 'Ответ достаточно развернутый и структурированный. Следующий шаг — говорить так же свободно без опорных слов.'
  if (grade === 'stable') return 'Ответ уже рабочий. Добавь ещё одну причину, пример или связку, чтобы речь звучала устойчивее.'
  if (grade === 'developing') return 'Основа есть, но ответ пока короткий или односложный. Используй схему: мысль → причина → пример → вывод.'
  return details.transcript ? 'Ответ слишком короткий или в нём мало смысловых опор. Сначала скажи 3–4 простые фразы по плану и запиши ещё раз.' : 'Речь не распознана. Проверь микрофон и попробуй ещё раз; сама аудиозапись всё равно сохраняется.'
}

function repeatFeedback({ transcript, durationSeconds, target }) {
  const similarity = similarityPercent(target, transcript)
  const targetChars = chineseCount(target)
  const spokenChars = chineseCount(transcript)
  const completeness = targetChars ? clamp((spokenChars / targetChars) * 100) : similarity
  const score = clamp(similarity * 0.8 + completeness * 0.2)
  const grade = gradeForScore(score)

  return {
    version: 1,
    kind: 'repeat',
    score,
    grade,
    transcript: String(transcript || '').trim(),
    durationSeconds: Math.max(0, Math.round(Number(durationSeconds) || 0)),
    metrics: {
      similarity,
      completeness,
      targetCharacters: targetChars,
      recognizedCharacters: spokenChars,
    },
    advice: feedbackText(grade, 'repeat', { transcript }),
    disclaimer: 'Автооценка сравнивает распознанный текст с эталоном и не является оценкой тонов или произношения.',
  }
}

function openFeedback({ kind, transcript, durationSeconds, categories, minSeconds, minCharacters, minCategories }) {
  const text = String(transcript || '').trim()
  const characters = chineseCount(text)
  const effectiveCategories = categories?.length
    ? categories
    : kind === 'picture'
      ? GENERIC_PICTURE_CATEGORIES
      : GENERIC_QUESTION_CATEGORIES
  const categoryResults = keywordCoverage(text, effectiveCategories)
  const categoriesPassed = categoryResults.filter((item) => item.passed).length
  const requiredCategories = Math.max(1, Number(minCategories) || Math.min(3, effectiveCategories.length || 1))
  const requiredSeconds = Math.max(8, Number(minSeconds) || (kind === 'picture' ? 30 : 25))
  const requiredCharacters = Math.max(12, Number(minCharacters) || (kind === 'picture' ? 35 : 32))
  const durationScore = clamp((Number(durationSeconds) / requiredSeconds) * 100)
  const lengthScore = clamp((characters / requiredCharacters) * 100)
  const structureScore = clamp((categoriesPassed / requiredCategories) * 100)
  const linkers = linkerMatches(text)
  const linkerScore = clamp((Math.min(3, linkers.length) / 3) * 100)
  const score = clamp(structureScore * 0.4 + lengthScore * 0.25 + durationScore * 0.2 + linkerScore * 0.15)
  const grade = gradeForScore(score)

  return {
    version: 1,
    kind,
    score,
    grade,
    transcript: text,
    durationSeconds: Math.max(0, Math.round(Number(durationSeconds) || 0)),
    metrics: {
      characters,
      requiredCharacters,
      requiredSeconds,
      categoriesPassed,
      requiredCategories,
      categoryResults,
      linkers,
      lengthScore,
      durationScore,
      structureScore,
      linkerScore,
    },
    advice: feedbackText(grade, kind, { transcript: text }),
    disclaimer: 'Автооценка анализирует распознанный текст, длительность и структуру. Произношение и тоны проверяй по самой записи.',
  }
}

export function analyzeHskkResponse({
  kind = '',
  transcript = '',
  durationSeconds = 0,
  target = '',
  categories = [],
  minSeconds = 0,
  minCharacters = 0,
  minCategories = 0,
} = {}) {
  const normalizedKind = String(kind || '').toLowerCase()
  const isRepeat = normalizedKind.includes('repeat') || Boolean(target)
  if (isRepeat && target) {
    return repeatFeedback({ transcript, durationSeconds, target })
  }

  const openKind = normalizedKind.includes('picture') ? 'picture' : 'question'
  return openFeedback({
    kind: openKind,
    transcript,
    durationSeconds,
    categories,
    minSeconds,
    minCharacters,
    minCategories,
  })
}

export function parseStoredHskkFeedback(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}
