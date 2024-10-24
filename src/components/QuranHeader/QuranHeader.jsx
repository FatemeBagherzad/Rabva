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

  const handleSurahClick = (surah) => {
    const verse = verseByPage.find((verse) => {
      return verse.verse_key.split(':')[0] === String(surah.id);
    });
    setSurah(surah);
    setCurrentPage(verse.page_number);
    setSelectedSurah(surah.id);
    setSelectedAyahCount(surah.total_verses);
    setShowSurahList(false);
    setShowAyahList(false);
  };

  const handleAyahClick = (ayah) => {
    const verse = verseByPage.find((verse) => {
      return (
        verse.verse_key.split(':')[0] === String(surah.id) &&
        verse.verse_number === ayah
      );
    });
    setCurrentPage(verse.page_number);
    setShowSurahList(false);
    setShowAyahList(false);
  };

  const toggleSurahList = () => {
    setShowSurahList((prev) => !prev);
    setShowAyahList(false);
  };

  const toggleAyahList = () => {
    setShowSurahList(false);
    setShowAyahList((prev) => !prev);
  };

  return (
    <div className="quran-header">
      <header className="quran-header__header">
        <span onClick={toggleSurahList}>السوره</span>
        <span onClick={toggleAyahList}>الآیه</span>
      </header>

      <div className="quran-header__body">
        {showSurahList && (
          <div>
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
          </div>
        )}

        {showAyahList && selectedAyahCount && (
          <div className="quran-header__ayahs">
            <ul>
              {[...Array(selectedAyahCount)].map((_, index) => (
                <li
                  key={index + 1}
                  onClick={() => handleAyahClick(index + 1)}
                  className="quran-header__ayah"
                >
                  {index + 1}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuranHeader;
