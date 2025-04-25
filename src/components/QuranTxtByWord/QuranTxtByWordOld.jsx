import besmBack from '../../assets/img/quran-besm-frame-green.png';
import './QuranTxtByWordOld.scss';

const QuranTxtByWord = ({
  convertToPersianNumber,
  verses,
  selectedChapter,
  words,
}) => {
  const groupWordsByVerseId = (wordsArray) => {
    if (!Array.isArray(wordsArray)) {
      return {};
    }
    return wordsArray.reduce((acc, word) => {
      if (!acc[word.verse_id]) {
        acc[word.verse_id] = [];
      }
      acc[word.verse_id].push({
        word: word.words,
        translation: word.translations,
      });
      return acc;
    }, {});
  };
  const groupedWords = groupWordsByVerseId(words);

  return (
    <div className="quran">
      <div className="quran__verses">
        {verses.map((ver) => (
          <span key={ver.id} className="quran__verse">
            {ver.verse_id === 1 && (
              <div className="quran__chapter-name-container">
                <img
                  src={besmBack}
                  alt="border image"
                  className="quran__chapter-name-back"
                />
                <span className="quran__chapter-name">{selectedChapter}</span>
              </div>
            )}

            {ver.verse_id === 1 &&
              selectedChapter !== 'التوبة' &&
              selectedChapter !== 'الفاتحة' && (
                <div className="quran__besm">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>
              )}

            <span className="quran__word-translation-verse">
              {groupedWords[ver.verse_id]?.map((item, index) => (
                <span key={index} className="quran__word-translation-container">
                  <span className="quran__word">{item.word}</span>
                  <span className="quran__translation">{item.translation}</span>
                </span>
              ))}
            </span>
            <span className="quran__verse-number">
              ﴿‏{convertToPersianNumber(ver.verse_id)}‎﴾ {'\u00A0'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default QuranTxtByWord;
