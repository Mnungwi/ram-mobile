import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '../../src/core/services/api.service';
import { getLocalTechnicians } from '../../src/core/services/database.service';
import GlassCard from '../../src/components/GlassCard';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function TechnicianDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDark } = useAppTheme();

  // Fetch single technician details
  const { data: technician, isLoading: loadingTech } = useQuery({
    queryKey: ['technician', id],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/technicians/${id}`);
        return res.data?.data?.technician || res.data?.data || res.data;
      } catch (err) {
        // Fallback to SQLite search offline
        const cached = await getLocalTechnicians();
        return cached.find((t: any) => t.id === id);
      }
    }
  });

  // Fetch technician's receipts / work logs
  const { data: receipts, isLoading: loadingReceipts } = useQuery({
    queryKey: ['technician-receipts', id],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/technicians/${id}/receipts`);
        return res.data?.data?.receipts || res.data?.data || [];
      } catch (err) {
        return [];
      }
    },
    enabled: !!id
  });

  const isLoading = loadingTech || loadingReceipts;

  if (isLoading) {
    return (
      <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
        <ScreenHeader title="Staff Profile" isDark={isDark} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a56db" />
        </View>
      </View>
    );
  }

  if (!technician) {
    return (
      <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
        <ScreenHeader title="Staff Profile" isDark={isDark} />
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={[styles.errorText, isDark ? styles.darkText : styles.lightText]}>Staff member profile not found.</Text>
        </View>
      </View>
    );
  }

  const renderReceiptItem = ({ item }: { item: any }) => (
    <GlassCard style={styles.receiptCard}>
      <View style={styles.receiptHeader}>
        <Text style={[styles.receiptRef, isDark ? styles.darkText : styles.lightText]}>Receipt #{item.receiptNo || '—'}</Text>
        <Text style={styles.receiptAmount}>{item.amount?.toLocaleString() || '0'} TZS</Text>
      </View>
      <View style={styles.receiptMeta}>
        <Text style={styles.receiptDate}>{item.receiptDate || 'No date'}</Text>
        <Text style={styles.receiptProject}>{item.project?.name || 'Central Store'}</Text>
      </View>
      {item.description && (
        <Text style={styles.receiptDesc} numberOfLines={2}>{item.description}</Text>
      )}
    </GlassCard>
  );

  return (
    <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
      <ScreenHeader title={technician.name || 'Staff Profile'} isDark={isDark} />
      <ScrollView style={styles.container}>
      {/* Main card info */}
      <GlassCard style={styles.mainCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarBg}>
            <MaterialCommunityIcons name="account" size={48} color="#1a56db" />
          </View>
          <Text style={[styles.techName, isDark ? styles.darkText : styles.lightText]}>{technician.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {technician.category?.name || 'General Technician'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="phone-outline" size={20} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={[styles.infoVal, isDark ? styles.darkText : styles.lightText]}>
              {technician.phone || 'Not Specified'}
            </Text>
          </View>
        </View>

        <View style={[styles.infoRow, styles.marginTop]}>
          <MaterialCommunityIcons name="card-account-details-outline" size={20} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Document ID ({technician.idType || 'NIDA'})</Text>
            <Text style={[styles.infoVal, isDark ? styles.darkText : styles.lightText]}>
              {technician.idNumber || 'Not Specified'}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Linked Expense Receipts */}
      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Linked Receipts & Payouts</Text>
      
      {receipts && receipts.length > 0 ? (
        <FlatList
          data={receipts}
          renderItem={renderReceiptItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
        />
      ) : (
        <GlassCard style={styles.emptyReceipts}>
          <MaterialCommunityIcons name="receipt" size={32} color="#94a3b8" />
          <Text style={styles.emptyReceiptsText}>No payment receipts linked to this staff profile.</Text>
        </GlassCard>
      )}

      <View style={{ height: 40 }} />
      </ScrollView>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  mainCard: {
    marginBottom: 20
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10
  },
  avatarBg: {
    backgroundColor: 'rgba(26, 86, 219, 0.08)',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  techName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6
  },
  categoryBadgeText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '800'
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  marginTop: {
    marginTop: 16
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
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8
  },
  receiptCard: {
    padding: 12
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  receiptRef: {
    fontSize: 13.5,
    fontWeight: '700'
  },
  receiptAmount: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '800'
  },
  receiptMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  receiptDate: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500'
  },
  receiptProject: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  receiptDesc: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 6,
    fontStyle: 'italic'
  },
  emptyReceipts: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32
  },
  emptyReceiptsText: {
    color: '#64748b',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center'
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600'
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  }
});
