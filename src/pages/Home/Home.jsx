import { useState, useEffect, useCallback } from 'react';

import quranData from '../../assets/data/quran.json';
import chaptersData from '../../assets/data/quran_chapters.json';
import verseByPage from '../../assets/data/quran-verse-number-by-page.json';

import QuranTxt from '../../components/QuranTxt/QuranTxt';
import TopNavigation from '../../components/TopNavigation/TopNavigation';
import QuranHeader from '../../components/QuranHeader/QuranHeader';
import QuranPlayer from '../../components/QuranPlayer/QuranPlayer';

import chevronLeft from '../../assets/icons/chevron-left.svg';
import chevronRight from '../../assets/icons/chevron-right.svg';

import './Home.scss';

const TOTAL_PAGES = 604;

const Home = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [verses, setVerses] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(chaptersData[0].id);
  const [showQuranHeader, setShowQuranHeader] = useState(false);
  const [inputPage, setInputPage] = useState(1);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [isInputError, setIsInputError] = useState(false);
  const [currentAyahId, setCurrentAyahId] = useState(null);

  const findVersesByPageNumber = useCallback((page) => {
    const versesInPage = verseByPage
      .filter((v) => v.page_number === page)
      .map((v) => v.id);

    const filteredVerses = Object.values(quranData).filter((v) =>
      versesInPage.includes(v.id)
    );

    const firstAyah = verseByPage.find((v) => v.page_number === page);
    if (firstAyah) setSelectedSurah(firstAyah.verse_key.split(':')[0]);

    setVerses(filteredVerses);
  }, []);

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= TOTAL_PAGES) {
      setCurrentPage(pageNumber);
      setInputPage(pageNumber);
      setIsInputError(false);
    } else {
      setIsInputError(true);
    }
  };

  const convertToPersianNumber = (num) =>
    num.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter') goToPage(Number(inputPage));
  };

  const toggleQuranHeader = () => setShowQuranHeader((prev) => !prev);

  useEffect(() => {
    findVersesByPageNumber(currentPage);
  }, [currentPage, findVersesByPageNumber]);

  return (
    <>
      <TopNavigation />
      <div className="quran-page-header">
        <div
          className="quran-page-header__surah-navigation"
          onClick={toggleQuranHeader}
        >
          {selectedSurah}
        </div>
        <div className="quran-page-header__page-navigation">
          <img
            src={chevronLeft}
            alt="left chevron"
            onClick={() => goToPage(currentPage - 1)}
          />
          {isEditingPage ? (
            <input
              type="number"
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onKeyDown={handlePageInputSubmit}
              onBlur={() => setIsEditingPage(false)}
              className={isInputError ? 'inputErrorStyle' : ''}
            />
          ) : (
            <span onClick={() => setIsEditingPage(true)}>
              {convertToPersianNumber(currentPage)}
            </span>
          )}
          <img
            src={chevronRight}
            alt="right chevron"
            onClick={() => goToPage(currentPage + 1)}
          />
        </div>
      </div>

      {showQuranHeader && (
        <QuranHeader
          chapters={chaptersData}
          setSelectedSurah={setSelectedSurah}
          setCurrentPage={goToPage}
          verseByPage={verseByPage}
        />
      )}

      <QuranTxt
        currentPage={currentPage}
        convertToPersianNumber={convertToPersianNumber}
        verses={verses}
      />

      <QuranPlayer
        currentAyahId={currentAyahId}
        setCurrentAyahId={setCurrentAyahId}
        ayahList={verses}
      />
    </>
  );
};

export default Home;
