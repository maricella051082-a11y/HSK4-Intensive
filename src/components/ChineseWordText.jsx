import ChineseText from './ChineseText.jsx'

const PUNCTUATION = /^[，。！？、；：“”‘’《》,.!?;:]$/

export default function ChineseWordText({
  tokens = [],
  as: Tag = 'span',
  className = '',
  tooltipPosition = 'top',
}) {
  return (
    <Tag className={className}>
      {tokens.map(([hanzi, pinyin, translation], index) =>
        PUNCTUATION.test(hanzi) || !pinyin ? (
          <span key={`${hanzi}-${index}`}>{hanzi}</span>
        ) : (
          <ChineseText
            key={`${hanzi}-${index}`}
            pinyin={pinyin}
            translation={translation}
            tooltipPosition={tooltipPosition}
          >
            {hanzi}
          </ChineseText>
        ),
      )}
    </Tag>
  )
}
