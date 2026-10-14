// ═══════════════════════════════════════════
// 💌 Love Notes Screen
// ═══════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Animated, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { CONFIG, LOVE_NOTES } from '../constants/data';
import { sendNotificationWithImage } from '../services/notifications';
import { getNotificationImage } from '../services/photoDatabase';

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export default function NotesScreen() {
  const [currentNote, setCurrentNote] = useState('');
  const [savedNotes, setSavedNotes]   = useState([]);
  const [customText, setCustomText]   = useState('');
  const [showSaved, setShowSaved]     = useState(false);
  const noteAnim = useRef(new Animated.Value(1)).current;
  const fadeIn   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    getNewNote();
    loadSaved();
  }, []);

  function getNewNote() {
    Animated.sequence([
      Animated.timing(noteAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(noteAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    setCurrentNote(randomFrom(LOVE_NOTES));
    Haptics.selectionAsync();
  }

  async function loadSaved() {
    const raw = await AsyncStorage.getItem('savedNotes');
    setSavedNotes(raw ? JSON.parse(raw) : []);
  }

  async function saveNote() {
    if (savedNotes.includes(currentNote)) {
      Alert.alert('💕', 'Already saved this one!');
      return;
    }
    const updated = [currentNote, ...savedNotes].slice(0, 30);
    await AsyncStorage.setItem('savedNotes', JSON.stringify(updated));
    setSavedNotes(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('💕', 'Love note saved!');
  }

  async function addCustomNote() {
    if (!customText.trim()) return;
    const note = { text: customText.trim(), date: new Date().toISOString() };
    const existing = await AsyncStorage.getItem('customNotes');
    const customs  = existing ? JSON.parse(existing) : [];
    const updated  = [note, ...customs];
    await AsyncStorage.setItem('customNotes', JSON.stringify(updated));

    // Attach AI image to love note notification
    const imgData = await getNotificationImage('love');
    const imageUri = imgData && typeof imgData.uri === 'string' ? imgData.uri : undefined;
    await sendNotificationWithImage({
      title:    `💌 Love Note from ${CONFIG.hisName}`,
      body:     customText.trim(),
      imageUri,
      isRemote: imgData?.isRemote || false,
      screen:   'Notes',
    });
    setCustomText('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('💌', 'Love note sent to Kaju with a surprise photo! 💕');
  }

  async function deleteNote(index) {
    const updated = savedNotes.filter((_, i) => i !== index);
    await AsyncStorage.setItem('savedNotes', JSON.stringify(updated));
    setSavedNotes(updated);
  }

  return (
    <LinearGradient colors={GRADIENTS.pinkSoft} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View style={{ opacity: fadeIn }}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>💌 Love Notes</Text>
            <Text style={styles.subtitle}>Little messages from my heart to yours</Text>
          </View>

          {/* Current Note */}
          <Animated.View style={[styles.card, styles.noteCard, { opacity: noteAnim }]}>
            <Text style={styles.quoteOpen}>❝</Text>
            <Text style={styles.noteText}>{currentNote}</Text>
            <Text style={styles.noteAuthor}>— {CONFIG.hisName} 💕</Text>
          </Animated.View>

          {/* Note Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={getNewNote}>
              <Text style={styles.actionBtnText}>🔄 New</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={saveNote}>
              <Text style={styles.actionBtnText}>❤️ Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowSaved(!showSaved)}>
              <Text style={styles.actionBtnText}>📚 Saved ({savedNotes.length})</Text>
            </TouchableOpacity>
          </View>

          {/* Saved Notes */}
          {showSaved && savedNotes.length > 0 && (
            <View style={styles.savedContainer}>
              <Text style={styles.sectionTitle}>❤️ Saved Notes</Text>
              {savedNotes.map((note, i) => (
                <View key={i} style={[styles.card, styles.savedNote]}>
                  <Text style={styles.savedNoteText}>{note}</Text>
                  <TouchableOpacity onPress={() => deleteNote(i)}>
                    <Text style={styles.deleteBtn}>🗑️ Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Write Custom Note */}
          <View style={[styles.card, styles.writeCard]}>
            <Text style={styles.sectionTitle}>✍️ Write a Love Note</Text>
            <TextInput
              style={styles.textInput}
              placeholder={`Dear ${CONFIG.herName}, today I want you to know...`}
              placeholderTextColor={COLORS.textLight}
              multiline
              value={customText}
              onChangeText={setCustomText}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={addCustomNote} activeOpacity={0.85}>
              <LinearGradient colors={GRADIENTS.pinkVibrant} style={styles.sendBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
                <Text style={styles.sendBtnText}>💌 Send Love Note</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.md, paddingBottom: 120 },
  header: { alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: 28, fontStyle: 'italic', fontWeight: '700', color: COLORS.pink600 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  noteCard: { position: 'relative' },
  quoteOpen: { fontSize: 44, color: COLORS.pink200, fontStyle: 'italic', lineHeight: 40, marginBottom: -10 },
  noteText: { fontSize: 18, fontStyle: 'italic', color: COLORS.textPrimary, lineHeight: 28, textAlign: 'center' },
  noteAuthor: { textAlign: 'right', marginTop: SPACING.sm, color: COLORS.pink500, fontSize: 14, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  actionBtn: {
    flex: 1, backgroundColor: COLORS.cardBg, borderRadius: RADIUS.full,
    paddingVertical: 10, alignItems: 'center', borderWidth: 2, borderColor: COLORS.pink200,
    ...SHADOWS.soft,
  },
  actionBtnText: { color: COLORS.pink500, fontWeight: '700', fontSize: 12 },

  savedContainer: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: 17, fontStyle: 'italic', fontWeight: '700', color: COLORS.pink600, marginBottom: SPACING.sm, textAlign: 'center' },
  savedNote: { padding: SPACING.md },
  savedNoteText: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20, fontStyle: 'italic' },
  deleteBtn: { color: COLORS.textLight, fontSize: 12, marginTop: SPACING.xs },

  writeCard: {},
  textInput: {
    borderWidth: 2, borderColor: COLORS.pink200, borderRadius: RADIUS.sm,
    padding: SPACING.md, fontFamily: 'System', fontSize: 15,
    color: COLORS.textPrimary, backgroundColor: COLORS.roseWhite,
    minHeight: 100, textAlignVertical: 'top', marginBottom: SPACING.md,
  },
  sendBtn: { borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.button },
  sendBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  sendBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
