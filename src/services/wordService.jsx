import api from '../api/api';

export const fetchRoots = () => api.get('/words/root/');
export const fetchWordRoots = () => api.get('/words/word_root/');
