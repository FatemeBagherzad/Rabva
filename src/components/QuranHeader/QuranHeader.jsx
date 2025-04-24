import { useState } from 'react';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import './QuranHeader.scss';

const QuranHeader = ({
  surahs,
  setSelectedSurah,
  setCurrentPage,
  quranData,
  ayahPagesInfo,
  fetchQuranPageData,
  pagesInfo,
  setQuranData,
}) => {
  const [showSurahList, setShowSurahList] = useState(false);
  const [showAyahList, setShowAyahList] = useState(false);
  const [selectedSurahId, setSelectedSurahId] = useState(
    Object.keys(surahs)[0]
  );

  const handleSurahClick = (surahId) => {
    const firstPage = findFirstPageOfSurah(surahId);
    if (!firstPage) return;

    setSelectedSurah(surahs[surahId][0]); // Set the surah name
    setSelectedSurahId(surahId);
    setCurrentPage(firstPage);

    fetchQuranPageData(
      firstPage,
      pagesInfo,
      surahs,
      setQuranData,
      setSelectedSurah
    ).catch((err) => console.error('Error fetching Quran:', err));

    toggleLists(false, false);
  };

  const handleAyahClick = (ayahNum) => {
    const firstPage = findPageOfAyah(parseInt(selectedSurahId), ayahNum);
    setCurrentPage(firstPage);
    toggleLists(false, false);
  };

  const toggleLists = (surahList, ayahList) => {
    setShowSurahList(surahList);
    setShowAyahList(ayahList);
  };

  const findFirstPageOfSurah = (surahId) => {
    const pageInfo = ayahPagesInfo[parseInt(surahId)];
    if (!pageInfo) return null;
    const pageNo = pageInfo[1];
    return pageNo;
  };

  const findPageOfAyah = (surahId, ayahNum) => {
    const pages = Object.entries(quranData);
    for (const [page, surahObj] of pages) {
      const ayahs = surahObj[surahId];
      if (ayahs && ayahs[ayahNum]) return parseInt(page);
    }
    return 1;
  };

  const totalAyahs = surahs[selectedSurahId]?.[1];

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
