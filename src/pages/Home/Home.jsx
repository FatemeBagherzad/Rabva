import { useState, useEffect } from 'react';
import {
  fetchQuran,
  fetchSurahNames,
  fetchPagesInfo,
  fetchAyahPagesInfo,
} from '../../services/mainService';
import convertToPersianNumber from '../../utils/convertToPersianNumber';

import TopNavigation from '../../components/TopNavigation/TopNavigation';
import QuranHeader from '../../components/QuranHeader/QuranHeader';
import QuranTxt from '../../components/QuranTxt/QuranTxt';
import QuranPlayer from '../../components/QuranPlayer/QuranPlayer';

import chevronLeft from '../../assets/icons/chevron-left.svg';
import chevronRight from '../../assets/icons/chevron-right.svg';

import './Home.scss';

const Home = () => {
  const [quranData, setQuranData] = useState([]);
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState();
  const [ayahPagesInfo, setAyahPagesInfo] = useState([]);
  const [pagesInfo, setPagesInfo] = useState([]);
  const [currentPage, setCurrentPage] = useState(5);

  const [showQuranHeader, setShowQuranHeader] = useState(false);
  const [inputPage, setInputPage] = useState(1);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [isInputError, setIsInputError] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [{ data: surahData }, { data: ayahData }, { data: pageData }] =
          await Promise.all([
            fetchSurahNames(),
            fetchAyahPagesInfo(),
            fetchPagesInfo(),
          ]);

        setSurahs(surahData.surahs);
        setAyahPagesInfo(ayahData.ayah_page);
        setPagesInfo(pageData.pages);
      } catch (err) {
        console.error('Error fetching initial Quran data:', err);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (
      !pagesInfo ||
      !currentPage ||
      !pagesInfo[currentPage] ||
      !surahs ||
      !ayahPagesInfo
    )
      return;

    fetchQuranPageData(currentPage);
  }, [currentPage, pagesInfo, surahs]);

  const fetchQuranPageData = async (pageNumber) => {
    const [startSurah, startAyah, endSurah, endAyah] = pagesInfo[pageNumber];

    try {
      const { data } = await fetchQuran({
        surah_number: startSurah,
        ayah_number: startAyah,
        per_page: 50,
        page: 1,
      });

      const trimmedData = {};
      for (let surah = startSurah; surah <= endSurah; surah++) {
        const ayahs = data.data[surah];
        if (!ayahs) continue;

        const start = surah === startSurah ? startAyah : 1;
        const end = surah === endSurah ? endAyah : Infinity;

        const filteredAyahs = Object.entries(ayahs)
          .filter(([key]) => {
            const num = parseInt(key);
            return num >= start && num <= end;
          })
          .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

        if (Object.keys(filteredAyahs).length)
          trimmedData[surah] = filteredAyahs;
      }

      setQuranData(trimmedData);
      setSelectedSurah(surahs[startSurah][0]);
    } catch (err) {
      console.error('Error fetching Quran page:', err);
    }
  };

  const goToPage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > 604) {
      setIsInputError(true);
      return;
    }
    setCurrentPage(pageNumber);
    setInputPage(pageNumber);
    setIsInputError(false);
  };

  const handlePageInputSubmit = (e) => {
    if (e.key === 'Enter') {
      goToPage(Number(inputPage));
      setInputPage('');
      e.target.value = '';
    }
  };

  const toggleQuranHeader = () => setShowQuranHeader((prev) => !prev);

  if (!surahs && !ayahPagesInfo && !pagesInfo && !currentPage && !quranData)
    return <h3>Loading ...</h3>;

  return (
    <>
      <TopNavigation />

      <div className="quran-page-header container">
        <div
          className="quran-page-header__chapter-navigation"
          onClick={toggleQuranHeader}
        >
          {selectedSurah}
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
        <QuranHeader
          surahs={surahs}
          setSelectedSurah={setSelectedSurah}
          setCurrentPage={goToPage}
          ayahPagesInfo={ayahPagesInfo}
          fetchQuranPageData={fetchQuranPageData}
        />
      )}

      <div className="container">
        <QuranTxt quranData={quranData} surahs={surahs} />
        <QuranPlayer />
      </div>
    </>
  );
};

export default Home;
