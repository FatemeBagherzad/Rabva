import axios from 'axios';

export const api = axios.create({
  baseURL: '/main',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const wordApi = axios.create({
  baseURL: '/words',
  headers: {
    'Content-Type': 'application/json',
  },
});
