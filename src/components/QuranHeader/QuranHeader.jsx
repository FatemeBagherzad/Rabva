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
  setSelectedAyah,
  rtlDirection,
  nextPageCount,
  setRequestedSurah,
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

  useEffect(() => {
    setRequestedSurah(null);
  }, [currentPage]);

  if (!selectedSurah)
    return <div className="quran-header__loading">در حال بارگذاری...</div>;

  const goToPage = (page) => {
    if (page < 1 || page > 604) return setIsInputError(true);
    if (page === currentPage) return;

    const matched = Object.entries(ayahPagesInfo).find(([, ayahs]) =>
      Object.values(ayahs).includes(page),
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
    setRequestedSurah(id);
    toggleLists(false, true);
    const page = ayahPagesInfo[id][1];
    if (page) goToPage(Number(page));
    setSelectedSurah(id);
  };

  const handleAyahClick = (ayah) => {
    const page = ayahPagesInfo[selectedSurah][ayah];

    if (page) {
      setSelectedAyah({ surah: selectedSurah, ayah: ayah });
      goToPage(Number(page));
      toggleLists(false, false);
    }
  };

  const renderSurahList = () => (
    <ul className="menu quran-header__surahs">
      {Object.entries(surahs).map(([id, [name]]) => (
        <li
          key={id}
          onClick={() => handleSurahClick(id, name)}
          className="menu__option"
        >
          <span className="quran-header__surah-number">
            {convertToPersianNumber(id)}
          </span>
          <span className="quran-header__surah-divider"> - </span>
          <span className="quran-header__surah-name">{name}</span>
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
        className="quran-header__translation menu__option"
        onClick={() => {
          setShowTranslationByAyah(false);
          setShowQuranByWords(false);
          setAyahTranslator('');
          setShowTranslationList(false);
        }}
      >
        No translation
      </span>
      <span className="quran-header__translation-language">{language}</span>

      {language === 'fa' && (
        <span
          className="quran-header__translation menu__option"
          onClick={() => {
            setShowQuranByWords((prev) => !prev);
            setShowTranslationList(false);
          }}
        >
          کلمه به کلمه (میریحیی)
        </span>
      )}
      <ul className={` ${rtlDirection ? 'rtl' : 'ltr'}`}>
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

  const toggleLists = (surah, ayah) => {
    setShowSurahList(surah);
    setShowAyahList(ayah);
  };

  return (
    <div className="quran-header__back">
      <div className="quran-header container" ref={containerRef}>
        <header className="quran-header__header">
          <span
            className="quran-header__surah-trigger"
            onClick={() => toggleLists(!showSurahList, false)}
          >
            {surahs[selectedSurah][0]}
          </span>

          <span className="quran-header__page-navigation">
            {currentPage < 604 && (
              <img
                src={chevronLeft}
                alt="next"
                onClick={() => goToPage(currentPage + nextPageCount)}
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
                onClick={() => goToPage(currentPage - nextPageCount)}
                className="quran-header__chevron"
              />
            )}
          </span>

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
