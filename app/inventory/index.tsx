import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../src/core/services/api.service';
import { getLocalStoreItems, saveStoreItemsToLocal } from '../../src/core/services/database.service';
import GlassCard from '../../src/components/GlassCard';
import CustomInput from '../../src/components/CustomInput';
import ScreenHeader from '../../src/components/ScreenHeader';
import { useAppTheme } from '../../src/core/theme/ThemeContext';

export default function StoreInventoryScreen() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Fetch Central Store Inventory
  const { data: storeItems, isLoading, refetch } = useQuery({
    queryKey: ['store-items'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/store/central');
        const items = res.data?.data?.items || res.data?.data || res.data || [];
        await saveStoreItemsToLocal(items);
        setIsOffline(false);
        return items;
      } catch (err) {
        setIsOffline(true);
        return await getLocalStoreItems();
      }
    }
  });

  const filteredItems = (storeItems || []).filter((item: any) => {
    const matchesSearch =
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productId?.toLowerCase().includes(searchTerm.toLowerCase());

    const isLow = item.quantity <= (item.minQuantity || 5);
    const matchesLowStock = filterLowStock ? isLow : true;

    return matchesSearch && matchesLowStock;
  });

  const renderInventoryItem = ({ item }: { item: any }) => {
    const minQty = item.minQuantity || 5;
    const isLowStock = item.quantity <= minQty;

    return (
      <GlassCard style={styles.itemCard}>
        <View style={styles.cardHeader}>
          <Text style={[styles.itemDesc, isDark ? styles.darkText : styles.lightText]}>
            {item.description}
          </Text>
          {isLowStock && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>LOW STOCK</Text>
            </View>
          )}
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={[styles.detailValue, isLowStock ? styles.qtyRed : styles.qtyGreen]}>
              {item.quantity} {item.unit || 'Units'}
            </Text>
          </View>

          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Storage Location</Text>
            <Text style={[styles.detailValue, isDark ? styles.darkText : styles.lightText]}>
              {item.location || 'Central A'}
            </Text>
          </View>
          
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Product ID</Text>
            <Text style={styles.detailValueCode}>
              {item.productId ? item.productId.substring(0, 8) : 'GEN-ITEM'}
            </Text>
          </View>
        </View>

        {item.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>
            Note: {item.notes}
          </Text>
        ) : null}
      </GlassCard>
    );
  };

  return (
    <View style={[styles.screen, isDark ? styles.darkBg : styles.lightBg]}>
      <ScreenHeader title="Store Inventory" isDark={isDark} />
      <View style={styles.container}>
      {/* Connection Mode Indicator */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <MaterialCommunityIcons name="cloud-off-outline" size={16} color="#ffffff" />
          <Text style={styles.offlineText}>Offline Mode — Viewing cached stock data</Text>
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <CustomInput
          label="Search Inventory"
          placeholder="Search materials by name or location..."
          iconName="magnify"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => setFilterLowStock(!filterLowStock)}
          style={[styles.filterButton, filterLowStock && styles.filterButtonActive]}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={filterLowStock ? 'alert-circle' : 'alert-circle-outline'}
            size={18}
            color={filterLowStock ? '#ffffff' : '#ef4444'}
          />
          <Text style={[styles.filterButtonText, filterLowStock && styles.filterButtonTextActive]}>
            LOW STOCK ALERTS
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1a56db" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>No materials found matching criteria.</Text>
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
  searchContainer: {
    marginBottom: 8
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 6
  },
  filterButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444'
  },
  filterButtonText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700'
  },
  filterButtonTextActive: {
    color: '#ffffff'
  },
  listContainer: {
    paddingBottom: 40
  },
  itemCard: {
    marginBottom: 12
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  itemDesc: {
    fontSize: 14.5,
    fontWeight: '700',
    flex: 1,
    marginRight: 8
  },
  lowStockBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  lowStockText: {
    color: '#b91c1c',
    fontSize: 9,
    fontWeight: '800'
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(241, 245, 249, 0.4)',
    padding: 10,
    borderRadius: 8,
    gap: 12
  },
  detailCol: {
    flex: 1
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700'
  },
  qtyGreen: {
    color: '#15803d'
  },
  qtyRed: {
    color: '#b91c1c'
  },
  detailValueCode: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  notesText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 10,
    fontStyle: 'italic'
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
