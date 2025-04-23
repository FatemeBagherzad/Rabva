import besmBack from '../../assets/img/quran-besm-frame-green.png';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import './QuranTxt.scss';

const QuranTxt = ({ quranData, selectedSurah }) => {
  const pageAyahs = [];

  for (const [surahNumber, ayahs] of Object.entries(quranData)) {
    for (const [ayahNumber, ayahText] of Object.entries(ayahs)) {
      pageAyahs.push([parseInt(surahNumber), parseInt(ayahNumber), ayahText]);
    }
  }

  if (!quranData || pageAyahs.length === 0) {
    return <div>Loading Quran data...</div>;
  }
  return (
    <div className="quran">
      <div className="quran__ayahs">
        {pageAyahs.map((ver) => (
          <span key={ver[0] / ver[1]} className="quran__ayah">
            {ver[1] === 1 && (
              <div className="quran__surah-name-container">
                <img
                  src={besmBack}
                  alt="border image"
                  className="quran__surah-name-back"
                />
                <span className="quran__surah-name">{selectedSurah}</span>
              </div>
            )}

            {ver[1] === 1 &&
              selectedSurah !== 'التوبة' &&
              selectedSurah !== 'الفاتحة' && (
                <div className="quran__besm">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>
              )}

            {ver[2] + '\u00A0'}
            <span className="quran__ayah-number">
              ﴿‏{convertToPersianNumber(ver[1])}‎﴾ {'\u00A0'}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default QuranTxt;
