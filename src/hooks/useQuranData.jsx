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
  fetchLanguages,
  fetchTranslationNames,
  fetchUiTranslation,
  fetchQuranTranslationH,
} from '../services/translationService';

const useQuranData = (currentPage, showQuranByWords) => {
  const [surahs, setSurahs] = useState([]);
  const [ayahPagesInfo, setAyahPagesInfo] = useState([]);
  const [pages, setPages] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [languageNames, setLanguageNames] = useState([]);
  const [quranData, setQuranData] = useState([]);
  const [quranByWordData, setQuranByWordData] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState('');
  const [translationH, setTranslationH] = useState([]);

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

  //fetch Surahs, Ayah pages info, Pages info,languages,tranlation names
  useEffect(() => {
    const loadInitial = async () => {
      const [
        { data: surahs },
        { data: ayahs },
        { data: pages },
        { data: languages },
        { data: languageNames },
      ] = await Promise.all([
        fetchSurahNames(),
        fetchAyahPagesInfo(),
        fetchPagesInfo(),
        fetchLanguages(),
        fetchTranslationNames(),
      ]);
      setSurahs(surahs.surahs);
      setAyahPagesInfo(ayahs.ayah_page);
      setPages(pages.pages);
      setLanguages(languages.data);
      setLanguageNames(languageNames.data);
    };
    loadInitial();
  }, []);

  //fetch Quran by Ayahs and by Words
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

  //fetch Translation for H (word by word)
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
    languages,
    languageNames,
    quranData,
    quranByWordData,
    translationH,
    selectedSurah,
    setSelectedSurah,
  };
};

export default useQuranData;
