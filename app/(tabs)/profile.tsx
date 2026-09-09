import React, { useState } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert, ScrollView, Modal, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { clearCredentials, setBiometricsEnabled, updateProfile, setThemeColor } from '../../src/core/store/auth.slice';
import { apiClient, resolveMediaUrl } from '../../src/core/services/api.service';
import { useAppTheme } from '../../src/core/theme/ThemeContext';
import { resolveAccentColor } from '../../src/core/theme/companyTheme';
import GlassCard from '../../src/components/GlassCard';
import CustomInput from '../../src/components/CustomInput';
import CustomButton from '../../src/components/CustomButton';

export default function ProfileScreen() {
  const { user, biometricsEnabled, themeColor, companyTheme } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const { isDark, toggleTheme } = useAppTheme();

  // Modal toggles
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Company color by default; user can still pick a personal preset below.
  const activeColor = resolveAccentColor(themeColor, companyTheme);

  const name = user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.email || 'Unknown User');
  const email = user?.email || '—';
  const roleName = user?.roles?.[0]?.name || user?.jobTitle || 'Team Member';
  const department = user?.department || user?.jobTitle || '—';
  const avatarUrl = resolveMediaUrl(user?.avatar) || user?.avatarUrl;

  const handleToggleBiometrics = async (value: boolean) => {
    try {
      if (value) {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) {
          Alert.alert('Setup Error', 'Cannot enable biometrics without active login session. Please log in again.');
          return;
        }
        dispatch(setBiometricsEnabled(true));
        Alert.alert('Biometrics Enabled', 'You can now log in securely using FaceID/Fingerprint next time.');
      } else {
        dispatch(setBiometricsEnabled(false));
      }
    } catch (e) {
      Alert.alert('Configuration Error', 'Unable to toggle biometrics setting.');
    }
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to update your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const filename = asset.fileName || asset.uri.split('/').pop() || `avatar-${Date.now()}.jpg`;
    const ext = filename.split('.').pop()?.toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', { uri: asset.uri, name: filename, type } as any);

      const res = await apiClient.put('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedUser = res.data?.data?.user;
      if (updatedUser) {
        dispatch(updateProfile(updatedUser));
        await SecureStore.setItemAsync('userProfile', JSON.stringify({ ...user, ...updatedUser }));
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters.');
      return;
    }

    try {
      await apiClient.put('/auth/me/password', {
        currentPassword,
        newPassword
      });
      Alert.alert('Success', 'Password updated successfully.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      dispatch(updateProfile({ mustChangePassword: false }));
    } catch (err) {
      Alert.alert('Error', 'Failed to change password. Please check your current password.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Secure Logout',
      'Are you sure you want to end your current mobile session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'LOGOUT',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('authToken');
              await SecureStore.deleteItemAsync('refreshToken');
              await SecureStore.deleteItemAsync('userProfile');
              dispatch(clearCredentials());
              router.replace('/login');
            } catch (e) {
              Alert.alert('Error', 'Failed to securely log out.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      
      {/* First Time Login Alert Banner — only when the backend actually flags this account */}
      {user?.mustChangePassword && (
        <GlassCard style={[styles.firstTimeBanner, { borderColor: '#ef4444' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialCommunityIcons name="shield-alert" size={24} color="#ef4444" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.firstTimeTitle, { color: '#ef4444' }]}>Security Check Required</Text>
              <Text style={styles.firstTimeDesc}>You must set a new password before continuing to use the app.</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowPasswordModal(true)} style={[styles.changePassBtn, { backgroundColor: '#ef4444' }]}>
            <Text style={styles.changePassBtnText}>Change Password Now</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {/* Profile Header Avatar */}
      <View style={styles.avatarCard}>
        <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper} disabled={uploadingAvatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.profileImg} />
          ) : (
            <View style={[styles.avatarCircle, { backgroundColor: activeColor }]}>
              <Text style={styles.avatarInitials}>
                {user?.firstName?.[0]?.toUpperCase() || 'U'}
                {user?.lastName?.[0]?.toUpperCase() || 'R'}
              </Text>
            </View>
          )}
          <View style={styles.cameraOverlay}>
            <MaterialCommunityIcons name={uploadingAvatar ? 'loading' : 'camera'} size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.userName, isDark ? styles.darkText : styles.lightText]}>{name}</Text>
        <Text style={styles.userEmail}>{email}</Text>
      </View>

      {/* Account Info Details */}
      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Account Information</Text>
      <GlassCard style={styles.settingsCard}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="badge-account-outline" size={20} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Organization Role</Text>
            <Text style={[styles.infoVal, isDark ? styles.darkText : styles.lightText]}>
              {roleName}
            </Text>
          </View>
        </View>

        <View style={[styles.infoRow, styles.borderTop]}>
          <MaterialCommunityIcons name="domain" size={20} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={[styles.infoVal, isDark ? styles.darkText : styles.lightText]}>
              {department}
            </Text>
          </View>
        </View>

        {user?.phone && (
          <View style={[styles.infoRow, styles.borderTop]}>
            <MaterialCommunityIcons name="phone-outline" size={20} color="#64748b" />
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={[styles.infoVal, isDark ? styles.darkText : styles.lightText]}>
                {user.phone}
              </Text>
            </View>
          </View>
        )}
      </GlassCard>

      {/* Theme Customizer Accent Color */}
      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Theme Customization</Text>
      <GlassCard style={styles.settingsCard}>
        <Text style={[styles.themeLabel, isDark ? styles.darkText : styles.lightText]}>Select App Accent Color</Text>
        <View style={styles.themeSelectorRow}>
          <TouchableOpacity onPress={() => dispatch(setThemeColor('company'))} style={[styles.themeChip, themeColor === 'company' && styles.themeChipActive, { borderColor: companyTheme?.primary || '#1a56db' }]}>
            <View style={[styles.themeDot, { backgroundColor: companyTheme?.primary || '#1a56db' }]} />
            <Text style={styles.themeChipText}>Company Default</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => dispatch(setThemeColor('blue'))} style={[styles.themeChip, themeColor === 'blue' && styles.themeChipActive, { borderColor: '#1a56db' }]}>
            <View style={[styles.themeDot, { backgroundColor: '#1a56db' }]} />
            <Text style={styles.themeChipText}>Ocean Blue</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => dispatch(setThemeColor('green'))} style={[styles.themeChip, themeColor === 'green' && styles.themeChipActive, { borderColor: '#10b981' }]}>
            <View style={[styles.themeDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.themeChipText}>Forest Green</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => dispatch(setThemeColor('purple'))} style={[styles.themeChip, themeColor === 'purple' && styles.themeChipActive, { borderColor: '#7c3aed' }]}>
            <View style={[styles.themeDot, { backgroundColor: '#7c3aed' }]} />
            <Text style={styles.themeChipText}>Sunset Purple</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => dispatch(setThemeColor('orange'))} style={[styles.themeChip, themeColor === 'orange' && styles.themeChipActive, { borderColor: '#f59e0b' }]}>
            <View style={[styles.themeDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.themeChipText}>Crimson Gold</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>

      {/* Security Options */}
      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Security Settings</Text>
      <GlassCard style={styles.settingsCard}>
        <View style={styles.switchRow}>
          <View style={styles.switchCol}>
            <MaterialCommunityIcons name={isDark ? 'weather-night' : 'weather-sunny'} size={22} color={activeColor} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.switchLabel, isDark ? styles.darkText : styles.lightText]}>Dark Mode</Text>
              <Text style={styles.switchSub}>Override the device theme</Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={isDark ? activeColor : '#f4f3f4'}
          />
        </View>

        <View style={[styles.switchRow, styles.borderTop]}>
          <View style={styles.switchCol}>
            <MaterialCommunityIcons name="fingerprint" size={22} color={activeColor} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.switchLabel, isDark ? styles.darkText : styles.lightText]}>Biometric Login</Text>
              <Text style={styles.switchSub}>Use FaceID or Fingerprint</Text>
            </View>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={handleToggleBiometrics}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={biometricsEnabled ? activeColor : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity onPress={() => setShowPasswordModal(true)} style={[styles.switchRow, styles.borderTop]}>
          <View style={styles.switchCol}>
            <MaterialCommunityIcons name="lock-reset" size={22} color="#ef4444" />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.switchLabel, isDark ? styles.darkText : styles.lightText]}>Change Password</Text>
              <Text style={styles.switchSub}>Update credentials securely</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="#64748b" />
        </TouchableOpacity>
      </GlassCard>

      {/* Logout Button */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <MaterialCommunityIcons name="logout" size={20} color="#fff" />
        <Text style={styles.logoutText}>SECURE LOGOUT</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Change Account Password</Text>
            <CustomInput label="Current Password" placeholder="••••••••" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
            <CustomInput label="New Password" placeholder="••••••••" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            <CustomInput label="Confirm New Password" placeholder="••••••••" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
            <View style={styles.modalActions}>
              <CustomButton title="CANCEL" variant="outline" onPress={() => setShowPasswordModal(false)} style={{ flex: 1 }} />
              <CustomButton title="UPDATE" onPress={handleChangePassword} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  lightBg: {
    backgroundColor: '#f8fafc'
  },
  darkBg: {
    backgroundColor: '#0f172a'
  },
  firstTimeBanner: {
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.05)'
  },
  firstTimeTitle: {
    fontSize: 13,
    fontWeight: '800'
  },
  firstTimeDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600'
  },
  changePassBtn: {
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10
  },
  changePassBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  avatarCard: {
    alignItems: 'center',
    marginVertical: 20
  },
  avatarWrapper: {
    position: 'relative'
  },
  profileImg: {
    width: 90,
    height: 90,
    borderRadius: 45
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800'
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1e293b',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12
  },
  userEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 16
  },
  settingsCard: {
    marginBottom: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  infoCol: {
    marginLeft: 12
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.4)',
    marginTop: 8,
    paddingTop: 12
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  switchCol: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  switchLabel: {
    fontSize: 13.5,
    fontWeight: '700'
  },
  switchSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600'
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10
  },
  themeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6
  },
  themeChipActive: {
    backgroundColor: 'rgba(241, 245, 249, 0.4)',
    borderWidth: 2
  },
  themeDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  themeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16
  },
  modalCard: {
    width: '100%'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  presetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  }
});
