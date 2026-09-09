import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/core/store/store';
import { apiClient } from '../../src/core/services/api.service';
import { getLocalTechnicians, saveTechniciansToLocal, queueSyncAction } from '../../src/core/services/database.service';
import GlassCard from '../../src/components/GlassCard';
import CustomInput from '../../src/components/CustomInput';
import CustomButton from '../../src/components/CustomButton';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function TechniciansScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const { permissions } = useSelector((state: RootState) => state.auth);
  const hasPermission = (p: string) => permissions.length === 0 || permissions.includes(p);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState('NIDA');
  const [idNumber, setIdNumber] = useState('');
  const [catId, setCatId] = useState('');

  // Fetch Technicians
  const { data: technicians, isLoading, refetch } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/technicians');
        const techs = res.data?.data?.technicians || res.data?.data || [];
        await saveTechniciansToLocal(techs);
        setIsOffline(false);
        return techs;
      } catch (err) {
        setIsOffline(true);
        return await getLocalTechnicians();
      }
    }
  });

  // Fetch Categories
  const { data: categories } = useQuery({
    queryKey: ['technician-categories'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/technicians/categories');
        return res.data?.data?.categories || res.data?.data || [];
      } catch (err) {
        return [];
      }
    }
  });

  const handleCreateTechnician = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a name.');
      return;
    }

    const payload = {
      name,
      phone,
      idType,
      idNumber,
      categoryId: catId || null
    };

    try {
      if (isOffline) {
        await queueSyncAction('POST', '/technicians', payload);
        Alert.alert('Offline Mode', 'Technician saved locally. It will sync automatically when online.');
      } else {
        await apiClient.post('/technicians', payload);
        Alert.alert('Success', 'Technician added successfully.');
      }

      setName('');
      setPhone('');
      setIdNumber('');
      setCatId('');
      setShowAddModal(false);
      refetch();
    } catch (err) {
      Alert.alert('Error', 'Failed to add technician.');
    }
  };

  const filteredTechs = (technicians || []).filter((t: any) => {
    const matchesSearch =
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.idNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCat = selectedCatId ? t.categoryId === selectedCatId : true;

    return matchesSearch && matchesCat;
  });

  const getCategoryName = (cId: string) => {
    if (!categories) return 'General';
    const found = categories.find((c: any) => c.id === cId);
    return found ? found.name : 'General';
  };

  const renderTechItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/technicians/[id]', params: { id: item.id } })}
    >
      <GlassCard style={styles.techCard}>
        <View style={styles.cardHeader}>
          <Text style={[styles.techName, isDark ? styles.darkText : styles.lightText]}>{item.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{getCategoryName(item.categoryId)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="phone" size={16} color="#64748b" />
          <Text style={styles.infoValue}>{item.phone || 'No phone'}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="card-account-details-outline" size={16} color="#64748b" />
          <Text style={styles.infoValue}>{item.idType || 'ID'}: {item.idNumber || '—'}</Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
      <ScreenHeader title="Staff & Technicians" isDark={isDark} />
      <View style={styles.container}>
      {/* Connection Mode Indicator */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="cloud-off-outline" size={16} color="#ffffff" />
          <Text style={styles.offlineText}>Offline Mode — Viewing cached profiles</Text>
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <CustomInput
          label="Search Staff"
          placeholder="Search name, phone, or ID..."
          iconName="magnify"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Categories Filter Horizonal Row */}
      {categories && categories.length > 0 && (
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              onPress={() => setSelectedCatId('')}
              style={[styles.filterChip, !selectedCatId && styles.activeChip]}
            >
              <Text style={[styles.chipText, !selectedCatId && styles.activeChipText]}>ALL</Text>
            </TouchableOpacity>
            {categories.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedCatId(selectedCatId === c.id ? '' : c.id)}
                style={[styles.filterChip, selectedCatId === c.id && styles.activeChip]}
              >
                <Text style={[styles.chipText, selectedCatId === c.id && styles.activeChipText]}>
                  {c.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#1a56db" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredTechs}
          renderItem={renderTechItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>No technicians found matching criteria.</Text>
            </View>
          }
        />
      )}

      {/* Floating Add Button — only for users who can actually create technicians */}
      {hasPermission('technician:create') && (
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.fab}>
          <MaterialCommunityIcons name="account-plus" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Register Technician</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
              <CustomInput
                label="Full Name *"
                placeholder="e.g. Haji Ame"
                value={name}
                onChangeText={setName}
                iconName="account"
              />

              <CustomInput
                label="Phone Number"
                placeholder="e.g. +255 777 123 456"
                value={phone}
                onChangeText={setPhone}
                iconName="phone"
                keyboardType="phone-pad"
              />

              <CustomInput
                label="ID Document Number"
                placeholder="e.g. NIDA Identification code"
                value={idNumber}
                onChangeText={setIdNumber}
                iconName="card-account-details-outline"
              />

              {/* Simple Category Selector */}
              {categories && categories.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.selectLabel, isDark ? styles.darkText : styles.lightText]}>Select Specialty Trade</Text>
                  <View style={styles.selectRow}>
                    {categories.map((c: any) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setCatId(c.id)}
                        style={[styles.selectChip, catId === c.id && styles.selectChipActive]}
                      >
                        <Text style={[styles.selectChipText, catId === c.id && styles.selectChipTextActive]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <CustomButton
                  title="CANCEL"
                  variant="outline"
                  onPress={() => setShowAddModal(false)}
                  style={{ flex: 1 }}
                />
                <CustomButton
                  title="SAVE STAFF"
                  onPress={handleCreateTechnician}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </GlassCard>
        </View>
      </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
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
  offlineBanner: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  searchContainer: {
    marginBottom: 8
  },
  filterSection: {
    marginBottom: 16
  },
  filterScroll: {
    gap: 8,
    paddingRight: 16
  },
  filterChip: {
    backgroundColor: 'rgba(226, 232, 240, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50
  },
  activeChip: {
    backgroundColor: '#1a56db'
  },
  chipText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700'
  },
  activeChipText: {
    color: '#ffffff'
  },
  listContainer: {
    paddingBottom: 80
  },
  techCard: {
    marginBottom: 12
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  techName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  categoryBadgeText: {
    color: '#1d4ed8',
    fontSize: 10,
    fontWeight: '800'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8
  },
  infoValue: {
    color: '#64748b',
    fontSize: 12.5,
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13.5,
    fontWeight: '500',
    marginTop: 12
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#1a56db',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#1a56db',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    maxHeight: '90%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16
  },
  modalForm: {
    width: '100%'
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  selectChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  selectChipActive: {
    backgroundColor: 'rgba(26, 86, 219, 0.1)',
    borderWidth: 1,
    borderColor: '#1a56db'
  },
  selectChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600'
  },
  selectChipTextActive: {
    color: '#1a56db',
    fontWeight: '700'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 12
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  }
});
