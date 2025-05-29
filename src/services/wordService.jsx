import { wordApi } from '../api/api';

export const fetchQuranWordByWord = (params = {}) => {
  return wordApi.get('/quran_word_by_word/', { params });
};

export const fetchAyahByRoot = (params = {}) => {
  return wordApi.get('/root/', { params });
};

export const fetchWordRoots = () => wordApi.get('/word_root/');
