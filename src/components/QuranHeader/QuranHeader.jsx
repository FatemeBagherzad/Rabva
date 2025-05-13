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
  setSelectedSurah,
  showQuranByWords,
  setShowQuranByWords,
  currentPage,
  setCurrentPage,
  showTranslationList,
  setShowTranslationList,
  selectedLangTranslators,
  setAyahTranslator,
  showTranslationByAyah,
  setShowTranslationByAyah,
  language,
}) => {
  const [showSurahList, setShowSurahList] = useState(false);
  const [showAyahList, setShowAyahList] = useState(false);
  const [inputPage, setInputPage] = useState(1);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [isInputError, setIsInputError] = useState(false);
  const [totalAyahs, setTotalAyahs] = useState(7);

  const containerRef = useOutsideClick(() => {
    setShowAyahList(false);
    setShowSurahList(false);
    setShowTranslationList(false);
  });

  useEffect(() => {
    const [, total] = surahs[selectedSurah] || [];
    if (total) setTotalAyahs(total);
  }, [selectedSurah, surahs]);

  if (!selectedSurah)
    return <div className="quran-header__loading">در حال بارگذاری...</div>;

  const goToPage = (page) => {
    if (page < 1 || page > 604) return setIsInputError(true);
    const matched = Object.entries(ayahPagesInfo).find(([, ayahs]) =>
      Object.values(ayahs).includes(page)
    );
    if (matched) setSelectedSurah(matched[0]);

    setCurrentPage(page);
    setInputPage(page);
    setIsInputError(false);
  };

  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter') goToPage(Number(inputPage));
  };

  const handleSurahClick = (id, name) => {
    setSelectedSurah(id);
    toggleLists(false, true);
    const page = ayahPagesInfo[id][1];
    if (page) goToPage(Number(page));
  };

  const handleAyahClick = (ayah) => {
    const page = ayahPagesInfo[selectedSurah][ayah];
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
    <ul className="menu quran-header__surahs">
      {Object.entries(surahs).map(([id, [name]]) => (
        <li
          key={id}
          onClick={() => handleSurahClick(id, name)}
          className="menu__option"
        >
          {convertToPersianNumber(id)} - {name}
        </li>
      ))}
    </ul>
  );

  const renderAyahList = () => (
    <ul className="menu quran-header__ayahs">
      {Array.from({ length: totalAyahs }, (_, i) => (
        <li
          key={i + 1}
          onClick={() => handleAyahClick(i + 1)}
          className="menu__option "
        >
          {convertToPersianNumber(i + 1)}
        </li>
      ))}
    </ul>
  );

  const renderTranslationList = () => (
    <div className="menu quran-header__tranlation-list">
      <span
        className="quran-header__translation"
        onClick={() => setShowQuranByWords((prev) => !prev)}
      >
        word by word
      </span>
      <span className="quran-header__translation-language">{language}</span>
      <ul>
        {selectedLangTranslators?.map((translator, index) => (
          <li
            key={index}
            onClick={() => {
              setAyahTranslator(translator);
              setShowTranslationByAyah(true);
              setShowTranslationList(false);
              setShowQuranByWords(false);
            }}
            className="menu__option"
          >
            {translator}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="quran-header__back">
      <div className="quran-header container" ref={containerRef}>
        <header className="quran-header__header">
          <span
            className={`quran-header__translate-options ${
              showTranslationByAyah && showQuranByWords
                ? 'quran-header__translate-options-on'
                : ''
            }`}
            onClick={() => setShowTranslationList((prev) => !prev)}
          >
            ترجمه
          </span>

          <span className="quran-header__page-navigation">
            {currentPage < 604 && (
              <img
                src={chevronLeft}
                alt="next"
                onClick={() => goToPage(currentPage + 1)}
                className="quran-header__chevron"
              />
            )}

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
            {currentPage > 1 && (
              <img
                src={chevronRight}
                alt="prev"
                onClick={() => goToPage(currentPage - 1)}
                className="quran-header__chevron"
              />
            )}
          </span>

          <span onClick={() => toggleLists(!showSurahList, false)}>
            {surahs[selectedSurah][0]}
          </span>
        </header>

        <div className="quran-header__body">
          {showSurahList && renderSurahList()}
          {showAyahList && renderAyahList()}
          {showTranslationList && renderTranslationList()}
        </div>
      </div>
    </div>
  );
};

export default QuranHeader;
