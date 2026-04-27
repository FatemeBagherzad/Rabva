import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
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
import ResearchCanvas from '../../components/ResearchCanvas/ResearchCanvas';
import ResearchHub from '../../components/ResearchHub/ResearchHub';
import ResearchCreate from '../../components/ResearchCreate/ResearchCreate';
import LoadingDots from '../../components/LoadingDots/LoadingDots';

import './Home.scss';

const ResearchCanvasRoute = ({ preferences, surahs }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <ResearchCanvas
      preferences={preferences}
      surahs={surahs}
      researchId={id}
      onBackToHub={() => navigate('/research')}
    />
  );
};

const Home = () => {
  const { preferences, isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isResearchMode = location.pathname.startsWith('/research');
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
    isRootLoading,
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

  const handleRootSearch = (root) => {
    setSelectedRoot(root);
    setShowQuran(false);
    setShowSearchRes(true);
    if (isResearchMode) navigate('/');
  };

  const handleToggleResearchMode = () => {
    if (!isLoggedIn) return;

    if (isResearchMode) {
      navigate('/');
      return;
    }

    setShowSearchRes(false);
    setSelectedRoot(null);
    setRootPage(1);
    navigate('/research');
  };

  const quranPreviewStyles = {
    '--quran-font-family': preferences?.quran_font_family || 'hafs-django',
    '--quran-font-size': `${preferences?.quran_font_size || 2.5}rem`,
    '--translation-font-family': preferences?.translation_font_family || 'inter',
    '--translation-font-size': `${preferences?.translation_font_size || 1.2}rem`,
    '--menu-font-size': `${preferences?.menu_font_size || 1.4}rem`,
    '--quran-translation-gap': `${preferences?.quran_translation_gap || 1}rem`,
    '--quran-line-height': preferences?.line_height_quran || 2,
    '--translation-line-height': preferences?.line_height_translation || 1.5,
  };

  if (!surahs || !pages || !ayahPagesInfo) {
    return <LoadingDots />;
  }
  return (
    <div style={quranPreviewStyles}>
      <TopNavigation
        languages={languages}
        language={language}
        setLanguage={setLanguage}
        setRtlDirection={setRtlDirection}
        setShowQuranByWords={setShowQuranByWords}
        setShowTranslationByAyah={setShowTranslationByAyah}
        setShowSearchRes={setShowSearchRes}
        setShowQuran={setShowQuran}
        onRootSearch={handleRootSearch}
        roots={roots}
        selectedRoot={selectedRoot}
        selectedRootCount={rootPagination?.total_count || 0}
        preferences={preferences}
        onUserIconClick={() => setShowUserOverlay((prev) => !prev)}
        isResearchMode={isResearchMode}
        onToggleResearchMode={handleToggleResearchMode}
      />
      {!isResearchMode && showQuran && (
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
      {!isResearchMode && showSearchRes && !showQuran && (
        <SearchResult
          ayahByRoot={ayahByRoot}
          isRootLoading={isRootLoading}
          rootPagination={rootPagination}
          setRootPage={setRootPage}
          surahs={surahs}
          preferences={preferences}
        />
      )}

      {isResearchMode && !isLoggedIn && <Navigate to="/" replace />}

      {isResearchMode && isLoggedIn && (
        <Routes>
          <Route path="/research" element={<ResearchHub />} />
          <Route path="/research/new" element={<ResearchCreate />} />
          <Route
            path="/research/:id"
            element={<ResearchCanvasRoute preferences={preferences} surahs={surahs} />}
          />
          <Route path="/research/*" element={<Navigate to="/research" replace />} />
        </Routes>
      )}

      {!isResearchMode && (
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
    </div>
  );
};

export default Home;
