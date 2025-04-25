import { api } from '../api/api';

export const fetchQuran = (params = {}) => {
  return api.get('/quran/', { params });
};

export const fetchSurahNames = () => api.get('/surahnames/');
export const fetchPagesInfo = () => api.get('/pagesinfo/');
export const fetchAyahPagesInfo = () => api.get('/ayahpagesinfo/');
export const fetchTest = () => api.get('/test/');
