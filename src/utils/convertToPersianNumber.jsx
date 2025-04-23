const convertToPersianNumber = (input) => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  return input
    .toString()
    .replace(/\d/g, (digit) => persianDigits[Number(digit)]);
};

export default convertToPersianNumber;
