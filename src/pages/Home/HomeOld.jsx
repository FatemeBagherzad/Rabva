import { useState, useEffect } from 'react';
import quranData from '../../assets/data/quran.json';
import chaptersData from '../../assets/data/quran_chapters.json';
import QuranTxt from '../../components/QuranTxt/QuranTxt';
import TopNavigation from '../../components/TopNavigation/TopNavigation';
import chevronDown from '../../assets/icons/chevron-down.svg';
import './HomeOld.scss';

const Home = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSurah, setSelectedSurah] = useState(chaptersData[0].id);
  const [verses, setVerses] = useState([]);
  const [surahPages, setSurahPages] = useState([]);
  const [inputPage, setInputPage] = useState(currentPage);

  useEffect(() => {
    const filteredVerses = Object.values(quranData).filter(
      (verse) => verse.surah === selectedSurah
    );
    setVerses(filteredVerses);

    // Extract unique pages for the selected Surah
    const pages = [...new Set(filteredVerses.map((verse) => verse.page))];
    setSurahPages(pages);

    if (pages.length > 0) {
      setCurrentPage(pages[0]);
      setInputPage(pages[0]);
    }
  }, [selectedSurah]);

  const goToPage = (pageNumber) => {
    if (pageNumber > 0) setCurrentPage(pageNumber);
  };

  const convertToPersianNumber = (num) => {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, (d) => persianNumbers[d]);
  };

  const handleSurahChange = (event) => {
    const selectedSurahId = parseInt(event.target.value);
    setSelectedSurah(selectedSurahId);
    const firstPageOfSurah = Object.values(quranData).find(
      (verse) => verse.surah === selectedSurahId
    );
    if (firstPageOfSurah) {
      setCurrentPage(firstPageOfSurah.page);
    }
  };
  const handlePageInputChange = (event) => {
    const value = event.target.value;
    if (/^\d*$/.test(value)) {
      // Ensure only numbers are allowed
      setInputPage(value);
    }
  };

  const handlePageSubmit = (event) => {
    event.preventDefault();
    const pageNumber = parseInt(inputPage);
    if (pageNumber > 0) {
      setCurrentPage(pageNumber);
      // setInputPage(''); // Clear input after submitting
    }
  };
  return (
    <>
      <TopNavigation />
      <div className="quran-page-header">
        <div className="quran-page-header__surah">
          <select
            value={selectedSurah}
            onChange={handleSurahChange}
            className="quran-page-header__surah-select"
          >
            {chaptersData.map((chapter) => (
              <option
                key={chapter.id}
                value={chapter.id}
                className="quran-page-header__surah-option"
              >
                {chapter.name} - {chapter.transliteration}
              </option>
            ))}
          </select>
          <img
            src={chevronDown}
            alt="chevron down"
            className="quran-page-header__surah-chevron-icon"
          />
        </div>
        <div className="quran-page-header__page-juz">
          {/* <span>Page: {convertToPersianNumber(currentPage)}</span> */}
          <form onSubmit={handlePageSubmit} className="page-input-form">
            <input
              type="text"
              value={inputPage}
              onChange={handlePageInputChange}
              placeholder="Enter page number"
            />
            <button type="submit" className="page-submit-button">
              Go
            </button>
          </form>
        </div>
      </div>
      <QuranTxt
        currentPage={currentPage}
        goToPage={goToPage}
        convertToPersianNumber={convertToPersianNumber}
        verses={Object.values(quranData).filter(
          (verse) => verse.page === currentPage
        )}
      />
    </>
  );
};
export default Home;
