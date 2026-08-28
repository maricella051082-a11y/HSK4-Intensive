import moyuListening from '../assets/design/moyu3.png'
import moyuStudy from '../assets/design/moyu4.png'
import moyuCalm from '../assets/design/moyu2.png'
import ChineseText from './ChineseText.jsx'
import './MoyuCompanion.css'

const VARIANTS = {
  listening: {
    image: moyuListening,
    eyebrow: '小墨 · 听力提示',
    message: '先听关键词，不必急着听懂每一个字。',
    pinyin: 'xiān tīng guānjiàncí, búbì jízhe tīngdǒng měi yí ge zì',
    translation: 'Сначала лови ключевые слова — не нужно сразу понимать всё.',
  },
  writing: {
    image: moyuStudy,
    eyebrow: '小墨 · 写作提示',
    message: '先想结构，再慢慢落笔。',
    pinyin: 'xiān xiǎng jiégòu, zài mànmàn luòbǐ',
    translation: 'Сначала продумай структуру, затем спокойно пиши.',
  },
  reading: {
    image: moyuStudy,
    eyebrow: '小墨 · 阅读提示',
    message: '先看问题，再回到文章里找线索。',
    pinyin: 'xiān kàn wèntí, zài huídào wénzhāng lǐ zhǎo xiànsuǒ',
    translation: 'Сначала прочитай вопрос, затем ищи подсказки в тексте.',
  },
  calm: {
    image: moyuCalm,
    eyebrow: '小墨 · 休息一下',
    message: '慢一点也没关系。',
    pinyin: 'màn yìdiǎn yě méi guānxi',
    translation: 'Ничего страшного, если двигаться медленнее.',
  },
}

export default function MoyuCompanion({ variant = 'calm', compact = false }) {
  const content = VARIANTS[variant] || VARIANTS.calm

  return (
    <aside className={`moyu-companion ${variant} ${compact ? 'compact' : ''}`} aria-label="Подсказка от Сяо Мо">
      <img src={content.image} alt="Сяо Мо — помощник в обучении" />
      <div className="moyu-companion-copy">
        <small>{content.eyebrow}</small>
        <strong>
          <ChineseText
            pinyin={content.pinyin}
            translation={content.translation}
            tooltipPosition="top"
          >
            {content.message}
          </ChineseText>
        </strong>
        <span>{content.translation}</span>
      </div>
    </aside>
  )
}
