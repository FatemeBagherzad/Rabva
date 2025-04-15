import besmBack from '../../assets/img/quran-besm-frame-green.png';
import './QuranTxt.scss';

const QuranTxt = ({ convertToPersianNumber, verses, selectedChapter }) => {
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

            {ver.verse_text + '\u00A0'}
            <span className="quran__verse-number">
              ﴿‏{convertToPersianNumber(ver.verse_id)}‎﴾ {'\u00A0'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default QuranTxt;
