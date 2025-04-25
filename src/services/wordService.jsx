import { wordApi } from '../api/api';

export const fetchQuranWordByWord = (params = {}) => {
  return wordApi.get('/quran_word_by_word/', { params });
};
export const fetchRoots = () => wordApi.get('/root/');
export const fetchWordRoots = () => wordApi.get('/word_root/');
