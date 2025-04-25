import besmBack from '../../assets/img/quran-besm-frame-green.png';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import '../QuranTxt/QuranTxt.scss';
import './QuranTxtByWord.scss';

const QuranTxtByWord = ({ quranData, surahs }) => {
  // const pageAyahs = [];

  // for (const [surahNumber, ayahs] of Object.entries(quranData)) {
  //   for (const [ayahNumber, ayahTextPair] of Object.entries(ayahs)) {
  //     let firstArray = ayahTextPair[0];
  //     pageAyahs.push([parseInt(surahNumber), parseInt(ayahNumber), firstArray]);
  //   }
  // }

  const groupedPageAyahs = {};
  for (const [surahNumber, ayahs] of Object.entries(quranData)) {
    for (const [ayahNumber, ayahTextPair] of Object.entries(ayahs)) {
      const firstArray = ayahTextPair[0];
      const sn = parseInt(surahNumber);
      const an = parseInt(ayahNumber);

      if (!groupedPageAyahs[sn]) {
        groupedPageAyahs[sn] = [];
      }

      groupedPageAyahs[sn].push(...firstArray, an);
    }
  }

  if (!quranData || groupedPageAyahs.length === 0) {
    return <div>Loading Quran data...</div>;
  }

  return (
    <div className="quran">
      <div className="quran__ayahs">
        {Object.entries(groupedPageAyahs).map(
          ([surahNumber, content], index) => {
            const surahName = surahs[surahNumber]?.[0];
            return (
              <div key={surahNumber}>
                {/* Surah Name and Frame */}
                <div className="quran__surah-name-container">
                  <img
                    src={besmBack}
                    alt="border image"
                    className="quran__surah-name-back"
                  />
                  <span className="quran__surah-name">{surahName}</span>
                </div>

                {/* Bismillah */}
                {surahName !== 'التوبة' && surahName !== 'الفاتحة' && (
                  <div className="quran__besm">
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </div>
                )}

                {/* Ayah Words + Ayah Number */}
                <span className="quran__words">
                  {content.map((item, idx) => {
                    if (typeof item === 'number') {
                      // Ayah number
                      return (
                        <span
                          key={`ayah-${surahNumber}-${idx}`}
                          className="quran__ayah-number"
                        >
                          ﴿‏{convertToPersianNumber(item)}‎﴾ {'\u00A0'}
                        </span>
                      );
                    } else {
                      // Word
                      return (
                        <span
                          key={`word-${surahNumber}-${idx}`}
                          className="quran__word-block"
                        >
                          <span className="quran__word">{item}</span>
                          <span className="quran__translation">معنی</span>
                        </span>
                      );
                    }
                  })}
                </span>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

export default QuranTxtByWord;
