import { useState } from 'react';
import './QuranHeader.scss';

const QuranHeader = ({
  chapters,
  setSelectedChapter,
  setCurrentPage,
  verseByPage,
  convertToPersianNumber,
}) => {
  const [showChapterList, setShowChapterList] = useState(false);
  const [showVerseList, setShowVerseList] = useState(false);
  const [selectedVerseCount, setSelectedVerseCount] = useState(null);
  const [chapter, setChapter] = useState(chapters[0].id);

  const findVersePage = (chapterId, verse = null) => {
    const verseData = verseByPage.find((v) => {
      return (
        v.chapter_id === chapterId && (verse ? v.verse_id === verse : true)
      );
    });
    return verseData ? verseData.page_id : 1;
  };

  const handleChapterClick = (selectedChapter) => {
    const pageNumber = findVersePage(selectedChapter.id);
    setChapter(selectedChapter);
    setSelectedChapter(selectedChapter.name);
    setSelectedVerseCount(selectedChapter.total_verses);
    setCurrentPage(pageNumber);
    toggleLists(false, false);
  };

  const handleVerseClick = (selectedVerse) => {
    const pageNumber = findVersePage(chapter.id, selectedVerse);
    setCurrentPage(pageNumber);
    toggleLists(false, false);
  };

  const toggleLists = (chapterList, verseList) => {
    setShowChapterList(chapterList);
    setShowVerseList(verseList);
  };

  return (
    <div className="quran-header__back">
      <div className="quran-header container">
        <header className="quran-header__header">
          <span onClick={() => toggleLists(!showChapterList, false)}>
            السوره
          </span>
          <span onClick={() => toggleLists(false, !showVerseList)}>الآیه</span>
        </header>

        <div className="quran-header__body">
          {showChapterList && (
            <ul className="quran-header__chapters">
              {chapters.map((chapter) => (
                <li
                  key={chapter.id}
                  onClick={() => handleChapterClick(chapter)}
                  className="quran-header__chapter"
                >
                  {convertToPersianNumber(chapter.id)} - {chapter.name}
                </li>
              ))}
            </ul>
          )}

          {showVerseList && selectedVerseCount && (
            <ul className="quran-header__verses">
              {Array.from({ length: selectedVerseCount }, (_, index) => (
                <li
                  key={index + 1}
                  onClick={() => handleVerseClick(index + 1)}
                  className="quran-header__verse"
                >
                  {convertToPersianNumber(index + 1)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>{' '}
    </div>
  );
};

export default QuranHeader;
