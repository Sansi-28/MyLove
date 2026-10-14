// ═══════════════════════════════════════════
// 💕 Virtual Love Screen — Kaju & Santosh
// ═══════════════════════════════════════════
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/data';
import { sendNotificationWithImage } from '../services/notifications';
import { getNotificationImage } from '../services/photoDatabase';

const HUG_MESSAGES = [
  `The warmest hug just flew across the miles to you! 🤗💕`,
  `A big, tight, never-letting-go hug from ${CONFIG.hisName}! 🤗💗`,
  `Feel that warmth? That's ${CONFIG.hisName} hugging you right now 🤗💕`,
];
const KISS_MESSAGES = [
  `A sweet kiss just landed on your cheek, ${CONFIG.herName}! 😘💕`,
  `Mwah! 💋 A flying kiss from ${CONFIG.hisName} has arrived!`,
  `1000 kisses sent with love! 😘💗 Hope you caught them all!`,
];
const THINK_MESSAGES = [
  `${CONFIG.hisName} can't stop thinking about you! 💭💕`,
  `Right now, you're all that's on his mind, ${CONFIG.herName}! 💭💗`,
  `Thoughts of you are flying your way right now 💭✨`,
];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const LOVE_ACTIONS = [
  {
    type:      'hug',
    title:     'Virtual Hug',
    emoji:     '🤗',
    desc:      'Wrap her in warmth, even from miles away',
    image:     require('../../assets/images/virtual_hug.jpg'),
    notifType: 'hug',
    messages:  HUG_MESSAGES,
    notifTitle:`🤗 A Warm Hug from ${CONFIG.hisName}!`,
    colors:    ['#f6d365', '#fda085'],
  },
  {
    type:      'kiss',
    title:     'Virtual Kiss',
    emoji:     '😘',
    desc:      'Blow a kiss that travels through the screen',
    image:     require('../../assets/images/virtual_kiss.jpg'),
    notifType: 'kiss',
    messages:  KISS_MESSAGES,
    notifTitle:`😘 A Sweet Kiss from ${CONFIG.hisName}!`,
    colors:    ['#f093fb', '#f5576c'],
  },
  {
    type:      'thinking',
    title:     'Thinking of You',
    emoji:     '💭',
    desc:      "Let her know she's always on your mind",
    image:     require('../../assets/images/thinking_of_you.jpg'),
    notifType: 'thinking',
    messages:  THINK_MESSAGES,
    notifTitle:`💭 ${CONFIG.hisName} is Thinking of You!`,
    colors:    ['#4facfe', '#00f2fe'],
  },
];

export default function LoveScreen() {
  const [counts, setCounts] = useState({ hug: 0, kiss: 0, thinking: 0 });
  const [lastSent, setLastSent] = useState(null);
  const scales = useRef(LOVE_ACTIONS.map(() => new Animated.Value(1))).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadCounts();
  }, []);

  async function loadCounts() {
    const raw = await AsyncStorage.getItem('loveCounts');
    if (raw) setCounts(JSON.parse(raw));
  }

  async function sendLove(action, idx) {
    // Haptic burst
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 140);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 280);

    // Bounce
    Animated.sequence([
      Animated.timing(scales[idx], { toValue: 0.9,  duration: 90, useNativeDriver: true }),
      Animated.spring(scales[idx], { toValue: 1.06, friction: 3, useNativeDriver: true }),
      Animated.timing(scales[idx], { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();

    const updated = { ...counts, [action.type]: (counts[action.type] || 0) + 1 };
    setCounts(updated);
    await AsyncStorage.setItem('loveCounts', JSON.stringify(updated));

    setLastSent({ type: action.type, emoji: action.emoji });

    // Get AI photo for this type
    const imgData = await getNotificationImage(action.notifType);
    const imageUri = imgData && typeof imgData.uri === 'string' ? imgData.uri : undefined;
    const msg = randomFrom(action.messages);

    await sendNotificationWithImage({
      title:    action.notifTitle,
      body:     msg,
      imageUri,
      isRemote: imgData?.isRemote || false,
      screen:   'Love',
    });
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View style={{ opacity: fadeIn }}>

          {/* ── Header ── */}
          <LinearGradient
            colors={['#f857a6', '#ff5858']}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerInner}>
              <Text style={styles.headerTitle}>Virtual Love</Text>
              <Text style={styles.headerSub}>Send love across every mile between us 💕</Text>
            </View>
          </LinearGradient>

          {/* ── Sent indicator ── */}
          {lastSent && (
            <View style={styles.sentChip}>
              <Text style={styles.sentChipText}>{lastSent.emoji} Sent to {CONFIG.herName}! 💕</Text>
            </View>
          )}

          {/* ── Love Action Cards ── */}
          {LOVE_ACTIONS.map((action, i) => (
            <Animated.View
              key={action.type}
              style={[styles.actionCard, { transform: [{ scale: scales[i] }] }]}
            >
              <Image source={action.image} style={styles.actionImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.actionImageOverlay}
              />
              <View style={styles.actionBody}>
                <View style={styles.actionMeta}>
                  <Text style={styles.actionEmoji}>{action.emoji}</Text>
                  <View>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionDesc}>{action.desc}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => sendLove(action, i)}
                  activeOpacity={0.88}
                  style={styles.sendWrapper}
                >
                  <LinearGradient
                    colors={action.colors}
                    style={styles.sendBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.sendBtnText}>{action.emoji} Send {action.title}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.sendCount}>Sent {counts[action.type] || 0} times today</Text>
              </View>
            </Animated.View>
          ))}

          {/* ── Today's Stats ── */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>💕 Love Sent Today</Text>
            <View style={styles.statsRow}>
              {[
                { emoji: '🤗', val: counts.hug,      label: 'Hugs',   colors: ['#f6d365', '#fda085'] },
                { emoji: '😘', val: counts.kiss,     label: 'Kisses', colors: ['#f093fb', '#f5576c'] },
                { emoji: '💭', val: counts.thinking, label: 'Thoughts',colors: ['#4facfe', '#00f2fe'] },
              ].map((c) => (
                <View key={c.emoji} style={styles.statItem}>
                  <LinearGradient colors={c.colors} style={styles.statCircle} start={{x:0,y:0}} end={{x:1,y:1}}>
                    <Text style={styles.statEmoji}>{c.emoji}</Text>
                  </LinearGradient>
                  <Text style={styles.statVal}>{c.val || 0}</Text>
                  <Text style={styles.statLabel}>{c.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#fafafa' },
  scroll: { paddingBottom: 120 },

  header:       {},
  headerInner:  { paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 24, paddingHorizontal: 22 },
  headerTitle:  { color: '#fff', fontSize: 30, fontWeight: '800' },
  headerSub:    { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

  sentChip: {
    margin: 16,
    backgroundColor: '#fff0f7',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd6e7',
  },
  sentChipText: { color: '#c2748a', fontWeight: '700', fontSize: 14 },

  actionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#f5e0e8',
    shadowColor: '#e8b0c0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  actionImage:        { width: '100%', height: 180 },
  actionImageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },
  actionBody:  { padding: 18 },
  actionMeta:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  actionEmoji: { fontSize: 38 },
  actionTitle: { fontSize: 20, fontWeight: '800', color: '#2d0016' },
  actionDesc:  { fontSize: 12, color: '#c2748a', marginTop: 2 },

  sendWrapper: { borderRadius: 14, overflow: 'hidden' },
  sendBtn:     { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sendCount:   { textAlign: 'center', color: '#c2748a', fontSize: 11, marginTop: 8, fontWeight: '500' },

  statsCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#e8b0c0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  statsTitle: { fontSize: 16, fontWeight: '800', color: '#2d0016', marginBottom: 16 },
  statsRow:   { flexDirection: 'row', gap: 28 },
  statItem:   { alignItems: 'center' },
  statCircle: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statEmoji:  { fontSize: 24 },
  statVal:    { fontSize: 22, fontWeight: '900', color: '#2d0016' },
  statLabel:  { fontSize: 10, color: '#c2748a', fontWeight: '600', marginTop: 2 },
});
