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

export const tranlationsApi = axios.create({
  baseURL: '/translations',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const grammarApi = axios.create({
  baseURL: '/grammar',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const rabvaAccountApi = axios.create({
  baseURL: '/rabva-accounts',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const researchSocialApi = axios.create({
  baseURL: '/research-social',
  headers: {
    'Content-Type': 'application/json',
  },
});
