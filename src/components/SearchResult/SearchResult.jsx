import { useEffect, useRef, useState } from 'react';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import { fetchQuran } from '../../services/mainService';

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
  const [expandedRows, setExpandedRows] = useState({});
  const matchedWordRefs = useRef(new Map());
  const dragStateRef = useRef(null);
  const loadMoreRef = useRef(null);
  const expandedRowsRef = useRef({});
  const expandedScrollRefs = useRef(new Map());
  const expandedCenterRefs = useRef(new Map());
  const expandedLoadLockRef = useRef(new Map());

  const updateExpandedRows = (updater) => {
    setExpandedRows((prev) => {
      const next = updater(prev);
      expandedRowsRef.current = next;
      return next;
    });
  };

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

  const getRowId = (item, index) =>
    `${item.surah_number}:${item.ayah_number}:${item.word_number}:${item.segment_number}:${index}`;

  const getSurahAyahCount = (surahNumber) => Number(surahs?.[surahNumber]?.[1] || 0);

  const fetchSurahAyahRange = async (surahNumber, startAyah, endAyah) => {
    if (endAyah < startAyah) return [];

    const perPage = endAyah - startAyah + 1;
    const { data } = await fetchQuran({
      surah_number: surahNumber,
      ayah_number: startAyah,
      per_page: perPage,
      page: 1,
    });

    const ayahsInSurah = data?.data?.[surahNumber] || {};
    const rows = [];
    for (let ayah = startAyah; ayah <= endAyah; ayah += 1) {
      const text = ayahsInSurah?.[ayah];
      if (text) rows.push({ ayah_number: ayah, text });
    }
    return rows;
  };

  const getCenterAnchor = (rowId) => {
    const scroller = expandedScrollRefs.current.get(rowId);
    const centerElement = expandedCenterRefs.current.get(rowId);
    if (!scroller || !centerElement) return null;

    const scrollerRect = scroller.getBoundingClientRect();
    const centerRect = centerElement.getBoundingClientRect();

    return {
      scroller,
      offsetTop: centerRect.top - scrollerRect.top,
    };
  };

  const restoreCenterAnchor = (rowId, anchor) => {
    if (!anchor) return;

    requestAnimationFrame(() => {
      const scroller = expandedScrollRefs.current.get(rowId);
      const centerElement = expandedCenterRefs.current.get(rowId);
      if (!scroller || !centerElement) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const centerRect = centerElement.getBoundingClientRect();
      const currentOffsetTop = centerRect.top - scrollerRect.top;
      scroller.scrollTop += currentOffsetTop - anchor.offsetTop;
    });
  };

  const setRowLoadLock = (rowId, direction, isLocked) => {
    const current = expandedLoadLockRef.current.get(rowId) || {
      before: false,
      after: false,
    };

    current[direction] = isLocked;
    expandedLoadLockRef.current.set(rowId, current);
  };

  const isRowLoadLocked = (rowId, direction) => {
    const current = expandedLoadLockRef.current.get(rowId);
    return Boolean(current?.[direction]);
  };

  const loadBeforeAyahs = async (rowId, item, preserveScroll = false) => {
    const current = expandedRowsRef.current[rowId];
    if (!current || current.isLoadingBefore || current.reachedStart || isRowLoadLocked(rowId, 'before')) return;

    const nextEnd = current.beforeStart - 1;
    const nextStart = Math.max(1, nextEnd - 9);
    const anchor = preserveScroll ? getCenterAnchor(rowId) : null;
    setRowLoadLock(rowId, 'before', true);

    updateExpandedRows((prev) => {
      const row = prev[rowId];
      if (!row) return prev;
      return {
        ...prev,
        [rowId]: { ...row, isLoadingBefore: true },
      };
    });

    try {
      const rows = await fetchSurahAyahRange(item.surah_number, nextStart, nextEnd);

      updateExpandedRows((prev) => {
        const row = prev[rowId];
        if (!row) return prev;
        return {
          ...prev,
          [rowId]: {
            ...row,
            beforeAyahs: [...rows, ...row.beforeAyahs],
            beforeStart: rows.length ? rows[0].ayah_number : row.beforeStart,
            reachedStart: nextStart === 1 || rows.length === 0,
            isLoadingBefore: false,
          },
        };
      });

      restoreCenterAnchor(rowId, anchor);
    } catch (error) {
      console.error('Failed to load previous ayahs:', error);
      updateExpandedRows((prev) => {
        const row = prev[rowId];
        if (!row) return prev;
        return {
          ...prev,
          [rowId]: { ...row, isLoadingBefore: false },
        };
      });
    } finally {
      requestAnimationFrame(() => {
        setRowLoadLock(rowId, 'before', false);
      });
    }
  };

  const loadAfterAyahs = async (rowId, item) => {
    const current = expandedRowsRef.current[rowId];
    if (!current || current.isLoadingAfter || current.reachedEnd || isRowLoadLocked(rowId, 'after')) return;

    const surahAyahCount = getSurahAyahCount(item.surah_number);
    const nextStart = current.afterEnd + 1;
    const nextEnd = Math.min(surahAyahCount, nextStart + 9);
    const anchor = getCenterAnchor(rowId);
    setRowLoadLock(rowId, 'after', true);

    updateExpandedRows((prev) => {
      const row = prev[rowId];
      if (!row) return prev;
      return {
        ...prev,
        [rowId]: { ...row, isLoadingAfter: true },
      };
    });

    try {
      const rows = await fetchSurahAyahRange(item.surah_number, nextStart, nextEnd);
      updateExpandedRows((prev) => {
        const row = prev[rowId];
        if (!row) return prev;
        const newAfterEnd = rows.length ? rows[rows.length - 1].ayah_number : row.afterEnd;
        return {
          ...prev,
          [rowId]: {
            ...row,
            afterAyahs: [...row.afterAyahs, ...rows],
            afterEnd: newAfterEnd,
            reachedEnd: newAfterEnd >= surahAyahCount || rows.length === 0,
            isLoadingAfter: false,
          },
        };
      });
      restoreCenterAnchor(rowId, anchor);
    } catch (error) {
      console.error('Failed to load next ayahs:', error);
      updateExpandedRows((prev) => {
        const row = prev[rowId];
        if (!row) return prev;
        return {
          ...prev,
          [rowId]: { ...row, isLoadingAfter: false },
        };
      });
    } finally {
      requestAnimationFrame(() => {
        setRowLoadLock(rowId, 'after', false);
      });
    }
  };

  const toggleExpandedRow = async (rowId, item) => {
    const current = expandedRowsRef.current[rowId];
    if (current) {
      updateExpandedRows((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
      expandedScrollRefs.current.delete(rowId);
      expandedCenterRefs.current.delete(rowId);
      expandedLoadLockRef.current.delete(rowId);
      return;
    }

    const ayahNumber = Number(item.ayah_number);
    const surahAyahCount = getSurahAyahCount(item.surah_number);
    const beforeEnd = ayahNumber - 1;
    const beforeStart = Math.max(1, beforeEnd - 9);
    const afterStart = ayahNumber + 1;
    const afterEnd = Math.min(surahAyahCount, afterStart + 9);

    updateExpandedRows((prev) => ({
      ...prev,
      [rowId]: {
        beforeAyahs: [],
        afterAyahs: [],
        beforeStart: ayahNumber,
        afterEnd: ayahNumber,
        reachedStart: ayahNumber <= 1,
        reachedEnd: ayahNumber >= surahAyahCount,
        isLoadingBefore: ayahNumber > 1,
        isLoadingAfter: ayahNumber < surahAyahCount,
      },
    }));

    try {
      const [beforeRows, afterRows] = await Promise.all([
        beforeEnd >= beforeStart
          ? fetchSurahAyahRange(item.surah_number, beforeStart, beforeEnd)
          : Promise.resolve([]),
        afterEnd >= afterStart
          ? fetchSurahAyahRange(item.surah_number, afterStart, afterEnd)
          : Promise.resolve([]),
      ]);

      updateExpandedRows((prev) => {
        const row = prev[rowId];
        if (!row) return prev;

        const resolvedBeforeStart = beforeRows.length
          ? beforeRows[0].ayah_number
          : ayahNumber;
        const resolvedAfterEnd = afterRows.length
          ? afterRows[afterRows.length - 1].ayah_number
          : ayahNumber;

        return {
          ...prev,
          [rowId]: {
            ...row,
            beforeAyahs: beforeRows,
            afterAyahs: afterRows,
            beforeStart: resolvedBeforeStart,
            afterEnd: resolvedAfterEnd,
            reachedStart: resolvedBeforeStart <= 1,
            reachedEnd: resolvedAfterEnd >= surahAyahCount,
            isLoadingBefore: false,
            isLoadingAfter: false,
          },
        };
      });

      requestAnimationFrame(() => {
        const scroller = expandedScrollRefs.current.get(rowId);
        const centerElement = expandedCenterRefs.current.get(rowId);
        if (!scroller || !centerElement) return;

        const targetTop =
          centerElement.offsetTop - (scroller.clientHeight - centerElement.clientHeight) / 2;
        scroller.scrollTop = Math.max(0, targetTop);
      });
    } catch (error) {
      console.error('Failed to load initial expanded ayahs:', error);
      updateExpandedRows((prev) => {
        const row = prev[rowId];
        if (!row) return prev;
        return {
          ...prev,
          [rowId]: {
            ...row,
            isLoadingBefore: false,
            isLoadingAfter: false,
          },
        };
      });
    }
  };

  const onExpandedScroll = (rowId, item, event) => {
    const element = event.currentTarget;
    const current = expandedRowsRef.current[rowId];
    if (!current) return;

    if (element.scrollTop <= 40) {
      loadBeforeAyahs(rowId, item, true);
    }

    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 40;
    if (nearBottom) {
      loadAfterAyahs(rowId, item);
    }
  };

  const renderAyahBlock = (ayahs) => {
    if (!ayahs?.length) return null;
    return ayahs.map((ayah) => (
      <span key={ayah.ayah_number}>
        {ayah.text}
        {'\u00A0'}
        <span className="search-page__expanded-ayah-number">
          ﴿{convertToPersianNumber(ayah.ayah_number)}﴾
        </span>
        {'\u00A0'}
      </span>
    ));
  };

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
                const rowId = getRowId(item, index);
                const expanded = expandedRows[rowId];
                return (
                  <tr
                    key={`${uniqueKey}-${index}`}
                    className={expanded ? 'is-expanded' : ''}
                    onDoubleClick={() => toggleExpandedRow(rowId, item)}
                  >
                    <td className="search-page__cell-meta">{surahs[item.surah_number]?.[0] || '-'}</td>
                    <td className="search-page__cell-meta">{convertToPersianNumber(item.ayah_number)}</td>
                    <td>
                      {expanded ? (
                        <div
                          className="search-page__expanded-context user-select-none"
                          ref={(element) => {
                            if (!element) {
                              expandedScrollRefs.current.delete(rowId);
                              return;
                            }
                            expandedScrollRefs.current.set(rowId, element);
                          }}
                          onScroll={(event) => onExpandedScroll(rowId, item, event)}
                        >
                          {expanded.beforeAyahs.length ? (
                            <p className="search-page__expanded-text">
                              {renderAyahBlock(expanded.beforeAyahs)}
                            </p>
                          ) : null}

                          <div
                            className="search-page__expanded-center"
                            ref={(element) => {
                              if (!element) {
                                expandedCenterRefs.current.delete(rowId);
                                return;
                              }
                              expandedCenterRefs.current.set(rowId, element);
                            }}
                          >
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

                          {expanded.afterAyahs.length ? (
                            <p className="search-page__expanded-text">
                              {renderAyahBlock(expanded.afterAyahs)}
                            </p>
                          ) : null}

                          {expanded.isLoadingBefore || expanded.isLoadingAfter ? (
                            <div className="search-page__expanded-loading">......</div>
                          ) : null}
                        </div>
                      ) : (
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
                      )}
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
