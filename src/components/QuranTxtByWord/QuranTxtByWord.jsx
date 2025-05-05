import { useState, useRef, useEffect } from 'react';
import besmBack from '../../assets/img/quran-besm-frame-green.png';
import convertToPersianNumber from '../../utils/convertToPersianNumber';
import '../QuranTxt/QuranTxt.scss';
import './QuranTxtByWord.scss';

const QuranTxtByWord = ({ quranData, translationH, surahs }) => {
  const [activeSurah, setActiveSurah] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editAnchorIndex, setEditAnchorIndex] = useState(null);
  const [editedWordValue, setEditedWordValue] = useState('');
  const wordContainerRef = useRef();

  if (!quranData) return <div>Loading Quran data...</div>;

  const getGroupedAyahs = () => {
    const result = {};
    for (const [surah, ayahs] of Object.entries(quranData)) {
      for (const [ayah, [words]] of Object.entries(ayahs)) {
        const sn = parseInt(surah);
        const an = parseInt(ayah);
        if (!result[sn]) result[sn] = [];
        result[sn].push(...words, an);
      }
    }
    return result;
  };
  const groupedAyahs = getGroupedAyahs();

  const isFirstAyah = (arr) =>
    arr.find((item) => typeof item === 'number') === 1;

  const editWord = (e, surahNumber, word) => {
    setActiveSurah(surahNumber);
    setShowEdit(true);
    setEditedWordValue(word);
    console.log(e, surahNumber, word);

    const clickedTop = Math.round(e.currentTarget.getBoundingClientRect().top);
    const allBlocks = Array.from(
      wordContainerRef.current.querySelectorAll('.quran__word-block')
    );

    const lineBlocks = allBlocks.filter(
      (el) => Math.round(el.getBoundingClientRect().top) === clickedTop
    );

    const lastInLine = lineBlocks[lineBlocks.length - 1];
    const index = allBlocks.indexOf(lastInLine);
    setEditAnchorIndex(index);
  };

  const handleEditSubmit = () => {
    // Handle saving the edited word
    console.log('Edited word:', editedWordValue);
    setShowEdit(false);
  };
  const renderWords = (content, surahNumber) => {
    let ayahNum = 0;
    let wordIndex = 0;
    let translateIndex = content.find((ayaNum) => typeof ayaNum === 'number');
    let globalIndex = 0;

    return content.map((item, i) => {
      const elements = [];
      if (typeof item === 'number') {
        ayahNum = item;
        translateIndex = ayahNum + 1;
        wordIndex = 0;

        const num = convertToPersianNumber(item);
        return (
          <span key={`ayah-${surahNumber}-${i}`} className="quran__word-block">
            <span className="quran__ayah-number">
              ﴿‏{num}‎﴾{/* {'\u0028'}*/}
            </span>
            <span className="quran__ayah-number quran__ayah-number-translation">
              {num}
            </span>
          </span>
        );
      } else {
        const translation =
          translationH?.[surahNumber]?.[translateIndex]?.[0]?.[wordIndex] ||
          '—';

        const element = (
          <span
            key={`word-${surahNumber}-${i}`}
            className="quran__word-block"
            onClick={(e) => editWord(e, surahNumber)}
          >
            <span className="quran__word">{item}</span>
            <span className="quran__translation">{translation}</span>
          </span>
        );

        wordIndex++;
        return element;
      }
    });
  };

  // const renderWords = (content, surahNumber) => {
  //   let ayahNum = 0;
  //   let wordIndex = 0;
  //   let translateIndex = content.find((ayaNum) => typeof ayaNum === 'number');
  //   let globalIndex = 0;

  //   return content.flatMap((item, i) => {
  //     const elements = [];

  //     if (typeof item === 'number') {
  //       ayahNum = item;
  //       translateIndex = ayahNum + 1;
  //       wordIndex = 0;

  //       const num = convertToPersianNumber(item);

  //       const ayahElement = (
  //         <span key={`ayah-${surahNumber}-${i}`} className="quran__word-block">
  //           <span className="quran__ayah-number">﴿‏{num}‎﴾</span>
  //           <span className="quran__ayah-number quran__ayah-number-translation">
  //             {num}
  //           </span>
  //         </span>
  //       );

  //       elements.push(ayahElement);
  //     } else {
  //       const translation =
  //         translationH?.[surahNumber]?.[translateIndex]?.[0]?.[wordIndex] ||
  //         '—';

  //       const wordElement = (
  //         <span
  //           key={`word-${surahNumber}-${i}`}
  //           className="quran__word-block"
  //           onClick={(e) => editWord(e, surahNumber, item)}
  //         >
  //           <span className="quran__word">{item}</span>
  //           <span className="quran__translation">{translation}</span>
  //         </span>
  //       );

  //       elements.push(wordElement);

  //       if (surahNumber === activeSurah && globalIndex === editAnchorIndex) {
  //         elements.push(
  //           <span key={`edit-box-${surahNumber}-${i}`} className="edit-box">
  //             {showEdit && (
  //               <div className="quran__edit-container">
  //                 <input
  //                   placeholder="Edit something..."
  //                   value={editedWordValue}
  //                   onChange={(e) => setEditedWordValue(e.target.value)}
  //                 />
  //                 <button onClick={handleEditSubmit}>Save</button>
  //                 <button onClick={() => setShowEdit(false)}>Cancel</button>
  //               </div>
  //             )}
  //           </span>
  //         );
  //       }

  //       wordIndex++;
  //       globalIndex++;
  //     }

  //     return elements;
  //   });
  // };

  //for justify content to find the first and last in each row
  useEffect(() => {
    const container = wordContainerRef.current;
    if (!container) return;

    const markLineEdges = () => {
      // Clear old markers
      container
        .querySelectorAll('.first-in-line, .last-in-line')
        .forEach((el) => {
          el.classList.remove('first-in-line', 'last-in-line');
        });

      const wordBlocks = Array.from(
        container.querySelectorAll('.quran__word-block')
      );

      const lines = {};
      wordBlocks.forEach((el) => {
        const top = Math.round(el.getBoundingClientRect().top); // Normalize
        if (!lines[top]) lines[top] = [];
        lines[top].push(el);
      });

      Object.values(lines).forEach((lineEls) => {
        const first = lineEls[0];
        const last = lineEls[lineEls.length - 1];
        if (first) first.classList.add('first-in-line');
        if (last) last.classList.add('last-in-line');
      });
    };

    // Wait until the next frame to ensure layout is complete
    const animationFrame = requestAnimationFrame(markLineEdges);

    // Reapply on resize
    window.addEventListener('resize', markLineEdges);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', markLineEdges);
    };
  }, [groupedAyahs]);

  return (
    <div className="quran">
      <div className="quran__ayahs">
        {Object.entries(groupedAyahs).map(([surahNumber, content]) => {
          const name = surahs[surahNumber]?.[0];
          const showBesm =
            isFirstAyah(content) && name !== 'التوبة' && name !== 'الفاتحة';

          return (
            <div key={surahNumber} className="quran__ayah">
              {isFirstAyah(content) && (
                <div className="quran__surah-name-container">
                  <img
                    src={besmBack}
                    alt="border"
                    className="quran__surah-name-back"
                  />
                  <span className="quran__surah-name">{name}</span>
                </div>
              )}
              {showBesm && (
                <div className="quran__besm">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </div>
              )}
              <span className="quran__words" ref={wordContainerRef}>
                {renderWords(content, surahNumber)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuranTxtByWord;
