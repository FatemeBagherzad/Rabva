import { useState } from 'react';
import useQuranData from '../../hooks/useQuranData';

import TopNavigation from '../../components/TopNavigation/TopNavigation';
import QuranHeader from '../../components/QuranHeader/QuranHeader';
import TranslationList from '../../components/TranslationList/TranslationList';
import QuranTxt from '../../components/QuranTxt/QuranTxt';
import QuranTxtByWord from '../../components/QuranTxtByWord/QuranTxtByWord';
import QuranPlayer from '../../components/QuranPlayer/QuranPlayer';

import './Home.scss';

const Home = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showQuranByWords, setShowQuranByWords] = useState(false);
  const [showTranslationList, setTranslationList] = useState(false);

  const {
    surahs,
    ayahPagesInfo,
    pages,
    quranData,
    quranByWordData,
    translationH,
    selectedSurah,
    setSelectedSurah,
  } = useQuranData(currentPage, showQuranByWords);

  if (!surahs || !pages || !ayahPagesInfo) {
    return <h3>Loading ...</h3>;
  }

  return (
    <>
      <TopNavigation />
      <div className="quran-page">
        <QuranHeader
          surahs={surahs}
          ayahPagesInfo={ayahPagesInfo}
          selectedSurah={selectedSurah}
          showQuranByWords={showQuranByWords}
          showTranslationList={showTranslationList}
          setShowQuranByWords={setShowQuranByWords}
          setTranslationList={setTranslationList}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          setSelectedSurah={setSelectedSurah}
        />

        {showTranslationList && <TranslationList />}

        <div className="container quran-page__quran-txt">
          {!showQuranByWords ? (
            <QuranTxt quranData={quranData} surahs={surahs} />
          ) : (
            <QuranTxtByWord
              quranData={quranByWordData}
              translationH={translationH}
              surahs={surahs}
            />
          )}
        </div>

        <QuranPlayer
          quranData={!showQuranByWords ? quranData : quranByWordData}
        />
      </div>
    </>
  );
};

export default Home;
