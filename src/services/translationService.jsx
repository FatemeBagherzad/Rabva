import { tranlationsApi } from '../api/api';

export const fetchLanguages = () => tranlationsApi.get('/languages/');
export const fetchTranslatorNames = () =>
  tranlationsApi.get('/translation_names/');

export const fetchUiTranslation = (params) => {
  return tranlationsApi.get('/ui_translations/', { params });
};

export const fetchTranslationAyahs = (params) => {
  return tranlationsApi.get('/translate_ayahs/', { params });
};

export const fetchQuranTranslationH = (params = {}) => {
  return tranlationsApi.get('/quran_h_translate_word_by_word/', { params });
};

export const fetchQuranTranslationUniqueH = (params = {}) => {
  return tranlationsApi.get('/quran_h_translate_word_by_word/', {
    params,
  });
};
