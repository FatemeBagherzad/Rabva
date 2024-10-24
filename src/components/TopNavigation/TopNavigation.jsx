import './TopNavigation.scss';
import menuIcon from '../../assets/icons/menu.svg';
import logoIcon from '../../assets/logo/logo-hefz-app-white.svg';
import userIcon from '../../assets/icons/user.svg';

const TopNavigation = () => {
  return (
    <div className="topNav">
      <img src={menuIcon} alt="menu icon" className="topNav__menuIcn" />
      <img src={logoIcon} alt="hifdth logo" className="topNav__logoIcn" />
      <img src={userIcon} alt="user icon" className="topNav__userIcn" />
    </div>
  );
};
export default TopNavigation;
