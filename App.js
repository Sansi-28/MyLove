// ═══════════════════════════════════════════
// 💕 My Love App — Kaju & Santosh
// ═══════════════════════════════════════════
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import HomeScreen from './src/screens/HomeScreen';
import NotesScreen from './src/screens/NotesScreen';
import AiPhotoScreen from './src/screens/AiPhotoScreen';
import LoveScreen from './src/screens/LoveScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import MoodScreen from './src/screens/MoodScreen';

import {
  registerForPushNotificationsAsync,
  scheduleAllNotifications,
} from './src/services/notifications';
import { COLORS, SHADOWS, RADIUS } from './src/constants/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // 1. Setup Push Notifications
    registerForPushNotificationsAsync().then((status) => {
      if (status === 'granted') {
        scheduleAllNotifications();
      }
    });

    // 2. Notification tap response listener (navigates with image params)
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const screen = data?.screen || 'Gallery';
      if (screen && navigationRef.current) {
        navigationRef.current.navigate(screen, {
          photoId: data?.photoId,
          imageUri: data?.imageUri,
          caption: data?.caption,
        });
      }
    });

    // 3. Foreground notification reception listener
    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      console.log('🔔 Notification received with gallery image:', data?.imageUri || 'preset');
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
      Notifications.removeNotificationSubscription(receivedListener);
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: COLORS.pink500,
          tabBarInactiveTintColor: '#a0708f',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIcon: ({ focused }) => {
            let icon = '🌸';
            if (route.name === 'Home') icon = '🏠';
            else if (route.name === 'Notes') icon = '💌';
            else if (route.name === 'AiPhoto') icon = '✨';
            else if (route.name === 'Love') icon = '💕';
            else if (route.name === 'Gallery') icon = '📸';
            else if (route.name === 'Mood') icon = '😊';

            return (
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Text style={[styles.iconText, focused && styles.iconTextActive]}>{icon}</Text>
              </View>
            );
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ tabBarLabel: 'Home' }} 
        />
        <Tab.Screen 
          name="Notes" 
          component={NotesScreen} 
          options={{ tabBarLabel: 'Notes' }} 
        />
        <Tab.Screen 
          name="AiPhoto" 
          component={AiPhotoScreen} 
          options={{ tabBarLabel: 'AI Studio' }} 
        />
        <Tab.Screen 
          name="Love" 
          component={LoveScreen} 
          options={{ tabBarLabel: 'Hugs' }} 
        />
        <Tab.Screen 
          name="Gallery" 
          component={GalleryScreen} 
          options={{ tabBarLabel: 'Gallery' }} 
        />
        <Tab.Screen 
          name="Mood" 
          component={MoodScreen} 
          options={{ tabBarLabel: 'Mood' }} 
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 90 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 10,
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    shadowColor: '#2d0016',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  iconWrapper: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  iconWrapperActive: {
    backgroundColor: '#fff0f5',
  },
  iconText: {
    fontSize: 20,
  },
  iconTextActive: {
    fontSize: 22,
  },
});
