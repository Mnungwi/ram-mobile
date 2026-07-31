import React, { useState } from 'react';
import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../../src/core/services/api.service';
import { clearCredentials, clearMustChangePassword } from '../../src/core/store/auth.slice';
import CustomInput from '../../src/components/CustomInput';
import CustomButton from '../../src/components/CustomButton';
import GlassCard from '../../src/components/GlassCard';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function ForceChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const dispatch = useDispatch();
  const { isDark } = useAppTheme();

  const canSubmit = !!currentPassword && newPassword.length >= 8 && newPassword === confirmPassword;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await apiClient.put('/auth/me/password', { currentPassword, newPassword });
      dispatch(clearMustChangePassword());

      const userStr = await SecureStore.getItemAsync('userProfile');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.mustChangePassword = false;
        await SecureStore.setItemAsync('userProfile', JSON.stringify(user));
      }

      Alert.alert('Password Updated', 'Your password has been changed successfully.', [
        { text: 'Continue', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('userProfile');
    dispatch(clearCredentials());
    router.replace('/login');
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1080&q=80' }}
      style={styles.backgroundImage}
    >
      <View style={styles.overlay} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logoText}>UNITED RAM</Text>
          <Text style={styles.subtext}>Elite Infrastructure Solutions</Text>
        </View>

        <GlassCard style={styles.card}>
          <Text style={[styles.loginHeader, isDark ? styles.darkText : styles.lightText]}>
            Set a New Password
          </Text>
          <Text style={styles.subLabel}>
            For your security, you must set a new password before continuing.
          </Text>

          <CustomInput
            label="Current / Temporary Password"
            iconName="lock-outline"
            isPassword
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
          />
          <CustomInput
            label="New Password"
            iconName="lock-plus-outline"
            isPassword
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Min 8 characters"
          />
          <CustomInput
            label="Confirm New Password"
            iconName="lock-check-outline"
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
          />
          {!!confirmPassword && confirmPassword !== newPassword && (
            <Text style={styles.errorText}>Passwords do not match</Text>
          )}

          <CustomButton
            title="SET NEW PASSWORD"
            onPress={handleSubmit}
            loading={loading}
          />

          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Not you? Sign out</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center'
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.75)'
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24
  },
  header: {
    alignItems: 'center',
    marginBottom: 36
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2
  },
  subtext: {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase'
  },
  card: {
    marginHorizontal: 4
  },
  loginHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5
  },
  subLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 20
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -12,
    marginBottom: 12
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  },
  signOutBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8
  },
  signOutText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  }
});
