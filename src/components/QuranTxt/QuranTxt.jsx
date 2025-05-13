import besmBack from '../../assets/img/quran-besm-frame-green.png';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import './QuranTxt.scss';

const QuranTxt = ({
  quranData,
  surahs,
  translationByAyah,
  showTranslationByAyah,
  rtlDirection,
  language,
  selectedAyah,
  setSelectedAyah,
}) => {
  const pageAyahs = [];
  const translationLookup = {};

  for (const [surahNumber, ayahs] of Object.entries(quranData)) {
    for (const [ayahNumber, ayahText] of Object.entries(ayahs)) {
      pageAyahs.push([parseInt(surahNumber), parseInt(ayahNumber), ayahText]);
    }
  }

  for (const [surahNumber, ayahs] of Object.entries(translationByAyah)) {
    for (const [ayahNumber, translateText] of Object.entries(ayahs)) {
      translationLookup[`${surahNumber}-${ayahNumber}`] = translateText;
    }
  }
  if (!quranData || pageAyahs.length === 0) {
    return <div>Loading Quran data...</div>;
  }
  if (showTranslationByAyah && !translationByAyah)
    return <p>در حال بارگزاری ...</p>;

  console.log(translationLookup);

  return (
    <div className="quran">
      <div className="quran__ayahs">
        {pageAyahs.map((ayah, index) => {
          const isSelected =
            selectedAyah?.surah === ayah[0] && selectedAyah?.ayah === ayah[1];

          return (
            <span key={`${ayah[0]}-${ayah[1]}`} className="quran__ayah">
              {ayah[1] === 1 && (
                <div className="quran__surah-name-container">
                  <img
                    src={besmBack}
                    alt="border image"
                    className="quran__surah-name-back"
                  />
                  <span className="quran__surah-name">
                    {surahs[ayah[0]] ? surahs[ayah[0]][0] : ''}
                  </span>
                </div>
              )}

              {ayah[1] === 1 &&
                surahs[ayah[0]][0] !== 'التوبة' &&
                surahs[ayah[0]][0] !== 'الفاتحة' && (
                  <div className="quran__besm">
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </div>
                )}
              <span
                className={`${isSelected ? 'quran__ayah--selected' : ''}`}
                onClick={() =>
                  setSelectedAyah({ surah: ayah[0], ayah: ayah[1] })
                }
              >
                {ayah[2] + '\u00A0'}
              </span>

              <span className="quran__ayah-number">
                ﴿‏{convertToPersianNumber(ayah[1])}‎﴾ {'\u00A0'}
              </span>
              {showTranslationByAyah && (
                <div
                  className={`quran__translation-ayah ${
                    rtlDirection ? 'rtl' : 'ltr'
                  }`}
                >
                  {translationLookup[`${ayah[0]}-${ayah[1]}`]}

                  <span>
                    {' '}
                    {language === 'fa'
                      ? convertToPersianNumber(ayah[1])
                      : ayah[1]}
                  </span>
                </div>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default QuranTxt;
