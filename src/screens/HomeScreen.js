// ═══════════════════════════════════════════
// 💕 Home Screen — Kaju & Santosh
// ═══════════════════════════════════════════
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Animated, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { CONFIG, DAILY_QUOTES } from '../constants/data';
import { getHeroImageSource } from '../services/photoDatabase';

const { width, height } = Dimensions.get('window');

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function getDayOfYear() {
  const now = new Date(), start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

const QUICK_ACTIONS = [
  { icon: '💌', label: 'Love Notes',  screen: 'Notes',   color: ['#ff9a9e', '#fecfef'] },
  { icon: '✨', label: 'AI Studio',   screen: 'AiPhoto', color: ['#a18cd1', '#fbc2eb'] },
  { icon: '🤗', label: 'Hugs & Kisses', screen: 'Love', color: ['#fda085', '#f6d365'] },
  { icon: '📸', label: 'Our Gallery', screen: 'Gallery', color: ['#84fab0', '#8fd3f4'] },
  { icon: '😊', label: 'Share Mood',  screen: 'Mood',    color: ['#f093fb', '#f5576c'] },
  { icon: '🎨', label: 'AI Gallery',  screen: 'AiPhoto', color: ['#43e97b', '#38f9d7'] },
];

export default function HomeScreen({ navigation }) {
  const [greeting, setGreeting]       = useState('');
  const [counter, setCounter]         = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [birthdayDays, setBirthday]   = useState(0);
  const [isBirthday, setIsBirthday]   = useState(false);
  const [quote, setQuote]             = useState('');
  const [heroSource, setHeroSource]   = useState(require('../../assets/images/couple_hero.jpg'));
  const [heroPhotoTitle, setHeroPhotoTitle] = useState('');

  const fadeIn    = useRef(new Animated.Value(0)).current;
  const heartAnim = useRef(new Animated.Value(1)).current;
  const heroAnim  = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      refreshHeroImage();
    }, [])
  );

  async function refreshHeroImage() {
    try {
      const { source, photoData } = await getHeroImageSource();
      setHeroSource(source);
      if (photoData) setHeroPhotoTitle(photoData.styleTitle || '');
    } catch {}
  }

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    Animated.timing(heroAnim, { toValue: 1, duration: 1200, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(heartAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(heartAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    ).start();

    updateGreeting();
    updateBirthday();
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

  function updateBirthday() {
    const now = new Date();
    let bd = new Date(now.getFullYear(), CONFIG.birthday.month, CONFIG.birthday.day);
    if (now > bd) bd = new Date(now.getFullYear() + 1, CONFIG.birthday.month, CONFIG.birthday.day);
    setBirthday(Math.ceil((bd - now) / 86400000));
    setIsBirthday(now.getMonth() === CONFIG.birthday.month && now.getDate() === CONFIG.birthday.day);
  }

  function navigate(screen) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen);
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        bounces
      >
        <Animated.View style={{ opacity: fadeIn }}>

          {/* ══ HERO ══ */}
          <Animated.View style={[styles.heroWrapper, { opacity: heroAnim }]}>
            <Image source={heroSource} style={styles.heroImage} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(20,0,10,0.72)']}
              style={styles.heroGradient}
            />
            {/* Top status bar area */}
            <View style={styles.heroTopBar}>
              <View style={styles.liveChip}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              {heroPhotoTitle ? (
                <View style={styles.heroAiBadge}>
                  <Text style={styles.heroAiBadgeText}>✨ AI</Text>
                </View>
              ) : null}
            </View>
            {/* Bottom info */}
            <View style={styles.heroBottom}>
              <Text style={styles.heroGreeting}>{greeting},</Text>
              <Text style={styles.heroName}>{CONFIG.herName} 🌸</Text>
              {heroPhotoTitle ? (
                <Text style={styles.heroStyleTag}>{heroPhotoTitle}</Text>
              ) : null}
            </View>
          </Animated.View>

          {/* ══ LOVE COUNTER ══ */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>OUR LOVE COUNTER ♾️</Text>
            <View style={styles.counterRow}>
              {[
                { val: counter.days,  label: 'Days'    },
                { val: counter.hours, label: 'Hours'   },
                { val: counter.mins,  label: 'Mins'    },
                { val: counter.secs,  label: 'Secs'    },
              ].map((item) => (
                <View key={item.label} style={styles.counterItem}>
                  <LinearGradient
                    colors={['#ff758c', '#ff7eb3']}
                    style={styles.counterGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.counterValue}>{item.val}</Text>
                    <Text style={styles.counterLabel}>{item.label}</Text>
                  </LinearGradient>
                </View>
              ))}
            </View>
            <View style={styles.togetherChip}>
              <Animated.Text style={[styles.togetherHeart, { transform: [{ scale: heartAnim }] }]}>💞</Animated.Text>
              <Text style={styles.togetherText}>Together in heart, always</Text>
            </View>
          </View>

          {/* ══ BIRTHDAY CARD ══ */}
          <TouchableOpacity activeOpacity={0.9} style={styles.birthdayCard}>
            <LinearGradient
              colors={isBirthday ? ['#f857a6', '#ff5858'] : ['#ff9a9e', '#fad0c4']}
              style={styles.birthdayGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.birthdayLeft}>
                <Text style={styles.birthdayLabel}>
                  {isBirthday ? '🎉 HAPPY BIRTHDAY!' : "Kaju's Birthday"}
                </Text>
                <Text style={styles.birthdayDays}>
                  {isBirthday ? '🎂' : `${birthdayDays} days`}
                </Text>
                <Text style={styles.birthdaySub}>
                  {isBirthday ? 'Today is so special! 💕' : 'until August 29 🎀'}
                </Text>
              </View>
              <Text style={styles.birthdayEmoji}>{isBirthday ? '🎂' : '🎀'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ══ QUICK ACTIONS ══ */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
            <View style={styles.actionsGrid}>
              {QUICK_ACTIONS.map((a) => (
                <TouchableOpacity
                  key={a.screen + a.label}
                  style={styles.actionCard}
                  onPress={() => navigate(a.screen)}
                  activeOpacity={0.82}
                >
                  <LinearGradient
                    colors={a.color}
                    style={styles.actionGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.actionIcon}>{a.icon}</Text>
                    <Text style={styles.actionLabel}>{a.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ══ DAILY QUOTE ══ */}
          <View style={styles.quoteSection}>
            <View style={styles.quoteAccent} />
            <View style={styles.quoteBody}>
              <Text style={styles.quoteMark}>"</Text>
              <Text style={styles.quoteText}>{quote}</Text>
              <Text style={styles.quoteBy}>— For {CONFIG.herName}, with all my love</Text>
            </View>
          </View>

          {/* ══ BOTTOM PADDING ══ */}
          <View style={{ height: 40 }} />

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const CARD_RADIUS = 20;

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#fff5f7' },
  scroll: { paddingBottom: 120 },

  // ── Hero ──
  heroWrapper: {
    height: height * 0.52,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: '60%',
  },
  heroTopBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: 20, right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ff3b30' },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroAiBadge: {
    backgroundColor: 'rgba(255,112,166,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroAiBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  heroBottom: {
    position: 'absolute',
    bottom: 28,
    left: 22,
    right: 22,
  },
  heroGreeting: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '500', letterSpacing: 0.3 },
  heroName: { color: '#fff', fontSize: 34, fontWeight: '800', lineHeight: 40 },
  heroStyleTag: {
    color: 'rgba(255,200,220,0.92)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // ── Sections ──
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c2748a',
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  // ── Counter ──
  counterRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  counterItem: { flex: 1 },
  counterGrad: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  counterValue: { color: '#fff', fontSize: 24, fontWeight: '800' },
  counterLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },
  togetherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  togetherHeart: { fontSize: 18 },
  togetherText: { color: '#c2748a', fontSize: 13, fontWeight: '600', fontStyle: 'italic' },

  // ── Birthday ──
  birthdayCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    shadowColor: '#ff9a9e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  birthdayGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  birthdayLeft:  {},
  birthdayLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  birthdayDays:  { color: '#fff', fontSize: 28, fontWeight: '900', marginVertical: 2 },
  birthdaySub:   { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
  birthdayEmoji: { fontSize: 52 },

  // ── Actions Grid ──
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 40 - 24) / 3,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#ff69b4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  actionGrad: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon:  { fontSize: 26, marginBottom: 6 },
  actionLabel: { color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // ── Quote ──
  quoteSection: {
    marginHorizontal: 20,
    marginTop: 26,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    shadowColor: '#e8c0cc',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  quoteAccent: {
    width: 5,
    backgroundColor: '#ff69b4',
    borderTopLeftRadius: CARD_RADIUS,
    borderBottomLeftRadius: CARD_RADIUS,
  },
  quoteBody:  { flex: 1, padding: 20 },
  quoteMark:  { fontSize: 48, color: '#ffd6e7', lineHeight: 40, fontFamily: 'serif' },
  quoteText:  { fontSize: 15, lineHeight: 22, color: '#4a2040', fontStyle: 'italic', marginTop: -4 },
  quoteBy:    { fontSize: 12, color: '#c2748a', fontWeight: '600', marginTop: 10, textAlign: 'right' },
});
