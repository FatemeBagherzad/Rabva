import besmBack from '../../assets/img/quran-besm-frame-green.png';
import './QuranTxt.scss';

const QuranTxt = ({ convertToPersianNumber, verses }) => {
  return (
    <div className="quran">
      <div className="quran__verses">
        {verses.map((verse) => (
          <span key={verse.id} className="quran__verse">
            {verse.ayah === 1 && (
              <div className="quran__besm-container">
                <img
                  src={besmBack}
                  alt="border image"
                  className="quran__besm-back"
                />
                <span className="quran__besm">
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </span>
              </div>
            )}

            {'\u00A0' + verse.verse + '\u00A0'}
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
