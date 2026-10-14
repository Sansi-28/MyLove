// ═══════════════════════════════════════════
// 💕 Theme — Kaju & Santosh
// ═══════════════════════════════════════════
export const COLORS = {
  pink50:   '#fff0f5',
  pink100:  '#ffe4ef',
  pink200:  '#ffc2dc',
  pink300:  '#ff94c4',
  pink400:  '#ff69b4',
  pink500:  '#ff3d9a',
  pink600:  '#e91e7a',
  pink700:  '#c2185b',

  lavender100: '#f3e5f5',
  lavender200: '#e1bee7',
  lavender300: '#ce93d8',
  lavender400: '#ba68c8',

  peach100: '#fff3e0',
  peach200: '#ffe0b2',

  cream:     '#fffaf5',
  roseWhite: '#fff5f7',
  white:     '#ffffff',

  textPrimary:   '#4a2040',
  textSecondary: '#7a5070',
  textLight:     '#a0708f',

  overlay: 'rgba(255,105,180,0.12)',
  cardBg:  'rgba(255,255,255,0.92)',
};

export const GRADIENTS = {
  pinkSoft:    ['#fff0f5', '#ffe4ef', '#f3e5f5'],
  pinkWarm:    ['#ff9a9e', '#fecfef', '#fdfcfb'],
  pinkVibrant: ['#ff69b4', '#ff3d9a'],
  lavenderPink:['#f3e5f5', '#ffe4ef'],
  morning:     ['#fff8e1', '#ffe0b2', '#ffccbc'],
  night:       ['#e8eaf6', '#c5cae9', '#9fa8da'],
  birthday:    ['#ff69b4', '#ff9a9e', '#fecfef'],
  card:        ['rgba(255,255,255,0.95)', 'rgba(255,240,245,0.90)'],
};

export const FONTS = {
  regular:   'System',
  medium:    'System',
  bold:      'System',
  script:    'System', // Will use italic as fallback for cursive
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  full: 999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#ff69b4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    shadowColor: '#ff69b4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  button: {
    shadowColor: '#ff3d9a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
};
