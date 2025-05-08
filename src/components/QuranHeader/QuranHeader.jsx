import { useState, useEffect } from 'react';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import { useOutsideClick } from '../../hooks/useOutsideClick';

import chevronLeft from '../../assets/icons/chevron-left.svg';
import chevronRight from '../../assets/icons/chevron-right.svg';

import './QuranHeader.scss';

const QuranHeader = ({
  surahs,
  ayahPagesInfo,
  selectedSurah,
  showQuranByWords,
  showTranslationList,
  setShowQuranByWords,
  setTranslationList,
  currentPage,
  setCurrentPage,
  setSelectedSurah,
}) => {
  const containerRef = useOutsideClick(() => {
    setShowAyahList(false);
    setShowSurahList(false);
  });

  const [showSurahList, setShowSurahList] = useState(false);
  const [showAyahList, setShowAyahList] = useState(false);
  const [inputPage, setInputPage] = useState(1);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [isInputError, setIsInputError] = useState(false);
  const [selectedSurahId, setSelectedSurahId] = useState(
    Object.keys(surahs)[0] || '1'
  );
  const [totalAyahs, setTotalAyahs] = useState(
    surahs[selectedSurahId]?.[1] || 7
  );

  // Update selectedSurah name and total ayahs
  useEffect(() => {
    const [name, total] = surahs[selectedSurahId] || [];
    if (name && total) {
      setSelectedSurah(name);
      setTotalAyahs(total);
    }
  }, [selectedSurahId]);

  const findSurahByPage = (page) => {
    return Object.entries(ayahPagesInfo).find(([, ayahs]) =>
      Object.values(ayahs).includes(page)
    );
  };

  const goToPage = (page) => {
    if (page < 1 || page > 604) {
      setIsInputError(true);
      return;
    }

    setCurrentPage(page);
    setInputPage(page);
    setIsInputError(false);

    const matched = findSurahByPage(page);
    if (matched) {
      const [id] = matched;
      setSelectedSurahId(id);
    }
  };

  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter') goToPage(Number(inputPage));
  };

  const handleSurahClick = (id, name) => {
    setSelectedSurahId(id);
    setSelectedSurah(name);
    toggleLists(false, true);
    const page = ayahPagesInfo[id][1];
    if (page) goToPage(Number(page));
  };

  const handleAyahClick = (ayah) => {
    const page = ayahPagesInfo[selectedSurahId][ayah];
    if (page) {
      goToPage(Number(page));
      toggleLists(false, false);
    }
  };

  const toggleLists = (surah, ayah) => {
    setShowSurahList(surah);
    setShowAyahList(ayah);
  };

  const renderSurahList = () => (
    <ul className="quran-header__surahs">
      {Object.entries(surahs).map(([id, [name]]) => (
        <li
          key={id}
          onClick={() => handleSurahClick(id, name)}
          className="quran-header__surah"
        >
          {convertToPersianNumber(id)} - {name}
        </li>
      ))}
    </ul>
  );

  const renderAyahList = () => (
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
  );

  return (
    <div className="quran-header__back">
      <div className="quran-header container" ref={containerRef}>
        <header className="quran-header__header">
          <span onClick={() => toggleLists(!showSurahList, false)}>
            {selectedSurah}
          </span>
          <span onClick={() => toggleLists(false, !showAyahList)}>الآیه</span>

          <span className="quran-header__page-navigation">
            <img
              src={chevronRight}
              alt="prev"
              onClick={() => goToPage(currentPage - 1)}
              className="quran-header__chevron"
            />

            {isEditingPage ? (
              <input
                type="number"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onKeyDown={handlePageInputSubmit}
                onBlur={() => setIsEditingPage(false)}
                className={`quran-header__page-input ${
                  isInputError ? 'inputErrorStyle' : ''
                }`}
              />
            ) : (
              <span onClick={() => setIsEditingPage(true)}>
                {convertToPersianNumber(currentPage)}
              </span>
            )}

            <img
              src={chevronLeft}
              alt="next"
              onClick={() => goToPage(currentPage + 1)}
              className="quran-header__chevron"
            />
          </span>

          <span
            className={`quran-header__translate-options ${
              showQuranByWords ? 'quran-header__translate-options-on' : ''
            }`}
            onClick={() => setShowQuranByWords((prev) => !prev)}
          >
            ترجمه کلمه به کلمه
          </span>

          <span
            className={`quran-header__translate-options ${
              showTranslationList ? 'quran-header__translate-options-on' : ''
            }`}
            onClick={() => setTranslationList((prev) => !prev)}
          >
            ترجمه آیه به آیه
          </span>
        </header>

        <div className="quran-header__body">
          {showSurahList && renderSurahList()}
          {showAyahList && renderAyahList()}
        </div>
      </div>
    </div>
  );
};

export default QuranHeader;
