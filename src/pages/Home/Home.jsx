import { useState, useEffect } from 'react';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import { useSwipeable } from 'react-swipeable';
import useQuranData from '../../hooks/useQuranData';
import { useAuth } from '../../context/AuthContext';

import TopNavigation from '../../components/TopNavigation/TopNavigation';
import QuranHeader from '../../components/QuranHeader/QuranHeader';
import QuranTxt from '../../components/QuranTxt/QuranTxt';
import QuranTxtByWord from '../../components/QuranTxtByWord/QuranTxtByWord';
import QuranPlayer from '../../components/QuranPlayer/QuranPlayer';
import SearchResult from '../../components/SearchResult/SearchResult';
import UserProfileOverlay from '../../components/UserProfileOverlay/UserProfileOverlay';
import AyahMapCanvas from '../../components/AyahMapCanvas/AyahMapCanvas';

import './Home.scss';

const Home = () => {
  const { preferences, isLoggedIn } = useAuth();
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
  const [rootPage, setRootPage] = useState(1);
  const [language, setLanguage] = useLocalStorageState('fa', 'language');
  const [nextPageCount, setNextPageCount] = useState(1);
  const [requestedSurah, setRequestedSurah] = useState(null);
  const [showUserOverlay, setShowUserOverlay] = useState(false);
  const [isMapMode, setIsMapMode] = useState(false);

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
    translationIsRtl,
    ayahByRoot,
    rootPagination,
    roots,
  } = useQuranData(
    currentPage,
    showQuranByWords,
    language,
    ayahTranslator,
    selectedRoot,
    rootPage,
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

  useEffect(() => {
    setRootPage(1);
  }, [selectedRoot]);

  const quranPreviewStyles = {
    '--quran-font-family': preferences?.quran_font_family || 'hafs-django',
    '--quran-font-size': `${preferences?.quran_font_size || 2.5}rem`,
    '--translation-font-family': preferences?.translation_font_family || 'inter',
    '--translation-font-size': `${preferences?.translation_font_size || 1.2}rem`,
    '--quran-translation-gap': `${preferences?.quran_translation_gap || 1}rem`,
    '--quran-line-height': preferences?.line_height_quran || 2,
    '--translation-line-height': preferences?.line_height_translation || 1.5,
  };

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
        selectedRoot={selectedRoot}
        selectedRootCount={rootPagination?.total_count || 0}
        preferences={preferences}
        onUserIconClick={() => setShowUserOverlay((prev) => !prev)}
        isMapMode={isMapMode}
        onToggleMapMode={() => {
          if (!isLoggedIn) return;
          setIsMapMode((prev) => !prev);
          setShowSearchRes(false);
        }}
      />
      {!isMapMode && showQuran && (
        <div className="quran-page" style={quranPreviewStyles}>
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
                isTranslationRtl={translationIsRtl}
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
      {!isMapMode && showSearchRes && !showQuran && (
        <SearchResult
          ayahByRoot={ayahByRoot}
          rootPagination={rootPagination}
          setRootPage={setRootPage}
          surahs={surahs}
          preferences={preferences}
        />
      )}

      {isMapMode && isLoggedIn && <AyahMapCanvas preferences={preferences} surahs={surahs} />}

      {!isMapMode && (
        <QuranPlayer
          quranData={!showQuranByWords ? quranData : quranByWordData}
        />
      )}

      <UserProfileOverlay
        isOpen={showUserOverlay}
        onClose={() => setShowUserOverlay(false)}
        languages={languages}
        setLanguage={setLanguage}
        language={language}
      />
    </>
  );
};

export default Home;
