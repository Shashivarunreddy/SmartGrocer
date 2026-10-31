import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { BrandColors } from '@/constants/Colors';
import { api, Product, PantryItem, ReplenishmentItem } from '@/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [aiReplenishments, setAiReplenishments] = useState<ReplenishmentItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedMap, setAddedMap] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({
    activeListCount: 0,
    estimatedTotal: 0,
    budget: 75,
  });

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Fetch AI Replenishments, Expiring Items, Active Lists, and Profile concurrently
      const [aiResult, pantryResult, listsResult, profileResult] = await Promise.allSettled([
        api.getReplenishments().catch(() => null),
        api.getExpiringPantryItems().catch(() => ({ data: [] })),
        api.getShoppingLists().catch(() => ({ data: [] })),
        api.getProfile().catch(() => null),
      ]);

      const aiRes = aiResult.status === 'fulfilled' ? aiResult.value : null;
      const pantryRes = pantryResult.status === 'fulfilled' ? pantryResult.value : null;
      const listsRes = listsResult.status === 'fulfilled' ? listsResult.value : null;
      const profileRes = profileResult.status === 'fulfilled' ? profileResult.value : null;

      const profileBudget = Number(profileRes?.data?.defaultBudget);

      if (aiRes?.data?.replenishments && aiRes.data.replenishments.length > 0) {
        setAiReplenishments(aiRes.data.replenishments);
      } else {
        const productRes = await api.getProducts({ pageSize: 4 }).catch(() => null);
        if (productRes?.data) {
          setSuggestedProducts(productRes.data);
        }
      }

      setExpiringItems(pantryRes?.data || []);

      const lists = listsRes?.data || [];
      if (lists.length > 0) {
        const first = lists[0];
        setActiveListId(first.id);
        const items = first.items || [];
        const totalCalculated = items.reduce(
          (sum: number, i: any) =>
            sum + (Number(i.product?.defaultUnitPrice) || 0) * (Number(i.quantity) || 1),
          0
        );

        const currentBudget =
          !isNaN(profileBudget) && profileBudget > 0
            ? profileBudget
            : Number(first.budget) || 75;

        setStats({
          activeListCount: items.length || first._count?.items || 0,
          estimatedTotal: Number(totalCalculated.toFixed(2)),
          budget: currentBudget,
        });
      } else {
        setStats({
          activeListCount: 0,
          estimatedTotal: 0,
          budget: !isNaN(profileBudget) && profileBudget > 0 ? profileBudget : 75,
        });
      }
    } catch (err) {
      console.log('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const handleAddRecommended = async (item: ReplenishmentItem) => {
    try {
      setAddingId(item.productId);
      setAddedMap((prev) => ({
        ...prev,
        [item.productId]: (prev[item.productId] || 0) + 1,
      }));

      let listId = activeListId;
      if (!listId) {
        const listsRes = await api.getShoppingLists();
        if (listsRes?.data && listsRes.data.length > 0) {
          listId = listsRes.data[0].id;
          setActiveListId(listId);
        } else {
          const newList = await api.createShoppingList('My Weekly Grocery', 75, 'GBP');
          listId = newList.data.id;
          setActiveListId(listId);
        }
      }
      await api.addItemToList(listId, item.productId, Math.max(1, Math.round(item.suggestedQuantity)));
      loadDashboard();
    } catch {
      setAddedMap((prev) => {
        const copy = { ...prev };
        if ((copy[item.productId] || 0) <= 1) delete copy[item.productId];
        else copy[item.productId] -= 1;
        return copy;
      });
    } finally {
      setAddingId(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const budgetUsagePercent = Math.min(
    100,
    Math.round((stats.estimatedTotal / (stats.budget || 1)) * 100)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BrandColors.primary]} />}>
      {/* BigBasket Brand Greeting Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroTextContainer}>
          <View style={styles.badgeRow}>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>SmartGrocer Live</Text>
            </View>
            <Text style={styles.deliveryTag}>⚡ Everyday Low Prices</Text>
          </View>
          <Text style={styles.heroTitle}>Smart Grocery Assistant</Text>
          <Text style={styles.heroSubtitle}>
            Save money with ML bill estimates and zero pantry waste.
          </Text>
        </View>
      </View>

      {/* Budget & Shopping Overview Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardSub}>Current Shopping Run</Text>
            <Text style={styles.cardTitle}>Budget Tracker</Text>
          </View>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/lists')}>
            <Text style={styles.headerBtnText}>View List</Text>
            <Ionicons name="arrow-forward" size={14} color={BrandColors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.budgetRow}>
          <View>
            <Text style={styles.statLabel}>Est. Bill</Text>
            <Text style={styles.statValue}>£{Number(stats.estimatedTotal).toFixed(2)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View>
            <Text style={styles.statLabel}>Target Budget</Text>
            <Text style={styles.statValue}>£{Number(stats.budget).toFixed(2)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View>
            <Text style={styles.statLabel}>Items</Text>
            <Text style={styles.statValue}>{stats.activeListCount} items</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${budgetUsagePercent}%`,
                backgroundColor: budgetUsagePercent > 90 ? BrandColors.accentRed : BrandColors.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.progressNote}>
          {budgetUsagePercent}% of your grocery budget estimated
        </Text>
      </View>

      {/* Expiring Soon Alert Banner */}
      {expiringItems.length > 0 && (
        <TouchableOpacity
          style={styles.expiryAlertCard}
          onPress={() => router.push('/pantry')}>
          <View style={styles.alertIconCircle}>
            <Ionicons name="alert" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.alertTextContainer}>
            <Text style={styles.alertTitle}>
              {expiringItems.length} Pantry {expiringItems.length === 1 ? 'Item' : 'Items'} Expiring Soon!
            </Text>
            <Text style={styles.alertSubtitle}>
              Consume or plan meals before spoilage occurs.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={BrandColors.accentRed} />
        </TouchableOpacity>
      )}

      {/* Quick Navigation Action Grid */}
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => router.push('/catalogue')}>
          <View style={[styles.actionIconCircle, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="cart" size={24} color={BrandColors.primaryDark} />
          </View>
          <Text style={styles.actionTitle}>Shop Catalogue</Text>
          <Text style={styles.actionDesc}>100+ fresh items</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => router.push('/pantry')}>
          <View style={[styles.actionIconCircle, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="file-tray-full" size={24} color="#E65100" />
          </View>
          <Text style={styles.actionTitle}>Pantry Tracker</Text>
          <Text style={styles.actionDesc}>Check inventory</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => router.push('/lists')}>
          <View style={[styles.actionIconCircle, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="calculator" size={24} color="#1565C0" />
          </View>
          <Text style={styles.actionTitle}>Bill Estimator</Text>
          <Text style={styles.actionDesc}>Prevent overspending</Text>
        </TouchableOpacity>
      </View>

      {/* AI Demand Replenishment Suggestions */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Smart Replenishments</Text>
          <Text style={styles.sectionSub}>AI demand & consumption predictions</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/catalogue')}>
          <Text style={styles.seeAllText}>See Catalogue</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="small" color={BrandColors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.suggestionsList}>
          {aiReplenishments.length > 0
            ? aiReplenishments.slice(0, 4).map((r, index) => {
                const isAdding = addingId === r.productId;
                const addedCount = addedMap[r.productId] || 0;
                const urgencyColor =
                  r.urgency === 'CRITICAL' ? '#DC2626' : r.urgency === 'HIGH' ? '#D97706' : '#2E7D32';
                return (
                  <View key={`${r.productId}-${index}`} style={styles.productSnippetCard}>
                    <View style={styles.productLeft}>
                      <View style={styles.productImgPlaceholder}>
                        {r.imageUrl ? (
                          <Image
                            source={{ uri: r.imageUrl }}
                            style={styles.productImg}
                            resizeMode="contain"
                          />
                        ) : (
                          <Ionicons name="nutrition" size={24} color={BrandColors.primary} />
                        )}
                      </View>
                      <View style={styles.productInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Text style={[styles.urgencyPill, { backgroundColor: urgencyColor + '18', color: urgencyColor }]}>
                            {r.urgency === 'CRITICAL'
                              ? '⚡ Empty in 1d'
                              : r.urgency === 'HIGH'
                              ? '⚡ Low Stock'
                              : '⚡ Replenish'}
                          </Text>
                          {addedCount > 0 && (
                            <View style={styles.addedBadge}>
                              <Ionicons name="checkmark-circle" size={10} color="#166534" />
                              <Text style={styles.addedBadgeText}>{addedCount} added</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.productName} numberOfLines={1}>
                          {r.productName}
                        </Text>
                        <Text style={styles.reasonText} numberOfLines={1}>
                          {r.reason}
                        </Text>
                        <Text style={styles.productPrice}>
                          £{Number(r.defaultUnitPrice || 1.99).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.addBtn,
                        addedCount > 0 && styles.addBtnInList,
                        isAdding && { opacity: 0.6 },
                      ]}
                      disabled={isAdding}
                      onPress={() => handleAddRecommended(r)}>
                      {isAdding ? (
                        <ActivityIndicator size="small" color={addedCount > 0 ? '#FFFFFF' : '#689F38'} />
                      ) : addedCount > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          <Text style={styles.addBtnTextInList}>{addedCount}</Text>
                        </View>
                      ) : (
                        <Text style={styles.addBtnText}>+ ADD</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            : suggestedProducts.slice(0, 4).map((p, index) => (
                <View key={`${p.id}-${index}`} style={styles.productSnippetCard}>
                  <View style={styles.productLeft}>
                    <View style={styles.productImgPlaceholder}>
                      {p.imageUrl ? (
                        <Image
                          source={{ uri: p.imageUrl }}
                          style={styles.productImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <Ionicons name="nutrition" size={24} color={BrandColors.primary} />
                      )}
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.productBrand}>
                        {p.brands || 'SmartGrocer'} • {p.unit || 'unit'}
                      </Text>
                      <Text style={styles.productPrice}>£{Number(p.defaultUnitPrice).toFixed(2)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => router.push('/catalogue')}>
                    <Text style={styles.addBtnText}>+ ADD</Text>
                  </TouchableOpacity>
                </View>
              ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#84C225',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#84C225',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTextContainer: {
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deliveryTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF8E1',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#F1F8E9',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardSub: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#689F38',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressNote: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  expiryAlertCard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  alertIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E23744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  alertSubtitle: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  actionDesc: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  sectionSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#689F38',
  },
  suggestionsList: {
    gap: 10,
  },
  productSnippetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  productImgPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  productBrand: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E7D32',
    marginTop: 2,
  },
  urgencyPill: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    letterSpacing: 0.3,
  },
  reasonText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
    marginBottom: 2,
  },
  addBtn: {
    borderWidth: 1.5,
    borderColor: '#84C225',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnInList: {
    backgroundColor: '#84C225',
    borderColor: '#689F38',
  },
  addBtnTextInList: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#689F38',
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },
});
