import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { useAppTheme } from '../core/theme/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 'glass' (default): translucent frosted look, for content cards over a page background.
   *  'solid': opaque card with a crisp accent top-border, for modal sheets over a dim overlay. */
  variant?: 'glass' | 'solid';
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, variant = 'glass' }) => {
  const { isDark } = useAppTheme();

  const variantStyle = variant === 'solid'
    ? (isDark ? styles.darkSolidCard : styles.lightSolidCard)
    : (isDark ? styles.darkCard : styles.lightCard);

  return (
    <View
      style={[
        styles.card,
        variantStyle,
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3
  },
  lightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000'
  },
  darkCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000'
  },
  lightSolidCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eef2f7',
    borderTopWidth: 4,
    borderTopColor: '#1a56db',
    borderRadius: 20,
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10
  },
  darkSolidCard: {
    backgroundColor: '#182338',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 4,
    borderTopColor: '#3b82f6',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10
  }
});
export default GlassCard;
