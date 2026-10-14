import Constants from 'expo-constants';

// ═══════════════════════════════════════════
// 🔑 Secure API Configuration — Kaju & Santosh
// ═══════════════════════════════════════════
// Server/config level API keys.
// No client-side typing is needed by Kaju or in the app UI!

export const API_CONFIG = {
  // Pollinations API Key (Primary engine)
  POLLINATIONS_API_KEY:
    process.env.EXPO_PUBLIC_POLLINATIONS_API_KEY ||
    Constants.expoConfig?.extra?.pollinationsApiKey ||
    '',

  POLLINATIONS_MODEL: 'flux', // 'flux' provides stunning high-res art

  // OpenAI API Key (Optional / fallback)
  OPENAI_API_KEY:
    process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
    Constants.expoConfig?.extra?.openaiApiKey ||
    '',

  OPENAI_IMAGE_MODEL: 'dall-e-3',
  AUTO_GENERATE_ON_UPLOAD: true,
  BATCH_SIZE: 1,
};

export function getPollinationsApiKey() {
  const key = API_CONFIG.POLLINATIONS_API_KEY;
  if (key && key.trim().startsWith('sk_') && key !== 'YOUR_POLLINATIONS_API_KEY_HERE') {
    return key.trim();
  }
  return null;
}

export function getOpenAIApiKey() {
  const key = API_CONFIG.OPENAI_API_KEY;
  if (key && key.trim().startsWith('sk-') && key !== 'YOUR_OPENAI_API_KEY_HERE') {
    return key.trim();
  }
  return null;
}
