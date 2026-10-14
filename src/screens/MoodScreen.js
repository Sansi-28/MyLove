// ═══════════════════════════════════════════
// 😊 Mood Sharing Screen — Kaju & Santosh
// ═══════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { CONFIG, MOODS, MOOD_RESPONSES } from '../constants/data';
import { sendPushToPartner, sendNotificationWithImage, getMyRole } from '../services/notifications';
import { getNotificationImage } from '../services/photoDatabase';

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default function MoodScreen() {
  const [selected, setSelected]   = useState(null);
  const [response, setResponse]   = useState('');
  const [history, setHistory]     = useState([]);
  const [moodImg, setMoodImg]     = useState(null);
  const [currentRole, setCurrentRole] = useState('his');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLocalHistory();
    getMyRole().then(r => setCurrentRole(r));

    // 🔄 Real-time Cloud Sync with Firebase
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'moods'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const cloudMoods = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().createdAt?.toDate ?
              doc.data().createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' +
              doc.data().createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' }) :
              'Just now',
          }));
          if (cloudMoods.length > 0) {
            setHistory(cloudMoods);
          }
        });
        return () => unsubscribe();
      } catch (err) {
        console.warn('Firebase mood sync warning:', err?.message);
      }
    }
  }, []);

  async function loadLocalHistory() {
    const raw = await AsyncStorage.getItem('moodHistory');
    if (raw) setHistory(JSON.parse(raw));
  }

  async function handleSelectMood(mood) {
    setSelected(mood);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.4, duration: 160, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,   duration: 160, useNativeDriver: true }),
    ]).start();

    const replies = MOOD_RESPONSES[mood.key] || ['Sending you so much love right now! 💕'];
    const reply = randomFrom(replies);
    setResponse(reply);

    // Get AI image for notification
    const imgData = await getNotificationImage('love');
    setMoodImg(imgData);

    const myRole = await getMyRole();
    const senderName = myRole === 'his' ? CONFIG.hisName : CONFIG.herName;

    const entry = {
      id: Date.now().toString(),
      moodKey: mood.key,
      emoji: mood.emoji,
      label: mood.label,
      sender: myRole,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' +
            new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
    };

    // 1. Update Local Storage & State
    const updated = [entry, ...history.slice(0, 19)];
    setHistory(updated);
    await AsyncStorage.setItem('moodHistory', JSON.stringify(updated));

    // 2. Sync to Firebase Cloud DB
    if (isFirebaseConfigured && db) {
      try {
        await addDoc(collection(db, 'moods'), {
          moodKey: mood.key,
          emoji: mood.emoji,
          label: mood.label,
          sender: myRole,
          createdAt: serverTimestamp(),
        });
        console.log('☁️ Mood synced to Firebase');
      } catch (cloudErr) {
        console.warn('Cloud mood save error:', cloudErr?.message);
      }
    }

    // 3. Send Remote Push Notification to Partner's phone!
    try {
      const imageUri = imgData && typeof imgData.uri === 'string' ? imgData.uri : undefined;
      await sendPushToPartner({
        title: `${senderName} is feeling ${mood.emoji} "${mood.label}"`,
        body: `Tap to send some love back! 💕`,
        screen: 'Mood',
        data: { moodKey: mood.key, emoji: mood.emoji, imageUri },
      });
    } catch (pushErr) {
      console.warn('Push error:', pushErr?.message);
    }
  }

  const MOOD_COLORS = {
    love:    ['#f857a6', '#ff5858'],
    happy:   ['#f6d365', '#fda085'],
    cozy:    ['#a18cd1', '#fbc2eb'],
    sleepy:  ['#89f7fe', '#66a6ff'],
    missing: ['#f093fb', '#f5576c'],
    sad:     ['#4facfe', '#00f2fe'],
    angry:   ['#f83600', '#f9d423'],
    sick:    ['#84fab0', '#8fd3f4'],
    excited: ['#43e97b', '#38f9d7'],
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.header} start={{x:0,y:0}} end={{x:1,y:1}}>
          <View style={{ paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: 22, paddingBottom: 24 }}>
            <Text style={styles.headerTitle}>Mood Sharing</Text>
            <Text style={styles.headerSub}>Let {CONFIG.hisName} know how you're feeling right now 💕</Text>
          </View>
        </LinearGradient>

        {/* ── Current Mood Reaction ── */}
        {selected && (
          <View style={styles.reactionCard}>
            <Animated.Text style={[styles.reactionEmoji, { transform: [{ scale: pulseAnim }] }]}>
              {selected.emoji}
            </Animated.Text>
            <Text style={styles.reactionMoodName}>{selected.label}</Text>
            <Text style={styles.reactionText}>{response}</Text>
            <Text style={styles.reactionBy}>— {CONFIG.hisName} 💕</Text>
          </View>
        )}

        {/* ── Mood Grid ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOW ARE YOU FEELING?</Text>
          <View style={styles.moodGrid}>
            {MOODS.map((m) => {
              const isActive = selected?.key === m.key;
              const colors = MOOD_COLORS[m.key] || ['#ff9a9e', '#fecfef'];
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => handleSelectMood(m)}
                  activeOpacity={0.8}
                  style={styles.moodCardOuter}
                >
                  <LinearGradient
                    colors={isActive ? colors : ['#fff', '#fff0f5']}
                    style={[styles.moodCard, isActive && styles.moodCardActive]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, isActive && styles.moodLabelActive]}>
                      {m.label}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── History ── */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RECENT MOODS</Text>
            {history.slice(0, 6).map((item) => {
              const colors = MOOD_COLORS[item.moodKey] || ['#ff9a9e', '#fecfef'];
              return (
                <View key={item.id} style={styles.historyItem}>
                  <LinearGradient colors={colors} style={styles.historyEmojiBox} start={{x:0,y:0}} end={{x:1,y:1}}>
                    <Text style={styles.historyEmoji}>{item.emoji}</Text>
                  </LinearGradient>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyLabel}>{item.label}</Text>
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>
                  <Text style={styles.historyHeart}>💗</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#fafafa' },
  scroll: { paddingBottom: 120 },

  header:       {},
  headerTitle:  { color: '#fff', fontSize: 30, fontWeight: '800' },
  headerSub:    { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

  reactionCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#e8b0c0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  reactionEmoji:   { fontSize: 64, marginBottom: 8 },
  reactionMoodName:{ fontSize: 20, fontWeight: '800', color: '#2d0016', marginBottom: 6 },
  reactionText:    { fontSize: 15, color: '#4a2040', textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  reactionBy:      { fontSize: 12, color: '#c2748a', marginTop: 10, fontWeight: '600' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c2748a',
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  moodGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodCardOuter: { width: (Platform.OS === 'ios' ? 375 - 32 - 20 : 360 - 32 - 20) / 3 },
  moodCard: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffe4ec',
  },
  moodCardActive: { borderColor: 'transparent' },
  moodEmoji:      { fontSize: 30, marginBottom: 4 },
  moodLabel:      { fontSize: 11, fontWeight: '700', color: '#4a2040', textAlign: 'center' },
  moodLabelActive:{ color: '#fff' },

  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#e8b0c0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  historyEmojiBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  historyEmoji:    { fontSize: 22 },
  historyInfo:     { flex: 1 },
  historyLabel:    { fontSize: 15, fontWeight: '700', color: '#2d0016' },
  historyDate:     { fontSize: 11, color: '#c2748a', marginTop: 2 },
  historyHeart:    { fontSize: 16 },
});
