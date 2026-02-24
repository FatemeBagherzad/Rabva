import { useState, useEffect } from 'react';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import { useSwipeable } from 'react-swipeable';
import useQuranData from '../../hooks/useQuranData';

import TopNavigation from '../../components/TopNavigation/TopNavigation';
import QuranHeader from '../../components/QuranHeader/QuranHeader';
import QuranTxt from '../../components/QuranTxt/QuranTxt';
import QuranTxtByWord from '../../components/QuranTxtByWord/QuranTxtByWord';
import QuranPlayer from '../../components/QuranPlayer/QuranPlayer';
import SearchResult from '../../components/SearchResult/SearchResult';

import './Home.scss';

const Home = () => {
  const [storedPage, setStoredPage] = useLocalStorageState(1, 'currentPage');
  const safeStoredPage = Number(storedPage);
  const [currentPage, setCurrentPage] = useState(
    Number.isFinite(safeStoredPage) &&
      safeStoredPage >= 1 &&
      safeStoredPage <= 604
      ? safeStoredPage
      : 1,
  );
  const [showQuran, setShowQuran] = useState(true);
  const [showQuranByWords, setShowQuranByWords] = useLocalStorageState(
    false,
    'showQuranByWords',
  );
  const [showTranslationList, setShowTranslationList] = useState(false);
  const [showTranslationByAyah, setShowTranslationByAyah] =
    useLocalStorageState(false, 'showTranslationByAyah');
  const [ayahTranslator, setAyahTranslator] = useLocalStorageState(
    '',
    'ayahTranslator',
  );
  const [rtlDirection, setRtlDirection] = useLocalStorageState(
    true,
    'rtlDirection',
  );
  const [selectedAyah, setSelectedAyah] = useState(null);
  const [showSearchRes, setShowSearchRes] = useState(false);
  const [selectedRoot, setSelectedRoot] = useState(null);
  const [language, setLanguage] = useLocalStorageState('fa', 'language');
  const [nextPageCount, setNextPageCount] = useState(1);
  const [requestedSurah, setRequestedSurah] = useState(null);

  const {
    surahs,
    ayahPagesInfo,
    pages,
    languages,
    quranData,
    quranByWordData,
    translationH,
    selectedSurah,
    setSelectedSurah,
    selectedLangTranslators,
    translationByAyah,
    ayahByRoot,
    roots,
  } = useQuranData(
    currentPage,
    showQuranByWords,
    language,
    ayahTranslator,
    selectedRoot,
    setNextPageCount,
    requestedSurah,
  );

  const [flipClass, setFlipClass] = useState(null);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      setCurrentPage((prev) => {
        const newPage = Math.max(1, prev - nextPageCount);
        return newPage < 1 ? 1 : newPage;
      });
      setFlipClass('right');
      setTimeout(() => setFlipClass(null), 600);
    },
    onSwipedRight: () => {
      setCurrentPage((prev) => {
        const newPage = Math.min(604, prev + nextPageCount);
        return newPage > 604 ? 604 : newPage;
      });
      setFlipClass('left');
      setTimeout(() => setFlipClass(null), 600);
    },
    preventDefaultTouchmoveEvent: true,
    trackTouch: true,
    trackMouse: false,
  });

  useEffect(() => {
    const handleResize = () => {
      setCurrentPage((prev) => prev);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setStoredPage(currentPage);
  }, [currentPage, setStoredPage]);

  if (!surahs || !pages || !ayahPagesInfo) {
    return <h3>Loading ...</h3>;
  }
  return (
    <>
      <TopNavigation
        languages={languages}
        language={language}
        setLanguage={setLanguage}
        setRtlDirection={setRtlDirection}
        setShowQuranByWords={setShowQuranByWords}
        setShowTranslationByAyah={setShowTranslationByAyah}
        setShowSearchRes={setShowSearchRes}
        setShowQuran={setShowQuran}
        setSelectedRoot={setSelectedRoot}
        roots={roots}
      />
      {showQuran && (
        <div className="quran-page">
          <QuranHeader
            surahs={surahs}
            ayahPagesInfo={ayahPagesInfo}
            selectedSurah={selectedSurah}
            setSelectedSurah={setSelectedSurah}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            showQuranByWords={showQuranByWords}
            setShowQuranByWords={setShowQuranByWords}
            showTranslationByAyah={showTranslationByAyah}
            setShowTranslationByAyah={setShowTranslationByAyah}
            showTranslationList={showTranslationList}
            setShowTranslationList={setShowTranslationList}
            selectedLangTranslators={selectedLangTranslators}
            setAyahTranslator={setAyahTranslator}
            language={language}
            setSelectedAyah={setSelectedAyah}
            rtlDirection={rtlDirection}
            nextPageCount={nextPageCount}
            setRequestedSurah={setRequestedSurah}
          />

          <div className="container quran-page__quran-txt" {...handlers}>
            {!showQuranByWords ? (
              <QuranTxt
                quranData={quranData}
                surahs={surahs}
                translationByAyah={translationByAyah}
                showTranslationByAyah={showTranslationByAyah}
                rtlDirection={rtlDirection}
                selectedAyah={selectedAyah}
                setSelectedAyah={setSelectedAyah}
                language={language}
                setCurrentPage={setCurrentPage}
                flipClass={flipClass}
              />
            ) : (
              <QuranTxtByWord
                quranData={quranByWordData}
                translationH={translationH}
                surahs={surahs}
                selectedAyah={selectedAyah}
                setSelectedAyah={setSelectedAyah}
              />
            )}
          </div>
        </div>
      )}
      {showSearchRes && !showQuran && (
        <SearchResult
          ayahByRoot={ayahByRoot}
          selectedRoot={selectedRoot}
          surahs={surahs}
        />
      )}

      <QuranPlayer
        quranData={!showQuranByWords ? quranData : quranByWordData}
      />
    </>
  );
};

export default Home;
