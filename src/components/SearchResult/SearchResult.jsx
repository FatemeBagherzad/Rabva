import { useEffect, useState, useRef } from 'react';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import HorizontalScrollArea from '../../utils/horizontalScrollArea';
import { fetchQuran } from '../../services/mainService';

import './SearchResult.scss';

const SearchResult = ({ ayahByRoot, selectedRoot, surahs }) => {
  const [contextMap, setContextMap] = useState({});
  const [selectedSurah, setSelectedSurah] = useState('all');
  const [selectedForm, setSelectedForm] = useState('all');

  const highlightWordInText = (text, seg) => {
    if (!text) return text;

    const parts = text.match(/[^\s.,؛،؟!]+|[.,؛،؟!]/g);

    return parts.map((part, i) => {
      if (Number(seg) === i + 1) {
        return (
          <span key={i} className="highlighted">
            {part + ' '}
          </span>
        );
      } else {
        return <span key={i}>{part + ' '}</span>;
      }
    });
  };

  const loadContextAyahs = async (item, direction) => {
    const surahNumber = parseInt(item[0]);
    const ayahNumber = parseInt(item[1]);
    const uniqueKey = `${surahNumber}:${ayahNumber}`;

    let start, limit;
    if (direction === 'before') {
      limit = Math.min(5, ayahNumber - 1);
      if (limit <= 0) return;
      start = ayahNumber - limit;
    } else {
      const totalAyahs = surahs[surahNumber]?.[1] || 286;
      limit = Math.min(5, totalAyahs - ayahNumber);
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

  // Group by arr[4]
  const groupedByWordForm = ayahByRoot.reduce((acc, curr) => {
    const key = curr[4];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);
    return acc;
  }, {});

  const uniqueSurahIds = Array.from(new Set(ayahByRoot.map((item) => item[0])));

  return (
    <div className="container">
      <div className="search-page">
        <div className="search-page__menu">
          <span>
            {' '}
            <select
              onChange={(e) => {
                setSelectedSurah(e.target.value);
                console.log(e.target.value);
              }}
              value={selectedSurah}
              className="search-page__menu-select"
            >
              <option value="all">کل سوره ها</option>
              {uniqueSurahIds.map((id) => (
                <option key={id} value={id}>
                  {surahs[id]?.[0]}
                </option>
              ))}
            </select>
          </span>

          <h4>{selectedRoot}</h4>

          <span>
            <select
              onChange={(e) => {
                setSelectedForm(e.target.value);
                console.log(e.target.value);
              }}
              value={selectedForm}
              className="search-page__menu-select"
            >
              <option value="all">کل مشتقات</option>
              {Object.keys(groupedByWordForm).map((form) => (
                <option key={form} value={form}>
                  {form}
                </option>
              ))}
            </select>
          </span>
        </div>

        {Object.entries(groupedByWordForm)
          .filter(([form, ayahGroup]) => {
            if (selectedForm !== 'all' && form !== selectedForm) return false;
            const filteredAyahs = ayahGroup.filter(
              (item) =>
                selectedSurah === 'all' || item[0] === Number(selectedSurah)
            );

            return filteredAyahs.length > 0;
          })
          .map(([form, ayahGroup]) => {
            const filteredAyahs = ayahGroup.filter(
              (item) =>
                selectedSurah === 'all' || item[0] === Number(selectedSurah)
            );

            return (
              <div key={form} className="search-page__group-by-root">
                <h5>{form}</h5>
                {filteredAyahs.map((item, index) => {
                  const uniqueKey = `${item[0]}:${item[1]}`;
                  return (
                    <div
                      key={index}
                      className="search-page__ayah-with-sourah-name"
                    >
                      <span className="search-page__sourah-name">
                        {convertToPersianNumber(item[0])}-{surahs[item[0]][0]}:
                      </span>

                      <div className="search-page__ayah-container">
                        <div
                          className="search-page__load-btn search-page__load-btn-before"
                          onClick={() => loadContextAyahs(item, 'before')}
                        >
                          &#8249;
                        </div>

                        <div className="search-page__scroll-container user-select-none ">
                          {Object.entries(
                            contextMap[uniqueKey]?.before || {}
                          ).map(([ayahNum, text]) => (
                            <span
                              key={`before-${ayahNum}`}
                              className="search-page__ayah"
                            >
                              {text} ({convertToPersianNumber(ayahNum)})
                            </span>
                          ))}

                          <span className="search-page__ayah">
                            {highlightWordInText(item[6], item[2])} (
                            {convertToPersianNumber(item[1])})
                          </span>

                          {Object.entries(
                            contextMap[uniqueKey]?.after || {}
                          ).map(([ayahNum, text]) => (
                            <span
                              key={`after-${ayahNum}`}
                              className="search-page__ayah"
                            >
                              {text} ({convertToPersianNumber(ayahNum)})
                            </span>
                          ))}
                        </div>

                        <div
                          className="search-page__load-btn search-page__load-btn-after"
                          onClick={() => loadContextAyahs(item, 'after')}
                        >
                          &#8250;
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default SearchResult;
