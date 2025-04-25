import { useState, useEffect } from 'react';
import {
  fetchQuran,
  fetchSurahNames,
  fetchPagesInfo,
  fetchAyahPagesInfo,
} from '../../services/mainService';
import { fetchQuranWordByWord } from '../../services/wordService';

import convertToPersianNumber from '../../utils/convertToPersianNumber';
import { useOutsideClick } from '../../hooks/useOutsideClick';

import TopNavigation from '../../components/TopNavigation/TopNavigation';
import QuranHeader from '../../components/QuranHeader/QuranHeader';
import QuranTxt from '../../components/QuranTxt/QuranTxt';
import QuranTxtByWord from '../../components/QuranTxtByWord/QuranTxtByWord';
import QuranPlayer from '../../components/QuranPlayer/QuranPlayer';

import chevronLeft from '../../assets/icons/chevron-left.svg';
import chevronRight from '../../assets/icons/chevron-right.svg';

import './Home.scss';

const Home = () => {
  const [quranData, setQuranData] = useState([]);
  const [quranByWordData, setQuranByWordData] = useState([]);
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState();
  const [ayahPagesInfo, setAyahPagesInfo] = useState([]);
  const [pagesInfo, setPagesInfo] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [showQuranByWords, setShowQuranByWords] = useState(false);
  const [showQuranHeader, setShowQuranHeader] = useState(false);
  const [inputPage, setInputPage] = useState(1);
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [isInputError, setIsInputError] = useState(false);

  const containerRef = useOutsideClick(() => setShowQuranHeader(false));

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
  }, [currentPage, pagesInfo, surahs, showQuranByWords]);

  const trimQuranData = (data, startSurah, startAyah, endSurah, endAyah) => {
    const trimmedData = {};

    for (let surah = startSurah; surah <= endSurah; surah++) {
      const ayahs = data[surah];
      if (!ayahs) continue;

      const start = surah === startSurah ? startAyah : 1;
      const end = surah === endSurah ? endAyah : Infinity;

      const filteredAyahs = Object.entries(ayahs)
        .filter(([key]) => {
          const num = parseInt(key);
          return num >= start && num <= end;
        })
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

      if (Object.keys(filteredAyahs).length) trimmedData[surah] = filteredAyahs;
    }

    return trimmedData;
  };

  const fetchQuranPageData = async (pageNumber) => {
    const [startSurah, startAyah, endSurah, endAyah] = pagesInfo[pageNumber];

    try {
      if (!showQuranByWords) {
        const { data } = await fetchQuran({
          surah_number: startSurah,
          ayah_number: startAyah,
          per_page: 50,
          page: 1,
        });

        const trimmedData = trimQuranData(
          data.data,
          startSurah,
          startAyah,
          endSurah,
          endAyah
        );
        setQuranData(trimmedData); // ← only for regular Quran text
      } else {
        const { data } = await fetchQuranWordByWord({
          surah_number: startSurah,
          ayah_number: startAyah,
          per_page: 500,
          page: 1,
        });

        const trimmedData = trimQuranData(
          data.data,
          startSurah,
          startAyah,
          endSurah,
          endAyah
        );
        setQuranByWordData(trimmedData); // ← only for word-by-word
      }

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
      // setInputPage('');
    }
  };

  const toggleQuranTxt = () => setShowQuranByWords((prev) => !prev);
  const toggleQuranHeader = () => setShowQuranHeader((prev) => !prev);

  if (!surahs && !ayahPagesInfo && !pagesInfo && !currentPage && !quranData)
    return <h3>Loading ...</h3>;

  return (
    <>
      <TopNavigation />

      <div ref={containerRef}>
        <div className="quran-page-header container">
          <div
            className="quran-page-header__chapter-navigation"
            onClick={toggleQuranHeader}
          >
            {selectedSurah}
          </div>

          <div
            className={`quran-page-header__by-words ${
              showQuranByWords ? 'quran-page-header__by-words-on' : ''
            }`}
            onClick={toggleQuranTxt}
          >
            کلمه به کلمه
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
                className={`quran-page-header__input ${
                  isInputError ? 'inputErrorStyle' : ''
                }`}
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
        )}{' '}
      </div>

      <div className="container">
        {!showQuranByWords && (
          <QuranTxt quranData={quranData} surahs={surahs} />
        )}
        {showQuranByWords && (
          <QuranTxtByWord quranData={quranByWordData} surahs={surahs} />
        )}
        <QuranPlayer />
      </div>
    </>
  );
};

export default Home;
