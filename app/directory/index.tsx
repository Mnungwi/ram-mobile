import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../src/core/services/api.service';
import {
  getLocalDirectoryUsers, saveDirectoryUsersToLocal,
  getLocalDirectoryClients, saveDirectoryClientsToLocal,
  getLocalDirectorySuppliers, saveDirectorySuppliersToLocal
} from '../../src/core/services/database.service';
import GlassCard from '../../src/components/GlassCard';
import CustomInput from '../../src/components/CustomInput';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

type ActiveTab = 'team' | 'clients' | 'suppliers';

export default function BusinessDirectoryScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<ActiveTab>('team');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  // Fetch Team Users
  const { data: teamUsers, isLoading: loadingTeam, refetch: refetchTeam } = useQuery({
    queryKey: ['directory-users'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/users');
        const users = res.data?.data?.users || res.data?.data || [];
        await saveDirectoryUsersToLocal(users);
        setIsOffline(false);
        return users;
      } catch (err) {
        setIsOffline(true);
        return await getLocalDirectoryUsers();
      }
    },
    enabled: activeTab === 'team'
  });

  // Fetch Clients
  const { data: clients, isLoading: loadingClients, refetch: refetchClients } = useQuery({
    queryKey: ['directory-clients'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/clients');
        const list = res.data?.data?.clients || res.data?.data || [];
        await saveDirectoryClientsToLocal(list);
        setIsOffline(false);
        return list;
      } catch (err) {
        setIsOffline(true);
        return await getLocalDirectoryClients();
      }
    },
    enabled: activeTab === 'clients'
  });

  // Fetch Suppliers
  const { data: suppliers, isLoading: loadingSuppliers, refetch: refetchSuppliers } = useQuery({
    queryKey: ['directory-suppliers'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/suppliers');
        const list = res.data?.data?.suppliers || res.data?.data || [];
        await saveDirectorySuppliersToLocal(list);
        setIsOffline(false);
        return list;
      } catch (err) {
        setIsOffline(true);
        return await getLocalDirectorySuppliers();
      }
    },
    enabled: activeTab === 'suppliers'
  });

  const isLoading = loadingTeam || loadingClients || loadingSuppliers;

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const getFilteredData = () => {
    const term = searchTerm.toLowerCase();
    switch (activeTab) {
      case 'team':
        return (teamUsers || []).filter((u: any) =>
          u.firstName?.toLowerCase().includes(term) ||
          u.lastName?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.phone?.toLowerCase().includes(term) ||
          u.jobTitle?.toLowerCase().includes(term)
        );
      case 'clients':
        return (clients || []).filter((c: any) =>
          c.name?.toLowerCase().includes(term) ||
          c.company?.toLowerCase().includes(term) ||
          c.contactPerson?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term)
        );
      case 'suppliers':
        return (suppliers || []).filter((s: any) =>
          s.name?.toLowerCase().includes(term) ||
          s.company?.toLowerCase().includes(term) ||
          s.contactPerson?.toLowerCase().includes(term) ||
          s.email?.toLowerCase().includes(term)
        );
      default:
        return [];
    }
  };

  const renderDirectoryItem = ({ item }: { item: any }) => {
    if (activeTab === 'team') {
      return (
        <GlassCard style={styles.directoryCard}>
          <View style={styles.cardHeader}>
            <View style={styles.textContainer}>
              <Text style={[styles.nameText, isDark ? styles.darkText : styles.lightText]}>
                {item.firstName} {item.lastName}
              </Text>
              <Text style={styles.metaText}>{item.jobTitle || 'Staff Member'} — {item.department || 'Operations'}</Text>
            </View>
            <View style={styles.actionButtons}>
              {item.phone && (
                <TouchableOpacity onPress={() => handleCall(item.phone)} style={styles.iconBtn}>
                  <MaterialCommunityIcons name="phone" size={18} color="#10b981" />
                </TouchableOpacity>
              )}
              {item.email && (
                <TouchableOpacity onPress={() => handleEmail(item.email)} style={styles.iconBtn}>
                  <MaterialCommunityIcons name="email" size={18} color="#1a56db" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </GlassCard>
      );
    }

    // Clients & Suppliers
    return (
      <GlassCard style={styles.directoryCard}>
        <View style={styles.cardHeader}>
          <View style={styles.textContainer}>
            <Text style={[styles.nameText, isDark ? styles.darkText : styles.lightText]}>{item.name}</Text>
            {item.company ? <Text style={styles.companyText}>{item.company}</Text> : null}
            <Text style={styles.metaText}>Contact: {item.contactPerson || '—'}</Text>
          </View>
          <View style={styles.actionButtons}>
            {item.phone && (
              <TouchableOpacity onPress={() => handleCall(item.phone)} style={styles.iconBtn}>
                <MaterialCommunityIcons name="phone" size={18} color="#10b981" />
              </TouchableOpacity>
            )}
            {item.email && (
              <TouchableOpacity onPress={() => handleEmail(item.email)} style={styles.iconBtn}>
                <MaterialCommunityIcons name="email" size={18} color="#1a56db" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </GlassCard>
    );
  };

  const handleRefresh = () => {
    if (activeTab === 'team') refetchTeam();
    else if (activeTab === 'clients') refetchClients();
    else if (activeTab === 'suppliers') refetchSuppliers();
  };

  return (
    <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
      <ScreenHeader title="Business Directory" isDark={isDark} />
      <View style={styles.container}>
      {/* Connection Mode Indicator */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="cloud-off-outline" size={16} color="#ffffff" />
          <Text style={styles.offlineText}>Offline Mode — Viewing cached contacts</Text>
        </View>
      )}

      {/* Segmented Controls / Top Tab Switcher */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          onPress={() => { setActiveTab('team'); setSearchTerm(''); }}
          style={[styles.segmentBtn, activeTab === 'team' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentText, activeTab === 'team' && styles.segmentTextActive]}>TEAM</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => { setActiveTab('clients'); setSearchTerm(''); }}
          style={[styles.segmentBtn, activeTab === 'clients' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentText, activeTab === 'clients' && styles.segmentTextActive]}>CLIENTS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setActiveTab('suppliers'); setSearchTerm(''); }}
          style={[styles.segmentBtn, activeTab === 'suppliers' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentText, activeTab === 'suppliers' && styles.segmentTextActive]}>SUPPLIERS</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <CustomInput
          label={`Search ${activeTab.toUpperCase()}`}
          placeholder={`Search name, email, or company...`}
          iconName="magnify"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1a56db" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={getFilteredData()}
          renderItem={renderDirectoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={isLoading}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="notebook-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>No contacts found in this folder.</Text>
            </View>
          }
        />
      )}
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
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(226, 232, 240, 0.6)',
    padding: 4,
    borderRadius: 8,
    marginBottom: 16
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  segmentBtnActive: {
    backgroundColor: '#1a56db'
  },
  segmentText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700'
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '800'
  },
  searchContainer: {
    marginBottom: 16
  },
  listContainer: {
    paddingBottom: 40
  },
  directoryCard: {
    marginBottom: 12
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  textContainer: {
    flex: 1,
    marginRight: 12
  },
  nameText: {
    fontSize: 15,
    fontWeight: '800'
  },
  companyText: {
    fontSize: 12,
    color: '#1a56db',
    fontWeight: '700',
    marginTop: 2
  },
  metaText: {
    color: '#64748b',
    fontSize: 11.5,
    marginTop: 4,
    fontWeight: '600'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8
  },
  iconBtn: {
    backgroundColor: 'rgba(241, 245, 249, 0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13.5,
    fontWeight: '500',
    marginTop: 12
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  }
});
