import ChineseText from './ChineseText.jsx'
import { vocabularyLesson1All } from '../data/vocabularyLesson1.js'
import { grammarLesson1 } from '../data/grammarLesson1.js'
import lesson2Data from '../data/lesson2Data.js'
import lesson3Data from '../data/lesson3Data.js'
import lesson4Data from '../data/lesson4Data.js'
import lesson5Data from '../data/lesson5Data.js'
import lesson6Data from '../data/lesson6Data.js'
import lesson7Data from '../data/lesson7Data.js'
import lesson8Data from '../data/lesson8Data.js'
import lesson9Data from '../data/lesson9Data.js'
import lesson10Data from '../data/lesson10Data.js'
import lesson11Data from '../data/lesson11Data.js'
import lesson12Data from '../data/lesson12Data.js'
import lesson13Data from '../data/lesson13Data.js'
import lesson14Data from '../data/lesson14Data.js'
import lesson15Data from '../data/lesson15Data.js'
import lesson16Data from '../data/lesson16Data.js'
import lesson17Data from '../data/lesson17Data.js'
import lesson18Data from '../data/lesson18Data.js'
import lesson19Data from '../data/lesson19Data.js'
import lesson20Data from '../data/lesson20Data.js'
import { chengyuData } from '../data/chengyuData.js'

const COMMON_TERMS = [
  ['今日复习', 'jīnrì fùxí', 'повторение на сегодня'],
  ['听力阶梯', 'tīnglì jiētī', 'лестница аудирования'],
  ['听力训练', 'tīnglì xùnliàn', 'тренировка аудирования'],
  ['听力热身', 'tīnglì rèshēn', 'разминка по аудированию'],
  ['听后重复', 'tīng hòu chóngfù', 'повторить после прослушивания'],
  ['看图说话', 'kàn tú shuōhuà', 'говорить по картинке'],
  ['观察', 'guānchá', 'наблюдать; рассматривать'],
  ['回答问题', 'huídá wèntí', 'ответить на вопрос'],
  ['短回答', 'duǎn huídá', 'короткий ответ'],
  ['说一说', 'shuō yì shuō', 'расскажи / выскажись'],
  ['词汇激活', 'cíhuì jīhuó', 'активация лексики'],
  ['词汇库', 'cíhuì kù', 'словарная база'],
  ['词语搭配', 'cíyǔ dāpèi', 'сочетаемость слов'],
  ['语法复习', 'yǔfǎ fùxí', 'повторение грамматики'],
  ['阅读训练', 'yuèdú xùnliàn', 'тренировка чтения'],
  ['写作练习', 'xiězuò liànxí', 'письменная тренировка'],
  ['句子排序', 'jùzi páixù', 'расставить части предложения по порядку'],
  ['题型训练', 'tíxíng xùnliàn', 'тренировка экзаменационных типов заданий'],
  ['看图写句子', 'kàn tú xiě jùzi', 'написать предложение по картинке'],
  ['练习册听力', 'liànxícè tīnglì', 'аудирование из рабочей тетради'],
  ['练习册原声', 'liànxícè yuánshēng', 'оригинальная запись рабочей тетради'],
  ['强化听力', 'qiánghuà tīnglì', 'усиленная тренировка аудирования'],
  ['原版音频', 'yuánbǎn yīnpín', 'оригинальное аудио'],
  ['课文运用', 'kèwén yùnyòng', 'применение материала текста'],
  ['主旨题', 'zhǔzhǐ tí', 'задание на главную мысль'],
  ['名量词重叠', 'míng-liàngcí chóngdié', 'повтор счётного слова'],
  ['字族', 'zìzú', 'семья слов / иероглифическая семья'],
  ['课文', 'kèwén', 'текст урока'],
  ['帮助别人', 'bāngzhù biérén', 'помогать другим'],
  ['真题', 'zhēntí', 'настоящее экзаменационное задание'],
  ['强化', 'qiánghuà', 'усиленная тренировка'],
  ['阅读', 'yuèdú', 'чтение'],
  ['写作', 'xiězuò', 'письмо'],
  ['听力', 'tīnglì', 'аудирование'],
  ['口语', 'kǒuyǔ', 'устная речь'],
  ['影子跟读', 'yǐngzi gēndú', 'shadowing / синхронное повторение'],
  ['步训练', 'bù xùnliàn', 'шаговая тренировка'],
  ['口语急救包', 'kǒuyǔ jíjiùbāo', 'набор компенсационных стратегий для устной речи'],
  ['忘了词也继续说', 'wàng le cí yě jìxù shuō', 'продолжай говорить, даже если забыл слово'],
  ['阶段检查', 'jiēduàn jiǎnchá', 'промежуточная контрольная точка'],
  ['应试技巧', 'yìngshì jìqiǎo', 'экзаменационные стратегии'],
  ['复习系统', 'fùxí xìtǒng', 'система повторения'],
  ['错题本', 'cuòtíběn', 'тетрадь ошибок'],
  ['词汇', 'cíhuì', 'лексика'],
  ['成语', 'chéngyǔ', 'идиома; чэнъюй'],
  ['情境复习', 'qíngjìng fùxí', 'контекстное повторение'],
  ['错题', 'cuòtí', 'ошибочные задания'],
  ['再练', 'zài liàn', 'потренироваться ещё раз'],
  ['明天再来', 'míngtiān zài lái', 'вернуться завтра'],
  ['记得', 'jìde', 'помнить'],
  ['成语训练', 'chéngyǔ xùnliàn', 'тренировка идиом'],
  ['中级', 'zhōngjí', 'средний уровень'],
  ['表达升级', 'biǎodá shēngjí', 'усиление активной речи'],
  ['成语加速器', 'chéngyǔ jiāsùqì', 'ускоритель активного владения 成语'],
  ['已掌握', 'yǐ zhǎngwò', 'освоено'],
  ['今日训练', 'jīnrì xùnliàn', 'тренировка на сегодня'],
  ['成语库', 'chéngyǔ kù', 'банк идиом'],
  ['实战', 'shízhàn', 'практика в реальном формате'],
  ['专项强化', 'zhuānxiàng qiánghuà', 'целевая усиленная тренировка'],
  ['自动使用', 'zìdòng shǐyòng', 'использовать автоматически'],
  ['必会', 'bì huì', 'обязательно уметь использовать'],
  ['救命成语', 'jiùmìng chéngyǔ', 'идиомы-спасатели для устной речи'],
  ['搜索', 'sōusuǒ', 'поиск'],
  ['学习中', 'xuéxí zhōng', 'в процессе изучения'],
  ['待学习', 'dài xuéxí', 'предстоит изучить'],
  ['典型语境', 'diǎnxíng yǔjìng', 'типичный контекст'],
  ['自然表达', 'zìrán biǎodá', 'естественное выражение'],
  ['不要这样说', 'bú yào zhèyàng shuō', 'так говорить не следует'],
  ['情境', 'qíngjìng', 'ситуация; контекст'],
  ['参考表达', 'cānkǎo biǎodá', 'пример ответа'],
  ['再说一次', 'zài shuō yí cì', 'сказать ещё раз'],
  ['三词故事', 'sān cí gùshi', 'история с тремя идиомами'],
  ['本周', 'běn zhōu', 'эта неделя'],
  ['看得懂', 'kàn de dǒng', 'понимаю прочитанное'],
  ['听得懂', 'tīng de dǒng', 'понимаю на слух'],
  ['会选择', 'huì xuǎnzé', 'умею выбирать по ситуации'],
  ['会造句', 'huì zàojù', 'умею составлять предложения'],
  ['会说', 'huì shuō', 'умею употреблять в речи'],
  ['把成语拼回来', 'bǎ chéngyǔ pīn huílái', 'собери идиому обратно'],
  ['学习基础', 'xuéxí jīchǔ', 'основы учёбы'],
  ['努力与成功', 'nǔlì yǔ chénggōng', 'усилия и успех'],
  ['观点与选择', 'guāndiǎn yǔ xuǎnzé', 'мнения и выбор'],
  ['反应与变化', 'fǎnyìng yǔ biànhuà', 'реакции и изменения'],
  ['注意与情绪', 'zhùyì yǔ qíngxù', 'внимание и эмоции'],
  ['动作与情况', 'dòngzuò yǔ qíngkuàng', 'действия и ситуации'],
  ['描写', 'miáoxiě', 'описание'],
  ['城市与生活', 'chéngshì yǔ shēnghuó', 'город и жизнь'],
  ['解决问题', 'jiějué wèntí', 'решение проблем'],
  ['人际与文化', 'rénjì yǔ wénhuà', 'отношения и культура'],
  ['语法', 'yǔfǎ', 'грамматика'],
  ['词义', 'cíyì', 'значение слова'],
  ['语境', 'yǔjìng', 'контекст'],
  ['搭配', 'dāpèi', 'сочетаемость'],
  ['回忆', 'huíyì', 'вспомнить / извлечь из памяти'],
  ['主题口语', 'zhǔtí kǒuyǔ', 'тематическая устная речь'],
  ['附加听力', 'fùjiā tīnglì', 'дополнительное аудирование'],
  ['京剧与文化体验', 'jīngjù yǔ wénhuà tǐyàn', 'пекинская опера и культурный опыт'],
  ['文化交流', 'wénhuà jiāoliú', 'культурное общение'],
  ['京剧演员', 'jīngjù yǎnyuán', 'актёры пекинской оперы'],
  ['茶文化', 'chá wénhuà', 'чайная культура'],
  ['周末安排', 'zhōumò ānpái', 'планы на выходные'],
  ['表演与感情', 'biǎoyǎn yǔ gǎnqíng', 'выступление и эмоции'],
  ['文化与语言学习', 'wénhuà yǔ yǔyán xuéxí', 'культура и изучение языка'],
  ['晚上看京剧', 'wǎnshang kàn jīngjù', 'вечером смотреть пекинскую оперу'],
  ['保护地球母亲', 'bǎohù dìqiú mǔqīn', 'защитим нашу мать-Землю'],
  ['从身边的小事做起', 'cóng shēnbiān de xiǎoshì zuòqǐ', 'начинать с мелочей вокруг себя'],
  ['环保习惯', 'huánbǎo xíguàn', 'экологичные привычки'],
  ['地球一小时', 'dìqiú yì xiǎoshí', 'Час Земли'],
  ['绿色出行', 'lǜsè chūxíng', 'экологичный транспорт'],
  ['绿色生活', 'lǜsè shēnghuó', 'экологичный образ жизни'],
  ['怎样保护环境', 'zěnyàng bǎohù huánjìng', 'как защищать окружающую среду'],
  ['环保行为', 'huánbǎo xíngwéi', 'экологичное поведение'],
  ['教育孩子的艺术', 'jiàoyù háizi de yìshù', 'искусство воспитания детей'],
  ['好习惯', 'hǎo xíguàn', 'хорошая привычка'],
  ['表扬孩子', 'biǎoyáng háizi', 'хвалить ребёнка'],
  ['合适的方法', 'héshì de fāngfǎ', 'подходящий метод'],
  ['教室里的孩子', 'jiàoshì lǐ de háizi', 'дети в классе'],
  ['不同的教育方法', 'bùtóng de jiàoyù fāngfǎ', 'разные методы воспитания'],
  ['怎样教育孩子', 'zěnyàng jiàoyù háizi', 'как воспитывать детей'],
  ['父母的教育方式', 'fùmǔ de jiàoyù fāngshì', 'способы воспитания родителей'],
  ['怎样成为好父母', 'zěnyàng chéngwéi hǎo fùmǔ', 'как стать хорошими родителями'],
  ['生活可以更美好', 'shēnghuó kěyǐ gèng měihǎo', 'жизнь может стать лучше'],
  ['出国留学', 'chūguó liúxué', 'учёба за границей'],
  ['成功的经验', 'chénggōng de jīngyàn', 'опыт успеха'],
  ['学会拒绝', 'xuéhuì jùjué', 'научиться отказывать'],
  ['怎么解决问题', 'zěnme jiějué wèntí', 'как решать проблему'],
  ['怎么礼貌拒绝', 'zěnme lǐmào jùjué', 'как вежливо отказать'],
  ['一切从现在做起', 'yíqiè cóng xiànzài zuòqǐ', 'всё начинать прямо сейчас'],
  ['机会还是努力', 'jīhuì háishì nǔlì', 'возможность или усилия'],
  ['学会选择', 'xuéhuì xuǎnzé', 'научиться выбирать'],
  ['人与自然', 'rén yǔ zìrán', 'человек и природа'],
  ['秋天与动物', 'qiūtiān yǔ dòngwù', 'осень и животные'],
  ['最喜欢的动物', 'zuì xǐhuan de dòngwù', 'любимое животное'],
  ['动物园与植物竞争', 'dòngwùyuán yǔ zhíwù jìngzhēng', 'зоопарк и конкуренция растений'],
  ['动物与自然', 'dòngwù yǔ zìrán', 'животные и природа'],
  ['植物为什么竞争', 'zhíwù wèishénme jìngzhēng', 'почему растения конкурируют'],
  ['海底世界', 'hǎidǐ shìjiè', 'подводный мир'],
  ['保护自然', 'bǎohù zìrán', 'защищать природу'],
  ['怎样保护自然', 'zěnyàng bǎohù zìrán', 'как защищать природу'],
  ['如果没有森林', 'rúguǒ méiyǒu sēnlín', 'если бы не было лесов'],
  ['狗为什么听话', 'gǒu wèishénme tīnghuà', 'почему собака слушается'],
  ['南方的冬天', 'nánfāng de dōngtiān', 'зима на юге Китая'],
  ['植物为什么竞争', 'zhíwù wèishénme jìngzhēng', 'почему растения конкурируют'],
  ['大树和森林', 'dàshù hé sēnlín', 'большое дерево и лес'],
  ['科技与世界', 'kējì yǔ shìjiè', 'технологии и мир'],
  ['科学知识与网络生活', 'kēxué zhīshi yǔ wǎngluò shēnghuó', 'научные знания и жизнь в сети'],
  ['科技怎样改变学习', 'kējì zěnyàng gǎibiàn xuéxí', 'как технологии меняют учёбу'],
  ['网络生活与安全', 'wǎngluò shēnghuó yǔ ānquán', 'жизнь в сети и безопасность'],
  ['科技使用要有度', 'kējì shǐyòng yào yǒu dù', 'технологиями нужно пользоваться разумно'],
  ['梦、手机与信息安全', 'mèng, shǒujī yǔ xìnxī ānquán', 'сны, смартфоны и информационная безопасность'],
  ['科技在生活中', 'kējì zài shēnghuó zhōng', 'технологии в повседневной жизни'],
  ['手机功能', 'shǒujī gōngnéng', 'функции смартфона'],
  ['新闻与信息准确性', 'xīnwén yǔ xìnxī zhǔnquèxìng', 'новости и точность информации'],
  ['手机与距离', 'shǒujī yǔ jùlí', 'мобильный телефон и расстояние'],
  ['科技改变生活', 'kējì gǎibiàn shēnghuó', 'технологии меняют жизнь'],
  ['地球村', 'dìqiú cūn', 'глобальная деревня'],
  ['科技给生活带来的变化', 'kējì gěi shēnghuó dàilái de biànhuà', 'изменения, которые технологии принесли в жизнь'],
  ['手机拉近距离', 'shǒujī lājìn jùlí', 'телефон сокращает расстояние'],
  ['如果没有手机', 'rúguǒ méiyǒu shǒujī', 'если бы не было телефона'],
  ['生活的味道', 'shēnghuó de wèidào', 'вкус жизни'],
  ['申请表与做饭', 'shēnqǐngbiǎo yǔ zuòfàn', 'анкеты и приготовление еды'],
  ['申请表与生活细节', 'shēnqǐngbiǎo yǔ shēnghuó xìjié', 'анкета и бытовые детали'],
  ['饺子、刀与小意外', 'jiǎozi, dāo yǔ xiǎo yìwài', 'пельмени, нож и маленькая неприятность'],
  ['生活为什么有味道', 'shēnghuó wèishénme yǒu wèidào', 'что делает жизнь насыщенной'],
  ['友谊的味道', 'yǒuyì de wèidào', 'вкус дружбы'],
  ['舞蹈与住房', 'wǔdǎo yǔ zhùfáng', 'танец и жильё'],
  ['小区与住房', 'xiǎoqū yǔ zhùfáng', 'жилой комплекс и жильё'],
  ['租房与生活环境', 'zūfáng yǔ shēnghuó huánjìng', 'съём жилья и условия жизни'],
  ['学会选择', 'xuéhuì xuǎnzé', 'научиться выбирать'],
  ['运动让生活更有味道', 'yùndòng ràng shēnghuó gèng yǒu wèidào', 'движение делает жизнь насыщеннее'],
  ['生活满意度', 'shēnghuó mǎnyìdù', 'удовлетворённость жизнью'],
  ['选择与生活', 'xuǎnzé yǔ shēnghuó', 'выбор и жизнь'],
  ['生命在于运动', 'shēngmìng zàiyú yùndòng', 'жизнь — в движении'],
]

const lessonData = [
  lesson2Data,
  lesson3Data,
  lesson4Data,
  lesson5Data,
  lesson6Data,
  lesson7Data,
  lesson8Data,
  lesson9Data,
  lesson10Data,
  lesson11Data,
  lesson12Data,
  lesson13Data,
  lesson14Data,
  lesson15Data,
  lesson16Data,
  lesson17Data,
  lesson18Data,
  lesson19Data,
  lesson20Data,
]

const termMap = new Map()

function addTerm(text, pinyin, translation) {
  if (!text || !pinyin || termMap.has(text)) return
  termMap.set(text, { pinyin: pinyin.normalize('NFC'), translation: translation || '' })
}

COMMON_TERMS.forEach(([text, pinyin, translation]) => addTerm(text, pinyin, translation))

vocabularyLesson1All.forEach((item) => addTerm(item.hanzi, item.pinyin, item.translation))
grammarLesson1.forEach((item) => addTerm(item.title, item.pinyin, item.translation))

lessonData.forEach((data) => {
  ;(data.words || []).forEach((item) => addTerm(item.hanzi, item.pinyin, item.translation))
  ;(data.grammar || []).forEach((item) => addTerm(item.title, item.pinyin, item.translation))
})

chengyuData.forEach((item) => addTerm(item.hanzi, item.pinyin, item.translation))

// Названия некоторых карточек короче формулировки в Grammar Guide.
addTerm('并不', 'bìng bù', 'вовсе не; совсем не')
addTerm('实际上', 'shíjìshang', 'на самом деле')
addTerm('名量词重叠', 'míng-liàngcí chóngdié', 'повтор счётного слова: «каждый»')
addTerm('对于 / 关于', 'duìyú / guānyú', 'что касается / о, насчёт')
addTerm('再……也……', 'zài… yě…', 'как бы ни…; даже если… всё равно…')

const searchableTerms = [...termMap.keys()]
  .filter((term) => [...term].filter((char) => /[\u3400-\u9fff]/.test(char)).length >= 2)
  .sort((a, b) => b.length - a.length)

function exactMeta(text) {
  return termMap.get(text) || null
}

function tokenize(text) {
  if (typeof text !== 'string' || !/[\u3400-\u9fff]/.test(text)) {
    return [{ text }]
  }

  const exact = exactMeta(text)
  if (exact) return [{ text, ...exact }]

  const result = []
  let index = 0
  let raw = ''

  function flushRaw() {
    if (!raw) return
    result.push({ text: raw })
    raw = ''
  }

  while (index < text.length) {
    const match = searchableTerms.find((term) => text.startsWith(term, index))
    if (!match) {
      raw += text[index]
      index += 1
      continue
    }

    flushRaw()
    result.push({ text: match, ...termMap.get(match) })
    index += match.length
  }

  flushRaw()
  return result
}

export default function ChineseTitle({ text, className = '' }) {
  const segments = tokenize(text)

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (!segment.pinyin) {
          return <span key={`${segment.text}-${index}`}>{segment.text}</span>
        }

        return (
          <ChineseText
            key={`${segment.text}-${index}`}
            pinyin={segment.pinyin}
            translation={segment.translation}
            tooltipPosition="top"
          >
            {segment.text}
          </ChineseText>
        )
      })}
    </span>
  )
}
