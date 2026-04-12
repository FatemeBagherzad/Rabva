import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useAuth } from '../../context/AuthContext';
import convertToPersianNumber from '../../utils/convertToPersianNumber';

import MainMenu from '../MainMenu/MainMenu';
import Search from '../Search/Search';

import menuIcon from '../../assets/icons/menu.svg';
import logoIcon from '../../assets/logo/logo-hefz-app-white.svg';
import userIcon from '../../assets/icons/user.svg';
import languageIcon from '../../assets/icons/languages.svg';
import quran from '../../assets/icons/quran.svg';
import searchIcon from '../../assets/icons/search.svg';

import './TopNavigation.scss';

const TOP_RIGHT_USER_ICON_SIZE = '1.7rem';

const normalizeAvatarUrl = (url) => {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
};

const TopNavigation = ({
  languages,
  language,
  setLanguage,
  setRtlDirection,
  setShowQuranByWords,
  setShowTranslationByAyah,
  setShowSearchRes,
  setShowQuran,
  onRootSearch,
  roots,
  selectedRoot,
  selectedRootCount,
  preferences,
  onUserIconClick,
  isMapMode,
  onToggleMapMode,
}) => {
  const { userInfo, isLoggedIn } = useAuth();
  const containerRef = useOutsideClick(() => {
    setShowLanguagesList(false);
    setShowMenu(false);
    setShowSearchInput(false);
  });
  const navigate = useNavigate();
  const [showLanguagesList, setShowLanguagesList] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const languageItemRefs = useRef({});
  const avatarUrl = normalizeAvatarUrl(userInfo?.profile?.avatar_cropped || '');

  const toggleLanguageShow = () => setShowLanguagesList((prev) => !prev);
  const toggleMenuShow = () => setShowMenu((prev) => !prev);
  const toggleSearch = () => setShowSearchInput((prev) => !prev);

  useEffect(() => {
    if (!showLanguagesList) return;

    const handleLanguageListKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const targetTagName = event.target?.tagName;
      if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA') return;

      const key = event.key?.toLowerCase();
      if (!key || key.length !== 1 || !/[a-z]/i.test(key)) return;

      const languageEntries = Object.entries(languages || {});
      const matchedEntry = languageEntries.find(([langCode, langValue]) => {
        const displayName = String(langValue?.[0] || '').toLowerCase();
        return (
          String(langCode).toLowerCase().startsWith(key) ||
          displayName.startsWith(key)
        );
      });

      if (!matchedEntry) return;

      const targetElement = languageItemRefs.current[matchedEntry[0]];
      if (!targetElement) return;

      event.preventDefault();
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    document.addEventListener('keydown', handleLanguageListKeyDown);
    return () => {
      document.removeEventListener('keydown', handleLanguageListKeyDown);
    };
  }, [showLanguagesList, languages]);

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
            رَبْوَة
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
          <span
            className="topNav__search-container"
            style={{
              '--topnav-quran-font-family': preferences?.quran_font_family || 'hafs-django',
            }}
          >
            {selectedRoot ? (
              <span className="topNav__search-count">{convertToPersianNumber(selectedRootCount || 0)}</span>
            ) : null}
            {selectedRoot ? (
              <span className="topNav__search-root">{selectedRoot}</span>
            ) : null}
            <img
              src={searchIcon}
              className="icon"
              alt="search icon"
              onClick={() => toggleSearch()}
            />
            {showSearchInput && (
              <Search
                setShowSearchInput={setShowSearchInput}
                onRootSearch={onRootSearch}
                roots={roots}
              />
            )}
          </span>

          {isLoggedIn && (
            <button
              type="button"
              className={`topNav__mode-toggle ${isMapMode ? 'is-book' : 'is-map'}`}
              onClick={onToggleMapMode}
              aria-label={isMapMode ? 'Switch to Quran view' : 'Switch to map view'}
              title={isMapMode ? 'Switch to Quran view' : 'Switch to map view'}
            >
              <span className="topNav__mode-icon" />
            </button>
          )}

          <span
            className="topNav__language"
            onClick={() => toggleLanguageShow()}
          >
            <img src={languageIcon} alt="user icon" className="icon" />
            {language}
          </span>

          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="profile avatar"
              className="topNav__avatar topNav__user-icon"
              style={{ width: TOP_RIGHT_USER_ICON_SIZE, height: TOP_RIGHT_USER_ICON_SIZE }}
              onClick={onUserIconClick}
            />
          ) : (
            <img
              src={userIcon}
              alt="user icon"
              className="icon topNav__user-icon"
              onClick={onUserIconClick}
            />
          )}
        </div>

        {showLanguagesList && (
          <ul className="menu topNav__languages-list">
            {Object.entries(languages).map(([key, value]) => (
              <li
                key={key}
                ref={(element) => {
                  languageItemRefs.current[key] = element;
                }}
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
