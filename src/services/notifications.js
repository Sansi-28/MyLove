// ═══════════════════════════════════════════
// 💕 Notification Service (Notifee) — Kaju & Santosh
// ═══════════════════════════════════════════
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
import {
  MORNING_MESSAGES, NIGHT_MESSAGES,
  THINKING_MESSAGES, LOVE_NOTES, DAILY_QUOTES, CONFIG
} from '../constants/data';
import { getNotificationImage, getLatestGeneratedGalleryImage } from './photoDatabase';

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function registerForPushNotificationsAsync() {
  try {
    await notifee.requestPermission();

    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'love-channel',
        name: '💕 Love Notifications',
        importance: AndroidImportance.HIGH,
        vibration: true,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ff69b4',
      });
    }
    return 'granted';
  } catch (err) {
    console.warn('registerForPushNotificationsAsync error:', err?.message);
    return null;
  }
}

export async function cancelAllNotifications() {
  try {
    await notifee.cancelAllNotifications();
  } catch (err) {
    console.warn('cancelAllNotifications error:', err?.message);
  }
}

// ─── Pinterest Style Notification ───
export async function sendNotificationWithImage({
  title,
  body,
  imageUri,
  isRemote = true,
  screen = 'Gallery',
  data = {},
}) {
  let resolvedUri = imageUri;
  if (!resolvedUri) {
    const latest = await getLatestGeneratedGalleryImage();
    resolvedUri = typeof latest?.uri === 'string' ? latest.uri : undefined;
  }

  try {
    await notifee.displayNotification({
      title,
      body,
      data: { screen, isRemote: String(isRemote), ...data },
      android: {
        channelId: 'love-channel',
        // THIS creates the Pinterest effect (Square thumbnail image on the right/left of the text)
        largeIcon: resolvedUri,
        circularLargeIcon: false, // Keeps it square like Pinterest
        smallIcon: 'ic_launcher',
        color: '#ff69b4',
        pressAction: { id: 'default', launchActivity: 'default' },
      },
      ios: {
        attachments: resolvedUri ? [{ url: resolvedUri }] : [],
      },
    });
  } catch (err) {
    console.warn('sendNotificationWithImage error:', err?.message);
  }
}

export async function sendNotificationWithRecentGalleryImage({
  title,
  body,
  screen = 'Gallery',
  data = {},
} = {}) {
  const latest = await getLatestGeneratedGalleryImage();
  const imageUri = latest?.uri;

  const notifTitle = title || `📸 Special Memory for ${CONFIG.herName}! 💕`;
  const notifBody =
    body ||
    (latest?.styleTitle
      ? `Look at this new couple picture in our gallery: "${latest.styleTitle}"! Tap to open 🌸`
      : `Santosh shared a lovely photo memory from your gallery 💕`);

  return sendNotificationWithImage({
    title: notifTitle,
    body: notifBody,
    imageUri: typeof imageUri === 'string' ? imageUri : undefined,
    isRemote: latest?.isRemote ?? true,
    screen,
    data: { photoId: latest?.id, styleTitle: latest?.styleTitle, fromGallery: true, ...data },
  });
}

// ─── Send Immediate Notification (Fallback / Plain) ───
export async function sendImmediateNotification(title, body, screen = 'Home') {
  return sendNotificationWithImage({ title, body, screen });
}

// ─── Schedule Daily Notifications with Recent Gallery Images ───
export async function scheduleAllNotifications() {
  try {
    await registerForPushNotificationsAsync();
    console.log('✅ Love notifications ready with Pinterest-style Notifee previews!');
  } catch (err) {
    console.warn('scheduleAllNotifications error:', err?.message);
  }
}

// ─── Re-schedule daily notifications with newest gallery art ───
export async function rescheduleWithRecentGalleryImages() {
  console.log('🔄 Re-scheduling daily notifications with newest gallery photos...');
  await scheduleAllNotifications();
}
