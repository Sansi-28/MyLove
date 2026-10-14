// ═══════════════════════════════════════════════════════════
// 📚 Photo Database — Single Source of Truth
// All AI-generated + uploaded photos for Kaju & Santosh app.
// Used by notifications, home screen hero, and all features.
// ═══════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const KEYS = {
  AI_PHOTOS:    'db_ai_generated_photos',   // AI-generated couple artwork
  HIS_POOL:     'db_photos_his',            // Santosh's uploaded photos
  HER_POOL:     'db_photos_her',            // Kaju's uploaded photos
  GALLERY:      'db_gallery_photos',        // Combined gallery
  LAST_HERO:    'db_last_hero_uri',         // Last used hero image URI
};

// ─── Preset fallback images (used before AI generates anything) ───
export const PRESETS = {
  hero:    require('../../assets/images/couple_hero.jpg'),
  morning: require('../../assets/images/good_morning.jpg'),
  night:   require('../../assets/images/good_night.jpg'),
  think:   require('../../assets/images/thinking_of_you.jpg'),
  hug:     require('../../assets/images/virtual_hug.jpg'),
  kiss:    require('../../assets/images/virtual_kiss.jpg'),
};

// ─── READ: Get all AI generated photos ───
export async function getAIPhotos() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.AI_PHOTOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ─── WRITE: Save a new AI generated photo ───
export async function saveAIPhoto(photoItem) {
  try {
    const existing = await getAIPhotos();
    // Keep max 50 photos in DB
    const updated = [photoItem, ...existing].slice(0, 50);
    await AsyncStorage.setItem(KEYS.AI_PHOTOS, JSON.stringify(updated));

    // If it has a remote URL, cache it as the current hero
    if (typeof photoItem.uri === 'string') {
      await AsyncStorage.setItem(KEYS.LAST_HERO, photoItem.uri);
    }

    // Also add to gallery
    await addToGallery({
      id: 'gallery_ai_' + photoItem.id,
      uri: photoItem.uri,
      isRemote: photoItem.isRemote,
      caption: `✨ ${photoItem.styleTitle}`,
      category: 'ai',
      createdAt: photoItem.createdAt,
    });

    return updated;
  } catch (err) {
    console.error('saveAIPhoto error:', err);
    return [];
  }
}

// ─── READ: Get recent generated images from gallery & AI DB ───
export async function getRecentGeneratedGalleryImages(limit = 10) {
  try {
    const aiPhotos = await getAIPhotos();
    const gallery = await getGallery();

    const aiGalleryItems = gallery
      .filter((item) => item.category === 'ai')
      .map((item) => ({
        id: item.id,
        uri: item.uri,
        isRemote: item.isRemote ?? (typeof item.uri === 'string'),
        styleTitle: item.caption ? item.caption.replace('✨ ', '') : 'Couple Art',
        createdAt: item.createdAt || new Date().toISOString(),
      }));

    // Merge both sources, deduplicate by uri
    const map = new Map();
    [...aiPhotos, ...aiGalleryItems].forEach((photo) => {
      if (photo && photo.uri && !map.has(photo.uri)) {
        map.set(photo.uri, {
          id: photo.id,
          uri: photo.uri,
          isRemote: photo.isRemote ?? (typeof photo.uri === 'string'),
          styleTitle: photo.styleTitle || photo.caption || 'Romantic Art',
          createdAt: photo.createdAt || new Date().toISOString(),
        });
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list.slice(0, limit);
  } catch (err) {
    console.error('getRecentGeneratedGalleryImages error:', err);
    return [];
  }
}

// ─── READ: Get the latest generated image from the gallery ───
export async function getLatestGeneratedGalleryImage() {
  const recent = await getRecentGeneratedGalleryImages(1);
  if (recent.length > 0) {
    return recent[0];
  }
  return null;
}

// ─── READ: Get random AI photo (for notification attachments) ───
export async function getRandomAIPhoto() {
  try {
    const recent = await getRecentGeneratedGalleryImages(5);
    if (recent.length > 0) {
      return recent[Math.floor(Math.random() * recent.length)];
    }
  } catch {}
  return null;
}

// ─── READ: Get the current hero image source ───
// Returns: { source, isRemote }
// Screens use: <Image source={source} />
export async function getHeroImageSource() {
  try {
    const recent = await getRecentGeneratedGalleryImages(5);
    if (recent.length > 0) {
      // Rotate hero among top 3 most recent AI photos
      const idx = Math.floor(Date.now() / (1000 * 60 * 60)) % Math.min(3, recent.length);
      const photo = recent[idx];
      if (typeof photo.uri === 'string') {
        return { source: { uri: photo.uri }, isRemote: true, photoData: photo };
      }
      if (photo.uri) {
        return { source: photo.uri, isRemote: false, photoData: photo };
      }
    }
  } catch {}
  return { source: PRESETS.hero, isRemote: false, photoData: null };
}

// ─── READ: Get themed notification image using recent gallery art ───
// type: 'morning' | 'night' | 'thinking' | 'love' | 'hug' | 'kiss'
export async function getNotificationImage(type = 'love') {
  try {
    const recent = await getRecentGeneratedGalleryImages(10);
    if (recent.length > 0) {
      // Offset by type so each scheduled time picks a distinct recent gallery memory
      const typeOffsets = {
        morning: 0,
        thinking: 1,
        love: 2,
        hug: 3,
        night: 4,
        kiss: 5,
      };
      const offset = (typeOffsets[type] ?? 0) % recent.length;
      const photo = recent[offset] || recent[0];
      if (photo && photo.uri) {
        return {
          id: photo.id,
          uri: photo.uri,
          isRemote: photo.isRemote,
          title: photo.styleTitle || 'Romantic Art',
        };
      }
    }
  } catch (err) {
    console.warn('getNotificationImage error:', err);
  }

  // Fallback to presets if no generated photos exist yet
  const fallbacks = {
    morning: PRESETS.morning,
    night:   PRESETS.night,
    thinking: PRESETS.think,
    hug:     PRESETS.hug,
    kiss:    PRESETS.kiss,
    love:    PRESETS.hero,
  };
  return {
    id: 'preset',
    uri: fallbacks[type] || PRESETS.hero,
    isRemote: false,
    title: 'Preset Couple Art',
  };
}

// ─── READ/WRITE: Photo Pools (His & Her) ───
export async function getPhotoPool(role) {
  try {
    const key = role === 'his' ? KEYS.HIS_POOL : KEYS.HER_POOL;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToPhotoPool(role, uri) {
  try {
    const key = role === 'his' ? KEYS.HIS_POOL : KEYS.HER_POOL;
    const existing = await getPhotoPool(role);
    const entry = {
      id: `${role}_${Date.now()}`,
      uri,
      uploadedAt: new Date().toISOString(),
    };
    const updated = [entry, ...existing].slice(0, 20);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    return { success: true, pool: updated };
  } catch (err) {
    return { success: false, error: err };
  }
}

export async function bothPoolsHavePhotos() {
  const his = await getPhotoPool('his');
  const her = await getPhotoPool('her');
  return his.length > 0 && her.length > 0;
}

export async function getRandomPhotoFromEachPool() {
  const his = await getPhotoPool('his');
  const her = await getPhotoPool('her');
  const hisPhoto = his.length > 0 ? his[Math.floor(Math.random() * his.length)] : null;
  const herPhoto = her.length > 0 ? her[Math.floor(Math.random() * her.length)] : null;
  return { hisPhoto, herPhoto };
}

// ─── READ/WRITE: Gallery ───
export async function getGallery() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.GALLERY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToGallery(item) {
  try {
    const existing = await getGallery();
    // Avoid duplicates
    const filtered = existing.filter(i => i.id !== item.id);
    const updated = [item, ...filtered].slice(0, 100);
    await AsyncStorage.setItem(KEYS.GALLERY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('addToGallery error', err);
    return [];
  }
}

export async function addUserUploadToGallery(uri, uploadedBy = 'us') {
  return addToGallery({
    id: `upload_${Date.now()}`,
    uri,
    isRemote: false,
    caption: `📷 ${uploadedBy === 'his' ? 'Santosh' : 'Kaju'}'s memory`,
    category: 'us',
    uploadedBy,
    createdAt: new Date().toISOString(),
  });
}
