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
  setShowTranslationByAyah,
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

  const renderTranslationList = () => (
    <div>
      <span onClick={() => setShowQuranByWords((prev) => !prev)}>
        word by word
      </span>
      <ul>
        {selectedLangTranslators?.map((translator, index) => (
          <li
            key={index}
            onClick={() => {
              setAyahTranslator(translator);
              setShowTranslationByAyah(true);
              setShowQuranByWords(false);
            }}
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
          <span onClick={() => toggleLists(!showSurahList, false)}>
            {surahs[selectedSurah][0]}
          </span>

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
