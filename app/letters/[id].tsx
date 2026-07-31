import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '../../src/core/services/api.service';
import { getLocalLetters } from '../../src/core/services/database.service';
import GlassCard from '../../src/components/GlassCard';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function LetterDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDark } = useAppTheme();

  const { data: letter, isLoading } = useQuery({
    queryKey: ['letter', id],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/letters/${id}`);
        return res.data?.data?.letter || res.data?.data || res.data;
      } catch (err) {
        // Fallback to SQLite search offline
        const cached = await getLocalLetters();
        return cached.find((l: any) => l.id === id);
      }
    }
  });

  if (isLoading) {
    return (
      <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
        <ScreenHeader title="Correspondence Detail" isDark={isDark} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1a56db" />
        </View>
      </View>
    );
  }

  if (!letter) {
    return (
      <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
        <ScreenHeader title="Correspondence Detail" isDark={isDark} />
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={[styles.errorText, isDark ? styles.darkText : styles.lightText]}>Correspondence document not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
      <ScreenHeader title={letter.subject || 'Correspondence Detail'} isDark={isDark} />
      <ScrollView style={styles.container}>
      {/* Main card info */}
      <GlassCard style={styles.mainCard}>
        <View style={styles.badgeRow}>
          <View style={styles.refBadge}>
            <Text style={styles.refText}>{letter.referenceNo || 'Draft - Auto-Ref'}</Text>
          </View>
          <View style={[styles.priorityBadge, letter.priority === 'urgent' ? styles.urgentBg : styles.normalBg]}>
            <Text style={styles.priorityText}>{letter.priority?.toUpperCase() || 'NORMAL'}</Text>
          </View>
        </View>

        <Text style={[styles.subjectTitle, isDark ? styles.darkText : styles.lightText]}>
          {letter.subject}
        </Text>
        
        <View style={styles.metaInfoRow}>
          <Text style={styles.metaLabel}>Date: </Text>
          <Text style={[styles.metaVal, isDark ? styles.darkText : styles.lightText]}>{letter.letterDate || '—'}</Text>
        </View>

        <View style={styles.metaInfoRow}>
          <Text style={styles.metaLabel}>Status: </Text>
          <Text style={[styles.metaVal, isDark ? styles.darkText : styles.lightText]}>{letter.status || 'Draft'}</Text>
        </View>
      </GlassCard>

      {/* Address Details */}
      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Sender & Recipient Info</Text>
      <GlassCard style={styles.infoCard}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="account-arrow-left-outline" size={20} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>From (Sender)</Text>
            <Text style={[styles.infoVal, isDark ? styles.darkText : styles.lightText]}>
              {letter.fromName || 'System Generated'}
            </Text>
          </View>
        </View>

        <View style={[styles.infoRow, styles.borderTop]}>
          <MaterialCommunityIcons name="account-arrow-right-outline" size={20} color="#64748b" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>To (Recipient)</Text>
            <Text style={[styles.infoVal, isDark ? styles.darkText : styles.lightText]}>
              {letter.toName} {letter.toOrg ? `(${letter.toOrg})` : ''}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Content Body */}
      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Letter Body Content</Text>
      <GlassCard style={styles.bodyCard}>
        <Text style={[styles.bodyText, isDark ? styles.darkText : styles.lightText]}>
          {letter.body?.replace(/<[^>]*>/g, '') || 'Empty letter body.'}
        </Text>
      </GlassCard>
      
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  refBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  refText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 11
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  urgentBg: {
    backgroundColor: '#fee2e2'
  },
  normalBg: {
    backgroundColor: '#eff6ff'
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1e40af'
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 12.5,
    fontWeight: '500'
  },
  metaVal: {
    fontSize: 12.5,
    fontWeight: '700'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8
  },
  infoCard: {
    marginBottom: 20
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
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 2
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
    paddingTop: 12
  },
  bodyCard: {
    marginBottom: 20
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'serif'
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
