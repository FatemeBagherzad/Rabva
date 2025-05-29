import { useEffect, useState, useRef } from 'react';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import { fetchQuran } from '../../services/mainService';

import './SearchResult.scss';

const SearchResult = ({ ayahByRoot, selectedRoot, surahs }) => {
  const allRootWords = ayahByRoot.map((arr) => arr[5]);
  console.log(allRootWords);

  const NearbyAyahs = ({ surahNumber, ayahNumber, highlightWord }) => {
    const [contextAyahs, setContextAyahs] = useState({
      before: [],
      main: null,
      after: [],
    });
    const mainRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
      if (mainRef.current && containerRef.current) {
        const mainEl = mainRef.current;
        const containerEl = containerRef.current;
        const offsetLeft = mainEl.offsetLeft;
        containerEl.scrollLeft =
          offsetLeft - containerEl.clientWidth / 2 + mainEl.clientWidth / 2;
      }
    }, [contextAyahs.main]);

    const removeDiacritics = (str) =>
      str
        .normalize('NFD')
        .replace(/[\u064B-\u0652]/g, '')
        .replaceAll('ٱ', 'ا');

    const highlightWordInText = (text, word) => {
      if (!word) return text;

      const plainWord = removeDiacritics(word);

      // Split by words + keep spaces and punctuation
      const parts = text.split(/(\s+|[.,؛،؟!])/);

      return parts.map((part, i) => {
        const plainPart = removeDiacritics(part);
        if (plainPart.includes(plainWord)) {
          return (
            <mark key={i} className="highlighted">
              {part}
            </mark>
          );
        } else {
          return <span key={i}>{part}</span>;
        }
      });
    };

    useEffect(() => {
      const fetchContextAyahs = async () => {
        const start = Math.max(ayahNumber - 2, 1);
        try {
          const { data } = await fetchQuran({
            surah_number: surahNumber,
            ayah_number: start,
            per_page: 5,
            page: 1,
          });

          const ayahs = data.data[surahNumber];
          const ayahNumbers = Object.keys(ayahs)
            .map(Number)
            .sort((a, b) => a - b);

          const result = { before: [], main: null, after: [] };

          ayahNumbers.forEach((num) => {
            const text = ayahs[num];
            if (num < ayahNumber) result.before.push({ number: num, text });
            else if (num === ayahNumber) result.main = { number: num, text };
            else result.after.push({ number: num, text });
          });

          setContextAyahs(result);
        } catch (e) {
          console.error('Failed to fetch context ayahs:', e);
        }
      };

      fetchContextAyahs();
    }, [surahNumber, ayahNumber]);

    return (
      <div className="search-res-container" ref={containerRef}>
        <div className="search-res">
          {contextAyahs.before.map((ayah) => (
            <span key={ayah.number} className="search-res__ayah">
              {ayah.text} ({convertToPersianNumber(ayah.number)})
            </span>
          ))}

          {contextAyahs.main && (
            <span
              ref={mainRef}
              key={contextAyahs.main.number}
              className="search-res__ayah search-res__main"
            >
              {highlightWordInText(contextAyahs.main.text, highlightWord)}(
              {convertToPersianNumber(contextAyahs.main.number)})
            </span>
          )}

          {contextAyahs.after.map((ayah) => (
            <span key={ayah.number} className="search-res__ayah">
              {ayah.text} ({convertToPersianNumber(ayah.number)})
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Group by arr[4]
  const groupedByWordForm = ayahByRoot.reduce((acc, curr) => {
    const key = curr[4];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);
    return acc;
  }, {});

  return (
    <div className="container">
      <div className="search-page">
        <h4>{selectedRoot}</h4>
        {Object.entries(groupedByWordForm).map(([form, ayahGroup]) => (
          <div key={form} className="search-group">
            <h5>{form}</h5>
            {ayahGroup.map((item, index) => (
              <div key={index} className="search-group__withSourahName">
                {/* {item[1]}-{item[6]}{' '} */}
                <span>{surahs[item[0]][0]}:</span>
                <NearbyAyahs
                  surahNumber={item[0]}
                  ayahNumber={item[1]}
                  highlightWord={item[5]}
                />{' '}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResult;
