import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useOutsideClick } from '../../hooks/useOutsideClick';

import menuIcon from '../../assets/icons/menu.svg';
import logoIcon from '../../assets/logo/logo-hefz-app-white.svg';
import userIcon from '../../assets/icons/user.svg';
import languageIcon from '../../assets/icons/languages.svg';
import quran from '../../assets/icons/quran.svg';

import './TopNavigation.scss';

const TopNavigation = ({
  languages,
  language,
  setLanguage,
  setRtlDirection,
  setShowQuranByWords,
  setShowTranslationByAyah,
}) => {
  const containerRef = useOutsideClick(() => {
    setShowLanguagesList(false);
  });
  const navigate = useNavigate();
  const [showLanguagesList, setShowLanguagesList] = useState(false);

  const toggleLanguageShow = () => setShowLanguagesList((prev) => !prev);

  return (
    <div className="topNav__back">
      <div className="topNav container" ref={containerRef}>
        <div className="topNav__menuLogoContainer">
          <img src={menuIcon} alt="menu icon" className="topNav__menuIcn" />
          <img
            src={logoIcon}
            alt="hifdth logo"
            className="topNav__logoIcn"
            onClick={() => {
              navigate('/');
            }}
          />
        </div>

        <img
          src={quran}
          alt="holy book icon"
          className="topNav__quranIcon"
          onClick={() => {
            setShowQuranByWords(false);
            setShowTranslationByAyah(false);
          }}
        />

        <div className="topNav__langAndUser">
          <span
            className="topNav__language"
            onClick={() => toggleLanguageShow()}
          >
            <img
              src={languageIcon}
              alt="user icon"
              className="topNav__languageIcn"
            />
            {language}
          </span>
          <img src={userIcon} alt="user icon" className="topNav__userIcn" />
        </div>

        {showLanguagesList && (
          <ul className="topNav__languages-list">
            {Object.entries(languages).map(([key, value]) => (
              <li
                key={key}
                className="topNav__languages-item"
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
