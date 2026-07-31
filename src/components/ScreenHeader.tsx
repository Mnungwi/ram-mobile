import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../core/theme/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  isDark?: boolean;
  showThemeToggle?: boolean;
  rightAction?: React.ReactNode;
}

export default function ScreenHeader({ title, onBack, isDark: isDarkProp, showThemeToggle = true, rightAction }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark: themeIsDark, toggleTheme } = useAppTheme();
  const isDark = isDarkProp ?? themeIsDark;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }, isDark ? styles.darkBg : styles.lightBg]}>
      <TouchableOpacity onPress={onBack || (() => router.back())} style={styles.backBtn}>
        <MaterialCommunityIcons name="arrow-left" size={22} color="#1a56db" />
      </TouchableOpacity>

      <Text style={[styles.title, isDark ? styles.darkText : styles.lightText]} numberOfLines={1}>
        {title}
      </Text>

      {rightAction}

      {showThemeToggle && (
        <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
          <MaterialCommunityIcons
            name={isDark ? 'weather-sunny' : 'weather-night'}
            size={20}
            color={isDark ? '#fbbf24' : '#64748b'}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 86, 219, 0.1)',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  lightBg: { backgroundColor: '#f8fafc' },
  darkBg: { backgroundColor: '#0f172a' },
  lightText: { color: '#0f172a' },
  darkText: { color: '#ffffff' },
});
