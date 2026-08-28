import {
  lesson11Grammar,
  lesson11HskReading,
  lesson11HskWriting,
  lesson11Reading,
  lesson11Texts,
  lesson11Words,
  lesson11WritingOrder,
} from './lesson11Data.js'

const word = (hanzi) => lesson11Words.find((item) => item.hanzi === hanzi)

function orderActivity(source, priority = 'standard', suffix = '') {
  return {
    id: `lesson11-day3-order-${source.id}${suffix}`,
    type: 'sentenceOrder',
    lessonId: 'lesson-11',
    day: 3,
    skill: 'writing',
    subskill: 'word-order',
    title: `句子排序 · ${source.id.replace('wb', '').replace('h41002-', 'HSK ')}`,
    instruction: 'Собери предложение из всех частей.',
    pieces: source.pieces.map((text, pieceIndex) => ({ key: `${source.id}-${pieceIndex}`, text })),
    answer: source.answer,
    answerTokens: source.answerTokens,
    estimatedSeconds: 90,
    priority,
    errorType: 'word_order',
  }
}

export const lesson11DailyPlan = {
  lessonId: 'lesson-11',
  week: 7,
  lessonNumber: 11,
  title: '读书好，读好书，好读书',
  pinyin: 'dúshū hǎo, dú hǎo shū, hào dúshū',
  translation: 'Читать полезно, читать хорошие книги и любить чтение',
  theme: 'чтение · знания · учебные привычки · стратегия экзамена · собственное мнение',

  days: [
    {
      day: 1,
      title: '词汇 · 阅读习惯 · 学习方法',
      pinyin: 'cíhuì · yuèdú xíguàn · xuéxí fāngfǎ',
      translation: 'Лексика · привычка читать · способы учиться',
      focus: 'Активировать лексику чтения и научиться объяснять, как чтение помогает языку и как распределять время на экзамене.',
      activities: [
        {
          id: 'lesson11-day1-review', type: 'moduleLink', lessonId: 'lesson-11', day: 1,
          skill: 'review', subskill: 'review-errors', title: '今日复习', translation: 'Повторение слов и ошибок на сегодня',
          route: '/review', estimatedSeconds: 300, priority: 'core', track: false,
          description: 'Сначала повтори слова и ошибки, которые подошли на сегодня.',
        },
        {
          id: 'lesson11-day1-listen-text1', type: 'ttsChoice', lessonId: 'lesson-11', day: 1,
          skill: 'listening', subskill: 'textbook-main-idea', title: '课文1 · 怎么提高汉语', translation: 'Как Марк улучшает китайский?',
          instruction: 'Слушай оригинальную запись без текста. Можно включить два раза.',
          audio: '/audio/lesson11/sb/11-1.mp3', sourceLabel: 'Standard Course 4B · Lesson 11 · 11-1', ttsText: lesson11Texts.text1,
          prompt: '马克建议大卫怎么提高汉语能力？',
          options: ['多跟中国人交流，坚持看中文报纸并记录新词', '只学习语法规则', '每天只背词典', '遇到生词就放弃阅读'],
          answer: '多跟中国人交流，坚持看中文报纸并记录新词',
          revealTokens: [
            ['平时', 'píngshí', 'обычно'], ['多', 'duō', 'больше'], ['交', 'jiāo', 'заводить'], ['一些', 'yìxiē', 'несколько'], ['中国朋友', 'Zhōngguó péngyou', 'китайских друзей'], ['，', '', ''],
            ['经常', 'jīngcháng', 'часто'], ['和', 'hé', 'с'], ['他们', 'tāmen', 'ними'], ['聊天儿', 'liáotiānr', 'разговаривать'], ['，', '', ''],
            ['另外', 'lìngwài', 'кроме того'], ['，', '', ''], ['坚持', 'jiānchí', 'регулярно'], ['看', 'kàn', 'читать'], ['中文报纸', 'Zhōngwén bàozhǐ', 'китайские газеты'],
          ],
          estimatedSeconds: 300, priority: 'core', errorType: 'listening_memory',
        },
        {
          id: 'lesson11-day1-repeat-h81311-08', type: 'speechRepeat', lessonId: 'lesson-11', day: 1,
          skill: 'speaking', subskill: 'repeat', title: '听后重复 · H81311 第8题', translation: 'HSKK · настоящий вариант',
          instruction: 'Прослушай один раз и повтори как можно точнее.',
          audio: '/audio/hskk/bank/h81311-repeat-08.mp3',
          target: '他中文说得非常流利。', targetPinyin: 'tā Zhōngwén shuō de fēicháng liúlì',
          targetTranslation: 'Он очень бегло говорит по-китайски.', passPercent: 72,
          estimatedSeconds: 180, priority: 'core', errorType: 'speaking_pause',
        },
        {
          id: 'lesson11-day1-speaking-reading', type: 'speechPrompt', lessonId: 'lesson-11', day: 1,
          skill: 'speaking', subskill: 'question', title: '说一说 · 我的阅读习惯', translation: 'Твоя привычка читать',
          instruction: 'Говори 20–35 секунд: что читаешь → как часто → чем это полезно.',
          prompt: '你平时喜欢阅读什么？阅读给你带来过哪些好处？',
          promptPinyin: 'nǐ píngshí xǐhuan yuèdú shénme? yuèdú gěi nǐ dàiláiguo nǎxiē hǎochu?',
          promptTranslation: 'Что ты обычно любишь читать и какую пользу чтение тебе приносит?',
          minSeconds: 18, minCharacters: 22, minCategories: 3,
          categories: [
            { id: 'material', label: 'что читаешь', keywords: ['小说', '杂志', '新闻', '文章', '报纸', '书'] },
            { id: 'habit', label: 'привычка', keywords: ['每天', '经常', '有时间', '坚持', '阅读'] },
            { id: 'benefit', label: 'польза', keywords: ['增加知识', '词语', '提高', '放松', '减轻压力'] },
            { id: 'opinion', label: 'мнение', keywords: ['觉得', '看法', '喜欢', '有意思'] },
          ],
          supportWords: [
            { hanzi: '阅读', pinyin: 'yuèdú', translation: 'чтение' },
            { hanzi: '杂志', pinyin: 'zázhì', translation: 'журнал' },
            { hanzi: '增加', pinyin: 'zēngjiā', translation: 'увеличивать' },
            { hanzi: '词语', pinyin: 'cíyǔ', translation: 'слово, выражение' },
          ],
          estimatedSeconds: 360, priority: 'core', errorType: 'speaking_pause',
        },

        {
          id: 'lesson11-day1-vocab-activation', type: 'wordActivation', lessonId: 'lesson-11', day: 1,
          skill: 'vocabulary', subskill: 'activation', title: '词汇激活 · 16个重点词', translation: 'Активация ключевой лексики',
          words: lesson11Words, estimatedSeconds: 480, priority: 'standard',
        },
        {
          id: 'lesson11-day1-word-bank', type: 'wordBank', lessonId: 'lesson-11', day: 1,
          skill: 'vocabulary', subskill: 'lesson-bank', title: '词汇库 · 30个词', translation: 'Полный словарь урока 11',
          words: lesson11Words, estimatedSeconds: 210, priority: 'standard', track: false,
        },
        {
          id: 'lesson11-day1-vocab-liuli', type: 'multipleChoice', lessonId: 'lesson-11', day: 1,
          skill: 'vocabulary', subskill: 'meaning', title: '词义 · 流利', prompt: '流利',
          options: ['беглый, свободный (о речи)', 'сложный', 'известный', 'точный порядок'],
          answer: 'беглый, свободный (о речи)', estimatedSeconds: 75, priority: 'standard', errorType: 'word_unknown', srsWord: word('流利'),
        },
        {
          id: 'lesson11-day1-vocab-laideji', type: 'multipleChoice', lessonId: 'lesson-11', day: 1,
          skill: 'vocabulary', subskill: 'context', title: '语境 · 来得及',
          prompt: '还有四十分钟，坐地铁去机场应该___。', options: ['来得及', '否则', '复杂', '然而'], answer: '来得及',
          estimatedSeconds: 80, priority: 'standard', errorType: 'word_unknown', srsWord: word('来得及'),
        },
        {
          id: 'lesson11-day1-vocab-yangcheng', type: 'multipleChoice', lessonId: 'lesson-11', day: 1,
          skill: 'vocabulary', subskill: 'collocation', title: '搭配 · 养成', prompt: '选择最自然的搭配。',
          options: ['养成阅读习惯', '养成一页', '养成文章内容', '养成来得及'], answer: '养成阅读习惯',
          estimatedSeconds: 80, priority: 'standard', errorType: 'word_unknown', srsWord: word('养成'),
        },
        {
          id: 'lesson11-day1-vocab-kanfa', type: 'multipleChoice', lessonId: 'lesson-11', day: 1,
          skill: 'vocabulary', subskill: 'recall', title: '回忆 · Как сказать?', prompt: 'иметь собственное мнение',
          options: ['有自己的看法', '有自己的顺序', '有自己的否则', '有自己的复杂'], answer: '有自己的看法',
          answerPinyin: 'yǒu zìjǐ de kànfǎ', answerTranslation: 'иметь собственное мнение',
          estimatedSeconds: 80, priority: 'standard', errorType: 'word_unknown', srsWord: word('看法'),
        },
        {
          id: 'lesson11-day1-listen-text2', type: 'ttsChoice', lessonId: 'lesson-11', day: 1,
          skill: 'listening', subskill: 'textbook-detail', title: '课文2 · 阅读考试怎么做', translation: 'Почему Сяо Юй не успела закончить экзамен?',
          instruction: 'Слушай оригинальную запись без текста.', audio: '/audio/lesson11/sb/11-2.mp3',
          sourceLabel: 'Standard Course 4B · Lesson 11 · 11-2', ttsText: lesson11Texts.text2,
          prompt: '小雨为什么没有做完阅读考试？',
          options: ['先做了难而复杂的题，花了太多时间', '完全没有复习', '所有题都不会做', '考试时间只有半小时'],
          answer: '先做了难而复杂的题，花了太多时间',
          revealTokens: [
            ['我', 'wǒ', 'я'], ['先', 'xiān', 'сначала'], ['做了', 'zuò le', 'делала'], ['比较', 'bǐjiào', 'довольно'], ['复杂', 'fùzá', 'сложные'], ['的', 'de', 'определительная частица'], ['题', 'tí', 'задания'], ['，', '', ''],
            ['结果', 'jiéguǒ', 'в результате'], ['花了', 'huā le', 'потратила'], ['太多', 'tài duō', 'слишком много'], ['时间', 'shíjiān', 'времени'],
          ],
          estimatedSeconds: 270, priority: 'standard', errorType: 'listening_memory',
        },

        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 1, skill: 'reading', subskill: 'exam-transfer',
          title: 'Дополнительное HSK · 《富爸爸，穷爸爸》', ...lesson11HskReading[0], id: 'lesson11-day1-h41002-82',
          estimatedSeconds: 240, priority: 'intensive', examMode: true, errorType: 'reading_inference',
        },
        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 1, skill: 'reading', subskill: 'workbook',
          title: 'Дополнительное чтение · 35', ...lesson11Reading[0], id: 'lesson11-day1-reading-35',
          estimatedSeconds: 180, priority: 'intensive', examMode: true, errorType: 'reading_inference',
        },
        {
          id: 'lesson11-day1-wb-extra', type: 'audioBank', lessonId: 'lesson-11', day: 1,
          skill: 'listening', subskill: 'workbook-source', title: 'Дополнительное аудирование · Workbook 11-2',
          translation: 'Короткие диалоги из рабочей тетради',
          description: 'Прослушай короткие диалоги без текста. Этот блок тренирует скорость понимания и не получает автоматический балл без сверенного ключа.',
          tracks: [{ id: 'wb11-2-intensive', label: '11-2 · 第6–12题', description: 'короткие диалоги', audio: '/audio/lesson11/wb/11-2.mp3' }],
          estimatedSeconds: 420, priority: 'intensive', track: false,
        },
      ],
    },

    {
      day: 2,
      title: '语法 · 读书笔记 · 独立判断',
      pinyin: 'yǔfǎ · dúshū bǐjì · dúlì pànduàn',
      translation: 'Грамматика · заметки при чтении · самостоятельное суждение',
      focus: 'Отработать пять конструкций урока и научиться не только извлекать информацию из текста, но и оценивать её самостоятельно.',
      activities: [
        {
          id: 'lesson11-day2-review', type: 'moduleLink', lessonId: 'lesson-11', day: 2,
          skill: 'review', subskill: 'review-errors', title: '今日复习', translation: 'Повторение слов и ошибок',
          route: '/review', estimatedSeconds: 300, priority: 'core', track: false,
          description: 'Сначала верни вчерашние слабые слова и ошибки.',
        },
        {
          id: 'lesson11-day2-listen-text3', type: 'ttsChoice', lessonId: 'lesson-11', day: 2,
          skill: 'listening', subskill: 'textbook-main-idea', title: '课文3 · 每天半小时阅读', translation: 'Что даёт ежедневное чтение?',
          instruction: 'Слушай оригинальную запись без текста.', audio: '/audio/lesson11/sb/11-3.mp3',
          sourceLabel: 'Standard Course 4B · Lesson 11 · 11-3', ttsText: lesson11Texts.text3,
          prompt: '小李认为坚持阅读有什么好处？',
          options: ['能增加知识、减轻压力，也让人更轻松', '只会增加工作量', '只能提高写字速度', '必须每天读三个小时才有效'],
          answer: '能增加知识、减轻压力，也让人更轻松',
          revealTokens: [
            ['坚持', 'jiānchí', 'регулярно'], ['阅读', 'yuèdú', 'читать'], ['，', '', ''], ['除了', 'chúle', 'кроме'], ['能', 'néng', 'может'], ['增加', 'zēngjiā', 'увеличивать'], ['知识', 'zhīshi', 'знания'], ['外', 'wài', 'помимо этого'], ['，', '', ''],
            ['还', 'hái', 'ещё'], ['能', 'néng', 'может'], ['减轻', 'jiǎnqīng', 'уменьшить'], ['压力', 'yālì', 'стресс'],
          ],
          estimatedSeconds: 300, priority: 'core', errorType: 'listening_memory',
        },
        {
          id: 'lesson11-day2-picture-reading-family', type: 'speechPrompt', lessonId: 'lesson-11', day: 2,
          skill: 'speaking', subskill: 'picture', title: '看图说话 · 主题训练', translation: 'HSKK-формат · семейное чтение',
          instruction: 'Говори 20–40 секунд. Опиши людей и действие, затем предположи, почему совместное чтение может быть полезной привычкой.',
          image: '/assets/lesson11/wb-writing-50.png', imageAlt: 'Семья читает книгу вместе',
          minSeconds: 18, minCharacters: 24, minCategories: 3,
          categories: [
            { id: 'people', label: 'кто изображён', keywords: ['爸爸', '父亲', '孩子', '一家人', '他们'] },
            { id: 'action', label: 'что делают', keywords: ['看书', '阅读', '读书', '一起', '故事'] },
            { id: 'habit', label: 'привычка', keywords: ['养成', '习惯', '每天', '经常', '兴趣'] },
            { id: 'benefit', label: 'польза', keywords: ['知识', '精彩', '交流', '帮助', '增加'] },
          ],
          supportWords: [
            { hanzi: '阅读', pinyin: 'yuèdú', translation: 'читать' },
            { hanzi: '养成', pinyin: 'yǎngchéng', translation: 'сформировать привычку' },
            { hanzi: '精彩', pinyin: 'jīngcǎi', translation: 'яркий, замечательный' },
            { hanzi: '内容', pinyin: 'nèiróng', translation: 'содержание' },
          ],
          estimatedSeconds: 420, priority: 'core', errorType: 'picture_no_structure',
        },
        {
          id: 'lesson11-day2-speaking-notes', type: 'speechPrompt', lessonId: 'lesson-11', day: 2,
          skill: 'speaking', subskill: 'question', title: '短回答 · 读书笔记有用吗', translation: 'Полезно ли делать заметки при чтении?',
          instruction: 'Говори 15–25 секунд: позиция → один способ делать заметки → зачем это нужно.',
          prompt: '你觉得做读书笔记有用吗？你会怎么做笔记？',
          promptPinyin: 'nǐ juéde zuò dúshū bǐjì yǒuyòng ma? nǐ huì zěnme zuò bǐjì?',
          promptTranslation: 'Считаешь ли ты заметки при чтении полезными и как ты бы их делал(а)?',
          minSeconds: 12, minCharacters: 18, minCategories: 2,
          categories: [
            { id: 'opinion', label: 'мнение', keywords: ['有用', '没用', '觉得', '看法'] },
            { id: 'method', label: 'как делать', keywords: ['词语', '句子', '主要内容', '写下来', '笔记'] },
            { id: 'benefit', label: 'зачем', keywords: ['复习', '提高', '记住', '理解', '阅读能力'] },
          ],
          supportWords: [
            { hanzi: '内容', pinyin: 'nèiróng', translation: 'содержание' },
            { hanzi: '看法', pinyin: 'kànfǎ', translation: 'мнение' },
            { hanzi: '词语', pinyin: 'cíyǔ', translation: 'слово, выражение' },
          ],
          estimatedSeconds: 180, priority: 'core', errorType: 'speaking_pause',
        },

        {
          id: 'lesson11-day2-grammar-guide', type: 'grammarGuide', lessonId: 'lesson-11', day: 2,
          skill: 'grammar', subskill: 'guide', title: '语法 · 5个重点', translation: 'Пять грамматических тем урока 11',
          items: lesson11Grammar, estimatedSeconds: 330, priority: 'standard', track: false,
        },
        {
          id: 'lesson11-day2-grammar-lian', type: 'multipleChoice', lessonId: 'lesson-11', day: 2,
          skill: 'grammar', subskill: '连', title: '连……都……',
          prompt: '他汉语进步很快，现在___中文报纸___看得懂。', options: ['连 / 都', '无论 / 否则', '然而 / 同时', '只好 / 也'],
          answer: '连 / 都', explanation: '连……都…… выделяет крайний пример: «даже китайскую газету уже понимает».',
          estimatedSeconds: 95, priority: 'standard', errorType: 'grammar',
        },
        {
          id: 'lesson11-day2-grammar-fouze', type: 'multipleChoice', lessonId: 'lesson-11', day: 2,
          skill: 'grammar', subskill: '否则', title: '否则',
          prompt: '考试时要先安排好时间，___会做的题也可能没时间做。', options: ['否则', '同时', '连', '无论'],
          answer: '否则', explanation: '否则 = «иначе / в противном случае».', estimatedSeconds: 95, priority: 'standard', errorType: 'grammar',
        },
        {
          id: 'lesson11-day2-grammar-wulun', type: 'multipleChoice', lessonId: 'lesson-11', day: 2,
          skill: 'grammar', subskill: '无论', title: '无论……都……',
          prompt: '___你读小说还是杂志，___应该有自己的判断。', options: ['无论 / 都', '连 / 都', '然而 / 也', '否则 / 都'],
          answer: '无论 / 都', explanation: 'Результат не меняется при разных вариантах: что бы ты ни читал(а).', estimatedSeconds: 95, priority: 'standard', errorType: 'grammar',
        },
        {
          id: 'lesson11-day2-grammar-raner', type: 'multipleChoice', lessonId: 'lesson-11', day: 2,
          skill: 'grammar', subskill: '然而', title: '然而',
          prompt: '书能给我们很多知识，___，书里的内容并不一定都正确。', options: ['然而', '同时', '连', '否则'],
          answer: '然而', explanation: '然而 вводит книжное противопоставление: «однако».', estimatedSeconds: 95, priority: 'standard', errorType: 'grammar',
        },
        {
          id: 'lesson11-day2-grammar-tongshi', type: 'multipleChoice', lessonId: 'lesson-11', day: 2,
          skill: 'grammar', subskill: '同时', title: '同时',
          prompt: '阅读能增加知识，___还能丰富我们的情感。', options: ['同时', '否则', '连', '只好'],
          answer: '同时', explanation: '同时 добавляет второй одновременный эффект.', estimatedSeconds: 95, priority: 'standard', errorType: 'grammar',
        },
        {
          id: 'lesson11-day2-listen-text4', type: 'ttsChoice', lessonId: 'lesson-11', day: 2,
          skill: 'listening', subskill: 'textbook-main-idea', title: '课文4 · 怎么做读书笔记', translation: 'Как заметки помогают чтению?',
          instruction: 'Слушай оригинальную запись и выбери главную мысль.', audio: '/audio/lesson11/sb/11-4.mp3',
          sourceLabel: 'Standard Course 4B · Lesson 11 · 11-4', ttsText: lesson11Texts.text4,
          prompt: '课文关于读书笔记最重要的建议是什么？',
          options: ['记录有用内容，同时保留自己的看法和判断', '把整本书全部抄下来', '完全相信书里的所有内容', '只记录不认识的汉字'],
          answer: '记录有用内容，同时保留自己的看法和判断',
          revealTokens: [
            ['不能', 'bùnéng', 'нельзя'], ['完全', 'wánquán', 'полностью'], ['相信', 'xiāngxìn', 'верить'], ['书本', 'shūběn', 'книжному'], ['上', 'shang', 'в'], ['的', 'de', 'определительная частица'], ['内容', 'nèiróng', 'содержанию'], ['，', '', ''],
            ['要', 'yào', 'нужно'], ['有', 'yǒu', 'иметь'], ['自己', 'zìjǐ', 'собственное'], ['的', 'de', 'определительная частица'], ['看法', 'kànfǎ', 'мнение'], ['和', 'hé', 'и'], ['判断', 'pànduàn', 'суждение'],
          ],
          estimatedSeconds: 250, priority: 'standard', errorType: 'listening_memory',
        },
        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 2, skill: 'reading', subskill: 'workbook',
          title: 'Чтение · 36', ...lesson11Reading[1], id: 'lesson11-day2-reading-36',
          estimatedSeconds: 180, priority: 'standard', examMode: true, errorType: 'reading_inference',
        },
        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 2, skill: 'reading', subskill: 'workbook',
          title: 'Чтение · 37', ...lesson11Reading[2], id: 'lesson11-day2-reading-37',
          estimatedSeconds: 180, priority: 'standard', examMode: true, errorType: 'reading_inference',
        },

        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 2, skill: 'reading', subskill: 'workbook',
          title: 'Дополнительное чтение · 42', ...lesson11Reading[7], id: 'lesson11-day2-reading-42',
          estimatedSeconds: 180, priority: 'intensive', examMode: true, errorType: 'reading_inference',
        },
        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 2, skill: 'reading', subskill: 'workbook',
          title: 'Дополнительное чтение · 43', ...lesson11Reading[8], id: 'lesson11-day2-reading-43',
          estimatedSeconds: 180, priority: 'intensive', examMode: true, errorType: 'reading_inference',
        },
        {
          id: 'lesson11-day2-wb-extra', type: 'audioBank', lessonId: 'lesson-11', day: 2,
          skill: 'listening', subskill: 'workbook-source', title: 'Дополнительное аудирование · Workbook 11-3',
          translation: 'Диалоги и более длинные задания', description: 'Прослушай более длинный блок Workbook без текста.',
          tracks: [{ id: 'wb11-3-intensive', label: '11-3 · 第13–22题', description: 'диалоги и короткие тексты', audio: '/audio/lesson11/wb/11-3.mp3' }],
          estimatedSeconds: 480, priority: 'intensive', track: false,
        },
      ],
    },

    {
      day: 3,
      title: '写作 · 选择好书 · HSKK',
      pinyin: 'xiězuò · xuǎnzé hǎo shū · HSKK',
      translation: 'Письмо · выбирать хорошие книги · HSKK',
      focus: 'Закрепить лексику урока в письме и устной аргументации: что читать, как читать и почему собственное мнение важно.',
      activities: [
        {
          id: 'lesson11-day3-review', type: 'moduleLink', lessonId: 'lesson-11', day: 3,
          skill: 'review', subskill: 'review-errors', title: '今日复习', translation: 'Повторение слов и ошибок',
          route: '/review', estimatedSeconds: 300, priority: 'core', track: false,
          description: 'Перед письмом и устной частью верни слабые слова и ошибки.',
        },
        {
          id: 'lesson11-day3-listen-text5', type: 'ttsChoice', lessonId: 'lesson-11', day: 3,
          skill: 'listening', subskill: 'main-idea', title: '课文5 · 读书好，读好书，好读书', translation: 'Три смысла одной фразы',
          instruction: 'Слушай оригинальную запись без текста.', audio: '/audio/lesson11/sb/11-5.mp3',
          sourceLabel: 'Standard Course 4B · Lesson 11 · 11-5', ttsText: lesson11Texts.text5,
          prompt: '“好读书”在课文中是什么意思？',
          options: ['养成阅读习惯，让读书成为兴趣爱好', '只读很贵的书', '读书的时候必须很快', '只看考试需要的书'],
          answer: '养成阅读习惯，让读书成为兴趣爱好',
          revealTokens: [
            ['好读书', 'hào dúshū', 'любить читать'], ['就是', 'jiùshì', 'означает'], ['要', 'yào', 'нужно'], ['养成', 'yǎngchéng', 'сформировать'], ['阅读', 'yuèdú', 'чтения'], ['的', 'de', 'определительная частица'], ['习惯', 'xíguàn', 'привычку'], ['，', '', ''],
            ['使', 'shǐ', 'сделать так, чтобы'], ['读书', 'dúshū', 'чтение'], ['真正', 'zhēnzhèng', 'по-настоящему'], ['成为', 'chéngwéi', 'стало'], ['兴趣爱好', 'xìngqù àihào', 'интересом и увлечением'],
          ],
          estimatedSeconds: 300, priority: 'core', errorType: 'listening_memory',
        },
        {
          id: 'lesson11-day3-speaking-h81416-q14', type: 'speechPrompt', lessonId: 'lesson-11', day: 3,
          skill: 'speaking', subskill: 'question', title: '回答问题 · H81416 第14题', translation: 'HSKK · настоящий экзаменационный вопрос',
          instruction: 'Говори 30–45 секунд: выбери позицию → объясни 2 причины → приведи пример.',
          prompt: '能力和态度哪个更重要？请谈谈你的看法。',
          promptPinyin: 'nénglì hé tàidu nǎge gèng zhòngyào? qǐng tántan nǐ de kànfǎ.',
          promptTranslation: 'Что важнее: способности или отношение к делу? Выскажи своё мнение.',
          minSeconds: 24, minCharacters: 30, minCategories: 3,
          categories: [
            { id: 'position', label: 'позиция', keywords: ['能力', '态度', '更重要', '都重要', '看法'] },
            { id: 'reason', label: 'причина', keywords: ['因为', '坚持', '学习', '方法', '努力'] },
            { id: 'example', label: 'пример', keywords: ['比如', '考试', '工作', '汉语', '阅读'] },
            { id: 'balance', label: 'сравнение', keywords: ['但是', '然而', '同时', '如果', '无论'] },
          ],
          supportWords: [
            { hanzi: '能力', pinyin: 'nénglì', translation: 'способность' },
            { hanzi: '态度', pinyin: 'tàidu', translation: 'отношение, позиция' },
            { hanzi: '看法', pinyin: 'kànfǎ', translation: 'мнение' },
            { hanzi: '坚持', pinyin: 'jiānchí', translation: 'настойчиво продолжать' },
          ],
          estimatedSeconds: 420, priority: 'core', errorType: 'speaking_pause',
        },
        {
          id: 'lesson11-day3-speaking-good-book', type: 'speechPrompt', lessonId: 'lesson-11', day: 3,
          skill: 'speaking', subskill: 'question', title: '短回答 · 什么是好书', translation: 'Как ты выбираешь хорошие книги?',
          instruction: 'Говори 15–25 секунд: назови 2 критерия и объясни один из них.',
          prompt: '你觉得什么样的书才是“好书”？你会怎么选择？',
          promptPinyin: 'nǐ juéde shénmeyàng de shū cái shì “hǎo shū”? nǐ huì zěnme xuǎnzé?',
          promptTranslation: 'Какая книга для тебя является хорошей и как ты выбираешь, что читать?',
          minSeconds: 12, minCharacters: 18, minCategories: 2,
          categories: [
            { id: 'content', label: 'содержание', keywords: ['内容', '有用', '精彩', '知识', '有意思'] },
            { id: 'source', label: 'автор / качество', keywords: ['作者', '著名', '看法', '判断', '适合'] },
            { id: 'choice', label: 'как выбираешь', keywords: ['选择', '杂志', '小说', '文章', '阅读'] },
          ],
          supportWords: [
            { hanzi: '内容', pinyin: 'nèiróng', translation: 'содержание' },
            { hanzi: '精彩', pinyin: 'jīngcǎi', translation: '精彩ный, замечательный' },
            { hanzi: '看法', pinyin: 'kànfǎ', translation: 'мнение' },
          ],
          estimatedSeconds: 180, priority: 'core', errorType: 'speaking_pause',
        },

        ...lesson11WritingOrder.map((item) => orderActivity(item)),

        {
          id: 'lesson11-day3-writing-49', type: 'freeWriting', lessonId: 'lesson-11', day: 3,
          skill: 'writing', subskill: 'picture', title: '看图写句子 · 49', translation: 'Напиши предложение по картинке',
          image: '/assets/lesson11/wb-writing-49.png', imageAlt: 'Workbook Lesson 11 №49 — футбольный матч',
          prompt: '用“精彩”写一个句子。', requiredKeyword: '精彩', minCharacters: 8,
          referenceTokens: [
            ['这场', 'zhè chǎng', 'этот'], ['足球比赛', 'zúqiú bǐsài', 'футбольный матч'], ['非常', 'fēicháng', 'очень'], ['精彩', 'jīngcǎi', 'захватывающий'],
          ],
          estimatedSeconds: 240, priority: 'standard',
        },
        {
          id: 'lesson11-day3-writing-50', type: 'freeWriting', lessonId: 'lesson-11', day: 3,
          skill: 'writing', subskill: 'picture', title: '看图写句子 · 50', translation: 'Напиши предложение по картинке',
          image: '/assets/lesson11/wb-writing-50.png', imageAlt: 'Workbook Lesson 11 №50 — семья читает книгу',
          prompt: '用“养成”写一个句子。', requiredKeyword: '养成', minCharacters: 8,
          referenceTokens: [
            ['父母', 'fùmǔ', 'родители'], ['应该', 'yīnggāi', 'должны'], ['帮助', 'bāngzhù', 'помогать'], ['孩子', 'háizi', 'детям'], ['养成', 'yǎngchéng', 'сформировать'], ['阅读', 'yuèdú', 'чтения'], ['的', 'de', 'определительная частица'], ['习惯', 'xíguàn', 'привычку'],
          ],
          estimatedSeconds: 240, priority: 'standard',
        },
        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 3, skill: 'reading', subskill: 'workbook',
          title: 'Чтение · 38', ...lesson11Reading[3], id: 'lesson11-day3-reading-38',
          estimatedSeconds: 180, priority: 'standard', examMode: true, errorType: 'reading_inference',
        },
        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 3, skill: 'reading', subskill: 'workbook',
          title: 'Чтение · 39', ...lesson11Reading[4], id: 'lesson11-day3-reading-39',
          estimatedSeconds: 180, priority: 'standard', examMode: true, errorType: 'reading_inference',
        },
        {
          id: 'lesson11-wb-audio-bank', type: 'audioBank', lessonId: 'lesson-11', day: 3,
          skill: 'listening', subskill: 'workbook-source', title: '练习册听力 · 原版音频', translation: 'Оригинальное аудио рабочей тетради · Lesson 11',
          description: 'Все три исходных аудиоблока Workbook доступны для дополнительной тренировки. Там, где ответы аудио не сверены, сайт не придумывает автоматическую оценку.',
          tracks: [
            { id: 'wb11-1', label: '11-1 · 第1–5题', description: 'верно / неверно', audio: '/audio/lesson11/wb/11-1.mp3' },
            { id: 'wb11-2', label: '11-2 · 第6–12题', description: 'короткие диалоги', audio: '/audio/lesson11/wb/11-2.mp3' },
            { id: 'wb11-3', label: '11-3 · 第13–22题', description: 'диалоги и короткие тексты', audio: '/audio/lesson11/wb/11-3.mp3' },
          ],
          estimatedSeconds: 0, priority: 'standard', track: false,
        },

        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 3, skill: 'reading', subskill: 'exam-transfer',
          title: 'Дополнительное HSK · 《富爸爸，穷爸爸》', ...lesson11HskReading[1], id: 'lesson11-day3-h41002-83',
          estimatedSeconds: 240, priority: 'intensive', examMode: true, errorType: 'reading_inference',
        },
        orderActivity(lesson11HskWriting, 'intensive', '-hsk'),
        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 3, skill: 'reading', subskill: 'workbook',
          title: 'Дополнительное чтение · 40', ...lesson11Reading[5], id: 'lesson11-day3-reading-40',
          estimatedSeconds: 180, priority: 'intensive', examMode: true, errorType: 'reading_inference',
        },
        {
          type: 'readingChoice', lessonId: 'lesson-11', day: 3, skill: 'reading', subskill: 'workbook',
          title: 'Дополнительное чтение · 41', ...lesson11Reading[6], id: 'lesson11-day3-reading-41',
          estimatedSeconds: 180, priority: 'intensive', examMode: true, errorType: 'reading_inference',
        },
        {
          id: 'lesson11-day3-wb-extra', type: 'audioBank', lessonId: 'lesson-11', day: 3,
          skill: 'listening', subskill: 'workbook-source', title: 'Дополнительное аудирование · Workbook 11-1',
          translation: 'Блок верно / неверно', description: 'Дополнительный блок на быстрое понимание речи.',
          tracks: [{ id: 'wb11-1-intensive', label: '11-1 · 第1–5题', description: 'верно / неверно', audio: '/audio/lesson11/wb/11-1.mp3' }],
          estimatedSeconds: 360, priority: 'intensive', track: false,
        },
      ],
    },
  ],
}

export default lesson11DailyPlan
