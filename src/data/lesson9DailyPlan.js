import {
  lesson9Grammar,
  lesson9HskReading,
  lesson9Reading,
  lesson9Texts,
  lesson9Words,
  lesson9WritingOrder,
} from './lesson9Data.js'

const word = (hanzi) => lesson9Words.find((item) => item.hanzi === hanzi)

function orderActivity(source, priority = 'standard') {
  return {
    id: `lesson9-day3-order-${source.id}`,
    type: 'sentenceOrder', lessonId: 'lesson-9', day: 3,
    skill: 'writing', subskill: 'word-order',
    title: `句子排序 · ${source.id.replace('wb', '')}`,
    instruction: 'Собери предложение из всех частей.',
    pieces: source.pieces.map((text, i) => ({ key: `${source.id}-${i}`, text })),
    answer: source.answer, answerTokens: source.answerTokens,
    estimatedSeconds: 90, priority, errorType: 'word_order',
  }
}

export const lesson9DailyPlan = {
  lessonId: 'lesson-9', week: 6, lessonNumber: 9,
  title: '阳光总在风雨后',
  pinyin: 'yángguāng zǒng zài fēngyǔ hòu',
  translation: 'После бури снова выглянет солнце',
  theme: 'успех · неудача · настойчивость · выбор · преодоление трудностей',
  days: [
    {
      day: 1,
      title: '词汇 · 坚持 · 不轻易放弃',
      translation: 'Лексика · настойчивость · не сдаваться слишком быстро',
      focus: 'Активировать лексику успеха и неудачи и научиться объяснять, почему результат требует времени и усилий.',
      activities: [
        { id:'lesson9-day1-review', type:'moduleLink', lessonId:'lesson-9', day:1, skill:'review', subskill:'review-errors', title:'今日复习', translation:'Повторение слов и ошибок на сегодня', route:'/review', estimatedSeconds:300, priority:'core', track:false, description:'Сначала повтори слова и ошибки, которые подошли на сегодня.' },
        {
          id:'lesson9-day1-listen-text1', type:'ttsChoice', lessonId:'lesson-9', day:1, skill:'listening', subskill:'textbook-main-idea',
          title:'课文1 · 减肥为什么不能着急', translation:'Почему при похудении нельзя ждать мгновенного результата?',
          instruction:'Слушай оригинальную запись без текста. Можно включить два раза.', audio:'/audio/lesson9/sb/09-1.mp3', sourceLabel:'Standard Course 4A · Lesson 9 · 09-1', ttsText:lesson9Texts.text1,
          prompt:'王静为什么劝孙月不要放弃减肥？', options:['一个月太短，坚持一段时间才会慢慢有效果','因为巧克力可以减肥','因为运动没有用','因为孙月已经减了很多'], answer:'一个月太短，坚持一段时间才会慢慢有效果',
          revealTokens:[['一个月','yí ge yuè','один месяц'],['太短','tài duǎn','слишком короткий'],['了','le','частица'],['，','',''],['要想','yàoxiǎng','если хочешь'],['减肥','jiǎnféi','похудеть'],['成功','chénggōng','успешно'],['，','',''],['只能','zhǐ néng','нужно'],['坚持','jiānchí','продолжать'],['，','',''],['才会','cái huì','только тогда будет'],['慢慢','mànmàn','постепенно'],['有效果','yǒu xiàoguǒ','результат']],
          estimatedSeconds:300, priority:'core', errorType:'listening_memory',
        },
        { id:'lesson9-day1-repeat-h81416-06', type:'speechRepeat', lessonId:'lesson-9', day:1, skill:'speaking', subskill:'repeat', title:'听后重复 · H81416 第6题', translation:'HSKK · настоящий вариант', instruction:'Прослушай один раз и повтори как можно точнее.', audio:'/audio/hskk/bank/h81416-repeat-06.mp3', target:'我已经把材料翻译好了。', targetPinyin:'wǒ yǐjīng bǎ cáiliào fānyì hǎo le', targetTranslation:'Я уже закончил перевод материалов.', passPercent:72, estimatedSeconds:180, priority:'core', errorType:'speaking_pause' },
        {
          id:'lesson9-day1-speaking-persist', type:'speechPrompt', lessonId:'lesson-9', day:1, skill:'speaking', subskill:'question', title:'说一说 · 想放弃的时候', translation:'Что помогает тебе не сдаваться?',
          instruction:'Говори 20–35 секунд: ситуация → почему было трудно → что помогло продолжить.', prompt:'你有没有想放弃一件事的时候？后来你坚持下去了吗？为什么？', promptPinyin:'nǐ yǒu méiyǒu xiǎng fàngqì yí jiàn shì de shíhou? hòulái nǐ jiānchí xiàqu le ma? wèishénme?', promptTranslation:'Был ли момент, когда ты хотел(а) что-то бросить? Продолжил(а) ли ты потом? Почему?', minSeconds:18, minCharacters:22, minCategories:3,
          categories:[{id:'situation',label:'ситуация',keywords:['学习','工作','考试','运动','减肥','比赛']},{id:'difficulty',label:'трудность',keywords:['困难','累','失败','压力','没效果','辛苦']},{id:'choice',label:'решение',keywords:['坚持','放弃','继续','主意','改变']},{id:'result',label:'результат',keywords:['结果','成功','进步','经验','最后']}],
          supportWords:[{hanzi:'坚持',pinyin:'jiānchí',translation:'продолжать, не сдаваться'},{hanzi:'放弃',pinyin:'fàngqì',translation:'сдаться, отказаться'},{hanzi:'结果',pinyin:'jiéguǒ',translation:'результат'},{hanzi:'失败',pinyin:'shībài',translation:'неудача'}], estimatedSeconds:360, priority:'core', errorType:'speaking_pause',
        },
        { id:'lesson9-day1-vocab-activation', type:'wordActivation', lessonId:'lesson-9', day:1, skill:'vocabulary', subskill:'activation', title:'词汇激活 · 16个重点词', translation:'Активация ключевой лексики', words:lesson9Words, estimatedSeconds:480, priority:'standard' },
        { id:'lesson9-day1-word-bank', type:'wordBank', lessonId:'lesson-9', day:1, skill:'vocabulary', subskill:'lesson-bank', title:'词汇库 · 31个词', translation:'Полный словарь урока 9', words:lesson9Words, estimatedSeconds:210, priority:'standard', track:false },
        { id:'lesson9-day1-vocab-jianchi', type:'multipleChoice', lessonId:'lesson-9', day:1, skill:'vocabulary', subskill:'meaning', title:'词义 · 坚持', prompt:'坚持', options:['продолжать и не сдаваться','временно отказаться','получить приз','сравнить результаты'], answer:'продолжать и не сдаваться', estimatedSeconds:75, priority:'standard', errorType:'word_unknown', srsWord:word('坚持') },
        { id:'lesson9-day1-vocab-fangqi', type:'multipleChoice', lessonId:'lesson-9', day:1, skill:'vocabulary', subskill:'context', title:'语境 · 放弃', prompt:'虽然失败了，但是他没有___自己的理想。', options:['放弃','通过','赢','总结'], answer:'放弃', estimatedSeconds:80, priority:'standard', errorType:'word_unknown', srsWord:word('放弃') },
        { id:'lesson9-day1-vocab-jieguo', type:'multipleChoice', lessonId:'lesson-9', day:1, skill:'vocabulary', subskill:'collocation', title:'搭配 · 结果', prompt:'选择最自然的搭配。', options:['看重结果','结果汗','理想通过','勇敢区别'], answer:'看重结果', estimatedSeconds:80, priority:'standard', errorType:'word_unknown', srsWord:word('结果') },
        { id:'lesson9-day1-vocab-mian-dui', type:'multipleChoice', lessonId:'lesson-9', day:1, skill:'vocabulary', subskill:'recall', title:'回忆 · Как сказать?', prompt:'смело встретить трудности', options:['勇敢地面对困难','随便地总结困难','轻松地放弃困难','正确地暂时困难'], answer:'勇敢地面对困难', answerPinyin:'yǒnggǎn de miànduì kùnnan', answerTranslation:'смело встретить трудности', estimatedSeconds:80, priority:'standard', errorType:'word_unknown', srsWord:word('面对') },
        {
          id:'lesson9-day1-listen-text2', type:'ttsChoice', lessonId:'lesson-9', day:1, skill:'listening', subskill:'textbook-main-idea', title:'课文2 · 赢不是随便得到的', translation:'Почему победа в теннисе не бывает случайной?', instruction:'Слушай оригинальную запись без текста.', audio:'/audio/lesson9/sb/09-2.mp3', sourceLabel:'Standard Course 4A · Lesson 9 · 09-2', ttsText:lesson9Texts.text2,
          prompt:'张远为什么网球打得那么好？', options:['因为他长期坚持练习，从来没有真正休息过','因为每次比赛都很轻松','因为他只在冬天练球','因为别人让他随便赢'], answer:'因为他长期坚持练习，从来没有真正休息过',
          revealTokens:[['不管','bùguǎn','неважно'],['春夏秋冬','chūn xià qiū dōng','весна, лето, осень или зима'],['，','',''],['我','wǒ','я'],['练球','liànqiú','тренируюсь'],['从来','cónglái','никогда'],['没有','méiyǒu','не'],['休息过','xiūxiguo','делал перерыв'],['一天','yì tiān','ни дня']], estimatedSeconds:270, priority:'standard', errorType:'listening_memory',
        },
        { type:'readingChoice', lessonId:'lesson-9', day:1, skill:'reading', subskill:'exam-transfer', title:'强化 · H41002 第79题', ...lesson9HskReading[0], id:'lesson9-day1-h41002-79', estimatedSeconds:240, priority:'intensive', examMode:true, errorType:'reading_inference' },
        { type:'readingChoice', lessonId:'lesson-9', day:1, skill:'reading', subskill:'workbook', title:'强化 · 阅读 35', ...lesson9Reading[0], id:'lesson9-day1-reading-35', estimatedSeconds:180, priority:'intensive', examMode:true, errorType:'reading_inference' },
        { id:'lesson9-day1-wb-extra', type:'audioBank', lessonId:'lesson-9', day:1, skill:'listening', subskill:'workbook-source', title:'强化听力 · 练习册原版 09-2', translation:'Дополнительное оригинальное аудирование', description:'Короткие диалоги Workbook без текста. Автоматический балл не ставится без сверенных ключей.', tracks:[{id:'wb09-2-intensive',label:'09-2 · 第6–12题',description:'短对话 · короткие диалоги',audio:'/audio/lesson9/wb/09-2.mp3'}], estimatedSeconds:420, priority:'intensive', track:false },
      ],
    },
    {
      day: 2,
      title: '语法 · 理想 · 过程比结果重要',
      translation: 'Грамматика · мечта · почему процесс тоже важен',
      focus: 'Отработать пять грамматических тем и научиться рассуждать о выборе, результате и опыте после неудачи.',
      activities: [
        { id:'lesson9-day2-review', type:'moduleLink', lessonId:'lesson-9', day:2, skill:'review', subskill:'review-errors', title:'今日复习', translation:'Повторение слов и ошибок', route:'/review', estimatedSeconds:300, priority:'core', track:false, description:'Сначала верни вчерашние слабые слова и ошибки.' },
        {
          id:'lesson9-day2-listen-text3', type:'ttsChoice', lessonId:'lesson-9', day:2, skill:'listening', subskill:'textbook-main-idea', title:'课文3 · 为理想做选择', translation:'Почему Ван Хун отказалась от работы юриста?', instruction:'Слушай оригинальную запись без текста.', audio:'/audio/lesson9/sb/09-3.mp3', sourceLabel:'Standard Course 4A · Lesson 9 · 09-3', ttsText:lesson9Texts.text3,
          prompt:'王红为什么后来成为了作家？', options:['她放弃律师工作，坚持自己的选择并专心写小说','她父母让她必须写小说','她从来没有做过律师','她随便写了一篇文章就成功了'], answer:'她放弃律师工作，坚持自己的选择并专心写小说',
          revealTokens:[['她','tā','она'],['毕业后','bìyè hòu','после выпуска'],['放弃了','fàngqì le','отказалась от'],['律师','lǜshī','юриста'],['的','de','определительная частица'],['工作','gōngzuò','работы'],['，','',''],['开始','kāishǐ','начала'],['专门','zhuānmén','специально'],['写','xiě','писать'],['小说','xiǎoshuō','романы']], estimatedSeconds:300, priority:'core', errorType:'listening_memory',
        },
        {
          id:'lesson9-day2-picture-h81416-11', type:'speechPrompt', lessonId:'lesson-9', day:2, skill:'speaking', subskill:'picture', title:'看图说话 · H81416 第11题', translation:'HSKK · настоящая экзаменационная картинка', instruction:'Говори 20–40 секунд. Опиши людей, событие и настроение, затем предположи, что им пришлось сделать, чтобы дойти до этого момента.', image:'/assets/lesson9/h81416-picture-11.png', imageAlt:'HSKK H81416 №11', minSeconds:18, minCharacters:24, minCategories:3,
          categories:[{id:'people',label:'кто изображён',keywords:['学生','年轻人','同学','他们','三个人']},{id:'event',label:'событие',keywords:['毕业','大学','照片','庆祝','毕业帽']},{id:'mood',label:'настроение',keywords:['高兴','开心','激动','笑','轻松']},{id:'effort',label:'путь к результату',keywords:['努力','坚持','学习','考试','经历','成功']}],
          supportWords:[{hanzi:'毕业',pinyin:'bìyè',translation:'окончить учебное заведение'},{hanzi:'经历',pinyin:'jīnglì',translation:'пройти через; опыт'},{hanzi:'坚持',pinyin:'jiānchí',translation:'настойчиво продолжать'},{hanzi:'成功',pinyin:'chénggōng',translation:'успех'}], estimatedSeconds:420, priority:'core', errorType:'picture_no_structure',
        },
        { id:'lesson9-day2-speaking-process', type:'speechPrompt', lessonId:'lesson-9', day:2, skill:'speaking', subskill:'question', title:'短回答 · 过程还是结果', translation:'Что важнее: процесс или результат?', instruction:'Говори 15–25 секунд: выбери позицию → объясни → приведи один пример.', prompt:'做一件事情时，你觉得过程和结果哪个更重要？', promptPinyin:'zuò yí jiàn shìqing shí, nǐ juéde guòchéng hé jiéguǒ nǎge gèng zhòngyào?', promptTranslation:'Когда делаешь что-то, что для тебя важнее: процесс или результат?', minSeconds:12, minCharacters:18, minCategories:2, categories:[{id:'position',label:'позиция',keywords:['过程','结果','更重要','都重要']},{id:'reason',label:'причина',keywords:['因为','经验','学习','进步','成功']},{id:'example',label:'пример',keywords:['比如','考试','工作','比赛','学习']}], supportWords:[{hanzi:'过程',pinyin:'guòchéng',translation:'процесс'},{hanzi:'结果',pinyin:'jiéguǒ',translation:'результат'},{hanzi:'总结',pinyin:'zǒngjié',translation:'подводить итог'}], estimatedSeconds:180, priority:'core', errorType:'speaking_pause' },
        { id:'lesson9-day2-grammar-guide', type:'grammarGuide', lessonId:'lesson-9', day:2, skill:'grammar', subskill:'guide', title:'语法 · 5个重点', translation:'Пять грамматических тем урока 9', items:lesson9Grammar, estimatedSeconds:330, priority:'standard', track:false },
        { id:'lesson9-day2-grammar-nandao', type:'multipleChoice', lessonId:'lesson-9', day:2, skill:'grammar', subskill:'难道', title:'难道', prompt:'你已经准备了这么久，___现在要放弃吗？', options:['难道','通过','结果','至少'], answer:'难道', explanation:'难道 усиливает риторический вопрос.', estimatedSeconds:95, priority:'standard', errorType:'grammar' },
        { id:'lesson9-day2-grammar-tongguo', type:'multipleChoice', lessonId:'lesson-9', day:2, skill:'grammar', subskill:'通过', title:'通过', prompt:'他___每天练习，终于提高了网球水平。', options:['通过','可是','难道','结果'], answer:'通过', explanation:'通过 + способ/средство = посредством чего достигнут результат.', estimatedSeconds:95, priority:'standard', errorType:'grammar' },
        { id:'lesson9-day2-grammar-keshi', type:'multipleChoice', lessonId:'lesson-9', day:2, skill:'grammar', subskill:'可是', title:'可是', prompt:'她父母当时不支持她，___她还是坚持自己的选择。', options:['可是','通过','结果','上'], answer:'可是', explanation:'可是 вводит противопоставление.', estimatedSeconds:95, priority:'standard', errorType:'grammar' },
        { id:'lesson9-day2-grammar-jieguo', type:'multipleChoice', lessonId:'lesson-9', day:2, skill:'grammar', subskill:'结果', title:'结果', prompt:'他每天都坚持练习，___这次比赛真的赢了。', options:['结果','难道','至少','可是'], answer:'结果', explanation:'结果 сообщает итог предыдущей ситуации.', estimatedSeconds:95, priority:'standard', errorType:'grammar' },
        { id:'lesson9-day2-grammar-shang', type:'multipleChoice', lessonId:'lesson-9', day:2, skill:'grammar', subskill:'上', title:'上', prompt:'爱迪生为了找到合适的材料，试验了___千种。', options:['上','通过','结果','可是'], answer:'上', explanation:'上 + количество: 上千种 = более тысячи видов.', estimatedSeconds:95, priority:'standard', errorType:'grammar' },
        {
          id:'lesson9-day2-listen-text4', type:'ttsChoice', lessonId:'lesson-9', day:2, skill:'listening', subskill:'textbook-main-idea', title:'课文4 · 过程和结果', translation:'Почему не стоит думать только о результате?', instruction:'Слушай оригинальную запись и выбери главную мысль.', audio:'/audio/lesson9/sb/09-4.mp3', sourceLabel:'Standard Course 4A · Lesson 9 · 09-4', ttsText:lesson9Texts.text4,
          prompt:'课文认为做事情时应该把注意力放在哪里？', options:['放在做事情的过程中，从过程中发现快乐并总结经验','只看最后是不是成功','尽量避免所有失败','先考虑别人会怎么看结果'], answer:'放在做事情的过程中，从过程中发现快乐并总结经验', revealTokens:[['我们','wǒmen','мы'],['应该','yīnggāi','должны'],['把','bǎ','конструкция 把'],['注意力','zhùyìlì','внимание'],['放在','fàng zài','направить на'],['做事情','zuò shìqing','выполнение дела'],['的','de','определительная частица'],['过程','guòchéng','процесс'],['上','shang','на']], estimatedSeconds:250, priority:'standard', errorType:'listening_memory',
        },
        { type:'readingChoice', lessonId:'lesson-9', day:2, skill:'reading', subskill:'workbook', title:'阅读 · 36', ...lesson9Reading[1], id:'lesson9-day2-reading-36', estimatedSeconds:180, priority:'standard', examMode:true, errorType:'reading_inference' },
        { type:'readingChoice', lessonId:'lesson-9', day:2, skill:'reading', subskill:'workbook', title:'阅读 · 37', ...lesson9Reading[2], id:'lesson9-day2-reading-37', estimatedSeconds:180, priority:'standard', examMode:true, errorType:'reading_inference' },
        { type:'readingChoice', lessonId:'lesson-9', day:2, skill:'reading', subskill:'exam-transfer', title:'强化 · H41005 第47题', ...lesson9HskReading[2], id:'lesson9-day2-h41005-47', estimatedSeconds:180, priority:'intensive', examMode:true, errorType:'grammar' },
        { type:'readingChoice', lessonId:'lesson-9', day:2, skill:'reading', subskill:'workbook', title:'强化 · 阅读 42', ...lesson9Reading[7], id:'lesson9-day2-reading-42', estimatedSeconds:180, priority:'intensive', examMode:true, errorType:'reading_inference' },
        { type:'readingChoice', lessonId:'lesson-9', day:2, skill:'reading', subskill:'workbook', title:'强化 · 阅读 43', ...lesson9Reading[8], id:'lesson9-day2-reading-43', estimatedSeconds:180, priority:'intensive', examMode:true, errorType:'reading_inference' },
        { id:'lesson9-day2-wb-extra', type:'audioBank', lessonId:'lesson-9', day:2, skill:'listening', subskill:'workbook-source', title:'强化听力 · 练习册原版 09-3', translation:'Дополнительное оригинальное аудирование', description:'Более длинный блок Workbook без текста.', tracks:[{id:'wb09-3-intensive',label:'09-3 · 第13–22题',description:'对话与短文 · диалоги и более длинные задания',audio:'/audio/lesson9/wb/09-3.mp3'}], estimatedSeconds:300, priority:'intensive', track:false },
      ],
    },
    {
      day: 3,
      title: '写作 · 面对失败 · 阳光总在风雨后',
      translation: 'Письмо · как относиться к неудаче · после бури снова солнце',
      focus: 'Перенести лексику успеха и неудачи в письмо и связную речь и закрепить экзаменационный навык рассуждения.',
      activities: [
        { id:'lesson9-day3-review', type:'moduleLink', lessonId:'lesson-9', day:3, skill:'review', subskill:'review-errors', title:'今日复习', translation:'Повторение слов и ошибок', route:'/review', estimatedSeconds:300, priority:'core', track:false, description:'Перед письмом и устной частью верни слабые слова и ошибки.' },
        {
          id:'lesson9-day3-listen-text5', type:'ttsChoice', lessonId:'lesson-9', day:3, skill:'listening', subskill:'main-idea', title:'课文5 · 阳光总在风雨后', translation:'Чем успешные люди отличаются в отношении к трудностям?', instruction:'Слушай оригинальную запись без текста.', audio:'/audio/lesson9/sb/09-5.mp3', sourceLabel:'Standard Course 4A · Lesson 9 · 09-5', ttsText:lesson9Texts.text5,
          prompt:'课文认为取得成功的人和普通人的主要区别是什么？', options:['成功的人遇到困难会想办法解决并坚持下去','成功的人从来没有失败过','成功的人天生运气更好','成功的人不会遇到困难'], answer:'成功的人遇到困难会想办法解决并坚持下去', revealTokens:[['取得成功','qǔdé chénggōng','добиться успеха'],['的','de','определительная частица'],['人','rén','люди'],['往往','wǎngwǎng','часто'],['都','dōu','все'],['经历过','jīnglìguo','проходили через'],['许多','xǔduō','много'],['失败','shībài','неудач']], estimatedSeconds:300, priority:'core', errorType:'listening_memory',
        },
        {
          id:'lesson9-day3-speaking-h81002-q14', type:'speechPrompt', lessonId:'lesson-9', day:3, skill:'speaking', subskill:'question', title:'回答问题 · H81002 第14题', translation:'HSKK · настоящий экзаменационный вопрос', instruction:'Говори 30–45 секунд: объясни смысл → согласись или поспорь → приведи пример.', prompt:'有人说“办法总比问题多”，你怎么看这句话？', promptPinyin:'yǒurén shuō “bànfǎ zǒng bǐ wèntí duō”, nǐ zěnme kàn zhè jù huà?', promptTranslation:'Есть выражение: «Способов решения всегда больше, чем проблем». Что ты об этом думаешь?', minSeconds:24, minCharacters:30, minCategories:3,
          categories:[{id:'opinion',label:'позиция',keywords:['同意','不同意','觉得','认为','有道理']},{id:'difficulty',label:'проблема',keywords:['问题','困难','失败','压力','遇到']},{id:'solution',label:'решение',keywords:['办法','解决','面对','坚持','改变']},{id:'example',label:'пример',keywords:['比如','例如','工作','学习','考试','生活']}], supportWords:[{hanzi:'面对',pinyin:'miànduì',translation:'сталкиваться лицом к лицу'},{hanzi:'困难',pinyin:'kùnnan',translation:'трудность'},{hanzi:'解决',pinyin:'jiějué',translation:'решать'},{hanzi:'坚持',pinyin:'jiānchí',translation:'не сдаваться'}], estimatedSeconds:420, priority:'core', errorType:'speaking_pause',
        },
        { id:'lesson9-day3-speaking-failure', type:'speechPrompt', lessonId:'lesson-9', day:3, skill:'speaking', subskill:'question', title:'短回答 · 失败能教会我们什么', translation:'Чему может научить неудача?', instruction:'Говори 15–25 секунд: назови одну пользу неудачи и один следующий шаг.', prompt:'你觉得失败能给人带来什么有用的经验？', promptPinyin:'nǐ juéde shībài néng gěi rén dàilái shénme yǒuyòng de jīngyàn?', promptTranslation:'Какой полезный опыт, по-твоему, может дать человеку неудача?', minSeconds:12, minCharacters:18, minCategories:2, categories:[{id:'lesson',label:'чему учит',keywords:['经验','问题','错误','发现','总结']},{id:'next',label:'следующий шаг',keywords:['提高','改变','继续','坚持','准备']},{id:'result',label:'будущий результат',keywords:['成功','进步','结果','以后']}], supportWords:[{hanzi:'失败',pinyin:'shībài',translation:'неудача'},{hanzi:'经验',pinyin:'jīngyàn',translation:'опыт'},{hanzi:'总结',pinyin:'zǒngjié',translation:'подводить итоги'}], estimatedSeconds:180, priority:'core', errorType:'speaking_pause' },
        ...lesson9WritingOrder.map((item) => orderActivity(item)),
        { id:'lesson9-day3-writing-49', type:'freeWriting', lessonId:'lesson-9', day:3, skill:'writing', subskill:'picture', title:'看图写句子 · 49', translation:'Напиши предложение по картинке', image:'/assets/lesson9/wb-writing-49.png', imageAlt:'Workbook Lesson 9 №49', prompt:'用“汗”写一个句子。', requiredKeyword:'汗', minCharacters:8, referenceTokens:[['他','tā','он'],['运动','yùndòng','занимался спортом'],['以后','yǐhòu','после'],['出了','chū le','выступило'],['很多','hěn duō','много'],['汗','hàn','пота']], estimatedSeconds:240, priority:'standard' },
        { id:'lesson9-day3-writing-50', type:'freeWriting', lessonId:'lesson-9', day:3, skill:'writing', subskill:'picture', title:'看图写句子 · 50', translation:'Напиши предложение по картинке', image:'/assets/lesson9/wb-writing-50.png', imageAlt:'Workbook Lesson 9 №50', prompt:'用“主意”写一个句子。', requiredKeyword:'主意', minCharacters:8, referenceTokens:[['她','tā','она'],['在','zài','за'],['电脑前','diànnǎo qián','компьютером'],['想','xiǎng','придумывает'],['一个','yí ge','одну'],['好主意','hǎo zhǔyi','хорошую идею']], estimatedSeconds:240, priority:'standard' },
        { type:'readingChoice', lessonId:'lesson-9', day:3, skill:'reading', subskill:'workbook', title:'阅读 · 38', ...lesson9Reading[3], id:'lesson9-day3-reading-38', estimatedSeconds:180, priority:'standard', examMode:true, errorType:'reading_inference' },
        { type:'readingChoice', lessonId:'lesson-9', day:3, skill:'reading', subskill:'workbook', title:'阅读 · 39', ...lesson9Reading[4], id:'lesson9-day3-reading-39', estimatedSeconds:180, priority:'standard', examMode:true, errorType:'reading_inference' },
        { id:'lesson9-wb-audio-bank', type:'audioBank', lessonId:'lesson-9', day:3, skill:'listening', subskill:'workbook-source', title:'练习册听力 · 原版音频', translation:'Оригинальное аудио рабочей тетради · Lesson 9', description:'Все три исходных аудиоблока Workbook доступны для дополнительной тренировки.', tracks:[{id:'wb09-1',label:'09-1 · 第1–5题',description:'判断对错 · верно / неверно',audio:'/audio/lesson9/wb/09-1.mp3'},{id:'wb09-2',label:'09-2 · 第6–12题',description:'短对话 · короткие диалоги',audio:'/audio/lesson9/wb/09-2.mp3'},{id:'wb09-3',label:'09-3 · 第13–22题',description:'对话与短文 · длинные задания',audio:'/audio/lesson9/wb/09-3.mp3'}], estimatedSeconds:0, priority:'standard', track:false },
        { type:'readingChoice', lessonId:'lesson-9', day:3, skill:'reading', subskill:'exam-transfer', title:'强化 · H41005 第70题', ...lesson9HskReading[1], id:'lesson9-day3-h41005-70', estimatedSeconds:240, priority:'intensive', examMode:true, errorType:'reading_inference' },
        { type:'readingChoice', lessonId:'lesson-9', day:3, skill:'reading', subskill:'workbook', title:'强化 · 阅读 40', ...lesson9Reading[5], id:'lesson9-day3-reading-40', estimatedSeconds:180, priority:'intensive', examMode:true, errorType:'reading_inference' },
        { type:'readingChoice', lessonId:'lesson-9', day:3, skill:'reading', subskill:'workbook', title:'强化 · 阅读 41', ...lesson9Reading[6], id:'lesson9-day3-reading-41', estimatedSeconds:180, priority:'intensive', examMode:true, errorType:'reading_inference' },
        { id:'lesson9-day3-wb-extra', type:'audioBank', lessonId:'lesson-9', day:3, skill:'listening', subskill:'workbook-source', title:'强化听力 · 练习册原版 09-1', translation:'Дополнительное оригинальное аудирование', description:'Дополнительный блок 判断对错 для быстрого понимания речи.', tracks:[{id:'wb09-1-intensive',label:'09-1 · 第1–5题',description:'判断对错 · верно / неверно',audio:'/audio/lesson9/wb/09-1.mp3'}], estimatedSeconds:360, priority:'intensive', track:false },
      ],
    },
  ],
}

export default lesson9DailyPlan
