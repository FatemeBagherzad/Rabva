import { useState, useEffect } from 'react';
import './Search.scss';

const Search = ({
  setShowSearchInput,
  setShowSearchRes,
  setShowQuran,
  setSelectedRoot,
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
    'گ',
    'ل',
    'م',
    'ن',
    'و',
    'ه',
    'ی',
  ];
  const root = [
    'آدم',
    'آزر',
    'ا',
    'أبابيل',
    'ابب',
    'ابد',
    'ابراهيم',
    'ابريق',
    'ابق',
    'ابل',
    'إبليس',
    'ابو',
    'ابى',
    'اتى',
    'اثث',
    'اثر',
    'اثل',
    'اثم',
    'اجج',
    'اجر',
    'اجل',
    'احد',
    'احزاب',
    'احقاف',
    'احمد',
    'اخذ',
    'اخر',
    'اخو',
    'ادد',
    'ادريس',
    'ادى',
    'اذ',
    'اذا',
    'اذن',
    'اذى',
    'ارب',
    'ارث',
    'ارض',
    'ارك',
    'ارم',
    'ازر',
    'ازز',
    'ازف',
    'اسباط',
    'استبرق',
    'اسحاق',
    'اسر',
    'اسرائيل',
    'اسس',
    'اسف',
    'اسلام',
    'اسماعيل',
    'اسن',
    'اسو',
    'اسى',
    'اشر',
    'اصر',
    'اصل',
    'أعراف',
    'افف',
    'افق',
    'افك',
    'افل',
    'اقصو',
    'اكل',
    'الا',
    'التى',
    'الذان',
    'الذى',
    'الذين',
    'الف',
    'الك',
    'اللاتى',
    'اللائى',
    'الل',
    'الله',
    'الم',
    'اله',
    'الو',
    'الى',
    'الياس',
    'الياسين',
    'ياسين',
    'اليسع',
    'ام',
    'اما',
    'أما',
    'امت',
    'امد',
    'امر',
    'امس',
    'امل',
    'امم',
    'امن',
    'امو',
    'ان',
    'انا',
    'انت',
    'انتم',
    'انتما',
    'انث',
    'انجيل',
    'انس',
    'انف',
    'انم',
    'انن',
    'اننى',
    'انى',
    'اهل',
    'او',
    'اوب',
    'اود',
    'اولاء',
    'اول',
    'اولى',
    'اون',
    'اوه',
    'اوى',
    'اى',
    'اياك',
    'اياكم',
    'ايان',
    'ايانا',
    'اياه',
    'اياهم',
    'اياى',
    'ايد',
    'ايكه',
    'ايم',
    'اين',
    'ايوب',
    'ائى',
    'ايى',
    'ب',
    'بابل',
    'بتر',
    'امن',
    'اكل',
    'اتي',
    'اخذ',
    'امر',
    'اذن',
    'بدء',
    'بسم',
    'بلغ',
    'بشر',
    'بعث',
    'بصر',
    'بين',
    'ترك',
    'توب',
    'جعل',
    'جمع',
    'جنن',
    'حمد',
    'حبب',
    'حدث',
    'حدي',
    'حفظ',
    'حسب',
    'حكم',
    'خرج',
    'خلق',
    'خوف',
    'دخل',
    'ذكر',
    'رزق',
    'رسل',
    'سجد',
    'سلم',
    'سمع',
    'شهد',
    'صبر',
    'صدق',
    'صرف',
    'صلو',
    'ضرب',
    'طهر',
    'علم',
    'عبد',
    'عقل',
    'غفر',
    'قتل',
    'قول',
    'كتب',
    'كفر',
    'ملك',
    'نجو',
    'نصر',
    'نظر',
    'نزل',
    'هدي',
    'وعد',
    'وضع',
    'وكل',
    'ولي',
    'يسر',
    'يوم',
  ];

  // Update filtered roots based on input
  useEffect(() => {
    const searchTerm = inputRoot.trim();
    if (searchTerm === '') {
      setFilteredRoots([]);
    } else {
      const filtered = root.filter((word) => word.startsWith(searchTerm));
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
    console.log(word);
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
                  root
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
