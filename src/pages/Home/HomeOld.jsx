import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import QuranTxtOld from '../../components/QuranTxt/QuranTxtOld';
import QuranTxtByWord from '../../components/QuranTxtByWord/QuranTxtByWord';
import TopNavigation from '../../components/TopNavigation/TopNavigation';
import QuranHeaderOld from '../../components/QuranHeader/QuranHeaderOld';
import QuranPlayer from '../../components/QuranPlayer/QuranPlayer';

import chevronLeft from '../../assets/icons/chevron-left.svg';
import chevronRight from '../../assets/icons/chevron-right.svg';

import './Home.scss';

const BACKEND_URL = import.meta.env.VITE_BACKEND_NODEJS_URL;
const quranMain_Url = `${BACKEND_URL}/api/v1/quran/quranMain`;
const quranByWords_MH_Url = `${BACKEND_URL}/api/v1/quran/quranTranslationMehdiMiryahya`;
const quranChapters_Url = `${BACKEND_URL}/api/v1/quran/chapters`;
const TOTAL_PAGES = 604;

const Home = () => {
  const [quranMain, setQuranMain] = useState(null);
  const [quranByWordsMH, setQuranByWordsMH] = useState(null);
  const [quranChapters, setQuranChapters] = useState(null);

  const [verses, setVerses] = useState([]);
  const [words, setWords] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [currentVerseId, setCurrentVerseId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showQuranHeader, setShowQuranHeader] = useState(false);
  const [inputPage, setInputPage] = useState(1);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [isInputError, setIsInputError] = useState(false);

  useEffect(() => {
    const getQuran = async () => {
      try {
        const [quranMainData, quranByWordsMHData, quranChaptersData] =
          await Promise.all([
            axios.get(quranMain_Url),
            axios.get(quranByWords_MH_Url),
            axios.get(quranChapters_Url),
          ]);
        setQuranMain(quranMainData.data);
        setQuranByWordsMH(quranByWordsMHData.data);
        setQuranChapters(quranChaptersData.data);
      } catch (err) {
        console.log(err);
      }
    };
    getQuran();
  }, []);

  const findVersesByPageNumber = useCallback(
    (page) => {
      const versesInPage = quranMain.filter((v) => v.page_id === page);
      setVerses(versesInPage);
      const wordsInPage = quranByWordsMH.filter((w) => w.page_id === page);
      setWords(wordsInPage);

      if (versesInPage.length > 0) {
        const firstVerse = versesInPage[0];
        const chapter = quranChapters.find(
          (ch) => ch.id === firstVerse.chapter_id
        );
        setSelectedChapter(chapter ? chapter.name : '');
      }
    },
    [quranMain, quranChapters]
  );

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
    if (quranMain) {
      findVersesByPageNumber(currentPage);
    }
  }, [currentPage, findVersesByPageNumber, quranMain]);

  if (!quranMain || !quranByWordsMH || !quranChapters || !quranByWordsMH) {
    return <h3>Loading ...</h3>;
  }

  return (
    <>
      <TopNavigation />

      <div className="quran-page-header container">
        <div
          className="quran-page-header__chapter-navigation"
          onClick={toggleQuranHeader}
        >
          {selectedChapter}
        </div>

        <div className="quran-page-header__page-navigation">
          <img
            src={chevronLeft}
            alt="left chevron"
            onClick={() => goToPage(currentPage - 1)}
            className="quran-page-header__chevron"
          />
          {isEditingPage ? (
            <input
              type="number"
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onKeyDown={handlePageInputSubmit}
              onBlur={() => setIsEditingPage(false)}
              className={
                isInputError ? 'inputErrorStyle' : 'quran-page-header__input '
              }
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
            className="quran-page-header__chevron"
          />
        </div>
      </div>

      {showQuranHeader && (
        <QuranHeaderOld
          chapters={quranChapters}
          setSelectedChapter={setSelectedChapter}
          setCurrentPage={goToPage}
          verseByPage={quranMain}
          convertToPersianNumber={convertToPersianNumber}
        />
      )}

      <div className="container">
        <QuranTxtOld
          currentPage={currentPage}
          convertToPersianNumber={convertToPersianNumber}
          ayahs={verses}
          selectedSurah={selectedChapter}
        />

        {/* <QuranTxtByWord
          currentPage={currentPage}
          convertToPersianNumber={convertToPersianNumber}
          verses={verses}
          selectedChapter={selectedChapter}
          words={words}
        /> */}

        <QuranPlayer
          currentVerseId={currentVerseId}
          setCurrentVerseId={setCurrentVerseId}
          verseList={verses}
        />
      </div>
    </>
  );
};

export default Home;
