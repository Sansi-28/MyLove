// ═══════════════════════════════════════════
// 💕 Home Screen (Glassmorphism & Blur) — Kaju & Santosh
// ═══════════════════════════════════════════
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Animated, Dimensions, Platform, ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { CONFIG, DAILY_QUOTES } from '../constants/data';
import { getHeroImageSource } from '../services/photoDatabase';
import { getMyRole, setMyRole } from '../services/notifications';

const { width } = Dimensions.get('window');

function getDayOfYear() {
  const now = new Date(), start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

const QUICK_ACTIONS = [
  { icon: '💌', label: 'Love Notes',  screen: 'Notes',   color: ['rgba(255,154,158,0.85)', 'rgba(254,207,239,0.85)'] },
  { icon: '✨', label: 'AI Studio',   screen: 'AiPhoto', color: ['rgba(161,140,209,0.85)', 'rgba(251,194,235,0.85)'] },
  { icon: '🤗', label: 'Hugs & Kisses', screen: 'Love',  color: ['rgba(253,160,133,0.85)', 'rgba(246,211,101,0.85)'] },
  { icon: '📸', label: 'Gallery',     screen: 'Gallery', color: ['rgba(132,250,176,0.85)', 'rgba(143,211,244,0.85)'] },
  { icon: '😊', label: 'Share Mood',  screen: 'Mood',    color: ['rgba(240,147,251,0.85)', 'rgba(245,87,108,0.85)'] },
  { icon: '💖', label: 'Love Touch',  screen: 'Love',    color: ['rgba(255,182,193,0.85)', 'rgba(255,105,180,0.85)'] },
];

export default function HomeScreen({ navigation }) {
  const [greeting, setGreeting]       = useState('');
  const [counter, setCounter]         = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [quote, setQuote]             = useState('');
  const [heroSource, setHeroSource]   = useState(require('../../assets/images/couple_hero.jpg'));
  const [heroTitle, setHeroTitle]     = useState('');
  const [role, setRole]               = useState('his');

  const fadeIn = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      refreshHeroImage();
      getMyRole().then(r => setRole(r));
    }, [])
  );

  async function refreshHeroImage() {
    try {
      const { source, photoData } = await getHeroImageSource();
      setHeroSource(source);
      if (photoData?.styleTitle) setHeroTitle(photoData.styleTitle);
    } catch {}
  }

  async function toggleDeviceRole() {
    const nextRole = role === 'his' ? 'her' : 'his';
    setRole(nextRole);
    await setMyRole(nextRole);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 1000, useNativeDriver: true }).start();

    // Romantic floating animation for the UI cards
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true })
      ])
    ).start();

    updateGreeting();
    setQuote(DAILY_QUOTES[getDayOfYear() % DAILY_QUOTES.length]);

    const interval = setInterval(() => {
      updateCounter();
      updateGreeting();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function updateGreeting() {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) setGreeting('Good Morning');
    else if (h >= 12 && h < 17) setGreeting('Good Afternoon');
    else if (h >= 17 && h < 21) setGreeting('Good Evening');
    else setGreeting('Good Night');
  }

  function updateCounter() {
    const now  = new Date();
    const diff = now - CONFIG.relationshipStart;
    setCounter({
      days:  Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins:  Math.floor((diff % 3600000)  / 60000),
      secs:  Math.floor((diff % 60000)    / 1000),
    });
  }

  return (
    <View style={styles.root}>
      <ImageBackground source={heroSource} style={styles.bgImage} blurRadius={30}>
        <LinearGradient
          colors={['rgba(255,240,245,0.4)', 'rgba(45,0,22,0.88)']}
          style={styles.bgGradient}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Animated.View style={{ opacity: fadeIn }}>

            {/* ══ HERO GLASS CARD ══ */}
            <View style={styles.heroSpacer} />

            {/* ══ DEVICE ROLE PAIRING CHIP ══ */}
            <TouchableOpacity
              onPress={toggleDeviceRole}
              activeOpacity={0.8}
              style={styles.roleChip}
            >
              <BlurView intensity={Platform.OS === 'ios' ? 50 : 75} tint="light" style={styles.roleChipInner}>
                <View style={[styles.roleDot, { backgroundColor: role === 'his' ? '#66a6ff' : '#ff69b4' }]} />
                <Text style={styles.roleText}>
                  Device: {role === 'his' ? `${CONFIG.hisName}'s Phone` : `${CONFIG.herName}'s Phone`}
                </Text>
                <Text style={styles.roleSwitchBadge}>Tap to switch ⇄</Text>
              </BlurView>
            </TouchableOpacity>

            <Animated.View style={[styles.glassCard, { transform: [{ translateY: floatAnim }] }]}>
              <BlurView intensity={Platform.OS === 'ios' ? 60 : 80} tint="light" style={styles.glassInner}>
                <Image source={heroSource} style={styles.heroThumbnail} />
                <View style={styles.heroTextRow}>
                  <Text style={styles.heroGreeting}>{greeting},</Text>
                  <Text style={styles.heroName}>{CONFIG.herName} 💕</Text>
                  <Text style={styles.heroSub}>
                    {heroTitle ? `🎨 ${heroTitle}` : 'Always thinking of you.'}
                  </Text>
                </View>
              </BlurView>
            </Animated.View>

            {/* ══ LOVE COUNTER (GLASSMORPHISM) ══ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>OUR FOREVER COUNTER ✨</Text>
              <BlurView intensity={Platform.OS === 'ios' ? 50 : 75} tint="dark" style={styles.counterCard}>
                <View style={styles.counterRow}>
                  {[
                    { val: counter.days,  label: 'Days' },
                    { val: counter.hours, label: 'Hours' },
                    { val: counter.mins,  label: 'Mins' },
                    { val: counter.secs,  label: 'Secs' },
                  ].map((item) => (
                    <View key={item.label} style={styles.counterItem}>
                      <Text style={styles.counterValue}>{item.val}</Text>
                      <Text style={styles.counterLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </BlurView>
            </View>

            {/* ══ QUICK ACTIONS ══ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EXPLORE OUR MEMORIES</Text>
              <View style={styles.actionsGrid}>
                {QUICK_ACTIONS.map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    style={styles.actionCard}
                    onPress={() => {
                      Haptics.selectionAsync();
                      navigation.navigate(a.screen);
                    }}
                    activeOpacity={0.8}
                  >
                    <BlurView intensity={Platform.OS === 'ios' ? 40 : 65} tint="light" style={styles.actionBlur}>
                      <LinearGradient
                        colors={a.color}
                        style={styles.actionGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.actionIcon}>{a.icon}</Text>
                        <Text style={styles.actionLabel}>{a.label}</Text>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ══ DAILY QUOTE ══ */}
            <View style={styles.section}>
              <BlurView intensity={Platform.OS === 'ios' ? 60 : 80} tint="light" style={styles.quoteCard}>
                <Text style={styles.quoteMark}>❝</Text>
                <Text style={styles.quoteText}>{quote}</Text>
                <Text style={styles.quoteBy}>— {CONFIG.hisName}</Text>
              </BlurView>
            </View>

            <View style={{ height: 60 }} />
          </Animated.View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a000e' },
  bgImage: { flex: 1, width: '100%', height: '100%' },
  bgGradient: { position: 'absolute', width: '100%', height: '100%' },
  scroll: { paddingBottom: 60, paddingHorizontal: 20 },

  heroSpacer: { height: Platform.OS === 'ios' ? 70 : 45 },

  roleChip: {
    alignSelf: 'center',
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  roleChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  roleSwitchBadge: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginLeft: 8,
    fontStyle: 'italic',
  },

  glassCard: {
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#ff69b4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glassInner: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  heroThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroTextRow: { marginLeft: 16, flex: 1 },
  heroGreeting: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '600' },
  heroName: { color: '#fff', fontSize: 30, fontWeight: '800', marginVertical: 2 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontStyle: 'italic' },

  section: { marginTop: 28 },
  sectionTitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 4,
  },

  counterCard: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  counterItem: { alignItems: 'center', flex: 1 },
  counterValue: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(255,105,180,0.5)',
    textShadowRadius: 10,
  },
  counterLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 40 - 12) / 2,
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionBlur: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionGrad: {
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 4,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  quoteCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  quoteMark: {
    fontSize: 40,
    color: 'rgba(255,105,180,0.7)',
    marginBottom: -15,
    lineHeight: 40,
  },
  quoteText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  quoteBy: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 12,
  },
});
