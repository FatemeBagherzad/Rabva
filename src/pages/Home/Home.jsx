import { useState } from 'react';
import useQuranData from '../../hooks/useQuranData';

import TopNavigation from '../../components/TopNavigation/TopNavigation';
import QuranHeader from '../../components/QuranHeader/QuranHeader';
import QuranTxt from '../../components/QuranTxt/QuranTxt';
import QuranTxtByWord from '../../components/QuranTxtByWord/QuranTxtByWord';
import QuranPlayer from '../../components/QuranPlayer/QuranPlayer';
import SearchResult from '../../components/SearchResult/SearchResult';

import './Home.scss';

const Home = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showQuran, setShowQuran] = useState(true);
  const [showQuranByWords, setShowQuranByWords] = useState(false);
  const [showTranslationList, setShowTranslationList] = useState(false);
  const [showTranslationByAyah, setShowTranslationByAyah] = useState(false);
  const [ayahTranslator, setAyahTranslator] = useState('');
  const [rtlDirection, setRtlDirection] = useState(true);
  const [selectedAyah, setSelectedAyah] = useState(null);
  const [showSearchRes, setShowSearchRes] = useState(false);
  const [selectedRoot, setSelectedRoot] = useState(null);

  const [language, setLanguage] = useState('fa');

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
    selectedRoot
  );

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
          />

          <div className="container quran-page__quran-txt">
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
