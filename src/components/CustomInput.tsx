import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../core/theme/ThemeContext';

interface CustomInputProps extends TextInputProps {
  label: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  error?: string;
  isPassword?: boolean;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  label,
  iconName,
  error,
  isPassword = false,
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isDark } = useAppTheme();

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isDark ? styles.darkText : styles.lightText]}>
        {label}
      </Text>
      
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: isFocused ? (isDark ? '#1e293b' : '#ffffff') : (isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc') },
          isDark ? styles.darkInput : styles.lightInput,
          isFocused && styles.focusedInput,
          error ? styles.errorInput : null
        ]}
      >
        {iconName && (
          <MaterialCommunityIcons
            name={iconName}
            size={20}
            color={error ? '#ef4444' : isFocused ? '#1a56db' : '#64748b'}
            style={styles.icon}
          />
        )}
        
        <TextInput
          secureTextEntry={isPassword && !showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
          style={[
            styles.input,
            { color: isDark ? '#ffffff' : '#0f172a' },
            style
          ]}
          {...props}
        />
        
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%'
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2
  },
  lightText: {
    color: '#475569'
  },
  darkText: {
    color: '#94a3b8'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12
  },
  lightInput: {
    borderColor: '#cbd5e1'
  },
  darkInput: {
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  focusedInput: {
    borderColor: '#1a56db',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2
  },
  errorInput: {
    borderColor: '#ef4444'
  },
  icon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14
  },
  passwordToggle: {
    padding: 4
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500'
  }
});
export default CustomInput;
