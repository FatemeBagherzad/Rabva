import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createCaptcha,
  getMe,
  getTodayAyah,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordRecovery,
  resetPassword,
  updatePreferences,
  updateProfile,
  uploadAvatar,
} from '../services/rabvaAccountService';

const AuthContext = createContext();

const AUTH_STORAGE_KEY = 'rabva_auth_v1';

const defaultPreferences = {
  language_code: 'fa',
  theme_code: 'default',
  quran_font_family: 'hafs-django',
  quran_font_size: 2.5,
  translation_font_family: 'inter',
  translation_font_size: 1.2,
  quran_translation_gap: 1,
  line_height_quran: 2,
  line_height_translation: 1.5,
};

const themeMap = {
  default: {
    '--rabva-bg': '#ffffff',
    '--rabva-text': '#101828',
    '--rabva-translation': '#039855',
  },
  sepia: {
    '--rabva-bg': '#f8f2e6',
    '--rabva-text': '#3b2f22',
    '--rabva-translation': '#775c2b',
  },
  night: {
    '--rabva-bg': '#0f172a',
    '--rabva-text': '#e5e7eb',
    '--rabva-translation': '#86efac',
  },
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [todayAyah, setTodayAyah] = useState(null);
  const [captcha, setCaptcha] = useState(null);
  const [devResetToken, setDevResetToken] = useState('');

  const applyTheme = useCallback((themeCode) => {
    const selectedTheme = themeMap[themeCode] || themeMap.default;
    const root = document.documentElement;
    Object.entries(selectedTheme).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.setAttribute('data-rabva-theme', themeCode || 'default');
  }, []);

  useEffect(() => {
    applyTheme(preferences.theme_code);
  }, [preferences.theme_code, applyTheme]);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.token) {
        setToken(parsed.token);
        setIsLoggedIn(true);
      }
      if (parsed.userInfo) {
        setUserInfo(parsed.userInfo);
      }
      if (parsed.preferences) {
        setPreferences((prev) => ({ ...prev, ...parsed.preferences }));
      }
    } catch (error) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ token, userInfo, preferences }),
    );
  }, [token, userInfo, preferences]);

  const fetchCaptcha = useCallback(async () => {
    const response = await createCaptcha();
    setCaptcha(response);
    return response;
  }, []);

  const fetchTodayAyah = useCallback(async () => {
    const response = await getTodayAyah();
    setTodayAyah(response);
    return response;
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) return null;
    const payload = await getMe(token);
    setUserInfo(payload);
    if (payload.preferences) {
      setPreferences((prev) => ({ ...prev, ...payload.preferences }));
    }
    return payload;
  }, [token]);

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    refreshMe().catch(() => {
      setToken(null);
      setIsLoggedIn(false);
      setUserInfo(null);
    });
  }, [isLoggedIn, token, refreshMe]);

  useEffect(() => {
    fetchTodayAyah().catch(() => {});
  }, [fetchTodayAyah]);

  const login = useCallback(async (payload) => {
    const response = await loginUser(payload);
    setToken(response.token);
    setIsLoggedIn(true);
    setUserInfo(response.user);
    setPreferences((prev) => ({ ...prev, ...(response.user?.preferences || {}) }));
    return response;
  }, []);

  const register = useCallback(async (payload) => {
    const response = await registerUser(payload);
    return response;
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutUser(token);
      } catch (error) {
        // Best effort logout keeps local state consistent even if server call fails.
      }
    }
    setToken(null);
    setIsLoggedIn(false);
    setUserInfo(null);
    setPreferences(defaultPreferences);
  }, [token]);

  const updateUserProfile = useCallback(
    async (payload) => {
      if (!token) throw new Error('No auth token found');
      const updatedProfile = await updateProfile(token, payload);
      setUserInfo((prev) => {
        if (!prev) return prev;
        return { ...prev, profile: updatedProfile };
      });
      return updatedProfile;
    },
    [token],
  );

  const updateUserPreferences = useCallback(
    async (payload) => {
      if (!token) throw new Error('No auth token found');
      const normalizedPayload = {
        ...defaultPreferences,
        ...preferences,
        ...(userInfo?.preferences || {}),
        ...payload,
      };
      const updated = await updatePreferences(token, normalizedPayload);
      const nextPreferences = {
        ...normalizedPayload,
        ...(updated || {}),
      };

      setPreferences((prev) => ({ ...prev, ...nextPreferences }));
      setUserInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          preferences: {
            ...(prev.preferences || {}),
            ...nextPreferences,
          },
        };
      });
      return nextPreferences;
    },
    [token, preferences, userInfo],
  );

  const setPreviewPreferences = useCallback((partialPayload) => {
    setPreferences((prev) => ({ ...prev, ...partialPayload }));
  }, []);

  const uploadUserAvatar = useCallback(
    async (formData) => {
      if (!token) throw new Error('No auth token found');
      const updated = await uploadAvatar(token, formData);
      setUserInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          profile: {
            ...(prev.profile || {}),
            avatar_original: null,
            avatar_cropped: updated.avatar_cropped || prev.profile?.avatar_cropped || null,
            avatar_crop_x: updated.crop?.x ?? prev.profile?.avatar_crop_x,
            avatar_crop_y: updated.crop?.y ?? prev.profile?.avatar_crop_y,
            avatar_crop_width: updated.crop?.width ?? prev.profile?.avatar_crop_width,
            avatar_crop_height: updated.crop?.height ?? prev.profile?.avatar_crop_height,
            avatar_crop_scale: updated.crop?.scale ?? prev.profile?.avatar_crop_scale,
            avatar_crop_rotation: updated.crop?.rotation ?? prev.profile?.avatar_crop_rotation,
          },
        };
      });
      return updated;
    },
    [token],
  );

  const requestRecovery = useCallback(async (email) => {
    const response = await requestPasswordRecovery({ email });
    if (response.dev_reset_token) {
      setDevResetToken(response.dev_reset_token);
    }
    return response;
  }, []);

  const completeRecovery = useCallback(async (payload) => {
    return resetPassword(payload);
  }, []);

  const contextValue = useMemo(
    () => ({
      token,
      isLoggedIn,
      userInfo,
      preferences,
      todayAyah,
      captcha,
      devResetToken,
      setIsLoggedIn,
      setUserInfo,
      fetchCaptcha,
      fetchTodayAyah,
      refreshMe,
      login,
      register,
      logout,
      updateUserProfile,
      updateUserPreferences,
      setPreviewPreferences,
      uploadUserAvatar,
      requestRecovery,
      completeRecovery,
    }),
    [
      token,
      isLoggedIn,
      userInfo,
      preferences,
      todayAyah,
      captcha,
      devResetToken,
      fetchCaptcha,
      fetchTodayAyah,
      refreshMe,
      login,
      register,
      logout,
      updateUserProfile,
      updateUserPreferences,
      setPreviewPreferences,
      uploadUserAvatar,
      requestRecovery,
      completeRecovery,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
