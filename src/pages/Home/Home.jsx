import { useState, useEffect } from 'react';
import {
  fetchQuran,
  fetchSurahNames,
  fetchPagesInfo,
  fetchAyahPagesInfo,
} from '../../services/mainService';

import TopNavigation from '../../components/TopNavigation/TopNavigation';
import QuranPlayer from '../../components/QuranPlayer/QuranPlayer';

import './Home.scss';
import QuranTxt from '../../components/QuranTxt/QuranTxt';

const Home = () => {
  const [quranData, setQuranData] = useState([]);
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState();
  const [ayahPagesInfo, setAyahPagesInfo] = useState([]);
  const [pagesInfo, setPagesInfo] = useState([]);
  const [currentPage, setCurrentPage] = useState(56);

  useEffect(() => {
    fetchSurahNames()
      .then((res) => {
        setSurahs(res.data.surahs);
        // console.log('*************Surahs', res.data.surahs);
      })
      .catch((err) => console.error('Error fetching Surah names:', err));

    fetchAyahPagesInfo()
      .then((res) => {
        setAyahPagesInfo(res.data.ayah_page);
        // console.log('*************ayahpages info', res.data.ayah_page);
      })
      .catch((err) => console.error('Error fetching ayah pages info'));

    fetchPagesInfo()
      .then((res) => {
        setPagesInfo(res.data.pages);
        // console.log('**********pages info', res.data.pages);
      })
      .catch((err) => console.error('Error fetching pages info'));
  }, []);

  useEffect(() => {
    if (!pagesInfo || !currentPage || !pagesInfo[currentPage] || !surahs)
      return;
    const [
      surahNumberFirstOfPage,
      ayahNumberFirstOfPage,
      surahNumberEndOfPage,
      ayahNumberEndOfPage,
    ] = pagesInfo[currentPage];

    fetchQuran({
      surah_number: surahNumberFirstOfPage,
      ayah_number: ayahNumberFirstOfPage,
      per_page: 50,
      page: 1,
    })
      .then((res) => {
        const pageBeforeTrim = res.data.data; // object: { [surah]: { [ayah]: text } }
        const pageAfterTrim = {};

        for (
          let surah = surahNumberFirstOfPage;
          surah <= surahNumberEndOfPage;
          surah++
        ) {
          const ayahs = pageBeforeTrim[surah];
          if (!ayahs) continue;

          const trimmedAyahs = {};
          const startAyah =
            surah === surahNumberFirstOfPage ? ayahNumberFirstOfPage : 1;
          const endAyah =
            surah === surahNumberEndOfPage ? ayahNumberEndOfPage : Infinity;

          for (const ayahKey in ayahs) {
            const ayahNum = parseInt(ayahKey, 10);
            if (ayahNum >= startAyah && ayahNum <= endAyah) {
              trimmedAyahs[ayahKey] = ayahs[ayahKey];
            }
          }

          if (Object.keys(trimmedAyahs).length > 0) {
            pageAfterTrim[surah] = trimmedAyahs;
          }
        }

        setQuranData(pageAfterTrim);
        setSelectedSurah(surahs[surahNumberFirstOfPage][0]);
      })
      .catch((err) => console.error('Error fetching Quran:', err));
  }, [currentPage, pagesInfo, surahs]);

  if (!surahs && !ayahPagesInfo && !pagesInfo && !currentPage && !quranData)
    return <h3>Loading ...</h3>;

  return (
    <>
      <TopNavigation />

      <div className="container">
        <QuranTxt quranData={quranData} selectedSurah={selectedSurah} />
        <QuranPlayer />
      </div>
    </>
  );
};

export default Home;
