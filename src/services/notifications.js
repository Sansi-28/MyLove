// ═══════════════════════════════════════════
// 💕 Notification Service — Kaju & Santosh
// ═══════════════════════════════════════════
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  MORNING_MESSAGES, NIGHT_MESSAGES,
  THINKING_MESSAGES, LOVE_NOTES, DAILY_QUOTES, CONFIG
} from '../constants/data';
import { getNotificationImage, getLatestGeneratedGalleryImage } from './photoDatabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Request Permission & Setup Channels ───
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    const channels = [
      { id: 'love-channel',    name: '💕 Love Notifications', importance: Notifications.AndroidImportance.MAX },
      { id: 'morning-channel', name: '☀️ Good Morning',        importance: Notifications.AndroidImportance.HIGH },
      { id: 'night-channel',   name: '🌙 Good Night',          importance: Notifications.AndroidImportance.HIGH },
    ];
    for (const ch of channels) {
      await Notifications.setNotificationChannelAsync(ch.id, {
        name: ch.name,
        importance: ch.importance,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ff69b4',
        sound: 'default',
      });
    }
  }
  return finalStatus;
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── Build content with recent AI gallery photo attached ───
async function buildContent({ title, body, type, screen = 'Gallery', extraData = {} }) {
  const img = await getNotificationImage(type);
  const content = {
    title,
    body,
    sound: 'default',
    channelId: type === 'morning' ? 'morning-channel' : type === 'night' ? 'night-channel' : 'love-channel',
    data: {
      screen,
      type,
      photoId: img?.id,
      caption: img?.title,
      ...extraData,
    },
  };

  // Attach recent AI-generated gallery image if available as URL
  if (img && typeof img.uri === 'string') {
    content.data.imageUri = img.uri;
    content.attachments = [{ url: img.uri, thumbnailHidden: false }];
  }

  return content;
}

// ─── Send Immediate Notification With Image ───
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

  const content = {
    title,
    body,
    sound: 'default',
    channelId: 'love-channel',
    data: { screen, isRemote, ...data },
  };

  if (typeof resolvedUri === 'string') {
    content.data.imageUri = resolvedUri;
    content.attachments = [{ url: resolvedUri, thumbnailHidden: false }];
  }

  await Notifications.scheduleNotificationAsync({ content, trigger: null });
}

// ─── Send Immediate Push Notification with Recent Gallery Art ───
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
    data: {
      photoId: latest?.id,
      styleTitle: latest?.styleTitle,
      fromGallery: true,
      ...data,
    },
  });
}

// ─── Re-schedule daily notifications with newest gallery art ───
export async function rescheduleWithRecentGalleryImages() {
  console.log('🔄 Re-scheduling daily notifications with newest gallery photos...');
  await scheduleAllNotifications();
}

// ─── Send Immediate Notification (no image) ───
export async function sendImmediateNotification(title, body, screen = 'Home') {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      channelId: 'love-channel',
      data: { screen },
    },
    trigger: null,
  });
}

// ─── Schedule All Daily Notifications (with AI images) ───
export async function scheduleAllNotifications() {
  await cancelAllNotifications();

  // 1. Good Morning 7:00 AM
  const morningContent = await buildContent({
    title:  `Good Morning, ${CONFIG.herName}! ☀️`,
    body:   randomFrom(MORNING_MESSAGES),
    type:   'morning',
    screen: 'Home',
  });
  await Notifications.scheduleNotificationAsync({
    content: morningContent,
    trigger: { hour: 7, minute: 0, repeats: true },
  });

  // 2. Thinking of You — 11:30 AM
  const thinkContent = await buildContent({
    title:  `💭 Thinking of You, ${CONFIG.herName}`,
    body:   randomFrom(THINKING_MESSAGES),
    type:   'thinking',
    screen: 'Love',
  });
  await Notifications.scheduleNotificationAsync({
    content: thinkContent,
    trigger: { hour: 11, minute: 30, repeats: true },
  });

  // 3. Love Note — 9:15 AM
  const noteContent = await buildContent({
    title:  `💗 A Note from ${CONFIG.hisName}`,
    body:   randomFrom(LOVE_NOTES),
    type:   'love',
    screen: 'Notes',
  });
  await Notifications.scheduleNotificationAsync({
    content: noteContent,
    trigger: { hour: 9, minute: 15, repeats: true },
  });

  // 4. Evening Love Quote — 7:00 PM
  const quoteContent = await buildContent({
    title:  `🌸 A Little Reminder, ${CONFIG.herName}`,
    body:   randomFrom(DAILY_QUOTES),
    type:   'love',
    screen: 'Home',
  });
  await Notifications.scheduleNotificationAsync({
    content: quoteContent,
    trigger: { hour: 19, minute: 0, repeats: true },
  });

  // 5. Good Night — 10:00 PM
  const nightContent = await buildContent({
    title:  `Good Night, ${CONFIG.herName}! 🌙`,
    body:   randomFrom(NIGHT_MESSAGES),
    type:   'night',
    screen: 'Home',
  });
  await Notifications.scheduleNotificationAsync({
    content: nightContent,
    trigger: { hour: 22, minute: 0, repeats: true },
  });

  // 6. Afternoon Hug — 3:00 PM
  const hugContent = await buildContent({
    title:  `🤗 Virtual Hug Incoming, ${CONFIG.herName}!`,
    body:   `Sending you the warmest virtual hug right now. Miss you. 💕`,
    type:   'hug',
    screen: 'Love',
  });
  await Notifications.scheduleNotificationAsync({
    content: hugContent,
    trigger: { hour: 15, minute: 0, repeats: true },
  });

  console.log('✅ All love notifications scheduled with AI photo attachments!');
}
