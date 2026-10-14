// ═══════════════════════════════════════════
// 🤖 Automated AI Photo Engine — Kaju & Santosh
// ═══════════════════════════════════════════
import * as FileSystem from 'expo-file-system';
import { getPollinationsApiKey, getOpenAIApiKey, API_CONFIG } from '../config/api';
import { CONFIG } from '../constants/data';
import {
  getRandomPhotoFromEachPool,
  bothPoolsHavePhotos,
  saveAIPhoto,
} from './photoDatabase';
import { sendNotificationWithImage, rescheduleWithRecentGalleryImages } from './notifications';

export const ROMANTIC_STYLES = [
  {
    id: 'ghibli',
    title: '🌸 Cherry Blossom Anime',
    tag: 'Studio Ghibli Style',
    prompt: `A breathtakingly romantic Studio Ghibli anime illustration of a sweet Indian couple, handsome Indian boy ${CONFIG.hisName} and gorgeous Indian girl ${CONFIG.herName} deeply in love, holding hands under blooming pink cherry blossom trees, gentle breeze, floating flower petals, soft pastel lighting, warm magical anime aesthetics, masterpiece quality, highly detailed`,
  },
  {
    id: 'pixar',
    title: '🧸 3D Pixar Couple',
    tag: 'Disney Pixar 3D',
    prompt: `A charming 3D Disney Pixar animated illustration of a lovely Indian couple embracing with warm smiles, handsome boy ${CONFIG.hisName} and beautiful girl ${CONFIG.herName} with sparkling expressive eyes, cozy pastel pink sweaters, heartwarming romantic expression, studio quality rendering, glowing warm soft backlight, ultra cute, radiantly cheerful and loving`,
  },
  {
    id: 'cafe',
    title: '☕ Cozy Autumn Cafe',
    tag: 'Vintage Coffee Date',
    prompt: `A cozy romantic digital painting of an Indian couple ${CONFIG.hisName} and ${CONFIG.herName} sharing hot chocolate at a vintage cafe on a rainy autumn afternoon, wearing matching knit scarves, smiling warmly at each other, golden warm ambient candlelight, rain outside glass window, heart bokeh light effects, ultra romantic and intimate`,
  },
  {
    id: 'fairytale',
    title: '🏰 Royal Fairytale',
    tag: 'Enchanted Kingdom',
    prompt: `A whimsical fairytale illustration of an Indian prince ${CONFIG.hisName} and princess ${CONFIG.herName} standing on a glowing palace balcony overlooking a star-filled magical sky, floating lanterns and rose petals, ethereal dreamy pastel pink and golden tones, eternal romance, storybook cinematic quality art`,
  },
  {
    id: 'beach',
    title: '🌅 Golden Hour Beach',
    tag: 'Sunset Ocean Walk',
    prompt: `A breathtaking golden hour beach illustration of an Indian couple ${CONFIG.hisName} and ${CONFIG.herName} walking barefoot along the gentle surf, holding hands, silhouetted against a vibrant pink-orange sunset sky, reflections on wet sand, serene deeply romantic atmosphere, impressionist digital painting style`,
  },
  {
    id: 'umbrella',
    title: '🌧️ Pink Umbrella Rain',
    tag: 'One Umbrella Moment',
    prompt: `A heartwarming romantic digital painting of an Indian couple ${CONFIG.hisName} and ${CONFIG.herName} sharing a single pink umbrella during gentle evening rain, the boy lovingly tilting it toward the girl, cozy street reflections, warm bokeh city lights, tender intimate moment, lush artistic detail`,
  },
  {
    id: 'stars',
    title: '🌌 Under The Milky Way',
    tag: 'Galaxy Stargazing',
    prompt: `A dreamy romantic illustration of an Indian couple ${CONFIG.hisName} and ${CONFIG.herName} lying on a soft blanket gazing at the milky way together, star-filled midnight sky, fireflies glowing around them, warm lantern light casting soft shadows, ultra romantic galaxy painting, ethereal magical realism`,
  },
  {
    id: 'winter',
    title: '❄️ Winter Snow Moment',
    tag: 'First Snow Together',
    prompt: `A magical romantic winter illustration of an Indian couple ${CONFIG.hisName} and ${CONFIG.herName} catching snowflakes together, rosy cheeks, matching wool coats and scarves, soft falling snow, warm glowing street lamps, joyful tender moment, painterly cozy aesthetic, ultra high quality digital art`,
  },
];

export const PRESET_ARTWORKS = [
  { id: 'preset_hero',  uri: require('../../assets/images/couple_hero.jpg'),     styleTitle: '🌸 Cherry Blossom',    isRemote: false },
  { id: 'preset_hug',   uri: require('../../assets/images/virtual_hug.jpg'),     styleTitle: '🧸 Cozy Moment',       isRemote: false },
  { id: 'preset_kiss',  uri: require('../../assets/images/virtual_kiss.jpg'),    styleTitle: '☕ Sweet Date',         isRemote: false },
  { id: 'preset_think', uri: require('../../assets/images/thinking_of_you.jpg'), styleTitle: '🌅 Thinking of You',   isRemote: false },
];

// ─── Helper: Read image URI as Base64 Data URL ───
async function getImageBase64(uri) {
  if (!uri) return null;
  if (typeof uri === 'string') {
    if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
      return uri;
    }
    try {
      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${b64}`;
    } catch (e) {
      console.warn('Could not read image as base64:', e.message);
      return null;
    }
  }
  return null;
}

// ─── Vision Likeness Engine: Extract actual facial features from user uploads ───
async function generateLikenessPromptFromPhotos({ hisUri, herUri, style, apiKey }) {
  try {
    const [hisData, herData] = await Promise.all([
      getImageBase64(hisUri),
      getImageBase64(herUri),
    ]);

    if (!hisData || !herData) {
      console.log('Skipping vision extraction: could not load both photo data');
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const promptInstructions = `You are an elite portrait artist specializing in visual likeness preservation.
Analyze the two provided photos:
- Photo 1 is the boyfriend ${CONFIG.hisName}.
- Photo 2 is the girlfriend ${CONFIG.herName}.

1. Carefully inspect ${CONFIG.hisName} in Photo 1: note his exact hair style/length/color, facial hair (beard/mustache/stubble or clean-shaven), face shape, eye shape, glasses (if any), skin tone, and distinct facial traits.
2. Carefully inspect ${CONFIG.herName} in Photo 2: note her exact hairstyle/parting/length, facial structure, eye shape, smile, skin tone, glasses (if any), and distinct facial traits.
3. Write a single detailed, highly artistic image generation prompt (around 70 to 85 words) depicting ${CONFIG.hisName} and ${CONFIG.herName} together as an affectionate couple in the style "${style.title}" (${style.tag}).

CRITICAL REQUIREMENTS:
- You MUST explicitly weave in their exact observed hairstyles, facial structures, skin tones, facial hair, and distinguishing features from the photos so they clearly recognize themselves.
- Output ONLY the final visual prompt description text. Do not add quotes, introductions, or conversational commentary.`;

    const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          {
            role: 'system',
            content: 'You are an elite portrait artist specializing in visual likeness preservation.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: promptInstructions },
              { type: 'image_url', image_url: { url: hisData } },
              { type: 'image_url', image_url: { url: herData } },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 280,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Vision API error HTTP ${response.status}`);
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content?.trim();
    if (generatedPrompt && generatedPrompt.length > 20) {
      const cleanPrompt = generatedPrompt.replace(/^["']|["']$/g, '');
      console.log('👁️ Vision Likeness extracted successfully:', cleanPrompt.slice(0, 90) + '...');
      return cleanPrompt;
    }
    return null;
  } catch (err) {
    console.warn('Vision likeness extraction skipped:', err.message);
    return null;
  }
}

// ─── Core: Generate via Pollinations.ai (Primary Engine) ───
async function generateViaPollinations(prompt, apiKey) {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 900000) + 100000;
  const model = API_CONFIG.POLLINATIONS_MODEL || 'flux';
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=${model}&nologo=true&enhance=true&seed=${seed}&key=${apiKey}`;

  // Pre-validate via fetch HEAD with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`Pollinations HTTP ${res.status}`);
    }
    return url;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn('Pollinations preflight timed out, returning direct URL');
      return url;
    }
    throw err;
  }
}

// ─── Core: Generate one AI image via OpenAI (Fallback) ───
async function generateViaOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: API_CONFIG.OPENAI_IMAGE_MODEL || 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });

  const data = await response.json();
  if (data.data && data.data[0] && data.data[0].url) {
    return data.data[0].url;
  }
  if (data.error) {
    throw new Error(`OpenAI error: ${data.error.message}`);
  }
  throw new Error('No image returned');
}

// ─── Main: Trigger full automated generation ───
export async function triggerAutomatedCoupleGeneration({
  fromUpload = false,
  uploadedBy = '',
  silent = false,
} = {}) {
  try {
    const ready = await bothPoolsHavePhotos();
    if (!ready) {
      return { success: false, reason: 'Need photos from both Santosh and Kaju first' };
    }

    const { hisPhoto, herPhoto } = await getRandomPhotoFromEachPool();

    // Pick random romantic style
    const style = ROMANTIC_STYLES[Math.floor(Math.random() * ROMANTIC_STYLES.length)];
    const pollinationsKey = getPollinationsApiKey();
    const openAiKey = getOpenAIApiKey();

    let generatedUri = null;
    let isRemote = false;
    let generationSource = 'pollinations';
    let isFallback = false;
    let errorDetail = null;
    let hasVisionLikeness = false;
    let promptToUse = style.prompt;

    // 👁️ 1. Extract real visual likeness from Santosh & Kaju's uploaded photos
    if (pollinationsKey && hisPhoto?.uri && herPhoto?.uri) {
      try {
        console.log('👁️ Vision Likeness Engine: Analyzing Santosh & Kaju photos...');
        const likenessPrompt = await generateLikenessPromptFromPhotos({
          hisUri: hisPhoto.uri,
          herUri: herPhoto.uri,
          style,
          apiKey: pollinationsKey,
        });
        if (likenessPrompt) {
          promptToUse = likenessPrompt;
          hasVisionLikeness = true;
          console.log('✨ Using likeness-conditioned prompt for generation!');
        }
      } catch (vErr) {
        console.warn('Vision likeness extraction skipped, using style prompt:', vErr.message);
      }
    }

    // 2. Generate with Pollinations Flux using the likeness-conditioned prompt
    if (pollinationsKey) {
      try {
        console.log('🎨 Generating AI couple art via Pollinations Flux (Likeness Active:', hasVisionLikeness, ')...');
        generatedUri = await generateViaPollinations(promptToUse, pollinationsKey);
        isRemote = true;
        generationSource = 'pollinations';
      } catch (e) {
        console.warn('Pollinations generation failed, trying OpenAI:', e.message);
        errorDetail = `Pollinations error: ${e.message}`;
      }
    } else {
      errorDetail = 'Pollinations API key not configured';
    }

    // 3. Try OpenAI fallback if configured
    if (!generatedUri && openAiKey) {
      try {
        console.log('🎨 Generating AI couple art via OpenAI DALL-E 3...');
        generatedUri = await generateViaOpenAI(promptToUse, openAiKey);
        isRemote = true;
        generationSource = 'openai';
        errorDetail = null;
      } catch (e) {
        console.warn('OpenAI generation failed, using preset:', e.message);
        errorDetail = (errorDetail ? errorDetail + ' | ' : '') + `OpenAI error: ${e.message}`;
      }
    }

    // 3. Fallback to preset artworks if no connection or keys fail
    if (!generatedUri) {
      const fallback = PRESET_ARTWORKS[Math.floor(Math.random() * PRESET_ARTWORKS.length)];
      generatedUri = fallback.uri;
      isRemote = false;
      generationSource = 'preset_fallback';
      isFallback = true;
      if (!errorDetail) {
        errorDetail = 'No active API keys or network connection available';
      }
    }

    const newItem = {
      id: `ai_${Date.now()}`,
      uri: generatedUri,
      isRemote,
      styleTitle: style.title,
      styleTag: style.tag,
      fromHisPhoto: hisPhoto?.uri,
      fromHerPhoto: herPhoto?.uri,
      createdAt: new Date().toISOString(),
      generationSource,
      isFallback,
      errorDetail,
      hasVisionLikeness,
      likenessPrompt: hasVisionLikeness ? promptToUse : null,
    };

    // 📚 Save to central database (also syncs to gallery automatically)
    await saveAIPhoto(newItem);

    // 🔔 Send rich notification with the generated photo attached
    if (!silent) {
      const notifTitle = hasVisionLikeness
        ? `✨ Blended Couple Art Created!`
        : fromUpload
        ? `✨ New Couple Memory Created!`
        : `💕 Surprise for ${CONFIG.herName}!`;

      const notifBody = hasVisionLikeness
        ? `AI blended your uploaded photos into a romantic couple illustration in "${style.title}"! 🌸`
        : fromUpload
        ? `${uploadedBy} uploaded a photo & the AI created "${style.title}" just for you two! 🌸`
        : `A new AI couple photo is ready in "${style.title}" — tap to see your memory 💖`;

      await sendNotificationWithImage({
        title:    notifTitle,
        body:     notifBody,
        imageUri: generatedUri,
        isRemote,
        screen:   'Gallery',
        data:     { photoId: newItem.id, styleTitle: style.title, fromGallery: true },
      });
    }

    // 🔄 Update all future scheduled daily notifications with this newest gallery art
    rescheduleWithRecentGalleryImages().catch((e) =>
      console.warn('rescheduleWithRecentGalleryImages error:', e)
    );

    console.log('✅ AI couple generation complete:', style.title, `(Source: ${generationSource}, Likeness: ${hasVisionLikeness})`);
    return {
      success: true,
      item: newItem,
      generationSource,
      isFallback,
      errorDetail,
      hasVisionLikeness,
    };
  } catch (err) {
    console.error('triggerAutomatedCoupleGeneration error:', err);
    return {
      success: false,
      error: err,
      isFallback: true,
      errorDetail: err.message || 'Unknown generation error',
    };
  }
}
