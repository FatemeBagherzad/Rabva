import { useNavigate } from 'react-router-dom';
import './TopNavigation.scss';
import menuIcon from '../../assets/icons/menu.svg';
import logoIcon from '../../assets/logo/logo-hefz-app-white.svg';
import userIcon from '../../assets/icons/user.svg';

const TopNavigation = () => {
  const navigate = useNavigate();
  return (
    <div className="topNav__back">
      <div className="topNav container">
        <img src={menuIcon} alt="menu icon" className="topNav__menuIcn" />
        <img
          src={logoIcon}
          alt="hifdth logo"
          className="topNav__logoIcn"
          onClick={() => {
            navigate('/');
          }}
        />
        <img src={userIcon} alt="user icon" className="topNav__userIcn" />
      </div>
    </div>
  );
};
export default TopNavigation;
