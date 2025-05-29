import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';

import MainMenu from '../MainMenu/MainMenu';
import Search from '../Search/Search';

import menuIcon from '../../assets/icons/menu.svg';
import logoIcon from '../../assets/logo/logo-hefz-app-white.svg';
import userIcon from '../../assets/icons/user.svg';
import languageIcon from '../../assets/icons/languages.svg';
import quran from '../../assets/icons/quran.svg';
import searchIcon from '../../assets/icons/search.svg';

import './TopNavigation.scss';

const TopNavigation = ({
  languages,
  language,
  setLanguage,
  setRtlDirection,
  setShowQuranByWords,
  setShowTranslationByAyah,
  setShowSearchRes,
  setShowQuran,
  setSelectedRoot,
}) => {
  const containerRef = useOutsideClick(() => {
    setShowLanguagesList(false);
    setShowMenu(false);
    setShowSearchInput(false);
  });
  const navigate = useNavigate();
  const [showLanguagesList, setShowLanguagesList] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const toggleLanguageShow = () => setShowLanguagesList((prev) => !prev);
  const toggleMenuShow = () => setShowMenu((prev) => !prev);
  const toggleSearch = () => setShowSearchInput((prev) => !prev);

  return (
    <div className="topNav__back">
      <div className="topNav container" ref={containerRef}>
        <div className="topNav__menuLogoContainer">
          <img
            src={menuIcon}
            alt="menu icon"
            className="icon"
            onClick={() => toggleMenuShow()}
          />
          {showMenu && (
            <span className="topNav__menu-container">
              <MainMenu />
            </span>
          )}
          {/* <img
            src={logoIcon}
            alt="hifdth logo"
            className="topNav__logoIcn"
            onClick={() => {
              navigate('/');
            }}
          /> */}
          <span
            className="topNav__logoIcn"
            onClick={() => {
              navigate('/');
            }}
          >
            Rabva
          </span>
        </div>

        <img
          src={quran}
          alt="holy book icon"
          className="topNav__quranIcon"
          onClick={() => {
            setShowQuran(true);
            setShowQuranByWords(false);
            setShowTranslationByAyah(false);
            setShowSearchRes(false);
          }}
        />

        <div className="topNav__lang-search-User">
          <span className="topNav__search-container">
            <img
              src={searchIcon}
              className="icon"
              alt="search icon"
              onClick={() => toggleSearch()}
            />
            {showSearchInput && (
              <Search
                setShowSearchInput={setShowSearchInput}
                setShowSearchRes={setShowSearchRes}
                setShowQuran={setShowQuran}
                setSelectedRoot={setSelectedRoot}
              />
            )}
          </span>

          <span
            className="topNav__language"
            onClick={() => toggleLanguageShow()}
          >
            <img src={languageIcon} alt="user icon" className="icon" />
            {language}
          </span>

          <img src={userIcon} alt="user icon" className="icon" />
        </div>

        {showLanguagesList && (
          <ul className="menu topNav__languages-list">
            {Object.entries(languages).map(([key, value]) => (
              <li
                key={key}
                className="menu__option"
                onClick={() => {
                  setLanguage(key);
                  setShowLanguagesList(false);
                  setRtlDirection(value[1]);
                  setShowTranslationByAyah(false);
                }}
              >
                {value[0]}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
export default TopNavigation;
