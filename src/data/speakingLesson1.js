export const speakingLesson1 = {
  id: 'lesson-1-speaking-final',
  version: 3,
  title: '口语训练 · HSKK',
  topic: '简单的爱情',

  repeatBank: [
    {
      id: 'mock1-01',
      source: '新HSK速成强化教程 口试（中级）· 模拟考试（一）· 第1题',
      audio: '/audio/speaking/lesson1/mock1/repeat-01.mp3',
      target: '今天他又迟到了。',
      pinyin: 'jīntiān tā yòu chídào le',
      translation: 'Сегодня он опять опоздал.',
      chunks: ['今天', '他又迟到了'],
    },
    {
      id: 'mock1-02',
      source: '新HSK速成强化教程 口试（中级）· 模拟考试（一）· 第2题',
      audio: '/audio/speaking/lesson1/mock1/repeat-02.mp3',
      target: '昨天的演出很精彩。',
      pinyin: 'zuótiān de yǎnchū hěn jīngcǎi',
      translation: 'Вчерашнее выступление было замечательным.',
      chunks: ['昨天的演出', '很精彩'],
    },
    {
      id: 'mock1-03',
      source: '新HSK速成强化教程 口试（中级）· 模拟考试（一）· 第3题',
      audio: '/audio/speaking/lesson1/mock1/repeat-03.mp3',
      target: '今天图书馆不开门。',
      pinyin: 'jīntiān túshūguǎn bù kāimén',
      translation: 'Сегодня библиотека закрыта.',
      chunks: ['今天', '图书馆不开门'],
    },
    {
      id: 'mock1-04',
      source: '新HSK速成强化教程 口试（中级）· 模拟考试（一）· 第4题',
      audio: '/audio/speaking/lesson1/mock1/repeat-04.mp3',
      target: '我只看过一次京剧。',
      pinyin: 'wǒ zhǐ kànguo yí cì Jīngjù',
      translation: 'Я видел(а) пекинскую оперу только один раз.',
      chunks: ['我只看过', '一次京剧'],
    },
    {
      id: 'mock1-05',
      source: '新HSK速成强化教程 口试（中级）· 模拟考试（一）· 第5题',
      audio: '/audio/speaking/lesson1/mock1/repeat-05.mp3',
      target: '他经常跟我开玩笑。',
      pinyin: 'tā jīngcháng gēn wǒ kāi wánxiào',
      translation: 'Он часто шутит со мной.',
      chunks: ['他经常', '跟我开玩笑'],
      lessonLink: true,
    },
  ],

  dailyRepeatIds: [
    'mock1-01',
    'mock1-02',
    'mock1-03',
    'mock1-04',
    'mock1-05',
  ],

  retellTask: {
    id: 'retell-sb5',
    source: 'HSK Standard Course 4A · урок 1 · 课文5 · 01-5',
    audio: '/audio/speaking/lesson1/sb-01-5-retell.mp3',
    title: '听后复述 · 幸福婚姻',
    targetSeconds: '25–40',
    minimumSeconds: 18,
    minimumCharacters: 28,
    minimumCategories: 3,
    scaffold: [
      { hanzi: '结婚 / 爱情', pinyin: 'jiéhūn / àiqíng', translation: 'брак / любовь' },
      { hanzi: '共同生活', pinyin: 'gòngtóng shēnghuó', translation: 'совместная жизнь' },
      { hanzi: '互相吸引', pinyin: 'hùxiāng xīyǐn', translation: 'привлекать друг друга' },
      { hanzi: '幽默 / 脾气', pinyin: 'yōumò / píqi', translation: 'юмор / характер' },
    ],
    categories: [
      {
        id: 'marriage',
        label: '爱情 / 结婚',
        keywords: ['爱情', '结婚', '婚姻'],
      },
      {
        id: 'life',
        label: '共同生活',
        keywords: ['共同', '生活', '一起'],
      },
      {
        id: 'attraction',
        label: '互相 / 吸引',
        keywords: ['互相', '吸引', '理解', '关心', '支持', '信任'],
      },
      {
        id: 'personality',
        label: '性格',
        keywords: ['性格', '幽默', '脾气', '开玩笑'],
      },
    ],
  },

  pictureTask: {
    id: 'h81311-picture-11',
    source: 'H81311 · 第11题',
    image: '/assets/hskk/bank/h81311-picture-11.png',
    title: '看图说话 · H81311 第11题',
    targetSeconds: '30–45',
    minimumSeconds: 18,
    minimumCharacters: 24,
    minimumCategories: 3,
    supportLevel: 'Полные подсказки · урок 1',
    frames: [
      { hanzi: '这张照片里……', pinyin: 'zhè zhāng zhàopiàn lǐ', translation: 'На этой фотографии…' },
      { hanzi: '有三个人……', pinyin: 'yǒu sān ge rén', translation: 'есть три человека…' },
      { hanzi: '她们正在……', pinyin: 'tāmen zhèngzài', translation: 'они сейчас…' },
      { hanzi: '我觉得……', pinyin: 'wǒ juéde', translation: 'я думаю / мне кажется…' },
      { hanzi: '可能……', pinyin: 'kěnéng', translation: 'возможно…' },
    ],
    categories: [
      { id: 'people', label: '人物', keywords: ['三个人', '三个女孩', '女人', '女的', '朋友', '她们'] },
      { id: 'action', label: '动作', keywords: ['过生日', '生日', '蛋糕', '庆祝', '吹蜡烛', '一起'] },
      { id: 'relationship', label: '关系', keywords: ['朋友', '同学', '关系', '一起', '陪'] },
      { id: 'feeling', label: '感受 / 推测', keywords: ['高兴', '开心', '幸福', '可能', '好像', '看起来'] },
    ],
  },

  questionTask: {
    id: 'lesson1-question',
    source: 'HSKK · вопрос по теме урока 1',
    prompt: '请介绍一个你喜欢相处的人，说说你们有什么共同点。',
    promptPinyin: 'qǐng jièshào yí ge nǐ xǐhuan xiāngchǔ de rén, shuōshuo nǐmen yǒu shénme gòngtóngdiǎn',
    promptTranslation:
      'Расскажи о человеке, с которым тебе нравится общаться, и скажи, что у вас общего.',
    targetSeconds: '30–45',
    minimumSeconds: 20,
    minimumCharacters: 28,
    minimumCategories: 3,
    frames: [
      {
        hanzi: '我想介绍……',
        pinyin: 'wǒ xiǎng jièshào',
        translation: 'Я хочу рассказать о…',
      },
      {
        hanzi: '我们有共同的……',
        pinyin: 'wǒmen yǒu gòngtóng de',
        translation: 'У нас общие…',
      },
      {
        hanzi: '他/她的性格……',
        pinyin: 'tā de xìnggé',
        translation: 'Его/её характер…',
      },
      {
        hanzi: '比如……',
        pinyin: 'bǐrú',
        translation: 'например…',
      },
      {
        hanzi: '所以我觉得……',
        pinyin: 'suǒyǐ wǒ juéde',
        translation: 'поэтому я считаю…',
      },
    ],
    categories: [
      {
        id: 'person',
        label: '介绍人物',
        keywords: ['朋友', '同学', '同事', '丈夫', '妻子', '男朋友', '女朋友', '老师', '他', '她'],
      },
      {
        id: 'common',
        label: '共同点',
        keywords: ['共同', '都喜欢', '一起', '爱好', '兴趣'],
      },
      {
        id: 'personality',
        label: '性格',
        keywords: ['性格', '幽默', '活泼', '安静', '脾气', '开玩笑'],
      },
      {
        id: 'conclusion',
        label: '感受 / 结尾',
        keywords: ['快乐', '开心', '幸福', '喜欢', '所以', '觉得'],
      },
    ],
    referenceExpression: [
      {
        hanzi: '我最好的朋友叫苏珊，她今年二十一岁，住在洛杉矶。',
        pinyin: 'wǒ zuì hǎo de péngyou jiào Sūshān, tā jīnnián èrshíyī suì, zhù zài Luòshānjī',
        translation: 'Мою лучшую подругу зовут Сьюзан. Ей 21 год, она живёт в Лос-Анджелесе.',
      },
      {
        hanzi: '她是我的大学同学，我们有许多共同的爱好。',
        pinyin: 'tā shì wǒ de dàxué tóngxué, wǒmen yǒu xǔduō gòngtóng de àihào',
        translation: 'Она моя однокурсница, у нас много общих увлечений.',
      },
      {
        hanzi: '比方说，我们都喜欢爬山，都喜欢打篮球。',
        pinyin: 'bǐfang shuō, wǒmen dōu xǐhuan páshān, dōu xǐhuan dǎ lánqiú',
        translation: 'Например, мы обе любим ходить в горы и играть в баскетбол.',
      },
      {
        hanzi: '但是我们的性格不太一样。我很安静，她很活泼。',
        pinyin: 'dànshì wǒmen de xìnggé bú tài yíyàng. wǒ hěn ānjìng, tā hěn huópo',
        translation: 'Но характеры у нас не совсем одинаковые. Я спокойная, а она живая и общительная.',
      },
      {
        hanzi: '苏珊很幽默，常常开玩笑。跟她在一起，我总是很快乐。',
        pinyin: 'Sūshān hěn yōumò, chángcháng kāi wánxiào. gēn tā zài yìqǐ, wǒ zǒngshì hěn kuàilè',
        translation: 'Сьюзан очень юморная и часто шутит. Когда я с ней, мне всегда весело.',
      },
    ],
    referenceSource:
      '新HSK速成强化教程 口试（中级）· 十三 参考表达',
  },

  officialFormat: {
    repeat: '10题 · 3分钟',
    picture: '2题 · 4分钟',
    questions: '2题 · 4分钟',
    preparation: '准备时间 10分钟',
  },
}

export const speakingLesson1Meta = {
  version: 3,
  totalStages: 4,
  dailyRepeatTotal: speakingLesson1.dailyRepeatIds.length,
}

export default speakingLesson1
