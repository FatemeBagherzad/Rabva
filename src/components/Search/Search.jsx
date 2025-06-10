import { useState, useEffect } from 'react';
import './Search.scss';

const Search = ({
  setShowSearchInput,
  setShowSearchRes,
  setShowQuran,
  setSelectedRoot,
  roots,
}) => {
  const [inputRoot, setInputRoot] = useState('');
  const [isInputError, setIsInputError] = useState(false);
  const [filteredRoots, setFilteredRoots] = useState([]);

  const letters = [
    'ا',
    'ب',
    'ت',
    'ث',
    'ج',
    'ح',
    'خ',
    'د',
    'ذ',
    'ر',
    'ز',
    'س',
    'ش',
    'ص',
    'ض',
    'ط',
    'ظ',
    'ع',
    'غ',
    'ف',
    'ق',
    'ک',
    'ل',
    'م',
    'ن',
    'و',
    'ه',
    'ی',
  ];

  // Update filtered roots based on input
  useEffect(() => {
    const searchTerm = inputRoot.trim();
    if (searchTerm === '') {
      setFilteredRoots([]);
    } else {
      const filtered = roots.filter((word) => word.startsWith(searchTerm));
      setFilteredRoots(filtered);
    }
  }, [inputRoot]);

  const handleLetterClick = (letter) => {
    setInputRoot((prev) => prev + letter);
  };

  const handleChange = (e) => {
    setInputRoot(e.target.value);
  };
  const handleRootClick = (word) => {
    setSelectedRoot(word);
    setShowQuran(false);
    setShowSearchRes(true);
    setShowSearchInput(false);
  };

  return (
    <div className="search">
      <input
        type="text"
        value={inputRoot}
        onChange={handleChange}
        onBlur={() => setShowSearchInput(false)}
        className={`${isInputError ? 'inputErrorStyle' : ''}`}
      />

      <div className="search__letters">
        {inputRoot.length === 0
          ? letters.map((letter) => (
              <span key={letter} onClick={() => handleLetterClick(letter)}>
                {letter}
              </span>
            ))
          : (() => {
              const nextLetters = Array.from(
                new Set(
                  roots
                    .filter((r) => r.startsWith(inputRoot))
                    .map((r) => r[inputRoot.length])
                    .filter(Boolean)
                )
              );

              return nextLetters.length > 0 ? (
                nextLetters.map((letter) => (
                  <span key={letter} onClick={() => handleLetterClick(letter)}>
                    {letter}
                  </span>
                ))
              ) : (
                <div className="search__no-letters">
                  هیچ حرفی برای ادامه یافت نشد
                </div>
              );
            })()}
      </div>

      {filteredRoots.length > 0 && (
        <ul className="search__suggestions">
          {filteredRoots.map((word, index) => (
            <li key={index} onClick={() => handleRootClick(word)}>
              {word}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Search;
