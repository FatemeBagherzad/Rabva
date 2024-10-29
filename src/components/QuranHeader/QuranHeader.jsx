import { useState } from 'react';
import './QuranHeader.scss';

const QuranHeader = ({
  chapters,
  setSelectedSurah,
  setCurrentPage,
  verseByPage,
}) => {
  const [showSurahList, setShowSurahList] = useState(false);
  const [showAyahList, setShowAyahList] = useState(false);
  const [selectedAyahCount, setSelectedAyahCount] = useState(null);
  const [surah, setSurah] = useState(chapters[0].id);

  const findVersePage = (surahId, ayah = null) => {
    const verse = verseByPage.find((v) => {
      const [sId, vNum] = v.verse_key.split(':');
      return sId === String(surahId) && (ayah ? v.verse_number === ayah : true);
    });
    return verse ? verse.page_number : 1;
  };

  const handleSurahClick = (surah) => {
    const pageNumber = findVersePage(surah.id);
    setSurah(surah);
    setCurrentPage(pageNumber);
    setSelectedSurah(surah.id);
    setSelectedAyahCount(surah.total_verses);
    toggleLists(false, false);
  };

  const handleAyahClick = (ayah) => {
    const pageNumber = findVersePage(surah.id, ayah);
    setCurrentPage(pageNumber);
    toggleLists(false, false);
  };

  const toggleLists = (surahList, ayahList) => {
    setShowSurahList(surahList);
    setShowAyahList(ayahList);
  };

  return (
    <div className="quran-header">
      <header className="quran-header__header">
        <span onClick={() => toggleLists(!showSurahList, false)}>السوره</span>
        <span onClick={() => toggleLists(false, !showAyahList)}>الآیه</span>
      </header>

      <div className="quran-header__body">
        {showSurahList && (
          <ul className="quran-header__surahs">
            {chapters.map((surah) => (
              <li
                key={surah.id}
                onClick={() => handleSurahClick(surah)}
                className="quran-header__surah"
              >
                {surah.name} - {surah.transliteration}
              </li>
            ))}
          </ul>
        )}

        {showAyahList && selectedAyahCount && (
          <ul className="quran-header__ayahs">
            {Array.from({ length: selectedAyahCount }, (_, index) => (
              <li
                key={index + 1}
                onClick={() => handleAyahClick(index + 1)}
                className="quran-header__ayah"
              >
                {index + 1}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default QuranHeader;
