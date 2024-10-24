// QuranPage.jsx
import './QuranTxt.scss';

const QuranTxt = ({ currentPage, convertToPersianNumber, verses }) => {
  return (
    <div className="quran">
      <div className="quran__verses">
        {verses.map((verse) => (
          <span key={verse.id} className="quran__verse">
            {'\u00A0' + verse.verse}
            <span className="quran__ayah-number">
              ﴿‏{convertToPersianNumber(verse.ayah)}‎﴾
            </span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default QuranTxt;
