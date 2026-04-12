import { grammarApi } from '../api/api';

export const fetchRoots = () => grammarApi.get('/roots/');
