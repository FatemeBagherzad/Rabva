import { rabvaAccountApi } from '../api/api';

export const withAuthHeaders = (token, extraHeaders = {}) => ({
  headers: {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  },
});

export const createCaptcha = async () => {
  const response = await rabvaAccountApi.get('/captcha/');
  return response.data;
};

export const registerUser = async (payload) => {
  const response = await rabvaAccountApi.post('/register/', payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await rabvaAccountApi.post('/login/', payload);
  return response.data;
};

export const logoutUser = async (token) => {
  const response = await rabvaAccountApi.post('/logout/', {}, withAuthHeaders(token));
  return response.data;
};

export const getMe = async (token) => {
  const response = await rabvaAccountApi.get('/me/', withAuthHeaders(token));
  return response.data;
};

export const getTodayAyah = async () => {
  const response = await rabvaAccountApi.get('/today-ayah/');
  return response.data;
};

export const updateProfile = async (token, payload) => {
  const response = await rabvaAccountApi.put(
    '/me/profile/',
    payload,
    withAuthHeaders(token),
  );
  return response.data;
};

export const updatePreferences = async (token, payload) => {
  const response = await rabvaAccountApi.put(
    '/me/preferences/',
    payload,
    withAuthHeaders(token),
  );
  return response.data;
};

export const uploadAvatar = async (token, formData) => {
  const response = await rabvaAccountApi.post('/me/avatar/', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const requestPasswordRecovery = async (payload) => {
  const response = await rabvaAccountApi.post('/password-recovery/request/', payload);
  return response.data;
};

export const resetPassword = async (payload) => {
  const response = await rabvaAccountApi.post('/password-recovery/reset/', payload);
  return response.data;
};
