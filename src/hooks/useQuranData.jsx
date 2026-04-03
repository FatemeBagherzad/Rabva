import { useState, useEffect } from 'react';
import {
  fetchQuran,
  fetchSurahNames,
  fetchPagesInfo,
  fetchAyahPagesInfo,
} from '../services/mainService';
import { fetchQuranWordByWord, fetchAyahByRoot } from '../services/wordService';
import {
  fetchLanguages,
  fetchTranslatorNames,
  fetchQuranTranslationH,
  fetchTranslationAyahs,
} from '../services/translationService';
import { fetchRoots } from '../services/grammarService';

const PAGE_MIN = 1;
const PAGE_MAX = 604;
const API_PER_PAGE = 500;
const ROOT_PER_PAGE = 100;
const ROOT_FETCH_DELAY_MS = 100;

const useQuranData = (
  currentPage,
  showQuranByWords,
  language,
  ayahTranslator,
  root,
  setNextPageCount,
  requestedSurah,
) => {
  const [surahs, setSurahs] = useState([]);
  const [ayahPagesInfo, setAyahPagesInfo] = useState([]);
  const [pages, setPages] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [langCateTranslators, setLangCateTranslators] = useState([]);
  const [allTranslatorsSpec, setAllTranslatorsSpec] = useState([]);
  const [selectedLangTranslators, setSelectedLangTranslators] = useState([]);
  const [quranData, setQuranData] = useState([]);
  const [quranByWordData, setQuranByWordData] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState('');
  const [translationH, setTranslationH] = useState([]);
  const [translationByAyah, setTranslationByAyah] = useState([]);
  const [translationIsRtl, setTranslationIsRtl] = useState(true);
  const [ayahByRoot, setAyahByRoot] = useState([]);
  const [roots, setRoots] = useState([]);

  const trimData = (data, startSurah, startAyah, endSurah, endAyah) => {
    const trimmed = {};
    for (let s = startSurah; s <= endSurah; s++) {
      const ayahs = data[s];
      if (!ayahs) continue;
      const filtered = Object.fromEntries(
        Object.entries(ayahs).filter(([k]) => {
          const n = +k;
          return (
            n >= (s === startSurah ? startAyah : 1) &&
            n <= (s === endSurah ? endAyah : Infinity)
          );
        }),
      );
      if (Object.keys(filtered).length) trimmed[s] = filtered;
    }
    return trimmed;
  };

  // Calculate how many pages fit on screen
  const calculatePagesPerView = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth < 1024) return 1;
    if (screenWidth >= 1920) return 15;
    if (screenWidth >= 1600) return 10;
    if (screenWidth >= 1440) return 7;
    return 5;
  };

  const getPageRange = (pages, currentPage) => {
    if (!pages[currentPage]) return null;
    const pagesPerView = calculatePagesPerView();
    const [startSurah, startAyah] = pages[currentPage];
    let endSurah, endAyah;

    if (pagesPerView === 1) {
      [, , endSurah, endAyah] = pages[currentPage];
    } else {
      let viewEndPage = currentPage + pagesPerView - 1;
      if (viewEndPage > 604) viewEndPage = 604;

      if (pages[viewEndPage]) {
        [, , endSurah, endAyah] = pages[viewEndPage];
      } else {
        [, , endSurah, endAyah] = pages[currentPage];
      }
    }

    return { startSurah, startAyah, endSurah, endAyah };
  };

  useEffect(() => {
    if (setNextPageCount) {
      setNextPageCount(1);
    }
  }, [setNextPageCount]);

  //fetch Surahs, Ayah pages info, Pages info,languages,translators,roots.
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [
          { data: surahs },
          { data: ayahs },
          { data: pages },
          { data: languages },
          { data: translators },
          { data: roots },
        ] = await Promise.all([
          fetchSurahNames(),
          fetchAyahPagesInfo(),
          fetchPagesInfo(),
          fetchLanguages(),
          fetchTranslatorNames(),
          fetchRoots(),
        ]);
        setSurahs(surahs.surahs);
        setAyahPagesInfo(ayahs.ayah_page);
        setPages(pages.pages);
        setLanguages(languages.data);
        setLangCateTranslators(translators.data.language_category);
        setAllTranslatorsSpec(translators.data);
        setRoots(roots.data);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };
    loadInitial();
  }, []);

  //fetch Quran by Ayahs and by Words
  useEffect(() => {
    if (!pages[currentPage]) return;
    const pageRange = getPageRange(pages, currentPage);
    if (!pageRange) return;
    const { startSurah, startAyah, endSurah, endAyah } = pageRange;

    const fetchPage = async () => {
      try {
        const fetchFn = showQuranByWords ? fetchQuranWordByWord : fetchQuran;
        const { data } = await fetchFn({
          surah_number: startSurah,
          ayah_number: startAyah,
          per_page: API_PER_PAGE,
          page: PAGE_MIN,
        });
        const trimmed = trimData(
          data.data,
          startSurah,
          startAyah,
          endSurah,
          endAyah,
        );
        showQuranByWords ? setQuranByWordData(trimmed) : setQuranData(trimmed);
        requestedSurah
          ? setSelectedSurah(requestedSurah)
          : setSelectedSurah(startSurah);
      } catch (e) {
        console.error('Fetch page error', e);
      }
    };

    fetchPage();
  }, [currentPage, pages, showQuranByWords, requestedSurah]);

  //fetch Translation for H (word by word)
  useEffect(() => {
    if (!showQuranByWords || !pages[currentPage]) {
      setTranslationH([]);
      return;
    }
    const pageRange = getPageRange(pages, currentPage);
    if (!pageRange) return;
    const { startSurah, startAyah, endSurah, endAyah } = pageRange;

    const fetchTranslation = async () => {
      try {
        const { data } = await fetchQuranTranslationH({
          surah_number: startSurah,
          ayah_number: startAyah,
          per_page: API_PER_PAGE,
          page: PAGE_MIN,
        });
        const trimmed = trimData(
          data.data,
          startSurah,
          startAyah,
          endSurah,
          endAyah,
        );
        setTranslationH(data ? trimmed : []);
      } catch (error) {
        console.error('Translation fetch error:', error);
      }
    };

    fetchTranslation();
  }, [currentPage, pages, showQuranByWords]);

  //fetch translation by ayah
  useEffect(() => {
    const translatorsForLanguage = langCateTranslators?.[language] || [];
    setSelectedLangTranslators(translatorsForLanguage);
    if (!ayahTranslator) {
      setTranslationIsRtl(Boolean(languages?.[language]?.[1]));
      return;
    }

    const translatorSpec = allTranslatorsSpec[ayahTranslator];
    if (!translatorSpec) {
      console.warn(`Translator "${ayahTranslator}" not found in the data.`);
      setTranslationIsRtl(Boolean(languages?.[language]?.[1]));
      return;
    }

    const translatorLanguageCode = translatorSpec.language_code;
    setTranslationIsRtl(Boolean(languages?.[translatorLanguageCode]?.[1]));

    const translationCode = Number(translatorSpec.translation_code);
    const pageRange = getPageRange(pages, currentPage);
    if (!pageRange) return;

    const { startSurah, startAyah, endSurah, endAyah } = pageRange;

    const fetchTranslationByAyah = async () => {
      try {
        const { data } = await fetchTranslationAyahs({
          translation_code: translationCode,
          surah_number: startSurah,
          ayah_number: startAyah,
          per_page: API_PER_PAGE,
          page: PAGE_MIN,
        });
        const trimmed = trimData(
          data.data,
          startSurah,
          startAyah,
          endSurah,
          endAyah,
        );

        setTranslationByAyah(trimmed);
      } catch (err) {
        console.error('Error fetching translation by ayah:', err);
      }
    };

    fetchTranslationByAyah();
  }, [
    language,
    langCateTranslators,
    ayahTranslator,
    languages,
    allTranslatorsSpec,
    selectedSurah,
    currentPage,
  ]);

  useEffect(() => {
    if (!root) return;

    let isCancelled = false;

    const loadFirstPage = async () => {
      try {
        const { data } = await fetchAyahByRoot({
          root,
          per_page: ROOT_PER_PAGE,
          page: PAGE_MIN,
        });

        if (!data?.data) return;

        // Set first page
        setAyahByRoot(data.data);

        const totalPages = data.pagination?.total_pages || 1;

        // Load remaining pages in background
        for (let page = PAGE_MIN + 1; page <= totalPages; page++) {
          if (isCancelled) break;

          const { data: nextPageData } = await fetchAyahByRoot({
            root,
            per_page: ROOT_PER_PAGE,
            page,
          });

          if (!nextPageData?.data) break;

          setAyahByRoot((prev) => [...prev, ...nextPageData.data]);

          // Optional: slow it down a bit to avoid hammering the server
          await new Promise((res) => setTimeout(res, ROOT_FETCH_DELAY_MS));
        }
      } catch (error) {
        console.error('Failed to progressively fetch ayahs by root:', error);
      }
    };

    loadFirstPage();

    return () => {
      isCancelled = true;
    };
  }, [root]);

  return {
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
    roots,
  };
};

export default useQuranData;
