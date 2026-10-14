// ═══════════════════════════════════════════
// 💕 Notification Service — Kaju & Santosh
// ═══════════════════════════════════════════
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db, isFirebaseConfigured } from '../config/firebase';
import { CONFIG } from '../constants/data';
import { getLatestGeneratedGalleryImage } from './photoDatabase';
import { displayCustomNotification } from '../../modules/custom-notifier';

// Set standard foreground presentation options
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Role Management (Santosh vs Kaju) ───
export async function getMyRole() {
  const role = await AsyncStorage.getItem('myRole');
  return role || 'his'; // Default to 'his' (Santosh)
}

export async function setMyRole(role) {
  await AsyncStorage.setItem('myRole', role);
  console.log(`📱 Role switched to: ${role === 'his' ? CONFIG.hisName : CONFIG.herName}`);
  await registerForPushNotificationsAsync();
}

// ─── 1️⃣ Generate & Save Push Token to Cloud ───
export async function registerForPushNotificationsAsync() {
  // Setup Notifee channel for Android
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
  } catch {}

  if (!Device.isDevice) {
    console.log('Notice: Physical device required for remote Push Notifications');
    return 'granted';
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return null;
    }

    // Configure standard Android Channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('love-channel', {
        name: '💕 Love Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ff69b4',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const pushToken = tokenData?.data;

    if (pushToken) {
      console.log('📱 MY PUSH TOKEN:', pushToken);
      const myRole = await getMyRole();

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(
            doc(db, 'users', myRole),
            {
              pushToken,
              role: myRole,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          console.log(`☁️ Saved ${myRole} push token to Firebase!`);
        } catch (dbErr) {
          console.warn('Failed to save push token to Firebase:', dbErr?.message);
        }
      }
    }

    return pushToken || 'granted';
  } catch (e) {
    console.warn('Push token registration error:', e?.message);
    return 'granted';
  }
}

// ─── 2️⃣ Send Remote Push Notification to Partner ───
export async function sendPushToPartner({ title, body, screen = 'Gallery', data = {} }) {
  try {
    const myRole = await getMyRole();
    const partnerRole = myRole === 'his' ? 'her' : 'his';

    let partnerToken = null;

    if (isFirebaseConfigured && db) {
      try {
        const partnerDoc = await getDoc(doc(db, 'users', partnerRole));
        if (partnerDoc.exists()) {
          partnerToken = partnerDoc.data()?.pushToken;
        }
      } catch (err) {
        console.warn('Could not read partner token from Firebase:', err?.message);
      }
    }

    if (!partnerToken) {
      partnerToken = await AsyncStorage.getItem(`partnerPushToken_${partnerRole}`);
    }

    if (!partnerToken) {
      console.log('No partner push token found yet. Showing local notification preview.');
      await sendNotificationWithImage({ title, body, screen, data });
      return;
    }

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: partnerToken,
        sound: 'default',
        title,
        body,
        data: { screen, ...data },
      }),
    });
    console.log('💌 Remote push sent to partner successfully!');
  } catch (error) {
    console.error('Error sending remote push to partner:', error?.message);
  }
}

// ─── 3️⃣ Pinterest-Style Notification (Native XML + Notifee Fallback) ───
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

  // 1. Try Native Pinterest Custom Notifier module (XML Layout)
  if (resolvedUri) {
    try {
      await displayCustomNotification(title, body, resolvedUri);
      return;
    } catch {
      // Fall through to Notifee
    }
  }

  // 2. Notifee with largeIcon square Pinterest effect
  try {
    await notifee.displayNotification({
      title,
      body,
      data: { screen, isRemote: String(isRemote), ...data },
      android: {
        channelId: 'love-channel',
        largeIcon: resolvedUri,
        circularLargeIcon: false,
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

// ─── 4️⃣ Helpers for Gallery & Action Triggers ───
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

export async function sendImmediateNotification(title, body, screen = 'Home') {
  return sendNotificationWithImage({ title, body, screen });
}

export async function cancelAllNotifications() {
  try {
    await notifee.cancelAllNotifications();
  } catch {}
}

export async function scheduleAllNotifications() {
  await registerForPushNotificationsAsync();
  console.log('✅ Remote and local love notifications ready!');
}

export async function rescheduleWithRecentGalleryImages() {
  await scheduleAllNotifications();
}
