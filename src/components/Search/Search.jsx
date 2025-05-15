import { useState } from 'react';
import './Search.scss';

const Search = ({ surahs }) => {
  const [surahNumber, setSurahNumber] = useState('');
  const totalAyahs =
    surahNumber && surahs[surahNumber] ? surahs[surahNumber][1] : null;

  const handleSurahSelect = (e) => {
    const selected = e.target.value;
    setSurahNumber(selected);
  };

  const handleSurahNumberChange = (e) => {
    const input = e.target.value;
    // Only allow numbers between 1 and 114
    if (!input || (Number(input) >= 1 && Number(input) <= 114)) {
      setSurahNumber(input);
    }
  };

  return (
    <div className="search">
      <label className="search__options">
        Surah Name:
        <select value={surahNumber} onChange={handleSurahSelect}>
          <option value="">-- Select Surah --</option>
          {Object.entries(surahs).map(([number, [name]]) => (
            <option key={number} value={number}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="search__options">
        Surah Number:
        <input
          type="number"
          placeholder="Select from 1 to 114"
          value={surahNumber}
          onChange={handleSurahNumberChange}
        />
      </label>

      <label className="search__options">
        Ayah Number:
        <input
          type="number"
          placeholder={
            totalAyahs
              ? `Select between 1 and ${totalAyahs}`
              : 'Select a surah first'
          }
        />
      </label>

      <label className="search__options">
        Root:
        <input />
      </label>

      <button>find it!</button>
    </div>
  );
};

export default Search;
