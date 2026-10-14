// ═══════════════════════════════════════════
// ✨ AI Couple Studio — Kaju & Santosh
// ═══════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Dimensions, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { CONFIG } from '../constants/data';
import { getPollinationsApiKey, getOpenAIApiKey } from '../config/api';
import {
  getAIPhotos,
  getPhotoPool,
  addToPhotoPool,
  bothPoolsHavePhotos,
  PRESETS,
} from '../services/photoDatabase';
import { triggerAutomatedCoupleGeneration, PRESET_ARTWORKS } from '../services/aiPhotoService';
import { sendNotificationWithImage } from '../services/notifications';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48 - 12) / 2;

export default function AiPhotoScreen() {
  const [hisCount, setHisCount] = useState(0);
  const [herCount, setHerCount] = useState(0);
  const [hisPreview, setHisPreview] = useState(null);
  const [herPreview, setHerPreview] = useState(null);
  const [aiPhotos, setAiPhotos] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const hasPollinationsKey = !!getPollinationsApiKey();
  const hasOpenAIKey = !!getOpenAIApiKey();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const his = await getPhotoPool('his');
    const her = await getPhotoPool('her');
    setHisCount(his.length);
    setHerCount(her.length);
    setHisPreview(his.length > 0 ? his[0].uri : null);
    setHerPreview(her.length > 0 ? her[0].uri : null);

    const photos = await getAIPhotos();
    if (photos.length > 0) {
      setAiPhotos(photos);
    } else {
      setAiPhotos(PRESET_ARTWORKS.map(p => ({
        id: p.id,
        uri: p.uri,
        isRemote: false,
        styleTitle: p.styleTitle,
        styleTag: 'Default Preset',
        isFallback: true,
        generationSource: 'preset_fallback',
        createdAt: new Date().toISOString(),
      })));
    }
  }

  async function handleUpload(role) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      await addToPhotoPool(role, uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();

      const ready = await bothPoolsHavePhotos();
      if (ready) {
        setGenerating(true);
        const res = await triggerAutomatedCoupleGeneration({
          fromUpload: true,
          uploadedBy: role === 'his' ? CONFIG.hisName : CONFIG.herName,
        });
        setGenerating(false);
        await loadData();

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (res?.isFallback) {
          setDiagnostic({
            type: 'fallback',
            title: '⚠️ Dev Notice: Fallback Artwork Used',
            detail: res.errorDetail || 'API call failed or timed out. Preset couple artwork was used.',
            time: timeStr,
          });
          Alert.alert(
            '⚠️ Dev Notice: Fallback Used',
            `Both photos were present, but the live AI image generator triggered a fallback.\n\nReason: "${res.errorDetail || 'Network / API error'}"\n\nA romantic preset couple artwork was loaded so testing continues without failure! 💕`,
            [{ text: 'Understood', style: 'default' }]
          );
        } else if (res?.success) {
          setDiagnostic({
            type: 'success',
            title: res.hasVisionLikeness
              ? '👁️ Photo Likeness Blended (Santosh 👦 + Kaju 👧)'
              : '✨ Live AI Generated (Pollinations Flux)',
            detail: res.hasVisionLikeness
              ? `AI analyzed both your uploaded photos and infused your exact facial likeness into "${res.item?.styleTitle}"!`
              : `Created "${res.item?.styleTitle}" using your active Pollinations API key!`,
            time: timeStr,
          });
        }
      }
    }
  }

  async function handleGenerateMore() {
    const ready = await bothPoolsHavePhotos();
    if (!ready) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setGenerating(true);
    const res = await triggerAutomatedCoupleGeneration({ fromUpload: false });
    setGenerating(false);
    await loadData();

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (res?.isFallback) {
      setDiagnostic({
        type: 'fallback',
        title: '⚠️ Dev Notice: Fallback Artwork Used',
        detail: res.errorDetail || 'API call failed or timed out. Preset couple artwork was used.',
        time: timeStr,
      });
      Alert.alert(
        '⚠️ Dev Notice: Fallback Used',
        `Generation completed with fallback preset.\n\nReason: "${res.errorDetail || 'Network / API error'}"\n\nA romantic preset couple artwork was added to your memory board.`,
        [{ text: 'OK', style: 'default' }]
      );
    } else if (res?.success) {
      setDiagnostic({
        type: 'success',
        title: res.hasVisionLikeness
          ? '👁️ Photo Likeness Blended (Santosh 👦 + Kaju 👧)'
          : '✨ Live AI Generated (Pollinations Flux)',
        detail: res.hasVisionLikeness
          ? `AI analyzed both your uploaded photos and infused your exact facial likeness into "${res.item?.styleTitle}"!`
          : `Created "${res.item?.styleTitle}" using your active Pollinations API key!`,
        time: timeStr,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  async function handleSendNotification(item) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const imageUri = typeof item.uri === 'string' ? item.uri : undefined;
    await sendNotificationWithImage({
      title: `📸 Surprise from ${CONFIG.hisName}!`,
      body:  `Look at this AI couple picture of us in "${item.styleTitle}"! Tap to see 💕`,
      imageUri,
      isRemote: item.isRemote,
      screen: 'AiPhoto',
      data:  { photoId: item.id },
    });
  }

  async function handleShare(item) {
    if (typeof item.uri === 'string' && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(item.uri);
    }
  }

  const getSource = (item) => {
    if (item.isRemote && typeof item.uri === 'string') return { uri: item.uri };
    if (typeof item.uri === 'string') return { uri: item.uri };
    return item.uri;
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ── */}
        <LinearGradient
          colors={['#a18cd1', '#fbc2eb']}
          style={styles.headerGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerInner}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {hasPollinationsKey ? '⚡ FLUX AI ACTIVE' : hasOpenAIKey ? '⚡ DALL-E 3 ACTIVE' : '🌸 OFFLINE PRESETS'}
              </Text>
            </View>
            <Text style={styles.headerTitle}>AI Couple Studio</Text>
            <Text style={styles.headerSub}>
              Upload photos → AI blends your memories → sent as cute notification previews 💕
            </Text>
          </View>
        </LinearGradient>

        {/* ── Photo Pools ── */}
        <View style={styles.poolsCard}>
          <View style={styles.poolsHeaderRow}>
            <View>
              <Text style={styles.poolsHeading}>Photo Uploads</Text>
              <Text style={styles.poolsSub}>AI picks from both pools & creates custom art</Text>
            </View>
            <View style={[styles.engineStatusPill, hasPollinationsKey ? styles.engineActive : styles.engineInactive]}>
              <View style={[styles.engineDot, hasPollinationsKey ? styles.dotGreen : styles.dotAmber]} />
              <Text style={styles.engineStatusText}>
                {hasPollinationsKey ? 'Flux AI' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={styles.poolsRow}>
            {/* His Pool */}
            <TouchableOpacity style={styles.poolSlot} onPress={() => handleUpload('his')} activeOpacity={0.82}>
              {hisPreview ? (
                <Image source={{ uri: hisPreview }} style={styles.poolPreview} />
              ) : (
                <LinearGradient colors={['#a18cd1', '#fbc2eb']} style={styles.poolEmpty} start={{x:0,y:0}} end={{x:1,y:1}}>
                  <Text style={styles.poolEmptyEmoji}>👦</Text>
                  <Text style={styles.poolEmptyName}>{CONFIG.hisName}</Text>
                </LinearGradient>
              )}
              <View style={styles.poolCountBadge}>
                <Text style={styles.poolCountText}>{hisCount} 📷</Text>
              </View>
              <LinearGradient colors={['transparent','rgba(0,0,0,0.45)']} style={styles.poolOverlay}>
                <Text style={styles.poolAddLabel}>+ Add Photo</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.poolDivider}>
              <Text style={styles.poolDividerHeart}>💞</Text>
              {generating ? (
                <ActivityIndicator color="#ff69b4" size="small" style={{ marginTop: 4 }} />
              ) : null}
            </View>

            {/* Her Pool */}
            <TouchableOpacity style={styles.poolSlot} onPress={() => handleUpload('her')} activeOpacity={0.82}>
              {herPreview ? (
                <Image source={{ uri: herPreview }} style={styles.poolPreview} />
              ) : (
                <LinearGradient colors={['#ff9a9e', '#fecfef']} style={styles.poolEmpty} start={{x:0,y:0}} end={{x:1,y:1}}>
                  <Text style={styles.poolEmptyEmoji}>👧</Text>
                  <Text style={styles.poolEmptyName}>{CONFIG.herName}</Text>
                </LinearGradient>
              )}
              <View style={styles.poolCountBadge}>
                <Text style={styles.poolCountText}>{herCount} 📷</Text>
              </View>
              <LinearGradient colors={['transparent','rgba(0,0,0,0.45)']} style={styles.poolOverlay}>
                <Text style={styles.poolAddLabel}>+ Add Photo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Generate More Button */}
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={handleGenerateMore}
            disabled={generating || (hisCount === 0 || herCount === 0)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={generating ? ['#e8c4d4','#e8c4d4'] : ['#ff758c','#ff7eb3']}
              style={styles.generateBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {generating ? (
                <View style={styles.generatingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.generateBtnText}>Creating your AI couple art... ✨</Text>
                </View>
              ) : (
                <Text style={styles.generateBtnText}>
                  {hisCount > 0 && herCount > 0 ? '⚡ Generate More Couple Art' : '⬆ Upload photos from both to start'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Testing / Diagnostics Feedback Banner ── */}
        {diagnostic && (
          <View style={[
            styles.diagCard,
            diagnostic.type === 'fallback' ? styles.diagCardFallback : styles.diagCardSuccess
          ]}>
            <View style={styles.diagRow}>
              <Text style={styles.diagIcon}>
                {diagnostic.type === 'fallback' ? '⚠️' : '🟢'}
              </Text>
              <View style={styles.diagContent}>
                <View style={styles.diagTitleRow}>
                  <Text style={[
                    styles.diagTitle,
                    diagnostic.type === 'fallback' ? styles.diagTextFallback : styles.diagTextSuccess
                  ]}>
                    {diagnostic.title}
                  </Text>
                  <Text style={styles.diagTime}>{diagnostic.time}</Text>
                </View>
                <Text style={styles.diagDetail}>{diagnostic.detail}</Text>
                {diagnostic.type === 'fallback' && (
                  <Text style={styles.diagHint}>
                    💡 Fallback triggered to keep testing seamless. Check network or key limits.
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setDiagnostic(null)} style={styles.diagClose}>
                <Text style={styles.diagCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Pinterest Memory Board ── */}
        <View style={styles.boardSection}>
          <Text style={styles.boardTitle}>Memory Board</Text>
          <Text style={styles.boardSub}>Tap any photo to view diagnostics or send as a surprise notification 💌</Text>

          <View style={styles.boardGrid}>
            {aiPhotos.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.boardCard, idx % 2 === 0 ? styles.boardCardTall : styles.boardCardShort]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(item); }}
                activeOpacity={0.9}
              >
                <Image source={getSource(item)} style={styles.boardCardImage} resizeMode="cover" />
                <LinearGradient colors={['transparent','rgba(0,0,0,0.72)']} style={styles.boardCardOverlay}>
                  <View style={styles.boardCardMeta}>
                    <View style={styles.boardBadgeRow}>
                      {item.styleTag && (
                        <Text style={styles.boardCardTag}>{item.styleTag}</Text>
                      )}
                      <View style={[
                        styles.enginePill,
                        item.isFallback
                          ? styles.enginePillFallback
                          : item.hasVisionLikeness
                          ? styles.enginePillLikeness
                          : styles.enginePillSuccess,
                      ]}>
                        <Text style={styles.enginePillText}>
                          {item.isFallback
                            ? '📦 Preset'
                            : item.hasVisionLikeness
                            ? '👁️ Likeness'
                            : '✨ Flux AI'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.boardCardTitle} numberOfLines={2}>{item.styleTitle}</Text>
                    <TouchableOpacity
                      style={styles.boardSendBtn}
                      onPress={() => handleSendNotification(item)}
                    >
                      <Text style={styles.boardSendText}>🔔 Send to Kaju</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* ── Full Photo Modal with Diagnostics ── */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            {selected && (
              <>
                <Image
                  source={getSource(selected)}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <View style={styles.modalBody}>
                  <View style={styles.modalBadgeRow}>
                    <View style={[
                      styles.modalBadge,
                      selected.isFallback
                        ? styles.modalBadgeFallback
                        : selected.hasVisionLikeness
                        ? styles.modalBadgeLikeness
                        : styles.modalBadgeSuccess,
                    ]}>
                      <Text style={[
                        styles.modalBadgeText,
                        selected.isFallback
                          ? styles.modalBadgeTextFallback
                          : selected.hasVisionLikeness
                          ? styles.modalBadgeTextLikeness
                          : styles.modalBadgeTextSuccess,
                      ]}>
                        {selected.isFallback
                          ? '📦 Fallback Preset Artwork'
                          : selected.hasVisionLikeness
                          ? '👁️ Photo Likeness Blended'
                          : '✨ Live Pollinations Flux Art'}
                      </Text>
                    </View>
                  </View>

                  {/* Dev Diagnostic Detail */}
                  {selected.isFallback && selected.errorDetail ? (
                    <View style={styles.modalDebugBox}>
                      <Text style={styles.modalDebugLabel}>🔍 Dev Diagnostic Reason:</Text>
                      <Text style={styles.modalDebugText}>{selected.errorDetail}</Text>
                    </View>
                  ) : null}

                  {selected.hasVisionLikeness && selected.likenessPrompt ? (
                    <View style={styles.modalLikenessBox}>
                      <Text style={styles.modalLikenessLabel}>✨ Likeness Extracted From Photos:</Text>
                      <Text style={styles.modalLikenessText} numberOfLines={3}>{selected.likenessPrompt}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.modalTitle}>{selected.styleTitle}</Text>
                  <Text style={styles.modalSub}>
                    Crafted from {CONFIG.hisName} & {CONFIG.herName}'s photos 💕
                  </Text>
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalPrimary}
                      onPress={() => { handleSendNotification(selected); setSelected(null); }}
                    >
                      <LinearGradient colors={['#ff758c','#ff7eb3']} style={styles.modalPrimaryGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                        <Text style={styles.modalPrimaryText}>🔔 Send as Notification</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalSecondary}
                      onPress={() => handleShare(selected)}
                    >
                      <Text style={styles.modalSecondaryText}>📲 Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#fafafa' },
  scroll: { paddingBottom: 120 },

  headerGrad: { paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 28, paddingHorizontal: 22 },
  headerInner: {},
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  headerTitle:     { color: '#fff', fontSize: 30, fontWeight: '800' },
  headerSub:       { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4, lineHeight: 18 },

  // Pools Card
  poolsCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#e8b0c0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  poolsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  poolsHeading: { fontSize: 18, fontWeight: '800', color: '#2d0016' },
  poolsSub:     { fontSize: 12, color: '#c2748a', marginTop: 3 },
  engineStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  engineActive:   { backgroundColor: '#e8f8f0' },
  engineInactive: { backgroundColor: '#fff4e5' },
  engineDot:      { width: 7, height: 7, borderRadius: 3.5 },
  dotGreen:       { backgroundColor: '#10b981' },
  dotAmber:       { backgroundColor: '#f59e0b' },
  engineStatusText: { fontSize: 10, fontWeight: '800', color: '#2d0016' },

  poolsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  poolSlot: {
    flex: 1,
    height: 140,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f5edf0',
    position: 'relative',
  },
  poolPreview: { width: '100%', height: '100%' },
  poolEmpty:   { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  poolEmptyEmoji: { fontSize: 32, marginBottom: 4 },
  poolEmptyName:  { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700' },
  poolCountBadge: {
    position: 'absolute',
    top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  poolCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  poolOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 44,
    justifyContent: 'flex-end',
    paddingBottom: 8,
    paddingLeft: 10,
  },
  poolAddLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },
  poolDivider:  { alignItems: 'center', width: 32 },
  poolDividerHeart: { fontSize: 20 },

  generateBtn: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  generateBtnGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  generateBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  generatingRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Diagnostic Feedback Card
  diagCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  diagCardSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  diagCardFallback: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  diagRow: { flexDirection: 'row', alignItems: 'flex-start' },
  diagIcon: { fontSize: 20, marginRight: 8, marginTop: 1 },
  diagContent: { flex: 1 },
  diagTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diagTitle: { fontSize: 13, fontWeight: '800' },
  diagTextSuccess:  { color: '#166534' },
  diagTextFallback: { color: '#92400e' },
  diagTime: { fontSize: 10, color: '#9ca3af' },
  diagDetail: { fontSize: 12, color: '#374151', marginTop: 4, lineHeight: 16 },
  diagHint:   { fontSize: 11, color: '#b45309', marginTop: 4, fontStyle: 'italic' },
  diagClose:  { padding: 4, marginLeft: 6 },
  diagCloseText: { fontSize: 14, color: '#9ca3af', fontWeight: '700' },

  // Board
  boardSection: { paddingHorizontal: 16, marginTop: 4 },
  boardTitle: { fontSize: 22, fontWeight: '800', color: '#2d0016', marginBottom: 2 },
  boardSub:   { fontSize: 12, color: '#c2748a', marginBottom: 14 },
  boardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  boardCard: {
    width: CARD_W,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f5e0e8',
    shadowColor: '#e8b0c0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  boardCardTall:  { height: 240 },
  boardCardShort: { height: 200 },
  boardCardImage: { width: '100%', height: '100%', position: 'absolute' },
  boardCardOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 12,
    justifyContent: 'flex-end',
  },
  boardCardMeta: {},
  boardBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  boardCardTag:  { color: 'rgba(255,220,240,0.9)', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  enginePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  enginePillSuccess:  { backgroundColor: 'rgba(16,185,129,0.85)' },
  enginePillFallback: { backgroundColor: 'rgba(245,158,11,0.85)' },
  enginePillLikeness: { backgroundColor: 'rgba(147,51,234,0.85)' },
  enginePillText:     { color: '#fff', fontSize: 8, fontWeight: '800' },
  boardCardTitle: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2, lineHeight: 17 },
  boardSendBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(255,105,180,0.88)',
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  boardSendText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    overflow: 'hidden',
  },
  modalImage: { width: '100%', height: 300 },
  modalBody:  { padding: 20 },
  modalBadgeRow: { flexDirection: 'row', marginBottom: 8 },
  modalBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalBadgeSuccess:  { backgroundColor: '#e8f8f0' },
  modalBadgeFallback: { backgroundColor: '#fff4e5' },
  modalBadgeLikeness: { backgroundColor: '#f3e8ff' },
  modalBadgeText:     { fontSize: 11, fontWeight: '800' },
  modalBadgeTextSuccess:  { color: '#059669' },
  modalBadgeTextFallback: { color: '#d97706' },
  modalBadgeTextLikeness: { color: '#7e22ce' },

  modalDebugBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  modalDebugLabel: { fontSize: 11, fontWeight: '800', color: '#92400e', marginBottom: 2 },
  modalDebugText:  { fontSize: 11, color: '#78350f', lineHeight: 15 },

  modalLikenessBox: {
    backgroundColor: '#faf5ff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  modalLikenessLabel: { fontSize: 11, fontWeight: '800', color: '#6b21a8', marginBottom: 2 },
  modalLikenessText:  { fontSize: 11, color: '#581c87', lineHeight: 15 },

  modalTitle:  { fontSize: 22, fontWeight: '800', color: '#2d0016' },
  modalSub:    { fontSize: 13, color: '#c2748a', marginTop: 4, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalPrimary: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  modalPrimaryGrad: { paddingVertical: 13, alignItems: 'center' },
  modalPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  modalSecondary: {
    width: 90,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5edf0',
  },
  modalSecondaryText: { color: '#9b5070', fontWeight: '700', fontSize: 13 },
  modalClose: {
    position: 'absolute',
    top: 14, right: 14,
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
