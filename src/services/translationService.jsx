import { tranlationsApi } from '../api/api';

export const fetchQuranTranslationH = (params = {}) => {
  return tranlationsApi.get('/quran_h_translate_word_by_word/', { params });
};

export const fetchQuranTranslationUniqueH = (params = {}) => {
  return tranlationsApi.get('/quran_h_translate_word_by_word_uniq/', {
    params,
  });
};
