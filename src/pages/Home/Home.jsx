import { useState, useEffect } from 'react';

import quranData from '../../assets/data/quran.json';
import chaptersData from '../../assets/data/quran_chapters.json';
import verseByPage from '../../assets/data/quran-verse-number-by-page.json';

import QuranTxt from '../../components/QuranTxt/QuranTxt';
import TopNavigation from '../../components/TopNavigation/TopNavigation';
import QuranHeader from '../../components/QuranHeader/QuranHeader';
import chevronLeft from '../../assets/icons/chevron-left.svg';
import chevronRight from '../../assets/icons/chevron-right.svg';

import './Home.scss';

const Home = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [verses, setVerses] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState(chaptersData[0].id);
  const [showQuranHeader, setShowQuranHeader] = useState(false);
  const [inputPage, setInputPage] = useState(currentPage);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [isInputError, setIsInputError] = useState(false);

  const findVersesByPageNumber = (page) => {
    const versesIdsInOnePage = verseByPage
      .filter((verse) => verse.page_number === page)
      .map((verse) => verse.id);

    const filteredVerses = Object.values(quranData).filter((verse) =>
      versesIdsInOnePage.includes(verse.id)
    );

    const firstAyahInPage = verseByPage.find(
      (verse) => verse.page_number === page
    );
    if (firstAyahInPage) {
      setSelectedSurah(firstAyahInPage.verse_key.split(':')[0]);
    }
    setVerses(filteredVerses);
  };

  const goToPage = (pageNumber) => {
    if (pageNumber > 0) setCurrentPage(pageNumber);
  };

  const convertToPersianNumber = (num) => {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, (d) => persianNumbers[d]);
  };

  const toggleQuranHeader = () => {
    setShowQuranHeader((prevState) => !prevState);
  };

  const handlePageInputChange = (e) => {
    const value = e.target.value;
    setInputPage(value);
  };

  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter') {
      const pageNumber = Number(inputPage);
      if (0 < pageNumber && pageNumber <= 604) {
        goToPage(pageNumber);
        setIsInputError(false);
        setIsEditingPage(false);
      } else {
        setIsInputError(true);
        setInputPage(currentPage);
      }
    }
  };

  useEffect(() => {
    findVersesByPageNumber(currentPage);
  }, [currentPage]);

  if (!currentPage && !verses) {
    return <p>Loading ...</p>;
  }

  return (
    <>
      <TopNavigation />

      <div className="quran-page-header">
        <div onClick={toggleQuranHeader}>{selectedSurah}</div>
        <div className="quran-page-header__navigation">
          <img
            src={chevronLeft}
            alt="left chevron icon"
            onClick={() => goToPage(currentPage - 1)}
          />
          {isEditingPage ? (
            <input
              type="number"
              value={inputPage}
              onChange={handlePageInputChange}
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
            alt="right chevron icon"
            onClick={() => goToPage(currentPage + 1)}
          />
        </div>
      </div>

      {showQuranHeader && (
        <QuranHeader
          chapters={chaptersData}
          setSelectedSurah={setSelectedSurah}
          setCurrentPage={setCurrentPage}
          verseByPage={verseByPage}
        />
      )}

      <QuranTxt
        currentPage={currentPage}
        goToPage={goToPage}
        convertToPersianNumber={convertToPersianNumber}
        verses={verses}
      />
    </>
  );
};
export default Home;
