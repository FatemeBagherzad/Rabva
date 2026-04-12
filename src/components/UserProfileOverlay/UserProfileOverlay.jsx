import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './UserProfileOverlay.scss';

const DEFAULT_FONTS = [
  'hafs-django',
  'hafs-uthmanic',
  'uthmanic',
  'noto-naskh-arabic',
  'inter',
];

const DEFAULT_THEMES = ['default', 'sepia', 'night'];

const buildStepOptions = (start, end, step) => {
  const options = [];
  const precision = Math.max(0, (String(step).split('.')[1] || '').length);
  for (let value = start; value <= end + step / 2; value += step) {
    options.push(Number(value.toFixed(precision)));
  }
  return options;
};

const DISTANCE_OPTIONS = buildStepOptions(0, 4, 0.1);
const QURAN_FONT_SIZE_UI_OPTIONS = buildStepOptions(1, 48, 1);
const TRANSLATION_FONT_SIZE_UI_OPTIONS = buildStepOptions(1, 48, 1);
const MENU_FONT_SIZE_UI_OPTIONS = buildStepOptions(8, 48, 1);

const remToUiSize = (remValue, fallbackRem) => {
  const value = Number(remValue);
  const safeRem = Number.isFinite(value) ? value : fallbackRem;
  return Math.round(safeRem * 10);
};

const uiSizeToRem = (uiValue, fallbackRem) => {
  const value = Number(uiValue);
  if (!Number.isFinite(value)) return fallbackRem;
  return Number((value / 10).toFixed(1));
};

const CompactScrollSelect = ({
  options,
  value,
  onChange,
  formatOption = (option) => String(option),
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOptionRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    selectedOptionRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, value]);

  return (
    <div className={`user-overlay__compact-select ${isOpen ? 'is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="user-overlay__compact-select-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span>{formatOption(value)}</span>
      </button>

      {isOpen ? (
        <div className="user-overlay__compact-select-panel" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = String(option) === String(value);
            return (
              <button
                key={String(option)}
                type="button"
                className={`user-overlay__compact-select-option ${
                  isSelected ? 'is-selected' : ''
                }`}
                role="option"
                aria-selected={isSelected}
                ref={isSelected ? selectedOptionRef : null}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {formatOption(option)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const parseApiError = (error, fallbackMessage) => {
  const payload = error?.response?.data;
  if (!payload) return fallbackMessage;

  if (typeof payload === 'string') return payload;
  if (payload.detail) return payload.detail;

  const messages = Object.entries(payload)
    .map(([field, value]) => {
      if (Array.isArray(value)) {
        return `${field}: ${value.join(', ')}`;
      }
      if (value && typeof value === 'object') {
        return `${field}: ${JSON.stringify(value)}`;
      }
      return `${field}: ${String(value)}`;
    })
    .filter(Boolean);

  return messages.length ? messages.join(' | ') : fallbackMessage;
};

const normalizeAvatarUrl = (url) => {
  if (!url) return '';
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
};

const AVATAR_OUTPUT_SIZE = 512;

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load selected image.'));
    };
    image.src = objectUrl;
  });

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to process avatar image.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });

const buildProcessedAvatarFile = async (file, crop, frameWidth = 192, frameHeight = 192) => {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not initialize image processing context.');
  }

  context.clearRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);

  const fitScale = Math.max(
    AVATAR_OUTPUT_SIZE / image.width,
    AVATAR_OUTPUT_SIZE / image.height,
  );
  const drawWidth = image.width * fitScale;
  const drawHeight = image.height * fitScale;
  const safeFrameWidth = Math.max(1, frameWidth || 192);
  const safeFrameHeight = Math.max(1, frameHeight || 192);
  const offsetScaleX = AVATAR_OUTPUT_SIZE / safeFrameWidth;
  const offsetScaleY = AVATAR_OUTPUT_SIZE / safeFrameHeight;

  context.save();
  context.translate(
    AVATAR_OUTPUT_SIZE / 2 + (crop.avatar_crop_x || 0) * offsetScaleX,
    AVATAR_OUTPUT_SIZE / 2 + (crop.avatar_crop_y || 0) * offsetScaleY,
  );
  context.rotate(((crop.avatar_crop_rotation || 0) * Math.PI) / 180);
  context.scale(crop.avatar_crop_scale || 1, crop.avatar_crop_scale || 1);
  context.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
  );
  context.restore();

  const outputMimeType = file.type === 'image/png' || file.type === 'image/webp'
    ? file.type
    : 'image/jpeg';
  const blob = await canvasToBlob(canvas, outputMimeType, 0.92);
  const extension = outputMimeType === 'image/png'
    ? 'png'
    : outputMimeType === 'image/webp'
      ? 'webp'
      : 'jpg';
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return new File([blob], `avatar-cropped-${uniqueSuffix}.${extension}`, { type: outputMimeType });
};

const UserProfileOverlay = ({
  isOpen,
  onClose,
  languages,
  setLanguage,
  language,
}) => {
  const {
    isLoggedIn,
    userInfo,
    preferences,
    todayAyah,
    fetchTodayAyah,
    captcha,
    devResetToken,
    fetchCaptcha,
    login,
    register,
    logout,
    updateUserProfile,
    updateUserPreferences,
    setPreviewPreferences,
    requestRecovery,
    completeRecovery,
    uploadUserAvatar,
  } = useAuth();

  const [authTab, setAuthTab] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    registerConfirm: '',
    recoveryConfirm: '',
  });
  const [touched, setTouched] = useState({
    registerConfirm: false,
    recoveryConfirm: false,
  });

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirm_password: '',
    display_name: '',
    captcha_answer: '',
  });
  const [recoveryForm, setRecoveryForm] = useState({
    email: '',
    token: '',
    new_password: '',
    confirm_new_password: '',
  });

  const validateRegisterConfirm = (password, confirmPassword) => {
    if (!confirmPassword) return '';
    if (password !== confirmPassword) {
      return 'Password and confirm password do not match.';
    }
    return '';
  };

  const validateRecoveryConfirm = (password, confirmPassword) => {
    if (!confirmPassword) return '';
    if (password !== confirmPassword) {
      return 'New password and confirm password do not match.';
    }
    return '';
  };

  const [profileDraft, setProfileDraft] = useState({
    display_name: '',
    bio: '',
    visibility: 'private',
  });

  const [prefDraft, setPrefDraft] = useState(preferences);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [avatarCrop, setAvatarCrop] = useState({
    avatar_crop_x: 0,
    avatar_crop_y: 0,
    avatar_crop_width: 100,
    avatar_crop_height: 100,
    avatar_crop_scale: 1,
    avatar_crop_rotation: 0,
  });
  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
  });
  const avatarInputRef = useRef(null);
  const avatarFrameRef = useRef(null);

  const persistedAvatarUrl = useMemo(() => {
    const raw = userInfo?.profile?.avatar_cropped || '';
    return normalizeAvatarUrl(raw);
  }, [userInfo]);

  const billingSummary = useMemo(() => {
    const billing = userInfo?.billing;
    if (!billing || !billing.active_subscription) {
      return {
        planName: 'No active plan',
        expiresAt: 'N/A',
      };
    }

    return {
      planName: billing.active_subscription.plan_name,
      expiresAt: new Date(
        billing.active_subscription.current_period_end,
      ).toLocaleDateString(),
    };
  }, [userInfo]);

  const restoreUnsavedPreview = useCallback(() => {
    if (!isLoggedIn) return;
    const persistedPreferences = userInfo?.preferences;
    if (!persistedPreferences) return;
    setPreviewPreferences({ ...persistedPreferences });
    if (
      persistedPreferences.language_code &&
      persistedPreferences.language_code !== language
    ) {
      setLanguage(persistedPreferences.language_code);
    }
  }, [isLoggedIn, userInfo, setPreviewPreferences, language, setLanguage]);

  const handleOverlayClose = useCallback(() => {
    restoreUnsavedPreview();
    onClose();
  }, [restoreUnsavedPreview, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
    setSuccessMessage('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleOverlayClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, handleOverlayClose]);

  useEffect(() => {
    if (!isOpen) return;
    fetchTodayAyah().catch(() => {});

    if (!isLoggedIn) {
      fetchCaptcha().catch(() => {});
      return;
    }

    setProfileDraft({
      display_name: userInfo?.profile?.display_name || '',
      bio: userInfo?.profile?.bio || '',
      visibility: userInfo?.profile?.visibility || 'private',
    });
    setPrefDraft({
      ...preferences,
      ...(userInfo?.preferences || {}),
    });
  }, [
    isOpen,
    isLoggedIn,
    userInfo,
    fetchCaptcha,
    fetchTodayAyah,
  ]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl('');
      return;
    }

    const nextUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(nextUrl);
    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [avatarFile]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await login(loginForm);
      setSuccessMessage('Logged in successfully.');
      handleOverlayClose();
    } catch (error) {
      setErrorMessage(parseApiError(error, 'Login failed.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    const registerConfirmError = validateRegisterConfirm(
      registerForm.password,
      registerForm.confirm_password,
    );
    if (registerConfirmError) {
      setFieldErrors((prev) => ({ ...prev, registerConfirm: registerConfirmError }));
      setTouched((prev) => ({ ...prev, registerConfirm: true }));
      setErrorMessage(registerConfirmError);
      return;
    }

    setAuthLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await register({
        ...registerForm,
        captcha_id: captcha?.captcha_id,
      });
      setSuccessMessage('Account created. You can login now.');
      setAuthTab('login');
      setRegisterForm({
        email: '',
        password: '',
        confirm_password: '',
        display_name: '',
        captcha_answer: '',
      });
      setFieldErrors((prev) => ({ ...prev, registerConfirm: '' }));
      setTouched((prev) => ({ ...prev, registerConfirm: false }));
      await fetchCaptcha();
    } catch (error) {
      setErrorMessage(parseApiError(error, 'Registration failed.'));
      await fetchCaptcha();
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRecovery = async (event) => {
    event.preventDefault();
    const recoveryConfirmError = validateRecoveryConfirm(
      recoveryForm.new_password,
      recoveryForm.confirm_new_password,
    );
    if (recoveryConfirmError) {
      setFieldErrors((prev) => ({ ...prev, recoveryConfirm: recoveryConfirmError }));
      setTouched((prev) => ({ ...prev, recoveryConfirm: true }));
      setErrorMessage(recoveryConfirmError);
      return;
    }

    setAuthLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (recoveryForm.token && recoveryForm.new_password) {
        await completeRecovery({
          token: recoveryForm.token,
          new_password: recoveryForm.new_password,
        });
        setSuccessMessage('Password reset completed.');
      } else {
        await requestRecovery(recoveryForm.email);
        setSuccessMessage('Recovery placeholder generated.');
      }
    } catch (error) {
      setErrorMessage(parseApiError(error, 'Password recovery failed.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePreferenceChange = (field, value) => {
    const next = { ...prefDraft, [field]: value };
    setPrefDraft(next);
    setPreviewPreferences({ [field]: value });

    if (field === 'language_code') {
      setLanguage(value);
    }
  };

  const handleAvatarFileChange = (event) => {
    setAvatarFile(event.target.files?.[0] || null);
    setAvatarCrop((prev) => ({
      ...prev,
      avatar_crop_x: 0,
      avatar_crop_y: 0,
      avatar_crop_scale: 1,
      avatar_crop_rotation: 0,
    }));
  };

  const handleAvatarPickerClick = () => {
    avatarInputRef.current?.click();
  };

  const beginAvatarDrag = (clientX, clientY, pointerId = null) => {
    dragStateRef.current.active = true;
    dragStateRef.current.pointerId = pointerId;
    dragStateRef.current.lastX = clientX;
    dragStateRef.current.lastY = clientY;
  };

  const applyAvatarDrag = (clientX, clientY) => {
    const deltaX = clientX - dragStateRef.current.lastX;
    const deltaY = clientY - dragStateRef.current.lastY;
    dragStateRef.current.lastX = clientX;
    dragStateRef.current.lastY = clientY;

    setAvatarCrop((prev) => ({
      ...prev,
      avatar_crop_x: prev.avatar_crop_x + deltaX,
      avatar_crop_y: prev.avatar_crop_y + deltaY,
    }));
  };

  const stopAvatarDrag = () => {
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = null;
  };

  const handleAvatarMouseDown = (event) => {
    event.preventDefault();
    beginAvatarDrag(event.clientX, event.clientY);
  };

  const handleAvatarTouchStart = (event) => {
    const firstTouch = event.touches[0];
    if (!firstTouch) return;
    beginAvatarDrag(firstTouch.clientX, firstTouch.clientY, firstTouch.identifier);
  };

  const handleAvatarWheel = (event) => {
    event.preventDefault();
    const zoomDelta = event.deltaY > 0 ? -0.05 : 0.05;
    setAvatarCrop((prev) => ({
      ...prev,
      avatar_crop_scale: Math.min(3, Math.max(0.4, prev.avatar_crop_scale + zoomDelta)),
    }));
  };

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!dragStateRef.current.active) return;
      applyAvatarDrag(event.clientX, event.clientY);
    };

    const handleTouchMove = (event) => {
      if (!dragStateRef.current.active) return;
      const touch = Array.from(event.touches).find(
        (entry) => entry.identifier === dragStateRef.current.pointerId,
      );
      if (!touch) return;
      applyAvatarDrag(touch.clientX, touch.clientY);
    };

    const handlePointerUp = () => {
      stopAvatarDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('touchcancel', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
    };
  }, []);

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateUserProfile(profileDraft);
      const normalizedPreferences = {
        ...preferences,
        ...prefDraft,
      };
      await updateUserPreferences(normalizedPreferences);

      if (avatarFile) {
        const frameWidth = avatarFrameRef.current?.clientWidth || 192;
        const frameHeight = avatarFrameRef.current?.clientHeight || 192;
        const croppedAvatarFile = await buildProcessedAvatarFile(
          avatarFile,
          avatarCrop,
          frameWidth,
          frameHeight,
        );
        const formData = new FormData();
        formData.append('avatar_cropped', croppedAvatarFile);
        Object.entries(avatarCrop).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        await uploadUserAvatar(formData);
      }

      setSuccessMessage('Profile and preferences saved.');
    } catch (error) {
      setErrorMessage(parseApiError(error, 'Save failed.'));
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="user-overlay">
      <div
        className="user-overlay__backdrop"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleOverlayClose();
        }}
      />
      <aside
        className="user-overlay__panel"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="user-overlay__header">
          <h2>User Profile</h2>
        </div>

        <section className="user-overlay__today-ayah">
          <p className="user-overlay__ayah-text">{todayAyah?.text || 'Loading ayah...'}</p>
          <p className="user-overlay__ayah-ref">{todayAyah?.reference || ''}</p>
        </section>

        {errorMessage ? <p className="user-overlay__error">{errorMessage}</p> : null}
        {successMessage ? <p className="user-overlay__success">{successMessage}</p> : null}

        {!isLoggedIn ? (
          <section>
            <div className="user-overlay__tabs">
              <button
                type="button"
                className={`user-overlay__tab-btn user-overlay__tab-btn--login ${
                  authTab === 'login' ? 'user-overlay__tab-btn--active' : ''
                }`}
                onClick={() => setAuthTab('login')}
                aria-label="Login"
                title="Login"
              >
                <span className="user-overlay__tab-icon" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`user-overlay__tab-btn user-overlay__tab-btn--create ${
                  authTab === 'create' ? 'user-overlay__tab-btn--active' : ''
                }`}
                onClick={() => setAuthTab('create')}
                aria-label="Create user"
                title="Create user"
              >
                <span className="user-overlay__tab-icon" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`user-overlay__tab-btn user-overlay__tab-btn--recovery ${
                  authTab === 'recovery' ? 'user-overlay__tab-btn--active' : ''
                }`}
                onClick={() => setAuthTab('recovery')}
                aria-label="Recover password"
                title="Recover password"
              >
                <span className="user-overlay__tab-icon" aria-hidden="true">
                  <span className="lock-top-1" />
                  <span className="lock-top-2" />
                  <span className="lock-body" />
                  <span className="lock-hole" />
                </span>
              </button>
            </div>

            {authTab === 'login' && (
              <form className="user-overlay__form" onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
                <button type="submit" disabled={authLoading}>
                  {authLoading ? 'Please wait...' : 'Login'}
                </button>
              </form>
            )}

            {authTab === 'create' && (
              <form className="user-overlay__form" onSubmit={handleRegister}>
                <input
                  type="email"
                  placeholder="Email"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((prev) => {
                      const next = { ...prev, password: event.target.value };
                      if (touched.registerConfirm) {
                        setFieldErrors((old) => ({
                          ...old,
                          registerConfirm: validateRegisterConfirm(
                            next.password,
                            next.confirm_password,
                          ),
                        }));
                      }
                      return next;
                    })
                  }
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm password"
                  className={fieldErrors.registerConfirm ? 'inputErrorStyle' : ''}
                  value={registerForm.confirm_password}
                  onChange={(event) =>
                    setRegisterForm((prev) => {
                      const next = {
                        ...prev,
                        confirm_password: event.target.value,
                      };
                      if (touched.registerConfirm) {
                        setFieldErrors((old) => ({
                          ...old,
                          registerConfirm: validateRegisterConfirm(
                            next.password,
                            next.confirm_password,
                          ),
                        }));
                      }
                      return next;
                    })
                  }
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, registerConfirm: true }));
                    setFieldErrors((prev) => ({
                      ...prev,
                      registerConfirm: validateRegisterConfirm(
                        registerForm.password,
                        registerForm.confirm_password,
                      ),
                    }));
                  }}
                  required
                />
                {fieldErrors.registerConfirm ? (
                  <p className="user-overlay__field-error">{fieldErrors.registerConfirm}</p>
                ) : null}
                <input
                  type="text"
                  placeholder="Display name"
                  value={registerForm.display_name}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, display_name: event.target.value }))
                  }
                  required
                />

                <div className="user-overlay__captcha-row">
                  <span>{captcha?.challenge || 'Loading captcha...'}</span>
                  <button type="button" onClick={() => fetchCaptcha()}>
                    Refresh
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Captcha answer"
                  value={registerForm.captcha_answer}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      captcha_answer: event.target.value,
                    }))
                  }
                  required
                />

                <button type="submit" disabled={authLoading}>
                  {authLoading ? 'Please wait...' : 'Create User'}
                </button>
              </form>
            )}

            {authTab === 'recovery' && (
              <form className="user-overlay__form" onSubmit={handleRecovery}>
                <input
                  type="email"
                  placeholder="Email"
                  value={recoveryForm.email}
                  onChange={(event) =>
                    setRecoveryForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
                <button type="submit" disabled={authLoading}>
                  {authLoading ? 'Please wait...' : 'Request reset token'}
                </button>
                {devResetToken ? (
                  <p className="user-overlay__placeholder-note">
                    Dev reset token (placeholder): {devResetToken}
                  </p>
                ) : null}
                <input
                  type="text"
                  placeholder="Reset token"
                  value={recoveryForm.token}
                  onChange={(event) =>
                    setRecoveryForm((prev) => ({ ...prev, token: event.target.value }))
                  }
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={recoveryForm.new_password}
                  onChange={(event) =>
                    setRecoveryForm((prev) => {
                      const next = {
                        ...prev,
                        new_password: event.target.value,
                      };
                      if (touched.recoveryConfirm) {
                        setFieldErrors((old) => ({
                          ...old,
                          recoveryConfirm: validateRecoveryConfirm(
                            next.new_password,
                            next.confirm_new_password,
                          ),
                        }));
                      }
                      return next;
                    })
                  }
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className={fieldErrors.recoveryConfirm ? 'inputErrorStyle' : ''}
                  value={recoveryForm.confirm_new_password}
                  onChange={(event) =>
                    setRecoveryForm((prev) => {
                      const next = {
                        ...prev,
                        confirm_new_password: event.target.value,
                      };
                      if (touched.recoveryConfirm) {
                        setFieldErrors((old) => ({
                          ...old,
                          recoveryConfirm: validateRecoveryConfirm(
                            next.new_password,
                            next.confirm_new_password,
                          ),
                        }));
                      }
                      return next;
                    })
                  }
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, recoveryConfirm: true }));
                    setFieldErrors((prev) => ({
                      ...prev,
                      recoveryConfirm: validateRecoveryConfirm(
                        recoveryForm.new_password,
                        recoveryForm.confirm_new_password,
                      ),
                    }));
                  }}
                />
                {fieldErrors.recoveryConfirm ? (
                  <p className="user-overlay__field-error">{fieldErrors.recoveryConfirm}</p>
                ) : null}
                <button type="submit" disabled={authLoading}>
                  {authLoading ? 'Please wait...' : 'Reset password'}
                </button>
              </form>
            )}
          </section>
        ) : (
          <section className="user-overlay__profile">
            <details className="user-overlay__section" open>
              <summary>Account</summary>
              <div className="user-overlay__section-body">
                <div className="user-overlay__account-top">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="user-overlay__avatar-input-hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <div className="user-overlay__avatar-column">
                    <div className="user-overlay__avatar-frame" ref={avatarFrameRef}>
                      {avatarPreviewUrl || persistedAvatarUrl ? (
                        <div
                          className="user-overlay__avatar-box user-overlay__avatar-box--crop"
                          onMouseDown={avatarPreviewUrl ? handleAvatarMouseDown : undefined}
                          onTouchStart={avatarPreviewUrl ? handleAvatarTouchStart : undefined}
                          onWheel={avatarPreviewUrl ? handleAvatarWheel : undefined}
                          role="presentation"
                        >
                          <img
                            src={avatarPreviewUrl || persistedAvatarUrl}
                            alt="profile avatar"
                            style={{
                              transform: avatarPreviewUrl
                                ? `translate(${avatarCrop.avatar_crop_x}px, ${avatarCrop.avatar_crop_y}px) scale(${avatarCrop.avatar_crop_scale}) rotate(${avatarCrop.avatar_crop_rotation}deg)`
                                : 'none',
                            }}
                          />
                        </div>
                      ) : (
                        <span className="user-overlay__avatar-placeholder-text">
                          No photo selected
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="user-overlay__avatar-choose-btn"
                      onClick={handleAvatarPickerClick}
                    >
                      Choose pic
                    </button>
                  </div>

                  <div className="user-overlay__account-id-block">
                    <label>
                      User ID (email)
                      <input
                        type="email"
                        className="user-overlay__email-id"
                        value={userInfo?.email || ''}
                        readOnly
                      />
                    </label>
                    <label>
                      Display name
                      <input
                        type="text"
                        value={profileDraft.display_name}
                        onChange={(event) =>
                          setProfileDraft((prev) => ({
                            ...prev,
                            display_name: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>

                {avatarPreviewUrl ? (
                  <>
                    <div className="user-overlay__avatar-controls">
                      <div className="user-overlay__zoom-controls">
                        <button
                          type="button"
                          onClick={() =>
                            setAvatarCrop((prev) => ({
                              ...prev,
                              avatar_crop_scale: Math.max(0.4, prev.avatar_crop_scale - 0.1),
                            }))
                          }
                        >
                          -
                        </button>
                        <span>{avatarCrop.avatar_crop_scale.toFixed(2)}x</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAvatarCrop((prev) => ({
                              ...prev,
                              avatar_crop_scale: Math.min(3, prev.avatar_crop_scale + 0.1),
                            }))
                          }
                        >
                          +
                        </button>
                      </div>

                      <div className="user-overlay__rotate-controls">
                        <button
                          type="button"
                          onClick={() =>
                            setAvatarCrop((prev) => ({
                              ...prev,
                              avatar_crop_rotation: prev.avatar_crop_rotation - 5,
                            }))
                          }
                        >
                          Rotate -
                        </button>
                        <span>{Math.round(avatarCrop.avatar_crop_rotation)}deg</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAvatarCrop((prev) => ({
                              ...prev,
                              avatar_crop_rotation: prev.avatar_crop_rotation + 5,
                            }))
                          }
                        >
                          Rotate +
                        </button>
                      </div>
                    </div>
                    <p className="user-overlay__avatar-hint">
                      Drag image in the frame. Use mouse wheel or +/- to zoom, and rotate +/- to turn.
                    </p>
                  </>
                ) : null}

                <label>
                  Bio
                  <textarea
                    value={profileDraft.bio}
                    onChange={(event) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        bio: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Visibility
                  <select
                    value={profileDraft.visibility}
                    onChange={(event) =>
                      setProfileDraft((prev) => ({
                        ...prev,
                        visibility: event.target.value,
                      }))
                    }
                  >
                    <option value="private">Private</option>
                    <option value="members_only">Members only</option>
                    <option value="public">Public</option>
                  </select>
                </label>
              </div>
            </details>

            <details className="user-overlay__section" open>
              <summary>Appearance</summary>
              <div className="user-overlay__section-body">
                <div className="user-overlay__row2">
                  <label>
                    Language
                    <select
                      value={prefDraft.language_code || language}
                      onChange={(event) =>
                        handlePreferenceChange('language_code', event.target.value)
                      }
                    >
                      {Object.entries(languages || {}).map(([code, value]) => (
                        <option key={code} value={code}>
                          {value[0]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Theme
                    <select
                      value={prefDraft.theme_code || 'default'}
                      onChange={(event) =>
                        handlePreferenceChange('theme_code', event.target.value)
                      }
                    >
                      {DEFAULT_THEMES.map((theme) => (
                        <option key={theme} value={theme}>
                          {theme}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="user-overlay__row2">
                  <label>
                    Quran font
                    <select
                      value={prefDraft.quran_font_family || 'hafs-django'}
                      onChange={(event) =>
                        handlePreferenceChange('quran_font_family', event.target.value)
                      }
                    >
                      {DEFAULT_FONTS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Translation font
                    <select
                      value={prefDraft.translation_font_family || 'inter'}
                      onChange={(event) =>
                        handlePreferenceChange(
                          'translation_font_family',
                          event.target.value,
                        )
                      }
                    >
                      {DEFAULT_FONTS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="user-overlay__row2">
                  <label>
                    Quran font size
                    <CompactScrollSelect
                      ariaLabel="Quran font size"
                      options={QURAN_FONT_SIZE_UI_OPTIONS}
                      value={remToUiSize(prefDraft.quran_font_size, 2.5)}
                      onChange={(selectedValue) =>
                        handlePreferenceChange(
                          'quran_font_size',
                          uiSizeToRem(selectedValue, prefDraft.quran_font_size || 2.5),
                        )
                      }
                    />
                  </label>

                  <label>
                    Translation font size
                    <CompactScrollSelect
                      ariaLabel="Translation font size"
                      options={TRANSLATION_FONT_SIZE_UI_OPTIONS}
                      value={remToUiSize(prefDraft.translation_font_size, 1.2)}
                      onChange={(selectedValue) =>
                        handlePreferenceChange(
                          'translation_font_size',
                          uiSizeToRem(selectedValue, prefDraft.translation_font_size || 1.2),
                        )
                      }
                    />
                  </label>
                </div>

                <div className="user-overlay__row2">
                  <label>
                    Menu font size
                    <CompactScrollSelect
                      ariaLabel="Menu font size"
                      options={MENU_FONT_SIZE_UI_OPTIONS}
                      value={remToUiSize(prefDraft.menu_font_size, 1.4)}
                      onChange={(selectedValue) =>
                        handlePreferenceChange(
                          'menu_font_size',
                          uiSizeToRem(selectedValue, prefDraft.menu_font_size || 1.4),
                        )
                      }
                    />
                  </label>

                  <label>
                    Quran/translation distance
                    <CompactScrollSelect
                      ariaLabel="Quran and translation distance"
                      options={DISTANCE_OPTIONS}
                      value={Number(prefDraft.quran_translation_gap || 1)}
                      onChange={(selectedValue) =>
                        handlePreferenceChange('quran_translation_gap', Number(selectedValue))
                      }
                    />
                  </label>
                </div>
              </div>
            </details>

            <details className="user-overlay__section" open>
              <summary>Subscription and Usage</summary>
              <div className="user-overlay__section-body user-overlay__row2">
                <p>Plan: {billingSummary.planName}</p>
                <p>Expires: {billingSummary.expiresAt}</p>
                <p>AI tokens left: {userInfo?.token_wallet?.balance_tokens ?? 0}</p>
              </div>
            </details>

            <div className="user-overlay__actions">
              <button type="button" onClick={handleSaveProfile} disabled={saveLoading}>
                {saveLoading ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={handleOverlayClose}>
                Close
              </button>
              <button type="button" onClick={logout}>
                Logout
              </button>
            </div>
          </section>
        )}
      </aside>
    </div>
  );
};

export default UserProfileOverlay;
