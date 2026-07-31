import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { useAppTheme } from '../core/theme/ThemeContext';

interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  data?: any;
}

interface SearchableDropdownProps {
  label: string;
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  style?: any;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = 'Select an option...',
  error,
  disabled = false,
  style
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const { isDark } = useAppTheme();

  const selectedOption = options.find(o => o.value === selectedValue);

  const filteredOptions = options.filter(o => {
    const text = searchText.toLowerCase();
    return (
      (o.label || '').toLowerCase().includes(text) ||
      (o.sublabel || '').toLowerCase().includes(text)
    );
  });

  const handleSelect = (value: string) => {
    onSelect(value);
    setSearchText('');
    setModalVisible(false);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, isDark ? styles.darkText : styles.lightText]}>
        {label}
      </Text>

      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.7}
        onPress={() => {
          if (!disabled) setModalVisible(true);
        }}
        style={[
          styles.selectorContainer,
          isDark ? styles.darkBorder : styles.lightBorder,
          disabled && styles.disabledSelector,
          error ? styles.errorBorder : null
        ]}
      >
        <Text
          style={[
            styles.selectedValueText,
            { color: disabled ? '#94a3b8' : selectedOption ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#64748b' : '#94a3b8') }
          ]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={disabled ? '#94a3b8' : isDark ? '#94a3b8' : '#64748b'}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* DROPDOWN MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>
                {label}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setSearchText(''); }}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* SEARCH INPUT */}
            <View
              style={[
                styles.searchContainer,
                { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc' },
                isDark ? styles.darkBorder : styles.lightBorder
              ]}
            >
              <MaterialCommunityIcons name="magnify" size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                placeholder="Search..."
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                value={searchText}
                onChangeText={setSearchText}
                style={[styles.searchInput, { color: isDark ? '#ffffff' : '#0f172a' }]}
                autoCapitalize="none"
              />
            </View>

            {/* OPTIONS LIST */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              style={{ maxHeight: SCREEN_HEIGHT * 0.4 }}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item.value)}
                    style={[
                      styles.optionItem,
                      isSelected && { backgroundColor: isDark ? 'rgba(26, 86, 219, 0.2)' : 'rgba(26, 86, 219, 0.08)' }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, isDark ? styles.darkText : styles.lightText, isSelected && styles.selectedOptionText]}>
                        {item.label}
                      </Text>
                      {item.sublabel ? (
                        <Text style={styles.optionSublabel}>{item.sublabel}</Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={20} color="#1a56db" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No results found</Text>
                </View>
              }
            />
          </GlassCard>
        </View>
      </Modal>
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
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.02)'
  },
  disabledSelector: {
    backgroundColor: 'rgba(226, 232, 240, 0.5)',
    borderColor: '#e2e8f0'
  },
  lightBorder: {
    borderColor: '#cbd5e1'
  },
  darkBorder: {
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  errorBorder: {
    borderColor: '#ef4444'
  },
  selectedValueText: {
    fontSize: 14,
    flex: 1
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  modalCard: {
    width: '100%',
    padding: 16
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.2)',
    paddingBottom: 10
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 10,
    marginBottom: 12
  },
  searchIcon: {
    marginRight: 6
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.1)',
    borderRadius: 6
  },
  optionLabel: {
    fontSize: 14
  },
  optionSublabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  selectedOptionText: {
    fontWeight: '700',
    color: '#1a56db'
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14
  }
});

export default SearchableDropdown;
