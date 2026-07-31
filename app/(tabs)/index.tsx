import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import GlassCard from '../../src/components/GlassCard';
import Svg, { Rect, Circle, Line } from 'react-native-svg';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, permissions } = useSelector((state: any) => state.auth);
  const { isDark } = useAppTheme();

  const role = user?.roles?.[0]?.name || user?.jobTitle || 'Team Member';
  const name = user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.email || 'Unknown User');
  const hasPermission = (p: string) => !permissions?.length || permissions.includes(p);

  // Dynamic quick links / cards based on Role
  const renderRoleWidgets = () => {
    switch (role.toLowerCase()) {
      case 'super admin':
      case 'admin':
      case 'manager':
        return (
          <View style={styles.grid}>
            <GlassCard style={styles.gridCard}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={28} color="#0ea5e9" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Approvals</Text>
              <Text style={styles.cardValue}>4 Pending</Text>
            </GlassCard>
            <GlassCard style={styles.gridCard}>
              <MaterialCommunityIcons name="chart-areaspline" size={28} color="#10b981" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Active Projects</Text>
              <Text style={styles.cardValue}>12 Total</Text>
            </GlassCard>
          </View>
        );
      case 'finance':
        return (
          <View style={styles.grid}>
            <GlassCard style={styles.gridCard}>
              <MaterialCommunityIcons name="cash-register" size={28} color="#10b981" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Active Budget</Text>
              <Text style={styles.cardValue}>$1.8M TZS</Text>
            </GlassCard>
            <GlassCard style={styles.gridCard}>
              <MaterialCommunityIcons name="file-document-outline" size={28} color="#ef4444" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Invoices</Text>
              <Text style={styles.cardValue}>7 Open</Text>
            </GlassCard>
          </View>
        );
      case 'procurement':
      case 'storekeeper':
        return (
          <View style={styles.grid}>
            <GlassCard style={styles.gridCard}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={28} color="#f59e0b" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Store Orders</Text>
              <Text style={styles.cardValue}>19 Processing</Text>
            </GlassCard>
            <GlassCard style={styles.gridCard}>
              <MaterialCommunityIcons name="warehouse" size={28} color="#7c3aed" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Low Stock</Text>
              <Text style={styles.cardValue}>3 Alerts</Text>
            </GlassCard>
          </View>
        );
      default: // Supervisor / Staff
        return (
          <View style={styles.grid}>
            <GlassCard style={styles.gridCard}>
              <MaterialCommunityIcons name="calendar-clock-outline" size={28} color="#1a56db" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Daily Tasks</Text>
              <Text style={styles.cardValue}>5 Assigned</Text>
            </GlassCard>
            <GlassCard style={styles.gridCard}>
              <MaterialCommunityIcons name="map-marker-check-outline" size={28} color="#10b981" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>GPS Check-in</Text>
              <Text style={styles.cardValue}>Checked In</Text>
            </GlassCard>
          </View>
        );
    }
  };

  return (
    <ScrollView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      {/* Header Profile Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Habari, {name}</Text>
          <Text style={styles.roleBadge}>{role.toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <MaterialCommunityIcons name="bell-badge-outline" size={24} color="#1a56db" />
        </TouchableOpacity>
      </View>

      {/* Main Stats Card */}
      <GlassCard style={styles.mainStats}>
        <View style={styles.mainStatsRow}>
          <View>
            <Text style={styles.mainStatsLabel}>Engineering Projects Status</Text>
            <Text style={[styles.mainStatsVal, isDark ? styles.darkText : styles.lightText]}>84% Completed</Text>
          </View>
          <MaterialCommunityIcons name="shield-check-outline" size={42} color="#10b981" />
        </View>
        
        {/* Simple inline visual progress indicator */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: '84%' }]} />
        </View>
      </GlassCard>

      {/* Dynamic Widgets */}
      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Quick Overview</Text>
      {renderRoleWidgets()}

      {/* Operations Directory */}
      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Operations Directory</Text>
      <View style={styles.grid}>
        {hasPermission('technician:view') && (
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/technicians')} style={{ flex: 1 }}>
            <GlassCard style={[styles.gridCard, { minHeight: 90 }]}>
              <MaterialCommunityIcons name="account-group" size={28} color="#7c3aed" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Staff Directory</Text>
              <Text style={styles.cardValue}>Technicians</Text>
            </GlassCard>
          </TouchableOpacity>
        )}

        {hasPermission('store:view') && (
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/inventory')} style={{ flex: 1 }}>
            <GlassCard style={[styles.gridCard, { minHeight: 90 }]}>
              <MaterialCommunityIcons name="warehouse" size={28} color="#f59e0b" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Store Stock</Text>
              <Text style={styles.cardValue}>Inventory</Text>
            </GlassCard>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.grid, { marginTop: -8 }]}>
        {hasPermission('client:view') && (
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/directory')} style={{ flex: 1 }}>
            <GlassCard style={[styles.gridCard, { minHeight: 90 }]}>
              <MaterialCommunityIcons name="notebook-multiple" size={28} color="#10b981" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Contacts</Text>
              <Text style={styles.cardValue}>Directory</Text>
            </GlassCard>
          </TouchableOpacity>
        )}

        {hasPermission('letter:view') && (
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(tabs)/letters')} style={{ flex: 1 }}>
            <GlassCard style={[styles.gridCard, { minHeight: 90 }]}>
              <MaterialCommunityIcons name="email-multiple-outline" size={28} color="#0ea5e9" />
              <Text style={[styles.cardTitle, isDark ? styles.darkText : styles.lightText]}>Letters</Text>
              <Text style={styles.cardValue}>Correspondences</Text>
            </GlassCard>
          </TouchableOpacity>
        )}
      </View>

      {/* Analytics Chart Widget */}
      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Monthly Productivity</Text>
      <GlassCard style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, isDark ? styles.darkText : styles.lightText]}>Milestone Delivery</Text>
          <Text style={styles.chartSubtitle}>Target vs Actual</Text>
        </View>
        
        {/* SVG Custom Responsive Bar Chart */}
        <Svg height="150" width={Dimensions.get('window').width - 70} style={{ alignSelf: 'center', marginTop: 10 }}>
          {/* Background Grid Lines */}
          <Line x1="10" y1="20" x2="300" y2="20" stroke="#e2e8f0" strokeWidth="1" />
          <Line x1="10" y1="60" x2="300" y2="60" stroke="#e2e8f0" strokeWidth="1" />
          <Line x1="10" y1="100" x2="300" y2="100" stroke="#e2e8f0" strokeWidth="1" />
          <Line x1="10" y1="130" x2="300" y2="130" stroke="#94a3b8" strokeWidth="2" />
          
          {/* Target bars */}
          <Rect x="30" y="40" width="20" height="90" rx="4" fill="#cbd5e1" />
          <Rect x="90" y="30" width="20" height="100" rx="4" fill="#cbd5e1" />
          <Rect x="150" y="20" width="20" height="110" rx="4" fill="#cbd5e1" />
          <Rect x="210" y="50" width="20" height="80" rx="4" fill="#cbd5e1" />

          {/* Actual bars */}
          <Rect x="30" y="55" width="20" height="75" rx="4" fill="#1a56db" />
          <Rect x="90" y="25" width="20" height="105" rx="4" fill="#1a56db" />
          <Rect x="150" y="45" width="20" height="85" rx="4" fill="#10b981" />
          <Rect x="210" y="50" width="20" height="80" rx="4" fill="#1a56db" />
        </Svg>
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: '#cbd5e1' }]} />
            <Text style={styles.legendText}>Target</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: '#1a56db' }]} />
            <Text style={styles.legendText}>Deliveries</Text>
          </View>
        </View>
      </GlassCard>

      {/* Announcements */}
      <Text style={[styles.sectionTitle, isDark ? styles.darkText : styles.lightText]}>Announcements</Text>
      <GlassCard style={styles.announceCard}>
        <View style={styles.announceHeader}>
          <MaterialCommunityIcons name="bullhorn-outline" size={20} color="#f59e0b" />
          <Text style={styles.announceDate}>23 July 2026</Text>
        </View>
        <Text style={[styles.announceText, isDark ? styles.darkText : styles.lightText]}>
          ZSSF Malindi Car Parking site safety audit will take place tomorrow at 9:00 AM. Ensure all PPE standards are fully met.
        </Text>
      </GlassCard>
      
      <View style={{ height: 40 }} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a56db'
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    marginTop: 2
  },
  notifBtn: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(26, 86, 219, 0.08)'
  },
  mainStats: {
    marginBottom: 20
  },
  mainStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  mainStatsLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600'
  },
  mainStatsVal: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: 0.3
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20
  },
  gridCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a56db',
    marginTop: 2
  },
  chartCard: {
    marginBottom: 20
  },
  chartHeader: {
    marginBottom: 10
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700'
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 50,
    marginRight: 6
  },
  legendText: {
    fontSize: 11,
    color: '#64748b'
  },
  announceCard: {
    marginBottom: 30
  },
  announceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  announceDate: {
    fontSize: 11,
    color: '#64748b'
  },
  announceText: {
    fontSize: 13,
    lineHeight: 20
  },
  lightText: {
    color: '#0f172a'
  },
  darkText: {
    color: '#ffffff'
  }
});
