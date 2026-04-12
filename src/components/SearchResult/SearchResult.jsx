import { useEffect, useRef, useState } from 'react';
import convertToPersianNumber from '../../utils/convertToPersianNumber';

import './SearchResult.scss';

const SearchResult = ({
  ayahByRoot,
  isRootLoading,
  rootPagination,
  setRootPage,
  surahs,
  preferences,
}) => {
  const [surahSortDir, setSurahSortDir] = useState(null);
  const [ayahSortDir, setAyahSortDir] = useState(null);
  const matchedWordRefs = useRef(new Map());
  const dragStateRef = useRef(null);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (isRootLoading || !rootPagination?.has_next) return;

        setRootPage((prev) => {
          const nextPage = prev + 1;
          return nextPage > (rootPagination?.total_pages || prev) ? prev : nextPage;
        });
      },
      {
        root: null,
        rootMargin: '0px 0px 320px 0px',
        threshold: 0,
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isRootLoading, rootPagination?.has_next, rootPagination?.total_pages, setRootPage]);

  useEffect(() => {
    matchedWordRefs.current.forEach((element) => {
      if (!element) return;
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    });
  }, [ayahByRoot]);

  const cycleDir = (current) =>
    current === null ? 'asc' : current === 'asc' ? 'desc' : null;

  const cycleSurahSort = () => setSurahSortDir((prev) => cycleDir(prev));
  const cycleAyahSort = () => setAyahSortDir((prev) => cycleDir(prev));

  const quranFontSize = Number(preferences?.quran_font_size || 2.5);

  const onAyahScrollPointerDown = (event) => {
    const container = event.currentTarget;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
      element: container,
    };

    container.classList.add('is-dragging');
    if (container.setPointerCapture) {
      try {
        container.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore capture errors.
      }
    }
  };

  const onAyahScrollPointerMove = (event) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    drag.element.scrollLeft = drag.startScrollLeft - dx;
  };

  const onAyahScrollPointerEnd = (event) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    drag.element.classList.remove('is-dragging');
    if (drag.element.releasePointerCapture) {
      try {
        drag.element.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore release errors.
      }
    }
    dragStateRef.current = null;
  };

  const renderWordByWordAyah = (item) => {
    const wholeWords = item?.ayah_word_by_word?.whole_words || [];
    const matchedWordIndex = Number(item.word_number) - 1;

    return (
      <span className="search-page__ayah-word-by-word">
        {wholeWords.map((word, index) => {
          const wordKey = `${item.surah_number}:${item.ayah_number}:${index}`;
          const isMatched = index === matchedWordIndex;

          return (
            <span
              key={wordKey}
              className={`search-page__word-box ${isMatched ? 'is-matched' : ''}`}
              ref={(element) => {
                if (!isMatched) return;
                if (!element) {
                  matchedWordRefs.current.delete(wordKey);
                  return;
                }
                matchedWordRefs.current.set(wordKey, element);
              }}
            >
              <span className="search-page__word-text">{word || '---'}</span>
            </span>
          );
        })}
      </span>
    );
  };

  const sortedRows = [...ayahByRoot].sort((a, b) => {
    if (!surahSortDir && !ayahSortDir) return 0;

    const nameA = String(surahs?.[a.surah_number]?.[0] || '');
    const nameB = String(surahs?.[b.surah_number]?.[0] || '');

    if (surahSortDir && !ayahSortDir) {
      const cmp = nameA.localeCompare(nameB, 'fa');
      return surahSortDir === 'asc' ? cmp : -cmp;
    }

    if (!surahSortDir && ayahSortDir) {
      const cmp = Number(a.ayah_number) - Number(b.ayah_number);
      return ayahSortDir === 'asc' ? cmp : -cmp;
    }

    // Both set: sort by surah first then ayah
    let cmp = nameA.localeCompare(nameB, 'fa');
    if (cmp === 0) {
      const ayahCmp = Number(a.ayah_number) - Number(b.ayah_number);
      return ayahSortDir === 'asc' ? ayahCmp : -ayahCmp;
    }
    return surahSortDir === 'asc' ? cmp : -cmp;
  });

  return (
      <div
        className="search-page"
        style={{
          '--search-ayah-font-size': `${quranFontSize}rem`,
          '--search-quran-font-family': preferences?.quran_font_family || 'hafs-django',
        }}
      >
        <div className="search-page__table-wrap">
          <table className="search-page__table">
            <thead>
              <tr>
                <th
                  className={`search-page__sortable ${surahSortDir ? 'is-sorted' : ''}`}
                  onClick={cycleSurahSort}
                >
                  سوره
                  {surahSortDir ? (
                    <span className="search-page__sort-arrow">
                      {surahSortDir === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  ) : null}
                </th>
                <th
                  className={`search-page__sortable ${ayahSortDir ? 'is-sorted' : ''}`}
                  onClick={cycleAyahSort}
                >
                  آیه
                  {ayahSortDir ? (
                    <span className="search-page__sort-arrow">
                      {ayahSortDir === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  ) : null}
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((item, index) => {
                const uniqueKey = `${item.surah_number}:${item.ayah_number}`;
                return (
                  <tr key={`${uniqueKey}-${index}`}>
                    <td className="search-page__cell-meta">{surahs[item.surah_number]?.[0] || '-'}</td>
                    <td className="search-page__cell-meta">{convertToPersianNumber(item.ayah_number)}</td>
                    <td>
                      <div className="search-page__ayah-container">
                        <div
                          className="search-page__scroll-container user-select-none"
                          onPointerDown={onAyahScrollPointerDown}
                          onPointerMove={onAyahScrollPointerMove}
                          onPointerUp={onAyahScrollPointerEnd}
                          onPointerCancel={onAyahScrollPointerEnd}
                        >
                          <span className="search-page__ayah">
                            {renderWordByWordAyah(item)}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div ref={loadMoreRef} className="search-page__load-more-sentinel" aria-hidden="true" />
        {isRootLoading ? (
          <div className="search-page__loading-more">
            <span className="search-page__loading-dots" aria-label="Loading" />
          </div>
        ) : null}
      </div>
  );
};

export default SearchResult;
