import besmBack from '../../assets/img/quran-besm-frame-green.png';
import './QuranTxt.scss';

const QuranTxt = ({ convertToPersianNumber, ayahs, selectedSurah }) => {
  return (
    <div className="quran">
      <div className="quran__ayahs">
        {ayahs.map((ver) => (
          <span key={ver.id} className="quran__ayah">
            {ver.verse_id === 1 && (
              <div className="quran__surah-name-container">
                <img
                  src={besmBack}
                  alt="border image"
                  className="quran__surah-name-back"
                />
                <span className="quran__surah-name">{selectedSurah}</span>
              </div>
            )}

            {ver.verse_id === 1 &&
              selectedSurah !== 'التوبة' &&
              selectedSurah !== 'الفاتحة' && (
                <div className="quran__besm">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>
              )}

            {ver.verse_text + '\u00A0'}
            <span className="quran__ayah-number">
              ﴿‏{convertToPersianNumber(ver.verse_id)}‎﴾ {'\u00A0'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default QuranTxt;
