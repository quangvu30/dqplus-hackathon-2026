export const ACCENT_OPTIONS = ['#1f7a5c', '#3f5c8c', '#b25b3e', '#5b53a6'];

export const colors = {
  bg: '#f6f5f1',
  card: '#ffffff',
  border: '#e7e5dd',
  borderSoft: '#eceae2',
  inputBg: '#fbfaf7',
  inputBorder: '#ddd9cf',
  placeholder: '#a8a69c',
  text: '#1a1a17',
  textStrong: '#26261f',
  heading: '#1f1f19',
  textBody: '#4a4a42',
  textMuted: '#5f5e55',
  label: '#3a3a33',
  textFaint: '#8a887f',
  textFaintest: '#a3a196',
  error: '#c0503f',
  errorBorder: '#d98b78',
  errorBg: '#fbece9',
  errorBgSoft: '#fbf1ec',
  errorBorderSoft: '#efd9cf',
  errorText: '#9a4436',
  errorTextSoft: '#8a5a4a',
  accent: '#1f7a5c',
};

export function hexToRgba(hex, alpha) {
  let h = (hex || colors.accent).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export const fonts = {
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  sans: 'HankenGrotesk_400Regular',
  sansMedium: 'HankenGrotesk_500Medium',
  sansSemiBold: 'HankenGrotesk_600SemiBold',
  sansBold: 'HankenGrotesk_700Bold',
};

export const radii = {
  sm: 9,
  md: 11,
  lg: 14,
  xl: 18,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
