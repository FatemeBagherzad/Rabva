import homePageIcon from '../../assets/icons/home-Page.svg';
import memoAppIcon from '../../assets/icons/memorization-app.svg';
import memoPlanIcon from '../../assets/icons/memorization-plan.svg';
import coachesIcon from '../../assets/icons/coaches.svg';
import aboutIcon from '../../assets/icons/about.svg';
import contactUsIcon from '../../assets/icons/contact-us.svg';

import './MainMenu.scss';

const MainMenu = () => {
  return (
    <div className="menu">
      <span className="menu__option">
        <img src={homePageIcon} className="icon" />
        Homepage
      </span>
      <span className="menu__option">
        <img src={memoAppIcon} className="icon" />
        Memorize App
      </span>
      <span className="menu__option">
        <img src={memoPlanIcon} className="icon" />
        Memorize Plan
      </span>
      <span className="menu__option">
        <img src={coachesIcon} className="icon" />
        Coaches
      </span>
      <span className="menu__option">
        <img src={aboutIcon} className="icon" />
        About
      </span>
      <span className="menu__option">
        <img src={contactUsIcon} className="icon" />
        Contact Us
      </span>
    </div>
  );
};
export default MainMenu;
