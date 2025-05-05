// hooks/useQuranData.js
import { useState, useEffect } from 'react';
import {
  fetchQuran,
  fetchSurahNames,
  fetchPagesInfo,
  fetchAyahPagesInfo,
} from '../services/mainService';
import { fetchQuranWordByWord } from '../services/wordService';
import {
  fetchQuranTranslationH,
  fetchQuranTranslationUniqueH,
} from '../services/translationService';

const useQuranData = (currentPage, showQuranByWords, pagesInfo) => {
  const [surahs, setSurahs] = useState([]);
  const [ayahPagesInfo, setAyahPagesInfo] = useState([]);
  const [pages, setPages] = useState([]);
  const [quranData, setQuranData] = useState([]);
  const [quranByWordData, setQuranByWordData] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState('');
  const [translationH, setTranslationH] = useState([]);
  const [visiblePages, setVisiblePages] = useState([currentPage]);

  const trimQuranData = (data, startSurah, startAyah, endSurah, endAyah) => {
    const trimmed = {};
    for (let s = startSurah; s <= endSurah; s++) {
      const ayahs = data[s];
      if (!ayahs) continue;
      const filtered = Object.entries(ayahs)
        .filter(([k]) => {
          const n = +k;
          return (
            n >= (s === startSurah ? startAyah : 1) &&
            n <= (s === endSurah ? endAyah : Infinity)
          );
        })
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
      if (Object.keys(filtered).length) trimmed[s] = filtered;
    }
    return trimmed;
  };
  const getPageRange = (pages, currentPage, showQuranByWords) => {
    if (!pages[currentPage]) return null;

    const isLargeScreen = window.innerWidth >= 1200;
    const extraPages = showQuranByWords ? 15 : 10;
    const [startSurah, startAyah] = pages[currentPage];
    let endSurah, endAyah;

    if (isLargeScreen && pages[currentPage + extraPages]) {
      [endSurah, endAyah] = pages[currentPage + extraPages];
    } else {
      [, , endSurah, endAyah] = pages[currentPage];
    }

    return { startSurah, startAyah, endSurah, endAyah };
  };

  useEffect(() => {
    const loadInitial = async () => {
      const [{ data: surahs }, { data: ayahs }, { data: pages }] =
        await Promise.all([
          fetchSurahNames(),
          fetchAyahPagesInfo(),
          fetchPagesInfo(),
        ]);
      setSurahs(surahs.surahs);
      setAyahPagesInfo(ayahs.ayah_page);
      setPages(pages.pages);
    };
    loadInitial();
  }, []);

  useEffect(() => {
    if (!pages[currentPage]) return;
    // const [startSurah, startAyah, endSurah, endAyah] = pages[currentPage];

    const pageRange = getPageRange(pages, currentPage, showQuranByWords);
    if (!pageRange) return;
    const { startSurah, startAyah, endSurah, endAyah } = pageRange;

    const fetchPage = async () => {
      try {
        const fetchFn = showQuranByWords ? fetchQuranWordByWord : fetchQuran;
        const { data } = await fetchFn({
          surah_number: startSurah,
          ayah_number: startAyah,
          per_page: 500,
          page: 1,
        });
        const trimmed = trimQuranData(
          data.data,
          startSurah,
          startAyah,
          endSurah,
          endAyah
        );
        showQuranByWords ? setQuranByWordData(trimmed) : setQuranData(trimmed);
        setSelectedSurah(surahs[startSurah]?.[0]);
      } catch (e) {
        console.error('Fetch page error', e);
      }
    };

    fetchPage();
  }, [currentPage, pages, showQuranByWords]);

  useEffect(() => {
    if (!showQuranByWords || !pages[currentPage]) {
      setTranslationH([]);
      return;
    }
    // const [startSurah, startAyah, endSurah, endAyah] = pages[currentPage];
    const pageRange = getPageRange(pages, currentPage, showQuranByWords);
    if (!pageRange) return;
    const { startSurah, startAyah, endSurah, endAyah } = pageRange;

    const fetchTranslation = async () => {
      try {
        const { data } = await fetchQuranTranslationH({
          surah_number: startSurah,
          ayah_number: startAyah,
          per_page: 500,
          page: 1,
        });
        const trimmed = trimQuranData(
          data.data,
          startSurah,
          startAyah,
          endSurah,
          endAyah
        );
        setTranslationH(data ? trimmed : []);
      } catch (error) {
        console.error('Translation fetch error:', error);
      }
    };

    fetchTranslation();
  }, [currentPage, pages, showQuranByWords]);

  return {
    surahs,
    ayahPagesInfo,
    pages,
    quranData,
    quranByWordData,
    translationH,
    selectedSurah,
    setSelectedSurah,
  };
};

export default useQuranData;
