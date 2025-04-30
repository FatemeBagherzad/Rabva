import besmBack from '../../assets/img/quran-besm-frame-green.png';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import '../QuranTxt/QuranTxt.scss';
import './QuranTxtByWord.scss';

const QuranTxtByWord = ({ quranData, translationH, surahs }) => {
  if (!quranData) return <div>Loading Quran data...</div>;

  const getGroupedAyahs = () => {
    const result = {};
    for (const [surah, ayahs] of Object.entries(quranData)) {
      for (const [ayah, [words]] of Object.entries(ayahs)) {
        const sn = parseInt(surah);
        const an = parseInt(ayah);
        if (!result[sn]) result[sn] = [];
        result[sn].push(...words, an);
      }
    }
    return result;
  };

  const isFirstAyah = (arr) =>
    arr.find((item) => typeof item === 'number') === 1;

  const groupedAyahs = getGroupedAyahs();

  const besmTranslation = ['به نام', 'خدا', 'آسایش دار', 'آسایش ده'];

  const renderWords = (content, surahNumber) => {
    let ayahNum = 0;
    let wordIndex = 0;
    let translateIndex = content.find((ayaNum) => typeof ayaNum === 'number');

    return content.map((item, i) => {
      if (typeof item === 'number') {
        ayahNum = item;
        translateIndex = ayahNum + 1;
        wordIndex = 0;
        const num = convertToPersianNumber(item);
        return (
          <span key={`ayah-${surahNumber}-${i}`} className="quran__word-block">
            <span className="quran__ayah-number">
              {' '}
              ﴿‏{num}‎﴾ {'\u00A0'}
            </span>
            <span className="quran__ayah-number quran__ayah-number-translation">
              {num}
            </span>
          </span>
        );
      } else {
        const translation =
          translationH?.[surahNumber]?.[translateIndex]?.[0]?.[wordIndex] ||
          '—';

        const element = (
          <span key={`word-${surahNumber}-${i}`} className="quran__word-block">
            <span className="quran__word">{item}</span>
            <span className="quran__translation">{translation}</span>
          </span>
        );

        wordIndex++;
        return element;
      }
    });
  };

  return (
    <div className="quran">
      <div className="quran__ayahs">
        {Object.entries(groupedAyahs).map(([surahNumber, content]) => {
          const name = surahs[surahNumber]?.[0];
          const showBesm =
            isFirstAyah(content) && name !== 'التوبة' && name !== 'الفاتحة';

          return (
            <div key={surahNumber} className="quran__ayah">
              {isFirstAyah(content) && (
                <div className="quran__surah-name-container">
                  <img
                    src={besmBack}
                    alt="border"
                    className="quran__surah-name-back"
                  />
                  <span className="quran__surah-name">{name}</span>
                </div>
              )}
              {showBesm && (
                <div className="quran__besm">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>
              )}
              <span className="quran__words">
                {renderWords(content, surahNumber)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuranTxtByWord;
