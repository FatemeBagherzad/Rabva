import { fetchOneAyahWordByWord } from './wordService';

const normalizeDigits = (value) =>
  String(value || '')
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776));

const parseAddress = (value) => {
  const normalized = normalizeDigits(value);
  const match = normalized
    .trim()
    .match(/^(\d+)\s*:\s*(\d+)$/);
  if (!match) return null;

  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || surah < 1 || ayah < 1) {
    return null;
  }

  return { surah, ayah };
};

const toWordSegments = (payload, surah, ayah) => {
  const data = payload?.data;
  if (!data) return null;
  if (Number(data.surah_number) !== Number(surah) || Number(data.ayah_number) !== Number(ayah)) {
    return null;
  }

  const row = data.ayah_word_by_word || {};
  const wholeWords = Array.isArray(row.whole_words) ? row.whole_words : [];
  const segmentsByWord = Array.isArray(row.segments_by_word) ? row.segments_by_word : [];

  const words = wholeWords.map((word, index) => ({
    text: word || '---',
    segments: Array.isArray(segmentsByWord[index]) ? segmentsByWord[index] : [],
  }));

  return words.length ? words : null;
};

export const resolveAyahAddressToWords = async (addressValue) => {
  const parsed = parseAddress(addressValue);
  if (!parsed) {
    return { ok: false, error: 'Use format like 2:4' };
  }

  const { surah, ayah } = parsed;
  const response = await fetchOneAyahWordByWord({
    surah_number: surah,
    ayah_number: ayah,
  });

  const words = toWordSegments(response?.data, surah, ayah);
  if (!words) {
    return { ok: false, error: `Ayah ${surah}:${ayah} was not found` };
  }

  return {
    ok: true,
    words,
    surahNumber: surah,
    ayahNumber: ayah,
    normalizedAddress: `${surah}:${ayah}`,
  };
};
