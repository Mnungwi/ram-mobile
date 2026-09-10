import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ImageBackground, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient, getCustomBaseUrl, setCustomBaseUrl } from '../../src/core/services/api.service';
import { setCredentials, setBiometricsEnabled } from '../../src/core/store/auth.slice';
import CustomInput from '../../src/components/CustomInput';
import CustomButton from '../../src/components/CustomButton';
import GlassCard from '../../src/components/GlassCard';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function LoginScreen() {
  const { companyTheme } = useSelector((state: any) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // OTP verification step
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpInfo, setOtpInfo] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const router = useRouter();
  const dispatch = useDispatch();
  const { isDark } = useAppTheme();

  useEffect(() => {
    const checkBiometrics = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(compatible && enrolled);

      // Pre-fill email if remember me was active
      const savedEmail = await SecureStore.getItemAsync('savedEmail');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }

      // Load saved custom server url
      const savedUrl = await getCustomBaseUrl();
      setServerUrl(savedUrl);
    };
    checkBiometrics();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSaveServer = async () => {
    try {
      const savedUrl = await setCustomBaseUrl(serverUrl);
      Alert.alert('Server Configured', `API Base URL set to: ${savedUrl}`);
      setShowServerConfig(false);
    } catch (e) {
      Alert.alert('Error', 'Invalid server URL format.');
    }
  };

  const completeLogin = async (data: any) => {
    const { user, permissions, accessToken, refreshToken } = data;
    const finalToken = accessToken || data?.token;

    if (!finalToken) {
      throw new Error('Authentication token not returned from server');
    }

    // Save tokens securely
    await SecureStore.setItemAsync('authToken', finalToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('userProfile', JSON.stringify(user));

    if (rememberMe) {
      await SecureStore.setItemAsync('savedEmail', email);
    } else {
      await SecureStore.deleteItemAsync('savedEmail');
    }

    // Update Redux state
    dispatch(setCredentials({ user, token: finalToken, refreshToken, rememberMe, permissions }));

    if (user?.mustChangePassword) {
      router.replace('/(auth)/force-change-password');
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const data = response.data?.data || response.data;

      if (data?.requiresOtp) {
        setLoading(false);
        setOtpStep(true);
        setOtpError(
          !data.emailSent && !data.smsSent
            ? 'The verification code could not be sent by email or SMS — contact an administrator.'
            : ''
        );
        setOtpInfo(response.data?.message || 'A verification code has been sent to you.');
        setResendCooldown(60);
        return;
      }

      await completeLogin(data);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      const errMsg = err.response?.data?.message || 'Invalid credentials or server offline.';
      Alert.alert('Login Failed', errMsg);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const response = await apiClient.post('/auth/verify-otp', { email, otp });
      const data = response.data?.data || response.data;
      await completeLogin(data);
      setOtpLoading(false);
    } catch (err: any) {
      setOtpLoading(false);
      setOtpError(err.response?.data?.message || 'Incorrect verification code.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      const r = await apiClient.post('/auth/resend-otp', { email });
      setOtpInfo(r.data?.message || 'A new verification code has been sent.');
      setResendCooldown(60);
    } catch {
      // silent — user can retry
    }
  };

  const handleBackToLogin = () => {
    setOtpStep(false);
    setOtp('');
    setOtpError('');
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      Alert.alert(
        'Check Your Email',
        'If that email is registered, a password reset link has been sent. Open it from your device to set a new password.',
      );
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate with FaceID / Fingerprint',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false
      });

      if (result.success) {
        // Retrieve saved user credentials
        const token = await SecureStore.getItemAsync('authToken');
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const userStr = await SecureStore.getItemAsync('userProfile');

        if (token && refreshToken && userStr) {
          const user = JSON.parse(userStr);
          dispatch(setCredentials({ user, token, refreshToken, rememberMe: true }));
          dispatch(setBiometricsEnabled(true));
          router.replace(user?.mustChangePassword ? '/(auth)/force-change-password' : '/(tabs)');
        } else {
          Alert.alert('Biometrics Setup Required', 'Please log in with password once to set up biometrics.');
        }
      }
    } catch (err) {
      Alert.alert('Authentication Error', 'Biometric scanner failed.');
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1080&q=80' }}
      style={styles.backgroundImage}
    >
      <View style={styles.overlay} />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Image
            source={companyTheme?.logoUrl ? { uri: companyTheme.logoUrl } : require('../../assets/logo.png')}
            style={styles.logoImage}
          />
          <Text style={styles.logoText}>RAM PROJECTS</Text>
          <Text style={styles.subtext}>Elite Infrastructure Solutions</Text>
        </View>

        <GlassCard style={styles.card}>
          {otpStep ? (
            <>
              <Text style={[styles.loginHeader, isDark ? styles.darkText : styles.lightText]}>
                Verify It's You
              </Text>
              <Text style={styles.subLabel}>Enter the 6-digit verification code for {email}</Text>

              {!!otpInfo && !otpError && <Text style={styles.subLabel}>{otpInfo}</Text>}
              {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}

              <CustomInput
                label="Verification Code"
                iconName="shield-key-outline"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                placeholder="••••••"
              />

              <CustomButton
                title="VERIFY & SIGN IN"
                onPress={handleVerifyOtp}
                loading={otpLoading}
              />

              <View style={styles.rememberRow}>
                <TouchableOpacity onPress={handleBackToLogin}>
                  <Text style={styles.forgotText}>Back to login</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResendOtp} disabled={resendCooldown > 0}>
                  <Text style={[styles.forgotText, resendCooldown > 0 && { opacity: 0.5 }]}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.loginHeader, isDark ? styles.darkText : styles.lightText]}>
                Portal Login
              </Text>

              <CustomInput
                label="Email Address"
                iconName="email-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                placeholder="name@ram.co.tz"
              />

              <CustomInput
                label="Password"
                iconName="lock-outline"
                isPassword
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
              />

              <View style={styles.rememberRow}>
                <TouchableOpacity
                  onPress={() => setRememberMe(!rememberMe)}
                  style={styles.checkboxContainer}
                >
                  <MaterialCommunityIcons
                    name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={rememberMe ? '#1a56db' : '#64748b'}
                  />
                  <Text style={styles.rememberText}>Remember Me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setForgotEmail(email); setShowForgotPassword(!showForgotPassword); }}>
                  <Text style={styles.forgotText}>Forgot?</Text>
                </TouchableOpacity>
              </View>

              {showForgotPassword && (
                <View style={styles.serverConfigContainer}>
                  <CustomInput
                    label="Your Account Email"
                    iconName="email-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    placeholder="name@ram.co.tz"
                  />
                  <CustomButton
                    title="SEND RESET LINK"
                    variant="outline"
                    onPress={handleForgotPassword}
                    loading={forgotLoading}
                    style={styles.saveServerBtn}
                  />
                </View>
              )}

              <CustomButton
                title="SECURE LOGIN"
                onPress={handleLogin}
                loading={loading}
              />

              {isBiometricSupported && (
                <TouchableOpacity onPress={handleBiometricLogin} style={styles.biometricBtn}>
                  <MaterialCommunityIcons name="fingerprint" size={32} color="#1a56db" />
                  <Text style={styles.biometricLabel}>Login with Biometrics</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setShowServerConfig(!showServerConfig)}
                style={styles.toggleConfig}
              >
                <MaterialCommunityIcons name="cog" size={16} color="#64748b" />
                <Text style={styles.toggleConfigText}>
                  {showServerConfig ? 'Hide Server Settings' : 'Configure Server IP'}
                </Text>
              </TouchableOpacity>

              {showServerConfig && (
                <View style={styles.serverConfigContainer}>
                  <CustomInput
                    label="API Base URL (IP:Port)"
                    placeholder="e.g. 192.168.1.15:3000"
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    iconName="server"
                  />
                  <CustomButton
                    title="SAVE CONNECTION IP"
                    variant="outline"
                    onPress={handleSaveServer}
                    style={styles.saveServerBtn}
                  />
                </View>
              )}
            </>
          )}
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
  logoImage: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    textAlign: 'center'
  },
  subtext: {
    fontSize: 11,
    color: '#94a3b8',
    letterSpacing: 1,
    marginTop: 6,
    textTransform: 'uppercase',
    textAlign: 'center'
  },
  card: {
    marginHorizontal: 4
  },
  loginHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rememberText: {
    color: '#475569',
    fontSize: 13,
    marginLeft: 6
  },
  forgotText: {
    color: '#1a56db',
    fontSize: 13,
    fontWeight: '600'
  },
  subLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 16,
    marginTop: -12
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8
  },
  biometricLabel: {
    color: '#1a56db',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600'
  },
  toggleConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6
  },
  toggleConfigText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  serverConfigContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12
  },
  saveServerBtn: {
    height: 38,
    marginTop: -4
  }
});
