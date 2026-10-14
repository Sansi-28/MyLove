// ═══════════════════════════════════════════
// 📸 Gallery Screen — Kaju & Santosh
// ═══════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Modal, Dimensions, Alert, FlatList, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { CONFIG } from '../constants/data';
import {
  getGallery, addUserUploadToGallery,
  addToPhotoPool, bothPoolsHavePhotos,
} from '../services/photoDatabase';
import { triggerAutomatedCoupleGeneration } from '../services/aiPhotoService';
import { PRESETS } from '../services/photoDatabase';
import {
  sendNotificationWithImage,
  sendNotificationWithRecentGalleryImage,
  sendPushToPartner,
  getMyRole,
} from '../services/notifications';
import { uploadImageToFirebase } from '../services/firebaseHelpers';

const { width } = Dimensions.get('window');
const COL = 3;
const GAP = 2;
const THUMB = (width - GAP * (COL + 1)) / COL;

const DEFAULT_IMAGES = [
  { id: 'default_hero',  uri: PRESETS.hero,    caption: 'Us 💕',              category: 'presets', isRemote: false },
  { id: 'default_morn',  uri: PRESETS.morning, caption: 'Good Morning ☀️',    category: 'presets', isRemote: false },
  { id: 'default_night', uri: PRESETS.night,   caption: 'Good Night 🌙',      category: 'presets', isRemote: false },
  { id: 'default_think', uri: PRESETS.think,   caption: 'Thinking of You 💭', category: 'presets', isRemote: false },
  { id: 'default_hug',   uri: PRESETS.hug,     caption: 'Virtual Hug 🤗',     category: 'presets', isRemote: false },
  { id: 'default_kiss',  uri: PRESETS.kiss,    caption: 'Sweet Kiss 😘',       category: 'presets', isRemote: false },
];

const TABS = [
  { key: 'all',     label: 'All' },
  { key: 'ai',      label: '✨ AI Art' },
  { key: 'us',      label: '📷 Our Pics' },
  { key: 'presets', label: '🌸 Presets' },
];

export default function GalleryScreen({ navigation }) {
  const [images, setImages]         = useState(DEFAULT_IMAGES);
  const [tab, setTab]               = useState('all');
  const [viewer, setViewer]         = useState(null);
  const [generating, setGenerating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadGallery();
    }, [])
  );

  async function loadGallery() {
    const dbPhotos = await getGallery();
    setImages([...DEFAULT_IMAGES, ...dbPhotos]);
  }

  async function handleSendPushWithRecentPhoto() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sendNotificationWithRecentGalleryImage({
        title: `📸 Special Memory from our Gallery! 💕`,
        body: `Santosh sent a recent couple picture for ${CONFIG.herName}! Tap to view ✨`,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '🔔 Push Notification Sent!',
        `A push notification with the most recent generated photo from your gallery was sent to your phone! 💕`
      );
    } catch (err) {
      Alert.alert('Notice', 'Could not send notification: ' + err.message);
    }
  }

  async function handleSendSpecificPhotoNotification(photo) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = typeof photo.uri === 'string' ? photo.uri : undefined;
      const myRole = await getMyRole();
      const recipientName = myRole === 'his' ? CONFIG.herName : CONFIG.hisName;

      await sendPushToPartner({
        title: `📸 Special Photo for ${recipientName}! 💕`,
        body: `${photo.caption || 'Look at this photo from our gallery!'} Tap to open 💕`,
        screen: 'Gallery',
        data: { photoId: photo.id, imageUri: uri },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '🔔 Notification Sent!',
        `Push notification with this photo has been sent to partner! 💕`
      );
    } catch (err) {
      Alert.alert('Notice', 'Could not send notification: ' + err.message);
    }
  }

  async function pickAndUpload(role) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need gallery access to save your beautiful memories! 📸');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      for (const asset of result.assets) {
        let finalUri = asset.uri;
        try {
          const cloudUrl = await uploadImageToFirebase(asset.uri, `gallery/${role}`);
          if (cloudUrl) finalUri = cloudUrl;
        } catch (uploadErr) {
          console.log('Using local URI:', uploadErr?.message);
        }

        // 1. Add to photo pool (his/her)
        await addToPhotoPool(role, finalUri);
        // 2. Add to gallery DB
        await addUserUploadToGallery(finalUri, role);
      }

      await loadGallery();

      // 3. Check if both pools are ready → auto-generate AI art
      const ready = await bothPoolsHavePhotos();
      if (ready) {
        Alert.alert(
          '⚡ AI Magic Starting!',
          'Both your photos are ready! The AI is now creating romantic couple art and will send you a notification with the photo attached when done! 🌸💕',
          [{ text: 'Exciting! 💕', style: 'default' }]
        );
        setGenerating(true);
        const genRes = await triggerAutomatedCoupleGeneration({
          fromUpload: true,
          uploadedBy: role === 'his' ? CONFIG.hisName : CONFIG.herName,
        });
        setGenerating(false);
        await loadGallery();

        if (genRes?.isFallback) {
          Alert.alert(
            '⚠️ Dev Notice: Fallback Artwork Used',
            `Both photos were detected, but the live AI generation fell back to offline artwork.\n\nReason: "${genRes.errorDetail || 'Connection or API issue'}"\n\nA romantic preset artwork was added so testing continues smoothly without crashing! 💕`,
            [{ text: 'Understood', style: 'default' }]
          );
        } else if (genRes?.success) {
          Alert.alert(
            genRes.hasVisionLikeness ? '✨ Photo Likeness Blended!' : '✨ Live AI Couple Art Created!',
            genRes.hasVisionLikeness
              ? `AI analyzed both your uploaded photos and blended your visual features into "${genRes.item?.styleTitle || 'Couple Art'}"!\n\nNotification sent and photo added to your gallery! 🌸`
              : `Generated via Pollinations Flux API ("${genRes.item?.styleTitle || 'Couple Art'}").\n\nNotification sent and photo added to your gallery! 🌸`,
            [{ text: 'View Gallery 💕', style: 'default' }]
          );
        }
      } else {
        const other = role === 'his' ? CONFIG.herName : CONFIG.hisName;
        Alert.alert(
          'Photo Saved! 🌸',
          `Once ${other} also uploads a photo, the AI will automatically create magical couple art and send it as a notification! 💕`
        );
      }
    }
  }

  const getImageSource = (img) => {
    if (img.isRemote && typeof img.uri === 'string') return { uri: img.uri };
    if (typeof img.uri === 'string') return { uri: img.uri };
    return img.uri; // require() result
  };

  const filtered = tab === 'all'
    ? images
    : images.filter(i => i.category === tab);

  const renderThumb = ({ item }) => (
    <TouchableOpacity
      style={styles.thumb}
      onPress={() => { setViewer(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      activeOpacity={0.88}
    >
      <Image source={getImageSource(item)} style={styles.thumbImage} resizeMode="cover" />
      {item.category === 'ai' && (
        <View style={styles.thumbAiBadge}>
          <Text style={styles.thumbAiText}>✨</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>

      {/* ── Header ── */}
      <LinearGradient
        colors={['#fff5f7', '#fff5f7']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Our Gallery</Text>
        <Text style={styles.headerSub}>Every moment we cherish 💕</Text>
      </LinearGradient>

      {/* ── Upload Buttons ── */}
      <View style={styles.uploadRow}>
        <TouchableOpacity
          style={[styles.uploadBtn, generating && styles.uploadBtnDisabled]}
          onPress={() => pickAndUpload('his')}
          disabled={generating}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#a18cd1', '#fbc2eb']} style={styles.uploadBtnGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Text style={styles.uploadBtnIcon}>👦</Text>
            <Text style={styles.uploadBtnText}>{CONFIG.hisName}'s Photo</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.uploadSep}>
          <Text style={styles.uploadSepText}>{generating ? '⚡' : '+'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.uploadBtn, generating && styles.uploadBtnDisabled]}
          onPress={() => pickAndUpload('her')}
          disabled={generating}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#ff9a9e', '#fecfef']} style={styles.uploadBtnGrad} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Text style={styles.uploadBtnIcon}>👧</Text>
            <Text style={styles.uploadBtnText}>{CONFIG.herName}'s Photo</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Quick Push Notification Trigger with Recent Art ── */}
      <TouchableOpacity
        style={styles.pushActionBtn}
        onPress={handleSendPushWithRecentPhoto}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#ff758c', '#ff7eb3']}
          style={styles.pushActionGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.pushActionIcon}>🔔</Text>
          <Text style={styles.pushActionText}>Send Push Notification with Recent Gallery Art</Text>
        </LinearGradient>
      </TouchableOpacity>

      {generating && (
        <View style={styles.generatingBanner}>
          <Text style={styles.generatingText}>✨ AI is creating your couple art... 💕</Text>
        </View>
      )}

      {/* ── Tab Filter ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => { setTab(t.key); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Grid ── */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderThumb}
        numColumns={COL}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyText}>No photos yet in this category</Text>
          </View>
        }
      />

      {/* ── Fullscreen Viewer Modal ── */}
      <Modal
        visible={!!viewer}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer(null)}
      >
        <View style={styles.modalBg}>
          {viewer && (
            <>
              <Image
                source={getImageSource(viewer)}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.modalFooter}>
                <Text style={styles.modalCaption}>{viewer.caption}</Text>
                {viewer.category === 'ai' && (
                  <View style={styles.modalAiBadge}>
                    <Text style={styles.modalAiBadgeText}>✨ AI Generated</Text>
                  </View>
                )}

                {/* Send as Push Notification Button */}
                <TouchableOpacity
                  style={styles.modalNotifBtn}
                  onPress={() => handleSendSpecificPhotoNotification(viewer)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#ff69b4', '#ff85c0']}
                    style={styles.modalNotifGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.modalNotifText}>🔔 Send as Push Notification to {CONFIG.herName}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
          <TouchableOpacity style={styles.modalClose} onPress={() => setViewer(null)}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fafafa' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 30, fontWeight: '800', color: '#2d0016' },
  headerSub:   { fontSize: 14, color: '#c2748a', marginTop: 2 },

  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  uploadBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnGrad: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  uploadBtnIcon: { fontSize: 16 },
  uploadBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  uploadSep:     { width: 30, alignItems: 'center' },
  uploadSepText: { fontSize: 20, color: '#e8b0c0', fontWeight: '800' },

  generatingBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff0f7',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd6e7',
  },
  generatingText: { color: '#c2748a', fontWeight: '700', fontSize: 13 },

  tabScroll:   { maxHeight: 44 },
  tabContent:  { paddingHorizontal: 16, gap: 8 },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5edf0',
  },
  tabActive:     { backgroundColor: '#ff69b4' },
  tabText:       { fontSize: 13, fontWeight: '600', color: '#9b5070' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  grid: { paddingHorizontal: GAP, paddingBottom: 120 },
  row:  { gap: GAP, marginBottom: GAP },
  thumb: {
    width: THUMB,
    height: THUMB,
    position: 'relative',
    backgroundColor: '#f5e0e8',
  },
  thumbImage:   { width: '100%', height: '100%' },
  thumbAiBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,105,180,0.85)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbAiText: { fontSize: 11 },

  emptyBox:  { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:{ fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#c2748a', fontSize: 14, fontWeight: '500' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: width, height: width, maxHeight: '75%' },
  modalFooter: { alignItems: 'center', marginTop: 16, paddingHorizontal: 24 },
  modalCaption: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  modalAiBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255,105,180,0.8)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  modalAiBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  modalClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  pushActionBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#ff758c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  pushActionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  pushActionIcon: { fontSize: 16 },
  pushActionText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  modalNotifBtn: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    width: width - 60,
  },
  modalNotifGrad: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalNotifText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
