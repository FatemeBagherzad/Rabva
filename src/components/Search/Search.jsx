import { useState } from 'react';
import './Search.scss';

const Search = ({ setShowSearchInput }) => {
  const [inputRoot, setInputRoot] = useState('');
  const [isInputError, setIsInputError] = useState(false);

  const handleRootInputSubmit = (e) => {
    console.log(e);
  };

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
  ];
  return (
    <div className="search">
      <input
        type="text"
        value={inputRoot}
        onChange={(e) => setInputRoot(e.target.value)}
        onKeyDown={handleRootInputSubmit}
        onBlur={() => setShowSearchInput(false)}
        className={`${isInputError ? 'inputErrorStyle' : ''}`}
      />

      <div className="search__options">
        <div className="search__letter-group">
          <span>ا</span>
          <span>ب</span>
          <span>ت</span>
          <span>ث</span>
          <span>ج</span>
          <span>ح</span>
          <span>خ</span>
          <span>د</span>
          <span>ذ</span>
          <span>ر</span>
          <span>ز</span>
          <span>س</span>
          <span>ش</span>
          <span>ص</span>
        </div>
        <div className="search__letter-group">
          <span>ض</span>
          <span>ط</span>
          <span>ظ</span>
          <span>ع</span>
          <span>غ</span>
          <span>ف</span>
          <span>ق</span>
          <span>ک</span>
          <span>گ</span>
          <span>ل</span>
          <span>م</span>
          <span>ن</span>
          <span>و</span>
          <span>ه</span>
          <span>ی</span>
        </div>
      </div>
    </div>
  );
};

export default Search;
