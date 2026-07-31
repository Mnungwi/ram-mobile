import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CustomButton from './CustomButton';
import { useAppTheme } from '../core/theme/ThemeContext';

interface DatePickerInputProps {
  label: string;
  value: string; // 'YYYY-MM-DD'
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

const toDateString = (d: Date) => d.toISOString().split('T')[0];

const formatDisplay = (value: string) => {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [draft, setDraft] = useState<Date>(value ? new Date(`${value}T00:00:00`) : new Date());
  const { isDark } = useAppTheme();

  const openPicker = () => {
    setDraft(value ? new Date(`${value}T00:00:00`) : new Date());
    setShowPicker(true);
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onChange(toDateString(selectedDate));
      }
      return;
    }
    if (selectedDate) setDraft(selectedDate);
  };

  const confirmIosDate = () => {
    onChange(toDateString(draft));
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, isDark ? styles.darkLabel : styles.lightLabel]}>{label}</Text>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={openPicker}
        style={[styles.field, isDark ? styles.darkField : styles.lightField]}
      >
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#1a56db" style={styles.icon} />
        <Text style={[styles.valueText, { color: value ? (isDark ? '#ffffff' : '#0f172a') : '#94a3b8' }]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
      </TouchableOpacity>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.iosOverlay}>
            <View style={[styles.iosSheet, isDark ? styles.darkField : styles.lightField]}>
              <View style={styles.iosSheetHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.iosTitle, isDark ? styles.darkLabel : styles.lightLabel]}>{label}</Text>
                <View style={{ width: 50 }} />
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={{ alignSelf: 'center' }}
              />
              <CustomButton title="DONE" onPress={confirmIosDate} style={{ marginTop: 8 }} />
            </View>
          </View>
        </Modal>
      )}
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
  lightLabel: {
    color: '#475569'
  },
  darkLabel: {
    color: '#94a3b8'
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12
  },
  lightField: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1'
  },
  darkField: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  icon: {
    marginRight: 8
  },
  valueText: {
    flex: 1,
    fontSize: 14
  },
  iosOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.5)'
  },
  iosSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32
  },
  iosSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  iosCancel: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    width: 50
  },
  iosTitle: {
    fontSize: 14,
    fontWeight: '700'
  }
});

export default DatePickerInput;
