const LEGACY_MAX_LESSON = 11

const REPEAT_POOL = [
  ['/audio/hskk/bank/h81311-repeat-01.mp3','问题终于解决了。','wèntí zhōngyú jiějué le','Проблема наконец решена.'],
  ['/audio/hskk/bank/h81311-repeat-02.mp3','新搬来的邻居很热情。','xīn bān lái de línjū hěn rèqíng','Новый сосед очень приветливый.'],
  ['/audio/hskk/bank/h81311-repeat-03.mp3','王经理在开会呢。','Wáng jīnglǐ zài kāihuì ne','Менеджер Ван сейчас на совещании.'],
  ['/audio/hskk/bank/h81311-repeat-05.mp3','还有几位客人没到，再等等。','hái yǒu jǐ wèi kèrén méi dào, zài děng deng','Ещё несколько гостей не пришли, подождём ещё.'],
  ['/audio/hskk/bank/h81311-repeat-07.mp3','谢谢大家对我们工作的支持。','xièxie dàjiā duì wǒmen gōngzuò de zhīchí','Спасибо всем за поддержку нашей работы.'],
  ['/audio/hskk/bank/h81311-repeat-08.mp3','他中文说得非常流利。','tā Zhōngwén shuō de fēicháng liúlì','Он очень бегло говорит по-китайски.'],
  ['/audio/hskk/bank/h81311-repeat-09.mp3','打折是商场吸引顾客的方法之一。','dǎzhé shì shāngchǎng xīyǐn gùkè de fāngfǎ zhī yī','Скидки — один из способов привлечь покупателей.'],
  ['/audio/hskk/bank/h81311-repeat-10.mp3','这次活动将推迟到下周举行。','zhè cì huódòng jiāng tuīchí dào xià zhōu jǔxíng','Мероприятие перенесут на следующую неделю.'],
  ['/audio/hskk/bank/h81416-repeat-01.mp3','这附近有家超市。','zhè fùjìn yǒu jiā chāoshì','Поблизости есть супермаркет.'],
  ['/audio/hskk/bank/h81416-repeat-02.mp3','他向经理请假了。','tā xiàng jīnglǐ qǐngjià le','Он отпросился у менеджера.'],
  ['/audio/hskk/bank/h81416-repeat-04.mp3','图书馆的电梯坏了。','túshūguǎn de diàntī huài le','Лифт в библиотеке сломался.'],
  ['/audio/hskk/bank/h81416-repeat-05.mp3','很多年轻人参加了这次比赛。','hěn duō niánqīng rén cānjiā le zhè cì bǐsài','Много молодых людей участвовали в соревновании.'],
  ['/audio/hskk/bank/h81416-repeat-06.mp3','我已经把材料翻译好了。','wǒ yǐjīng bǎ cáiliào fānyì hǎo le','Я уже закончил перевод материалов.'],
  ['/audio/hskk/bank/h81416-repeat-07.mp3','对不起，这里不允许抽烟。','duìbuqǐ, zhèlǐ bù yǔnxǔ chōuyān','Извините, здесь курить запрещено.'],
  ['/audio/hskk/bank/h81416-repeat-08.mp3','李教授说话很幽默。','Lǐ jiàoshòu shuōhuà hěn yōumò','Профессор Ли говорит очень остроумно.'],
  ['/audio/hskk/bank/h81416-repeat-09.mp3','那儿的景色美极了！','nàr de jǐngsè měi jí le','Пейзаж там невероятно красивый!'],
  ['/audio/hskk/bank/h81416-repeat-10.mp3','你最好先跟你父母商量商量。','nǐ zuìhǎo xiān gēn nǐ fùmǔ shāngliang shāngliang','Тебе лучше сначала посоветоваться с родителями.'],
]

const SPEAKING_QUESTIONS = {
  1:['你觉得两个人怎样才能生活得幸福？','你更看重爱情还是共同的性格？为什么？','请说一说你理想中的伴侣。'],
  2:['你觉得真正的朋友应该是什么样的人？','朋友遇到困难时，你会怎么帮助他？','请介绍一个对你很重要的朋友。'],
  3:['你觉得找工作时什么最重要？','请介绍一下你理想的工作。','第一次见面时，怎样给别人留下好印象？'],
  4:['对你来说，成功意味着什么？','兴趣和收入，找工作时你更看重哪一个？','请说一说你的一个长期目标。'],
  5:['你平时喜欢网上购物还是去商店？为什么？','买东西时你最重视什么？','请说一说一次不太成功的购物经历。'],
  6:['价格和质量哪个更重要？为什么？','你愿意为更好的质量多花钱吗？','怎样判断一个东西值不值得买？'],
  7:['你平时怎样保持健康？','你觉得运动重要吗？为什么？','如果朋友总是熬夜，你会给他什么建议？'],
  8:['你觉得什么让生活变得更美？','请介绍一个给你留下深刻印象的地方。','外表和性格，你觉得哪个更重要？'],
  9:['遇到困难时你一般怎么办？','请说一说一次你没有放弃的经历。','你觉得失败能给人带来什么？'],
  10:['对你来说，幸福是什么？','什么事情最容易让你感到幸福？','金钱和幸福有什么关系？'],
  11:['你喜欢读什么样的书？为什么？','你觉得读书有什么好处？','纸质书和电子书，你更喜欢哪一种？'],
}

const DISTRACTORS = ['冰箱','护照','足球','下雪','药店','机场','熊猫','电脑密码']
const PUNCT = new Set(['，','。','、','；','：','！','？',',','.',';','!','?'])

function lessonNumberFromDay(day) {
  const id = day?.activities?.find((item)=>item?.lessonId)?.lessonId || ''
  const match = id.match(/lesson-(\d+)/)
  return match ? Number(match[1]) : null
}

function meaningfulTokens(tokens=[]) {
  return tokens.filter((item)=>item?.[0] && !PUNCT.has(item[0]) && item[0].trim().length > 0)
}

function inferListeningCategory(activity) {
  const sub = String(activity.subskill || '')
  if (/time/.test(sub)) return '时间'
  if (/place|location/.test(sub)) return '地点'
  if (/reason|cause/.test(sub)) return '原因'
  if (/attitude/.test(sub)) return '态度'
  if (/plan|intention/.test(sub)) return '计划'
  if (/result/.test(sub)) return '结果'
  if (/infer/.test(sub)) return '推断'
  if (/detail/.test(sub)) return '细节'
  if (/main|idea|gist/.test(sub)) return '主要意思'
  return '课文理解'
}

function buildLadder(activity, lessonNumber, dayNumber) {
  const tokens = meaningfulTokens(activity.revealTokens || [])
  if (!activity.audio || !activity.prompt || !activity.options?.length || !activity.answer || tokens.length < 2) return activity

  const keyTokens = tokens.slice(0, Math.min(4, tokens.length))
  const transcriptText = tokens.map((item)=>item[0]).join('')
  const distractor = DISTRACTORS.find((item)=>!transcriptText.includes(item)) || '护照'
  const dictationToken = tokens[Math.min(tokens.length - 1, Math.max(1, Math.floor(tokens.length / 2)))]
  const dictationPrompt = tokens.map((item)=>item === dictationToken ? '___' : item[0]).join('')

  return {
    ...activity,
    id: `${activity.id}-ladder-v2`,
    type: 'listeningLadder',
    title: activity.title?.includes('听力阶梯') ? activity.title : `听力阶梯 · ${activity.title || `课文`}`,
    translation: activity.translation ? `Лестница аудирования · ${activity.translation}` : 'Лестница аудирования',
    instruction: undefined,
    listeningCategory: activity.listeningCategory || inferListeningCategory(activity),
    heardItems: [
      ...keyTokens.map((item,index)=>({id:`k${index+1}`,label:item[0],correct:true})),
      {id:'d1',label:distractor,correct:false},
    ],
    dictationPrompt,
    dictationAnswer: dictationToken[0],
    trapExplanation: activity.explanation || 'Сверь ответ с ключевым фрагментом записи: не выбирай вариант только потому, что услышал знакомое слово.',
    estimatedSeconds: Math.max(360, Number(activity.estimatedSeconds)||0),
    priority: 'core',
    errorType: activity.errorType || 'listening_memory',
    alignmentSource: `lesson-${lessonNumber}-day-${dayNumber}`,
  }
}

function supplementRepeats(activities, lessonNumber, dayNumber) {
  const existing = activities.filter((a)=>a.type==='speechRepeat')
  const linkedRepeat = activities.some((a)=>a.type==='moduleLink' && a.skill==='speaking' && a.subskill==='repeat')
  const needed = linkedRepeat ? 0 : Math.max(0,3-existing.length)
  if (!needed) return activities
  const usedAudio = new Set(existing.map((a)=>a.audio).filter(Boolean))
  const start = ((lessonNumber-1)*9 + (dayNumber-1)*3) % REPEAT_POOL.length
  const chosen=[]
  for (let offset=0; chosen.length<needed && offset<REPEAT_POOL.length*2; offset+=1) {
    const item=REPEAT_POOL[(start+offset)%REPEAT_POOL.length]
    if (!usedAudio.has(item[0])) { chosen.push(item); usedAudio.add(item[0]) }
  }
  const supplements = chosen.map((item,index)=>({
    id:`alignment-l${lessonNumber}-d${dayNumber}-repeat-${index+1}`,
    type:'speechRepeat', lessonId:`lesson-${lessonNumber}`, day:dayNumber,
    skill:'speaking', subskill:'repeat', title:'听后重复 · 日常训练', translation:'HSKK · повтор после прослушивания',
    instruction:'Прослушай один раз и повтори как можно точнее. После записи сравни результат с исходной фразой.',
    audio:item[0], target:item[1], targetPinyin:item[2], targetTranslation:item[3], passPercent:72,
    estimatedSeconds:60, priority:'core', errorType:'speaking_pause', alignmentSupplement:true,
  }))
  const insertAfter = Math.max(-1, activities.findIndex((a)=>a.skill==='listening'))
  const next=[...activities]
  next.splice(insertAfter+1,0,...supplements)
  return next
}

function supplementSpeaking(activities, lessonNumber, dayNumber) {
  const already = activities.some((a)=>a.type==='speechPrompt' || (a.type==='moduleLink' && a.skill==='speaking' && ['picture','question'].includes(a.subskill)))
  if (already) return activities
  const prompt = SPEAKING_QUESTIONS[lessonNumber]?.[dayNumber-1]
  if (!prompt) return activities
  return [...activities, {
    id:`alignment-l${lessonNumber}-d${dayNumber}-prompt`, type:'speechPrompt', lessonId:`lesson-${lessonNumber}`, day:dayNumber,
    skill:'speaking', subskill:'question', title:'回答问题 · 今日口语', translation:'Короткий тематический ответ',
    instruction:'Говори 25–40 секунд: позиция → причина → короткий пример → вывод.',
    prompt, promptTranslation:'Ответь по теме урока своими словами.', minSeconds:20, minCharacters:18,
    categories:[
      {id:'position',label:'позиция',keywords:['我觉得','我认为','对我来说']},
      {id:'reason',label:'причина',keywords:['因为','原因','所以']},
      {id:'example',label:'пример',keywords:['比如','例如','有一次']},
      {id:'ending',label:'вывод',keywords:['所以','总的来说','对我来说']},
    ], minCategories:2, estimatedSeconds:120, priority:'core', errorType:'speaking_pause', alignmentSupplement:true,
  }]
}

function addRescueKit(activities, lessonNumber, dayNumber) {
  if (dayNumber !== 3) return activities
  if (activities.some((a)=>a.id===`alignment-l${lessonNumber}-rescue-kit`)) return activities
  return [...activities, {
    id:`alignment-l${lessonNumber}-rescue-kit`, type:'speechPrompt', lessonId:`lesson-${lessonNumber}`, day:dayNumber,
    skill:'speaking', subskill:'rescue-strategy', title:'口语救援 · 忘了词怎么办', translation:'HSKK · что делать, если забыл слово',
    instruction:'Объясни мысль, не останавливаясь. Используй хотя бы одну компенсационную конструкцию.',
    prompt:'如果你突然忘了一个词，你会怎么继续说？请用别的办法解释。', promptTranslation:'Если забыл слово — продолжи и объясни его другими словами.',
    supportWords:[
      {hanzi:'我不知道这个东西怎么说，但是……',pinyin:'wǒ bù zhīdào zhège dōngxi zěnme shuō, dànshì…',translation:'Я не знаю, как это сказать, но…'},
      {hanzi:'它是一种……',pinyin:'tā shì yì zhǒng…',translation:'Это разновидность…'},
      {hanzi:'它是用来……的',pinyin:'tā shì yònglái…de',translation:'Это используется для…'},
      {hanzi:'跟……差不多',pinyin:'gēn…chàbuduō',translation:'примерно как…'},
      {hanzi:'换句话说……',pinyin:'huàn jù huà shuō…',translation:'другими словами…'},
    ],
    categories:[
      {id:'comp',label:'компенсационная фраза',keywords:['不知道','一种','用来','差不多','换句话说']},
      {id:'continue',label:'продолжение мысли',keywords:['但是','就是','所以','比如']},
    ], minCategories:1, minSeconds:15, minCharacters:15, estimatedSeconds:180, priority:'intensive', errorType:'speaking_pause', alignmentSupplement:true,
  }]
}

function buildLesson1Ladder(activity, dayNumber) {
  if (!activity?.audio || !activity?.prompt || !activity?.options?.length) return activity
  if (dayNumber === 2) {
    return { ...activity, id:`${activity.id}-ladder-v2`, type:'listeningLadder', title:'听力阶梯 · 课文4', translation:'Лестница аудирования · главная мысль', listeningCategory:'主要意思',
      heardItems:[{id:'simple',label:'简单',correct:true},{id:'happy',label:'幸福',correct:true},{id:'sometimes',label:'有时候',correct:true},{id:'gift',label:'礼物',correct:false}],
      dictationPrompt:'有时候，___就是最大的幸福。', dictationAnswer:'简单', revealTokens:[['有时候','yǒu shíhou','иногда'],['，','',''],['简单','jiǎndān','простота; простой'],['就是','jiù shì','как раз и есть'],['最大的','zuì dà de','самое большое'],['幸福','xìngfú','счастье'],['。','','']],
      trapExplanation:'В финале текста мысль сформулирована прямо: 有时候，简单就是最大的幸福。 Не выбирай знакомую деталь вместо итоговой идеи.', estimatedSeconds:360, priority:'core', errorType:'listening_main_idea' }
  }
  if (dayNumber === 3) {
    return { ...activity, id:`${activity.id}-ladder-v2`, type:'listeningLadder', title:'听力阶梯 · 课文5', translation:'Лестница аудирования · отношения и характер', listeningCategory:'主要意思',
      heardItems:[{id:'character',label:'性格',correct:true},{id:'attract',label:'互相吸引',correct:true},{id:'together',label:'共同生活',correct:true},{id:'job',label:'工作',correct:false}],
      dictationPrompt:'两个人共同生活，更需要性格上互相___。', dictationAnswer:'吸引', revealTokens:[['两个人','liǎng ge rén','два человека'],['共同生活','gòngtóng shēnghuó','жить вместе'],['，','',''],['更需要','gèng xūyào','ещё больше нуждаются'],['性格上','xìnggé shàng','по характеру'],['互相吸引','hùxiāng xīyǐn','взаимно привлекать друг друга']],
      trapExplanation:'Ключевая дополнительная мысль текста — не одинаковая работа и не подарки, а взаимное притяжение по характеру.', estimatedSeconds:360, priority:'core', errorType:'listening_keyword_trap' }
  }
  return activity
}

export function getAlignedLegacyActivities(day) {
  const lessonNumber = lessonNumberFromDay(day)
  if (!lessonNumber || lessonNumber > LEGACY_MAX_LESSON) return day?.activities || []
  const dayNumber = Number(day.day || 1)
  let activities=[...(day.activities||[])]

  const ladderIndex = activities.findIndex((a)=>['ttsChoice','audioChoice'].includes(a.type) && !a.examMode && a.audio && (a.revealTokens?.length || lessonNumber===1))
  if (ladderIndex >= 0) activities[ladderIndex] = lessonNumber===1 ? buildLesson1Ladder(activities[ladderIndex],dayNumber) : buildLadder(activities[ladderIndex],lessonNumber,dayNumber)

  activities = supplementRepeats(activities,lessonNumber,dayNumber)
  activities = supplementSpeaking(activities,lessonNumber,dayNumber)
  activities = addRescueKit(activities,lessonNumber,dayNumber)
  return activities
}

export default getAlignedLegacyActivities
