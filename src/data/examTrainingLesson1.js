export const examTrainingLesson1 = {
  id: 'lesson-1-exam-training',
  version: 2,
  title: '题型训练',
  subtitle: 'урок 1 · Мини-тест HSK',
  durationSeconds: 600,

  sections: [
    {
      id: 'listening',
      title: '听力',
      instruction:
        'Прослушай оригинальный фрагмент рабочей тетради один раз и отметь 对 / 错.',
      audio: '/audio/exam/lesson1/wb-listening-01-05.mp3',
      source:
        'HSK Standard Course 4A Рабочая тетрадь · урок 1 · 听力 第一部分 · 第1–5题',
      items: [
        {
          id: 'wb-l1',
          number: 1,
          type: 'trueFalse',
          statement: '他们俩是在公司认识的。',
          answer: '错',
          answerPinyin: 'cuò',
          answerTranslation: 'неверно',
          explanation:
            'В аудио сказано: сначала они познакомились у друзей дома, а позже стали работать в одной компании.',
        },
        {
          id: 'wb-l2',
          number: 2,
          type: 'trueFalse',
          statement: '妻子希望丈夫天天送她礼物。',
          answer: '错',
          answerPinyin: 'cuò',
          answerTranslation: 'неверно',
          explanation:
            'В аудио речь о подарке в годовщину свадьбы, а не каждый день.',
        },
        {
          id: 'wb-l3',
          number: 3,
          type: 'trueFalse',
          statement: '踢足球需要球员们一起努力。',
          answer: '对',
          answerPinyin: 'duì',
          answerTranslation: 'верно',
          explanation:
            'Это прямо соответствует смыслу аудио: футбол — не спорт одного человека.',
        },
        {
          id: 'wb-l4',
          number: 4,
          type: 'trueFalse',
          statement: '爱情不需要浪漫。',
          answer: '错',
          answerPinyin: 'cuò',
          answerTranslation: 'неверно',
          explanation:
            'В аудио сказано, что совместной жизни недостаточно только романтической любви; это не значит, что романтика не нужна.',
        },
        {
          id: 'wb-l5',
          number: 5,
          type: 'trueFalse',
          statement: '不要总是羡慕别人。',
          answer: '对',
          answerPinyin: 'duì',
          answerTranslation: 'верно',
          explanation:
            'Это итоговая мысль фрагмента: мы часто не замечаем собственного счастья.',
        },
      ],
    },

    {
      id: 'reading',
      title: '阅读',
      instruction:
        'Прочитай новые экзаменационные тексты и выбери ответ. Pinyin и перевод в этом режиме не показываются.',
      source: 'HSK 4 · H41005 · 阅读 第三部分',
      items: [
        {
          id: 'h41005-r69',
          number: 69,
          type: 'choice',
          passage:
            '一群性格各不相同的年轻人，几个酸甜苦辣的爱情故事，一段经历了半个世纪的美好回忆。由孙俪等著名演员主演，电视剧《血色浪漫》，星期日晚上8点，欢迎您继续收看。',
          question: '这段话最可能是：',
          options: ['广告', '京剧', '小说', '日记'],
          answer: '广告',
          answerPinyin: 'guǎnggào',
          answerTranslation: 'реклама; рекламное объявление',
          explanation:
            'Есть название телесериала, актёры, время показа и приглашение смотреть — это телевизионная реклама.',
        },
        {
          id: 'h41005-r71',
          number: 71,
          type: 'choice',
          passage:
            '小刘，这方面的问题我也不太懂，不过我有一个亲戚是律师，我给你他的电话号码，有什么问题，你可以直接问他。',
          question: '小刘想了解哪方面的情况？',
          options: ['艺术', '汉语', '法律', '语言'],
          answer: '法律',
          answerPinyin: 'fǎlǜ',
          answerTranslation: 'право; законодательство',
          explanation:
            'Ключ — 律师 «юрист». Значит, речь идёт о 法律.',
        },
        {
          id: 'h41005-r79',
          number: 79,
          type: 'choice',
          passage:
            '“熟悉的地方没有风景”是说对自己越熟悉的东西，往往越没有新鲜感，也就很难发现它的美丽之处。所以生活中不缺少美，缺少发现美的眼睛。',
          question: '对熟悉的东西，我们往往：',
          options: ['很有感情', '无法判断', '会有些怀疑', '缺少新鲜感'],
          answer: '缺少新鲜感',
          answerPinyin: 'quēshǎo xīnxiāngǎn',
          answerTranslation: 'не хватает ощущения новизны',
          explanation:
            'В тексте прямо сказано: 越熟悉……越没有新鲜感.',
        },
      ],
    },

    {
      id: 'writing',
      title: '书写',
      instruction:
        'Собери предложения из настоящего HSK 4. Никаких подсказок до завершения мини-теста.',
      source: 'HSK 4 · H41005 · 书写 第一部分',
      items: [
        {
          id: 'h41005-w86',
          number: 86,
          type: 'wordOrder',
          pieces: ['你', '关了', '把窗户', '吗'],
          answer: '你把窗户关了吗？',
          answerPinyin: 'nǐ bǎ chuānghu guān le ma',
          answerTranslation: 'Ты закрыл окно?',
          explanation:
            '把-конструкция: 你 + 把窗户 + 关了 + 吗.',
        },
        {
          id: 'h41005-w89',
          number: 89,
          type: 'wordOrder',
          pieces: ['打针', '好', '比吃药', '效果'],
          answer: '打针比吃药效果好。',
          answerPinyin: 'dǎzhēn bǐ chīyào xiàoguǒ hǎo',
          answerTranslation:
            'Уколы действуют лучше, чем приём лекарства.',
          explanation:
            'Официальный порядок H41005: 打针 + 比吃药 + 效果好.',
        },
        {
          id: 'h41005-w95',
          number: 95,
          type: 'wordOrder',
          pieces: ['完全', '国家的', '这么做', '符合', '法律规定'],
          answer: '这么做完全符合国家的法律规定。',
          answerPinyin:
            'zhème zuò wánquán fúhé guójiā de fǎlǜ guīdìng',
          answerTranslation:
            'Поступать так полностью соответствует законодательству страны.',
          explanation:
            '这么做 — тема/подлежащее; 完全 — наречие перед 符合; 国家 的 法律规定 — именная группа.',
        },
      ],
    },
  ],
}

export const examTrainingLesson1Meta = {
  version: examTrainingLesson1.version,
  totalSections: examTrainingLesson1.sections.length,
  totalItems: examTrainingLesson1.sections.reduce(
    (sum, section) => sum + section.items.length,
    0,
  ),
}

export default examTrainingLesson1
