export const writingLesson1 = {
  id: 'lesson-1-writing',
  title: '写作练习 · урок 1',
  topic: '简单的爱情',
  version: 2,

  orderTasks: [
    {
      id: 'wb-44',
      number: 44,
      source: 'HSK Standard Course 4A Рабочая тетрадь · урок 1 · 第44题',
      pieces: ['会跳舞', '的', '人', '羡慕', '很', '她'],
      answer: '她很羡慕会跳舞的人。',
      tokens: [
        { hanzi: '她', pinyin: 'tā', translation: 'она' },
        { hanzi: '很', pinyin: 'hěn', translation: 'очень' },
        { hanzi: '羡慕', pinyin: 'xiànmù', translation: 'завидовать; восхищаться' },
        { hanzi: '会', pinyin: 'huì', translation: 'уметь' },
        { hanzi: '跳舞', pinyin: 'tiàowǔ', translation: 'танцевать' },
        { hanzi: '的', pinyin: 'de', translation: 'служебная частица определения' },
        { hanzi: '人', pinyin: 'rén', translation: 'человек; люди' },
      ],
      explanation:
        'Сначала подлежащее 她, затем наречие степени 很 + сказуемое 羡慕. 会跳舞的人 — единая именная группа «люди, которые умеют танцевать».',
    },
    {
      id: 'wb-45',
      number: 45,
      source: 'HSK Standard Course 4A Рабочая тетрадь · урок 1 · 第45题',
      pieces: ['衣服', '你', '换', '一件', '最好'],
      answer: '你最好换一件衣服。',
      tokens: [
        { hanzi: '你', pinyin: 'nǐ', translation: 'ты' },
        { hanzi: '最好', pinyin: 'zuìhǎo', translation: 'лучше всего; лучше бы' },
        { hanzi: '换', pinyin: 'huàn', translation: 'сменить; поменять' },
        { hanzi: '一件', pinyin: 'yí jiàn', translation: 'одна штука; счётное слово для одежды' },
        { hanzi: '衣服', pinyin: 'yīfu', translation: 'одежда' },
      ],
      explanation:
        '最好 обычно ставится после подлежащего перед глаголом: 你 + 最好 + 换……',
    },
    {
      id: 'wb-46',
      number: 46,
      source: 'HSK Standard Course 4A Рабочая тетрадь · урок 1 · 第46题',
      pieces: ['请假的', '知道', '经理', '原因', '没人'],
      answer: '没人知道经理请假的原因。',
      tokens: [
        { hanzi: '没人', pinyin: 'méirén', translation: 'никто' },
        { hanzi: '知道', pinyin: 'zhīdào', translation: 'знать' },
        { hanzi: '经理', pinyin: 'jīnglǐ', translation: 'менеджер; руководитель' },
        { hanzi: '请假', pinyin: 'qǐngjià', translation: 'просить отпуск / отгул' },
        { hanzi: '的', pinyin: 'de', translation: 'служебная частица определения' },
        { hanzi: '原因', pinyin: 'yuányīn', translation: 'причина' },
      ],
      explanation:
        '主干: 没人知道…… Далее именная группа: 经理请假的原因 — «причина, по которой менеджер взял отгул».',
    },
    {
      id: 'wb-47',
      number: 47,
      source: 'HSK Standard Course 4A Рабочая тетрадь · урок 1 · 第47题',
      pieces: ['俩', '没', '参加', '考试', '她们'],
      answer: '她们俩没参加考试。',
      tokens: [
        { hanzi: '她们', pinyin: 'tāmen', translation: 'они (женщины)' },
        { hanzi: '俩', pinyin: 'liǎ', translation: 'двое; обе' },
        { hanzi: '没', pinyin: 'méi', translation: 'не; отрицание прошедшего действия' },
        { hanzi: '参加', pinyin: 'cānjiā', translation: 'участвовать; принимать участие' },
        { hanzi: '考试', pinyin: 'kǎoshì', translation: 'экзамен; сдавать экзамен' },
      ],
      explanation:
        '她们俩 — «они обе». Отрицание 没 ставится перед глаголом 参加.',
    },
    {
      id: 'wb-48',
      number: 48,
      source: 'HSK Standard Course 4A Рабочая тетрадь · урок 1 · 第48题',
      pieces: ['自行车', '送给我', '他', '把', '那辆', '了'],
      answer: '他把那辆自行车送给我了。',
      tokens: [
        { hanzi: '他', pinyin: 'tā', translation: 'он' },
        { hanzi: '把', pinyin: 'bǎ', translation: 'маркер 把-конструкции' },
        { hanzi: '那辆', pinyin: 'nà liàng', translation: 'тот/та; счётное слово для транспорта' },
        { hanzi: '自行车', pinyin: 'zìxíngchē', translation: 'велосипед' },
        { hanzi: '送给', pinyin: 'sònggěi', translation: 'подарить; отдать кому-то' },
        { hanzi: '我', pinyin: 'wǒ', translation: 'я; мне' },
        { hanzi: '了', pinyin: 'le', translation: 'частица завершённости / изменения ситуации' },
      ],
      explanation:
        '把-конструкция: 主语 + 把 + объект + действие + результат/了.',
    },
  ],

  typingTasks: [
    {
      id: 'typing-44',
      sourceNumber: 44,
      prompt: 'Она очень завидует людям, которые умеют танцевать.',
      answer: '她很羡慕会跳舞的人。',
      tokens: [
        { hanzi: '她', pinyin: 'tā', translation: 'она' },
        { hanzi: '很', pinyin: 'hěn', translation: 'очень' },
        { hanzi: '羡慕', pinyin: 'xiànmù', translation: 'завидовать; восхищаться' },
        { hanzi: '会', pinyin: 'huì', translation: 'уметь' },
        { hanzi: '跳舞', pinyin: 'tiàowǔ', translation: 'танцевать' },
        { hanzi: '的', pinyin: 'de', translation: 'служебная частица определения' },
        { hanzi: '人', pinyin: 'rén', translation: 'человек; люди' },
      ],
      accepted: ['她很羡慕会跳舞的人。'],
      support: ['她', '很', '羡慕', '会跳舞的人'],
      explanation:
        'Теперь та же структура без карточек: 她 + 很羡慕 + 会跳舞的人.',
    },
    {
      id: 'typing-48',
      sourceNumber: 48,
      prompt: 'Он подарил мне тот велосипед.',
      answer: '他把那辆自行车送给我了。',
      tokens: [
        { hanzi: '他', pinyin: 'tā', translation: 'он' },
        { hanzi: '把', pinyin: 'bǎ', translation: 'маркер 把-конструкции' },
        { hanzi: '那辆', pinyin: 'nà liàng', translation: 'тот/та; счётное слово для транспорта' },
        { hanzi: '自行车', pinyin: 'zìxíngchē', translation: 'велосипед' },
        { hanzi: '送给', pinyin: 'sònggěi', translation: 'подарить; отдать кому-то' },
        { hanzi: '我', pinyin: 'wǒ', translation: 'я; мне' },
        { hanzi: '了', pinyin: 'le', translation: 'частица завершённости / изменения ситуации' },
      ],
      accepted: ['他把那辆自行车送给我了。'],
      support: ['他', '把', '那辆自行车', '送给我', '了'],
      explanation:
        'Сохраняем экзаменационный порядок 把-конструкции.',
    },
  ],

  pictureTasks: [
    {
      id: 'wb-49',
      number: 49,
      source: 'HSK Standard Course 4A Рабочая тетрадь · урок 1 · 第49题',
      image: '/assets/writing/lesson1/wb-writing-49.png',
      keyword: '幸福',
      keywordPinyin: 'xìngfú',
      keywordTranslation: 'счастливый; счастье',
      sourceReference:
        '他们结婚了，看起来很幸福。',
      sourceReferencePinyin:
        'tāmen jiéhūn le, kànqǐlái hěn xìngfú',
      sourceReferenceTranslation:
        'Они поженились и выглядят очень счастливыми.',
      sourceReferenceTokens: [
        { hanzi: '他们', pinyin: 'tāmen', translation: 'они' },
        { hanzi: '结婚了', pinyin: 'jiéhūn le', translation: 'поженились' },
        { hanzi: '看起来', pinyin: 'kànqǐlái', translation: 'выглядеть; казаться' },
        { hanzi: '很幸福', pinyin: 'hěn xìngfú', translation: 'очень счастливы' },
      ],
      naturalVariant: '新郎和新娘笑得很开心，看起来很幸福。',
      naturalVariantPinyin:
        'xīnláng hé xīnniáng xiào de hěn kāixīn, kànqǐlái hěn xìngfú',
      naturalVariantTranslation:
        'Жених и невеста радостно улыбаются и выглядят очень счастливыми.',
      naturalVariantTokens: [
        { hanzi: '新郎', pinyin: 'xīnláng', translation: 'жених' },
        { hanzi: '和', pinyin: 'hé', translation: 'и' },
        { hanzi: '新娘', pinyin: 'xīnniáng', translation: 'невеста' },
        { hanzi: '笑得很开心', pinyin: 'xiào de hěn kāixīn', translation: 'радостно улыбаются' },
        { hanzi: '看起来', pinyin: 'kànqǐlái', translation: 'выглядеть; казаться' },
        { hanzi: '很幸福', pinyin: 'hěn xìngfú', translation: 'очень счастливы' },
      ],
    },
    {
      id: 'wb-50',
      number: 50,
      source: 'HSK Standard Course 4A Рабочая тетрадь · урок 1 · 第50题',
      image: '/assets/writing/lesson1/wb-writing-50.png',
      keyword: '俩',
      keywordPinyin: 'liǎ',
      keywordTranslation: 'двое; оба',
      sourceReference:
        '他们俩正在商店里一起买东西。',
      sourceReferencePinyin:
        'tāmen liǎ zhèngzài shāngdiàn lǐ yìqǐ mǎi dōngxi',
      sourceReferenceTranslation:
        'Они вдвоём сейчас вместе делают покупки в магазине.',
      sourceReferenceTokens: [
        { hanzi: '他们俩', pinyin: 'tāmen liǎ', translation: 'они вдвоём' },
        { hanzi: '正在', pinyin: 'zhèngzài', translation: 'прямо сейчас; в процессе' },
        { hanzi: '商店里', pinyin: 'shāngdiàn lǐ', translation: 'в магазине' },
        { hanzi: '一起', pinyin: 'yìqǐ', translation: 'вместе' },
        { hanzi: '买东西', pinyin: 'mǎi dōngxi', translation: 'покупать вещи; делать покупки' },
      ],
      naturalVariant:
        '他们俩周末经常一起去买东西。',
      naturalVariantPinyin:
        'tāmen liǎ zhōumò jīngcháng yìqǐ qù mǎi dōngxi',
      naturalVariantTranslation:
        'Они вдвоём по выходным часто вместе ходят за покупками.',
      naturalVariantTokens: [
        { hanzi: '他们俩', pinyin: 'tāmen liǎ', translation: 'они вдвоём' },
        { hanzi: '周末', pinyin: 'zhōumò', translation: 'выходные' },
        { hanzi: '经常', pinyin: 'jīngcháng', translation: 'часто' },
        { hanzi: '一起', pinyin: 'yìqǐ', translation: 'вместе' },
        { hanzi: '去', pinyin: 'qù', translation: 'идти; ехать' },
        { hanzi: '买东西', pinyin: 'mǎi dōngxi', translation: 'делать покупки' },
      ],
    },
  ],
}

export const writingLesson1Meta = {
  version: 2,
  objectiveTotal:
    writingLesson1.orderTasks.length +
    writingLesson1.typingTasks.length,
  pictureTotal: writingLesson1.pictureTasks.length,
  totalStages: 3,
}

export default writingLesson1
