import ChineseText from './ChineseText.jsx'
import moyuWave from '../assets/design/moyu1.png'

const PHRASES = [
  { zh: '每天一点点，进步看得见。', pinyin: 'měitiān yìdiǎndiǎn, jìnbù kàn de jiàn', ru: 'Понемногу каждый день — и прогресс становится заметен.' },
  { zh: '慢慢来，你在进步。', pinyin: 'mànmàn lái, nǐ zài jìnbù', ru: 'Не спеши. Ты уже движешься вперёд.' },
  { zh: '再听一遍，就更清楚了。', pinyin: 'zài tīng yí biàn, jiù gèng qīngchu le', ru: 'Ещё одно прослушивание — и станет яснее.' },
  { zh: '今天也很棒。', pinyin: 'jīntiān yě hěn bàng', ru: 'Сегодня тоже отлично.' },
  { zh: '先做一点，再做一点。', pinyin: 'xiān zuò yìdiǎn, zài zuò yìdiǎn', ru: 'Сначала немного. Потом ещё немного.' },
  { zh: '别怕错，错题会带你进步。', pinyin: 'bié pà cuò, cuòtí huì dài nǐ jìnbù', ru: 'Не бойся ошибок — они показывают, куда расти.' },
  { zh: '你可以！', pinyin: 'nǐ kěyǐ', ru: 'У тебя получится!' },
]

const today = new Date()
const yearStart = new Date(today.getFullYear(), 0, 0)
const DAILY_INDEX = Math.floor((today - yearStart) / 86400000)

export default function MoyuMotivator({ compact = false }) {
  const phrase = PHRASES[DAILY_INDEX % PHRASES.length]

  return (
    <aside className={`moyu-motivator ${compact ? 'compact' : ''}`} aria-label="小墨玉 · ежедневный мотиватор">
      <div className="moyu-bubble">
        <small>小墨玉 · 今日一句</small>
        <strong>
          <ChineseText pinyin={phrase.pinyin} translation={phrase.ru} tooltipPosition="bottom">
            {phrase.zh}
          </ChineseText>
        </strong>
      </div>
      <div className="moyu-art" aria-hidden="true">
        <img src={moyuWave} alt="" />
        <i className="moyu-note n1">♪</i>
        <i className="moyu-note n2">♫</i>
        <i className="moyu-note n3">♪</i>
      </div>
    </aside>
  )
}
