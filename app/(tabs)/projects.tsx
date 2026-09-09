import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '../../src/core/store/store';
import { apiClient } from '../../src/core/services/api.service';
import { getLocalProjects, saveProjectsToLocal, queueSyncAction } from '../../src/core/services/database.service';
import GlassCard from '../../src/components/GlassCard';
import CustomInput from '../../src/components/CustomInput';
import CustomButton from '../../src/components/CustomButton';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function ProjectsScreen() {
  const router = useRouter();
  const { permissions } = useSelector((state: RootState) => state.auth);
  // Same "not loaded yet -> show it" fallback used for tab visibility in
  // app/(tabs)/_layout.tsx, so a fresh app open doesn't flash then hide it.
  const hasPermission = (p: string) => permissions.length === 0 || permissions.includes(p);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newBudget, setNewBudget] = useState('');

  const { isDark } = useAppTheme();

  // React Query fetch
  const { data: projects, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/projects');
        const list = response.data?.data || response.data || [];
        await saveProjectsToLocal(list); // Cache locally
        setIsOffline(false);
        return list;
      } catch (err) {
        // Network error - load from SQLite database
        setIsOffline(true);
        const cached = await getLocalProjects();
        return cached;
      }
    }
  });

  const getFilteredProjects = () => {
    if (!projects) return [];
    return projects.filter((p: any) => {
      const matchSearch =
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !statusFilter || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  };

  const handleAddProject = async () => {
    if (!newName || !newCode || !newLocation) {
      Alert.alert('Required Fields', 'Please fill name, code and location.');
      return;
    }

    const newProj = {
      id: Math.random().toString(36).substring(2, 9), // Temporary offline ID
      name: newName,
      projectCode: newCode,
      location: newLocation,
      totalBudget: parseFloat(newBudget) || 0,
      progress: 0,
      status: 'Active'
    };

    try {
      if (isOffline) {
        // Queue mutation & write to SQLite locally
        await queueSyncAction('POST', '/projects', newProj);
        Alert.alert('Offline Mode', 'Project added locally. It will sync automatically when network is active.');
      } else {
        await apiClient.post('/projects', newProj);
        Alert.alert('Success', 'Project created successfully on server.');
      }
      
      // Reset inputs
      setNewName('');
      setNewCode('');
      setNewLocation('');
      setNewBudget('');
      setShowAddModal(false);
      refetch();
    } catch (err) {
      Alert.alert('Error', 'Failed to add project.');
    }
  };

  const renderProjectItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/projects/[id]', params: { id: item.id } })}
    >
      <GlassCard style={styles.projectCard}>
        <View style={styles.cardHeader}>
          <View style={styles.codeContainer}>
            <Text style={styles.projectCode}>{item.projectCode}</Text>
          </View>
          <View style={[styles.statusBadge, item.status === 'Active' ? styles.statusActive : styles.statusClosed]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={[styles.projectName, isDark ? styles.darkText : styles.lightText]}>
          {item.name}
        </Text>
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={16} color="#64748b" />
          <Text style={styles.infoText}>{item.location || 'Not Specified'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="currency-usd" size={16} color="#64748b" />
          <Text style={styles.infoText}>Budget: {item.totalBudget?.toLocaleString() || '0'} TZS</Text>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Completion Progress</Text>
            <Text style={styles.progressVal}>{item.progress || 0}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${item.progress || 0}%` }]} />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      {/* Search & Filters */}
      <View style={styles.searchBarContainer}>
        <CustomInput
          label="Search Projects"
          placeholder="Search name, code, or location..."
          iconName="magnify"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Network Alert Tag */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>Working Offline. Displaying local SQLite cache.</Text>
        </View>
      )}

      {/* List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#1a56db" />
        </View>
      ) : (
        <FlatList
          data={getFilteredProjects()}
          keyExtractor={(item) => item.id}
          renderItem={renderProjectItem}
          contentContainerStyle={styles.listContainer}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="briefcase-remove-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>No projects match search query.</Text>
            </View>
          }
        />
      )}

      {/* Floating Add Project Button — only for users who can actually create projects */}
      {hasPermission('project:create') && (
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={styles.fab}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Quick Add Form Overlay modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <GlassCard variant="solid" style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark ? styles.darkText : styles.lightText]}>Compose Project</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <CustomInput label="Project Name" placeholder="e.g. Malindi Sea Wall" value={newName} onChangeText={setNewName} />
            <CustomInput label="Project Code" placeholder="e.g. URC-2026-08" value={newCode} onChangeText={setNewCode} />
            <CustomInput label="Location" placeholder="e.g. Zanzibar Town" value={newLocation} onChangeText={setNewLocation} />
            <CustomInput label="Total Budget (TZS)" placeholder="e.g. 50000000" keyboardType="numeric" value={newBudget} onChangeText={setNewBudget} />

            <CustomButton title="CREATE PROJECT" onPress={handleAddProject} />
          </GlassCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  lightBg: {
    backgroundColor: '#f8fafc'
  },
  darkBg: {
    backgroundColor: '#0f172a'
  },
  searchBarContainer: {
    padding: 16,
    paddingBottom: 0
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    gap: 8
  },
  offlineBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80
  },
  projectCard: {
    marginBottom: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  codeContainer: {
    backgroundColor: 'rgba(26, 86, 219, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  projectCode: {
    color: '#1a56db',
    fontWeight: '700',
    fontSize: 12
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20
  },
  statusActive: {
    backgroundColor: '#dcfce7'
  },
  statusClosed: {
    backgroundColor: '#f1f5f9'
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534'
  },
  projectName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6
  },
  infoText: {
    color: '#64748b',
    fontSize: 12.5
  },
  progressSection: {
    marginTop: 12
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  progressLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600'
  },
  progressVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981'
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 100
  },
  modalCard: {
    width: '100%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  }
});
