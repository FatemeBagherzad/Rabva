import { useState, useEffect } from 'react';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import './QuranHeader.scss';

const QuranHeader = ({
  surahs,
  setSelectedSurah,
  setCurrentPage,
  ayahPagesInfo,
  fetchQuranPageData,
}) => {
  const [showSurahList, setShowSurahList] = useState(false);
  const [showAyahList, setShowAyahList] = useState(false);
  const [selectedSurahId, setSelectedSurahId] = useState(
    Object.keys(surahs)[0] || '1'
  );
  const [totalAyahs, setTotalAyahs] = useState(
    surahs[selectedSurahId]?.[1] || 7
  );

  useEffect(() => {
    if (surahs[selectedSurahId]) {
      setTotalAyahs(surahs[selectedSurahId][1]);
    }
  }, [selectedSurahId, surahs]);

  const toggleLists = (surahToggle, ayahToggle) => {
    setShowSurahList(surahToggle);
    setShowAyahList(ayahToggle);
  };

  const handleSurahClick = async (id) => {
    setSelectedSurahId(id);
    setSelectedSurah(surahs[id][0]);
    toggleLists(false, true);

    const matchingEntry = ayahPagesInfo[id][1];
    console.log(id, matchingEntry);
    if (matchingEntry) {
      setCurrentPage(Number(matchingEntry));
      await fetchQuranPageData(matchingEntry);
    }
  };

  const handleAyahClick = async (ayahNumber) => {
    const page = ayahPagesInfo[selectedSurahId][ayahNumber];

    if (page) {
      setCurrentPage(Number(page));
      await fetchQuranPageData(Number(page));
      toggleLists(false, false);
    }
  };

  return (
    <div className="quran-header__back">
      <div className="quran-header container">
        <header className="quran-header__header">
          <span onClick={() => toggleLists(!showSurahList, false)}>السوره</span>
          <span onClick={() => toggleLists(false, !showAyahList)}>الآیه</span>
        </header>

        <div className="quran-header__body">
          {showSurahList && (
            <ul className="quran-header__surahs">
              {Object.entries(surahs).map(([id, [name]]) => (
                <li
                  key={id}
                  onClick={() => handleSurahClick(id)}
                  className="quran-header__surah"
                >
                  {convertToPersianNumber(id)} - {name}
                </li>
              ))}
            </ul>
          )}

          {showAyahList && totalAyahs && (
            <ul className="quran-header__ayahs">
              {Array.from({ length: totalAyahs }, (_, i) => (
                <li
                  key={i + 1}
                  onClick={() => handleAyahClick(i + 1)}
                  className="quran-header__ayah"
                >
                  {convertToPersianNumber(i + 1)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuranHeader;
