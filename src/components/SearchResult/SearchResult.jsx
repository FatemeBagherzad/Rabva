import { useEffect, useState, useRef } from 'react';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import { fetchQuran } from '../../services/mainService';

import './SearchResult.scss';

const SearchResult = ({ ayahByRoot, selectedRoot, surahs }) => {
  const [contextMap, setContextMap] = useState({});

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

  const loadContextAyahs = async (item, direction) => {
    const surahNumber = parseInt(item[0]);
    const ayahNumber = parseInt(item[1]);
    const uniqueKey = `${surahNumber}:${ayahNumber}`;

    let start, limit;
    if (direction === 'before') {
      limit = Math.min(10, ayahNumber - 1);
      if (limit <= 0) return;
      start = ayahNumber - limit;
    } else {
      const totalAyahs = surahs[surahNumber]?.[1] || 286;
      limit = Math.min(10, totalAyahs - ayahNumber);
      if (limit <= 0) return;
      start = ayahNumber + 1;
    }

    const { data } = await fetchQuran({
      surah_number: surahNumber,
      ayah_number: start,
      per_page: limit,
      page: 1,
    });

    const ayahObj = data?.data || {};
    const ayahs = Object.values(ayahObj)[0];

    setContextMap((prev) => {
      const updated = { ...prev };
      if (!updated[uniqueKey]) updated[uniqueKey] = { before: {}, after: {} };

      if (direction === 'before') {
        updated[uniqueKey].before = {
          ...ayahs,
          ...updated[uniqueKey].before,
        };
      } else {
        updated[uniqueKey].after = {
          ...updated[uniqueKey].after,
          ...ayahs,
        };
      }

      return updated;
    });
  };

  // const loadContextAyahs = async (item, index, direction) => {
  //   const surahNumber = parseInt(item[0]);
  //   const ayahNumber = parseInt(item[1]);
  //   let start, limit;

  //   if (direction === 'before') {
  //     limit = Math.min(10, ayahNumber - 1);
  //     if (limit <= 0) return;
  //     start = ayahNumber - limit;
  //   } else {
  //     const totalAyahs = surahs[surahNumber]?.[1] || 286;
  //     limit = Math.min(10, totalAyahs - ayahNumber);
  //     if (limit <= 0) return;
  //     start = ayahNumber + 1;
  //   }

  //   const { data } = await fetchQuran({
  //     surah_number: surahNumber,
  //     ayah_number: start,
  //     per_page: limit,
  //     page: 1,
  //   });

  //   const ayahObj = data?.data || {};
  //   const ayahs = Object.values(ayahObj)[0];

  //   setContextMap((prev) => {
  //     const updated = { ...prev };
  //     if (!updated[index]) updated[index] = { before: {}, after: {} };

  //     if (direction === 'before') {
  //       updated[index].before = {
  //         ...ayahs,
  //         ...updated[index].before,
  //       };
  //     } else {
  //       updated[index].after = {
  //         ...updated[index].after,
  //         ...ayahs,
  //       };
  //     }

  //     return updated;
  //   });
  // };

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
          <div key={form} className="search-page__group-by-root">
            <h5>{form}</h5>
            {ayahGroup.map((item, index) => {
              const uniqueKey = `${item[0]}:${item[1]}`;
              return (
                <div key={index} className="search-page__ayah-with-sourah-name">
                  <span className="search-page__sourah-name">
                    {surahs[item[0]][0]}:
                  </span>
                  <div className="search-page__ayah-container">
                    <div
                      className="search-page__load-btn search-page__load-btn-before"
                      onClick={() => loadContextAyahs(item, 'before')}
                    ></div>
                    <div className="search-page__scroll-container">
                      {Object.entries(contextMap[uniqueKey]?.before || {}).map(
                        ([ayahNum, text]) => (
                          <span
                            key={`before-${ayahNum}`}
                            className="search-page__ayah"
                          >
                            {text} ({convertToPersianNumber(ayahNum)})
                          </span>
                        )
                      )}

                      <span className="search-page__ayah">
                        {highlightWordInText(item[6], item[5])} (
                        {convertToPersianNumber(item[1])})
                      </span>

                      {Object.entries(contextMap[uniqueKey]?.after || {}).map(
                        ([ayahNum, text]) => (
                          <span
                            key={`after-${ayahNum}`}
                            className="search-page__ayah"
                          >
                            {text} ({convertToPersianNumber(ayahNum)})
                          </span>
                        )
                      )}
                    </div>
                    <div
                      className="search-page__load-btn search-page__load-btn-after"
                      onClick={() => loadContextAyahs(item, 'after')}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResult;
