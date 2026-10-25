import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { BrandColors } from '@/constants/Colors';
import { api, PantryItem } from '@/services/api';

export default function PantryScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'expiring'>('all');
  const [loading, setLoading] = useState(true);

  const fetchPantry = async () => {
    if (!isSignedIn) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      if (filter === 'expiring') {
        const res = await api.getExpiringPantryItems();
        setItems(res.data || []);
      } else {
        const res = await api.getPantryItems();
        setItems(res.data || []);
      }
    } catch (err: any) {
      console.log('Error fetching pantry:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPantry();
    }, [filter])
  );

  const handleUpdateStock = async (item: PantryItem, delta: number) => {
    const currentQty = Math.round(Number(item.quantity) || 0);
    const newQty = Math.max(0, currentQty + delta);
    if (newQty === 0) {
      Alert.alert(
        'Item Consumed',
        `Did you finish ${item.product?.name}? Would you like to add it back to your shopping list?`,
        [
          { text: 'Just Remove', onPress: () => deleteItem(item.id) },
          {
            text: 'Add to List & Remove',
            onPress: async () => {
              await deleteItem(item.id);
              const lists = await api.getShoppingLists().catch(() => ({ data: [] }));
              if (lists.data && lists.data.length > 0) {
                await api.addItemToList(lists.data[0].id, item.productId, 1);
                Alert.alert('Restock Scheduled', 'Item added to your active grocery list.');
              }
            },
          },
        ]
      );
    } else {
      await api.updatePantryItem(item.id, { quantity: newQty });
      fetchPantry();
    }
  };

  const deleteItem = async (pantryItemId: string) => {
    await api.deletePantryItem(pantryItemId);
    fetchPantry();
  };

  return (
    <View style={styles.container}>
      {/* Sign In Required Banner for Unauthenticated Users */}
      {!isSignedIn && (
        <View style={styles.authBanner}>
          <Ionicons name="lock-closed" size={18} color="#92400E" />
          <View style={{ flex: 1 }}>
            <Text style={styles.authBannerTitle}>Sign in to sync your pantry</Text>
            <Text style={styles.authBannerSub}>Pantry stock & expiry alerts sync with your account.</Text>
          </View>
          <TouchableOpacity style={styles.authBannerBtn} onPress={() => router.push('/profile')}>
            <Text style={styles.authBannerBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stock Health Summary Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Kitchen & Pantry</Text>
          <Text style={styles.headerSub}>Track remaining stock and reduce food waste</Text>
        </View>

        {/* Filter Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, filter === 'all' && styles.toggleBtnActive]}
            onPress={() => setFilter('all')}>
            <Text style={[styles.toggleBtnText, filter === 'all' && styles.toggleBtnTextActive]}>
              All Stock ({items.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, filter === 'expiring' && styles.toggleBtnActiveRed]}
            onPress={() => setFilter('expiring')}>
            <Ionicons
              name="alert-circle"
              size={14}
              color={filter === 'expiring' ? '#FFFFFF' : BrandColors.accentRed}
            />
            <Text
              style={[
                styles.toggleBtnText,
                filter === 'expiring' && styles.toggleBtnTextActive,
                filter !== 'expiring' && { color: BrandColors.accentRed },
              ]}>
              Expiring Soon
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pantry List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Checking pantry inventory...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="nutrition-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {filter === 'expiring' ? 'No Items Expiring Soon' : 'Pantry is Empty'}
          </Text>
          <Text style={styles.emptySub}>
            {filter === 'expiring'
              ? 'Great job! None of your pantry items are within 7 days of expiration.'
              : 'Items from completed shopping trips will automatically appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => (item.id ? `${item.id}-${index}` : `pantry-${index}`)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const hasExpiry = Boolean(item.expiryDate);
            const expiryDateStr = hasExpiry
              ? new Date(item.expiryDate!).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })
              : null;

            return (
              <View style={styles.pantryCard}>
                <View style={styles.iconCircle}>
                  {item.product?.imageUrl ? (
                    <Image
                      source={{ uri: item.product.imageUrl }}
                      style={styles.pantryImg}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="nutrition" size={24} color={BrandColors.primaryDark} />
                  )}
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product?.name || 'Grocery Item'}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.product?.brands || 'Pantry'} • {item.unit || item.product?.unit || 'qty'}
                  </Text>

                  {hasExpiry && (
                    <View style={styles.expiryBadge}>
                      <Ionicons name="time-outline" size={12} color="#D97706" />
                      <Text style={styles.expiryText}>Use before: {expiryDateStr}</Text>
                    </View>
                  )}
                </View>

                {/* Stock Stepper */}
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleUpdateStock(item, -1)}>
                    <Ionicons name="remove" size={14} color={BrandColors.dark} />
                  </TouchableOpacity>
                  <Text style={styles.stepperQty}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => handleUpdateStock(item, 1)}>
                    <Ionicons name="add" size={14} color={BrandColors.dark} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5',
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  toggleBtnActive: {
    backgroundColor: '#84C225',
  },
  toggleBtnActiveRed: {
    backgroundColor: '#E23744',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  pantryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pantryImg: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  expiryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  stepperBtn: {
    padding: 6,
  },
  stepperQty: {
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 8,
    color: '#1F2937',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    gap: 10,
  },
  authBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  authBannerSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  authBannerBtn: {
    backgroundColor: '#84C225',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  authBannerBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
});
